/**
 * Build Belo Group Chat Screen v1.7 in Figma
 * Fixes from v1.6: warmer gradient, better header layout, improved glass circles,
 * better message spacing, font improvements
 */

const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_X = 23500;
const FRAME_Y = 0;
const SCREEN_W = 393;
const SCREEN_H = 852;

const pendingRequests = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let ws: any;

function connectAndJoin(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      const id = crypto.randomUUID();
      ws.send(JSON.stringify({ id, type: "join", channel: CHANNEL }));
      setTimeout(resolve, 500);
    };
    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
        if (data.message?.id && pendingRequests.has(data.message.id)) {
          const req = pendingRequests.get(data.message.id)!;
          pendingRequests.delete(data.message.id);
          req.resolve(data.message.result || data.message);
        } else if (data.id && pendingRequests.has(data.id)) {
          const req = pendingRequests.get(data.id)!;
          pendingRequests.delete(data.id);
          req.resolve(data);
        }
      } catch {}
    };
    ws.onerror = reject;
  });
}

function sendCommand(command: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    ws.send(JSON.stringify({
      id, type: "message", channel: CHANNEL,
      message: { id, command, params: { ...params, commandId: id } },
    }));
    const timeout = setTimeout(() => { pendingRequests.delete(id); reject(new Error(`Timeout: ${command}`)); }, 30000);
    pendingRequests.set(id, {
      resolve: (v: any) => { clearTimeout(timeout); resolve(v); },
      reject: (e: any) => { clearTimeout(timeout); reject(e); },
    });
  });
}

// Helpers
async function createFrame(name: string, x: number, y: number, w: number, h: number, parentId?: string, fillColor?: any): Promise<string> {
  const params: any = { x, y, width: w, height: h, name };
  if (parentId) params.parentId = parentId;
  if (fillColor) params.fillColor = fillColor;
  const result = await sendCommand("create_frame", params);
  console.log(`  frame "${name}" -> ${result.id}`);
  return result.id;
}

async function createRect(name: string, x: number, y: number, w: number, h: number, parentId?: string): Promise<string> {
  const params: any = { x, y, width: w, height: h, name };
  if (parentId) params.parentId = parentId;
  const result = await sendCommand("create_rectangle", params);
  console.log(`  rect "${name}" -> ${result.id}`);
  return result.id;
}

async function createText(name: string, x: number, y: number, text: string, fontSize: number, fontWeight: number, color: any, parentId?: string): Promise<string> {
  const params: any = { x, y, text, fontSize, fontWeight, fontColor: color, name };
  if (parentId) params.parentId = parentId;
  const result = await sendCommand("create_text", params);
  console.log(`  text "${name}" -> ${result.id}`);
  return result.id;
}

async function fill(nodeId: string, r: number, g: number, b: number, a: number) {
  await sendCommand("set_fill_color", { nodeId, r, g, b, a });
}

async function gradient(nodeId: string, type: string, stops: any[], handles?: any[], opacity?: number) {
  const params: any = { nodeId, gradientType: type, gradientStops: stops };
  if (handles) params.gradientHandlePositions = handles;
  if (opacity !== undefined) params.opacity = opacity;
  await sendCommand("set_fill_gradient", params);
}

async function radius(nodeId: string, r: number) {
  await sendCommand("set_corner_radius", { nodeId, radius: r });
}

async function stroke(nodeId: string, r: number, g: number, b: number, a: number, weight: number) {
  await sendCommand("set_stroke_color", { nodeId, color: { r, g, b, a }, weight });
}

async function resize(nodeId: string, w: number, h: number) {
  await sendCommand("resize_node", { nodeId, width: w, height: h });
}

// Colors
const C = {
  romanOG:     { r: 0.91, g: 0.49, b: 0.49, a: 1 },
  enisDev:     { r: 0.37, g: 0.77, b: 0.71, a: 1 },
  saeed:       { r: 0.70, g: 0.62, b: 0.86, a: 1 },
  romanDev:    { r: 0.91, g: 0.49, b: 0.49, a: 1 },
  msgWhite:    { r: 0.94, g: 0.96, b: 0.99, a: 1 },
  timestamp:   { r: 0.62, g: 0.56, b: 0.71, a: 1 },
  white:       { r: 1, g: 1, b: 1, a: 1 },
};

