/* Beast presentation is local-only: no game clocks or shared random numbers. */
const beastMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const beastFx = { seen: new Set(), at: -10, impact: false, impactAt: -10, count: 0, impacts: 0, groups: null, audio: null };
const beastCut = document.createElement('div');
beastCut.id = 'beast-cut'; beastCut.hidden = true; beastCut.setAttribute('aria-hidden', 'true');
beastCut.innerHTML = '<div class="beast-scar"></div><div class="beast-eyes"><i></i><i></i></div><div class="beast-call"><small>BEAST AWAKENING</small><strong>野性、解放。</strong><span></span></div>';
const beastImpact = document.createElement('div');
beastImpact.id = 'beast-impact'; beastImpact.hidden = true; beastImpact.setAttribute('aria-hidden', 'true');
$('#stage').append(beastCut, beastImpact);
function stopBeastSound() {
  if (!beastFx.audio) return;
  const {context,gain,nodes}=beastFx.audio; beastFx.audio=null;
  try { const t=context.currentTime; gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,.015);nodes.forEach(n=>{try{n.stop(t+.06);}catch(e){}}); } catch(e) {}
}
function beastRoar() {
  stopBeastSound();
  if (!ac || storySilent || !bgmWanted()) return;
  try {
    const context=ac,t=context.currentTime,gain=context.createGain(),filter=context.createBiquadFilter();
    filter.type='lowpass';filter.frequency.setValueAtTime(1300,t);filter.frequency.exponentialRampToValueAtTime(180,t+1.05);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.065,t+.045);gain.gain.exponentialRampToValueAtTime(.0001,t+1.1);
    filter.connect(gain);gain.connect(context.destination);
    const nodes=[57,86,114].map((frequency,i)=>{
      const n=context.createOscillator();n.type=i===1?'triangle':'sawtooth';
      n.frequency.setValueAtTime(frequency*1.9,t);n.frequency.exponentialRampToValueAtTime(frequency,t+.12);n.frequency.exponentialRampToValueAtTime(frequency*.55,t+1.1);
      n.connect(filter);n.start(t);n.stop(t+1.12);return n;
    });
    nodes[2].onended=()=>{gain.disconnect();filter.disconnect();nodes.forEach(n=>n.disconnect());};
    beastFx.audio={context,gain,nodes};
  } catch(e) { /* The visual remains available without Web Audio. */ }
}
function resetBeastEffects() {
  beastFx.seen.clear();beastFx.at=beastFx.impactAt=-10;beastFx.impact=false;
  beastCut.hidden=beastImpact.hidden=true;beastCut.className='';
  $('#stage').classList.remove('beast-burning');
  if(beastFx.groups)beastFx.groups.forEach(g=>{g.root.visible=false;});
  stopBeastSound();
}
function makeBeastAuras() {
  const ringGeo=new THREE.TorusGeometry(.7,.026,4,36),sparkGeo=new THREE.ConeGeometry(.035,.22,3);
  return ['pit','bat'].map(role=>{
    const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:'#ff8138',transparent:true,opacity:.75,depthWrite:false});
    const ring=new THREE.Mesh(ringGeo,material),wave=new THREE.Mesh(ringGeo,material.clone());
    ring.rotation.x=wave.rotation.x=-Math.PI/2;root.add(ring,wave);
    const sparks=new THREE.InstancedMesh(sparkGeo,material.clone(),12);sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);sparks.frustumCulled=false;root.add(sparks);
    root.visible=false;scene.add(root);return {role,root,ring,wave,sparks};
  });
}
const beastSparkPose=new THREE.Object3D();
function queueBeastImpact(c) {
  if(c.kind==='play'&&!c.bunt&&beastForRole('bat'))beastFx.impact=true;
}
function updateBeastEffects(now,pj,bj) {
  if(!G||phase==='idle'){if(!beastCut.hidden||$('#stage').classList.contains('beast-burning'))resetBeastEffects();return;}
  const sides=online?['home','away'].filter(s=>onl.beast[s]):beastActive()?['story']:[];
  const fresh=sides.filter(s=>!beastFx.seen.has(s));
  fresh.forEach(s=>beastFx.seen.add(s));
  if(fresh.length){
    beastFx.at=now;beastFx.count++;
    beastCut.querySelector('span').textContent=online?fresh.map(teamName).join(' × '):'コタロウ — ぼくが選ぶ力';
    beastCut.hidden=false;beastCut.className='';void beastCut.offsetWidth;beastCut.className='release';beastRoar();
  }
  if(now-beastFx.at>1.35)beastCut.hidden=true;
  if(beastFx.impact){beastFx.impact=false;beastFx.impactAt=now;beastFx.impacts++;beastImpact.hidden=false;beastImpact.className='';void beastImpact.offsetWidth;beastImpact.className='strike';}
  if(now-beastFx.impactAt>.38)beastImpact.hidden=true;
  const roles=['pit','bat'].filter(beastForRole);
  $('#stage').classList.toggle('beast-burning',roles.length>0);
  if(roles.length&&!beastFx.groups)beastFx.groups=makeBeastAuras();
  if(!beastFx.groups)return;
  beastFx.groups.forEach(g=>{
    const active=roles.includes(g.role);g.root.visible=active;if(!active)return;
    const pos=g.role==='pit'?pj.pelvis:bj.J.pelvis;
    g.root.position.set(pos.x,g.role==='pit'?MOUND_Y+.025:.025,pos.z);
    const t=beastMotion.matches?0:now;
    g.ring.scale.setScalar(1+.12*Math.sin(t*5));
    const age=now-beastFx.at,shock=age>=0&&age<.65&&!beastMotion.matches;
    g.wave.visible=shock;g.wave.scale.setScalar(1+age*5);g.wave.material.opacity=shock?.7*(1-age/.65):0;
    for(let i=0;i<12;i++){
      const u=(t*.6+i/12)%1,angle=i*2.399+t*.65,r=.46+u*.58;
      beastSparkPose.position.set(Math.cos(angle)*r,.08+u*1.8,Math.sin(angle)*r);
      beastSparkPose.rotation.set(0,angle,.2*Math.sin(i+t));beastSparkPose.scale.setScalar(.65+.6*(1-u));beastSparkPose.updateMatrix();g.sparks.setMatrixAt(i,beastSparkPose.matrix);
    }
    g.sparks.instanceMatrix.needsUpdate=true;
  });
}
