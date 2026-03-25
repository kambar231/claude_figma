#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Exp1: HTML Rendering Pipeline -> Figma
// Reads the HTML chat screen and recreates it as Figma nodes
// Placement: (14600, 0), Frame: "Exp1: HTML Pipeline"
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const ORIGIN_X = 14600, ORIGIN_Y = 0;

// ── Exact dark-mode colors (0-1 range for Figma) ─────────────
const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  bubbleOut: { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7
  bubbleIn:  { r: 0.165, g: 0.082, b: 0.271 },  // #2A1545
  textOut:   { r: 1, g: 1, b: 1 },               // #FFFFFF
  textIn:    { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textSec:   { r: 0.820, g: 0.769, b: 0.914 },   // #D1C4E9
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },   // #251545
  accent:    { r: 0.729, g: 0.510, b: 0.929 },   // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831 },   // #9B6FD4
  success:   { r: 0.353, g: 0.620, b: 0.478 },   // #5A9E7A
  iconPri:   { r: 0.831, g: 0.722, b: 1.000 },   // #D4B8FF
  iconSec:   { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  shadow:    { r: 0.424, g: 0.173, b: 0.655 },   // #6C2CA7
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
};

// Apply alpha to a color (returns new object)
function withAlpha(c, a) { return { r: c.r, g: c.g, b: c.b, a }; }

// ── WebSocket helpers ─────────────────────────────────────────
async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  const entries = Object.entries(ch);
  if (entries.length === 0) throw new Error("No active channels on relay");
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (d.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(t);
        d.message.error ? reject(new Error(JSON.stringify(d.message.error))) : resolve(d.message.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}

// ── Shorthand builders ────────────────────────────────────────
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
// Ellipse via rounded rectangle (no create_ellipse in plugin)
async function Ell(ws, ch, pid, n, x, y, w, h) {
  const r = await cmd(ws, ch, "create_rectangle", { name: n, x, y, width: w, height: h, parentId: pid });
  await cmd(ws, ch, "set_corner_radius", { nodeId: r.id, radius: Math.round(Math.max(w, h) / 2) });
  return r;
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

// ── Message data ──────────────────────────────────────────────
const MESSAGES = [
  { text: "Hey, how are you doing? \u{1F60A}", out: false, time: "10:30", first: true, last: true, status: null },
  { text: "I'm great! Just finished that project we discussed last week", out: true, time: "10:31", first: true, last: false, status: "read" },
  { text: "It turned out really well!", out: true, time: "10:31", first: false, last: true, status: "read" },
  { text: "That's amazing! Can you share some screenshots?", out: false, time: "10:33", first: true, last: true, status: null },
  { text: "Sure! Let me send them over. The design system is looking really clean now with the dark mode", out: true, time: "10:34", first: true, last: true, status: "read" },
  { text: "I love the purple gradient!", out: false, time: "10:35", first: true, last: false, status: null },
  { text: "The glass effects are so elegant \u{2728}", out: false, time: "10:35", first: false, last: true, status: null },
  { text: "Thanks! The cosmic theme really ties it all together", out: true, time: "10:36", first: true, last: true, status: "delivered" },
  { text: "Can't wait to see the final version! When do you think it'll be ready?", out: false, time: "10:38", first: true, last: true, status: null },
];

// ── Bubble geometry calculator ────────────────────────────────
function calcBubble(text, isOut, time, isLast, status) {
  const padH = 14, padV = 10;
  const fontSize = 15;
  const charW = fontSize * 0.48;
  const maxBubbleW = W * 0.75;
  const maxTextW = maxBubbleW - padH * 2;

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (testLine.length * charW > maxTextW && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const maxLineChars = Math.max(...lines.map(l => l.length));
  const longestLineW = Math.min(maxLineChars * charW, maxTextW);
  const textH = lines.length * (fontSize * 1.4);

  const timeW = time.length * 5.5 + (isOut && status ? 22 : 0);
  const contentW = Math.max(longestLineW, timeW);
  const bubbleW = Math.min(contentW + padH * 2, maxBubbleW);
  const bubbleH = padV + textH + 3 + 13 + padV;

  return { bubbleW, bubbleH, padH, padV, textH, fontSize };
}

// ══════════════════════════════════════════════════════════════
// MAIN BUILD
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log("[Exp1] Discovering channel...");
  const channel = await discoverChannel();
  console.log(`[Exp1] Channel: ${channel}`);

  console.log("[Exp1] Connecting WebSocket...");
  const ws = new WebSocket(RELAY_URL);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 300));
  console.log("[Exp1] Connected & joined.");

  // ── Create main frame ───────────────────────────────────────
  const frame = await cmd(ws, channel, "create_frame", {
    name: "Exp1: HTML Pipeline",
    x: ORIGIN_X, y: ORIGIN_Y,
    width: W, height: H,
  });
  const fid = frame.id;
  console.log(`[Exp1] Frame: ${fid}`);

  // Background
  await F(ws, channel, fid, C.bg);

  // ── Status bar (59px) ───────────────────────────────────────
  console.log("[Exp1] Building status bar...");
  await Txt(ws, channel, fid, "StatusTime", 30, 17, "9:41", 15, { fontWeight: 600, color: C.textPri });

  // Dynamic Island
  const island = await R(ws, channel, fid, "DynamicIsland", (W - 126) / 2, 14, 126, 37, 22);
  await F(ws, channel, island.id, C.black);

  // Battery icon (simplified)
  const batt = await R(ws, channel, fid, "Battery", W - 52, 18, 24, 12, 3);
  await noFill(ws, channel, batt.id);
  await S(ws, channel, batt.id, C.textPri, 1);
  const battFill = await R(ws, channel, fid, "BatteryFill", W - 50, 20, 19, 8, 1.5);
  await F(ws, channel, battFill.id, C.textPri);

  // ── Header (120px, starting at y=59) ────────────────────────
  console.log("[Exp1] Building header...");
  const headerY = 59;

  // Back chevron
  await Txt(ws, channel, fid, "BackBtn", 16, headerY + 18, "\u2039", 28, { fontWeight: 300, color: C.textPri });

  // Call button (left-center)
  await Txt(ws, channel, fid, "CallIcon", 86, headerY + 22, "\u260E", 18, { color: C.iconPri });

  // Video button (right-center)
  await Txt(ws, channel, fid, "VideoIcon", W - 106, headerY + 22, "\u25B6", 16, { color: C.iconPri });

  // Stack icon (far right)
  await Txt(ws, channel, fid, "StackIcon", W - 36, headerY + 20, "\u25A1", 18, { color: C.textPri });

  // Avatar (centered)
  const avatarCX = W / 2;
  const glowSize = 89;
  const avatarGlow = await Ell(ws, channel, fid, "AvatarGlow", avatarCX - glowSize / 2, headerY + 2, glowSize, glowSize);
  await G(ws, channel, avatarGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.30, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.10, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.00, position: 1.0 },
  ]);

  const ringSize = 51;
  const avatarRing = await Ell(ws, channel, fid, "AvatarRing", avatarCX - ringSize / 2, headerY + 2 + (glowSize - ringSize) / 2, ringSize, ringSize);
  await F(ws, channel, avatarRing.id, C.white, 0.08);
  await S(ws, channel, avatarRing.id, { r: 1, g: 1, b: 1 }, 1.5);

  const aSize = 46;
  const avatarCircle = await Ell(ws, channel, fid, "AvatarCircle", avatarCX - aSize / 2, headerY + 2 + (glowSize - aSize) / 2, aSize, aSize);
  await G(ws, channel, avatarCircle.id, "GRADIENT_LINEAR", [
    { r: 0.424, g: 0.173, b: 0.655, a: 1, position: 0 },
    { r: 0.608, g: 0.302, b: 0.792, a: 1, position: 1 },
  ]);

  await Txt(ws, channel, fid, "AvatarLetter", avatarCX - 6, headerY + 2 + (glowSize - aSize) / 2 + 12, "E", 18, { fontWeight: 600, color: C.white });

  // Name below avatar
  const nameY = headerY + 2 + glowSize - 8;
  await Txt(ws, channel, fid, "HeaderName", avatarCX - 20, nameY, "Elena", 18, { fontWeight: 500, color: C.textPri });
  const onlineY = nameY + 22;
  await Txt(ws, channel, fid, "OnlineStatus", avatarCX - 16, onlineY, "online", 11, { color: C.success });

  // ── Messages ────────────────────────────────────────────────
  console.log("[Exp1] Building messages...");
  let cursorY = headerY + 120 + 4;

  for (let i = 0; i < MESSAGES.length; i++) {
    const m = MESSAGES[i];
    const { bubbleW, bubbleH, padH, padV, textH, fontSize } = calcBubble(m.text, m.out, m.time, m.last, m.status);

    const topPad = m.first ? 6 : 2;
    const botPad = m.last ? 6 : 2;
    cursorY += topPad;

    const bx = m.out ? W - 16 - bubbleW : 16;

    // Bubble background
    const bg = await R(ws, channel, fid, `Bubble${i}`, bx, cursorY, bubbleW, bubbleH, 18);
    await F(ws, channel, bg.id, m.out ? C.bubbleOut : C.bubbleIn);

    // Note: Individual corner radius (4px on sender side for last-in-group)
    // is not reliably supported via the plugin API, so all bubbles use uniform 18px.

    // Bubble text
    const textColor = m.out ? C.textOut : C.textIn;
    const txtNode = await Txt(ws, channel, fid, `MsgText${i}`, bx + padH, cursorY + padV, m.text, fontSize, {
      color: textColor, fontWeight: 400,
    });
    // Resize text to fit bubble width
    await cmd(ws, channel, "resize_node", { nodeId: txtNode.id, width: bubbleW - padH * 2, height: textH });

    // Timestamp (use 60% opacity via color alpha)
    const timeY = cursorY + padV + textH + 3;
    const timeX = m.out ? bx + bubbleW - padH - (m.time.length * 5.5 + (m.status ? 22 : 0)) : bx + padH;
    const timeAlphaColor = withAlpha(textColor, 0.6);
    await Txt(ws, channel, fid, `MsgTime${i}`, timeX, timeY, m.time, 11, { color: timeAlphaColor });

    // Read receipt check marks for outgoing
    if (m.out && m.status) {
      const checkX = timeX + m.time.length * 5.5 + 4;
      const checkColor = m.status === "read" ? C.success : withAlpha(textColor, 0.6);
      await Txt(ws, channel, fid, `MsgCheck${i}`, checkX, timeY - 1, "\u2713\u2713", 11, { color: checkColor });
    }

    cursorY += bubbleH + botPad;
  }

  // ── Input Area ──────────────────────────────────────────────
  console.log("[Exp1] Building input area...");
  const inputAreaY = H - 110;
  const inputAreaH = 110;

  // Input area background
  const inputBg = await R(ws, channel, fid, "InputAreaBg", 0, inputAreaY, W, inputAreaH, 24);
  await F(ws, channel, inputBg.id, C.bg);

  // Top border line
  const borderLine = await R(ws, channel, fid, "InputBorder", 0, inputAreaY, W, 0.5, 0);
  await F(ws, channel, borderLine.id, C.white, 0.08);

  // Glass ball (left) - glow + ring + inner
  const ballY = inputAreaY + 14;
  const ballGlowSize = 72;
  const ballGlow = await Ell(ws, channel, fid, "BallGlow", 12, ballY - 4, ballGlowSize, ballGlowSize);
  await G(ws, channel, ballGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.18, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.07, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.00, position: 1.0 },
  ]);

  const ballRingSize = 41;
  const ballRingX = 12 + (ballGlowSize - ballRingSize) / 2;
  const ballRingY = ballY - 4 + (ballGlowSize - ballRingSize) / 2;
  const ballRing = await Ell(ws, channel, fid, "BallRing", ballRingX, ballRingY, ballRingSize, ballRingSize);
  await F(ws, channel, ballRing.id, C.white, 0.06);
  await S(ws, channel, ballRing.id, { r: 1, g: 1, b: 1 }, 1.5);

  const ballInnerSize = 36;
  const ballInnerX = 12 + (ballGlowSize - ballInnerSize) / 2;
  const ballInnerY = ballY - 4 + (ballGlowSize - ballInnerSize) / 2;
  const ballInner = await Ell(ws, channel, fid, "BallInner", ballInnerX, ballInnerY, ballInnerSize, ballInnerSize);
  await G(ws, channel, ballInner.id, "GRADIENT_RADIAL", [
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.30, position: 0 },
    { r: C.bubbleOut.r, g: C.bubbleOut.g, b: C.bubbleOut.b, a: 0.20, position: 1 },
  ]);

  // Camera icon (text placeholder)
  await Txt(ws, channel, fid, "CamIcon", ballInnerX + 8, ballInnerY + 8, "\u{1F4F7}", 14, { color: C.accent });

  // "belo" hint text in input area (18% opacity via alpha)
  const beloHintX = 12 + ballGlowSize + 10;
  await Txt(ws, channel, fid, "BeloHint", beloHintX, inputAreaY + 28, "belo", 20, {
    fontFamily: FONT_LOGO, color: withAlpha(C.textPri, 0.18),
  });

  // Voice button (right) - glow + ring + inner
  const voiceGlowSize = 66;
  const voiceGlowX = W - 12 - voiceGlowSize;
  const voiceGlowY = ballY - 1;
  const voiceGlow = await Ell(ws, channel, fid, "VoiceGlow", voiceGlowX, voiceGlowY, voiceGlowSize, voiceGlowSize);
  await G(ws, channel, voiceGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.18, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.07, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.00, position: 1.0 },
  ]);

  const voiceRingSize = 37;
  const voiceRingX = voiceGlowX + (voiceGlowSize - voiceRingSize) / 2;
  const voiceRingY = voiceGlowY + (voiceGlowSize - voiceRingSize) / 2;
  const voiceRing = await Ell(ws, channel, fid, "VoiceRing", voiceRingX, voiceRingY, voiceRingSize, voiceRingSize);
  await F(ws, channel, voiceRing.id, C.white, 0.06);
  await S(ws, channel, voiceRing.id, { r: 1, g: 1, b: 1 }, 1.5);

  const voiceInnerSize = 32;
  const voiceInnerX = voiceGlowX + (voiceGlowSize - voiceInnerSize) / 2;
  const voiceInnerY = voiceGlowY + (voiceGlowSize - voiceInnerSize) / 2;
  const voiceInner = await Ell(ws, channel, fid, "VoiceInner", voiceInnerX, voiceInnerY, voiceInnerSize, voiceInnerSize);
  await G(ws, channel, voiceInner.id, "GRADIENT_RADIAL", [
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.30, position: 0 },
    { r: C.bubbleOut.r, g: C.bubbleOut.g, b: C.bubbleOut.b, a: 0.20, position: 1 },
  ]);

  // Mic icon (text placeholder)
  await Txt(ws, channel, fid, "MicIcon", voiceInnerX + 7, voiceInnerY + 6, "\u{1F3A4}", 14, { color: C.accent });

  console.log("[Exp1] Done! Frame placed at (14600, 0).");
  ws.close();
}

main().catch(e => { console.error("[Exp1] FATAL:", e); process.exit(1); });
