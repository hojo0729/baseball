const { openGame } = require('./lib.mjs');
(async()=>{const { b, p, errs } = await openGame({width:700,height:900});
await p.waitForTimeout(1500);
await p.evaluate(()=>__dbg.gopit());await p.waitForTimeout(6800);
const hp=await p.evaluate(()=>__dbg.headPos());console.log('head',hp);
const [hx,hy,hz]=hp;
await p.evaluate(([x,y,z])=>{window.__hold={p:[x+0.25,y+0.05,z+3.2],l:[x,y-0.02,z],f:16}},[hx,hy,hz]);
const r=await p.evaluate(()=>{const e=document.querySelector('#stage').getBoundingClientRect();return [e.x,e.y,e.width,e.height]});const CL={x:r[0]+r[2]/2-140,y:r[1]+r[3]/2-150,width:280,height:280};console.log(r);
const teams=['home','away','neko','usagi','kuma'], exs=['normal','focus','joy','shout','wow','sad','smile','blink'];
const ims=[];
for(const t of teams){await p.evaluate(t=>__dbg.face(t,'normal'),t);await p.waitForTimeout(250);await p.screenshot({path:'f2-'+t+'.png',clip:CL});}
for(const e of exs){await p.evaluate(e=>__dbg.face('home',e),e);await p.waitForTimeout(250);await p.screenshot({path:'f2-ex-'+e+'.png',clip:CL});}
await p.evaluate(e=>__dbg.face('away','joy'),0);await p.waitForTimeout(250);await p.screenshot({path:'f2-panda-joy.png',clip:CL});
console.log(JSON.stringify(errs));await b.close();})()
