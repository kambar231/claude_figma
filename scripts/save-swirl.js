const fs = require("fs"); const path = require("path");
async function main() {
  const res = await fetch("http://localhost:3055/channels");
  const channels = await res.json();
  const ch = Object.entries(channels).sort((a,b) => b[1]-a[1])[0][0];
  const ws = new WebSocket("ws://localhost:3055");
  await new Promise((r,e) => { ws.addEventListener("open",r); ws.addEventListener("error",e); });
  ws.send(JSON.stringify({type:"join",channel:ch}));
  await new Promise(r => setTimeout(r, 2000));

  const frames = [
    { id: "2831:7875", name: "swirl1" },
  ];
  // Try to find Swirl Frame 1 — search for it
  const id1 = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const docInfo = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 30000);
    ws.addEventListener("message", (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id1) { clearTimeout(t); d.message.error ? reject(new Error(d.message.error)) : resolve(d.message.result); }
    });
    ws.send(JSON.stringify({id: id1,type:"message",channel:ch,message:{id: id1,command:"get_document_info",params:{}}}));
  });
  
  // Find Swirl Frame 1 ID
  const swirlNode = (docInfo.children || []).find(c => c.name === "Swirl Frame 1");
  if (!swirlNode) { console.log("Swirl Frame 1 not found"); ws.close(); process.exit(1); }
  
  const id2 = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const result = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 60000);
    ws.addEventListener("message", (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id2) { clearTimeout(t); d.message.error ? reject(new Error(d.message.error)) : resolve(d.message.result); }
    });
    ws.send(JSON.stringify({id: id2,type:"message",channel:ch,message:{id: id2,command:"export_node_as_image",params:{nodeId: swirlNode.id, format:"PNG",scale:1}}}));
  });
  const buf = Buffer.from(result.imageData, "base64");
  fs.writeFileSync(path.resolve(__dirname, "../ref-swirl1.png"), buf);
  console.log("Saved ref-swirl1.png (" + buf.length + " bytes) - ID: " + swirlNode.id);
  ws.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
