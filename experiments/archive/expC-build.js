#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Experiment C: Full-Screen Layout Proportions
// Focus: Get the OVERALL LAYOUT correct — vertical space allocation,
// message placement relative to header and input, proper whitespace.
// KEY RULE: NO COLORED BUBBLE BACKGROUNDS.
//
// Innovation: Match exact Flutter layout structure:
//   Scaffold > Stack > Column [ AppBar(120px), Expanded(ListView), InputArea ]
//   Glass ball overlaps input area edge
// ══════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const FX = 18000, FY = 0;

// ── Colors (dark theme, NO bubble backgrounds) ──
const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 }, // #0C0415
  textOut:   { r: 1, g: 1, b: 1 },
  textIn:    { r: 0.941, g: 0.965, b: 0.988 }, // #F0F6FC
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 }, // #251545
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMut:   { r: 0.620, g: 0.561, b: 0.710 }, // #9E8FB5
  accent:    { r: 0.729, g: 0.510, b: 0.929 }, // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831 }, // #9B6FD4
  success:   { r: 0.353, g: 0.620, b: 0.478 },
  online:    { r: 0.204, g: 0.827, b: 0.600 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  // Glassmorphism for input area (light frosted glass)
  glassBg:   { r: 0.92, g: 0.90, b: 0.95 },  // light lavender glass
  glassStroke: { r: 1, g: 1, b: 1 },
};

// ── Logging ──
const logLines = [];
function log(msg) { console.log(msg); logLines.push(msg); }
function flushLog() {
  const header = `# ExpC: Layout Proportions Log\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`\n`;
  const footer = `\n\`\`\`\n`;
  fs.writeFileSync(
    path.resolve(__dirname, "expC-log.md"),
    header + logLines.join("\n") + footer
  );
}

// ── WebSocket helpers ──
async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  return Object.entries(ch).sort((a, b) => b[1] - a[1])[0][0];
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(t);
        if (d.message.error) {
          reject(new Error(JSON.stringify(d.message.error)));
        } else {
          resolve(d.message.result);
        }
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({
      id, type: "message", channel: ch,
      message: { id, command, params }
    }));
  });
}

// ── Figma primitives ──
async function getInfo(ws, ch, nodeId) {
  return cmd(ws, ch, "get_node_info", { nodeId });
}

async function createRect(ws, ch, pid, name, x, y, w, h, rad) {
  const r = await cmd(ws, ch, "create_rectangle", {
    name, x, y, width: w, height: h, parentId: pid
  });
  if (rad > 0) {
    await cmd(ws, ch, "set_corner_radius", { nodeId: r.id, radius: rad });
  }
  return r;
}

async function createEllipse(ws, ch, pid, name, x, y, w, h) {
  return cmd(ws, ch, "create_ellipse", {
    name, x, y, width: w, height: h, parentId: pid
  });
}

async function createFrame(ws, ch, pid, name, x, y, w, h) {
  const params = { name, x, y, width: w, height: h };
  if (pid) params.parentId = pid;
  return cmd(ws, ch, "create_frame", params);
}

async function createText(ws, ch, pid, name, x, y, content, sz, opts) {
  const params = {
    name, x, y, text: content, fontSize: sz,
    fontFamily: opts.fontFamily || FONT_UI,
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || C.textPri,
    parentId: pid,
  };
  if (opts.letterSpacing !== undefined) params.letterSpacing = opts.letterSpacing;
  return cmd(ws, ch, "create_text", params);
}

async function setFill(ws, ch, id, c, a) {
  await cmd(ws, ch, "set_fill_color", {
    nodeId: id, r: c.r, g: c.g, b: c.b, a: a !== undefined ? a : 1
  });
}

async function setGradient(ws, ch, id, type, stops, handles) {
  const p = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) p.gradientHandlePositions = handles;
  await cmd(ws, ch, "set_fill_gradient", p);
}

