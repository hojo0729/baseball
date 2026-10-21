import assert from 'node:assert/strict';
import {openGame} from './lib.mjs';
const {b,p,errs}=await openGame();
try {
  await p.waitForFunction(()=>window.__dbg);
  await p.evaluate(()=>{__dbg.optOff();__dbg.noDraw();});
  await p.click('#go2'); await p.click('#goBtn'); await p.click('#goBtn'); await p.click('#go2');
  const drive={kind:'play',q:.9,dir:20,ev:150,launch:25,dist:95,res:'ツーベース',bases:2};
  async function hit(c,slot=0,roll=.15,bases=[0,0,0]) {
    return p.evaluate(({c,slot,roll,bases})=>{
      const d=__dbg,g=d.G;g.teams.home.order=slot;g.bases=bases;g.runs=0;g.hits=0;g.hr=0;g.outs=0;g.over=false;
      d.ff();d.hit(c,()=>roll);d.ff();
      return {bases:g.bases,runs:g.runs,hits:g.hits,hr:g.hr,label:document.querySelector('#bt').textContent};
    },{c,slot,roll,bases});
  }
  // Same drive and luck: the leadoff speedster stretches it; the slow cleanup hitter stops at second.
  const fast=await hit(drive,0,.15,[2,4,3]);
  assert.deepEqual(fast.bases,[0,0,5]);assert.equal(fast.runs,3);assert.equal(fast.hits,1);assert.equal(fast.hr,0);assert.match(fast.label,/スリーベース/);
  const slow=await hit(drive,3);assert.deepEqual(slow.bases,[0,2,0]);
  await p.evaluate(()=>{__dbg.m().opp='usagi';});
  assert.match((await hit(drive,0,.22)).label,/スリーベース/,'A weaker relay allows the extra base');
  await p.evaluate(()=>{__dbg.m().opp='kuma';});
  assert.deepEqual((await hit(drive,0,.22)).bases,[0,5,0],'A stronger relay holds the same runner to second');
  await p.evaluate(()=>{__dbg.m().opp='away';});
  for(const c of [{...drive,dir:0},{...drive,dir:42},{...drive,dist:60},{...drive,launch:45},{...drive,bases:1,res:'ヒット'},{...drive,bases:4,res:'ホームラン'}]) {
    const r=await hit(c,0,0);assert.doesNotMatch(r.label,/スリーベース/);
  }
  const left=await hit({...drive,dir:-20},0,0);assert.match(left.label,/スリーベース/);
  const unlucky=await hit(drive,0,.99);assert.deepEqual(unlucky.bases,[0,5,0]);
  assert.deepEqual(errs,[]);console.log('✓ CPU triples: gap/depth, running speed, runners score, third-base batter, no HR, exclusions and both directions');
  console.log('[]');
} finally {await b.close();}
