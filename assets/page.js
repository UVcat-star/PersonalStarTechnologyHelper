/* Page skeleton shared by the tier pages: top tabs with optional sub-tabs, hash routing
   (#topic or #topic/sub), per-page localStorage, and the render loop.

   A page defines, before calling startPage(config):
     S       state object with topic, sub, layGhost, layPipes, layLabels (+ its own fields)
     TOPICS  [{ id, name, subs?: [[subId, name], …] }]
     VIEWS   { topicId: viewFn | { subId: viewFn } }
   and passes config = {
     key       localStorage key
     save()    fields to persist besides topic/sub/lay
     load(o)   restore those fields from a saved object
     alias?    { oldHash: 'topic/sub' } so old links keep working
     layouts?  [[viewFn, builderFn], …] — views that host the 3D canvas and what they draw
     layoutButton?(button)  extra #layctl buttons; return true when handled
     mainClick?(event)      extra clicks inside <main>; return true when handled
   } */
let PAGE = {};
function curTopic() { return TOPICS.find(t => t.id === S.topic) || TOPICS[0]; }
function curSub() {
  const t = curTopic(); if (!t.subs) return null;
  const s = S.sub[t.id];
  return t.subs.some(x => x[0] === s) ? s : t.subs[0][0];
}
function subnav() {
  const t = curTopic(); if (!t.subs) return '';
  return `<div class="subnav" role="tablist" id="subnav">${t.subs.map(([id, n]) => `<button role="tab" data-sub="${id}" aria-selected="${id === curSub()}">${esc(n)}</button>`).join('')}</div>`;
}
function readHash() {
  let h = decodeURIComponent(location.hash.slice(1));
  if (PAGE.alias && PAGE.alias[h]) h = PAGE.alias[h];
  const [t, s] = h.split('/');
  if (t) S.topic = t;
  if (t && s) S.sub[t] = s;
}
function persist() {
  const sub = curTopic().subs ? '/' + curSub() : '';
  const want = '#' + S.topic + sub;
  if (location.hash !== want) history.replaceState(null, '', want);
  try {
    localStorage.setItem(PAGE.key, JSON.stringify({ ...(PAGE.save ? PAGE.save() : {}), topic: S.topic, sub: S.sub,
      lay: { layGhost: S.layGhost, layPipes: S.layPipes, layLabels: S.layLabels } }));
  } catch (e) {}
}
function render() {
  if (!TOPICS.some(t => t.id === S.topic)) S.topic = TOPICS[0].id;
  const t = curTopic(), sub = curSub();
  document.getElementById('tabs').innerHTML = TOPICS.map(x =>
    `<button role="tab" data-tab="${x.id}" aria-selected="${x.id === S.topic}">${esc(x.name)}</button>`).join('');
  document.querySelectorAll('#ven button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === S.veN));
  const v = VIEWS[t.id], fn = typeof v === 'function' ? v : v[sub];
  const y = window.scrollY;
  document.getElementById('main').innerHTML = `<section class="tab on" role="tabpanel">${fn()}</section>`;
  const lay = (PAGE.layouts || []).find(([view]) => view === fn);
  if (lay) { setBuilder(lay[1]); mountLayout(PAGE.layoutButton); }
  window.scrollTo(0, y);
  persist();
}
function startPage(config) {
  PAGE = config;
  try {
    const saved = JSON.parse(localStorage.getItem(PAGE.key) || '{}');
    if (PAGE.load) PAGE.load(saved);
    if (saved.topic) S.topic = saved.topic;
    if (saved.sub) S.sub = saved.sub;
    if (saved.lay) Object.assign(S, saved.lay);
  } catch (e) {}
  readHash();
  document.getElementById('tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    S.topic = b.dataset.tab; render(); window.scrollTo(0, 0);
  });
  document.getElementById('main').addEventListener('click', e => {
    if (PAGE.mainClick && PAGE.mainClick(e)) return;
    const b = e.target.closest('#subnav button[data-sub]'); if (!b) return;
    S.sub[S.topic] = b.dataset.sub; L3.fit = 0; render();
  });
  const ven = document.getElementById('ven');
  if (ven) ven.addEventListener('click', e => {
    const b = e.target.closest('button[data-n]'); if (!b) return;
    S.veN = +b.dataset.n; render();
  });
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.addEventListener('themechange', () => drawLayout());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => drawLayout());
  render();
}
