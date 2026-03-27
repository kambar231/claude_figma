/**
 * Iteration 5: Chat v1.4
 * Fine-tuning: spacing between messages, timestamp opacity, breathing room
 */

import WebSocket from "ws";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_URL = "ws://localhost:3055";
const CHANNELS_URL = "http://localhost:3055/channels";
const W = 393, H = 852;
const FONT_UI = "ABC Arizona Mix Unlicensed Trial";
const FONT_LOGO = "Bumbbled";

const C = {
  bgDark:{r:0.047,g:0.016,b:0.082},
  textPri:{r:0.941,g:0.965,b:0.988},
  textMuted:{r:0.620,g:0.561,b:0.710},
  glassFill:{r:0.118,g:0.063,b:0.188},
  white:{r:1,g:1,b:1},
  black:{r:0,g:0,b:0},
  green:{r:0.298,g:0.686,b:0.314},
  coral:{r:0.910,g:0.490,b:0.490},
  teal:{r:0.369,g:0.769,b:0.714},
  purple:{r:0.702,g:0.616,b:0.859},
};

let ws, channel, reqCounter = 0;
const pending = new Map();
function nextId() { return `v5-${++reqCounter}`; }

async function findChannel() {
  return new Promise((resolve, reject) => {
    http.get(CHANNELS_URL, res => {
      let d=""; res.on("data",c=>d+=c);
      res.on("end",()=>{ const ch=JSON.parse(d); const s=Object.entries(ch).sort((a,b)=>b[1]-a[1]); s.length>0?resolve(s[0][0]):reject(new Error("No channel")); });
    }).on("error",reject);
  });
}

function connect(ch) {
  return new Promise((resolve, reject) => {
    channel=ch; ws=new WebSocket(WS_URL);
    ws.on("open",()=>{ ws.send(JSON.stringify({type:"join",channel,id:nextId()})); setTimeout(resolve,600); });
    ws.on("message",raw=>{
      try { const d=JSON.parse(raw.toString()); if(d.type==="broadcast"&&d.message){const m=d.message;if(m.id&&pending.has(m.id)){const{resolve:r,timer}=pending.get(m.id);clearTimeout(timer);pending.delete(m.id);r(m.error?{error:m.error}:(m.result||m));}}} catch(_){}
    });
    ws.on("error",reject);
  });
}

