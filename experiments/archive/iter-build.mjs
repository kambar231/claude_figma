/**
 * Iterative Builder: Belo Group Chat Screen
 * Builds iterations at (20000+n*500, 0), exports & audits each.
 */

import WebSocket from "ws";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_URL = "ws://localhost:3055";
const CHANNELS_URL = "http://localhost:3055/channels";

const W = 393;
const H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

const C = {
  bgDark:    { r: 0.047, g: 0.016, b: 0.082 },
  bgMid:     { r: 0.102, g: 0.051, b: 0.180 },
  bgWarm:    { r: 0.165, g: 0.090, b: 0.286 },
  bgCenter:  { r: 0.235, g: 0.090, b: 0.286 },
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMuted: { r: 0.620, g: 0.561, b: 0.710 },
  accent:    { r: 0.729, g: 0.510, b: 0.929 },
  glow:      { r: 0.608, g: 0.435, b: 0.831 },
  glassFill: { r: 0.118, g: 0.063, b: 0.188 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  green:     { r: 0.298, g: 0.686, b: 0.314 },
  coral:     { r: 0.910, g: 0.490, b: 0.490 },
  teal:      { r: 0.369, g: 0.769, b: 0.714 },
  purple:    { r: 0.702, g: 0.616, b: 0.859 },
};

// ─── Infra ───────────────────────────────────────────────────────────────────
let ws, channel, reqCounter = 0;
const pending = new Map();
function nextId() { return `it-${++reqCounter}`; }

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
          else reject(new Error("No active channel"));
        } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Figma Primitives ───────────────────────────────────────────────────────
async function createFrame(opts) {
  return cmd("create_frame", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 100, height: opts.height ?? 100,
    name: opts.name ?? "Frame", parentId: opts.parentId, fillColor: opts.fillColor,
  });
}
async function createRect(opts) {
  return cmd("create_rectangle", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 100, height: opts.height ?? 100,
    name: opts.name ?? "Rect", parentId: opts.parentId,
  });
}
async function createEllipse(opts) {
  return cmd("create_ellipse", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 50, height: opts.height ?? 50,
    name: opts.name ?? "Ellipse", parentId: opts.parentId,
  });
}
async function createText(opts) {
  return cmd("create_text", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    text: opts.text ?? "", fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? 400, fontFamily: opts.fontFamily ?? FONT_UI,
    fontColor: opts.fontColor ?? C.textPri, letterSpacing: opts.letterSpacing,
    textAlignHorizontal: opts.textAlignHorizontal,
    name: opts.name ?? opts.text?.slice(0, 20) ?? "Text",
    parentId: opts.parentId,
  });
}
async function setFill(nodeId, r, g, b, a) { return cmd("set_fill_color", { nodeId, color: { r, g, b, a: a ?? 1 } }); }
async function setFillC(nodeId, c, a) { return cmd("set_fill_color", { nodeId, color: { r: c.r, g: c.g, b: c.b, a: a ?? 1 } }); }
async function setGradient(nodeId, type, stops, handles, opacity) {
  return cmd("set_fill_gradient", { nodeId, gradientType: type, gradientStops: stops, gradientHandlePositions: handles, opacity });
}
async function setStroke(nodeId, color, weight) { return cmd("set_stroke_color", { nodeId, color, weight }); }
async function setRadius(nodeId, radius) { return cmd("set_corner_radius", { nodeId, radius }); }
async function moveNode(nodeId, x, y) { return cmd("move_node", { nodeId, x, y }); }
async function resizeNode(nodeId, width, height) { return cmd("resize_node", { nodeId, width, height }); }
async function getInfo(nodeId) { return cmd("get_node_info", { nodeId }); }
async function deleteNode(nodeId) { return cmd("delete_node", { nodeId }); }
async function exportImage(nodeId, format, scale) { return cmd("export_node_as_image", { nodeId, format: format ?? "PNG", scale: scale ?? 2 }, 60000); }

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

async function createMeasuredText(opts) {
  const dim = await measureText(opts);
  const node = await createText(opts);
  if (opts.maxWidth && dim.width >= opts.maxWidth) {
    await resizeNode(node.id, opts.maxWidth, dim.height);
  }
  return { ...node, width: dim.width, height: dim.height };
}

