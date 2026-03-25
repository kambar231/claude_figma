#!/usr/bin/env bun
import { readFileSync } from "fs";
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";

async function main() {
  const imageData = readFileSync(process.argv[3] || "experiments/avatar-b64-v2.txt", "utf8").trim();
  console.log("Image data length:", imageData.length);

  const res = await fetch(`${RELAY_HTTP}/channels`);
  const channels = await res.json();
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) throw new Error("No channels");
  const channel = sorted[0][0];
  console.log("Channel:", channel);

  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 1500));

  const nodeId = process.argv[2] || "54801:430";
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 30000);
    const handler = (event) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
        if (data.message?.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          if (data.message.error) reject(new Error(data.message.error));
          else resolve(data.message.result);
        }
      } catch(e) {}
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({
      id, type: "message", channel,
      message: { id, command: "set_image_fill", params: { nodeId, imageData, scaleMode: "FILL" } },
    }));
  });

  console.log("Done:", JSON.stringify(result).slice(0, 200));
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
