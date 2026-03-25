/**
 * Experiment 4: Flutter Code-Exact Figma Build
 *
 * Reads exact measurements from Flutter chat_screen.dart, message_bubble.dart,
 * chat_input.dart, and color_palette.dart to build a pixel-accurate Figma
 * recreation of the Balo chat screen (dark mode).
 *
 * Colors from BaloColors.dark:
 *   gradientCenter: 0xFF3C1749 → bg: 0xFF0C0415 (ChatBackground override)
 *   bubbleOutgoing: 0xFF6C2CA7
 *   bubbleIncoming: 0xFF2A1545
 *   bubbleTextOutgoing: 0xFFFFFFFF
 *   bubbleTextIncoming: 0xFFF0F6FC
 *   textPrimary: 0xFFF0F6FC
 *   textMuted: 0xFF9E8FB5
 *   accent: 0xFFBA82ED
 *   inputBackground: 0xFF251545
 *   iconPrimary: 0xFFD4B8FF
 *   iconSecondary: 0xFF9E8FB5
 */

import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

const WS_URL = "ws://localhost:3055";
const CHANNEL = "rkv91cy1";

// ── Color helpers ──────────────────────────────────────────────
function hex(color) {
  // color: 0xAARRGGBB → { r, g, b, a } in 0-1
  const a = ((color >> 24) & 0xff) / 255;
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return { r, g, b, a };
}

// ── Dark theme colors from BaloColors.dark ─────────────────────
const C = {
  bg:               hex(0xFF0C0415),   // ChatBackground dark override
  bubbleOut:        hex(0xFF6C2CA7),
  bubbleIn:         hex(0xFF2A1545),
  bubbleTextOut:    hex(0xFFFFFFFF),
  bubbleTextIn:     hex(0xFFF0F6FC),
  textPrimary:      hex(0xFFF0F6FC),
  textSecondary:    hex(0xFFD1C4E9),
  textMuted:        hex(0xFF9E8FB5),
  accent:           hex(0xFFBA82ED),
  accentSecondary:  hex(0xFFE879A8),
  inputBg:          hex(0xFF251545),
  iconPrimary:      hex(0xFFD4B8FF),
  iconSecondary:    hex(0xFF9E8FB5),
  success:          hex(0xFF5A9E7A),
  cardBg:           hex(0xFF1E1030),
  cardBorder:       hex(0x336C2CA7),
  divider:          hex(0x336C2CA7),
  shadow:           hex(0x406C2CA7),
  statusBar:        hex(0xFF0C0415),
  inputAreaBg:      hex(0xFF0C0415),
  inputBorderTop:   { r: 1, g: 1, b: 1, a: 0.08 },
};

// ── WebSocket + command infrastructure ─────────────────────────
let ws;
const pending = new Map();

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.on("open", () => {
      console.log("Connected to relay");
      resolve();
    });
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        // Handle join response: {type:"system", message:{id, result}}
        if (data.type === "system" && data.message?.id && pending.has(data.message.id)) {
          const { resolve: res } = pending.get(data.message.id);
          pending.delete(data.message.id);
          res(data.message.result || data.message);
          return;
        }
        // Handle broadcast response from Figma plugin: {type:"broadcast", message:{id, result}}
        if (data.type === "broadcast" && data.message?.id && pending.has(data.message.id)) {
          const { resolve: res } = pending.get(data.message.id);
          pending.delete(data.message.id);
          res(data.message.result || data.message);
          return;
        }
        // Fallback: direct id match
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
      reject(new Error(`Timeout: ${command}`));
    }, 30000);
    pending.set(id, { resolve: (v) => { clearTimeout(timeout); resolve(v); }, reject });
    ws.send(JSON.stringify(msg));
  });
}

async function join() {
  await send("join", { channel: CHANNEL });
  console.log(`Joined channel: ${CHANNEL}`);
}

// ── Figma helper wrappers ──────────────────────────────────────
async function createFrame(opts) {
  return send("create_frame", opts);
}

async function createRect(opts) {
  return send("create_rectangle", opts);
}

async function createText(opts) {
  return send("create_text", opts);
}

async function setFill(nodeId, color) {
  return send("set_fill_color", { nodeId, ...color });
}

async function setCornerRadius(nodeId, radius, corners) {
  const params = { nodeId, radius };
  if (corners) params.corners = corners;
  return send("set_corner_radius", params);
}

async function setLayout(nodeId, layoutMode, layoutWrap) {
  return send("set_layout_mode", { nodeId, layoutMode, layoutWrap: layoutWrap || "NO_WRAP" });
}

