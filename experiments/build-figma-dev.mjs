import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const CHANNEL = 'rkv91cy1';
const WS_URL = 'ws://localhost:3055';

let ws;
const pending = new Map();

function connect() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      // Join channel
      ws.send(JSON.stringify({ type: 'join', channel: CHANNEL }));
      setTimeout(resolve, 800);
    });
    ws.on('message', (data) => {
      try {
        const json = JSON.parse(data.toString());
        // Response comes as broadcast with message.id and message.result
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
      reject(new Error(`Timeout for ${command} (${id})`));
    }, 30000);
    pending.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      }
    });
    const request = {
      id,
      type: 'message',
      channel: CHANNEL,
      message: {
        id,
        command,
        params: { ...params, commandId: id },
      },
    };
    ws.send(JSON.stringify(request));
  });
}

// Shorter helpers
const cmd = sendCommand;

// Colors
const C = {
  bgBase: { r: 0.047, g: 0.016, b: 0.082 },
  gradTop: { r: 0.165, g: 0.094, b: 0.220 },
  gradMid: { r: 0.235, g: 0.090, b: 0.286 },
  gradBot: { r: 0.102, g: 0.051, b: 0.180 },
  textPrimary: { r: 0.941, g: 0.965, b: 0.988 },
  textMuted: { r: 0.620, g: 0.561, b: 0.710 },
  senderCoral: { r: 0.910, g: 0.490, b: 0.490 },
  senderTeal: { r: 0.369, g: 0.769, b: 0.714 },
  senderPurple: { r: 0.702, g: 0.616, b: 0.859 },
  glassDark: { r: 0.047, g: 0.016, b: 0.082 },
  glowPurple: { r: 0.608, g: 0.435, b: 0.831 },
  groupAvBg: { r: 0.055, g: 0.165, b: 0.165 },
};

const FX = 27000;
const FY = 0;
const W = 393;
const H = 852;

