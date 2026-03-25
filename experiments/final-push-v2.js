#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat v6.1 — CORRECTED after visual audit
// Key fixes: smaller icons, transparent button circles, dark teal bg,
//            thinner avatar ring, correct proportions
// ══════════════════════════════════════════════════════════════
import { readFileSync } from "fs";

const RELAY_URL = "ws://localhost:3055";
const CHANNEL = "9aztejyj";
const W = 393, H = 852;
const SX = 393 / 411, SY = 852 / 923;

const ICONS = JSON.parse(readFileSync("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/scripts/icon-paths.json", "utf8"));

function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function cmd(ws, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      try {
        const d = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
        if (d.message?.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(t);
          if (d.message.error) { console.error(`  ERR [${command}]:`, d.message.error); reject(new Error(String(d.message.error))); }
          else resolve(d.message.result);
        }
      } catch (e) {}
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: CHANNEL, message: { id, command, params } }));
  });
}

// Helpers
const rect = (ws, p, n, x, y, w, h, r) => cmd(ws, "create_rectangle", { name: n, x, y, width: w, height: h, parentId: p }).then(async res => { if (r > 0) await cmd(ws, "set_corner_radius", { nodeId: res.id, radius: r }); return res; });
const ell = (ws, p, n, x, y, w, h) => cmd(ws, "create_ellipse", { name: n, x, y, width: w, height: h, parentId: p });
const txt = (ws, p, n, x, y, t, sz, opts = {}) => cmd(ws, "create_text", { name: n, x, y, text: t, fontSize: sz, fontFamily: opts.ff || "Inter", fontWeight: opts.fw || 400, fontColor: opts.c || { r: 0.94, g: 0.96, b: 0.99 }, parentId: p });
const fill = (ws, id, r, g, b, a = 1) => cmd(ws, "set_fill_color", { nodeId: id, color: { r, g, b, a } });
const grad = (ws, id, type, stops, handles) => { const p = { nodeId: id, gradientType: type, gradientStops: stops }; if (handles) p.gradientHandlePositions = handles; return cmd(ws, "set_fill_gradient", p); };
const strk = (ws, id, r, g, b, w = 1, a = 1) => cmd(ws, "set_stroke_color", { nodeId: id, color: { r, g, b, a }, weight: w });
const vec = (ws, p, n, x, y, w, h, data) => cmd(ws, "create_vector", { name: n, x, y, width: w, height: h, paths: [{ data, windingRule: "NONZERO" }], parentId: p });
const mfill = (ws, id, fills) => cmd(ws, "set_multiple_fills", { nodeId: id, fills });
const mfx = (ws, id, effects) => cmd(ws, "set_multiple_effects", { nodeId: id, effects });
const nofill = (ws, id) => mfill(ws, id, []);
const mv = (ws, id, x, y) => cmd(ws, "move_node", { nodeId: id, x, y });

