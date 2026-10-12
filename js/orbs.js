/* 점 구 — 앱의 실행 중 상태 줄이 하는 일마다 다른 모양으로 도는 점 구(thinking-orbs 의 모양)를 캔버스 2D 로 다시 그린다.
   한 번의 requestAnimationFrame 이 화면에 보이는 점 구만 칠한다.
   모양은 thinking-orbs (Jakub Antalik, MIT — licenses/LICENSE-thinking-orbs.txt) 를 따른다. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  // 사이트의 ?motion=reduce (확인용) 도 움직임 줄이기로 본다
  const reduced = {
    get matches() { return mq.matches || document.documentElement.classList.contains('reduce-motion'); },
    addEventListener(type, fn) { try { mq.addEventListener(type, fn); } catch (e) { /* 옛 브라우저 */ } },
  };

  /* ── 테마 토큰 ── */
  const themeListeners = new Set();
  const tokenCache = new Map();
  function token(name) {
    if (!tokenCache.has(name)) {
      tokenCache.set(name, getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim());
    }
    return tokenCache.get(name);
  }
  function fireTheme() {
    tokenCache.clear();
    themeListeners.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fireTheme);
  new MutationObserver(fireTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  function rgb(color) {
    const c = (color || '').trim();
    if (c.startsWith('#')) {
      const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = c.match(/\d+(\.\d+)?/g);
    return m ? m.slice(0, 3).map(Number) : [100, 116, 139];
  }
  window.AHCTheme = {
    token,
    rgb: (name) => rgb(token(name)),
    on: (cb) => { themeListeners.add(cb); return () => themeListeners.delete(cb); },
    isDark: () => {
      const bg = rgb(token('bg') || token('paper'));
      return (bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114) < 128;
    },
  };

  /* ── 작은 3D 도구 ── */
  function rx(p, a) { const c = Math.cos(a), s = Math.sin(a); const y = p[1] * c - p[2] * s; p[2] = p[1] * s + p[2] * c; p[1] = y; return p; }
  function ry(p, a) { const c = Math.cos(a), s = Math.sin(a); const x = p[0] * c + p[2] * s; p[2] = -p[0] * s + p[2] * c; p[0] = x; return p; }
  function rz(p, a) { const c = Math.cos(a), s = Math.sin(a); const x = p[0] * c - p[1] * s; p[1] = p[0] * s + p[1] * c; p[0] = x; return p; }
  function sph(lat, lon, r) { const cl = Math.cos(lat); return [r * cl * Math.cos(lon), r * Math.sin(lat), r * cl * Math.sin(lon)]; }
  const fibCache = new Map();
  function fib(n) {
    if (fibCache.has(n)) return fibCache.get(n);
    const pts = [];
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = g * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    fibCache.set(n, pts);
    return pts;
  }
  const ease = (x) => x * x * (3 - 2 * x);

  /* ── 모양 ── 각 함수는 out.dots 에 [x, y, z, 크기, 투명도], out.lines 에 [x1,y1,z1,x2,y2,z2,투명도] 를 넣는다. */
  const MODES = {
    breathing(t, d, o) {
      const per = Math.max(14, Math.round(38 * d));
      const br = 1 + 0.045 * Math.sin(t * 1.5);
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < per; i++) {
          const th = (i / per) * TAU;
          const r = 0.7 * br * (1 + 0.11 * Math.sin(3 * th + t * 0.9 + k * 1.7) + 0.06 * Math.sin(5 * th - t * 0.7 + k));
          const p = [r * Math.cos(th), r * Math.sin(th), 0];
          rx(p, 1.05 + 0.25 * Math.sin(t * 0.4 + k * 2.1));
          ry(p, t * 0.35 + (k * TAU) / 3);
          o.dots.push([p[0], p[1], p[2], 1, 1]);
        }
      }
    },
    composing(t, d, o) {
      const rows = d < 0.6 ? 5 : 7;
      const per = Math.max(16, Math.round(42 * d));
      const mid = (rows - 1) / 2;
      for (let j = 0; j < rows; j++) {
        const base = (j - mid) * 0.17;
        for (let i = 0; i < per; i++) {
          const phi = (i / per) * TAU;
          const lat = base + 0.13 * Math.sin(3 * phi + t * 2.4 + j * 0.6);
          const p = sph(lat, phi, 0.8);
          ry(p, t * 0.5); rx(p, 0.32);
          o.dots.push([p[0], p[1], p[2], 1, 1 - (Math.abs(j - mid) / rows) * 0.9]);
        }
      }
    },
    working(t, d, o) {
      const nucleus = fib(Math.max(10, Math.round(26 * d)));
      for (const q of nucleus) {
        const p = [q[0] * 0.2, q[1] * 0.2, q[2] * 0.2];
        ry(p, t * 0.8); rx(p, 0.4);
        o.dots.push([p[0], p[1], p[2], 0.9, 1]);
      }
      const tilts = [0.0, 1.05, -1.05];
      const spins = [1.3, -1.0, 1.7];
      const orient = (p, k) => { rz(p, tilts[k]); ry(p, (k * TAU) / 3 + t * 0.2); rx(p, 0.38); return p; };
      for (let k = 0; k < 3; k++) {
        const R = 0.78;
        const pathN = Math.max(16, Math.round(48 * d));
        for (let i = 0; i < pathN; i++) {
          const th = (i / pathN) * TAU;
          const p = orient([R * Math.cos(th), 0, R * Math.sin(th)], k);
          o.dots.push([p[0], p[1], p[2], 0.5, 0.22]);
        }
        const trail = Math.round(8 * d) + 3;
        for (let h = 0; h < 2; h++) {
          const base = t * spins[k] + h * Math.PI + k;
          for (let m = 0; m < trail; m++) {
            const th = base - m * 0.1 * Math.sign(spins[k]);
            const p = orient([R * Math.cos(th), 0, R * Math.sin(th)], k);
            o.dots.push([p[0], p[1], p[2], 1.35 - (m / trail) * 0.85, 1 - (m / trail) * 0.8]);
          }
        }
      }
    },
    searching(t, d, o) {
      const pts = fib(Math.max(40, Math.round(170 * d)));
      const sweep = Math.sin(t * 1.1) * 1.15;
      for (const q of pts) {
        const p = [q[0] * 0.8, q[1] * 0.8, q[2] * 0.8];
        ry(p, t * 0.45); rx(p, 0.35);
        const az = Math.atan2(p[0], p[2]);
        const dd = az - sweep;
        const w = p[2] > 0 ? Math.exp(-(dd * dd) / 0.045) : 0;
        o.dots.push([p[0], p[1], p[2], 0.8 + 0.95 * w, 0.55 + 0.45 * w]);
      }
    },
    shaping(t, d, o) {
      const n = Math.max(18, Math.round(54 * d));
      const shapes = [0, 3, 4];
      const tt = t % 6.3;
      const idx = Math.floor(tt / 2.1);
      const local = tt - idx * 2.1;
      const m = local < 1.4 ? 0 : ease((local - 1.4) / 0.7);
      const pt = (k, s) => {
        if (k === 0) { const a = s * TAU + Math.PI / 2; return [Math.cos(a), Math.sin(a)]; }
        const start = k === 4 ? Math.PI / 2 + Math.PI / 4 : Math.PI / 2;
        const e = Math.floor(s * k); const f = s * k - e;
        const a1 = start + (e * TAU) / k, a2 = start + ((e + 1) * TAU) / k;
        return [Math.cos(a1) + (Math.cos(a2) - Math.cos(a1)) * f, Math.sin(a1) + (Math.sin(a2) - Math.sin(a1)) * f];
      };
      const from = shapes[idx % 3], to = shapes[(idx + 1) % 3];
      for (let i = 0; i < n; i++) {
        const s = i / n;
        const a = pt(from, s), b = pt(to, s);
        const p = [(a[0] + (b[0] - a[0]) * m) * 0.74, (a[1] + (b[1] - a[1]) * m) * 0.74, 0];
        rz(p, t * 0.25); rx(p, 0.35 * Math.sin(t * 0.6)); ry(p, 0.35 * Math.cos(t * 0.5));
        o.dots.push([p[0], p[1], p[2], 1.1, 1]);
      }
    },
    connecting(t, d, o) {
      const g = graph(d < 0.6 ? 14 : 22);
      const P = g.nodes.map((q) => { const p = [q[0] * 0.8, q[1] * 0.8, q[2] * 0.8]; ry(p, t * 0.3); rx(p, 0.3); return p; });
      g.edges.forEach(([a, b], q) => {
        const v = 0.5 + 0.5 * Math.sin(t * 0.9 + q * 1.61);
        const f = Math.min(1, Math.max(0, (v - 0.3) / 0.45));
        if (f <= 0) return;
        const A = P[a], B = P[b];
        o.lines.push([A[0], A[1], A[2], A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f, 0.55]);
      });
      for (const p of P) o.dots.push([p[0], p[1], p[2], 1.35, 1]);
    },
    solving(t, d, o) {
      const per = Math.max(14, Math.round(30 * d));
      const ph = (t % 4) / 4;
      const env = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0;
      const amp = [1.2, -0.9, 0.7];
      const lats = [-0.5, 0, 0.5];
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < per; i++) {
          const phi = (i / per) * TAU + env * amp[k];
          const p = sph(lats[k], phi, 0.8);
          ry(p, t * 0.3); rx(p, 0.32);
          const accent = i % 5 === 0;
          o.dots.push([p[0], p[1], p[2], accent ? 1.45 : 0.85, accent ? 1 : 0.7]);
        }
      }
    },
    weaving(t, d, o) {
      const per = Math.max(20, Math.round(58 * d));
      const al = [1, 0.75, 0.55];
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < per; i++) {
          const phi = (i / per) * TAU;
          const lat = 0.55 * Math.sin(2 * phi + t * 1.0 + (k * TAU) / 3);
          const p = sph(lat, phi + t * 0.25, 0.8);
          rx(p, 0.28);
          o.dots.push([p[0], p[1], p[2], 1, al[k]]);
        }
      }
    },
    listening(t, d, o) {
      const n = Math.max(18, Math.round(46 * d));
      const r = 0.78 * (1 + 0.025 * Math.sin(t * 3));
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU;
        const p = [r * Math.cos(th), r * Math.sin(th), 0];
        rx(p, 0.18 * Math.sin(t * 0.5));
        o.dots.push([p[0], p[1], p[2], 0.9, 0.7]);
      }
      const m = Math.max(10, Math.round(26 * d));
      const travel = ((t * 0.55) % 2.6) - 1.3;
      for (let i = 0; i < m; i++) {
        const x = -0.6 + (1.2 * i) / (m - 1);
        const env = Math.exp(-(((x - travel) / 0.32) ** 2));
        const y = 0.32 * env * Math.sin(x * 10 - t * 7);
        o.dots.push([x, y, 0.4, 0.9 + 0.5 * env, 0.45 + 0.55 * env]);
      }
    },
  };
  const graphCache = new Map();
  function graph(n) {
    if (graphCache.has(n)) return graphCache.get(n);
    const nodes = fib(n).map((p, i) => {
      const j = Math.sin(i * 12.9898) * 0.08;
      return [p[0] + j, p[1] - j, p[2] + j * 0.5];
    });
    const edges = [];
    const seen = new Set();
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2]).filter((x) => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 2);
      near.forEach(([j]) => { const key = i < j ? i + '-' + j : j + '-' + i; if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } });
    });
    const g = { nodes, edges };
    graphCache.set(n, g);
    return g;
  }

  /* ── 점 구 하나 ── */
  const items = new Set();
  const visible = new WeakMap();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => visible.set(e.target, e.isIntersecting));
    kick();
  }, { rootMargin: '80px' }) : null;

  function create(canvas, opts) {
    const it = {
      canvas, ctx: canvas.getContext('2d'), mode: opts.mode || 'breathing', tint: opts.tint || 'claude',
      speed: opts.speed || 1, t: opts.t != null ? opts.t : Math.random() * 10, size: 0, dirty: true,
      // paused: 한 장면만 칠하고 움직이지 않는다 (현황 카드처럼 — 움직이는 것은 링 하나)
      paused: !!opts.paused,
    };
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const css = Math.max(8, Math.round(Math.min(rect.width, rect.height) || parseFloat(canvas.getAttribute('width')) || 20));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      it.size = css;
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      it.dpr = dpr;
      it.dirty = true;
      kick();
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas);
    if (io) io.observe(canvas); else visible.set(canvas, true);
    items.add(it);
    const handle = {
      setMode(m) { if (MODES[m] && m !== it.mode) { it.mode = m; it.dirty = true; } },
      setTint(c) { it.tint = c; it.dirty = true; },
      setSpeed(s) { it.speed = s; },
      setPaused(p) { it.paused = !!p; it.dirty = true; kick(); },
      get mode() { return it.mode; },
      destroy() { items.delete(it); if (io) io.unobserve(canvas); },
    };
    kick();
    return handle;
  }

  const out = { dots: [], lines: [] };
  function draw(it) {
    const { ctx, size, dpr } = it;
    const W = size * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    out.dots.length = 0; out.lines.length = 0;
    const density = size < 32 ? 0.42 : size < 70 ? 0.66 : 1;
    MODES[it.mode](reduced.matches ? 2.2 : it.t, density, out);
    const [r, g, b] = rgb(token(it.tint) || it.tint);
    const c = W / 2, R = (W / 2) * 0.9;
    const dotR = Math.max(0.85 * dpr, size * (size < 70 ? 0.022 : 0.0165) * dpr);
    if (out.lines.length) {
      ctx.lineWidth = Math.max(0.6 * dpr, dotR * 0.5);
      ctx.lineCap = 'round';
      for (const L of out.lines) {
        const depth = ((L[2] + L[5]) / 2 + 1) / 2;
        ctx.strokeStyle = `rgba(${r},${g},${b},${(0.15 + 0.85 * depth) * L[6]})`;
        ctx.beginPath(); ctx.moveTo(c + L[0] * R, c - L[1] * R); ctx.lineTo(c + L[3] * R, c - L[4] * R); ctx.stroke();
      }
    }
    out.dots.sort((a, b2) => a[2] - b2[2]);
    for (const p of out.dots) {
      const depth = Math.max(0, Math.min(1, (p[2] + 1) / 2));
      const a = (0.2 + 0.8 * Math.pow(depth, 1.15)) * p[4];
      const rad = dotR * p[3] * (0.72 + 0.5 * depth);
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(c + p[0] * R, c - p[1] * R, rad, 0, TAU); ctx.fill();
    }
    it.dirty = false;
  }

  let raf = 0, last = 0;
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    let any = false;
    if (!document.hidden) {
      for (const it of items) {
        if (visible.get(it.canvas) === false) continue;
        const still = reduced.matches || it.paused;
        if (!still) it.t += dt * it.speed;
        if (!still || it.dirty) draw(it);
        if (!still) any = true;
      }
    }
    if (any) kick();
    else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('scroll', kick, { passive: true });
  window.AHCTheme.on(() => { items.forEach((it) => { it.dirty = true; }); kick(); });
  reduced.addEventListener('change', kick);

  window.Orbs = { create, modes: Object.keys(MODES) };
})();
