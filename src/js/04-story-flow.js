/* Story runtime. Save only chapter checkpoints; live match state is never shared
   with CPU practice or network play. Old yakyu-progress is deliberately untouched. */
let storySession = null, storyEnding = null;
function readStorySave() {
  try {
    const v = JSON.parse(localStorage.getItem(STORY_SAVE_KEY) || '{}');
    return { completed: Number.isInteger(v.completed) ? clamp(v.completed, 0, STAGES.length) : 0 };
  } catch (e) { return { completed: 0 }; }
}
function storyResetSession() {
  storySession = story ? { eventDone: false, beastLeft: story.beast && story.idx === 8 ? 1 : 0,
    beastUntilPA: -1, beastUsed: false, rescued: false } : null;
}
function startStory() {
  story = null; storySession = null; idle(); storyVisual(null);
  const done = loadProgress(), i = Math.min(done, STAGES.length - 1);
  overlay({ title: 'ストーリー', text: done === STAGES.length ? '全10話を読み終えました。章を選んで、もう一度。'
    : '第' + (i + 1) + '話「' + STAGES[i].title + '」から。進行は各話の終了時に、この端末へ保存します。',
    b1: [done === STAGES.length ? '第1話から' : 'つづきから', () => showStage(done === STAGES.length ? 0 : i)],
    b2: ['章をえらぶ', () => storyChapters(0)], b3: ['キャラクターを見る', () => showMascotGallery(0, startStory)], b4: ['メニュー', showMenu] });
}
function storyChapters(page) {
  const done = loadProgress(), first = page * 4;
  const o = { title: '章をえらぶ', text: '読み終えた章と、次の章を選べます。' };
  STAGES.slice(first, first + 4).forEach((st, j) => {
    const i = first + j, unlocked = i <= done;
    o['b' + (j + 1)] = [unlocked ? st.short + ' ' + st.title : st.short + ' 未解放', unlocked ? () => showStage(i) : () => storyChapters(page)];
  });
  o.b5 = ['ページ ' + (page + 1) + '/3 →', () => storyChapters((page + 1) % 3)];
  o.b6 = ['もどる', startStory]; overlay(o);
}
function showStage(i) {
  if (!Number.isInteger(i) || !STAGES[i]) return;
  finishStoryEnding(); closeMascotGallery(); match = null;
  story = { opp: 'away', mode: 'bat', ...STAGES[i], idx: i }; storyResetSession();
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  mode = story.mode || 'bat'; newGame();
  if (story.inn) storyRole();
  else { setTeams(); resize(); hud(); }
  idle(); storyVisual(story.scene || 'field');
  dialog(story.intro, () => {
    if (story.kind === 'explore') { storySession.seen = new Set(); storyExplore(); }
    else if (story.kind === 'scene') storyEnd(true);
    else if (story.kind === 'ending') playStoryEnding();
    else overlay({ title: story.short + ' ' + story.title, text: goalLong(story),
      b1: ['プレイボール', startGame], b2: ['章のメニュー', startStory] });
  });
}
function storyExplore() {
  if (!story || !storySession) return;
  const st = story, seen = storySession.seen;
  storyVisual(st.scene);
  const o = { title: st.short + ' ' + st.title, text: '気になる記録をタップして調べよう。 ' + seen.size + '/' + st.records.length };
  st.records.forEach(([name, text, detail], j) => {
    o['b' + (j + 1)] = [(seen.has(j) ? '✓ ' : '') + name, () => {
      seen.add(j);
      const record = () => overlay({ title: name, text, plain: true,
        b1: ['調査にもどる', storyExplore],
        b2: detail ? ['詳しく読む', () => overlay({ title: name, text: detail, plain: true, b1: ['要約にもどる', record] })] : null });
      record();
    }];
  });
  if (seen.size === st.records.length) o.b4 = ['仲間と話す', () => storyEnd(true)];
  o.b5 = ['章のメニュー', startStory]; overlay(o);
}
function storyRole() {
  story.half = G.inning;
  mode = battingSide() === 'home' ? 'bat' : 'pit';
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('#pitches').hidden = mode !== 'pit'; setTeams(); resize(); hud();
}
function storyAfterResult() {
  const sb = onlineScore();
  // Only the story's two-sided finale uses the beast-mode mercy rule.
  if (storySession && storySession.beastUsed && Math.abs(sb.home - sb.away) >= 10) {
    G.over = true; storySession.mercy = true;
  }
  if (G.inning >= G.maxHalf && G.inning % 2 === 0 && sb.home > sb.away) G.over = true;
  if (story.maxInn && G.inning > story.maxInn * 2) G.over = true;
  if (G.over) { storyEnd(sb.home > sb.away); return; }
  clearPlay();
  if (G.inning !== story.half) { storyRole(); showBanner('チェンジ', inningLabel(), 'n'); }
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = now_() + 2;
  cpuStealPlan = cpuBuntPlan = false; cpuRelief(); updateGoal();
}
function storyOpeningPitch() {
  return !!(story && story.openingHR && !online && !match && mode === 'pit' && storySession && !storySession.eventDone);
}
function storyCheck() {
  if (storyOpeningPitch()) return null;
  if (story.inn) return G.over ? (onlineScore().home > onlineScore().away ? 'clear' : 'fail') : null;
  if (story.mode === 'bat') return G.runs >= storyRunGoal() ? 'clear' : G.over ? 'fail' : null;
  return G.runs > story.max ? 'fail' : G.over ? 'clear' : null;
}
function storyEvent() {
  if (!story || !storySession || !story.event || storySession.eventDone || G.pa < 1) return false;
  if (story.openingHR && G.hr < story.openingHR) return false;
  storySession.eventDone = true;
  const resume = () => { pausedAt = 0; storyVisual(null); $('#overlay').hidden = true; afterResult(); };
  const event = story.event;
  if (event === 'jump') {
    storyVisual('jump');
    dialog([['', 'ファウルボールが、ベンチへ飛んだ。コタロウは反射的に跳び上がる。'],
      ['ウサミ（うさぎ）', 'えっ、あんな高さまで！？'], ['コタロウ（柴犬）', '…取れた。どうやったんだろう？']], resume);
  } else if (event === 'rescue' || event === 'limit') {
    storyVisual(event === 'limit' ? 'jump' : 'field');
    overlay({ title: '仲間が倒れている', text: event === 'rescue'
      ? 'ミケが足を滑らせた。ボールを中継すれば進塁を止められる。でも、このままでは走者とぶつかってしまう！'
      : '打席の合間、ファウルを追った仲間の前に、防球ネットの支柱が倒れかけている。',
      b1: ['仲間のもとへ走る', () => {
        storySession.rescued = true;
        if (event === 'rescue') { G.runs++; hud(); }
        storyVisual(event === 'rescue' ? 'rescue' : 'jump');
        dialog(event === 'rescue' ? [['ミケ（ネコ）', 'ありがとう…。でもその間に、1点取られちゃった…。'],
          ['コタロウ（柴犬）', 'まだ終わりじゃないよ！一緒に守り直そう。残りも、2失点以内だ。']]
          : [['ヒグマ（くま）', '今の速さ……。だが、いまはやめておこう。'],
            ['ウサミ（うさぎ）', '次はわたしの番。一塁から、きみの打球を待ってる。']], () => {
              G.bases[0] = G.bases[0] || 5; hud(); resume();
            });
      }] });
  } else if (event === 'awaken') {
    storyVisual('awakening-strain');
    dialog([['', '心臓が張り裂ける音がする。獣の本能が目を覚ます。', 'awakening-strain'],
      ['AI', '制御限界。これ以上は、君自身を保証できない。'],
      ['コタロウ（柴犬）', '来るな……ミケ。今のぼくは……。'],
      ['', '抑えていた野性(ﾋﾞｰｽﾄ)が、今、解き放たれる。', 'awakening-strain', 'awakening'],
      ['ミケ（ネコ）', '怖いよ。でも、絶対にここから離れない！', 'awakening-roar'],
      ['', '大きな手に、小さな手が触れる。', 'beast'],
      ['ミケ（ネコ）', 'あの日、ぼくを助けに戻った。あれは、ほかの誰でもない、きみ自身が決めたことだ！'],
      ['コタロウ（柴犬）', '……覚えてる。忘れない。守りたいと思った。この手で、きみを助けた。']], () => {
      storyVisual('beast');
      overlay({ title: 'ぼくが選ぶ', text: '吠えているのは、ぼくの中の野性。どう使うかは、ぼくが決める。',
        b1: ['自分の意思で、一歩を踏み出す', () => {
          // The three conceded runs belong to the opening scene. Start a fresh batting challenge.
          const session = storySession; session.openingRuns = G.runs;
          clearPlay(); newGame(); storySession = session;
          story.mode = mode = 'bat';
          $('#mBat').classList.add('on'); $('#mPit').classList.remove('on');
          $('#pitches').hidden = true; setTeams(); resize(); hud();
          storySession.awakenRuns = 0;
          storySession.beastLeft = 1; activateBeast(); resume();
        }] });
    });
  } else {
    storyVisual('ai');
    dialog([['AI', '負荷の分散を確認。しかし、勝率の低下は続いている。'],
      ['ヒグマ（くま）', '一人に投げさせるな。次はオレたちの番だ。'],
      ['コタロウ（柴犬）', '誰かを犠牲にするんじゃない。このチームで、最後までやろう！']], resume);
  }
  return true;
}
function beastActive() {
  if (online) return !!(G && !G.over && phase !== 'idle' && onl.beast[onl.side]);
  return !!(story && !online && !match && G && !G.over && phase !== 'idle' && storySession && storySession.beastUntilPA >= G.pa);
}
function beastForRole(role) {
  if (!online) return beastActive() && mode === role;
  if (!G || G.over || phase === 'idle') return false;
  // G.inning advances at the third out; the displayed roles change only when
  // applyRole completes the result animation. Keep its actor snapshot until then.
  const bat = onl.half % 2 === 1 ? 'away' : 'home';
  return !!onl.beast[role === 'bat' ? bat : bat === 'home' ? 'away' : 'home'];
}
function storyRunGoal() { return story.idx === 7 && storySession && storySession.awakenRuns !== undefined ? storySession.awakenRuns + 1 : story.runs; }
function activateBeast() {
  if (!story || !story.beast || !storySession || !storySession.beastLeft || online || match) return;
  storySession.beastLeft--; storySession.beastUsed = true;
  storySession.beastUntilPA = Infinity;
  vanishArm = true;
  showBanner('野性解放！', '試合終了まで獣化・200km/h・消える魔球∞・巨大バット', 'g'); updateGoal();
}
function storyEnd(win) {
  idle(); const st = story;
  storyVisual(win ? (st.idx === 1 ? 'rescue' : st.idx === 7 ? 'beast' : st.scene || 'field') : 'rain');
  if (!win) {
    const lossLines = [['コタロウ（柴犬）', '今は届かなかった。でも、次もみんなで挑もう。']];
    if (storySession && storySession.mercy) lossLines.unshift(['', '10点差。コールドゲームが宣告された。']);
    dialog(lossLines, () => {
      overlay({ title: 'もう一度、ここから', text: goalLong(st), b1: ['再挑戦', startGame], b2: ['章のメニュー', startStory] });
    }); return;
  }
  const finishLines = storySession && storySession.mercy ? [['', '10点差。コールドゲームが宣告された。']].concat(st.win || []) : st.win || [];
  dialog(finishLines, () => {
    const complete = () => {
      saveProgress(Math.max(loadProgress(), st.idx + 1));
      storyVisual(null);
      overlay({ title: '第' + (st.idx + 1) + '話 読了', text: st.title,
        b1: ['次の話へ', () => showStage(st.idx + 1)], b2: ['章のメニュー', startStory] });
    };
    if (st.log) {
      storyVisual('analysis');
      overlay({ title: st.log[0], text: st.log[1], plain: true, cred: true, b1: ['記録を閉じる', complete] });
    } else complete();
  });
}
