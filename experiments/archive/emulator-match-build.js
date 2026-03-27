#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat — Emulator Match Build
// Matches the REAL Android emulator screenshot (calm mood, blue-teal)
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI_MIX = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const OX = 28000, OY = 0;

// Calm mood gradient (from mood_colors.dart)
const C = {
  gradTop:   { r: 0.169, g: 0.353, b: 0.510 },  // #2B5A82
  gradMid:   { r: 0.118, g: 0.227, b: 0.322 },  // #1E3A52
  gradBot:   { r: 0.067, g: 0.102, b: 0.133 },  // #111A22
  glow:      { r: 0.275, g: 0.549, b: 0.784 },  // #468CC8
  glassBg:   { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },  // #F0F6FC
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },  // #9E8FB5
  dateBadge: { r: 0.831, g: 0.392, b: 0.541 },  // #D4648A
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  menuGray:  { r: 0.35, g: 0.35, b: 0.35 },
  iconPri:   { r: 0.83, g: 0.72, b: 1 },         // #D4B8FF
};

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  const entries = Object.entries(ch).sort((a, b) => b[1] - a[1]);
  console.log("Channels:", entries.map(e => e[0]).join(", "));
  return entries[0][0];
}

function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

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
  console.log("Using channel:", channel);

  const ws = new WebSocket(RELAY_URL);
  await new Promise(r => ws.addEventListener("open", r));
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 500));

  const send = makeSend(ws, channel);

  // Helpers
  const R = async (name, x, y, w, h, pid) => {
    const p = { name, x, y, width: w, height: h };
    if (pid) p.parentId = pid;
    return send("create_rectangle", p);
  };
  const T = async (name, x, y, content, sz, opts = {}) => {
    return send("create_text", {
      name, x, y, text: content, fontSize: sz,
      fontFamily: opts.fontFamily || FONT_UI_MIX,
      fontWeight: opts.fontWeight || 400,
      fontColor: opts.color || C.textPri,
      ...(opts.parentId ? { parentId: opts.parentId } : {}),
    });
  };
  const setFill = async (id, c, a = 1) => send("set_fill_color", { nodeId: id, r: c.r, g: c.g, b: c.b, a });
  // set_fill_gradient: stops are {position, r, g, b, a}, handles need 3 points
  const setGrad = async (id, type, stops, handles) => {
    return send("set_fill_gradient", {
      nodeId: id,
      gradientType: type,
      gradientStops: stops, // [{position, r, g, b, a}]
      ...(handles ? { gradientHandlePositions: handles } : {}),
    });
  };
  const setRadius = async (id, r) => send("set_corner_radius", { nodeId: id, radius: r });

  // ══════════════════════════════════════════════════════════════
  // BUILD
  // ══════════════════════════════════════════════════════════════

  // 1. Main frame
  console.log("1. Main frame...");
  const screen = await send("create_frame", {
    name: "Belo – DM (Emulator Match)", x: OX, y: OY, width: W, height: H,
    fillColor: C.gradBot,
  });
  const sid = screen.id;
  await setRadius(sid, 50);

  // 2. Background gradient (LINEAR top→bottom)
  console.log("2. Background gradient...");
  const bgR = await R("bg-gradient", 0, 0, W, H, sid);
  await setRadius(bgR.id, 50);
  // Handles: 3 points for LINEAR vertical
  await setGrad(bgR.id, "GRADIENT_LINEAR", [
    { position: 0.0, r: C.gradTop.r, g: C.gradTop.g, b: C.gradTop.b, a: 1 },
    { position: 0.45, r: C.gradMid.r, g: C.gradMid.g, b: C.gradMid.b, a: 1 },
    { position: 1.0, r: C.gradBot.r, g: C.gradBot.g, b: C.gradBot.b, a: 1 },
  ], [
    { x: 0.5, y: 0 },   // start
    { x: 0.5, y: 1 },   // end
    { x: 1, y: 0 },     // width handle
  ]);

  // 3. Status bar
  console.log("3. Status bar...");
  await T("time", 24, 14, "4:36", 14, { fontWeight: 600, color: C.white, parentId: sid });

  // 4. Header
  console.log("4. Header...");
  // Back arrow
  await T("back-arrow", 16, 55, "‹", 30, { fontWeight: 300, color: C.white, parentId: sid });

  // Phone call glass ball
  const phGlowSz = 59;
  const phRingSz = 34;
  const phX = 82;
  const phY = 50;
  const phGlow = await R("phone-glow", phX, phY, phGlowSz, phGlowSz, sid);
  await setRadius(phGlow.id, 30);
  await setGrad(phGlow.id, "GRADIENT_RADIAL", [
    { position: 0, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.18 },
    { position: 0.5, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.07 },
    { position: 1, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0 },
  ]);
  const phRing = await R("phone-ring", phX + (phGlowSz - phRingSz) / 2, phY + (phGlowSz - phRingSz) / 2, phRingSz, phRingSz, sid);
  await setRadius(phRing.id, phRingSz / 2);
  await setFill(phRing.id, C.glassBg, 0.85);
  await T("phone-icon", phX + phGlowSz / 2 - 6, phY + phGlowSz / 2 - 8, "✆", 16, { color: C.iconPri, parentId: sid });

  // Center avatar with glow
  const avGlowSz = 89;
  const avSz = 54;
  const avRingSz = 50.8;
  const avCx = W / 2;
  const avTopY = 30;

  const avGlow = await R("avatar-glow", avCx - avGlowSz / 2, avTopY, avGlowSz, avGlowSz, sid);
  await setRadius(avGlow.id, avGlowSz / 2);
  await setGrad(avGlow.id, "GRADIENT_RADIAL", [
    { position: 0, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.60 },
    { position: 0.5, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28 },
    { position: 1, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0 },
  ]);

  const avRing = await R("avatar-ring", avCx - avRingSz / 2, avTopY + (avGlowSz - avRingSz) / 2, avRingSz, avRingSz, sid);
  await setRadius(avRing.id, avRingSz / 2);
  await setFill(avRing.id, C.glassBg, 0.85);

  const avCirc = await R("avatar-photo", avCx - avSz / 2, avTopY + (avGlowSz - avSz) / 2, avSz, avSz, sid);
  await setRadius(avCirc.id, avSz / 2);
  await setFill(avCirc.id, { r: 0.102, g: 0.039, b: 0.180 }, 1); // #1A0A2E

  await T("avatar-initial", avCx - 7, avTopY + (avGlowSz - avSz) / 2 + 14, "S", 20, { fontWeight: 700, color: C.white, parentId: sid });

  // Video call glass ball
  const vidX = 252;
  const vidY = phY;
  const vidGlow = await R("video-glow", vidX, vidY, phGlowSz, phGlowSz, sid);
  await setRadius(vidGlow.id, 30);
  await setGrad(vidGlow.id, "GRADIENT_RADIAL", [
    { position: 0, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.18 },
    { position: 0.5, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.07 },
    { position: 1, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0 },
  ]);
  const vidRing = await R("video-ring", vidX + (phGlowSz - phRingSz) / 2, vidY + (phGlowSz - phRingSz) / 2, phRingSz, phRingSz, sid);
  await setRadius(vidRing.id, phRingSz / 2);
  await setFill(vidRing.id, C.glassBg, 0.85);
  await T("video-icon", vidX + phGlowSz / 2 - 6, vidY + phGlowSz / 2 - 8, "▶", 14, { color: C.iconPri, parentId: sid });

  // Stack icon (far right)
  await T("stack-icon", 362, 66, "⊡", 18, { fontWeight: 300, color: C.textPri, parentId: sid });

  // "Saeed Sharifi" centered below avatar
  const nameY = avTopY + avGlowSz - 4;
  await T("contact-name", avCx - 54, nameY, "Saeed Sharifi", 18, {
    fontWeight: 700, color: C.textPri, parentId: sid,
  });

  // 5. Glass ball menu (expanded, LEFT side)
  console.log("5. Glass ball menu...");
  const menuX = 10;
  const menuY = 250;
  const menuW = 46;
  const menuH = 190;
  const menuBg = await R("menu-bg", menuX, menuY, menuW, menuH, sid);
  await setRadius(menuBg.id, 23);
  await setFill(menuBg.id, C.white, 0.92);

  const menuCx = menuX + menuW / 2;
  let itemY = menuY + 16;

  await T("close-x", menuCx - 7, itemY, "✕", 16, { fontWeight: 500, color: C.menuGray, parentId: sid });
  itemY += 44;

  const sendC = await R("send-circle", menuCx - 15, itemY, 30, 30, sid);
  await setRadius(sendC.id, 15);
  await setFill(sendC.id, { r: 0.2, g: 0.55, b: 0.35 }, 1);
  await T("send-icon", menuCx - 5, itemY + 6, "▶", 13, { color: C.white, parentId: sid });
  itemY += 44;

  await T("emoji-btn", menuCx - 9, itemY, "☺", 20, { color: C.menuGray, parentId: sid });
  itemY += 44;

  await T("hamburger", menuCx - 8, itemY, "≡", 22, { color: C.menuGray, parentId: sid });

  // 6. Date badge
  console.log("6. Date badge...");
  const dbW = 85, dbH = 26;
  const dbX = (W - dbW) / 2;
  const dbY = 585;
  const dateBg = await R("date-badge-bg", dbX, dbY, dbW, dbH, sid);
  await setRadius(dateBg.id, 13);
  await setFill(dateBg.id, C.dateBadge, 0.85);
  await T("date-text", dbX + 10, dbY + 5, "17/3/2026", 12, { fontWeight: 500, color: C.white, parentId: sid });

  // 7. Message "H" + timestamp
  console.log("7. Message...");
  await T("msg-H", 18, 660, "H", 16, { color: C.textPri, parentId: sid });
  await T("msg-time", 18, 682, "15:17", 11, { color: C.textMut, parentId: sid });

  // 8. Input area (bottom)
  console.log("8. Input area...");
  const inputY = H - 72;

  // Left glass ball
  const lbX = 28, lbY = inputY + 10;
  const lbGlowSz = 72;
  const lbRingSz = 41;
  const lbGlow = await R("lb-glow", lbX - lbGlowSz / 2, lbY - lbGlowSz / 2 + 20, lbGlowSz, lbGlowSz, sid);
  await setRadius(lbGlow.id, lbGlowSz / 2);
  await setGrad(lbGlow.id, "GRADIENT_RADIAL", [
    { position: 0, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.60 },
    { position: 0.5, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.28 },
    { position: 1, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0 },
  ]);
  const lbRing = await R("lb-ring", lbX - lbRingSz / 2, lbY - lbRingSz / 2 + 20, lbRingSz, lbRingSz, sid);
  await setRadius(lbRing.id, lbRingSz / 2);
  await setFill(lbRing.id, C.glassBg, 0.85);
  await T("lb-dots", lbX - 3, lbY + 6, "⋮", 18, { color: C.white, parentId: sid });

  // "belo" hint text (very muted)
  await T("belo-hint", 148, inputY + 14, "belo", 20, {
    fontFamily: FONT_LOGO,
    color: { r: 0.6, g: 0.6, b: 0.65 },
    parentId: sid,
  });

  // Right glass ball (mic)
  const rbX = W - 38, rbY = inputY + 10;
  const rbGlowSz = 66;
  const rbRingSz = 38;
  const rbGlow = await R("rb-glow", rbX - rbGlowSz / 2, rbY - rbGlowSz / 2 + 20, rbGlowSz, rbGlowSz, sid);
  await setRadius(rbGlow.id, rbGlowSz / 2);
  await setGrad(rbGlow.id, "GRADIENT_RADIAL", [
    { position: 0, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.18 },
    { position: 0.5, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.07 },
    { position: 1, r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0 },
  ]);
  const rbRing = await R("rb-ring", rbX - rbRingSz / 2, rbY - rbRingSz / 2 + 20, rbRingSz, rbRingSz, sid);
  await setRadius(rbRing.id, rbRingSz / 2);
  await setFill(rbRing.id, C.glassBg, 0.85);
  await T("mic-icon", rbX - 7, rbY + 8, "🎤", 16, { color: C.white, parentId: sid });

  // 9. Home indicator
  console.log("9. Home indicator...");
  const indW = 134, indH = 5;
  const indR = await R("home-indicator", (W - indW) / 2, H - 18, indW, indH, sid);
  await setRadius(indR.id, 2.5);
  await setFill(indR.id, C.white, 0.4);

  // 10. Export
  console.log("10. Exporting...");
  try {
    const img = await send("export_node_as_image", { nodeId: sid, format: "PNG", scale: 2 });
    if (img && (img.imageData || img.data)) {
      const buf = Buffer.from(img.imageData || img.data, "base64");
      require("fs").writeFileSync(
        "c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/emulator-match-v1.png",
        buf
      );
      console.log("Screenshot saved to experiments/emulator-match-v1.png");
    } else {
      console.log("Export result:", JSON.stringify(img).slice(0, 300));
    }
  } catch (e) {
    console.log("Export error:", e.message);
  }

  console.log("\n=== BUILD COMPLETE ===");
  console.log("Frame ID:", sid);
  console.log("Position: (" + OX + ", " + OY + ")");

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
