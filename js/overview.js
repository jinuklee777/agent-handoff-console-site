/* 현황(⌃⌘0) — 앱의 화면(UI/OverviewView.swift)과 판정(App/Overview.swift)을 그대로 옮겨 그린다.
   행과 카드는 아래 자료에서 그리고, 허용 · 거절 · 질문 답 · 자동 인계 카운트다운(보일 때만 센다) · 멈추고 검토 · 지금 넘기기 ·
   중단 · 상태순/프로젝트순 · ↑↓ 고르기를 받는다. 앱 화면의 글은 한국어 그대로, 사이트의 짧은 말만 두 언어.
   화면은 위쪽만 잘라 보인다 (머리 · 수 · 응답 필요 · 일하는 중) — 앱 아래쪽의 사용 한도 · 최근 끝난 실행은 사이트에서 뺐다. */
(function () {
  'use strict';
  const root = document.getElementById('ov');
  if (!root) return;
  const AHC = window.AHC || { RM: false, T: (en) => en, onLang() {}, watch(el, fn) { fn(true); } };
  const RM = AHC.RM;
  const $ = (id) => document.getElementById(id);
  const U = AHC.ui || { t: (s) => s, h: (s) => s, set(el, s) { if (el) el.textContent = s; }, setHTML(el, s) { if (el) el.innerHTML = s; }, html: (el) => el.innerHTML };
  const win = $('owin'), groupsBox = $('ov-groups');
  const EASE = 'cubic-bezier(.16, 1, .3, 1)', EASE_IO = 'cubic-bezier(.65, 0, .35, 1)';
  const TINT = { claude: '#D97757', codex: '#F0EFEC', gemini: '#6FA3FF' };   // 앱의 어두운 화면
  const NAME = { claude: 'Claude', codex: 'Codex', gemini: 'Antigravity' };

  /* ---------- 시각 ---------- */
  const T0 = Date.now() / 1000;
  const CLOCK0 = 13 * 3600 + 41 * 60;           // 시연의 지금: 13:41
  const now = () => Date.now() / 1000;
  const clock = (t) => { const s = Math.floor(CLOCK0 + (t - T0)); const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  // DisplayFormat.elapsed — "0초" · "59초" · "1분 05초"
  const elapsed = (s) => { s = Math.max(0, Math.floor(s)); return s < 60 ? s + '초' : s < 3600 ? Math.floor(s / 60) + '분 ' + String(s % 60).padStart(2, '0') + '초' : Math.floor(s / 3600) + '시간 ' + Math.floor(s % 3600 / 60) + '분'; };
  // Overview.waitedText — "방금" · "2분째"
  const waited = (s) => (s < 60 ? '방금' : s < 3600 ? Math.floor(s / 60) + '분째' : Math.floor(s / 3600) + '시간 ' + Math.floor(s % 3600 / 60) + '분째');

  /* ---------- 자료 (처음 상태) ---------- */
  const DELAY = 10;     // 자동 인계 카운트다운 (설정 > 인계의 기본 10초)
  let state;
  function initial() {
    const t = now();
    return {
      sort: 'status',
      sel: null,
      done: 18,
      items: [
        { id: 'onb', title: '온보딩 화면 다듬기', project: 'moa-ios', branch: 'feature/onboarding-polish', provider: 'claude', kind: 'approval', since: t - 150, runStart: t - 236, running: true,
          line: 'Claude: 명령을 실행하려고 합니다', code: 'xcodebuild test -scheme Moa', meta: ['Opus 5.5 · High'] },
        { id: 'hook', title: '결제 웹훅 재시도 큐', project: 'moa-server', branch: 'main', provider: 'codex', kind: 'question', since: t - 22, runStart: t - 95, running: true,
          prompt: '재시도 간격의 상한을 몇 초로 둘까요?', options: ['30초', '60초'], meta: ['GPT-6 Sol · High'] },
        { id: 'cache', title: '주문 API 응답 캐시', project: 'moa-server', branch: 'feature/cache', provider: 'claude', kind: 'countdown', since: t - 3, running: false, left: DELAY, target: 'Codex' },
        { id: 'login', title: '로그인 401 재시도 처리', project: 'moa-ios', branch: 'feature/login-retry', provider: 'codex', kind: 'working', since: t - 72, running: true,
          activity: '명령 실행 중', detail: 'swift test', work: 'working', meta: ['GPT-6 Sol · High'] },
        { id: 'landing', title: '랜딩 페이지 다크 모드', project: 'moa-web', branch: 'main', provider: 'gemini', kind: 'working', since: t - 38, running: true,
          activity: '답변을 쓰는 중', work: 'connecting', meta: ['Gemini 3.8 Flash'] },
        { id: 'deeplink', title: '푸시 알림 딥링크', project: 'moa-ios', branch: 'feature/deeplink', provider: 'claude', kind: 'background', left: 2, since: t - 123, running: true,
          activity: '백그라운드 작업 2개를 기다리는 중', work: 'weaving', meta: ['Opus 5.5 · High', '하위 3 · 1 완료'],
          subtasks: [
            { title: 'TokenStore 를 부르는 곳 찾기', status: '완료', done: true },
            { title: 'review-changes', startedAt: t - 70, done: false },
            { title: 'swift test --parallel', status: '백그라운드 명령', done: false },
          ] },
      ],
    };
  }

  /* ---------- 판정 (App/Overview.swift 그대로) ---------- */
  const RANK = { approval: 0, question: 0, review: 0, countdown: 1, working: 2, background: 3 };
  const needsResponse = (it) => RANK[it.kind] <= 1;
  const waitsOnPerson = (it) => RANK[it.kind] === 0;
  const ordered = (items) => items.slice().sort((a, b) => (RANK[a.kind] - RANK[b.kind]) || (a.since - b.since) || (a.id < b.id ? -1 : 1));
  function counts(items) {
    const c = { waiting: 0, countdowns: 0, running: 0, working: 0, background: 0, backgroundTasks: 0 };
    items.forEach((it) => {
      if (it.running) c.running++;
      if (it.kind === 'countdown') c.countdowns++;
      else if (it.kind === 'working') c.working++;
      else if (it.kind === 'background') { c.background++; c.backgroundTasks += it.left; }
      else c.waiting++;
    });
    return c;
  }
  function headline(c) {
    if (AHC.lang === 'en') {
      const tail = [];
      if (c.waiting > 0) tail.push(c.waiting + (c.waiting === 1 ? ' is' : ' are') + ' waiting on you');
      if (c.countdowns > 0) tail.push(c.countdowns + ' will hand off automatically soon');
      const after = tail.length ? ' ' + tail.join(', and ') + '.' : '';
      if (c.running <= 0) return tail.length ? 'No agents are running.' + after : 'No agents are running';
      return c.running + (c.running === 1 ? ' agent is' : ' agents are') + ' running.' + after;
    }
    const tail = [];
    if (c.waiting > 0) tail.push(c.waiting + '개가 답을 기다립니다');
    if (c.countdowns > 0) tail.push(c.countdowns + '개는 곧 자동으로 인계합니다');
    const after = tail.length === 0 ? '' : tail.length === 1 ? ' ' + tail[0] + '.' : ' ' + tail[0].replace('기다립니다', '기다리고') + ', ' + tail[1] + '.';
    if (c.running <= 0) return tail.length ? '실행 중인 에이전트는 없습니다.' + after : '지금 실행 중인 에이전트가 없습니다';
    return '에이전트 ' + c.running + '개가 실행 중입니다.' + after;
  }
  function groups(items, sort) {
    const o = ordered(items);
    if (sort === 'status') {
      const needs = o.filter(needsResponse), work = o.filter((i) => !needsResponse(i));
      const out = [];
      if (needs.length) {
        const cd = needs.filter((i) => i.kind === 'countdown').length, w = needs.length - cd;
        out.push({ key: 'needs', role: 'needs', title: w > 0 ? '응답 필요 ' + w : '자동 인계 대기 ' + cd, note: w > 0 && cd > 0 ? '자동 인계 대기 ' + cd : '', items: needs });
      }
      if (work.length) {
        const bg = work.filter((i) => i.kind === 'background').length;
        out.push({ key: 'working', role: 'working', title: '일하는 중 ' + work.length, note: bg > 0 ? '백그라운드 대기 ' + bg + ' 포함' : '', items: work });
      }
      return out;
    }
    const names = [];
    o.forEach((i) => { if (names.indexOf(i.project) < 0) names.push(i.project); });
    return names.map((name) => {
      const rows = o.filter((i) => i.project === name);
      const w = rows.filter(waitsOnPerson).length, run = rows.filter((i) => i.running).length;
      return { key: 'p|' + name, role: 'project', title: name, note: w > 0 ? '응답 필요 ' + w + ' · 실행 ' + run : '실행 ' + run, items: rows };
    });
  }
  const statusText = (it) => ({ approval: '승인 대기', question: '질문 대기', review: '인계 검토 필요', countdown: '자동 인계 대기' }[it.kind] || '일하는 중');

  /* ---------- 요소 ---------- */
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function el(html) { const t = document.createElement('template'); t.innerHTML = U.h(html.trim()); return t.content.firstElementChild; }
  function titleHTML(it, spin) {
    return '<div class="ot"><span class="om' + (spin ? ' spin' : '') + '" data-agent="' + it.provider + '" role="img" aria-label="' + NAME[it.provider] + (it.running ? ' 실행 중' : '') + '"><i class="ad" data-agent="' + it.provider + '"></i></span>'
      + '<span class="ot-tt"><button type="button" class="ot-n" data-act="open" title="이 대화로 갑니다">' + esc(it.title) + '</button>'
      + '<span class="ot-p">' + esc(it.project) + (it.branch ? ' — ' + esc(it.branch) : '') + '</span></span></div>';
  }
  function rowBody(it) {
    if (it.kind === 'approval') {
      return '<div class="or-appr"><div class="or-det"><p class="or-line">' + esc(it.line) + '</p><code class="or-code">' + esc(it.code) + '</code></div>'
        + '<div class="or-btns"><button type="button" class="chip-b" data-act="deny" title="거절합니다 — 사유를 적으려면 대화에서 답하세요">거절</button>'
        + '<button type="button" class="ink-b" data-act="allow" title="이 요청을 허용합니다">허용</button>'
        + '<button type="button" class="or-chev" data-act="open" title="대화를 열어 카드 전체를 봅니다" aria-label="대화 열기"><svg aria-hidden="true"><use href="#i-chev"/></svg></button></div></div>';
    }
    if (it.kind === 'question') {
      return '<p class="or-q">' + esc(it.prompt) + '</p><div class="or-qa">'
        + it.options.map((o) => '<button type="button" class="chip-b" data-act="answer" data-v="' + esc(o) + '">' + esc(o) + '</button>').join('')
        + '<button type="button" class="txt-b" data-act="type">직접 입력…</button><button type="button" class="ink-b" data-act="open">대화 열기</button></div>';
    }
    if (it.kind === 'countdown') {
      return '<div class="or-cd"><span class="or-ring" aria-hidden="true"><svg viewBox="0 0 30 30"><circle class="tr" cx="15" cy="15" r="13.5"/><circle class="ar" cx="15" cy="15" r="13.5" pathLength="100"/></svg></span>'
        + '<div class="or-cdl"><p>' + NAME[it.provider] + ' 의 사용 한도에 닿았습니다.</p><p class="or-left" aria-label="자동 인계 대기">' + it.left + '초 뒤 ' + it.target + ' 에게 넘깁니다</p></div>'
        + '<div class="or-hold"><button type="button" class="chip-b" data-act="review" title="카운트다운을 멈추고 인계 카드를 엽니다">멈추고 검토</button>'
        + '<button type="button" class="ink-b" data-act="send" title="기다리지 않고 지금 넘깁니다">지금 넘기기</button></div></div>';
    }
    return '<div class="or-open"><button type="button" class="ink-b" data-act="open-card">인계 카드 열기</button></div>';
  }
  function rowEl(it) {
    const t = now();
    const st = it.kind === 'countdown'
      ? '<span class="or-st"><b>' + statusText(it) + '</b></span>'
      : '<span class="or-st"><i></i><b>' + statusText(it) + '</b><span class="or-w">· ' + waited(t - it.since) + '</span></span>';
    return el('<article class="or" data-id="' + it.id + '"><div class="or-top">' + titleHTML(it, false) + st + '</div><div class="or-body">' + rowBody(it) + '</div></article>');
  }
  function cardElapsed(it, t) { return (it.kind === 'background' ? '기다린 지 ' : '') + elapsed(t - it.since); }
  function subtaskText(s, t) { return s.done ? s.status : (s.status || elapsed(t - s.startedAt)); }
  function cardEl(it) {
    const t = now(), bg = it.kind === 'background';
    const subs = (it.subtasks && it.subtasks.length) ? '<div class="oc-subs">' + it.subtasks.map((s, k) => '<p><i class="' + (s.done ? 'ok' : '') + '">' + (s.done ? '✓' : '◌') + '</i>' + esc(s.title) + '<em data-sub="' + k + '">· ' + esc(subtaskText(s, t)) + '</em></p>').join('') + '</div>' : '';
    const node = el('<article class="oc" data-id="' + it.id + '">'
      + '<div class="oc-top">' + titleHTML(it, it.running) + '<span class="oc-el">' + cardElapsed(it, t) + '</span><span class="oc-cmp">' + (bg ? '백그라운드 ' + it.left : esc(it.activity || '일하는 중')) + '</span></div>'
      + '<div class="oc-act"><canvas width="20" height="20" aria-hidden="true"></canvas><span>' + esc(it.activity || '일하는 중') + '</span>' + (it.detail ? '<code>' + esc(it.detail) + '</code>' : '') + '</div>'
      + subs
      + '<div class="oc-foot"><span class="oc-meta">' + esc((it.meta || []).join(' · ')) + '</span><button type="button" class="chip-b" data-act="open">열기</button>'
      + (it.running ? '<button type="button" class="chip-b" data-act="stop" title="' + (bg ? '남은 백그라운드 작업까지 이 실행을 멈춥니다 (⌘. 와 같다)' : '이 실행을 멈춥니다 (⌘. 와 같다)') + '">' + (bg ? '백그라운드 작업까지 중단' : '중단') + '</button>' : '')
      + '</div></article>');
    // 점 구는 멈춘 한 장면 — 움직이는 것은 머리의 링 하나 (앱과 같다)
    if (window.Orbs) node._orb = window.Orbs.create(node.querySelector('canvas'), { mode: it.work || 'solving', tint: TINT[it.provider], paused: true, t: 1.7 });
    return node;
  }

  /* ---------- 그리기 ---------- */
  const els = new Map();       // id → { node, sig }
  const groupEls = new Map();  // key → section
  const sig = (it) => (needsResponse(it) ? 'row:' : 'card:') + it.kind + ':' + it.provider;
  function nodeFor(it) {
    const rec = els.get(it.id);
    if (rec && rec.sig === sig(it)) return rec.node;
    if (rec) dispose(rec.node);
    const node = needsResponse(it) ? rowEl(it) : cardEl(it);
    els.set(it.id, { node, sig: sig(it) });
    return node;
  }
  function dispose(node) { if (node._orb) node._orb.destroy(); node.remove(); }
  function groupEl(g) {
    let gel = groupEls.get(g.key);
    if (!gel) {
      gel = el('<section class="ov-g" data-g="' + esc(g.key) + '"><div class="ov-gh"><b></b><span class="ov-gn"></span><span class="ov-keys">↑ ↓ 고르기 · ↵ 대화 열기 · ⌥⌘↵ 허용</span></div><div class="ov-needs"></div><div class="ov-cards"></div></section>');
      groupEls.set(g.key, gel);
    }
    U.set(gel.querySelector('.ov-gh b'), g.title);
    const note = gel.querySelector('.ov-gn');
    U.set(note, g.note ? '· ' + g.note : '');
    note.hidden = !g.note;
    gel.querySelector('.ov-keys').hidden = g.role !== 'needs';
    return gel;
  }

  // 창 높이가 바뀌면 이어지게 (현황은 안쪽 스크롤 없이 화면 전체를 담는다)
  function animateHeight(h0) {
    if (RM) return;
    const h1 = root.offsetHeight;
    if (Math.abs(h1 - h0) < 1) return;
    root.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 520, easing: EASE });
  }
  const MOVERS = '.or, .oc, .ov-g > .ov-gh, .ov-sec';

  function render(animate) {
    animate = animate && !RM;
    const before = new Map();
    const h0 = root.offsetHeight;
    if (animate) root.querySelectorAll(MOVERS).forEach((n) => before.set(n, n.getBoundingClientRect()));
    const gs = groups(state.items, state.sort);
    const keep = new Set();
    gs.forEach((g, gi) => {
      const gel = groupEl(g);
      keep.add(g.key);
      if (groupsBox.children[gi] !== gel) groupsBox.insertBefore(gel, groupsBox.children[gi] || null);
      const needsBox = gel.querySelector('.ov-needs'), cardsBox = gel.querySelector('.ov-cards');
      let ni = 0, ci = 0;
      g.items.forEach((it) => {
        const node = nodeFor(it);
        const box = needsResponse(it) ? needsBox : cardsBox;
        const idx = needsResponse(it) ? ni++ : ci++;
        if (box.children[idx] !== node) box.insertBefore(node, box.children[idx] || null);
      });
      while (needsBox.children.length > ni) needsBox.lastElementChild.remove();
      while (cardsBox.children.length > ci) cardsBox.lastElementChild.remove();
    });
    groupEls.forEach((gel, key) => { if (!keep.has(key)) { gel.remove(); groupEls.delete(key); } });
    const ids = new Set(state.items.map((i) => i.id));
    els.forEach((rec, id) => { if (!ids.has(id)) { dispose(rec.node); els.delete(id); } });
    // 고른 행 — 없으면 맨 앞 (앱은 첫 행을 고른다)
    const flat = gs.reduce((a, g) => a.concat(g.items.map((i) => i.id)), []);
    if (!state.sel || flat.indexOf(state.sel) < 0) state.sel = flat[0] || null;
    els.forEach((rec, id) => rec.node.classList.toggle('sel', id === state.sel));
    summary();
    tick(false);
    if (animate) {
      animateHeight(h0);
      root.querySelectorAll(MOVERS).forEach((n) => {
        const a = before.get(n);
        if (!a) { n.animate([{ opacity: 0, transform: 'translateY(8px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EASE }); return; }
        const b = n.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) > .5 || Math.abs(dy) > .5) n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 520, easing: EASE });
      });
    }
  }

  function summary() {
    const c = counts(state.items);
    $('ov-hl').textContent = headline(c);
    $('ovt-dot').classList.toggle('on', c.waiting > 0);
    $('ovt-wait').textContent = c.waiting;
    setSub('ovt-wait-s', c.countdowns > 0 ? '· 자동 인계 대기 ' + c.countdowns : '');
    $('ovt-work').textContent = c.working;
    $('ovt-bg').textContent = c.background;
    setSub('ovt-bg-s', c.backgroundTasks > 0 ? '· 하위 작업 ' + c.backgroundTasks : '');
    $('ovt-done').textContent = state.done;
    U.set($('ov-sum-run'), '실행 ' + c.running);
    U.set($('ov-sum-n'), '응답 ' + c.waiting);
    $('ov-sum-w').classList.toggle('off', c.waiting === 0);
    empty(c);
  }
  function setSub(id, text) { const n = $(id); U.set(n, text); n.hidden = !text; }
  function empty(c) {
    let box = root.querySelector('.ov-empty');
    const none = state.items.length === 0;
    root.querySelector('.ov-tiles').hidden = none;
    root.querySelector('.ov-sum').hidden = none;
    if (none && !box) {
      box = el('<div class="ov-empty"><svg aria-hidden="true"><use href="#i-pulse"/></svg><p><b>지금 실행 중인 에이전트가 없습니다</b><span></span></p><div><span class="ink-b">새 대화 ⌘N</span><span class="chip-b">에이전트 기록</span></div></div>');
      groupsBox.after(box);
    }
    if (box) {
      box.hidden = !none;
      box.querySelector('p span').textContent = AHC.T('Last run ' + clock(now()) + ' · ' + state.done + ' finished today · nothing to check', '마지막 실행 ' + clock(now()) + ' · 오늘 끝난 실행 ' + state.done + ' · 확인할 것 없음');
    }
    if (c) { /* 수는 머리 한 문장이 이미 말한다 */ }
  }

  /* ---------- 1초마다: 시계 · 기다린 시간 · 카운트다운 ---------- */
  let visible = false, timer = 0;
  function tick(advance) {
    const t = now();
    state.items.forEach((it) => {
      const rec = els.get(it.id);
      if (!rec) return;
      const n = rec.node;
      if (it.kind === 'countdown') {
        if (advance && visible && !RM && !win.classList.contains('is-away')) it.left = Math.max(0, it.left - 1);
        const left = n.querySelector('.or-left');
        if (left) U.set(left, it.left + '초 뒤 ' + it.target + ' 에게 넘깁니다');
        const arc = n.querySelector('.ar');
        if (arc) arc.style.strokeDashoffset = String(100 - (100 * it.left) / DELAY);
        if (advance && it.left <= 0 && !it.busy) sendNow(it.id);
      } else if (needsResponse(it)) {
        const w = n.querySelector('.or-w');
        if (w) U.set(w, '· ' + waited(t - it.since));
      } else {
        const e = n.querySelector('.oc-el');
        if (e) U.set(e, cardElapsed(it, t));
        (it.subtasks || []).forEach((s, k) => {
          if (s.done || s.status) return;
          const em = n.querySelector('[data-sub="' + k + '"]');
          if (em) U.set(em, '· ' + subtaskText(s, t));
        });
      }
    });
  }
  function startTimer() { if (!timer) timer = setInterval(() => tick(true), 1000); }
  function stopTimer() { if (timer) clearInterval(timer); timer = 0; }
  AHC.watch(root, (on) => { visible = on; if (on) startTimer(); else stopTimer(); }, '-12% 0px -12% 0px');

  /* ---------- 동작 ---------- */
  const find = (id) => state.items.find((i) => i.id === id);
  function collapse(node) {
    return new Promise((resolve) => {
      if (RM) { resolve(); return; }
      const h = node.offsetHeight;
      node.style.overflow = 'hidden';
      const anim = node.animate([
        { height: h + 'px', opacity: 1, marginBottom: '0px' },
        { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', marginBottom: '-8px' },
      ], { duration: 420, easing: EASE_IO, fill: 'forwards' });
      anim.onfinish = () => resolve();
    });
  }
  function fadeOut(node) {
    return new Promise((resolve) => {
      if (RM) { resolve(); return; }
      const anim = node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 300, easing: EASE_IO, fill: 'forwards' });
      anim.onfinish = () => resolve();
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, RM ? 0 : ms));
  function lock(node) { node.querySelectorAll('button').forEach((b) => { if (!b.classList.contains('ot-n') && b.dataset.act !== 'open') b.disabled = true; }); }

  // 허용 · 거절 · 질문 답 — 요청이 풀리면 그 실행은 다시 일하는 중이 된다 (앱의 respondFromOverview · answerFromOverview)
  async function resolveTo(id, next, delay) {
    const it = find(id), rec = els.get(id);
    if (!it || !rec || it.busy) return;
    it.busy = true;
    lock(rec.node);
    await wait(delay);
    await collapse(rec.node);
    Object.assign(it, next, { busy: false });
    render(true);
  }
  function allow(id) {
    const it = find(id);
    if (!it || it.kind !== 'approval') return;
    resolveTo(id, { kind: 'working', since: it.runStart, activity: '명령 실행 중', detail: it.code, work: 'working' }, 200);
  }
  function deny(id) {
    const it = find(id);
    if (!it || it.kind !== 'approval') return;
    resolveTo(id, { kind: 'working', since: it.runStart, activity: '생각하는 중', detail: null, work: 'solving' }, 200);
  }
  function answer(id, button) {
    const it = find(id), rec = els.get(id);
    if (!it || !rec || it.kind !== 'question' || it.busy) return;
    button.classList.add('picked');
    resolveTo(id, { kind: 'working', since: it.runStart, activity: '생각하는 중', detail: null, work: 'solving' }, 500);
  }
  // 멈추고 검토 — 앱은 카운트다운을 멈추고 그 대화의 인계 카드로 간다. 사람이 멈춘 카드는 현황 목록에서 빠진다.
  async function review(id, button) {
    const it = find(id), rec = els.get(id);
    if (!it || !rec || it.kind !== 'countdown' || it.busy) return;
    it.busy = true;
    lock(rec.node);
    showTip(button || rec.node, TIPS.review());
    await wait(900);
    await collapse(rec.node);
    state.items = state.items.filter((i) => i !== it);
    render(true);
  }
  // 지금 넘기기 · 0초 — 받는 쪽(Codex)이 인계 문서로 일을 시작한다
  async function sendNow(id) {
    const it = find(id), rec = els.get(id);
    if (!it || !rec || it.kind !== 'countdown' || it.busy) return;
    resolveTo(id, { provider: 'codex', kind: 'working', running: true, since: now(), activity: '생각하는 중', detail: null, work: 'solving', meta: ['GPT-6 Sol · High'] }, 300);
  }
  // 중단 — 실행이 멈추면 현황에서 빠지고 오늘 끝난 실행 수가 는다
  async function stop(id) {
    const it = find(id), rec = els.get(id);
    if (!it || !rec || it.busy) return;
    it.busy = true;
    lock(rec.node);
    const act = rec.node.querySelector('.oc-act span');
    if (act) U.set(act, '멈추는 중');
    if (rec.node._orb) rec.node._orb.setMode('breathing');
    rec.node.classList.add('is-stopped');
    await wait(900);
    await fadeOut(rec.node);
    state.items = state.items.filter((i) => i !== it);
    state.done += 1;
    render(true);
  }

  /* ---------- 사이트의 짧은 말 (앱이 아니라 시연에 대한 말) ---------- */
  const tip = $('ov-tip');
  let tipTimer = 0;
  function showTip(node, text) {
    if (!tip) return;
    tip.textContent = text;
    tip.classList.add('on');
    const w = win.getBoundingClientRect(), r = node.getBoundingClientRect();
    const x = Math.max(10, Math.min(w.width - tip.offsetWidth - 10, r.left - w.left + r.width / 2 - tip.offsetWidth / 2));
    let y = r.top - w.top - tip.offsetHeight - 10;
    if (y < 52) y = r.bottom - w.top + 10;
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip.classList.remove('on'), 2400);
  }
  const TIPS = {
    open: () => AHC.T('In the app, this opens the conversation.', '앱에서는 이 대화로 갑니다.'),
    'open-card': () => AHC.T('In the app, this opens the handoff card.', '앱에서는 인계 카드로 갑니다.'),
    review: () => AHC.T('In the app, the countdown stops and the handoff card opens.', '앱에서는 카운트다운을 멈추고 이 대화의 인계 카드로 갑니다.'),
    type: () => AHC.T('In the app, you type the answer in the conversation.', '앱에서는 대화에서 답을 직접 적습니다.'),
    history: () => AHC.T('In the app, this opens Agent history.', '앱에서는 에이전트 기록이 열립니다.'),
  };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-open]');
    const card = e.target.closest('.or, .oc');
    const id = card ? card.dataset.id : null;
    if (id) select(id);
    if (!b) return;
    if (b.dataset.open === 'history') { showTip(b, TIPS.history()); return; }
    switch (b.dataset.act) {
      case 'allow': allow(id); break;
      case 'deny': deny(id); break;
      case 'answer': answer(id, b); break;
      case 'review': review(id, b); break;
      case 'send': sendNow(id); break;
      case 'stop': stop(id); break;
      case 'open': showTip(b, TIPS.open()); break;
      case 'open-card': showTip(b, TIPS['open-card']()); break;
      case 'type': showTip(b, TIPS.type()); break;
      default: break;
    }
  });
  function select(id) {
    state.sel = id;
    els.forEach((rec, k) => rec.node.classList.toggle('sel', k === id));
  }
  // ↑ ↓ 고르기 · ↵ 대화 열기 · ⌥⌘↵ 허용 · ⌥⌘⌫ 거절 (현황에 포커스가 있을 때)
  root.addEventListener('keydown', (e) => {
    if (e.target !== root && e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
    const flat = groups(state.items, state.sort).reduce((a, g) => a.concat(g.items.map((i) => i.id)), []);
    if (!flat.length) return;
    const at = Math.max(0, flat.indexOf(state.sel));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = flat[Math.max(0, Math.min(flat.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))];
      select(next);
      const rec = els.get(next);
      if (rec) rec.node.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
    } else if (e.key === 'Enter' && e.altKey && e.metaKey) {
      e.preventDefault(); allow(state.sel);
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && e.altKey && e.metaKey) {
      e.preventDefault(); deny(state.sel);
    } else if (e.key === 'Enter' && e.target === root) {
      e.preventDefault();
      const rec = els.get(state.sel);
      if (rec) showTip(rec.node.querySelector('.ot-n'), TIPS.open());
    }
  });

  // 상태순 · 프로젝트순
  const seg = root.querySelector('.ov-seg');
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b || b.dataset.sort === state.sort) return;
    state.sort = b.dataset.sort;
    seg.querySelectorAll('[data-sort]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    render(true);
  });
  seg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const other = seg.querySelector('[data-sort="' + (state.sort === 'status' ? 'project' : 'status') + '"]');
    other.click();
    other.focus();
  });

  // 처음부터
  $('ov-reset').addEventListener('click', () => {
    const h0 = root.offsetHeight;
    els.forEach((rec) => dispose(rec.node));
    els.clear();
    groupEls.forEach((g) => g.remove());
    groupEls.clear();
    state = initial();
    seg.querySelectorAll('[data-sort]').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.sort === 'status')));
    render(false);
    animateHeight(h0);
    if (!RM) win.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 420, easing: EASE });
  });

  state = initial();
  render(false);
  // 언어를 바꾸면 행 · 카드를 그 언어로 새로 만든다 (고른 행 · 정렬 · 상태는 그대로)
  AHC.onLang(() => {
    els.forEach((rec) => dispose(rec.node)); els.clear();
    groupEls.forEach((g) => g.remove()); groupEls.clear();
    const box = root.querySelector('.ov-empty'); if (box) box.remove();
    render(false);
  });
})();
