/**
 * Experiment B: Visual Hierarchy and Contrast
 *
 * NO colored bubble backgrounds. Messages are plain text on dark background.
 * Differentiates incoming vs outgoing through:
 *   - Font SIZE: incoming 16px, outgoing 14px
 *   - Font WEIGHT: incoming 500 (medium), outgoing 400 (regular)
 *   - Text OPACITY: incoming 100%, outgoing 85%
 *   - Alignment: incoming left, outgoing right
 *   - Timestamp color: incoming textMuted, outgoing success green + read receipt
 *
 * Position: (17500, 0), name "ExpB: Visual Hierarchy"
 * Screen: 393x852, bg #0C0415, radius 50
 */

import WebSocket from "ws";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ─────────────────────────────────────────────────────────────────
const WS_URL = "ws://localhost:3055";
const CHANNELS_URL = "http://localhost:3055/channels";
const LOG_PATH = path.join(__dirname, "expB-log.md");

const SCREEN_X = 17500;
const SCREEN_Y = 0;
const SCREEN_W = 393;
const SCREEN_H = 852;

const FONT_UI = "ABC Arizona Mix Unlicensed Trial";

const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082, a: 1 },   // #0C0415
  textPri:   { r: 0.941, g: 0.965, b: 0.988, a: 1 },   // #F0F6FC
  textMuted: { r: 0.620, g: 0.561, b: 0.710, a: 1 },   // #9E8FB5
  accent:    { r: 0.729, g: 0.510, b: 0.929, a: 1 },   // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831, a: 1 },   // #9B6FD4
  inputBg:   { r: 0.145, g: 0.082, b: 0.271, a: 1 },   // #251545
  success:   { r: 0.353, g: 0.620, b: 0.478, a: 1 },   // #5A9E7A
  online:    { r: 0.204, g: 0.827, b: 0.600, a: 1 },   // #34D399
  white:     { r: 1, g: 1, b: 1, a: 1 },
  black:     { r: 0, g: 0, b: 0, a: 1 },
  trans:     { r: 0, g: 0, b: 0, a: 0 },
};

// Outgoing text: slightly reduced opacity
const C_textOut = { ...C.textPri, a: 0.85 };

// ─── Logging ────────────────────────────────────────────────────────────────
const logLines = ["# ExpB: Visual Hierarchy Build Log", "", `Started: ${new Date().toISOString()}`, ""];
function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  logLines.push(`- ${ts} ${msg}`);
  console.log(msg);
}
function saveLog() {
  fs.writeFileSync(LOG_PATH, logLines.join("\n"), "utf-8");
}

