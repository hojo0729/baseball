/* Store race evidence and the shared borderline-pitch decision once per play. */
const onlineReview={enabled:false,pitchEnabled:false,pitchRules:false,skipEnabled:false,left:{home:2,away:2},ctx:null,records:new Map(),stamp:0,active:false,replaying:false,stage:'',at:0,asked:false};
const reviewButton=document.createElement('button');reviewButton.id='review-request';reviewButton.hidden=true;$('#stage').append(reviewButton);
const pitchReviewButton=document.createElement('button');pitchReviewButton.id='pitch-review-request';pitchReviewButton.hidden=true;$('#stage').append(pitchReviewButton);
const reviewActions=document.createElement('div');reviewActions.id='review-actions';$('#stage').append(reviewActions);reviewActions.append(reviewButton,pitchReviewButton);
const reviewSkipButton=document.createElement('button');reviewSkipButton.id='review-skip';reviewSkipButton.textContent='チャレンジせず次へ';reviewSkipButton.hidden=true;reviewActions.append(reviewSkipButton);
const reviewPanel=document.createElement('section');reviewPanel.id='review-panel';reviewPanel.hidden=true;reviewPanel.setAttribute('role','dialog');reviewPanel.setAttribute('aria-modal','true');reviewPanel.setAttribute('aria-label','リプレイ検証');
reviewPanel.innerHTML='<small>REPLAY REVIEW</small><h2>リプレイ検証中</h2><p class="review-original"></p><svg viewBox="0 0 640 200" aria-label="走者と送球の到達時刻を再現"><path d="M40 120H600" stroke="#718d83" stroke-width="3"/><path d="M320 40V150" stroke="#ffe4a0" stroke-dasharray="5 7"/><rect x="302" y="102" width="36" height="36" fill="#fff5cf" transform="rotate(45 320 120)"/><circle class="review-runner" cx="40" cy="95" r="15" fill="#6fe3d4"/><circle class="review-ball" cx="600" cy="145" r="10" fill="#ffb15c"/><text x="40" y="45" fill="#6fe3d4" font-size="21">走者</text><text x="460" y="45" fill="#ffb15c" font-size="21">送球・タッチ</text><text class="review-clock" x="320" y="190" text-anchor="middle" fill="#fff5cf" font-size="23"></text></svg><p class="review-detail"></p><p class="review-status">記録した到達時刻を照合しています</p><button class="go2">対戦をやめる</button>';
$('#stage').append(reviewPanel);reviewPanel.querySelector('button').onclick=()=>showMenu();
const reviewCanvas=document.createElement('canvas');reviewCanvas.className='review-field';reviewCanvas.setAttribute('aria-label','ベース際の走者と送球をスロー再現');reviewPanel.insertBefore(reviewCanvas,reviewPanel.querySelector('svg'));
function restoreReviewField(){
  if(!onlineReview.renderState)return;
  const state=onlineReview.renderState;state.visible.forEach(([o,v])=>{o.visible=v;});onlineReview.renderState=null;resize();
}
function renderPitchReview(){
  const call=onlineReview.ctx.call,w=Math.max(1,reviewCanvas.clientWidth),h=Math.max(1,reviewCanvas.clientHeight),scale=Math.min(1.5,devicePixelRatio||1);
  if(reviewCanvas.width!==Math.round(w*scale)||reviewCanvas.height!==Math.round(h*scale)){reviewCanvas.width=Math.round(w*scale);reviewCanvas.height=Math.round(h*scale);}
  const g=reviewCanvas.getContext('2d');g.setTransform(scale,0,0,scale,0,0);g.fillStyle='#0b2525';g.fillRect(0,0,w,h);
  const unit=Math.min(w/6,h/3.5),cx=w/2,cy=h/2;
  g.fillStyle='#254a3a';g.fillRect(cx-unit,cy-unit,unit*2,unit*2);g.strokeStyle='#ffe4a0';g.lineWidth=2;g.strokeRect(cx-unit,cy-unit,unit*2,unit*2);
  for(const v of [-1/3,1/3]){g.beginPath();g.moveTo(cx+v*unit,cy-unit);g.lineTo(cx+v*unit,cy+unit);g.moveTo(cx-unit,cy+v*unit);g.lineTo(cx+unit,cy+v*unit);g.stroke();}
  // Same normalized coordinates and zone edges used by resolveCore; arrows mark very wide pitches.
  const px=cx+clamp(call.tx,-2.5,2.5)*unit,py=cy+clamp(call.ty,-1.5,1.5)*unit;
  g.fillStyle='#fff';g.beginPath();g.arc(px,py,6,0,Math.PI*2);g.fill();g.strokeStyle='#ff8958';g.lineWidth=3;g.stroke();
  g.font='12px sans-serif';g.fillStyle='#fff5cf';g.textAlign='left';g.fillText('ホーム通過位置',8,16);
  if(Math.abs(call.tx)>2.5||Math.abs(call.ty)>1.5)g.fillText('ゾーン外 →',8,h-8);
}
function renderReviewField(){
  const x=onlineReview.ctx;if(!x||!x.call)return;
  if(x.call.kind==='pitch'){renderPitchReview();return;}
  const now=now_();if(onlineReview.renderState&&now-onlineReview.renderState.last<(degraded?1/15:1/30))return;
  if(!onlineReview.renderState){
    const objects=[pitcherF.g,batterF.g,...fielderF.map(f=>f.g),...runnerF.map(f=>f.g),batG,ballMesh,ballGlow,throwMesh,htLine,landRing,batAura,pitAura,...trail];
    if(beastFx.groups)objects.push(...beastFx.groups.map(g=>g.root));
    onlineReview.renderState={visible:objects.map(o=>[o,o.visible]),aspect:camera.aspect,last:0};
  }
  onlineReview.renderState.last=now;
  onlineReview.renderState.visible.forEach(([o])=>{o.visible=false;});
  const call=x.call,t=onlineReview.time||0,target=BASE_AT[call.base],source=call.kind==='first'?V(-.8,0,0):V(...[RUNPOS[call.base-2][0],0,RUNPOS[call.base-2][1]]);
  const bat=x.half%2?'away':'home',fld=bat==='home'?'away':'home',runner=runnerF[0],defender=fielderF[0];
  if(runner.team!==bat)setTeam(runner,bat);if(defender.team!==fld)setTeam(defender,fld);runner.g.visible=defender.g.visible=true;
  const u=clamp(t/call.run,0,1),pos=V().lerpVectors(source,V(target.x,0,target.z),u),yaw=Math.atan2(target.x-source.x,target.z-source.z);
  let J=squashJ(fielderJ(pos.x,pos.z,yaw,t*12,u<1?1:0,1,0),0);
  if(call.kind!=='first'&&u>.88)J=superPose(J,'dive',.85+(u-.88)*2,pos.x,pos.z,yaw);
  poseFig(runner,J,yaw,yaw);
  const from=call.kind==='steal'?V(0,1.2,.8):x.racePlay?V(x.racePlay.L.x,1.2,x.racePlay.L.z):source.clone().setY(1.2);
  const facing=Math.atan2(from.x-target.x,from.z-target.z);
  poseFig(defender,squashJ(fielderJ(target.x,target.z,facing,t*8,0,1,.75),0),facing,facing);
  const duration=Math.max(.2,from.distanceTo(target)/30),p=clamp((t-(call.tag-duration))/duration,0,1);
  throwMesh.visible=t>=call.tag-duration;throwMesh.position.lerpVectors(from,target,p);throwMesh.position.y+=1.5*p*(1-p);
  const dx=source.x-target.x,dz=source.z-target.z,d=Math.hypot(dx,dz)||1;
  camera.position.set(target.x+dz/d*6.2+dx/d,target.y+1.25,target.z-dx/d*6.2+dz/d);camera.lookAt(target.x,.65,target.z);camera.fov=48;camera.near=.1;
  const w=Math.max(1,reviewCanvas.clientWidth),h=Math.max(1,reviewCanvas.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  const scale=Math.min(1.5,window.devicePixelRatio||1),cw=Math.round(w*scale),ch=Math.round(h*scale);
  if(reviewCanvas.width!==cw||reviewCanvas.height!==ch){reviewCanvas.width=cw;reviewCanvas.height=ch;}
  reviewCanvas.getContext('2d').drawImage(renderer.domElement,0,0,cw,ch);
}
function resetOnlineReview(disconnect=false){
  restoreReviewField();
  if(disconnect){onlineReview.enabled=false;onlineReview.pitchEnabled=false;onlineReview.pitchRules=false;onlineReview.skipEnabled=false;}
  onlineReview.left={home:2,away:2};onlineReview.ctx=null;onlineReview.records.clear();onlineReview.stamp=0;onlineReview.active=false;onlineReview.asked=false;onlineReview.stage='';
  reviewButton.hidden=pitchReviewButton.hidden=reviewSkipButton.hidden=reviewPanel.hidden=true;
}
function closeReviewOffer(){if(onlineReview.active)return;if(onlineReview.ctx)onlineReview.ctx.offerClosed=true;onlineReview.asked=false;reviewButton.hidden=pitchReviewButton.hidden=reviewSkipButton.hidden=true;}
function runOnlineResult(c,C,seed){
  closeReviewOffer();
  const ctx={pn:onl.pn,stamp:onlineReview.stamp,round:onl.round,seed,c:structuredClone(c),C:C.clone(),G:structuredClone(G),score:{...onl.score},steal:steal?structuredClone(steal):null,curBunt,ball,half:onl.half,mode,call:null,closed:false,offerClosed:false};
  onlineReview.ctx=ctx;
  onlineReview.records.set(ctx.stamp+':'+ctx.pn,ctx);while(onlineReview.records.size>3)onlineReview.records.delete(onlineReview.records.keys().next().value);
  withSeed(seed,()=>resolveCore(c,C));
  ctx.racePlay=play;
  ctx.after=structuredClone(G);ctx.afterScore={...onl.score};
  ctx.naturalNextAt=nextAt;ctx.declined={home:false,away:false};
  if([ctx.call,ctx.pitchCall].some(call=>call&&onlineReview.left[call.eligible]>0)){ctx.openAt=pendBanner?pendBanner.at:now_();ctx.until=Math.max(nextAt,ctx.openAt+5);nextAt=ctx.until;}
  else ctx.call=null;
}
function recordOnlineRace(kind,run,tag,initial,base){
  if(!online||!onlineReview.enabled)return initial;
  const ctx=onlineReview.ctx;if(!ctx)return initial;
  if(onlineReview.replaying)return ctx.call&&ctx.call.kind===kind?ctx.call.truth:initial;
  const truth=run<=tag;
  if(Math.abs(run-tag)<=.12){
    const bat=ctx.half%2?'away':'home',fld=bat==='home'?'away':'home';
    ctx.call={kind,run,tag,initial,truth,base,eligible:initial?fld:bat};
  }
  return initial;
}
function recordOnlinePitch(initial){
  const ctx=onlineReview.ctx;if(!online||!onlineReview.pitchEnabled||!ctx||onlineReview.replaying)return;
  const [tx,ty]=ball.T,bat=ctx.half%2?'away':'home';
  const decision=onlineReview.pitchRules?pitchReviewDecision(ctx.seed,tx,ty,initial):{close:false,truth:initial};
  ctx.pitchCall={kind:'pitch',tx,ty,initial,...decision,eligible:initial?bat:(bat==='home'?'away':'home')};
}
function pitchReviewDecision(seed,tx,ty,initial){
  const close=Math.abs(Math.max(Math.abs(tx),Math.abs(ty))-1)<=.1+1e-9;
  const flip=close&&withSeed((seed^0x5eeda11)>>>0,()=>Math.random()<.5);
  return {close,truth:flip?!initial:initial};
}
function judgeOnlineRace(kind,run,tag,fallback,base){
  if(!online||!onlineReview.enabled)return fallback;
  // The normal call has tenth-second precision; review uses the saved full precision.
  const initial=Math.abs(run-tag)<=.12?Math.round((run+1e-9)*10)<=Math.round((tag+1e-9)*10):run<=tag;
  return recordOnlineRace(kind,run,tag,initial,base);
}
function finishFirstBaseReview(c){
  const ctx=onlineReview.ctx;
  if(!online||!onlineReview.enabled||!ctx||onlineReview.replaying||ctx.call||!play||play.err||c.kind!=='play'||c.bunt||!play.grounder||c.bases>1||ctx.G.bases.some(Boolean))return;
  const runner=curBatterFromReview(ctx).sp;
  const run=27.44/(6.8+runner*.32),arm=ROSTER[ctx.half%2?'home':'away'].arm||3;
  const tag=play.T+.25+V(play.L.x,1,play.L.z).distanceTo(BASE_AT[1])/(28+arm*.65)+.12;
  recordOnlineRace('first',run,tag,c.bases===1,1);
}
function curBatterFromReview(ctx){const current=G;try{G=ctx.G;return curBatter();}finally{G=current;}}
function requestedReviewCall(x,kind){return x&&(kind==='pitch'?x.pitchCall:x.call);}
function canRequestReview(kind){const x=onlineReview.ctx,call=requestedReviewCall(x,kind);return !!(online&&x&&call&&!x.closed&&!x.offerClosed&&!x.declined[onl.side]&&!onlineReview.active&&!onlineReview.asked&&phase==='result'&&onl.pn===x.pn&&now_()>=x.openAt&&now_()<x.until&&call.eligible===onl.side&&onlineReview.left[onl.side]>0);}
function maySkipReview(x,side){return x&&[x.call,x.pitchCall].some(call=>call&&call.eligible===side&&onlineReview.left[side]>0)&&!x.declined[side];}
reviewSkipButton.onclick=()=>{
  if(!onlineReview.skipEnabled||(!canRequestReview()&&!canRequestReview('pitch')))return;
  const x=onlineReview.ctx,m={pn:x.pn,callStamp:x.stamp,side:onl.side};onlineReview.asked=true;
  if(onl.side==='home')acceptReviewSkip(m);else send('review-skip-request',m);
};
function acceptReviewSkip(m){
  const x=onlineReview.ctx;
  if(onl.side!=='home'||!onlineReview.skipEnabled||!x||x.closed||x.offerClosed||onlineReview.active||phase!=='result'||now_()>x.until||m.pn!==x.pn||m.callStamp!==x.stamp||!['home','away'].includes(m.side)||!maySkipReview(x,m.side)){send('review-denied',{pn:m.pn,callStamp:m.callStamp});onlineReview.asked=false;return;}
  send('review-skip',{pn:m.pn,callStamp:m.callStamp,side:m.side});applyReviewSkip(m);
}
function applyReviewSkip(m){
  const x=onlineReview.ctx;if(!onlineReview.skipEnabled||!x||x.pn!==m.pn||onl.pn!==x.pn||x.stamp!==m.callStamp||x.closed||x.offerClosed||phase!=='result'||onlineReview.active||!maySkipReview(x,m.side))return;
  x.declined[m.side]=true;onlineReview.asked=false;
  if(!['home','away'].some(side=>maySkipReview(x,side))){x.offerClosed=true;x.until=now_();nextAt=Math.max(now_(),x.naturalNextAt);}
}
function requestOnlineReview(kind){
  if(!canRequestReview(kind))return;
  const x=onlineReview.ctx;onlineReview.asked=true;
  const m={pn:x.pn,callStamp:x.stamp,side:onl.side,kind};
  if(onl.side==='home')acceptOnlineReview(m);else send('review-request',m);
}
reviewButton.onclick=()=>requestOnlineReview();pitchReviewButton.onclick=()=>requestOnlineReview('pitch');
function acceptOnlineReview(m){
  const x=onlineReview.ctx,call=requestedReviewCall(x,m.kind);
  if(onl.side!=='home'||!x||!call||x.closed||x.offerClosed||x.declined[m.side]||onlineReview.active||phase!=='result'||now_()>x.until||m.pn!==x.pn||m.callStamp!==x.stamp||onl.pn!==x.pn||m.side!==call.eligible||onlineReview.left[m.side]<=0){send('review-denied',{pn:m.pn,callStamp:m.callStamp});onlineReview.asked=false;return;}
  send('review-open',{pn:x.pn,callStamp:x.stamp,side:m.side,kind:m.kind});openOnlineReview(m);
}
function openOnlineReview(m){
  const x=onlineReview.records.get(m.callStamp+':'+m.pn),call=requestedReviewCall(x,m.kind);if(!x||!call||x.closed||x.declined[m.side]||m.callStamp!==onlineReview.stamp||onlineReview.active||m.side!==call.eligible)return;
  x.call=call;
  onlineReview.ctx=x;onlineReview.stamp=x.stamp+1;onl.pn=x.pn;
  pending=null;onl.queued=null;onl.waitRes=null;onl.queuedPick=null;onl.queuedSub=[];
  G=structuredClone(x.after);onl.score={...x.afterScore};mode=x.mode;onl.half=x.half;ball=x.ball;
  onlineReview.active=true;onlineReview.asked=false;onlineReview.stage='replay';onlineReview.at=now_();x.challenger=m.side;
  phase='review';nextAt=Infinity;reviewButton.hidden=pitchReviewButton.hidden=reviewSkipButton.hidden=true;reviewPanel.hidden=false;$('#overlay').hidden=true;
  reviewPanel.querySelector('svg').style.display=call.kind==='pitch'?'none':'';
  reviewCanvas.setAttribute('aria-label',call.kind==='pitch'?'ストライクゾーンと保存した投球位置':'ベース際の走者と送球をスロー再現');
  reviewPanel.tabIndex=-1;reviewPanel.focus({preventScroll:true});
  reviewPanel.querySelector('h2').textContent='リプレイ検証中';
  reviewPanel.querySelector('.review-original').textContent=teamName(m.side)+'のチャレンジ　'+(call.kind==='pitch'?'投球・当初の判定：'+(call.initial?'ストライク':'ボール'):(call.base===4?'本塁':call.base+'塁')+'・当初の判定：'+(call.initial?'セーフ':'アウト'));
  reviewPanel.querySelector('.review-detail').textContent='';reviewPanel.querySelector('.review-status').textContent=call.kind==='pitch'?'ホーム通過位置を確認しています':'記録した到達時刻を照合しています';
}
function applyReviewVerdict(){
  const x=onlineReview.ctx;if(!onlineReview.active||onlineReview.stage!=='replay'||!x)return;
  const changed=x.call.initial!==x.call.truth;
  if(!changed)onlineReview.left[x.challenger]--;
  mode=x.mode;onl.half=x.half;ball=x.ball;curBunt=x.curBunt;
  if(changed){
    G=structuredClone(x.G);onl.score={...x.score};steal=x.steal?structuredClone(x.steal):null;
    const audio=ac,voice=cmt.mode;onlineReview.replaying=true;ac=null;cmt.mode=0;
    try{withSeed(x.seed,()=>resolveCore(structuredClone(x.c),x.C.clone()));}
    finally{onlineReview.replaying=false;ac=audio;cmt.mode=voice;}
  }else{G=structuredClone(x.after);onl.score={...x.afterScore};}
  x.closed=true;phase='review';nextAt=Infinity;pendBanner=null;hideBanner();hud();
  onlineReview.stage='verdict';onlineReview.at=now_();
  reviewPanel.querySelector('h2').textContent=changed?'判定変更！':'判定通り';
  reviewPanel.querySelector('.review-detail').textContent=x.call.kind==='pitch'?(x.call.truth?'ストライク':'ボール')+(x.call.close?' — 際どいコースの再判定':' — 保存したホーム通過位置で確認'):(x.call.truth?'セーフ':'アウト')+' — '+(Math.abs(x.call.tag-x.call.run)*1000).toFixed(0)+'ms差\n走者 '+x.call.run.toFixed(3)+'秒 ／ 送球・タッチ '+x.call.tag.toFixed(3)+'秒';
  reviewPanel.querySelector('.review-status').textContent=changed?'チャレンジ成功。回数は減りません。':'チャレンジ失敗。残り'+onlineReview.left[x.challenger]+'回。';
}
function resumeOnlineReview(){
  if(!onlineReview.active||onlineReview.stage!=='verdict')return;
  restoreReviewField();
  onlineReview.active=false;onlineReview.stage='';reviewPanel.hidden=true;reviewButton.hidden=true;phase='result';onlineAfterResult();
}
function handleReviewMessage(m){
  if(!online||!onlineReview.enabled)return;
  if(m.type==='review-request'&&onl.side==='home'&&m.side==='away')acceptOnlineReview(m);
  else if(m.type==='review-skip-request'&&onl.side==='home'&&m.side==='away')acceptReviewSkip(m);
  else if(m.type==='review-skip'&&onl.side==='away')applyReviewSkip(m);
  else if(m.type==='review-open'&&onl.side==='away')openOnlineReview(m);
  else if(m.type==='review-verdict'&&onl.side==='away'&&onlineReview.ctx&&m.pn===onlineReview.ctx.pn&&m.callStamp===onlineReview.ctx.stamp)applyReviewVerdict();
  else if(m.type==='review-resume'&&onl.side==='away'&&onlineReview.ctx&&m.pn===onlineReview.ctx.pn&&m.callStamp===onlineReview.ctx.stamp)resumeOnlineReview();
  else if(m.type==='review-denied'&&onl.side==='away'&&onlineReview.ctx&&m.pn===onlineReview.ctx.pn&&m.callStamp===onlineReview.ctx.stamp)onlineReview.asked=false;
}
function updateOnlineReview(now){
  if(!online)return;
  const x=onlineReview.ctx;
  reviewButton.hidden=!canRequestReview();
  pitchReviewButton.hidden=!canRequestReview('pitch');
  reviewSkipButton.hidden=!onlineReview.skipEnabled||(reviewButton.hidden&&pitchReviewButton.hidden);
  if(!pitchReviewButton.hidden)pitchReviewButton.textContent='投球チャレンジ 残り'+onlineReview.left[onl.side]+'回　'+Math.max(1,Math.ceil(x.until-now))+'秒';
  if(!reviewButton.hidden)reviewButton.textContent='チャレンジ 残り'+onlineReview.left[onl.side]+'回　'+Math.max(1,Math.ceil(x.until-now))+'秒';
  if(!onlineReview.active||!x)return;
  const age=now-onlineReview.at,end=Math.max(x.call.run||0,x.call.tag||0),start=Math.max(0,Math.min(x.call.run||0,x.call.tag||0)-.22),t=onlineReview.stage==='verdict'?end:start+(end-start)*clamp((age-.15)/2.7,0,1);
  onlineReview.time=t;
  if(x.call.kind!=='pitch'){
    const rp=clamp(t/x.call.run,0,1),bp=clamp(t/x.call.tag,0,1);
    reviewPanel.querySelector('.review-runner').setAttribute('cx',40+280*rp);reviewPanel.querySelector('.review-ball').setAttribute('cx',600-280*bp);
    reviewPanel.querySelector('.review-clock').textContent=t.toFixed(3)+'秒';
  }
  if(onl.side==='home'&&onlineReview.stage==='replay'&&age>=3.2){send('review-verdict',{pn:x.pn,callStamp:x.stamp});applyReviewVerdict();}
  else if(onl.side==='home'&&onlineReview.stage==='verdict'&&age>=2.8){send('review-resume',{pn:x.pn,callStamp:x.stamp});resumeOnlineReview();}
}
