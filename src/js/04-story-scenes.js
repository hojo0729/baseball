/* Storybook illustrations and lightweight final scenes; no new rendering dependency. */
const storyArt = document.createElement('div'); storyArt.id = 'story-art'; storyArt.hidden = true;
$('#overlay').prepend(storyArt);
const STORY_ARTS = {
  everyday: ['story/everyday.webp', '夕暮れのベンチで、おにぎりを分け合う仲間たち'],
  rescue: ['story/rescue.webp', 'コタロウが転んだミケを助け、ウサミが駆け寄る'],
  lab: ['story/lab.webp', '研究所の端末に、自分たちと同じ姿を見つける三人'],
  teamwork: ['story/teamwork.webp', '一塁のウサミと打席のコタロウが、励まし合ってヒグマに挑む'],
  archive: ['story/archive.webp', '古い記録を囲み、不安なコタロウの手をミケが支える'],
  ai: ['story/ai.webp', '仲間を守ってきた記憶を映す、静かなAIの光'],
  beast: ['story/beast.webp', '獣化したコタロウの手に、ミケがそっと触れる'],
  ship: ['story/ship.webp', '宇宙船の下で、野球星人が公式球を差し出す'],
  final: ['story/final.webp', '決戦を前に、六人の仲間が手を重ねて励まし合う'],
  epilogue: ['story/epilogue.webp', '朝の球場で、仲間全員と約束のおにぎりを囲む']
};
function storyVisual(kind) {
  const el = $('#overlay');
  el.classList.toggle('story-scene', !!kind); el.dataset.scene = kind || '';
  storyArt.hidden = !kind;
  if (!kind) { storyArt.replaceChildren(); return; }
  const art = STORY_ARTS[({ field: 'everyday', analysis: 'lab' })[kind] || kind];
  storyArt.classList.toggle('painted', !!art);
  if (art) {
    if (storyArt.dataset.art !== art[0] || !storyArt.querySelector('img')) {
      const im = new Image(); im.src = art[0]; im.alt = art[1]; im.decoding = 'async';
      storyArt.replaceChildren(im); storyArt.dataset.art = art[0];
    }
    return;
  }
  const screen = '<rect x="58" y="20" width="204" height="128" rx="12" fill="#172d37" stroke="#75d9cf" stroke-width="2"/><path d="M78 54h78m-78 18h148M78 90h118m-118 18h136" stroke="#75d9cf" stroke-width="3" opacity=".6"/><circle cx="237" cy="126" r="4" fill="#f4cf65"/>';
  const field = '<path d="M0 145Q160 70 320 145v35H0" fill="#4a8063"/><path d="M95 165l65-56 65 56" fill="#c29b72"/><path d="M153 164h14l-7 7z" fill="#fff5e7"/>';
  const balloon = '<g class="scene-balloon"><ellipse cx="223" cy="43" rx="17" ry="22" fill="#e98e91"/><path d="M223 65q-14 22 0 46" fill="none" stroke="#ebdec8"/></g>';
  const person = '<g class="scene-person"><circle cx="157" cy="88" r="16" fill="#303e48"/><path d="M143 107q14-8 28 0l8 34h-42z" fill="#303e48"/><path d="M147 138l-8 34m27-34 10 34m-35-57-19 19m51-18 22-17" stroke="#303e48" stroke-width="9" stroke-linecap="round"/></g>';
  const animal = '<g class="scene-animal"><ellipse cx="155" cy="123" rx="18" ry="22" fill="#fff5e7"/><circle cx="155" cy="88" r="27" fill="#ed963f"/><path d="M132 72l-2-24 20 17m10 0 19-17-1 26" fill="#ed963f"/><ellipse cx="155" cy="100" rx="19" ry="10" fill="#fff5e7"/><circle cx="145" cy="86" r="5" fill="#29252a"/><circle cx="165" cy="86" r="5" fill="#29252a"/><circle cx="144" cy="84" r="2" fill="white"/><circle cx="164" cy="84" r="2" fill="white"/><path d="M141 114h28" stroke="#e55d58" stroke-width="6"/><path d="M143 142l-8 16m32-16 8 16" stroke="#ed963f" stroke-width="10" stroke-linecap="round"/></g>';
  let drawing = field + animal;
  if (['lab', 'archive', 'analysis', 'ai'].includes(kind)) drawing = '<path d="M15 180V8h290v172" fill="#11212c"/>' + screen
    + (kind === 'ai' ? '<circle cx="160" cy="78" r="33" fill="#183e48" stroke="#c0eee7"/><circle cx="160" cy="78" r="9" fill="#c0eee7"/><path d="M160 36v84m-42-42h84" stroke="#75d9cf" opacity=".4"/>' : '');
  if (kind === 'ship') drawing = '<g class="scene-ship"><ellipse cx="160" cy="57" rx="115" ry="25" fill="#62788b"/><path d="M105 50q55-72 110 0" fill="#91c8c1"/><path d="M102 71l-42 109h200L218 71" fill="#a6e2ce" opacity=".18"/><circle cx="125" cy="58" r="5" fill="#f4cf65"/><circle cx="160" cy="64" r="5" fill="#f4cf65"/><circle cx="195" cy="58" r="5" fill="#f4cf65"/></g>' + field;
  if (kind === 'beast') drawing = '<circle class="scene-aura" cx="155" cy="100" r="62" fill="#94dfcb" opacity=".3"/>' + field + animal;
  if (kind === 'balloon') drawing = '<path d="M0 155h320v25H0" fill="#b8c7ad"/>' + balloon + animal;
  if (['real', 'real-jump', 'hand'].includes(kind)) drawing = '<path d="M0 154h320v26H0" fill="#abb6bd"/><path d="M20 145V35h58v110m170 0V16h54v129" fill="#8a9ba9" opacity=".35"/>'
    + (kind === 'hand' ? '<path d="M122 170v-58l-8-22q-2-8 5-10l15 23V52q0-10 9-10v56-65q1-10 10-6v72-62q5-9 11-2v67-47q7-8 12 0v64l-9 51" fill="#303e48"/><rect x="210" y="96" width="31" height="55" rx="5" fill="#24323d"/>' : balloon + person);
  storyArt.innerHTML = '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">' + drawing + '</svg>';
}
function silenceStoryAudio() {
  storySilent = true; cmtStop(); clearTimeout(cmt.timer);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  bgmOn = false; musicNow = crowdNow = null; bgmGain = fileOut = null;
  // Closing the context also stops already-scheduled effects and home-run fanfares.
  if (ac) { const old = ac; ac = null; old.close().catch(() => {}); }
}
function finishStoryEnding() {
  if (storyEnding) { storyEnding.timers.forEach(clearTimeout); storyEnding = null; }
  const final = $('#story-final'); if (final) final.remove();
  $('#app').classList.remove('story-final');
  if (storySilent) { storySilent = false; audioInit(); }
}
function playStoryEnding() {
  silenceStoryAudio(); storyEnding = { phase: 'real', timers: [] };
  storyVisual('real');
  dialog([['', '見知らぬ街。一人の人物が、スマートフォンを手に立っている。'],
    ['', '名前も、ここへ来る前のことも思い出せない。目の前で、子どもの手から風船が離れた。']], () => {
    storyEnding.phase = 'jump'; storyVisual('real-jump');
    overlay({ text: '人物は反射的に走り出す。人間には届かない高さへ跳び、風船をつかんだ。', dlg: true,
      b1: ['つぎへ', () => {
        storyEnding.phase = 'hand'; storyVisual('hand');
        overlay({ text: '着地した人物は、自分の手を見つめる。それから、スマートフォンへ目を落とした。画面は、こちらからは見えない。', dlg: true,
          b1: ['つぎへ', showFinalQuestion] });
      }] });
  });
}
function showFinalQuestion() {
  silenceStoryAudio(); storyVisual(null); $('#overlay').hidden = true;
  $('#app').classList.add('story-final');
  storyEnding.phase = 'title';
  const final = document.createElement('section'); final.id = 'story-final'; final.setAttribute('aria-live', 'polite');
  final.innerHTML = '<div><h1>どうぶつベースボール</h1><p class="made">Made by AI.</p><p class="question" hidden>Who made you?</p></div><button hidden>余韻のあとに</button>';
  $('#stage').appendChild(final);
  storyEnding.timers.push(setTimeout(() => {
    if (!storyEnding) return;
    storyEnding.phase = 'question'; final.querySelector('.question').hidden = false;
    saveProgress(STAGES.length);
  }, 3000));
  storyEnding.timers.push(setTimeout(() => { if (storyEnding) final.querySelector('button').hidden = false; }, 6500));
  final.querySelector('button').addEventListener('click', () => {
    finishStoryEnding(); storyVisual(null);
    overlay({ title: 'クレジット', text: 'どうぶつベースボール\n物語構想・制作方針：Take\n開発協力：AI\n\n素材の出典は設定のクレジットから確認できます。', plain: true, cred: true,
      b1: ['メニューへ', showMenu], b2: ['素材のクレジット', showCredits] });
  });
}

