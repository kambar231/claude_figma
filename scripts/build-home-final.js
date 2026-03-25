#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════════════
// Belo Home Screen — DEFINITIVE BUILD
// Exact match to Flutter code + real app screenshot
// Correct fonts: Bumbbled (logo), ABC Arizona Mix Unlicensed Trial (UI)
// ══════════════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;

const W = 393, H = 852;
const STATUS_BAR_H = 59;
const BOTTOM_SAFE = 34;

// Fonts
const FONT_LOGO = "Bumbbled";
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";

// ═══ DARK THEME COLORS (exact from color_palette.dart) ═══
const COL = {
  bg:           { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  accent:       { r: 0.729, g: 0.510, b: 0.929 },   // #BA82ED
  accentSec:    { r: 0.910, g: 0.475, b: 0.659 },   // #E879A8
  textPrimary:  { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textSecondary:{ r: 0.820, g: 0.769, b: 0.914 },   // #D1C4E9
  textMuted:    { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  cardBg:       { r: 0.118, g: 0.063, b: 0.188 },   // #1E1030
  cardBorder:   { r: 0.424, g: 0.173, b: 0.655 },   // #6C2CA7
  logo:         { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  glowDark:     { r: 0.608, g: 0.435, b: 0.831 },   // #9B6FD4
  iconPrimary:  { r: 0.831, g: 0.722, b: 1.0 },     // #D4B8FF
  white:        { r: 1, g: 1, b: 1 },
  black:        { r: 0, g: 0, b: 0 },
};

// Eclipse glow color in dark mode
const GLOW = COL.glowDark;

// _OrbitalDimensions (from code)
const CENTER_SIZE = 96;
const INNER_SIZE = 56;
const ORBIT_CENTER_Y = H * 0.46;  // screenHeight * 0.46
const INNER_RADIUS = W * 0.40;    // screenWidth * 0.40

// Avatar gradient colors
const AV_COLORS = [
  { r: 0.424, g: 0.173, b: 0.655 }, // #6C2CA7
  { r: 0.608, g: 0.302, b: 0.792 }, // #9B4DCA
  { r: 0.357, g: 0.122, b: 0.541 }, // #5B1F8A
  { r: 0.482, g: 0.208, b: 0.729 }, // #7B35B8
  { r: 0.239, g: 0.082, b: 0.400 }, // #3D1566
  { r: 0.549, g: 0.239, b: 0.749 }, // #8C3DBF
];

// ═══ COMMS ═══
async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  const sorted = Object.entries(ch).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels");
  return sorted[0][0];
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

// ═══ SHAPE HELPERS ═══
async function rect(ws, ch, pid, name, x, y, w, h, radius = 0) {
  const r = await cmd(ws, ch, "create_rectangle", { name, x, y, width: w, height: h, parentId: pid });
  if (radius > 0) await cmd(ws, ch, "set_corner_radius", { nodeId: r.id, radius });
  return r;
}
async function text(ws, ch, pid, name, x, y, content, fontSize, opts = {}) {
  const params = {
    name, x, y, text: content, fontSize,
    fontFamily: opts.fontFamily || FONT_UI,
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || COL.textPrimary,
    parentId: pid,
  };
  if (opts.letterSpacing !== undefined) params.letterSpacing = opts.letterSpacing;
  return cmd(ws, ch, "create_text", params);
}
async function fill(ws, ch, id, c, a = 1) {
  await cmd(ws, ch, "set_fill_color", { nodeId: id, r: c.r, g: c.g, b: c.b, a });
}
async function grad(ws, ch, id, type, stops, handles) {
  const p = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) p.gradientHandlePositions = handles;
  await cmd(ws, ch, "set_fill_gradient", p);
}
async function noFill(ws, ch, id) { await fill(ws, ch, id, COL.black, 0); }

// ══════════════════════════════════════════════════════════════
// ECLIPSE BUBBLE — exact 3-layer from _buildEclipseBubble code
// L1: glowSize = avatarSize * 1.65
//     RadialGradient: glow@0.60 → glow@0.28 → glow@0.00
// L2: ringSize = avatarSize * 0.94
//     bg color at 0.85 opacity
//     BoxShadow1: glow@0.40, blur 20, spread 2
//     BoxShadow2: glow@0.55, blur 14, spread -8
//     Inner highlight: white@0.10 center top → white@0.00
// L3: avatar (photo or gradient)
// ══════════════════════════════════════════════════════════════
async function eclipse(ws, ch, pid, name, cx, cy, avatarSize, avatarColor, initial) {
  const glowSize = avatarSize * 1.65;
  const ringSize = avatarSize * 0.94;
  const displaySize = avatarSize * 1.15; // _buildCenterBubble uses size*1.15

  // L1: Radial glow
  const glow = await rect(ws, ch, pid, `${name}_glow`,
    cx - glowSize/2, cy - glowSize/2, glowSize, glowSize, glowSize/2);
  await grad(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.60, position: 0 },
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.28, position: 0.5 },
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.00, position: 1 },
  ]);

  // L2a: Outer glow shadow (simulated — larger faint circle)
  // BoxShadow1: glow@0.40, blur 20, spread 2
  const shadowSize = ringSize + 44; // ~blur 20 + spread 2 on each side
  const shadow = await rect(ws, ch, pid, `${name}_shadow`,
    cx - shadowSize/2, cy - shadowSize/2, shadowSize, shadowSize, shadowSize/2);
  await grad(ws, ch, shadow.id, "GRADIENT_RADIAL", [
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.0, position: 0 },
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.35, position: 0.6 },
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.40, position: 0.78 },
    { r: GLOW.r, g: GLOW.g, b: GLOW.b, a: 0.0, position: 1 },
  ]);

  // L2b: Frosted glass ring — dark bg at 0.85 opacity
  const ring = await rect(ws, ch, pid, `${name}_ring`,
    cx - ringSize/2, cy - ringSize/2, ringSize, ringSize, ringSize/2);
  await fill(ws, ch, ring.id, COL.bg, 0.85);

  // L2c: Inner highlight (subtle white from top)
  const highlight = await rect(ws, ch, pid, `${name}_highlight`,
    cx - ringSize/2, cy - ringSize/2, ringSize, ringSize, ringSize/2);
  await grad(ws, ch, highlight.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.10, position: 0 },
    { r: 1, g: 1, b: 1, a: 0.0, position: 0.5 },
  ], [{ x: 0.5, y: -0.2 }, { x: 0.5, y: 1.0 }, { x: 1, y: -0.2 }]);

  // L3: Avatar circle
  const av = await rect(ws, ch, pid, `${name}_avatar`,
    cx - displaySize/2, cy - displaySize/2, displaySize, displaySize, displaySize/2);
  // Gradient: accentSecondary top → accentSecondary@0.85 bottom (from code fallback)
  await grad(ws, ch, av.id, "GRADIENT_LINEAR", [
    { r: avatarColor.r, g: avatarColor.g, b: avatarColor.b, a: 1, position: 0 },
    { r: avatarColor.r * 0.85, g: avatarColor.g * 0.85, b: avatarColor.b * 0.85, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  // Initials text
  const initSz = Math.round(displaySize * 0.38);
  await text(ws, ch, pid, `${name}_init`, cx - initSz/2.5, cy - initSz/1.5, initial, initSz, {
    fontWeight: 700, color: COL.white,
  });

  return { glow, shadow, ring, highlight, av };
}

// ══════════════════════════════════════════════════════════════
// BUILD THE SCREEN
// ══════════════════════════════════════════════════════════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Clean up leftover test nodes
  for (const id of ["54774:352","54774:353","54774:354","54774:355","54774:356","54774:357"]) {
    try { await cmd(ws, ch, "delete_node", { nodeId: id }); } catch(e) {}
  }

  const FX = 13200, FY = 0;
  console.log("═══ Building Belo Home Screen (Final) ═══\n");

  // ── PHONE FRAME ──
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  // Background: solid #0C0415
  await fill(ws, ch, P, COL.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  console.log(`Frame: ${P}\n`);

  // ── DYNAMIC ISLAND ──
  const notch = await rect(ws, ch, P, "Dynamic Island", (W-126)/2, 11, 126, 37, 20);
  await fill(ws, ch, notch.id, COL.black, 1);
  console.log("✓ Dynamic Island");

  // ── STATUS BAR ──
  await text(ws, ch, P, "Time", 30, 14, "8:38", 17, { fontWeight: 700, color: COL.white });
  // Battery
  const bBody = await rect(ws, ch, P, "Battery", W-39, 17, 27, 13, 4);
  await fill(ws, ch, bBody.id, COL.white, 0.85);
  const bFill = await rect(ws, ch, P, "BattFill", W-37, 19, 16, 9, 2);
  await fill(ws, ch, bFill.id, { r: 0.95, g: 0.85, b: 0.2 }, 1);
  const bTip = await rect(ws, ch, P, "BattTip", W-11, 21, 2.5, 6, 1);
  await fill(ws, ch, bTip.id, COL.white, 0.4);
  console.log("✓ Status Bar");

  // ── HEADER ──
  // "belo" logo — Bumbbled, 28px, w500, letterSpacing -0.5, color #F0F6FC
  await text(ws, ch, P, "belo", 22, STATUS_BAR_H + 12, "belo", 28, {
    fontFamily: FONT_LOGO, fontWeight: 400, // Bumbbled only has Regular
    color: COL.logo, letterSpacing: -0.5,
  });
  // Profile avatar (top-right, 40px)
  await eclipse(ws, ch, P, "Profile", W - 48, STATUS_BAR_H + 28, 40, AV_COLORS[0], "K");
  console.log("✓ Header (logo + profile)\n");

  // ── CENTER BUBBLE ──
  // Largest conversation — 96px base, displayed at 96*1.15 = 110.4px
  // Eclipse glow = 96 * 1.65 = 158.4px
  const CX = W / 2;
  const CY = ORBIT_CENTER_Y;

  // In the screenshot, the center shows the user's OWN profile — a large white circle with "belo" logo
  // This is when the user has their avatar set to the belo ball
  // The avatar display size = 96 * 1.15 = 110.4px

  // First draw the eclipse layers
  const eclipseResult = await eclipse(ws, ch, P, "Center", CX, CY, CENTER_SIZE, COL.white, "");

  // Override the center avatar to be white/cream with "belo" text
  await grad(ws, ch, eclipseResult.av.id, "GRADIENT_RADIAL", [
    { r: 0.98, g: 0.97, b: 0.99, a: 1, position: 0 },
    { r: 0.95, g: 0.93, b: 0.97, a: 1, position: 0.6 },
    { r: 0.92, g: 0.90, b: 0.95, a: 1, position: 1 },
  ], [{ x: 0.4, y: 0.3 }, { x: 1, y: 0.3 }, { x: 0.4, y: 1 }]);

  // "belo" text on center ball — purple Bumbbled
  const beloLogoSize = CENTER_SIZE * 1.15 * 0.35; // proportional
  await text(ws, ch, P, "CenterBelo", CX - 22, CY - 18, "belo", Math.round(beloLogoSize), {
    fontFamily: FONT_LOGO, color: { r: 0.40, g: 0.18, b: 0.55 },
  });

  // Unread badge
  const badgeX = CX + CENTER_SIZE * 1.65 / 2 - 20;
  const badgeY = CY - CENTER_SIZE * 1.65 / 2 + 30;
  const badge = await rect(ws, ch, P, "Badge", badgeX, badgeY, 28, 28, 14);
  await fill(ws, ch, badge.id, COL.accent, 0.9);
  await text(ws, ch, P, "BadgeNum", badgeX + 8, badgeY + 4, "2", 15, {
    fontWeight: 700, color: COL.white,
  });

  console.log("✓ Center bubble (belo ball)\n");

  // ── INNER RING — 6 USERS ──
  const users = [
    { name: "Kambar", init: "K", colorIdx: 0 },
    { name: "Saeed",  init: "S", colorIdx: 1 },
    { name: "Roman",  init: "R", colorIdx: 2 },
    { name: "Tyler",  init: "T", colorIdx: 3 },
    { name: "Lena",   init: "L", colorIdx: 4 },
    { name: "Aisha",  init: "A", colorIdx: 5 },
  ];

  for (let i = 0; i < users.length; i++) {
    // From code: _positionOnCircle uses index/totalCount * 2π, starting from -π/2
    const angle = -math.PI / 2 + (i * 2 * math.PI) / users.length;
    const ux = CX + INNER_RADIUS * math.cos(angle);
    const uy = CY + INNER_RADIUS * math.sin(angle);
    const u = users[i];

    await eclipse(ws, ch, P, u.name, ux, uy, INNER_SIZE, AV_COLORS[u.colorIdx], u.init);

    // Group icon on first bubble (from screenshot)
    if (i === 0) {
      const iconSz = 18;
      const ix = ux + INNER_SIZE * 0.5;
      const iy = uy + INNER_SIZE * 0.3;
      const iconBg = await rect(ws, ch, P, `${u.name}_groupBg`, ix, iy, iconSz, iconSz, iconSz/2);
      await fill(ws, ch, iconBg.id, COL.white, 0.9);
      await text(ws, ch, P, `${u.name}_groupIcon`, ix + 2, iy + 1, "👤", 10, { color: COL.black });
    }

    console.log(`✓ ${u.name} at ${Math.round(ux)},${Math.round(uy)}`);
  }

  // ── ROTARY NAV BAR ──
  // arcRadius = 96, spread = π/3 (60°)
  // totalH = 96 + bottomPad + 16 = 96 + 34 + 16 = 146
  // cx = W/2, cy = totalH + 96*0.2 = 146 + 19.2 = 165.2 (from nav area top)
  // Nav area top = H - 146 = 706
  const navTop = H - 146;
  const arcCX = W / 2;
  const arcCY = 146 + 96 * 0.2; // relative to nav area
  const arcR = 96;
  const spread = math.PI / 3;
  const navLabels = ["FLOW", "HOME", "POPS"];

  for (let i = 0; i < 3; i++) {
    const angle = math.PI / 2 + (1 - i) * spread;
    const ix = arcCX + arcR * math.cos(angle);
    const iy = navTop + (arcCY - arcR * math.sin(angle));
    const isActive = i === 1;
    const distFromTop = Math.abs(angle - math.PI / 2);
    const proximity = 1.0 - Math.min(distFromTop / (spread * 1.2), 1.0);
    const opacity = 0.28 + proximity * 0.72;

    // Dot
    const dotSz = isActive ? 6 : 4;
    const dot = await rect(ws, ch, P, `nav_${navLabels[i]}_dot`,
      ix - dotSz/2, iy - dotSz/2 - 12, dotSz, dotSz, dotSz/2);
    if (isActive) {
      await fill(ws, ch, dot.id, COL.accent, 1);
    } else {
      await fill(ws, ch, dot.id, COL.white, 0.55 * opacity);
    }

    // Label
    const fontSize = isActive ? 10.5 : 9.5;
    const weight = isActive ? 700 : 400;
    const color = isActive ? COL.accent : { r: 1, g: 1, b: 1 };
    const colorAlpha = isActive ? 1 : 0.65 * opacity;
    const labelColor = isActive ? color : { r: color.r * colorAlpha, g: color.g * colorAlpha, b: color.b * colorAlpha };

    // Approximate text width for centering
    const estW = navLabels[i].length * (fontSize * 0.65);
    await text(ws, ch, P, `nav_${navLabels[i]}`, ix - estW/2, iy, navLabels[i], fontSize, {
      fontWeight: weight, color: isActive ? COL.accent : { r: 0.65, g: 0.65, b: 0.65 },
      letterSpacing: 1.5,
    });
  }
  console.log("\n✓ Rotary nav bar");

  // ── HOME INDICATOR ──
  const indic = await rect(ws, ch, P, "HomeIndicator", (W-134)/2, H-8, 134, 5, 3);
  await fill(ws, ch, indic.id, COL.white, 0.22);
  console.log("✓ Home indicator");

  // ── SELECT & DONE ──
  await cmd(ws, ch, "set_selections", { nodeIds: [P] });

  console.log(`\n══════════════════════════════════════`);
  console.log(`✅ DONE — Frame: ${P}`);
  console.log(`   Fonts: ${FONT_LOGO} + ${FONT_UI}`);
  console.log(`   Position: (${FX}, ${FY})`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
