#!/usr/bin/env bun
// Belo Home Screen — CORRECT version
// Orbital bubbles only. No conversation list. Solid dark bg.
// Center (96px) + Inner ring 6x (56px) + Rotary arc nav
// iPhone 14 Pro: 393 x 852
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;

// ═══════════ DESIGN TOKENS (dark mode from color_palette.dart) ═══════════
const C = {
  bg:       { r: 0.047, g: 0.016, b: 0.082 },   // #0C0415 solid
  accent:   { r: 0.729, g: 0.510, b: 0.929 },    // #BA82ED
  accentSec:{ r: 0.910, g: 0.475, b: 0.659 },    // #E879A8
  textPri:  { r: 0.941, g: 0.965, b: 0.988 },    // #F0F6FC
  textSec:  { r: 0.820, g: 0.769, b: 0.914 },    // #D1C4E9
  textMut:  { r: 0.620, g: 0.561, b: 0.710 },    // #9E8FB5
  cardBg:   { r: 0.118, g: 0.063, b: 0.188 },    // #1E1030
  cardBord: { r: 0.424, g: 0.173, b: 0.655 },    // #6C2CA7
  glow:     { r: 0.608, g: 0.435, b: 0.831 },    // #9B6FD4
  logo:     { r: 0.941, g: 0.965, b: 0.988 },    // #F0F6FC (deep plum in light)
  white:    { r: 1, g: 1, b: 1 },
  black:    { r: 0, g: 0, b: 0 },
};

const W = 393, H = 852;
const STATUS_BAR = 59;

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

// ═══════════ ECLIPSE BUBBLE ═══════════
// 3 layers: glow → frosted ring → avatar circle
async function eclipseBubble(ws, ch, pid, name, cx, cy, avatarSize, avatarColor, initial) {
  const glowSize = avatarSize * 1.65;
  const ringSize = avatarSize * 0.94;

  // Layer 1: Glow
  const glow = await R(ws, ch, pid, `${name} Glow`,
    cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize, glowSize / 2);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.60, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.00, position: 1 },
  ]);

  // Layer 2: Frosted glass ring
  const ring = await R(ws, ch, pid, `${name} Ring`,
    cx - avatarSize / 2 - 2, cy - avatarSize / 2 - 2,
    avatarSize + 4, avatarSize + 4, (avatarSize + 4) / 2);
  await F(ws, ch, ring.id, C.bg, 0.85);

  // Layer 3: Avatar circle
  const av = await R(ws, ch, pid, `${name} Avatar`,
    cx - avatarSize / 2, cy - avatarSize / 2,
    avatarSize, avatarSize, avatarSize / 2);
  await G(ws, ch, av.id, "GRADIENT_RADIAL", [
    { r: avatarColor.r, g: avatarColor.g, b: avatarColor.b, a: 1, position: 0 },
    { r: avatarColor.r * 0.75, g: avatarColor.g * 0.75, b: avatarColor.b * 0.75, a: 1, position: 1 },
  ], [{ x: 0.35, y: 0.3 }, { x: 1, y: 0.3 }, { x: 0.35, y: 1 }]);

  // Initials
  const initSize = avatarSize * 0.35;
  await T(ws, ch, pid, `${name} Initial`,
    cx - initSize / 2.5, cy - initSize / 1.5, initial, Math.round(initSize));

  return { glow, ring, av };
}

// ═══════════ BUILD SECTIONS ═══════════

async function buildStatusBar(ws, ch, pid) {
  // Time
  await T(ws, ch, pid, "Time", 32, 16, "3:14", 17);
  // Signal dots (simplified)
  await T(ws, ch, pid, "Signal", W - 90, 17, "•••‹", 15);
  // Battery
  const batt = await R(ws, ch, pid, "Battery", W - 38, 19, 25, 12, 3);
  await F(ws, ch, batt.id, C.white, 0.85);
  console.log("  ✓ Status bar");
}

async function buildHeader(ws, ch, pid) {
  // Logo "belo" — Bumbbled font, 28px, w500
  await T(ws, ch, pid, "belo Logo", 20, STATUS_BAR + 10, "belo", 28);

  // Profile avatar (top right) — 40px with eclipse
  await eclipseBubble(ws, ch, pid, "Profile", W - 40, STATUS_BAR + 24, 40,
    { r: 0.424, g: 0.173, b: 0.655 }, "K");
  console.log("  ✓ Header");
}

