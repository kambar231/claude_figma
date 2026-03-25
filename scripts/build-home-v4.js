#!/usr/bin/env bun
// Belo Home Screen v4 — matched to ACTUAL APP SCREENSHOT
// Key: large white center "belo" circle, photo avatars with bright purple glow,
// deep purple gradient background, wide nav spacing
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;

const W = 393, H = 852;

// ═══════════ COLORS FROM SCREENSHOT ═══════════
const C = {
  // Background gradient — deep purple, lighter in center
  bgDark:   { r: 0.04, g: 0.01, b: 0.08 },      // near edges — very deep purple-black
  bgMid:    { r: 0.12, g: 0.04, b: 0.18 },       // mid area
  bgLight:  { r: 0.18, g: 0.07, b: 0.26 },       // center area — slight warm purple

  // Accent / glow
  accent:   { r: 0.729, g: 0.510, b: 0.929 },    // #BA82ED
  glowBright: { r: 0.75, g: 0.55, b: 1.0 },      // bright purple-white glow
  glowWhite:  { r: 0.9, g: 0.8, b: 1.0 },        // near-white purple glow

  // Text
  textPri:  { r: 0.94, g: 0.96, b: 0.99 },       // #F0F6FC
  white:    { r: 1, g: 1, b: 1 },
  black:    { r: 0, g: 0, b: 0 },

  // Center belo ball
  beloWhite: { r: 0.97, g: 0.96, b: 0.98 },      // cream-white center circle
  beloLogo:  { r: 0.40, g: 0.18, b: 0.60 },       // purple "belo" text on center

  // Avatar ring border
  ringPurple: { r: 0.35, g: 0.15, b: 0.55 },     // dark purple ring
};

// Avatar positions from screenshot (approximate, normalized to 393×852)
// Center belo ball: center of screen, roughly at (196, 540), size ~200px
// Ring users: 6 users arranged around center
const BELO_CX = W / 2;       // 196.5
const BELO_CY = H * 0.48;    // ~409 — slightly above center
const BELO_SIZE = 190;        // Large white center circle

const RING_RADIUS = W * 0.42; // ~165px from center
const AVATAR_SIZE = 80;       // Ring avatars are about 80px

// ═══════════ HELPERS ═══════════
async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels");
  return sorted[0][0];
}
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) { ws.removeEventListener("message", handler); clearTimeout(timeout);
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
async function T(ws, ch, pid, n, x, y, content, sz = 16) {
  return cmd(ws, ch, "create_text", { name: n, x, y, text: content, fontSize: sz, parentId: pid });
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

// ═══════════ AVATAR WITH BRIGHT GLOW ═══════════
async function avatar(ws, ch, pid, name, cx, cy, size, hasGroupIcon = false) {
  const glowSize = size * 2.2; // Very bright, large glow
  const ringSize = size + 8;   // Visible purple ring border

  // L1: Bright purple-white glow (very prominent in screenshot)
  const glow = await R(ws, ch, pid, `${name} Glow`,
    cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize, glowSize / 2);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glowWhite.r, g: C.glowWhite.g, b: C.glowWhite.b, a: 0.45, position: 0 },
    { r: C.glowBright.r, g: C.glowBright.g, b: C.glowBright.b, a: 0.30, position: 0.3 },
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.15, position: 0.55 },
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.0, position: 1 },
  ]);

  // L2: Purple ring border (visible in screenshot)
  const ring = await R(ws, ch, pid, `${name} Ring`,
    cx - ringSize / 2, cy - ringSize / 2, ringSize, ringSize, ringSize / 2);
  await G(ws, ch, ring.id, "GRADIENT_RADIAL", [
    { r: 0.45, g: 0.20, b: 0.70, a: 0.95, position: 0.75 },
    { r: 0.35, g: 0.15, b: 0.55, a: 0.90, position: 0.88 },
    { r: 0.50, g: 0.25, b: 0.75, a: 0.85, position: 1.0 },
  ]);

  // L3: Avatar photo placeholder (dark circle — represents where photo would be)
  const av = await R(ws, ch, pid, `${name} Photo`,
    cx - size / 2, cy - size / 2, size, size, size / 2);
  // Darker purple/gray to represent photo placeholder
  await G(ws, ch, av.id, "GRADIENT_RADIAL", [
    { r: 0.30, g: 0.22, b: 0.38, a: 1, position: 0 },
    { r: 0.22, g: 0.14, b: 0.30, a: 1, position: 0.5 },
    { r: 0.15, g: 0.08, b: 0.22, a: 1, position: 1 },
  ], [{ x: 0.4, y: 0.35 }, { x: 1, y: 0.35 }, { x: 0.4, y: 1 }]);

  // Initials
  const initSize = Math.round(size * 0.35);
  await T(ws, ch, pid, `${name} Init`, cx - initSize * 0.4, cy - initSize * 0.6, name[0], initSize);

  // Group icon badge if applicable
  if (hasGroupIcon) {
    const iconSize = 22;
    const iconX = cx + size / 2 - iconSize / 2 - 2;
    const iconY = cy + size / 2 - iconSize / 2 + 2;
    const icon = await R(ws, ch, pid, `${name} GroupIcon`, iconX, iconY, iconSize, iconSize, iconSize / 2);
    await F(ws, ch, icon.id, C.white, 0.9);
    await T(ws, ch, pid, `${name} GroupSymbol`, iconX + 3, iconY + 3, "👥", 12);
  }
}

