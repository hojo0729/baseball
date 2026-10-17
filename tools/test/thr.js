const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/game.html');await p.waitForTimeout(1500);
await p.evaluate(()=>__dbg.gopit());await p.waitForTimeout(800);
console.log('mode',await p.evaluate(()=>__dbg.mode));
const pre=process.argv[2]||'thr';
async function trial(bases,outs,pick,tag,res){
  // wait for fly (CPU batting; we pitch)
  await p.waitForFunction(()=>__dbg.phase==='fly'||__dbg.phase==='ready',null,{timeout:40000});
  if(await p.evaluate(()=>__dbg.phase)==='ready'){ await p.evaluate(()=>{ /* throw a pitch */ }); }
}
// simpler: force state then force result via hit()
async function run(bases,outs,pick,res,ev,tag){
  await p.waitForFunction(()=>__dbg.phase==='ready'||__dbg.phase==='wait',null,{timeout:60000});
  await p.evaluate(([bs,o])=>{__dbg.G.bases=bs;__dbg.G.outs=o;},[bases,outs]);
  // launch a pitch via the game's own throw to get a ball object
  await p.evaluate(()=>__dbg.pitch());
  await p.waitForFunction(()=>__dbg.phase==='fly',null,{timeout:20000});
  await p.evaluate(([res,ev])=>__dbg.hit({kind:'play',q:0.6,dir:-20,ev,launch:2,dist:30,res,bases:res==='ゴロヒット'?1:0}),[res,ev]);
  await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({pend:!!(__dbg.play&&__dbg.play.pend),chips:[...document.querySelectorAll('#acts .chip')].map(x=>x.textContent),hint:document.querySelector('#hint').textContent}));
  console.log(tag,'pending',JSON.stringify(st));
  if(tag==='shot'){ await p.screenshot({path:pre+'-slow.png'}); }
  if(pick){ await p.evaluate(b=>{document.querySelector(`#acts .chip[data-k="thr${b}"]`).click()},pick); }
  await p.waitForTimeout(tag==='shot'?1200:300);
  if(tag==='shot') await p.screenshot({path:pre+'-after.png'});
  await p.waitForFunction(()=>__dbg.phase==='ready'||__dbg.phase==='wait'||__dbg.phase==='idle',null,{timeout:30000});
  console.log(tag,'->',await p.evaluate(()=>JSON.stringify({G:{o:__dbg.G.outs,r:__dbg.G.runs,b:__dbg.G.bases,inn:__dbg.G.inning},bn:document.querySelector('#bt').textContent})));
}
await run([3,3,3],0,4,'ゴロアウト',135,'shot');
await run([3,3,3],0,2,'ゴロアウト',135,'loaded-2nd');
await run([3,0,0],0,1,'ゴロアウト',135,'first-only');
await run([0,0,3],0,4,'ゴロアウト',100,'tag');
await run([3,0,0],1,0,'ゴロアウト',135,'timeout');
console.log(JSON.stringify(errs));await b.close();})()
