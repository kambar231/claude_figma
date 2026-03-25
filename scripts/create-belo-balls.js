#!/usr/bin/env bun
// Clones the Crystal (1. Prism) belo ball and creates a unique "14. Nebula Storm" variant
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels found on relay");
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
    ws.send(JSON.stringify({
      id, type: "message", channel,
      message: { id, command, params },
    }));
  });
}

async function main() {
  const channel = await discoverChannel();
  console.log(`Channel: ${channel}`);

  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 2000));
  console.log("Connected & joined.\n");

  // The clone from previous run is at 54769:349, moved to x:2842
  // Let's use that as our Crystal copy. Now create the unique Nebula Storm.

  // ── Create "14. Nebula Storm" — all layers as rounded rectangles (full corner radius = circle) ──
  console.log("Creating 14. Nebula Storm...\n");

  const baseX = 3022;
  const baseY = 8250;

  // Helper: create a circle (rectangle with corner radius = half size)
  async function createCircle(name, x, y, size) {
    const rect = await sendCommand(ws, channel, "create_rectangle", {
      name,
      x, y,
      width: size,
      height: size,
    });
    await sendCommand(ws, channel, "set_corner_radius", {
      nodeId: rect.id,
      radius: size / 2,
    });
    return rect;
  }

  // Layer 1: Nebula Fog — 140x140 outer glow
  const fog = await createCircle("Nebula Fog", baseX, baseY, 140);
  console.log(`  ✓ Nebula Fog: ${fog.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: fog.id,
    gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 0.85, g: 0.15, b: 0.95, a: 0.12, position: 0 },
      { r: 0.1,  g: 0.85, b: 0.7,  a: 0.08, position: 0.35 },
      { r: 0.95, g: 0.4,  b: 0.1,  a: 0.06, position: 0.65 },
      { r: 0.1,  g: 0.2,  b: 0.95, a: 0.0,  position: 1 },
    ],
  });
  console.log("    gradient applied");

  // Layer 2: Storm Ring — 110x110
  const ring = await createCircle("Storm Ring", baseX + 15, baseY + 15, 110);
  console.log(`  ✓ Storm Ring: ${ring.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: ring.id,
    gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.95, g: 0.2,  b: 0.55, a: 0.15, position: 0 },
      { r: 0.0,  g: 0.95, b: 0.85, a: 0.1,  position: 0.33 },
      { r: 0.95, g: 0.85, b: 0.0,  a: 0.12, position: 0.66 },
      { r: 0.6,  g: 0.0,  b: 0.95, a: 0.0,  position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.15, y: 0.85 },
      { x: 0.85, y: 0.15 },
      { x: 0.85, y: 0.85 },
    ],
  });
  console.log("    gradient applied");

  // Layer 3: Molten Core — 70x70
  const core = await createCircle("Molten Core", baseX + 35, baseY + 35, 70);
  console.log(`  ✓ Molten Core: ${core.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: core.id,
    gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0,  g: 0.95, b: 0.8,  a: 0.95, position: 0 },
      { r: 0.95, g: 0.5,  b: 0.15, a: 0.8,  position: 0.2 },
      { r: 0.85, g: 0.1,  b: 0.45, a: 0.6,  position: 0.5 },
      { r: 0.35, g: 0.05, b: 0.75, a: 0.4,  position: 0.75 },
      { r: 0.05, g: 0.05, b: 0.3,  a: 0.2,  position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.35, y: 0.3 },
      { x: 1.1,  y: 0.3 },
      { x: 0.35, y: 1.05 },
    ],
  });
  console.log("    gradient applied");

  // Layer 4: Glass Sphere highlight — 50x50
  const glass = await createCircle("Glass Sphere", baseX + 45, baseY + 40, 50);
  console.log(`  ✓ Glass Sphere: ${glass.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: glass.id,
    gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0, g: 1.0, b: 1.0, a: 0.7,  position: 0 },
      { r: 1.0, g: 0.9, b: 0.95, a: 0.3, position: 0.4 },
      { r: 0.8, g: 0.6, b: 0.9,  a: 0.0, position: 1 },
    ],
    gradientHandlePositions: [
      { x: 0.25, y: 0.2 },
      { x: 0.9,  y: 0.2 },
      { x: 0.25, y: 0.85 },
    ],
  });
  console.log("    gradient applied");

  // Layer 5: Caustic Spark — 12x12
  const spark = await createCircle("Caustic Spark", baseX + 52, baseY + 48, 12);
  console.log(`  ✓ Caustic Spark: ${spark.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: spark.id,
    gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 1.0, g: 1.0, b: 1.0, a: 0.95, position: 0 },
      { r: 1.0, g: 1.0, b: 1.0, a: 0.0,  position: 1 },
    ],
  });
  console.log("    gradient applied");

  // Layer 6: Shadow — 50x15
  const shadow = await sendCommand(ws, channel, "create_rectangle", {
    name: "Storm Shadow",
    x: baseX + 45,
    y: baseY + 128,
    width: 50,
    height: 12,
  });
  await sendCommand(ws, channel, "set_corner_radius", {
    nodeId: shadow.id,
    radius: 6,
  });
  console.log(`  ✓ Storm Shadow: ${shadow.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: shadow.id,
    gradientType: "GRADIENT_RADIAL",
    gradientStops: [
      { r: 0.3,  g: 0.1,  b: 0.5,  a: 0.15, position: 0 },
      { r: 0.15, g: 0.05, b: 0.35, a: 0.0,  position: 1 },
    ],
  });
  console.log("    gradient applied");

  // Layer 7: Electric Arc — thin 8x65 rectangle with rounded ends
  const arc = await sendCommand(ws, channel, "create_rectangle", {
    name: "Electric Arc",
    x: baseX + 62,
    y: baseY + 25,
    width: 8,
    height: 65,
  });
  await sendCommand(ws, channel, "set_corner_radius", {
    nodeId: arc.id,
    radius: 4,
  });
  console.log(`  ✓ Electric Arc: ${arc.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: arc.id,
    gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.4,  g: 0.9,  b: 1.0,  a: 0.0,  position: 0 },
      { r: 0.5,  g: 0.95, b: 1.0,  a: 0.25, position: 0.3 },
      { r: 1.0,  g: 1.0,  b: 1.0,  a: 0.4,  position: 0.5 },
      { r: 0.5,  g: 0.95, b: 1.0,  a: 0.25, position: 0.7 },
      { r: 0.4,  g: 0.9,  b: 1.0,  a: 0.0,  position: 1 },
    ],
  });
  console.log("    gradient applied");

  // Layer 8: Second arc — cross pattern, 65x8
  const arc2 = await sendCommand(ws, channel, "create_rectangle", {
    name: "Electric Arc 2",
    x: baseX + 35,
    y: baseY + 60,
    width: 65,
    height: 6,
  });
  await sendCommand(ws, channel, "set_corner_radius", {
    nodeId: arc2.id,
    radius: 3,
  });
  console.log(`  ✓ Electric Arc 2: ${arc2.id}`);
  await sendCommand(ws, channel, "set_fill_gradient", {
    nodeId: arc2.id,
    gradientType: "GRADIENT_LINEAR",
    gradientStops: [
      { r: 0.95, g: 0.4,  b: 0.9,  a: 0.0,  position: 0 },
      { r: 0.95, g: 0.5,  b: 1.0,  a: 0.2,  position: 0.4 },
      { r: 1.0,  g: 0.8,  b: 1.0,  a: 0.35, position: 0.5 },
      { r: 0.95, g: 0.5,  b: 1.0,  a: 0.2,  position: 0.6 },
      { r: 0.95, g: 0.4,  b: 0.9,  a: 0.0,  position: 1 },
    ],
  });
  console.log("    gradient applied");

  console.log("\n✅ Done! 14. Nebula Storm created at x:3022, y:8250");
  console.log("Crystal copy is at x:2842, y:8250");
  console.log("Both should be visible next to the original 1. Prism ball.");
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
