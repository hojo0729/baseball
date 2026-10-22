import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
try {
  const ctx=await b.newContext({viewport:{width:320,height:568}}),errors=[];
  await ctx.addInitScript(()=>{localStorage.setItem('yakyu-bgm','0');localStorage.setItem('yakyu-opts',JSON.stringify({dice:false,hap:false}));});
  const A=await ctx.newPage(),B=await ctx.newPage();
  for(const p of [A,B]){attachErrors(p,errors);await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{__dbg.optOff();__dbg.freezePitches();});}
  await A.click('#go3');await A.click('#goBtn');const code=(await A.textContent('#ot')).replace(/\D/g,'');
  await B.click('#go3');await B.click('#go2');await B.fill('#codeIn',code);await B.click('#goBtn');
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.online);
  const snapshot=p=>p.evaluate(()=>({r:__dbg.rematch(),phase:__dbg.phase,score:__dbg.score(),g:__dbg.G,beast:__dbg.onlineBeast().active}));
  async function end(p){await p.evaluate(()=>{const d=__dbg;d.G.runs=2;d.G.over=true;d.G.teams.home.sta=0;d.G.skill.crit=0;d.finishOnline();});}
  await A.keyboard.type('BEAST');
  await end(B);await B.click('#goBtn');
  await A.waitForFunction(()=>__dbg.rematch().wanted.theirs);
  assert.equal((await snapshot(A)).r.round,0,'No restart before the other player finishes and agrees');
  await end(A);assert.match(await A.textContent('#od'),/相手が再戦/);
  assert.equal(await B.locator('#goBtn').isDisabled(),true);
  await B.screenshot({path:'tools/test/online-rematch-wait.png'});
  await A.click('#goBtn');
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.rematch().round===1);
  let a=await snapshot(A),bb=await snapshot(B);
  assert.equal(a.r.side,'away');assert.equal(bb.r.side,'home');assert.equal(a.phase,'wait');assert.equal(bb.phase,'ready');
  for(const s of [a,bb]){
    assert.deepEqual(s.score,{home:0,away:0});assert.equal(s.g.inning,1);assert.equal(s.g.pa,0);assert.equal(s.g.over,false);
    assert.equal(s.g.skill.crit,2);assert.ok(s.g.teams.home.sta>0);assert.equal(s.r.timeLeft,3);assert.equal(s.r.pn,0);
    assert.deepEqual(s.beast,{home:false,away:false});assert.deepEqual(s.r.queues,[null,null,null]);
  }
  assert.deepEqual(a.g,bb.g);
  // Delayed/duplicated messages from the previous match must be ignored.
  await A.evaluate(()=>{for(const type of ['rematch','rematch-start','pitch','result','beast','bye'])__dbg.receiveOnline({type,from:'old-peer',round:0,p:{},side:'home',seed:1});});
  assert.deepEqual(await snapshot(A),a);
  // A real pitch/result works after swapping roles.
  await B.evaluate(()=>{__dbg.throwP('str',130,0,0);__dbg.ff();});
  await A.waitForFunction(()=>['deliver','fly'].includes(__dbg.phase));
  await A.evaluate(()=>{if(__dbg.phase==='deliver')__dbg.ff();__dbg.hit({kind:'play',q:.5,dir:0,ev:90,launch:65,dist:20,res:'ポップフライ',bases:0});});
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.G.pa===1);
  assert.deepEqual((await snapshot(A)).g,(await snapshot(B)).g);
  // Simultaneous requests, a second swap, then exit while the opponent waits.
  for(const p of [A,B])await end(p);
  await Promise.all([A.click('#goBtn'),B.click('#goBtn')]);
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.rematch().round===2);
  assert.equal((await snapshot(A)).r.side,'home');assert.equal((await snapshot(B)).r.side,'away');
  for(const p of [A,B])await end(p);
  await A.click('#goBtn');await B.click('#go2');
  await A.waitForFunction(()=>document.querySelector('#ot').textContent==='相手が退出しました');
  assert.match(await A.textContent('#od'),/再戦の受付を終了/);assert.equal(await A.locator('#goBtn').isEnabled(),true);
  await A.click('#goBtn');assert.match(await A.textContent('#ot'),/どうぶつベースボール/);
  assert.deepEqual(errors,[]);console.log('✓ Online rematch: mutual consent, early request, role swaps, full reset, old messages, pitch sync, repeated rematch, exit and menu');console.log('[]');
}finally{await b.close();}
