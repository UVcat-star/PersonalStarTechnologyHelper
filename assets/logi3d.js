/* AE2 · LaserIO 물류를 3D 배치에 그리는 공용 부품 (tier pages). layout3d.js 뒤에 로드.
   페이지는 Object.assign(PIPE, LOGI_PIPES)로 선 모양을 합치고, 빌더 안에서 lk = logiKit(built)로 부품을 놓는다.

   티어마다 쓸 수 있는 ME 부품이 다르다 (GTCEu jar MetaTileEntityMachineRecipeLoader · 팩 machinery.js 확인):
     HV   AE2 Pattern Provider · Interface · Storage Bus + LaserIO. GT ME 해치는 EV bus/hatch가 재료라 아직 없음
     EV   GT ME Input/Output Bus · Hatch (me_import_* / me_export_*: EV bus/hatch + AE 인터페이스 · HV Assembler)
     IV   GT ME Stocking Input Bus · Hatch (IV Conveyor/Pump + IV Sensor → Quantum Star 뒤)
     LuV  GT ME Pattern Buffer · Proxy (LuV Emitter · LuV 회로)
   서브넷: 컨트롤러 없는 작은 AE2 네트워크(채널 8개 이하). 단계 사이 중간재를 주 네트워크에 올리지 않고 버퍼로 둔다.
   주 네트워크는 서브넷 쪽 Interface에 붙인 Storage Bus로 잔량만 본다(우선순위 낮게 — 주 네트워크 물건이 서브넷으로 새지 않게). */
