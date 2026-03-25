/**
 * Experiment 3: Component Library First
 *
 * Builds individual components on a test board, verifies each,
 * then assembles them into a full chat screen.
 *
 * WebSocket relay: ws://localhost:3055
 * Channel: auto-detected from /channels endpoint
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
const LOG_PATH = path.join(__dirname, "exp3-log.md");

const COLORS = {
  bg:           { r: 0.047, g: 0.016, b: 0.082, a: 1 },      // #0C0415
  outBubble:    { r: 0.424, g: 0.173, b: 0.655, a: 1 },      // #6C2CA7
  inBubble:     { r: 0.165, g: 0.082, b: 0.271, a: 1 },      // #2A1545
  inputBg:      { r: 0.145, g: 0.082, b: 0.271, a: 1 },      // #251545
  accent:       { r: 0.729, g: 0.510, b: 0.929, a: 1 },      // #BA82ED
  glow:         { r: 0.608, g: 0.435, b: 0.831, a: 1 },      // #9B6FD4
  textWhite:    { r: 1,     g: 1,     b: 1,     a: 1 },
  textLight:    { r: 0.941, g: 0.965, b: 0.988, a: 1 },      // #F0F6FC
  textMuted:    { r: 0.620, g: 0.561, b: 0.710, a: 1 },      // #9E8FB5
  shadow:       { r: 0.424, g: 0.173, b: 0.655, a: 0.25 },   // rgba(108,44,167,0.25)
  transparent:  { r: 0,     g: 0,     b: 0,     a: 0 },
};

const BOARD_X = 15600;
const BOARD_Y = 0;
const SCREEN_W = 393;
const SCREEN_H = 852;
const FONT_UI = "Inter";  // Safer fallback; the trial font may not be loaded
const FONT_LOGO = "Inter";

// ─── Logging ────────────────────────────────────────────────────────────────
const logLines = ["# Experiment 3: Component Library First", "", `Started: ${new Date().toISOString()}`, ""];

function log(msg) {
  const line = `- ${new Date().toISOString().slice(11, 19)} ${msg}`;
  logLines.push(line);
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
          // Find channel with at least 1 client (Figma plugin)
          const active = Object.entries(channels).find(([, count]) => count >= 1);
          if (active) resolve(active[0]);
          else reject(new Error("No active channel found"));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// ─── WebSocket client ───────────────────────────────────────────────────────
let ws;
let channel;
let requestId = 0;
const pending = new Map();

function nextId() {
  return `exp3-${++requestId}`;
}

function connect(ch) {
  return new Promise((resolve, reject) => {
    channel = ch;
    ws = new WebSocket(WS_URL);
    ws.on("open", () => {
      // Join channel
      ws.send(JSON.stringify({ type: "join", channel, id: nextId() }));
      // Wait a moment for join confirmation
      setTimeout(resolve, 500);
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        // Handle broadcast responses from Figma plugin
        if (data.type === "broadcast" && data.message) {
          const msg = data.message;
          if (msg.id && pending.has(msg.id)) {
            const { resolve: res, timer } = pending.get(msg.id);
            clearTimeout(timer);
            pending.delete(msg.id);
            if (msg.error) {
              res({ error: msg.error });
            } else {
              res(msg.result || msg);
            }
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });
    ws.on("error", reject);
  });
}

function sendCommand(command, params = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const id = nextId();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${command} (${id})`));
    }, timeout);
    pending.set(id, { resolve, timer });
    ws.send(JSON.stringify({
      type: "message",
      channel,
      id,
      message: { id, command, params },
    }));
  });
}

// ─── Figma helpers ──────────────────────────────────────────────────────────
async function createFrame(opts) {
  return sendCommand("create_frame", {
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 100,
    height: opts.height || 100,
    name: opts.name || "Frame",
    parentId: opts.parentId,
    fillColor: opts.fillColor || COLORS.bg,
    layoutMode: opts.layoutMode,
    layoutWrap: opts.layoutWrap,
    paddingTop: opts.paddingTop,
    paddingRight: opts.paddingRight,
    paddingBottom: opts.paddingBottom,
    paddingLeft: opts.paddingLeft,
    primaryAxisAlignItems: opts.primaryAxisAlignItems,
    counterAxisAlignItems: opts.counterAxisAlignItems,
    layoutSizingHorizontal: opts.layoutSizingHorizontal,
    layoutSizingVertical: opts.layoutSizingVertical,
    itemSpacing: opts.itemSpacing,
  });
}

async function createRect(opts) {
  return sendCommand("create_rectangle", {
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 100,
    height: opts.height || 100,
    name: opts.name || "Rectangle",
    parentId: opts.parentId,
  });
}

async function createText(opts) {
  return sendCommand("create_text", {
    x: opts.x || 0,
    y: opts.y || 0,
    text: opts.text || "",
    fontSize: opts.fontSize || 14,
    fontWeight: opts.fontWeight || 400,
    fontFamily: opts.fontFamily || FONT_UI,
    fontColor: opts.fontColor || COLORS.textWhite,
    letterSpacing: opts.letterSpacing,
    name: opts.name || opts.text || "Text",
    parentId: opts.parentId,
  });
}

async function setFill(nodeId, color) {
  return sendCommand("set_fill_color", { nodeId, color });
}

async function setCornerRadius(nodeId, radius) {
  return sendCommand("set_corner_radius", { nodeId, radius });
}

async function moveNode(nodeId, x, y) {
  return sendCommand("move_node", { nodeId, x, y });
}

async function resizeNode(nodeId, width, height) {
  return sendCommand("resize_node", { nodeId, width, height });
}

async function getNodeInfo(nodeId) {
  return sendCommand("get_node_info", { nodeId });
}

async function setGradient(nodeId, type, stops, handles, opacity) {
  return sendCommand("set_fill_gradient", {
    nodeId,
    gradientType: type,
    gradientStops: stops,
    gradientHandlePositions: handles,
    opacity,
  });
}

async function setStroke(nodeId, r, g, b, a, weight) {
  return sendCommand("set_stroke_color", { nodeId, color: { r, g, b, a }, weight });
}

async function exportImage(nodeId, format, scale) {
  return sendCommand("export_node_as_image", { nodeId, format: format || "PNG", scale: scale || 1 }, 60000);
}

async function deleteNode(nodeId) {
  return sendCommand("delete_node", { nodeId });
}

// Measure text: create it, read back dimensions, return { id, width, height }
async function measureText(opts) {
  const result = await createText(opts);
  const id = result.id;
  // Small delay to let Figma render the text
  await sleep(200);
  const info = await getNodeInfo(id);
  const bb = info.absoluteBoundingBox || {};
  return { id, width: bb.width || 50, height: bb.height || 20 };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Component Builders ─────────────────────────────────────────────────────

/**
 * Build a message bubble component using a frame container.
 * All children are positioned relative to the frame, so moving the frame moves everything.
 * Returns { frameId, width, height }
 */
