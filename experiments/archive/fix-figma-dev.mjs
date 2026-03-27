import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNEL = 'rkv91cy1';
const WS_URL = 'ws://localhost:3055';

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

function cmd(command, params = {}) {
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

const FRAME_ID = '54793:2727';

const C = {
  bgBase: { r: 0.047, g: 0.016, b: 0.082 },
  gradTop: { r: 0.165, g: 0.094, b: 0.220 },
  gradMid: { r: 0.235, g: 0.090, b: 0.286 },
  gradBot: { r: 0.102, g: 0.051, b: 0.180 },
  textPrimary: { r: 0.941, g: 0.965, b: 0.988 },
  textMuted: { r: 0.620, g: 0.561, b: 0.710 },
  glassDark: { r: 0.047, g: 0.016, b: 0.082 },
  glowPurple: { r: 0.608, g: 0.435, b: 0.831 },
};

async function main() {
  await connect();
  console.log('Connected. Fixing gradient...');

  // First, delete the old frame and rebuild
  try {
    await cmd('delete_node', { nodeId: FRAME_ID });
    console.log('Deleted old frame');
  } catch (e) {
    console.log('Could not delete old frame:', e.message);
  }

  const FX = 27000, FY = 0, W = 393, H = 852;

  // Create new main frame
  const mainFrame = await cmd('create_frame', {
    name: 'Belo – Dev Branch Emulation',
    x: FX, y: FY, width: W, height: H
  });
  const fId = mainFrame.id;
  console.log('New frame:', fId);

  // Set frame clip content
  await cmd('set_fill_color', { nodeId: fId, r: C.bgBase.r, g: C.bgBase.g, b: C.bgBase.b });

  // BG Gradient rectangle with correct params
  const bg = await cmd('create_rectangle', { name: 'BG Gradient', x: 0, y: 0, width: W, height: H, parentId: fId });
  console.log('BG rect:', bg.id);

  // Use correct param names for set_fill_gradient
  const gradResult = await cmd('set_fill_gradient', {
    nodeId: bg.id,
    gradientType: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, r: C.gradTop.r, g: C.gradTop.g, b: C.gradTop.b, a: 1 },
      { position: 0.35, r: C.gradMid.r, g: C.gradMid.g, b: C.gradMid.b, a: 1 },
      { position: 1, r: C.gradBot.r, g: C.gradBot.g, b: C.gradBot.b, a: 1 },
    ],
    // Top to bottom: start at top-center, end at bottom-center
    gradientHandlePositions: [
      { x: 0.5, y: 0 },   // start
      { x: 0.5, y: 1 },   // end x-axis
      { x: 0, y: 0 },     // y-axis handle
    ],
  });
  console.log('Gradient applied:', JSON.stringify(gradResult).substring(0, 100));
  await cmd('move_node', { nodeId: bg.id, x: 0, y: 0 });

  // Dynamic Island
  const di = await cmd('create_rectangle', { name: 'Dynamic Island', parentId: fId, x: 0, y: 0, width: 126, height: 37 });
  await cmd('set_fill_color', { nodeId: di.id, r: 0, g: 0, b: 0 });
  await cmd('set_corner_radius', { nodeId: di.id, radius: 20 });
  await cmd('move_node', { nodeId: di.id, x: (W - 126) / 2, y: 12 });

  // Status time
  const timeT = await cmd('create_text', {
    name: 'Status Time', parentId: fId,
    text: '2:32', fontSize: 15, fontWeight: 600,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: timeT.id, x: 28, y: 42 });

  // Back arrow
  const backA = await cmd('create_text', {
    name: 'Back Arrow', parentId: fId,
    text: '<', fontSize: 28, fontWeight: 300,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: backA.id, x: 14, y: 76 });

  // ═══ HEADER GLASS ORBS ═══
  async function glassOrb(name, cx, cy, glowR, ringR, parent) {
    const glow = await cmd('create_ellipse', { name: `${name} Glow`, parentId: parent, x: 0, y: 0, width: glowR * 2, height: glowR * 2 });
    await cmd('set_fill_color', { nodeId: glow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
    await cmd('set_opacity', { nodeId: glow.id, opacity: 0.15 });
    await cmd('move_node', { nodeId: glow.id, x: cx - glowR, y: cy - glowR });

    const ring = await cmd('create_ellipse', { name: `${name} Ring`, parentId: parent, x: 0, y: 0, width: ringR * 2, height: ringR * 2 });
    await cmd('set_fill_color', { nodeId: ring.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
    await cmd('set_opacity', { nodeId: ring.id, opacity: 0.85 });
    await cmd('move_node', { nodeId: ring.id, x: cx - ringR, y: cy - ringR });
    return { glow, ring };
  }

  // Phone orb at x~90, y~100 center
  await glassOrb('Phone', 90, 100, 29.5, 17, fId);
  // Video orb at x~303, y~100
  await glassOrb('Video', 303, 100, 29.5, 17, fId);

  // Stack icon
  const stackI = await cmd('create_text', {
    name: 'Stack Icon', parentId: fId,
    text: '⧉', fontSize: 20,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: stackI.id, x: 355, y: 88 });

  // ═══ CENTER ORB ═══
  const ccx = W / 2, ccy = 97;
  await glassOrb('Center', ccx, ccy, 41, 23.5, fId);

  // Avatar
  const cAv = await cmd('create_ellipse', { name: 'Group Avatar', parentId: fId, x: 0, y: 0, width: 50, height: 50 });
  await cmd('set_fill_color', { nodeId: cAv.id, r: 0.055, g: 0.165, b: 0.165 });
  await cmd('move_node', { nodeId: cAv.id, x: ccx - 25, y: ccy - 25 });

  // Badge
  const badgeBg = await cmd('create_rectangle', { name: 'Badge', parentId: fId, x: 0, y: 0, width: 18, height: 15 });
  await cmd('set_fill_color', { nodeId: badgeBg.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_corner_radius', { nodeId: badgeBg.id, radius: 8 });
  await cmd('move_node', { nodeId: badgeBg.id, x: ccx + 17, y: ccy + 14 });

  const badgeT = await cmd('create_text', {
    name: 'Badge 8', parentId: fId,
    text: '8', fontSize: 9, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: 1, g: 1, b: 1
  });
  await cmd('move_node', { nodeId: badgeT.id, x: ccx + 22, y: ccy + 15 });

  // Group name + subtitle
  const gN = await cmd('create_text', {
    name: 'belo team', parentId: fId,
    text: 'belo team', fontSize: 17, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: gN.id, x: 155, y: 130 });

  const gS = await cmd('create_text', {
    name: '8 members', parentId: fId,
    text: '8 members', fontSize: 11,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b
  });
  await cmd('move_node', { nodeId: gS.id, x: 166, y: 151 });

  // ═══ MESSAGES ═══
  let y = 175;
  const mx = 16, maxW = W - mx - 60;

  const senderCoral = { r: 0.910, g: 0.490, b: 0.490 };
  const senderTeal = { r: 0.369, g: 0.769, b: 0.714 };
  const senderPurple = { r: 0.702, g: 0.616, b: 0.859 };

  const messages = [
    { sender: 'Roman OG', sc: senderCoral, text: 'Nope I get to about 90% of the weekly limit each week', time: '11:16', first: true },
    { sender: null, sc: null, text: 'My fleet self adjusts to keep it under', time: '11:16', first: false },
    { sender: 'Enis Dev', sc: senderTeal, text: 'Did you see the new Claude cowork', time: '11:17', first: true },
    { sender: 'Roman OG', sc: senderCoral, text: "Indeed, they're just porting all the features from the open source claude code community to their own product which is cool", time: '11:31', first: true },
    { sender: 'Saeed Sharifi', sc: senderPurple, text: 'Btw im getting notifications for messages but when i open it it shows nothing', time: '11:44', first: true },
    { sender: null, sc: null, text: 'I have to refresh the app to see', time: '11:44', first: false },
    { sender: 'Roman Dev', sc: senderCoral, text: 'Ok will look into it', time: '12:39', first: true },
  ];

  for (const msg of messages) {
    y += msg.first ? 8 : 3;

    if (msg.sender) {
      const s = await cmd('create_text', {
        name: `Sender: ${msg.sender}`, parentId: fId,
        text: msg.sender, fontSize: 12, fontWeight: 600,
        fontFamily: 'ABC Arizona Mix Unlicensed Trial',
        r: msg.sc.r, g: msg.sc.g, b: msg.sc.b
      });
      await cmd('move_node', { nodeId: s.id, x: mx, y });
      y += 18;
    }

    const t = await cmd('create_text', {
      name: 'Msg', parentId: fId,
      text: msg.text, fontSize: 15,
      fontFamily: 'ABC Arizona Mix Unlicensed Trial',
      r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b,
      textAutoResize: 'HEIGHT'
    });
    await cmd('move_node', { nodeId: t.id, x: mx, y });
    await cmd('resize_node', { nodeId: t.id, width: maxW, height: 500 });

    const charsPerLine = 36;
    const numLines = Math.ceil(msg.text.length / charsPerLine);
    y += numLines * 21;

    const tm = await cmd('create_text', {
      name: `Time: ${msg.time}`, parentId: fId,
      text: msg.time, fontSize: 11,
      fontFamily: 'ABC Arizona Mix Unlicensed Trial',
      r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b
    });
    await cmd('move_node', { nodeId: tm.id, x: mx, y: y + 4 });
    y += 19;
    if (msg.first) y += 5;
  }

  // ═══ INPUT AREA ═══
  const inputY = H - 90;

  const border = await cmd('create_rectangle', { name: 'Input Border', parentId: fId, x: 0, y: 0, width: W, height: 1 });
  await cmd('set_fill_color', { nodeId: border.id, r: 1, g: 1, b: 1 });
  await cmd('set_opacity', { nodeId: border.id, opacity: 0.08 });
  await cmd('move_node', { nodeId: border.id, x: 0, y: inputY });

  // Input glass ball (left)
  await glassOrb('Input Ball', 34, inputY + 32, 36, 20.5, fId);

  const dots = await cmd('create_text', {
    name: 'Dots', parentId: fId,
    text: '⋮', fontSize: 16,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: 1, g: 1, b: 1
  });
  await cmd('set_opacity', { nodeId: dots.id, opacity: 0.55 });
  await cmd('move_node', { nodeId: dots.id, x: 30, y: inputY + 18 });

  // "belo" placeholder
  const beloH = await cmd('create_text', {
    name: 'belo hint', parentId: fId,
    text: 'belo', fontSize: 20,
    fontFamily: 'Bumbbled',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('set_opacity', { nodeId: beloH.id, opacity: 0.18 });
  await cmd('move_node', { nodeId: beloH.id, x: 70, y: inputY + 18 });

  // GIF
  const gifT = await cmd('create_text', {
    name: 'GIF', parentId: fId,
    text: 'GIF', fontSize: 13, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b
  });
  await cmd('move_node', { nodeId: gifT.id, x: 310, y: inputY + 22 });

  // Mic orb (right)
  await glassOrb('Mic', 362, inputY + 33, 33, 19, fId);

  // Home indicator
  const home = await cmd('create_rectangle', { name: 'Home Indicator', parentId: fId, x: 0, y: 0, width: 134, height: 5 });
  await cmd('set_fill_color', { nodeId: home.id, r: 1, g: 1, b: 1 });
  await cmd('set_opacity', { nodeId: home.id, opacity: 0.25 });
  await cmd('set_corner_radius', { nodeId: home.id, radius: 3 });
  await cmd('move_node', { nodeId: home.id, x: (W - 134) / 2, y: H - 13 });

  console.log('Frame rebuilt! Exporting...');

  // Export
  const result = await cmd('export_node_as_image', { nodeId: fId, format: 'PNG', scale: 2 });
  if (result.imageData) {
    const buf = Buffer.from(result.imageData, 'base64');
    const outPath = path.join(__dirname, 'emulate-dev-figma.png');
    fs.writeFileSync(outPath, buf);
    console.log(`Saved ${buf.length} bytes to ${outPath}`);
  }

  setTimeout(() => { ws.close(); process.exit(0); }, 1000);
}

main().catch(err => {
  console.error('Error:', err.message);
  ws?.close();
  process.exit(1);
});
