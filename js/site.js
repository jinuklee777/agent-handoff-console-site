/* 공통: 언어 전환, 내비, 나타나기, 화면 밖 멈춤, 히어로 제목 · 기울기, 복사, 스포트라이트, 영상.
   다른 스크립트는 window.AHC 를 쓴다 (언어 · 움직임 줄이기 · 보이는지). */
(function () {
  'use strict';
  const doc = document.documentElement;
  const RM = doc.classList.contains('reduce-motion');
  const AHC = (window.AHC = {
    RM,
    lang: doc.lang === 'ko' ? 'ko' : 'en',
    T(en, ko) { return AHC.lang === 'ko' ? ko : en; },
    langListeners: [],
    onLang(fn) { AHC.langListeners.push(fn); },
    // el 이 화면 가까이 있는지 알려 준다 (탭이 숨으면 false)
    watch(el, fn, margin) {
      let seen = false;
      const fire = () => fn(seen && !document.hidden);
      if (!('IntersectionObserver' in window)) { seen = true; fire(); return; }
      new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; fire(); }, { rootMargin: margin || '80px 0px' }).observe(el);
      document.addEventListener('visibilitychange', fire);
    },
  });
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------- 언어 ---------- */
  const META = {
    title: ['Agent Handoff Console — Hit the limit. Keep the vibe.', 'Agent Handoff Console — 한도에 막혀도, 작업은 계속.'],
    desc: ['A free, open-source Mac app that runs Claude Code, Codex and Antigravity side by side — and hands your work to the next agent, with the full context, when one hits its limit.',
      'Claude Code · Codex · Antigravity 를 한 앱에서 나란히 쓰고, 한 에이전트가 한도에 닿으면 맥락째 다음 에이전트에게 넘기는 무료 오픈소스 Mac 앱.'],
  };
  const i18n = Array.prototype.slice.call(document.querySelectorAll('[data-ko],[data-ko-html],[data-ko-aria]'));
  i18n.forEach((n) => {
    if (n.hasAttribute('data-ko') || n.hasAttribute('data-ko-html')) n._en = n.innerHTML;
    if (n.hasAttribute('data-ko-aria')) n._enAria = n.getAttribute('aria-label') || '';
  });
  const descMeta = document.querySelector('meta[name="description"]');

  function splitWords() {
    document.querySelectorAll('[data-words]').forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      let i = 0;
      text.split(/([ \t\r\n]+)/).forEach((part) => {
        if (!part) return;
        if (/^[ \t\r\n]+$/.test(part)) { el.appendChild(part.indexOf('\n') >= 0 ? document.createElement('br') : document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', i++);
        w.textContent = part;
        el.appendChild(w);
      });
    });
  }

  function applyLang(l, save) {
    AHC.lang = l;
    doc.lang = l;
    doc.classList.toggle('ko', l === 'ko');
    i18n.forEach((n) => {
      if (n.hasAttribute('data-ko-html')) n.innerHTML = l === 'ko' ? n.getAttribute('data-ko-html') : n._en;
      else if (n.hasAttribute('data-ko')) {
        if (l === 'ko') n.textContent = n.getAttribute('data-ko');
        else n.innerHTML = n._en;
      }
      if (n.hasAttribute('data-ko-aria')) n.setAttribute('aria-label', l === 'ko' ? n.getAttribute('data-ko-aria') : n._enAria);
    });
    const k = l === 'ko' ? 1 : 0;
    document.title = META.title[k];
    if (descMeta) descMeta.setAttribute('content', META.desc[k]);
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
    splitWords();
    if (save) { try { localStorage.setItem('ahc-lang', l); } catch (e) { /* 저장 못 해도 된다 */ } }
    AHC.langListeners.forEach((fn) => { try { fn(l); } catch (e) { console.error(e); } });
  }
  applyLang(AHC.lang, false);
  doc.classList.remove('i18n-pending');
  document.querySelectorAll('[data-set-lang]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.setLang !== AHC.lang) applyLang(b.dataset.setLang, true);
    closeMenu();
  }));

  /* ---------- 나타나기 ---------- */
  const revealables = document.querySelectorAll('[data-rv],[data-words],.rule');
  if (RM || !('IntersectionObserver' in window)) revealables.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -7% 0px', threshold: 0.1 });
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------- 화면 밖이면 CSS 반복 움직임을 멈춘다 ---------- */
  if ('IntersectionObserver' in window) {
    const scopeIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '160px 0px' });
    document.querySelectorAll('[data-scope]').forEach((s) => scopeIO.observe(s));
  }

  /* ---------- 내비 ---------- */
  const nav = document.getElementById('nav');
  const menuBtn = nav.querySelector('.menu-btn');
  function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.mnav a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });
  let navQueued = false;
  function navScroll() { navQueued = false; nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', () => { if (!navQueued) { navQueued = true; requestAnimationFrame(navScroll); } }, { passive: true });
  navScroll();

  // 지금 보는 절을 내비에 표시
  const linkFor = { platform: 'platform', how: 'how', credits: 'credits', start: 'faq' };
  const links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  if ('IntersectionObserver' in window) {
    const activeIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const key = linkFor[e.target.id] || '';
      links.forEach((a) => a.classList.toggle('is-active', key !== '' && a.getAttribute('href') === '#' + key));
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach((s) => activeIO.observe(s));
  }

  /* ---------- 히어로 제목: 에이전트 이름이 번갈아 바뀐다 ---------- */
  const slots = Array.prototype.slice.call(document.querySelectorAll('.swap .slot'));
  const pairs = [['claude', 'codex'], ['codex', 'claude']];
  let pair = 0, heroOn = true;
  function swap() {
    pair = (pair + 1) % pairs.length;
    slots.forEach((slot, k) => {
      const want = pairs[pair][k];
      const cur = slot.querySelector('.sn.is-cur');
      const next = slot.querySelector('.sn[data-agent="' + want + '"]');
      if (!next || cur === next) return;
      setTimeout(() => {
        if (cur) { cur.classList.remove('is-cur'); cur.classList.add('is-out'); }
        next.style.transition = 'none';
        next.classList.remove('is-out');
        void next.offsetWidth;
        next.style.transition = '';
        next.classList.add('is-cur');
        slot.style.width = next.getBoundingClientRect().width.toFixed(2) + 'px';
      }, k * 150);
    });
  }
  // 칸 너비는 지금 이름의 너비를 따라 부드럽게 바뀐다 (줄 높이는 그대로)
  function fitSlots(animate) {
    slots.forEach((slot) => {
      const cur = slot.querySelector('.sn.is-cur');
      if (!cur) return;
      if (!animate) slot.style.transition = 'none';
      slot.style.width = cur.getBoundingClientRect().width.toFixed(2) + 'px';
      if (!animate) { void slot.offsetWidth; slot.style.transition = ''; }
    });
  }
  fitSlots(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitSlots(false));
  window.addEventListener('resize', () => fitSlots(false));
  AHC.onLang(() => fitSlots(false));
  const hero = document.getElementById('top');
  // 이름이 번갈아 바뀌는 줄이 있는 절이 보일 때만 바꾼다 (v4: 마지막 절)
  const swapHost = slots.length ? slots[0].closest('section') : hero;
  AHC.watch(swapHost || hero, (v) => { heroOn = v; }, '0px');
  if (!RM && slots.length) setInterval(() => { if (heroOn) swap(); }, 4000);

  /* ---------- 넘기는 고리: 아이콘과 같은 두 곡선을 글자 자리에 맞춰 긋는다 ----------
     위 곡선은 Claude 점(왼쪽 아래)에서 Codex 점(오른쪽 위)으로, 아래 곡선은 그 반대 — 앱 아이콘의 고리를 그대로. */
  function drawRing(svg, box, bl, tr, hole) {
    if (!svg) return;
    const W = box.width, H = box.height;
    const f = (n) => n.toFixed(1);
    // 글 · 단추 묶음 뒤에서는 곡선이 흐려진다 (가장자리를 부드럽게 뚫은 가림막)
    const mask = svg.querySelector('mask');
    if (mask) {
      ['x', 'y'].forEach((k) => mask.setAttribute(k, '0'));
      mask.setAttribute('width', f(W)); mask.setAttribute('height', f(H));
      const all = mask.querySelector('.mask-all');
      all.setAttribute('width', f(W)); all.setAttribute('height', f(H));
      const h = mask.querySelector('.mask-hole');
      if (hole) { h.setAttribute('x', f(hole.l)); h.setAttribute('y', f(hole.t)); h.setAttribute('width', f(hole.r - hole.l)); h.setAttribute('height', f(hole.b - hole.t)); }
      else h.setAttribute('width', '0');
    }
    const up = 'M' + f(bl.x) + ' ' + f(bl.y) + ' C' + f(bl.x) + ' ' + f(tr.y) + ' ' + f(tr.x) + ' ' + f(tr.y) + ' ' + f(tr.x) + ' ' + f(tr.y);
    const down = 'M' + f(tr.x) + ' ' + f(tr.y) + ' C' + f(tr.x) + ' ' + f(bl.y) + ' ' + f(bl.x) + ' ' + f(bl.y) + ' ' + f(bl.x) + ' ' + f(bl.y);
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
    svg.querySelectorAll('[data-arc]').forEach((p) => p.setAttribute('d', p.dataset.arc === 'up' ? up : down));
    svg.querySelectorAll('linearGradient').forEach((g, i) => {
      const a = i === 0 ? bl : tr, b = i === 0 ? tr : bl;
      g.setAttribute('x1', f(a.x)); g.setAttribute('y1', f(a.y)); g.setAttribute('x2', f(b.x)); g.setAttribute('y2', f(b.y));
    });
    svg.querySelectorAll('circle[data-at]').forEach((c) => { const p = c.dataset.at === 'bl' ? bl : tr; c.setAttribute('cx', f(p.x)); c.setAttribute('cy', f(p.y)); });
    svg.classList.add('ready');
  }
  const ring = document.getElementById('hero-ring');
  function placeRing() {
    const hr = hero.getBoundingClientRect();
    const line2 = document.querySelectorAll('.h1-line')[1];
    const cta = document.querySelector('.hero-head .cta-row');
    if (!ring || !line2 || !cta || !hr.width) return;
    const range = document.createRange();
    range.selectNodeContents(line2);
    const l2 = range.getBoundingClientRect();
    const c = cta.getBoundingClientRect();
    // 설명 글 · 단추 · 작은 글 묶음 — 곡선은 이 뒤를 지나지 않는다 (가림막으로 흐린다)
    const block = ['.hero-sub', '.hero-head .cta-row', '.hero-head .fine']
      .map((q) => Array.prototype.slice.call(document.querySelectorAll(q)))
      .reduce((a, b) => a.concat(b), [])
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect())
      .reduce((u, r) => ({ l: Math.min(u.l, r.left), t: Math.min(u.t, r.top), r: Math.max(u.r, r.right), b: Math.max(u.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
    const pad = hr.width < 760 ? 10 : 26;
    const hole = { l: block.l - hr.left - pad, t: block.t - hr.top - pad, r: block.r - hr.left + pad, b: block.b - hr.top + pad };
    let tr, bl;
    if (hr.width < 760) {
      // 좁은 화면: 글이 폭을 다 쓰므로 점은 양옆 여백에 — Codex 점은 알약 아래 오른쪽, Claude 점은 글 묶음 아래 왼쪽
      const pill = document.querySelector('.hero-head .pill').getBoundingClientRect();
      tr = { x: hr.width - 18, y: pill.bottom - hr.top + 22 };
      bl = { x: 18, y: hole.b + 14 };
    } else {
      // Claude 점은 글 묶음의 왼쪽 아래 바깥, Codex 점은 제목 둘째 줄 오른쪽 (글 묶음보다 바깥)
      tr = { x: Math.min(hr.width - 26, Math.max(l2.right - hr.left + 64, hole.r + 44)), y: l2.top - hr.top + l2.height * 0.4 };
      bl = { x: Math.max(26, hole.l - 34), y: hole.b + 16 };
    }
    drawRing(ring, hr, bl, tr, hole);
  }
  // 마지막 절: 고리가 문구 · 단추 묶음을 감싼다 (Claude 점은 왼쪽 아래, Codex 점은 오른쪽 위)
  const finalSec = document.getElementById('get'), finalRing = document.getElementById('final-ring');
  function placeFinal() {
    if (!finalSec || !finalRing) return;
    const fr = finalSec.getBoundingClientRect();
    const h = finalSec.querySelector('.final-h'), cta = finalSec.querySelector('.cta-row');
    if (!h || !cta || !fr.width) return;
    const range = document.createRange();
    range.selectNodeContents(h);
    const t = range.getBoundingClientRect(), c = cta.getBoundingClientRect();
    const left = Math.min(t.left, c.left) - fr.left, right = Math.max(t.right, c.right) - fr.left;
    const narrow = fr.width < 760;
    const mx = narrow ? 10 : Math.min(150, fr.width * 0.08);
    const edge = narrow ? 12 : 24;
    const tr = { x: Math.min(fr.width - edge, right + mx), y: Math.max(40, t.top - fr.top - (narrow ? 34 : 56)) };
    const bl = { x: Math.max(edge, left - mx), y: Math.min(fr.height - 40, c.bottom - fr.top + (narrow ? 34 : 56)) };
    // 설명 글 · 단추 묶음 뒤에서는 곡선이 흐려진다 (히어로와 같은 규칙 — 글자와 단추를 가로지르지 않는다)
    const sub = finalSec.querySelector('.final-sub');
    const s = sub ? sub.getBoundingClientRect() : c;
    const pad = narrow ? 10 : 18;
    const hole = { l: Math.min(s.left, c.left) - fr.left - pad, t: s.top - fr.top - pad, r: Math.max(s.right, c.right) - fr.left + pad, b: c.bottom - fr.top + pad };
    drawRing(finalRing, fr, bl, tr, hole);
  }
  const placeRings = () => { placeRing(); placeFinal(); };
  placeRings();
  setTimeout(placeRings, 1400); // 처음 나타나는 움직임이 끝난 뒤 한 번 더
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeRings);
  window.addEventListener('resize', placeRings);
  AHC.onLang(() => requestAnimationFrame(placeRings));

  /* ---------- 히어로 창: 처음엔 기울어 있다가 스크롤하면 펴진다 ---------- */
  const stage = document.getElementById('stage');
  const tilt = document.getElementById('tilt');
  if (stage && tilt && !RM) {
    let q = false;
    const update = () => {
      q = false;
      const vh = window.innerHeight || 800;
      const r = stage.getBoundingClientRect();
      const p = clamp((vh * 0.94 - r.top) / (vh * 0.6), 0, 1);
      if (p >= 0.999) {
        if (!tilt.classList.contains('flat')) { tilt.classList.add('flat'); tilt.classList.remove('moving'); }
        return;
      }
      tilt.classList.remove('flat');
      tilt.classList.add('moving');
      const k = Math.pow(1 - p, 1.25);
      const e = p * p * (3 - 2 * p);
      tilt.style.setProperty('--tilt', (18 * k).toFixed(3) + 'deg');
      tilt.style.setProperty('--tsc', (0.93 + 0.07 * e).toFixed(4));
      tilt.style.setProperty('--ty', (26 * k).toFixed(2) + 'px');
    };
    window.addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  } else if (tilt) tilt.classList.add('flat');

  /* ---------- 복사 단추 ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const done = () => { btn.classList.add('copied'); setTimeout(() => btn.classList.remove('copied'), 1600); };
    const fallback = () => {
      const pre = btn.parentElement.querySelector('pre');
      if (!pre) return;
      const r = document.createRange();
      r.selectNodeContents(pre);
      const s = window.getSelection();
      s.removeAllRanges(); s.addRange(r);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(btn.dataset.copy).then(done, fallback);
      else fallback();
    } catch (err) { fallback(); }
  });

  /* ---------- 카드 테두리 스포트라이트 ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let target = null, px = 0, py = 0, q = false;
    const paint = () => {
      q = false;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty('--mx', (px - r.left).toFixed(1) + 'px');
      target.style.setProperty('--my', (py - r.top).toFixed(1) + 'px');
    };
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.spot');
      target = card || null;
      if (!card) return;
      px = e.clientX; py = e.clientY;
      if (!q) { q = true; requestAnimationFrame(paint); }
    }, { passive: true });
  }

  /* ---------- 영상 ---------- */
  const player = document.getElementById('player');
  if (player) {
    const poster = document.getElementById('player-poster');
    const play = document.getElementById('player-play');
    const soon = document.getElementById('player-soon');
    const state = { checked: {}, playing: false };
    const files = () => ({ poster: 'assets/video/poster-' + AHC.lang + '.jpg', video: 'assets/video/promo-' + AHC.lang + '.mp4' });
    const setSoon = (on) => {
      player.classList.toggle('is-soon', on);
      soon.hidden = !on;
      play.setAttribute('aria-disabled', String(on));
    };
    function prepare() {
      if (state.playing) return;
      const f = files();
      const known = state.checked[AHC.lang];
      if (known) { apply(known); return; }
      // 영상 파일이 아직 없으면 "곧 올라옵니다" 로 둔다 (assets/video/ 에 파일을 두면 저절로 바뀐다).
      // data-video="off" 면 묻지 않고 곧 올라옴으로 둔다 — 파일 없이 배포할 때 콘솔에 404 가 남지 않게.
      if (player.dataset.video === 'off') { state.checked[AHC.lang] = { ok: false }; apply(state.checked[AHC.lang]); return; }
      fetch(f.video, { method: 'HEAD', cache: 'no-store' }).then((r) => {
        const ok = r.ok && /video|octet-stream/.test(r.headers.get('content-type') || 'video');
        state.checked[AHC.lang] = { ok };
        apply(state.checked[AHC.lang]);
      }).catch(() => { state.checked[AHC.lang] = { ok: false }; apply(state.checked[AHC.lang]); });
    }
    function apply(info) {
      setSoon(!info.ok);
      poster.classList.remove('ok');
      player.classList.remove('has-poster');
      poster.style.backgroundImage = '';
      if (!info.ok) return;
      const f = files();
      const img = new Image();
      img.onload = () => { poster.style.backgroundImage = 'url("' + f.poster + '")'; poster.classList.add('ok'); player.classList.add('has-poster'); };
      img.src = f.poster;
    }
    let primed = false;
    AHC.watch(player, (v) => { if (v && !primed) { primed = true; prepare(); } }, '600px 0px');
    AHC.onLang(() => {
      // 멈춘 영상이면 바뀐 언어의 포스터 · 영상으로 되돌린다 (재생 중이면 그대로 둔다)
      const v = player.querySelector('video');
      if (v && (v.paused || v.ended)) { v.remove(); state.playing = false; player.classList.remove('is-playing'); }
      if (primed) prepare();
    });
    play.addEventListener('click', () => {
      if (player.classList.contains('is-soon') || state.playing) return;
      const f = files();
      const v = document.createElement('video');
      v.controls = true; v.playsInline = true; v.preload = 'auto'; v.autoplay = true;
      v.setAttribute('poster', f.poster);
      v.src = f.video;
      v.addEventListener('error', () => { v.remove(); state.playing = false; player.classList.remove('is-playing'); setSoon(true); });
      v.addEventListener('ended', () => { /* 그대로 둔다 — 다시 보기는 컨트롤로 */ });
      player.appendChild(v);
      state.playing = true;
      player.classList.add('is-playing');
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
      v.focus({ preventScroll: true });
    });
  }
})();
