import assert from 'node:assert/strict';
import {openGame} from './lib.mjs';
import {playAwakeningOpening} from './story-opening.mjs';
const {b,p,errs}=await openGame({width:390,height:844});
try{
  await p.waitForFunction(()=>window.__dbg);
  await p.evaluate(()=>{__dbg.optOff();localStorage.setItem('yakyu-bgm','0');});
  for(const [width,height] of [[320,568],[390,844],[1280,800]]){
    await p.setViewportSize({width,height});
    const before=await p.evaluate(()=>{__dbg.showStage(8);__dbg.stadiumShot(false);const n=__dbg.beastEffects().count;__dbg.useBeast();return n;});
    await p.waitForFunction(n=>__dbg.beastEffects().count===n+1,before);
    const fx=await p.evaluate(()=>__dbg.beastEffects());assert.deepEqual(fx.auras,['pit']);assert.equal(fx.audio,false);assert.equal(fx.groups,2);
    await p.evaluate(()=>__dbg.holdBeastEffect());
    const fits=await p.locator('.beast-call strong').evaluate(el=>el.scrollWidth<=el.clientWidth);
    assert.equal(fits,true,'Headline fits');assert.equal(await p.locator('#beast-cut').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    await p.screenshot({path:`tools/test/beast-release-${width}.png`});
    const previous=await p.evaluate(()=>__dbg.beastEffects().count);await p.evaluate(()=>__dbg.useBeast());
    assert.equal(await p.evaluate(()=>__dbg.beastEffects().count),previous,'Duplicate activation does not replay');
  }
  // Exercise the real skill button and Web Audio path, then verify cleanup.
  await p.evaluate(()=>{localStorage.setItem('yakyu-bgm','1');__dbg.showStage(8);__dbg.stadiumShot(false);});
  await p.click('[data-k="beast"]');
  await p.waitForFunction(()=>__dbg.beastEffects().audio);
  assert.ok(await p.evaluate(()=>__dbg.audioState().context));
  await p.evaluate(()=>{localStorage.setItem('yakyu-bgm','0');__dbg.showStage(8);});
  assert.equal(await p.evaluate(()=>__dbg.beastEffects().audio),false);
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(()=>{__dbg.showStage(8);__dbg.stadiumShot(false);__dbg.useBeast();});
  await p.waitForFunction(()=>__dbg.beastEffects().cut);
  assert.equal(await p.evaluate(()=>__dbg.beastEffects().reduced),true);
  assert.equal(await p.locator('.beast-eyes').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await p.locator('.beast-call').evaluate(el=>getComputedStyle(el).animationName),'none');
  await p.emulateMedia({reducedMotion:'no-preference'});
  // Chapter 8 still reaches the same awakening choice through three real pitches.
  await p.evaluate(()=>__dbg.showStage(7));
  for(let i=0;i<20 && await p.locator('#overlay').isVisible();i++)await p.click('#goBtn');
  await playAwakeningOpening(p);
  for(let i=0;i<30 && await p.textContent('#ot')!=='ぼくが選ぶ';i++){
    const skip=p.locator('#movie-skip');
    if(await skip.count())await skip.click();else await p.click('#goBtn');
  }
  assert.equal(await p.textContent('#ot'),'ぼくが選ぶ');await p.click('#goBtn');
  await p.waitForFunction(()=>__dbg.beastEffects().auras.includes('bat'));
  const impacts=await p.evaluate(()=>{__dbg.pitch();__dbg.ff();return __dbg.beastEffects().impacts;});
  await p.evaluate(()=>__dbg.hit({kind:'play',q:.6,dir:0,ev:90,launch:65,dist:20,res:'ポップフライ',bases:0}));
  await p.waitForFunction(n=>__dbg.beastEffects().impacts===n+1,impacts);
  await p.click('#menuBtn');await p.click('#go3');
  await p.waitForFunction(()=>__dbg.phase==='idle');
  const clean=await p.evaluate(()=>__dbg.beastEffects());assert.equal(clean.cut,false);assert.equal(clean.impact,false);assert.deepEqual(clean.auras,[]);assert.deepEqual(clean.seen,[]);
  assert.deepEqual(errs,[]);console.log('✓ Beast cut-ins at three sizes, persistent aura, duplicate prevention, reduced motion, chapter 8 real awakening, impact and exit cleanup');console.log('[]');
}finally{await b.close();}
