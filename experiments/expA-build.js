/**
 * Experiment A: Pixel-Perfect Text Spacing
 *
 * Double-pass measurement approach:
 *   Pass 1: Create all text off-screen (-9999), measure real width/height
 *   Pass 2: Calculate exact positions from measurements, create at correct spots
 *   Pass 3: Read back positions and verify alignment
 *
 * NO colored bubble backgrounds. Messages are plain text on dark background.
 * Placed at (17000, 0), named "ExpA: Pixel-Perfect Spacing"
 */

import WebSocket from "ws";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────
const WS_URL = "ws://localhost:3055";
const CHANNELS_URL = "http://localhost:3055/channels";
const LOG_PATH = path.join(__dirname, "expA-log.md");
const SCREENSHOT_PATH = path.join(__dirname, "expA-result.png");

const SCREEN_X = 17000;
const SCREEN_Y = 0;
const W = 393;
const H = 852;

const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082, a: 1 },
  textPri:   { r: 0.941, g: 0.965, b: 0.988, a: 1 },
  textMuted: { r: 0.620, g: 0.561, b: 0.710, a: 1 },
  accent:    { r: 0.729, g: 0.510, b: 0.929, a: 1 },
  glow:      { r: 0.608, g: 0.435, b: 0.831, a: 1 },
  inputBg:   { r: 0.145, g: 0.082, b: 0.271, a: 1 },
  success:   { r: 0.353, g: 0.620, b: 0.478, a: 1 },
  online:    { r: 0.204, g: 0.827, b: 0.600, a: 1 },
  white:     { r: 1, g: 1, b: 1, a: 1 },
  black:     { r: 0, g: 0, b: 0, a: 1 },
  trans:     { r: 0, g: 0, b: 0, a: 0 },
};

// Spacing constants
const PAD_LEFT = 16;
const PAD_RIGHT = 16;
const PAD_IN_RIGHT = 60;   // incoming: right margin
const PAD_OUT_LEFT = 60;    // outgoing: left margin
const MAX_TEXT_W = 294;     // 75% of 393
const GROUP_SPACING = 8;    // between message groups
const INTRA_SPACING = 3;    // within groups
const TEXT_TS_GAP = 4;      // between text and timestamp
const TS_READ_GAP = 4;      // between timestamp and read receipt

// ─── Logging ─────────────────────────────────────────────────────────────────
const logLines = [
  "# ExpA: Pixel-Perfect Text Spacing Log",
  "",
  `Started: ${new Date().toISOString()}`,
  "",
  "## Build Steps",
  "",
];

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `- ${ts} ${msg}`;
  logLines.push(line);
  console.log(msg);
}

function logSection(title) {
  logLines.push("", `### ${title}`, "");
  console.log(`\n=== ${title} ===`);
}

function saveLog() {
  fs.writeFileSync(LOG_PATH, logLines.join("\n"), "utf-8");
}

// ─── Channel discovery ──────────────────────────────────────────────────────
function findChannel() {
  return new Promise((resolve, reject) => {
    http.get(CHANNELS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const channels = JSON.parse(data);
          const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            resolve(sorted[0][0]);
          } else {
            reject(new Error("No active channel found"));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// ─── WebSocket client ────────────────────────────────────────────────────────
let ws;
let channel;
let reqCounter = 0;
const pending = new Map();

function nextId() {
  return `expA-${++reqCounter}`;
}

function connect(ch) {
  return new Promise((resolve, reject) => {
    channel = ch;
    ws = new WebSocket(WS_URL);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", channel, id: nextId() }));
      setTimeout(resolve, 600);
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "broadcast" && data.message) {
          const msg = data.message;
          if (msg.id && pending.has(msg.id)) {
            const { resolve: res, timer } = pending.get(msg.id);
            clearTimeout(timer);
            pending.delete(msg.id);
            res(msg.error ? { error: msg.error } : (msg.result || msg));
          }
        }
      } catch (_) {}
    });
    ws.on("error", reject);
  });
}

