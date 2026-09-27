/* 3D block layout renderer shared by tier pages. A page registers what to draw with
   setBuilder(fn) — fn returns { boxes, pipes } in block units (x = east, z = south, y = up) —
   and defines PIPE (line styles). Boxes: { x, y, z, w, h, d, col, label, tip, ghost, outline, node, hide }. */
let curBuilder = () => ({ boxes: [], pipes: [] });
function setBuilder(fn) { curBuilder = fn; }
const L3 = { yaw: -0.62, pitch: 0.82, zoom: 1.12, panX: 0, panY: 0, hit: [] };
function drawLayout() {
  const cv = document.getElementById('lay3d'); if (!cv) return;
  const wrapW = cv.parentElement.clientWidth, H = wrapW < 600 ? 420 : 600;
  const dpr = window.devicePixelRatio || 1;
  cv.width = wrapW * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const colOf = v => css.getPropertyValue(v).trim() || v;
  const rgb = hex => { const h = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const shade = (hex, f) => `rgb(${rgb(hex).map(c => Math.round(c * f)).join(',')})`;
  ctx.fillStyle = colOf('--surface'); ctx.fillRect(0, 0, wrapW, H);

  const { boxes, pipes } = curBuilder();
  const vis = boxes.filter(b => !b.hide && (!b.ghost || S.layGhost || b.outline));
  // 장면 중심과 배율
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  boxes.forEach(b => { [[b.x, b.y, b.z], [b.x + b.w, b.y + b.h, b.z + b.d]].forEach(p => p.forEach((v, i) => { mn[i] = Math.min(mn[i], v); mx[i] = Math.max(mx[i], v); })); });
  const c0 = mn.map((v, i) => (v + mx[i]) / 2);
  const cy = Math.cos(L3.yaw), sy = Math.sin(L3.yaw), cp = Math.cos(L3.pitch), sp = Math.sin(L3.pitch);
  // 배율은 시점을 초기화할 때만 맞춘다. 회전할 때마다 맞추면 화면이 계속 커졌다 작아진다.
  if (!L3.fit || L3.fitW !== wrapW) {
    let ex = 0, ey = 0;
    boxes.forEach(b => [b.x, b.x + b.w].forEach(x => [b.y, b.y + b.h].forEach(y => [b.z, b.z + b.d].forEach(z => {
      const dx = x - c0[0], dy = y - c0[1], dz = z - c0[2], xr = cy * dx - sy * dz, zr = sy * dx + cy * dz;
      ex = Math.max(ex, Math.abs(xr)); ey = Math.max(ey, Math.abs(zr * sp - dy * cp));
    }))));
    L3.fit = Math.min(wrapW / (2 * ex), H / (2 * ey)) * 0.94; L3.fitW = wrapW;
  }
  const sc = L3.fit * L3.zoom;
  const P = (x, y, z) => {
    const dx = x - c0[0], dy = y - c0[1], dz = z - c0[2];
    const xr = cy * dx - sy * dz, zr = sy * dx + cy * dz;
    return [wrapW / 2 + L3.panX + xr * sc, H / 2 + L3.panY + (zr * sp - dy * cp) * sc, zr * cp + dy * sp];
  };
  const faceDepth = n => { const zr = sy * n[0] + cy * n[2]; return zr * cp + n[1] * sp; };
  const LIGHT = { '0,1,0': 1, '0,-1,0': 0.5, '1,0,0': 0.8, '-1,0,0': 0.8, '0,0,1': 0.66, '0,0,-1': 0.66 };

  // 바닥 격자
  ctx.strokeStyle = colOf('--grid'); ctx.lineWidth = 1;
  for (let x = Math.floor(mn[0]) - 1; x <= Math.ceil(mx[0]) + 1; x++) { const a = P(x, 0, mn[2] - 1), b = P(x, 0, mx[2] + 1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let z = Math.floor(mn[2]) - 1; z <= Math.ceil(mx[2]) + 1; z++) { const a = P(mn[0] - 1, 0, z), b = P(mx[0] + 1, 0, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

  const draw = [];
  vis.forEach(b => draw.push({ k: 'box', b, d: P(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2)[2] }));
  if (S.layPipes) pipes.forEach(p => {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], q = p.pts[i + 1], len = Math.hypot(q[0] - a[0], q[1] - a[1], q[2] - a[2]);
      const n = Math.max(1, Math.ceil(len / 0.5));
      for (let k = 0; k < n; k++) {
        const s0 = a.map((v, j) => v + (q[j] - v) * k / n), s1 = a.map((v, j) => v + (q[j] - v) * (k + 1) / n);
        const m = s0.map((v, j) => (v + s1[j]) / 2);
        draw.push({ k: 'pipe', p, s0, s1, d: P(...m)[2] + 0.05 });
      }
    }
  });
  draw.sort((u, v) => u.d - v.d);

  const hit = [];
  const pw = Math.max(1.5, sc * 0.13);
  draw.forEach(it => {
    if (it.k === 'pipe') {
      const a = P(...it.s0), q = P(...it.s1);
      const T = PIPE[it.p.type];
      ctx.strokeStyle = colOf(T.c); ctx.lineWidth = T.w ? Math.max(1, sc * T.w) : pw; ctx.lineCap = 'round';
      if (it.p.long) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]);
      hit.push({ seg: [a, q], tip: `${T.n}|${it.p.long ? '8칸 초과 — Laser Connector로 중계' : T.w ? '케이블 · 레이저' : '배관'}` });
      return;
    }
    const b = it.b, X = [b.x, b.x + b.w], Y = [b.y, b.y + b.h], Zs = [b.z, b.z + b.d];
    const faces = [
      [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
      [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]],
      [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]],
    ];
    const base = colOf(b.zone ? '--muted' : b.col);
    faces.forEach(([n, cs]) => {
      if (faceDepth(n) <= 0) return;
      const poly = cs.map(c => P(X[c[0]], Y[c[1]], Zs[c[2]]));
      ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      if (b.ghost) {
        ctx.setLineDash([4, 3]); ctx.strokeStyle = colOf('--axis'); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = shade(base, LIGHT[n.join(',')]); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      if (b.tip) hit.push({ poly, tip: b.tip });
    });
  });
  // 라벨은 맨 위에
  if (S.layLabels) {
    ctx.font = `600 ${Math.max(9, Math.min(12, sc * 0.3))}px system-ui, "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    boxes.filter(b => b.label && (!b.ghost || S.layGhost || b.hide)).forEach(b => {
      if (b.hide && b.g && !S.layGhost) return;
      const p = P(b.x + b.w / 2, b.y + b.h + 0.15, b.z + b.d / 2);
      const faint = b.hide ? b.g : b.ghost;
      ctx.lineWidth = 3; ctx.strokeStyle = colOf('--surface'); ctx.strokeText(b.label, p[0], p[1]);
      ctx.fillStyle = colOf(faint ? '--muted' : '--ink'); ctx.fillText(b.label, p[0], p[1]);
    });
  }
  // 방위: 왼쪽 아래 고정 위치에 동(+x) · 남(+z) 방향
  const o0 = P(c0[0], 0, c0[2]), ox = 44, oy = H - 34;
  ctx.strokeStyle = colOf('--ink-2'); ctx.fillStyle = colOf('--ink-2'); ctx.lineWidth = 2; ctx.font = '600 12px system-ui, sans-serif';
  [[P(c0[0] + 1, 0, c0[2]), '동'], [P(c0[0], 0, c0[2] + 1), '남']].forEach(([q, t]) => {
    const vx = q[0] - o0[0], vy = q[1] - o0[1], l = Math.hypot(vx, vy) || 1, ex = ox + vx / l * 26, ey = oy + vy / l * 26;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillText(t, ox + vx / l * 38, ey + vy / l * 12 + 5);
  });
  L3.hit = hit.reverse();
}



function mountLayout(extra) {
  const cv = document.getElementById('lay3d'); if (!cv) return;
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) { L3.panX += dx; L3.panY += dy; }
      else { L3.yaw += dx * 0.008; L3.pitch = Math.min(1.55, Math.max(0.15, L3.pitch + dy * 0.006)); }
      cv.removeAttribute('data-tip'); drawLayout(); return;
    }
    const r = cv.getBoundingClientRect(), pt = [e.clientX - r.left, e.clientY - r.top];
    const inside = (poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
    const near = ([a, b]) => { const vx = b[0] - a[0], vy = b[1] - a[1], l = vx * vx + vy * vy || 1; const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * vx + (pt[1] - a[1]) * vy) / l)); return Math.hypot(a[0] + vx * t - pt[0], a[1] + vy * t - pt[1]) < 5; };
    const h = L3.hit.find(x => x.poly ? inside(x.poly) : near(x.seg));
    if (h) cv.setAttribute('data-tip', h.tip); else cv.removeAttribute('data-tip');
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); L3.zoom = Math.min(4, Math.max(0.4, L3.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); drawLayout(); }, { passive: false });
  document.getElementById('layctl').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (extra && extra(b)) return;
    const a = b.dataset.act;
    if (a === 'reset') Object.assign(L3, { yaw: -0.62, pitch: 0.82, zoom: 1.12, panX: 0, panY: 0, fit: 0 });
    if (a === 'top') Object.assign(L3, { yaw: 0, pitch: 1.55, zoom: 1, panX: 0, panY: 0, fit: 0 });
    if (a === 'in') L3.zoom = Math.min(4, L3.zoom * 1.25);
    if (a === 'out') L3.zoom = Math.max(0.4, L3.zoom / 1.25);
    if (a === 'ghost') S.layGhost = !S.layGhost;
    if (a === 'pipes') S.layPipes = !S.layPipes;
    if (a === 'labels') S.layLabels = !S.layLabels;
    document.querySelectorAll('#layctl [data-act]').forEach(x => { if (['ghost', 'pipes', 'labels'].includes(x.dataset.act)) x.setAttribute('aria-pressed', S['lay' + x.dataset.act[0].toUpperCase() + x.dataset.act.slice(1)]); });
    persist(); drawLayout();
  });
  new ResizeObserver(() => drawLayout()).observe(cv.parentElement);
  drawLayout();
}

