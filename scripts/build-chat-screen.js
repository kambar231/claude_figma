#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat Screen — Dark Mode, 1-on-1 conversation
// Exact match to Flutter ChatScreen code
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_LOGO = "Bumbbled";
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";

// Dark mode colors
const C = {
  bg:             { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  bubbleOut:      { r: 0.424, g: 0.173, b: 0.655 },   // #6C2CA7
  bubbleIn:       { r: 0.165, g: 0.082, b: 0.271 },   // #2A1545
  bubbleTextOut:  { r: 1, g: 1, b: 1 },                // #FFFFFF
  bubbleTextIn:   { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  inputBg:        { r: 0.145, g: 0.082, b: 0.271 },   // #251545
  inputBorder:    { r: 0.608, g: 0.302, b: 0.792 },   // #9B4DCA (30% opacity)
  textPri:        { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textMut:        { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  accent:         { r: 0.729, g: 0.510, b: 0.929 },   // #BA82ED
  glow:           { r: 0.608, g: 0.435, b: 0.831 },   // #9B6FD4
  iconSec:        { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  shadow:         { r: 0.424, g: 0.173, b: 0.655 },   // #6C2CA7
  success:        { r: 0.353, g: 0.620, b: 0.478 },   // #5A9E7A (read receipt)
  online:         { r: 0.204, g: 0.827, b: 0.600 },   // #34D399
  white:          { r: 1, g: 1, b: 1 },
  black:          { r: 0, g: 0, b: 0 },
};

// ═══ HELPERS ═══
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
async function noFill(ws, ch, id) { await F(ws, ch, id, C.black, 0); }

// ═══ MESSAGE BUBBLE ═══
async function bubble(ws, ch, pid, text, isOutgoing, time, yPos, opts = {}) {
  const maxW = W * 0.75; // 295px
  const padH = 14, padV = 10;
  const fontSize = 15;
  const charsPerLine = Math.floor((maxW - padH * 2) / (fontSize * 0.52));
  const lines = Math.ceil(text.length / charsPerLine);
  const textH = lines * (fontSize * 1.4);
  const timeH = 14;
  const bubbleH = padV * 2 + textH + timeH + 2;
  const textW = Math.min(text.length * fontSize * 0.52, maxW - padH * 2);
  const bubbleW = textW + padH * 2 + 10;
  const clampedW = Math.min(Math.max(bubbleW, 80), maxW);

  const x = isOutgoing ? W - 16 - clampedW : 16;
  const bgColor = isOutgoing ? C.bubbleOut : C.bubbleIn;
  const textColor = isOutgoing ? C.bubbleTextOut : C.bubbleTextIn;

  // Bubble background
  const bg = await R(ws, ch, pid, `msg_${time}`, x, yPos, clampedW, bubbleH, 18);
  await F(ws, ch, bg.id, bgColor, 1);

  // Message text
  await T(ws, ch, pid, `msg_text_${time}`, x + padH, yPos + padV, text, fontSize, { color: textColor });

  // Time stamp
  const timeColor = { r: textColor.r, g: textColor.g, b: textColor.b };
  await T(ws, ch, pid, `msg_time_${time}`, x + padH, yPos + padV + textH + 2, time, 11, {
    color: { r: timeColor.r * 0.6, g: timeColor.g * 0.6, b: timeColor.b * 0.6 },
  });

  // Read receipt for outgoing (double check)
  if (isOutgoing && opts.read) {
    await T(ws, ch, pid, `msg_read_${time}`, x + padH + time.length * 6 + 6, yPos + padV + textH + 2, "✓✓", 11, {
      color: C.success,
    });
  }

  return { y: yPos, h: bubbleH };
}

// ═══ MAIN ═══
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  const FX = 13650, FY = 0; // Next to home screen
  console.log("═══ Building Chat Screen ═══\n");

  // ── PHONE FRAME ──
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – DM Chat (Dark)", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await F(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  console.log(`Frame: ${P}`);

  // ── DYNAMIC ISLAND ──
  const notch = await R(ws, ch, P, "Dynamic Island", (W - 126) / 2, 11, 126, 37, 20);
  await F(ws, ch, notch.id, C.black, 1);

  // ── STATUS BAR ──
  await T(ws, ch, P, "Time", 30, 14, "3:14", 17, { fontWeight: 700, color: C.white });
  const bBody = await R(ws, ch, P, "Battery", W - 39, 17, 27, 13, 4);
  await F(ws, ch, bBody.id, C.white, 0.85);
  const bFill = await R(ws, ch, P, "BattFill", W - 37, 19, 16, 9, 2);
  await F(ws, ch, bFill.id, C.white, 0.7);
  console.log("✓ Status bar");

  // ── CHAT HEADER (120px) ──
  const headerY = 59;

  // Back arrow (left)
  await T(ws, ch, P, "Back", 8, headerY + 8, "‹", 28, { fontWeight: 300, color: C.textPri });

  // Phone call button (circle with border)
  const callX = 68, callY = headerY + 6;
  const callCircle = await R(ws, ch, P, "Call Btn", callX, callY, 40, 40, 20);
  await noFill(ws, ch, callCircle.id);
  const callBorder = await R(ws, ch, P, "Call Border", callX, callY, 40, 40, 20);
  await F(ws, ch, callBorder.id, C.accent, 0.3); // Will look like a border
  const callInner = await R(ws, ch, P, "Call Inner", callX + 2.5, callY + 2.5, 35, 35, 17.5);
  await F(ws, ch, callInner.id, C.bg, 1);
  await T(ws, ch, P, "Call Icon", callX + 10, callY + 10, "📞", 16, { color: C.accent });

  // Video call button
  const vidX = W - 108, vidY = headerY + 6;
  const vidCircle = await R(ws, ch, P, "Video Btn", vidX, vidY, 40, 40, 20);
  await F(ws, ch, vidCircle.id, C.accent, 0.3);
  const vidInner = await R(ws, ch, P, "Video Inner", vidX + 2.5, vidY + 2.5, 35, 35, 17.5);
  await F(ws, ch, vidInner.id, C.bg, 1);
  await T(ws, ch, P, "Video Icon", vidX + 10, vidY + 10, "📹", 16, { color: C.accent });

  // Stack button (far right)
  await T(ws, ch, P, "Stack", W - 44, headerY + 14, "⊞", 20, { color: C.textPri });

  // Avatar with eclipse glow (center, 54px)
  const avCX = W / 2, avCY = headerY + 24;
  const avSize = 54;
  const glowSize = avSize * 1.65;
  const ringSize = avSize * 0.94;

  // Glow
  const avGlow = await R(ws, ch, P, "Avatar Glow",
    avCX - glowSize / 2, avCY - glowSize / 2, glowSize, glowSize, glowSize / 2);
  await G(ws, ch, avGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.60, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.00, position: 1 },
  ]);
  // Glass ring
  const avRing = await R(ws, ch, P, "Avatar Ring",
    avCX - ringSize / 2, avCY - ringSize / 2, ringSize, ringSize, ringSize / 2);
  await F(ws, ch, avRing.id, C.bg, 0.85);
  // Avatar photo
  const avPhoto = await R(ws, ch, P, "Avatar Photo",
    avCX - avSize / 2, avCY - avSize / 2, avSize, avSize, avSize / 2);
  await G(ws, ch, avPhoto.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  // Initials
  await T(ws, ch, P, "Avatar Init", avCX - 8, avCY - 10, "S", 20, { fontWeight: 700, color: C.white });
  // Online badge
  const onlineSz = 12;
  const onlineBadge = await R(ws, ch, P, "Online Badge",
    avCX + avSize / 2 - onlineSz + 2, avCY + avSize / 2 - onlineSz + 2, onlineSz, onlineSz, onlineSz / 2);
  await F(ws, ch, onlineBadge.id, C.online, 1);

  // Name below avatar — SF Pro Rounded Bold 18px (falling back to UI font)
  await T(ws, ch, P, "Contact Name", avCX - 22, avCY + avSize / 2 + 4, "Saeed", 18, {
    fontWeight: 700, color: C.textPri,
  });

  // "Today" badge
  const todayY = avCY + avSize / 2 + 28;
  const todayBg = await R(ws, ch, P, "Today Badge", avCX - 24, todayY, 48, 20, 10);
  await F(ws, ch, todayBg.id, C.accent, 0.15);
  await T(ws, ch, P, "Today Text", avCX - 18, todayY + 3, "Today", 11, { color: C.accent, fontWeight: 500 });

  console.log("✓ Chat header (avatar + name + buttons)");

  // ── MESSAGES ──
  const msgStartY = todayY + 32;
  let y = msgStartY;
  const gap = 6;
  const smallGap = 2;

  const messages = [
    { text: "Good morning Mr. Stephano", out: false, time: "09:12" },
    { text: "Good morning Saeed!", out: true, time: "09:14", read: true },
    { text: "Were you still open to meeting?", out: false, time: "09:15" },
    { text: "Nah man, it wont work out.", out: true, time: "09:18", read: true },
    { text: "Come on bro, don't be like that. You know I've been looking forward to this.", out: false, time: "09:20" },
    { text: "Something just came up man. Im sorry.", out: true, time: "09:22", read: true },
    { text: "I don't care what came up.", out: false, time: "09:25" },
    { text: "I know you were looking forward to it man. Im sorry.", out: true, time: "09:26", read: true },
    { text: "Stefano I actually hate you so much", out: false, time: "09:30" },
  ];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prevSameDir = i > 0 && messages[i - 1].out === m.out;
    const spacing = prevSameDir ? smallGap : gap;
    y += spacing;

    const result = await bubble(ws, ch, P, m.text, m.out, m.time, y, { read: m.read });
    y += result.h;
    console.log(`  ✓ ${m.out ? "→" : "←"} "${m.text.slice(0, 30)}..."`);
  }

  // ── INPUT AREA ──
  const inputY = H - 90;

  // Camera button (circle with accent border)
  const camX = 12, camY = inputY + 8;
  const camCircle = await R(ws, ch, P, "Cam Border", camX, camY, 44, 44, 22);
  await F(ws, ch, camCircle.id, C.accent, 0.3);
  const camInner = await R(ws, ch, P, "Cam Inner", camX + 2.5, camY + 2.5, 39, 39, 19.5);
  await F(ws, ch, camInner.id, C.bg, 1);
  await T(ws, ch, P, "Cam Icon", camX + 12, camY + 12, "📷", 16, { color: C.accent });

  // Text input field
  const inputX = 64, inputW = W - 64 - 52;
  const inputBg = await R(ws, ch, P, "Input Field", inputX, inputY + 10, inputW, 44, 24);
  await F(ws, ch, inputBg.id, C.inputBg, 1);
  // Placeholder
  await T(ws, ch, P, "Input Hint", inputX + 16, inputY + 22, "Type with joy...", 16, { color: C.textMut });

  // Attachment button (right)
  await T(ws, ch, P, "Attach", W - 44, inputY + 22, "📎", 20, { color: C.iconSec });

  // Home indicator
  const indic = await R(ws, ch, P, "HomeIndicator", (W - 134) / 2, H - 8, 134, 5, 3);
  await F(ws, ch, indic.id, C.white, 0.22);

  console.log("✓ Input area");

  await cmd(ws, ch, "set_selections", { nodeIds: [P] });
  console.log(`\n✅ Chat Screen done — Frame: ${P}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
