const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const math = Math;
const W = 393, H = 852;

async function discoverChannel() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  return Object.entries(ch).sort((a, b) => b[1] - a[1])[0][0];
}
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
async function cmd(ws, ch, command, params) {
  return new Promise((resolve, reject) => {
    const id = genId();
    const t = setTimeout(() => reject(new Error(`Timeout: ${command}`)), 30000);
    const handler = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.message?.id === id) { ws.removeEventListener("message", handler); clearTimeout(t);
        d.message.error ? reject(new Error(JSON.stringify(d.message.error))) : resolve(d.message.result); }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, type: "message", channel: ch, message: { id, command, params } }));
  });
}

async function main() {
  const ch = await discoverChannel();
  const ws = new WebSocket(RELAY_URL);
  await new Promise((r, e) => { ws.addEventListener("open", r); ws.addEventListener("error", e); });
  ws.send(JSON.stringify({ type: "join", channel: ch }));
  await new Promise(r => setTimeout(r, 2000));

  // Get the frame to find nav element IDs
  const info = await cmd(ws, ch, "get_node_info", { nodeId: "54774:358" });
  const children = info.children || [];
  
  // Find all nav elements
  const navDots = children.filter(c => c.name.startsWith("nav_") && c.name.includes("_dot"));
  const navLabels = children.filter(c => c.name.startsWith("nav_") && !c.name.includes("_dot"));
  
  console.log("Nav dots:");
  for (const d of navDots) {
    console.log(`  ${d.name}: id=${d.id} x=${d.absoluteBoundingBox.x - 13200} y=${d.absoluteBoundingBox.y} w=${d.absoluteBoundingBox.width}`);
  }
  console.log("Nav labels:");
  for (const l of navLabels) {
    console.log(`  ${l.name}: id=${l.id} x=${l.absoluteBoundingBox.x - 13200} y=${l.absoluteBoundingBox.y} w=${l.absoluteBoundingBox.width} h=${l.absoluteBoundingBox.height}`);
  }

  // Now fix alignment: each dot should be horizontally centered above its label
  // The issue is text width varies, so I need to measure and reposition
  
  // For each nav item, center the dot above the label's center
  const pairs = [
    { dot: navDots.find(d => d.name.includes("HOME")), label: navLabels.find(l => l.name.includes("HOME")) },
    { dot: navDots.find(d => d.name.includes("FLOW")), label: navLabels.find(l => l.name.includes("FLOW")) },
    { dot: navDots.find(d => d.name.includes("POPS")), label: navLabels.find(l => l.name.includes("POPS")) },
  ];

  for (const { dot, label } of pairs) {
    if (!dot || !label) continue;
    
    const labelX = label.absoluteBoundingBox.x - 13200;
    const labelW = label.absoluteBoundingBox.width;
    const labelCenterX = labelX + labelW / 2;
    
    const dotW = dot.absoluteBoundingBox.width;
    const newDotX = labelCenterX - dotW / 2;
    const dotY = label.absoluteBoundingBox.y - dotW - 6; // 6px gap above label
    
    // Also center the label itself at the arc position
    // HOME should be at W/2 = 196.5
    // Recalculate proper positions from arc math
    const isHome = dot.name.includes("HOME");
    const isFlow = dot.name.includes("FLOW");
    
    let arcAngle;
    if (isHome) arcAngle = math.PI / 2;
    else if (isFlow) arcAngle = math.PI / 2 + math.PI / 3;
    else arcAngle = math.PI / 2 - math.PI / 3;
    
    const arcR = 96;
    const navTop = H - 146;
    const arcCY = 146 + 96 * 0.2;
    const ix = W / 2 + arcR * math.cos(arcAngle);
    const iy = navTop + (arcCY - arcR * math.sin(arcAngle));
    
    // Center label at ix
    const newLabelX = ix - labelW / 2;
    const newDotCenterX = ix - dotW / 2;
    
    console.log(`\nFixing ${dot.name}:`);
    console.log(`  Arc position: ix=${ix.toFixed(1)}`);
    console.log(`  Label width: ${labelW}, moving to x=${newLabelX.toFixed(1)}`);
    console.log(`  Dot moving to x=${newDotCenterX.toFixed(1)}`);
    
    // Move label
    await cmd(ws, ch, "move_node", { nodeId: label.id, x: newLabelX, y: iy });
    // Move dot centered above label
    await cmd(ws, ch, "move_node", { nodeId: dot.id, x: newDotCenterX, y: iy - dotW - 6 });
  }

  console.log("\n✅ Nav aligned");
  ws.close();
  process.exit(0);
}
main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
