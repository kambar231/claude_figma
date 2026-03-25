#!/usr/bin/env bun
// Belo Home Screen v5 — PIXEL MATCHED to actual app screenshot
// Key changes: bright luminous glow, solid filled avatars with thick purple border,
// proper background depth, correct nav spacing
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;

const W = 393, H = 852;

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
async function noFill(ws, ch, id) { await F(ws, ch, id, {r:0,g:0,b:0}, 0); }

// ═══════════ AVATAR WITH BRIGHT GLOW (matched to screenshot) ═══════════
// In the real app: bright white-to-purple LUMINOUS halo → thick solid purple ring → photo inside
async function makeAvatar(ws, ch, pid, name, cx, cy, photoSize, initial) {
  const borderWidth = 4;                          // thick purple border
  const ringSize = photoSize + borderWidth * 2;   // ring = photo + border on each side
  const glowSize = ringSize * 2.4;                // large luminous glow

  // L1: BRIGHT luminous glow — white center fading to purple then transparent
  const glow = await R(ws, ch, pid, `${name} Glow`,
    cx - glowSize/2, cy - glowSize/2, glowSize, glowSize, glowSize/2);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: 0.95, g: 0.88, b: 1.0,  a: 0.50, position: 0 },     // near-white center
    { r: 0.80, g: 0.60, b: 1.0,  a: 0.35, position: 0.25 },   // bright purple
    { r: 0.65, g: 0.40, b: 0.95, a: 0.20, position: 0.45 },   // medium purple
    { r: 0.50, g: 0.25, b: 0.80, a: 0.08, position: 0.65 },   // fading
    { r: 0.40, g: 0.15, b: 0.65, a: 0.0,  position: 1 },      // transparent
  ]);

  // L2: Solid purple ring/border
  const ring = await R(ws, ch, pid, `${name} Ring`,
    cx - ringSize/2, cy - ringSize/2, ringSize, ringSize, ringSize/2);
  await F(ws, ch, ring.id, { r: 0.42, g: 0.18, b: 0.65 }, 1);  // solid #6C2CA7 purple

  // L3: Photo circle (filled — simulating a photo with gradient)
  const photo = await R(ws, ch, pid, `${name} Photo`,
    cx - photoSize/2, cy - photoSize/2, photoSize, photoSize, photoSize/2);
  // Simulated photo — warm skin-tone gradient to look like a face photo
  await G(ws, ch, photo.id, "GRADIENT_RADIAL", [
    { r: 0.55, g: 0.42, b: 0.38, a: 1, position: 0 },
    { r: 0.42, g: 0.30, b: 0.28, a: 1, position: 0.4 },
    { r: 0.30, g: 0.20, b: 0.22, a: 1, position: 0.7 },
    { r: 0.20, g: 0.12, b: 0.18, a: 1, position: 1 },
  ], [{ x: 0.4, y: 0.3 }, { x: 1, y: 0.3 }, { x: 0.4, y: 1 }]);

  // Overlay initial for identification
  const initSz = Math.round(photoSize * 0.35);
  await T(ws, ch, pid, `${name} Init`, cx - initSz/2.5, cy - initSz/1.7, initial, initSz);
}

