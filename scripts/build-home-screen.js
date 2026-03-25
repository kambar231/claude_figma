#!/usr/bin/env bun
// Build Belo Home Screen in Figma — pixel-perfect recreation from Flutter code
// Dark mode design (primary design language)
// iPhone 14 Pro: 393x852 viewport
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS (from color_palette.dart - DARK MODE)
// ═══════════════════════════════════════════════════════════
const C = {
  // Backgrounds
  bg: { r: 0.047, g: 0.016, b: 0.082 },           // #0C0415
  cardBg: { r: 0.118, g: 0.063, b: 0.188 },        // #1E1030
  inputBg: { r: 0.145, g: 0.082, b: 0.271 },        // #251545

  // Text
  textPrimary: { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textSecondary: { r: 0.820, g: 0.769, b: 0.914 },  // #D1C4E9
  textMuted: { r: 0.620, g: 0.561, b: 0.710 },      // #9E8FB5

  // Accents
  accent: { r: 0.729, g: 0.510, b: 0.929 },         // #BA82ED
  accentSec: { r: 0.910, g: 0.475, b: 0.659 },      // #E879A8
  success: { r: 0.353, g: 0.620, b: 0.478 },         // #5A9E7A

  // Borders/Shadows
  cardBorder: { r: 0.424, g: 0.173, b: 0.655 },     // #6C2CA7
  shadow: { r: 0.424, g: 0.173, b: 0.655 },          // #6C2CA7
  divider: { r: 0.424, g: 0.173, b: 0.655 },         // #6C2CA7

  // Gradients
  gradTop: { r: 0.235, g: 0.090, b: 0.286 },        // #3C1749
  gradMid: { r: 0.310, g: 0.173, b: 0.353 },        // #4F2C5A
  gradBot: { r: 0.102, g: 0.051, b: 0.180 },        // #1A0D2E

  // Logo
  logo: { r: 0.941, g: 0.965, b: 0.988 },           // #F0F6FC

  // Icons
  iconPrimary: { r: 0.831, g: 0.722, b: 1.0 },      // #D4B8FF
  iconSecondary: { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5

  // Avatar glows
  glow: { r: 0.608, g: 0.435, b: 0.831 },            // #9B6FD4

  // White
  white: { r: 1, g: 1, b: 1 },
  black: { r: 0, g: 0, b: 0 },
};

// Screen dimensions (iPhone 14 Pro)
const W = 393;
const H = 852;
const STATUS_BAR = 59;   // Dynamic Island area
const BOTTOM_SAFE = 34;  // Home indicator area

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels");
  return sorted[0][0];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function sendCommand(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        if (data.message.error) reject(new Error(JSON.stringify(data.message.error)));
        else resolve(data.message.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}

async function rect(ws, ch, pid, name, x, y, w, h, radius = 0) {
  const r = await sendCommand(ws, ch, "create_rectangle", { name, x, y, width: w, height: h, parentId: pid });
  if (radius > 0) await sendCommand(ws, ch, "set_corner_radius", { nodeId: r.id, radius });
  return r;
}

async function text(ws, ch, pid, name, x, y, content, fontSize = 16) {
  const t = await sendCommand(ws, ch, "create_text", { name, x, y, text: content, fontSize, parentId: pid });
  return t;
}

async function fill(ws, ch, id, color, alpha = 1) {
  await sendCommand(ws, ch, "set_fill_color", { nodeId: id, r: color.r, g: color.g, b: color.b, a: alpha });
}

async function grad(ws, ch, id, type, stops, handles) {
  const params = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) params.gradientHandlePositions = handles;
  await sendCommand(ws, ch, "set_fill_gradient", params);
}

async function noFill(ws, ch, id) {
  await sendCommand(ws, ch, "set_fill_color", { nodeId: id, r: 0, g: 0, b: 0, a: 0 });
}

// ═══════════════════════════════════════════════════════════
// BUILD FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function buildStatusBar(ws, ch, pid, baseX, baseY) {
  // Status bar area
  const sb = await rect(ws, ch, pid, "Status Bar", 0, 0, W, STATUS_BAR);
  await noFill(ws, ch, sb.id);

  // Time
  const time = await text(ws, ch, pid, "Time", 30, 16, "3:14", 17);
  await sendCommand(ws, ch, "set_text_content", { nodeId: time.id, text: "3:14" });

  // Signal bars (simplified as text)
  const signal = await text(ws, ch, pid, "Signal", W - 95, 16, "•••", 14);

  // Battery
  const batt = await rect(ws, ch, pid, "Battery", W - 40, 19, 27, 13, 3);
  await fill(ws, ch, batt.id, C.white, 0.9);

  console.log("  ✓ Status bar");
}

async function buildHeader(ws, ch, pid) {
  // Header container
  const header = await rect(ws, ch, pid, "Header", 0, STATUS_BAR, W, 48);
  await noFill(ws, ch, header.id);

  // Logo "belo"
  const logo = await text(ws, ch, pid, "Logo", 20, STATUS_BAR + 10, "belo", 28);

  // Profile avatar button (top right)
  const profileX = W - 60;
  const profileY = STATUS_BAR + 4;

  // Glow
  const profileGlow = await rect(ws, ch, pid, "Profile Glow", profileX - 13, profileY - 13, 66, 66, 33);
  await grad(ws, ch, profileGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.6, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Profile ring (frosted glass)
  const profileRing = await rect(ws, ch, pid, "Profile Ring", profileX - 1, profileY - 1, 42, 42, 21);
  await fill(ws, ch, profileRing.id, C.bg, 0.85);

  // Profile avatar
  const profileAvatar = await rect(ws, ch, pid, "Profile Avatar", profileX, profileY, 40, 40, 20);
  await grad(ws, ch, profileAvatar.id, "GRADIENT_RADIAL", [
    { r: 0.424, g: 0.173, b: 0.655, a: 1, position: 0 },
    { r: 0.608, g: 0.302, b: 0.792, a: 1, position: 1 },
  ]);

  // Profile initials
  const initials = await text(ws, ch, pid, "Profile Initials", profileX + 10, profileY + 10, "K", 18);

  console.log("  ✓ Header with logo + profile");
}

async function buildGoldenCircle(ws, ch, pid) {
  // Golden Circle: 7 users — 1 center + 6 concentric
  const centerX = W / 2;  // 196.5
  const centerY = 340;     // Vertical center of main content area
  const innerRadius = 110; // Distance from center to ring bubbles

  // ── CENTER USER (main) ──
  const mainSize = 66;
  const mainGlowSize = mainSize * 1.65; // 108.9
  const mx = centerX - mainGlowSize / 2;
  const my = centerY - mainGlowSize / 2;

  // Center glow
  const centerGlow = await rect(ws, ch, pid, "Center Glow", mx, my, mainGlowSize, mainGlowSize, mainGlowSize / 2);
  await grad(ws, ch, centerGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.6, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Center frosted ring
  const centerRing = await rect(ws, ch, pid, "Center Ring", centerX - mainSize / 2 - 2, centerY - mainSize / 2 - 2, mainSize + 4, mainSize + 4, (mainSize + 4) / 2);
  await fill(ws, ch, centerRing.id, C.bg, 0.85);

  // Center avatar
  const centerAvatar = await rect(ws, ch, pid, "Center Avatar", centerX - mainSize / 2, centerY - mainSize / 2, mainSize, mainSize, mainSize / 2);
  await grad(ws, ch, centerAvatar.id, "GRADIENT_RADIAL", [
    { r: 0.424, g: 0.173, b: 0.655, a: 1, position: 0 },
    { r: 0.357, g: 0.122, b: 0.541, a: 1, position: 1 },
  ]);

  // Center initials
  const ci = await text(ws, ch, pid, "Center Initials", centerX - 8, centerY - 12, "S", 22);

  // Center name label
  const centerName = await text(ws, ch, pid, "Center Name", centerX - 18, centerY + mainSize / 2 + 16, "Saeed", 13);

  // Unread badge on center
  const badge = await rect(ws, ch, pid, "Unread Badge", centerX + mainSize / 2 - 8, centerY - mainSize / 2 - 4, 24, 24, 12);
  await fill(ws, ch, badge.id, C.accent, 1);
  const badgeText = await text(ws, ch, pid, "Badge Count", centerX + mainSize / 2 - 2, centerY - mainSize / 2, "3", 13);

  console.log("  ✓ Golden Circle — center user");

  // ── 6 RING USERS (concentric placement) ──
  const ringUsers = [
    { name: "Roman", color: { r: 0.608, g: 0.302, b: 0.792 } },     // #9B4DCA
    { name: "Aisha", color: { r: 0.482, g: 0.208, b: 0.729 } },     // #7B35B8
    { name: "Tyler", color: { r: 0.239, g: 0.082, b: 0.400 } },     // #3D1566
    { name: "Nora", color: { r: 0.549, g: 0.239, b: 0.749 } },      // #8C3DBF
    { name: "Kai", color: { r: 0.424, g: 0.173, b: 0.655 } },       // #6C2CA7
    { name: "Lena", color: { r: 0.357, g: 0.122, b: 0.541 } },      // #5B1F8A
  ];

  const ringSize = 48;
  const ringGlowSize = ringSize * 1.65; // 79.2

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2; // Start from top
    const ux = centerX + innerRadius * Math.cos(angle);
    const uy = centerY + innerRadius * Math.sin(angle);
    const user = ringUsers[i];

    // Glow
    const glow = await rect(ws, ch, pid, `${user.name} Glow`, ux - ringGlowSize / 2, uy - ringGlowSize / 2, ringGlowSize, ringGlowSize, ringGlowSize / 2);
    await grad(ws, ch, glow.id, "GRADIENT_RADIAL", [
      { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.5, position: 0 },
      { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.2, position: 0.5 },
      { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
    ]);

    // Frosted ring
    const ring = await rect(ws, ch, pid, `${user.name} Ring`, ux - ringSize / 2 - 2, uy - ringSize / 2 - 2, ringSize + 4, ringSize + 4, (ringSize + 4) / 2);
    await fill(ws, ch, ring.id, C.bg, 0.85);

    // Avatar
    const av = await rect(ws, ch, pid, `${user.name} Avatar`, ux - ringSize / 2, uy - ringSize / 2, ringSize, ringSize, ringSize / 2);
    await grad(ws, ch, av.id, "GRADIENT_RADIAL", [
      { r: user.color.r, g: user.color.g, b: user.color.b, a: 1, position: 0 },
      { r: user.color.r * 0.8, g: user.color.g * 0.8, b: user.color.b * 0.8, a: 1, position: 1 },
    ]);

    // Initials
    const init = await text(ws, ch, pid, `${user.name} Init`, ux - 6, uy - 8, user.name[0], 16);

    // Name label
    const label = await text(ws, ch, pid, `${user.name} Label`, ux - user.name.length * 3.5, uy + ringSize / 2 + 10, user.name, 11);

    // Random unread badges on some users
    if (i === 0 || i === 3 || i === 5) {
      const ub = await rect(ws, ch, pid, `${user.name} Badge`, ux + ringSize / 2 - 10, uy - ringSize / 2 - 4, 20, 20, 10);
      await fill(ws, ch, ub.id, C.accent, 1);
      const ubt = await text(ws, ch, pid, `${user.name} Badge#`, ux + ringSize / 2 - 5, uy - ringSize / 2, i === 0 ? "5" : "2", 11);
    }

    console.log(`  ✓ Golden Circle — ${user.name}`);
  }
}

async function buildBottomNav(ws, ch, pid) {
  // Rotary arc navigation at bottom
  const navY = H - BOTTOM_SAFE - 70;
  const arcCenterX = W / 2;
  const arcCenterY = navY + 50; // Below visible area
  const arcRadius = 96;
  const spreadAngle = Math.PI / 3; // 60°

  // Semi-transparent nav background
  const navBg = await rect(ws, ch, pid, "Nav Background", 0, navY - 10, W, 80 + BOTTOM_SAFE, 0);
  await grad(ws, ch, navBg.id, "GRADIENT_LINEAR", [
    { r: C.bg.r, g: C.bg.g, b: C.bg.b, a: 0.0, position: 0 },
    { r: C.bg.r, g: C.bg.g, b: C.bg.b, a: 0.8, position: 0.3 },
    { r: C.bg.r, g: C.bg.g, b: C.bg.b, a: 0.95, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  // Three nav items: Flow, Home, Pops
  const navItems = [
    { label: "FLOW", active: false },
    { label: "HOME", active: true },
    { label: "POPS", active: false },
  ];

  for (let i = 0; i < 3; i++) {
    const item = navItems[i];
    const angle = Math.PI / 2 + (1 - i) * spreadAngle;
    const ix = arcCenterX + arcRadius * Math.cos(angle);
    const iy = arcCenterY - arcRadius * Math.sin(angle);

    // Dot indicator
    const dotSize = item.active ? 6 : 4;
    const dot = await rect(ws, ch, pid, `Nav Dot ${item.label}`, ix - dotSize / 2, iy - dotSize / 2 - 8, dotSize, dotSize, dotSize / 2);
    if (item.active) {
      await fill(ws, ch, dot.id, C.accent, 1);
    } else {
      await fill(ws, ch, dot.id, C.white, 0.55);
    }

    // Label
    const labelX = ix - item.label.length * 3;
    const label = await text(ws, ch, pid, `Nav Label ${item.label}`, labelX, iy + 2, item.label, item.active ? 10.5 : 9.5);
  }

  console.log("  ✓ Bottom nav (rotary arc)");
}

async function buildBottomButtons(ws, ch, pid) {
  const btnY = H - BOTTOM_SAFE - 90;

  // Search bar
  const searchX = 20;
  const searchW = W - 40 - 68; // Leave room for + button
  const searchH = 52;

  const searchBg = await rect(ws, ch, pid, "Search Bar", searchX, btnY, searchW, searchH, 28);
  await grad(ws, ch, searchBg.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.12, position: 0 },
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.10, position: 1 },
  ]);

  // Search bar border
  const searchBorder = await rect(ws, ch, pid, "Search Border", searchX, btnY, searchW, searchH, 28);
  await fill(ws, ch, searchBorder.id, C.white, 0.18);
  // Make it just a border by overlaying inner
  const searchInner = await rect(ws, ch, pid, "Search Inner", searchX + 1, btnY + 1, searchW - 2, searchH - 2, 27);
  await grad(ws, ch, searchInner.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.08, position: 0 },
    { r: C.accent.r, g: C.accent.g, b: C.accent.b, a: 0.06, position: 1 },
  ]);

  // Search icon
  const searchIcon = await text(ws, ch, pid, "Search Icon", searchX + 16, btnY + 14, "⌕", 20);

  // Search placeholder
  const searchPlaceholder = await text(ws, ch, pid, "Search Placeholder", searchX + 44, btnY + 16, "Search", 15);

  // New Chat button (+ button with eclipse effect)
  const plusX = W - 20 - 52;
  const plusY = btnY;
  const plusGlowSize = 52 * 1.65;

  // Plus glow
  const plusGlow = await rect(ws, ch, pid, "Plus Glow", plusX - (plusGlowSize - 52) / 2, plusY - (plusGlowSize - 52) / 2, plusGlowSize, plusGlowSize, plusGlowSize / 2);
  await grad(ws, ch, plusGlow.id, "GRADIENT_RADIAL", [
    { r: 0.8, g: 0.6, b: 1, a: 0.5, position: 0 },
    { r: 0.8, g: 0.6, b: 1, a: 0.2, position: 0.5 },
    { r: 0.8, g: 0.6, b: 1, a: 0.0, position: 1 },
  ]);

  // Plus ring
  const plusRing = await rect(ws, ch, pid, "Plus Ring", plusX - 2, plusY - 2, 56, 56, 28);
  await fill(ws, ch, plusRing.id, C.bg, 0.85);

  // Plus button
  const plusBtn = await rect(ws, ch, pid, "Plus Button", plusX, plusY, 52, 52, 26);
  await grad(ws, ch, plusBtn.id, "GRADIENT_RADIAL", [
    { r: 0.8, g: 0.6, b: 1, a: 0.3, position: 0 },
    { r: 0.6, g: 0.3, b: 0.9, a: 0.15, position: 1 },
  ]);

  // Plus icon
  const plusIcon = await text(ws, ch, pid, "Plus Icon", plusX + 16, plusY + 12, "+", 24);

  console.log("  ✓ Bottom buttons (search + new chat)");
}

async function buildChatPreview(ws, ch, pid) {
  // Show 2-3 chat conversation tiles at the bottom (partially visible, as they appear when scrolled)
  // These represent the conversation list below the golden circle
  const startY = 520;
  const tileH = 78;
  const tileGap = 10;

  const chats = [
    { name: "Mr. Stephano", msg: "Good morning Saeed!", time: "Today", unread: 0 },
    { name: "Aisha K.", msg: "Were you still open to meeting?", time: "2h", unread: 2 },
    { name: "Tyler M.", msg: "Nah man, it wont work out.", time: "5h", unread: 0 },
  ];

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    const ty = startY + i * (tileH + tileGap);

    // Tile background
    const isUnread = chat.unread > 0;
    const tile = await rect(ws, ch, pid, `Chat ${chat.name}`, 16, ty, W - 32, tileH, 20);
    if (isUnread) {
      await fill(ws, ch, tile.id, C.accent, 0.05);
    } else {
      await fill(ws, ch, tile.id, C.cardBg, 0.8);
    }

    // Avatar
    const avSize = 54;
    const avX = 30;
    const avY = ty + (tileH - avSize) / 2;
    const av = await rect(ws, ch, pid, `${chat.name} Avatar`, avX, avY, avSize, avSize, avSize / 2);
    await grad(ws, ch, av.id, "GRADIENT_RADIAL", [
      { r: 0.424, g: 0.173, b: 0.655, a: 1, position: 0 },
      { r: 0.608, g: 0.302, b: 0.792, a: 1, position: 1 },
    ]);

    // Avatar initials
    const avInit = await text(ws, ch, pid, `${chat.name} Init`, avX + 16, avY + 15, chat.name[0], 20);

    // Name
    const nameT = await text(ws, ch, pid, `${chat.name} Name`, 96, ty + 16, chat.name, 16);

    // Time
    const timeT = await text(ws, ch, pid, `${chat.name} Time`, W - 70, ty + 18, chat.time, 12);

    // Message preview
    const msgT = await text(ws, ch, pid, `${chat.name} Msg`, 96, ty + 42, chat.msg, 14);

    // Unread badge
    if (chat.unread > 0) {
      const ubX = W - 58;
      const ubY = ty + 46;
      const ub = await rect(ws, ch, pid, `${chat.name} Unread`, ubX, ubY, 22, 22, 11);
      await fill(ws, ch, ub.id, C.accent, 1);
      const ubt = await text(ws, ch, pid, `${chat.name} Count`, ubX + 6, ubY + 3, String(chat.unread), 12);
    }
  }

  console.log("  ✓ Chat conversation tiles");
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Find safe open space — place far right of all content
  const frameX = 13200;
  const frameY = 0;

  console.log("Building Belo Home Screen...\n");

  // ── Main Phone Frame ──
  const phone = await sendCommand(ws, ch, "create_frame", {
    name: "Belo – Home Screen (Dark)",
    x: frameX, y: frameY, width: W, height: H,
  });
  const pid = phone.id;

  // Background gradient (top to bottom purple)
  await grad(ws, ch, pid, "GRADIENT_LINEAR", [
    { r: C.gradTop.r, g: C.gradTop.g, b: C.gradTop.b, a: 1, position: 0 },
    { r: C.gradMid.r, g: C.gradMid.g, b: C.gradMid.b, a: 1, position: 0.4 },
    { r: C.gradBot.r, g: C.gradBot.g, b: C.gradBot.b, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  // Round corners for phone look
  await sendCommand(ws, ch, "set_corner_radius", { nodeId: pid, radius: 44 });
  console.log(`  ✓ Phone frame: ${pid}`);

  // Build all sections
  await buildStatusBar(ws, ch, pid, frameX, frameY);
  await buildHeader(ws, ch, pid);
  await buildGoldenCircle(ws, ch, pid);
  await buildChatPreview(ws, ch, pid);
  await buildBottomButtons(ws, ch, pid);
  await buildBottomNav(ws, ch, pid);

  // Select the frame
  await sendCommand(ws, ch, "set_selections", { nodeIds: [pid] });

  console.log(`\n✅ Belo Home Screen complete at (${frameX}, ${frameY})`);
  console.log(`Frame ID: ${pid}`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
