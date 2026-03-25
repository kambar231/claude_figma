/**
 * Build Belo Group Chat Screen v1.8 in Figma
 * Refinements: brighter gradient, better icons, proportions, clipping fix
 */

const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_X = 24000;
const FRAME_Y = 0;
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
        if (id && pending.has(id)) {
          const r = pending.get(id)!;
          pending.delete(id);
          r.resolve(d.message?.result || d.message || d);
        }
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

// Shorthand helpers
const frame = async (n: string, x: number, y: number, w: number, h: number, p?: string, fc?: any) => {
  const r = await cmd("create_frame", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}), ...(fc ? { fillColor: fc } : {}) });
  return r.id;
};
const rect = async (n: string, x: number, y: number, w: number, h: number, p?: string) => {
  const r = await cmd("create_rectangle", { x, y, width: w, height: h, name: n, ...(p ? { parentId: p } : {}) });
  return r.id;
};
const text = async (n: string, x: number, y: number, t: string, fs: number, fw: number, c: any, p?: string) => {
  const r = await cmd("create_text", { x, y, text: t, fontSize: fs, fontWeight: fw, fontColor: c, name: n, ...(p ? { parentId: p } : {}) });
  return r.id;
};
const fill = (id: string, r: number, g: number, b: number, a: number) => cmd("set_fill_color", { nodeId: id, r, g, b, a });
const grad = (id: string, type: string, stops: any[], handles?: any[]) => cmd("set_fill_gradient", { nodeId: id, gradientType: type, gradientStops: stops, ...(handles ? { gradientHandlePositions: handles } : {}) });
const cr = (id: string, r: number) => cmd("set_corner_radius", { nodeId: id, radius: r });
const sk = (id: string, r: number, g: number, b: number, a: number, w: number) => cmd("set_stroke_color", { nodeId: id, color: { r, g, b, a }, weight: w });

// Colors
const coral = { r: 0.91, g: 0.49, b: 0.49, a: 1 };
const teal = { r: 0.37, g: 0.77, b: 0.71, a: 1 };
const lilac = { r: 0.70, g: 0.62, b: 0.86, a: 1 };
const white = { r: 1, g: 1, b: 1, a: 1 };
const msgW = { r: 0.94, g: 0.96, b: 0.99, a: 1 };
const tsC = { r: 0.62, g: 0.56, b: 0.71, a: 1 };

async function glassBtn(name: string, cx: number, cy: number, sz: number, parent: string) {
  const gs = sz + 16;
  const g = await rect(`${name}-glow`, cx - gs/2, cy - gs/2, gs, gs, parent);
  await grad(g, "GRADIENT_RADIAL", [
    { r: 0.55, g: 0.32, b: 0.78, a: 0, position: 0.45 },
    { r: 0.55, g: 0.32, b: 0.78, a: 0.2, position: 0.68 },
    { r: 0.42, g: 0.22, b: 0.6, a: 0, position: 1 },
  ]);
  await cr(g, gs/2);
  const b = await rect(`${name}-body`, cx - sz/2, cy - sz/2, sz, sz, parent);
  await fill(b, 0.12, 0.06, 0.2, 0.9);
  await cr(b, sz/2);
  await sk(b, 0.48, 0.3, 0.65, 0.2, 1);
  return b;
}

