/**
 * Build Belo Group Chat Screen v1.9 in Figma
 * Final refinements: gradient brightness, icon contrast, overall polish
 */

const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_X = 24500;
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

const frame = async (n: string, x: number, y: number, w: number, h: number, p?: string, fc?: any) => (await cmd("create_frame", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}), ...(fc ? { fillColor: fc } : {}) })).id;
const rect = async (n: string, x: number, y: number, w: number, h: number, p?: string) => (await cmd("create_rectangle", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}) })).id;
const txt = async (n: string, x: number, y: number, t: string, fs: number, fw: number, c: any, p?: string) => (await cmd("create_text", { x, y, text: t, fontSize: fs, fontWeight: fw, fontColor: c, name: n, ...(p ? { parentId: p } : {}) })).id;
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

async function glass(n: string, cx: number, cy: number, sz: number, F: string) {
  const gs = sz + 18;
  const g = await rect(`${n}-gl`, cx - gs/2, cy - gs/2, gs, gs, F);
  await gr(g, "GRADIENT_RADIAL", [
    { r: 0.58, g: 0.35, b: 0.8, a: 0, position: 0.42 },
    { r: 0.58, g: 0.35, b: 0.8, a: 0.22, position: 0.65 },
    { r: 0.45, g: 0.22, b: 0.62, a: 0, position: 1 },
  ]);
  await rr(g, gs/2);
  const b = await rect(`${n}-bd`, cx - sz/2, cy - sz/2, sz, sz, F);
  await fl(b, 0.11, 0.055, 0.19, 0.9);
  await rr(b, sz/2);
  await sk(b, 0.5, 0.32, 0.68, 0.22, 1);
  return b;
}

