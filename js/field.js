/* website-v4 — 히어로 제목 뒤의 점 무늬.
   - 커서 가까운 점이 은은하게 밝아진다. 색은 자리에 따라 왼쪽 Claude 산호 → 오른쪽 흰색 (넘기는 고리 · "작업은 계속." 의 색).
   - 가끔 산호 → 흰색의 물결이 제목 뒤를 왼쪽에서 오른쪽으로 지나간다 (넘기기). 처음 한 번은 들어오자마자.
   - 빈 곳을 누르면(휴대폰은 탭) 그 자리에서 작은 고리가 퍼진다.
   바탕 점은 한 번만 그려 두고, 밝아지는 점만 그 위에 그린다. 할 일이 없으면 멈춘다 (화면 밖 · 탭이 숨으면 물결도 쉰다).
   움직임 줄이기면 멈춘 점 무늬만. */
(function () {
  'use strict';
  const hero = document.querySelector('.ap-hero');
  const head = hero && hero.querySelector('.ap-hero-head');
  if (!hero || !head) return;
  const AHC = window.AHC || { RM: false, onLang() {} };
  const RM = AHC.RM;

  const cv = document.createElement('canvas');
  cv.className = 'hero-field';
  cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.firstChild);
  const ctx = cv.getContext('2d');
  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');

  const GAP = 26, R = 175, BASE_A = 0.075;
  const CORAL = [242, 160, 127], WHITE = [246, 246, 243];
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, ox = 0, oy = 0;
  let px = -1e4, py = -1e4, tx = -1e4, ty = -1e4, energy = 0, target = 0;
  let waveT0 = -1, waveTimer = 0;
  const WAVE_MS = 2600;
  const ripples = [];
  let raf = 0, onScreen = true;

  function mix(t) {
    t = Math.max(0, Math.min(1, t));
    return [0, 1, 2].map((i) => Math.round(CORAL[i] + (WHITE[i] - CORAL[i]) * t));
  }

  function size() {
    const hr = hero.getBoundingClientRect(), r = head.getBoundingClientRect();
    W = Math.round(hr.width);
    H = Math.round(Math.min(hr.height, r.bottom - hr.top + 120));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    [cv, base].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cols = Math.floor(W / GAP) + 1; rows = Math.floor(H / GAP) + 1;
    ox = (W - (cols - 1) * GAP) / 2; oy = (H - (rows - 1) * GAP) / 2;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.fillStyle = 'rgba(255,255,255,' + BASE_A + ')';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      bctx.beginPath(); bctx.arc(ox + i * GAP, oy + j * GAP, 0.9, 0, 6.2832); bctx.fill();
    }
    paint(performance.now());
  }

  // 점 하나가 얼마나 밝아지는가 (0–1): 커서 · 물결 · 고리
  function glow(x, y, now) {
    let h = 0;
    if (energy > 0.01) {
      const d = Math.hypot(x - px, y - py);
      if (d < R) { const k = 1 - d / R; h += energy * Math.pow(k, 1.5); }
    }
    if (waveT0 >= 0) {
      const p = (now - waveT0) / WAVE_MS;
      const wx = -120 + p * (W + 240);
      const env = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
      const dx = (x - wx) / 85;
      h += 0.5 * env * Math.exp(-dx * dx);
    }
    for (let k = 0; k < ripples.length; k++) {
      const rp = ripples[k], age = (now - rp.t0) / 1300;
      const rr = age * 260, dd = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rr) / 18;
      h += 0.7 * (1 - age) * Math.exp(-dd * dd);
    }
    return Math.min(1, h);
  }

  function paint(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(base, 0, 0);
    if (RM) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 밝아질 수 있는 칸만 훑는다
    let i0 = 0, i1 = cols - 1, j0 = 0, j1 = rows - 1;
    if (waveT0 < 0 && !ripples.length) {
      i0 = Math.max(0, Math.floor((px - R - ox) / GAP)); i1 = Math.min(cols - 1, Math.ceil((px + R - ox) / GAP));
      j0 = Math.max(0, Math.floor((py - R - oy) / GAP)); j1 = Math.min(rows - 1, Math.ceil((py + R - oy) / GAP));
    }
    const mid = W * 0.5, span = Math.max(320, W * 0.42);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = ox + i * GAP, y = oy + j * GAP;
      const h = glow(x, y, now);
      if (h < 0.03) continue;
      const c = mix((x - (mid - span / 2)) / span);
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (BASE_A + 0.8 * h).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 0.9 + 1.4 * h, 0, 6.2832); ctx.fill();
    }
  }

  function frame(now) {
    raf = 0;
    px += (tx - px) * 0.22; py += (ty - py) * 0.22;
    energy += (target - energy) * 0.1;
    if (waveT0 >= 0 && now - waveT0 > WAVE_MS) { waveT0 = -1; scheduleWave(9000); }
    for (let k = ripples.length - 1; k >= 0; k--) if (now - ripples[k].t0 > 1300) ripples.splice(k, 1);
    paint(now);
    if (target > 0 || energy > 0.01 || waveT0 >= 0 || ripples.length) kick();
  }
  function kick() { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }

  function scheduleWave(ms) {
    clearTimeout(waveTimer);
    if (RM) return;
    waveTimer = setTimeout(() => {
      if (!onScreen || document.hidden) { scheduleWave(3000); return; }
      waveT0 = performance.now(); kick();
    }, ms);
  }

  function local(e) {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  window.addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 120); });
  AHC.onLang(() => setTimeout(size, 60));
  if (RM) return;

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const [x, y] = local(e);
    if (y > H) { target = 0; kick(); return; }
    if (energy < 0.02) { px = x; py = y; }
    tx = x; ty = y; target = 1; kick();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target = 0; kick(); });
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, .stage, .pill')) return;
    const [x, y] = local(e);
    if (y < 0 || y > H) return;
    ripples.push({ x, y, t0: performance.now() });
    if (ripples.length > 4) ripples.shift();
    kick();
  });
  document.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; if (onScreen) kick(); }).observe(cv);
  }
  scheduleWave(1100);
})();