// ═══════════ MAIN ═══════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Delete v4
  try { await cmd(ws, ch, "delete_node", { nodeId: "54772:695" }); console.log("Deleted v4"); } catch(e) {}

  const frameX = 13200, frameY = 0;
  console.log("Building Home Screen v5...\n");

  // ── Phone Frame ──
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)", x: frameX, y: frameY, width: W, height: H,
  });
  const pid = phone.id;
  await cmd(ws, ch, "set_corner_radius", { nodeId: pid, radius: 50 });

  // Background: radial gradient — very deep purple, slightly lighter toward center
  // Matched to screenshot: center area ~(0.5, 0.45) has a subtle warmth
  await G(ws, ch, pid, "GRADIENT_RADIAL", [
    { r: 0.11, g: 0.05, b: 0.18, a: 1, position: 0 },      // subtle lighter center
    { r: 0.08, g: 0.03, b: 0.14, a: 1, position: 0.3 },
    { r: 0.05, g: 0.02, b: 0.10, a: 1, position: 0.55 },
    { r: 0.03, g: 0.01, b: 0.07, a: 1, position: 0.8 },
    { r: 0.02, g: 0.005, b: 0.05, a: 1, position: 1 },      // very dark edges
  ], [{ x: 0.5, y: 0.42 }, { x: 1.3, y: 0.42 }, { x: 0.5, y: 1.22 }]);
  console.log(`  ✓ Frame: ${pid}`);

  // ── Dynamic Island ──
  const notch = await R(ws, ch, pid, "Dynamic Island", (W-126)/2, 11, 126, 37, 20);
  await F(ws, ch, notch.id, {r:0,g:0,b:0}, 1);

  // ── Status Bar ──
  await T(ws, ch, pid, "Time", 28, 15, "8:38", 17);
  // Battery (yellow-ish in screenshot)
  const battBody = await R(ws, ch, pid, "Battery Body", W-40, 17, 28, 14, 4);
  await F(ws, ch, battBody.id, {r:1,g:1,b:1}, 0.85);
  const battFill = await R(ws, ch, pid, "Battery Fill", W-38, 19, 16, 10, 2);
  await F(ws, ch, battFill.id, {r:0.95,g:0.85,b:0.2}, 1);
  const battTip = await R(ws, ch, pid, "Battery Tip", W-11, 22, 2.5, 6, 1);
  await F(ws, ch, battTip.id, {r:1,g:1,b:1}, 0.4);
  console.log("  ✓ Status bar");

  // ── Header: "belo" logo (top-left) ──
  // In screenshot: white cursive text, large, at about y=90-100
  await T(ws, ch, pid, "belo Logo", 24, 92, "belo", 36);
  console.log("  ✓ Logo");

  // ── Profile avatar (top-right, ~70px) ──
  await makeAvatar(ws, ch, pid, "Profile", W-55, 118, 66, "K");
  console.log("  ✓ Profile (top-right)");

  // ── CENTER "BELO" BALL ──
  const beloCX = W / 2;        // 196.5
  const beloCY = H * 0.465;    // ~396 — from screenshot, center ball is slightly above middle

  // Soft white glow behind center ball
  const beloGlowSz = 260;
  const beloGlow = await R(ws, ch, pid, "Belo Glow",
    beloCX - beloGlowSz/2, beloCY - beloGlowSz/2, beloGlowSz, beloGlowSz, beloGlowSz/2);
  await G(ws, ch, beloGlow.id, "GRADIENT_RADIAL", [
    { r: 1, g: 1, b: 1, a: 0.18, position: 0.4 },
    { r: 0.9, g: 0.8, b: 1, a: 0.08, position: 0.65 },
    { r: 0.7, g: 0.5, b: 0.9, a: 0.0, position: 1 },
  ]);

  // White ball
  const beloSz = 185;
  const beloBall = await R(ws, ch, pid, "Belo Ball",
    beloCX - beloSz/2, beloCY - beloSz/2, beloSz, beloSz, beloSz/2);
  await G(ws, ch, beloBall.id, "GRADIENT_RADIAL", [
    { r: 0.99, g: 0.98, b: 1.0,  a: 1, position: 0 },
    { r: 0.96, g: 0.94, b: 0.98, a: 1, position: 0.5 },
    { r: 0.93, g: 0.91, b: 0.96, a: 1, position: 0.8 },
    { r: 0.90, g: 0.88, b: 0.94, a: 1, position: 1 },
  ], [{ x: 0.45, y: 0.35 }, { x: 1, y: 0.35 }, { x: 0.45, y: 1 }]);

  // "belo" text on the ball — purple cursive
  await T(ws, ch, pid, "Belo Text", beloCX - 36, beloCY - 15, "belo", 42);
  console.log("  ✓ Center belo ball");

  // Unread badge
  const ubX = beloCX + beloSz/2 - 20;
  const ubY = beloCY - beloSz/2 + 5;
  const ub = await R(ws, ch, pid, "Badge", ubX, ubY, 30, 30, 15);
  await F(ws, ch, ub.id, {r:0.73,g:0.51,b:0.93}, 0.9);
  await T(ws, ch, pid, "Badge Num", ubX + 9, ubY + 5, "2", 15);
  console.log("  ✓ Badge");

  // ── 6 ORBITAL AVATARS ──
  // From screenshot: positions roughly match a 6-point ring
  // But NOT evenly spaced — looking at screenshot:
  //   Top center: one avatar above center ball
  //   Left side: two avatars (upper-left, lower-left) partially off-screen
  //   Right side: two avatars (upper-right, lower-right) partially off-screen
  //   Bottom center: one avatar below
  // Ring radius appears ~180px from center
  const ringR = 180;
  const avatarSz = 72; // photo size inside ring

  // Angles matched to screenshot (degrees from top):
  // Top: -90, Upper-right: -25, Lower-right: 35, Bottom: 90, Lower-left: 145, Upper-left: -145
  const orbitals = [
    { name: "User1", angle: -90,  init: "K", hasGroupIcon: true },  // top center (has group icon)
    { name: "User2", angle: -25,  init: "S" },  // upper right
    { name: "User3", angle: 35,   init: "R" },  // right
    { name: "User4", angle: 90,   init: "T" },  // bottom
    { name: "User5", angle: 145,  init: "L" },  // lower left
    { name: "User6", angle: -145, init: "A" },  // upper left
  ];

  for (const u of orbitals) {
    const rad = u.angle * math.PI / 180;
    const ux = beloCX + ringR * math.cos(rad);
    const uy = beloCY + ringR * math.sin(rad);
    await makeAvatar(ws, ch, pid, u.name, ux, uy, avatarSz, u.init);

    // Group icon
    if (u.hasGroupIcon) {
      const iconSz = 20;
      const ix = ux + avatarSz/2;
      const iy = uy + avatarSz/2 - 5;
      const icon = await R(ws, ch, pid, `${u.name} GroupBg`, ix, iy, iconSz, iconSz, iconSz/2);
      await F(ws, ch, icon.id, {r:1,g:1,b:1}, 0.85);
      await T(ws, ch, pid, `${u.name} GroupIcon`, ix + 2, iy + 2, "👤", 11);
    }
    console.log(`  ✓ ${u.name} (${u.angle}°)`);
  }

  // ── NAV BAR ──
  // From screenshot: HOME is near bottom-center with dot above
  // FLOW is at bottom-LEFT edge, POPS at bottom-RIGHT edge
  // They are MUCH lower than HOME — on the very last row

  // HOME
  const homeY = H - 65;
  const homeDot = await R(ws, ch, pid, "HOME Dot", W/2 - 3, homeY - 16, 6, 6, 3);
  await F(ws, ch, homeDot.id, {r:0.73,g:0.51,b:0.93}, 1); // accent
  await T(ws, ch, pid, "HOME", W/2 - 26, homeY, "HOME", 12);

  // FLOW — far bottom left
  const flowDot = await R(ws, ch, pid, "FLOW Dot", 88, H - 22, 4, 4, 2);
  await F(ws, ch, flowDot.id, {r:1,g:1,b:1}, 0.4);
  await T(ws, ch, pid, "FLOW", 66, H - 14, "FLOW", 10);

  // POPS — far bottom right
  const popsDot = await R(ws, ch, pid, "POPS Dot", W - 90, H - 22, 4, 4, 2);
  await F(ws, ch, popsDot.id, {r:1,g:1,b:1}, 0.4);
  await T(ws, ch, pid, "POPS", W - 110, H - 14, "POPS", 10);

  console.log("  ✓ Nav bar");

  // ── Home indicator ──
  const indic = await R(ws, ch, pid, "Home Indicator", (W-134)/2, H - 8, 134, 5, 3);
  await F(ws, ch, indic.id, {r:1,g:1,b:1}, 0.22);

  await cmd(ws, ch, "set_selections", { nodeIds: [pid] });
  console.log(`\n✅ Home Screen v5 — Frame: ${pid}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