// ─── Channel discovery ──────────────────────────────────────────────────────
async function findChannel() {
  return new Promise((resolve, reject) => {
    http.get(CHANNELS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const channels = JSON.parse(data);
          const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) resolve(sorted[0][0]);
          else reject(new Error("No active channel found"));
        } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

// ─── WebSocket client ───────────────────────────────────────────────────────
let ws;
let channel;
let reqCounter = 0;
const pending = new Map();

function nextId() { return `expB-${++reqCounter}`; }

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Figma Primitives ───────────────────────────────────────────────────────

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

// ─── Measure-Verify Text ────────────────────────────────────────────────────
async function measureText(opts) {
  const result = await createText({ ...opts, x: -9999, y: -9999, name: "_measure" });
  const id = result.id;
  await sleep(150);
  const info = await getInfo(id);
  const bb = info.absoluteBoundingBox || {};
  let w = bb.width || 50;
  let h = bb.height || 20;

  if (opts.maxWidth && w > opts.maxWidth) {
    await resizeNode(id, opts.maxWidth, h);
    await sleep(150);
    const info2 = await getInfo(id);
    const bb2 = info2.absoluteBoundingBox || {};
    w = bb2.width || opts.maxWidth;
    h = bb2.height || h;
  }
  await deleteNode(id);
  return { width: w, height: h };
}

// ─── BUILD SECTIONS ─────────────────────────────────────────────────────────

let screenId;

// --- 1. Phone Frame + Dynamic Island + Status Bar ---
async function buildPhoneFrame() {
  log("Building phone frame...");
  const frame = await createFrame({
    x: SCREEN_X, y: SCREEN_Y,
    width: SCREEN_W, height: SCREEN_H,
    name: "ExpB: Visual Hierarchy",
    fillColor: C.bg,
  });
  screenId = frame.id;
  await setRadius(screenId, 50);

  // Dynamic Island
  const island = await createRect({
    x: (SCREEN_W - 126) / 2, y: 11,
    width: 126, height: 37,
    name: "dynamic-island",
    parentId: screenId,
  });
  await setFill(island.id, C.black);
  await setRadius(island.id, 20);

  // Status bar time
  await createText({
    text: "3:14", fontSize: 15, fontWeight: 600,
    fontColor: C.white, parentId: screenId,
    x: 30, y: 14, name: "status-time",
  });

  // Battery outline
  const battOutline = await createRect({
    x: SCREEN_W - 40, y: 17,
    width: 25, height: 12,
    name: "battery-outline",
    parentId: screenId,
  });
  await setFill(battOutline.id, C.trans);
  await setStroke(battOutline.id, C.white, 1);
  await setRadius(battOutline.id, 3);

  // Battery fill
  const battFill = await createRect({
    x: SCREEN_W - 38, y: 19,
    width: 18, height: 8,
    name: "battery-fill",
    parentId: screenId,
  });
  await setFill(battFill.id, C.white);
  await setRadius(battFill.id, 1);

  // Battery cap
  const battCap = await createRect({
    x: SCREEN_W - 14, y: 20,
    width: 2, height: 6,
    name: "battery-cap",
    parentId: screenId,
  });
  await setFill(battCap.id, { ...C.white, a: 0.4 });

  log("Phone frame built");
}

// --- 2. Header with proper spacing ---
async function buildHeader() {
  log("Building header...");
  const headerY = 54;
  const headerH = 120;

  // Back chevron (far left)
  await createText({
    text: "\u2039", fontSize: 32, fontWeight: 300,
    fontColor: C.accent, parentId: screenId,
    x: 12, y: headerY + 4, name: "back-chevron",
  });

  // === PROPER HEADER LAYOUT ===
  // Avatar centered, call/video buttons symmetric around avatar with proper spacing
  const avatarSize = 54;
  const avatarX = (SCREEN_W - avatarSize) / 2;
  const avatarY = headerY + 2;

  // Call button: 16px gap from avatar left edge
  const btnSize = 36;
  const btnGap = 14; // gap between button edge and avatar edge
  const callBtnX = avatarX - btnGap - btnSize;
  const callBtnY = headerY + 12;
  const callBtn = await createRect({
    x: callBtnX, y: callBtnY, width: btnSize, height: btnSize,
    name: "call-btn", parentId: screenId,
  });
  await setRadius(callBtn.id, btnSize / 2);
  await setFill(callBtn.id, C.trans);
  await setStroke(callBtn.id, { ...C.accent, a: 0.6 }, 1.5);
  // Phone icon
  await createText({
    text: "\u260E", fontSize: 16, fontWeight: 400,
    fontColor: C.accent, parentId: screenId,
    x: callBtnX + 10, y: callBtnY + 8, name: "call-icon",
  });

  // Video button: symmetric on right side
  const vidBtnX = avatarX + avatarSize + btnGap;
  const vidBtnY = callBtnY;
  const vidBtn = await createRect({
    x: vidBtnX, y: vidBtnY, width: btnSize, height: btnSize,
    name: "video-btn", parentId: screenId,
  });
  await setRadius(vidBtn.id, btnSize / 2);
  await setFill(vidBtn.id, C.trans);
  await setStroke(vidBtn.id, { ...C.accent, a: 0.6 }, 1.5);
  // Camera icon
  await createText({
    text: "\u25B6", fontSize: 14, fontWeight: 400,
    fontColor: C.accent, parentId: screenId,
    x: vidBtnX + 12, y: vidBtnY + 10, name: "video-icon",
  });

  // Overflow dots (far right, 2x2 grid)
  const overX = SCREEN_W - 36;
  const overY = headerY + 16;
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

  // === 3-LAYER GLASS BALL AVATAR ===
  // Layer 1: Glow (outermost, radial gradient, soft purple)
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

  // Layer 2: Frosted ring (glass rim, semi-transparent bg + thin stroke)
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

  // Layer 3: Inner highlight (top-half gradient, simulates glass reflection)
  const hlSize = ringSize - 4;
  const hlRect = await createRect({
    x: avatarX + (avatarSize - hlSize) / 2,
    y: avatarY + (avatarSize - hlSize) / 2,
    width: hlSize, height: hlSize / 2,
    name: "avatar-highlight", parentId: screenId,
  });
  await setRadius(hlRect.id, hlSize / 2);
  await setGradient(hlRect.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.12, position: 0 },
    { r: 1, g: 1, b: 1, a: 0, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);

  // Subtle purple inner fill
  const innerSize = ringSize - 8;
  const innerRect = await createRect({
    x: avatarX + (avatarSize - innerSize) / 2,
    y: avatarY + (avatarSize - innerSize) / 2,
    width: innerSize, height: innerSize,
    name: "avatar-inner", parentId: screenId,
  });
  await setRadius(innerRect.id, innerSize / 2);
  await setFill(innerRect.id, { ...C.glow, a: 0.15 });

  // Initials inside ring
  const initMeasure = await measureText({
    text: "S", fontSize: 22, fontWeight: 700, fontColor: C.textPri,
  });
  await createText({
    text: "S", fontSize: 22, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: avatarX + (avatarSize - initMeasure.width) / 2,
    y: avatarY + (avatarSize - initMeasure.height) / 2 - 1,
    name: "avatar-initial",
  });

  // Online dot
  const onlineDot = await createRect({
    x: avatarX + avatarSize - 14, y: avatarY + avatarSize - 14,
    width: 12, height: 12,
    name: "online-dot", parentId: screenId,
  });
  await setFill(onlineDot.id, C.online);
  await setRadius(onlineDot.id, 6);

  // Name below avatar
  const nameMeasure = await measureText({
    text: "Saeed", fontSize: 18, fontWeight: 700, fontColor: C.textPri,
  });
  await createText({
    text: "Saeed", fontSize: 18, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: (SCREEN_W - nameMeasure.width) / 2,
    y: avatarY + avatarSize - 14,
    name: "contact-name",
  });

  // "Today" badge
  const todayY = avatarY + avatarSize - 14 + nameMeasure.height + 4;
  const todayMeasure = await measureText({
    text: "Today", fontSize: 11, fontWeight: 600, fontColor: C.accent,
  });
  const todayBadgeW = todayMeasure.width + 24;
  const todayBadgeH = todayMeasure.height + 8;
  const todayBadgeX = (SCREEN_W - todayBadgeW) / 2;

  const todayBg = await createRect({
    x: todayBadgeX, y: todayY,
    width: todayBadgeW, height: todayBadgeH,
    name: "today-badge-bg", parentId: screenId,
  });
  await setFill(todayBg.id, { ...C.accent, a: 0.15 });
  await setRadius(todayBg.id, 10);

  await createText({
    text: "Today", fontSize: 11, fontWeight: 600,
    fontColor: C.accent, parentId: screenId,
    x: todayBadgeX + 12,
    y: todayY + 4,
    name: "today-text",
  });

  log("Header built");
  return headerY + headerH;
}

// --- 3. Messages with visual hierarchy ---
async function buildMessages(startY) {
  log("Building messages with visual hierarchy...");

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

  // Group consecutive same-direction messages
  const groups = [];
  for (const m of messages) {
    if (groups.length === 0 || groups[groups.length - 1][0].out !== m.out) {
      groups.push([m]);
    } else {
      groups[groups.length - 1].push(m);
    }
  }

  let curY = startY + 8;
  // Visual hierarchy params:
  // Incoming: larger text (16px), medium weight (500), full opacity
  // Outgoing: smaller text (14px), regular weight (400), reduced opacity (85%)
  const INCOMING_SIZE = 16;
  const INCOMING_WEIGHT = 500;
  const OUTGOING_SIZE = 14;
  const OUTGOING_WEIGHT = 400;
  const maxTextW = 294; // ~75% of 393

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      const m = group[i];
      const isFirst = i === 0;
      const isLast = i === group.length - 1;
      const topPad = isFirst ? 8 : 3;

      const fontSize = m.out ? OUTGOING_SIZE : INCOMING_SIZE;
      const fontWeight = m.out ? OUTGOING_WEIGHT : INCOMING_WEIGHT;
      const fontColor = m.out ? C_textOut : C.textPri;

      // Measure message text
      const textDim = await measureText({
        text: m.text, fontSize, fontWeight,
        fontColor, maxWidth: maxTextW,
      });

      // Measure timestamp
      const tsStr = m.read ? `\u2713\u2713 ${m.time}` : m.time;
      const tsDim = await measureText({
        text: tsStr, fontSize: 11, fontWeight: 400, fontColor: C.textMuted,
      });

      // Position
      let textX, tsX;
      if (m.out) {
        textX = SCREEN_W - 16 - textDim.width;
        tsX = SCREEN_W - 16 - tsDim.width;
      } else {
        textX = 16;
        tsX = 16;
      }

      curY += topPad;

      // Create message text
      const msgNode = await createText({
        text: m.text, fontSize, fontWeight,
        fontColor, parentId: screenId,
        x: textX, y: curY,
        name: `msg-${m.out ? "out" : "in"}-${m.time}`,
      });

      // Wrap if needed
      if (textDim.width >= maxTextW) {
        await resizeNode(msgNode.id, maxTextW, textDim.height);
      }

      curY += textDim.height + 2;

      // Timestamp
      await createText({
        text: tsStr, fontSize: 11, fontWeight: 400,
        fontColor: m.read ? C.success : C.textMuted,
        parentId: screenId,
        x: tsX, y: curY,
        name: `ts-${m.time}`,
      });

      curY += tsDim.height;
      const botPad = isLast ? 8 : 3;
      curY += botPad;
    }
  }

  log(`Messages built, ended at y=${curY}`);
  return curY;
}

