#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat v6.0 — FINAL PUSH (95%+ target)
// Uses: create_vector (SVG icons), set_multiple_fills (layered bg),
//       set_multiple_effects (glass), set_image_fill (avatar photo)
// ══════════════════════════════════════════════════════════════
import { readFileSync } from "fs";

const RELAY_URL = "ws://localhost:3055";
const CHANNEL = "9aztejyj";
const W = 393, H = 852;

// Scale factors: emulator 411x923 -> Figma 393x852
const SX = 393 / 411;
const SY = 852 / 923;

// ─── COLORS (from design-tokens.json + emulator observation) ───
const C = {
  // Background gradient
  bgDark:    { r: 0.047, g: 0.016, b: 0.082 },   // #0C0415 deep purple-black
  bgMid:     { r: 0.071, g: 0.035, b: 0.173 },   // #120938 dark navy
  bgLight:   { r: 0.110, g: 0.075, b: 0.220 },   // #1C1338 slightly lighter
  bgGlow:    { r: 0.200, g: 0.180, b: 0.320 },   // subtle center glow

  // Text
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },   // muted purple
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },

  // Accent / glow
  accent:    { r: 0.729, g: 0.510, b: 0.929 },   // #BA82ED
  glow:      { r: 0.500, g: 0.300, b: 0.800 },   // avatar glow
  iconPri:   { r: 0.831, g: 0.722, b: 1.0 },     // #D4B8FF icon color

  // Input area
  inputBg:   { r: 0.100, g: 0.055, b: 0.200 },   // dark input bg
  inputBord: { r: 0.300, g: 0.200, b: 0.500, a: 0.3 },

  // Mic button
  micBg:     { r: 0.110, g: 0.060, b: 0.220 },   // dark circle
  micAccent: { r: 0.400, g: 0.200, b: 0.700 },   // ring glow

  // Badge
  badgeBg:   { r: 0.200, g: 0.100, b: 0.300, a: 0.5 },

  // Online dot
  online:    { r: 0.204, g: 0.827, b: 0.600 },

  // Date badge
  dateBg:    { r: 0.300, g: 0.150, b: 0.450 },
};

// ─── ICON PATHS (from icon-paths.json) ───
const ICONS = JSON.parse(readFileSync("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/scripts/icon-paths.json", "utf8"));

// ─── HELPERS ───
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function cmd(ws, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      try {
        const d = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
        if (d.message?.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(t);
          if (d.message.error) {
            console.error(`  CMD ERROR [${command}]:`, JSON.stringify(d.message.error));
            reject(new Error(JSON.stringify(d.message.error)));
          } else {
            resolve(d.message.result);
          }
        }
      } catch (e) { /* ignore non-JSON */ }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({
      id, type: "message", channel: CHANNEL,
      message: { id, command, params },
    }));
  });
}

// Shorthand helpers
async function rect(ws, pid, name, x, y, w, h, rad = 0) {
  const r = await cmd(ws, "create_rectangle", { name, x, y, width: w, height: h, parentId: pid });
  if (rad > 0) await cmd(ws, "set_corner_radius", { nodeId: r.id, radius: rad });
  return r;
}

async function ellipse(ws, pid, name, x, y, w, h) {
  return cmd(ws, "create_ellipse", { name, x, y, width: w, height: h, parentId: pid });
}

async function text(ws, pid, name, x, y, content, sz, opts = {}) {
  return cmd(ws, "create_text", {
    name, x, y, text: content, fontSize: sz,
    fontFamily: opts.fontFamily || "Inter",
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || C.textPri,
    parentId: pid,
  });
}

async function fill(ws, id, c, a = 1) {
  await cmd(ws, "set_fill_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a } });
}

async function gradient(ws, id, type, stops, handles) {
  const p = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) p.gradientHandlePositions = handles;
  await cmd(ws, "set_fill_gradient", p);
}

