import { spawn } from 'node:child_process';
// Headless Chrome check for wireframes-v3: burgundy/gold pixel share, Anton count, type sizes, word budgets.
// Usage: node check_render.mjs file:///…/wireframes-v3.html x out.json   then: python3 -I inject_checks.py out.json ../wireframes-v3.html
import zlib from 'node:zlib';
import fs from 'node:fs';
const [,, url, kind, outdir] = process.argv;
const S=(await import('node:os')).tmpdir();
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new','--disable-gpu','--remote-debugging-port=9337','--window-size=1400,900','--user-data-dir='+S+'/chprof5','about:blank'], {stdio:'ignore'});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let ws; for (let i=0;i<40;i++){ try{ const j=await (await fetch('http://127.0.0.1:9337/json')).json(); const p=j.find(t=>t.type==='page'); if(p){ws=new WebSocket(p.webSocketDebuggerUrl);break;} }catch(e){} await sleep(250); }
await new Promise(r=>ws.onopen=r);
let id=0; const pend=new Map(); const logs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);} if(m.method==='Runtime.exceptionThrown')logs.push('EXC '+m.params.exceptionDetails.text); if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')logs.push('ERR '+JSON.stringify(m.params.args)); if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')logs.push('LOG '+m.params.entry.text);};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate',{url}); await sleep(3000);
function decode(buf){ // PNG RGBA/RGB 8-bit
  let o=8,w,h,ct,idat=[];
  while(o<buf.length){const len=buf.readUInt32BE(o),type=buf.toString('ascii',o+4,o+8),d=buf.subarray(o+8,o+8+len);
    if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];} if(type==='IDAT')idat.push(d); o+=12+len;}
  const raw=zlib.inflateSync(Buffer.concat(idat)); const bpp=ct===6?4:3; const stride=w*bpp; const px=Buffer.alloc(h*stride);
  for(let y=0;y<h;y++){const f=raw[y*(stride+1)]; for(let x=0;x<stride;x++){const r=raw[y*(stride+1)+1+x]; const a=x>=bpp?px[y*stride+x-bpp]:0; const b=y?px[(y-1)*stride+x]:0; const c=(x>=bpp&&y)?px[(y-1)*stride+x-bpp]:0; let v;
    if(f===0)v=r;else if(f===1)v=r+a;else if(f===2)v=r+b;else if(f===3)v=r+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v=r+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);} px[y*stride+x]=v&255;}}
  return {w,h,bpp,px};
}
function burg(img){ let n=0,t=img.w*img.h; for(let i=0;i<t;i++){const r=img.px[i*img.bpp]/255,g=img.px[i*img.bpp+1]/255,b=img.px[i*img.bpp+2]/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b),v=mx,sat=mx?(mx-mn)/mx:0; if(v<.25||sat<.6)continue; let h; const d=mx-mn; if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4); if(h<0)h+=360; if(h>=325||h<=6)n++;} return n/t; }
const shot=async clip=>decode(Buffer.from((await send('Page.captureScreenshot',{format:'png',clip:{...clip,scale:1},captureBeyondViewport:true})).data,'base64'));

function pix(img){ let bu=0,go=0,t=img.w*img.h; for(let i=0;i<t;i++){const r=img.px[i*img.bpp]/255,g=img.px[i*img.bpp+1]/255,b=img.px[i*img.bpp+2]/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b),v=mx,sat=mx?(mx-mn)/mx:0,d=mx-mn; if(!d)continue; let h; if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4); if(h<0)h+=360;
 if(v>=.25&&sat>=.6&&(h>=325||h<=6))bu++; if(v>=.45&&sat>=.3&&sat<=.7&&h>=30&&h<=48)go++;} return [bu/t,go/t]; }
const js = `(()=>{
const EXCL='.p-sb,.c-nav,.c-inapp,svg,.c-logo,.c-countdown,.c-card__wm,.c-btn--quiet,.q';
function words(el){const c=el.cloneNode(true); c.querySelectorAll('[data-budget]').forEach(e=>e.remove()); c.querySelectorAll(EXCL+',.cta').forEach(e=>e.remove());
 const toks=c.textContent.replace(/[·→↗›✓✕⌫▲▼≈|()"“”]/g,' ').split(/\\s+/).filter(Boolean);
 return toks.filter(t=>/[A-Za-z]/.test(t)&&!/\\d/.test(t)&&!/^[A-Z]{2,6}c?[.,]?$/.test(t)&&!t.startsWith('@')).length;}
return JSON.stringify([...document.querySelectorAll('.p-phone')].map(f=>{const r=f.getBoundingClientRect();
 const sizes=new Set(), anton=[];
 f.querySelectorAll('*').forEach(e=>{ if(e.closest(EXCL)) return; const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()); if(!own) return; const cs=getComputedStyle(e); sizes.add(cs.fontSize); if(cs.fontFamily.includes('Anton')) anton.push(e.textContent.trim().slice(0,20)); });
 const blocks=[f,...f.querySelectorAll('[data-budget]')].filter(e=>e.dataset.budget).map(e=>({kind:e.dataset.kind,budget:+e.dataset.budget,words:words(e)}));
 return {name:f.dataset.name,x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,sizes:[...sizes].sort(),anton,blocks};}));})()`;
const data=JSON.parse((await send('Runtime.evaluate',{expression:js,returnByValue:true})).result.value);
for(const f of data){ const img=await shot({x:f.x,y:f.y,width:f.w,height:f.h}); [f.burg,f.gold]=pix(img); }
fs.writeFileSync(outdir, JSON.stringify(data,null,1));
const bad=data.filter(f=>f.burg>.10||f.gold>.03||f.anton.length>1||f.sizes.length>3||f.blocks.some(b=>b.words>b.budget));
console.log('frames',data.length,'issues',bad.length);
for(const f of bad) console.log(JSON.stringify({n:f.name,b:(f.burg*100).toFixed(1),g:(f.gold*100).toFixed(1),a:f.anton,s:f.sizes,over:f.blocks.filter(b=>b.words>b.budget)}));
console.log('max burg',Math.max(...data.map(f=>f.burg)).toFixed(4),'max gold',Math.max(...data.map(f=>f.gold)).toFixed(4),'console:',logs.length?logs.join('|'):'none');
ws.close(); chrome.kill(); process.exit(0);
res.sort((a,b)=>b[1]-a[1]);
for(const [k,v] of res) console.log((v*100).toFixed(2).padStart(6)+'%  '+k);
console.log('MAX', (Math.max(...res.map(r=>r[1]))*100).toFixed(2)+'%', 'console:', logs.length?logs.join(' | '):'none');
ws.close(); chrome.kill();
