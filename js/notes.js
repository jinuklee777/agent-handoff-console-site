/* website-v4 — 주석 번호([1] · [2] · [3])를 누르면 맨 아래로 내려가지 않고, 그 자리에 작은 창으로 주석을 보인다.
   - 넓은 화면: 번호 바로 아래 (아래 자리가 모자라면 위). 좁은 화면: 화면 아래에 붙는 판.
   - 닫기: × · esc · 바깥 누르기 · 같은 번호 다시 누르기. 언어를 바꾸거나 창 크기가 바뀌면 닫는다. 닫으면 포커스는 번호로 돌아온다.
   - 창 안의 "주석 모두 보기 ↓" 로 맨 아래 목록에 가면, 화면 아래에 "↩ 읽던 곳으로" 단추가 떠서 한 번에 돌아온다.
   - 맨 아래 목록의 번호([1] …)를 누르면 본문에서 그 주석을 단 자리로 돌아가고, 그 번호가 잠깐 빛난다.
   스크립트가 없으면 예전처럼 맨 아래 주석으로 간다 (href 그대로). */
(function () {
  'use strict';
  const AHC = window.AHC || { T: (a) => a, onLang() {} };
  const NARROW = window.matchMedia('(max-width: 759px)');
  const ICON_X = '<svg aria-hidden="true"><use href="#i-close"/></svg>';
  let pop = null, from = null, back = null, backTarget = null, armed = false;

  function noteNumber(li) { return Array.prototype.indexOf.call(li.parentElement.children, li) + 1; }

  function close(refocus) {
    if (!pop) return;
    pop.remove();
    pop = null;
    if (from) {
      from.setAttribute('aria-expanded', 'false');
      if (refocus && document.contains(from)) from.focus({ preventScroll: true });
    }
    from = null;
  }

  function place() {
    if (!pop || !from || NARROW.matches) return;
    const r = from.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const navH = 64;
    const left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    let top = r.bottom + 10;
    if (top + h > vh - 12 && r.top - h - 10 > navH) top = r.top - h - 10;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (top + window.scrollY) + 'px';
  }

  function open(a) {
    const id = a.getAttribute('href').slice(1);
    const li = document.getElementById(id);
    if (!li) return;
    if (from === a) { close(true); return; }
    close(false);
    from = a;
    const n = noteNumber(li);
    pop = document.createElement('div');
    pop.className = 'fn-pop';
    pop.id = 'fn-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', AHC.T('Note ' + n, '주석 ' + n));
    pop.innerHTML = '<div class="fn-pop-h"><b>[' + n + ']</b><button type="button" class="fn-x">' + ICON_X + '</button></div>'
      + '<div class="fn-pop-b"></div>'
      + '<a class="fn-all" href="#' + id + '"></a>';
    pop.querySelector('.fn-x').setAttribute('aria-label', AHC.T('Close', '닫기'));
    // 명령은 한 줄에 ("claude -" / "p" 로 갈리지 않게)
    pop.querySelector('.fn-pop-b').innerHTML = (li.querySelector('.fn-txt') || li).innerHTML.replace(/claude -p/g, '<span class="nw">claude -p</span>');
    pop.querySelector('.fn-all').textContent = AHC.T('All notes ↓', '주석 모두 보기 ↓');
    document.body.appendChild(pop);
    a.setAttribute('aria-expanded', 'true');
    a.setAttribute('aria-controls', 'fn-pop');
    place();
    pop.querySelector('.fn-x').addEventListener('click', () => close(true));
    pop.querySelector('.fn-all').addEventListener('click', (e) => {
      e.preventDefault();
      const ref = from;
      close(false);
      showBack(ref);
      li.scrollIntoView({ block: 'center', behavior: AHC.RM ? 'auto' : 'smooth' });
      li.classList.add('fn-flash');
      setTimeout(() => li.classList.remove('fn-flash'), 1600);
    });
  }

  // 맨 아래 목록에서 읽던 곳으로 돌아오는 단추
  function showBack(ref) {
    backTarget = ref;
    if (!back) {
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'fn-back';
      back.addEventListener('click', () => {
        const t = backTarget;
        hideBack();
        if (!t || !document.contains(t)) return;
        const y = t.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4;
        window.scrollTo({ top: Math.max(0, y), behavior: AHC.RM ? 'auto' : 'smooth' });
        t.focus({ preventScroll: true });
      });
      document.body.appendChild(back);
    }
    back.textContent = AHC.T('↩ Back to where you were', '↩ 읽던 곳으로');
    back.hidden = false;
    armed = false;
  }
  function hideBack() { if (back) back.hidden = true; backTarget = null; }

  // 맨 아래 목록의 번호: 본문에서 그 주석을 단 자리로 돌아간다
  function toRef(num) {
    const ref = document.getElementById(num.getAttribute('href').slice(1));
    if (!ref) return;
    hideBack();
    const y = ref.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4;
    window.scrollTo({ top: Math.max(0, y), behavior: AHC.RM ? 'auto' : 'smooth' });
    ref.focus({ preventScroll: true });
    ref.classList.remove('fn-ref-flash'); void ref.offsetWidth; ref.classList.add('fn-ref-flash');
    setTimeout(() => ref.classList.remove('fn-ref-flash'), 2200);
  }

  document.addEventListener('click', (e) => {
    const num = e.target.closest('a.fn-num');
    if (num) { e.preventDefault(); toRef(num); return; }
    const a = e.target.closest('sup a[href^="#fn"]');
    if (a) { e.preventDefault(); open(a); return; }
    if (pop && !pop.contains(e.target)) close(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) { e.preventDefault(); close(true); } });
  window.addEventListener('resize', () => close(false));
  AHC.onLang(() => { close(false); hideBack(); });
  // 읽던 곳으로 다시 올라가면 돌아가기 단추는 할 일이 없다
  window.addEventListener('scroll', () => {
    if (!back || back.hidden || !backTarget) return;
    const r = backTarget.getBoundingClientRect();
    const inView = r.top > 0 && r.bottom < window.innerHeight;
    if (!armed) { if (!inView) armed = true; return; }   // 목록으로 내려가는 동안은 그대로 두고, 다시 올라와 보일 때 걷는다
    if (inView) hideBack();
  }, { passive: true });
})();
