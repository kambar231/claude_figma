#!/usr/bin/env bun
// Connects directly to the WebSocket relay and applies Crystal gradient fills
// to the cloned "13. Crystal" belo ball group (54748:349)

const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

// Auto-discover the active plugin channel
async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  // Pick channel with the most clients (the Figma plugin channel)
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No active channels found on relay");
  const [name, count] = sorted[0];
  console.log(`Discovered channel: ${name} (${count} client(s))`);
  return name;
}

const CHANNEL = await discoverChannel();

const GRADIENTS = [
  {
    nodeId: "54748:350", // Rainbow Fog (140x140)
    label: "Rainbow Fog → Crystal Fog",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }],
    gradientStops: [
      { r: 0.4,   g: 0.702, b: 0.875, a: 0.07, position: 0 },
      { r: 0.4,   g: 0.851, b: 0.898, a: 0.05, position: 0.3 },
      { r: 0.502, g: 0.702, b: 0.851, a: 0.04, position: 0.6 },
      { r: 0.502, g: 0.6,   b: 0.851, a: 0,    position: 1 },
    ],
  },
  {
    nodeId: "54748:351", // Inner Halo (90x90)
    label: "Inner Halo",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }],
    gradientStops: [
      { r: 0.502, g: 0.702, b: 0.898, a: 0.1,  position: 0 },
      { r: 0.4,   g: 0.8,   b: 0.851, a: 0.06, position: 0.5 },
      { r: 0.898, g: 0.6,   b: 0.702, a: 0,    position: 1 },
    ],
  },
  {
    nodeId: "54748:352", // Sphere (60x60) — off-center light source
    label: "Sphere",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [
      { x: 0.2857, y: 0.4286 },
      { x: 1,      y: 0.4286 },
      { x: 0.2857, y: 1.1429 },
    ],
    gradientStops: [
      { r: 0.961, g: 0.976, b: 1.0,   a: 0.949, position: 0 },
      { r: 0.906, g: 0.953, b: 0.988, a: 0.875, position: 0.25 },
      { r: 0.851, g: 0.929, b: 0.969, a: 0.749, position: 0.5 },
      { r: 0.8,   g: 0.89,  b: 0.949, a: 0.6,   position: 0.8 },
      { r: 0.749, g: 0.843, b: 0.929, a: 0.451, position: 1 },
    ],
  },
  {
    nodeId: "54748:353", // Bleed Bottom (35x20)
    label: "Bleed Bottom",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }],
    gradientStops: [
      { r: 0.4, g: 0.604, b: 0.8,   a: 0.08, position: 0 },
      { r: 0.4, g: 0.7,   b: 0.651, a: 0,    position: 1 },
    ],
  },
  {
    nodeId: "54748:354", // Bleed Right (20x35)
    label: "Bleed Right",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }],
    gradientStops: [
      { r: 0.4,   g: 0.8,   b: 0.875, a: 0.07, position: 0 },
      { r: 0.502, g: 0.6,   b: 0.851, a: 0,    position: 1 },
    ],
  },
  // 54748:355 Caustic Band — white, keep as-is
  // 54748:356 Specular    — white, keep as-is
  // 54748:357 Caustic Pt  — white, keep as-is
  {
    nodeId: "54748:358", // Shadow (50x18)
    label: "Shadow",
    gradientType: "GRADIENT_RADIAL",
    gradientHandlePositions: [{ x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }],
    gradientStops: [
      { r: 0.78,  g: 0.839, b: 0.875, a: 0.12, position: 0 },
      { r: 0.851, g: 0.8,   b: 0.898, a: 0,    position: 1 },
    ],
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function sendCommand(ws, channel, command, params) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const timeout = setTimeout(() => reject(new Error(`Timeout for ${command}`)), 15000);

    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.message?.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        if (data.message.error) reject(new Error(data.message.error));
        else resolve(data.message.result);
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({
      id,
      type: "message",
      channel,
      message: { id, command, params },
    }));
  });
}

async function waitForPluginPresence(ws, channel) {
  return new Promise((resolve) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "system" && data.message === "A new user has joined the channel") {
        ws.removeEventListener("message", handler);
        resolve();
      }
    };
    ws.addEventListener("message", handler);
    // Also resolve after 2s if plugin was already present when we connected
    setTimeout(resolve, 2000);
  });
}

async function main() {
  console.log(`Connecting to ${RELAY_URL} …`);
  const ws = new WebSocket(RELAY_URL);

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  // Join channel
  ws.send(JSON.stringify({ type: "join", channel: CHANNEL }));
  console.log(`Joined channel: ${CHANNEL}`);

  // Wait briefly for plugin presence
  await waitForPluginPresence(ws, CHANNEL);
  console.log("Plugin is present, applying Crystal gradients …\n");

  for (const g of GRADIENTS) {
    try {
      await sendCommand(ws, CHANNEL, "set_fill_color", {
        nodeId: g.nodeId,
        gradientType: g.gradientType,
        gradientHandlePositions: g.gradientHandlePositions,
        gradientStops: g.gradientStops,
      });
      console.log(`  ✓ ${g.label}`);
    } catch (err) {
      console.error(`  ✗ ${g.label}: ${err.message}`);
    }
  }

  console.log("\nDone! 13. Crystal is ready.");
  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
