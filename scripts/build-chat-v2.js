#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat Screen v2 — Clean build
// No emoji icons, no overlapping shapes, proper strokes, real bubbles
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";

const C = {
  bg:           { r: 0.047, g: 0.016, b: 0.082 },
  bubbleOut:    { r: 0.424, g: 0.173, b: 0.655 },
  bubbleIn:     { r: 0.165, g: 0.082, b: 0.271 },
  textOut:      { r: 1, g: 1, b: 1 },
  textIn:       { r: 0.941, g: 0.965, b: 0.988 },
  inputBg:      { r: 0.145, g: 0.082, b: 0.271 },
  textPri:      { r: 0.941, g: 0.965, b: 0.988 },
  textMut:      { r: 0.620, g: 0.561, b: 0.710 },
  accent:       { r: 0.729, g: 0.510, b: 0.929 },
  glow:         { r: 0.608, g: 0.435, b: 0.831 },
  success:      { r: 0.353, g: 0.620, b: 0.478 },
  online:       { r: 0.204, g: 0.827, b: 0.600 },
  white:        { r: 1, g: 1, b: 1 },
  black:        { r: 0, g: 0, b: 0 },
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
async function T(ws, ch, pid, n, x, y, content, sz, opts = {}) {
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
async function stroke(ws, ch, id, c, weight = 1) {
  await cmd(ws, ch, "set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a: 1 }, weight });
}
async function noFill(ws, ch, id) { await F(ws, ch, id, C.black, 0); }

// ═══ CIRCLE BUTTON (stroke border, no fill, with inner shape) ═══
async function circleBtn(ws, ch, pid, name, cx, cy, size, iconType) {
  const btn = await R(ws, ch, pid, `${name}_btn`, cx - size/2, cy - size/2, size, size, size/2);
  await noFill(ws, ch, btn.id);
  await stroke(ws, ch, btn.id, C.accent, 2.5);

  // Draw simple geometric icon inside
  if (iconType === "phone") {
    // Small tilted rectangle for phone handset
    const hw = 10, hh = 16;
    const handset = await R(ws, ch, pid, `${name}_icon`, cx - hw/2, cy - hh/2, hw, hh, 3);
    await noFill(ws, ch, handset.id);
    await stroke(ws, ch, handset.id, C.accent, 2);
  } else if (iconType === "video") {
    // Rectangle + triangle for video camera
    const bw = 14, bh = 10;
    const body = await R(ws, ch, pid, `${name}_body`, cx - 4 - bw/2, cy - bh/2, bw, bh, 2);
    await noFill(ws, ch, body.id);
    await stroke(ws, ch, body.id, C.accent, 2);
    // Triangle as small rectangle for lens
    const lens = await R(ws, ch, pid, `${name}_lens`, cx + bw/2 - 4, cy - 4, 8, 8, 1);
    await noFill(ws, ch, lens.id);
    await stroke(ws, ch, lens.id, C.accent, 2);
  } else if (iconType === "camera") {
    // Circle for lens + small rect on top for flash
    const lens = await R(ws, ch, pid, `${name}_lens`, cx - 7, cy - 5, 14, 14, 7);
    await noFill(ws, ch, lens.id);
    await stroke(ws, ch, lens.id, C.accent, 2);
    const top = await R(ws, ch, pid, `${name}_top`, cx - 4, cy - 10, 8, 5, 2);
    await noFill(ws, ch, top.id);
    await stroke(ws, ch, top.id, C.accent, 1.5);
  }
}

// ═══ MESSAGE BUBBLE ═══
async function msgBubble(ws, ch, pid, msgText, isOut, time, yPos, opts = {}) {
  const padH = 14, padV = 10;
  const fontSize = 15;
  const lineH = fontSize * 1.4;
  const maxBubbleW = W * 0.75;
  const maxTextW = maxBubbleW - padH * 2;

  // Estimate text dimensions
  const charW = fontSize * 0.48;
  const charsPerLine = Math.floor(maxTextW / charW);
  const lines = Math.max(1, Math.ceil(msgText.length / charsPerLine));
  const textW = Math.min(msgText.length * charW, maxTextW);
  const textH = lines * lineH;

  // Bubble size
  const timeStr = time;
  const timeW = timeStr.length * 6 + (isOut && opts.read ? 20 : 0);
  const contentW = Math.max(textW, timeW) + padH * 2;
  const bubbleW = Math.min(Math.max(contentW, 70), maxBubbleW);
  const bubbleH = padV + textH + 4 + 14 + padV; // top pad + text + gap + time + bottom pad

  const x = isOut ? W - 16 - bubbleW : 16;
  const bgColor = isOut ? C.bubbleOut : C.bubbleIn;
  const textColor = isOut ? C.textOut : C.textIn;

  // Bubble shape with proper rounded corners
  // Incoming: sharp bottom-left (4px), rest 18px
  // Outgoing: sharp bottom-right (4px), rest 18px
  const bg = await R(ws, ch, pid, `bubble_${time}_${isOut ? 'out' : 'in'}`,
    x, yPos, bubbleW, bubbleH, 18);
  await F(ws, ch, bg.id, bgColor, 1);

  // Message text
  await T(ws, ch, pid, `text_${time}`, x + padH, yPos + padV, msgText, fontSize, {
    color: textColor,
  });

  // Time
  const timeY = yPos + padV + textH + 4;
  const timeAlpha = 0.6;
  const dimColor = { r: textColor.r * timeAlpha, g: textColor.g * timeAlpha, b: textColor.b * timeAlpha };
  await T(ws, ch, pid, `time_${time}`, x + padH, timeY, time, 11, { color: dimColor });

  // Read receipt
  if (isOut && opts.read) {
    const checkX = x + padH + timeStr.length * 5.5 + 6;
    await T(ws, ch, pid, `read_${time}`, checkX, timeY, "✓✓", 10, { color: C.success });
  }

  return bubbleH;
}

// ═══ MAIN ═══
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  const FX = 13650, FY = 0;
  console.log("═══ Building Chat Screen v2 ═══\n");

  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – DM Chat (Dark)", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await F(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  console.log(`Frame: ${P}`);

  // ── DYNAMIC ISLAND ──
  await R(ws, ch, P, "Dynamic Island", (W-126)/2, 11, 126, 37, 20).then(n => F(ws, ch, n.id, C.black, 1));

  // ── STATUS BAR ──
  await T(ws, ch, P, "Time", 30, 14, "3:14", 17, { fontWeight: 700, color: C.white });
  const batt = await R(ws, ch, P, "Battery", W-39, 17, 27, 13, 4);
  await noFill(ws, ch, batt.id);
  await stroke(ws, ch, batt.id, C.white, 1.5);
  const battFill = await R(ws, ch, P, "BattFill", W-37, 19, 16, 9, 2);
  await F(ws, ch, battFill.id, C.white, 0.7);
  console.log("✓ Status bar");

  // ── HEADER ──
  const hY = 59;

  // Back chevron — simple "‹" text
  await T(ws, ch, P, "Back", 12, hY + 6, "‹", 30, { fontWeight: 300, color: C.textPri });

  // Call button (stroke circle + geometric phone icon)
  await circleBtn(ws, ch, P, "Call", 80, hY + 24, 40, "phone");

  // Video button (stroke circle + geometric cam icon)
  await circleBtn(ws, ch, P, "Video", W - 80, hY + 24, 40, "video");

  // Stack/overflow button — two overlapping squares
  const stX = W - 36, stY = hY + 14;
  const sq1 = await R(ws, ch, P, "Stack1", stX, stY, 14, 14, 2);
  await noFill(ws, ch, sq1.id);
  await stroke(ws, ch, sq1.id, C.textPri, 1.5);
  const sq2 = await R(ws, ch, P, "Stack2", stX + 5, stY + 5, 14, 14, 2);
  await noFill(ws, ch, sq2.id);
  await stroke(ws, ch, sq2.id, C.textPri, 1.5);

  // Avatar (center, 54px) with eclipse
  const avCX = W / 2, avCY = hY + 26;
  const avSz = 54;
  const glowSz = avSz * 1.65;

  // Glow
  const avGlow = await R(ws, ch, P, "AvatarGlow",
    avCX - glowSz/2, avCY - glowSz/2, glowSz, glowSz, glowSz/2);
  await G(ws, ch, avGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Avatar circle with stroke border (not overlapping shapes)
  const avCircle = await R(ws, ch, P, "AvatarCircle",
    avCX - avSz/2, avCY - avSz/2, avSz, avSz, avSz/2);
  await G(ws, ch, avCircle.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await stroke(ws, ch, avCircle.id, { r: 0.08, g: 0.03, b: 0.12 }, 3);

  // Initials
  await T(ws, ch, P, "AvatarInit", avCX - 8, avCY - 11, "S", 22, { fontWeight: 700, color: C.white });

  // Online dot
  const onSz = 12;
  const onDot = await R(ws, ch, P, "OnlineDot",
    avCX + avSz/2 - onSz + 2, avCY + avSz/2 - onSz + 2, onSz, onSz, onSz/2);
  await F(ws, ch, onDot.id, C.online, 1);
  await stroke(ws, ch, onDot.id, C.bg, 2);

  // Name
  await T(ws, ch, P, "ContactName", avCX - 22, avCY + avSz/2 + 6, "Saeed", 18, {
    fontWeight: 700, color: C.textPri,
  });

  // "Today" badge
  const todayY = avCY + avSz/2 + 30;
  const todayBg = await R(ws, ch, P, "TodayBadge", avCX - 24, todayY, 48, 20, 10);
  await F(ws, ch, todayBg.id, C.accent, 0.15);
  await T(ws, ch, P, "TodayText", avCX - 17, todayY + 3, "Today", 11, { color: C.accent, fontWeight: 500 });

  console.log("✓ Header\n");

  // ── MESSAGES ──
  let y = todayY + 32;

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

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const prevSameDir = i > 0 && msgs[i-1].o === m.o;
    y += prevSameDir ? 3 : 8;

    const h = await msgBubble(ws, ch, P, m.t, m.o, m.time, y, { read: m.read });
    y += h;
    console.log(`  ${m.o ? "→" : "←"} ${m.t.split('\n')[0].slice(0, 35)}`);
  }

  // ── INPUT AREA ──
  const inputY = H - 86;

  // Camera button (circle with stroke, geometric icon inside)
  await circleBtn(ws, ch, P, "Camera", 34, inputY + 30, 44, "camera");

  // Text input field
  const inputX = 64, inputW = W - 64 - 16;
  const inputField = await R(ws, ch, P, "InputField", inputX, inputY + 8, inputW, 44, 24);
  await F(ws, ch, inputField.id, C.inputBg, 1);

  // Placeholder text
  await T(ws, ch, P, "Placeholder", inputX + 16, inputY + 21, "Type with joy...", 16, { color: C.textMut });

  // Attachment icon (simple diagonal line + circle = paperclip feel)
  const attX = W - 44, attY = inputY + 20;
  const attLine = await R(ws, ch, P, "AttachLine", attX, attY, 3, 18, 1.5);
  await F(ws, ch, attLine.id, C.textMut, 0.7);
  const attCircle = await R(ws, ch, P, "AttachTop", attX - 3, attY - 2, 9, 9, 4.5);
  await noFill(ws, ch, attCircle.id);
  await stroke(ws, ch, attCircle.id, C.textMut, 1.5);

  console.log("\n✓ Input area");

  // ── HOME INDICATOR ──
  const indic = await R(ws, ch, P, "HomeIndicator", (W-134)/2, H-8, 134, 5, 3);
  await F(ws, ch, indic.id, C.white, 0.22);

  await cmd(ws, ch, "set_selections", { nodeIds: [P] });
  console.log(`\n✅ Chat Screen v2 — Frame: ${P}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
