/* 히어로의 앱 창: Claude 가 일하다 한도에 닿고 → 인계 카드 → 커서가 확인하고 넘기면 → Codex 가 이어서 일한다.
   모든 상태는 "고리 안의 시각 t" 의 함수다 (render(t)) — 몇 바퀴를 돌아도 어긋나지 않고, 멈추고 되감을 수 있다. */
(function () {
  'use strict';
  const win = document.getElementById('demo');
  if (!win) return;
  const AHC = window.AHC || { RM: false, watch() {}, T: (a) => a };
  const RM = AHC.RM;
  const tilt = document.getElementById('tilt');
  const stream = document.getElementById('d-stream');
  const col = document.getElementById('d-col');
  const notesBox = tilt.querySelector('.notes');
  const notePath = document.getElementById('note-path');
  const noteDot = document.getElementById('note-dot');
  const noteHalo = document.getElementById('note-halo');
  const cursor = document.getElementById('d-cursor');
  const prog = document.getElementById('demo-prog');
  const btnPlay = document.getElementById('demo-play');
  const btnReplay = document.getElementById('demo-replay');
  const $ = (id) => document.getElementById(id);
  const U = AHC.ui || { t: (s) => s, h: (s) => s, set(el, s) { if (el) el.textContent = s; }, setHTML(el, s) { if (el) el.innerHTML = s; }, html: (el) => el.innerHTML };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* ---------- 시간표 (초) ---------- */
  const LOOP = 19.4;
  const END = 16.6; // 움직임 줄이기 · 스크립트 없음과 같은 마지막 모습
  const START = 3.05; // 처음 한 번은 Claude 의 첫 답과 실행 줄이 이미 있는 자리에서 시작한다 (그다음 바퀴부터는 0 에서)
  const SHOW = [
    ['ch', 0.2], ['cx1', 0.85], ['cp1', 1.15], ['cx2', 3.1], ['f1', 3.2], ['f2', 3.42], ['f3', 3.64], ['cp2', 4.05],
    ['limit', 5.1], ['cfiles', 5.35], ['cfoot', 5.5],
    ['card', 6.15], ['card1', 6.35], ['card2', 6.6], ['r1', 6.7], ['r2', 6.82], ['r3', 6.94], ['r4', 7.06], ['card3', 7.3],
    ['div', 9.95], ['xh', 10.6], ['xp1', 10.9], ['xx1', 12.45], ['f4', 12.8], ['f5', 13.05], ['f6', 13.3], ['xp2', 14.2],
    ['xfiles', 15.45], ['xfoot', 15.6],
  ];
  const RANGE = [['runc', 0.3, 5.1], ['runx', 10.6, 15.55]];
  const STREAM = { cp1: [1.15, 3.0], cp2: [4.05, 4.7], xp1: [10.9, 12.35], xp2: [14.2, 15.35] };
  const FOLD = 9.95, STREAK = 10.1, DELIVERED = 15.6, FADE = 18.5;
  const RUN_C = [[0.3, 'solving', '생각하는 중'], [0.85, 'searching', '파일 찾는 중 · AuthError'], [1.15, 'connecting', '답변을 쓰는 중'],
    [3.1, 'shaping', '파일 고치는 중 · Moa/Auth/AuthTransport.swift'], [3.75, 'working', '명령 실행 중 · swift build'],
    [4.05, 'connecting', '답변을 쓰는 중'], [4.75, 'solving', '생각하는 중']];
  const RUN_X = [[10.6, 'solving', '생각하는 중'], [10.9, 'connecting', '답변을 쓰는 중'], [12.45, 'searching', '파일 찾는 중 · LoginView'],
    [12.75, 'shaping', '파일 고치는 중 · Moa/Login/LoginView.swift'], [13.6, 'working', '명령 실행 중 · swift test'],
    [14.2, 'connecting', '답변을 쓰는 중']];
  const NOTES = [[1, 5.1, 6.9], [2, 6.9, 8.4], [3, 8.4, 10.3], [4, 10.6, 17.8]];
  const CUR = { on: 5.3, toHand: [5.35, 5.95], pressHand: 6.0, toCheck: [7.75, 8.55], pressCheck: 8.6, checked: 8.65, enabled: 8.7, toSend: [8.95, 9.6], pressSend: 9.65, off: 10.0 };
  const HAS_CARD = 6.1;
  const COMP = [[0, 'claude-run'], [5.1, 'claude-idle'], [6.15, 'hold'], [10.25, 'deliver'], [15.7, 'codex']];

  /* ---------- 요소 ---------- */
  const E = {};
  win.querySelectorAll('[data-at]').forEach((el) => { (E[el.dataset.at] = E[el.dataset.at] || []).push(el); el.hidden = false; });
  // 흐르는 글: 낱말 단위로 나눈다 (코드 조각은 한 덩어리). 글은 그 언어의 것 (U.html — 언어를 바꾸면 다시 나눈다)
  const TOK = {};
  function tokenize(k) {
    const p = E[k] && E[k][0];
    if (!p) return;
    const holder = document.createElement('div');
    holder.innerHTML = U.html(p);
    const parts = Array.prototype.slice.call(holder.childNodes);
    p.textContent = '';
    TOK[k] = { list: [], n: -1 };
    parts.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(?<=\s)/).forEach((w) => {
          if (!w) return;
          const s = document.createElement('span');
          s.className = 'tk'; s.textContent = w;
          p.appendChild(s); TOK[k].list.push(s);
        });
      } else {
        const s = document.createElement('span');
        s.className = 'tk'; s.appendChild(node);
        p.appendChild(s); TOK[k].list.push(s);
      }
    });
  }
  Object.keys(STREAM).forEach(tokenize);
  win.classList.add('is-live');
  const shown = new Map();
  function setShown(name, on, animate) {
    (E[name] || []).forEach((el) => {
      if (!!shown.get(el) === on) return;
      shown.set(el, on);
      el.classList.toggle('shown', on);
      el.classList.toggle('enter', on && animate);
      dirty = true;
    });
  }
  function setStream(name, n, animate) {
    const t = TOK[name];
    if (!t || t.n === n) return;
    const L = t.list;
    for (let i = 0; i < L.length; i++) {
      const want = i < n;
      const on = L[i].classList.contains('on');
      if (want && !on) { L[i].classList.add('on'); L[i].classList.toggle('fresh', animate); }
      else if (!want && on) L[i].classList.remove('on', 'fresh');
    }
    t.n = n;
    dirty = true;
  }

  // 작은 캐시 — 같은 값이면 DOM 을 건드리지 않는다
  const last = {};
  function put(key, el, prop, v) {
    if (last[key] === v) return false;
    last[key] = v;
    if (prop === 'text') el.textContent = U.t(v);
    else if (prop === 'html') el.innerHTML = v;
    else if (prop === 'class') el.className = v;
    else el.setAttribute(prop, v);
    return true;
  }
  function toggle(key, el, cls, on) {
    if (last[key] === on) return;
    last[key] = on;
    el.classList.toggle(cls, on);
  }

  /* 점 구 (실행 중 상태 줄) */
  const orbs = {};
  if (window.Orbs) {
    win.querySelectorAll('canvas[data-orb]').forEach((c) => {
      const who = c.dataset.orb;
      orbs[who === 'claude' ? 'runc' : 'runx'] = window.Orbs.create(c, { mode: 'solving', tint: who === 'claude' ? '#D97757' : '#F0EFEC' });
    });
  }
  const runText = { runc: $('d-runc-t'), runx: $('d-runx-t') };
  const runEl = { runc: $('d-runc-el'), runx: $('d-runx-el') };
  function fakeElapsed(s) { // 실제 실행 시간처럼 — 바닥글의 2분 01초 · 1분 29초 와 맞춘다
    s = Math.max(0, Math.round(s));
    return s < 60 ? s + '초' : Math.floor(s / 60) + '분 ' + String(s % 60).padStart(2, '0') + '초';
  }

  /* 입력창 */
  const comp = $('d-comp'), ph = $('d-ph'), chipA = $('d-chip-a'), chipM = $('d-chip-m'), chipP = $('d-chip-p'), hint = $('d-hint'), sendBtn = $('d-sendbtn');
  const dot = (a) => '<i class="ad" data-agent="' + a + '"></i>';
  const hand = '<svg><use href="#i-hand"/></svg>';
  const COMPS = {
    'claude-run': { ph: 'Claude 에게 메시지…', a: dot('claude') + '<span>Claude</span>', m: 'Opus 5.5 · High', p: hand + '<span>승인 묻기</span>', hint: 'esc 두 번 · ⌘. 중단', send: 'is-run' },
    'claude-idle': { ph: 'Claude 에게 메시지…', a: dot('claude') + '<span>Claude</span>', m: 'Opus 5.5 · High', p: hand + '<span>승인 묻기</span>', hint: '', send: '' },
    hold: { ph: '인계가 끝나면 Codex 에게 이어서 보냅니다…', a: dot('claude') + '<span>Claude →</span>' + dot('codex') + '<span>Codex · <span class="tag-hold">인계 대기</span></span>', m: 'GPT-6 Sol · High', p: hand + '<span>폴더 안은 자동</span>', hint: '', send: '', hold: true },
    deliver: { ph: 'Codex 에게 넘긴 인계가 끝나면 이어서 보냅니다…', a: dot('codex') + '<span>Codex · 인계받아 일하는 중</span>', m: 'GPT-6 Sol · High', p: hand + '<span>폴더 안은 자동</span>', hint: 'esc 두 번 · ⌘. 중단', send: 'is-run' },
    codex: { ph: 'Codex 에게 메시지…', a: dot('codex') + '<span>Codex</span>', m: 'GPT-6 Sol · High', p: hand + '<span>폴더 안은 자동</span>', hint: '', send: '' },
  };
  function setComp(name) {
    if (last.comp === name) return;
    last.comp = name;
    const c = COMPS[name];
    ph.textContent = U.t(c.ph); chipA.innerHTML = U.h(c.a); chipM.textContent = c.m; chipP.innerHTML = U.h(c.p); hint.textContent = U.t(c.hint);
    sendBtn.className = 'cmp-send' + (c.send ? ' ' + c.send : '');
    comp.classList.toggle('is-hold', !!c.hold);
  }

  /* 인스펙터의 파일 수 */
  const sum = $('d-sum'), incl = $('d-incl'), allRow = $('d-all'), ncommit = $('d-ncommit');
  const fileAt = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map((k) => SHOW.find((s) => s[0] === k)[1]);

  /* 툴바 한도 칩 */
  const limC = $('d-lim-c'), limCbar = $('d-lim-c-bar'), limCn = $('d-lim-c-n'), limXn = $('d-lim-x-n');
  const limXbar = limXn ? limXn.parentElement.querySelector('.lim-bar i') : null;

  /* 사이드바 행 · 현황 행의 실행 수 */
  const row = $('d-row'), rowDot = $('d-row-dot'), rowRing = $('d-row-ring'), ovN = $('d-ov-n');

  /* 한도 줄 */
  const limitRow = $('d-limit'), handBtn = $('d-hand');

  /* 카드 · 구분 줄 */
  const cb = $('d-cb'), send = $('d-send'), div = $('d-div'), divSt = $('d-div-st');
  const fold = E.card ? E.card[0] : null;

  /* ---------- 한 장면 ---------- */
  let dirty = true, scrollY = 0, scrollTarget = 0;
  function render(t, animate) {
    for (let i = 0; i < SHOW.length; i++) setShown(SHOW[i][0], t >= SHOW[i][1], animate);
    for (let i = 0; i < RANGE.length; i++) setShown(RANGE[i][0], t >= RANGE[i][1] && t < RANGE[i][2], animate);
    for (const k in STREAM) {
      const [a, b] = STREAM[k];
      setStream(k, Math.round(clamp01((t - a) / (b - a)) * (TOK[k] ? TOK[k].list.length : 0)), animate);
    }

    // 실행 중 상태 줄
    [['runc', RUN_C, 0.3, 25], ['runx', RUN_X, 10.6, 19]].forEach(([k, list, t0, rate]) => {
      let cur = list[0];
      for (let i = 0; i < list.length; i++) if (t >= list[i][0]) cur = list[i];
      if (runText[k]) put(k + 't', runText[k], 'text', cur[2]);
      if (orbs[k] && last[k + 'm'] !== cur[1]) { last[k + 'm'] = cur[1]; orbs[k].setMode(cur[1]); }
      if (runEl[k]) put(k + 'e', runEl[k], 'text', fakeElapsed((t - t0) * rate));
    });

    // 인계 카드 접기 · 확인 · 넘기기
    if (limitRow) toggle('limcard', limitRow, 'has-card', t >= HAS_CARD);
    if (fold) toggle('fold', fold, 'is-folded', t >= FOLD);
    if (cb) toggle('cb', cb, 'on', t >= CUR.checked);
    if (send) toggle('send', send, 'is-off', t < CUR.enabled);
    if (div) toggle('streak', div, 'streaking', t >= STREAK && t < STREAK + 1.4);
    if (div) toggle('landed', div, 'landed', t >= DELIVERED);
    if (divSt) {
      const done = t >= DELIVERED;
      put('divst', divSt, 'text', (done ? '전달 확인' : '받는 쪽 실행 중') + ' · 파일 3개 · 약 1천 토큰');
      toggle('divgo', divSt, 'is-going', !done);
    }

    // 입력창
    let cs = COMP[0][1];
    for (let i = 0; i < COMP.length; i++) if (t >= COMP[i][0]) cs = COMP[i][1];
    setComp(cs);

    // 사이드바: 도는 에이전트
    const agent = t < 10.25 ? 'claude' : 'codex';
    put('rowdot', rowDot, 'data-agent', agent);
    put('rowring', rowRing, 'data-agent', agent);
    const running = (t >= 0.3 && t < 5.1) || (t >= 10.25 && t < 15.55);
    toggle('rowrun', row, 'is-running', running);
    if (ovN) toggle('ovn', ovN, 'is-off', !running);

    // 한도 칩
    const u = t < 4.3 ? 0.82 : t < 5.0 ? 0.82 + 0.18 * ease((t - 4.3) / 0.7) : 1;
    const lv = u >= 0.995 ? 'full' : 'warn';
    put('limcv', limCbar, 'style', 'transform:scaleX(' + u.toFixed(3) + ')');
    put('limcn', limCn, 'text', Math.round(u * 100) + '%');
    put('limcl', limC, 'data-level', lv);
    toggle('limflash', limC, 'flash', t >= 5.0 && t < 5.9);
    const ux = t < 10.6 ? 0.34 : 0.34 + 0.07 * clamp01((t - 10.6) / 4.95);
    put('limxn', limXn, 'text', Math.round(ux * 100) + '%');
    if (limXbar) put('limxv', limXbar, 'style', 'transform:scaleX(' + ux.toFixed(3) + ')');

    // 인스펙터의 수
    let n = 0;
    for (let i = 0; i < fileAt.length; i++) if (t >= fileAt[i]) n++;
    put('sum', sum, 'text', n ? '변경 파일 ' + n + '개' : '변경 파일 없음');
    put('incl', incl, 'text', n + '개 중 ' + n + '개 포함');
    put('ncommit', ncommit, 'text', String(n));
    toggle('all', allRow, 'is-empty', n === 0);

    toggle('fade', win, 'fading', t >= FADE);
    if (prog) prog.style.transform = 'scaleX(' + (t / LOOP).toFixed(4) + ')';
  }

  /* ---------- 위치 (기울기와 무관하게 레이아웃 좌표로) ---------- */
  function rel(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== tilt) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (col.contains(el)) y += scrollY;
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function follow(dt, snap) {
    const vh = stream.clientHeight;
    const h = col.offsetHeight;
    scrollTarget = Math.min(0, vh - h);
    scrollY = snap ? scrollTarget : scrollY + (scrollTarget - scrollY) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(scrollY - scrollTarget) < 0.3) scrollY = scrollTarget;
    col.style.transform = 'translate3d(0,' + scrollY.toFixed(2) + 'px,0)';
  }

  /* 커서 */
  function cursorAt(t) {
    if (t < CUR.on || t >= CUR.off) { toggle('curon', cursor, 'on', false); return; }
    toggle('curon', cursor, 'on', true);
    const main = win.querySelector('.w-main');
    const m = rel(main);
    const start = { x: m.x + m.w * 0.78, y: m.y + m.h - 60 };
    const cbR = rel(cb), sR = rel(send);
    const pCheck = { x: cbR.x + cbR.w / 2, y: cbR.y + cbR.h / 2 };
    const pSend = { x: sR.x + sR.w * 0.42, y: sR.y + sR.h * 0.55 };
    // 단추는 카드가 생기면 사라진다 — 누른 자리를 기억해 커서가 거기서 체크로 간다
    if (t < HAS_CARD && handBtn && handBtn.offsetParent) { const hR = rel(handBtn); handAt = { x: hR.x + hR.w * 0.45, y: hR.y + hR.h * 0.55 }; }
    const pHand = handAt || start;
    let p;
    if (t < CUR.toHand[0]) p = start;
    else if (t < CUR.toHand[1]) p = lerp(start, pHand, ease((t - CUR.toHand[0]) / (CUR.toHand[1] - CUR.toHand[0])));
    else if (t < CUR.toCheck[0]) p = pHand;
    else if (t < CUR.toCheck[1]) p = lerp(pHand, pCheck, ease((t - CUR.toCheck[0]) / (CUR.toCheck[1] - CUR.toCheck[0])));
    else if (t < CUR.toSend[0]) p = pCheck;
    else if (t < CUR.toSend[1]) p = lerp(pCheck, pSend, ease((t - CUR.toSend[0]) / (CUR.toSend[1] - CUR.toSend[0])));
    else p = pSend;
    cursor.style.transform = 'translate3d(' + (p.x - 5).toFixed(1) + 'px,' + (p.y - 3).toFixed(1) + 'px,0)';
    const pressing = (t >= CUR.pressHand && t < CUR.pressHand + 0.25) || (t >= CUR.pressCheck && t < CUR.pressCheck + 0.25) || (t >= CUR.pressSend && t < CUR.pressSend + 0.25);
    if (handBtn) toggle('handdown', handBtn, 'is-down', t >= CUR.pressHand && t < CUR.pressHand + 0.2);
    toggle('press', cursor, 'press', pressing);
    if (send) send.style.transform = t >= CUR.pressSend && t < CUR.pressSend + 0.2 ? 'scale(.96)' : '';
  }
  const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  let handAt = null;

  /* 주석 (넓은 화면에서만) */
  const notes = Array.prototype.slice.call(tilt.querySelectorAll('.note'));
  function notesAt(t) {
    if (!notesBox || notesBox.offsetParent === null) return;
    let active = 0;
    for (const [k, a, b] of NOTES) if (t >= a && t < b) active = k;
    notes.forEach((n) => toggle('note' + n.dataset.note, n, 'on', Number(n.dataset.note) === active));
    toggle('noteline', notesBox, 'has-line', active > 0);
    if (!active) return;
    const W = tilt.offsetWidth, H = tilt.offsetHeight;
    const note = notes[active - 1];
    const side = note.dataset.side;
    const vw = document.documentElement.clientWidth;
    const margin = (vw - W) / 2;
    const out = Math.min(118, Math.max(0, margin - 14));
    const nw = note.offsetWidth, nh = note.offsetHeight;
    let anchor = null;
    if (active === 1) { const r = rel(E.limit[0]); anchor = { x: r.x - 4, y: r.y + r.h / 2 }; }
    if (active === 2) { const d = win.querySelector('#d-card .hc-doc'); if (d) { const r = rel(d); anchor = { x: r.x + r.w - 6, y: r.y + Math.min(r.h / 2, 40) }; } }
    if (active === 3) { const r = rel(cb); anchor = { x: r.x - 3, y: r.y + r.h / 2 }; }
    if (active === 4) { const r = rel(E.xh[0]); anchor = { x: r.x + r.w + 4, y: r.y + r.h / 2 }; }
    if (!anchor) return;
    const sv = rel(stream);
    anchor.y = Math.max(sv.y + 18, Math.min(sv.y + sv.h - 18, anchor.y));
    const nx = side === 'l' ? -out : W - nw + out;
    const ny = Math.max(64, Math.min(H - nh - 24, anchor.y - nh / 2));
    note.style.transform = 'translate3d(' + nx.toFixed(1) + 'px,' + ny.toFixed(1) + 'px,0)';
    const ex = side === 'l' ? nx + nw : nx;
    const ey = ny + nh / 2;
    const dx = anchor.x - ex;
    notePath.setAttribute('d', 'M' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' C' + (ex + dx * 0.5).toFixed(1) + ' ' + ey.toFixed(1) + ' ' + (anchor.x - dx * 0.5).toFixed(1) + ' ' + anchor.y.toFixed(1) + ' ' + anchor.x.toFixed(1) + ' ' + anchor.y.toFixed(1));
    noteDot.setAttribute('cx', anchor.x.toFixed(1)); noteDot.setAttribute('cy', anchor.y.toFixed(1));
    noteHalo.setAttribute('cx', anchor.x.toFixed(1)); noteHalo.setAttribute('cy', anchor.y.toFixed(1));
  }

  /* ---------- 시계 ---------- */
  let t = 0, playing = !RM, visible = false, raf = 0, prev = 0, loops = 0;
  function frame(now) {
    raf = 0;
    if (!visible || !playing) { prev = 0; return; }
    const dt = prev ? Math.min(0.5, (now - prev) / 1000) : 0.016; // 실제 흐른 시간 — 프레임이 떨어져도 이야기는 제 속도로
    prev = now;
    t += dt;
    if (t >= LOOP) { t -= LOOP; loops++; reset(); }
    render(t, true);
    follow(dt, false);
    cursorAt(t);
    notesAt(t);
    kick();
  }
  function kick() { if (!raf && visible && playing) raf = requestAnimationFrame(frame); }
  function reset(at) {
    Object.keys(last).forEach((k) => { if (k !== 'comp') delete last[k]; });
    render(at || 0, false);
    win.querySelectorAll('.enter,.fresh').forEach((el) => el.classList.remove('enter', 'fresh'));
    follow(0, true);
  }
  function still(at) { // 움직이지 않는 한 장면
    t = at;
    render(t, false);
    win.querySelectorAll('.enter,.fresh').forEach((el) => el.classList.remove('enter', 'fresh'));
    follow(0, true);
    cursorAt(t);
    notesAt(t);
  }

  if (RM) {
    still(END);
    const bar = btnPlay && btnPlay.closest('.demo-bar');
    if (bar) bar.querySelectorAll('.dbtn,.demo-prog').forEach((e) => { e.hidden = true; });
    window.addEventListener('resize', () => still(END));
    return;
  }

  // 첫 장면: Claude 가 이미 일하고 있는 자리 (빈 창으로 시작하지 않는다). 창이 화면에 들어오면 여기서부터 돈다.
  t = START;
  reset(START);
  AHC.watch(win, (v) => {
    visible = v;
    if (v) kick();
  }, '-12% 0px');
  window.addEventListener('resize', () => { follow(0, true); notesAt(t); if (!playing) cursorAt(t); });
  // 언어를 바꾸면: 흐르는 글을 다시 나누고, 기억해 둔 값을 비워 지금 장면을 그 언어로 다시 그린다
  if (AHC.onLang) AHC.onLang(() => {
    Object.keys(STREAM).forEach(tokenize);
    Object.keys(last).forEach((k) => { delete last[k]; });
    render(t, false);
    win.querySelectorAll('.enter,.fresh').forEach((el) => el.classList.remove('enter', 'fresh'));
    follow(0, true);
    requestAnimationFrame(() => notesAt(t));
  });

  function setPlaying(p) {
    playing = p;
    btnPlay.classList.toggle('is-paused', !p);
    btnPlay.setAttribute('aria-label', p ? AHC.T('Pause', '일시 정지') : AHC.T('Play', '재생'));
    btnPlay.setAttribute('data-ko-aria', p ? '일시 정지' : '재생');
    if (p) kick();
  }
  btnPlay.addEventListener('click', () => setPlaying(!playing));
  // 확인용: AHC.demo.seek(초) 로 한 장면을 멈춰 보인다
  AHC.demo = {
    seek(at) {
      setPlaying(false);
      still(Math.max(0, Math.min(LOOP - 0.01, at)));
      setTimeout(() => { if (!playing) { follow(0, true); cursorAt(t); notesAt(t); } }, 800); // 접히는 카드가 다 접힌 뒤 다시 맞춘다
    },
    play() { setPlaying(true); }, get t() { return t; }, get loops() { return loops; }, LOOP,
    // 확인용: 화면 주기 없이 같은 코드로 seconds 초를 fps 로 돌린다 (고리를 몇 바퀴 돌아도 어긋나지 않는지 본다)
    simulate(seconds, fps) {
      setPlaying(false);
      const dt = 1 / (fps || 60);
      for (let k = 0; k < seconds / dt; k++) {
        t += dt;
        if (t >= LOOP) { t -= LOOP; loops++; reset(); }
        render(t, true);
        follow(dt, false);
        cursorAt(t);
      }
      return t;
    },
    // 확인용: 지금 보이는 상태를 글로
    digest() {
      const shownAt = Array.prototype.slice.call(win.querySelectorAll('[data-at].shown')).map((e) => e.dataset.at).join(',');
      const toks = Object.keys(TOK).map((k) => k + ':' + TOK[k].list.filter((x) => x.classList.contains('on')).length).join(',');
      return [shownAt, toks, last.comp, cb.className, send.className, div.className.replace(/\s*(streaking|landed|enter)/g, ''), divSt.textContent, limCn.textContent, limXn.textContent, sum.textContent, rowDot.dataset.agent, row.className].join(' | ');
    },
  };
  btnReplay.addEventListener('click', () => { t = 0; reset(); setPlaying(true); });
  if (AHC.onLang) AHC.onLang(() => btnPlay.setAttribute('aria-label', playing ? AHC.T('Pause', '일시 정지') : AHC.T('Play', '재생')));
})();
