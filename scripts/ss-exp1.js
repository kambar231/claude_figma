const fs = require("fs"); const path = require("path");
async function main() {
  const res = await fetch("http://localhost:3055/channels");
  const ch = Object.entries(await res.json()).sort((a,b) => b[1]-a[1])[0][0];
  const ws = new WebSocket("ws://localhost:3055");
  await new Promise(r => ws.addEventListener("open",r));
  ws.send(JSON.stringify({type:"join",channel:ch}));
  await new Promise(r => setTimeout(r, 2000));
  // Find exp1 frame
  const id1 = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const doc = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject("timeout"), 30000);
    ws.addEventListener("message", function h(ev) {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id1) { ws.removeEventListener("message", h); clearTimeout(t); resolve(d.message.result); }
    });
    ws.send(JSON.stringify({id:id1,type:"message",channel:ch,message:{id:id1,command:"get_document_info",params:{}}}));
  });
  const exp1 = (doc.children || []).find(c => c.name && c.name.includes("Exp1"));
  if (!exp1) { console.log("Exp1 frame not found"); ws.close(); process.exit(1); }
  console.log("Found:", exp1.name, exp1.id);
  const id2 = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const result = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject("timeout"), 60000);
    ws.addEventListener("message", function h(ev) {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id2) { ws.removeEventListener("message", h); clearTimeout(t); resolve(d.message.result); }
    });
    ws.send(JSON.stringify({id:id2,type:"message",channel:ch,message:{id:id2,command:"export_node_as_image",params:{nodeId:exp1.id,format:"PNG",scale:2}}}));
  });
  fs.writeFileSync(path.resolve(__dirname, "../experiments/exp1-result.png"), Buffer.from(result.imageData, "base64"));
  console.log("Saved"); ws.close(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