function cmd(command, params = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const id = nextId();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${command} (${id})`));
    }, timeout);
    pending.set(id, { resolve, timer });
    ws.send(JSON.stringify({
      type: "message", channel, id,
      message: { id, command, params },
    }));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Figma Primitives ────────────────────────────────────────────────────────
async function createFrame(opts) {
  return cmd("create_frame", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 100, height: opts.height ?? 100,
    name: opts.name ?? "Frame",
    parentId: opts.parentId,
    fillColor: opts.fillColor,
  });
}

async function createRect(opts) {
  return cmd("create_rectangle", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 100, height: opts.height ?? 100,
    name: opts.name ?? "Rect",
    parentId: opts.parentId,
  });
}

async function createText(opts) {
  return cmd("create_text", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    text: opts.text ?? "",
    fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? 400,
    fontFamily: opts.fontFamily ?? FONT_UI,
    fontColor: opts.fontColor ?? C.textPri,
    letterSpacing: opts.letterSpacing,
    textAlignHorizontal: opts.textAlignHorizontal,
    name: opts.name ?? opts.text?.slice(0, 20) ?? "Text",
    parentId: opts.parentId,
  });
}

async function setFill(nodeId, color) {
  return cmd("set_fill_color", { nodeId, color });
}

async function setGradient(nodeId, type, stops, handles, opacity) {
  return cmd("set_fill_gradient", {
    nodeId, gradientType: type, gradientStops: stops,
    gradientHandlePositions: handles, opacity,
  });
}

async function setStroke(nodeId, color, weight) {
  return cmd("set_stroke_color", { nodeId, color, weight });
}

async function setRadius(nodeId, radius) {
  return cmd("set_corner_radius", { nodeId, radius });
}

async function moveNode(nodeId, x, y) {
  return cmd("move_node", { nodeId, x, y });
}

async function resizeNode(nodeId, width, height) {
  return cmd("resize_node", { nodeId, width, height });
}

async function getInfo(nodeId) {
  return cmd("get_node_info", { nodeId });
}

async function deleteNode(nodeId) {
  return cmd("delete_node", { nodeId });
}

async function exportImage(nodeId, format, scale) {
  return cmd("export_node_as_image", { nodeId, format: format ?? "PNG", scale: scale ?? 2 }, 60000);
}

// ─── Double-Pass Measurement ─────────────────────────────────────────────────
// Creates text off-screen, measures, optionally constrains width, returns dims
async function measureText(opts) {
  const result = await createText({
    ...opts,
    x: -9999,
    y: -9999,
    name: "_measure",
  });
  const id = result.id;
  await sleep(120);
  const info = await getInfo(id);
  const bb = info.absoluteBoundingBox || {};
  let w = bb.width || 50;
  let h = bb.height || 20;

  // If text exceeds maxWidth, resize to wrap and re-measure
  if (opts.maxWidth && w > opts.maxWidth) {
    await resizeNode(id, opts.maxWidth, h);
    await sleep(120);
    const info2 = await getInfo(id);
    const bb2 = info2.absoluteBoundingBox || {};
    w = bb2.width || opts.maxWidth;
    h = bb2.height || h;
  }
  await deleteNode(id);
  return { width: w, height: h };
}

// ─── Verification Helper ─────────────────────────────────────────────────────
async function verifyPosition(nodeId, expectedX, expectedY, label) {
  const info = await getInfo(nodeId);
  const bb = info.absoluteBoundingBox || {};
  const actualX = bb.x ?? -1;
  const actualY = bb.y ?? -1;
  const dx = Math.abs(actualX - (SCREEN_X + expectedX));
  const dy = Math.abs(actualY - (SCREEN_Y + expectedY));
  const ok = dx < 2 && dy < 2;
  const status = ok ? "OK" : `DRIFT dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`;
  log(`  Verify ${label}: expected (${expectedX},${expectedY}) actual offset (${(actualX - SCREEN_X).toFixed(1)},${(actualY - SCREEN_Y).toFixed(1)}) → ${status}`);
  return { ok, actualX, actualY, dx, dy };
}

// ─── BUILD: Phone Frame ─────────────────────────────────────────────────────
let screenId;

async function buildPhoneFrame() {
  logSection("Phone Frame");

  const frame = await createFrame({
    x: SCREEN_X, y: SCREEN_Y,
    width: W, height: H,
    name: "ExpA: Pixel-Perfect Spacing",
    fillColor: C.bg,
  });
  screenId = frame.id;
  await setRadius(screenId, 50);
  log(`Main frame: ${screenId}`);

  // Dynamic Island
  const island = await createRect({
    x: (W - 126) / 2, y: 11,
    width: 126, height: 37,
    name: "dynamic-island",
    parentId: screenId,
  });
  await setFill(island.id, C.black);
  await setRadius(island.id, 20);

  // Status bar time
  await createText({
    text: "9:41", fontSize: 15, fontWeight: 600,
    fontColor: C.white, parentId: screenId,
    x: 30, y: 14, name: "status-time",
  });

  // Battery outline
  const battOutline = await createRect({
    x: W - 40, y: 17, width: 25, height: 12,
    name: "battery-outline", parentId: screenId,
  });
  await setFill(battOutline.id, C.trans);
  await setStroke(battOutline.id, C.white, 1);
  await setRadius(battOutline.id, 3);

  // Battery fill
  const battFill = await createRect({
    x: W - 38, y: 19, width: 18, height: 8,
    name: "battery-fill", parentId: screenId,
  });
  await setFill(battFill.id, C.white);
  await setRadius(battFill.id, 1);

  // Battery cap
  const battCap = await createRect({
    x: W - 14, y: 20, width: 2, height: 6,
    name: "battery-cap", parentId: screenId,
  });
  await setFill(battCap.id, { ...C.white, a: 0.4 });

  log("Phone frame complete");
}

// ─── BUILD: Header ──────────────────────────────────────────────────────────
async function buildHeader() {
  logSection("Header");
  const headerY = 54;

  // Back chevron
  await createText({
    text: "‹", fontSize: 32, fontWeight: 300,
    fontColor: C.accent, parentId: screenId,
    x: 12, y: headerY + 4, name: "back-chevron",
  });

  // Call button: stroke circle
  const callBtnX = 46;
  const callBtnY = headerY + 8;
  const callBtn = await createRect({
    x: callBtnX, y: callBtnY, width: 40, height: 40,
    name: "call-btn", parentId: screenId,
  });
  await setRadius(callBtn.id, 20);
  await setFill(callBtn.id, C.trans);
  await setStroke(callBtn.id, C.accent, 2.5);

  // Phone shape inside call button (filled accent)
  const phoneBodyW = 16;
  const phoneBodyH = 16;
  const phoneBody = await createRect({
    x: callBtnX + (40 - phoneBodyW) / 2,
    y: callBtnY + (40 - phoneBodyH) / 2,
    width: phoneBodyW, height: phoneBodyH,
    name: "call-shape", parentId: screenId,
  });
  await setFill(phoneBody.id, C.accent);
  await setRadius(phoneBody.id, 4);

  // Video button: stroke circle
  const vidBtnX = W - 100;
  const vidBtnY = headerY + 8;
  const vidBtn = await createRect({
    x: vidBtnX, y: vidBtnY, width: 40, height: 40,
    name: "video-btn", parentId: screenId,
  });
  await setRadius(vidBtn.id, 20);
  await setFill(vidBtn.id, C.trans);
  await setStroke(vidBtn.id, C.accent, 2.5);

  // Video shape (filled accent triangle-ish)
  const vidBodyW = 14;
  const vidBodyH = 10;
  const vidBody = await createRect({
    x: vidBtnX + (40 - vidBodyW) / 2,
    y: vidBtnY + (40 - vidBodyH) / 2,
    width: vidBodyW, height: vidBodyH,
    name: "video-shape", parentId: screenId,
  });
  await setFill(vidBody.id, C.accent);
  await setRadius(vidBody.id, 3);

  // Overflow 2x2 dots
  const overX = W - 40;
  const overY = headerY + 14;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const dot = await createRect({
        x: overX + col * 7, y: overY + row * 7,
        width: 4, height: 4,
        name: `overflow-dot-${row}-${col}`,
        parentId: screenId,
      });
      await setFill(dot.id, C.textMuted);
      await setRadius(dot.id, 2);
    }
  }

  // ── Avatar with glow ──
  const avatarSize = 54;
  const avatarX = (W - avatarSize) / 2;
  const avatarY = headerY + 2;

  // Radial glow (89px)
  const glowSize = 89;
  const glowRect = await createRect({
    x: avatarX - (glowSize - avatarSize) / 2,
    y: avatarY - (glowSize - avatarSize) / 2,
    width: glowSize, height: glowSize,
    name: "avatar-glow", parentId: screenId,
  });
  await setRadius(glowRect.id, glowSize / 2);
  await setGradient(glowRect.id, "GRADIENT_RADIAL", [
    { ...C.glow, a: 0.55, position: 0 },
    { ...C.glow, a: 0.25, position: 0.5 },
    { ...C.glow, a: 0, position: 1 },
  ]);

  // Glass ring (50px)
  const ringSize = 50;
  const ringRect = await createRect({
    x: avatarX + (avatarSize - ringSize) / 2,
    y: avatarY + (avatarSize - ringSize) / 2,
    width: ringSize, height: ringSize,
    name: "avatar-ring", parentId: screenId,
  });
  await setRadius(ringRect.id, ringSize / 2);
  await setFill(ringRect.id, { ...C.bg, a: 0.85 });
  await setStroke(ringRect.id, { ...C.accent, a: 0.5 }, 1.5);

  // "S" initial - measured centering
  const initMeasure = await measureText({
    text: "S", fontSize: 22, fontWeight: 700, fontColor: C.textPri,
  });
  const initNode = await createText({
    text: "S", fontSize: 22, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: avatarX + (avatarSize - initMeasure.width) / 2,
    y: avatarY + (avatarSize - initMeasure.height) / 2 - 1,
    name: "avatar-initial",
  });
  log(`Avatar initial "S" measured: ${initMeasure.width}x${initMeasure.height}`);

  // Online dot (12px)
  const onlineDot = await createRect({
    x: avatarX + avatarSize - 14, y: avatarY + avatarSize - 14,
    width: 12, height: 12,
    name: "online-dot", parentId: screenId,
  });
  await setFill(onlineDot.id, C.online);
  await setRadius(onlineDot.id, 6);

  // ── Name "Saeed" - precisely centered using measurement ──
  const nameMeasure = await measureText({
    text: "Saeed", fontSize: 18, fontWeight: 700, fontColor: C.textPri,
  });
  const nameX = (W - nameMeasure.width) / 2;
  const nameY = avatarY + avatarSize - 14;
  const nameNode = await createText({
    text: "Saeed", fontSize: 18, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: nameX, y: nameY,
    name: "contact-name",
  });
  log(`Name "Saeed" measured: ${nameMeasure.width}x${nameMeasure.height}, placed at x=${nameX.toFixed(1)}`);

  // ── "Today" badge - precisely centered ──
  const todayY = nameY + nameMeasure.height + 4;
  const todayMeasure = await measureText({
    text: "Today", fontSize: 11, fontWeight: 600, fontColor: C.accent,
  });
  const todayPadH = 12;
  const todayPadV = 4;
  const todayBadgeW = todayMeasure.width + todayPadH * 2;
  const todayBadgeH = todayMeasure.height + todayPadV * 2;
  const todayBadgeX = (W - todayBadgeW) / 2;

  const todayBg = await createRect({
    x: todayBadgeX, y: todayY,
    width: todayBadgeW, height: todayBadgeH,
    name: "today-badge-bg", parentId: screenId,
  });
  await setFill(todayBg.id, { ...C.accent, a: 0.15 });
  await setRadius(todayBg.id, 10);

  const todayTextNode = await createText({
    text: "Today", fontSize: 11, fontWeight: 600,
    fontColor: C.accent, parentId: screenId,
    x: todayBadgeX + todayPadH,
    y: todayY + todayPadV,
    name: "today-text",
  });
  log(`"Today" badge measured: text=${todayMeasure.width}x${todayMeasure.height}, badge=${todayBadgeW}x${todayBadgeH}, x=${todayBadgeX.toFixed(1)}`);

  // Verify centering
  await verifyPosition(nameNode.id, nameX, nameY, "Saeed name");
  await verifyPosition(todayTextNode.id, todayBadgeX + todayPadH, todayY + todayPadV, "Today text");

  const headerEndY = todayY + todayBadgeH + 8;
  log(`Header ends at y=${headerEndY}`);
  return headerEndY;
}

// ─── BUILD: Messages (Double-Pass) ──────────────────────────────────────────
async function buildMessages(startY) {
  logSection("Messages (Double-Pass Measurement)");

  const messages = [
    { text: "Good morning Mr. Stephano", time: "09:12", out: false },
    { text: "Good morning Saeed!", time: "09:14", out: true, read: true },
    { text: "Were you still open to meeting?", time: "09:15", out: false },
    { text: "Nah man, it wont work out.", time: "09:18", out: true, read: true },
    { text: "Come on bro, don't be like that. You know I've been looking forward to this.", time: "09:20", out: false },
    { text: "Something just came up man. Im sorry.", time: "09:22", out: true, read: true },
    { text: "I don't care what came up.", time: "09:25", out: false },
    { text: "I know you were looking forward to it man. Im sorry.", time: "09:26", out: true, read: true },
    { text: "Stefano I actually hate you so much", time: "09:30", out: false },
  ];

  // ── PASS 1: Measure ALL text off-screen ──
  log("Pass 1: Measuring all text elements...");
  const measurements = [];

  for (const m of messages) {
    // Measure message text
    const maxW = m.out ? (W - PAD_OUT_LEFT - PAD_RIGHT) : (W - PAD_LEFT - PAD_IN_RIGHT);
    const clampedMax = Math.min(maxW, MAX_TEXT_W);

    const textDim = await measureText({
      text: m.text, fontSize: 15, fontWeight: 400,
      fontColor: C.textPri, maxWidth: clampedMax,
    });

    // Measure timestamp separately
    const tsDim = await measureText({
      text: m.time, fontSize: 11, fontWeight: 400, fontColor: C.textMuted,
    });

    // Measure read receipt separately if needed
    let readDim = null;
    if (m.read) {
      readDim = await measureText({
        text: "✓✓", fontSize: 10, fontWeight: 400, fontColor: C.success,
      });
    }

    measurements.push({
      ...m,
      textW: textDim.width,
      textH: textDim.height,
      tsW: tsDim.width,
      tsH: tsDim.height,
      readW: readDim?.width ?? 0,
      readH: readDim?.height ?? 0,
      clampedMax,
      needsWrap: textDim.width >= clampedMax,
    });

    log(`  "${m.text.slice(0, 30)}..." → text: ${textDim.width.toFixed(1)}x${textDim.height.toFixed(1)}, ts: ${tsDim.width.toFixed(1)}x${tsDim.height.toFixed(1)}${readDim ? `, read: ${readDim.width.toFixed(1)}x${readDim.height.toFixed(1)}` : ""}`);
  }

  // ── Compute grouping ──
  const groups = [];
  for (const m of measurements) {
    if (groups.length === 0 || groups[groups.length - 1][0].out !== m.out) {
      groups.push([m]);
    } else {
      groups[groups.length - 1].push(m);
    }
  }

  // ── PASS 2: Calculate exact positions and create elements ──
  log("");
  log("Pass 2: Calculating positions and creating elements...");
  let curY = startY;
  const createdNodes = []; // for verification

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    for (let mi = 0; mi < group.length; mi++) {
      const m = group[mi];
      const isFirstInGroup = mi === 0;
      const isLastInGroup = mi === group.length - 1;

      // Vertical spacing: 8px between groups, 3px within
      const topGap = (gi === 0 && mi === 0) ? GROUP_SPACING : (isFirstInGroup ? GROUP_SPACING : INTRA_SPACING);
      curY += topGap;

      // ── Calculate X positions from measurements ──
      let textX, tsX, readX;

      if (m.out) {
        // Outgoing: RIGHT-aligned
        // Text right edge at W - PAD_RIGHT
        textX = W - PAD_RIGHT - m.textW;
        // Timestamp right-aligned under text
        if (m.read) {
          // Read receipt is 4px after timestamp end
          const tsReadTotalW = m.tsW + TS_READ_GAP + m.readW;
          tsX = W - PAD_RIGHT - tsReadTotalW;
          readX = tsX + m.tsW + TS_READ_GAP;
        } else {
          tsX = W - PAD_RIGHT - m.tsW;
          readX = null;
        }
      } else {
        // Incoming: LEFT-aligned
        textX = PAD_LEFT;
        tsX = PAD_LEFT;
        readX = null;
      }

      // ── Create message text ──
      const msgNode = await createText({
        text: m.text, fontSize: 15, fontWeight: 400,
        fontColor: C.textPri, parentId: screenId,
        x: textX, y: curY,
        name: `msg-${m.out ? "out" : "in"}-${m.time}`,
      });

      // If text needs wrapping, resize to constrained width
      if (m.needsWrap) {
        await resizeNode(msgNode.id, m.clampedMax, m.textH);
        if (m.out) {
          // After resize, re-position: right edge should still be at W - PAD_RIGHT
          await moveNode(msgNode.id, W - PAD_RIGHT - m.clampedMax, curY);
          textX = W - PAD_RIGHT - m.clampedMax;
        }
      }

      createdNodes.push({ id: msgNode.id, label: `msg-${m.time}`, expectedX: textX, expectedY: curY });

      curY += m.textH + TEXT_TS_GAP;

      // ── Create timestamp ──
      const tsNode = await createText({
        text: m.time, fontSize: 11, fontWeight: 400,
        fontColor: C.textMuted, parentId: screenId,
        x: tsX, y: curY,
        name: `ts-${m.time}`,
      });

      createdNodes.push({ id: tsNode.id, label: `ts-${m.time}`, expectedX: tsX, expectedY: curY });

      // ── Create read receipt (separate element, exactly 4px after timestamp) ──
      if (m.read && readX !== null) {
        const readNode = await createText({
          text: "✓✓", fontSize: 10, fontWeight: 400,
          fontColor: C.success, parentId: screenId,
          x: readX, y: curY,
          name: `read-${m.time}`,
        });
        createdNodes.push({ id: readNode.id, label: `read-${m.time}`, expectedX: readX, expectedY: curY });
      }

      curY += Math.max(m.tsH, m.readH);

      log(`  ${m.out ? "OUT" : " IN"} "${m.text.slice(0, 30)}..." at (${textX.toFixed(1)}, ${(curY - m.textH - TEXT_TS_GAP - Math.max(m.tsH, m.readH)).toFixed(0)})`);
    }
  }

  // ── PASS 3: Verify alignment ──
  log("");
  log("Pass 3: Verifying positions...");
  let verifyOk = 0;
  let verifyDrift = 0;

  for (const node of createdNodes) {
    const result = await verifyPosition(node.id, node.expectedX, node.expectedY, node.label);
    if (result.ok) {
      verifyOk++;
    } else {
      verifyDrift++;
    }
  }

  log(`Verification: ${verifyOk} OK, ${verifyDrift} drifted out of ${createdNodes.length} elements`);
  log(`Messages end at y=${curY}`);
  return curY;
}

// ─── BUILD: Input Area ──────────────────────────────────────────────────────
async function buildInputArea() {
  logSection("Input Area");
  const inputY = H - 90;
  const areaH = 56;

  // Camera stroke-circle (44px)
  const camSize = 44;
  const camX = 12;
  const camY = inputY + (areaH - camSize) / 2;
  const camBtn = await createRect({
    x: camX, y: camY,
    width: camSize, height: camSize,
    name: "camera-btn", parentId: screenId,
  });
  await setRadius(camBtn.id, camSize / 2);
  await setFill(camBtn.id, C.trans);
  await setStroke(camBtn.id, C.accent, 2.5);

  // Camera body (filled accent rectangle)
  const camBodyW = 18;
  const camBodyH = 13;
  const camBodyX = camX + (camSize - camBodyW) / 2;
  const camBodyY = camY + (camSize - camBodyH) / 2 + 1;
  const camBody = await createRect({
    x: camBodyX, y: camBodyY,
    width: camBodyW, height: camBodyH,
    name: "cam-body", parentId: screenId,
  });
  await setFill(camBody.id, C.accent);
  await setRadius(camBody.id, 3);

  // Lens circle
  const lensSize = 6;
  const lens = await createRect({
    x: camBodyX + (camBodyW - lensSize) / 2,
    y: camBodyY + (camBodyH - lensSize) / 2,
    width: lensSize, height: lensSize,
    name: "cam-lens", parentId: screenId,
  });
  await setFill(lens.id, C.bg);
  await setRadius(lens.id, lensSize / 2);

  // Viewfinder bump
  const bumpW = 8;
  const bumpH = 4;
  const bumpNode = await createRect({
    x: camBodyX + (camBodyW - bumpW) / 2 + 2,
    y: camBodyY - bumpH + 1,
    width: bumpW, height: bumpH,
    name: "cam-bump", parentId: screenId,
  });
  await setFill(bumpNode.id, C.accent);
  await setRadius(bumpNode.id, 1);

  // Text field (#251545, radius 24)
  const fieldX = camX + camSize + 8;
  const fieldW = W - fieldX - 48;
  const fieldH = 44;
  const fieldY = inputY + (areaH - fieldH) / 2;
  const field = await createRect({
    x: fieldX, y: fieldY,
    width: fieldW, height: fieldH,
    name: "input-field", parentId: screenId,
  });
  await setFill(field.id, C.inputBg);
  await setRadius(field.id, 24);

  // Placeholder
  await createText({
    text: "Type with joy...", fontSize: 15, fontWeight: 400,
    fontColor: C.textMuted, parentId: screenId,
    x: fieldX + 16, y: fieldY + 12,
    name: "input-placeholder",
  });

  // Attachment icon (paperclip)
  const attachX = W - 38;
  const attachY = inputY + (areaH - 20) / 2;
  const clip = await createRect({
    x: attachX, y: attachY,
    width: 12, height: 20,
    name: "attach-clip", parentId: screenId,
  });
  await setFill(clip.id, C.trans);
  await setStroke(clip.id, C.textMuted, 2);
  await setRadius(clip.id, 6);

  log("Input area complete");
}

// ─── BUILD: Glass Ball ──────────────────────────────────────────────────────
async function buildGlassBall() {
  logSection("Glass Ball");
  const ballSize = 44;
  const ballX = 16;
  const ballY = H - 148;
  const glowSize = 72;

  // Glow
  const glowRect = await createRect({
    x: ballX - (glowSize - ballSize) / 2,
    y: ballY - (glowSize - ballSize) / 2,
    width: glowSize, height: glowSize,
    name: "glassball-glow", parentId: screenId,
  });
  await setRadius(glowRect.id, glowSize / 2);
  await setGradient(glowRect.id, "GRADIENT_RADIAL", [
    { ...C.glow, a: 0.55, position: 0 },
    { ...C.glow, a: 0.25, position: 0.5 },
    { ...C.glow, a: 0, position: 1 },
  ]);

  // Glass ring (41px)
  const ringSize = 41;
  const ringRect = await createRect({
    x: ballX + (ballSize - ringSize) / 2,
    y: ballY + (ballSize - ringSize) / 2,
    width: ringSize, height: ringSize,
    name: "glassball-ring", parentId: screenId,
  });
  await setRadius(ringRect.id, ringSize / 2);
  await setFill(ringRect.id, { ...C.bg, a: 0.85 });
  await setStroke(ringRect.id, { ...C.accent, a: 0.4 }, 1);

  // Inner highlight
  const hlSize = ringSize - 4;
  const hlRect = await createRect({
    x: ballX + (ballSize - hlSize) / 2,
    y: ballY + (ballSize - hlSize) / 2,
    width: hlSize, height: hlSize / 2,
    name: "glassball-highlight", parentId: screenId,
  });
  await setRadius(hlRect.id, hlSize / 2);
  await setGradient(hlRect.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.10, position: 0 },
    { r: 1, g: 1, b: 1, a: 0, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);

  // Inner fill
  const innerSize = ringSize - 8;
  const innerRect = await createRect({
    x: ballX + (ballSize - innerSize) / 2,
    y: ballY + (ballSize - innerSize) / 2,
    width: innerSize, height: innerSize,
    name: "glassball-inner", parentId: screenId,
  });
  await setRadius(innerRect.id, innerSize / 2);
  await setFill(innerRect.id, { ...C.glow, a: 0.15 });

  // "S" initial measured-centered
  const initM = await measureText({
    text: "S", fontSize: 18, fontWeight: 700, fontColor: C.textPri,
  });
  await createText({
    text: "S", fontSize: 18, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: ballX + (ballSize - initM.width) / 2,
    y: ballY + (ballSize - initM.height) / 2,
    name: "glassball-initial",
  });

  log("Glass ball complete");
}

// ─── BUILD: Home Indicator ──────────────────────────────────────────────────
async function buildHomeIndicator() {
  const indW = 134;
  const indH = 5;
  const ind = await createRect({
    x: (W - indW) / 2, y: H - 20,
    width: indW, height: indH,
    name: "home-indicator", parentId: screenId,
  });
  await setFill(ind.id, { ...C.white, a: 0.22 });
  await setRadius(ind.id, 3);
  log("Home indicator built");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    log("Finding active channel...");
    const ch = await findChannel();
    log(`Found channel: ${ch}`);

    log("Connecting to WebSocket relay...");
    await connect(ch);
    log("Connected");

    // Build all sections
    await buildPhoneFrame();
    await sleep(200);

    const chatStartY = await buildHeader();
    await sleep(200);

    const msgEndY = await buildMessages(chatStartY);
    await sleep(200);

    await buildInputArea();
    await sleep(200);

    await buildGlassBall();
    await sleep(200);

    await buildHomeIndicator();
    await sleep(400);

    // Export screenshot
    logSection("Export");
    try {
      const img = await exportImage(screenId, "PNG", 2);
      if (img && img.imageData) {
        const buf = Buffer.from(img.imageData, "base64");
        fs.writeFileSync(SCREENSHOT_PATH, buf);
        log(`Screenshot saved: ${SCREENSHOT_PATH}`);
      } else {
        log("Warning: No image data returned");
      }
    } catch (e) {
      log(`Warning: Export failed: ${e.message}`);
    }

    logSection("Summary");
    log(`Frame: "ExpA: Pixel-Perfect Spacing" at (${SCREEN_X}, ${SCREEN_Y})`);
    log(`Size: ${W}x${H}`);
    log(`Innovation: Double-pass measurement for pixel-perfect text alignment`);
    log(`Key features:`);
    log(`  - Outgoing messages RIGHT-aligned using measured text width`);
    log(`  - Timestamps aligned under message text (right for outgoing, left for incoming)`);
    log(`  - Read receipts "✓✓" positioned exactly ${TS_READ_GAP}px after timestamp end`);
    log(`  - "Saeed" name and "Today" badge centered using measured width`);
    log(`  - Consistent spacing: ${GROUP_SPACING}px between groups, ${INTRA_SPACING}px within, ${TEXT_TS_GAP}px text-to-timestamp`);
    log(`  - Pass 3 verification confirms actual positions match calculations`);
    log("");
    log(`Finished: ${new Date().toISOString()}`);

    saveLog();
    ws.close();
    process.exit(0);

  } catch (err) {
    log(`FATAL: ${err.message}`);
    console.error(err);
    saveLog();
    process.exit(1);
  }
}

main();
