#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat v4 — WITH proper bubble backgrounds
// Matched to Flutter message_bubble.dart + chat_input.dart exactly
// Keep v3 for comparison, place v4 next to it
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 },
  bubbleOut: { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7
  bubbleIn:  { r: 0.165, g: 0.082, b: 0.271 },  // #2A1545
  textOut:   { r: 1, g: 1, b: 1 },               // #FFFFFF
  textIn:    { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },   // #251545
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },
  accent:    { r: 0.729, g: 0.510, b: 0.929 },
  glow:      { r: 0.608, g: 0.435, b: 0.831 },
  success:   { r: 0.353, g: 0.620, b: 0.478 },
  online:    { r: 0.204, g: 0.827, b: 0.600 },
  shadow:    { r: 0.424, g: 0.173, b: 0.655 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
};

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  return Object.entries(ch).sort((a, b) => b[1] - a[1])[0][0];
}
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) { ws.removeEventListener("message", handler); clearTimeout(t);
        d.message.error ? reject(new Error(JSON.stringify(d.message.error))) : resolve(d.message.result); }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}
async function R(ws, ch, pid, n, x, y, w, h, rad = 0) {
  const r = await cmd(ws, ch, "create_rectangle", { name: n, x, y, width: w, height: h, parentId: pid });
  if (rad > 0) await cmd(ws, ch, "set_corner_radius", { nodeId: r.id, radius: rad });
  return r;
}
async function Txt(ws, ch, pid, n, x, y, content, sz, opts = {}) {
  return cmd(ws, ch, "create_text", {
    name: n, x, y, text: content, fontSize: sz,
    fontFamily: opts.fontFamily || FONT_UI,
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || C.textPri,
    parentId: pid,
    ...(opts.letterSpacing !== undefined ? { letterSpacing: opts.letterSpacing } : {}),
  });
}
async function F(ws, ch, id, c, a = 1) {
  await cmd(ws, ch, "set_fill_color", { nodeId: id, r: c.r, g: c.g, b: c.b, a });
}
async function G(ws, ch, id, type, stops, handles) {
  const p = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) p.gradientHandlePositions = handles;
  await cmd(ws, ch, "set_fill_gradient", p);
}
async function S(ws, ch, id, c, weight = 1) {
  await cmd(ws, ch, "set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a: 1 }, weight });
}
async function noFill(ws, ch, id) { await F(ws, ch, id, C.black, 0); }

// ═══ MESSAGE BUBBLE (from message_bubble.dart) ═══
// padding: 14h, 10v. border-radius: 18px, last-in-group corner = 4px
// max-width: 75%. shadow: shadow@0.25, blur 4, offset (0,2)
async function bubble(ws, ch, pid, text, isOut, time, yPos, opts = {}) {
  const padH = 14, padV = 10;
  const fontSize = 15;
  const charW = fontSize * 0.48;
  const maxBubbleW = W * 0.75;
  const maxTextW = maxBubbleW - padH * 2;

  const lines = text.split('\n');
  const maxLineChars = Math.max(...lines.map(l => l.length));
  const longestLineW = Math.min(maxLineChars * charW, maxTextW);
  const textH = lines.length * (fontSize * 1.4);

  const timeW = time.length * 5.5 + (isOut && opts.read ? 22 : 0);
  const contentW = Math.max(longestLineW, timeW);
  const bubbleW = Math.min(contentW + padH * 2, maxBubbleW);
  const bubbleH = padV + textH + 3 + 13 + padV;

  const isLast = opts.isLast !== false;
  const x = isOut ? W - 16 - bubbleW : 16;
  const bgColor = isOut ? C.bubbleOut : C.bubbleIn;
  const textColor = isOut ? C.textOut : C.textIn;

  // Bubble bg
  const bg = await R(ws, ch, pid, `bub_${time}`, x, yPos, bubbleW, bubbleH, 18);
  await F(ws, ch, bg.id, bgColor, 1);
  // TODO: ideally set per-corner radius (18/18/4/18 or 18/18/18/4)
  // Figma set_corner_radius only sets uniform radius, so we use 18 for now

  // Message text
  await Txt(ws, ch, pid, `txt_${time}`, x + padH, yPos + padV, text, fontSize, { color: textColor });

  // Time
  const timeY = yPos + padV + textH + 3;
  const dimC = { r: textColor.r * 0.6, g: textColor.g * 0.6, b: textColor.b * 0.6 };
  await Txt(ws, ch, pid, `tm_${time}`, x + padH, timeY, time, 11, { color: dimC });

  // Read receipt
  if (isOut && opts.read) {
    await Txt(ws, ch, pid, `rd_${time}`, x + padH + time.length * 5.5 + 4, timeY, "✓✓", 10, { color: C.success });
  }

  return bubbleH;
}

async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n═══ Chat v4 ═══\n`);

  // Place NEXT to v3 (v3 is at 13650)
  const FX = 14100, FY = 0;
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – DM Chat v4 (Dark)", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await F(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });

  // ── DYNAMIC ISLAND ──
  const notch = await R(ws, ch, P, "Island", (W-126)/2, 11, 126, 37, 20);
  await F(ws, ch, notch.id, C.black, 1);

  // ── STATUS BAR ──
  await Txt(ws, ch, P, "Time", 30, 14, "3:14", 17, { fontWeight: 700, color: C.white });
  const batt = await R(ws, ch, P, "Batt", W-39, 17, 27, 13, 4);
  await noFill(ws, ch, batt.id);
  await S(ws, ch, batt.id, C.white, 1.5);
  const battF = await R(ws, ch, P, "BattF", W-37, 19, 16, 9, 2);
  await F(ws, ch, battF.id, C.white, 0.7);

  // ── HEADER ──
  const hY = 59;
  // Back
  await Txt(ws, ch, P, "Back", 10, hY + 4, "‹", 32, { fontWeight: 300, color: C.textPri });
  // Call btn (stroke circle + filled phone shape)
  const callBtn = await R(ws, ch, P, "CallBtn", 52, hY+4, 40, 40, 20);
  await noFill(ws, ch, callBtn.id); await S(ws, ch, callBtn.id, C.accent, 2.5);
  await R(ws, ch, P, "Ph1", 67, hY+14, 10, 6, 3).then(n => F(ws, ch, n.id, C.accent));
  await R(ws, ch, P, "Ph2", 70, hY+18, 4, 8, 1).then(n => F(ws, ch, n.id, C.accent));
  await R(ws, ch, P, "Ph3", 67, hY+24, 10, 6, 3).then(n => F(ws, ch, n.id, C.accent));

  // Video btn
  const vidBtn = await R(ws, ch, P, "VidBtn", W-92, hY+4, 40, 40, 20);
  await noFill(ws, ch, vidBtn.id); await S(ws, ch, vidBtn.id, C.accent, 2.5);
  await R(ws, ch, P, "Cam1", W-82, hY+16, 14, 12, 2).then(n => F(ws, ch, n.id, C.accent));
  await R(ws, ch, P, "Cam2", W-67, hY+18, 6, 8, 1).then(n => F(ws, ch, n.id, C.accent));

  // Overflow (2x2 dots)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const d = await R(ws, ch, P, `D${r}${c}`, W-30+c*8, hY+14+r*8, 4, 4, 2);
    await F(ws, ch, d.id, C.textPri, 0.8);
  }

  // Center avatar
  const avCX = W/2, avCY = hY+26, avSz = 54;
  const glowSz = avSz * 1.65;
  const glow = await R(ws, ch, P, "AvGlow", avCX-glowSz/2, avCY-glowSz/2, glowSz, glowSz, glowSz/2);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);
  const av = await R(ws, ch, P, "Av", avCX-avSz/2, avCY-avSz/2, avSz, avSz, avSz/2);
  await G(ws, ch, av.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await S(ws, ch, av.id, { r: 0.08, g: 0.03, b: 0.12 }, 3);
  await Txt(ws, ch, P, "AvI", avCX-8, avCY-11, "S", 22, { fontWeight: 700, color: C.white });
  const onDot = await R(ws, ch, P, "On", avCX+avSz/2-10, avCY+avSz/2-10, 12, 12, 6);
  await F(ws, ch, onDot.id, C.online, 1); await S(ws, ch, onDot.id, C.bg, 2);

  // Name + Today
  await Txt(ws, ch, P, "Name", avCX-22, avCY+avSz/2+6, "Saeed", 18, { fontWeight: 700, color: C.textPri });
  const tY = avCY + avSz/2 + 30;
  const tBg = await R(ws, ch, P, "TBg", avCX-24, tY, 48, 20, 10);
  await F(ws, ch, tBg.id, C.accent, 0.15);
  await Txt(ws, ch, P, "TTx", avCX-17, tY+3, "Today", 11, { color: C.accent, fontWeight: 500 });
  console.log("✓ Header");

  // ── MESSAGES WITH BUBBLE BACKGROUNDS ──
  let y = tY + 32;
  const msgs = [
    { t: "Good morning Mr. Stephano", o: false, time: "09:12" },
    { t: "Good morning Saeed!", o: true, time: "09:14", read: true },
    { t: "Were you still open to meeting?", o: false, time: "09:15" },
    { t: "Nah man, it wont work out.", o: true, time: "09:18", read: true },
    { t: "Come on bro, don't be like that.\nYou know I've been looking\nforward to this.", o: false, time: "09:20" },
    { t: "Something just came up man.\nIm sorry.", o: true, time: "09:22", read: true },
    { t: "I don't care what came up.", o: false, time: "09:25" },
    { t: "I know you were looking forward\nto it man. Im sorry.", o: true, time: "09:26", read: true },
    { t: "Stefano I actually hate you\nso much", o: false, time: "09:30" },
  ];

  // Calculate total message height first to ensure they fit above input
  const inputAreaTop = H - 120; // Input area starts here
  const maxMsgBottom = inputAreaTop - 8;

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const prevSame = i > 0 && msgs[i-1].o === m.o;
    y += prevSame ? 3 : 8;
    if (y > maxMsgBottom - 50) break; // Don't overflow into input
    const h = await bubble(ws, ch, P, m.t, m.o, m.time, y, { read: m.read });
    y += h;
    console.log(`  ${m.o ? "→" : "←"} ${m.t.split('\n')[0].slice(0,30)}`);
  }

  // ── INPUT AREA ──
  // Snap/camera button (stroke circle)
  const inputY = inputAreaTop;
  const snapBtn = await R(ws, ch, P, "SnapBtn", 12, inputY+10, 44, 44, 22);
  await noFill(ws, ch, snapBtn.id);
  await S(ws, ch, snapBtn.id, C.accent, 2.5);
  // Camera lens inside
  const lens = await R(ws, ch, P, "Lens", 26, inputY+24, 16, 16, 8);
  await noFill(ws, ch, lens.id);
  await S(ws, ch, lens.id, C.accent, 2);
  const flash = await R(ws, ch, P, "Flash", 30, inputY+18, 8, 5, 2);
  await noFill(ws, ch, flash.id);
  await S(ws, ch, flash.id, C.accent, 1.5);

  // Text input
  const inputField = await R(ws, ch, P, "Input", 64, inputY+10, W-64-56, 44, 24);
  await F(ws, ch, inputField.id, C.inputBg, 1);
  await Txt(ws, ch, P, "Hint", 80, inputY+22, "Type with joy...", 16, { color: C.textMut });

  // Attach icon (simple line)
  const attLine = await R(ws, ch, P, "Att1", W-40, inputY+22, 3, 18, 1.5);
  await F(ws, ch, attLine.id, C.textMut, 0.7);
  const attTop = await R(ws, ch, P, "Att2", W-44, inputY+19, 10, 8, 5);
  await noFill(ws, ch, attTop.id);
  await S(ws, ch, attTop.id, C.textMut, 1.5);

  // Home indicator
  const ind = await R(ws, ch, P, "HI", (W-134)/2, H-8, 134, 5, 3);
  await F(ws, ch, ind.id, C.white, 0.22);

  console.log("✓ Input area");

  await cmd(ws, ch, "set_selections", { nodeIds: [P] });
  console.log(`\n✅ Chat v4 — Frame: ${P} at (${FX},${FY})`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
