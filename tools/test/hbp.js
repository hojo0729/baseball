const { openGame } = require('./lib.mjs');
(async()=>{const { b, p, errs } = await openGame();
await p.waitForTimeout(1500);
await p.evaluate(()=>__dbg.gopit());await p.waitForTimeout(6500);
async function hbp(n){
  await p.waitForFunction(()=>__dbg.phase==='ready',null,{timeout:60000});
  await p.evaluate(()=>__dbg.pitch());
  await p.waitForFunction(()=>__dbg.phase==='fly',null,{timeout:20000});
  await p.evaluate(()=>__dbg.hit({kind:'take',hbp:true},null));
  await p.waitForTimeout(500);
  console.log(n,JSON.stringify(await p.evaluate(()=>({bn:document.querySelector('#bt').textContent,bs:document.querySelector('#bs').textContent,G:{o:__dbg.G.outs,r:__dbg.G.runs,b:__dbg.G.bases,hbp:__dbg.G.hbp,eject:__dbg.G.eject}}))));
}
await hbp(1);
await p.waitForFunction(()=>__dbg.phase==='ready',null,{timeout:60000});
await hbp(2);
await p.waitForTimeout(1500);await p.screenshot({path:'bw-1.png'});
await p.waitForTimeout(1200);await p.screenshot({path:'bw-2.png'});
await p.waitForTimeout(1500);await p.screenshot({path:'bw-3.png'});
await p.waitForFunction(()=>__dbg.phase==='ready',null,{timeout:30000});
console.log('after',JSON.stringify(await p.evaluate(()=>({bn:document.querySelector('#bt').textContent,bs:document.querySelector('#bs').textContent,P:__dbg.roster().p.name}))));
console.log(JSON.stringify(errs));await b.close();})()
