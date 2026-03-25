#!/usr/bin/env bun
// Belo Home Screen v3 — CORRECTED
// Orbital-only layout. Deep purple bg. Proper eclipse bubbles. Fixed nav.
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;

const W = 393, H = 852;
const STATUS_BAR = 59;
const BOTTOM_SAFE = 34;

// ═══════════ DARK THEME COLORS ═══════════
const C = {
  bg:       { r: 0.047, g: 0.016, b: 0.082 },   // #0C0415
  accent:   { r: 0.729, g: 0.510, b: 0.929 },    // #BA82ED
  textPri:  { r: 0.941, g: 0.965, b: 0.988 },    // #F0F6FC
  textSec:  { r: 0.820, g: 0.769, b: 0.914 },    // #D1C4E9
  textMut:  { r: 0.620, g: 0.561, b: 0.710 },    // #9E8FB5
  cardBg:   { r: 0.118, g: 0.063, b: 0.188 },    // #1E1030
  glow:     { r: 0.608, g: 0.435, b: 0.831 },    // #9B6FD4
  white:    { r: 1, g: 1, b: 1 },
  black:    { r: 0, g: 0, b: 0 },
};

// Avatar gradient colors (from _avatarGradientColors hash)
const AVATAR_COLORS = [
  { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7
  { r: 0.608, g: 0.302, b: 0.792 },  // #9B4DCA
  { r: 0.357, g: 0.122, b: 0.541 },  // #5B1F8A
  { r: 0.482, g: 0.208, b: 0.729 },  // #7B35B8
  { r: 0.239, g: 0.082, b: 0.400 },  // #3D1566
  { r: 0.549, g: 0.239, b: 0.749 },  // #8C3DBF
];

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

// ═══════════ ECLIPSE BUBBLE (3-layer glassmorphism) ═══════════
async function eclipse(ws, ch, pid, name, cx, cy, size, color, initial) {
  const glowSize = size * 1.65;
  const ringSize = size + 6; // Slightly larger than avatar for the frosted border

  // L1: Soft radial glow
  const glow = await R(ws, ch, pid, `${name} Glow`,
    cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize, glowSize / 2);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.45 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // L2: Frosted glass ring (dark glass with subtle purple tint)
  const ring = await R(ws, ch, pid, `${name} Glass`,
    cx - ringSize / 2, cy - ringSize / 2, ringSize, ringSize, ringSize / 2);
  // Dark purple glass with slight transparency
  await G(ws, ch, ring.id, "GRADIENT_RADIAL", [
    { r: 0.08, g: 0.03, b: 0.12, a: 0.92, position: 0 },
    { r: 0.06, g: 0.02, b: 0.10, a: 0.88, position: 0.7 },
    { r: 0.10, g: 0.04, b: 0.15, a: 0.82, position: 1 },
  ]);

  // L2.5: Inner highlight on the ring (subtle white gradient from top)
  const highlight = await R(ws, ch, pid, `${name} Highlight`,
    cx - ringSize / 2, cy - ringSize / 2, ringSize, ringSize, ringSize / 2);
  await G(ws, ch, highlight.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.08, position: 0 },
    { r: 1, g: 1, b: 1, a: 0.0, position: 0.6 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  // L3: Avatar circle (gradient fill)
  const av = await R(ws, ch, pid, `${name} Avatar`,
    cx - size / 2, cy - size / 2, size, size, size / 2);
  await G(ws, ch, av.id, "GRADIENT_RADIAL", [
    { r: color.r * 1.15, g: color.g * 1.15, b: color.b * 1.15, a: 1, position: 0 },
    { r: color.r, g: color.g, b: color.b, a: 1, position: 0.4 },
    { r: color.r * 0.7, g: color.g * 0.7, b: color.b * 0.7, a: 1, position: 1 },
  ], [{ x: 0.35, y: 0.3 }, { x: 1.05, y: 0.3 }, { x: 0.35, y: 1 }]);

  // Initials text
  const fontSize = Math.round(size * 0.38);
  await T(ws, ch, pid, `${name} Init`, cx - fontSize / 2.8, cy - fontSize / 1.6, initial, fontSize);
}

// ═══════════ MAIN BUILD ═══════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Delete old v2
  console.log("Cleaning up...");
  try { await cmd(ws, ch, "delete_node", { nodeId: "54772:569" }); } catch (e) {}

  const frameX = 13200;
  const frameY = 0;
  console.log("Building Home Screen v3...\n");

  // ── Phone Frame ──
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)", x: frameX, y: frameY, width: W, height: H,
  });
  const pid = phone.id;
  // Background: #0C0415 — a very deep purple-black
  await F(ws, ch, pid, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: pid, radius: 44 });
  console.log(`  ✓ Frame: ${pid}`);

  // ── Status Bar ──
  // Time (left)
  await T(ws, ch, pid, "Time", 32, 16, "3:14", 16);
  // Signal indicators (right area — simplified)
  await T(ws, ch, pid, "Cellular", W - 86, 17, "‹›‹›", 12);
  await T(ws, ch, pid, "WiFi", W - 58, 17, "⌔", 14);
  // Battery outline
  const batt = await R(ws, ch, pid, "Battery Outline", W - 38, 18, 27, 13, 4);
  await F(ws, ch, batt.id, C.white, 0.0); // transparent
  const battBorder = await R(ws, ch, pid, "Battery Border", W - 38, 18, 27, 13, 4);
  await G(ws, ch, battBorder.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.9, position: 0 },
    { r: 1, g: 1, b: 1, a: 0.9, position: 1 },
  ]);
  // Battery fill (green-ish or white)
  const battFill = await R(ws, ch, pid, "Battery Fill", W - 36, 20, 21, 9, 2);
  await F(ws, ch, battFill.id, C.white, 0.85);
  // Battery tip
  const battTip = await R(ws, ch, pid, "Battery Tip", W - 10, 22, 2, 5, 1);
  await F(ws, ch, battTip.id, C.white, 0.4);
  console.log("  ✓ Status bar");

  // ── Header ──
  // "belo" logo — Bumbbled font, 28px, w500, letterSpacing -0.5, color #F0F6FC
  // Note: Figma won't have Bumbbled font loaded, but we set the right styling
  const logoText = await T(ws, ch, pid, "belo Logo", 20, STATUS_BAR + 8, "belo", 28);
  // The font won't be Bumbbled in Figma unless manually changed, but size/position is correct

  // Profile avatar (top-right, 40px)
  await eclipse(ws, ch, pid, "Profile", W - 42, STATUS_BAR + 24, 40, AVATAR_COLORS[0], "K");
  console.log("  ✓ Header (logo + profile)");

  // ── ORBITAL LAYOUT ──
  // center = (W/2, H * 0.46) = (196.5, 392)
  // innerRadius = W * 0.40 = 157.2
  // centerAvatarSize = 96, innerAvatarSize = 56
  const orbitCX = W / 2;
  const orbitCY = H * 0.46;
  const innerRadius = W * 0.40;

  // Center bubble (96px) — Saeed
  await eclipse(ws, ch, pid, "Saeed", orbitCX, orbitCY, 96, AVATAR_COLORS[0], "S");

  // Unread badge on center
  const badgeX = orbitCX + 96 / 2 - 4;
  const badgeY = orbitCY - 96 / 2 - 8;
  const badge = await R(ws, ch, pid, "Saeed Badge", badgeX, badgeY, 24, 24, 12);
  await F(ws, ch, badge.id, C.accent, 1);
  await T(ws, ch, pid, "Saeed BadgeNum", badgeX + 7, badgeY + 4, "3", 13);

  // Name below center
  await T(ws, ch, pid, "Saeed Name", orbitCX - 18, orbitCY + 96 * 1.65 / 2 + 6, "Saeed", 13);
  console.log("  ✓ Center: Saeed (96px)");

  // Inner ring — 6 bubbles × 56px
  const users = [
    { name: "Roman", init: "R", badge: "5" },
    { name: "Aisha", init: "A", badge: null },
    { name: "Tyler", init: "T", badge: null },
    { name: "Nora",  init: "N", badge: "2" },
    { name: "Kai",   init: "K", badge: null },
    { name: "Lena",  init: "L", badge: null },
  ];

  for (let i = 0; i < users.length; i++) {
    const angle = -math.PI / 2 + (i * 2 * math.PI) / 6;
    const ux = orbitCX + innerRadius * math.cos(angle);
    const uy = orbitCY + innerRadius * math.sin(angle);
    const u = users[i];

    await eclipse(ws, ch, pid, u.name, ux, uy, 56, AVATAR_COLORS[i % AVATAR_COLORS.length], u.init);

    // Name label
    const nameLen = u.name.length;
    await T(ws, ch, pid, `${u.name} Name`, ux - nameLen * 3.2, uy + 56 * 1.65 / 2 + 4, u.name, 11);

    // Unread badge
    if (u.badge) {
      const bx = ux + 56 / 2 - 4;
      const by = uy - 56 / 2 - 6;
      const b = await R(ws, ch, pid, `${u.name} Badge`, bx, by, 20, 20, 10);
      await F(ws, ch, b.id, C.accent, 1);
      await T(ws, ch, pid, `${u.name} BadgeNum`, bx + 5, by + 3, u.badge, 11);
    }
    console.log(`  ✓ Inner: ${u.name} (56px)`);
  }

  // ── ROTARY ARC NAV BAR ──
  // Positioned at bottom of screen
  // arcRadius = 96, spread = π/3
  // The nav area height = arcRadius + bottomPad + 16 = 96 + 34 + 16 = 146
  // Arc center (cy) = totalH + arcRadius*0.2 = 146 + 19.2 = 165.2 (from top of nav area)
  // Nav area starts at y = H - 146 = 706
  const navAreaTop = H - 146;
  const arcCX = W / 2;            // 196.5
  const arcCY = 146 + 96 * 0.2;   // 165.2 (relative to nav area top)
  const arcRadius = 96;
  const spread = math.PI / 3;

  const navLabels = ["FLOW", "HOME", "POPS"];
  for (let i = 0; i < 3; i++) {
    const baseAngle = math.PI / 2 + (1 - i) * spread;
    const angle = baseAngle; // _arcAngle = 0 in default HOME state
    const ix = arcCX + arcRadius * math.cos(angle);
    const iy = arcCY - arcRadius * math.sin(angle);

    // Convert to absolute Y within phone frame
    const absY = navAreaTop + iy;

    const isActive = i === 1; // HOME
    const distFromTop = Math.abs(angle - math.PI / 2);
    const proximity = 1.0 - Math.min(distFromTop / (spread * 1.2), 1.0);
    const opacity = (0.28 + proximity * 0.72);

    // Dot (centered)
    const dotSize = isActive ? 6 : 4;
    const dotX = ix - dotSize / 2;
    const dotY = absY - 15;
    const dot = await R(ws, ch, pid, `Nav ${navLabels[i]} Dot`, dotX, dotY, dotSize, dotSize, dotSize / 2);
    if (isActive) {
      await F(ws, ch, dot.id, C.accent, 1);
    } else {
      await F(ws, ch, dot.id, C.white, 0.55 * opacity);
    }

    // Label (centered below dot)
    const fontSize = isActive ? 10.5 : 9.5;
    const labelW = navLabels[i].length * 6; // approximate character width
    const labelX = ix - labelW / 2;
    const labelY = dotY + dotSize + 5;
    const label = await T(ws, ch, pid, `Nav ${navLabels[i]}`, labelX, labelY, navLabels[i], fontSize);

    console.log(`  ✓ Nav: ${navLabels[i]} at (${Math.round(ix)}, ${Math.round(absY)}) opacity ${opacity.toFixed(2)}`);
  }

  // ── Dynamic Island (notch at top) ──
  const notchW = 126;
  const notchH = 37;
  const notch = await R(ws, ch, pid, "Dynamic Island", (W - notchW) / 2, 11, notchW, notchH, 20);
  await F(ws, ch, notch.id, C.black, 1);
  console.log("  ✓ Dynamic Island");

  // ── Home indicator line at bottom ──
  const indicW = 134;
  const indic = await R(ws, ch, pid, "Home Indicator", (W - indicW) / 2, H - 8, indicW, 5, 3);
  await F(ws, ch, indic.id, C.white, 0.3);
  console.log("  ✓ Home indicator");

  // Select
  await cmd(ws, ch, "set_selections", { nodeIds: [pid] });
  console.log(`\n✅ Home Screen v3 complete — Frame: ${pid}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
