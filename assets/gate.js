/* 게이트 순서도 공용 틀 (tier pages · charts.js 뒤에 로드). hv · ev · iv는 인라인으로 먼저 만들었고 luv부터 이 틀을 씀.
   4레인(GX) × 행(GY). nodes: [id, lane, row, 제목, 부제, TIER 키, tip, span(레인 수)] · bands: [y, 라벨] */
const GX = [15, 262, 509, 756], GW = 229;
const GY = { r0: 26, r1: 118, r1b: 190, r2: 284, r3: 378, r4: 472, r5: 566, r6: 638, r7: 732 };
function gateFlow(label, bands, nodes, edges) {
  const nd = nodes.map(([id, lane, row, t, s, k, tip, span = 1]) => ({ id, x: GX[lane], y: GY[row], w: GX[lane + span - 1] + GW - GX[lane], t, s, k, tip }));
  return flow({ label, h: 800, nodes: nd, edges })
    .replace(/(<svg[^>]*>)/, '$1' + bands.map(([y, l]) => `<line x1="10" y1="${y + 2}" x2="990" y2="${y + 2}" stroke="var(--axis)" stroke-dasharray="4 5"/><text x="12" y="${y - 2}" class="elabel" style="font-weight:600">${esc(l)}</text>`).join(''));
}
// rows: [단계, 할 일, 막는 것, 풀리는 것, 'gate' | 'goal' | '']
function gateStages(rows) {
  const st = k => k === 'gate' ? ' style="color:var(--critical)"' : k === 'goal' ? ' style="color:var(--good)"' : '';
  return `<div class="tscroll"><table><thead><tr><th>단계</th><th>할 일</th><th>막는 것</th><th>풀리는 것</th></tr></thead>
    <tbody>${rows.map(([a, b, c, d, k]) => `<tr><td><b${st(k)}>${a}</b></td><td>${b}</td><td>${c}</td><td>${d}</td></tr>`).join('')}</tbody></table></div>`;
}
// rows: [레시피, id, 온도 K (0 = 없음), EU/t, 돌리는 곳, 판정 키] · V: { 키: [이름, 색] }
function gateVerdicts(rows, V) {
  return `<div class="tscroll"><table><thead><tr><th>레시피</th><th>ID</th><th class="n">온도</th><th class="n">EU/t</th><th>돌리는 곳</th><th>판정</th></tr></thead>
    <tbody>${rows.map(([n, id, k, eut, where, v]) => `<tr><td>${esc(n)}</td><td><code>${esc(id)}</code></td><td class="n">${k ? fmt(k, 0) + 'K' : '—'}</td><td class="n">${eut ? fmt(eut, 0) : '—'}</td><td>${esc(where)}</td><td><span class="chip"><i style="background:${V[v][1]}"></i>${V[v][0]}</span></td></tr>`).join('')}</tbody></table></div>`;
}
Object.assign(TIER, { OK: { c: 'var(--s3)', name: '앞 티어에서 가져옴' }, CR: { c: 'var(--s6)', name: '클린룸 · 연구' }, GATE: { c: 'var(--critical)', name: '게이트' } });
