#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat — Emulator Match v3
// Refinements: brighter avatar glow, better proportions,
// menu spacing, font rendering fixes
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const OX = 29000, OY = 0;

const C = {
  gradTop:   { r: 0.169, g: 0.353, b: 0.510 },
  gradMid:   { r: 0.118, g: 0.227, b: 0.322 },
  gradBot:   { r: 0.067, g: 0.102, b: 0.133 },
  glow:      { r: 0.275, g: 0.549, b: 0.784 },
  glassBg:   { r: 0.047, g: 0.016, b: 0.082 },
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },
  dateBadge: { r: 0.831, g: 0.392, b: 0.541 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  gray40:    { r: 0.40, g: 0.40, b: 0.42 },
  iconPri:   { r: 0.83, g: 0.72, b: 1 },
};

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  return Object.entries(ch).sort((a, b) => b[1] - a[1])[0][0];
}

function genId() { return 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function makeSend(ws, channel) {
  return async (command, params) => new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.message?.id === id) {
        ws.removeEventListener("message", handler); clearTimeout(t);
        d.message.error ? reject(new Error(String(d.message.error))) : resolve(d.message.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ type: "message", channel, message: { id, command, params } }));
  });
}

async function main() {
  const channel = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise(r => ws.addEventListener("open", r));
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 500));
  console.log("Channel:", channel);

  const send = makeSend(ws, channel);
  const R = async (n, x, y, w, h, pid) => send("create_rectangle", { name: n, x, y, width: w, height: h, ...(pid ? {parentId:pid} : {}) });
  const T = async (n, x, y, txt, sz, o={}) => send("create_text", {
    name:n, x, y, text:txt, fontSize:sz,
    fontFamily:o.ff||FONT_UI, fontWeight:o.fw||400, fontColor:o.c||C.textPri,
    ...(o.pid?{parentId:o.pid}:{}),
  });
  const setF = async (id,c,a=1) => send("set_fill_color", {nodeId:id,r:c.r,g:c.g,b:c.b,a});
  const setG = async (id,ty,st,h) => send("set_fill_gradient", {nodeId:id,gradientType:ty,gradientStops:st,...(h?{gradientHandlePositions:h}:{})});
  const setCR = async (id,r) => send("set_corner_radius", {nodeId:id,radius:r});
  const setST = async (id,c,w=1,a=1) => send("set_stroke_color", {nodeId:id,color:{r:c.r,g:c.g,b:c.b,a},weight:w});

  // Glass ball helper
  async function ball(nm, cx, cy, sz, glowA, pid) {
    const gs = sz*1.65, rs = sz*0.94;
    const gl = await R(nm+"-gl", cx-gs/2, cy-gs/2, gs, gs, pid);
    await setCR(gl.id, gs/2);
    await setG(gl.id, "GRADIENT_RADIAL", [
      {position:0,...C.glow,a:glowA[0]},{position:0.5,...C.glow,a:glowA[1]},{position:1,...C.glow,a:0},
    ]);
    const rn = await R(nm+"-rn", cx-rs/2, cy-rs/2, rs, rs, pid);
    await setCR(rn.id, rs/2);
    await setF(rn.id, C.glassBg, 0.85);
    return {gl:gl.id, rn:rn.id};
  }

  // ══════════════════════════════════════════════════════════════
  console.log("Building v3...");

  const screen = await send("create_frame", {
    name:"Belo – DM (Emulator Match) v3", x:OX, y:OY, width:W, height:H, fillColor:C.gradBot,
  });
  const s = screen.id;
  await setCR(s, 50);

  // BG gradient
  const bg = await R("bg", 0, 0, W, H, s);
  await setCR(bg.id, 50);
  await setG(bg.id, "GRADIENT_LINEAR", [
    {position:0,...C.gradTop,a:1},{position:0.45,...C.gradMid,a:1},{position:1,...C.gradBot,a:1},
  ], [{x:0.5,y:0},{x:0.5,y:1},{x:1,y:0}]);

  // Status bar
  await T("time", 24, 12, "4:36", 14, {fw:600, c:C.white, pid:s});
  // Right icons approximation
  await T("sig", 330, 12, "⦁ ⦁", 8, {c:C.white, pid:s});
  await T("bat", 360, 11, "▮", 11, {c:C.white, pid:s});

  // ── HEADER ──
  // Back arrow
  await T("back", 14, 60, "←", 22, {fw:400, c:C.white, pid:s});

  // Phone button
  const phCx = 108, phCy = 70;
  await ball("ph", phCx, phCy, 36, [0.30, 0.12], s);
  await T("ph-i", phCx-6, phCy-8, "✆", 15, {c:C.iconPri, pid:s});

  // AVATAR — with very prominent blue glow
  const avCx = W/2, avCy = 68;
  const avSz = 54, avGlow = 95;

  // Outer glow — bright blue
  const g1 = await R("av-glow1", avCx-avGlow/2, avCy-avGlow/2, avGlow, avGlow, s);
  await setCR(g1.id, avGlow/2);
  await setG(g1.id, "GRADIENT_RADIAL", [
    {position:0,...C.glow,a:0.75},{position:0.4,...C.glow,a:0.40},{position:0.7,...C.glow,a:0.15},{position:1,...C.glow,a:0},
  ]);

  // Inner shadow glow (slightly smaller)
  const g2sz = avSz*1.2;
  const g2 = await R("av-glow2", avCx-g2sz/2, avCy-g2sz/2, g2sz, g2sz, s);
  await setCR(g2.id, g2sz/2);
  await setG(g2.id, "GRADIENT_RADIAL", [
    {position:0,...C.glow,a:0.50},{position:0.6,...C.glow,a:0.25},{position:1,...C.glow,a:0},
  ]);

  // Frosted ring
  const rnSz = avSz*0.94;
  const avRn = await R("av-rn", avCx-rnSz/2, avCy-rnSz/2, rnSz, rnSz, s);
  await setCR(avRn.id, rnSz/2);
  await setF(avRn.id, C.glassBg, 0.85);
  await setST(avRn.id, C.glow, 1.5, 0.5);

  // Photo
  const avP = await R("av-ph", avCx-avSz/2, avCy-avSz/2, avSz, avSz, s);
  await setCR(avP.id, avSz/2);
  await setF(avP.id, {r:0.102,g:0.039,b:0.180}, 1);
  await T("av-S", avCx-7, avCy-13, "S", 22, {fw:700, c:C.white, pid:s});

  // Video button
  const vidCx = W/2+88, vidCy = 70;
  await ball("vid", vidCx, vidCy, 36, [0.30, 0.12], s);
  await T("vid-i", vidCx-6, vidCy-8, "▶", 14, {c:C.iconPri, pid:s});

  // Stack icon — two overlapping rects
  const stX = 362, stY = 62;
  const st1 = await R("st1", stX, stY, 14, 14, s);
  await setCR(st1.id, 2);
  await setF(st1.id, C.black, 0);
  await setST(st1.id, C.textPri, 1.5, 0.8);
  const st2 = await R("st2", stX+5, stY+5, 14, 14, s);
  await setCR(st2.id, 2);
  await setF(st2.id, C.black, 0);
  await setST(st2.id, C.textPri, 1.5, 0.8);

  // Name
  await T("name", avCx-56, avCy+avGlow/2-14, "Saeed Sharifi", 18, {fw:700, c:C.textPri, pid:s});

  // ── GLASS BALL MENU (expanded, left) ──
  const mX = 8, mY = 235, mW = 48, mH = 200;
  const mBg = await R("m-bg", mX, mY, mW, mH, s);
  await setCR(mBg.id, 24);
  await setF(mBg.id, C.white, 0.93);

  const mc = mX + mW/2;
  let my = mY + 18;

  // Close X in circle
  const xC = await R("x-circ", mc-14, my-1, 28, 28, s);
  await setCR(xC.id, 14);
  await setF(xC.id, C.black, 0);
  await setST(xC.id, C.gray40, 1.5, 0.5);
  await T("x-txt", mc-5, my+4, "✕", 14, {fw:600, c:C.gray40, pid:s});
  my += 46;

  // Send (green circle + blue arrow)
  const sC = await R("s-circ", mc-15, my, 30, 30, s);
  await setCR(sC.id, 15);
  await setF(sC.id, {r:0.22,g:0.58,b:0.35}, 1);
  await T("s-tri", mc-5, my+7, "▶", 12, {c:{r:0.3,g:0.4,b:0.85}, pid:s});
  my += 46;

  // Emoji
  await T("emo", mc-10, my, "☺", 24, {c:C.gray40, pid:s});
  my += 46;

  // Hamburger
  await T("ham", mc-10, my, "≡", 26, {c:C.gray40, pid:s});

  // ── DATE BADGE ──
  const dW=88, dH=26, dX=(W-dW)/2, dY=580;
  const dBg = await R("d-bg", dX, dY, dW, dH, s);
  await setCR(dBg.id, 13);
  await setF(dBg.id, C.dateBadge, 0.80);
  await T("d-txt", dX+10, dY+5, "17/3/2026", 12, {fw:500, c:C.white, pid:s});

  // ── MESSAGE ──
  await T("msg", 20, 645, "H", 16, {c:C.textPri, pid:s});
  await T("msg-t", 20, 668, "15:17", 11, {c:C.textMut, pid:s});

  // ── INPUT AREA ──
  const iy = H - 48;

  // Left ball (bigger glow — it's the "source" of the expanded menu)
  await ball("lb", 36, iy, 44, [0.65, 0.30], s);
  await T("lb-d", 30, iy-12, "⋮", 20, {c:C.white, pid:s});

  // "belo" hint
  await T("belo", 142, iy-12, "belo", 22, {ff:FONT_LOGO, c:{r:0.55,g:0.55,b:0.60}, pid:s});

  // Right ball (mic)
  const rb = await ball("rb", W-36, iy, 40, [0.20, 0.08], s);
  await setST(rb.rn, C.glow, 1.5, 0.25);
  await T("mic", W-43, iy-10, "🎤", 16, {c:C.white, pid:s});

  // Home indicator
  const iW=134, iH=5;
  const ind = await R("ind", (W-iW)/2, H-16, iW, iH, s);
  await setCR(ind.id, 2.5);
  await setF(ind.id, C.white, 0.45);

  // Export
  console.log("Exporting...");
  try {
    const img = await send("export_node_as_image", {nodeId:s, format:"PNG", scale:2});
    if (img?.imageData) {
      require("fs").writeFileSync(
        "c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/emulator-match-v3.png",
        Buffer.from(img.imageData, "base64")
      );
      console.log("Saved v3!");
    }
  } catch(e) { console.log("Export err:", e.message); }

  console.log("Frame:", s);
  ws.close();
  process.exit(0);
}

main().catch(e=>{console.error("FATAL:",e);process.exit(1)});
