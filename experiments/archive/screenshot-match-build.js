/**
 * Screenshot-Match Build: Belo Group Chat Screen
 *
 * Builds the group chat screen at (19000, 0) in Figma,
 * matching the real screenshot from the user's phone exactly.
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
const LOG_PATH = path.join(__dirname, "screenshot-match-log.md");

const SCREEN_X = 19000;
const SCREEN_Y = 0;
const W = 393;
const H = 852;

const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

// Colors
const C = {
  bgDark:    { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  bgMid:     { r: 0.102, g: 0.051, b: 0.180 },  // #1A0D2E
  bgWarm:    { r: 0.165, g: 0.090, b: 0.286 },   // #2A1745
  bgCenter:  { r: 0.235, g: 0.090, b: 0.286 },   // #3C1749
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },   // #F0F6FC
  textMuted: { r: 0.620, g: 0.561, b: 0.710 },   // #9E8FB5
  accent:    { r: 0.729, g: 0.510, b: 0.929 },   // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831 },   // #9B6FD4
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },   // #251545
  glassFill: { r: 0.118, g: 0.063, b: 0.188 },   // #1E1030
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  green:     { r: 0.298, g: 0.686, b: 0.314 },   // #4CAF50
  // Sender colors
  coral:     { r: 0.910, g: 0.490, b: 0.490 },   // #E87D7D
  teal:      { r: 0.369, g: 0.769, b: 0.714 },   // #5EC4B6
  purple:    { r: 0.702, g: 0.616, b: 0.859 },   // #B39DDB
};

// ─── Logging ────────────────────────────────────────────────────────────────
const logLines = ["# Screenshot Match Build Log", "", `Started: ${new Date().toISOString()}`, ""];
function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  logLines.push(`- ${ts} ${msg}`);
  console.log(msg);
}
function saveLog() {
  logLines.push("", `Finished: ${new Date().toISOString()}`);
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

function nextId() { return `scr-${++reqCounter}`; }

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

async function createEllipse(opts) {
  return cmd("create_ellipse", {
    x: opts.x ?? 0, y: opts.y ?? 0,
    width: opts.width ?? 50, height: opts.height ?? 50,
    name: opts.name ?? "Ellipse",
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

async function setFill(nodeId, r, g, b, a) {
  return cmd("set_fill_color", { nodeId, color: { r, g, b, a: a ?? 1 } });
}

async function setFillC(nodeId, c, a) {
  return cmd("set_fill_color", { nodeId, color: { r: c.r, g: c.g, b: c.b, a: a ?? 1 } });
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

// Create text at correct position using measure-verify
async function createMeasuredText(opts) {
  // Measure first
  const dim = await measureText(opts);
  // Create at real position
  const node = await createText(opts);
  // Resize if wrapping needed
  if (opts.maxWidth && dim.width >= opts.maxWidth) {
    await resizeNode(node.id, opts.maxWidth, dim.height);
  }
  return { ...node, width: dim.width, height: dim.height };
}

// ─── BUILD SECTIONS ─────────────────────────────────────────────────────────

let screenId;

// --- 1. Phone Frame + Background Gradient ---
async function buildPhoneFrame() {
  log("Building phone frame + gradient background...");
  const frame = await createFrame({
    x: SCREEN_X, y: SCREEN_Y,
    width: W, height: H,
    name: "Belo – Group Chat (Screenshot Match)",
  });
  screenId = frame.id;
  await setRadius(screenId, 50);
  await setFillC(screenId, C.bgDark, 1);

  // Background gradient overlay — radial gradient, warm purple center
  const bgRect = await createRect({
    x: 0, y: 0, width: W, height: H,
    name: "bg-gradient", parentId: screenId,
  });
  await setGradient(bgRect.id, "GRADIENT_RADIAL", [
    { r: 0.235, g: 0.090, b: 0.286, a: 0.85, position: 0 },    // warm purple center
    { r: 0.165, g: 0.070, b: 0.240, a: 0.7, position: 0.35 },   // mid purple
    { r: 0.102, g: 0.051, b: 0.180, a: 0.5, position: 0.65 },   // darker
    { r: 0.047, g: 0.016, b: 0.082, a: 0, position: 1 },         // edges fade to frame bg
  ], [
    { x: 0.5, y: 0.35 },   // center slightly above middle
    { x: 1.2, y: 0.35 },   // x-axis end (wider spread)
    { x: 0.5, y: 1.1 },    // y-axis end
  ]);

  log("Phone frame + gradient built");
}

// --- 2. Dynamic Island + Status Bar ---
async function buildStatusBar() {
  log("Building status bar...");

  // Dynamic Island
  const island = await createRect({
    x: (W - 126) / 2, y: 11,
    width: 126, height: 37,
    name: "dynamic-island", parentId: screenId,
  });
  await setFillC(island.id, C.black, 1);
  await setRadius(island.id, 20);

  // Time "2:32"
  await createText({
    text: "2:32", fontSize: 15, fontWeight: 600,
    fontColor: C.white, parentId: screenId,
    x: 30, y: 15, name: "status-time",
  });

  // Signal bars (4 small rects)
  const sigX = W - 100;
  const sigY = 18;
  for (let i = 0; i < 4; i++) {
    const barH = 4 + i * 2;
    const bar = await createRect({
      x: sigX + i * 5, y: sigY + (10 - barH),
      width: 3, height: barH,
      name: `signal-${i}`, parentId: screenId,
    });
    await setFillC(bar.id, C.white, 1);
    await setRadius(bar.id, 0.5);
  }

  // WiFi icon (3 arcs approximated with small shapes)
  const wifiX = W - 76;
  const wifiDot = await createRect({
    x: wifiX + 4, y: sigY + 6,
    width: 3, height: 3,
    name: "wifi-dot", parentId: screenId,
  });
  await setFillC(wifiDot.id, C.white, 1);
  await setRadius(wifiDot.id, 1.5);

  // WiFi arcs as small rects
  for (let i = 0; i < 2; i++) {
    const arcW = 7 + i * 4;
    const arc = await createRect({
      x: wifiX + 5.5 - arcW / 2, y: sigY + 3 - i * 3,
      width: arcW, height: 2,
      name: `wifi-arc-${i}`, parentId: screenId,
    });
    await setFillC(arc.id, C.white, 1);
    await setRadius(arc.id, 1);
  }

  // Battery
  const battX = W - 40;
  const battOutline = await createRect({
    x: battX, y: 17, width: 25, height: 12,
    name: "battery-outline", parentId: screenId,
  });
  await setFillC(battOutline.id, C.black, 0);
  await setStroke(battOutline.id, { r: 1, g: 1, b: 1, a: 1 }, 1);
  await setRadius(battOutline.id, 3);

  const battFill = await createRect({
    x: battX + 2, y: 19, width: 18, height: 8,
    name: "battery-fill", parentId: screenId,
  });
  await setFillC(battFill.id, C.white, 1);
  await setRadius(battFill.id, 1);

  const battCap = await createRect({
    x: battX + 26, y: 20, width: 2, height: 6,
    name: "battery-cap", parentId: screenId,
  });
  await setFillC(battCap.id, C.white, 0.4);

  log("Status bar built");
}

// --- 3. Header ---
async function buildHeader() {
  log("Building header...");
  const headerY = 58;

  // Back arrow "‹"
  await createText({
    text: "‹", fontSize: 28, fontWeight: 700,
    fontColor: C.white, parentId: screenId,
    x: 12, y: headerY - 2, name: "back-arrow",
  });

  // 3 overlapping mini avatars (top-left)
  const avatarColors = [
    { r: 0.85, g: 0.55, b: 0.55 }, // reddish
    { r: 0.55, g: 0.75, b: 0.85 }, // blue-ish
    { r: 0.75, g: 0.65, b: 0.85 }, // purple-ish
  ];
  for (let i = 0; i < 3; i++) {
    const avSize = 24;
    const avX = 40 + i * 16;
    const avY = headerY + 2;
    const av = await createEllipse({
      x: avX, y: avY, width: avSize, height: avSize,
      name: `mini-avatar-${i}`, parentId: screenId,
    });
    await setFillC(av.id, avatarColors[i], 1);
    // Dark border to separate overlapping circles
    await setStroke(av.id, { r: 0.047, g: 0.016, b: 0.082, a: 1 }, 2);
  }

  // Phone glass circle (left of center)
  const phoneCircleX = 88;
  const phoneCircleY = headerY + 24;
  const phoneCircle = await buildGlassCircle({
    x: phoneCircleX, y: phoneCircleY, size: 44,
    name: "phone-btn",
  });
  // Phone handset icon (simplified with rects)
  const phX = phoneCircleX + 13;
  const phY = phoneCircleY + 11;
  const ph1 = await createRect({
    x: phX, y: phY, width: 18, height: 4,
    name: "phone-body", parentId: screenId,
  });
  await setFillC(ph1.id, C.textMuted, 1);
  await setRadius(ph1.id, 2);
  const ph2 = await createRect({
    x: phX, y: phY + 4, width: 4, height: 10,
    name: "phone-left", parentId: screenId,
  });
  await setFillC(ph2.id, C.textMuted, 1);
  await setRadius(ph2.id, 1);
  const ph3 = await createRect({
    x: phX + 14, y: phY + 4, width: 4, height: 10,
    name: "phone-right", parentId: screenId,
  });
  await setFillC(ph3.id, C.textMuted, 1);
  await setRadius(ph3.id, 1);
  const ph4 = await createRect({
    x: phX, y: phY + 14, width: 18, height: 4,
    name: "phone-bottom", parentId: screenId,
  });
  await setFillC(ph4.id, C.textMuted, 1);
  await setRadius(ph4.id, 2);

  // BELO BALL (large, centered, ~90px)
  const ballSize = 90;
  const ballX = (W - ballSize) / 2;
  const ballY = headerY + 2;

  // Glow behind ball
  const glowSize = 120;
  const glowRect = await createRect({
    x: ballX - (glowSize - ballSize) / 2,
    y: ballY - (glowSize - ballSize) / 2,
    width: glowSize, height: glowSize,
    name: "ball-glow", parentId: screenId,
  });
  await setRadius(glowRect.id, glowSize / 2);
  await setGradient(glowRect.id, "GRADIENT_RADIAL", [
    { r: 0.608, g: 0.435, b: 0.831, a: 0.4, position: 0 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0.15, position: 0.5 },
    { r: 0.608, g: 0.435, b: 0.831, a: 0, position: 1 },
  ]);

  // Ball circle (dark purple fill)
  const ball = await createEllipse({
    x: ballX, y: ballY, width: ballSize, height: ballSize,
    name: "belo-ball", parentId: screenId,
  });
  await setFillC(ball.id, { r: 0.08, g: 0.04, b: 0.14 }, 1);
  await setStroke(ball.id, { r: 0.608, g: 0.435, b: 0.831, a: 0.3 }, 1.5);

  // "belo" text inside ball (Bumbbled font, cream/white)
  const beloMeasure = await measureText({
    text: "belo", fontSize: 24, fontWeight: 400,
    fontFamily: FONT_LOGO, fontColor: { r: 1, g: 0.98, b: 0.95 },
  });
  await createText({
    text: "belo", fontSize: 24, fontWeight: 400,
    fontFamily: FONT_LOGO,
    fontColor: { r: 1, g: 0.98, b: 0.95 },
    parentId: screenId,
    x: ballX + (ballSize - beloMeasure.width) / 2,
    y: ballY + (ballSize - beloMeasure.height) / 2 - 2,
    name: "ball-belo-text",
  });

  // Green "8" badge at bottom-right of ball
  const badgeSize = 22;
  const badgeX = ballX + ballSize - badgeSize + 2;
  const badgeY = ballY + ballSize - badgeSize + 2;
  const badge = await createEllipse({
    x: badgeX, y: badgeY, width: badgeSize, height: badgeSize,
    name: "member-badge", parentId: screenId,
  });
  await setFillC(badge.id, C.green, 1);

  const badgeTextMeasure = await measureText({
    text: "8", fontSize: 13, fontWeight: 700,
    fontColor: C.white,
  });
  await createText({
    text: "8", fontSize: 13, fontWeight: 700,
    fontColor: C.white, parentId: screenId,
    x: badgeX + (badgeSize - badgeTextMeasure.width) / 2,
    y: badgeY + (badgeSize - badgeTextMeasure.height) / 2,
    name: "badge-text",
  });

  // Video glass circle (right of center)
  const vidCircleX = W - 88 - 44;
  const vidCircleY = headerY + 24;
  await buildGlassCircle({
    x: vidCircleX, y: vidCircleY, size: 44,
    name: "video-btn",
  });
  // Video camera icon (rectangle + triangle)
  const vX = vidCircleX + 10;
  const vY = vidCircleY + 14;
  const camBody = await createRect({
    x: vX, y: vY, width: 14, height: 12,
    name: "cam-body", parentId: screenId,
  });
  await setFillC(camBody.id, C.textMuted, 1);
  await setRadius(camBody.id, 2);
  // Camera lens triangle (approximated with small rect)
  const camLens = await createRect({
    x: vX + 15, y: vY + 2, width: 8, height: 8,
    name: "cam-lens", parentId: screenId,
  });
  await setFillC(camLens.id, C.textMuted, 1);
  await setRadius(camLens.id, 1);

  // Stack/copy icon (far right, two overlapping rectangles)
  const stackX = W - 40;
  const stackY = headerY + 30;
  const stackR1 = await createRect({
    x: stackX, y: stackY, width: 16, height: 16,
    name: "stack-rect-1", parentId: screenId,
  });
  await setFillC(stackR1.id, C.black, 0);
  await setStroke(stackR1.id, { r: 1, g: 1, b: 1, a: 0.8 }, 1.5);
  await setRadius(stackR1.id, 3);

  const stackR2 = await createRect({
    x: stackX + 5, y: stackY + 5, width: 16, height: 16,
    name: "stack-rect-2", parentId: screenId,
  });
  await setFillC(stackR2.id, C.black, 0);
  await setStroke(stackR2.id, { r: 1, g: 1, b: 1, a: 0.8 }, 1.5);
  await setRadius(stackR2.id, 3);

  // "belo team" centered below ball
  const teamNameMeasure = await measureText({
    text: "belo team", fontSize: 18, fontWeight: 700,
    fontColor: C.white,
  });
  const nameY = ballY + ballSize + 4;
  await createText({
    text: "belo team", fontSize: 18, fontWeight: 700,
    fontColor: C.white, parentId: screenId,
    x: (W - teamNameMeasure.width) / 2,
    y: nameY,
    name: "group-name",
  });

  // "8 members" centered below name
  const membersMeasure = await measureText({
    text: "8 members", fontSize: 13, fontWeight: 400,
    fontColor: C.textMuted,
  });
  const membersY = nameY + teamNameMeasure.height + 2;
  await createText({
    text: "8 members", fontSize: 13, fontWeight: 400,
    fontColor: C.textMuted, parentId: screenId,
    x: (W - membersMeasure.width) / 2,
    y: membersY,
    name: "members-count",
  });

  log("Header built");
  return membersY + membersMeasure.height + 12; // return Y where messages start
}

// Helper: Build a glass circle button
async function buildGlassCircle(opts) {
  const { x, y, size, name } = opts;

  // Outer glow
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

  // Circle fill
  const circle = await createRect({
    x, y, width: size, height: size,
    name: `${name}-circle`, parentId: screenId,
  });
  await setRadius(circle.id, size / 2);
  await setFillC(circle.id, C.glassFill, 0.9);
  await setStroke(circle.id, { r: 0.729, g: 0.510, b: 0.929, a: 0.2 }, 1);

  return circle;
}

// --- 4. Messages ---
async function buildMessages(startY) {
  log("Building messages...");

  const messages = [
    { sender: "Roman OG", color: C.coral, text: "Nope I get to about 90% of the weekly limit each week", time: "11:16" },
    { sender: "Roman OG", color: C.coral, text: "My fleet self adjusts to keep it under", time: "11:16" },
    { sender: "Enis Dev", color: C.teal, text: "Did you see the new Claude cowork", time: "11:17" },
    { sender: "Roman OG", color: C.coral, text: "Indeed, they're just porting all the features from the open source claude code community to their own product which is cool", time: "11:31" },
    { sender: "Saeed Sharifi", color: C.purple, text: "Btw im getting notifications for messages but when i open it it shows nothing", time: "11:44" },
    { sender: "Saeed Sharifi", color: C.purple, text: "I have to refresh the app to see", time: "11:44" },
    { sender: "Roman Dev", color: C.coral, text: "Ok will look into it", time: "12:39" },
  ];

  const textX = 60;
  const maxTextW = W - textX - 20; // right margin 20px
  let curY = startY;

  let lastSender = null;

  for (const msg of messages) {
    const senderChanged = msg.sender !== lastSender;
    const topPad = senderChanged ? 12 : 4;
    curY += topPad;

    // Sender name (only when sender changes)
    if (senderChanged) {
      const senderMeasure = await measureText({
        text: msg.sender, fontSize: 13, fontWeight: 700,
        fontColor: msg.color,
      });
      await createText({
        text: msg.sender, fontSize: 13, fontWeight: 700,
        fontColor: msg.color, parentId: screenId,
        x: textX, y: curY,
        name: `sender-${msg.sender}`,
      });
      curY += senderMeasure.height + 3;
    }

    // Message text
    const msgNode = await createMeasuredText({
      text: msg.text, fontSize: 16, fontWeight: 400,
      fontColor: C.textPri, parentId: screenId,
      x: textX, y: curY,
      maxWidth: maxTextW,
      name: `msg-${msg.time}-${msg.text.slice(0, 15)}`,
    });
    curY += msgNode.height + 2;

    // Timestamp
    const tsMeasure = await measureText({
      text: msg.time, fontSize: 12, fontWeight: 400,
      fontColor: C.textMuted,
    });
    await createText({
      text: msg.time, fontSize: 12, fontWeight: 400,
      fontColor: C.textMuted, parentId: screenId,
      x: textX, y: curY,
      name: `ts-${msg.time}`,
    });
    curY += tsMeasure.height + 2;

    lastSender = msg.sender;
  }

  log(`Messages built, ended at y=${curY}`);
  return curY;
}

// --- 5. Input Area ---
async function buildInputArea() {
  log("Building input area...");
  const inputY = H - 90;
  const areaH = 56;

  // Subtle top edge/separator
  const sep = await createRect({
    x: 0, y: inputY - 1, width: W, height: 1,
    name: "input-separator", parentId: screenId,
  });
  await setFillC(sep.id, C.white, 0.05);

  // Left glass circle — THREE VERTICAL DOTS (menu)
  const menuSize = 50;
  const menuX = 12;
  const menuCY = inputY + (areaH - menuSize) / 2;
  await buildGlassCircle({
    x: menuX, y: menuCY, size: menuSize,
    name: "menu-btn",
  });
  // Three vertical dots
  for (let i = 0; i < 3; i++) {
    const dotSize = 4;
    const dotX = menuX + (menuSize - dotSize) / 2;
    const dotY = menuCY + 13 + i * 8;
    const dot = await createRect({
      x: dotX, y: dotY, width: dotSize, height: dotSize,
      name: `menu-dot-${i}`, parentId: screenId,
    });
    await setFillC(dot.id, C.textMuted, 1);
    await setRadius(dot.id, dotSize / 2);
  }

  // "belo" hint text (Bumbbled font, muted purple, centered in input area)
  const beloHintMeasure = await measureText({
    text: "belo", fontSize: 20, fontWeight: 400,
    fontFamily: FONT_LOGO, fontColor: C.textMuted,
  });
  const hintAreaStart = menuX + menuSize + 8;
  const hintAreaEnd = W - menuSize - 20;
  const hintAreaCenter = (hintAreaStart + hintAreaEnd) / 2;
  await createText({
    text: "belo", fontSize: 20, fontWeight: 400,
    fontFamily: FONT_LOGO,
    fontColor: C.textMuted, parentId: screenId,
    x: hintAreaCenter - beloHintMeasure.width / 2 - 20,
    y: inputY + (areaH - beloHintMeasure.height) / 2,
    name: "input-hint-belo",
  });

  // "GIF" text label
  const gifMeasure = await measureText({
    text: "GIF", fontSize: 14, fontWeight: 700,
    fontColor: C.textMuted,
  });
  await createText({
    text: "GIF", fontSize: 14, fontWeight: 700,
    fontColor: C.textMuted, parentId: screenId,
    x: hintAreaEnd - gifMeasure.width - 10,
    y: inputY + (areaH - gifMeasure.height) / 2,
    name: "gif-label",
  });

  // Right glass circle — MICROPHONE
  const micSize = 50;
  const micX = W - micSize - 12;
  const micCY = inputY + (areaH - micSize) / 2;
  await buildGlassCircle({
    x: micX, y: micCY, size: micSize,
    name: "mic-btn",
  });
  // Microphone icon (pill shape + stand)
  const micW = 10;
  const micH = 16;
  const micIX = micX + (micSize - micW) / 2;
  const micIY = micCY + 10;
  const micPill = await createRect({
    x: micIX, y: micIY, width: micW, height: micH,
    name: "mic-pill", parentId: screenId,
  });
  await setFillC(micPill.id, C.textMuted, 1);
  await setRadius(micPill.id, micW / 2);

  // Mic stand (small vertical line + base)
  const standX = micX + micSize / 2 - 1;
  const standY = micIY + micH;
  const stand = await createRect({
    x: standX, y: standY, width: 2, height: 6,
    name: "mic-stand", parentId: screenId,
  });
  await setFillC(stand.id, C.textMuted, 1);

  const baseW = 10;
  const base = await createRect({
    x: standX - baseW / 2 + 1, y: standY + 5, width: baseW, height: 2,
    name: "mic-base", parentId: screenId,
  });
  await setFillC(base.id, C.textMuted, 1);
  await setRadius(base.id, 1);

  // Mic cup (arc around pill)
  const cupW = 16;
  const cupH = 20;
  const cup = await createRect({
    x: micIX - 3, y: micIY + 2, width: cupW, height: cupH,
    name: "mic-cup", parentId: screenId,
  });
  await setFillC(cup.id, C.black, 0);
  await setStroke(cup.id, { r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b, a: 0.6 }, 1.5);
  await setRadius(cup.id, cupW / 2);

  log("Input area built");
}

// --- 6. Home Indicator ---
async function buildHomeIndicator() {
  const indW = 134;
  const indH = 5;
  const ind = await createRect({
    x: (W - indW) / 2, y: H - 20,
    width: indW, height: indH,
    name: "home-indicator", parentId: screenId,
  });
  await setFillC(ind.id, C.white, 0.22);
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

    // Step 1: Phone frame + gradient
    await buildPhoneFrame();
    await sleep(300);

    // Step 2: Status bar
    await buildStatusBar();
    await sleep(300);

    // Step 3: Header (belo ball, buttons, name)
    const chatStartY = await buildHeader();
    await sleep(300);

    // Step 4: Messages
    await buildMessages(chatStartY);
    await sleep(300);

    // Step 5: Input area
    await buildInputArea();
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
        const outPath = path.join(__dirname, "screenshot-match.png");
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
