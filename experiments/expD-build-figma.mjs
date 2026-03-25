/**
 * ExpD Phase 3: Build the chat screen in Figma using extracted HTML measurements.
 * Places at (18500, 0), named "ExpD: HTML-Traced"
 *
 * Usage: node experiments/expD-build-figma.mjs
 */
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(__dirname, "expD-measurements.json"), "utf-8"));

const WS_URL = "ws://localhost:3055";
const CHANNEL = "rkv91cy1"; // Active channel with Figma plugin

// ── Colors (BaloColors.dark) ──
function hex(color) {
  const a = ((color >> 24) & 0xff) / 255;
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return { r, g, b, a };
}

const C = {
  bg:           hex(0xFF0C0415),
  gradCenter:   hex(0xFF3C1749),
  gradMiddle:   hex(0xFF4F2C5A),
  gradOuter:    hex(0xFF1A0D2E),
  textPrimary:  hex(0xFFF0F6FC),
  textMuted:    hex(0xFF9E8FB5),
  inputBg:      hex(0xFF251545),
  accent:       hex(0xFFBA82ED),
  success:      hex(0xFF5A9E7A),
  glow:         hex(0xFF9B6FD4),
  iconPrimary:  hex(0xFFD4B8FF),
  white:        { r: 1, g: 1, b: 1, a: 1 },
  black:        { r: 0, g: 0, b: 0, a: 1 },
  avatarBg:     hex(0xFF1A0A2E),
  glassDark:    hex(0xFF0C0415),
  onlineDot:    hex(0xFF34D399),
  cardBg:       hex(0xFF1E1030),
  inputBorder:  { r: 1, g: 1, b: 1, a: 0.08 },
};

// ── WebSocket ──
let ws;
const pending = new Map();

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.on("open", () => {
      console.log("[ExpD] Connected");
      resolve();
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "system" && data.message?.id && pending.has(data.message.id)) {
          const { resolve: res } = pending.get(data.message.id);
          pending.delete(data.message.id);
          res(data.message.result || data.message);
          return;
        }
        if (data.type === "broadcast" && data.message?.id && pending.has(data.message.id)) {
          const { resolve: res } = pending.get(data.message.id);
          pending.delete(data.message.id);
          res(data.message.result || data.message);
          return;
        }
        if (data.id && pending.has(data.id)) {
          const { resolve: res } = pending.get(data.id);
          pending.delete(data.id);
          res(data.result || data);
        }
      } catch {}
    });
    ws.on("error", reject);
  });
}

function send(command, params = {}) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const msg = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join" ? { channel: params.channel } : { channel: CHANNEL }),
      message: { id, command, params: { ...params, commandId: id } },
    };
    const timeout = setTimeout(() => {
      pending.delete(id);
      console.warn(`[ExpD] Timeout: ${command}`);
      resolve(null);
    }, 20000);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timeout); resolve(v); },
      reject
    });
    ws.send(JSON.stringify(msg));
  });
}