// ═══════════ MAIN ═══════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Delete old
  try { await cmd(ws, ch, "delete_node", { nodeId: "54772:625" }); console.log("Deleted v3"); } catch(e) {}

  const frameX = 13200, frameY = 0;
  console.log("Building Home Screen v4...\n");

  // ── Phone Frame ──
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)", x: frameX, y: frameY, width: W, height: H,
  });
  const pid = phone.id;
  await cmd(ws, ch, "set_corner_radius", { nodeId: pid, radius: 50 });

  // Background: deep purple gradient — radial, lighter in center
  await G(ws, ch, pid, "GRADIENT_RADIAL", [
    { r: 0.14, g: 0.06, b: 0.22, a: 1, position: 0 },      // lighter center
    { r: 0.10, g: 0.04, b: 0.16, a: 1, position: 0.35 },
    { r: 0.06, g: 0.02, b: 0.11, a: 1, position: 0.6 },
    { r: 0.03, g: 0.01, b: 0.07, a: 1, position: 1 },       // dark edges
  ], [{ x: 0.5, y: 0.45 }, { x: 1.2, y: 0.45 }, { x: 0.5, y: 1.15 }]);
  console.log(`  ✓ Frame: ${pid}`);

  // ── Dynamic Island ──
  const notch = await R(ws, ch, pid, "Dynamic Island", (W - 126) / 2, 11, 126, 37, 20);
  await F(ws, ch, notch.id, C.black, 1);

  // ── Status Bar ──
  await T(ws, ch, pid, "Time", 28, 15, "8:38", 17);
  // Right side indicators
  await T(ws, ch, pid, "Signal", W - 100, 16, ".:||", 16);
  await T(ws, ch, pid, "WiFi", W - 62, 14, "⏣", 18);
  // Battery
  const battOutline = await R(ws, ch, pid, "Batt Outline", W - 40, 18, 28, 14, 4);
  await noFill(ws, ch, battOutline.id);
  const battBorder = await R(ws, ch, pid, "Batt Border", W - 40, 18, 28, 14, 4);
  await F(ws, ch, battBorder.id, C.white, 0.85);
  const battFill = await R(ws, ch, pid, "Batt Fill", W - 38, 20, 16, 10, 2);
  await F(ws, ch, battFill.id, { r: 0.95, g: 0.85, b: 0.3 }, 1); // yellowish like in screenshot
  const battTip = await R(ws, ch, pid, "Batt Tip", W - 11, 23, 2, 5, 1);
  await F(ws, ch, battTip.id, C.white, 0.4);
  console.log("  ✓ Status bar");

  // ── Header: "belo" logo ──
  // In screenshot: white cursive "belo" text, top-left, quite large (~32px)
  await T(ws, ch, pid, "belo Logo", 24, 90, "belo", 34);
  console.log("  ✓ Logo");

  // ── Profile avatar (top-right) ──
  await avatar(ws, ch, pid, "Profile", W - 52, 110, 70);
  console.log("  ✓ Profile avatar (top-right)");

  // ── CENTER "BELO" BALL ──
  // Large white/cream circle with "belo" logo in purple
  const beloGlowSize = BELO_SIZE * 1.4;
  const beloGlow = await R(ws, ch, pid, "Belo Ball Glow",
    BELO_CX - beloGlowSize / 2, BELO_CY - beloGlowSize / 2,
    beloGlowSize, beloGlowSize, beloGlowSize / 2);
  await G(ws, ch, beloGlow.id, "GRADIENT_RADIAL", [
    { r: 1, g: 1, b: 1, a: 0.25, position: 0.5 },
    { r: 0.85, g: 0.75, b: 1, a: 0.12, position: 0.7 },
    { r: 0.7, g: 0.5, b: 0.9, a: 0.0, position: 1 },
  ]);

  const beloBall = await R(ws, ch, pid, "Belo Ball",
    BELO_CX - BELO_SIZE / 2, BELO_CY - BELO_SIZE / 2,
    BELO_SIZE, BELO_SIZE, BELO_SIZE / 2);
  // Cream-white with very subtle gradient
  await G(ws, ch, beloBall.id, "GRADIENT_RADIAL", [
    { r: 0.98, g: 0.97, b: 0.99, a: 1, position: 0 },
    { r: 0.95, g: 0.93, b: 0.97, a: 1, position: 0.5 },
    { r: 0.92, g: 0.90, b: 0.95, a: 1, position: 1 },
  ], [{ x: 0.4, y: 0.35 }, { x: 1, y: 0.35 }, { x: 0.4, y: 1 }]);

  // "belo" text in purple on the white ball
  await T(ws, ch, pid, "Belo Ball Text", BELO_CX - 35, BELO_CY - 16, "belo", 40);
  console.log("  ✓ Center belo ball");

  // Unread badge next to center ball
  const ubX = BELO_CX + BELO_SIZE / 2 - 15;
  const ubY = BELO_CY - BELO_SIZE / 2 + 10;
  const ub = await R(ws, ch, pid, "Unread Badge", ubX, ubY, 32, 32, 16);
  await F(ws, ch, ub.id, C.accent, 0.85);
  await T(ws, ch, pid, "Unread Count", ubX + 10, ubY + 6, "2", 16);
  console.log("  ✓ Unread badge");

  // ── RING AVATARS (6 around center) ──
  // From screenshot positions (relative to center):
  // Top: 12 o'clock
  // Top-left, top-right: ~10 and 2 o'clock
  // Bottom-left, bottom-right: ~8 and 4 o'clock
  // Bottom: 6 o'clock
  const ringUsers = [
    { name: "Kambar", angle: -90 },    // top center
    { name: "Saeed",  angle: -30 },    // top right
    { name: "Roman",  angle: 30 },     // right
    { name: "Tyler",  angle: 90 },     // bottom right (not visible in screenshot — let's use bottom)
    { name: "Lena",   angle: 150 },    // bottom left
    { name: "Aisha",  angle: -150 },   // top left
  ];

  for (const u of ringUsers) {
    const rad = u.angle * math.PI / 180;
    const ux = BELO_CX + RING_RADIUS * math.cos(rad);
    const uy = BELO_CY + RING_RADIUS * math.sin(rad);
    const isGroup = u.name === "Kambar"; // Top center has group icon
    await avatar(ws, ch, pid, u.name, ux, uy, AVATAR_SIZE, isGroup);
    console.log(`  ✓ ${u.name} at ${u.angle}°`);
  }

  // ── ROTARY NAV BAR ──
  // From screenshot: HOME top-center near bottom, FLOW far left, POPS far right
  // HOME has accent dot above it, FLOW and POPS have small white dots
  const navBaseY = H - 55; // HOME label Y
  const homeDotY = navBaseY - 18;

  // HOME (center)
  const homeDot = await R(ws, ch, pid, "HOME Dot", W / 2 - 3, homeDotY, 6, 6, 3);
  await F(ws, ch, homeDot.id, C.accent, 1);
  await T(ws, ch, pid, "HOME Label", W / 2 - 24, navBaseY, "HOME", 11);

  // FLOW (bottom-left, far left)
  const flowX = 80;
  const flowY = H - 25;
  const flowDot = await R(ws, ch, pid, "FLOW Dot", flowX - 2, flowY - 16, 4, 4, 2);
  await F(ws, ch, flowDot.id, C.white, 0.45);
  await T(ws, ch, pid, "FLOW Label", flowX - 20, flowY, "FLOW", 10);

  // POPS (bottom-right, far right)
  const popsX = W - 80;
  const popsY = H - 25;
  const popsDot = await R(ws, ch, pid, "POPS Dot", popsX - 2, popsY - 16, 4, 4, 2);
  await F(ws, ch, popsDot.id, C.white, 0.45);
  await T(ws, ch, pid, "POPS Label", popsX - 18, popsY, "POPS", 10);

  console.log("  ✓ Nav: HOME (center), FLOW (left), POPS (right)");

  // ── Home indicator ──
  const indic = await R(ws, ch, pid, "Home Indicator", (W - 134) / 2, H - 8, 134, 5, 3);
  await F(ws, ch, indic.id, C.white, 0.25);

  await cmd(ws, ch, "set_selections", { nodeIds: [pid] });
  console.log(`\n✅ Home Screen v4 — Frame: ${pid}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
