import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNEL = 'rkv91cy1';
const WS_URL = 'ws://localhost:3055';
const FRAME_ID = '54793:2727';

let ws;
const pending = new Map();

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', channel: CHANNEL }));
      setTimeout(resolve, 800);
    });
    ws.on('message', (data) => {
      try {
        const json = JSON.parse(data.toString());
        if (json.type === 'broadcast' && json.message) {
          const msg = json.message;
          if (msg.id && pending.has(msg.id) && msg.result) {
            pending.get(msg.id).resolve(msg.result);
            pending.delete(msg.id);
          }
        }
      } catch {}
    });
    ws.on('error', reject);
  });
}

function sendCommand(command, params = {}) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout for ${command}`));
    }, 30000);
    pending.set(id, {
      resolve: (result) => { clearTimeout(timeout); resolve(result); }
    });
    ws.send(JSON.stringify({
      id, type: 'message', channel: CHANNEL,
      message: { id, command, params: { ...params, commandId: id } }
    }));
  });
}

async function main() {
  await connect();
  console.log('Connected. Exporting frame...');

  const result = await sendCommand('export_node_as_image', {
    nodeId: FRAME_ID,
    format: 'PNG',
    scale: 2
  });

  if (result.imageData) {
    const buf = Buffer.from(result.imageData, 'base64');
    const outPath = path.join(__dirname, 'emulate-dev-figma.png');
    fs.writeFileSync(outPath, buf);
    console.log(`Saved ${buf.length} bytes to ${outPath}`);
  } else {
    console.log('No imageData in result');
    console.log(JSON.stringify(result).substring(0, 300));
  }

  ws.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