async function buildMessageBubble({ text, isOutgoing, timestamp, hasReadReceipt, parentId, x, y }) {
  const bubbleColor = isOutgoing ? COLORS.outBubble : COLORS.inBubble;
  const textColor = isOutgoing ? COLORS.textWhite : COLORS.textLight;
  const maxTextWidth = 240;
  const hPad = 12;
  const vPad = 8;
  const tsGap = 4;

  // Step 1: Create a temporary measuring text outside the bubble to get dimensions
  const textMeasure = await measureText({
    text,
    fontSize: 15,
    fontWeight: 400,
    fontColor: textColor,
    parentId,
    x: -9999,
    y: -9999,
    name: `_measure-text`,
  });

  let textW = textMeasure.width;
  let textH = textMeasure.height;
  if (textW > maxTextWidth) {
    await resizeNode(textMeasure.id, maxTextWidth, textH);
    await sleep(200);
    const info2 = await getNodeInfo(textMeasure.id);
    const bb2 = info2.absoluteBoundingBox || {};
    textW = bb2.width || maxTextWidth;
    textH = bb2.height || textH;
  }
  await deleteNode(textMeasure.id);

  // Step 2: Measure timestamp
  const tsText = timestamp || "10:24 PM";
  const receiptPrefix = hasReadReceipt ? "✓✓ " : "";
  const tsMeasure = await measureText({
    text: receiptPrefix + tsText,
    fontSize: 11,
    fontWeight: 400,
    fontColor: COLORS.textMuted,
    parentId,
    x: -9999,
    y: -9999,
    name: `_measure-ts`,
  });
  const tsW = tsMeasure.width;
  const tsH = tsMeasure.height;
  await deleteNode(tsMeasure.id);

  // Step 3: Compute bubble size
  const contentW = Math.max(textW, tsW);
  const bubbleW = contentW + hPad * 2;
  const bubbleH = vPad + textH + tsGap + tsH + vPad;

  // Step 4: Create bubble frame (acts as container; rounded + colored)
  const bubbleFrame = await createFrame({
    x, y,
    width: bubbleW, height: bubbleH,
    name: `bubble-${isOutgoing ? "out" : "in"}`,
    parentId,
    fillColor: bubbleColor,
  });
  await setCornerRadius(bubbleFrame.id, 16);

  // Step 5: Create text nodes inside the bubble frame (coords relative to frame)
  const textNode = await createText({
    text,
    fontSize: 15,
    fontWeight: 400,
    fontColor: textColor,
    parentId: bubbleFrame.id,
    x: hPad,
    y: vPad,
    name: `msg-text`,
  });
  if (textW >= maxTextWidth) {
    await resizeNode(textNode.id, maxTextWidth, textH);
  }

  await createText({
    text: receiptPrefix + tsText,
    fontSize: 11,
    fontWeight: 400,
    fontColor: COLORS.textMuted,
    parentId: bubbleFrame.id,
    x: hPad,
    y: vPad + textH + tsGap,
    name: "timestamp",
  });

  log(`  Bubble built: ${bubbleW}x${bubbleH} "${text.slice(0, 30)}..."`);

  return { frameId: bubbleFrame.id, width: bubbleW, height: bubbleH };
}