async function build() {
  console.log("=== Building v1.8 ===");

  const F = await frame("Belo Chat v1.8", FRAME_X, FRAME_Y, W, H, undefined, { r: 0.02, g: 0.01, b: 0.05, a: 1 });
  await cr(F, 50);

  // --- BG: three layers for depth ---
  // Base radial - vivid warm center
  const bg1 = await rect("bg1", 0, 0, W, H, F);
  await grad(bg1, "GRADIENT_RADIAL", [
    { r: 0.55, g: 0.20, b: 0.50, a: 1, position: 0 },
    { r: 0.42, g: 0.13, b: 0.42, a: 1, position: 0.22 },
    { r: 0.30, g: 0.08, b: 0.33, a: 1, position: 0.40 },
    { r: 0.18, g: 0.05, b: 0.22, a: 1, position: 0.58 },
    { r: 0.08, g: 0.02, b: 0.12, a: 1, position: 0.78 },
    { r: 0.03, g: 0.01, b: 0.05, a: 1, position: 1 },
  ], [
    { x: 0.5, y: 0.30 },
    { x: 1.2, y: 0.30 },
    { x: 0.5, y: 1.1 },
  ]);
  await cr(bg1, 50);

  // Warm pink overlay
  const bg2 = await rect("bg2", 0, 0, W, H, F);
  await grad(bg2, "GRADIENT_RADIAL", [
    { r: 0.6, g: 0.22, b: 0.45, a: 0.3, position: 0 },
    { r: 0.45, g: 0.14, b: 0.32, a: 0.15, position: 0.3 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.6 },
  ], [
    { x: 0.5, y: 0.25 },
    { x: 0.95, y: 0.25 },
    { x: 0.5, y: 0.7 },
  ]);
  await cr(bg2, 50);

  // Top/bottom darkening vignette
  const bg3 = await rect("bg3", 0, 0, W, H, F);
  await grad(bg3, "GRADIENT_LINEAR", [
    { r: 0, g: 0, b: 0, a: 0.3, position: 0 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.12 },
    { r: 0, g: 0, b: 0, a: 0, position: 0.88 },
    { r: 0, g: 0, b: 0, a: 0.35, position: 1 },
  ], [
    { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 },
  ]);
  await cr(bg3, 50);

  // --- STATUS BAR ---
  await text("time", 28, 14, "2:32", 15, 600, white, F);
  // Signal bars
  for (let i = 0; i < 4; i++) {
    const sh = 6 + i * 2;
    const sy = 24 - sh;
    const s = await rect(`s${i}`, 312 + i * 5, sy, 3, sh, F);
    await fill(s, 1, 1, 1, 1); await cr(s, 1);
  }
  // Battery
  const bat = await rect("bat", 350, 13, 24, 11, F);
  await fill(bat, 1, 1, 1, 0); await cr(bat, 3); await sk(bat, 1, 1, 1, 0.8, 1);
  const batF = await rect("batF", 352, 15, 18, 7, F);
  await fill(batF, 1, 1, 1, 1); await cr(batF, 1.5);
  const batT = await rect("batT", 374, 16, 2, 5, F);
  await fill(batT, 1, 1, 1, 0.8); await cr(batT, 1);

  // --- HEADER ---
  // Back chevron
  await text("back", 16, 50, "\u2039", 30, 300, { r: 1, g: 1, b: 1, a: 0.85 }, F);

  // Mini avatars (overlapping gold circles)
  const avColors = [[0.82, 0.68, 0.42], [0.75, 0.55, 0.38], [0.68, 0.48, 0.32]];
  for (let i = 0; i < 3; i++) {
    const a = await rect(`av${i}`, 42 + i * 13, 53, 24, 24, F);
    await grad(a, "GRADIENT_LINEAR", [
      { r: avColors[i][0], g: avColors[i][1], b: avColors[i][2], a: 1, position: 0 },
      { r: avColors[i][0] * 0.8, g: avColors[i][1] * 0.8, b: avColors[i][2] * 0.8, a: 1, position: 1 },
    ]);
    await cr(a, 12);
    await sk(a, 0.08, 0.04, 0.12, 1, 2);
  }

  // Phone glass button
  await glassBtn("phone", 108, 65, 38, F);
  // Phone/screen icon (rectangle with rounded top)
  const ph = await rect("ph-icon", 99, 57, 18, 16, F);
  await fill(ph, 1, 1, 1, 0); await cr(ph, 3); await sk(ph, 1, 1, 1, 0.65, 1.5);

  // Belo ball
  const bx = 148, by = 40, bw = 96, bh = 54;
  // Shadow
  const bs = await rect("belo-shadow", bx - 6, by - 3, bw + 12, bh + 6, F);
  await grad(bs, "GRADIENT_RADIAL", [
    { r: 0.4, g: 0.22, b: 0.52, a: 0.25, position: 0 },
    { r: 0.25, g: 0.12, b: 0.35, a: 0, position: 1 },
  ]);
  await cr(bs, (bh + 6) / 2);
  // Ball
  const bl = await rect("belo-ball", bx, by, bw, bh, F);
  await grad(bl, "GRADIENT_LINEAR", [
    { r: 0.20, g: 0.10, b: 0.30, a: 0.92, position: 0 },
    { r: 0.12, g: 0.06, b: 0.20, a: 0.95, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);
  await cr(bl, bh / 2);
  await sk(bl, 0.42, 0.25, 0.55, 0.3, 1);
  // "belo" on ball
  await text("belo-lbl", bx + 24, by + 14, "belo", 20, 400, { r: 0.96, g: 0.92, b: 0.87, a: 1 }, F);

  // Green badge
  const gx = bx + bw - 14, gy = by + bh - 18;
  const gb = await rect("badge", gx, gy, 22, 22, F);
  await fill(gb, 0.22, 0.78, 0.38, 1); await cr(gb, 11);
  await text("badge-n", gx + 6, gy + 4, "8", 12, 700, white, F);

  // Video glass button
  await glassBtn("video", 284, 65, 38, F);
  const vb = await rect("vid-icon", 275, 58, 14, 11, F);
  await fill(vb, 1, 1, 1, 0); await cr(vb, 2); await sk(vb, 1, 1, 1, 0.65, 1.5);
  const vt = await rect("vid-tri", 290, 59, 8, 9, F);
  await fill(vt, 1, 1, 1, 0); await cr(vt, 1); await sk(vt, 1, 1, 1, 0.65, 1.5);

  // Copy glass button
  await glassBtn("copy", 350, 65, 38, F);
  const c1 = await rect("copy1", 341, 57, 11, 14, F);
  await fill(c1, 1, 1, 1, 0); await cr(c1, 2); await sk(c1, 1, 1, 1, 0.65, 1.5);
  const c2 = await rect("copy2", 346, 61, 11, 14, F);
  await fill(c2, 1, 1, 1, 0); await cr(c2, 2); await sk(c2, 1, 1, 1, 0.65, 1.5);

  // "belo team" + "8 members"
  await text("title", W/2 - 36, 100, "belo team", 16, 600, white, F);
  await text("members", W/2 - 30, 120, "8 members", 13, 400, { r: 0.6, g: 0.52, b: 0.7, a: 1 }, F);

  // Divider
  const dv = await rect("div", 20, 142, W - 40, 0.5, F);
  await fill(dv, 1, 1, 1, 0.06);

  // --- MESSAGES ---
  let y = 155;
  const LM = 24;

  async function msg(sender: string | null, color: any, body: string, ts: string) {
    if (sender) {
      await text(`n-${y}`, LM, y, sender, 13, 700, color, F);
      y += 20;
    }
    const lines = body.split("\n").length;
    await text(`m-${y}`, LM, y, body, 16, 400, msgW, F);
    y += lines * 22;
    await text(`t-${y}`, LM, y, ts, 11, 400, tsC, F);
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
  const iBg = await rect("input-bg", 0, H - 82, W, 82, F);
  await grad(iBg, "GRADIENT_LINEAR", [
    { r: 0.04, g: 0.015, b: 0.07, a: 0, position: 0 },
    { r: 0.03, g: 0.01, b: 0.06, a: 0.5, position: 0.3 },
    { r: 0.025, g: 0.008, b: 0.04, a: 0.85, position: 1 },
  ], [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }]);

  // Menu dots
  await glassBtn("menu", 36, H - 38, 38, F);
  for (let i = 0; i < 3; i++) {
    const d = await rect(`d${i}`, 34, H - 47 + i * 9, 4, 4, F);
    await fill(d, 1, 1, 1, 0.7); await cr(d, 2);
  }

  // "belo" placeholder
  await text("inp-belo", W/2 - 18, H - 48, "belo", 20, 400, { r: 0.5, g: 0.36, b: 0.6, a: 0.5 }, F);

  // "GIF"
  await text("gif", 290, H - 44, "GIF", 13, 600, { r: 0.5, g: 0.4, b: 0.6, a: 0.45 }, F);

  // Mic
  await glassBtn("mic", W - 36, H - 38, 38, F);
  const mh = await rect("mic-h", W - 41, H - 48, 10, 14, F);
  await fill(mh, 1, 1, 1, 0.7); await cr(mh, 5);
  const ms = await rect("mic-s", W - 37, H - 33, 2, 5, F);
  await fill(ms, 1, 1, 1, 0.7);

  // Home indicator
  const hi = await rect("home", W/2 - 56, H - 8, 113, 4, F);
  await fill(hi, 1, 1, 1, 0.2); await cr(hi, 2);

  // --- EXPORT ---
  const result = await cmd("export_node_as_image", { nodeId: F, format: "PNG", scale: 2 });
  if (result.imageData) {
    await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/iteration-8.png", Buffer.from(result.imageData, "base64"));
    console.log("Saved iteration-8.png");
  }
  console.log("=== v1.8 COMPLETE ===");
}

async function main() {
  await connect();
  await build();
  setTimeout(() => { ws.close(); process.exit(0); }, 2000);
}
main().catch(e => { console.error(e); process.exit(1); });
