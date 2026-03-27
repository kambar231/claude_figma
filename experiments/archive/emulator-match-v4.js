#!/usr/bin/env bun
// ══════════════════════════════════════════════════════════════
// Belo DM Chat — Emulator Match v4
// Final polish: fix menu icons, brighter glow, proper spacing
// ══════════════════════════════════════════════════════════════
const RELAY_URL = "ws://localhost:3055";
const RELAY_HTTP = "http://localhost:3055";
const W = 393, H = 852;
const FONT = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";
const OX = 29500, OY = 0;

const C = {
  gradTop:   { r: 0.169, g: 0.353, b: 0.510 },
  gradMid:   { r: 0.118, g: 0.227, b: 0.322 },
  gradBot:   { r: 0.067, g: 0.102, b: 0.133 },
  glow:      { r: 0.275, g: 0.549, b: 0.784 },
  glassBg:   { r: 0.047, g: 0.016, b: 0.082 },
  textPri:   { r: 0.941, g: 0.965, b: 0.988 },
  textMut:   { r: 0.620, g: 0.561, b: 0.710 },
  dateBadge: { r: 0.831, g: 0.392, b: 0.541 },
  white:     { r: 1, g: 1, b: 1 },
  black:     { r: 0, g: 0, b: 0 },
  gray:      { r: 0.40, g: 0.40, b: 0.42 },
  grayDk:    { r: 0.30, g: 0.30, b: 0.32 },
  iconPri:   { r: 0.83, g: 0.72, b: 1 },
  sendGreen: { r: 0.22, g: 0.58, b: 0.35 },
  sendBlue:  { r: 0.30, g: 0.40, b: 0.85 },
};

