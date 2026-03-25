#!/usr/bin/env bun
// Create "14. Nebula Storm" with all layers inside a frame using RELATIVE coordinates
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

async function sendCommand(ws, channel, command, params) {
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
    ws.send(JSON.stringify({ id, type: "message", channel, message: { id, command, params } }));
  });
}

async function main() {
  const channel = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 2000));
  console.log(`Connected: ${channel}\n`);

  // Place next to Crystal copy at (2662, 9000) — offset 180px right
  const frameX = 2842;
  const frameY = 9000;

  // Create container frame
  const frame = await sendCommand(ws, channel, "create_frame", {
    name: "14. Nebula Storm", x: frameX, y: frameY, width: 140, height: 140,
  });
  const fid = frame.id;
  await sendCommand(ws, channel, "set_fill_color", { nodeId: fid, r: 0, g: 0, b: 0, a: 0 });
  console.log(`Frame: ${fid}`);

  // All children use RELATIVE coords (0,0 = top-left of frame)
  async function addRect(name, x, y, w, h, radius) {
    const r = await sendCommand(ws, channel, "create_rectangle", {
      name, x, y, width: w, height: h, parentId: fid,
    });
    await sendCommand(ws, channel, "set_corner_radius", { nodeId: r.id, radius });
    return r;
  }

  // Layer 1: Nebula Fog — 140x140 full circle
  const fog = await addRect("Nebula Fog", 0, 0, 140, 140, 70);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: fog.id, gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 0.85, g: 0.15, b: 0.95, a: 0.12, position: 0 },
      { r: 0.1,  g: 0.85, b: 0.7,  a: 0.08, position: 0.35 },
      { r: 0.95, g: 0.4,  b: 0.1,  a: 0.06, position: 0.65 },
      { r: 0.1,  g: 0.2,  b: 0.95, a: 0.0,  position: 1 },
    ],
  });
  console.log("  ✓ Nebula Fog");

  // Layer 2: Storm Ring — 110x110
  const ring = await addRect("Storm Ring", 15, 15, 110, 110, 55);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: ring.id, gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.95, g: 0.2,  b: 0.55, a: 0.15, position: 0 },
      { r: 0.0,  g: 0.95, b: 0.85, a: 0.1,  position: 0.33 },
      { r: 0.95, g: 0.85, b: 0.0,  a: 0.12, position: 0.66 },
      { r: 0.6,  g: 0.0,  b: 0.95, a: 0.0,  position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.15, y: 0.85 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 },
    ],
  });
  console.log("  ✓ Storm Ring");

  // Layer 3: Molten Core — 70x70
  const core = await addRect("Molten Core", 35, 35, 70, 70, 35);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: core.id, gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0,  g: 0.95, b: 0.8,  a: 0.95, position: 0 },
      { r: 0.95, g: 0.5,  b: 0.15, a: 0.8,  position: 0.2 },
      { r: 0.85, g: 0.1,  b: 0.45, a: 0.6,  position: 0.5 },
      { r: 0.35, g: 0.05, b: 0.75, a: 0.4,  position: 0.75 },
      { r: 0.05, g: 0.05, b: 0.3,  a: 0.2,  position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.35, y: 0.3 }, { x: 1.1, y: 0.3 }, { x: 0.35, y: 1.05 },
    ],
  });
  console.log("  ✓ Molten Core");

  // Layer 4: Glass Sphere — 50x50
  const glass = await addRect("Glass Sphere", 45, 40, 50, 50, 25);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: glass.id, gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0, g: 1.0, b: 1.0, a: 0.7,  position: 0 },
      { r: 1.0, g: 0.9, b: 0.95, a: 0.3, position: 0.4 },
      { r: 0.8, g: 0.6, b: 0.9,  a: 0.0, position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.25, y: 0.2 }, { x: 0.9, y: 0.2 }, { x: 0.25, y: 0.85 },
    ],
  });
  console.log("  ✓ Glass Sphere");

  // Layer 5: Caustic Spark — 12x12
  const spark = await addRect("Caustic Spark", 52, 48, 12, 12, 6);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: spark.id, gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0, g: 1.0, b: 1.0, a: 0.95, position: 0 },
      { r: 1.0, g: 1.0, b: 1.0, a: 0.0,  position: 1 },
    ],
  });
  console.log("  ✓ Caustic Spark");

  // Layer 6: Shadow — 50x12
  const shadow = await addRect("Storm Shadow", 45, 128, 50, 12, 6);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: shadow.id, gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 0.3, g: 0.1, b: 0.5, a: 0.15, position: 0 },
      { r: 0.15, g: 0.05, b: 0.35, a: 0.0, position: 1 },
    ],
  });
  console.log("  ✓ Storm Shadow");

  // Layer 7: Electric Arc vertical — 8x65
  const arc1 = await addRect("Electric Arc", 62, 25, 8, 65, 4);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: arc1.id, gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.4, g: 0.9, b: 1.0, a: 0.0, position: 0 },
      { r: 0.5, g: 0.95, b: 1.0, a: 0.25, position: 0.3 },
      { r: 1.0, g: 1.0, b: 1.0, a: 0.4, position: 0.5 },
      { r: 0.5, g: 0.95, b: 1.0, a: 0.25, position: 0.7 },
      { r: 0.4, g: 0.9, b: 1.0, a: 0.0, position: 1 },
    ],
  });
  console.log("  ✓ Electric Arc (vertical)");

  // Layer 8: Electric Arc horizontal — 65x6
  const arc2 = await addRect("Electric Arc 2", 35, 60, 65, 6, 3);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: arc2.id, gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.95, g: 0.4, b: 0.9, a: 0.0, position: 0 },
      { r: 0.95, g: 0.5, b: 1.0, a: 0.2, position: 0.4 },
      { r: 1.0, g: 0.8, b: 1.0, a: 0.35, position: 0.5 },
      { r: 0.95, g: 0.5, b: 1.0, a: 0.2, position: 0.6 },
      { r: 0.95, g: 0.4, b: 0.9, a: 0.0, position: 1 },
    ],
  });
  console.log("  ✓ Electric Arc (horizontal)");

  // Select both balls
  const crystalCopyId = "54769:368";
  await sendCommand(ws, channel, "set_selections", { nodeIds: [crystalCopyId, fid] });

  console.log(`\n✅ Nebula Storm created inside frame ${fid} at (${frameX}, ${frameY})`);
  console.log("Both balls selected — zoom to selection to see them.");
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
