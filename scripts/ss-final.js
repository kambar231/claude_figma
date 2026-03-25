const fs = require("fs"); const path = require("path");
async function main() {
  const res = await fetch("http://localhost:3055/channels");
  const ch = Object.entries(await res.json()).sort((a,b) => b[1]-a[1])[0][0];
  const ws = new WebSocket("ws://localhost:3055");
  await new Promise(r => ws.addEventListener("open",r));
  ws.send(JSON.stringify({type:"join",channel:ch}));
  await new Promise(r => setTimeout(r, 2000));
  const id = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const result = await new Promise((resolve,reject) => {
    const t = setTimeout(() => reject("timeout"), 60000);
    ws.addEventListener("message", (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) { clearTimeout(t); resolve(d.message.result); }
    });
    ws.send(JSON.stringify({id,type:"message",channel:ch,message:{id,command:"export_node_as_image",params:{nodeId:"54774:358",format:"PNG",scale:2}}}));
  });
  fs.writeFileSync(path.resolve(__dirname, "../belo-home-final.png"), Buffer.from(result.imageData, "base64"));
  console.log("Saved"); ws.close(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
