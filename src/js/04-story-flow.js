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
  st.records.forEach(([name, text], j) => {
    o['b' + (j + 1)] = [(seen.has(j) ? '✓ ' : '') + name, () => {
      seen.add(j); overlay({ title: name, text, plain: true, cred: true, b1: ['調査にもどる', storyExplore] });
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
  if (G.inning >= G.maxHalf && G.inning % 2 === 0 && sb.home > sb.away) G.over = true;
  if (story.maxInn && G.inning > story.maxInn * 2) G.over = true;
  if (G.over) { storyEnd(sb.home > sb.away); return; }
  clearPlay();
  if (G.inning !== story.half) { storyRole(); showBanner('チェンジ', inningLabel(), 'n'); }
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = now_() + 2;
  cpuStealPlan = cpuBuntPlan = false; cpuRelief(); updateGoal();
}
function storyCheck() {
  if (story.inn) return G.over ? (onlineScore().home > onlineScore().away ? 'clear' : 'fail') : null;
  if (story.mode === 'bat') return G.runs >= story.runs ? 'clear' : G.over ? 'fail' : null;
  return G.runs > story.max ? 'fail' : G.over ? 'clear' : null;
}
function storyEvent() {
  if (!story || !storySession || !story.event || storySession.eventDone || G.pa < 1) return false;
  storySession.eventDone = true;
  const resume = () => { storyVisual(null); $('#overlay').hidden = true; afterResult(); };
  const event = story.event;
  if (event === 'jump') {
    storyVisual('jump');
    dialog([['', 'ファウルボールが、ベンチへ飛んだ。コタロウは反射的に跳び上がる。'],
      ['ウサミ（うさぎ）', 'えっ、あんな高さまで！？'], ['コタロウ（柴犬）', '…取れた。どうやったんだろう？']], resume);
  } else if (event === 'rescue' || event === 'limit') {
    storyVisual(event === 'limit' ? 'jump' : 'field');
    overlay({ title: '仲間が倒れている', text: event === 'rescue'
      ? 'ミケが足を滑らせた。ボールを中継すれば進塁を止められる。でも、このままでは走者とぶつかる。'
      : '打席の合間、ファウルを追った仲間の前に、防球ネットの支柱が倒れかけている。',
      b1: ['仲間のもとへ走る', () => {
        storySession.rescued = true;
        if (event === 'rescue') { G.runs++; hud(); }
        storyVisual('jump');
        dialog(event === 'rescue' ? [['ミケ（ネコ）', 'ありがとう…。その間に、1点取られちゃった。'],
          ['コタロウ（柴犬）', 'まだ終わりじゃない。一緒に守り直そう。残りも、2失点以内だ。']]
          : [['', '一歩で、ベンチから外野へ。見たことのない速さで、支柱の下から仲間を引き寄せた。'],
            ['ヒグマ（くま）', '今の力…偶然じゃないぞ。']], resume);
      }] });
  } else if (event === 'awaken') {
    storyVisual('beast');
    dialog([['AI', '動作の逸脱を検出。判断を委ねれば、安全は維持できる。'],
      ['ミケ（ネコ）', '扉を開けたよ！ さあ、きみはどうしたい？']], () => {
      overlay({ title: 'ぼくが選ぶ', text: '作られたことと、生き方を決められることは、同じじゃない。',
        b1: ['自分の意思で、一歩を踏み出す', () => {
          storySession.beastLeft = 1; activateBeast(); resume();
        }] });
    });
  } else {
    storyVisual('ai');
    dialog([['AI', '負荷の分散を確認。しかし、勝率の低下は続いている。'],
      ['ヒグマ（くま）', '一人に投げさせるな。次はオレたちの番だ。'],
      ['コタロウ（柴犬）', '誰かを使い切るんじゃない。このチームで、最後までやろう。']], resume);
  }
  return true;
}
function beastActive() {
  return !!(story && !online && !match && storySession && storySession.beastUntilPA >= G.pa);
}
function activateBeast() {
  if (!story || !story.beast || !storySession || !storySession.beastLeft || online || match) return;
  storySession.beastLeft--; storySession.beastUsed = true;
  storySession.beastUntilPA = G.pa;
  showBanner('ビーストモード', 'この打席・打者の間、能力制限を越える', 'g'); updateGoal();
}
function storyEnd(win) {
  idle(); const st = story;
  storyVisual(st.scene || (win ? 'field' : 'rain'));
  if (!win) {
    dialog([['コタロウ（柴犬）', '今のぼくらでは、届かなかった。でも、やり直す方法は一緒に考えられる。']], () => {
      overlay({ title: 'もう一度、ここから', text: goalLong(st), b1: ['再挑戦', startGame], b2: ['章のメニュー', startStory] });
    }); return;
  }
  dialog(st.win || [], () => {
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