async function setPadding(nodeId, top, right, bottom, left) {
  return send("set_padding", { nodeId, top, right, bottom, left });
}

async function setItemSpacing(nodeId, spacing) {
  return send("set_item_spacing", { nodeId, spacing });
}

async function setAxisAlign(nodeId, primary, counter) {
  return send("set_axis_align", { nodeId, primaryAxisAlign: primary, counterAxisAlign: counter });
}

async function setSizing(nodeId, horizontal, vertical) {
  return send("set_layout_sizing", { nodeId, horizontal, vertical });
}

async function setStroke(nodeId, color, weight) {
  return send("set_stroke_color", { nodeId, ...color, weight });
}

async function moveNode(nodeId, x, y) {
  return send("move_node", { nodeId, x, y });
}

async function resizeNode(nodeId, width, height) {
  return send("resize_node", { nodeId, width, height });
}

function getId(result) {
  return result?.id || result?.nodeId || result?.node?.id;
}

// ── Build the chat screen ──────────────────────────────────────
async function buildChatScreen() {
  const X = 16100;
  const Y = 0;
  const W = 393;
  const H = 852;

  console.log("Creating main phone frame...");

  // ── 1. Main phone frame ──────────────────────────────────────
  const phoneFrame = await createFrame({
    x: X, y: Y, width: W, height: H,
    name: "Exp4: Code-Exact Build",
    fillColor: C.bg,
  });
  const phoneId = getId(phoneFrame);
  console.log(`Phone frame: ${phoneId}`);

  // ── 2. Status bar area (top 54px) ────────────────────────────
  const statusBar = await createFrame({
    x: 0, y: 0, width: W, height: 54,
    name: "Status Bar",
    parentId: phoneId,
    fillColor: C.bg,
  });
  const statusBarId = getId(statusBar);

  // Time text in status bar
  await createText({
    x: 21, y: 17, text: "9:41",
    fontSize: 15, fontWeight: 600,
    fontColor: C.textPrimary,
    name: "Time",
    parentId: statusBarId,
  });

  // ── 3. App Bar / DM Header (120px preferred height) ──────────
  // From _buildDmHeader: PreferredSize height=120, SafeArea, padding h:8
  const appBarY = 54;
  const appBarH = 120;
  const appBar = await createFrame({
    x: 0, y: appBarY, width: W, height: appBarH,
    name: "App Bar - DM Header",
    parentId: phoneId,
    fillColor: { ...C.bg, a: 0 }, // transparent
  });
  const appBarId = getId(appBar);

  // Back button (chevron_left) - Alignment(-1, -0.4)
  // buttonRowY = -0.4 maps to roughly y=36 in 120px
  const btnY = appBarY + 36;
  await createText({
    x: 8 + 8, y: btnY - 8, text: "<",
    fontSize: 28, fontWeight: 400,
    fontColor: C.textPrimary,
    name: "Back Button",
    parentId: appBarId,
  });

  // Phone icon - Alignment(-0.52, -0.4)
  const phoneIconX = Math.round(W * (0.5 - 0.52 * 0.5));
  await createRect({
    x: phoneIconX - 14, y: btnY - 14, width: 28, height: 28,
    name: "Call Button BG",
    parentId: appBarId,
  });
  const callBtn = await createText({
    x: phoneIconX - 6, y: btnY - 6, text: "P",
    fontSize: 16, fontWeight: 400,
    fontColor: C.textMuted,
    name: "Phone Icon",
    parentId: appBarId,
  });

  // Video icon - Alignment(0.52, -0.4)
  const videoIconX = Math.round(W * (0.5 + 0.52 * 0.5));
  await createText({
    x: videoIconX - 6, y: btnY - 6, text: "V",
    fontSize: 16, fontWeight: 400,
    fontColor: C.textMuted,
    name: "Video Icon",
    parentId: appBarId,
  });

  // Stack icon (far right) - Alignment(1, -0.4)
  await createText({
    x: W - 8 - 28, y: btnY - 8, text: "=",
    fontSize: 20, fontWeight: 400,
    fontColor: C.textPrimary,
    name: "Stack Icon",
    parentId: appBarId,
  });

  // Avatar circle (center, top) - avatarSize=54, avatarY=-1
  const avatarSize = 54;
  const avatarCX = W / 2;
  const avatarCY = appBarY + 0; // Alignment(0, -1) = top
  const avatar = await createRect({
    x: avatarCX - avatarSize / 2, y: avatarCY,
    width: avatarSize, height: avatarSize,
    name: "Avatar",
    parentId: appBarId,
  });
  const avatarId = getId(avatar);
  await setCornerRadius(avatarId, avatarSize / 2);
  await setFill(avatarId, hex(0xFF6C2CA7)); // avatar color

  // Avatar initials
  await createText({
    x: avatarCX - 10, y: avatarCY + 12, text: "KM",
    fontSize: 19, fontWeight: 600,
    fontColor: C.bubbleTextOut,
    name: "Avatar Initials",
    parentId: appBarId,
  });

  // Eclipse glow ring around avatar - ringSize = 54 * 0.94 = 50.76
  const glowSize = avatarSize * 1.65; // 89.1
  const glow = await createRect({
    x: avatarCX - glowSize / 2, y: avatarCY - (glowSize - avatarSize) / 2,
    width: glowSize, height: glowSize,
    name: "Avatar Glow",
    parentId: appBarId,
  });
  const glowId = getId(glow);
  await setCornerRadius(glowId, glowSize / 2);
  await setFill(glowId, { r: 0.608, g: 0.435, b: 0.831, a: 0.15 }); // 9B6FD4 15%

  // Display name below avatar (nameOverlap = 14px)
  const nameY = avatarCY + avatarSize - 14 + 20;
  await createText({
    x: avatarCX - 35, y: nameY, text: "Sarah",
    fontSize: 16, fontWeight: 500,
    fontColor: C.textPrimary,
    name: "Display Name",
    parentId: appBarId,
  });

  // ── 4. Message list area ─────────────────────────────────────
  const msgAreaY = appBarY + appBarH;
  const inputAreaH = 80;
  const msgAreaH = H - msgAreaY - inputAreaH;

  const msgArea = await createFrame({
    x: 0, y: msgAreaY, width: W, height: msgAreaH,
    name: "Message List",
    parentId: phoneId,
    fillColor: { ...C.bg, a: 0 },
  });
  const msgAreaId = getId(msgArea);

  // ── Sample messages (reversed order in Flutter ListView, but visually top-to-bottom) ──

  // --- Date separator ---
  const dateSepY = 16;
  const dateSep = await createRect({
    x: W / 2 - 50, y: dateSepY, width: 100, height: 28,
    name: "Date Separator",
    parentId: msgAreaId,
  });
  const dateSepId = getId(dateSep);
  await setCornerRadius(dateSepId, 14);
  await setFill(dateSepId, { ...C.cardBg, a: 0.6 });
  await createText({
    x: W / 2 - 30, y: dateSepY + 5, text: "Today",
    fontSize: 12, fontWeight: 500,
    fontColor: C.textMuted,
    name: "Date Label",
    parentId: msgAreaId,
  });

  // --- Incoming message 1 ---
  // From MessageBubble: padding left:16 (incoming), top:6(firstInGroup)
  // Container padding: h:14, v:10
  // borderRadius: topLeft:18, topRight:18, bottomLeft:4(lastInGroup), bottomRight:18
  const msg1Y = dateSepY + 28 + 16;
  const msg1W = 220;
  const msg1H = 58;
  const msg1 = await createRect({
    x: 16, y: msg1Y, width: msg1W, height: msg1H,
    name: "Incoming Bubble 1",
    parentId: msgAreaId,
  });
  const msg1Id = getId(msg1);
  await setFill(msg1Id, C.bubbleIn);
  // topLeft:18, topRight:18, bottomLeft:4, bottomRight:18
  await setCornerRadius(msg1Id, 18, [true, true, false, true]);
  // We can't set individual corners easily, so use 18 as default

  await createText({
    x: 16 + 14, y: msg1Y + 10, text: "Hey! How's the project going?",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextIn,
    name: "Message Text",
    parentId: msgAreaId,
  });

  // Time + status for incoming
  await createText({
    x: 16 + 14, y: msg1Y + msg1H - 20, text: "10:24",
    fontSize: 11, fontWeight: 400,
    fontColor: { ...C.bubbleTextIn, a: 0.6 },
    name: "Time",
    parentId: msgAreaId,
  });

  // --- Outgoing message 1 ---
  // padding right:16 (outgoing), left:60
  const msg2Y = msg1Y + msg1H + 12;
  const msg2W = 280;
  const msg2H = 78;
  const msg2 = await createRect({
    x: W - 16 - msg2W, y: msg2Y, width: msg2W, height: msg2H,
    name: "Outgoing Bubble 1",
    parentId: msgAreaId,
  });
  const msg2Id = getId(msg2);
  await setFill(msg2Id, C.bubbleOut);
  await setCornerRadius(msg2Id, 18);

  await createText({
    x: W - 16 - msg2W + 14, y: msg2Y + 10,
    text: "Going great! Just finished the\nchat screen redesign",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextOut,
    name: "Message Text",
    parentId: msgAreaId,
  });

  // Time + read receipt (double check in green)
  await createText({
    x: W - 16 - 14 - 50, y: msg2Y + msg2H - 20, text: "10:25  \u2713\u2713",
    fontSize: 11, fontWeight: 400,
    fontColor: C.success,
    name: "Time + Read",
    parentId: msgAreaId,
  });

  // --- Incoming message 2 ---
  const msg3Y = msg2Y + msg2H + 12;
  const msg3W = 180;
  const msg3H = 58;
  const msg3 = await createRect({
    x: 16, y: msg3Y, width: msg3W, height: msg3H,
    name: "Incoming Bubble 2",
    parentId: msgAreaId,
  });
  const msg3Id = getId(msg3);
  await setFill(msg3Id, C.bubbleIn);
  await setCornerRadius(msg3Id, 18);

  await createText({
    x: 16 + 14, y: msg3Y + 10, text: "That's awesome! \u{1F44D}",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextIn,
    name: "Message Text",
    parentId: msgAreaId,
  });

  await createText({
    x: 16 + 14, y: msg3Y + msg3H - 20, text: "10:26",
    fontSize: 11, fontWeight: 400,
    fontColor: { ...C.bubbleTextIn, a: 0.6 },
    name: "Time",
    parentId: msgAreaId,
  });

  // --- Outgoing message 2 ---
  const msg4Y = msg3Y + msg3H + 12;
  const msg4W = 260;
  const msg4H = 78;
  const msg4 = await createRect({
    x: W - 16 - msg4W, y: msg4Y, width: msg4W, height: msg4H,
    name: "Outgoing Bubble 2",
    parentId: msgAreaId,
  });
  const msg4Id = getId(msg4);
  await setFill(msg4Id, C.bubbleOut);
  await setCornerRadius(msg4Id, 18);

  await createText({
    x: W - 16 - msg4W + 14, y: msg4Y + 10,
    text: "Thanks! The dark purple theme\nlooks really clean",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextOut,
    name: "Message Text",
    parentId: msgAreaId,
  });

  await createText({
    x: W - 16 - 14 - 50, y: msg4Y + msg4H - 20, text: "10:27  \u2713\u2713",
    fontSize: 11, fontWeight: 400,
    fontColor: C.success,
    name: "Time + Read",
    parentId: msgAreaId,
  });

  // --- Incoming message 3 ---
  const msg5Y = msg4Y + msg4H + 12;
  const msg5W = 240;
  const msg5H = 78;
  const msg5 = await createRect({
    x: 16, y: msg5Y, width: msg5W, height: msg5H,
    name: "Incoming Bubble 3",
    parentId: msgAreaId,
  });
  const msg5Id = getId(msg5);
  await setFill(msg5Id, C.bubbleIn);
  await setCornerRadius(msg5Id, 18);

  await createText({
    x: 16 + 14, y: msg5Y + 10,
    text: "Can you share the color\npalette with me?",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextIn,
    name: "Message Text",
    parentId: msgAreaId,
  });

  await createText({
    x: 16 + 14, y: msg5Y + msg5H - 20, text: "10:28",
    fontSize: 11, fontWeight: 400,
    fontColor: { ...C.bubbleTextIn, a: 0.6 },
    name: "Time",
    parentId: msgAreaId,
  });

  // --- Outgoing message 3 (last, with tail) ---
  const msg6Y = msg5Y + msg5H + 12;
  const msg6W = 200;
  const msg6H = 58;
  const msg6 = await createRect({
    x: W - 16 - msg6W, y: msg6Y, width: msg6W, height: msg6H,
    name: "Outgoing Bubble 3",
    parentId: msgAreaId,
  });
  const msg6Id = getId(msg6);
  await setFill(msg6Id, C.bubbleOut);
  // lastInGroup: bottomRight = 4
  await setCornerRadius(msg6Id, 18);

  await createText({
    x: W - 16 - msg6W + 14, y: msg6Y + 10,
    text: "Sure, sending now!",
    fontSize: 15, fontWeight: 400,
    fontColor: C.bubbleTextOut,
    name: "Message Text",
    parentId: msgAreaId,
  });

  await createText({
    x: W - 16 - 14 - 50, y: msg6Y + msg6H - 20, text: "10:30  \u2713",
    fontSize: 11, fontWeight: 400,
    fontColor: { ...C.bubbleTextOut, a: 0.6 },
    name: "Time + Sent",
    parentId: msgAreaId,
  });

  // ── 5. Input area ────────────────────────────────────────────
  // From _buildInputArea:
  //   inputBgColor = isDark ? 0xFF0C0415 : 0xFFF2EEF8
  //   border top: white 8% opacity, 0.5px
  //   borderRadius: top 24, bottom 28 (keyboard closed)
  //   Contains: snap button (circle 44px, accent border 2.5px), text field (rounded 24, inputBg), attachment icon

  const inputY = H - inputAreaH;
  const inputArea = await createFrame({
    x: 0, y: inputY, width: W, height: inputAreaH,
    name: "Input Area",
    parentId: phoneId,
    fillColor: C.inputAreaBg,
  });
  const inputAreaId = getId(inputArea);

  // Top border line (white 8%)
  const borderLine = await createRect({
    x: 0, y: 0, width: W, height: 0.5,
    name: "Top Border",
    parentId: inputAreaId,
  });
  await setFill(getId(borderLine), C.inputBorderTop);

  // Snap/Circle button - ChatInput: Container 44x44, circle, border accent 2.5px
  // padding: h:12, v:8 → button at x:12, y:8 from input area
  const snapBtnX = 12;
  const snapBtnY = 18; // centered in 80px height: (80 - 44) / 2
  const snapBtn = await createRect({
    x: snapBtnX, y: snapBtnY, width: 44, height: 44,
    name: "Snap Button",
    parentId: inputAreaId,
  });
  const snapBtnId = getId(snapBtn);
  await setCornerRadius(snapBtnId, 22);
  await setFill(snapBtnId, { ...C.bg, a: 0 }); // transparent
  await setStroke(snapBtnId, C.accent, 2.5);

  // Camera icon in snap button
  await createText({
    x: snapBtnX + 12, y: snapBtnY + 12, text: "\u{1F4F7}",
    fontSize: 16, fontWeight: 400,
    fontColor: C.accent,
    name: "Camera Icon",
    parentId: inputAreaId,
  });

  // Text field - Expanded, borderRadius:24, color: inputBackground (0xFF251545)
  // padding h:16 inside
  const tfX = snapBtnX + 44 + 8; // SizedBox width:8 after snap
  const tfW = W - tfX - 8 - 40 - 12; // minus attachment button area
  const tfH = 44;
  const tfY = snapBtnY;
  const textField = await createRect({
    x: tfX, y: tfY, width: tfW, height: tfH,
    name: "Text Field",
    parentId: inputAreaId,
  });
  const tfId = getId(textField);
  await setCornerRadius(tfId, 24);
  await setFill(tfId, C.inputBg);

  // Hint text "Type with joy..."
  await createText({
    x: tfX + 16, y: tfY + 12, text: "Type with joy...",
    fontSize: 14, fontWeight: 400,
    fontColor: C.textMuted,
    name: "Hint Text",
    parentId: inputAreaId,
  });

  // Attachment button (right side) - IconButton attach_file
  const attachX = tfX + tfW + 8;
  await createText({
    x: attachX, y: snapBtnY + 10, text: "\u{1F4CE}",
    fontSize: 20, fontWeight: 400,
    fontColor: C.iconSecondary,
    name: "Attachment Icon",
    parentId: inputAreaId,
  });

  // ── 6. Home indicator bar ────────────────────────────────────
  const homeBar = await createRect({
    x: W / 2 - 67, y: H - 8, width: 134, height: 5,
    name: "Home Indicator",
    parentId: phoneId,
  });
  const homeBarId = getId(homeBar);
  await setCornerRadius(homeBarId, 2.5);
  await setFill(homeBarId, { ...C.textPrimary, a: 0.3 });

  console.log("Chat screen built successfully!");
  return phoneId;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  try {
    await connect();
    await join();

    console.log("\n=== Building Exp4: Code-Exact Figma Chat Screen ===\n");
    const phoneId = await buildChatScreen();

    console.log(`\nDone! Frame ID: ${phoneId}`);
    console.log("Position: (16100, 0), Size: 393x852");
    console.log("Check Figma for the result.");

    // Close connection
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2000);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
