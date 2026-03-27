#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM – Pipeline Build
// Source of truth: design-tokens.json + layout-dump.json + emulator screenshot
// Dormant mood background, plain text messages (NO bubbles)
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT_UI = "Inter";
const FONT_LOGO = "Bumbbled";

// Scale factors: layout dump is 411x923, target is 393x852
const SX = 393 / 411;
const SY = 852 / 923;

// Colors from design-tokens.json (dark mode)
const C = {
  bg:        { r: 0.047, g: 0.016, b: 0.082 },  // #0C0415 dormant base
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },  // #F0F6FC
  textSec:   { r: 0.820, g: 0.769, b: 0.914 },  // #D1C4E9
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },  // #9E8FB5
  accent:    { r: 0.729, g: 0.510, b: 0.929 },  // #BA82ED
  glow:      { r: 0.608, g: 0.435, b: 0.831 },  // #9B6FD4 darkGlow
  iconPri:   { r: 0.831, g: 0.722, b: 1.0   },  // #D4B8FF
  iconSec:   { r: 0.620, g: 0.561, b: 0.710 },  // #9E8FB5
  inputBg:   { r: 0.145, g: 0.082, b: 0.271 },  // #251545
  cardBg:    { r: 0.118, g: 0.063, b: 0.188 },  // #1E1030
  bubbleOut: { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7
  divider:   { r: 0.424, g: 0.173, b: 0.655 },  // #6C2CA7 at 0.2 alpha
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
};

// ── Helpers ──
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(t);
        d.message.error ? reject(new Error(JSON.stringify(d.message.error))) : resolve(d.message.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}

async function R(ws, ch, pid, n, x, y, w, h, rad = 0) {
  const r = await cmd(ws, ch, "create_rectangle", { name: n, x, y, width: w, height: h, parentId: pid });
  if (rad > 0) await cmd(ws, ch, "set_corner_radius", { nodeId: r.id, radius: rad });
  return r;
}

async function Circ(ws, ch, pid, n, x, y, sz) {
  return cmd(ws, ch, "create_ellipse", { name: n, x, y, width: sz, height: sz, parentId: pid });
}

async function Txt(ws, ch, pid, n, x, y, content, sz, opts = {}) {
  return cmd(ws, ch, "create_text", {
    name: n, x, y, text: content, fontSize: sz,
    fontFamily: opts.fontFamily || FONT_UI,
    fontWeight: opts.fontWeight || 400,
    fontColor: opts.color || C.textPri,
    parentId: pid,
    ...(opts.letterSpacing !== undefined ? { letterSpacing: opts.letterSpacing } : {}),
  });
}