async function build() {
  console.log("=== Building v1.7 ===");

  // Main frame
  const F = await createFrame("Belo Chat v1.7", FRAME_X, FRAME_Y, SCREEN_W, SCREEN_H, undefined, { r: 0.03, g: 0.01, b: 0.06, a: 1 });
  await radius(F, 50);

  // --- BACKGROUND ---
  // Main radial gradient - warmer pinkish-purple center, larger glow
  const bg = await createRect("bg", 0, 0, SCREEN_W, SCREEN_H, F);
  await gradient(bg, "GRADIENT_RADIAL", [
    { r: 0.50, g: 0.18, b: 0.48, a: 1, position: 0 },       // warm pink-purple center
    { r: 0.40, g: 0.12, b: 0.40, a: 1, position: 0.25 },     // pinkish-purple
    { r: 0.28, g: 0.07, b: 0.32, a: 1, position: 0.45 },     // purple
    { r: 0.15, g: 0.04, b: 0.20, a: 1, position: 0.65 },     // dark purple
    { r: 0.06, g: 0.02, b: 0.10, a: 1, position: 0.85 },     // very dark
    { r: 0.03, g: 0.01, b: 0.05, a: 1, position: 1 },        // near black
  ], [
    { x: 0.5, y: 0.32 },    // center - upper third for ambient light feel
    { x: 1.15, y: 0.32 },   // wide x spread for larger glow
    { x: 0.5, y: 1.05 },    // tall y spread
  ]);
  await radius(bg, 50);

  // Warm overlay glow (additive warmth)
  const warmOverlay = await createRect("warm-overlay", 0, 0, SCREEN_W, SCREEN_H, F);
  await gradient(warmOverlay, "GRADIENT_RADIAL", [
    { r: 0.55, g: 0.20, b: 0.42, a: 0.25, position: 0 },
    { r: 0.40, g: 0.12, b: 0.30, a: 0.12, position: 0.35 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.65 },
  ], [
    { x: 0.5, y: 0.28 },
    { x: 1.0, y: 0.28 },
    { x: 0.5, y: 0.75 },
  ]);
  await radius(warmOverlay, 50);

  // --- STATUS BAR ---
  await createText("time", 28, 14, "2:32", 15, 600, C.white, F);
  // Signal bars + wifi + battery as simple rectangles for accuracy
  // Signal bars
  const s1 = await createRect("sig1", 310, 18, 3, 6, F); await fill(s1, 1, 1, 1, 1); await radius(s1, 1);
  const s2 = await createRect("sig2", 315, 16, 3, 8, F); await fill(s2, 1, 1, 1, 1); await radius(s2, 1);
  const s3 = await createRect("sig3", 320, 14, 3, 10, F); await fill(s3, 1, 1, 1, 1); await radius(s3, 1);
  const s4 = await createRect("sig4", 325, 12, 3, 12, F); await fill(s4, 1, 1, 1, 1); await radius(s4, 1);
  // Wifi icon (simplified dot + arcs via small rects)
  const wifi = await createRect("wifi", 335, 14, 10, 10, F); await fill(wifi, 1, 1, 1, 0); await radius(wifi, 5); await stroke(wifi, 1, 1, 1, 1, 1.5);
  // Battery
  const bat = await createRect("battery", 352, 14, 22, 10, F); await fill(bat, 1, 1, 1, 0); await radius(bat, 3); await stroke(bat, 1, 1, 1, 1, 1);
  const batFill = await createRect("bat-fill", 354, 16, 16, 6, F); await fill(batFill, 1, 1, 1, 1); await radius(batFill, 1);
  const batTip = await createRect("bat-tip", 374, 17, 2, 4, F); await fill(batTip, 1, 1, 1, 1); await radius(batTip, 1);

  // --- HEADER ---
  // Back chevron
  await createText("back", 16, 52, "\u2039", 32, 300, { r: 1, g: 1, b: 1, a: 0.9 }, F);

  // Mini avatars (3 overlapping circles with gold/brown tones, top-left)
  for (let i = 0; i < 3; i++) {
    const ax = 44 + i * 12;
    const av = await createRect(`av${i}`, ax, 55, 22, 22, F);
    const colors = [
      [0.82, 0.68, 0.42], // gold
      [0.75, 0.55, 0.38], // brown-gold
      [0.70, 0.50, 0.35], // darker brown
    ];
    await gradient(av, "GRADIENT_LINEAR", [
      { r: colors[i][0], g: colors[i][1], b: colors[i][2], a: 1, position: 0 },
      { r: colors[i][0] - 0.15, g: colors[i][1] - 0.1, b: colors[i][2] - 0.08, a: 1, position: 1 },
    ]);
    await radius(av, 11);
    await stroke(av, 0.1, 0.05, 0.15, 1, 2);
  }

  // --- Glass circle helper ---
  async function glassCircle(name: string, cx: number, cy: number, size: number) {
    // Outer glow ring
    const glowSize = size + 14;
    const glow = await createRect(`${name}-glow`, cx - glowSize/2, cy - glowSize/2, glowSize, glowSize, F);
    await gradient(glow, "GRADIENT_RADIAL", [
      { r: 0.55, g: 0.35, b: 0.75, a: 0, position: 0.5 },
      { r: 0.55, g: 0.35, b: 0.75, a: 0.18, position: 0.7 },
      { r: 0.45, g: 0.25, b: 0.65, a: 0, position: 1 },
    ]);
    await radius(glow, glowSize/2);

    // Button body
    const btn = await createRect(`${name}-btn`, cx - size/2, cy - size/2, size, size, F);
    await fill(btn, 0.13, 0.07, 0.22, 0.88);
    await radius(btn, size/2);
    await stroke(btn, 0.5, 0.3, 0.68, 0.22, 1);

    return btn;
  }

  // Phone button (left of belo ball)
  const phoneCx = 105, phoneCy = 68;
  await glassCircle("phone", phoneCx, phoneCy, 36);
  // Phone handset icon (simplified)
  const phoneBody = await createRect("phone-body", phoneCx - 8, phoneCy - 6, 16, 12, F);
  await fill(phoneBody, 1, 1, 1, 0); await radius(phoneBody, 3); await stroke(phoneBody, 1, 1, 1, 0.7, 1.5);

  // Belo ball (center)
  const beloX = 150, beloY = 42;
  const beloW = 88, beloH = 52;
  // Ball shadow/glow
  const beloShadow = await createRect("belo-shadow", beloX - 8, beloY - 4, beloW + 16, beloH + 8, F);
  await gradient(beloShadow, "GRADIENT_RADIAL", [
    { r: 0.45, g: 0.25, b: 0.55, a: 0.2, position: 0 },
    { r: 0.3, g: 0.15, b: 0.4, a: 0, position: 1 },
  ]);
  await radius(beloShadow, (beloH + 8) / 2);

  // Ball body
  const ball = await createRect("belo-ball", beloX, beloY, beloW, beloH, F);
  await gradient(ball, "GRADIENT_LINEAR", [
    { r: 0.22, g: 0.12, b: 0.32, a: 0.92, position: 0 },
    { r: 0.14, g: 0.07, b: 0.22, a: 0.95, position: 1 },
  ], [
    { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 },
  ]);
  await radius(ball, beloH / 2);
  await stroke(ball, 0.45, 0.28, 0.6, 0.3, 1);

  // "belo" text on ball (cream/white)
  const beloLabel = await createText("belo-label", beloX + 18, beloY + 12, "belo", 20, 400,
    { r: 0.96, g: 0.93, b: 0.88, a: 1 }, F);

  // Green badge "8"
  const badgeX = beloX + beloW - 12, badgeY = beloY + beloH - 16;
  const badge = await createRect("badge", badgeX, badgeY, 20, 20, F);
  await fill(badge, 0.22, 0.78, 0.38, 1);
  await radius(badge, 10);
  const badgeNum = await createText("badge-num", badgeX + 6, badgeY + 3, "8", 12, 700, C.white, F);

  // Video button (right of belo ball)
  const videoCx = 280, videoCy = 68;
  await glassCircle("video", videoCx, videoCy, 36);
  // Camera icon
  const camBody = await createRect("cam-body", videoCx - 10, videoCy - 5, 14, 10, F);
  await fill(camBody, 1, 1, 1, 0); await radius(camBody, 2); await stroke(camBody, 1, 1, 1, 0.7, 1.5);
  const camLens = await createRect("cam-lens", videoCx + 5, videoCy - 3, 7, 6, F);
  await fill(camLens, 1, 1, 1, 0); await radius(camLens, 1); await stroke(camLens, 1, 1, 1, 0.7, 1.5);

  // Copy/share button (far right)
  const copyCx = 348, copyCy = 68;
  await glassCircle("copy", copyCx, copyCy, 36);
  // Overlapping squares icon
  const sq1 = await createRect("sq1", copyCx - 8, copyCy - 7, 10, 12, F);
  await fill(sq1, 1, 1, 1, 0); await radius(sq1, 2); await stroke(sq1, 1, 1, 1, 0.7, 1.5);
  const sq2 = await createRect("sq2", copyCx - 3, copyCy - 3, 10, 12, F);
  await fill(sq2, 1, 1, 1, 0); await radius(sq2, 2); await stroke(sq2, 1, 1, 1, 0.7, 1.5);

  // "belo team" centered under ball
  const titleX = SCREEN_W / 2 - 35;
  await createText("title", titleX, 100, "belo team", 16, 600, C.white, F);
  await createText("members", titleX + 5, 120, "8 members", 13, 400, { r: 0.62, g: 0.55, b: 0.72, a: 1 }, F);

  // Subtle divider
  const div = await createRect("divider", 20, 142, SCREEN_W - 40, 0.5, F);
  await fill(div, 1, 1, 1, 0.06);

  // --- MESSAGES ---
  const LM = 24; // left margin
  let y = 155;
  const LINE_H = 22; // line height for message text
  const NAME_GAP = 4;
  const TIME_GAP = 2;
  const MSG_GAP = 16; // gap between messages
  const CONT_GAP = 8; // gap for continued messages (same sender)

  // Helper to add a message
  async function msg(senderName: string | null, senderColor: any, text: string, time: string) {
    if (senderName) {
      await createText(`n-${senderName}`, LM, y, senderName, 13, 700, senderColor, F);
      y += 17 + NAME_GAP;
    }
    // Count lines
    const lines = text.split("\n");
    await createText(`t-${time}-${y}`, LM, y, text, 16, 400, C.msgWhite, F);
    y += lines.length * LINE_H;
    y += TIME_GAP;
    await createText(`ts-${time}-${y}`, LM, y, time, 11, 400, C.timestamp, F);
    y += 14;
  }

  // Message 1: Roman OG
  await msg("Roman OG", C.romanOG, "Nope I get to about 90% of the weekly limit\neach week", "11:16");
  y += CONT_GAP;

  // Message 2: continued (no name)
  await msg(null, null, "My fleet self adjusts to keep it under", "11:16");
  y += MSG_GAP;

  // Message 3: Enis Dev
  await msg("Enis Dev", C.enisDev, "Did you see the new Claude cowork", "11:17");
  y += MSG_GAP;

  // Message 4: Roman OG
  await msg("Roman OG", C.romanOG, "Indeed, they're just porting all the features\nfrom the open source claude code\ncommunity to their own product which is\ncool", "11:31");
  y += MSG_GAP;

  // Message 5: Saeed Sharifi
  await msg("Saeed Sharifi", C.saeed, "Btw im getting notifications for messages\nbut when i open it it shows nothing", "11:44");
  y += CONT_GAP;

  // Message 6: continued
  await msg(null, null, "I have to refresh the app to see", "11:44");
  y += MSG_GAP;

  // Message 7: Roman Dev
  await msg("Roman Dev", C.romanDev, "Ok will look into it", "12:39");

  // --- INPUT AREA ---
  console.log("  Input area...");

  // Subtle input bg
  const inputBg = await createRect("input-bg", 0, SCREEN_H - 80, SCREEN_W, 80, F);
  await gradient(inputBg, "GRADIENT_LINEAR", [
    { r: 0.05, g: 0.02, b: 0.08, a: 0, position: 0 },
    { r: 0.04, g: 0.015, b: 0.07, a: 0.6, position: 0.4 },
    { r: 0.03, g: 0.01, b: 0.05, a: 0.85, position: 1 },
  ], [
    { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 },
  ]);

  // Menu dots glass circle (left)
  const menuCx = 35, menuCy = SCREEN_H - 37;
  await glassCircle("menu", menuCx, menuCy, 36);
  // Three vertical dots
  for (let i = 0; i < 3; i++) {
    const d = await createRect(`dot${i}`, menuCx - 2, menuCy - 8 + i * 8, 4, 4, F);
    await fill(d, 1, 1, 1, 0.7);
    await radius(d, 2);
  }

  // "belo" placeholder (cursive, muted purple)
  await createText("input-belo", SCREEN_W / 2 - 20, SCREEN_H - 46, "belo", 20, 400,
    { r: 0.52, g: 0.38, b: 0.62, a: 0.55 }, F);

  // "GIF" text
  await createText("gif", 292, SCREEN_H - 42, "GIF", 13, 600,
    { r: 0.52, g: 0.42, b: 0.62, a: 0.5 }, F);

  // Mic glass circle (right)
  const micCx = SCREEN_W - 35, micCy = SCREEN_H - 37;
  await glassCircle("mic", micCx, micCy, 36);
  // Mic icon
  const micHead = await createRect("mic-head", micCx - 5, micCy - 10, 10, 14, F);
  await fill(micHead, 1, 1, 1, 0.7);
  await radius(micHead, 5);
  const micStem = await createRect("mic-stem", micCx - 1, micCy + 5, 2, 5, F);
  await fill(micStem, 1, 1, 1, 0.7);

  // Home indicator
  const hi = await createRect("home-ind", SCREEN_W / 2 - 56, SCREEN_H - 8, 113, 4, F);
  await fill(hi, 1, 1, 1, 0.2);
  await radius(hi, 2);

  // --- EXPORT ---
  console.log("  Exporting...");
  const result = await sendCommand("export_node_as_image", { nodeId: F, format: "PNG", scale: 2 });
  if (result.imageData) {
    const buffer = Buffer.from(result.imageData, "base64");
    await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/iteration-7b.png", buffer);
    console.log("  Saved iteration-7b.png:", buffer.length, "bytes");
  }

  console.log("=== v1.7 COMPLETE ===");
  return F;
}

async function main() {
  await connectAndJoin();
  console.log("Connected to channel:", CHANNEL);
  await build();
  setTimeout(() => { ws.close(); process.exit(0); }, 2000);
}

main().catch(e => { console.error(e); process.exit(1); });
