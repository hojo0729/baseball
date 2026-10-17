const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const pre=process.argv[2]||'ui';
await p.goto('file://'+__dirname+'/game.html');await p.waitForTimeout(1500);
await p.screenshot({path:pre+'-1menu.png'});
await p.click('#go2');await p.waitForTimeout(300);await p.screenshot({path:pre+'-2cpu.png'});
await p.click('#goBtn');await p.waitForTimeout(300);await p.screenshot({path:pre+'-3team.png'});
await p.click('#goBtn');await p.waitForTimeout(300);await p.click('#go2');await p.waitForTimeout(1200);await p.screenshot({path:pre+'-4start.png'});
await p.waitForFunction(()=>__dbg.phase==='fly',null,{timeout:30000});await p.waitForTimeout(250);await p.screenshot({path:pre+'-5fly.png'});
await p.evaluate(()=>__dbg.hit({kind:'play',q:0.95,dir:-10,ev:175,launch:30,dist:125,res:'ホームラン',bases:4}));
await p.waitForTimeout(1200);await p.screenshot({path:pre+'-6hr.png'});await p.waitForTimeout(1800);await p.screenshot({path:pre+'-7hr2.png'});
await p.waitForTimeout(2500);
await p.evaluate(()=>{__dbg.G.outs=2;});await p.waitForFunction(()=>__dbg.phase==='fly',null,{timeout:30000});
await p.evaluate(()=>__dbg.hit({kind:'play',q:0.6,dir:5,ev:120,launch:35,dist:70,res:'フライアウト',bases:0}));
await p.waitForTimeout(6500);await p.screenshot({path:pre+'-8pit.png'});
console.log(JSON.stringify(errs));await b.close();})()