/* A single-character turntable: retained figures use the same head and joint rig
   as pitchers, batters and fielders; the supplied gallery is not a second engine. */
let mascotGallery = null;
const MASCOT_GALLERY = [['home', '柴犬'], ['tiger', 'トラ'], ['neko', 'ねこ'], ['usagi', 'うさぎ'],
  ['kuma', 'クマ'], ['floppy', 'たれ耳うさぎ'], ['human', '人間'], ['alien', '野球帽の宇宙人'], ['away', 'パンダ']];
function showMascotGallery(index, back) {
  idle(); storyVisual(null);
  if (!mascotGallery) {
    const f = makeFig({ team: 'home', glove: true });
    const world = new THREE.Scene(); world.background = new THREE.Color('#eaf3e5');
    world.add(new THREE.HemisphereLight(0xffffff, 0x9aaf83, 1.2));
    const light = new THREE.DirectionalLight(0xffffff, 1.4); light.position.set(-3, 6, 5); world.add(light);
    world.add(f.g);
    const bat = batG.clone(); f.g.add(bat);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    mascotGallery = { f, world, cam, bat, yaw: 0.12, index: 0, back };
  }
  const gallery = mascotGallery; gallery.index = index; gallery.back = back || startStory;
  setTeam(gallery.f, MASCOT_GALLERY[index][0]); gallery.active = true;
  $('#overlay').classList.add('gallery');
  overlay({ title: MASCOT_GALLERY[index][1], text: '提供モデルをゲームの動きに合わせた姿。 ' + (index + 1) + '/' + MASCOT_GALLERY.length,
    b1: ['次のキャラ →', () => showMascotGallery((index + 1) % MASCOT_GALLERY.length, gallery.back)],
    b2: ['← 前のキャラ', () => showMascotGallery((index + MASCOT_GALLERY.length - 1) % MASCOT_GALLERY.length, gallery.back)],
    b3: ['回転する', () => { gallery.yaw += Math.PI / 3; }], b4: ['もどる', () => { const cb = gallery.back; closeMascotGallery(); cb(); }] });
}
function closeMascotGallery() {
  if (mascotGallery) mascotGallery.active = false;
  $('#overlay').classList.remove('gallery');
}
function renderMascotGallery(now) {
  const g = mascotGallery; if (!g || !g.active) return false;
  const yaw = g.yaw;
  const J = squashJ(fielderJ(0, 0, 0, 0, 0, 0, 0), 0);
  // Both paws meet the grip instead of retaining the prototype's floating bat.
  J.hL.set(0.10, 0.70, 0.34); J.hR.set(0.14, 0.76, 0.34);
  J.eL.copy(J.sL).lerp(J.hL, 0.5); J.eR.copy(J.sR).lerp(J.hR, 0.5);
  poseFig(g.f, J, 0, 0); faceFor(g.f, 'smile', now);
  g.f.g.rotation.y = yaw; g.f.g.position.y = 0.40;
  g.bat.position.set(0.10, 0.63, 0.34); g.bat.rotation.set(0, 0, -0.35);
  g.bat.visible = true; if (g.f.mitt) g.f.mitt.visible = false;
  g.cam.fov = 42; g.cam.aspect = W / H; g.cam.position.set(0, 1.2, 3.5); g.cam.lookAt(0, 0.90, 0); g.cam.updateProjectionMatrix();
  renderer.render(g.world, g.cam); return true;
}
