/* API 크레딧 절: 한도 줄의 [API 크레딧으로 계속] 을 누르면 이 대화만 API 크레딧으로 바뀌고, 같은 Claude 세션이 이어서 일한다
   (앱의 AppModel.continueWithClaudeAPI — 인계가 아니다). 화면에 들어오면 한 번 저절로 누르고, 다시 보기 · 직접 누르기도 된다.
   세 단계의 작은 그림(② 키 붙여 넣기 · ③ 모델 칩의 스위치)도 여기서 움직인다. 앱 화면의 글은 한국어 그대로. */
(function () {
  'use strict';
  const AHC = window.AHC || { RM: false, T: (en) => en, onLang() {}, watch(el, fn) { fn(true); } };
  const RM = AHC.RM;
  const $ = (id) => document.getElementById(id);
  const U = AHC.ui || { t: (s) => s, h: (s) => s, set(el, s) { if (el) el.textContent = s; }, setHTML(el, s) { if (el) el.innerHTML = s; }, html: (el) => el.innerHTML };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const EASE = 'cubic-bezier(.65, 0, .35, 1)';

  demo();
  stepKey();
  stepSwitch();

  /* ---------- 한도 줄에서 이어 가기 ---------- */
  function demo() {
    const win = $('cwin');
    if (!win) return;
    const stage = $('cred-stage'), col = $('cw-col');
    const api = $('cw-api'), hand = $('cw-hand'), replay = $('cw-replay');
    const advice = $('cw-advice'), acts = $('cw-acts'), send = $('cw-send');
    const body = col.querySelector('.cw-body');
    const runT = $('cw-run-t'), runEl = $('cw-run-el'), cursor = $('cw-cursor');
    const notesBox = $('cnotes');
    const notes = notesBox ? Array.prototype.slice.call(notesBox.querySelectorAll('.cnote')) : [];
    const adds = {};
    col.querySelectorAll('.cw-add').forEach((el) => { adds[el.dataset.c] = el; });
    // 흐르는 글의 원문은 그 언어의 것 (U.html) — 언어를 바꾸면 원문을 바꾸고, 보이던 만큼 다시 그린다
    const streams = Array.prototype.slice.call(col.querySelectorAll('[data-stream]')).map((p) => {
      const src = p.cloneNode(false);
      src.innerHTML = U.html(p);
      p.innerHTML = src.innerHTML;
      return { p, src, len: src.textContent.length };
    });
    const orb = window.Orbs ? window.Orbs.create($('cw-orb'), { mode: 'solving', tint: '#D97757' }) : null;

    let token = 0;          // 다시 보기 · 직접 누르기가 앞의 흐름을 끊는다
    let phase = 'idle';     // idle · running · done
    let shownNote = 0;
    let clock = 0, clockStart = 0;

    // 흐르는 글: 원본의 앞 n 글자만 (인라인 code · b 는 그대로)
    function partial(node, n) {
      const out = node.cloneNode(false);
      let left = n;
      for (const child of node.childNodes) {
        if (left <= 0) break;
        if (child.nodeType === 3) {
          const t = child.textContent;
          out.appendChild(document.createTextNode(t.slice(0, left)));
          left -= t.length;
        } else {
          const len = child.textContent.length;
          if (len <= left) { out.appendChild(child.cloneNode(true)); left -= len; }
          else { out.appendChild(partial(child, left)); left = 0; }
        }
      }
      return out;
    }
    function setStream(s, n) {
      const part = partial(s.src, n);
      s.p.textContent = '';
      while (part.firstChild) s.p.appendChild(part.firstChild);
    }
    async function streamText(s, ms, alive) {
      if (RM) { setStream(s, s.len); return; }
      const t0 = performance.now();
      while (alive()) {
        const f = Math.min(1, (performance.now() - t0) / ms);
        setStream(s, Math.round(s.len * f));
        if (f >= 1) return;
        await sleep(40);
      }
    }

    const fmtElapsed = (s) => (s < 60 ? s + '초' : Math.floor(s / 60) + '분 ' + String(s % 60).padStart(2, '0') + '초');
    function startClock() {
      stopClock();
      clockStart = performance.now();
      const draw = () => { U.set(runEl, fmtElapsed(Math.floor((performance.now() - clockStart) / 1000))); };
      draw();
      clock = setInterval(draw, 1000);
    }
    function stopClock() { if (clock) clearInterval(clock); clock = 0; }
    function setRun(text, mode) { U.set(runT, text); if (orb) orb.setMode(mode); }
    AHC.onLang(() => streams.forEach((s) => {
      const was = s.p.textContent.length, full = was >= s.len;
      s.src.innerHTML = U.html(s.p);
      const len = s.src.textContent.length;
      if (was) setStream(s, full ? len : Math.round(len * was / Math.max(1, s.len)));
      s.len = len;
    }));

    /* 주석: 넓으면 창 오른쪽 여백에서 가리키는 줄 높이에, 좁으면 창 아래 한 줄 */
    function wide() { return window.matchMedia('(min-width: 1100px)').matches; }
    function placeNotes() {
      if (!notesBox || !wide()) { notes.forEach((n) => { n.style.top = ''; }); return; }
      const box = notesBox.getBoundingClientRect();
      notes.forEach((n) => {
        const target = $(n.dataset.at);
        if (!target) return;
        const r = target.getBoundingClientRect();
        const y = r.top - box.top + r.height / 2 - 23;
        n.style.top = Math.max(0, Math.min(box.height - n.offsetHeight, y)) + 'px';
      });
    }
    function showNote(k) {
      shownNote = k;
      placeNotes();
      notes.forEach((n) => n.classList.toggle('on', Number(n.dataset.n) === k));
    }
    window.addEventListener('resize', placeNotes);
    AHC.onLang(() => requestAnimationFrame(placeNotes));

    function reset() {
      token++;
      phase = 'idle';
      win.classList.remove('is-api');
      advice.classList.remove('off');
      acts.classList.remove('off');
      api.disabled = false; hand.disabled = false;
      api.classList.remove('is-down');
      api.classList.add('invite');
      Object.keys(adds).forEach((k) => adds[k].classList.remove('on'));
      body.classList.remove('on');
      streams.forEach((s) => setStream(s, 0));
      send.classList.remove('is-run');
      stopClock();
      setRun('생각하는 중', 'solving');
      runEl.textContent = '';
      cursor.classList.remove('on', 'press');
      showNote(0);
    }

    async function run(viaCursor) {
      if (phase !== 'idle') return;
      const my = ++token;
      const alive = () => my === token;
      phase = 'running';
      api.classList.remove('invite');
      if (viaCursor && !RM) {
        await moveCursorTo(api, alive);
        if (!alive()) return;
      }
      api.classList.add('is-down');
      api.disabled = true; hand.disabled = true;
      cursor.classList.remove('on');
      if (!RM) await sleep(260);
      if (!alive()) return;
      // 이 대화만 "API 크레딧으로 실행" 이 켜진다 — 모델 칩에 API
      win.classList.add('is-api');
      showNote(1);
      if (!RM) await sleep(650);
      if (!alive()) return;
      // 한도 줄은 지난 줄이 된다 — 권유 문장과 단추가 접힌다. 같은 세션에 이어 가기 메시지가 간다.
      advice.classList.add('off');
      acts.classList.add('off');
      adds.u.classList.add('on');
      send.classList.add('is-run');
      if (!RM) await sleep(800);
      if (!alive()) return;
      adds.h.classList.add('on');
      adds.run.classList.add('on');
      setRun('생각하는 중', 'solving');
      startClock();
      if (!RM) await sleep(450);
      if (!alive()) return;
      showNote(2);
      if (!RM) await sleep(900);
      if (!alive()) return;
      body.classList.add('on');
      adds.p1.classList.add('on');
      setRun('답변을 쓰는 중', 'connecting');
      await streamText(streams[0], 1300, alive);
      if (!alive()) return;
      setRun('명령 실행 중 · swift test', 'working');
      if (!RM) await sleep(2100);
      if (!alive()) return;
      adds.x.classList.add('on');
      adds.p2.classList.add('on');
      setRun('답변을 쓰는 중', 'connecting');
      await streamText(streams[1], 1500, alive);
      if (!alive()) return;
      if (!RM) await sleep(380);
      if (!alive()) return;
      adds.run.classList.remove('on');
      stopClock();
      adds.foot.classList.add('on');
      send.classList.remove('is-run');
      if (!RM) await sleep(500);
      if (!alive()) return;
      showNote(3);
      phase = 'done';
    }

    // 커서: 창 오른쪽 아래에서 단추로
    function moveCursorTo(el, alive) {
      return new Promise((resolve) => {
        const w = win.getBoundingClientRect(), r = el.getBoundingClientRect();
        const to = { x: r.left - w.left + r.width * 0.42, y: r.top - w.top + r.height * 0.55 };
        const from = { x: Math.min(w.width - 60, to.x + 260), y: Math.min(w.height - 40, to.y + 150) };
        cursor.style.transform = 'translate(' + from.x + 'px,' + from.y + 'px)';
        cursor.classList.add('on');
        const anim = cursor.animate([
          { transform: 'translate(' + from.x + 'px,' + from.y + 'px)' },
          { transform: 'translate(' + to.x + 'px,' + to.y + 'px)' },
        ], { duration: 950, easing: EASE, fill: 'forwards' });
        anim.onfinish = async () => {
          cursor.style.transform = 'translate(' + to.x + 'px,' + to.y + 'px)';
          anim.cancel();
          if (!alive()) { resolve(); return; }
          cursor.classList.add('press');
          await sleep(180);
          cursor.classList.remove('press');
          resolve();
        };
      });
    }

    // 사이트의 짧은 말 (앱 화면이 아니다)
    const tip = document.createElement('div');
    tip.className = 'ov-tip';
    tip.setAttribute('aria-hidden', 'true');
    win.appendChild(tip);
    let tipTimer = 0;
    function showTip(el, text) {
      tip.textContent = text;
      tip.classList.add('on');
      const w = win.getBoundingClientRect(), r = el.getBoundingClientRect();
      const x = Math.max(10, Math.min(w.width - tip.offsetWidth - 10, r.left - w.left + r.width / 2 - tip.offsetWidth / 2));
      const y = r.top - w.top - tip.offsetHeight - 10;
      tip.style.transform = 'translate(' + x + 'px,' + (y < 8 ? r.bottom - w.top + 10 : y) + 'px)';
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => tip.classList.remove('on'), 2600);
    }

    api.addEventListener('click', () => { if (phase === 'idle') run(false); });
    hand.addEventListener('click', () => showTip(hand, AHC.T('That’s the handoff path — the card you saw in How it works.', '이쪽은 인계 길입니다 — 작동 방식에서 본 인계 카드로 갑니다.')));
    replay.addEventListener('click', () => { reset(); setTimeout(() => run(true), RM ? 0 : 450); });

    reset();
    if (RM) { run(false); return; }
    // 화면에 들어오면 한 번 저절로 누른다
    let auto = false;
    AHC.watch(stage, async (on) => {
      if (!on || auto) return;
      auto = true;
      await sleep(1300);
      if (phase === 'idle') run(true);
    }, '-30% 0px -30% 0px');
  }

  /* ---------- ② 키를 붙여 넣기: 구독 토큰을 넣으면 그 사실을 말하고, 맞는 키는 끝 네 글자만 남는다 ---------- */
  function stepKey() {
    const m = $('mset');
    if (!m) return;
    const input = $('mset-in'), dots = $('mset-dots'), save = $('mset-save');
    const done = () => { m.classList.remove('err'); m.classList.add('saved'); };
    if (RM) { done(); return; }
    const press = async () => { save.classList.add('press'); await sleep(170); save.classList.remove('press'); };
    const fill = (n) => { dots.textContent = '•'.repeat(n); input.classList.toggle('filled', n > 0); save.classList.toggle('on', n > 0); };
    let played = false;
    AHC.watch(m, async (on) => {
      if (!on || played) return;
      played = true;
      await sleep(800);
      input.classList.add('focus');
      await sleep(350);
      fill(22);                   // 붙여 넣기 — 구독 토큰(sk-ant-oat…)
      await sleep(700);
      await press();
      m.classList.add('err');
      await sleep(2600);
      fill(0);
      await sleep(450);
      fill(26);                   // 다시 — Console 의 API 키
      m.classList.remove('err');
      await sleep(650);
      await press();
      input.classList.remove('focus');
      done();
    }, '-22% 0px -22% 0px');
  }

  /* ---------- ③ 모델 칩의 "API 크레딧으로 실행" ---------- */
  function stepSwitch() {
    const pop = $('mpop'), sw = $('mpop-sw');
    if (!pop || !sw) return;
    const wrap = pop.parentElement;
    let touched = false;
    const set = (on) => {
      sw.setAttribute('aria-checked', String(on));
      pop.classList.toggle('on', on);
      wrap.classList.toggle('on', on);
    };
    sw.addEventListener('click', () => { touched = true; set(sw.getAttribute('aria-checked') !== 'true'); });
    if (RM) { set(true); return; }
    let played = false;
    AHC.watch(pop, async (on) => {
      if (!on || played) return;
      played = true;
      await sleep(1400);
      if (!touched) set(true);
    }, '-25% 0px -25% 0px');
  }
})();
