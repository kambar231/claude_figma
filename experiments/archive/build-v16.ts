/**
 * Build Belo Group Chat Screen v1.6 in Figma
 * Connects directly to WebSocket relay and sends commands to the Figma plugin
 */

const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_X = 23000;
const FRAME_Y = 0;
const SCREEN_W = 393;
const SCREEN_H = 852;

// Track created node IDs
const nodeIds: Record<string, string> = {};

// Pending requests
const pendingRequests = new Map<
  string,
  { resolve: (v: any) => void; reject: (e: any) => void }
>();

let ws: any;

function uuid(): string {
  return crypto.randomUUID();
}

function connectAndJoin(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      console.log("Connected to relay");
      // Join channel
      const id = uuid();
      ws.send(JSON.stringify({ id, type: "join", channel: CHANNEL }));
      setTimeout(resolve, 500); // give time to join
    };
    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : event.data.toString()
        );
        // Check for response to our command
        if (data.message && data.message.id && pendingRequests.has(data.message.id)) {
          const req = pendingRequests.get(data.message.id)!;
          pendingRequests.delete(data.message.id);
          if (data.message.error) {
            req.reject(new Error(data.message.error));
          } else {
            req.resolve(data.message.result || data.message);
          }
        } else if (data.id && pendingRequests.has(data.id)) {
          const req = pendingRequests.get(data.id)!;
          pendingRequests.delete(data.id);
          req.resolve(data);
        }
      } catch (e) {
        // ignore parse errors
      }
    };
    ws.onerror = (e: any) => reject(e);
  });
}

