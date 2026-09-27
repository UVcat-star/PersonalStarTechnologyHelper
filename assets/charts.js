/* Chart and diagram helpers shared by tier pages: flow() diagrams, hbar()/stackbar() with
   "표로 보기" tables, tiles, callouts, and the hover tooltip. Pages add their own TIER keys. */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: d });
const TIER = {
  LV: { c: 'var(--s3)', name: 'LV 기계' },
  MV: { c: 'var(--s1)', name: 'MV 기계' },
  HV: { c: 'var(--s2)', name: 'HV 기계' },
  LCR: { c: 'var(--s7)', name: 'Large Chemical Reactor' },
  OF: { c: 'var(--s4)', name: 'Electric Ore Factory' },
  tank: { c: 'var(--muted)', name: '탱크 / 저장' },
  src: { c: 'transparent', name: '원료 / 외부 공급' },
};
function tierLegend(keys) {
  return `<div class="legend">${keys.map(k => `<span><i class="${k === 'src' ? 'dash' : ''}" style="background:${TIER[k].c}"></i>${esc(TIER[k].name)}</span>`).join('')}</div>`;
}

/* flow diagram: nodes {id,x,y,w,h,t,s,k,tip}, edges {a,b,l,amt,fs,ts,fo,to,k,lt,tip,dash} */
function flow(spec) {
  const W = spec.w || 1000, H = spec.h;
  const N = {};
  spec.nodes.forEach(n => { n.w = n.w || 150; n.h = n.h || 56; N[n.id] = n; });
  const dir = { r: [1, 0], l: [-1, 0], t: [0, -1], b: [0, 1] };
  const port = (n, side, off = 0) => ({
    r: [n.x + n.w, n.y + n.h / 2 + off], l: [n.x, n.y + n.h / 2 + off],
    t: [n.x + n.w / 2 + off, n.y], b: [n.x + n.w / 2 + off, n.y + n.h],
  })[side];
  let edges = '', labels = '';
  spec.edges.forEach(e => {
    const a = N[e.a], b = N[e.b];
    const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    let fs = e.fs, ts = e.ts;
    if (!fs || !ts) {
      if (Math.abs(dx) >= Math.abs(dy)) { fs = fs || (dx > 0 ? 'r' : 'l'); ts = ts || (dx > 0 ? 'l' : 'r'); }
      else { fs = fs || (dy > 0 ? 'b' : 't'); ts = ts || (dy > 0 ? 't' : 'b'); }
    }
    const p0 = port(a, fs, e.fo), p3 = port(b, ts, e.to);
    const dist = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    const k = e.k || Math.max(30, dist * 0.4);
    // stop the stroke short of the arrowhead so thick flows don't bleed past it
    const back = 7;
    const p3s = [p3[0] + dir[ts][0] * back, p3[1] + dir[ts][1] * back];
    const c1 = [p0[0] + dir[fs][0] * k, p0[1] + dir[fs][1] * k];
    const c2 = [p3s[0] + dir[ts][0] * k, p3s[1] + dir[ts][1] * k];
    const d = `M${p0} C${c1} ${c2} ${p3s}`;
    const sw = e.amt ? Math.min(11, Math.max(2, 1.5 + Math.sqrt(e.amt) / 9)) : 2;
    const tip = e.tip || e.l || '';
    // arrowhead drawn as its own triangle so its size is independent of stroke width
    const ang = Math.atan2(-dir[ts][1], -dir[ts][0]);
    const aw = Math.max(7, sw * 0.9), al = 9;
    const tipPt = p3, bx = p3[0] - Math.cos(ang) * al, by = p3[1] - Math.sin(ang) * al;
    const px = -Math.sin(ang) * aw, py = Math.cos(ang) * aw;
    const tri = `${tipPt} ${bx + px},${by + py} ${bx - px},${by - py}`;
    edges += `<g class="edge" data-tip="${esc(tip)}" tabindex="0">
      <path class="hit" d="${d}"/>
      <path class="line" d="${d}" style="stroke-width:${sw}${e.dash ? ';stroke-dasharray:5 5' : ''}"/>
      <polygon points="${tri}" fill="var(--edge)"/></g>`;
    if (e.l) {
      const t = e.lt ?? 0.5, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3s[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3s[1];
      // keep labels off the stroke: above horizontal flows, beside vertical ones
      const horiz = 'rl'.includes(fs) && 'rl'.includes(ts), vert = 'tb'.includes(fs) && 'tb'.includes(ts);
      const lines = String(e.l).split('\n');
      const defLy = horiz ? -(sw / 2 + 6 + (lines.length - 1) * 7) : 0;
      const defLx = vert ? sw / 2 + 6 : 0;
      const anchor = e.anchor || (vert && e.lx === undefined ? 'start' : 'middle');
      const lx = x + (e.lx ?? defLx), ly = y + (e.ly ?? defLy);
      labels += `<text class="elabel" x="${lx}" y="${ly - (lines.length - 1) * 7}" text-anchor="${anchor}">${lines.map((s, i) => `<tspan x="${lx}" dy="${i ? 14 : 4}">${esc(s)}</tspan>`).join('')}</text>`;
    }
  });
  let nodes = '';
  spec.nodes.forEach(n => {
    const tc = TIER[n.k] ? TIER[n.k].c : 'var(--muted)';
    const isSrc = n.k === 'src';
    nodes += `<g class="node ${isSrc ? 'src' : ''}" data-tip="${esc(n.tip || (n.t + (n.s ? ' · ' + n.s : '')))}" tabindex="0">
      <rect class="box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"/>
      ${isSrc ? '' : `<rect x="${n.x}" y="${n.y}" width="5" height="${n.h}" rx="2" fill="${tc}"/>`}
      <text class="t" x="${n.x + 14}" y="${n.y + (n.s ? 23 : n.h / 2 + 5)}">${esc(n.t)}</text>
      ${n.s ? `<text class="s" x="${n.x + 14}" y="${n.y + 41}">${esc(n.s)}</text>` : ''}
    </g>`;
  });
  return `<div class="diagram"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.label)}">${edges}${nodes}${labels}</svg></div>`;
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function ticks(max) {
  // pick a division count whose step is a round number (1, 2, 2.5, 5 × 10^k)
  const nice = s => { const p = Math.pow(10, Math.floor(Math.log10(s))); return [1, 2, 2.5, 5, 10].some(m => Math.abs(s / p - m) < 1e-9); };
  const n = [4, 5, 3, 2, 6].find(k => nice(max / k)) || 4;
  return Array.from({ length: n + 1 }, (_, i) => max * i / n);
}

/* horizontal bars. rows {label, sub, value, color, text, tip}; opts {max, unit, ref:{v,l}, signed, cols} */
function hbar(rows, o = {}) {
  const unit = o.unit || '';
  const absMax = Math.max(...rows.map(r => Math.abs(r.value)), o.ref ? o.ref.v : 0);
  const max = o.max || niceMax(absMax * 1.08);
  const room = 0.8; // bars use 80% of the track, the rest is for the value label
  const pct = v => (Math.abs(v) / max) * room * (o.signed ? 50 : 100);
  const zero = o.signed ? 50 : 0;
  let html = `<div class="chart"><div class="bars">`;
  rows.forEach(r => {
    const w = pct(r.value), neg = r.value < 0;
    const left = o.signed ? (neg ? zero - w : zero) : 0;
    const text = r.text ?? `${fmt(r.value)}${unit}`;
    const valPos = o.signed
      ? (neg ? `right:${100 - left + 1}%` : `left:${left + w + 1}%`)
      : `left:calc(${w}% + 6px)`;
    html += `<div class="lab"><b>${esc(r.label)}</b>${r.sub ? `<br><span style="font-size:11.5px;color:var(--muted)">${esc(r.sub)}</span>` : ''}</div>
      <div class="track">
        ${o.signed ? `<div class="zero" style="left:${zero}%"></div>` : ''}
        ${w > 0 ? `<div class="bar ${neg ? 'negb' : ''}" tabindex="0" data-tip="${esc(r.tip || `${text}|${r.label}`)}" style="left:${left}%;width:${w}%;background:${r.color}"></div>` : ''}
        <div class="val" style="${valPos}">${esc(text)}</div>
        ${o.ref ? `<div class="refline" style="left:${pct(o.ref.v)}%"></div>` : ''}
      </div>`;
  });
  html += `</div>`;
  if (!o.signed && !o.noAxis) {
    html += `<div class="axisrow"><div></div><div class="axis">${ticks(max).map(t => `<span style="left:${(t / max) * room * 100}%">${fmt(t, 2)}</span>`).join('')}</div></div>`;
  }
  if (o.ref) html += `<div style="font-size:12px;color:var(--ink-2);margin-top:6px">│ 세로선 = ${esc(o.ref.l)}</div>`;
  if (o.legend) html += `<div class="legend">${o.legend.map(l => `<span><i style="background:${l.c}"></i>${esc(l.n)}</span>`).join('')}</div>`;
  const cols = o.cols || ['항목', '값'];
  html += `<details class="tbl"><summary>표로 보기</summary><div class="tscroll"><table><thead><tr>${cols.map((c, i) => `<th class="${i ? 'n' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}${r.sub ? ' (' + esc(r.sub) + ')' : ''}</td><td class="n">${esc(r.text ?? fmt(r.value) + unit)}</td></tr>`).join('')}</tbody></table></div></details>`;
  return html + `</div>`;
}

function stackbar(parts, unit) {
  const total = parts.reduce((a, b) => a + b.v, 0);
  return `<div class="stackbar">${parts.map(p => `<div class="seg-b" tabindex="0" data-tip="${esc(`${fmt(p.v, 0)}${unit} (${fmt(p.v / total * 100, 0)}%)|${p.n}`)}" style="width:${p.v / total * 100}%;background:${p.c}"></div>`).join('')}</div>
    <div class="legend">${parts.map(p => `<span><i style="background:${p.c}"></i>${esc(p.n)} · ${fmt(p.v, 0)}${unit}</span>`).join('')}</div>
    <details class="tbl"><summary>표로 보기</summary><table><thead><tr><th>원료</th><th class="n">Fluorine</th><th class="n">비율</th></tr></thead><tbody>
    ${parts.map(p => `<tr><td>${esc(p.n)}</td><td class="n">${fmt(p.v, 0)}${unit}</td><td class="n">${fmt(p.v / total * 100, 0)}%</td></tr>`).join('')}</tbody></table></details>`;
}

const tile = (l, v, u, d) => `<div class="tile"><div class="l">${esc(l)}</div><div class="v">${v}${u ? `<small>${esc(u)}</small>` : ''}</div>${d ? `<div class="d">${esc(d)}</div>` : ''}</div>`;
const callout = (kind, icon, html) => `<div class="callout ${kind}"><span class="ic" aria-hidden="true">${icon}</span><div>${html}</div></div>`;
const EMI = '<span class="emi">EMI 확인</span>';



/* ---------- tooltip: "value|label" or plain text ---------- */
const tip = document.getElementById('tip');
function showTip(el, x, y) {
  const raw = el.getAttribute('data-tip'); if (!raw) return;
  tip.replaceChildren();
  const [v, l] = raw.split('|');
  const a = document.createElement('div'); a.className = 'tv'; a.textContent = v;
  tip.appendChild(a);
  if (l) { const b = document.createElement('div'); b.className = 'tl'; b.textContent = l; tip.appendChild(b); }
  tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(x + 14, innerWidth - r.width - 8) + 'px';
  tip.style.top = Math.max(8, y - r.height - 12) + 'px';
}
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.style.display = 'none';
});
document.addEventListener('focusin', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); }
});
document.addEventListener('focusout', () => { tip.style.display = 'none'; });

