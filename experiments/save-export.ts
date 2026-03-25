/**
 * Export frame 54788:2262 (v1.6) and save as iteration-7.png
 */
const CHANNEL = "rkv91cy1";
const WS_URL = "ws://localhost:3055";
const FRAME_ID = "54788:2262";

const pendingRequests = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let ws: any;

function connectAndJoin(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      const id = crypto.randomUUID();
      ws.send(JSON.stringify({ id, type: "join", channel: CHANNEL }));
      setTimeout(resolve, 500);
    };
    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
        if (data.message?.id && pendingRequests.has(data.message.id)) {
          const req = pendingRequests.get(data.message.id)!;
          pendingRequests.delete(data.message.id);
          req.resolve(data.message.result || data.message);
        }
      } catch {}
    };
    ws.onerror = reject;
  });
}

function sendCommand(command: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    ws.send(JSON.stringify({
      id, type: "message", channel: CHANNEL,
      message: { id, command, params: { ...params, commandId: id } },
    }));
    const timeout = setTimeout(() => { pendingRequests.delete(id); reject(new Error("Timeout")); }, 30000);
    pendingRequests.set(id, {
      resolve: (v: any) => { clearTimeout(timeout); resolve(v); },
      reject: (e: any) => { clearTimeout(timeout); reject(e); },
    });
  });
}

async function main() {
  await connectAndJoin();
  console.log("Connected. Exporting frame", FRAME_ID);

  const result = await sendCommand("export_node_as_image", {
    nodeId: FRAME_ID,
    format: "PNG",
    scale: 2,
  });

  if (result.imageData) {
    const buffer = Buffer.from(result.imageData, "base64");
    await Bun.write("c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/iteration-7.png", buffer);
    console.log("Saved iteration-7.png, size:", buffer.length, "bytes");
  } else {
    console.log("No imageData in result:", JSON.stringify(result).slice(0, 200));
  }

  setTimeout(() => { ws.close(); process.exit(0); }, 1000);
}

main().catch(e => { console.error(e); process.exit(1); });