function sendCommand(command: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = uuid();
    const request = {
      id,
      type: "message",
      channel: CHANNEL,
      message: {
        id,
        command,
        params: { ...params, commandId: id },
      },
    };
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Timeout: ${command}`));
    }, 30000);
    pendingRequests.set(id, {
      resolve: (v: any) => {
        clearTimeout(timeout);
        resolve(v);
      },
      reject: (e: any) => {
        clearTimeout(timeout);
        reject(e);
      },
    });
    ws.send(JSON.stringify(request));
  });
}

// Helper functions
async function createFrame(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  parentId?: string,
  fillColor?: { r: number; g: number; b: number; a: number }
): Promise<string> {
  const params: any = { x, y, width: w, height: h, name };
  if (parentId) params.parentId = parentId;
  if (fillColor) params.fillColor = fillColor;
  const result = await sendCommand("create_frame", params);
  const id = result.id || result.nodeId;
  console.log(`  Created frame "${name}" -> ${id}`);
  return id;
}

async function createRect(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  parentId?: string
): Promise<string> {
  const params: any = { x, y, width: w, height: h, name };
  if (parentId) params.parentId = parentId;
  const result = await sendCommand("create_rectangle", params);
  const id = result.id || result.nodeId;
  console.log(`  Created rect "${name}" -> ${id}`);
  return id;
}

async function createText(
  name: string,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  fontWeight: number,
  color: { r: number; g: number; b: number; a: number },
  parentId?: string
): Promise<string> {
  const params: any = {
    x,
    y,
    text,
    fontSize,
    fontWeight,
    fontColor: color,
    name,
  };
  if (parentId) params.parentId = parentId;
  const result = await sendCommand("create_text", params);
  const id = result.id || result.nodeId;
  console.log(`  Created text "${name}" -> ${id}`);
  return id;
}

async function setFillColor(
  nodeId: string,
  r: number,
  g: number,
  b: number,
  a: number
): Promise<void> {
  await sendCommand("set_fill_color", { nodeId, r, g, b, a });
}

async function setFillGradient(
  nodeId: string,
  gradientType: string,
  stops: Array<{
    r: number;
    g: number;
    b: number;
    a: number;
    position: number;
  }>,
  handlePositions?: Array<{ x: number; y: number }>,
  opacity?: number
): Promise<void> {
  const params: any = { nodeId, gradientType, gradientStops: stops };
  if (handlePositions) params.gradientHandlePositions = handlePositions;
  if (opacity !== undefined) params.opacity = opacity;
  await sendCommand("set_fill_gradient", params);
}

async function setCornerRadius(
  nodeId: string,
  radius: number
): Promise<void> {
  await sendCommand("set_corner_radius", { nodeId, radius });
}

async function moveNode(
  nodeId: string,
  x: number,
  y: number
): Promise<void> {
  await sendCommand("move_node", { nodeId, x, y });
}

async function resizeNode(
  nodeId: string,
  width: number,
  height: number
): Promise<void> {
  await sendCommand("resize_node", { nodeId, width, height });
}

async function setStrokeColor(
  nodeId: string,
  r: number,
  g: number,
  b: number,
  a: number,
  weight: number
): Promise<void> {
  await sendCommand("set_stroke_color", {
    nodeId,
    color: { r, g, b, a },
    weight,
  });
}

async function getNodeInfo(nodeId: string): Promise<any> {
  return await sendCommand("get_node_info", { nodeId });
}

async function deleteNode(nodeId: string): Promise<void> {
  await sendCommand("delete_node", { nodeId });
}

async function exportImage(nodeId: string, fileName: string): Promise<any> {
  return await sendCommand("export_node_as_image", {
    nodeId,
    format: "PNG",
    scale: 2,
    fileName,
  });
}

// Color constants
const COLORS = {
  romanOG: { r: 0.91, g: 0.49, b: 0.49, a: 1 }, // #E87D7D coral
  enisDev: { r: 0.37, g: 0.77, b: 0.71, a: 1 }, // #5EC4B6 teal
  saeedSharifi: { r: 0.7, g: 0.62, b: 0.86, a: 1 }, // #B39DDB light purple
  romanDev: { r: 0.91, g: 0.49, b: 0.49, a: 1 }, // #E87D7D coral
  messageText: { r: 0.94, g: 0.96, b: 0.99, a: 1 }, // #F0F6FC white
  timestamp: { r: 0.62, g: 0.56, b: 0.71, a: 1 }, // #9E8FB5 muted purple
  white70: { r: 1, g: 1, b: 1, a: 0.7 },
  white50: { r: 1, g: 1, b: 1, a: 0.5 },
  white30: { r: 1, g: 1, b: 1, a: 0.3 },
  mutedPurple: { r: 0.55, g: 0.45, b: 0.65, a: 0.6 },
  greenBadge: { r: 0.2, g: 0.8, b: 0.35, a: 1 },
};

// ============= BUILD THE SCREEN =============

async function build() {
  console.log("Building v1.6 at position", FRAME_X, FRAME_Y);

  // 1. Main frame
  console.log("\n--- Main Frame ---");
  const mainFrame = await createFrame(
    "Belo Chat v1.6",
    FRAME_X,
    FRAME_Y,
    SCREEN_W,
    SCREEN_H,
    undefined,
    { r: 0.05, g: 0.02, b: 0.1, a: 1 }
  );
  await setCornerRadius(mainFrame, 50);

  // 2. Background gradient - warmer pinkish-purple
  console.log("\n--- Background Gradient ---");
  const bgRect = await createRect("bg-gradient", 0, 0, SCREEN_W, SCREEN_H, mainFrame);
  await setFillGradient(bgRect, "GRADIENT_RADIAL", [
    { r: 0.45, g: 0.15, b: 0.45, a: 1, position: 0 },      // warm pinkish-purple center
    { r: 0.3, g: 0.08, b: 0.35, a: 1, position: 0.35 },     // mid purple
    { r: 0.15, g: 0.04, b: 0.22, a: 1, position: 0.6 },     // darker purple
    { r: 0.06, g: 0.02, b: 0.1, a: 1, position: 0.85 },     // very dark
    { r: 0.03, g: 0.01, b: 0.06, a: 1, position: 1 },       // almost black edges
  ], [
    { x: 0.5, y: 0.35 },   // center slightly above middle for warm glow
    { x: 1.1, y: 0.35 },   // wider x spread
    { x: 0.5, y: 1.0 },    // y extends to bottom
  ]);
  await setCornerRadius(bgRect, 50);

  // Secondary warm glow overlay
  const warmGlow = await createRect("warm-glow", 0, 0, SCREEN_W, SCREEN_H, mainFrame);
  await setFillGradient(warmGlow, "GRADIENT_RADIAL", [
    { r: 0.5, g: 0.2, b: 0.4, a: 0.3, position: 0 },       // warm pink center
    { r: 0.35, g: 0.1, b: 0.3, a: 0.15, position: 0.4 },    // fading
    { r: 0, g: 0, b: 0, a: 0, position: 0.7 },               // transparent
  ], [
    { x: 0.5, y: 0.3 },
    { x: 0.9, y: 0.3 },
    { x: 0.5, y: 0.8 },
  ]);
  await setCornerRadius(warmGlow, 50);

  // 3. Status bar
  console.log("\n--- Status Bar ---");
  const timeText = await createText(
    "status-time",
    24, 16,
    "2:32",
    15, 600,
    { r: 1, g: 1, b: 1, a: 1 },
    mainFrame
  );

  // Signal/battery icons (simplified text)
  const statusIcons = await createText(
    "status-icons",
    320, 16,
    "\u2759\u2759\u2759 \u25CF",
    12, 400,
    { r: 1, g: 1, b: 1, a: 1 },
    mainFrame
  );

  // 4. Header section
  console.log("\n--- Header ---");

  // Back arrow
  const backArrow = await createText(
    "back-arrow",
    16, 56,
    "\u2039",
    28, 300,
    { r: 1, g: 1, b: 1, a: 0.9 },
    mainFrame
  );

  // -- Phone glass circle (left of belo ball) --
  // Outer glow
  const phoneGlow = await createRect("phone-glow", 82, 48, 44, 44, mainFrame);
  await setFillGradient(phoneGlow, "GRADIENT_RADIAL", [
    { r: 0.6, g: 0.4, b: 0.8, a: 0.15, position: 0 },
    { r: 0.4, g: 0.2, b: 0.6, a: 0, position: 1 },
  ]);
  await setCornerRadius(phoneGlow, 22);

  // Phone button body
  const phoneBtn = await createRect("phone-btn", 85, 51, 38, 38, mainFrame);
  await setFillColor(phoneBtn, 0.15, 0.08, 0.25, 0.85);
  await setCornerRadius(phoneBtn, 19);
  await setStrokeColor(phoneBtn, 0.5, 0.3, 0.7, 0.25, 1);

  // Phone icon (rectangle shape)
  const phoneIcon = await createRect("phone-icon", 96, 60, 16, 20, mainFrame);
  await setFillColor(phoneIcon, 1, 1, 1, 0.7);
  await setCornerRadius(phoneIcon, 3);

  // --- Belo ball ---
  // Glow behind ball
  const beloGlow = await createRect("belo-glow", 145, 40, 102, 60, mainFrame);
  await setFillGradient(beloGlow, "GRADIENT_RADIAL", [
    { r: 0.5, g: 0.3, b: 0.6, a: 0.2, position: 0 },
    { r: 0.3, g: 0.15, b: 0.4, a: 0, position: 1 },
  ]);
  await setCornerRadius(beloGlow, 30);

  // Ball body
  const beloBall = await createRect("belo-ball", 158, 44, 76, 50, mainFrame);
  await setFillGradient(beloBall, "GRADIENT_LINEAR", [
    { r: 0.2, g: 0.1, b: 0.3, a: 0.95, position: 0 },
    { r: 0.12, g: 0.06, b: 0.2, a: 0.95, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);
  await setCornerRadius(beloBall, 25);
  await setStrokeColor(beloBall, 0.5, 0.3, 0.65, 0.3, 1);

  // "belo" text on ball
  const beloText = await createText(
    "belo-logo",
    175, 54,
    "belo",
    18, 400,
    { r: 0.95, g: 0.92, b: 0.88, a: 1 },
    mainFrame
  );

  // Green "8" badge
  const badgeCircle = await createRect("badge-circle", 222, 76, 20, 20, mainFrame);
  await setFillColor(badgeCircle, 0.2, 0.75, 0.35, 1);
  await setCornerRadius(badgeCircle, 10);

  const badgeText = await createText(
    "badge-text",
    229, 79,
    "8",
    12, 700,
    { r: 1, g: 1, b: 1, a: 1 },
    mainFrame
  );

  // -- Video glass circle (right of belo ball) --
  const videoGlow = await createRect("video-glow", 264, 48, 44, 44, mainFrame);
  await setFillGradient(videoGlow, "GRADIENT_RADIAL", [
    { r: 0.6, g: 0.4, b: 0.8, a: 0.15, position: 0 },
    { r: 0.4, g: 0.2, b: 0.6, a: 0, position: 1 },
  ]);
  await setCornerRadius(videoGlow, 22);

  const videoBtn = await createRect("video-btn", 267, 51, 38, 38, mainFrame);
  await setFillColor(videoBtn, 0.15, 0.08, 0.25, 0.85);
  await setCornerRadius(videoBtn, 19);
  await setStrokeColor(videoBtn, 0.5, 0.3, 0.7, 0.25, 1);

  // Video icon (simplified camera shape)
  const videoIcon = await createRect("video-icon", 275, 62, 14, 14, mainFrame);
  await setFillColor(videoIcon, 1, 1, 1, 0.7);
  await setCornerRadius(videoIcon, 3);

  const videoTriangle = await createRect("video-tri", 291, 64, 8, 10, mainFrame);
  await setFillColor(videoTriangle, 1, 1, 1, 0.7);
  await setCornerRadius(videoTriangle, 2);

  // -- Copy/share glass circle (far right) --
  const copyGlow = await createRect("copy-glow", 322, 48, 44, 44, mainFrame);
  await setFillGradient(copyGlow, "GRADIENT_RADIAL", [
    { r: 0.6, g: 0.4, b: 0.8, a: 0.15, position: 0 },
    { r: 0.4, g: 0.2, b: 0.6, a: 0, position: 1 },
  ]);
  await setCornerRadius(copyGlow, 22);

  const copyBtn = await createRect("copy-btn", 325, 51, 38, 38, mainFrame);
  await setFillColor(copyBtn, 0.15, 0.08, 0.25, 0.85);
  await setCornerRadius(copyBtn, 19);
  await setStrokeColor(copyBtn, 0.5, 0.3, 0.7, 0.25, 1);

  // Copy icon
  const copyIcon = await createRect("copy-icon", 335, 60, 12, 14, mainFrame);
  await setFillColor(copyIcon, 1, 1, 1, 0);
  await setCornerRadius(copyIcon, 2);
  await setStrokeColor(copyIcon, 1, 1, 1, 0.7, 1.5);

  const copyIcon2 = await createRect("copy-icon2", 339, 64, 12, 14, mainFrame);
  await setFillColor(copyIcon2, 1, 1, 1, 0);
  await setCornerRadius(copyIcon2, 2);
  await setStrokeColor(copyIcon2, 1, 1, 1, 0.7, 1.5);

  // 3 mini avatars (top left area near back arrow)
  console.log("\n--- Mini Avatars ---");
  const av1 = await createRect("avatar-1", 42, 56, 20, 20, mainFrame);
  await setFillGradient(av1, "GRADIENT_LINEAR", [
    { r: 0.8, g: 0.65, b: 0.4, a: 1, position: 0 },
    { r: 0.6, g: 0.45, b: 0.3, a: 1, position: 1 },
  ]);
  await setCornerRadius(av1, 10);
  await setStrokeColor(av1, 0.15, 0.08, 0.2, 1, 1.5);

  const av2 = await createRect("avatar-2", 52, 56, 20, 20, mainFrame);
  await setFillGradient(av2, "GRADIENT_LINEAR", [
    { r: 0.75, g: 0.55, b: 0.35, a: 1, position: 0 },
    { r: 0.55, g: 0.4, b: 0.25, a: 1, position: 1 },
  ]);
  await setCornerRadius(av2, 10);
  await setStrokeColor(av2, 0.15, 0.08, 0.2, 1, 1.5);

  const av3 = await createRect("avatar-3", 62, 56, 20, 20, mainFrame);
  await setFillGradient(av3, "GRADIENT_LINEAR", [
    { r: 0.7, g: 0.5, b: 0.35, a: 1, position: 0 },
    { r: 0.5, g: 0.35, b: 0.2, a: 1, position: 1 },
  ]);
  await setCornerRadius(av3, 10);
  await setStrokeColor(av3, 0.15, 0.08, 0.2, 1, 1.5);

  // "belo team" title
  const teamTitle = await createText(
    "team-title",
    150, 100,
    "belo team",
    16, 600,
    { r: 1, g: 1, b: 1, a: 1 },
    mainFrame
  );

  // "8 members"
  const membersText = await createText(
    "members-text",
    160, 120,
    "8 members",
    13, 400,
    { r: 0.65, g: 0.55, b: 0.75, a: 1 },
    mainFrame
  );

  // Divider line
  const divider = await createRect("divider", 24, 145, SCREEN_W - 48, 0.5, mainFrame);
  await setFillColor(divider, 1, 1, 1, 0.08);

  // 5. Messages
  console.log("\n--- Messages ---");
  const LEFT_MARGIN = 24;
  const TEXT_WIDTH = SCREEN_W - 48;
  let curY = 160;

  // Message 1: Roman OG
  const msg1Name = await createText(
    "msg1-name", LEFT_MARGIN, curY,
    "Roman OG", 13, 700,
    COLORS.romanOG, mainFrame
  );
  curY += 20;
  const msg1Text = await createText(
    "msg1-text", LEFT_MARGIN, curY,
    "Nope I get to about 90% of the weekly limit\neach week", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 48;
  const msg1Time = await createText(
    "msg1-time", LEFT_MARGIN, curY,
    "11:16", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 22;

  // Message 2: same sender (no name)
  const msg2Text = await createText(
    "msg2-text", LEFT_MARGIN, curY,
    "My fleet self adjusts to keep it under", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 26;
  const msg2Time = await createText(
    "msg2-time", LEFT_MARGIN, curY,
    "11:16", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 28;

  // Message 3: Enis Dev
  const msg3Name = await createText(
    "msg3-name", LEFT_MARGIN, curY,
    "Enis Dev", 13, 700,
    COLORS.enisDev, mainFrame
  );
  curY += 20;
  const msg3Text = await createText(
    "msg3-text", LEFT_MARGIN, curY,
    "Did you see the new Claude cowork", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 26;
  const msg3Time = await createText(
    "msg3-time", LEFT_MARGIN, curY,
    "11:17", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 28;

  // Message 4: Roman OG (longer message)
  const msg4Name = await createText(
    "msg4-name", LEFT_MARGIN, curY,
    "Roman OG", 13, 700,
    COLORS.romanOG, mainFrame
  );
  curY += 20;
  const msg4Text = await createText(
    "msg4-text", LEFT_MARGIN, curY,
    "Indeed, they're just porting all the features\nfrom the open source claude code\ncommunity to their own product which is\ncool", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 86;
  const msg4Time = await createText(
    "msg4-time", LEFT_MARGIN, curY,
    "11:31", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 28;

  // Message 5: Saeed Sharifi
  const msg5Name = await createText(
    "msg5-name", LEFT_MARGIN, curY,
    "Saeed Sharifi", 13, 700,
    COLORS.saeedSharifi, mainFrame
  );
  curY += 20;
  const msg5Text = await createText(
    "msg5-text", LEFT_MARGIN, curY,
    "Btw im getting notifications for messages\nbut when i open it it shows nothing", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 48;
  const msg5Time = await createText(
    "msg5-time", LEFT_MARGIN, curY,
    "11:44", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 22;

  // Message 6: same sender (no name)
  const msg6Text = await createText(
    "msg6-text", LEFT_MARGIN, curY,
    "I have to refresh the app to see", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 26;
  const msg6Time = await createText(
    "msg6-time", LEFT_MARGIN, curY,
    "11:44", 11, 400,
    COLORS.timestamp, mainFrame
  );
  curY += 28;

  // Message 7: Roman Dev
  const msg7Name = await createText(
    "msg7-name", LEFT_MARGIN, curY,
    "Roman Dev", 13, 700,
    COLORS.romanDev, mainFrame
  );
  curY += 20;
  const msg7Text = await createText(
    "msg7-text", LEFT_MARGIN, curY,
    "Ok will look into it", 16, 400,
    COLORS.messageText, mainFrame
  );
  curY += 26;
  const msg7Time = await createText(
    "msg7-time", LEFT_MARGIN, curY,
    "12:39", 11, 400,
    COLORS.timestamp, mainFrame
  );

  // 6. Input area
  console.log("\n--- Input Area ---");

  // Input area background (subtle separation)
  const inputBg = await createRect("input-bg", 0, SCREEN_H - 80, SCREEN_W, 80, mainFrame);
  await setFillGradient(inputBg, "GRADIENT_LINEAR", [
    { r: 0.06, g: 0.02, b: 0.12, a: 0, position: 0 },
    { r: 0.06, g: 0.02, b: 0.12, a: 0.5, position: 0.3 },
    { r: 0.04, g: 0.01, b: 0.08, a: 0.8, position: 1 },
  ], [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
  ]);

  // Left glass circle (three dots / menu)
  const menuGlow = await createRect("menu-glow", 10, SCREEN_H - 62, 50, 50, mainFrame);
  await setFillGradient(menuGlow, "GRADIENT_RADIAL", [
    { r: 0.5, g: 0.3, b: 0.7, a: 0.2, position: 0.6 },
    { r: 0.4, g: 0.2, b: 0.6, a: 0, position: 1 },
  ]);
  await setCornerRadius(menuGlow, 25);

  const menuBtn = await createRect("menu-btn", 16, SCREEN_H - 56, 38, 38, mainFrame);
  await setFillColor(menuBtn, 0.12, 0.06, 0.2, 0.85);
  await setCornerRadius(menuBtn, 19);
  await setStrokeColor(menuBtn, 0.45, 0.28, 0.65, 0.25, 1);

  // Three dots (vertical)
  const dot1 = await createRect("dot1", 32, SCREEN_H - 50, 4, 4, mainFrame);
  await setFillColor(dot1, 1, 1, 1, 0.7);
  await setCornerRadius(dot1, 2);

  const dot2 = await createRect("dot2", 32, SCREEN_H - 42, 4, 4, mainFrame);
  await setFillColor(dot2, 1, 1, 1, 0.7);
  await setCornerRadius(dot2, 2);

  const dot3 = await createRect("dot3", 32, SCREEN_H - 34, 4, 4, mainFrame);
  await setFillColor(dot3, 1, 1, 1, 0.7);
  await setCornerRadius(dot3, 2);

  // "belo" placeholder text (cursive in the middle)
  const inputBelo = await createText(
    "input-belo",
    140, SCREEN_H - 46,
    "belo",
    20, 400,
    { r: 0.55, g: 0.4, b: 0.65, a: 0.6 },
    mainFrame
  );

  // "GIF" text
  const gifText = await createText(
    "gif-text",
    290, SCREEN_H - 44,
    "GIF",
    14, 600,
    { r: 0.55, g: 0.45, b: 0.65, a: 0.5 },
    mainFrame
  );

  // Right glass circle (mic)
  const micGlow = await createRect("mic-glow", 333, SCREEN_H - 62, 50, 50, mainFrame);
  await setFillGradient(micGlow, "GRADIENT_RADIAL", [
    { r: 0.5, g: 0.3, b: 0.7, a: 0.2, position: 0.6 },
    { r: 0.4, g: 0.2, b: 0.6, a: 0, position: 1 },
  ]);
  await setCornerRadius(micGlow, 25);

  const micBtn = await createRect("mic-btn", 339, SCREEN_H - 56, 38, 38, mainFrame);
  await setFillColor(micBtn, 0.12, 0.06, 0.2, 0.85);
  await setCornerRadius(micBtn, 19);
  await setStrokeColor(micBtn, 0.45, 0.28, 0.65, 0.25, 1);

  // Mic icon (oval + stem)
  const micHead = await createRect("mic-head", 352, SCREEN_H - 52, 10, 14, mainFrame);
  await setFillColor(micHead, 1, 1, 1, 0.7);
  await setCornerRadius(micHead, 5);

  const micStem = await createRect("mic-stem", 356, SCREEN_H - 38, 2, 6, mainFrame);
  await setFillColor(micStem, 1, 1, 1, 0.7);

  // Home indicator
  const homeIndicator = await createRect("home-indicator", 140, SCREEN_H - 8, 113, 4, mainFrame);
  await setFillColor(homeIndicator, 1, 1, 1, 0.25);
  await setCornerRadius(homeIndicator, 2);

  // 7. Export
  console.log("\n--- Exporting ---");
  try {
    const exportResult = await exportImage(mainFrame, "iteration-7.png");
    console.log("Export result:", JSON.stringify(exportResult));
  } catch (e) {
    console.log("Export may need manual trigger:", e);
  }

  console.log("\n=== v1.6 BUILD COMPLETE ===");
  console.log("Main frame ID:", mainFrame);

  return mainFrame;
}

// Main execution
async function main() {
  try {
    await connectAndJoin();
    console.log("Connected and joined channel:", CHANNEL);
    const frameId = await build();
    console.log("Done! Frame ID:", frameId);

    // Wait a moment then close
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