async function main() {
  console.log('Connecting to Figma relay...');
  await connect();
  console.log('Connected. Building frame...');

  // ═══ MAIN FRAME ═══
  const mainFrame = await cmd('create_frame', {
    name: 'Belo – Dev Branch Emulation',
    x: FX, y: FY, width: W, height: H
  });
  const mainFrameId = mainFrame?.id;
  console.log('Main frame:', mainFrameId);

  await cmd('set_fill_color', { nodeId: mainFrameId, r: C.bgBase.r, g: C.bgBase.g, b: C.bgBase.b });

  // ═══ BACKGROUND GRADIENT ═══
  const bg = await cmd('create_rectangle', { name: 'BG Gradient', x: 0, y: 0, width: W, height: H, parentId: mainFrameId });
  await cmd('set_fill_gradient', {
    nodeId: bg.id,
    gradientType: 'LINEAR',
    stops: [
      { position: 0, r: C.gradTop.r, g: C.gradTop.g, b: C.gradTop.b, a: 1 },
      { position: 0.35, r: C.gradMid.r, g: C.gradMid.g, b: C.gradMid.b, a: 1 },
      { position: 1, r: C.gradBot.r, g: C.gradBot.g, b: C.gradBot.b, a: 1 },
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]]
  });
  await cmd('move_node', { nodeId: bg.id, x: 0, y: 0 });

  // ═══ DYNAMIC ISLAND ═══
  const di = await cmd('create_rectangle', { name: 'Dynamic Island', parentId: mainFrameId, x: 0, y: 0, width: 126, height: 37 });
  await cmd('set_fill_color', { nodeId: di.id, r: 0, g: 0, b: 0 });
  await cmd('set_corner_radius', { nodeId: di.id, radius: 20 });
  await cmd('move_node', { nodeId: di.id, x: (W - 126) / 2, y: 12 });

  // ═══ STATUS BAR ═══
  const timeText = await cmd('create_text', {
    name: 'Status Time', parentId: mainFrameId,
    text: '2:32', fontSize: 15, fontWeight: 600,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: timeText.id, x: 28, y: 42 });

  // ═══ HEADER BACK ARROW ═══
  const backArrow = await cmd('create_text', {
    name: 'Back Arrow', parentId: mainFrameId,
    text: '<', fontSize: 28, fontWeight: 300,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: backArrow.id, x: 14, y: 76 });

  // ═══ PHONE GLASS ORB ═══
  const phoneGlow = await cmd('create_ellipse', { name: 'Phone Glow', parentId: mainFrameId, x: 0, y: 0, width: 59, height: 59 });
  await cmd('set_fill_color', { nodeId: phoneGlow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_opacity', { nodeId: phoneGlow.id, opacity: 0.12 });
  await cmd('move_node', { nodeId: phoneGlow.id, x: 61, y: 71 });

  const phoneRing = await cmd('create_ellipse', { name: 'Phone Ring', parentId: mainFrameId, x: 0, y: 0, width: 34, height: 34 });
  await cmd('set_fill_color', { nodeId: phoneRing.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
  await cmd('set_opacity', { nodeId: phoneRing.id, opacity: 0.85 });
  await cmd('move_node', { nodeId: phoneRing.id, x: 73, y: 83 });

  // ═══ VIDEO GLASS ORB ═══
  const videoGlow = await cmd('create_ellipse', { name: 'Video Glow', parentId: mainFrameId, x: 0, y: 0, width: 59, height: 59 });
  await cmd('set_fill_color', { nodeId: videoGlow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_opacity', { nodeId: videoGlow.id, opacity: 0.12 });
  await cmd('move_node', { nodeId: videoGlow.id, x: 274, y: 71 });

  const videoRing = await cmd('create_ellipse', { name: 'Video Ring', parentId: mainFrameId, x: 0, y: 0, width: 34, height: 34 });
  await cmd('set_fill_color', { nodeId: videoRing.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
  await cmd('set_opacity', { nodeId: videoRing.id, opacity: 0.85 });
  await cmd('move_node', { nodeId: videoRing.id, x: 286, y: 83 });

  // ═══ STACK ICON ═══
  const stackIcon = await cmd('create_text', {
    name: 'Stack Icon', parentId: mainFrameId,
    text: '⧉', fontSize: 20,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: stackIcon.id, x: 355, y: 80 });

  // ═══ CENTER ORB (Group Avatar) ═══
  const cGlow = await cmd('create_ellipse', { name: 'Center Glow', parentId: mainFrameId, x: 0, y: 0, width: 82, height: 82 });
  await cmd('set_fill_color', { nodeId: cGlow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_opacity', { nodeId: cGlow.id, opacity: 0.25 });
  await cmd('move_node', { nodeId: cGlow.id, x: (W - 82) / 2, y: 56 });

  const cRing = await cmd('create_ellipse', { name: 'Center Ring', parentId: mainFrameId, x: 0, y: 0, width: 47, height: 47 });
  await cmd('set_fill_color', { nodeId: cRing.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
  await cmd('set_opacity', { nodeId: cRing.id, opacity: 0.85 });
  await cmd('move_node', { nodeId: cRing.id, x: (W - 47) / 2, y: 56 + (82 - 47) / 2 });

  const cAvatar = await cmd('create_ellipse', { name: 'Group Avatar', parentId: mainFrameId, x: 0, y: 0, width: 50, height: 50 });
  await cmd('set_fill_color', { nodeId: cAvatar.id, r: C.groupAvBg.r, g: C.groupAvBg.g, b: C.groupAvBg.b });
  await cmd('move_node', { nodeId: cAvatar.id, x: (W - 50) / 2, y: 56 + (82 - 50) / 2 });

  // Member badge
  const badge = await cmd('create_rectangle', { name: 'Badge BG', parentId: mainFrameId, x: 0, y: 0, width: 18, height: 15 });
  await cmd('set_fill_color', { nodeId: badge.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_corner_radius', { nodeId: badge.id, radius: 8 });
  await cmd('move_node', { nodeId: badge.id, x: (W / 2) + 18, y: 56 + 82 - 22 });

  const badgeText = await cmd('create_text', {
    name: 'Badge 8', parentId: mainFrameId,
    text: '8', fontSize: 9, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: 1, g: 1, b: 1
  });
  await cmd('move_node', { nodeId: badgeText.id, x: (W / 2) + 23, y: 56 + 82 - 21 });

  // Group name
  const gName = await cmd('create_text', {
    name: 'Group Name', parentId: mainFrameId,
    text: 'belo team', fontSize: 17, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('move_node', { nodeId: gName.id, x: 155, y: 140 });

  const gSub = await cmd('create_text', {
    name: 'Members Subtitle', parentId: mainFrameId,
    text: '8 members', fontSize: 11,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b
  });
  await cmd('move_node', { nodeId: gSub.id, x: 166, y: 161 });

  // ═══ MESSAGES ═══
  let y = 185;
  const mx = 16;
  const maxW = W - mx - 60;

  const messages = [
    { sender: 'Roman OG', sc: C.senderCoral, text: 'Nope I get to about 90% of the weekly limit each week', time: '11:16', first: true },
    { sender: null, sc: null, text: 'My fleet self adjusts to keep it under', time: '11:16', first: false },
    { sender: 'Enis Dev', sc: C.senderTeal, text: 'Did you see the new Claude cowork', time: '11:17', first: true },
    { sender: 'Roman OG', sc: C.senderCoral, text: "Indeed, they're just porting all the features from the open source claude code community to their own product which is cool", time: '11:31', first: true },
    { sender: 'Saeed Sharifi', sc: C.senderPurple, text: 'Btw im getting notifications for messages but when i open it it shows nothing', time: '11:44', first: true },
    { sender: null, sc: null, text: 'I have to refresh the app to see', time: '11:44', first: false },
    { sender: 'Roman Dev', sc: C.senderCoral, text: 'Ok will look into it', time: '12:39', first: true },
  ];

  for (const msg of messages) {
    y += msg.first ? 8 : 3;

    if (msg.sender) {
      const s = await cmd('create_text', {
        name: `Sender ${msg.sender}`, parentId: mainFrameId,
        text: msg.sender, fontSize: 12, fontWeight: 600,
        fontFamily: 'ABC Arizona Mix Unlicensed Trial',
        r: msg.sc.r, g: msg.sc.g, b: msg.sc.b
      });
      await cmd('move_node', { nodeId: s.id, x: mx, y: y });
      y += 18;
    }

    const t = await cmd('create_text', {
      name: 'Msg Text', parentId: mainFrameId,
      text: msg.text, fontSize: 15,
      fontFamily: 'ABC Arizona Mix Unlicensed Trial',
      r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b,
      textAutoResize: 'HEIGHT'
    });
    await cmd('move_node', { nodeId: t.id, x: mx, y: y });
    await cmd('resize_node', { nodeId: t.id, width: maxW, height: 500 });

    // Estimate rendered height
    const charsPerLine = 36;
    const numLines = Math.ceil(msg.text.length / charsPerLine);
    y += numLines * 21;

    const tm = await cmd('create_text', {
      name: `Time ${msg.time}`, parentId: mainFrameId,
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

  // Border line
  const border = await cmd('create_rectangle', { name: 'Input Border', parentId: mainFrameId, x: 0, y: 0, width: W, height: 1 });
  await cmd('set_fill_color', { nodeId: border.id, r: 1, g: 1, b: 1 });
  await cmd('set_opacity', { nodeId: border.id, opacity: 0.08 });
  await cmd('move_node', { nodeId: border.id, x: 0, y: inputY });

  // Input glass ball (left)
  const ibGlow = await cmd('create_ellipse', { name: 'Input Ball Glow', parentId: mainFrameId, x: 0, y: 0, width: 72, height: 72 });
  await cmd('set_fill_color', { nodeId: ibGlow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_opacity', { nodeId: ibGlow.id, opacity: 0.22 });
  await cmd('move_node', { nodeId: ibGlow.id, x: -1, y: inputY - 3 });

  const ibRing = await cmd('create_ellipse', { name: 'Input Ball Ring', parentId: mainFrameId, x: 0, y: 0, width: 41, height: 41 });
  await cmd('set_fill_color', { nodeId: ibRing.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
  await cmd('set_opacity', { nodeId: ibRing.id, opacity: 0.85 });
  await cmd('move_node', { nodeId: ibRing.id, x: 14, y: inputY + 12 });

  const dots = await cmd('create_text', {
    name: 'Dots Icon', parentId: mainFrameId,
    text: '⋮', fontSize: 16,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: 1, g: 1, b: 1
  });
  await cmd('set_opacity', { nodeId: dots.id, opacity: 0.55 });
  await cmd('move_node', { nodeId: dots.id, x: 31, y: inputY + 18 });

  // "belo" placeholder
  const beloHint = await cmd('create_text', {
    name: 'Belo Hint', parentId: mainFrameId,
    text: 'belo', fontSize: 20,
    fontFamily: 'Bumbbled',
    r: C.textPrimary.r, g: C.textPrimary.g, b: C.textPrimary.b
  });
  await cmd('set_opacity', { nodeId: beloHint.id, opacity: 0.18 });
  await cmd('move_node', { nodeId: beloHint.id, x: 70, y: inputY + 18 });

  // GIF button
  const gif = await cmd('create_text', {
    name: 'GIF Button', parentId: mainFrameId,
    text: 'GIF', fontSize: 13, fontWeight: 700,
    fontFamily: 'ABC Arizona Mix Unlicensed Trial',
    r: C.textMuted.r, g: C.textMuted.g, b: C.textMuted.b
  });
  await cmd('move_node', { nodeId: gif.id, x: 310, y: inputY + 22 });

  // Mic glass ball (right)
  const micGlow = await cmd('create_ellipse', { name: 'Mic Glow', parentId: mainFrameId, x: 0, y: 0, width: 66, height: 66 });
  await cmd('set_fill_color', { nodeId: micGlow.id, r: C.glowPurple.r, g: C.glowPurple.g, b: C.glowPurple.b });
  await cmd('set_opacity', { nodeId: micGlow.id, opacity: 0.10 });
  await cmd('move_node', { nodeId: micGlow.id, x: 329, y: inputY });

  const micRing = await cmd('create_ellipse', { name: 'Mic Ring', parentId: mainFrameId, x: 0, y: 0, width: 38, height: 38 });
  await cmd('set_fill_color', { nodeId: micRing.id, r: C.glassDark.r, g: C.glassDark.g, b: C.glassDark.b });
  await cmd('set_opacity', { nodeId: micRing.id, opacity: 0.85 });
  await cmd('move_node', { nodeId: micRing.id, x: 343, y: inputY + 14 });

  // ═══ HOME INDICATOR ═══
  const home = await cmd('create_rectangle', { name: 'Home Indicator', parentId: mainFrameId, x: 0, y: 0, width: 134, height: 5 });
  await cmd('set_fill_color', { nodeId: home.id, r: 1, g: 1, b: 1 });
  await cmd('set_opacity', { nodeId: home.id, opacity: 0.25 });
  await cmd('set_corner_radius', { nodeId: home.id, radius: 3 });
  await cmd('move_node', { nodeId: home.id, x: (W - 134) / 2, y: H - 13 });

  console.log('Done building Figma frame!');

  // ═══ EXPORT ═══
  console.log('Exporting screenshot...');
  try {
    const exportResult = await cmd('export_node_as_image', {
      nodeId: mainFrameId,
      format: 'PNG',
      scale: 2
    });
    console.log('Export result:', JSON.stringify(exportResult).substring(0, 500));
  } catch (e) {
    console.log('Export info:', e.message);
  }

  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 2000);
}

main().catch(err => {
  console.error('Error:', err.message);
  ws?.close();
  process.exit(1);
});
