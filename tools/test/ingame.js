const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/game.html');await p.waitForTimeout(1500);
await p.evaluate(()=>__dbg.gopit());await p.waitForTimeout(6800);
await p.screenshot({path:'ig-ready.png'});
await p.waitForFunction(()=>__dbg.phase==='ready',null,{timeout:30000});await p.evaluate(()=>__dbg.pitch());
await p.waitForFunction(()=>__dbg.phase==='fly',null,{timeout:20000});
await p.evaluate(()=>__dbg.hit({kind:'play',q:0.95,dir:-10,ev:175,launch:30,dist:125,res:'ホームラン',bases:4}));
await p.waitForTimeout(1500);await p.screenshot({path:'ig-hr.png'});
console.log(JSON.stringify(errs));await b.close();})()
