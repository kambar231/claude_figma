const fs = require("fs"); const path = require("path");
async function main() {
  const res = await fetch("http://localhost:3055/channels");
  const channels = await res.json();
  const ch = Object.entries(channels).sort((a,b) => b[1]-a[1])[0][0];
  const ws = new WebSocket("ws://localhost:3055");
  await new Promise((r,e) => { ws.addEventListener("open",r); ws.addEventListener("error",e); });
  ws.send(JSON.stringify({type:"join",channel:ch}));
  await new Promise(r => setTimeout(r, 2000));

  function send(command, params) {
    const id = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    return new Promise((resolve,reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 60000);
      ws.addEventListener("message", function handler(ev) {
        const d = JSON.parse(ev.data);
        if (d.message?.id === id) { ws.removeEventListener("message", handler); clearTimeout(t);
          d.message.error ? reject(new Error(JSON.stringify(d.message.error))) : resolve(d.message.result); }
      });
      ws.send(JSON.stringify({id,type:"message",channel:ch,message:{id,command,params}}));
    });
  }

  // Get first phone mockup from Belo Ball iPhone Variations (54715:333)
  const info = await send("get_node_info", {nodeId: "54715:333"});
  // Find first Container child that has a phone mockup
  const containers = (info.children || []).filter(c => c.name === "Container");
  console.log("Found containers:", containers.length);
  
  // Export the whole frame at low scale to see all the variations
  const result = await send("export_node_as_image", {nodeId: "54715:333", format: "PNG", scale: 0.25});
  const buf = Buffer.from(result.imageData, "base64");
  fs.writeFileSync(path.resolve(__dirname, "../ref-variations.png"), buf);
  console.log("Saved ref-variations.png (" + buf.length + " bytes)");
  ws.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