async function F(ws, ch, id, c, a = 1) {
  await cmd(ws, ch, "set_fill_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a } });
}

async function G(ws, ch, id, type, stops, handles) {
  const p = { nodeId: id, gradientType: type, gradientStops: stops };
  if (handles) p.gradientHandlePositions = handles;
  await cmd(ws, ch, "set_fill_gradient", p);
}

async function S(ws, ch, id, c, weight = 1, a = 1) {
  await cmd(ws, ch, "set_stroke_color", { nodeId: id, color: { r: c.r, g: c.g, b: c.b, a }, weight });
}

async function noFill(ws, ch, id) {
  // set_fill_color plugin has bug: alpha=0 becomes 1. Use a near-zero alpha instead
  await F(ws, ch, id, C.black, 0.005);
}

async function Eff(ws, ch, id, effects) {
  await cmd(ws, ch, "set_effect", { nodeId: id, effects });
}

// Scale from layout dump (411x923) to Figma (393x852)
function sx(v) { return Math.round(v * SX); }
function sy(v) { return Math.round(v * SY); }


async function main() {
  const ch = "rcivyrp1";
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n=== Pipeline Build ===\n`);

  const FX = 30000, FY = 0;

  // == MAIN FRAME ==
  const phone = await cmd(ws, ch, "create_frame", {
    name: "Belo DM - Pipeline Build", x: FX, y: FY, width: W, height: H,
  });
  const P = phone.id;
  await F(ws, ch, P, C.bg, 1);
  await cmd(ws, ch, "set_corner_radius", { nodeId: P, radius: 50 });

  // Gradient overlay for the teal-blue tint visible in the screenshot
  const bgOverlay = await R(ws, ch, P, "BgGrad", 0, 0, W, H, 0);
  await G(ws, ch, bgOverlay.id, "GRADIENT_LINEAR", [
    { r: 0.06, g: 0.04, b: 0.12, a: 1, position: 0 },
    { r: 0.06, g: 0.09, b: 0.15, a: 1, position: 0.55 },
    { r: 0.03, g: 0.02, b: 0.06, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);

  console.log("+ Frame + background gradient");

  // == STATUS BAR ==
  await Txt(ws, ch, P, "Time", 30, 14, "5:30", 15, { fontWeight: 600, color: C.white });
  const battOuter = await R(ws, ch, P, "Batt", W - 39, 16, 27, 13, 4);
  await noFill(ws, ch, battOuter.id);
  await S(ws, ch, battOuter.id, C.white, 1.5);
  const battInner = await R(ws, ch, P, "BattF", W - 37, 18, 18, 9, 2);
  await F(ws, ch, battInner.id, C.white, 0.7);

  console.log("+ Status bar");

  // == HEADER ==
  // From layout dump (scaled):
  // Back: x=8,y=76 -> 8,70
  // Phone circle: x=89,y=72,sz=59 -> 85,66,56
  // Avatar: x=161,y=54,sz=89 -> 154,50,85
  // Video circle: x=263,y=72,sz=59 -> 251,66,56
  // Stack: x=355,y=76,sz=48 -> 339,70,46

  // Back arrow "<"
  await Txt(ws, ch, P, "Back", 14, 72, "<", 28, { fontWeight: 300, color: C.textPri });

  // Phone button
  const phoneBtn = await Circ(ws, ch, P, "PhoneBtn", 85, 66, 56);
  await noFill(ws, ch, phoneBtn.id);
  await S(ws, ch, phoneBtn.id, C.iconPri, 1.5, 0.35);
  // Phone receiver shape: top arc + body + bottom arc
  const phCx = 85 + 28;
  const phCy = 66 + 28;
  const ph1 = await R(ws, ch, P, "Ph1", phCx - 8, phCy - 5, 16, 5, 3);
  await F(ws, ch, ph1.id, C.iconPri, 0.8);
  const ph2 = await R(ws, ch, P, "Ph2", phCx - 3, phCy - 3, 6, 10, 2);
  await F(ws, ch, ph2.id, C.iconPri, 0.8);

  // Avatar with purple glow
  const avX = 154, avY = 50, avSz = 85;
  const avCx = avX + avSz / 2;
  const avCy = avY + avSz / 2;

  // Glow ring
  const glowSz = avSz * 1.55;
  const glow = await Circ(ws, ch, P, "AvGlow", avCx - glowSz / 2, avCy - glowSz / 2, glowSz);
  await G(ws, ch, glow.id, "GRADIENT_RADIAL", [
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.45, position: 0 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.15, position: 0.55 },
    { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.0, position: 1 },
  ]);

  // Avatar circle with gradient
  const av = await Circ(ws, ch, P, "Avatar", avX, avY, avSz);
  await G(ws, ch, av.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.30, g: 0.10, b: 0.50, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  await S(ws, ch, av.id, { r: 0.06, g: 0.02, b: 0.10 }, 3);

  // Avatar initial "S"
  await Txt(ws, ch, P, "AvInit", avCx - 8, avCy - 12, "S", 22, { fontWeight: 700, color: C.white });

  // Video button
  const vidBtn = await Circ(ws, ch, P, "VideoBtn", 251, 66, 56);
  await noFill(ws, ch, vidBtn.id);
  await S(ws, ch, vidBtn.id, C.iconPri, 1.5, 0.35);
  const vidCx = 251 + 28;
  const vidCy = 66 + 28;
  // Camera body + lens
  const camBody = await R(ws, ch, P, "CamBody", vidCx - 9, vidCy - 5, 13, 10, 2);
  await noFill(ws, ch, camBody.id);
  await S(ws, ch, camBody.id, C.iconPri, 1.5);
  const camTri = await R(ws, ch, P, "CamTri", vidCx + 5, vidCy - 3, 5, 6, 1);
  await noFill(ws, ch, camTri.id);
  await S(ws, ch, camTri.id, C.iconPri, 1.5);

  // Stack button (2x2 grid)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const dot = await R(ws, ch, P, `Stk${r}${c}`, 352 + c * 10, 83 + r * 10, 5, 5, 1);
      await F(ws, ch, dot.id, C.textPri, 0.7);
    }
  }

  // Name "Saeed Sharifi" centered below avatar
  const nameY = avY + avSz + 4;
  // Measure-verify: "Saeed Sharifi" at 16px ~= 95px wide
  const nameW = 95;
  await Txt(ws, ch, P, "Name", W / 2 - nameW / 2, nameY, "Saeed Sharifi", 16, { fontWeight: 600, color: C.textPri });

  console.log("+ Header");

  // == DATE BADGE ==
  // From screenshot: centered pill with "17/3/2026", approximately y=620 in Figma coords
  const dateY = 618;
  const dateTxt = "17/3/2026";
  const dateW = 88;
  const dateH = 26;
  const dateBg = await R(ws, ch, P, "DateBg", W / 2 - dateW / 2, dateY, dateW, dateH, dateH / 2);
  await F(ws, ch, dateBg.id, C.accent, 0.12);
  await S(ws, ch, dateBg.id, C.accent, 0.5, 0.25);
  await Txt(ws, ch, P, "DateTxt", W / 2 - 30, dateY + 6, dateTxt, 11, { fontWeight: 500, color: C.textMut });

  console.log("+ Date badge");

  // == MESSAGE "H" (plain text, NO bubble) ==
  const msgY = dateY + dateH + 35;
  // Plain text, left aligned at x=20
  await Txt(ws, ch, P, "MsgH", 20, msgY, "H", 15, { fontWeight: 400, color: C.textPri });
  await Txt(ws, ch, P, "MsgTime", 20, msgY + 20, "15:17", 11, { fontWeight: 400, color: C.textMut });

  console.log("+ Message (plain text)");

  // == INPUT AREA ==
  // Glass ball with 3 vertical dots (left side)
  const gbX = 11, gbY = 770, gbSz = 42;
  const glassBall = await Circ(ws, ch, P, "GlassBall", gbX, gbY, gbSz);
  await G(ws, ch, glassBall.id, "GRADIENT_RADIAL", [
    { r: 0.12, g: 0.08, b: 0.22, a: 0.85, position: 0 },
    { r: 0.08, g: 0.05, b: 0.16, a: 0.55, position: 0.7 },
    { r: 0.05, g: 0.03, b: 0.10, a: 0.35, position: 1 },
  ]);
  await S(ws, ch, glassBall.id, C.accent, 1.2, 0.35);

  // 3 dots (vertical) inside glass ball
  const gbCx = gbX + gbSz / 2;
  const gbCy = gbY + gbSz / 2;
  for (let i = -1; i <= 1; i++) {
    const d = await Circ(ws, ch, P, `GBD${i+1}`, gbCx - 2, gbCy + i * 7 - 2, 3.5);
    await F(ws, ch, d.id, C.textPri, 0.75);
  }

  // "belo" logo text
  await Txt(ws, ch, P, "BeloLogo", 63, 781, "belo", 18, {
    fontFamily: FONT_LOGO, fontWeight: 500, color: C.textPri
  });

  // Mic button (large circle, right side)
  const micX = 318, micY = 761, micSz = 61;
  const micBtn = await Circ(ws, ch, P, "MicBtn", micX, micY, micSz);
  await G(ws, ch, micBtn.id, "GRADIENT_RADIAL", [
    { r: 0.10, g: 0.06, b: 0.18, a: 0.85, position: 0 },
    { r: 0.07, g: 0.04, b: 0.13, a: 0.6, position: 0.6 },
    { r: 0.04, g: 0.02, b: 0.08, a: 0.4, position: 1 },
  ]);
  await S(ws, ch, micBtn.id, C.accent, 1.8, 0.45);

  // Drop shadow glow on mic
  await Eff(ws, ch, micBtn.id, [{
    type: "DROP_SHADOW",
    color: { r: C.glow.r, g: C.glow.g, b: C.glow.b, a: 0.3 },
    offset: { x: 0, y: 0 },
    radius: 12,
    spread: 2,
  }]);

  // Mic icon stem + head
  const micMidX = micX + micSz / 2;
  const micMidY = micY + micSz / 2;
  // Mic head (rounded rect)
  const micHead = await R(ws, ch, P, "MicHead", micMidX - 4, micMidY - 10, 8, 14, 4);
  await noFill(ws, ch, micHead.id);
  await S(ws, ch, micHead.id, C.iconPri, 1.5);
  // Mic stand
  const micStand = await R(ws, ch, P, "MicStand", micMidX - 1, micMidY + 5, 2, 6, 1);
  await F(ws, ch, micStand.id, C.iconPri, 0.8);
  // Mic base
  const micBase = await R(ws, ch, P, "MicBase", micMidX - 5, micMidY + 10, 10, 2, 1);
  await F(ws, ch, micBase.id, C.iconPri, 0.8);

  console.log("+ Input area");

  // == HOME INDICATOR ==
  const homeInd = await R(ws, ch, P, "HomeInd", (W - 134) / 2, H - 10, 134, 5, 3);
  await F(ws, ch, homeInd.id, C.white, 0.2);

  console.log("+ Home indicator");

  // == EXPORT ==
  try {
    const exported = await cmd(ws, ch, "export_node_as_image", { nodeId: P, format: "PNG", scale: 2 });
    const imgData = exported.imageData || exported.data;
    if (imgData) {
      const buf = Buffer.from(imgData, "base64");
      await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/pipeline-result.png", buf);
      console.log("+ Exported to experiments/pipeline-result.png");
    } else {
      console.log("! Export keys:", Object.keys(exported || {}));
    }
  } catch (e) {
    console.log("! Export error:", e.message);
  }

  await cmd(ws, ch, "set_selections", { nodeIds: [P] });
  console.log(`\nDone! Pipeline Build - Frame: ${P} at (${FX},${FY})`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
