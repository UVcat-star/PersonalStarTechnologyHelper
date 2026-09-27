/* UHV 이상 페이지 공용 틀. 페이지는 데이터 D 하나만 정의하고 lateStart(D)를 부른다.
   D = {
     key, T (전압 인덱스: UHV 9 …), lead, tiles: [[label, value, unit, desc]],
     roadmap: { stages: [[id, 무엇, 전압, 핵심, 탭]], flow: flowSpec },
     opens: [html…], order: [html…],                         // 로드맵 아래 두 카드
     entry: { lead, flow?, cards: [card] },                    // card = { h, li?: [html], table?: { head, rows }, note? }
     circuit: { lead, rows: [{ n, t, id, eut, dur, out, in }], cards: [card] },
     resource: { lead, flow, cards: [card] },
     passive: { name, lead, flow, cards3d: [card], build: () => ({ boxes, pipes }), legend: [[col, text]], src, pw: () => ms, pwNote },
     next: { lead, cards: [card], table?: { head, rows } },
   } */
Object.assign(TIER, {
  EV: { c: 'var(--s5)', name: 'EV' }, IV: { c: 'var(--s7)', name: 'IV' }, LuV: { c: 'var(--s8)', name: 'LuV' },
  ZPM: { c: 'var(--s4)', name: 'ZPM' }, UV: { c: 'var(--s1)', name: 'UV · LuV 기계' }, UHV: { c: 'var(--s8)', name: 'UHV 기계 · 레시피' },
  UEV: { c: 'var(--s4)', name: 'UEV 기계 · 레시피' }, UIV: { c: 'var(--s7)', name: 'UIV 기계 · 레시피' }, UXV: { c: 'var(--s5)', name: 'UXV 기계 · 레시피' },
  GOAL: { c: 'var(--good)', name: '목표' },
});
const PIPE = { beam: { c: '--s8', n: '주요 흐름 (LaserIO)', w: 0.05 } };
Object.assign(PIPE, PW_PIPES);

function lateCard(c) {
  let h = `<div class="card"><h3>${c.h}</h3>`;
  if (c.sub) h += `<p class="sub">${c.sub}</p>`;
  if (c.li) h += `<ul class="pts">${c.li.map(x => `<li>${x}</li>`).join('')}</ul>`;
  if (c.ol) h += `<ol class="steps">${c.ol.map(x => `<li>${x}</li>`).join('')}</ol>`;
  if (c.table) h += `<div class="tscroll"><table><thead><tr>${c.table.head.map((x, i) => `<th${c.table.num && c.table.num.includes(i) ? ' class="n"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${c.table.rows.map(r => `<tr>${r.map((x, i) => `<td${c.table.num && c.table.num.includes(i) ? ' class="n"' : ''}>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (c.note) h += `<p class="sub" style="margin:10px 0 0">${c.note}</p>`;
  return h + '</div>';
}
const lateCards = cs => {
  const out = [];
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].wide) out.push(lateCard(cs[i]));
    else if (cs[i + 1] && !cs[i + 1].wide) { out.push(`<div class="grid2">${lateCard(cs[i])}${lateCard(cs[i + 1])}</div>`); i++; }
    else out.push(lateCard(cs[i]));
  }
  return out.join('');
};
const TIERKEYS = ['EV', 'IV', 'LuV', 'ZPM', 'UV', 'UHV', 'UEV', 'UIV', 'UXV', 'GOAL', 'src'];
const legendFor = spec => tierLegend(TIERKEYS.filter(k => spec.nodes.some(n => n.k === k)));