function getId(result) {
  return result?.id || result?.nodeId || result?.node?.id;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Figma helpers ──
async function createFrame(opts) { return send("create_frame", opts); }
async function createRect(opts) { return send("create_rectangle", opts); }
async function createEllipseShape(opts) { return send("create_ellipse", opts); }
async function createText(opts) { return send("create_text", opts); }
async function setFill(nodeId, color) { return send("set_fill_color", { nodeId, ...color }); }
async function setCornerRadius(nodeId, radius) { return send("set_corner_radius", { nodeId, radius }); }
async function resizeNode(nodeId, width, height) { return send("resize_node", { nodeId, width, height }); }
async function setOpacity(nodeId, opacity) { return send("set_opacity", { nodeId, opacity }); }

async function rect(name, x, y, w, h, color, parentId, cornerRadius) {
  const r = await createRect({ name, x, y, width: w, height: h, parentId });
  const id = getId(r);
  if (id && color) await setFill(id, color);
  if (id && cornerRadius) await setCornerRadius(id, cornerRadius);
  return id;
}

async function ellipse(name, x, y, w, h, color, parentId) {
  const r = await createEllipseShape({ name, x, y, width: w, height: h, parentId });
  const id = getId(r);
  if (id && color) await setFill(id, color);
  return id;
}

async function text(name, x, y, content, fontSize, color, parentId, fontWeight) {
  const r = await createText({
    name, x, y, text: content, fontSize,
    fontFamily: "Inter", fontWeight: fontWeight || 400,
    fontColor: color, parentId,
  });
  return getId(r);
}

// ── Placement ──
const X = 18500;
const Y = 0;
const W = 393;
const H = 852;

// Messages
const messages = [
  { id: 'msg1', text: 'Hey, how are you doing? \u{1F60A}', isMe: false, time: '10:30', status: null, firstInGroup: true, lastInGroup: true },
  { id: 'msg2', text: "I'm great! Just finished that project we discussed last week", isMe: true, time: '10:31', status: 'read', firstInGroup: true, lastInGroup: false },
  { id: 'msg3', text: 'It turned out really well!', isMe: true, time: '10:31', status: 'read', firstInGroup: false, lastInGroup: true },
  { id: 'msg4', text: "That's amazing! Can you share some screenshots?", isMe: false, time: '10:33', status: null, firstInGroup: true, lastInGroup: true },
  { id: 'msg5', text: 'Sure! Let me send them over. The design system is looking really clean now with the dark mode', isMe: true, time: '10:34', status: 'read', firstInGroup: true, lastInGroup: true },
  { id: 'msg6', text: 'I love the purple gradient!', isMe: false, time: '10:35', status: null, firstInGroup: true, lastInGroup: false },
  { id: 'msg7', text: 'The glass effects are so elegant \u{2728}', isMe: false, time: '10:35', status: null, firstInGroup: false, lastInGroup: true },
  { id: 'msg8', text: 'Thanks! The cosmic theme really ties it all together', isMe: true, time: '10:36', status: 'delivered', firstInGroup: true, lastInGroup: true },
  { id: 'msg9', text: "Can't wait to see the final version! When do you think it'll be ready?", isMe: false, time: '10:38', status: null, firstInGroup: true, lastInGroup: true },
];

async function buildGlassOrb(parentId, prefix, cx, cy, ringSize, glowColor, glowOpacity) {
  const glowSize = ringSize * 1.65;
  const glowClr = { ...glowColor, a: glowOpacity || 0.25 };
  const glassClr = { ...C.glassDark, a: 0.85 };
  await ellipse(`${prefix}-glow`, cx - glowSize/2, cy - glowSize/2, glowSize, glowSize, glowClr, parentId);
  await ellipse(`${prefix}-ring`, cx - ringSize/2, cy - ringSize/2, ringSize, ringSize, glassClr, parentId);
}

async function main() {
  console.log("[ExpD] Starting Figma build...");
  await connect();

  // Join channel
  await send("join", { channel: CHANNEL });
  console.log(`[ExpD] Joined ${CHANNEL}`);
  await delay(500);

  // ── Main frame ──
  console.log("[ExpD] Creating frame...");
  const phoneFrame = await createFrame({
    x: X, y: Y, width: W, height: H,
    name: "ExpD: HTML-Traced",
    fillColor: C.bg,
  });
  const phoneId = getId(phoneFrame);
  console.log(`[ExpD] Frame: ${phoneId}`);
  if (!phoneId) { console.error("Frame creation failed!"); process.exit(1); }

  // ── Background gradient simulation ──
  console.log("[ExpD] Background...");
  await ellipse("grad-center", W/2 - 150, 30, 300, 250, { ...C.gradCenter, a: 0.7 }, phoneId);
  await ellipse("grad-middle", W/2 - 220, 80, 440, 400, { ...C.gradMiddle, a: 0.3 }, phoneId);

  // ── Status bar ──
  console.log("[ExpD] Status bar...");
  await text("time", 30, 17, "9:41", 15, C.textPrimary, phoneId, 600);
  await rect("dynamic-island", (W - 126)/2, 14, 126, 37, C.black, phoneId, 22);

  // ── DM Header ──
  console.log("[ExpD] Header...");
  // Back chevron
  await text("back-chevron", M.backBtn.x + 12, M.backBtn.y + 10, "\u2039", 28, C.textPrimary, phoneId, 300);

  // Audio call glass orb
  const audioCx = M.audioCallBtn.x + M.audioCallBtn.width/2;
  const audioCy = M.audioCallBtn.y + M.audioCallBtn.height/2;
  await buildGlassOrb(phoneId, "audio-call", audioCx, audioCy, 34, C.glow, 0.18);
  await text("audio-icon", audioCx - 5, audioCy - 7, "\u260E", 14, { ...C.white, a: 0.82 }, phoneId, 400);

  // Video call glass orb
  const videoCx = M.videoCallBtn.x + M.videoCallBtn.width/2;
  const videoCy = M.videoCallBtn.y + M.videoCallBtn.height/2;
  await buildGlassOrb(phoneId, "video-call", videoCx, videoCy, 34, C.glow, 0.18);
  await text("video-icon", videoCx - 6, videoCy - 7, "\u{1F4F9}", 13, { ...C.white, a: 0.82 }, phoneId, 400);

  // Stack icon
  await text("stack-icon", M.stackBtn.x + 14, M.stackBtn.y + 14, "\u25A1\u25A1", 16, C.textPrimary, phoneId, 400);

  // Avatar eclipse glow layers
  const avatarCx = M.headerCenter.x + M.headerCenter.width/2;
  const avatarTopY = M.headerCenter.y;

  // Glow (89px)
  await ellipse("avatar-glow", avatarCx - 44.5, avatarTopY - 5, 89, 89, { ...C.glow, a: 0.3 }, phoneId);
  // Frosted ring (51px)
  await ellipse("avatar-ring", avatarCx - 25.5, avatarTopY + 14, 51, 51, { ...C.glassDark, a: 0.85 }, phoneId);
  // Avatar circle (54px)
  const avX = M.avatarImg.x - 4;
  const avY = M.avatarImg.y;
  await ellipse("avatar-bg", avX, avY, 54, 54, C.avatarBg, phoneId);
  await text("avatar-letter", avX + 18, avY + 14, "E", 20, C.white, phoneId, 700);
  // Online dot
  await ellipse("online-dot", avX + 40, avY + 40, 12, 12, C.onlineDot, phoneId);

  // Name "Elena"
  await text("header-name", M.headerName.x, M.headerName.y, "Elena", 18, C.textPrimary, phoneId, 700);

  // ── Date separator ──
  console.log("[ExpD] Date separator...");
  await text("date-sep", W/2 - 18, M.messagesArea.y + 12, "Today", 12, C.textMuted, phoneId, 500);

  // ── Messages (PLAIN TEXT - no bubble backgrounds) ──
  console.log("[ExpD] Messages...");
  for (const msg of messages) {
    const mRect = M[msg.id];
    if (!mRect) { console.warn(`No measurement for ${msg.id}`); continue; }

    const maxW = Math.round(W * 0.75);
    const approxCharW = 7.2;
    const lineCount = Math.max(1, Math.ceil(msg.text.length * approxCharW / maxW));
    const textW = lineCount > 1 ? maxW : Math.min(msg.text.length * approxCharW, maxW);
    const textH = lineCount * 21;

    const textX = msg.isMe ? (W - 16 - textW) : 16;
    const textY = mRect.y;

    // Message text - PLAIN, NO BACKGROUND
    const tId = await text(`${msg.id}-text`, textX, textY, msg.text, 15, C.textPrimary, phoneId, 400);

    // Resize text for wrapping
    if (tId) {
      try { await resizeNode(tId, Math.round(textW), textH); } catch {}
    }

    // Timestamp
    const timeY = textY + textH + 2;
    const timeX = msg.isMe ? (W - 16 - 35) : textX;
    await text(`${msg.id}-time`, timeX, timeY, msg.time, 11, C.textMuted, phoneId, 400);

    // Read receipt
    if (msg.isMe && msg.status) {
      const receiptClr = msg.status === "read" ? C.success : C.textMuted;
      await text(`${msg.id}-receipt`, timeX + 38, timeY, "\u2713\u2713", 11, receiptClr, phoneId, 400);
    }

    await delay(30);
  }

  // ── Input area ──
  console.log("[ExpD] Input area...");
  const inputY = M.inputArea.y;

  // Top border
  await rect("input-border", 0, inputY, W, 0.5, C.inputBorder, phoneId, 0);

  // Glass ball (left)
  const ballCx = M.glassBall.x + M.glassBall.width/2;
  const ballCy = M.glassBall.y + M.glassBall.height/2;
  await buildGlassOrb(phoneId, "ball", ballCx, ballCy, 41, C.glow, 0.35);
  // 3 dots
  for (let i = 0; i < 3; i++) {
    await ellipse(`ball-dot-${i}`, ballCx - 1.75, ballCy - 7 + i * 6.5, 3.5, 3.5, { ...C.white, a: 0.55 }, phoneId);
  }

  // "belo" hint text
  const tfX = M.textField.x;
  const tfY = M.textField.y;
  await text("belo-hint", tfX + 2, tfY + 16, "belo", 20, { r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b, a: 0.18 }, phoneId, 400);

  // Voice button (right)
  const voiceCx = M.voiceBtn.x + M.voiceBtn.width/2;
  const voiceCy = M.voiceBtn.y + M.voiceBtn.height/2;
  await buildGlassOrb(phoneId, "voice", voiceCx, voiceCy, 38, C.glow, 0.12);
  await text("voice-icon", voiceCx - 6, voiceCy - 8, "\u{1F399}", 14, { ...C.white, a: 0.82 }, phoneId, 400);

  // ── Top gradient fade ──
  console.log("[ExpD] Top fade...");
  await rect("top-fade", 0, 59, W, 140, { ...C.bg, a: 0.6 }, phoneId, 0);

  console.log("[ExpD] BUILD COMPLETE!");

  // ── Write log ──
  const logContent = `# ExpD: HTML-Traced Chat Screen - Build Log

## Approach
Created an HTML simulation of the dev branch chat screen at exact 393x852 viewport,
extracted pixel measurements via Puppeteer, then built in Figma using those measurements.

## Placement
- Frame: "ExpD: HTML-Traced" at (${X}, ${Y})
- Size: ${W}x${H}px

## Key Design Decisions
- Messages: PLAIN TEXT, NO colored bubble backgrounds (per dev branch _GioiaMessageBubble code)
- Text color: #F0F6FC (textPrimary) for BOTH incoming AND outgoing
- Timestamps: 11px, #9E8FB5 (textMuted)
- Read receipts: green (#5A9E7A) for read, muted (#9E8FB5) for delivered
- Header: eclipse glow avatar (54px, glass ring 51px, glow 89px), call glass orbs (34px ring)
- Input: glass ball with 3 dots (left, 41px ring), "belo" hint (20px, 18% opacity), voice orb (right, 38px ring)
- Background: radial gradient simulation with overlapping ellipses

## Extracted HTML Measurements
| Element | x | y | w | h |
|---------|---|---|---|---|
| Status bar | 0 | 0 | 393 | 59 |
| Header | 0 | 59 | 393 | 120 |
| Back btn | ${M.backBtn.x} | ${M.backBtn.y} | ${M.backBtn.width} | ${M.backBtn.height} |
| Audio call | ${M.audioCallBtn.x} | ${M.audioCallBtn.y} | ${M.audioCallBtn.width} | ${M.audioCallBtn.height} |
| Video call | ${M.videoCallBtn.x} | ${M.videoCallBtn.y} | ${M.videoCallBtn.width} | ${M.videoCallBtn.height} |
| Stack btn | ${M.stackBtn.x} | ${M.stackBtn.y} | ${M.stackBtn.width} | ${M.stackBtn.height} |
| Avatar | ${M.avatarImg.x} | ${M.avatarImg.y} | ${M.avatarImg.width} | ${M.avatarImg.height} |
| Header name | ${M.headerName.x} | ${M.headerName.y} | ${M.headerName.width} | ${M.headerName.height} |
| Messages | ${M.messagesArea.x} | ${M.messagesArea.y} | ${M.messagesArea.width} | ${M.messagesArea.height} |
| Input area | ${M.inputArea.x} | ${M.inputArea.y} | ${M.inputArea.width} | ${M.inputArea.height} |
| Glass ball | ${M.glassBall.x} | ${M.glassBall.y} | ${M.glassBall.width} | ${M.glassBall.height} |
| Text field | ${M.textField.x} | ${M.textField.y} | ${M.textField.width} | ${M.textField.height} |
| Voice btn | ${M.voiceBtn.x} | ${M.voiceBtn.y} | ${M.voiceBtn.width} | ${M.voiceBtn.height} |

## Colors (BaloColors.dark)
| Token | Hex |
|-------|-----|
| bg | #0C0415 |
| textPrimary | #F0F6FC |
| textMuted | #9E8FB5 |
| success | #5A9E7A |
| gradientCenter | #3C1749 |
| gradientMiddle | #4F2C5A |
| gradientOuter | #1A0D2E |
| glow | #9B6FD4 |
| onlineDot | #34D399 |
| avatarBg | #1A0A2E |

## Date
${new Date().toISOString().split("T")[0]}
`;
  fs.writeFileSync(path.join(__dirname, "expD-log.md"), logContent);
  console.log("[ExpD] Log saved to expD-log.md");

  ws.close();
  process.exit(0);
}

main().catch(err => {
  console.error("[ExpD] Fatal:", err);
  process.exit(1);
});
