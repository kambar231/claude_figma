#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat — Emulator Match v2
// Fixes from v1: stronger glows, better icon positioning,
// correct menu colors, better back arrow
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI_MIX = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const OX = 28500, OY = 0; // Place next to v1

const C = {
  gradTop:   { r: 0.169, g: 0.353, b: 0.510 },  // #2B5A82
  gradMid:   { r: 0.118, g: 0.227, b: 0.322 },  // #1E3A52
  gradBot:   { r: 0.067, g: 0.102, b: 0.133 },  // #111A22
  glow:      { r: 0.275, g: 0.549, b: 0.784 },  // #468CC8
  glassBg:   { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },  // #F0F6FC
  textSec:   { r: 0.820, g: 0.769, b: 0.914 },  // #D1C4E9
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },  // #9E8FB5
  dateBadge: { r: 0.831, g: 0.392, b: 0.541 },  // #D4648A
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  menuGray:  { r: 0.4, g: 0.4, b: 0.42 },
  iconPri:   { r: 0.83, g: 0.72, b: 1 },
  sendGreen: { r: 0.25, g: 0.60, b: 0.38 },
  sendBlue:  { r: 0.35, g: 0.45, b: 0.85 },
};

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  return Object.entries(ch).sort((a, b) => b[1] - a[1])[0][0];
}

