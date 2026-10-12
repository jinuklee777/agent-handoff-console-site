/* website-v4 — 이야기의 움직임 두 가지.
   1) 넘겨지는 문장: 스크롤하면 앞 절반이 Claude 색으로 밝아지고, 넘기는 표시를 지나 뒤 절반은 Codex 색으로 이어 밝아진다.
   2) 짧게 말하면: 옆으로 넘기는 타일 넷과, 번호 · 이름이 붙은 넘기는 길(relay track).
   3) 통합 관리: 세 에이전트 노선이 여섯 역을 지나며 스크롤에 따라 위에서부터 밝아진다.
   언어를 바꾸면 site.js 가 글을 되돌린 뒤 다시 나눈다. 움직임 줄이기면 처음부터 다 밝다. */
(function () {
  'use strict';
  const AHC = window.AHC || { RM: false, T: (a) => a, onLang() {} };
  const RM = AHC.RM;

  /* ---------- 넘겨지는 문장 ---------- */
  const lit = document.getElementById('ap-lit');
  const parts = lit ? [lit.querySelector('.lit-a'), lit.querySelector('.lit-b')] : [];
  const mark = lit ? lit.querySelector('.lit-mark') : null;
  let words = [], splitAt = 0, queued = false;
  function splitOne(el, side) {
    const text = el.textContent.trim();
    el.textContent = '';
    // 붙여 쓴 빈칸(&#160;)은 나누지 않는다 — 함께 꺾여야 하는 말
    text.split(/([ \t\r\n]+)/).forEach((part) => {
      if (!part) return;
      if (/^[ \t\r\n]+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'lw ' + side;
      w.textContent = part;
      el.appendChild(w);
      words.push(w);
    });
  }
  function split() {
    if (!lit || !parts[0] || !parts[1]) return;
    words = [];
    splitOne(parts[0], 'a');
    splitAt = words.length;
    splitOne(parts[1], 'b');
    paint();
  }
  function paint() {
    queued = false;
    if (!words.length) return;
    if (RM) { words.forEach((w) => w.classList.add('on')); if (mark) mark.classList.add('on'); return; }
    const r = lit.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const start = vh * 0.8, end = vh * 0.5;
    const p = Math.max(0, Math.min(1, (start - r.top) / (start - end + r.height)));
    const n = Math.round(p * words.length);
    for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    if (mark) mark.classList.toggle('on', n >= splitAt);
  }
  if (lit) {
    split();
    AHC.onLang(split);
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    window.addEventListener('resize', paint);
  }

  /* ---------- 통합 관리: 세 노선이 역마다 위에서부터 차례로 밝아진다 ---------- */
  const pfRows = Array.prototype.slice.call(document.querySelectorAll('.pf-row'));
  if (pfRows.length) {
    if (RM) pfRows.forEach((r) => r.classList.add('lit'));
    else {
      let pq = false;
      const pfPaint = () => {
        pq = false;
        const line = (window.innerHeight || 800) * 0.74;
        pfRows.forEach((r) => { if (r.getBoundingClientRect().top + 40 < line) r.classList.add('lit'); });
      };
      window.addEventListener('scroll', () => { if (!pq) { pq = true; requestAnimationFrame(pfPaint); } }, { passive: true });
      window.addEventListener('resize', pfPaint);
      pfPaint();
    }
  }

  /* ---------- 짧게 말하면: 타일 · 넘기는 길 ---------- */
  const gal = document.getElementById('hl-gallery');
  if (gal) {
    const cards = Array.prototype.slice.call(gal.querySelectorAll('.ap-card'));
    const steps = document.getElementById('hl-dots');
    const prev = document.getElementById('hl-prev'), next = document.getElementById('hl-next');
    const padStart = () => parseFloat(getComputedStyle(gal).scrollPaddingLeft) || 0;
    function current() {
      let best = 0, d = Infinity;
      cards.forEach((c, i) => {
        const dd = Math.abs(c.offsetLeft - padStart() - gal.scrollLeft);
        if (dd < d) { d = dd; best = i; }
      });
      return best;
    }
    function go(i) {
      const k = Math.max(0, Math.min(cards.length - 1, i));
      gal.scrollTo({ left: cards[k].offsetLeft - padStart(), behavior: RM ? 'auto' : 'smooth' });
    }
    const btns = cards.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><span></span>';
      b.addEventListener('click', () => go(i));
      steps.appendChild(b);
      return b;
    });
    function label() {
      btns.forEach((b, i) => {
        const c = cards[i];
        b.querySelector('span').textContent = AHC.T(c.dataset.label || '', c.dataset.labelKo || '');
      });
    }
    let q = false;
    function sync() {
      q = false;
      const k = current();
      btns.forEach((b, i) => { b.setAttribute('aria-current', String(i === k)); b.classList.toggle('past', i < k); });
      const max = gal.scrollWidth - gal.clientWidth - 2;
      prev.disabled = gal.scrollLeft <= 2;
      next.disabled = gal.scrollLeft >= max;
    }
    gal.addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(sync); } }, { passive: true });
    window.addEventListener('resize', sync);
    prev.addEventListener('click', () => go(current() - 1));
    next.addEventListener('click', () => go(current() + 1));
    gal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
    });
    label();
    AHC.onLang(label);
    sync();
  }
})();