/**
 * Build an Eclipse avatar with glow + glass ring.
 * Returns { groupIds, size }
 */
async function buildAvatar({ size, parentId, x, y, label }) {
  const glowSize = size + 16;
  const ringSize = size + 4;

  // Glow circle (blurred bg)
  const glow = await createRect({
    x: x - 8, y: y - 8,
    width: glowSize, height: glowSize,
    name: `${label}-glow`,
    parentId,
  });
  await setCornerRadius(glow.id, glowSize / 2);
  await setGradient(glow.id, "GRADIENT_RADIAL", [
    { r: 0.608, g: 0.435, b: 0.831, a: 0.6, position: 0 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0,   position: 1 },
  ]);

  // Glass ring
  const ring = await createRect({
    x: x - 2, y: y - 2,
    width: ringSize, height: ringSize,
    name: `${label}-ring`,
    parentId,
  });
  await setCornerRadius(ring.id, ringSize / 2);
  await setFill(ring.id, COLORS.transparent);
  await setStroke(ring.id, 0.729, 0.510, 0.929, 0.5, 1.5);

  // Avatar circle (solid placeholder)
  const avatar = await createRect({
    x, y, width: size, height: size,
    name: `${label}-avatar`,
    parentId,
  });
  await setCornerRadius(avatar.id, size / 2);
  await setGradient(avatar.id, "GRADIENT_LINEAR", [
    { r: 0.424, g: 0.173, b: 0.655, a: 1, position: 0 },
    { r: 0.729, g: 0.510, b: 0.929, a: 1, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);

  // Initial letter
  const initial = await createText({
    text: "E",
    fontSize: Math.round(size * 0.45),
    fontWeight: 700,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + size * 0.32,
    y: y + size * 0.18,
    name: `${label}-initial`,
  });

  log(`  Avatar built: ${size}px at (${x}, ${y})`);
  return { ids: [glow.id, ring.id, avatar.id, initial.id], size };
}

/**
 * Build the header bar component.
 * Returns { frameId, height }
 */
async function buildHeader({ parentId, x, y, width }) {
  const h = 120;

  // Header background
  const headerBg = await createRect({
    x, y, width, height: h,
    name: "header-bg",
    parentId,
  });
  await setFill(headerBg.id, COLORS.bg);

  // Dynamic Island placeholder
  const island = await createRect({
    x: x + width / 2 - 63, y: y + 12,
    width: 126, height: 37,
    name: "dynamic-island",
    parentId,
  });
  await setCornerRadius(island.id, 19);
  await setFill(island.id, { r: 0, g: 0, b: 0, a: 1 });

  // Back arrow
  const backBtn = await createText({
    text: "←",
    fontSize: 24,
    fontWeight: 400,
    fontColor: COLORS.accent,
    parentId,
    x: x + 16,
    y: y + 72,
    name: "back-arrow",
  });

  // Avatar in header (small)
  await buildAvatar({
    size: 36,
    parentId,
    x: x + width / 2 - 18,
    y: y + 62,
    label: "header",
  });

  // Contact name
  const contactName = await createText({
    text: "Eclipse",
    fontSize: 11,
    fontWeight: 600,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + width / 2 - 20,
    y: y + 102,
    name: "contact-name",
  });

  // Phone button
  const phoneBtn = await createText({
    text: "📞",
    fontSize: 18,
    fontColor: COLORS.accent,
    parentId,
    x: x + 52,
    y: y + 74,
    name: "phone-btn",
  });

  // Video button
  const videoBtn = await createText({
    text: "📹",
    fontSize: 18,
    fontColor: COLORS.accent,
    parentId,
    x: x + width - 72,
    y: y + 74,
    name: "video-btn",
  });

  // Overflow menu
  const overflow = await createText({
    text: "⋮",
    fontSize: 22,
    fontWeight: 700,
    fontColor: COLORS.textMuted,
    parentId,
    x: x + width - 32,
    y: y + 72,
    name: "overflow-menu",
  });

  log(`  Header built: ${width}x${h}`);
  return { frameId: headerBg.id, height: h };
}

/**
 * Build the input area component.
 * Returns { frameId, height }
 */
async function buildInputArea({ parentId, x, y, width }) {
  const h = 80;

  // Background
  const inputBg = await createRect({
    x, y, width, height: h,
    name: "input-area-bg",
    parentId,
  });
  await setFill(inputBg.id, COLORS.bg);

  // Camera circle button
  const camBtnSize = 36;
  const camBtn = await createRect({
    x: x + 16,
    y: y + (h - camBtnSize) / 2,
    width: camBtnSize, height: camBtnSize,
    name: "camera-btn",
    parentId,
  });
  await setCornerRadius(camBtn.id, camBtnSize / 2);
  await setFill(camBtn.id, COLORS.outBubble);

  const camIcon = await createText({
    text: "📷",
    fontSize: 16,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + 24,
    y: y + (h - camBtnSize) / 2 + 8,
    name: "camera-icon",
  });

  // Text input field
  const fieldX = x + 16 + camBtnSize + 8;
  const fieldW = width - 16 - camBtnSize - 8 - 48 - 16;
  const fieldH = 40;
  const field = await createRect({
    x: fieldX,
    y: y + (h - fieldH) / 2,
    width: fieldW, height: fieldH,
    name: "text-field",
    parentId,
  });
  await setCornerRadius(field.id, 20);
  await setFill(field.id, COLORS.inputBg);

  const placeholder = await createText({
    text: "Message...",
    fontSize: 15,
    fontWeight: 400,
    fontColor: COLORS.textMuted,
    parentId,
    x: fieldX + 16,
    y: y + (h - fieldH) / 2 + 10,
    name: "placeholder-text",
  });

  // Attachment button
  const attachBtn = await createText({
    text: "📎",
    fontSize: 20,
    fontColor: COLORS.accent,
    parentId,
    x: x + width - 48,
    y: y + (h - 24) / 2,
    name: "attach-btn",
  });

  log(`  Input area built: ${width}x${h}`);
  return { frameId: inputBg.id, height: h };
}

/**
 * Build the status bar.
 */
async function buildStatusBar({ parentId, x, y, width }) {
  const h = 54;

  // Time
  const time = await createText({
    text: "9:41",
    fontSize: 15,
    fontWeight: 600,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + 24,
    y: y + 16,
    name: "status-time",
  });

  // Signal icons (right side)
  const signal = await createText({
    text: "●●●● ▂▄▆█",
    fontSize: 11,
    fontWeight: 400,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + width - 90,
    y: y + 18,
    name: "status-signals",
  });

  // Battery
  const battery = await createText({
    text: "🔋",
    fontSize: 12,
    fontColor: COLORS.textWhite,
    parentId,
    x: x + width - 36,
    y: y + 17,
    name: "status-battery",
  });

  log(`  Status bar built`);
  return { height: h };
}

// ─── Phase 1: Component Test Board ──────────────────────────────────────────

async function buildTestBoard() {
  log("## Phase 1: Component Test Board");

  const board = await createFrame({
    x: BOARD_X, y: BOARD_Y,
    width: 1200, height: 900,
    name: "Exp3: Component Test Board",
    fillColor: { r: 0.08, g: 0.04, b: 0.12, a: 1 },
  });
  const boardId = board.id;
  log(`Created test board: ${boardId}`);

  // ── Section 1: Message Bubbles ──
  const sectionLabel1 = await createText({
    text: "MESSAGE BUBBLES",
    fontSize: 14,
    fontWeight: 700,
    fontColor: COLORS.accent,
    parentId: boardId,
    x: 20, y: 20,
    name: "section-label-bubbles",
  });

  // Bubble 1: Short outgoing
  const b1 = await buildMessageBubble({
    text: "Hello!",
    isOutgoing: true,
    timestamp: "10:24 PM",
    parentId: boardId,
    x: 20, y: 50,
  });

  // Bubble 2: Long incoming
  const b2 = await buildMessageBubble({
    text: "Come on bro, don't be like that. You know I've been looking forward to this.",
    isOutgoing: false,
    timestamp: "10:23 PM",
    parentId: boardId,
    x: 20, y: 50 + b1.height + 20,
  });

  // Bubble 3: Medium outgoing with read receipt
  const b3 = await buildMessageBubble({
    text: "Alright, I'll be there at 7. Save me a spot!",
    isOutgoing: true,
    timestamp: "10:25 PM",
    hasReadReceipt: true,
    parentId: boardId,
    x: 20, y: 50 + b1.height + 20 + b2.height + 20,
  });

  // ── Section 2: Avatars ──
  const sectionLabel2 = await createText({
    text: "AVATARS",
    fontSize: 14,
    fontWeight: 700,
    fontColor: COLORS.accent,
    parentId: boardId,
    x: 400, y: 20,
    name: "section-label-avatars",
  });

  // Avatar 54px (header size)
  const avatarLabel1 = await createText({
    text: "54px (header)",
    fontSize: 11,
    fontColor: COLORS.textMuted,
    parentId: boardId,
    x: 400, y: 50,
  });
  await buildAvatar({
    size: 54,
    parentId: boardId,
    x: 420, y: 70,
    label: "test-54",
  });

  // Avatar 40px (profile size)
  const avatarLabel2 = await createText({
    text: "40px (profile)",
    fontSize: 11,
    fontColor: COLORS.textMuted,
    parentId: boardId,
    x: 520, y: 50,
  });
  await buildAvatar({
    size: 40,
    parentId: boardId,
    x: 540, y: 70,
    label: "test-40",
  });

  // ── Section 3: Header ──
  const sectionLabel3 = await createText({
    text: "HEADER COMPONENT",
    fontSize: 14,
    fontWeight: 700,
    fontColor: COLORS.accent,
    parentId: boardId,
    x: 20, y: 420,
    name: "section-label-header",
  });

  await buildHeader({
    parentId: boardId,
    x: 20, y: 450,
    width: SCREEN_W,
  });

  // ── Section 4: Input Area ──
  const sectionLabel4 = await createText({
    text: "INPUT AREA COMPONENT",
    fontSize: 14,
    fontWeight: 700,
    fontColor: COLORS.accent,
    parentId: boardId,
    x: 20, y: 590,
    name: "section-label-input",
  });

  await buildInputArea({
    parentId: boardId,
    x: 20, y: 620,
    width: SCREEN_W,
  });

  // ── Section 5: Status Bar ──
  const sectionLabel5 = await createText({
    text: "STATUS BAR",
    fontSize: 14,
    fontWeight: 700,
    fontColor: COLORS.accent,
    parentId: boardId,
    x: 20, y: 720,
    name: "section-label-status",
  });

  await buildStatusBar({
    parentId: boardId,
    x: 20, y: 750,
    width: SCREEN_W,
  });

  log("Phase 1 complete: All components built on test board");
  return boardId;
}

// ─── Phase 2: Assemble Full Screen ──────────────────────────────────────────

async function assembleScreen() {
  log("");
  log("## Phase 2: Assemble Full Screen");

  const screen = await createFrame({
    x: BOARD_X, y: 960,
    width: SCREEN_W, height: SCREEN_H,
    name: "Exp3: Component Assembly",
    fillColor: COLORS.bg,
  });
  const screenId = screen.id;
  log(`Created screen frame: ${screenId}`);

  let curY = 0;

  // 1. Status bar area (part of header visually)
  // We skip separate status bar since header includes dynamic island

  // 2. Header (120px)
  await buildHeader({
    parentId: screenId,
    x: 0, y: curY,
    width: SCREEN_W,
  });
  curY += 120;

  // 3. Chat messages area
  const chatAreaHeight = SCREEN_H - 120 - 80; // header - input

  // Add messages from bottom-up (typical chat layout)
  const messages = [
    { text: "Hey, are we still on for tonight?", isOutgoing: true, timestamp: "10:20 PM" },
    { text: "Yeah of course! What time works for you?", isOutgoing: false, timestamp: "10:21 PM" },
    { text: "How about 7?", isOutgoing: true, timestamp: "10:22 PM" },
    { text: "Come on bro, don't be like that. You know I've been looking forward to this.", isOutgoing: false, timestamp: "10:23 PM" },
    { text: "Hello!", isOutgoing: true, timestamp: "10:24 PM" },
    { text: "Alright, I'll be there at 7. Save me a spot!", isOutgoing: true, timestamp: "10:25 PM", hasReadReceipt: true },
  ];

  // Build messages top-to-bottom; outgoing are right-aligned, incoming left-aligned.
  // Since bubbles are now frames, moving the frame moves all children.
  let msgY = curY + 16;
  for (const msg of messages) {
    // First pass: create at x=16 (left margin) to measure
    const bubble = await buildMessageBubble({
      ...msg,
      parentId: screenId,
      x: 16,
      y: msgY,
    });

    // Right-align outgoing bubbles by moving the frame
    if (msg.isOutgoing) {
      const rightX = SCREEN_W - 16 - bubble.width;
      await moveNode(bubble.frameId, rightX, msgY);
    }

    msgY += bubble.height + 8;

    // Stop if we'd overflow into the input area
    if (msgY > curY + chatAreaHeight - 20) break;
  }

  // 4. Input area (80px at bottom)
  await buildInputArea({
    parentId: screenId,
    x: 0, y: SCREEN_H - 80,
    width: SCREEN_W,
  });

  log("Phase 2 complete: Screen assembled");
  return screenId;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    log("Finding active channel...");
    const ch = await findChannel();
    log(`Found channel: ${ch}`);

    log("Connecting to WebSocket...");
    await connect(ch);
    log("Connected to WebSocket relay");

    // Phase 1
    const boardId = await buildTestBoard();
    await sleep(1000);

    // Export test board screenshot
    log("Exporting test board screenshot...");
    try {
      const boardImg = await exportImage(boardId, "PNG", 1);
      if (boardImg && boardImg.imageData) {
        const imgBuf = Buffer.from(boardImg.imageData, "base64");
        fs.writeFileSync(path.join(__dirname, "exp3-testboard.png"), imgBuf);
        log("Saved test board screenshot: exp3-testboard.png");
      }
    } catch (e) {
      log(`Warning: Could not export test board: ${e.message}`);
    }

    // Phase 2
    const screenId = await assembleScreen();
    await sleep(1000);

    // Export assembled screen screenshot
    log("Exporting assembled screen screenshot...");
    try {
      const screenImg = await exportImage(screenId, "PNG", 1);
      if (screenImg && screenImg.imageData) {
        const imgBuf = Buffer.from(screenImg.imageData, "base64");
        fs.writeFileSync(path.join(__dirname, "exp3-assembly.png"), imgBuf);
        log("Saved assembled screen screenshot: exp3-assembly.png");
      }
    } catch (e) {
      log(`Warning: Could not export assembled screen: ${e.message}`);
    }

    log("");
    log("## Done");
    log(`Completed at ${new Date().toISOString()}`);
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