async function setStroke(ws, ch, id, c, weight) {
  await cmd(ws, ch, "set_stroke_color", {
    nodeId: id, color: { r: c.r, g: c.g, b: c.b, a: 1 }, weight: weight || 1
  });
}

async function noFill(ws, ch, id) {
  await setFill(ws, ch, id, C.black, 0);
}

async function moveNode(ws, ch, id, x, y) {
  await cmd(ws, ch, "move_node", { nodeId: id, x, y });
}

async function resizeNode(ws, ch, id, w, h) {
  await cmd(ws, ch, "resize_node", { nodeId: id, width: w, height: h });
}

// ── Measure text off-screen, read size, delete ──
async function measureText(ws, ch, pid, content, sz, opts) {
  const node = await createText(ws, ch, pid, "_measure", -9999, -9999, content, sz, opts);
  const info = await getInfo(ws, ch, node.id);
  const w = info.width || info.absoluteBoundingBox?.width || 0;
  const h = info.height || info.absoluteBoundingBox?.height || 0;
  await cmd(ws, ch, "delete_node", { nodeId: node.id });
  return { width: w, height: h };
}

// ── Create measured text (create, read actual size, return with measurements) ──
async function createMeasuredText(ws, ch, pid, name, x, y, content, sz, opts) {
  const node = await createText(ws, ch, pid, name, x, y, content, sz, opts);
  const info = await getInfo(ws, ch, node.id);
  const actual = {
    width: info.width || info.absoluteBoundingBox?.width || 0,
    height: info.height || info.absoluteBoundingBox?.height || 0,
  };
  return { ...node, measured: actual };
}

// ══════════════════════════════════════════════════════════════
// Layout constants from Flutter code analysis
// ══════════════════════════════════════════════════════════════
const SAFE_AREA_TOP = 54;        // iOS status bar height
const APP_BAR_H = 120;           // PreferredSize height from _buildDmHeader
const INPUT_AREA_H = 82;         // Measured from reference: input + bottom safe area
const SAFE_AREA_BOTTOM = 34;     // iOS home indicator area
const GLASS_BALL_SIZE = 52;      // Approximate from reference

// Derived layout zones
const HEADER_TOP = SAFE_AREA_TOP;
const HEADER_BOTTOM = SAFE_AREA_TOP + APP_BAR_H;  // 174
const MSG_AREA_TOP = HEADER_BOTTOM;
const INPUT_TOP = H - INPUT_AREA_H - SAFE_AREA_BOTTOM; // 852 - 82 - 34 = 736
const MSG_AREA_H = INPUT_TOP - MSG_AREA_TOP;  // 736 - 174 = 562

// ══════════════════════════════════════════════════════════════
// MESSAGE BUBBLE - No colored backgrounds, just text
// ══════════════════════════════════════════════════════════════
async function messageLine(ws, ch, pid, text, isOut, time, yPos, opts = {}) {
  const fontSize = 15;
  const textColor = isOut ? C.textOut : C.textIn;
  const dimColor = { r: textColor.r * 0.5, g: textColor.g * 0.5, b: textColor.b * 0.5 };

  // Measure text to know actual dimensions
  const textSize = await measureText(ws, ch, pid, text, fontSize, { color: textColor });

  // Position: incoming = left (16px), outgoing = right-aligned
  const textX = isOut ? (W - 16 - textSize.width) : 16;

  // Create message text
  await createText(ws, ch, pid, `msg_${time}`, textX, yPos, text, fontSize, {
    color: textColor,
    fontWeight: isOut ? 400 : 400,
  });

  // Time text below message
  const timeStr = time;
  const timeY = yPos + textSize.height + 1;

  if (isOut && opts.read) {
    // Right-aligned time + read receipt
    const fullTime = `${timeStr}  \u2713\u2713`;
    const timeSize = await measureText(ws, ch, pid, fullTime, 11, { color: C.success });
    await createText(ws, ch, pid, `tm_${time}`, W - 16 - timeSize.width, timeY, fullTime, 11, {
      color: C.success,
    });
  } else if (isOut) {
    const fullTime = `${timeStr}  \u2713`;
    const timeSize = await measureText(ws, ch, pid, fullTime, 11, { color: dimColor });
    await createText(ws, ch, pid, `tm_${time}`, W - 16 - timeSize.width, timeY, fullTime, 11, {
      color: dimColor,
    });
  } else {
    await createText(ws, ch, pid, `tm_${time}`, 16, timeY, timeStr, 11, {
      color: dimColor,
    });
  }

  // Total height consumed: text height + time height + spacing
  return textSize.height + 14 + 2; // 14px for time line, 2px extra
}