function lateStart(D) {
  const tn = PW_TN[D.T];
  window.TOPICS = [
    { id: 'overview', name: '로드맵' },
    { id: 'entry', name: `1 · ${tn} 진입` },
    { id: 'circuit', name: '2 · 회로' },
    { id: 'resource', name: '3 · 자원 · 차원' },
    { id: 'passive', name: `4 · 패시브 (${D.passive.name})`, subs: [['flow', '흐름'], ['3d', '3D 배치'], ['power', '전력 · 64A']] },
    { id: 'next', name: `5 · ${PW_TN[D.T + 1]} 준비` },
  ];
  const viewOverview = () => `
    <h2>${tn} 로드맵</h2>
    <p class="lead">${D.lead}</p>
    <div class="tiles">${D.tiles.map(t => tile(...t)).join('')}</div>
    <div class="card"><h3>단계</h3>
      ${flow(D.roadmap.flow)}${legendFor(D.roadmap.flow)}
      <div class="tscroll" style="margin-top:12px"><table><thead><tr><th>단계</th><th>무엇</th><th>전압</th><th>핵심</th><th>탭</th></tr></thead>
      <tbody>${D.roadmap.stages.map(r => `<tr><td><b>${r[0]}</b></td><td>${esc(r[1])}</td><td>${r[2]}</td><td>${esc(r[3])}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div>
    </div>
    ${lateCards([{ h: `${tn}에 새로 열리는 것`, li: D.opens }, { h: '보는 순서', li: D.order }])}`;
  const viewEntry = () => `
    <h2>1 · ${tn} 진입</h2>
    <p class="lead">${D.entry.lead}</p>
    ${D.entry.flow ? `<div class="card">${flow(D.entry.flow)}${legendFor(D.entry.flow)}</div>` : ''}
    ${lateCards(D.entry.cards)}`;
  const viewCircuit = () => `
    <h2>2 · 회로</h2>
    <p class="lead">${D.circuit.lead}</p>
    <div class="card">
      ${hbar(D.circuit.rows.map(c => ({ label: `${c.n} (${c.t})`, sub: c.id, value: c.eut, color: `var(${PW_COL[Math.max(1, PW_V.findIndex(v => c.eut <= v))]})`, text: `${fmt(c.eut, 0)} EU/t${c.dur ? ` · ${c.dur}t` : ''}${c.out ? ` · ${c.out}개` : ''}` })), { ref: { v: PW_V[D.T], l: `${tn} 한계 ${fmt(PW_V[D.T], 0)}V` }, cols: ['회로', 'EU/t'] })}
      <div class="tscroll" style="margin-top:12px"><table><thead><tr><th>회로</th><th>어디서</th><th>재료 · 비고</th></tr></thead>
        <tbody>${D.circuit.rows.map(c => `<tr><td><b>${c.n}</b> <code>${c.id}</code></td><td>${esc(c.where || '')}</td><td>${esc(c.in)}</td></tr>`).join('')}</tbody></table></div>
    </div>
    ${lateCards(D.circuit.cards)}`;
  const viewResource = () => `
    <h2>3 · 자원 · 차원</h2>
    <p class="lead">${D.resource.lead}</p>
    <div class="card">${flow(D.resource.flow)}${legendFor(D.resource.flow)}</div>
    ${lateCards(D.resource.cards)}`;
  const P = D.passive;
  const viewPFlow = () => `
    <h2>4 · 패시브 (${P.name})</h2>${subnav()}
    <p class="lead">${P.lead}</p>
    <div class="card">${flow(P.flow)}${legendFor(P.flow)}</div>
    ${lateCards(P.cards || [])}`;
  const viewP3d = () => {
    const pressed = k => `aria-pressed="${S[k]}"`;
    return `
    <h2>4 · 패시브 (${P.name})</h2>${subnav()}
    <p class="lead">${P.lead3d}</p>
    <div class="card">
      <div id="layctl" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:12px">
        <div class="seg"><button data-act="ghost" ${pressed('layGhost')}>빈 자리</button><button data-act="pipes" ${pressed('layPipes')}>선</button><button data-act="labels" ${pressed('layLabels')}>라벨</button></div>
        <div class="seg"><button data-act="reset">기본 시점</button><button data-act="top">위에서</button><button data-act="in" aria-label="확대">＋</button><button data-act="out" aria-label="축소">－</button></div>
      </div>
      <div><canvas id="lay3d" role="img" aria-label="${esc(P.name)} 청크 3D 배치도" style="display:block;width:100%;border-radius:8px;touch-action:none;cursor:grab"></canvas></div>
      <div class="legend">${P.legend.map(([c, t]) => `<span><i style="background:var(${c})"></i>${t}</span>`).join('')}${pwLegend(P.pw(), D.T)}</div>
    </div>
    ${lateCards(P.cards3d || [])}`;
  };
  const viewPPower = () => `
    <h2>4 · 패시브 (${P.name})</h2>${subnav()}
    <p class="lead">패시브 청크 하나에 <b>${tn} 64A</b>(${fmt(64 * PW_V[D.T], 0)} EU/t)를 배정했습니다. 기계마다 레시피 최적 전압과 전선 계통입니다.</p>
    ${pwCard(P.pw(), D.T, P.pwNote || '')}`;
  const viewNext = () => `
    <h2>5 · ${PW_TN[D.T + 1]} 준비</h2>
    <p class="lead">${D.next.lead}</p>
    ${lateCards(D.next.cards)}`;
  window.VIEWS = { overview: viewOverview, entry: viewEntry, circuit: viewCircuit, resource: viewResource, passive: { flow: viewPFlow, '3d': viewP3d, power: viewPPower }, next: viewNext };
  startPage({ key: D.key, layouts: [[viewP3d, () => pwWire(P.build(), P.pw(), D.T, P.src)]] });
}