const LOGI_PIPES = {
  me: { c: '--ink', n: 'ME 주 네트워크 케이블', w: 0.1 },
  sub: { c: '--ink-2', n: 'ME 서브넷 케이블 (점선)', w: 0.08, dash: [3, 3] },
  laser: { c: '--s8', n: 'LaserIO 레이저', w: 0.05 },
};
const LOGI_PART = {
  sbus: { c: '--s7', n: 'AE2 Storage Bus', d: '붙은 탱크 · 인터페이스의 내용을 네트워크에 보여 줌' },
  pp: { c: '--s4', n: 'AE2 Pattern Provider', d: '패턴대로 재료를 한 번에 밀어 넣음 (Blocking Mode면 기계가 빌 때만)' },
  iface: { c: '--s1', n: 'ME Interface', d: '서브넷 경계. 주 네트워크 Storage Bus가 여기를 봄' },
  meout: { c: '--s6', n: 'GT ME Output Bus · Hatch', d: '출력이 바로 네트워크로 (EV부터)' },
  mein: { c: '--s6', n: 'GT ME Input Bus · Hatch', d: '설정한 재료를 네트워크에서 끌어옴 (EV부터)' },
  stock: { c: '--s6', n: 'GT ME Stocking Input Bus · Hatch', d: '네트워크 재고를 그대로 입력으로 봄 · 꺼내지 않음 (IV부터)' },
  pbuf: { c: '--s5', n: 'GT ME Pattern Buffer', d: '패턴 + 입력 버스/해치 한 칸 (LuV부터)' },
  proxy: { c: '--s5', n: 'GT ME Pattern Buffer Proxy', d: '같은 Pattern Buffer를 다른 멀티블럭에 공유 (LuV부터)' },
  p2p: { c: '--s7', n: 'ME P2P Tunnel', d: '주 네트워크 입구 — 기지 컨트롤러에서 채널을 끌어옴' },
  wc: { c: '--s7', n: 'ME Wireless Connector (ExtendedAE)', d: '케이블 없이 두 지점을 같은 네트워크로' },
  req: { c: '--s4', n: 'ME Requester', d: '재고 목표를 정해 두면 모자랄 때 자동으로 제작 요청 — 패시브 라인의 스위치' },
};
function logiKit(built) {
  const box = o => (built.boxes.push(o), o);
  const c = ([x, y, z]) => [x + 0.5, y + 0.5, z + 0.5];
  const plate = (x, y, z, face, kind, what) => {
    const t = 0.16, P = LOGI_PART[kind];
    const o = { x: x + 0.22, y: y + 0.22, z: z + 0.22, w: 0.56, h: 0.56, d: 0.56, col: P.c, tip: `${P.n}|${what} — ${P.d}` };
    if (face === 'w') Object.assign(o, { x: x - t, w: t }); if (face === 'e') Object.assign(o, { x: x + 1, w: t });
    if (face === 'n') Object.assign(o, { z: z - t, d: t }); if (face === 's') Object.assign(o, { z: z + 1, d: t });
    if (face === 'u') Object.assign(o, { y: y + 1, h: t });
    return box(o);
  };
  return {
    // LaserIO Node (블록 한 칸). cards = 카드 설명 목록
    node: (x, y, z, what, cards = []) => box({ x: x + 0.15, y: y + 0.15, z: z + 0.15, w: 0.7, h: 0.7, d: 0.7, col: '--s8', node: true, tip: `LaserIO Node · ${what}|${cards.join(' · ')}` }),
    // 블록 한 칸짜리 AE2 부품 (Interface · Pattern Provider · P2P 등)
    blk: (x, y, z, kind, what, label) => box({ x: x + 0.1, y: y + 0.1, z: z + 0.1, w: 0.8, h: 0.8, d: 0.8, col: LOGI_PART[kind].c, label, tip: `${LOGI_PART[kind].n}|${what} — ${LOGI_PART[kind].d}` }),
    // 기계 · 탱크 면에 붙는 부품 (face: n · s · e · w · u)
    part: plate,
    laser: (a, b) => built.pipes.push({ type: 'laser', pts: [c(a), c(b)] }),
    me: pts => built.pipes.push({ type: 'me', pts: pts.map(c) }),
    sub: pts => built.pipes.push({ type: 'sub', pts: pts.map(c) }),
  };
}
function logiLegend(kinds) {
  return [['me', LOGI_PIPES.me], ['sub', LOGI_PIPES.sub], ['laser', LOGI_PIPES.laser]]
    .map(([, p]) => `<span><i style="background:var(${p.c});height:4px;border-radius:2px"></i>${p.n}</span>`).join('')
    + kinds.map(k => `<span><i style="background:var(${LOGI_PART[k].c})"></i>${LOGI_PART[k].n}</span>`).join('');
}
// nets: [{ n, kind: '주' | '서브넷' | 'LaserIO', what, edge, seen, parts }]
function logiNets(nets) {
  return `<div class="tscroll"><table><thead><tr><th>네트워크</th><th>종류</th><th>담는 것</th><th>경계 · 들어오고 나가는 곳</th><th>주 네트워크에서 보는 법</th></tr></thead>
    <tbody>${nets.map(r => `<tr><td><b>${esc(r.n)}</b></td><td>${esc(r.kind)}</td><td>${r.what}</td><td>${r.edge}</td><td>${r.seen}</td></tr>`).join('')}</tbody></table></div>`;
}
/* 3D 카드 공용 틀: 조작 버튼 + 캔버스 + 범례. 페이지 상태 S의 lay* 토글을 씀 */
function layBlock(aria, legend) {
  const pressed = k => `aria-pressed="${S[k]}"`;
  return `<div class="card">
    <div id="layctl" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:12px">
      <div class="seg"><button data-act="pipes" ${pressed('layPipes')}>선</button><button data-act="labels" ${pressed('layLabels')}>라벨</button></div>
      <div class="seg"><button data-act="reset">기본 시점</button><button data-act="top">위에서</button><button data-act="in" aria-label="확대">＋</button><button data-act="out" aria-label="축소">－</button></div>
    </div>
    <div><canvas id="lay3d" role="img" aria-label="${aria}" style="display:block;width:100%;border-radius:8px;touch-action:none;cursor:grab"></canvas></div>
    <div class="legend">${legend}</div>
  </div>`;
}