// --- 4. Input Area (integrated, not floating) ---
async function buildInputArea() {
  log("Building input area...");
  const inputY = SCREEN_H - 90;
  const areaH = 56;

  // Subtle top border: very thin, low opacity, blends with screen
  const borderLine = await createRect({
    x: 16, y: inputY - 1,
    width: SCREEN_W - 32, height: 0.5,
    name: "input-border-top", parentId: screenId,
  });
  await setFill(borderLine.id, { ...C.white, a: 0.04 });

  // === GLASS BALL (bottom-left input button) ===
  // 3-layer eclipse: glow -> frosted ring -> highlight
  const ballSize = 44;
  const ballX = 12;
  const ballY = inputY + (areaH - ballSize) / 2;

  // Layer 1: Glow
  const ballGlowSize = 66;
  const ballGlow = await createRect({
    x: ballX - (ballGlowSize - ballSize) / 2,
    y: ballY - (ballGlowSize - ballSize) / 2,
    width: ballGlowSize, height: ballGlowSize,
    name: "ball-glow", parentId: screenId,
  });
  await setRadius(ballGlow.id, ballGlowSize / 2);
  await setGradient(ballGlow.id, "GRADIENT_RADIAL", [
    { ...C.glow, a: 0.45, position: 0 },
    { ...C.glow, a: 0.15, position: 0.6 },
    { ...C.glow, a: 0, position: 1 },
  ]);

  // Layer 2: Frosted ring
  const ballRingSize = 41;
  const ballRing = await createRect({
    x: ballX + (ballSize - ballRingSize) / 2,
    y: ballY + (ballSize - ballRingSize) / 2,
    width: ballRingSize, height: ballRingSize,
    name: "ball-ring", parentId: screenId,
  });
  await setRadius(ballRing.id, ballRingSize / 2);
  await setFill(ballRing.id, { ...C.bg, a: 0.85 });
  await setStroke(ballRing.id, { ...C.accent, a: 0.4 }, 1);

  // Layer 3: Highlight (top-half glass reflection)
  const ballHlSize = ballRingSize - 4;
  const ballHl = await createRect({
    x: ballX + (ballSize - ballHlSize) / 2,
    y: ballY + (ballSize - ballHlSize) / 2,
    width: ballHlSize, height: ballHlSize / 2,
    name: "ball-highlight", parentId: screenId,
  });
  await setRadius(ballHl.id, ballHlSize / 2);
  await setGradient(ballHl.id, "GRADIENT_LINEAR", [
    { r: 1, g: 1, b: 1, a: 0.10, position: 0 },
    { r: 1, g: 1, b: 1, a: 0, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);

  // Inner purple fill
  const ballInnerSize = ballRingSize - 8;
  const ballInner = await createRect({
    x: ballX + (ballSize - ballInnerSize) / 2,
    y: ballY + (ballSize - ballInnerSize) / 2,
    width: ballInnerSize, height: ballInnerSize,
    name: "ball-inner", parentId: screenId,
  });
  await setRadius(ballInner.id, ballInnerSize / 2);
  await setFill(ballInner.id, { ...C.glow, a: 0.15 });

  // Camera icon inside ball (small rectangle + lens circle)
  const camBodyW = 16;
  const camBodyH = 11;
  const camBodyX = ballX + (ballSize - camBodyW) / 2;
  const camBodyY = ballY + (ballSize - camBodyH) / 2 + 1;
  const camBody = await createRect({
    x: camBodyX, y: camBodyY,
    width: camBodyW, height: camBodyH,
    name: "ball-cam-body", parentId: screenId,
  });
  await setFill(camBody.id, C.accent);
  await setRadius(camBody.id, 2.5);

  // Lens circle
  const lensSize = 5;
  const lens = await createRect({
    x: camBodyX + (camBodyW - lensSize) / 2,
    y: camBodyY + (camBodyH - lensSize) / 2,
    width: lensSize, height: lensSize,
    name: "ball-cam-lens", parentId: screenId,
  });
  await setFill(lens.id, C.bg);
  await setRadius(lens.id, lensSize / 2);

  // Camera bump
  const bumpW = 7;
  const bumpH = 3;
  const bump = await createRect({
    x: camBodyX + (camBodyW - bumpW) / 2 + 2,
    y: camBodyY - bumpH + 1,
    width: bumpW, height: bumpH,
    name: "ball-cam-bump", parentId: screenId,
  });
  await setFill(bump.id, C.accent);
  await setRadius(bump.id, 1);

  // Text field
  const fieldX = ballX + ballSize + 8;
  const fieldW = SCREEN_W - fieldX - 48;
  const fieldH = 44;
  const fieldY = inputY + (areaH - fieldH) / 2;
  const field = await createRect({
    x: fieldX, y: fieldY,
    width: fieldW, height: fieldH,
    name: "input-field", parentId: screenId,
  });
  await setFill(field.id, C.inputBg);
  await setRadius(field.id, 24);

  // Placeholder text
  await createText({
    text: "Type with joy...", fontSize: 15, fontWeight: 400,
    fontColor: C.textMuted, parentId: screenId,
    x: fieldX + 16, y: fieldY + 12,
    name: "input-placeholder",
  });

  // Attachment button (paperclip)
  const attachX = SCREEN_W - 38;
  const attachY = inputY + (areaH - 24) / 2;
  const clip = await createRect({
    x: attachX, y: attachY,
    width: 12, height: 20,
    name: "attach-clip", parentId: screenId,
  });
  await setFill(clip.id, C.trans);
  await setStroke(clip.id, C.textMuted, 2);
  await setRadius(clip.id, 6);

  log("Input area built");
}

// --- 5. Home Indicator ---
async function buildHomeIndicator() {
  const indW = 134;
  const indH = 5;
  const ind = await createRect({
    x: (SCREEN_W - indW) / 2, y: SCREEN_H - 20,
    width: indW, height: indH,
    name: "home-indicator", parentId: screenId,
  });
  await setFill(ind.id, { ...C.white, a: 0.22 });
  await setRadius(ind.id, 3);
  log("Home indicator built");
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  try {
    log("Finding active channel...");
    const ch = await findChannel();
    log(`Found channel: ${ch}`);

    log("Connecting to WebSocket relay...");
    await connect(ch);
    log("Connected");

    // Step 1: Phone frame
    await buildPhoneFrame();
    await sleep(300);

    // Step 2: Header
    const chatStartY = await buildHeader();
    await sleep(300);

    // Step 3: Messages with visual hierarchy
    await buildMessages(chatStartY);
    await sleep(300);

    // Step 4: Input area with glass ball
    await buildInputArea();
    await sleep(300);

    // Step 5: Home indicator
    await buildHomeIndicator();
    await sleep(500);

    // Step 6: Export screenshot
    log("Exporting screenshot...");
    try {
      const img = await exportImage(screenId, "PNG", 2);
      if (img && img.imageData) {
        const buf = Buffer.from(img.imageData, "base64");
        const outPath = path.join(__dirname, "expB-result.png");
        fs.writeFileSync(outPath, buf);
        log(`Screenshot saved: ${outPath}`);
      } else {
        log("Warning: No image data returned from export");
      }
    } catch (e) {
      log(`Warning: Export failed: ${e.message}`);
    }

    log("");
    log("## BUILD COMPLETE");
    log(`Finished at ${new Date().toISOString()}`);
    log("");
    log("## Visual Hierarchy Innovations");
    log("- Incoming text: 16px / weight 500 / full opacity #F0F6FC");
    log("- Outgoing text: 14px / weight 400 / 85% opacity");
    log("- Incoming feels HEAVIER (bolder, larger) -- draws the eye");
    log("- Outgoing feels LIGHTER (smaller, faded) -- secondary");
    log("- Timestamps: incoming=muted, outgoing=green with read receipts");
    log("- Glass ball: 3-layer eclipse (glow + frosted ring + highlight)");
    log("- Header: call/video buttons symmetric around avatar with 14px gap");
    log("- Input area: integrated via subtle top border, not floating");

    saveLog();

    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2000);
  } catch (err) {
    console.error("Error:", err);
    saveLog();
    process.exit(1);
  }
}

main();
