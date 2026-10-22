import assert from 'node:assert/strict';
import {openGame} from './lib.mjs';
const {b,p,errs}=await openGame();
try {
  await p.waitForFunction(()=>window.__dbg);
  await p.evaluate(()=>{__dbg.optOff();__dbg.noDraw();});
  await p.click('#go2');await p.click('#goBtn');await p.click('#goBtn');await p.click('#go2');
  const results=await p.evaluate(()=>{
    const d=__dbg,random=Math.random;
    function seed(){let s=32791;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return (s+.5)/4294967296;};}
    function sample(x,y){
      d.throwP('str',130,x,y);d.ff();seed();
      let hits=0,hr=0,miss=0,ev=0;
      for(let i=0;i<12000;i++){
        const dt=(Math.random()-.5)*.18,aim=Math.random()*.55,vy=(Math.random()-.5)*.9;
        const c=d.contact(dt,aim,vy,130,false,false);
        if(c.bases>0)hits++;if(c.bases===4)hr++;if(c.kind==='miss')miss++;ev+=c.ev||0;
      }
      const perfect=d.contact(0,0,0,130,false,false);
      seed();const cpu=d.seq(1,[['str',130,x,y]],12000);
      return {hits,hr,miss,ev,perfectQ:perfect.q,cpu};
    }
    try{return {center:sample(0,0),edge:sample(1,0),near:sample(1.2,0),wide:sample(1.5,0),far:sample(2,0),left:sample(-1.5,0),high:sample(0,-1.5),low:sample(0,1.5),corner:sample(1.5,1.5)};}
    finally{Math.random=random;}
  });
  const {center,edge,near,wide,far,left,high,low,corner}=results;
  console.log(JSON.stringify(results));
  for(const key of ['hits','hr','miss','ev','perfectQ'])assert.equal(center[key],edge[key],`In-zone ${key} unchanged`);
  assert.ok(near.hits<center.hits*.9);assert.ok(wide.hits<near.hits*.65);assert.ok(far.hits<=wide.hits*.5);
  assert.ok(near.hits>0,'A close ball remains hittable');
  assert.ok(center.perfectQ>near.perfectQ&&near.perfectQ>wide.perfectQ);
  for(const side of [left,high,low])for(const key of ['hits','hr','miss','ev','perfectQ'])assert.equal(side[key],wide[key]);
  assert.ok(corner.hits<=wide.hits&&corner.ev<wide.ev);assert.ok(wide.hr<=center.hr);
  assert.ok(wide.cpu.hit<center.cpu.hit,'CPU shares the reach penalty');
  assert.deepEqual(errs,[]);console.log('[]');
} finally {await b.close();}