function genId() { return 'b' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function makeSend(ws, channel) {
  return async (command, params) => {
    return new Promise((resolve, reject) => {
      const id = genId();
      const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
      const handler = (ev) => {
        let d;
        try { d = JSON.parse(typeof ev.data === 'string' ? ev.data : '{}'); } catch { return; }
        if (d.message?.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(t);
          if (d.message.error) reject(new Error(typeof d.message.error === 'string' ? d.message.error : JSON.stringify(d.message.error)));
          else resolve(d.message.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ type: "message", channel, message: { id, command, params } }));
    });
  };
}

async function main() {
  const channel = await discoverChannel();
  console.log("Channel:", channel);

  const ws = new WebSocket(RELAY_URL);
  await new Promise(r => ws.addEventListener("open", r));
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 500));

  const send = makeSend(ws, channel);
  const R = async (n, x, y, w, h, pid) => send("create_rectangle", { name: n, x, y, width: w, height: h, ...(pid ? { parentId: pid } : {}) });
  const T = async (n, x, y, txt, sz, opts = {}) => send("create_text", {
    name: n, x, y, text: txt, fontSize: sz,
    fontFamily: opts.ff || FONT_UI_MIX, fontWeight: opts.fw || 400,
    fontColor: opts.c || C.textPri, ...(opts.pid ? { parentId: opts.pid } : {}),
  });
  const F = async (id, c, a = 1) => send("set_fill_color", { nodeId: id, r: c.r, g: c.g, b: c.b, a });
  const G = async (id, type, stops, handles) => send("set_fill_gradient", {
    nodeId: id, gradientType: type, gradientStops: stops,
    ...(handles ? { gradientHandlePositions: handles } : {}),
  });
  const CR = async (id, r) => send("set_corner_radius", { nodeId: id, radius: r });
  const ST = async (id, c, w = 1, a = 1) => send("set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a }, weight: w });

  // Helper: glass ball with glow
  async function glassBall(name, cx, cy, ballSz, glowAlphas, pid) {
    const glowSz = ballSz * 1.65;
    const ringSz = ballSz * 0.94;
    const glow = await R(name + "-glow", cx - glowSz/2, cy - glowSz/2, glowSz, glowSz, pid);
    await CR(glow.id, glowSz/2);
    await G(glow.id, "GRADIENT_RADIAL", [
      { position: 0, ...C.glow, a: glowAlphas[0] },
      { position: 0.5, ...C.glow, a: glowAlphas[1] },
      { position: 1, ...C.glow, a: 0 },
    ]);
    const ring = await R(name + "-ring", cx - ringSz/2, cy - ringSz/2, ringSz, ringSz, pid);
    await CR(ring.id, ringSz/2);
    await F(ring.id, C.glassBg, 0.85);
    return { glowId: glow.id, ringId: ring.id, cx, cy, ringSz };
  }

  // ══════════════════════════════════════════════════════════════
  // BUILD v2
  // ══════════════════════════════════════════════════════════════

  console.log("1. Main frame...");
  const screen = await send("create_frame", {
    name: "Belo – DM (Emulator Match) v2", x: OX, y: OY, width: W, height: H,
    fillColor: C.gradBot,
  });
  const sid = screen.id;
  await CR(sid, 50);

  // Background gradient
  console.log("2. Background gradient...");
  const bgR = await R("bg-gradient", 0, 0, W, H, sid);
  await CR(bgR.id, 50);
  await G(bgR.id, "GRADIENT_LINEAR", [
    { position: 0.0, ...C.gradTop, a: 1 },
    { position: 0.45, ...C.gradMid, a: 1 },
    { position: 1.0, ...C.gradBot, a: 1 },
  ], [
    { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 },
  ]);

  // Status bar
  console.log("3. Status bar...");
  await T("time", 24, 12, "4:36", 14, { fw: 600, c: C.white, pid: sid });
  // Right side status icons
  await T("status-dot", 340, 14, "●", 6, { c: C.white, pid: sid });
  await T("signal", 320, 10, "▂▄▆█", 8, { c: C.white, pid: sid });
  await T("battery", 356, 12, "▮", 10, { c: C.white, pid: sid });

  // Header
  console.log("4. Header...");

  // Back arrow — chevron left
  await T("back-arrow", 12, 62, "←", 22, { fw: 400, c: C.white, pid: sid });

  // Phone call button
  const phCx = 109, phCy = 72;
  const phBall = await glassBall("phone", phCx, phCy, 36, [0.25, 0.10], sid);
  await T("phone-icon", phCx - 7, phCy - 9, "✆", 16, { c: C.iconPri, pid: sid });

  // Avatar with prominent glow
  const avGlowSz = 89;
  const avSz = 54;
  const avRingSz = avSz * 0.94;
  const avCx = W / 2;
  const avCy = 72;

  // Large glow
  const avGlow = await R("avatar-glow", avCx - avGlowSz/2, avCy - avGlowSz/2, avGlowSz, avGlowSz, sid);
  await CR(avGlow.id, avGlowSz/2);
  await G(avGlow.id, "GRADIENT_RADIAL", [
    { position: 0, ...C.glow, a: 0.70 },
    { position: 0.45, ...C.glow, a: 0.35 },
    { position: 0.7, ...C.glow, a: 0.12 },
    { position: 1, ...C.glow, a: 0.0 },
  ]);

  // Frosted ring
  const avRing = await R("avatar-ring", avCx - avRingSz/2, avCy - avRingSz/2, avRingSz, avRingSz, sid);
  await CR(avRing.id, avRingSz/2);
  await F(avRing.id, C.glassBg, 0.85);
  // Inner glow shadow via stroke
  await ST(avRing.id, C.glow, 1.5, 0.4);

  // Avatar photo circle
  const avPhoto = await R("avatar-photo", avCx - avSz/2, avCy - avSz/2, avSz, avSz, sid);
  await CR(avPhoto.id, avSz/2);
  await F(avPhoto.id, { r: 0.102, g: 0.039, b: 0.180 }, 1);
  await T("avatar-S", avCx - 7, avCy - 12, "S", 22, { fw: 700, c: C.white, pid: sid });

  // Video call button
  const vidCx = 284, vidCy = 72;
  const vidBall = await glassBall("video", vidCx, vidCy, 36, [0.25, 0.10], sid);
  await T("video-icon", vidCx - 7, vidCy - 9, "▶", 14, { c: C.iconPri, pid: sid });

  // Stack icon (two overlapping squares)
  await T("stack-icon", 358, 64, "⧉", 20, { fw: 300, c: C.textPri, pid: sid });

  // "Saeed Sharifi"
  const nameY = avCy + avGlowSz/2 - 12;
  await T("name", avCx - 56, nameY, "Saeed Sharifi", 18, { fw: 700, c: C.textPri, pid: sid });

  // Glass ball menu (LEFT side, expanded)
  console.log("5. Glass ball menu...");
  const menuX = 8, menuY = 245;
  const menuW = 48, menuH = 195;
  const menuBg = await R("menu-bg", menuX, menuY, menuW, menuH, sid);
  await CR(menuBg.id, 24);
  await F(menuBg.id, C.white, 0.93);

  const mCx = menuX + menuW/2;
  let mY = menuY + 18;

  // X close (in a circle outline)
  const closeCirc = await R("close-circ", mCx - 14, mY, 28, 28, sid);
  await CR(closeCirc.id, 14);
  await F(closeCirc.id, C.white, 0);
  await ST(closeCirc.id, C.menuGray, 1.5, 0.6);
  await T("close-x", mCx - 5, mY + 5, "✕", 13, { fw: 600, c: C.menuGray, pid: sid });
  mY += 44;

  // Send/play button (green circle + blue triangle)
  const sendCirc = await R("send-circ", mCx - 15, mY, 30, 30, sid);
  await CR(sendCirc.id, 15);
  await F(sendCirc.id, C.sendGreen, 1);
  await T("send-tri", mCx - 4, mY + 7, "▶", 12, { c: C.sendBlue, pid: sid });
  mY += 44;

  // Emoji/smiley
  await T("emoji", mCx - 10, mY + 2, "☺", 22, { c: C.menuGray, pid: sid });
  mY += 44;

  // Hamburger
  await T("hamburger", mCx - 10, mY + 2, "≡", 24, { c: C.menuGray, pid: sid });

  // Date badge
  console.log("6. Date badge...");
  const dbW = 88, dbH = 26;
  const dbX = (W - dbW) / 2;
  const dbY = 582;
  const dateBg = await R("date-bg", dbX, dbY, dbW, dbH, sid);
  await CR(dateBg.id, 13);
  await F(dateBg.id, C.dateBadge, 0.80);
  await T("date-txt", dbX + 10, dbY + 5, "17/3/2026", 12, { fw: 500, c: C.white, pid: sid });

  // Message "H"
  console.log("7. Message...");
  await T("msg-H", 20, 648, "H", 16, { c: C.textPri, pid: sid });
  await T("msg-time", 20, 670, "15:17", 11, { c: C.textMut, pid: sid });

  // Input area
  console.log("8. Input area...");
  const inputCenterY = H - 46;

  // Left glass ball (attach/menu source)
  const lbCx = 36, lbCy = inputCenterY;
  const lbBall = await glassBall("lb", lbCx, lbCy, 44, [0.60, 0.28], sid);
  await T("lb-dots", lbCx - 3, lbCy - 12, "⋮", 20, { c: { r: 1, g: 1, b: 1 }, pid: sid });

  // "belo" hint
  await T("belo-hint", 140, inputCenterY - 12, "belo", 22, {
    ff: FONT_LOGO, c: { r: 0.55, g: 0.55, b: 0.58 }, pid: sid,
  });

  // Right glass ball (mic)
  const rbCx = W - 36, rbCy = inputCenterY;
  const rbBall = await glassBall("rb", rbCx, rbCy, 40, [0.18, 0.07], sid);
  // Mic icon ring stroke
  await ST(rbBall.ringId, C.glow, 1.5, 0.3);
  await T("mic-icon", rbCx - 6, rbCy - 10, "🎤", 16, { c: C.white, pid: sid });

  // Home indicator
  console.log("9. Home indicator...");
  const indW = 134, indH = 5;
  const ind = await R("home-ind", (W - indW)/2, H - 16, indW, indH, sid);
  await CR(ind.id, 2.5);
  await F(ind.id, C.white, 0.45);

  // Export
  console.log("10. Exporting...");
  try {
    const img = await send("export_node_as_image", { nodeId: sid, format: "PNG", scale: 2 });
    if (img && (img.imageData || img.data)) {
      const buf = Buffer.from(img.imageData || img.data, "base64");
      require("fs").writeFileSync(
        "c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/emulator-match-v2.png", buf
      );
      console.log("Saved to experiments/emulator-match-v2.png");
    }
  } catch (e) {
    console.log("Export error:", e.message);
  }

  console.log("\n=== v2 BUILD COMPLETE ===");
  console.log("Frame ID:", sid);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
