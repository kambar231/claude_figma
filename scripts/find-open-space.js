#!/usr/bin/env bun
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function sendCommand(ws, channel, command, params) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const timeout = setTimeout(() => reject(new Error(`Timeout`)), 30000);
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

  const doc = await sendCommand(ws, channel, "get_document_info", {});
  let maxX = -Infinity, maxY = -Infinity;

  console.log("All top-level nodes:\n");
  for (const child of doc.children || []) {
    const info = await sendCommand(ws, channel, "get_node_info", { nodeId: child.id });
    const bb = info.absoluteBoundingBox;
    if (bb) {
      const right = bb.x + bb.width;
      const bottom = bb.y + bb.height;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
      console.log(`  ${info.name.slice(0,35).padEnd(35)} x:${bb.x} y:${bb.y} → right:${right} bottom:${bottom}`);
    }
  }

  console.log(`\n══════════════════════════════`);
  console.log(`Max right edge: ${maxX}`);
  console.log(`Max bottom edge: ${maxY}`);
  console.log(`\nSafe open space: x:${maxX + 200}, y:0`);
  console.log(`Or below all: x:0, y:${maxY + 200}`);

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
