/* 청크 전력 배정 (tier pages): 패시브 청크 하나에 그 단계 전압 64A를 배정하고,
   기계마다 레시피 최적 전압(오버클럭 단계)과 전선 계통을 계산한다.

   GTCEu 오버클럭: 한 단계 올릴 때마다 EU/t ×4, 시간 ÷2 (일반) 또는 ÷4 (완전 OC).
   일반 OC는 한 번 할 때마다 작업당 에너지가 2배라서, 부하가 남으면 기본 전압이 가장 효율적이다.
   → 1대 부하가 LOAD_MAX를 넘을 때만 한 단계씩 올리고, 청크 전압(T)을 넘지는 않는다.

   machine spec: { id, name, eut, u, n, perfect?, hatch2?, label? | labels? }
     eut   레시피 EU/t (기본 전압에서)
     u     기본 전압 기준 기계-시간 / 시간 (대수 합계; 1 = 한 대가 쉬지 않고)
     n     대수
     labels 3D 배치에서 이 기계에 해당하는 상자 라벨 (전선 그리기용) */
const PW_TN = ['ULV', 'LV', 'MV', 'HV', 'EV', 'IV', 'LuV', 'ZPM', 'UV', 'UHV', 'UEV', 'UIV', 'UXV', 'OpV'];
const PW_V = PW_TN.map((_, i) => 8 * 4 ** i);
const PW_COL = ['--muted', '--s3', '--s1', '--s2', '--s5', '--s7', '--s8', '--s4', '--s6', '--good', '--good', '--good', '--good', '--good'];
// Mechanics 챕터의 티어별 초전도 케이블
const PW_SC = { LV: 'Soul Infused', MV: 'Signalum', HV: 'Lumium', EV: 'Enderium', IV: 'Shellite', LuV: 'Twinite', ZPM: 'Dragonsteel', UV: 'Prismalium · Melodium', UHV: 'Stellarium', UEV: 'Ancient Runicalium', UIV: 'Rhenium Super-Composite' };
const LOAD_MAX = 0.85;
const pwTier = eut => Math.max(1, PW_V.findIndex(v => eut <= v));
const PW_PIPES = Object.fromEntries(PW_TN.map((t, i) => [`c${i}`, { c: PW_COL[i], n: `${t} 케이블 (${PW_SC[t] || '—'})`, w: 0.13 }]));

function pwPlan(ms, T) {
  const rows = ms.map(m => {
    const n = m.n || 1, per = m.u / n, t0 = pwTier(m.eut), k = m.perfect ? 4 : 2;
    let oc = 0;
    while (per / k ** oc > LOAD_MAX && t0 + oc < T) oc++;
    const speed = k ** oc, eutRun = m.eut * 4 ** oc, duty = per / speed, tier = t0 + oc;
    const peakA = n * eutRun / PW_V[T], avgA = n * eutRun * Math.min(1, duty) / PW_V[T];
    let why;
    if (oc === 0) why = per <= LOAD_MAX ? '기본 전압 — 부하가 남아 OC하면 에너지만 늘어남' : '청크 전압 한도 — 대수를 늘릴 것';
    else why = `1대 부하 ${fmt(per * 100, 0)}% → ${oc}단계 OC · ${m.perfect ? '완전 OC라 작업당 에너지 그대로' : `작업당 에너지 ×${2 ** oc} (한 대 더 놓으면 ×1)`}`;
    if (duty > 1) why += ' · 그래도 모자람 → 대수 추가';
    // 대수 최소: 전부 1대로 몰았을 때 필요한 전압
    let oc1 = 0;
    while (m.u / k ** oc1 > LOAD_MAX && t0 + oc1 < T) oc1++;
    const one = { tier: t0 + oc1, oc: oc1, peakA: m.eut * 4 ** oc1 / PW_V[T], ok: m.u / k ** oc1 <= 1 };
    return { ...m, n, per, t0, oc, tier, eutRun, duty, peakA, avgA, why, one };
  });
  const peak = rows.reduce((a, r) => a + r.peakA, 0), avg = rows.reduce((a, r) => a + r.avgA, 0);
  const peakOne = rows.reduce((a, r) => a + r.one.peakA, 0), trunk = Math.max(...rows.map(r => r.tier));
  const groups = {};
  rows.forEach(r => { (groups[r.tier] ||= []).push(r); });
  return { T, rows, peak, avg, groups, peakOne, trunk };
}