function cmd(command,params={},timeout=30000) {
  return new Promise((resolve,reject)=>{
    const id=nextId();
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${command}`));},timeout);
    pending.set(id,{resolve,timer});
    ws.send(JSON.stringify({type:"message",channel,id,message:{id,command,params}}));
  });
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const createFrame=o=>cmd("create_frame",{x:o.x??0,y:o.y??0,width:o.width??100,height:o.height??100,name:o.name??"F",parentId:o.parentId,fillColor:o.fillColor});
const createRect=o=>cmd("create_rectangle",{x:o.x??0,y:o.y??0,width:o.width??100,height:o.height??100,name:o.name??"R",parentId:o.parentId});
const createEllipse=o=>cmd("create_ellipse",{x:o.x??0,y:o.y??0,width:o.width??50,height:o.height??50,name:o.name??"E",parentId:o.parentId});
const createText=o=>cmd("create_text",{x:o.x??0,y:o.y??0,text:o.text??"",fontSize:o.fontSize??14,fontWeight:o.fontWeight??400,fontFamily:o.fontFamily??FONT_UI,fontColor:o.fontColor??C.textPri,letterSpacing:o.letterSpacing,name:o.name??o.text?.slice(0,20)??"T",parentId:o.parentId});
const setFillC=(id,c,a)=>cmd("set_fill_color",{nodeId:id,color:{r:c.r,g:c.g,b:c.b,a:a??1}});
const setGrad=(id,type,stops,handles)=>cmd("set_fill_gradient",{nodeId:id,gradientType:type,gradientStops:stops,gradientHandlePositions:handles});
const setStroke=(id,color,w)=>cmd("set_stroke_color",{nodeId:id,color,weight:w});
const setRadius=(id,r)=>cmd("set_corner_radius",{nodeId:id,radius:r});
const resizeNode=(id,w,h)=>cmd("resize_node",{nodeId:id,width:w,height:h});
const getInfo=id=>cmd("get_node_info",{nodeId:id});
const deleteNode=id=>cmd("delete_node",{nodeId:id});
const exportImg=id=>cmd("export_node_as_image",{nodeId:id,format:"PNG",scale:2},60000);

async function measureText(opts) {
  const r=await createText({...opts,x:-9999,y:-9999,name:"_m"});
  await sleep(120);
  const info=await getInfo(r.id);
  const bb=info.absoluteBoundingBox||{};
  let w=bb.width||50,h=bb.height||20;
  if(opts.maxWidth&&w>opts.maxWidth){
    await resizeNode(r.id,opts.maxWidth,h); await sleep(120);
    const i2=await getInfo(r.id);
    w=i2.absoluteBoundingBox?.width||opts.maxWidth;
    h=i2.absoluteBoundingBox?.height||h;
  }
  await deleteNode(r.id);
  return {width:w,height:h};
}

async function createMeasuredText(opts) {
  const dim=await measureText(opts);
  const node=await createText(opts);
  if(opts.maxWidth&&dim.width>=opts.maxWidth) await resizeNode(node.id,opts.maxWidth,dim.height);
  return {...node,width:dim.width,height:dim.height};
}

let screenId;

async function glassCircle(x,y,size,name) {
  const gp=10;
  const gl=await createRect({x:x-gp,y:y-gp,width:size+gp*2,height:size+gp*2,name:`${name}-gl`,parentId:screenId});
  await setRadius(gl.id,(size+gp*2)/2);
  await setGrad(gl.id,"GRADIENT_RADIAL",[
    {r:0.608,g:0.435,b:0.831,a:0.2,position:0},
    {r:0.608,g:0.435,b:0.831,a:0,position:1},
  ],[{x:0.5,y:0.5},{x:1,y:0.5},{x:0.5,y:1}]);
  const c=await createRect({x,y,width:size,height:size,name:`${name}-c`,parentId:screenId});
  await setRadius(c.id,size/2);
  await setFillC(c.id,C.glassFill,0.9);
  await setStroke(c.id,{r:0.729,g:0.510,b:0.929,a:0.3},1);
  return c;
}

async function build() {
  const screenX=22000, vName="Chat v1.4";
  console.log(`\n=== ${vName} at (${screenX}, 0) ===\n`);

  const frame=await createFrame({x:screenX,y:0,width:W,height:H,name:vName});
  screenId=frame.id;
  await setRadius(screenId,50);
  await setFillC(screenId,C.bgDark,1);

  // BG gradient - slightly warmer center
  const bg=await createRect({x:0,y:0,width:W,height:H,name:"bg",parentId:screenId});
  await setGrad(bg.id,"GRADIENT_RADIAL",[
    {r:0.280,g:0.115,b:0.345,a:0.95,position:0},
    {r:0.230,g:0.095,b:0.290,a:0.82,position:0.18},
    {r:0.175,g:0.075,b:0.230,a:0.6,position:0.35},
    {r:0.120,g:0.052,b:0.175,a:0.35,position:0.55},
    {r:0.070,g:0.030,b:0.120,a:0.15,position:0.75},
    {r:0.047,g:0.016,b:0.082,a:0,position:1},
  ],[{x:0.5,y:0.28},{x:1.15,y:0.28},{x:0.5,y:0.95}]);
  await sleep(100);

  // STATUS BAR
  let t;
  t=await createRect({x:(W-126)/2,y:11,width:126,height:37,name:"isl",parentId:screenId});
  await setFillC(t.id,C.black,1); await setRadius(t.id,20);
  await createText({text:"2:32",fontSize:16,fontWeight:600,fontColor:C.white,parentId:screenId,x:28,y:15,name:"time"});

  for(let i=0;i<4;i++){
    const bH=4+i*2;
    t=await createRect({x:W-100+i*5,y:18+(10-bH),width:3,height:bH,name:`s${i}`,parentId:screenId});
    await setFillC(t.id,C.white,1); await setRadius(t.id,0.5);
  }
  const wX=W-74;
  t=await createRect({x:wX+4,y:24,width:3,height:3,name:"wd",parentId:screenId});
  await setFillC(t.id,C.white,1); await setRadius(t.id,1.5);
  for(let i=0;i<2;i++){
    const aw=7+i*4;
    t=await createRect({x:wX+5.5-aw/2,y:21-i*3,width:aw,height:2,name:`wa${i}`,parentId:screenId});
    await setFillC(t.id,C.white,1); await setRadius(t.id,1);
  }
  const bX=W-40;
  t=await createRect({x:bX,y:17,width:25,height:12,name:"bo",parentId:screenId});
  await setFillC(t.id,C.black,0); await setStroke(t.id,{r:1,g:1,b:1,a:1},1); await setRadius(t.id,3);
  t=await createRect({x:bX+2,y:19,width:21,height:8,name:"bf",parentId:screenId});
  await setFillC(t.id,C.white,1); await setRadius(t.id,1.5);
  t=await createRect({x:bX+26,y:20,width:2,height:6,name:"bc",parentId:screenId});
  await setFillC(t.id,C.white,0.4); await setRadius(t.id,0.5);

  // HEADER
  const hY=58;
  await createText({text:"‹",fontSize:30,fontWeight:700,fontColor:C.white,parentId:screenId,x:10,y:hY-4,name:"back"});

  const avC=[{r:0.90,g:0.72,b:0.42},{r:0.82,g:0.58,b:0.38},{r:0.72,g:0.55,b:0.68}];
  for(let i=0;i<3;i++){
    const av=await createEllipse({x:42+i*14,y:hY+2,width:22,height:22,name:`av${i}`,parentId:screenId});
    await setFillC(av.id,avC[i],1);
    await setStroke(av.id,{r:0.047,g:0.016,b:0.082,a:1},2);
  }

  const ballSz=90,ballX=(W-ballSz)/2,ballY=hY;
  const btnCY=ballY+ballSz/2;

  // Phone btn
  const pSz=42,pX=90,pY=btnCY-pSz/2;
  await glassCircle(pX,pY,pSz,"phone");
  const phCX=pX+pSz/2,phCY=pY+pSz/2,phX=phCX-9,phY=phCY-9;
  t=await createRect({x:phX,y:phY,width:18,height:3,name:"pt",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,1.5);
  t=await createRect({x:phX,y:phY+3,width:4,height:12,name:"pl",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,1);
  t=await createRect({x:phX+14,y:phY+3,width:4,height:12,name:"pr",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,1);
  t=await createRect({x:phX,y:phY+15,width:18,height:3,name:"pb",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,1.5);

  // Ball glow
  const glSz=130;
  const gR=await createRect({x:ballX-(glSz-ballSz)/2,y:ballY-(glSz-ballSz)/2,width:glSz,height:glSz,name:"bgl",parentId:screenId});
  await setRadius(gR.id,glSz/2);
  await setGrad(gR.id,"GRADIENT_RADIAL",[
    {r:0.608,g:0.435,b:0.831,a:0.5,position:0},
    {r:0.608,g:0.435,b:0.831,a:0.2,position:0.45},
    {r:0.608,g:0.435,b:0.831,a:0,position:1},
  ],[{x:0.5,y:0.5},{x:1,y:0.5},{x:0.5,y:1}]);

  const ball=await createEllipse({x:ballX,y:ballY,width:ballSz,height:ballSz,name:"ball",parentId:screenId});
  await setFillC(ball.id,{r:0.08,g:0.04,b:0.14},1);
  await setStroke(ball.id,{r:0.608,g:0.435,b:0.831,a:0.35},1.5);

  const bM=await measureText({text:"belo",fontSize:26,fontWeight:400,fontFamily:FONT_LOGO,fontColor:{r:1,g:0.98,b:0.95}});
  await createText({text:"belo",fontSize:26,fontWeight:400,fontFamily:FONT_LOGO,fontColor:{r:1,g:0.98,b:0.95},parentId:screenId,
    x:ballX+(ballSz-bM.width)/2,y:ballY+(ballSz-bM.height)/2-2,name:"bt"});

  const bdSz=22,bdX=ballX+ballSz-bdSz+2,bdY=ballY+ballSz-bdSz+2;
  const bd=await createEllipse({x:bdX,y:bdY,width:bdSz,height:bdSz,name:"bdg",parentId:screenId});
  await setFillC(bd.id,C.green,1);
  const b8M=await measureText({text:"8",fontSize:13,fontWeight:700,fontColor:C.white});
  await createText({text:"8",fontSize:13,fontWeight:700,fontColor:C.white,parentId:screenId,
    x:bdX+(bdSz-b8M.width)/2,y:bdY+(bdSz-b8M.height)/2,name:"b8"});

  // Video btn
  const vSz=42,vX=W-90-vSz,vY=btnCY-vSz/2;
  await glassCircle(vX,vY,vSz,"vid");
  const vCX=vX+vSz/2,vCY=vY+vSz/2;
  t=await createRect({x:vCX-11,y:vCY-6,width:14,height:12,name:"cb",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,2);
  t=await createRect({x:vCX+4,y:vCY-4,width:7,height:8,name:"cl",parentId:screenId});
  await setFillC(t.id,C.white,0.85); await setRadius(t.id,1);

  // Stack
  const sX=W-36,sY=btnCY-12;
  t=await createRect({x:sX,y:sY,width:14,height:14,name:"s1",parentId:screenId});
  await setFillC(t.id,C.black,0); await setStroke(t.id,{r:1,g:1,b:1,a:0.8},1.5); await setRadius(t.id,3);
  t=await createRect({x:sX+5,y:sY+5,width:14,height:14,name:"s2",parentId:screenId});
  await setFillC(t.id,C.black,0); await setStroke(t.id,{r:1,g:1,b:1,a:0.8},1.5); await setRadius(t.id,3);

  // Group name + members
  const nmM=await measureText({text:"belo team",fontSize:18,fontWeight:700,fontColor:C.white});
  const nmY=ballY+ballSz+4;
  await createText({text:"belo team",fontSize:18,fontWeight:700,fontColor:C.white,parentId:screenId,
    x:(W-nmM.width)/2,y:nmY,name:"gn"});
  const mmM=await measureText({text:"8 members",fontSize:13,fontWeight:400,fontColor:C.textMuted});
  const mmY=nmY+nmM.height+1;
  await createText({text:"8 members",fontSize:13,fontWeight:400,fontColor:C.textMuted,parentId:screenId,
    x:(W-mmM.width)/2,y:mmY,name:"mm"});

  await sleep(100);

  // MESSAGES - balanced spacing
  const msgs=[
    {sender:"Roman OG",color:C.coral,text:"Nope I get to about 90% of the weekly limit each week",time:"11:16"},
    {sender:"Roman OG",color:C.coral,text:"My fleet self adjusts to keep it under",time:"11:16"},
    {sender:"Enis Dev",color:C.teal,text:"Did you see the new Claude cowork",time:"11:17"},
    {sender:"Roman OG",color:C.coral,text:"Indeed, they're just porting all the features from the open source claude code community to their own product which is cool",time:"11:31"},
    {sender:"Saeed Sharifi",color:C.purple,text:"Btw im getting notifications for messages but when i open it it shows nothing",time:"11:44"},
    {sender:"Saeed Sharifi",color:C.purple,text:"I have to refresh the app to see",time:"11:44"},
    {sender:"Roman Dev",color:C.coral,text:"Ok will look into it",time:"12:39"},
  ];

  const tX=16, maxW=W*0.78;
  let curY=mmY+mmM.height+14; // balanced gap
  let lastS=null;

  for(const m of msgs){
    const sc=m.sender!==lastS;
    curY += sc ? 16 : 5; // balanced: 16 between senders, 5 between same

    if(sc){
      const sM=await measureText({text:m.sender,fontSize:13,fontWeight:700,fontColor:m.color});
      await createText({text:m.sender,fontSize:13,fontWeight:700,fontColor:m.color,parentId:screenId,
        x:tX,y:curY,name:`sn-${m.sender}`});
      curY+=sM.height+2;
    }

    const mn=await createMeasuredText({text:m.text,fontSize:16,fontWeight:400,fontColor:C.textPri,parentId:screenId,
      x:tX,y:curY,maxWidth:maxW,name:`m-${m.text.slice(0,12)}`});
    curY+=mn.height+1;

    // Timestamp - slightly more muted
    const tsMuted = {r:0.580,g:0.520,b:0.670}; // slightly more muted than C.textMuted
    const tsM=await measureText({text:m.time,fontSize:11,fontWeight:400,fontColor:tsMuted});
    await createText({text:m.time,fontSize:11,fontWeight:400,fontColor:tsMuted,parentId:screenId,
      x:tX,y:curY,name:`t-${m.time}`});
    curY+=tsM.height+1;
    lastS=m.sender;
  }

  await sleep(100);

  // INPUT AREA
  const inY=H-88, aH=54;
  t=await createRect({x:0,y:inY-1,width:W,height:1,name:"sp",parentId:screenId});
  await setFillC(t.id,C.white,0.05);

  const mSz=48,mX=14,mCY=inY+(aH-mSz)/2;
  await glassCircle(mX,mCY,mSz,"menu");
  for(let i=0;i<3;i++){
    const d=await createRect({x:mX+(mSz-4)/2,y:mCY+12+i*8,width:4,height:4,name:`md${i}`,parentId:screenId});
    await setFillC(d.id,C.white,0.8); await setRadius(d.id,2);
  }

  const hM=await measureText({text:"belo",fontSize:20,fontWeight:400,fontFamily:FONT_LOGO,fontColor:C.textMuted});
  await createText({text:"belo",fontSize:20,fontWeight:400,fontFamily:FONT_LOGO,fontColor:C.textMuted,parentId:screenId,
    x:(W-hM.width)/2-10,y:inY+(aH-hM.height)/2,name:"inp"});

  const gfM=await measureText({text:"GIF",fontSize:13,fontWeight:700,fontColor:C.textMuted});
  await createText({text:"GIF",fontSize:13,fontWeight:700,fontColor:C.textMuted,parentId:screenId,
    x:W-mSz-24-gfM.width,y:inY+(aH-gfM.height)/2,name:"gif"});

  const miSz=48,miX=W-miSz-14,miY=inY+(aH-miSz)/2;
  await glassCircle(miX,miY,miSz,"mic");
  const mW=10,mH=16,miIX=miX+(miSz-mW)/2,miIY=miY+10;
  t=await createRect({x:miIX,y:miIY,width:mW,height:mH,name:"mp",parentId:screenId});
  await setFillC(t.id,C.white,0.8); await setRadius(t.id,mW/2);
  const stX=miX+miSz/2-1;
  t=await createRect({x:stX,y:miIY+mH,width:2,height:5,name:"ms",parentId:screenId});
  await setFillC(t.id,C.white,0.8);
  t=await createRect({x:stX-4,y:miIY+mH+4,width:10,height:2,name:"mb",parentId:screenId});
  await setFillC(t.id,C.white,0.8); await setRadius(t.id,1);
  t=await createRect({x:miIX-3,y:miIY+2,width:16,height:18,name:"mc",parentId:screenId});
  await setFillC(t.id,C.black,0); await setStroke(t.id,{r:1,g:1,b:1,a:0.5},1.5); await setRadius(t.id,8);

  // Home indicator
  t=await createRect({x:(W-134)/2,y:H-20,width:134,height:5,name:"hi",parentId:screenId});
  await setFillC(t.id,C.white,0.22); await setRadius(t.id,3);

  await sleep(500);

  console.log("Exporting...");
  try {
    const img=await exportImg(screenId);
    if(img?.imageData){
      const buf=Buffer.from(img.imageData,"base64");
      const p=path.join(__dirname,"iteration-5.png");
      fs.writeFileSync(p,buf);
      console.log(`Saved: ${p}`);
    }
  } catch(e){console.log(`Err: ${e.message}`);}
}

async function main() {
  const ch=await findChannel();
  console.log(`Channel: ${ch}`);
  await connect(ch);
  console.log("Connected");
  await build();
  await sleep(500);
  ws.close();
  process.exit(0);
}

main().catch(e=>{console.error(e);process.exit(1);});