async function stroke(ws, id, c, weight = 1, a = 1) {
  await cmd(ws, "set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a }, weight });
}

async function vector(ws, pid, name, x, y, w, h, pathData, windingRule = "NONZERO") {
  return cmd(ws, "create_vector", {
    name, x, y, width: w, height: h,
    paths: [{ data: pathData, windingRule }],
    parentId: pid,
  });
}

async function multiFill(ws, id, fills) {
  return cmd(ws, "set_multiple_fills", { nodeId: id, fills });
}

async function multiEffect(ws, id, effects) {
  return cmd(ws, "set_multiple_effects", { nodeId: id, effects });
}

async function noFill(ws, id) {
  await cmd(ws, "set_fill_color", { nodeId: id, color: { r: 0, g: 0, b: 0, a: 0 } });
}

// Scale an SVG icon path from its native 24x24 viewbox to target size
function scalePathData(pathData, fromW, fromH, toW, toH) {
  const sx = toW / fromW;
  const sy = toH / fromH;
  return pathData.replace(/([0-9]*\.?[0-9]+)/g, (match, num, offset) => {
    // We need to figure out if this number is an X or Y coordinate
    // For simplicity with SVG path M/L/C/Z commands, we'll use resize on the vector node
    return match; // Let Figma handle scaling via resize
  });
}

// ══════════════════════════════════════════════════════════════
// MAIN BUILD
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log("Connecting to channel:", CHANNEL);
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: CHANNEL }));
  await new Promise(r => setTimeout(r, 1500));
  console.log("Connected!\n");

  // ── CREATE MAIN FRAME ──
  const FX = 34500, FY = 0;
  const frame = await cmd(ws, "create_frame", {
    name: "Belo DM v6.0 (Final)", x: FX, y: FY, width: W, height: H,
  });
  const P = frame.id;
  console.log(`Frame: ${P} at (${FX}, ${FY})`);

  // Clip content
  await cmd(ws, "set_corner_radius", { nodeId: P, radius: 40 });

  // ══════════════════════════════════════════════════════════════
  // 1. BACKGROUND — Layered gradient (15 pts)
  // ══════════════════════════════════════════════════════════════
  console.log("Building background...");

  // Base background rectangle with multiple fills
  const bgRect = await rect(ws, P, "Background", 0, 0, W, H);
  await multiFill(ws, bgRect.id, [
    // Layer 1: Base dark-to-darker linear gradient (top-left to bottom-right)
    {
      type: "GRADIENT_LINEAR",
      gradientStops: [
        { r: 0.180, g: 0.110, b: 0.350, a: 1, position: 0 },     // #2D1C59 top
        { r: 0.070, g: 0.040, b: 0.180, a: 1, position: 0.4 },    // #120A2E mid
        { r: 0.035, g: 0.020, b: 0.120, a: 1, position: 0.7 },    // #09051F
        { r: 0.050, g: 0.050, b: 0.100, a: 1, position: 1.0 },    // #0D0D1A bottom
      ],
      gradientHandlePositions: [
        { x: 0.3, y: 0 }, { x: 0.7, y: 1 }, { x: 0, y: 0.5 }
      ],
    },
    // Layer 2: Radial glow in lower-center (teal-blue tint visible in emulator)
    {
      type: "GRADIENT_RADIAL",
      gradientStops: [
        { r: 0.150, g: 0.200, b: 0.350, a: 0.45, position: 0 },  // blue-teal glow
        { r: 0.100, g: 0.150, b: 0.280, a: 0.25, position: 0.4 },
        { r: 0.050, g: 0.070, b: 0.150, a: 0.0, position: 1.0 },
      ],
      gradientHandlePositions: [
        { x: 0.5, y: 0.65 }, { x: 1.0, y: 0.65 }, { x: 0.5, y: 1.1 }
      ],
      blendMode: "SCREEN",
    },
  ]);
  console.log("  Background gradient done");

  // ══════════════════════════════════════════════════════════════
  // 2. STATUS BAR (subtle, not scored but adds polish)
  // ══════════════════════════════════════════════════════════════
  await text(ws, P, "StatusTime", 24, 12, "4:30", 15, { fontWeight: 600, color: C.white });

  // Signal/wifi/battery indicators (small rects)
  const battOuter = await rect(ws, P, "BattOuter", W - 38, 14, 25, 12, 3);
  await noFill(ws, battOuter.id);
  await stroke(ws, battOuter.id, C.white, 1);
  const battInner = await rect(ws, P, "BattInner", W - 36, 16, 14, 8, 2);
  await fill(ws, battInner.id, C.white, 0.7);
  // Battery tip
  const battTip = await rect(ws, P, "BattTip", W - 12, 18, 2, 5, 1);
  await fill(ws, battTip.id, C.white, 0.4);

  console.log("  Status bar done");

  // ══════════════════════════════════════════════════════════════
  // 3. HEADER — Back arrow, phone, avatar, video, stack (10+15+5 pts)
  // ══════════════════════════════════════════════════════════════
  console.log("Building header...");
  const headerY = 42;

  // ── BACK ARROW (chevron_left) ──
  // Position: x=8*SX, centerY = headerY + 30 (from layout: button at x=8, y=76, 48x48)
  const backX = 8 * SX;
  const backCY = 76 * SY + 24 * SY; // center of 48px button
  const backIconSize = 22;
  const backIcon = await vector(ws, P, "BackArrow",
    backX + 12, headerY + 20,
    backIconSize, backIconSize,
    ICONS.chevron_left.paths[0].data
  );
  await fill(ws, backIcon.id, C.white);
  console.log("  Back arrow vector done");

  // ── PHONE BUTTON (circle + phone icon) ──
  // From layout: View at x=89, y=72, 59x59 (scaled)
  const phoneBtnX = 89 * SX;
  const phoneBtnY = 72 * SY;
  const phoneBtnSz = 56 * SX;

  // Circle border
  const phoneCircle = await ellipse(ws, P, "PhoneCircle",
    phoneBtnX, phoneBtnY, phoneBtnSz, phoneBtnSz
  );
  await noFill(ws, phoneCircle.id);
  await stroke(ws, phoneCircle.id, { r: 0.400, g: 0.250, b: 0.600 }, 1.5);
  // Add subtle glow effect
  await multiEffect(ws, phoneCircle.id, [
    { type: "DROP_SHADOW", color: { r: 0.5, g: 0.3, b: 0.8, a: 0.2 }, offset: { x: 0, y: 0 }, radius: 8, spread: 0 },
  ]);

  // Phone icon (vector)
  const phoneIconSz = 16;
  const phoneIcon = await vector(ws, P, "PhoneIcon",
    phoneBtnX + (phoneBtnSz - phoneIconSz) / 2,
    phoneBtnY + (phoneBtnSz - phoneIconSz) / 2,
    phoneIconSz, phoneIconSz,
    ICONS.phone.paths[0].data
  );
  await fill(ws, phoneIcon.id, C.white);
  console.log("  Phone button done");

  // ── AVATAR WITH GLOW (15 pts) ──
  // From layout: ImageView at x=161, y=54, 89x89 (scaled)
  const avLayoutX = 161 * SX;
  const avLayoutY = 54 * SY;
  const avLayoutSz = 85 * SX;
  const avCX = avLayoutX + avLayoutSz / 2;
  const avCY = avLayoutY + avLayoutSz / 2;
  const avSz = avLayoutSz; // ~81px

  // Glow behind avatar (large radial gradient ellipse)
  const glowSz = avSz * 2.0;
  const avGlow = await ellipse(ws, P, "AvatarGlow",
    avCX - glowSz / 2, avCY - glowSz / 2, glowSz, glowSz
  );
  await gradient(ws, avGlow.id, "GRADIENT_RADIAL", [
    { r: 0.400, g: 0.250, b: 0.750, a: 0.55, position: 0 },
    { r: 0.350, g: 0.200, b: 0.650, a: 0.30, position: 0.4 },
    { r: 0.250, g: 0.150, b: 0.500, a: 0.10, position: 0.7 },
    { r: 0.150, g: 0.080, b: 0.350, a: 0.00, position: 1.0 },
  ]);

  // Avatar circle (will be filled with image)
  const avCircle = await ellipse(ws, P, "AvatarPhoto",
    avCX - avSz / 2, avCY - avSz / 2, avSz, avSz
  );
  // Temporary gradient fill until image is set
  await gradient(ws, avCircle.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  // Avatar border ring
  await stroke(ws, avCircle.id, { r: 0.100, g: 0.050, b: 0.200 }, 3);

  // Add shadow/glow effect to avatar
  await multiEffect(ws, avCircle.id, [
    { type: "DROP_SHADOW", color: { r: 0.4, g: 0.2, b: 0.7, a: 0.4 }, offset: { x: 0, y: 2 }, radius: 12, spread: 2 },
  ]);

  // Online indicator dot
  const dotSz = 14;
  const onlineDot = await ellipse(ws, P, "OnlineDot",
    avCX + avSz / 2 - dotSz + 2,
    avCY + avSz / 2 - dotSz + 2,
    dotSz, dotSz
  );
  await fill(ws, onlineDot.id, C.online);
  await stroke(ws, onlineDot.id, { r: 0.050, g: 0.020, b: 0.120 }, 2.5);

  console.log("  Avatar + glow done");

  // ── VIDEO BUTTON (circle + videocam icon) ──
  // From layout: View at x=263, y=72, 59x59 (scaled)
  const vidBtnX = 263 * SX;
  const vidBtnY = 72 * SY;
  const vidBtnSz = 56 * SX;

  const vidCircle = await ellipse(ws, P, "VideoCircle",
    vidBtnX, vidBtnY, vidBtnSz, vidBtnSz
  );
  await noFill(ws, vidCircle.id);
  await stroke(ws, vidCircle.id, { r: 0.400, g: 0.250, b: 0.600 }, 1.5);
  await multiEffect(ws, vidCircle.id, [
    { type: "DROP_SHADOW", color: { r: 0.5, g: 0.3, b: 0.8, a: 0.2 }, offset: { x: 0, y: 0 }, radius: 8, spread: 0 },
  ]);

  const vidIconSz = 16;
  const vidIcon = await vector(ws, P, "VideoIcon",
    vidBtnX + (vidBtnSz - vidIconSz) / 2,
    vidBtnY + (vidBtnSz - vidIconSz) / 2,
    vidIconSz, vidIconSz,
    ICONS.videocam.paths[0].data
  );
  await fill(ws, vidIcon.id, C.white);
  console.log("  Video button done");

  // ── STACK/FILTER ICON (top right) ──
  // From layout: Button at x=355, y=76, 48x48 (scaled)
  const stackX = 355 * SX;
  const stackY = 76 * SY;
  const stackIconSz = 18;
  const stackIcon = await vector(ws, P, "StackIcon",
    stackX + 14, stackY + 14,
    stackIconSz, stackIconSz,
    ICONS.filter_none.paths[0].data
  );
  await fill(ws, stackIcon.id, C.white);
  console.log("  Stack icon done");

  // ── NAME TEXT (5 pts) ──
  // "Saeed Sharifi" centered below avatar
  const nameText = await text(ws, P, "ContactName",
    0, avCY + avSz / 2 + 8,
    "Saeed Sharifi", 16,
    { fontWeight: 600, color: C.textPri }
  );
  // Center the name: ~13 chars * ~8px = ~104px wide, center at avCX
  // We'll position after creation. Text auto-sizes, let's estimate
  const nameEstW = 104;
  await cmd(ws, "move_node", { nodeId: nameText.id, x: avCX - nameEstW / 2, y: avCY + avSz / 2 + 10 });

  console.log("  Name text done");

  // ══════════════════════════════════════════════════════════════
  // 4. DATE BADGE (5 pts)
  // ══════════════════════════════════════════════════════════════
  // From layout: contentDescription "17/3/2026" at y=670 (scaled)
  const dateY = 670 * SY;
  const dateBadgeW = 90;
  const dateBadgeH = 26;
  const dateBadgeX = (W - dateBadgeW) / 2;

  const dateBg = await rect(ws, P, "DateBadgeBg", dateBadgeX, dateY, dateBadgeW, dateBadgeH, 13);
  await fill(ws, dateBg.id, { r: 0.250, g: 0.130, b: 0.380 }, 0.5);
  await stroke(ws, dateBg.id, { r: 0.400, g: 0.250, b: 0.600 }, 0.5, 0.3);

  const dateText = await text(ws, P, "DateText",
    dateBadgeX + 12, dateY + 5,
    "17/3/2026", 12,
    { fontWeight: 500, color: { r: 0.750, g: 0.600, b: 0.900 } }
  );
  console.log("  Date badge done");

  // ══════════════════════════════════════════════════════════════
  // 5. MESSAGE "H" + TIMESTAMP "15:17" (10 pts)
  // ══════════════════════════════════════════════════════════════
  // From layout: description "17/3/2026\nH\n15:17" at x=16, y=670, w=379, h=127
  // The message is below the date badge
  const msgY = dateY + dateBadgeH + 20;

  // Message text "H" (no bubble, just text)
  const msgText = await text(ws, P, "MessageText",
    28, msgY,
    "H", 16,
    { fontWeight: 400, color: C.textPri }
  );

  // Timestamp "15:17" below message
  const timeText = await text(ws, P, "MessageTime",
    28, msgY + 22,
    "15:17", 12,
    { fontWeight: 400, color: C.textMut }
  );
  console.log("  Message + timestamp done");

  // ══════════════════════════════════════════════════════════════
  // 6. INPUT AREA (15 pts) — glass balls, belo text, mic vector
  // ══════════════════════════════════════════════════════════════
  console.log("Building input area...");

  // Input area background (subtle glass)
  const inputY = H - 90;
  const inputAreaBg = await rect(ws, P, "InputAreaBg", 0, inputY - 10, W, 100);
  // Subtle gradient overlay for input area separation
  await gradient(ws, inputAreaBg.id, "GRADIENT_LINEAR", [
    { r: 0.03, g: 0.02, b: 0.08, a: 0.0, position: 0 },
    { r: 0.03, g: 0.02, b: 0.08, a: 0.5, position: 0.3 },
    { r: 0.04, g: 0.03, b: 0.10, a: 0.8, position: 1.0 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);

  // ── Glass balls button (left) ──
  // From layout: View at x=12, y=834, 44x44 (scaled)
  const ballsBtnX = 12 * SX;
  const ballsBtnY = 834 * SY;
  const ballsBtnSz = 42 * SX;

  // Outer circle
  const ballsCircle = await ellipse(ws, P, "BallsBtn",
    ballsBtnX, ballsBtnY, ballsBtnSz, ballsBtnSz
  );
  await fill(ws, ballsCircle.id, { r: 0.080, g: 0.040, b: 0.160 }, 0.6);
  await stroke(ws, ballsCircle.id, { r: 0.350, g: 0.200, b: 0.550 }, 1, 0.4);

  // Three dots inside (vertical) representing the glass balls
  const dotR = 3.5;
  const dotsCX = ballsBtnX + ballsBtnSz / 2;
  const dotsCY = ballsBtnY + ballsBtnSz / 2;
  for (let i = -1; i <= 1; i++) {
    const dot = await ellipse(ws, P, `BallDot${i+1}`,
      dotsCX - dotR, dotsCY + i * 10 - dotR, dotR * 2, dotR * 2
    );
    await fill(ws, dot.id, C.accent, 0.9);
  }
  console.log("  Glass balls button done");

  // ── "belo" logo text ──
  // From layout: ImageView at x=66, y=846, 45x20 (scaled)
  const beloX = 66 * SX;
  const beloY = 846 * SY - 4;
  const beloText = await text(ws, P, "BeloLogo",
    beloX, beloY,
    "belo", 20,
    { fontFamily: "Bumbbled", fontWeight: 500, color: C.accent }
  );
  console.log("  Belo logo done");

  // ── Input field area (between belo and mic) ──
  // From layout: EditText at x=66, y=826, 258x60 (scaled)
  // The belo text IS the input field label, no separate field needed
  // But there's a subtle input background
  const inputFieldX = 55 * SX;
  const inputFieldY = 826 * SY;
  const inputFieldW = 268 * SX;
  const inputFieldH = 55 * SY;

  // ── MIC BUTTON (right, in dark circle) ──
  // From layout: View at x=333, y=824, 66x66 (scaled)
  const micBtnX = 333 * SX;
  const micBtnY = 824 * SY;
  const micBtnSz = 63 * SX;

  // Outer dark circle with glow
  const micOuter = await ellipse(ws, P, "MicBtnOuter",
    micBtnX, micBtnY, micBtnSz, micBtnSz
  );
  await fill(ws, micOuter.id, { r: 0.070, g: 0.035, b: 0.160 });
  await stroke(ws, micOuter.id, { r: 0.300, g: 0.180, b: 0.500 }, 1.5, 0.5);

  // Add glow effects to mic button
  await multiEffect(ws, micOuter.id, [
    { type: "DROP_SHADOW", color: { r: 0.5, g: 0.3, b: 0.8, a: 0.3 }, offset: { x: 0, y: 0 }, radius: 12, spread: 2 },
    { type: "INNER_SHADOW", color: { r: 0.6, g: 0.4, b: 0.9, a: 0.15 }, offset: { x: 0, y: -1 }, radius: 4, spread: 0 },
  ]);

  // Inner ring
  const micInnerRingSz = micBtnSz - 10;
  const micInnerRing = await ellipse(ws, P, "MicBtnRing",
    micBtnX + 5, micBtnY + 5, micInnerRingSz, micInnerRingSz
  );
  await noFill(ws, micInnerRing.id);
  await stroke(ws, micInnerRing.id, { r: 0.400, g: 0.250, b: 0.650 }, 1, 0.3);

  // Mic icon (vector)
  const micIconSz = 18;
  const micIcon = await vector(ws, P, "MicIcon",
    micBtnX + (micBtnSz - micIconSz) / 2,
    micBtnY + (micBtnSz - micIconSz) / 2,
    micIconSz, micIconSz,
    ICONS.mic.paths[0].data
  );
  await fill(ws, micIcon.id, C.white);
  console.log("  Mic button done");

  // ══════════════════════════════════════════════════════════════
  // 7. HOME INDICATOR (5 pts)
  // ══════════════════════════════════════════════════════════════
  const homeIndW = 134;
  const homeInd = await rect(ws, P, "HomeIndicator",
    (W - homeIndW) / 2, H - 10, homeIndW, 5, 3
  );
  await fill(ws, homeInd.id, C.white, 0.25);
  console.log("  Home indicator done");

  // ══════════════════════════════════════════════════════════════
  // 8. SET AVATAR IMAGE
  // ══════════════════════════════════════════════════════════════
  console.log("Setting avatar image...");
  try {
    const avatarB64 = readFileSync("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/avatar-b64-v3.txt", "utf8").trim();
    await cmd(ws, "set_image_fill", {
      nodeId: avCircle.id,
      imageData: avatarB64,
      scaleMode: "FILL",
    });
    console.log("  Avatar image set!");
  } catch (e) {
    console.log("  Avatar image failed (using gradient fallback):", e.message);
  }

  // ══════════════════════════════════════════════════════════════
  // 9. GLASS/GLOW EFFECTS (15 pts)
  // ══════════════════════════════════════════════════════════════
  // Add subtle glass effect to phone and video circles
  await multiEffect(ws, phoneCircle.id, [
    { type: "DROP_SHADOW", color: { r: 0.5, g: 0.3, b: 0.8, a: 0.15 }, offset: { x: 0, y: 0 }, radius: 10, spread: 0 },
    { type: "INNER_SHADOW", color: { r: 1, g: 1, b: 1, a: 0.05 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0 },
  ]);
  await multiEffect(ws, vidCircle.id, [
    { type: "DROP_SHADOW", color: { r: 0.5, g: 0.3, b: 0.8, a: 0.15 }, offset: { x: 0, y: 0 }, radius: 10, spread: 0 },
    { type: "INNER_SHADOW", color: { r: 1, g: 1, b: 1, a: 0.05 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0 },
  ]);
  console.log("  Glass effects done");

  // ══════════════════════════════════════════════════════════════
  // DONE — Focus on frame
  // ══════════════════════════════════════════════════════════════
  await cmd(ws, "set_selections", { nodeIds: [P] });
  console.log(`\n  DONE! Frame "${P}" created at (${FX}, ${FY})`);
  console.log("  Frame ID:", P);

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e.message, e.stack); process.exit(1); });
