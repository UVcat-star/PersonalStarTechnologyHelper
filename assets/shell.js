/* Tier sidebar shared by every page. Load it from <head> without defer so the saved
   theme and collapsed state apply before first paint.

   A page names its tier with <body data-tier="HV">. Adding a tier means adding a row to
   TIERS and a page next to hv.html; mark it `soon` until it has content. */
(function () {
  const COMMON = [
    { id: '공용', href: 'common.html', name: 'Mechanics · 코일 · 해치 · 발전', color: '#5a6b7d', short: '공' },
    { id: 'gCrops', href: 'gcrops.html', name: '자원 작물', color: '#3f8f4a', short: 'gC' },
  ];
  const TIERS = [
    { id: 'HV', href: 'hv.html', name: 'High Voltage', color: '#c98500', now: true },
    { id: 'EV', href: 'ev.html', name: 'Extreme Voltage', color: '#9b4fc4', next: true },
    { id: 'IV', href: 'iv.html', name: 'Insane Voltage', color: '#2f6fd6' },
  ];

  const root = document.documentElement;
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const savedTheme = read('st-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  if (read('st-side') === '1') root.classList.add('side-collapsed');

  function isDark() {
    return root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function toggleTheme() {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    write('st-theme', root.dataset.theme);
    syncLabels();
    // Pages that paint with canvas (the HV 3D layout) listen for this to repaint.
    window.dispatchEvent(new Event('themechange'));
  }
  function toggleCollapse() {
    root.classList.toggle('side-collapsed');
    write('st-side', root.classList.contains('side-collapsed') ? '1' : '0');
    syncLabels();
  }
  function setOpen(open) {
    root.classList.toggle('side-open', open);
    document.getElementById('side-open')?.setAttribute('aria-expanded', open);
  }

  function syncLabels() {
    const t = document.querySelector('#side .theme');
    if (t) {
      t.querySelector('.ico').textContent = isDark() ? '☀' : '☾';
      t.querySelector('.txt').textContent = isDark() ? '라이트 모드' : '다크 모드';
      t.title = t.querySelector('.txt').textContent;
    }
    const c = document.querySelector('#side .collapse');
    if (c) {
      const collapsed = root.classList.contains('side-collapsed');
      c.querySelector('.ico').textContent = collapsed ? '»' : '«';
      c.setAttribute('aria-expanded', !collapsed);
      c.title = collapsed ? '사이드바 펼치기' : '사이드바 접기';
    }
  }

  function build() {
    const current = document.body.dataset.tier;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const link = t => `
      <a href="${t.href}" ${t.id === current ? 'aria-current="page"' : ''} title="${esc(t.id + ' · ' + t.name)}">
        <span class="tier" style="--tc:${t.color}">${esc(t.short || t.id)}</span>
        <span class="lbl"><span class="row">${esc(t.id)}</span><small>${esc(t.name)}</small></span>
      </a>`;
    const common = COMMON.map(link).join('');
    const items = TIERS.map(t => `
      <a href="${t.href}" class="${t.soon ? 'soon' : ''}" ${t.id === current ? 'aria-current="page"' : ''} title="${esc(t.id + ' · ' + t.name)}">
        <span class="tier" style="--tc:${t.color}">${esc(t.id)}</span>
        <span class="lbl"><span class="row">${esc(t.id)}${t.now ? '<span class="badge now">현재</span>' : t.next ? '<span class="badge">다음</span>' : t.soon ? '<span class="badge">Coming soon</span>' : ''}</span><small>${esc(t.name)}</small></span>
      </a>`).join('');

    const side = document.createElement('aside');
    side.id = 'side';
    side.setAttribute('aria-label', '전력 티어');
    side.innerHTML = `
      <div class="brand"><b>Star Technology</b><span>Theta 2 · 자동화 라인 정리</span><div class="mark" aria-hidden="true">ST</div></div>
      <div class="group">공용</div>
      <nav>${common}</nav>
      <div class="group">전력 티어</div>
      <nav>${items}</nav>
      <div class="foot">
        <button type="button" class="theme"><span class="ico" aria-hidden="true"></span><span class="txt"></span></button>
        <button type="button" class="collapse"><span class="ico" aria-hidden="true"></span><span class="txt">사이드바 접기</span></button>
      </div>`;
    const open = document.createElement('button');
    open.id = 'side-open'; open.type = 'button';
    open.setAttribute('aria-label', '전력 티어 메뉴'); open.setAttribute('aria-controls', 'side'); open.setAttribute('aria-expanded', 'false');
    open.textContent = '☰';
    const scrim = document.createElement('div');
    scrim.id = 'side-scrim';

    document.body.prepend(side, scrim, open);
    side.querySelector('.theme').addEventListener('click', toggleTheme);
    side.querySelector('.collapse').addEventListener('click', toggleCollapse);
    open.addEventListener('click', () => setOpen(true));
    scrim.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncLabels);
    syncLabels();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
