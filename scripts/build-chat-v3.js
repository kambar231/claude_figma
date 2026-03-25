#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat Screen v3 — Matched to actual reference screenshot
// Messages as text (no prominent bubble bg), frosted glass input,
// glass ball bottom-left, proper header
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

// Dark mode
const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },  // #F0F6FC
  textSec:   { r: 0.820, g: 0.769, b: 0.914 },  // #D1C4E9
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },  // #9E8FB5
  accent:    { r: 0.729, g: 0.510, b: 0.929 },  // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831 },  // #9B6FD4
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },  // #251545
  success:   { r: 0.353, g: 0.620, b: 0.478 },  // #5A9E7A
  online:    { r: 0.204, g: 0.827, b: 0.600 },  // #34D399
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
async function stroke(ws, ch, id, c, weight = 1, alpha = 1) {
  await cmd(ws, ch, "set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a: alpha }, weight });
}
async function noFill(ws, ch, id) { await F(ws, ch, id, C.black, 0); }

// ═══ MAIN ═══
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n═══ Building Chat Screen v3 ═══\n`);

  const FX = 13650, FY = 0;
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – DM Chat (Dark)", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await F(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  console.log(`Frame: ${P}`);

  // ══════════ DYNAMIC ISLAND ══════════
  const notch = await R(ws, ch, P, "DynIsland", (W-126)/2, 11, 126, 37, 20);
  await F(ws, ch, notch.id, C.black, 1);

  // ══════════ STATUS BAR ══════════
  await T(ws, ch, P, "Time", 30, 14, "3:14", 17, { fontWeight: 700, color: C.white });
  // Battery (stroke outline + fill)
  const batt = await R(ws, ch, P, "Batt", W-39, 17, 27, 13, 4);
  await noFill(ws, ch, batt.id);
  await stroke(ws, ch, batt.id, C.white, 1.5);
  const battF = await R(ws, ch, P, "BattFill", W-37, 19, 16, 9, 2);
  await F(ws, ch, battF.id, C.white, 0.7);
  console.log("✓ Status bar");

  // ══════════ HEADER (height ~120px) ══════════
  const hY = 59;

  // Back chevron
  await T(ws, ch, P, "Back", 10, hY + 4, "‹", 32, { fontWeight: 300, color: C.textPri });

  // Call button — circle with stroke border, phone shape inside
  const callCX = 72, callCY = hY + 22;
  const callBtn = await R(ws, ch, P, "CallBtn", callCX-20, callCY-20, 40, 40, 20);
  await noFill(ws, ch, callBtn.id);
  await stroke(ws, ch, callBtn.id, C.accent, 2.5);
  // Phone handset shape: tilted rectangle
  const ph1 = await R(ws, ch, P, "PhoneTop", callCX-5, callCY-8, 10, 6, 3);
  await F(ws, ch, ph1.id, C.accent, 1);
  const ph2 = await R(ws, ch, P, "PhoneMid", callCX-2, callCY-4, 4, 8, 1);
  await F(ws, ch, ph2.id, C.accent, 1);
  const ph3 = await R(ws, ch, P, "PhoneBot", callCX-5, callCY+2, 10, 6, 3);
  await F(ws, ch, ph3.id, C.accent, 1);

  // Video button — circle with stroke, camera shape inside
  const vidCX = W - 72, vidCY = hY + 22;
  const vidBtn = await R(ws, ch, P, "VideoBtn", vidCX-20, vidCY-20, 40, 40, 20);
  await noFill(ws, ch, vidBtn.id);
  await stroke(ws, ch, vidBtn.id, C.accent, 2.5);
  // Camera body + lens
  const camBody = await R(ws, ch, P, "CamBody", vidCX-10, vidCY-6, 14, 12, 2);
  await F(ws, ch, camBody.id, C.accent, 1);
  const camLens = await R(ws, ch, P, "CamLens", vidCX+5, vidCY-4, 6, 8, 1);
  await F(ws, ch, camLens.id, C.accent, 1);

  // Overflow dots (far right) — 4 dots in 2x2
  const dotsX = W - 30, dotsY = hY + 14;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const dot = await R(ws, ch, P, `Dot${r}${c}`, dotsX + c*8, dotsY + r*8, 4, 4, 2);
      await F(ws, ch, dot.id, C.textPri, 0.8);
    }
  }

  // Center avatar with eclipse glow (54px)
  const avCX = W / 2, avCY = hY + 24;
  const avSz = 54, glowSz = avSz * 1.65;

  // Glow
  const avGlow = await R(ws, ch, P, "AvGlow",
    avCX-glowSz/2, avCY-glowSz/2, glowSz, glowSz, glowSz/2);
  await G(ws, ch, avGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);
  // Avatar with stroke border
  const avCircle = await R(ws, ch, P, "Avatar",
    avCX-avSz/2, avCY-avSz/2, avSz, avSz, avSz/2);
  await G(ws, ch, avCircle.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await stroke(ws, ch, avCircle.id, { r: 0.08, g: 0.03, b: 0.12 }, 3);
  // Initials
  await T(ws, ch, P, "AvInit", avCX-8, avCY-11, "S", 22, { fontWeight: 700, color: C.white });
  // Online dot
  const onDot = await R(ws, ch, P, "Online",
    avCX+avSz/2-10, avCY+avSz/2-10, 12, 12, 6);
  await F(ws, ch, onDot.id, C.online, 1);
  await stroke(ws, ch, onDot.id, C.bg, 2);

  // Name (SFProRounded Bold 18px)
  await T(ws, ch, P, "Name", avCX-22, avCY+avSz/2+6, "Saeed", 18, {
    fontWeight: 700, color: C.textPri,
  });

  // "Today" badge
  const todayY = avCY + avSz/2 + 30;
  const todayBg = await R(ws, ch, P, "TodayBg", avCX-24, todayY, 48, 20, 10);
  await F(ws, ch, todayBg.id, C.accent, 0.15);
  await T(ws, ch, P, "TodayTxt", avCX-17, todayY+3, "Today", 11, { color: C.accent, fontWeight: 500 });
  console.log("✓ Header");

  // ══════════ MESSAGES (plain text, no bubble backgrounds) ══════════
  // From reference: incoming = muted text left, outgoing = lighter text right
  // Font: ABCArizonaMix 15px
  // Incoming text color: textMuted (#9E8FB5) — lighter/faded
  // Outgoing text color: textPrimary (#F0F6FC) — brighter
  const msgStart = todayY + 34;
  const lineH = 22; // 15px * 1.4 + spacing

  const msgs = [
    { t: "Good morning Mr. Stephano", o: false },
    { t: "Good morning Saeed!", o: true },
    { t: "Were you still open to meeting?", o: false },
    { t: "Nah man, it wont work out.", o: true },
    { t: "Come on bro, don't be like that.\nYou know I've been looking\nforward to this.", o: false },
    { t: "Something just came up man.\nIm sorry.", o: true },
    { t: "I don't care what came up.", o: false },
    { t: "I know you were looking forward\nto it man. Im sorry.", o: true },
    { t: "Stefano I actually hate you\nso much", o: false },
  ];

  let y = msgStart;
  for (const m of msgs) {
    const lines = m.t.split('\n');
    const textColor = m.o ? C.textPri : C.textSec;
    const x = m.o ? W - 16 : 16;
    // Estimate width for right-alignment
    const maxLineLen = Math.max(...lines.map(l => l.length));
    const estW = maxLineLen * 7.2; // approximate char width at 15px
    const textX = m.o ? W - 16 - estW : 16;

    await T(ws, ch, P, `msg_${y}`, textX, y, m.t, 15, {
      color: textColor,
    });

    y += lines.length * lineH + 8;
  }
  console.log("✓ Messages");

  // ══════════ BOTTOM FROSTED GLASS INPUT AREA ══════════
  // Large rounded card at bottom — frosted glass effect
  // From code: 24px top radius, 28px bottom radius (keyboard closed)
  // Background: #251545 (inputBg) with slight transparency
  const inputAreaH = 140; // Taller to match reference
  const inputAreaY = H - inputAreaH - 10; // 10px from bottom edge

  // Frosted glass background card
  const glassCard = await R(ws, ch, P, "InputGlass", 8, inputAreaY, W-16, inputAreaH, 28);
  await G(ws, ch, glassCard.id, "GRADIENT_LINEAR", [
    { r: 0.12, g: 0.06, b: 0.20, a: 0.85, position: 0 },
    { r: 0.10, g: 0.05, b: 0.16, a: 0.90, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  // Subtle top border
  await stroke(ws, ch, glassCard.id, C.white, 0.5, 0.08);

  // Text input field inside glass card
  const inputFieldY = inputAreaY + 20;
  const inputField = await R(ws, ch, P, "InputField", 72, inputFieldY, W - 72 - 24, 44, 24);
  await F(ws, ch, inputField.id, C.inputBg, 0.6);

  // Placeholder "Type with joy..." (or belo hint)
  await T(ws, ch, P, "InputHint", 88, inputFieldY + 12, "Type with joy...", 16, {
    color: { r: C.textMut.r, g: C.textMut.g, b: C.textMut.b },
  });

  // ══════════ GLASS BALL (bottom-left) ══════════
  // Eclipse bubble: 44px avatar, 72px glow
  const ballCX = 40, ballCY = inputAreaY + inputAreaH - 36;
  const ballSz = 44, ballGlow = ballSz * 1.65;
  const ballRing = ballSz * 0.94;

  // Glow
  const bGlow = await R(ws, ch, P, "BallGlow",
    ballCX-ballGlow/2, ballCY-ballGlow/2, ballGlow, ballGlow, ballGlow/2);
  await G(ws, ch, bGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Frosted glass ring
  const bRing = await R(ws, ch, P, "BallRing",
    ballCX-ballRing/2, ballCY-ballRing/2, ballRing, ballRing, ballRing/2);
  await F(ws, ch, bRing.id, C.bg, 0.85);

  // Inner highlight
  const bHighlight = await R(ws, ch, P, "BallHighlight",
    ballCX-ballRing/2, ballCY-ballRing/2, ballRing, ballRing, ballRing/2);
  await G(ws, ch, bHighlight.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.10, position: 0 },
    { r: 1, g: 1, b: 1, a: 0.0, position: 0.5 },
  ], [{ x: 0.5, y: -0.2 }, { x: 0.5, y: 1 }, { x: 1, y: -0.2 }]);

  // Ball fill (subtle purple)
  const bFill = await R(ws, ch, P, "BallFill",
    ballCX-ballSz*0.4, ballCY-ballSz*0.4, ballSz*0.8, ballSz*0.8, ballSz*0.4);
  await G(ws, ch, bFill.id, "GRADIENT_RADIAL", [
    { r: 0.55, g: 0.35, b: 0.80, a: 0.4, position: 0 },
    { r: 0.40, g: 0.20, b: 0.65, a: 0.25, position: 0.5 },
    { r: 0.30, g: 0.15, b: 0.50, a: 0.1, position: 1 },
  ]);

  console.log("✓ Glass ball + Input area");

  // ══════════ HOME INDICATOR ══════════
  const indic = await R(ws, ch, P, "HomeInd", (W-134)/2, H-8, 134, 5, 3);
  await F(ws, ch, indic.id, C.white, 0.22);

  await cmd(ws, ch, "set_selections", { nodeIds: [P] });
  console.log(`\n✅ Chat v3 — Frame: ${P}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
