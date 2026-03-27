/**
 * Build Belo Group Chat Screen v2.2 in Figma
 * Fixes: tighter message spacing, better ball centering, badge centering,
 * more frosted ball look, refined gradient
 */

const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_X = 26000;
const W = 393;
const H = 852;

const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let ws: any;

function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: crypto.randomUUID(), type: "join", channel: CHANNEL }));
      setTimeout(resolve, 500);
    };
    ws.onmessage = (event: any) => {
      try {
        const d = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
        const id = d.message?.id || d.id;
        if (id && pending.has(id)) { const r = pending.get(id)!; pending.delete(id); r.resolve(d.message?.result || d.message || d); }
      } catch {}
    };
    ws.onerror = reject;
  });
}

function cmd(command: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    ws.send(JSON.stringify({ id, type: "message", channel: CHANNEL, message: { id, command, params: { ...params, commandId: id } } }));
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${command}`)); }, 30000);
    pending.set(id, { resolve: (v: any) => { clearTimeout(t); resolve(v); }, reject: (e: any) => { clearTimeout(t); reject(e); } });
  });
}

const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_BELO = "Bumbbled";

const frame = async (n: string, x: number, y: number, w: number, h: number, p?: string, fc?: any) =>
  (await cmd("create_frame", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}), ...(fc ? { fillColor: fc } : {}) })).id;
const rect = async (n: string, x: number, y: number, w: number, h: number, p?: string) =>
  (await cmd("create_rectangle", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}) })).id;
const txt = async (n: string, x: number, y: number, t: string, fs: number, fw: number, c: any, p?: string, ff?: string) =>
  (await cmd("create_text", { x, y, text: t, fontSize: fs, fontWeight: fw, fontColor: c, name: n, fontFamily: ff || FONT_UI, ...(p ? { parentId: p } : {}) })).id;
const fl = (id: string, r: number, g: number, b: number, a: number) => cmd("set_fill_color", { nodeId: id, r, g, b, a });
const gr = (id: string, type: string, stops: any[], handles?: any[]) => cmd("set_fill_gradient", { nodeId: id, gradientType: type, gradientStops: stops, ...(handles ? { gradientHandlePositions: handles } : {}) });
const rr = (id: string, r: number) => cmd("set_corner_radius", { nodeId: id, radius: r });
const sk = (id: string, r: number, g: number, b: number, a: number, w: number) => cmd("set_stroke_color", { nodeId: id, color: { r, g, b, a }, weight: w });

const coral = { r: 0.91, g: 0.49, b: 0.49, a: 1 };
const teal = { r: 0.37, g: 0.77, b: 0.71, a: 1 };
const lilac = { r: 0.70, g: 0.62, b: 0.86, a: 1 };
const wh = { r: 1, g: 1, b: 1, a: 1 };
const mw = { r: 0.94, g: 0.96, b: 0.99, a: 1 };
const ts = { r: 0.62, g: 0.56, b: 0.71, a: 1 };
const cream = { r: 0.96, g: 0.92, b: 0.87, a: 1 };

async function glass(n: string, cx: number, cy: number, sz: number, F: string) {
  // Subtle glow ring
  const gs = sz + 12;
  const g = await rect(`${n}-gl`, cx - gs / 2, cy - gs / 2, gs, gs, F);
  await gr(g, "GRADIENT_RADIAL", [
    { r: 0.48, g: 0.26, b: 0.68, a: 0, position: 0.40 },
    { r: 0.48, g: 0.26, b: 0.68, a: 0.25, position: 0.64 },
    { r: 0.35, g: 0.15, b: 0.50, a: 0.10, position: 0.84 },
    { r: 0.25, g: 0.10, b: 0.38, a: 0, position: 1 },
  ]);
  await rr(g, gs / 2);

  // Dark body
  const b = await rect(`${n}-bd`, cx - sz / 2, cy - sz / 2, sz, sz, F);
  await gr(b, "GRADIENT_LINEAR", [
    { r: 0.10, g: 0.05, b: 0.16, a: 0.94, position: 0 },
    { r: 0.06, g: 0.03, b: 0.11, a: 0.97, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);
  await rr(b, sz / 2);
  await sk(b, 0.40, 0.24, 0.56, 0.32, 1.2);
  return b;
}

async function build() {
  console.log("=== Building v2.2 ===");
  const F = await frame("Belo Chat v2.2", FRAME_X, 0, W, H, undefined, { r: 0.02, g: 0.008, b: 0.04, a: 1 });
  await rr(F, 50);

  // --- BG ---
  const bg1 = await rect("bg1", 0, 0, W, H, F);
  await gr(bg1, "GRADIENT_RADIAL", [
    { r: 0.58, g: 0.24, b: 0.50, a: 1, position: 0 },
    { r: 0.46, g: 0.16, b: 0.42, a: 1, position: 0.14 },
    { r: 0.34, g: 0.10, b: 0.36, a: 1, position: 0.26 },
    { r: 0.24, g: 0.07, b: 0.28, a: 1, position: 0.40 },
    { r: 0.15, g: 0.04, b: 0.19, a: 1, position: 0.56 },
    { r: 0.08, g: 0.02, b: 0.11, a: 1, position: 0.74 },
    { r: 0.04, g: 0.01, b: 0.06, a: 1, position: 0.90 },
    { r: 0.02, g: 0.005, b: 0.03, a: 1, position: 1 },
  ], [
    { x: 0.50, y: 0.33 },
    { x: 1.25, y: 0.33 },
    { x: 0.50, y: 1.18 },
  ]);
  await rr(bg1, 50);

  // Warm pink overlay
  const bg2 = await rect("bg2", 0, 0, W, H, F);
  await gr(bg2, "GRADIENT_RADIAL", [
    { r: 0.65, g: 0.25, b: 0.48, a: 0.26, position: 0 },
    { r: 0.50, g: 0.17, b: 0.36, a: 0.12, position: 0.22 },
    { r: 0.30, g: 0.08, b: 0.20, a: 0.04, position: 0.40 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.58 },
  ], [
    { x: 0.50, y: 0.28 },
    { x: 1.0, y: 0.28 },
    { x: 0.50, y: 0.72 },
  ]);
  await rr(bg2, 50);

  // Vignette
  const bg3 = await rect("bg3", 0, 0, W, H, F);
  await gr(bg3, "GRADIENT_LINEAR", [
    { r: 0, g: 0, b: 0, a: 0.26, position: 0 },
    { r: 0, g: 0, b: 0, a: 0.04, position: 0.07 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.14 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.86 },
    { r: 0, g: 0, b: 0, a: 0.06, position: 0.93 },
    { r: 0, g: 0, b: 0, a: 0.30, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);
  await rr(bg3, 50);

  // --- STATUS BAR ---
  await txt("time", 28, 14, "2:32", 15, 600, wh, F, "Inter");
  for (let i = 0; i < 4; i++) {
    const sh = 6 + i * 2;
    const s = await rect(`s${i}`, 312 + i * 5, 24 - sh, 3, sh, F);
    await fl(s, 1, 1, 1, 1); await rr(s, 1);
  }
  const bat = await rect("bat", 350, 13, 24, 11, F);
  await fl(bat, 1, 1, 1, 0); await rr(bat, 3); await sk(bat, 1, 1, 1, 0.7, 1);
  const bf = await rect("bf", 352, 15, 18, 7, F); await fl(bf, 1, 1, 1, 1); await rr(bf, 1.5);
  const bt = await rect("bt", 374, 16, 2, 5, F); await fl(bt, 1, 1, 1, 0.7); await rr(bt, 1);

  // --- HEADER ---
  await txt("back", 16, 52, "\u2039", 28, 700, { r: 1, g: 1, b: 1, a: 0.9 }, F, "Inter");

  // Mini avatars
  const avColors = [
    [0.85, 0.72, 0.42],
    [0.78, 0.58, 0.38],
    [0.65, 0.45, 0.30],
  ];
  for (let i = 0; i < 3; i++) {
    const a = await rect(`av${i}`, 46 + i * 13, 53, 22, 22, F);
    await gr(a, "GRADIENT_LINEAR", [
      { r: avColors[i][0], g: avColors[i][1], b: avColors[i][2], a: 1, position: 0 },
      { r: avColors[i][0] * 0.75, g: avColors[i][1] * 0.75, b: avColors[i][2] * 0.75, a: 1, position: 1 },
    ]);
    await rr(a, 11);
    await sk(a, 0.06, 0.03, 0.10, 1, 2);
  }

  // Phone glass (44px)
  const phoneCx = 114;
  await glass("phone", phoneCx, 64, 44, F);
  const pi = await rect("pi", phoneCx - 9, 56, 18, 16, F);
  await fl(pi, 1, 1, 1, 0); await rr(pi, 4); await sk(pi, 1, 1, 1, 0.8, 1.5);

  // === BELO BALL (90px) ===
  const ballCx = W / 2;
  const ballCy = 64;
  const ballR = 45;

  // Glow
  const bGlow = await rect("b-glow", ballCx - ballR - 10, ballCy - ballR - 10, (ballR + 10) * 2, (ballR + 10) * 2, F);
  await gr(bGlow, "GRADIENT_RADIAL", [
    { r: 0.40, g: 0.18, b: 0.55, a: 0.18, position: 0.3 },
    { r: 0.26, g: 0.10, b: 0.38, a: 0.06, position: 0.6 },
    { r: 0.16, g: 0.05, b: 0.25, a: 0, position: 1 },
  ]);
  await rr(bGlow, ballR + 10);

  // Ball body - more frosted/sphere-like with offset radial highlight
  const bl = await rect("ball", ballCx - ballR, ballCy - ballR, ballR * 2, ballR * 2, F);
  await gr(bl, "GRADIENT_RADIAL", [
    { r: 0.24, g: 0.14, b: 0.35, a: 0.92, position: 0 },
    { r: 0.18, g: 0.09, b: 0.28, a: 0.95, position: 0.35 },
    { r: 0.12, g: 0.06, b: 0.20, a: 0.97, position: 0.65 },
    { r: 0.08, g: 0.04, b: 0.14, a: 0.98, position: 1 },
  ], [
    { x: 0.35, y: 0.30 },
    { x: 1.05, y: 0.30 },
    { x: 0.35, y: 1.0 },
  ]);
  await rr(bl, ballR);
  await sk(bl, 0.36, 0.20, 0.50, 0.26, 1.2);

  // Top-left highlight sheen for 3D depth
  const blH = await rect("ball-hi", ballCx - ballR + 10, ballCy - ballR + 6, ballR, ballR * 0.6, F);
  await gr(blH, "GRADIENT_RADIAL", [
    { r: 1, g: 1, b: 1, a: 0.10, position: 0 },
    { r: 1, g: 1, b: 1, a: 0.03, position: 0.5 },
    { r: 1, g: 1, b: 1, a: 0, position: 1 },
  ], [
    { x: 0.3, y: 0.3 },
    { x: 1.0, y: 0.3 },
    { x: 0.3, y: 1.0 },
  ]);
  await rr(blH, 16);

  // "belo" on ball - centered better
  await txt("belo-lbl", ballCx - 26, ballCy - 13, "belo", 22, 400, cream, F, FONT_BELO);

  // Green badge "8"
  const badgeX = ballCx + ballR - 17;
  const badgeY = ballCy + ballR - 17;
  const gb = await rect("badge", badgeX, badgeY, 22, 22, F);
  await fl(gb, 0.15, 0.82, 0.32, 1);
  await rr(gb, 11);
  await txt("badge-n", badgeX + 6, badgeY + 3, "8", 13, 700, wh, F, "Inter");

  // Video glass (44px)
  const vidCx = W / 2 + 86;
  await glass("video", vidCx, 64, 44, F);
  const vi = await rect("vi", vidCx - 10, 57, 14, 12, F);
  await fl(vi, 1, 1, 1, 0); await rr(vi, 2); await sk(vi, 1, 1, 1, 0.8, 1.5);
  const vt = await rect("vt", vidCx + 5, 58, 7, 10, F);
  await fl(vt, 1, 1, 1, 0); await rr(vt, 1); await sk(vt, 1, 1, 1, 0.8, 1.5);

  // Stack icon
  const stackCx = W - 40;
  await glass("copy", stackCx, 64, 44, F);
  const c1 = await rect("c1", stackCx - 9, 56, 12, 15, F);
  await fl(c1, 1, 1, 1, 0); await rr(c1, 2); await sk(c1, 1, 1, 1, 0.8, 1.5);
  const c2 = await rect("c2", stackCx - 4, 60, 12, 15, F);
  await fl(c2, 1, 1, 1, 0); await rr(c2, 2); await sk(c2, 1, 1, 1, 0.8, 1.5);

  // Title
  await txt("title", W / 2 - 42, 113, "belo team", 18, 600, wh, F, FONT_UI);
  await txt("mem", W / 2 - 36, 134, "8 members", 13, 400, { r: 0.62, g: 0.56, b: 0.71, a: 1 }, F, FONT_UI);

  // Divider
  const dv = await rect("div", 20, 152, W - 40, 0.5, F);
  await fl(dv, 1, 1, 1, 0.06);

  // --- MESSAGES (tighter spacing to fit all) ---
  let y = 162;
  const LM = 24;

  async function msg(sender: string | null, color: any, body: string, time: string) {
    if (sender) {
      await txt(`n${y}`, LM, y, sender, 13, 700, color, F, FONT_UI);
      y += 18;
    }
    const lines = body.split("\n");
    await txt(`m${y}`, LM, y, body, 16, 400, mw, F, FONT_UI);
    y += lines.length * 20;
    await txt(`t${y}`, LM, y, time, 11, 400, ts, F, FONT_UI);
    y += 13;
  }

  await msg("Roman OG", coral, "Nope I get to about 90% of the weekly limit\neach week", "11:16");
  y += 4;
  await msg(null, null, "My fleet self adjusts to keep it under", "11:16");
  y += 10;
  await msg("Enis Dev", teal, "Did you see the new Claude cowork", "11:17");
  y += 10;
  await msg("Roman OG", coral, "Indeed, they're just porting all the features\nfrom the open source claude code\ncommunity to their own product which is\ncool", "11:31");
  y += 10;
  await msg("Saeed Sharifi", lilac, "Btw im getting notifications for messages\nbut when i open it it shows nothing", "11:44");
  y += 4;
  await msg(null, null, "I have to refresh the app to see", "11:44");
  y += 10;
  await msg("Roman Dev", coral, "Ok will look into it", "12:39");

  console.log(`Messages end at y=${y}, remaining space: ${H - 80 - y}px`);

  // --- INPUT AREA ---
  const ib = await rect("ibg", 0, H - 78, W, 78, F);
  await gr(ib, "GRADIENT_LINEAR", [
    { r: 0.04, g: 0.015, b: 0.06, a: 0, position: 0 },
    { r: 0.03, g: 0.01, b: 0.05, a: 0.50, position: 0.35 },
    { r: 0.02, g: 0.007, b: 0.035, a: 0.85, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);

  // Menu dots (left, 46px)
  const menuCx = 38;
  const menuCy = H - 35;
  await glass("menu", menuCx, menuCy, 46, F);
  for (let i = 0; i < 3; i++) {
    const d = await rect(`d${i}`, menuCx - 2, menuCy - 10 + i * 9, 4, 4, F);
    await fl(d, 1, 1, 1, 0.7); await rr(d, 2);
  }

  // "belo" placeholder
  await txt("inp-belo", W / 2 - 22, H - 45, "belo", 20, 400, { r: 0.50, g: 0.36, b: 0.58, a: 0.50 }, F, FONT_BELO);

  // "GIF"
  await txt("gif", 282, H - 41, "GIF", 13, 600, { r: 0.50, g: 0.40, b: 0.58, a: 0.50 }, F, FONT_UI);

  // Mic (right, 46px)
  const micCx = W - 38;
  const micCy = H - 35;
  await glass("mic", micCx, micCy, 46, F);
  const mh = await rect("mh", micCx - 5, micCy - 10, 10, 14, F);
  await fl(mh, 1, 1, 1, 0.7); await rr(mh, 5);
  const mst = await rect("mst", micCx - 1, micCy + 6, 2, 5, F);
  await fl(mst, 1, 1, 1, 0.7);

  // Home indicator
  const hi = await rect("hi", W / 2 - 56, H - 8, 113, 4, F);
  await fl(hi, 1, 1, 1, 0.2); await rr(hi, 2);

  // --- EXPORT ---
  console.log("Exporting...");
  const result = await cmd("export_node_as_image", { nodeId: F, format: "PNG", scale: 2 });
  if (result.imageData) {
    await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/iteration-12.png", Buffer.from(result.imageData, "base64"));
    console.log("Saved iteration-12.png");
  }
  console.log("=== v2.2 COMPLETE ===");
}

async function main() {
  await connect();
  await build();
  setTimeout(() => { ws.close(); process.exit(0); }, 2000);
}
main().catch(e => { console.error(e); process.exit(1); });