function pwCard(ms, T, note = '') {
  const p = pwPlan(ms, T), cap = 64, tn = PW_TN[T];
  const tiers = Object.keys(p.groups).map(Number).sort((a, b) => b - a);
  const grpA = t => p.groups[t].reduce((a, r) => a + r.peakA, 0);
  const lowA = t => p.groups[t].reduce((a, r) => a + r.n * Math.min(1, r.eutRun / PW_V[t]), 0);   // 그 전압에서 기계당 ≤1A
  return `
  <div class="tiles">
    ${tile(`배정 · ${tn} 64A`, fmt(cap * PW_V[T], 0), 'EU/t', `간선 ${PW_SC[tn] || '—'} 초전도 · 손실 0`)}
    ${tile('피크 (모두 동시에)', fmt(p.peak, 1), `A ${tn}`, `${fmt(p.peak / cap * 100, 0)}% of 64A`)}
    ${tile('평균', fmt(p.avg, 2), `A ${tn}`, `${fmt(p.avg * PW_V[T], 0)} EU/t`)}
    ${tile('64A로 늘릴 수 있는 배수', '×' + fmt(Math.floor(cap / Math.max(p.peak, 1e-9)), 0), '', `대수 최소 모드 피크 ${fmt(p.peakOne, 2)}A`)}
  </div>
  ${callout(p.peak > cap ? 'warn' : 'ok', p.peak > cap ? '!' : '✓', p.peak > cap
    ? `피크가 ${tn} 64A를 넘습니다(${fmt(p.peak, 1)}A). OC 단계를 낮추거나 청크를 나눕니다.`
    : `피크 ${fmt(p.peak, 1)}A — ${tn} 64A 안입니다. 남는 ${fmt(cap - p.peak, 1)}A는 다음 티어 기계 · 확장용 여유.`)}
  <div class="card"><h3>계통별 피크 (${tn} 환산)</h3>
    ${hbar(tiers.map(t => ({ label: `${PW_TN[t]} 계통`, sub: `${p.groups[t].length}종 · ${p.groups[t].reduce((a, r) => a + r.n, 0)}대`, value: grpA(t), color: `var(${PW_COL[t]})`, text: `${fmt(grpA(t), 2)}A ${tn}` })), { max: 64, ref: { v: 64, l: `${tn} 64A` }, cols: ['계통', `A (${tn})`] })}
  </div>
  <div class="card"><h3>기계별 최적 전압</h3>
    <p class="sub">기본 전압 = 레시피 EU/t가 들어가는 가장 낮은 티어. 1대 부하가 ${LOAD_MAX * 100}%를 넘을 때만 한 단계씩 OC(EU/t ×4, 시간 ÷2 — 완전 OC는 ÷4). 해치 2개 멀티블럭은 한 단계 아래 해치 2개로 같은 전압.</p>
    <div class="tscroll"><table><thead><tr><th>기계</th><th class="n">대수</th><th class="n">레시피 EU/t</th><th>기본</th><th>최적</th><th class="n">가동률</th><th class="n">피크 A(${tn})</th><th>1대로 줄이면</th><th>이유</th></tr></thead>
      <tbody>${p.rows.map(r => `<tr><td><b>${esc(r.name)}</b>${r.hatch2 ? ' <small style="color:var(--muted)">해치 2</small>' : ''}</td><td class="n">${r.n}</td><td class="n">${fmt(r.eut, 0)}</td><td>${PW_TN[r.t0]}</td><td><span class="chip"><i style="background:var(${PW_COL[r.tier]})"></i></span> <b>${PW_TN[r.tier]}</b>${r.oc ? ` <small>(+${r.oc})</small>` : ''}</td><td class="n">${fmt(Math.min(1, r.duty) * 100, 0)}%</td><td class="n">${fmt(r.peakA, 3)}</td><td>${r.n > 1 || r.one.oc ? `${PW_TN[r.one.tier]}${r.one.oc ? ` (+${r.one.oc})` : ''}${r.one.ok ? '' : ' ✗'}` : '—'}</td><td style="font-size:12.5px">${esc(r.why)}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="card"><h3>전선 계통</h3>
    <div class="tscroll"><table><thead><tr><th>계통</th><th>케이블</th><th>변압</th><th class="n">그 전압 A</th><th>물린 기계</th></tr></thead>
      <tbody>${tiers.map(t => `<tr><td><b>${PW_TN[t]}</b></td><td>${PW_SC[PW_TN[t]] || 'Tin 등 일반 케이블'}</td><td>${t === p.trunk ? (t === T ? '간선 직결' : `${tn} 배정 → ${PW_TN[t]} 간선으로 강압 ${T - t}단계`) : `간선 ${PW_TN[p.trunk]} → ${PW_TN[t]} 강압 ${p.trunk - t}단계 (<code>${PW_TN[t].toLowerCase()}_transformer${lowA(t) > 4 ? '_16a' : ''}</code>${p.trunk - t > 1 ? ' 등 연쇄' : ''})`}</td><td class="n">${fmt(lowA(t), 1)}</td><td>${p.groups[t].map(r => esc(r.name)).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
    <ul class="pts" style="margin-top:10px">
      <li><b>간선은 청크 최고 전압(${PW_TN[p.trunk]} · ${PW_SC[PW_TN[p.trunk]] || ''})</b>: ${tn} 64A 배정이 들어오면 ${p.trunk < T ? `${PW_TN[p.trunk]}로 한 번 내려 간선을 깔고, ` : ''}계통마다 트랜스포머를 한 번씩 두어 같은 전압 기계만 묶습니다. 낮은 전압 기계를 높은 선에 물리면 터집니다.</li>
      <li><b>대수 최소 모드</b>: 전력이 넉넉한 단계에서는 같은 기계를 여러 대 놓는 대신 1대를 OC로 돌리는 편이 자리 · 재료가 덜 듭니다(일반 OC는 작업당 에너지 ×2). "1대로 줄이면" 열이 그 전압 — ✗는 청크 전압으로도 모자람.</li>
      <li>초전도 케이블은 손실 0이라 거리 상관없음. 케이블 한 가닥의 암페어 한도는 ${EMI} — 부족하면 2x · 4x 굵기.</li>
      <li>64A는 <b>배정 한도</b>(변압 · 케이블 설계 기준)입니다. 실제 공급은 <a href="common.html#power">공용 › 발전</a>.</li>
      ${note}
    </ul>
  </div>`;
}

/* 3D: 라벨로 기계 상자를 찾아 전원 상자(라벨 src)에서 계통 색 전선을 L자로 깐다. */
function pwWire(built, ms, T, src) {
  const p = pwPlan(ms, T);
  const s = built.boxes.find(b => b.label === src); if (!s) return built;
  const sx = s.x + s.w / 2, sz = s.z + s.d / 2;
  const tiers = Object.keys(p.groups).map(Number).sort((a, b) => b - a);
  p.rows.forEach(r => {
    const labels = r.labels || (r.label ? [r.label] : []);
    const off = 0.14 * tiers.indexOf(r.tier);
    built.boxes.filter(b => labels.includes(b.label)).forEach(b => {
      const tx = b.x + b.w / 2, tz = b.z + b.d / 2;
      b.tip = `${b.tip || b.label + '|'} · 전원 ${PW_TN[r.tier]}${r.oc ? ` (+${r.oc} OC)` : ''} · 피크 ${fmt(r.eutRun, 0)} EU/t`;
      built.pipes.push({ type: `c${r.tier}`, pts: [[sx + off, 0.06, sz + off], [tx + off, 0.06, sz + off], [tx + off, 0.06, tz]] });
    });
  });
  return built;
}
function pwLegend(ms, T) {
  const p = pwPlan(ms, T);
  return Object.keys(p.groups).map(Number).sort((a, b) => b - a)
    .map(t => `<span><i style="background:var(${PW_COL[t]});height:4px;border-radius:2px"></i>${PW_TN[t]} 케이블</span>`).join('');
}
