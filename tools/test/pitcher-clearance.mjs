import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];attachErrors(p,errors);
  await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{localStorage.setItem('yakyu-bgm','0');__dbg.gopit();__dbg.optOff();});
  const measurements=[];
  for(const [width,height] of [[320,568],[390,844],[1280,800]]){
    await p.setViewportSize({width,height});
    measurements.push(...await p.evaluate(width=>{const results=[];for(const team of ['home','away','neko','usagi','kuma','tiger','floppy','alien','human'])for(const beast of [false,true])for(const k of [0,.35,.7,1]){const v=__dbg.pitcherView(team,k,beast);results.push({width,team,beast,k,gap:+(v.zone.top-v.head.bottom).toFixed(2),...v});}return results;},width));
    await p.evaluate(()=>__dbg.pitcherView('away',0,false));await p.screenshot({path:`tools/test/pitcher-${width}.png`});
  }
  measurements.sort((a,b)=>a.gap-b.gap);console.log(JSON.stringify({samples:measurements.length,worst:measurements[0]}));
  if(!process.argv.includes('--measure'))for(const v of measurements)assert.ok(v.head.bottom<=v.zone.top-2||v.head.right<=v.zone.left-2||v.head.left>=v.zone.right+2,JSON.stringify(v));
  assert.deepEqual(errors,[]);console.log('[]');
}finally{await b.close();}