// ─── Glass circle builder ───────────────────────────────────────────────────
let screenId;
async function buildGlassCircle(opts) {
  const { x, y, size, name } = opts;
  const glowPad = 8;
  const glowRect = await createRect({
    x: x - glowPad, y: y - glowPad,
    width: size + glowPad * 2, height: size + glowPad * 2,
    name: `${name}-glow`, parentId: screenId,
  });
  await setRadius(glowRect.id, (size + glowPad * 2) / 2);
  await setGradient(glowRect.id, "GRADIENT_RADIAL", [
    { r: 0.608, g: 0.435, b: 0.831, a: 0.15, position: 0 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0, position: 1 },
  ]);
  const circle = await createRect({
    x, y, width: size, height: size,
    name: `${name}-circle`, parentId: screenId,
  });
  await setRadius(circle.id, size / 2);
  await setFillC(circle.id, C.glassFill, 0.9);
  await setStroke(circle.id, { r: 0.729, g: 0.510, b: 0.929, a: 0.25 }, 1);
  return circle;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ITERATION
// ═══════════════════════════════════════════════════════════════════════════

async function buildIteration(iterNum, screenX) {
  const versionName = `Chat v1.${iterNum - 1}`;
  console.log(`\n========== ITERATION ${iterNum}: ${versionName} at (${screenX}, 0) ==========\n`);

  // Create main frame
  const frame = await createFrame({
    x: screenX, y: 0, width: W, height: H,
    name: versionName,
  });
  screenId = frame.id;
  await setRadius(screenId, 50);
  await setFillC(screenId, C.bgDark, 1);

  // Background gradient
  const bgRect = await createRect({ x: 0, y: 0, width: W, height: H, name: "bg-gradient", parentId: screenId });
  await setGradient(bgRect.id, "GRADIENT_RADIAL", [
    { r: 0.235, g: 0.090, b: 0.286, a: 0.85, position: 0 },
    { r: 0.165, g: 0.070, b: 0.240, a: 0.7, position: 0.35 },
    { r: 0.102, g: 0.051, b: 0.180, a: 0.5, position: 0.65 },
    { r: 0.047, g: 0.016, b: 0.082, a: 0, position: 1 },
  ], [
    { x: 0.5, y: 0.35 },
    { x: 1.2, y: 0.35 },
    { x: 0.5, y: 1.1 },
  ]);
  await sleep(200);

  // ── Status bar ──
  // Dynamic Island
  const island = await createRect({
    x: (W - 126) / 2, y: 11, width: 126, height: 37,
    name: "dynamic-island", parentId: screenId,
  });
  await setFillC(island.id, C.black, 1);
  await setRadius(island.id, 20);

  // Time
  await createText({
    text: "2:32", fontSize: 15, fontWeight: 600,
    fontColor: C.white, parentId: screenId,
    x: 30, y: 16, name: "time",
  });

  // Signal bars
  const sigX = W - 100;
  for (let i = 0; i < 4; i++) {
    const barH = 4 + i * 2;
    const bar = await createRect({
      x: sigX + i * 5, y: 18 + (10 - barH),
      width: 3, height: barH,
      name: `signal-${i}`, parentId: screenId,
    });
    await setFillC(bar.id, C.white, 1);
    await setRadius(bar.id, 0.5);
  }

  // WiFi dot
  const wifiX = W - 76;
  const wDot = await createRect({ x: wifiX + 4, y: 24, width: 3, height: 3, name: "wifi-dot", parentId: screenId });
  await setFillC(wDot.id, C.white, 1);
  await setRadius(wDot.id, 1.5);
  for (let i = 0; i < 2; i++) {
    const arcW = 7 + i * 4;
    const arc = await createRect({
      x: wifiX + 5.5 - arcW / 2, y: 21 - i * 3,
      width: arcW, height: 2,
      name: `wifi-arc-${i}`, parentId: screenId,
    });
    await setFillC(arc.id, C.white, 1);
    await setRadius(arc.id, 1);
  }

  // Battery
  const battX = W - 40;
  const battOut = await createRect({ x: battX, y: 17, width: 25, height: 12, name: "batt-outline", parentId: screenId });
  await setFillC(battOut.id, C.black, 0);
  await setStroke(battOut.id, { r: 1, g: 1, b: 1, a: 1 }, 1);
  await setRadius(battOut.id, 3);
  const battFill = await createRect({ x: battX + 2, y: 19, width: 21, height: 8, name: "batt-fill", parentId: screenId });
  await setFillC(battFill.id, C.white, 1);
  await setRadius(battFill.id, 1.5);
  const battCap = await createRect({ x: battX + 26, y: 20, width: 2, height: 6, name: "batt-cap", parentId: screenId });
  await setFillC(battCap.id, C.white, 0.4);
  await setRadius(battCap.id, 0.5);

  await sleep(200);

  // ── Header ──
  const headerY = 58;

  // Back chevron
  await createText({
    text: "‹", fontSize: 30, fontWeight: 700,
    fontColor: C.white, parentId: screenId,
    x: 10, y: headerY - 4, name: "back-arrow",
  });

  // 3 overlapping mini avatars
  const avatarColors = [
    { r: 0.85, g: 0.65, b: 0.45 },
    { r: 0.75, g: 0.55, b: 0.35 },
    { r: 0.65, g: 0.50, b: 0.70 },
  ];
  for (let i = 0; i < 3; i++) {
    const av = await createEllipse({
      x: 42 + i * 14, y: headerY + 2, width: 22, height: 22,
      name: `avatar-${i}`, parentId: screenId,
    });
    await setFillC(av.id, avatarColors[i], 1);
    await setStroke(av.id, { r: 0.047, g: 0.016, b: 0.082, a: 1 }, 2);
  }

  // Phone glass button
  const phoneBtnX = 100;
  const phoneBtnY = headerY + 20;
  const phoneBtnSize = 42;
  await buildGlassCircle({ x: phoneBtnX, y: phoneBtnY, size: phoneBtnSize, name: "phone-btn" });
  // Phone handset icon
  const phX = phoneBtnX + 12, phY = phoneBtnY + 12;
  const phBody = await createRect({ x: phX, y: phY, width: 18, height: 3, name: "ph-top", parentId: screenId });
  await setFillC(phBody.id, C.white, 0.9);
  await setRadius(phBody.id, 1.5);
  const phL = await createRect({ x: phX, y: phY + 3, width: 4, height: 9, name: "ph-left", parentId: screenId });
  await setFillC(phL.id, C.white, 0.9);
  await setRadius(phL.id, 1);
  const phR = await createRect({ x: phX + 14, y: phY + 3, width: 4, height: 9, name: "ph-right", parentId: screenId });
  await setFillC(phR.id, C.white, 0.9);
  await setRadius(phR.id, 1);
  const phBot = await createRect({ x: phX, y: phY + 12, width: 18, height: 3, name: "ph-bot", parentId: screenId });
  await setFillC(phBot.id, C.white, 0.9);
  await setRadius(phBot.id, 1.5);

  // BELO BALL
  const ballSize = 90;
  const ballX = (W - ballSize) / 2;
  const ballY = headerY;

  // Ball glow
  const glowSize = 120;
  const glowR = await createRect({
    x: ballX - (glowSize - ballSize) / 2,
    y: ballY - (glowSize - ballSize) / 2,
    width: glowSize, height: glowSize,
    name: "ball-glow", parentId: screenId,
  });
  await setRadius(glowR.id, glowSize / 2);
  await setGradient(glowR.id, "GRADIENT_RADIAL", [
    { r: 0.608, g: 0.435, b: 0.831, a: 0.4, position: 0 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0.15, position: 0.5 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0, position: 1 },
  ]);

  // Ball circle
  const ball = await createEllipse({
    x: ballX, y: ballY, width: ballSize, height: ballSize,
    name: "belo-ball", parentId: screenId,
  });
  await setFillC(ball.id, { r: 0.08, g: 0.04, b: 0.14 }, 1);
  await setStroke(ball.id, { r: 0.608, g: 0.435, b: 0.831, a: 0.3 }, 1.5);

  // "belo" text on ball
  const beloM = await measureText({ text: "belo", fontSize: 24, fontWeight: 400, fontFamily: FONT_LOGO, fontColor: { r: 1, g: 0.98, b: 0.95 } });
  await createText({
    text: "belo", fontSize: 24, fontWeight: 400, fontFamily: FONT_LOGO,
    fontColor: { r: 1, g: 0.98, b: 0.95 }, parentId: screenId,
    x: ballX + (ballSize - beloM.width) / 2,
    y: ballY + (ballSize - beloM.height) / 2 - 2,
    name: "ball-belo",
  });

  // Green badge "8"
  const badgeSize = 22;
  const badgeX = ballX + ballSize - badgeSize + 2;
  const badgeY = ballY + ballSize - badgeSize + 2;
  const badge = await createEllipse({ x: badgeX, y: badgeY, width: badgeSize, height: badgeSize, name: "badge", parentId: screenId });
  await setFillC(badge.id, C.green, 1);
  const bM = await measureText({ text: "8", fontSize: 13, fontWeight: 700, fontColor: C.white });
  await createText({ text: "8", fontSize: 13, fontWeight: 700, fontColor: C.white, parentId: screenId,
    x: badgeX + (badgeSize - bM.width) / 2, y: badgeY + (badgeSize - bM.height) / 2, name: "badge-8" });

  // Video glass button
  const vidBtnX = W - 100 - 42;
  const vidBtnY = headerY + 20;
  await buildGlassCircle({ x: vidBtnX, y: vidBtnY, size: 42, name: "video-btn" });
  // Camera icon
  const vX = vidBtnX + 10, vY = vidBtnY + 14;
  const camBody = await createRect({ x: vX, y: vY, width: 14, height: 12, name: "cam-body", parentId: screenId });
  await setFillC(camBody.id, C.white, 0.9);
  await setRadius(camBody.id, 2);
  const camLens = await createRect({ x: vX + 15, y: vY + 2, width: 8, height: 8, name: "cam-lens", parentId: screenId });
  await setFillC(camLens.id, C.white, 0.9);
  await setRadius(camLens.id, 1);

  // Stack icon (far right)
  const stackX = W - 38;
  const stackY = headerY + 28;
  const st1 = await createRect({ x: stackX, y: stackY, width: 14, height: 14, name: "stack-1", parentId: screenId });
  await setFillC(st1.id, C.black, 0);
  await setStroke(st1.id, { r: 1, g: 1, b: 1, a: 0.8 }, 1.5);
  await setRadius(st1.id, 3);
  const st2 = await createRect({ x: stackX + 5, y: stackY + 5, width: 14, height: 14, name: "stack-2", parentId: screenId });
  await setFillC(st2.id, C.black, 0);
  await setStroke(st2.id, { r: 1, g: 1, b: 1, a: 0.8 }, 1.5);
  await setRadius(st2.id, 3);

  // "belo team"
  const nameM = await measureText({ text: "belo team", fontSize: 18, fontWeight: 700, fontColor: C.white });
  const nameY = ballY + ballSize + 6;
  await createText({
    text: "belo team", fontSize: 18, fontWeight: 700,
    fontColor: C.white, parentId: screenId,
    x: (W - nameM.width) / 2, y: nameY, name: "group-name",
  });

  // "8 members"
  const memM = await measureText({ text: "8 members", fontSize: 13, fontWeight: 400, fontColor: C.textMuted });
  const memY = nameY + nameM.height + 2;
  await createText({
    text: "8 members", fontSize: 13, fontWeight: 400,
    fontColor: C.textMuted, parentId: screenId,
    x: (W - memM.width) / 2, y: memY, name: "members-count",
  });

  await sleep(200);

  // ── Messages ──
  const messages = [
    { sender: "Roman OG", color: C.coral, text: "Nope I get to about 90% of the weekly limit each week", time: "11:16" },
    { sender: "Roman OG", color: C.coral, text: "My fleet self adjusts to keep it under", time: "11:16" },
    { sender: "Enis Dev", color: C.teal, text: "Did you see the new Claude cowork", time: "11:17" },
    { sender: "Roman OG", color: C.coral, text: "Indeed, they're just porting all the features from the open source claude code community to their own product which is cool", time: "11:31" },
    { sender: "Saeed Sharifi", color: C.purple, text: "Btw im getting notifications for messages but when i open it it shows nothing", time: "11:44" },
    { sender: "Saeed Sharifi", color: C.purple, text: "I have to refresh the app to see", time: "11:44" },
    { sender: "Roman Dev", color: C.coral, text: "Ok will look into it", time: "12:39" },
  ];

  const textX = 16;
  const maxTextW = W - textX - 40;
  let curY = memY + memM.height + 16;
  let lastSender = null;

  for (const msg of messages) {
    const senderChanged = msg.sender !== lastSender;
    curY += senderChanged ? 14 : 6;

    if (senderChanged) {
      const sM = await measureText({ text: msg.sender, fontSize: 13, fontWeight: 700, fontColor: msg.color });
      await createText({
        text: msg.sender, fontSize: 13, fontWeight: 700,
        fontColor: msg.color, parentId: screenId,
        x: textX, y: curY, name: `sender-${msg.sender}`,
      });
      curY += sM.height + 2;
    }

    const msgNode = await createMeasuredText({
      text: msg.text, fontSize: 16, fontWeight: 400,
      fontColor: C.textPri, parentId: screenId,
      x: textX, y: curY, maxWidth: maxTextW,
      name: `msg-${msg.text.slice(0, 20)}`,
    });
    curY += msgNode.height + 2;

    const tsM = await measureText({ text: msg.time, fontSize: 11, fontWeight: 400, fontColor: C.textMuted });
    await createText({
      text: msg.time, fontSize: 11, fontWeight: 400,
      fontColor: C.textMuted, parentId: screenId,
      x: textX, y: curY, name: `ts-${msg.time}`,
    });
    curY += tsM.height + 2;
    lastSender = msg.sender;
  }

  await sleep(200);

  // ── Input area ──
  const inputY = H - 88;
  const areaH = 54;

  // Separator
  const sep = await createRect({ x: 0, y: inputY - 1, width: W, height: 1, name: "input-sep", parentId: screenId });
  await setFillC(sep.id, C.white, 0.05);

  // Left menu button (3 dots)
  const menuSize = 48;
  const menuX = 14;
  const menuCY = inputY + (areaH - menuSize) / 2;
  await buildGlassCircle({ x: menuX, y: menuCY, size: menuSize, name: "menu-btn" });
  for (let i = 0; i < 3; i++) {
    const dotSz = 4;
    const dot = await createRect({
      x: menuX + (menuSize - dotSz) / 2,
      y: menuCY + 12 + i * 8,
      width: dotSz, height: dotSz,
      name: `menu-dot-${i}`, parentId: screenId,
    });
    await setFillC(dot.id, C.white, 0.8);
    await setRadius(dot.id, dotSz / 2);
  }

  // "belo" placeholder
  const hintM = await measureText({ text: "belo", fontSize: 20, fontWeight: 400, fontFamily: FONT_LOGO, fontColor: C.textMuted });
  await createText({
    text: "belo", fontSize: 20, fontWeight: 400, fontFamily: FONT_LOGO,
    fontColor: C.textMuted, parentId: screenId,
    x: (W - hintM.width) / 2 - 20,
    y: inputY + (areaH - hintM.height) / 2,
    name: "input-belo",
  });

  // "GIF"
  const gifM = await measureText({ text: "GIF", fontSize: 13, fontWeight: 700, fontColor: C.textMuted });
  await createText({
    text: "GIF", fontSize: 13, fontWeight: 700,
    fontColor: C.textMuted, parentId: screenId,
    x: W - menuSize - 24 - gifM.width,
    y: inputY + (areaH - gifM.height) / 2,
    name: "gif-label",
  });

  // Right mic button
  const micSize = 48;
  const micX = W - micSize - 14;
  const micCY = inputY + (areaH - micSize) / 2;
  await buildGlassCircle({ x: micX, y: micCY, size: micSize, name: "mic-btn" });
  // Mic icon
  const micW = 10, micH = 16;
  const micIX = micX + (micSize - micW) / 2;
  const micIY = micCY + 10;
  const micPill = await createRect({ x: micIX, y: micIY, width: micW, height: micH, name: "mic-pill", parentId: screenId });
  await setFillC(micPill.id, C.white, 0.8);
  await setRadius(micPill.id, micW / 2);
  const standX = micX + micSize / 2 - 1;
  const stand = await createRect({ x: standX, y: micIY + micH, width: 2, height: 5, name: "mic-stand", parentId: screenId });
  await setFillC(stand.id, C.white, 0.8);
  const mBase = await createRect({ x: standX - 4, y: micIY + micH + 4, width: 10, height: 2, name: "mic-base", parentId: screenId });
  await setFillC(mBase.id, C.white, 0.8);
  await setRadius(mBase.id, 1);
  // Mic cup arc
  const cup = await createRect({ x: micIX - 3, y: micIY + 2, width: 16, height: 18, name: "mic-cup", parentId: screenId });
  await setFillC(cup.id, C.black, 0);
  await setStroke(cup.id, { r: 1, g: 1, b: 1, a: 0.5 }, 1.5);
  await setRadius(cup.id, 8);

  // ── Home indicator ──
  const indW = 134, indH = 5;
  const ind = await createRect({ x: (W - indW) / 2, y: H - 20, width: indW, height: indH, name: "home-indicator", parentId: screenId });
  await setFillC(ind.id, C.white, 0.22);
  await setRadius(ind.id, 3);

  await sleep(500);

  // ── Export ──
  console.log("Exporting screenshot...");
  try {
    const img = await exportImage(screenId, "PNG", 2);
    if (img && img.imageData) {
      const buf = Buffer.from(img.imageData, "base64");
      const outPath = path.join(__dirname, `iteration-${iterNum}.png`);
      fs.writeFileSync(outPath, buf);
      console.log(`Screenshot saved: ${outPath}`);
      return outPath;
    }
  } catch (e) {
    console.log(`Export warning: ${e.message}`);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  const ch = await findChannel();
  console.log(`Channel: ${ch}`);
  await connect(ch);
  console.log("Connected to Figma relay");

  // Build iteration 1
  const imgPath = await buildIteration(1, 20000);
  console.log(`\nIteration 1 complete. Screenshot: ${imgPath}`);

  await sleep(1000);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
