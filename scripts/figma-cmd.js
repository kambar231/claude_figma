#!/usr/bin/env bun
// Generic Figma command runner — connects to relay, joins channel, runs commands from JSON arg
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
    const timeout = setTimeout(() => reject(new Error(`Timeout for ${command}`)), 30000);
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
      id, type: "message", channel,
      message: { id, command, params },
    }));
  });
}

async function main() {
  const commands = JSON.parse(process.argv[2] || "[]");
  if (!commands.length) { console.error("Usage: figma-cmd.js '[{\"cmd\":\"...\",\"params\":{}}]'"); process.exit(1); }

  const channel = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 1500));

  const results = [];
  for (const { cmd, params } of commands) {
    try {
      const result = await sendCommand(ws, channel, cmd, params);
      console.log(`✓ ${cmd}:`, JSON.stringify(result).slice(0, 200));
      results.push({ cmd, ok: true, result });
    } catch (err) {
      console.error(`✗ ${cmd}: ${err.message}`);
      results.push({ cmd, ok: false, error: err.message });
    }
  }

  console.log("\n__RESULTS__");
  console.log(JSON.stringify(results, null, 2));
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
