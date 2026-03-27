#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Experiment 2: Measure-and-Verify Loop
// Key innovation: create text → read back actual width/height →
// use REAL measurements for bubble sizing & alignment
// ══════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const FX = 15100, FY = 0;

const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 },
  bubbleOut: { r: 0.424, g: 0.173, b: 0.655 },
  bubbleIn:  { r: 0.165, g: 0.082, b: 0.271 },
  textOut:   { r: 1, g: 1, b: 1 },
  textIn:    { r: 0.941, g: 0.965, b: 0.988 },
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },
  accent:    { r: 0.729, g: 0.510, b: 0.929 },
  glow:      { r: 0.608, g: 0.435, b: 0.831 },
  success:   { r: 0.353, g: 0.620, b: 0.478 },
  online:    { r: 0.204, g: 0.827, b: 0.600 },
  shadow:    { r: 0.424, g: 0.173, b: 0.655 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
};

// ── Logging ──
const logLines = [];
function log(msg) {
  console.log(msg);
  logLines.push(msg);
}
function logMeasure(label, expected, actual) {
  const line = `  [measure] ${label}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`;
  console.log(line);
  logLines.push(line);
}
function flushLog() {
  const header = `# Exp2: Measure-Verify Log\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`\n`;
  const footer = `\n\`\`\`\n`;
  fs.writeFileSync(
    path.resolve(__dirname, "exp2-log.md"),
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

async function createText(ws, ch, pid, name, x, y, content, sz, opts) {
  const params = {
    name, x, y, text: content, fontSize: sz,
    fontFamily: opts.fontFamily || FONT_UI,
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || C.textPri,
    parentId: pid,
  };
  if (opts.letterSpacing !== undefined) {
    params.letterSpacing = opts.letterSpacing;
  }
  return cmd(ws, ch, "create_text", params);
}

async function setFill(ws, ch, id, c, a) {
  await cmd(ws, ch, "set_fill_color", { nodeId: id, r: c.r, g: c.g, b: c.b, a: a !== undefined ? a : 1 });
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

// ── MEASURE-AND-VERIFY: create text, read back actual size ──
async function createMeasuredText(ws, ch, pid, name, x, y, content, sz, opts) {
  const node = await createText(ws, ch, pid, name, x, y, content, sz, opts);
  // Read back actual dimensions from Figma
  const info = await getInfo(ws, ch, node.id);
  const actual = {
    width: info.width || info.absoluteBoundingBox?.width || 0,
    height: info.height || info.absoluteBoundingBox?.height || 0,
    x: info.x !== undefined ? info.x : (info.absoluteBoundingBox?.x || x),
    y: info.y !== undefined ? info.y : (info.absoluteBoundingBox?.y || y),
  };
  logMeasure(name, { x, y, text: content.slice(0, 30) }, actual);
  return { ...node, measured: actual };
}

// ── Measure text by creating off-screen, reading size, then deleting ──
async function measureText(ws, ch, pid, content, sz, opts) {
  // Create off-screen to measure
  const node = await createText(ws, ch, pid, "_measure", -9999, -9999, content, sz, opts);
  const info = await getInfo(ws, ch, node.id);
  const w = info.width || info.absoluteBoundingBox?.width || 0;
  const h = info.height || info.absoluteBoundingBox?.height || 0;
  // Delete the measurement node
  await cmd(ws, ch, "delete_node", { nodeId: node.id });
  return { width: w, height: h };
}

// ── BUBBLE with measure-verify ──
// Z-order fix: measure text off-screen, delete, create bubble bg first, then text on top
async function bubble(ws, ch, pid, text, isOut, time, yPos, opts) {
  const padH = 14, padV = 10;
  const fontSize = 15;
  const maxBubbleW = W * 0.75;
  const read = opts.read || false;

  log(`\n--- Bubble: "${text.slice(0, 35)}..." isOut=${isOut} time=${time} ---`);

  const textColor = isOut ? C.textOut : C.textIn;
  const dimC = { r: textColor.r * 0.6, g: textColor.g * 0.6, b: textColor.b * 0.6 };

  // Step 1: Measure all text elements off-screen
  const textSize = await measureText(ws, ch, pid, text, fontSize, { color: textColor });
  log(`  Text measured: w=${textSize.width.toFixed(1)} h=${textSize.height.toFixed(1)}`);

  const timeSize = await measureText(ws, ch, pid, time, 11, { color: dimC });
  log(`  Time measured: w=${timeSize.width.toFixed(1)}`);

  let readSize = { width: 0, height: 0 };
  if (isOut && read) {
    readSize = await measureText(ws, ch, pid, "\u2713\u2713", 10, { color: C.success });
    log(`  Read receipt measured: w=${readSize.width.toFixed(1)}`);
  }

  // Step 2: Calculate bubble size from ACTUAL measurements
  const readW = (isOut && read) ? readSize.width + 4 : 0;
  const contentW = Math.max(textSize.width, timeSize.width + readW);
  const bubbleW = Math.min(contentW + padH * 2, maxBubbleW);
  const bubbleH = padV + textSize.height + 3 + 11 + padV;
  log(`  Bubble calculated: w=${bubbleW.toFixed(1)} h=${bubbleH.toFixed(1)}`);

  // Step 3: Position bubble
  const bubbleX = isOut ? (W - 16 - bubbleW) : 16;
  const bgColor = isOut ? C.bubbleOut : C.bubbleIn;
  log(`  Bubble position: x=${bubbleX.toFixed(1)} y=${yPos}`);

  // Step 4: Create bubble background FIRST (bottom of z-stack)
  const bg = await createRect(ws, ch, pid, `bub_${time}`, bubbleX, yPos, bubbleW, bubbleH, 18);
  await setFill(ws, ch, bg.id, bgColor, 1);

  // Step 5: Create text elements ON TOP of bubble (after bg in z-order)
  const textX = bubbleX + padH;
  const textY = yPos + padV;
  const txtNode = await createText(ws, ch, pid, `txt_${time}`, textX, textY, text, fontSize, { color: textColor });
  log(`  Text placed at: x=${textX.toFixed(1)} y=${textY.toFixed(1)}`);

  // Step 6: Time text on top
  const timeX = bubbleX + padH;
  const timeY = yPos + padV + textSize.height + 3;
  await createText(ws, ch, pid, `tm_${time}`, timeX, timeY, time, 11, { color: dimC });

  // Step 7: Read receipt on top
  if (isOut && read) {
    await createText(ws, ch, pid, `rd_${time}`, timeX + timeSize.width + 4, timeY, "\u2713\u2713", 10, { color: C.success });
  }

  // Step 8: Verify final text position
  const txtInfo = await getInfo(ws, ch, txtNode.id);
  logMeasure(`VERIFY txt_${time}`, { x: textX, y: textY }, {
    x: txtInfo.x, y: txtInfo.y, w: txtInfo.width, h: txtInfo.height
  });

  return bubbleH;
}

// ══════════════════════════════════════════════════════════════
// MAIN
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
  log(`═══ Experiment 2: Measure-Verify Loop ═══\n`);

  // ── PHONE FRAME ──
  log("Creating phone frame...");
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Exp2: Measure-Verify", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await setFill(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });
  log(`Frame created: ${P} at (${FX}, ${FY})`);

  // ── DYNAMIC ISLAND ──
  const notch = await createRect(ws, ch, P, "Island", (W - 126) / 2, 11, 126, 37, 20);
  await setFill(ws, ch, notch.id, C.black, 1);
  log("Dynamic Island created");

  // ── STATUS BAR ──
  await createText(ws, ch, P, "Time", 30, 14, "3:14", 17, { fontWeight: 700, color: C.white });
  const batt = await createRect(ws, ch, P, "Batt", W - 39, 17, 27, 13, 4);
  await noFill(ws, ch, batt.id);
  await setStroke(ws, ch, batt.id, C.white, 1.5);
  const battF = await createRect(ws, ch, P, "BattF", W - 37, 19, 16, 9, 2);
  await setFill(ws, ch, battF.id, C.white, 0.7);
  log("Status bar created");

  // ── HEADER ──
  const hY = 59;

  // Back chevron
  await createText(ws, ch, P, "Back", 10, hY + 4, "\u2039", 32, { fontWeight: 300, color: C.textPri });

  // Call button (stroke circle + phone icon shapes)
  const callBtn = await createRect(ws, ch, P, "CallBtn", 52, hY + 4, 40, 40, 20);
  await noFill(ws, ch, callBtn.id);
  await setStroke(ws, ch, callBtn.id, C.accent, 2.5);
  const ph1 = await createRect(ws, ch, P, "Ph1", 67, hY + 14, 10, 6, 3);
  await setFill(ws, ch, ph1.id, C.accent);
  const ph2 = await createRect(ws, ch, P, "Ph2", 70, hY + 18, 4, 8, 1);
  await setFill(ws, ch, ph2.id, C.accent);
  const ph3 = await createRect(ws, ch, P, "Ph3", 67, hY + 24, 10, 6, 3);
  await setFill(ws, ch, ph3.id, C.accent);

  // Video button (stroke circle + cam icon shapes)
  const vidBtn = await createRect(ws, ch, P, "VidBtn", W - 92, hY + 4, 40, 40, 20);
  await noFill(ws, ch, vidBtn.id);
  await setStroke(ws, ch, vidBtn.id, C.accent, 2.5);
  const cam1 = await createRect(ws, ch, P, "Cam1", W - 82, hY + 16, 14, 12, 2);
  await setFill(ws, ch, cam1.id, C.accent);
  const cam2 = await createRect(ws, ch, P, "Cam2", W - 67, hY + 18, 6, 8, 1);
  await setFill(ws, ch, cam2.id, C.accent);
  log("Header buttons created");

  // Center avatar with glow
  const avCX = W / 2, avCY = hY + 26, avSz = 54;
  const glowSz = 89;
  const glow = await createRect(ws, ch, P, "AvGlow",
    avCX - glowSz / 2, avCY - glowSz / 2, glowSz, glowSz, glowSz / 2);
  await setGradient(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.55, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.25, position: 0.5 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  const av = await createRect(ws, ch, P, "Av",
    avCX - avSz / 2, avCY - avSz / 2, avSz, avSz, avSz / 2);
  await setGradient(ws, ch, av.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await setStroke(ws, ch, av.id, { r: 0.08, g: 0.03, b: 0.12 }, 3);

  // Avatar initial - measure and center
  const avInitial = await createMeasuredText(
    ws, ch, P, "AvI", avCX - 8, avCY - 11, "S", 22, { fontWeight: 700, color: C.white }
  );
  // Center the initial based on measured width
  const centeredInitialX = avCX - avInitial.measured.width / 2;
  const centeredInitialY = avCY - avInitial.measured.height / 2;
  await moveNode(ws, ch, avInitial.id, centeredInitialX, centeredInitialY);
  log(`  Avatar initial centered: x=${centeredInitialX.toFixed(1)}`);

  // Online dot
  const onDot = await createRect(ws, ch, P, "On",
    avCX + avSz / 2 - 10, avCY + avSz / 2 - 10, 12, 12, 6);
  await setFill(ws, ch, onDot.id, C.online, 1);
  await setStroke(ws, ch, onDot.id, C.bg, 2);

  // Name - measure and center
  const nameNode = await createMeasuredText(
    ws, ch, P, "Name", avCX - 22, avCY + avSz / 2 + 6, "Saeed", 18,
    { fontWeight: 700, color: C.textPri }
  );
  const centeredNameX = avCX - nameNode.measured.width / 2;
  await moveNode(ws, ch, nameNode.id, centeredNameX, avCY + avSz / 2 + 6);
  log(`  Name centered: x=${centeredNameX.toFixed(1)} (measured w=${nameNode.measured.width.toFixed(1)})`);

  // "Today" badge - measure and center
  const tY = avCY + avSz / 2 + 30;
  const todayNode = await createMeasuredText(
    ws, ch, P, "TTx", 0, tY + 3, "Today", 11, { color: C.accent, fontWeight: 500 }
  );
  const todayW = todayNode.measured.width;
  const todayH = todayNode.measured.height;
  const badgePadH = 10, badgePadV = 3;
  const badgeW = todayW + badgePadH * 2;
  const badgeH = todayH + badgePadV * 2;
  const badgeX = avCX - badgeW / 2;
  const tBg = await createRect(ws, ch, P, "TBg", badgeX, tY, badgeW, badgeH, 10);
  await setFill(ws, ch, tBg.id, C.accent, 0.15);
  await moveNode(ws, ch, todayNode.id, badgeX + badgePadH, tY + badgePadV);
  log(`  Today badge: w=${badgeW.toFixed(1)} centered at x=${badgeX.toFixed(1)}`);
  log("Header complete");

  // ── MESSAGES WITH MEASURE-VERIFY ──
  let y = tY + badgeH + 8;
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

  const inputAreaTop = H - 82;
  log("\n═══ Building messages with measure-verify ═══");

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const prevSame = i > 0 && msgs[i - 1].o === m.o;
    y += prevSame ? 2 : 6;
    if (y > inputAreaTop - 50) {
      log(`  WARN: Ran out of space at message ${i}, y=${y}`);
      break;
    }
    const h = await bubble(ws, ch, P, m.t, m.o, m.time, y, { read: m.read });
    y += h;
    log(`  Message ${i + 1} done. Next y=${y.toFixed(1)}`);
  }

  // ── INPUT AREA ──
  log("\n═══ Building input area ═══");
  const inputY = inputAreaTop;

  // Camera/snap button (stroke circle)
  const snapBtn = await createRect(ws, ch, P, "SnapBtn", 12, inputY + 10, 44, 44, 22);
  await noFill(ws, ch, snapBtn.id);
  await setStroke(ws, ch, snapBtn.id, C.accent, 2.5);
  // Camera lens inside
  const lens = await createRect(ws, ch, P, "Lens", 26, inputY + 24, 16, 16, 8);
  await noFill(ws, ch, lens.id);
  await setStroke(ws, ch, lens.id, C.accent, 2);
  const flash = await createRect(ws, ch, P, "Flash", 30, inputY + 18, 8, 5, 2);
  await noFill(ws, ch, flash.id);
  await setStroke(ws, ch, flash.id, C.accent, 1.5);

  // Text input field
  const inputField = await createRect(ws, ch, P, "Input", 64, inputY + 10, W - 64 - 56, 44, 24);
  await setFill(ws, ch, inputField.id, C.inputBg, 1);
  const hintNode = await createMeasuredText(
    ws, ch, P, "Hint", 80, inputY + 22, "Type with joy...", 16, { color: C.textMut }
  );
  log(`  Input hint measured: w=${hintNode.measured.width.toFixed(1)}`);

  // Attachment icon
  const attLine = await createRect(ws, ch, P, "Att1", W - 40, inputY + 22, 3, 18, 1.5);
  await setFill(ws, ch, attLine.id, C.textMut, 0.7);
  const attTop = await createRect(ws, ch, P, "Att2", W - 44, inputY + 19, 10, 8, 5);
  await noFill(ws, ch, attTop.id);
  await setStroke(ws, ch, attTop.id, C.textMut, 1.5);

  // Home indicator
  const ind = await createRect(ws, ch, P, "HI", (W - 134) / 2, H - 8, 134, 5, 3);
  await setFill(ws, ch, ind.id, C.white, 0.22);
  log("Input area complete");

  // ── EXPORT SCREENSHOT ──
  log("\n═══ Exporting screenshot ═══");
  try {
    const exportResult = await cmd(ws, ch, "export_node_as_image", {
      nodeId: P, format: "PNG", scale: 2
    });
    if (exportResult && exportResult.imageData) {
      const outPath = path.resolve(__dirname, "exp2-result.png");
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