async function main() {
  console.log("Connecting...");
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: CHANNEL }));
  await new Promise(r => setTimeout(r, 1500));
  console.log("Connected\n");

  const FX = 34500, FY = 0;
  const frame = await cmd(ws, "create_frame", { name: "Belo DM v7.0 (Final Push)", x: FX, y: FY, width: W, height: H });
  const P = frame.id;
  await cmd(ws, "set_corner_radius", { nodeId: P, radius: 40 });
  console.log(`Frame: ${P}`);

  // ════════════════════════════════════════════════════════════
  // 1. BACKGROUND (15 pts) — dark navy-teal gradient
  // ════════════════════════════════════════════════════════════
  const bg = await rect(ws, P, "BG", 0, 0, W, H, 0);
  await mfill(ws, bg.id, [
    // Emulator: top ~#0E0E1A, center ~#1F3D55, bottom ~#111820
    // Slightly more green/teal in the center to match emulator warmth
    {
      type: "GRADIENT_LINEAR",
      gradientStops: [
        { r: 0.050, g: 0.045, b: 0.085, a: 1, position: 0.0 },   // dark indigo top
        { r: 0.080, g: 0.115, b: 0.185, a: 1, position: 0.22 },  // transitioning
        { r: 0.120, g: 0.230, b: 0.330, a: 1, position: 0.50 },  // teal-blue center
        { r: 0.130, g: 0.250, b: 0.350, a: 1, position: 0.63 },  // peak - more teal
        { r: 0.110, g: 0.210, b: 0.300, a: 1, position: 0.76 },  // still visible
        { r: 0.065, g: 0.095, b: 0.150, a: 1, position: 0.90 },  // fading
        { r: 0.042, g: 0.048, b: 0.085, a: 1, position: 1.0 },   // dark bottom
      ],
      gradientHandlePositions: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }],
    },
  ]);
  console.log("1. Background done");

  // ════════════════════════════════════════════════════════════
  // 2. STATUS BAR
  // ════════════════════════════════════════════════════════════
  await txt(ws, P, "Time", 24, 12, "4:30", 14, { fw: 600, c: { r: 1, g: 1, b: 1 } });
  // Battery
  const bo = await rect(ws, P, "BatO", W - 36, 15, 22, 11, 3);
  await nofill(ws, bo.id); await strk(ws, bo.id, 1, 1, 1, 1, 0.6);
  const bi = await rect(ws, P, "BatI", W - 34, 17, 12, 7, 2);
  await fill(ws, bi.id, 1, 1, 1, 0.6);
  const bt = await rect(ws, P, "BatT", W - 13, 19, 2, 4, 1);
  await fill(ws, bt.id, 1, 1, 1, 0.35);
  console.log("2. Status bar done");

  // ════════════════════════════════════════════════════════════
  // 3. HEADER — back, phone, avatar+glow, video, stack
  // ════════════════════════════════════════════════════════════
  // Emulator positions (logical px, scaled to Figma):
  // Back button:  x=8,  y=76, 48x48 -> back arrow icon centered
  // Phone circle: x=89, y=72, 59x59 -> small icon ~20px
  // Avatar:       x=161,y=54, 89x89 -> ~85px scaled
  // Video circle: x=263,y=72, 59x59 -> small icon ~20px
  // Stack button: x=355,y=76, 48x48 -> stack icon centered

  const hCY = 72 * SY + 28; // vertical center of header row

  // ── BACK ARROW ──
  const backSz = 18;
  const backIcon = await vec(ws, P, "BackArrow",
    16, hCY - backSz / 2, backSz, backSz,
    ICONS.chevron_left.paths[0].data
  );
  await fill(ws, backIcon.id, 1, 1, 1);
  console.log("  Back arrow done");

  // ── PHONE ICON (small, in subtle circle) ──
  const phCX = 89 * SX + 28;
  const phCY = hCY;
  const phCircSz = 36;

  const phCirc = await ell(ws, P, "PhoneCircle", phCX - phCircSz / 2, phCY - phCircSz / 2, phCircSz, phCircSz);
  await nofill(ws, phCirc.id);
  await strk(ws, phCirc.id, 0.45, 0.30, 0.65, 1.0, 0.5);

  const phSz = 14;
  const phIcon = await vec(ws, P, "PhoneIcon",
    phCX - phSz / 2, phCY - phSz / 2, phSz, phSz,
    ICONS.phone.paths[0].data
  );
  await fill(ws, phIcon.id, 1, 1, 1, 0.85);
  console.log("  Phone done");

  // ── AVATAR + GLOW (15 pts) ──
  const avCX = W / 2;
  const avCY = 54 * SY + 42;
  const avSz = 62; // The avatar in emulator is about 62-65px in Figma scale

  // Glow - solid blue ellipse with layer blur for smooth halo (subtle like emulator)
  const glowSz = avSz * 1.05;
  const avGlow = await ell(ws, P, "AvGlow", avCX - glowSz / 2, avCY - glowSz / 2, glowSz, glowSz);
  await fill(ws, avGlow.id, 0.28, 0.38, 0.80, 0.45);
  await mfx(ws, avGlow.id, [
    { type: "LAYER_BLUR", radius: 18 },
  ]);

  // Avatar circle
  const av = await ell(ws, P, "Avatar", avCX - avSz / 2, avCY - avSz / 2, avSz, avSz);
  await grad(ws, av.id, "GRADIENT_LINEAR", [
    { r: 0.42, g: 0.17, b: 0.65, a: 1, position: 0 },
    { r: 0.35, g: 0.12, b: 0.55, a: 1, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }]);
  // No stroke - emulator has barely visible border; the glow provides the ring effect
  await mfx(ws, av.id, [
    { type: "DROP_SHADOW", color: { r: 0.30, g: 0.40, b: 0.85, a: 0.50 }, offset: { x: 0, y: 0 }, radius: 12, spread: 2 },
    { type: "DROP_SHADOW", color: { r: 0.20, g: 0.30, b: 0.70, a: 0.20 }, offset: { x: 0, y: 2 }, radius: 22, spread: 4 },
  ]);

  // Online dot
  const dotSz = 12;
  const onDot = await ell(ws, P, "Online", avCX + avSz / 2 - 8, avCY + avSz / 2 - 8, dotSz, dotSz);
  await fill(ws, onDot.id, 0.20, 0.83, 0.60);
  await strk(ws, onDot.id, 0.04, 0.02, 0.08, 2);

  console.log("  Avatar done");

  // ── VIDEO ICON (small, in subtle circle) ──
  const vidCX = 263 * SX + 28;
  const vidCY = hCY;
  const vidCircSz = 36;

  const vidCirc = await ell(ws, P, "VideoCircle", vidCX - vidCircSz / 2, vidCY - vidCircSz / 2, vidCircSz, vidCircSz);
  await nofill(ws, vidCirc.id);
  await strk(ws, vidCirc.id, 0.45, 0.30, 0.65, 1.0, 0.5);

  const vidSz = 14;
  const vidIcon = await vec(ws, P, "VideoIcon",
    vidCX - vidSz / 2, vidCY - vidSz / 2, vidSz, vidSz,
    ICONS.videocam.paths[0].data
  );
  await fill(ws, vidIcon.id, 1, 1, 1, 0.85);
  console.log("  Video done");

  // ── STACK/FILTER ICON (top right) ──
  const stkCX = 355 * SX + 24;
  const stkCY = hCY;
  const stkSz = 18;
  const stkIcon = await vec(ws, P, "StackIcon",
    stkCX - stkSz / 2, stkCY - stkSz / 2, stkSz, stkSz,
    ICONS.filter_none.paths[0].data
  );
  await fill(ws, stkIcon.id, 1, 1, 1, 0.85);
  console.log("  Stack icon done");

  // ── NAME TEXT ──
  const nameY = avCY + avSz / 2 + 8;
  const nameTxt = await txt(ws, P, "Name", 0, nameY, "Saeed Sharifi", 15, { fw: 600, c: { r: 0.94, g: 0.96, b: 0.99 } });
  // Center: ~13 chars * ~7.5px = ~98px
  await mv(ws, nameTxt.id, avCX - 49, nameY);
  console.log("3. Header done");

  // ════════════════════════════════════════════════════════════
  // 4. DATE BADGE (5 pts)
  // ════════════════════════════════════════════════════════════
  const dateY = 670 * SY;
  const dbW = 80, dbH = 24;
  const dbX = (W - dbW) / 2;
  const dateBg = await rect(ws, P, "DateBg", dbX, dateY, dbW, dbH, 12);
  await fill(ws, dateBg.id, 0.22, 0.12, 0.35, 0.55);
  await strk(ws, dateBg.id, 0.40, 0.25, 0.60, 0.5, 0.3);
  await txt(ws, P, "DateTxt", dbX + 11, dateY + 5, "17/3/2026", 11, { fw: 500, c: { r: 0.70, g: 0.55, b: 0.85 } });
  console.log("4. Date badge done");

  // ════════════════════════════════════════════════════════════
  // 5. MESSAGE "H" + "15:17" (10 pts)
  // ════════════════════════════════════════════════════════════
  const msgY = dateY + dbH + 22;
  await txt(ws, P, "MsgH", 24, msgY, "H", 15, { c: { r: 0.94, g: 0.96, b: 0.99 } });
  await txt(ws, P, "MsgTime", 24, msgY + 20, "15:17", 11, { c: { r: 0.55, g: 0.50, b: 0.65 } });
  console.log("5. Message done");

  // ════════════════════════════════════════════════════════════
  // 6. INPUT AREA (15 pts) — glass balls, belo, mic
  // ════════════════════════════════════════════════════════════

  // Bottom bar - very subtle darkening only
  const barY = H - 65;
  const barBg = await rect(ws, P, "BarBg", 0, barY - 10, W, 75, 0);
  await grad(ws, barBg.id, "GRADIENT_LINEAR", [
    { r: 0.02, g: 0.02, b: 0.04, a: 0.0, position: 0.0 },
    { r: 0.02, g: 0.02, b: 0.05, a: 0.25, position: 0.5 },
    { r: 0.03, g: 0.03, b: 0.06, a: 0.45, position: 1.0 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);

  // ── Glass balls button (left) ──
  const bbX = 12 * SX;
  const bbY = barY + 5;
  const bbSz = 34;

  const bbCirc = await ell(ws, P, "BallsBtn", bbX, bbY, bbSz, bbSz);
  await fill(ws, bbCirc.id, 0.06, 0.03, 0.14, 0.6);
  await strk(ws, bbCirc.id, 0.35, 0.20, 0.55, 1, 0.35);

  // Three small dots vertically
  const bdCX = bbX + bbSz / 2;
  const bdCY = bbY + bbSz / 2;
  for (let i = -1; i <= 1; i++) {
    const d = await ell(ws, P, `Dot${i+1}`, bdCX - 2.5, bdCY + i * 8 - 2.5, 5, 5);
    await fill(ws, d.id, 0.65, 0.45, 0.90, 0.85);
  }
  console.log("  Balls button done");

  // ── "belo" text ──
  const beloX = 60 * SX;
  const beloY = barY + 10;
  const beloTxt = await txt(ws, P, "Belo", beloX, beloY, "belo", 18, {
    ff: "Bumbbled", fw: 400,
    c: { r: 0.65, g: 0.45, b: 0.85 }
  });
  console.log("  Belo text done");

  // ── Mic button (right, dark circle with glow ring) ──
  const micX = 333 * SX;
  const micY = barY - 2;
  const micSz = 46;

  // Outer circle with visible purple ring (matches emulator)
  const micCirc = await ell(ws, P, "MicBtn", micX, micY, micSz, micSz);
  await fill(ws, micCirc.id, 0.05, 0.03, 0.12);
  await strk(ws, micCirc.id, 0.35, 0.22, 0.55, 2.0, 0.5);
  await mfx(ws, micCirc.id, [
    { type: "DROP_SHADOW", color: { r: 0.4, g: 0.30, b: 0.75, a: 0.30 }, offset: { x: 0, y: 0 }, radius: 12, spread: 2 },
    { type: "INNER_SHADOW", color: { r: 0.5, g: 0.4, b: 0.8, a: 0.10 }, offset: { x: 0, y: -1 }, radius: 3, spread: 0 },
  ]);

  // Mic icon
  const micIconSz = 16;
  const micIcon = await vec(ws, P, "MicIcon",
    micX + (micSz - micIconSz) / 2,
    micY + (micSz - micIconSz) / 2,
    micIconSz, micIconSz,
    ICONS.mic.paths[0].data
  );
  await fill(ws, micIcon.id, 1, 1, 1, 0.9);
  console.log("  Mic button done");

  // ════════════════════════════════════════════════════════════
  // 7. HOME INDICATOR (5 pts)
  // ════════════════════════════════════════════════════════════
  const hi = await rect(ws, P, "HomeInd", (W - 134) / 2, H - 10, 134, 5, 3);
  await fill(ws, hi.id, 1, 1, 1, 0.22);
  console.log("7. Home indicator done");

  // ════════════════════════════════════════════════════════════
  // 8. AVATAR IMAGE FILL
  // ════════════════════════════════════════════════════════════
  try {
    const imgB64 = readFileSync("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/avatar-b64-v3.txt", "utf8").trim();
    await cmd(ws, "set_image_fill", { nodeId: av.id, imageData: imgB64, scaleMode: "FILL" });
    console.log("8. Avatar image set");
  } catch (e) {
    console.log("8. Avatar image failed:", e.message);
  }

  // ════════════════════════════════════════════════════════════
  // 9. GLASS/GLOW effects on circles (15 pts)
  // ════════════════════════════════════════════════════════════
  await mfx(ws, phCirc.id, [
    { type: "DROP_SHADOW", color: { r: 0.4, g: 0.25, b: 0.7, a: 0.12 }, offset: { x: 0, y: 0 }, radius: 6, spread: 0 },
  ]);
  await mfx(ws, vidCirc.id, [
    { type: "DROP_SHADOW", color: { r: 0.4, g: 0.25, b: 0.7, a: 0.12 }, offset: { x: 0, y: 0 }, radius: 6, spread: 0 },
  ]);
  console.log("9. Glass effects done");

  // Focus
  await cmd(ws, "set_selections", { nodeIds: [P] });
  console.log(`\nDONE! Frame: ${P} at (${FX}, ${FY})`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("FATAL:", e.message, e.stack); process.exit(1); });