async function build() {
  console.log("=== Building v1.9 ===");
  const F = await frame("Belo Chat v1.9", FRAME_X, 0, W, H, undefined, { r: 0.02, g: 0.008, b: 0.04, a: 1 });
  await rr(F, 50);

  // --- BG: Enhanced gradient ---
  // Main radial - more vivid warm center
  const bg1 = await rect("bg1", 0, 0, W, H, F);
  await gr(bg1, "GRADIENT_RADIAL", [
    { r: 0.58, g: 0.22, b: 0.52, a: 1, position: 0 },
    { r: 0.45, g: 0.15, b: 0.43, a: 1, position: 0.20 },
    { r: 0.32, g: 0.09, b: 0.35, a: 1, position: 0.38 },
    { r: 0.20, g: 0.05, b: 0.24, a: 1, position: 0.55 },
    { r: 0.10, g: 0.03, b: 0.14, a: 1, position: 0.72 },
    { r: 0.04, g: 0.01, b: 0.06, a: 1, position: 0.90 },
    { r: 0.02, g: 0.005, b: 0.03, a: 1, position: 1 },
  ], [
    { x: 0.5, y: 0.30 },
    { x: 1.25, y: 0.30 },
    { x: 0.5, y: 1.15 },
  ]);
  await rr(bg1, 50);

  // Warm pink overlay
  const bg2 = await rect("bg2", 0, 0, W, H, F);
  await gr(bg2, "GRADIENT_RADIAL", [
    { r: 0.62, g: 0.24, b: 0.48, a: 0.28, position: 0 },
    { r: 0.48, g: 0.16, b: 0.35, a: 0.14, position: 0.28 },
    { r: 0.3, g: 0.08, b: 0.2, a: 0.05, position: 0.5 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.7 },
  ], [
    { x: 0.5, y: 0.25 },
    { x: 1.0, y: 0.25 },
    { x: 0.5, y: 0.7 },
  ]);
  await rr(bg2, 50);

  // Edge vignette
  const bg3 = await rect("bg3", 0, 0, W, H, F);
  await gr(bg3, "GRADIENT_LINEAR", [
    { r: 0, g: 0, b: 0, a: 0.35, position: 0 },
    { r: 0, g: 0, b: 0, a: 0.05, position: 0.08 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.15 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.85 },
    { r: 0, g: 0, b: 0, a: 0.1, position: 0.92 },
    { r: 0, g: 0, b: 0, a: 0.4, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);
  await rr(bg3, 50);

  // --- STATUS BAR ---
  await txt("time", 28, 14, "2:32", 15, 600, wh, F);
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
  await txt("back", 16, 50, "\u2039", 30, 300, { r: 1, g: 1, b: 1, a: 0.85 }, F);

  // Mini avatars
  const ac = [[0.82, 0.68, 0.42], [0.75, 0.55, 0.38], [0.68, 0.48, 0.32]];
  for (let i = 0; i < 3; i++) {
    const a = await rect(`av${i}`, 42 + i * 13, 53, 24, 24, F);
    await gr(a, "GRADIENT_LINEAR", [
      { r: ac[i][0], g: ac[i][1], b: ac[i][2], a: 1, position: 0 },
      { r: ac[i][0] * 0.78, g: ac[i][1] * 0.78, b: ac[i][2] * 0.78, a: 1, position: 1 },
    ]);
    await rr(a, 12); await sk(a, 0.06, 0.03, 0.1, 1, 2);
  }

  // Phone glass button
  await glass("phone", 108, 65, 38, F);
  const pi = await rect("pi", 99, 57, 18, 16, F);
  await fl(pi, 1, 1, 1, 0); await rr(pi, 3); await sk(pi, 1, 1, 1, 0.7, 1.5);

  // Belo ball
  const bx = 148, by = 40, bw = 96, bh = 54;
  const bsh = await rect("bsh", bx - 6, by - 3, bw + 12, bh + 6, F);
  await gr(bsh, "GRADIENT_RADIAL", [
    { r: 0.42, g: 0.24, b: 0.55, a: 0.28, position: 0 },
    { r: 0.28, g: 0.14, b: 0.38, a: 0, position: 1 },
  ]);
  await rr(bsh, (bh + 6) / 2);
  const bl = await rect("ball", bx, by, bw, bh, F);
  await gr(bl, "GRADIENT_LINEAR", [
    { r: 0.20, g: 0.10, b: 0.30, a: 0.92, position: 0 },
    { r: 0.12, g: 0.06, b: 0.20, a: 0.95, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);
  await rr(bl, bh / 2); await sk(bl, 0.42, 0.25, 0.55, 0.28, 1);
  await txt("belo-lbl", bx + 24, by + 14, "belo", 20, 400, { r: 0.96, g: 0.92, b: 0.87, a: 1 }, F);

  // Badge
  const gx = bx + bw - 14, gy = by + bh - 18;
  const gb = await rect("badge", gx, gy, 22, 22, F);
  await fl(gb, 0.22, 0.78, 0.38, 1); await rr(gb, 11);
  await txt("badge-n", gx + 6, gy + 4, "8", 12, 700, wh, F);

  // Video glass button
  await glass("video", 284, 65, 38, F);
  const vi = await rect("vi", 275, 58, 14, 11, F);
  await fl(vi, 1, 1, 1, 0); await rr(vi, 2); await sk(vi, 1, 1, 1, 0.7, 1.5);
  const vt = await rect("vt", 290, 59, 8, 9, F);
  await fl(vt, 1, 1, 1, 0); await rr(vt, 1); await sk(vt, 1, 1, 1, 0.7, 1.5);

  // Copy glass button
  await glass("copy", 350, 65, 38, F);
  const c1 = await rect("c1", 341, 57, 11, 14, F);
  await fl(c1, 1, 1, 1, 0); await rr(c1, 2); await sk(c1, 1, 1, 1, 0.7, 1.5);
  const c2 = await rect("c2", 346, 61, 11, 14, F);
  await fl(c2, 1, 1, 1, 0); await rr(c2, 2); await sk(c2, 1, 1, 1, 0.7, 1.5);

  // Title
  await txt("title", W/2 - 36, 100, "belo team", 16, 600, wh, F);
  await txt("mem", W/2 - 30, 120, "8 members", 13, 400, { r: 0.6, g: 0.52, b: 0.7, a: 1 }, F);

  const dv = await rect("div", 20, 142, W - 40, 0.5, F);
  await fl(dv, 1, 1, 1, 0.06);

  // --- MESSAGES ---
  let y = 155;
  const LM = 24;

  async function msg(sender: string | null, color: any, body: string, time: string) {
    if (sender) { await txt(`n${y}`, LM, y, sender, 13, 700, color, F); y += 20; }
    const lines = body.split("\n").length;
    await txt(`m${y}`, LM, y, body, 16, 400, mw, F);
    y += lines * 22;
    await txt(`t${y}`, LM, y, time, 11, 400, ts, F);
    y += 15;
  }

  await msg("Roman OG", coral, "Nope I get to about 90% of the weekly limit\neach week", "11:16");
  y += 6;
  await msg(null, null, "My fleet self adjusts to keep it under", "11:16");
  y += 14;
  await msg("Enis Dev", teal, "Did you see the new Claude cowork", "11:17");
  y += 14;
  await msg("Roman OG", coral, "Indeed, they're just porting all the features\nfrom the open source claude code\ncommunity to their own product which is\ncool", "11:31");
  y += 14;
  await msg("Saeed Sharifi", lilac, "Btw im getting notifications for messages\nbut when i open it it shows nothing", "11:44");
  y += 6;
  await msg(null, null, "I have to refresh the app to see", "11:44");
  y += 14;
  await msg("Roman Dev", coral, "Ok will look into it", "12:39");

  // --- INPUT AREA ---
  const ib = await rect("ibg", 0, H - 82, W, 82, F);
  await gr(ib, "GRADIENT_LINEAR", [
    { r: 0.04, g: 0.015, b: 0.06, a: 0, position: 0 },
    { r: 0.03, g: 0.01, b: 0.05, a: 0.5, position: 0.3 },
    { r: 0.02, g: 0.007, b: 0.035, a: 0.85, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);

  // Menu dots
  await glass("menu", 36, H - 38, 38, F);
  for (let i = 0; i < 3; i++) {
    const d = await rect(`d${i}`, 34, H - 47 + i * 9, 4, 4, F);
    await fl(d, 1, 1, 1, 0.7); await rr(d, 2);
  }

  await txt("inp", W/2 - 18, H - 48, "belo", 20, 400, { r: 0.5, g: 0.36, b: 0.58, a: 0.5 }, F);
  await txt("gif", 290, H - 44, "GIF", 13, 600, { r: 0.5, g: 0.4, b: 0.58, a: 0.5 }, F);

  // Mic
  await glass("mic", W - 36, H - 38, 38, F);
  const mh = await rect("mh", W - 41, H - 48, 10, 14, F);
  await fl(mh, 1, 1, 1, 0.7); await rr(mh, 5);
  const ms = await rect("ms", W - 37, H - 33, 2, 5, F);
  await fl(ms, 1, 1, 1, 0.7);

  // Home indicator
  const hi = await rect("hi", W/2 - 56, H - 8, 113, 4, F);
  await fl(hi, 1, 1, 1, 0.2); await rr(hi, 2);

  // --- EXPORT ---
  const result = await cmd("export_node_as_image", { nodeId: F, format: "PNG", scale: 2 });
  if (result.imageData) {
    await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/iteration-9.png", Buffer.from(result.imageData, "base64"));
    console.log("Saved iteration-9.png");
  }
  console.log("=== v1.9 COMPLETE ===");
}

async function main() {
  await connect();
  await build();
  setTimeout(() => { ws.close(); process.exit(0); }, 2000);
}
main().catch(e => { console.error(e); process.exit(1); });
