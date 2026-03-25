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

  // Get children of the variations container to find individual phone frames
  const info = await send("get_node_info", {nodeId: "54715:340"});
  // List all children names
  for (const child of (info.children || [])) {
    console.log(`  ${child.id} - ${child.name} (${child.type})`);
    if (child.children) {
      for (const gc of child.children) {
        console.log(`    ${gc.id} - ${gc.name} (${gc.type})`);
      }
    }
  }

  // Export first phone Container child at 2x
  const firstContainer = (info.children || []).find(c => c.type === "FRAME");
  if (firstContainer) {
    const result = await send("export_node_as_image", {nodeId: firstContainer.id, format: "PNG", scale: 2});
    const buf = Buffer.from(result.imageData, "base64");
    fs.writeFileSync(path.resolve(__dirname, "../ref-phone1.png"), buf);
    console.log("\nSaved ref-phone1.png (" + buf.length + " bytes) - " + firstContainer.name);
  }
  ws.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