function genId() { return 'd' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

async function main() {
  const res = await fetch(`${RELAY_HTTP}/channels`);
  const ch = await res.json();
  const channel = Object.entries(ch).sort((a,b)=>b[1]-a[1])[0][0];

  const ws = new WebSocket(RELAY_URL);
  await new Promise(r => ws.addEventListener("open", r));
  ws.send(JSON.stringify({ type: "join", channel }));
  await new Promise(r => setTimeout(r, 500));
  console.log("Channel:", channel);

  const send = async (cmd, params) => new Promise((res, rej) => {
    const id = genId();
    const t = setTimeout(() => rej(new Error(`Timeout: ${cmd}`)), 30000);
    const h = (ev) => {
      let d; try{d=JSON.parse(ev.data)}catch{return}
      if(d.message?.id===id){ws.removeEventListener("message",h);clearTimeout(t);
        d.message.error?rej(new Error(String(d.message.error))):res(d.message.result);}
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({type:"message",channel,message:{id,command:cmd,params}}));
  });

  const R = (n,x,y,w,h,p) => send("create_rectangle", {name:n,x,y,width:w,height:h,...(p?{parentId:p}:{})});
  const T = (n,x,y,t,s,o={}) => send("create_text", {name:n,x,y,text:t,fontSize:s,fontFamily:o.ff||FONT,fontWeight:o.fw||400,fontColor:o.c||C.textPri,...(o.p?{parentId:o.p}:{})});
  const sF = (id,c,a=1) => send("set_fill_color", {nodeId:id,r:c.r,g:c.g,b:c.b,a});
  const sG = (id,ty,st,h) => send("set_fill_gradient", {nodeId:id,gradientType:ty,gradientStops:st,...(h?{gradientHandlePositions:h}:{})});
  const sR = (id,r) => send("set_corner_radius", {nodeId:id,radius:r});
  const sS = (id,c,w=1,a=1) => send("set_stroke_color", {nodeId:id,color:{r:c.r,g:c.g,b:c.b,a},weight:w});

  async function ball(nm,cx,cy,sz,ga,pid) {
    const gs=sz*1.65, rs=sz*0.94;
    const gl=await R(nm+"-gl",cx-gs/2,cy-gs/2,gs,gs,pid);
    await sR(gl.id,gs/2);
    await sG(gl.id,"GRADIENT_RADIAL",[{position:0,...C.glow,a:ga[0]},{position:0.5,...C.glow,a:ga[1]},{position:1,...C.glow,a:0}]);
    const rn=await R(nm+"-rn",cx-rs/2,cy-rs/2,rs,rs,pid);
    await sR(rn.id,rs/2);
    await sF(rn.id,C.glassBg,0.85);
    return {gl:gl.id,rn:rn.id};
  }

  // ══════════════════════════════════════════════════════════════
  console.log("Building v4...");

  const scr = await send("create_frame", {name:"Belo – DM (Emulator Match) v4",x:OX,y:OY,width:W,height:H,fillColor:C.gradBot});
  const s = scr.id;
  await sR(s, 50);

  // Background
  const bg = await R("bg",0,0,W,H,s);
  await sR(bg.id,50);
  await sG(bg.id,"GRADIENT_LINEAR",[
    {position:0,...C.gradTop,a:1},{position:0.45,...C.gradMid,a:1},{position:1,...C.gradBot,a:1},
  ],[{x:0.5,y:0},{x:0.5,y:1},{x:1,y:0}]);

  // ── STATUS BAR ──
  await T("time",24,12,"4:36",14,{fw:600,c:C.white,p:s});
  // Right side: small dot, signal bars, battery
  await T("dot1",334,15,"●",5,{c:C.white,p:s});
  await T("wifi",348,13,"▲",8,{c:C.white,p:s});
  await T("bat",362,11,"▮",10,{c:C.white,p:s});

  // ── HEADER ──
  // Back arrow
  await T("back",14,60,"←",22,{c:C.white,p:s});

  // Phone call glass ball
  await ball("ph",108,70,36,[0.30,0.12],s);
  await T("ph-i",102,62,"✆",15,{c:C.iconPri,p:s});

  // AVATAR with very bright blue glow
  const avCx=W/2, avCy=66, avSz=54;

  // Extra large outer glow for avatar (bright blue)
  const g0sz=110;
  const g0=await R("av-g0",avCx-g0sz/2,avCy-g0sz/2,g0sz,g0sz,s);
  await sR(g0.id,g0sz/2);
  await sG(g0.id,"GRADIENT_RADIAL",[
    {position:0,...C.glow,a:0.55},{position:0.35,...C.glow,a:0.30},{position:0.65,...C.glow,a:0.10},{position:1,...C.glow,a:0},
  ]);

  // Inner glow layer
  const g1sz=80;
  const g1=await R("av-g1",avCx-g1sz/2,avCy-g1sz/2,g1sz,g1sz,s);
  await sR(g1.id,g1sz/2);
  await sG(g1.id,"GRADIENT_RADIAL",[
    {position:0,...C.glow,a:0.70},{position:0.5,...C.glow,a:0.35},{position:1,...C.glow,a:0},
  ]);

  // Frosted ring
  const rnSz=avSz*0.94;
  const avRn=await R("av-rn",avCx-rnSz/2,avCy-rnSz/2,rnSz,rnSz,s);
  await sR(avRn.id,rnSz/2);
  await sF(avRn.id,C.glassBg,0.85);
  await sS(avRn.id,C.glow,2,0.5);

  // Photo circle
  const avP=await R("av-ph",avCx-avSz/2,avCy-avSz/2,avSz,avSz,s);
  await sR(avP.id,avSz/2);
  await sF(avP.id,{r:0.102,g:0.039,b:0.180},1);
  await T("av-S",avCx-7,avCy-13,"S",22,{fw:700,c:C.white,p:s});

  // Video call glass ball
  await ball("vid",285,70,36,[0.30,0.12],s);
  await T("vid-i",279,62,"▶",14,{c:C.iconPri,p:s});

  // Stack icon (two overlapping squares)
  const sx=360, sy=62;
  const s1=await R("s1",sx,sy,14,14,s);
  await sR(s1.id,2); await sF(s1.id,C.black,0); await sS(s1.id,C.textPri,1.5,0.8);
  const s2=await R("s2",sx+5,sy+5,14,14,s);
  await sR(s2.id,2); await sF(s2.id,C.black,0); await sS(s2.id,C.textPri,1.5,0.8);

  // Name
  await T("name",avCx-56,avCy+g0sz/2-16,"Saeed Sharifi",18,{fw:700,c:C.textPri,p:s});

  // ── GLASS BALL MENU (expanded left side) ──
  // White pill with 4 items: X close, play/send, smiley, hamburger
  const mX=8, mY=232, mW=48, mH=200;
  const mBg=await R("m-bg",mX,mY,mW,mH,s);
  await sR(mBg.id,24);
  await sF(mBg.id,C.white,0.94);

  const mc=mX+mW/2;
  let my=mY+16;

  // 1. Close X (outlined circle)
  const xSz=30;
  const xC=await R("x-c",mc-xSz/2,my,xSz,xSz,s);
  await sR(xC.id,xSz/2); await sF(xC.id,C.black,0); await sS(xC.id,C.grayDk,1.5,0.5);
  await T("x-t",mc-5,my+6,"✕",13,{fw:600,c:C.grayDk,p:s});
  my+=46;

  // 2. Send/play (green circle + blue triangle)
  const sSz=32;
  const sC=await R("s-c",mc-sSz/2,my,sSz,sSz,s);
  await sR(sC.id,sSz/2); await sF(sC.id,C.sendGreen,1);
  await T("s-t",mc-5,my+8,"▶",13,{c:C.sendBlue,p:s});
  my+=46;

  // 3. Smiley (text outline, NOT emoji)
  await T("emo",mc-8,my+2,"☻",22,{c:C.gray,p:s});
  my+=46;

  // 4. Hamburger (three lines)
  await T("ham",mc-10,my,"≡",26,{c:C.gray,p:s});

  // ── DATE BADGE ──
  const dW=88, dH=26, dX=(W-dW)/2, dY=580;
  const dBg=await R("d-bg",dX,dY,dW,dH,s);
  await sR(dBg.id,13); await sF(dBg.id,C.dateBadge,0.80);
  await T("d-t",dX+10,dY+5,"17/3/2026",12,{fw:500,c:C.white,p:s});

  // ── MESSAGE ──
  await T("msg",20,645,"H",16,{c:C.textPri,p:s});
  await T("mst",20,668,"15:17",11,{c:C.textMut,p:s});

  // ── INPUT AREA ──
  const iy=H-48;

  // Left glass ball (active, strong glow)
  await ball("lb",36,iy,44,[0.65,0.30],s);
  await T("lb-d",30,iy-12,"⋮",20,{c:C.white,p:s});

  // "belo" hint in Bumbbled
  await T("belo",142,iy-12,"belo",22,{ff:FONT_LOGO,c:{r:0.5,g:0.5,b:0.55},p:s});

  // Right glass ball (mic)
  const rb=await ball("rb",W-36,iy,40,[0.20,0.08],s);
  await sS(rb.rn,C.glow,1.5,0.25);
  await T("mic",W-43,iy-10,"🎤",16,{c:C.white,p:s});

  // ── HOME INDICATOR ──
  const iW=134, iH=5;
  const ind=await R("ind",(W-iW)/2,H-16,iW,iH,s);
  await sR(ind.id,2.5); await sF(ind.id,C.white,0.45);

  // ── EXPORT ──
  console.log("Exporting...");
  try {
    const img=await send("export_node_as_image",{nodeId:s,format:"PNG",scale:2});
    if(img?.imageData){
      require("fs").writeFileSync(
        "c:/Users/kmangibayev/Code/cursor-talk-to-figma-mcp/experiments/emulator-match-v4.png",
        Buffer.from(img.imageData,"base64")
      );
      console.log("Saved v4!");
    }
  }catch(e){console.log("Export err:",e.message);}

  console.log("Frame:",s);
  ws.close();
  process.exit(0);
}

main().catch(e=>{console.error("FATAL:",e);process.exit(1)});
