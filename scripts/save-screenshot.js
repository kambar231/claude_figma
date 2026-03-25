#!/usr/bin/env bun
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const fs = require("fs");
const path = require("path");

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}
function generateId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
async function sendCommand(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const timeout = setTimeout(() => reject(new Error(`Timeout`)), 60000);
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

async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));

  const result = await sendCommand(ws, ch, "export_node_as_image", { nodeId: "54770:479", format: "PNG", scale: 2 });

  const outPath = path.resolve(__dirname, "../belo-home-screen.png");
  const buf = Buffer.from(result.imageData, "base64");
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${buf.length} bytes)`);
  ws.close();
  process.exit(0);
}
main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