// ══════════════════════════════════════════════════════════════
// MAIN BUILD
// ══════════════════════════════════════════════════════════════
async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => {
    ws.addEventListener("open", r);
    ws.addEventListener("error", e);
  });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  log(`Connected to channel: ${ch}`);
  log(`\n=== Experiment C: Full-Screen Layout Proportions ===\n`);

  // ════════════════════════════════════════════════════════════
  // 1. PHONE FRAME with corner radius
  // ════════════════════════════════════════════════════════════
  const phone = await cmd(ws, ch, "create_frame", {
    name: "ExpC: Layout Proportions", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await setFill(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  log(`Phone frame: ${P} at (${FX}, ${FY}), ${W}x${H}, radius 50`);

  // Clip content to frame
  await cmd(ws, ch, "set_layout_mode", { nodeId: P, layoutMode: "NONE" });

  // ════════════════════════════════════════════════════════════
  // 2. STATUS BAR (top safe area, 0-54px)
  // ════════════════════════════════════════════════════════════
  log("\n--- Status Bar ---");

  // Dynamic Island
  const island = await createRect(ws, ch, P, "Island", (W - 126) / 2, 11, 126, 37, 20);
  await setFill(ws, ch, island.id, C.black, 1);

  // Time
  await createText(ws, ch, P, "Time", 30, 14, "3:14", 17, {
    fontWeight: 700, color: C.white
  });

  // Battery
  const batt = await createRect(ws, ch, P, "Batt", W - 39, 17, 27, 13, 4);
  await noFill(ws, ch, batt.id);
  await setStroke(ws, ch, batt.id, C.white, 1.5);
  const battF = await createRect(ws, ch, P, "BattF", W - 37, 19, 16, 9, 2);
  await setFill(ws, ch, battF.id, C.white, 0.7);

  log(`  Status bar: 0-${SAFE_AREA_TOP}px`);

  // ════════════════════════════════════════════════════════════
  // 3. DM HEADER (54-174px, PreferredSize 120px)
  //    From Flutter: SafeArea > Padding(h:8) > Stack
  //    - Back button at Alignment(-1, -0.4)
  //    - Call/Video buttons at Alignment(-0.52/0.52, -0.4)
  //    - Avatar at center, Alignment(0, -1) = top of 120px
  //    - Name below avatar with 14px overlap
  //    - Stack icon at Alignment(1, -0.4)
  // ════════════════════════════════════════════════════════════
  log("\n--- DM Header (120px) ---");
  const hY = SAFE_AREA_TOP;

  // Back chevron - left side, buttonRowY=-0.4 maps to ~36px in 120px
  const btnRowY = hY + Math.round(APP_BAR_H * (0.5 - 0.4 * 0.5)); // ~36 from header top
  await createText(ws, ch, P, "Back", 10, btnRowY - 4, "\u2039", 32, {
    fontWeight: 300, color: C.textPri
  });

  // Call button (stroke circle)
  const callBtnX = 52;
  const callBtn = await createRect(ws, ch, P, "CallBtn", callBtnX, btnRowY - 4, 40, 40, 20);
  await noFill(ws, ch, callBtn.id);
  await setStroke(ws, ch, callBtn.id, C.accent, 2.5);
  // Phone icon shapes
  const ph1 = await createRect(ws, ch, P, "Ph1", callBtnX + 15, btnRowY + 6, 10, 6, 3);
  await setFill(ws, ch, ph1.id, C.accent);
  const ph2 = await createRect(ws, ch, P, "Ph2", callBtnX + 18, btnRowY + 10, 4, 8, 1);
  await setFill(ws, ch, ph2.id, C.accent);
  const ph3 = await createRect(ws, ch, P, "Ph3", callBtnX + 15, btnRowY + 16, 10, 6, 3);
  await setFill(ws, ch, ph3.id, C.accent);

  // Video button (stroke circle) - right side
  const vidBtnX = W - 92;
  const vidBtn = await createRect(ws, ch, P, "VidBtn", vidBtnX, btnRowY - 4, 40, 40, 20);
  await noFill(ws, ch, vidBtn.id);
  await setStroke(ws, ch, vidBtn.id, C.accent, 2.5);
  const cam1 = await createRect(ws, ch, P, "Cam1", vidBtnX + 10, btnRowY + 8, 14, 12, 2);
  await setFill(ws, ch, cam1.id, C.accent);
  const cam2 = await createRect(ws, ch, P, "Cam2", vidBtnX + 25, btnRowY + 10, 6, 8, 1);
  await setFill(ws, ch, cam2.id, C.accent);

  // Stack icon (far right) - 4 dots grid
  const stackX = W - 42;
  await createText(ws, ch, P, "Stack", stackX, btnRowY + 2, "\u2022\u2022\u2022\u2022", 16, {
    fontWeight: 700, color: C.textPri, letterSpacing: -2
  });

  // Center avatar - avatarY=-1 means top of the 120px space (after SafeArea)
  const avSz = 54;
  const avCX = W / 2;
  const avCY = hY + 2; // Top-aligned in header

  // Glow behind avatar
  const glowSz = 89;
  const glow = await createRect(ws, ch, P, "AvGlow",
    avCX - glowSz / 2, avCY + avSz / 2 - glowSz / 2, glowSz, glowSz, glowSz / 2);
  await setGradient(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Avatar circle
  const av = await createRect(ws, ch, P, "Avatar",
    avCX - avSz / 2, avCY, avSz, avSz, avSz / 2);
  await setGradient(ws, ch, av.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await setStroke(ws, ch, av.id, { r: 0.08, g: 0.03, b: 0.12 }, 3);

  // Avatar initial
  const avInit = await createMeasuredText(ws, ch, P, "AvInit",
    avCX - 8, avCY + 12, "S", 22, { fontWeight: 700, color: C.white });
  const centeredInitX = avCX - avInit.measured.width / 2;
  const centeredInitY = avCY + avSz / 2 - avInit.measured.height / 2;
  await moveNode(ws, ch, avInit.id, centeredInitX, centeredInitY);

  // Online dot
  const onDot = await createRect(ws, ch, P, "OnlineDot",
    avCX + avSz / 2 - 10, avCY + avSz - 10, 12, 12, 6);
  await setFill(ws, ch, onDot.id, C.online, 1);
  await setStroke(ws, ch, onDot.id, C.bg, 2);

  // Display name - centered below avatar
  const nameNode = await createMeasuredText(ws, ch, P, "Name",
    avCX - 22, avCY + avSz - 8, "Saeed", 18, { fontWeight: 700, color: C.textPri });
  const centeredNameX = avCX - nameNode.measured.width / 2;
  await moveNode(ws, ch, nameNode.id, centeredNameX, avCY + avSz - 8);

  // "Today" badge - centered below name
  const todayBadgeY = avCY + avSz + 16;
  const todayNode = await createMeasuredText(ws, ch, P, "TodayTx",
    0, todayBadgeY + 3, "Today", 11, { color: C.accent, fontWeight: 500 });
  const todayW = todayNode.measured.width;
  const todayH = todayNode.measured.height;
  const badgePH = 10, badgePV = 3;
  const badgeW = todayW + badgePH * 2;
  const badgeH = todayH + badgePV * 2;
  const badgeX = avCX - badgeW / 2;
  const tBg = await createRect(ws, ch, P, "TodayBg", badgeX, todayBadgeY, badgeW, badgeH, 10);
  await setFill(ws, ch, tBg.id, C.accent, 0.15);
  await moveNode(ws, ch, todayNode.id, badgeX + badgePH, todayBadgeY + badgePV);

  log(`  Header zone: ${hY}-${HEADER_BOTTOM}px (${APP_BAR_H}px)`);
  log(`  Avatar at y=${avCY}, name below, today badge at y=${todayBadgeY}`);

  // ════════════════════════════════════════════════════════════
  // 4. MESSAGE AREA (Expanded - fills between header and input)
  //    From Flutter: ListView.builder(reverse:true) with padding:
  //    top: MediaQuery.padding.top + 115 + 16 = overlaps with header
  //    left/right/bottom: 16
  //    Messages grow FROM BOTTOM UP (reversed list)
  // ════════════════════════════════════════════════════════════
  log("\n--- Message Area ---");
  log(`  Message zone: ${MSG_AREA_TOP}-${INPUT_TOP}px (${MSG_AREA_H}px)`);
  log(`  Input zone: ${INPUT_TOP}-${H}px (${INPUT_AREA_H + SAFE_AREA_BOTTOM}px)`);

  // Messages data (same 9 messages)
  const msgs = [
    { t: "Good morning Mr. Stephano", o: false, time: "09:12" },
    { t: "Good morning Saeed!", o: true, time: "09:14", read: true },
    { t: "Were you still open to meeting?", o: false, time: "09:15" },
    { t: "Nah man, it wont work out.", o: true, time: "09:18", read: true },
    { t: "Come on bro, don't be like that.\nYou know I've been looking\nforward to this.", o: false, time: "09:20" },
    { t: "Something just came up man.\nIm sorry.", o: true, time: "09:22", read: true },
    { t: "I don't care what came up.", o: false, time: "09:25" },
    { t: "I know you were looking forward\nto it man. Im sorry.", o: true, time: "09:26", read: true },
    { t: "Stefano I actually hate you\nso much", o: false, time: "09:30" },
  ];

  // First pass: measure all messages to get total height
  log("\n  Measuring all messages...");
  const msgHeights = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const textSize = await measureText(ws, ch, P, m.t, 15, {
      color: m.o ? C.textOut : C.textIn
    });
    const totalH = textSize.height + 14 + 2; // text + time line + gap
    msgHeights.push(totalH);
    log(`  msg[${i}]: "${m.t.slice(0, 25)}..." h=${totalH.toFixed(1)}`);
  }

  // Calculate spacing between messages
  const msgSpacing = [];
  for (let i = 0; i < msgs.length; i++) {
    const prevSameAuthor = i > 0 && msgs[i - 1].o === msgs[i].o;
    msgSpacing.push(prevSameAuthor ? 2 : 8);
  }

  const totalMsgHeight = msgHeights.reduce((a, b) => a + b, 0) +
    msgSpacing.reduce((a, b) => a + b, 0);
  log(`  Total messages height: ${totalMsgHeight.toFixed(1)}px`);
  log(`  Available space: ${MSG_AREA_H}px`);
  log(`  Empty space below messages: ${(MSG_AREA_H - totalMsgHeight).toFixed(1)}px`);

  // Start messages from just below the today badge
  // In the reference, messages start right after the "Today" badge
  const msgStartY = todayBadgeY + badgeH + 8;
  let y = msgStartY;

  log("\n  Building messages...");
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    y += msgSpacing[i];

    // Safety: don't render past input area
    if (y > INPUT_TOP - 30) {
      log(`  WARN: Message ${i} would overflow input area at y=${y}`);
      break;
    }

    const h = await messageLine(ws, ch, P, m.t, m.o, m.time, y, { read: m.read });
    log(`  msg[${i}] placed at y=${y.toFixed(0)}, h=${h.toFixed(0)}`);
    y += h;
  }

  const lastMsgBottom = y;
  const emptyGap = INPUT_TOP - lastMsgBottom;
  log(`\n  Last message bottom: ${lastMsgBottom.toFixed(0)}px`);
  log(`  Gap to input area: ${emptyGap.toFixed(0)}px`);

  // ════════════════════════════════════════════════════════════
  // 5. INPUT AREA (bottom, frosted glass look from reference)
  //    From reference: light frosted glass area with rounded top
  //    Contains: glass ball (left), text field (center), send area
  //    Bottom safe area with home indicator
  // ════════════════════════════════════════════════════════════
  log("\n--- Input Area ---");

  // Frosted glass input background (light colored, from reference screenshot)
  const inputBgY = INPUT_TOP;
  const inputBgH = H - INPUT_TOP; // extends to bottom of screen
  const inputBg = await createRect(ws, ch, P, "InputBg",
    0, inputBgY, W, inputBgH, 0);
  // From the reference, the input area has a frosted light appearance
  await setFill(ws, ch, inputBg.id, C.glassBg, 0.85);
  // Rounded top corners only
  await cmd(ws, ch, "set_corner_radius", { nodeId: inputBg.id, radius: 28 });

  // Top border line (subtle)
  const borderLine = await createRect(ws, ch, P, "InputBorder",
    0, inputBgY, W, 0.5, 0);
  await setFill(ws, ch, borderLine.id, C.white, 0.15);

  // Text input field (centered in input area)
  const inputFieldY = inputBgY + 16;
  const inputFieldH = 44;
  const inputFieldX = 68; // After glass ball space
  const inputFieldW = W - inputFieldX - 16;
  const inputField = await createRect(ws, ch, P, "TextInput",
    inputFieldX, inputFieldY, inputFieldW, inputFieldH, 22);
  await setFill(ws, ch, inputField.id, C.white, 0.6);

  // Hint text
  await createText(ws, ch, P, "Hint", inputFieldX + 16, inputFieldY + 12,
    "Type with joy...", 16, { color: C.textMut });

  // Send/attachment indicator on right side of input
  await createText(ws, ch, P, "SendHint", W - 44, inputFieldY + 10,
    "\u{1F4CE}", 18, { color: C.textMut });

  log(`  Input area: y=${inputBgY}, h=${inputBgH}`);
  log(`  Text field: y=${inputFieldY}, h=${inputFieldH}`);

  // ════════════════════════════════════════════════════════════
  // 6. GLASS BALL (overlaps input area edge)
  //    From Flutter: positioned via Stack, overlaid on input area
  //    In reference: lavender/purple translucent sphere at left
  //    of input area, slightly overlapping the top edge
  // ════════════════════════════════════════════════════════════
  log("\n--- Glass Ball ---");

  const ballSize = GLASS_BALL_SIZE;
  const ballX = 10;
  const ballY = inputBgY - ballSize * 0.3; // Overlaps top of input area by 30%

  // Outer glow
  const ballGlowSz = ballSize * 1.5;
  const ballGlow = await createRect(ws, ch, P, "BallGlow",
    ballX - (ballGlowSz - ballSize) / 2,
    ballY - (ballGlowSz - ballSize) / 2,
    ballGlowSz, ballGlowSz, ballGlowSz / 2);
  await setGradient(ws, ch, ballGlow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.4, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.1, position: 0.6 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Glass ball body
  const ball = await createRect(ws, ch, P, "GlassBall",
    ballX, ballY, ballSize, ballSize, ballSize / 2);
  await setGradient(ws, ch, ball.id, "GRADIENT_LINEAR", [
    { r: 0.75, g: 0.65, b: 0.90, a: 0.8, position: 0 },
    { r: 0.55, g: 0.40, b: 0.80, a: 0.6, position: 0.5 },
    { r: 0.40, g: 0.25, b: 0.65, a: 0.7, position: 1 },
  ], [{ x: 0.3, y: 0 }, { x: 0.7, y: 1 }, { x: 1, y: 0 }]);
  await setStroke(ws, ch, ball.id, C.white, 1.5);

  // Highlight reflection on glass ball
  const hlSize = ballSize * 0.3;
  const hl = await createRect(ws, ch, P, "BallHL",
    ballX + ballSize * 0.2, ballY + ballSize * 0.15, hlSize, hlSize * 0.6, hlSize / 2);
  await setFill(ws, ch, hl.id, C.white, 0.4);

  log(`  Glass ball: x=${ballX}, y=${ballY}, size=${ballSize}`);
  log(`  Overlaps input area by ${(inputBgY - ballY).toFixed(0)}px`);

  // ════════════════════════════════════════════════════════════
  // 7. HOME INDICATOR
  // ════════════════════════════════════════════════════════════
  const homeInd = await createRect(ws, ch, P, "HomeIndicator",
    (W - 134) / 2, H - 8, 134, 5, 3);
  await setFill(ws, ch, homeInd.id, C.black, 0.3);

  // ════════════════════════════════════════════════════════════
  // 8. LAYOUT PROPORTION ANNOTATIONS (debug guides)
  //    Thin colored lines showing the layout zones
  // ════════════════════════════════════════════════════════════
  log("\n--- Layout Summary ---");
  log(`  Status bar:    0 - ${SAFE_AREA_TOP}px (${SAFE_AREA_TOP}px)`);
  log(`  DM Header:     ${SAFE_AREA_TOP} - ${HEADER_BOTTOM}px (${APP_BAR_H}px)`);
  log(`  Message area:  ${HEADER_BOTTOM} - ${INPUT_TOP}px (${MSG_AREA_H}px)`);
  log(`  Input area:    ${INPUT_TOP} - ${H - SAFE_AREA_BOTTOM}px (${INPUT_AREA_H}px)`);
  log(`  Safe bottom:   ${H - SAFE_AREA_BOTTOM} - ${H}px (${SAFE_AREA_BOTTOM}px)`);
  log(`  Header %:      ${((HEADER_BOTTOM / H) * 100).toFixed(1)}%`);
  log(`  Messages %:    ${((MSG_AREA_H / H) * 100).toFixed(1)}%`);
  log(`  Input+bottom %: ${(((H - INPUT_TOP) / H) * 100).toFixed(1)}%`);

  // ════════════════════════════════════════════════════════════
  // 9. EXPORT SCREENSHOT
  // ════════════════════════════════════════════════════════════
  log("\n--- Exporting Screenshot ---");
  try {
    const exportResult = await cmd(ws, ch, "export_node_as_image", {
      nodeId: P, format: "PNG", scale: 2
    });
    if (exportResult && exportResult.imageData) {
      const outPath = path.resolve(__dirname, "expC-result.png");
      fs.writeFileSync(outPath, Buffer.from(exportResult.imageData, "base64"));
      log(`Screenshot saved to: ${outPath}`);
    } else {
      log("WARN: Export returned no image data");
    }
  } catch (err) {
    log(`WARN: Export failed: ${err.message}`);
  }

  // Select the frame
  await cmd(ws, ch, "set_selections", { nodeIds: [P] });

  log(`\nDone! Frame: ${P} at (${FX}, ${FY})`);
  flushLog();

  ws.close();
  process.exit(0);
}

main().catch(e => {
  console.error("Fatal:", e.message);
  flushLog();
  process.exit(1);
});
