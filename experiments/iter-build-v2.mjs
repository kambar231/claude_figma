/**
 * Iteration 2: Belo Group Chat Screen - fixes from v1 audit
 * Fixes: avatar colors, spacing, gradient warmth, text sizing
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

// ─── Infra (same as v1) ─────────────────────────────────────────────────────
let ws, channel, reqCounter = 0;
const pending = new Map();
function nextId() { return `v2-${++reqCounter}`; }

async function findChannel() {
  return new Promise((resolve, reject) => {
    http.get(CHANNELS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const channels = JSON.parse(data);
        const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) resolve(sorted[0][0]);
        else reject(new Error("No active channel"));
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${command}`)); }, timeout);
    pending.set(id, { resolve, timer });
    ws.send(JSON.stringify({ type: "message", channel, id, message: { id, command, params } }));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createFrame(o) { return cmd("create_frame", { x:o.x??0, y:o.y??0, width:o.width??100, height:o.height??100, name:o.name??"Frame", parentId:o.parentId, fillColor:o.fillColor }); }
async function createRect(o) { return cmd("create_rectangle", { x:o.x??0, y:o.y??0, width:o.width??100, height:o.height??100, name:o.name??"Rect", parentId:o.parentId }); }
async function createEllipse(o) { return cmd("create_ellipse", { x:o.x??0, y:o.y??0, width:o.width??50, height:o.height??50, name:o.name??"Ellipse", parentId:o.parentId }); }
async function createText(o) { return cmd("create_text", { x:o.x??0, y:o.y??0, text:o.text??"", fontSize:o.fontSize??14, fontWeight:o.fontWeight??400, fontFamily:o.fontFamily??FONT_UI, fontColor:o.fontColor??C.textPri, letterSpacing:o.letterSpacing, textAlignHorizontal:o.textAlignHorizontal, name:o.name??o.text?.slice(0,20)??"Text", parentId:o.parentId }); }
async function setFillC(nodeId, c, a) { return cmd("set_fill_color", { nodeId, color: { r:c.r, g:c.g, b:c.b, a:a??1 } }); }
async function setGradient(nodeId, type, stops, handles) { return cmd("set_fill_gradient", { nodeId, gradientType:type, gradientStops:stops, gradientHandlePositions:handles }); }
async function setStroke(nodeId, color, weight) { return cmd("set_stroke_color", { nodeId, color, weight }); }
async function setRadius(nodeId, radius) { return cmd("set_corner_radius", { nodeId, radius }); }
async function resizeNode(nodeId, w, h) { return cmd("resize_node", { nodeId, width:w, height:h }); }
async function getInfo(nodeId) { return cmd("get_node_info", { nodeId }); }
async function deleteNode(nodeId) { return cmd("delete_node", { nodeId }); }
async function exportImage(nodeId) { return cmd("export_node_as_image", { nodeId, format:"PNG", scale:2 }, 60000); }

async function measureText(opts) {
  const result = await createText({ ...opts, x:-9999, y:-9999, name:"_m" });
  const id = result.id;
  await sleep(120);
  const info = await getInfo(id);
  const bb = info.absoluteBoundingBox || {};
  let w = bb.width || 50, h = bb.height || 20;
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

async function createMeasuredText(opts) {
  const dim = await measureText(opts);
  const node = await createText(opts);
  if (opts.maxWidth && dim.width >= opts.maxWidth) {
    await resizeNode(node.id, opts.maxWidth, dim.height);
  }
  return { ...node, width: dim.width, height: dim.height };
}

let screenId;

async function buildGlassCircle(opts) {
  const { x, y, size, name } = opts;
  const gp = 10;
  const glowR = await createRect({ x:x-gp, y:y-gp, width:size+gp*2, height:size+gp*2, name:`${name}-glow`, parentId:screenId });
  await setRadius(glowR.id, (size+gp*2)/2);
  await setGradient(glowR.id, "GRADIENT_RADIAL", [
    { r:0.608, g:0.435, b:0.831, a:0.18, position:0 },
    { r:0.608, g:0.435, b:0.831, a:0, position:1 },
  ], [{ x:0.5, y:0.5 }, { x:1, y:0.5 }, { x:0.5, y:1 }]);
  const circle = await createRect({ x, y, width:size, height:size, name:`${name}-circle`, parentId:screenId });
  await setRadius(circle.id, size/2);
  await setFillC(circle.id, C.glassFill, 0.9);
  await setStroke(circle.id, { r:0.729, g:0.510, b:0.929, a:0.3 }, 1);
  return circle;
}

// ═══════════════════════════════════════════════════════════════════════════
async function build(screenX, versionName) {
  console.log(`\n=== Building ${versionName} at (${screenX}, 0) ===\n`);

  const frame = await createFrame({ x:screenX, y:0, width:W, height:H, name:versionName });
  screenId = frame.id;
  await setRadius(screenId, 50);
  await setFillC(screenId, C.bgDark, 1);

  // BG gradient - warmer center, more spread
  const bg = await createRect({ x:0, y:0, width:W, height:H, name:"bg-grad", parentId:screenId });
  await setGradient(bg.id, "GRADIENT_RADIAL", [
    { r:0.255, g:0.100, b:0.310, a:0.9, position:0 },
    { r:0.200, g:0.080, b:0.260, a:0.75, position:0.3 },
    { r:0.135, g:0.060, b:0.200, a:0.5, position:0.55 },
    { r:0.080, g:0.035, b:0.140, a:0.25, position:0.75 },
    { r:0.047, g:0.016, b:0.082, a:0, position:1 },
  ], [
    { x:0.5, y:0.32 },
    { x:1.3, y:0.32 },
    { x:0.5, y:1.15 },
  ]);
  await sleep(150);

  // ── STATUS BAR ──
  const island = await createRect({ x:(W-126)/2, y:11, width:126, height:37, name:"island", parentId:screenId });
  await setFillC(island.id, C.black, 1);
  await setRadius(island.id, 20);

  await createText({ text:"2:32", fontSize:16, fontWeight:600, fontColor:C.white, parentId:screenId, x:28, y:15, name:"time" });

  // Signal
  for (let i = 0; i < 4; i++) {
    const bH = 4 + i*2;
    const bar = await createRect({ x:W-100+i*5, y:18+(10-bH), width:3, height:bH, name:`sig${i}`, parentId:screenId });
    await setFillC(bar.id, C.white, 1);
    await setRadius(bar.id, 0.5);
  }
  // WiFi
  const wX = W-74;
  const wd = await createRect({ x:wX+4, y:24, width:3, height:3, name:"wd", parentId:screenId });
  await setFillC(wd.id, C.white, 1); await setRadius(wd.id, 1.5);
  for (let i=0; i<2; i++) {
    const aw = 7+i*4;
    const a = await createRect({ x:wX+5.5-aw/2, y:21-i*3, width:aw, height:2, name:`wa${i}`, parentId:screenId });
    await setFillC(a.id, C.white, 1); await setRadius(a.id, 1);
  }
  // Battery
  const bX = W-40;
  const bo = await createRect({ x:bX, y:17, width:25, height:12, name:"bo", parentId:screenId });
  await setFillC(bo.id, C.black, 0); await setStroke(bo.id, {r:1,g:1,b:1,a:1}, 1); await setRadius(bo.id, 3);
  const bf = await createRect({ x:bX+2, y:19, width:21, height:8, name:"bf", parentId:screenId });
  await setFillC(bf.id, C.white, 1); await setRadius(bf.id, 1.5);
  const bc = await createRect({ x:bX+26, y:20, width:2, height:6, name:"bc", parentId:screenId });
  await setFillC(bc.id, C.white, 0.4); await setRadius(bc.id, 0.5);

  await sleep(150);

  // ── HEADER ──
  const hY = 58;

  // Back chevron - bigger
  await createText({ text:"‹", fontSize:32, fontWeight:700, fontColor:C.white, parentId:screenId, x:8, y:hY-6, name:"back" });

  // 3 mini avatars - warmer gold/brown tones
  const avColors = [
    { r:0.90, g:0.70, b:0.40 }, // gold
    { r:0.80, g:0.55, b:0.35 }, // brown
    { r:0.70, g:0.55, b:0.65 }, // muted purple
  ];
  for (let i=0; i<3; i++) {
    const av = await createEllipse({ x:42+i*14, y:hY+2, width:22, height:22, name:`av${i}`, parentId:screenId });
    await setFillC(av.id, avColors[i], 1);
    await setStroke(av.id, {r:0.047,g:0.016,b:0.082,a:1}, 2);
  }

  // Phone glass button - vertically centered with ball
  const ballSize = 90;
  const ballX = (W-ballSize)/2;
  const ballY = hY;
  const btnCenterY = ballY + ballSize/2;

  const phoneBtnSize = 42;
  const phoneBtnX = 98;
  const phoneBtnY = btnCenterY - phoneBtnSize/2;
  await buildGlassCircle({ x:phoneBtnX, y:phoneBtnY, size:phoneBtnSize, name:"phone" });
  // Phone handset - refined
  const phCX = phoneBtnX + phoneBtnSize/2;
  const phCY = phoneBtnY + phoneBtnSize/2;
  const phW = 18, phH = 18;
  const phX = phCX - phW/2, phY = phCY - phH/2;
  const pt = await createRect({ x:phX, y:phY, width:phW, height:3, name:"pt", parentId:screenId });
  await setFillC(pt.id, C.white, 0.85); await setRadius(pt.id, 1.5);
  const pl = await createRect({ x:phX, y:phY+3, width:4, height:12, name:"pl", parentId:screenId });
  await setFillC(pl.id, C.white, 0.85); await setRadius(pl.id, 1);
  const pr = await createRect({ x:phX+phW-4, y:phY+3, width:4, height:12, name:"pr", parentId:screenId });
  await setFillC(pr.id, C.white, 0.85); await setRadius(pr.id, 1);
  const pb = await createRect({ x:phX, y:phY+15, width:phW, height:3, name:"pb", parentId:screenId });
  await setFillC(pb.id, C.white, 0.85); await setRadius(pb.id, 1.5);

  // BELO BALL
  const glowSz = 124;
  const gR = await createRect({ x:ballX-(glowSz-ballSize)/2, y:ballY-(glowSz-ballSize)/2, width:glowSz, height:glowSz, name:"ball-glow", parentId:screenId });
  await setRadius(gR.id, glowSz/2);
  await setGradient(gR.id, "GRADIENT_RADIAL", [
    { r:0.608, g:0.435, b:0.831, a:0.45, position:0 },
    { r:0.608, g:0.435, b:0.831, a:0.15, position:0.5 },
    { r:0.608, g:0.435, b:0.831, a:0, position:1 },
  ], [{ x:0.5, y:0.5 }, { x:1, y:0.5 }, { x:0.5, y:1 }]);

  const ball = await createEllipse({ x:ballX, y:ballY, width:ballSize, height:ballSize, name:"belo-ball", parentId:screenId });
  await setFillC(ball.id, {r:0.08,g:0.04,b:0.14}, 1);
  await setStroke(ball.id, {r:0.608,g:0.435,b:0.831,a:0.35}, 1.5);

  // "belo" on ball - slightly larger
  const beloM = await measureText({ text:"belo", fontSize:26, fontWeight:400, fontFamily:FONT_LOGO, fontColor:{r:1,g:0.98,b:0.95} });
  await createText({ text:"belo", fontSize:26, fontWeight:400, fontFamily:FONT_LOGO, fontColor:{r:1,g:0.98,b:0.95}, parentId:screenId,
    x:ballX+(ballSize-beloM.width)/2, y:ballY+(ballSize-beloM.height)/2-2, name:"ball-belo" });

  // Green badge "8"
  const bdgSz = 22;
  const bdgX = ballX+ballSize-bdgSz+2, bdgY = ballY+ballSize-bdgSz+2;
  const bdg = await createEllipse({ x:bdgX, y:bdgY, width:bdgSz, height:bdgSz, name:"badge", parentId:screenId });
  await setFillC(bdg.id, C.green, 1);
  const bTM = await measureText({ text:"8", fontSize:13, fontWeight:700, fontColor:C.white });
  await createText({ text:"8", fontSize:13, fontWeight:700, fontColor:C.white, parentId:screenId,
    x:bdgX+(bdgSz-bTM.width)/2, y:bdgY+(bdgSz-bTM.height)/2, name:"badge-8" });

  // Video glass button - vertically centered with ball
  const vidBtnSize = 42;
  const vidBtnX = W - 98 - vidBtnSize;
  const vidBtnY = btnCenterY - vidBtnSize/2;
  await buildGlassCircle({ x:vidBtnX, y:vidBtnY, size:vidBtnSize, name:"video" });
  // Camera icon - refined
  const vCX = vidBtnX + vidBtnSize/2;
  const vCY = vidBtnY + vidBtnSize/2;
  const cb = await createRect({ x:vCX-11, y:vCY-6, width:14, height:12, name:"cb", parentId:screenId });
  await setFillC(cb.id, C.white, 0.85); await setRadius(cb.id, 2);
  const cl = await createRect({ x:vCX+4, y:vCY-4, width:7, height:8, name:"cl", parentId:screenId });
  await setFillC(cl.id, C.white, 0.85); await setRadius(cl.id, 1);

  // Stack icon
  const sX = W-36, sY = btnCenterY - 12;
  const s1 = await createRect({ x:sX, y:sY, width:14, height:14, name:"s1", parentId:screenId });
  await setFillC(s1.id, C.black, 0); await setStroke(s1.id, {r:1,g:1,b:1,a:0.8}, 1.5); await setRadius(s1.id, 3);
  const s2 = await createRect({ x:sX+5, y:sY+5, width:14, height:14, name:"s2", parentId:screenId });
  await setFillC(s2.id, C.black, 0); await setStroke(s2.id, {r:1,g:1,b:1,a:0.8}, 1.5); await setRadius(s2.id, 3);

  // "belo team"
  const nmM = await measureText({ text:"belo team", fontSize:18, fontWeight:700, fontColor:C.white });
  const nmY = ballY + ballSize + 6;
  await createText({ text:"belo team", fontSize:18, fontWeight:700, fontColor:C.white, parentId:screenId,
    x:(W-nmM.width)/2, y:nmY, name:"group-name" });

  // "8 members"
  const mmM = await measureText({ text:"8 members", fontSize:13, fontWeight:400, fontColor:C.textMuted });
  const mmY = nmY + nmM.height + 2;
  await createText({ text:"8 members", fontSize:13, fontWeight:400, fontColor:C.textMuted, parentId:screenId,
    x:(W-mmM.width)/2, y:mmY, name:"members" });

  await sleep(150);

  // ── MESSAGES ──
  const messages = [
    { sender:"Roman OG", color:C.coral, text:"Nope I get to about 90% of the weekly limit each week", time:"11:16" },
    { sender:"Roman OG", color:C.coral, text:"My fleet self adjusts to keep it under", time:"11:16" },
    { sender:"Enis Dev", color:C.teal, text:"Did you see the new Claude cowork", time:"11:17" },
    { sender:"Roman OG", color:C.coral, text:"Indeed, they're just porting all the features from the open source claude code community to their own product which is cool", time:"11:31" },
    { sender:"Saeed Sharifi", color:C.purple, text:"Btw im getting notifications for messages but when i open it it shows nothing", time:"11:44" },
    { sender:"Saeed Sharifi", color:C.purple, text:"I have to refresh the app to see", time:"11:44" },
    { sender:"Roman Dev", color:C.coral, text:"Ok will look into it", time:"12:39" },
  ];

  const textX = 16;
  const maxTextW = W * 0.78; // ~306px = ~78% width
  let curY = mmY + mmM.height + 18;
  let lastSender = null;

  for (const msg of messages) {
    const senderChanged = msg.sender !== lastSender;
    curY += senderChanged ? 16 : 6;

    if (senderChanged) {
      const sM = await measureText({ text:msg.sender, fontSize:13, fontWeight:700, fontColor:msg.color });
      await createText({ text:msg.sender, fontSize:13, fontWeight:700, fontColor:msg.color, parentId:screenId,
        x:textX, y:curY, name:`snd-${msg.sender}` });
      curY += sM.height + 2;
    }

    const mn = await createMeasuredText({ text:msg.text, fontSize:16, fontWeight:400, fontColor:C.textPri, parentId:screenId,
      x:textX, y:curY, maxWidth:maxTextW, name:`msg-${msg.text.slice(0,15)}` });
    curY += mn.height + 2;

    const tM = await measureText({ text:msg.time, fontSize:11, fontWeight:400, fontColor:C.textMuted });
    await createText({ text:msg.time, fontSize:11, fontWeight:400, fontColor:C.textMuted, parentId:screenId,
      x:textX, y:curY, name:`ts-${msg.time}` });
    curY += tM.height + 2;
    lastSender = msg.sender;
  }

  await sleep(150);

  // ── INPUT AREA ──
  const inputY = H - 88;
  const aH = 54;

  const sep = await createRect({ x:0, y:inputY-1, width:W, height:1, name:"sep", parentId:screenId });
  await setFillC(sep.id, C.white, 0.05);

  // Menu button (3 dots)
  const mSz = 48, mX = 14, mCY = inputY+(aH-mSz)/2;
  await buildGlassCircle({ x:mX, y:mCY, size:mSz, name:"menu" });
  for (let i=0; i<3; i++) {
    const d = await createRect({ x:mX+(mSz-4)/2, y:mCY+12+i*8, width:4, height:4, name:`md${i}`, parentId:screenId });
    await setFillC(d.id, C.white, 0.8); await setRadius(d.id, 2);
  }

  // "belo" placeholder
  const hM = await measureText({ text:"belo", fontSize:20, fontWeight:400, fontFamily:FONT_LOGO, fontColor:C.textMuted });
  await createText({ text:"belo", fontSize:20, fontWeight:400, fontFamily:FONT_LOGO, fontColor:C.textMuted, parentId:screenId,
    x:(W-hM.width)/2-15, y:inputY+(aH-hM.height)/2, name:"input-belo" });

  // "GIF"
  const gM = await measureText({ text:"GIF", fontSize:13, fontWeight:700, fontColor:C.textMuted });
  await createText({ text:"GIF", fontSize:13, fontWeight:700, fontColor:C.textMuted, parentId:screenId,
    x:W-mSz-24-gM.width, y:inputY+(aH-gM.height)/2, name:"gif" });

  // Mic button
  const micSz = 48, micBX = W-micSz-14, micBY = inputY+(aH-micSz)/2;
  await buildGlassCircle({ x:micBX, y:micBY, size:micSz, name:"mic" });
  const micW = 10, micH = 16;
  const miX = micBX+(micSz-micW)/2, miY = micBY+10;
  const mp = await createRect({ x:miX, y:miY, width:micW, height:micH, name:"mp", parentId:screenId });
  await setFillC(mp.id, C.white, 0.8); await setRadius(mp.id, micW/2);
  const stX = micBX+micSz/2-1;
  const st = await createRect({ x:stX, y:miY+micH, width:2, height:5, name:"ms", parentId:screenId });
  await setFillC(st.id, C.white, 0.8);
  const mb = await createRect({ x:stX-4, y:miY+micH+4, width:10, height:2, name:"mbase", parentId:screenId });
  await setFillC(mb.id, C.white, 0.8); await setRadius(mb.id, 1);
  const cup = await createRect({ x:miX-3, y:miY+2, width:16, height:18, name:"mcup", parentId:screenId });
  await setFillC(cup.id, C.black, 0); await setStroke(cup.id, {r:1,g:1,b:1,a:0.5}, 1.5); await setRadius(cup.id, 8);

  // Home indicator
  const ind = await createRect({ x:(W-134)/2, y:H-20, width:134, height:5, name:"home", parentId:screenId });
  await setFillC(ind.id, C.white, 0.22); await setRadius(ind.id, 3);

  await sleep(500);

  // Export
  console.log("Exporting...");
  try {
    const img = await exportImage(screenId);
    if (img?.imageData) {
      const buf = Buffer.from(img.imageData, "base64");
      const p = path.join(__dirname, "iteration-2.png");
      fs.writeFileSync(p, buf);
      console.log(`Saved: ${p}`);
      return p;
    }
  } catch (e) { console.log(`Export err: ${e.message}`); }
  return null;
}

async function main() {
  const ch = await findChannel();
  console.log(`Channel: ${ch}`);
  await connect(ch);
  console.log("Connected");

  await build(20500, "Chat v1.1");

  await sleep(500);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
