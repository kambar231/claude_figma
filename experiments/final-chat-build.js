/**
 * DEFINITIVE BUILD: Belo DM Chat Screen (Dev Branch)
 *
 * Builds the Gioia-style DM chat at (14600, 0) in Figma.
 * NO colored bubble backgrounds — plain text on dark bg.
 * Uses measure-verify approach for text positioning.
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
const LOG_PATH = path.join(__dirname, "final-chat-log.md");

const SCREEN_X = 14600;
const SCREEN_Y = 0;
const SCREEN_W = 393;
const SCREEN_H = 852;

const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const FONT_FALLBACK = "Inter";

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

// ─── Logging ────────────────────────────────────────────────────────────────
const logLines = ["# Final Chat Build Log", "", `Started: ${new Date().toISOString()}`, ""];
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

function nextId() { return `final-${++reqCounter}`; }

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
    strokeColor: opts.strokeColor,
    strokeWeight: opts.strokeWeight,
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
// Create text off-screen, read real dimensions, delete, return {width, height}
async function measureText(opts) {
  const result = await createText({ ...opts, x: -9999, y: -9999, name: "_measure" });
  const id = result.id;
  await sleep(150);
  const info = await getInfo(id);
  const bb = info.absoluteBoundingBox || {};
  let w = bb.width || 50;
  let h = bb.height || 20;

  // If text is wider than maxWidth, resize to wrap
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

let screenId; // the main phone frame

// --- 1. Phone Frame + Dynamic Island + Status Bar ---
async function buildPhoneFrame() {
  log("Building phone frame...");
  const frame = await createFrame({
    x: SCREEN_X, y: SCREEN_Y,
    width: SCREEN_W, height: SCREEN_H,
    name: "Belo – DM Chat (Dev Branch)",
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

  // Battery outline (right side)
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

// --- 2. Header ---
async function buildHeader() {
  log("Building header...");
  const headerY = 54; // below status bar
  const headerH = 120;

  // Back chevron
  await createText({
    text: "‹", fontSize: 32, fontWeight: 300,
    fontColor: C.accent, parentId: screenId,
    x: 12, y: headerY + 4, name: "back-chevron",
  });

  // Call button: stroke circle with phone icon
  const callBtnX = 46;
  const callBtnY = headerY + 8;
  const callBtn = await createRect({
    x: callBtnX, y: callBtnY, width: 40, height: 40,
    name: "call-btn", parentId: screenId,
  });
  await setRadius(callBtn.id, 20);
  await setFill(callBtn.id, C.trans);
  await setStroke(callBtn.id, C.accent, 2.5);
  // Phone icon (unicode)
  await createText({
    text: "✆", fontSize: 18, fontWeight: 400,
    fontColor: C.accent, parentId: screenId,
    x: callBtnX + 11, y: callBtnY + 9, name: "call-icon",
  });

  // Video button: stroke circle with camera icon
  const vidBtnX = SCREEN_W - 100;
  const vidBtnY = headerY + 8;
  const vidBtn = await createRect({
    x: vidBtnX, y: vidBtnY, width: 40, height: 40,
    name: "video-btn", parentId: screenId,
  });
  await setRadius(vidBtn.id, 20);
  await setFill(vidBtn.id, C.trans);
  await setStroke(vidBtn.id, C.accent, 2.5);
  // Camera icon (unicode)
  await createText({
    text: "▶", fontSize: 16, fontWeight: 400,
    fontColor: C.accent, parentId: screenId,
    x: vidBtnX + 13, y: vidBtnY + 10, name: "video-icon",
  });

  // Overflow dots (far right)
  const overX = SCREEN_W - 40;
  const overY = headerY + 14;
  // 2x2 grid of small rects
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

  // Center avatar with glow
  const avatarSize = 54;
  const avatarX = (SCREEN_W - avatarSize) / 2;
  const avatarY = headerY + 2;

  // Eclipse glow (89px)
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

  // Online dot (12px, bottom-right of avatar)
  const onlineDot = await createRect({
    x: avatarX + avatarSize - 14, y: avatarY + avatarSize - 14,
    width: 12, height: 12,
    name: "online-dot", parentId: screenId,
  });
  await setFill(onlineDot.id, C.online);
  await setRadius(onlineDot.id, 6);

  // Name "Saeed" below avatar (overlapping by 14px)
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
  const todayPadH = 12;
  const todayPadV = 4;
  const todayBadgeW = todayMeasure.width + todayPadH * 2;
  const todayBadgeH = todayMeasure.height + todayPadV * 2;
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
    x: todayBadgeX + todayPadH,
    y: todayY + todayPadV,
    name: "today-text",
  });

  log("Header built");
  return headerY + headerH;
}

// --- 3. Messages ---
async function buildMessages(startY) {
  log("Building messages...");

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

  // Determine grouping: consecutive same-direction messages
  // first/last in group get 8px spacing, middle gets 3px
  const groups = [];
  for (const m of messages) {
    if (groups.length === 0 || groups[groups.length - 1][0].out !== m.out) {
      groups.push([m]);
    } else {
      groups[groups.length - 1].push(m);
    }
  }

  let curY = startY + 8;
  const maxTextW = 294; // 75% of 393

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      const m = group[i];
      const isFirst = i === 0;
      const isLast = i === group.length - 1;
      const topPad = isFirst ? 8 : 3;

      // Measure message text
      const textDim = await measureText({
        text: m.text, fontSize: 15, fontWeight: 400,
        fontColor: C.textPri, maxWidth: maxTextW,
      });

      // Measure timestamp
      const tsStr = m.read ? `✓✓ ${m.time}` : m.time;
      const tsDim = await measureText({
        text: tsStr, fontSize: 11, fontWeight: 400, fontColor: C.textMuted,
      });

      // Position calculation
      let textX, tsX;
      if (m.out) {
        // Outgoing: right-aligned, left 60px margin, right 16px margin
        textX = SCREEN_W - 16 - textDim.width;
        tsX = SCREEN_W - 16 - tsDim.width;
      } else {
        // Incoming: left-aligned, left 16px margin, right 60px margin
        textX = 16;
        tsX = 16;
      }

      curY += topPad;

      // Create message text at correct position
      const msgNode = await createText({
        text: m.text, fontSize: 15, fontWeight: 400,
        fontColor: C.textPri, parentId: screenId,
        x: textX, y: curY,
        name: `msg-${m.out ? "out" : "in"}-${m.time}`,
      });

      // If text needs wrapping, resize
      if (textDim.width >= maxTextW) {
        await resizeNode(msgNode.id, maxTextW, textDim.height);
      }

      curY += textDim.height + 2;

      // Timestamp (with read receipt for outgoing)
      const tsNode = await createText({
        text: tsStr, fontSize: 11, fontWeight: 400,
        fontColor: m.read ? C.success : C.textMuted,
        parentId: screenId,
        x: tsX, y: curY,
        name: `ts-${m.time}`,
      });

      curY += tsDim.height;

      // Bottom padding
      const botPad = isLast ? 8 : 3;
      curY += botPad;
    }
  }

  log(`Messages built, ended at y=${curY}`);
  return curY;
}

// --- 4. Input Area ---
async function buildInputArea() {
  log("Building input area...");
  const inputY = SCREEN_H - 90; // input area starts here
  const areaH = 56;

  // Camera/snap circle button (44px)
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

  // Camera lens shape inside (rectangle + small circle)
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

  // Small lens circle
  const lensSize = 6;
  const lens = await createRect({
    x: camBodyX + (camBodyW - lensSize) / 2,
    y: camBodyY + (camBodyH - lensSize) / 2,
    width: lensSize, height: lensSize,
    name: "cam-lens", parentId: screenId,
  });
  await setFill(lens.id, C.bg);
  await setRadius(lens.id, lensSize / 2);

  // Camera viewfinder bump
  const bumpW = 8;
  const bumpH = 4;
  const bump = await createRect({
    x: camBodyX + (camBodyW - bumpW) / 2 + 2,
    y: camBodyY - bumpH + 1,
    width: bumpW, height: bumpH,
    name: "cam-bump", parentId: screenId,
  });
  await setFill(bump.id, C.accent);
  await setRadius(bump.id, 1);

  // Text field
  const fieldX = camX + camSize + 8;
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

  // Attachment button (right side)
  // Paperclip shape: vertical rectangle + circle at top
  const attachX = SCREEN_W - 38;
  const attachY = inputY + (areaH - 24) / 2;
  // Simple paperclip icon as rotated U shape
  const clipW = 12;
  const clipH = 20;
  const clip = await createRect({
    x: attachX, y: attachY,
    width: clipW, height: clipH,
    name: "attach-clip", parentId: screenId,
  });
  await setFill(clip.id, C.trans);
  await setStroke(clip.id, C.textMuted, 2);
  await setRadius(clip.id, 6);

  log("Input area built");
}

// --- 5. Glass Ball (bottom-left) ---
async function buildGlassBall() {
  log("Building glass ball...");
  const ballSize = 44;
  const ballX = 16;
  const ballY = SCREEN_H - 148; // above input area
  const glowSize = 72; // 44 * 1.65

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

  // Ring (41px = 44 * 0.94)
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

  // Inner highlight (top half, white 10%)
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

  // Subtle purple inner fill
  const innerSize = ringSize - 8;
  const innerRect = await createRect({
    x: ballX + (ballSize - innerSize) / 2,
    y: ballY + (ballSize - innerSize) / 2,
    width: innerSize, height: innerSize,
    name: "glassball-inner", parentId: screenId,
  });
  await setRadius(innerRect.id, innerSize / 2);
  await setFill(innerRect.id, { ...C.glow, a: 0.15 });

  // Initials
  const initMeasure = await measureText({
    text: "S", fontSize: 18, fontWeight: 700, fontColor: C.textPri,
  });
  await createText({
    text: "S", fontSize: 18, fontWeight: 700,
    fontColor: C.textPri, parentId: screenId,
    x: ballX + (ballSize - initMeasure.width) / 2,
    y: ballY + (ballSize - initMeasure.height) / 2,
    name: "glassball-initial",
  });

  log("Glass ball built");
}

// --- 6. Home Indicator ---
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

    // Step 3: Messages
    await buildMessages(chatStartY);
    await sleep(300);

    // Step 4: Input area
    await buildInputArea();
    await sleep(300);

    // Step 5: Glass ball
    await buildGlassBall();
    await sleep(300);

    // Step 6: Home indicator
    await buildHomeIndicator();
    await sleep(500);

    // Step 7: Export screenshot
    log("Exporting screenshot...");
    try {
      const img = await exportImage(screenId, "PNG", 2);
      if (img && img.imageData) {
        const buf = Buffer.from(img.imageData, "base64");
        const outPath = path.join(__dirname, "final-chat.png");
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
