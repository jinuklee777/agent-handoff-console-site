/* 절마다의 움직이는 그림: 벽(타이핑) · 인계 카드 · 자동 인계 타일 · 분할 화면 · 현황/분할 화면 바꾸기.
   모두 보일 때만 움직이고, 움직임 줄이기면 마지막 모습만 보인다. */
(function () {
  'use strict';
  const AHC = window.AHC || { RM: false, T: (a) => a, watch() {}, onLang() {} };
  const RM = AHC.RM;
  const $ = (id) => document.getElementById(id);
  const U = AHC.ui || { t: (s) => s, h: (s) => s, set(el, s) { if (el) el.textContent = s; }, setHTML(el, s) { if (el) el.innerHTML = s; }, html: (el) => el.innerHTML };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const once = (el, fn, threshold) => {
    if (!el) return;
    if (RM || !('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fn(); } }), { threshold: threshold || 0.5 });
    io.observe(el);
  };
  // 앱의 어두운 화면: Codex 의 점 구는 글자 색(ink), Antigravity 는 밝은 파랑
  const orbTint = { claude: '#D97757', codex: '#F0EFEC', gemini: '#6FA3FF' };

  /* ================= 01 벽: 한도 문장이 쳐진다 ================= */
  (function wall() {
    const term = $('wall-term'), sec = $('problem');
    if (!term) return;
    const lines = Array.prototype.slice.call(term.querySelectorAll('.term-line')).map((l) => {
      const typed = l.querySelector('.tl-typed'), rest = l.querySelector('.tl-rest');
      return { typed, rest, full: rest.textContent };
    });
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    const set = (i, n) => { const d = lines[i]; d.typed.textContent = d.full.slice(0, n); d.rest.textContent = d.full.slice(n); };
    const caretAt = (i) => lines[i].typed.insertAdjacentElement('afterend', caret);
    if (RM) { lines.forEach((d, i) => set(i, d.full.length)); caretAt(lines.length - 1); sec.classList.add('lit'); }
    else {
      lines.forEach((d, i) => set(i, 0));
      caretAt(0);
      once(term, async () => {
        await sleep(350);
        for (let i = 0; i < lines.length; i++) {
          caretAt(i);
          for (let n = 1; n <= lines[i].full.length; n++) {
            set(i, n);
            const ch = lines[i].full[n - 1];
            await sleep(ch === ' ' ? 55 : ch === '.' ? 160 : 30 + Math.random() * 34);
          }
          if (i === 0) await sleep(420);
        }
        sec.classList.add('lit');
      }, 0.6);
    }
    // 넘기기 알약: 화면에 들어오면 눌리고 빛이 아래로 달린다
    const turn = $('wall-turn'), pill = $('wall-pill'), apiPill = $('wall-api');
    // 내려가는 빛줄기는 넘기기 알약 아래에서 시작한다 (두 알약이 나란할 때 — 쌓이면 가운데)
    const run = turn ? turn.querySelector('.wall-run') : null;
    const alignRun = () => {
      if (!run || !pill) return;
      const t = turn.getBoundingClientRect(), p = pill.getBoundingClientRect();
      run.style.translate = Math.round(p.left + p.width / 2 - (t.left + t.width / 2)) + 'px 0';
    };
    alignRun();
    window.addEventListener('resize', alignRun);
    AHC.onLang(() => requestAnimationFrame(alignRun));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignRun);
    if (turn && pill && !RM) once(turn, async () => {
      await sleep(650);
      pill.classList.add('press');
      turn.classList.add('go');
      // 다른 갈래 — API 크레딧으로 계속 (같은 세션)
      if (apiPill) { await sleep(1500); apiPill.classList.add('glint'); }
    }, 0.7);
  })();

  /* ================= 02 인계 카드 (직접 눌러 보는) ================= */
  (function card() {
    const hc = $('hc');
    if (!hc) return;
    const body = $('hc-body'), after = $('hc-after'), cb = $('hc-cb'), send = $('hc-send'), cancel = $('hc-cancel');
    const edit = $('hc-edit'), full = $('hc-full'), doc = $('hc-full-doc'), again = $('hc-again'), memo = $('hc-memo');
    const div = $('hc-div'), st = $('hc-st'), reply = $('hc-reply'), cancelled = $('hc-cancelled'), editNote = $('hc-edit-note');
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    cb.addEventListener('change', () => { send.disabled = !cb.checked; hc.classList.toggle('is-ok', cb.checked); });
    // 앱처럼: 고치는 동안 단추는 "문서 닫기", 위에 한 줄 안내
    function showDoc(editable) {
      const open = doc.hidden || (editable && doc.contentEditable !== 'true');
      const editing = open && editable;
      doc.hidden = !open;
      doc.contentEditable = editing ? 'true' : 'false';
      if (editNote) editNote.hidden = !editing;
      U.set(full, open ? '전문 접기' : '전문 보기 ›');
      full.setAttribute('aria-expanded', String(open));
      U.set(edit, editing ? '문서 닫기' : '문서 열어 고치기');
      edit.setAttribute('aria-expanded', String(editing));
      if (editing) doc.focus();
    }
    full.addEventListener('click', () => showDoc(false));
    edit.addEventListener('click', () => showDoc(true));
    send.addEventListener('click', () => {
      if (send.disabled) return;
      body.hidden = true; after.hidden = false; cancelled.hidden = true; div.hidden = false; reply.hidden = true;
      U.set(st, '받는 쪽 실행 중 · 파일 3개 · 약 1천 토큰');
      st.classList.add('is-going');
      div.classList.remove('streaking', 'landed');
      requestAnimationFrame(() => div.classList.add('streaking'));
      later(RM ? 0 : 900, () => { reply.hidden = false; });
      later(RM ? 0 : 2300, () => { U.set(st, '전달 확인 · 파일 3개 · 약 1천 토큰'); st.classList.remove('is-going'); div.classList.add('landed'); });
      again.focus({ preventScroll: true });
    });
    cancel.addEventListener('click', () => {
      body.hidden = true; after.hidden = false; div.hidden = true; reply.hidden = true; cancelled.hidden = false;
      again.focus({ preventScroll: true });
    });
    again.addEventListener('click', () => {
      timers.forEach(clearTimeout); timers.length = 0;
      after.hidden = true; body.hidden = false;
      cb.checked = false; send.disabled = true; hc.classList.remove('is-ok');
      memo.value = '';
      doc.hidden = true; doc.contentEditable = 'false'; U.set(full, '전문 보기 ›');
      if (editNote) editNote.hidden = true;
      U.set(edit, '문서 열어 고치기');
      full.setAttribute('aria-expanded', 'false'); edit.setAttribute('aria-expanded', 'false');
      cb.focus({ preventScroll: true });
    });
  })();

  /* ================= 02 자동 인계 타일: 작은 카운트다운 ================= */
  (function autoTile() {
    const tile = $('atile');
    if (!tile) return;
    const arc = $('at-arc'), num = $('at-n'), line = $('at-line');
    const TOTAL = 10, HOLD = 3600;
    let n = TOTAL, vis = false, timer = 0;
    function paint() {
      const done = n <= 0;
      tile.classList.toggle('is-done', done);
      num.textContent = done ? '✓' : String(n);
      // 남은 시간만큼 고리가 남는다 — 넘기면 초록 고리로 다시 찬다
      arc.style.strokeDashoffset = done ? '0' : String(100 * (1 - n / TOTAL));
      U.set(line, done ? 'Codex · 인계받아 일하는 중' : n + '초 뒤 Codex 에게 넘깁니다');
    }
    function jump(k) {
      n = k;
      arc.style.transition = 'none';
      paint();
      void arc.getBoundingClientRect();
      arc.style.transition = '';
    }
    function step() {
      clearTimeout(timer);
      if (!vis) return;
      timer = setTimeout(() => {
        if (!vis) return;
        if (n <= 0) jump(TOTAL);
        else {
          n -= 1;
          if (n <= 0) arc.style.transition = 'stroke-dashoffset .8s cubic-bezier(.16, 1, .3, 1), stroke .4s';
          paint();
          if (n <= 0) setTimeout(() => { arc.style.transition = ''; }, 900);
        }
        step();
      }, n <= 0 ? HOLD : 1000);
    }
    if (RM) { jump(6); return; }
    jump(TOTAL);
    // 다시 보일 때마다 10초부터 — 처음 보는 사람이 카운트다운 전체를 본다
    AHC.watch(tile, (v) => { const back = v && !vis; vis = v; if (back) jump(TOTAL); if (v) step(); else clearTimeout(timer); }, '-10% 0px');
  })();

  /* ================= 04 분할 화면 (현황과 같은 틀) ================= */
  (function panes() {
    const pwin = $('pwin');
    if (!pwin) return;
    const panes = Array.prototype.slice.call(pwin.querySelectorAll('.pane'));
    const need = $('p-need'), title = $('p-title'), sub = $('p-sub'), seg = $('p-seg');
    const wait = $('pane-wait'), appr = $('appr'), after = $('appr-after'), run = $('appr-run'), line = $('appr-line'), done = $('appr-done'), st = $('pw-st'), ph = $('pw-ph');
    const INFO = {
      1: ['로그인 401 재시도 처리', 'moa-ios — feature/login-retry ↑2'],
      2: ['온보딩 화면 다듬기', 'moa-ios — feature/onboarding-polish'],
      3: ['랜딩 페이지 다크 모드', 'moa-web — main'],
      4: ['결제 웹훅 재시도 큐', 'moa-server — main'],
    };
    // 휴대폰 폭은 두 칸(위아래)부터 — 네 칸은 고를 수 없다 (칸이 너무 작다)
    const narrow = window.matchMedia('(max-width: 759px)');
    let focus = 1, layout = narrow.matches ? 2 : 4, ws = 'ask', resetT = 0, doneT = 0;
    function apply() {
      panes.forEach((p) => {
        const k = Number(p.dataset.pane);
        p.classList.toggle('is-focus', k === focus);
        let show = true;
        if (layout === 1) show = k === focus;
        if (layout === 2) show = focus <= 2 ? k <= 2 : k >= 3;
        p.classList.toggle('is-hidden', !show);
      });
      U.set(title, INFO[focus][0]);
      sub.textContent = INFO[focus][1];
      need.classList.toggle('is-gone', !(ws === 'ask' && focus !== 2));
      need.tabIndex = ws === 'ask' && focus !== 2 ? 0 : -1;
      pwin.dataset.layout = String(layout);
      if (seg) seg.querySelectorAll('button[data-layout]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.layout) === layout)));
    }
    function setWait(s) {
      ws = s;
      clearTimeout(doneT);
      wait.classList.toggle('is-wait', s === 'ask');
      appr.hidden = s !== 'ask';
      after.hidden = s === 'ask';
      run.hidden = s !== 'run';
      done.hidden = !(s === 'done' || s === 'denied');
      if (s === 'ask') { U.setHTML(st, '<i class="dotw"></i>승인 대기'); U.set(ph, '위 카드에 먼저 답하세요 — 여기 쓴 글은 실행이 끝난 뒤 보냅니다'); }
      if (s === 'run') { U.setHTML(st, '<i class="spin"></i>실행 중'); U.setHTML(line, '명령 1개 실행 <span class="x-ch">›</span>'); U.set(ph, 'Claude 에게 메시지…'); }
      if (s === 'done') { U.set(st, '완료 · 방금'); U.set(done, '테스트가 통과했습니다. 세 화면의 여백을 맞췄습니다.'); }
      if (s === 'denied') { U.set(st, '완료 · 방금'); U.setHTML(line, '거절 1번 <span class="x-ch">›</span>'); U.set(done, '거절하셔서 테스트는 돌리지 않았습니다.'); U.set(ph, 'Claude 에게 메시지…'); }
      st.className = 'pane-st' + (s === 'run' ? ' run' : s === 'ask' ? '' : ' done');
      apply();
    }
    pwin.addEventListener('click', (e) => {
      const a = e.target.closest('[data-appr]');
      if (a) {
        clearTimeout(resetT);
        if (a.dataset.appr === 'allow') { setWait('run'); doneT = setTimeout(() => setWait('done'), RM ? 0 : 3200); }
        else setWait('denied');
        resetT = setTimeout(() => setWait('ask'), 11000);
        return;
      }
      if (e.target.closest('#p-need')) {
        focus = 2; apply();
        wait.classList.remove('flash'); void wait.offsetWidth; wait.classList.add('flash');
        const y = wait.querySelector('[data-appr="allow"]');
        if (y) y.focus({ preventScroll: true });
        return;
      }
      const p = e.target.closest('.pane');
      if (p) { focus = Number(p.dataset.pane); apply(); }
    });
    // 한 칸 · 두 칸 · 네 칸 (앱에서는 ⋯ 메뉴 · 보기 메뉴 · ⌃⌘1/2/4) — 화살표로도
    if (seg) {
      seg.addEventListener('click', (e) => { const l = e.target.closest('button[data-layout]'); if (l) { layout = Number(l.dataset.layout); apply(); } });
      seg.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const order = narrow.matches ? [1, 2] : [1, 2, 4];
        const i = (order.indexOf(layout) + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length;
        layout = order[i]; apply();
        seg.querySelector('button[data-layout="' + layout + '"]').focus();
        e.preventDefault();
      });
    }
    const onNarrow = () => { if (narrow.matches && layout === 4) { layout = 2; apply(); } };
    if (narrow.addEventListener) narrow.addEventListener('change', onNarrow); else if (narrow.addListener) narrow.addListener(onNarrow);
    setWait('ask');
    // 점 구 · 경과 시간 · 흐르는 글 (보일 때만 — 현황을 보는 동안은 멈춘다)
    const orbs = [];
    if (window.Orbs) pwin.querySelectorAll('canvas[data-orb]').forEach((c) => orbs.push(window.Orbs.create(c, { mode: c.dataset.mode || 'working', tint: orbTint[c.dataset.orb] })));
    const els = Array.prototype.slice.call(pwin.querySelectorAll('[data-elapsed]'));
    const p3 = $('p3-stream');
    let p3Base = p3 ? U.html(p3) : '';
    if (p3) p3.innerHTML = p3Base;
    const p3MoreKo = ['나눈', '뒤', '헤더부터', '바꾸겠습니다.', '배경은', '#0B0F17,', '카드는', '한 단계', '밝게', '둡니다.'];
    const p3MoreEn = ['split', 'the', 'tokens,', 'then', 'start', 'with', 'the', 'header.', 'Background', '#0B0F17,', 'cards', 'one step', 'lighter.'];
    const p3More = () => (AHC.lang === 'en' ? p3MoreEn : p3MoreKo);
    AHC.onLang(() => { if (!p3) return; p3Base = U.html(p3); word = 0; p3.innerHTML = p3Base; });
    let vis = false, sec = 0, word = 0;
    const away = () => pwin.classList.contains('is-away');
    AHC.watch(pwin, (v) => { vis = v; }, '0px');
    document.addEventListener('ahc:view', (e) => orbs.forEach((o) => o.setPaused(e.detail !== 'pwin')));
    if (away()) orbs.forEach((o) => o.setPaused(true));
    if (!RM) setInterval(() => {
      if (!vis || away()) return;
      sec++;
      els.forEach((el) => { const s = Number(el.dataset.elapsed) + sec; U.set(el, s < 60 ? s + '초' : Math.floor(s / 60) + '분 ' + String(s % 60).padStart(2, '0') + '초'); });
      if (p3) {
        const more = p3More();
        word = (word + 1) % (more.length + 3);
        p3.innerHTML = p3Base + (word ? ' ' + more.slice(0, Math.min(word, more.length)).join(' ') : '');
      }
      const r = run && run.querySelector('.rl-el');
      if (r && ws === 'run') { const k = parseInt(r.textContent, 10) || 0; U.set(r, (k + 1) + '초'); }
    }, 1000);
  })();

  /* ================= 04 현황 ↔ 분할 화면 (한 틀 · 탭) ================= */
  (function viewSwitch() {
    const tabs = Array.prototype.slice.call(document.querySelectorAll('.vswitch [role="tab"]'));
    if (!tabs.length) return;
    const reset = $('ov-reset');
    const caps = Array.prototype.slice.call(document.querySelectorAll('.ovw-bar [data-for]'));
    function show(view, focus) {
      tabs.forEach((t) => {
        const on = t.dataset.view === view, panel = $(t.dataset.view);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panel) {
          panel.classList.toggle('is-away', !on);
          if (on) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
        }
        if (on && focus) t.focus();
      });
      caps.forEach((c) => { c.hidden = c.dataset.for !== view; });
      if (reset) reset.hidden = view !== 'owin';
      document.dispatchEvent(new CustomEvent('ahc:view', { detail: view }));
    }
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
    tabs[0].parentElement.addEventListener('keydown', (e) => {
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length
        : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault();
      show(tabs[j].dataset.view, true);
    });
    show('owin');
  })();
})();
