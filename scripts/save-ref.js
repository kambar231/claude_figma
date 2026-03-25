#!/usr/bin/env bun
const fs = require("fs"); const path = require("path");
async function main() {
  const res = await fetch("http://localhost:3055/channels");
  const channels = await res.json();
  const ch = Object.entries(channels).sort((a,b) => b[1]-a[1])[0][0];
  const ws = new WebSocket("ws://localhost:3055");
  await new Promise((r,e) => { ws.addEventListener("open",r); ws.addEventListener("error",e); });
  ws.send(JSON.stringify({type:"join",channel:ch}));
  await new Promise(r => setTimeout(r, 2000));

  // Export the first Belo Ball iPhone Variation container for reference
  const id = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const result = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 60000);
    ws.addEventListener("message", (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) { clearTimeout(t); d.message.error ? reject(new Error(d.message.error)) : resolve(d.message.result); }
    });
    // Export Swirl Frame 1
    ws.send(JSON.stringify({id,type:"message",channel:ch,message:{id,command:"export_node_as_image",params:{nodeId:"90:383",format:"PNG",scale:1}}}));
  });
  const buf = Buffer.from(result.imageData, "base64");
  fs.writeFileSync(path.resolve(__dirname, "../ref-home.png"), buf);
  console.log("Saved ref-home.png (" + buf.length + " bytes)");
  ws.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
