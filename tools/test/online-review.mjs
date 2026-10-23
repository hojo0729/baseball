import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
function roll(seed){let a=(seed+0x6D2B79F5)|0,t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;}
const seedFor=predicate=>{for(let s=1;s<100000;s++)if(predicate(roll(s)))return s;throw Error('No seed');};
try{
  const ctx=await b.newContext({viewport:{width:390,height:844}}),errors=[];
  ctx.setDefaultTimeout(30000);
  await ctx.addInitScript(()=>{localStorage.setItem('yakyu-bgm','0');localStorage.setItem('yakyu-opts',JSON.stringify({dice:false,hap:false}));});
  const A=await ctx.newPage(),B=await ctx.newPage();
  for(const p of [A,B]){attachErrors(p,errors);await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{__dbg.optOff();__dbg.freezePitches();});}
  await A.click('#go3');await A.click('#goBtn');const code=(await A.textContent('#ot')).replace(/\D/g,'');
  await B.click('#go3');await B.click('#go2');await B.fill('#codeIn',code);await B.click('#goBtn');
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.online&&__dbg.review().enabled);
  const state=p=>p.evaluate(()=>({g:__dbg.G,score:__dbg.score(),r:__dbg.review()}));
  let checkedReplay=false;
  async function setup(o={}){for(const p of [A,B])await p.evaluate(o=>__dbg.reviewSetup({inning:1,outs:0,b:0,s:0,runs:0,bases:[3,0,0],over:false,...o}),o);}
  async function pitch(c,seed,sg=null,tx=.2,ty=.1){
    if(sg){await B.click(`[data-k="${sg}"]`);await A.waitForFunction(()=>__dbg.sig().oppSign==='steal');}
    await A.evaluate(({tx,ty})=>{__dbg.throwP('str',140,tx,ty);__dbg.ff();},{tx,ty});
    await B.waitForFunction(()=>['deliver','fly'].includes(__dbg.phase));
    await B.evaluate(({c,seed})=>{if(__dbg.phase==='deliver')__dbg.ff();__dbg.hit(c,()=>seed/4294967296);},{c,seed});
    for(const p of [A,B])await p.waitForFunction(()=>__dbg.phase==='result');
    assert.deepEqual((await state(A)).g,(await state(B)).g);
    assert.deepEqual((await state(A)).r.call,(await state(B)).r.call);
  }
  async function review(who,changed,advancePeer=null,kind=null){
    console.log('Review:',kind||'race',changed?'overturn':'uphold');
    for(const p of [A,B])await p.evaluate(()=>__dbg.reviewOfferHold());
    const button=kind==='pitch'?'#pitch-review-request':'#review-request';
    await who.waitForFunction(button=>!document.querySelector(button).hidden,button);
    for(const p of [A,B])await p.evaluate(()=>__dbg.reviewHold('replay'));
    if(advancePeer)await advancePeer.evaluate(()=>{__dbg.ff();__dbg.throwP('str',140,.2,.1);__dbg.ff();});
    await who.click(button);
    for(const p of [A,B])await p.waitForFunction(()=>__dbg.review().stage==='replay').catch(async e=>{console.log('review open failed',JSON.stringify({a:await state(A),b:await state(B)}));throw e;});
    if(kind==='pitch'){
      assert.equal(await who.locator('#review-panel svg').isVisible(),false);
      await who.waitForFunction(()=>document.querySelector('.review-field').width>0);
      await who.screenshot({path:'tools/test/pitch-review.png'});
    }
    if(!checkedReplay){
      await who.evaluate(()=>__dbg.renderOn());
      await who.waitForFunction(()=>{const c=document.querySelector('.review-field'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lo=255,hi=0;for(let i=0;i<d.length;i+=40){lo=Math.min(lo,d[i]);hi=Math.max(hi,d[i]);}return hi-lo>30;});
      for(const [width,height] of [[320,568],[390,844],[1280,800]]){
        await who.setViewportSize({width,height});await who.evaluate(()=>__dbg.reviewDrawHold(false));
        await who.waitForFunction(()=>{const c=document.querySelector('.review-field');return c.width===Math.round(c.clientWidth*Math.min(1.5,devicePixelRatio));});
        await who.evaluate(()=>__dbg.reviewDrawHold(true));await who.screenshot({path:`tools/test/online-review-${width}.png`});
        assert.equal(await who.locator('#review-panel h2').evaluate(el=>el.getBoundingClientRect().top>=0),true);
      }
      await who.evaluate(()=>__dbg.noDraw());checkedReplay=true;
    }
    for(const p of [A,B])await p.evaluate(()=>__dbg.reviewHold('verdict'));
    for(const p of [A,B])await p.waitForFunction(()=>__dbg.review().stage==='verdict');
    assert.equal(await who.textContent('#review-panel h2'),changed?'判定変更！':'判定通り');
    assert.deepEqual((await state(A)).g,(await state(B)).g);assert.deepEqual((await state(A)).score,(await state(B)).score);
    assert.deepEqual((await state(A)).r.left,(await state(B)).r.left);
    const snapshot=await state(A);
    for(const p of [A,B])await p.evaluate(()=>{const r=__dbg.review();for(const type of ['review-open','review-verdict'])__dbg.receiveOnline({type,from:'duplicate',pn:r.pn,callStamp:r.callStamp,side:r.call.eligible,round:0});});
    assert.deepEqual(await state(A),snapshot,'Duplicate messages must not change state or charge twice');
    for(const p of [A,B])await p.evaluate(()=>__dbg.reviewHold(''));
    for(const p of [A,B])await p.waitForFunction(()=>!__dbg.review().active);
    for(const p of [A,B]){const r=(await state(p)).r;assert.ok(Math.abs(r.aspect-r.normalAspect)<1e-8,'Restore the current viewport aspect after review');}
  }
  // The umpire calls a rounded tie safe; precise stored timing proves the out.
  const overturned=seedFor(r=>r>.50&&r<.55),upheld=seedFor(r=>r>.43&&r<.46);
  await setup({outs:2,runs:2});await pitch({kind:'take'},overturned,'steal');
  assert.equal((await state(A)).r.call.initial,true);assert.equal((await state(A)).r.call.truth,false);
  assert.equal((await state(A)).g.inning,1);
  await review(A,true);
  assert.equal((await state(A)).g.inning,2);assert.equal((await state(A)).score.away,2);assert.equal((await state(A)).r.left.home,2);
  assert.deepEqual((await state(A)).g.bases,[0,0,0]);assert.equal(await A.evaluate(()=>__dbg.mode),'bat');
  // A third out at first can be reversed back into a hit without losing the inning's score.
  let firstCall=null;
  for(let seed=1;seed<=35;seed++){
    await setup({outs:2,runs:1,bases:[0,0,0]});
    for(const p of [A,B])await p.evaluate(()=>{__dbg.G.teams.away.order=0;});
    await pitch({kind:'play',q:.5,dir:0,ev:85,launch:0,dist:31,res:'ゴロアウト',bases:0},seed);
    const call=(await state(A)).r.call;if(call&&call.truth){firstCall=call;break;}
  }
  assert.ok(firstCall);assert.equal(firstCall.kind,'first');await review(B,true);
  assert.equal((await state(A)).g.inning,1);assert.equal((await state(A)).g.outs,2);assert.equal((await state(A)).g.runs,1);assert.equal((await state(A)).g.hits,1);assert.ok((await state(A)).g.bases[0]);
  // A peer that already started the next pitch must rewind, and old packets must stay cancelled.
  await setup({inning:2});await A.click('[data-k="steal"]');await B.waitForFunction(()=>__dbg.sig().oppSign==='steal');
  await B.evaluate(()=>{__dbg.throwP('str',140,.2,.1);__dbg.ff();});await A.waitForFunction(()=>['deliver','fly'].includes(__dbg.phase));
  await A.evaluate(seed=>{if(__dbg.phase==='deliver')__dbg.ff();__dbg.hit({kind:'take'},()=>seed/4294967296);},seedFor(r=>r>.67&&r<.68));
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.phase==='result');
  const oldStamp=(await state(A)).r.stamp;await review(A,false,B);
  assert.equal((await state(A)).r.pn,(await state(B)).r.pn);assert.equal((await state(A)).r.left.home,1);
  const beforeLate=await state(A);
  await A.evaluate(stamp=>{for(const type of ['pitch','result','sign'])__dbg.receiveOnline({type,round:0,reviewStamp:stamp,p:{},c:{},from:'late'});},oldStamp);
  assert.deepEqual(await state(A),beforeLate);
  // Failed challenges consume only the requesting team's allowance.
  for(let i=1;i<2;i++){await setup();await pitch({kind:'take'},upheld,'steal');await review(A,false);assert.equal((await state(A)).r.left.home,1-i);}
  await setup();await pitch({kind:'take'},overturned,'steal');
  assert.equal(await A.locator('#review-request').isHidden(),true,'No challenge after both failures');
  for(const p of [A,B])await p.evaluate(()=>__dbg.ff());
  // Home plate decisions use the same recorded race and can revoke a walk-off.
  const fly={kind:'play',q:.5,dir:0,ev:110,launch:32,dist:65,res:'フライアウト',bases:0};
  await setup({inning:6,outs:1,bases:[0,0,3]});
  // The exact seeded draw position includes makePlay's defensive animation draw.
  let homeCall=null;
  for(let seed=1;seed<=30;seed++){
    await setup({inning:6,outs:1,bases:[0,0,3]});
    await B.evaluate(()=>{__dbg.throwP('str',140,.2,.1);__dbg.ff();});await A.waitForFunction(()=>['deliver','fly'].includes(__dbg.phase));
    await A.evaluate(({c,seed})=>{if(__dbg.phase==='deliver')__dbg.ff();__dbg.hit(c,()=>seed/4294967296);},{c:fly,seed});
    for(const p of [A,B])await p.waitForFunction(()=>__dbg.phase==='result');
    const call=(await state(A)).r.call;
    if(call&&call.initial!==call.truth){homeCall=call;break;}
  }
  assert.ok(homeCall,'Find a reproducible close home-plate call');
  // The away team still has its two challenges; it challenges an initially safe runner.
  assert.equal(homeCall.initial,true);await review(B,true);
  assert.equal((await state(A)).score.home,0);assert.equal((await state(A)).g.over,false);
  assert.deepEqual((await state(A)).r.left,{home:0,away:2});
  // A completed new match resets the allowance and stale round messages are ignored.
  for(const p of [A,B])await p.evaluate(()=>{__dbg.G.over=true;__dbg.finishOnline();});
  await Promise.all([A.click('#goBtn'),B.click('#goBtn')]);
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.rematch().round===1);
  assert.deepEqual((await state(A)).r.left,{home:2,away:2});
  await A.evaluate(()=>__dbg.receiveOnline({type:'review-open',round:0,pn:1,side:'home',from:'old'}));assert.equal((await state(A)).r.active,false);
  // Any taken pitch can be reviewed, including clear calls, strike three and ball four.
  console.log('Checking voluntary pitch challenges');
  for(const p of [A,B])await p.evaluate(()=>{__dbg.G.over=true;__dbg.finishOnline();});
  await Promise.all([A.click('#goBtn'),B.click('#goBtn')]);
  for(const p of [A,B])await p.waitForFunction(()=>__dbg.rematch().round===2);
  assert.equal((await state(A)).r.pitchEnabled,true);
  await setup({bases:[0,0,0],outs:2,s:2});await pitch({kind:'take'},9);
  assert.equal((await state(A)).r.pitchCall.initial,true);
  assert.equal(await A.locator('#pitch-review-request').isHidden(),true);
  await review(B,false,null,'pitch');
  assert.equal((await state(A)).g.inning,2);assert.equal((await state(A)).r.left.away,1);
  await setup({bases:[0,0,0],b:3});await pitch({kind:'take'},9,null,2.1,.1);
  assert.equal((await state(A)).r.pitchCall.initial,false);
  await review(A,false,null,'pitch');
  assert.ok((await state(A)).g.bases[0]);assert.equal((await state(A)).r.left.home,1);
  await setup({bases:[0,0,0]});await pitch({kind:'take'},9,null,1,0);
  assert.equal((await state(A)).r.pitchCall.truth,true,'Zone edge is a strike');
  await review(B,false,null,'pitch');assert.equal((await state(A)).r.left.away,0);
  await setup({bases:[0,0,0]});await pitch({kind:'take'},9);
  assert.equal(await B.locator('#pitch-review-request').isHidden(),true,'Pitch and race reviews share the allowance');
  await setup({bases:[0,0,0]});await pitch({kind:'miss'},9);
  assert.equal((await state(A)).r.pitchCall,undefined,'Swinging strikes cannot be challenged');
  await setup({bases:[0,0,0]});await pitch({kind:'take',hbp:true},9);
  assert.equal((await state(A)).r.pitchCall,undefined,'Hit by pitch is excluded');
  await setup({bases:[0,0,0]});await pitch({kind:'take'},9,null,2.1,.1);
  await A.waitForFunction(()=>!document.querySelector('#pitch-review-request').hidden);
  for(const p of [A,B])await p.evaluate(()=>__dbg.reviewOfferExpire());
  await A.waitForFunction(()=>document.querySelector('#pitch-review-request').hidden);
  for(const p of [A,B])await p.evaluate(()=>__dbg.receiveOnline({type:'review-ready',version:1,round:2,from:'legacy'}));
  await setup({bases:[0,0,0]});await pitch({kind:'take'},9,null,2.1,.1);
  assert.equal((await state(A)).r.pitchCall,undefined,'Legacy review support must not enable pitch challenges');
  assert.deepEqual(errors,[]);console.log('✓ Online review: negotiated support, shared evidence, overturn, third-out rollback, preserved score, failed limits, walk-off reversal, duplicate/stale messages and rematch reset');console.log('[]');
}finally{await b.close();}
