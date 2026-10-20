import assert from 'node:assert/strict';

async function dialogue(p) {
  for (let n = 0; n < 100; n++) {
    if (await p.evaluate(() => !!window.__dbg.ending)) return;
    if (!await p.evaluate(() => !document.querySelector('#overlay').hidden && document.querySelector('#overlay').classList.contains('dlg'))) return;
    await p.click('#goBtn');
  }
  throw new Error('Story dialogue did not complete');
}
async function event(p) {
  await dialogue(p);
  const title = await p.textContent('#ot');
  if (title === '仲間が倒れている' || title === 'ぼくが選ぶ') { await p.click('#goBtn'); await dialogue(p); }
}
async function readChapterEnd(p, idx) {
  await dialogue(p);
  if (await p.evaluate(() => document.querySelector('#overlay').dataset.scene === 'analysis')) await p.click('#goBtn');
  assert.equal(await p.textContent('#ot'), `第${idx + 1}話 読了`);
  const save = await p.evaluate(() => JSON.parse(localStorage.getItem('animal-baseball-story-v2')));
  assert.ok(save.completed >= idx + 1);
}

export async function runStory(p, errs, { playPA, FLYOUT, HOMERUN }) {
  // An old five-episode clear must not skip any of the new story.
  await p.evaluate(() => { localStorage.setItem('yakyu-progress', '5'); localStorage.removeItem('animal-baseball-story-v2'); });
  const opts = await p.evaluate(() => localStorage.getItem('yakyu-opts'));
  await p.click('#goBtn');
  assert.match(await p.textContent('#od'), /第1話/);
  await p.click('#go2');
  assert.match(await p.textContent('#go2'), /未解放/);
  await p.click('#go2');
  assert.equal(await p.textContent('#ot'), '章をえらぶ');
  await p.click('#go6');
  await p.click('#go3');
  const species = ['shiba', 'tiger', 'neko', 'usagi', 'kuma', 'floppy', 'human', 'alien', 'panda'];
  for (let i = 0; i < species.length; i++) {
    assert.equal(await p.evaluate(() => window.__dbg.gallery.species), species[i]);
    await p.waitForTimeout(40);
    if (i === 0 || i === 5 || i === 7) await p.screenshot({ path: `/tmp/baseball-model-${species[i]}.png` });
    if (i < species.length - 1) await p.click('#goBtn');
  }
  await p.click('#go4'); await p.click('#goBtn');

  for (let i = 0; i < 10; i++) {
    const def = await p.evaluate(() => ({ kind: window.__dbg.story.kind, mode: window.__dbg.story.mode, runs: window.__dbg.story.runs, inn: window.__dbg.story.inn }));
    await dialogue(p);
    if (def.kind === 'explore') {
      assert.equal(await p.locator('#go4').isHidden(), true, 'Unread records must gate chapter completion');
      for (const id of ['#goBtn', '#go2', '#go3']) { await p.click(id); await p.click('#goBtn'); }
      assert.equal(await p.locator('#go4').isHidden(), false);
      await p.click('#go4'); await readChapterEnd(p, i);
    } else if (def.kind === 'scene') {
      await readChapterEnd(p, i);
    } else if (def.kind === 'ending') {
      assert.equal(await p.evaluate(() => window.__dbg.ending), 'real');
      await p.click('#goBtn'); await p.click('#goBtn');
      assert.equal(await p.evaluate(() => window.__dbg.ending), 'jump');
      await p.screenshot({ path: '/tmp/baseball-ending-jump.png' });
      await p.click('#goBtn'); assert.equal(await p.evaluate(() => window.__dbg.ending), 'hand');
      await p.click('#goBtn');
      assert.equal(await p.locator('#story-final .question').isHidden(), true);
      assert.equal(await p.locator('#story-final .made').textContent(), 'Made by AI.');
      await p.waitForFunction(() => !document.querySelector('#story-final .question').hidden);
      assert.equal(await p.locator('#story-final .question').textContent(), 'Who made you?');
      const audio = await p.evaluate(() => window.__dbg.audioState());
      assert.equal(audio.silent, true); assert.equal(audio.context, null); assert.equal(audio.commentary, false);
      await p.screenshot({ path: '/tmp/baseball-ending-question.png' });
      await p.waitForFunction(() => !document.querySelector('#story-final button').hidden);
      await p.click('#story-final button'); await p.click('#goBtn');
      assert.equal(await p.textContent('#ot'), 'どうぶつベースボール');
      assert.equal(await p.evaluate(() => window.__dbg.session), null);
      assert.equal(await p.evaluate(() => window.__dbg.audioState().silent), false);
      assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('animal-baseball-story-v2')).completed), 10);
      console.log('✓ 3-10. 現実の跳躍・暗転・無音・時間差の問い・メニュー帰還');
      break;
    } else {
      await p.click('#goBtn');
      assert.equal(await p.evaluate(() => window.__dbg.mode), def.mode);
      if (i === 1) {
        assert.equal(await p.evaluate(() => window.__dbg.G.maxHalf), 2);
        assert.equal(await p.evaluate(() => window.__dbg.roster().b.m), 3);
        assert.equal(await p.evaluate(() => window.__dbg.roster().b.p), 3);
        assert.equal(await p.locator('#pitches').isVisible(), true, 'Chapter 2 must show the pitching guide after batting chapter 1');
        assert.deepEqual(await p.locator('#pitches .pg').evaluateAll(nodes => nodes.map(n => n.dataset.t)), ['str', 'cur', 'two', 'chg']);
      }
      assert.equal(await p.evaluate(() => window.__dbg.G.inning), 1);
      if (i === 0) {
        await p.click('#menuBtn'); await p.click('#goBtn');
        assert.equal(await p.evaluate(() => window.__dbg.G.pa), 0, 'Pause must preserve match');
      }
      if (i === 8) {
        // Complete a real scoreless game through the extension cap: a draw is a failed mission.
        for (let n = 0; n < 30; n++) { await playPA(p, errs, FLYOUT, '最終戦の引き分け'); await event(p); }
        assert.equal(await p.textContent('#ot'), 'もう一度、ここから');
        await p.click('#goBtn');
        assert.equal(await p.evaluate(() => window.__dbg.G.inning), 1);
        assert.equal(await p.evaluate(() => window.__dbg.session.beastLeft), 1);
        const defense = await p.evaluate(() => {
          const d = window.__dbg, before = d.contact(0.04, 0.1, 0, 130, false, false).q;
          d.useBeast();
          return { before, after: d.contact(0.04, 0.1, 0, 130, false, false).q };
        });
        assert.ok(defense.after < defense.before, 'Defensive beast mode must reduce opposing contact quality');
        assert.equal(await p.evaluate(() => window.__dbg.beastActive()), true);
      }
      await playPA(p, errs, i === 7 ? HOMERUN : FLYOUT, '第' + (i + 1) + '話 最初の打席'); await event(p);
      if (i === 8) assert.equal(await p.evaluate(() => window.__dbg.beastActive()), true, 'Beast mode lasts across plate appearances');
      if (i === 1) assert.equal(await p.evaluate(() => window.__dbg.G.runs), 1, 'Rescue must have a real run cost');
      if (i === 7) {
        assert.equal(await p.evaluate(() => window.__dbg.G.over), false, 'Opening HR must still allow batting after awakening');
        assert.equal(await p.evaluate(() => window.__dbg.beastView().giant), true);
        const attack = await p.evaluate(() => {
          const d = window.__dbg, boosted = d.contact(0.11, 0.5, 0, 130, false, false).q;
          const until = d.session.beastUntilPA; d.session.beastUntilPA = -1;
          const normal = d.contact(0.11, 0.5, 0, 130, false, false).q;
          d.session.beastUntilPA = until; return { normal, boosted };
        });
        assert.ok(attack.boosted > attack.normal, 'Offensive beast mode must improve timing/contact tolerance');
        assert.equal(await p.evaluate(() => window.__dbg.session.beastUsed), true);
        assert.equal(await p.evaluate(() => window.__dbg.beastActive()), true);
      }
      if (def.inn) {
        // Switch to batting, score two runs, then play all remaining outs.
        for (let n = 0; n < 2; n++) await playPA(p, errs, FLYOUT, '決戦 1回表');
        assert.equal(await p.evaluate(() => window.__dbg.mode), 'bat');
        for (let n = 0; n < 2; n++) await playPA(p, errs, HOMERUN, '決戦 1回裏');
        for (let n = 0; n < 30; n++) {
          if (await p.evaluate(() => window.__dbg.G.over)) break;
          await playPA(p, errs, FLYOUT, '決戦 攻守交代');
        }
        assert.equal(await p.evaluate(() => window.__dbg.G.over), true);
      } else if (def.mode === 'bat') {
        const target = await p.evaluate(() => { const d = window.__dbg; return d.story.idx === 7 ? d.session.awakenRuns + 1 : d.story.runs; });
        for (let n = 0; n < 6 && await p.evaluate(goal => window.__dbg.G.runs < goal, target); n++) await playPA(p, errs, HOMERUN, '第' + (i + 1) + '話 得点');
        assert.ok(await p.evaluate(goal => window.__dbg.G.runs >= goal, target), 'Batting chapter must reach its goal');
      } else {
        for (let n = 0; n < 4; n++) await playPA(p, errs, FLYOUT, '第2話 2回終了前');
        assert.equal(await p.evaluate(() => window.__dbg.G.over), false, 'Chapter 2 continues until six outs');
        await playPA(p, errs, FLYOUT, '第2話 2回終了');
        assert.equal(await p.evaluate(() => window.__dbg.G.over), true, 'Chapter 2 ends after six outs');
      }
      await readChapterEnd(p, i);
    }
    assert.deepEqual(errs, []);
    console.log(`✓ 3-${i + 1}. 新ストーリー（${def.kind}・イベント・進行保存）`);
    await p.click('#goBtn');
  }
  assert.equal(await p.evaluate(() => localStorage.getItem('yakyu-progress')), '5');
  assert.equal(await p.evaluate(() => localStorage.getItem('yakyu-opts')), opts, 'Story must preserve user preferences');
  assert.equal(await p.evaluate(() => window.__dbg.beastActive()), false);
  // Checkpoint survives page reload, while temporary mission state does not.
  await p.reload(); await p.waitForFunction(() => window.__dbg);
  await p.click('#goBtn'); assert.match(await p.textContent('#od'), /全10話/);
  await p.click('#go4');
  await p.evaluate(() => window.__dbg.optOff());
  console.log('✓ 新旧セーブ分離・再読込・9種のモデル・再挑戦・他モードへの状態分離');
}
