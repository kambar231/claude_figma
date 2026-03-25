#!/usr/bin/env bun
// Create remaining 3 balls (22-24) that failed due to bug
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels");
  return sorted[0][0];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function sendCommand(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        if (data.message.error) reject(new Error(JSON.stringify(data.message.error)));
        else resolve(data.message.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}

async function addRect(ws, ch, parentId, name, x, y, w, h, radius) {
  const r = await sendCommand(ws, ch, "create_rectangle", { name, x, y, width: w, height: h, parentId });
  await sendCommand(ws, ch, "set_corner_radius", { nodeId: r.id, radius });
  return r;
}

async function applyGradient(ws, ch, nodeId, type, stops, handles) {
  const params = { nodeId, gradientType: type, gradientStops: stops };
  if (handles) params.gradientHandlePositions = handles;
  await sendCommand(ws, ch, "set_fill_gradient", params);
}

const BALLS = [
  {
    name: "22. Quantum Glitch",
    build: async (ws, ch, fid) => {
      const a = await addRect(ws, ch, fid, "Static Field", 0, 0, 140, 140, 70);
      await applyGradient(ws, ch, a.id, "GRADIENT_LINEAR", [
        { r: 0.0, g: 1.0, b: 0.8, a: 0.08, position: 0 },
        { r: 1.0, g: 0.0, b: 0.5, a: 0.06, position: 0.33 },
        { r: 0.0, g: 0.5, b: 1.0, a: 0.08, position: 0.66 },
        { r: 1.0, g: 1.0, b: 0.0, a: 0.0, position: 1 },
      ]);
      const b = await addRect(ws, ch, fid, "Core Matrix", 28, 28, 84, 84, 42);
      await applyGradient(ws, ch, b.id, "GRADIENT_RADIAL", [
        { r: 0.0, g: 0.0, b: 0.15, a: 0.9, position: 0 },
        { r: 0.0, g: 0.1, b: 0.3, a: 0.75, position: 0.4 },
        { r: 0.0, g: 0.2, b: 0.5, a: 0.5, position: 0.7 },
        { r: 0.0, g: 0.3, b: 0.6, a: 0.3, position: 1 },
      ]);
      const c = await addRect(ws, ch, fid, "Glitch R", 30, 50, 80, 6, 1);
      await applyGradient(ws, ch, c.id, "GRADIENT_LINEAR", [
        { r: 1.0, g: 0.0, b: 0.3, a: 0.0, position: 0 },
        { r: 1.0, g: 0.0, b: 0.3, a: 0.5, position: 0.3 },
        { r: 1.0, g: 0.0, b: 0.3, a: 0.0, position: 0.35 },
        { r: 1.0, g: 0.0, b: 0.3, a: 0.4, position: 0.7 },
        { r: 1.0, g: 0.0, b: 0.3, a: 0.0, position: 1 },
      ]);
      const d = await addRect(ws, ch, fid, "Glitch G", 25, 62, 90, 5, 1);
      await applyGradient(ws, ch, d.id, "GRADIENT_LINEAR", [
        { r: 0.0, g: 1.0, b: 0.3, a: 0.0, position: 0 },
        { r: 0.0, g: 1.0, b: 0.3, a: 0.45, position: 0.4 },
        { r: 0.0, g: 1.0, b: 0.3, a: 0.0, position: 0.45 },
        { r: 0.0, g: 1.0, b: 0.3, a: 0.35, position: 0.8 },
        { r: 0.0, g: 1.0, b: 0.3, a: 0.0, position: 1 },
      ]);
      const e = await addRect(ws, ch, fid, "Glitch B", 35, 74, 70, 5, 1);
      await applyGradient(ws, ch, e.id, "GRADIENT_LINEAR", [
        { r: 0.0, g: 0.3, b: 1.0, a: 0.0, position: 0 },
        { r: 0.0, g: 0.3, b: 1.0, a: 0.4, position: 0.5 },
        { r: 0.0, g: 0.3, b: 1.0, a: 0.0, position: 0.55 },
        { r: 0.0, g: 0.3, b: 1.0, a: 0.35, position: 0.9 },
        { r: 0.0, g: 0.3, b: 1.0, a: 0.0, position: 1 },
      ]);
      const f = await addRect(ws, ch, fid, "Pixel Dot", 55, 55, 10, 10, 2);
      await sendCommand(ws, ch, "set_fill_color", { nodeId: f.id, r: 0, g: 1, b: 0.8, a: 0.8 });
      const g = await addRect(ws, ch, fid, "Shadow", 45, 128, 50, 12, 6);
      await applyGradient(ws, ch, g.id, "GRADIENT_RADIAL", [
        { r: 0.0, g: 0.2, b: 0.3, a: 0.12, position: 0 },
        { r: 0.0, g: 0.1, b: 0.15, a: 0.0, position: 1 },
      ]);
    },
  },
  {
    name: "23. Sunset Mirage",
    build: async (ws, ch, fid) => {
      const a = await addRect(ws, ch, fid, "Horizon Glow", 0, 0, 140, 140, 70);
      await applyGradient(ws, ch, a.id, "GRADIENT_LINEAR", [
        { r: 0.95, g: 0.6, b: 0.2, a: 0.1, position: 0 },
        { r: 0.95, g: 0.3, b: 0.4, a: 0.08, position: 0.5 },
        { r: 0.4, g: 0.1, b: 0.6, a: 0.0, position: 1 },
      ], [{ x: 0.5, y: 0.0 }, { x: 0.5, y: 1.0 }, { x: 1.0, y: 0.0 }]);
      const b = await addRect(ws, ch, fid, "Warm Body", 18, 18, 104, 104, 52);
      await applyGradient(ws, ch, b.id, "GRADIENT_LINEAR", [
        { r: 1.0, g: 0.85, b: 0.4, a: 0.9, position: 0 },
        { r: 1.0, g: 0.55, b: 0.3, a: 0.8, position: 0.3 },
        { r: 0.95, g: 0.3, b: 0.35, a: 0.7, position: 0.55 },
        { r: 0.6, g: 0.15, b: 0.5, a: 0.5, position: 0.8 },
        { r: 0.25, g: 0.05, b: 0.4, a: 0.3, position: 1 },
      ], [{ x: 0.5, y: 0.0 }, { x: 0.5, y: 1.0 }, { x: 1.0, y: 0.0 }]);
      const c = await addRect(ws, ch, fid, "Sun Disk", 45, 30, 50, 50, 25);
      await applyGradient(ws, ch, c.id, "GRADIENT_RADIAL", [
        { r: 1.0, g: 0.95, b: 0.85, a: 0.85, position: 0 },
        { r: 1.0, g: 0.75, b: 0.4, a: 0.4, position: 0.5 },
        { r: 1.0, g: 0.5, b: 0.2, a: 0.0, position: 1 },
      ]);
      const d = await addRect(ws, ch, fid, "Heat Wave 1", 20, 70, 100, 4, 2);
      await applyGradient(ws, ch, d.id, "GRADIENT_LINEAR", [
        { r: 1.0, g: 0.6, b: 0.3, a: 0.0, position: 0 },
        { r: 1.0, g: 0.7, b: 0.4, a: 0.2, position: 0.5 },
        { r: 1.0, g: 0.6, b: 0.3, a: 0.0, position: 1 },
      ]);
      const e = await addRect(ws, ch, fid, "Heat Wave 2", 25, 82, 90, 3, 1.5);
      await applyGradient(ws, ch, e.id, "GRADIENT_LINEAR", [
        { r: 0.9, g: 0.4, b: 0.3, a: 0.0, position: 0 },
        { r: 0.95, g: 0.5, b: 0.35, a: 0.15, position: 0.5 },
        { r: 0.9, g: 0.4, b: 0.3, a: 0.0, position: 1 },
      ]);
      const f = await addRect(ws, ch, fid, "Shadow", 45, 128, 50, 12, 6);
      await applyGradient(ws, ch, f.id, "GRADIENT_RADIAL", [
        { r: 0.5, g: 0.2, b: 0.3, a: 0.12, position: 0 },
        { r: 0.3, g: 0.1, b: 0.2, a: 0.0, position: 1 },
      ]);
    },
  },
  {
    name: "24. Diamond Dust",
    build: async (ws, ch, fid) => {
      const a = await addRect(ws, ch, fid, "Prismatic Haze", 0, 0, 140, 140, 70);
      await applyGradient(ws, ch, a.id, "GRADIENT_RADIAL", [
        { r: 0.9, g: 0.85, b: 1.0, a: 0.08, position: 0 },
        { r: 0.7, g: 0.8, b: 0.95, a: 0.05, position: 0.5 },
        { r: 0.6, g: 0.7, b: 0.9, a: 0.0, position: 1 },
      ]);
      const b = await addRect(ws, ch, fid, "Diamond Body", 20, 20, 100, 100, 50);
      await applyGradient(ws, ch, b.id, "GRADIENT_RADIAL", [
        { r: 1.0, g: 1.0, b: 1.0, a: 0.95, position: 0 },
        { r: 0.95, g: 0.95, b: 0.98, a: 0.88, position: 0.2 },
        { r: 0.88, g: 0.9, b: 0.95, a: 0.78, position: 0.45 },
        { r: 0.8, g: 0.85, b: 0.92, a: 0.65, position: 0.7 },
        { r: 0.7, g: 0.78, b: 0.88, a: 0.45, position: 1 },
      ], [{ x: 0.3, y: 0.25 }, { x: 1.0, y: 0.25 }, { x: 0.3, y: 0.95 }]);
      const c = await addRect(ws, ch, fid, "Refract Red", 35, 42, 60, 3, 1.5);
      await applyGradient(ws, ch, c.id, "GRADIENT_LINEAR", [
        { r: 1.0, g: 0.2, b: 0.2, a: 0.0, position: 0 },
        { r: 1.0, g: 0.2, b: 0.2, a: 0.25, position: 0.5 },
        { r: 1.0, g: 0.2, b: 0.2, a: 0.0, position: 1 },
      ]);
      const d = await addRect(ws, ch, fid, "Refract Green", 30, 55, 70, 3, 1.5);
      await applyGradient(ws, ch, d.id, "GRADIENT_LINEAR", [
        { r: 0.2, g: 1.0, b: 0.3, a: 0.0, position: 0 },
        { r: 0.2, g: 1.0, b: 0.3, a: 0.2, position: 0.5 },
        { r: 0.2, g: 1.0, b: 0.3, a: 0.0, position: 1 },
      ]);
      const e = await addRect(ws, ch, fid, "Refract Blue", 40, 68, 55, 3, 1.5);
      await applyGradient(ws, ch, e.id, "GRADIENT_LINEAR", [
        { r: 0.2, g: 0.3, b: 1.0, a: 0.0, position: 0 },
        { r: 0.2, g: 0.3, b: 1.0, a: 0.22, position: 0.5 },
        { r: 0.2, g: 0.3, b: 1.0, a: 0.0, position: 1 },
      ]);
      const f = await addRect(ws, ch, fid, "Brilliant Cut", 48, 38, 30, 30, 15);
      await applyGradient(ws, ch, f.id, "GRADIENT_RADIAL", [
        { r: 1.0, g: 1.0, b: 1.0, a: 0.9, position: 0 },
        { r: 0.98, g: 0.95, b: 1.0, a: 0.0, position: 1 },
      ]);
      const g = await addRect(ws, ch, fid, "Sparkle 1", 38, 32, 8, 8, 4);
      await sendCommand(ws, ch, "set_fill_color", { nodeId: g.id, r: 1, g: 1, b: 1, a: 0.7 });
      const h = await addRect(ws, ch, fid, "Sparkle 2", 75, 58, 6, 6, 3);
      await sendCommand(ws, ch, "set_fill_color", { nodeId: h.id, r: 1, g: 1, b: 1, a: 0.5 });
      const i = await addRect(ws, ch, fid, "Shadow", 45, 128, 50, 12, 6);
      await applyGradient(ws, ch, i.id, "GRADIENT_RADIAL", [
        { r: 0.5, g: 0.5, b: 0.6, a: 0.1, position: 0 },
        { r: 0.3, g: 0.3, b: 0.4, a: 0.0, position: 1 },
      ]);
    },
  },
];

async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${ch}\n`);

  // Positions: continue row 2 from where it left off
  const positions = [
    { x: 3022, y: 9400 },  // 22. Quantum Glitch
    { x: 3202, y: 9400 },  // 23. Sunset Mirage
    { x: 3382, y: 9400 },  // 24. Diamond Dust
  ];

  const createdIds = [];
  for (let i = 0; i < BALLS.length; i++) {
    const ball = BALLS[i];
    const { x, y } = positions[i];
    console.log(`Creating ${ball.name} at (${x}, ${y})...`);

    const frame = await sendCommand(ws, ch, "create_frame", {
      name: ball.name, x, y, width: 140, height: 140,
    });
    await sendCommand(ws, ch, "set_fill_color", { nodeId: frame.id, r: 0, g: 0, b: 0, a: 0 });
    await ball.build(ws, ch, frame.id);
    createdIds.push(frame.id);
    console.log(`  ✓ ${ball.name} done\n`);
  }

  await sendCommand(ws, ch, "set_selections", { nodeIds: createdIds });
  console.log(`✅ Created remaining 3 balls!`);
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