async function buildGoldenCircle(ws, ch, pid) {
  // From _OrbitalDimensions:
  // center = (screenWidth/2, screenHeight * 0.46)
  // innerRadius = screenWidth * 0.40
  // centerAvatarSize = 96, innerAvatarSize = 56
  const cx = W / 2;         // 196.5
  const cy = H * 0.46;      // ~392
  const innerRadius = W * 0.40; // ~157

  // Avatar colors (hashed from names, from _avatarGradientColors)
  const colors = [
    { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7
    { r: 0.608, g: 0.302, b: 0.792 },  // #9B4DCA
    { r: 0.357, g: 0.122, b: 0.541 },  // #5B1F8A
    { r: 0.482, g: 0.208, b: 0.729 },  // #7B35B8
    { r: 0.239, g: 0.082, b: 0.400 },  // #3D1566
    { r: 0.549, g: 0.239, b: 0.749 },  // #8C3DBF
  ];

  // ── Center bubble (96px) ──
  await eclipseBubble(ws, ch, pid, "Saeed", cx, cy, 96, colors[0], "S");

  // Unread badge
  const badgeX = cx + 96 / 2 - 6;
  const badgeY = cy - 96 / 2 - 6;
  const badge = await R(ws, ch, pid, "Saeed Badge", badgeX, badgeY, 24, 24, 12);
  await F(ws, ch, badge.id, C.accent, 1);
  await T(ws, ch, pid, "Saeed Count", badgeX + 7, badgeY + 4, "3", 13);

  // Name under center
  await T(ws, ch, pid, "Saeed Name", cx - 20, cy + 96 / 2 + 18, "Saeed", 14);

  console.log("  ✓ Center bubble (Saeed)");

  // ── Inner ring (6 bubbles × 56px) ──
  const innerUsers = [
    { name: "Roman",   init: "R" },
    { name: "Aisha",   init: "A" },
    { name: "Tyler",   init: "T" },
    { name: "Nora",    init: "N" },
    { name: "Kai",     init: "K" },
    { name: "Lena",    init: "L" },
  ];

  for (let i = 0; i < innerUsers.length; i++) {
    const angle = -math.PI / 2 + (i * 2 * math.PI) / 6; // Start from top
    const ux = cx + innerRadius * math.cos(angle);
    const uy = cy + innerRadius * math.sin(angle);
    const user = innerUsers[i];
    const color = colors[i % colors.length];

    await eclipseBubble(ws, ch, pid, user.name, ux, uy, 56, color, user.init);

    // Name label
    const nameW = user.name.length * 4;
    await T(ws, ch, pid, `${user.name} Name`, ux - nameW, uy + 56 / 2 + 14, user.name, 12);

    // Some unread badges
    if (i === 0 || i === 3) {
      const bx = ux + 56 / 2 - 6;
      const by = uy - 56 / 2 - 4;
      const b = await R(ws, ch, pid, `${user.name} Badge`, bx, by, 20, 20, 10);
      await F(ws, ch, b.id, C.accent, 1);
      await T(ws, ch, pid, `${user.name} Count`, bx + 5, by + 2, i === 0 ? "5" : "2", 11);
    }

    console.log(`  ✓ ${user.name}`);
  }
}

async function buildNavBar(ws, ch, pid) {
  // Rotary arc: 3 items on an invisible arc
  // arcRadius = 96, spread = 60° (π/3)
  // Arc center is BELOW the nav area so items curve upward
  const arcRadius = 96;
  const spread = math.PI / 3;
  const bottomPad = 34; // Safe area
  const totalH = arcRadius + bottomPad + 16; // ~146
  const navTop = H - totalH;
  const cx = W / 2;
  const cy = navTop + totalH + arcRadius * 0.2;

  const labels = ["FLOW", "HOME", "POPS"];

  for (let i = 0; i < 3; i++) {
    const angle = math.PI / 2 + (1 - i) * spread; // HOME at top, FLOW left, POPS right
    const ix = cx + arcRadius * math.cos(angle);
    const iy = cy - arcRadius * math.sin(angle);
    const isActive = i === 1; // HOME is active

    const distFromTop = Math.abs(angle - math.PI / 2);
    const proximity = 1.0 - Math.min(distFromTop / (spread * 1.2), 1.0);
    const opacity = 0.28 + proximity * 0.72;

    // Dot
    const dotSize = isActive ? 6 : 4;
    const dot = await R(ws, ch, pid, `Nav Dot ${labels[i]}`,
      ix - dotSize / 2, iy - 12, dotSize, dotSize, dotSize / 2);
    if (isActive) {
      await F(ws, ch, dot.id, C.accent, opacity);
    } else {
      await F(ws, ch, dot.id, C.white, 0.55 * opacity);
    }

    // Label
    const fontSize = isActive ? 10.5 : 9.5;
    const labelW = labels[i].length * 5.5;
    await T(ws, ch, pid, `Nav ${labels[i]}`, ix - labelW / 2, iy - 2, labels[i], fontSize);
  }

  console.log("  ✓ Rotary nav bar (FLOW · HOME · POPS)");
}

// ═══════════ MAIN ═══════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Delete old incorrect screen
  console.log("Deleting old home screen...");
  try { await cmd(ws, ch, "delete_node", { nodeId: "54770:479" }); console.log("  ✓ Deleted"); }
  catch (e) { console.log("  (already gone or not found)"); }

  // Place in open space (far right)
  const frameX = 13200;
  const frameY = 0;

  console.log("\nBuilding Belo Home Screen (Correct)...\n");

  // Phone frame — SOLID background #0C0415
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)", x: frameX, y: frameY, width: W, height: H,
  });
  const pid = phone.id;
  await F(ws, ch, pid, C.bg, 1); // Solid dark background — NOT a gradient
  await cmd(ws, ch, "set_corner_radius", { nodeId: pid, radius: 44 });
  console.log(`  ✓ Phone frame: ${pid} (solid #0C0415)`);

  await buildStatusBar(ws, ch, pid);
  await buildHeader(ws, ch, pid);
  await buildGoldenCircle(ws, ch, pid);
  await buildNavBar(ws, ch, pid);

  await cmd(ws, ch, "set_selections", { nodeIds: [pid] });
  console.log(`\n✅ Home screen complete at (${frameX}, ${frameY})`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
