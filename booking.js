/* Beauté en douceur · carte des soins et réservation en ligne
   Soins → date et heure → coordonnées → acompte → confirmation.
   Réglages : config.js · contrats Make (agenda Google) et Stripe : RESERVATION-AGENDA.md et worker/README.md */
(() => {
  'use strict';

  const CFG = window.BD_CONFIG || {};
  const BD = window.BD || { groups: [], policy: {}, hours: {}, place: {} };
  const POL = Object.assign({ depositPct: 20, cancelHours: 48, minNoticeHours: 1, maxDaysAhead: 150, stepMin: 30, maxTotalMin: 360 }, BD.policy);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const NB = '\u00a0';
  const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  /* prix en euros entiers : l'acompte (20 %) est exact en centimes, ex. 53 € → 10,60 € */
  const depositCents = (price) => Math.round(price * POL.depositPct);
  const eurC = (c) => (c % 100 ? (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : eur(c / 100));
  const fmtDur = (m) => (m <= 0 ? '' : m < 60 ? m + NB + 'min' : Math.floor(m / 60) + NB + 'h' + (m % 60 ? NB + pad(m % 60) : ''));
  const fmtDelay = (h) => (h % 24 === 0 && h >= 72 ? h / 24 + NB + 'jours' : h + NB + 'h');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!$('#reserver')) return;

  /* ---------- dates (chaînes AAAA-MM-JJ, calculs à midi) ---------- */
  const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const monthStart = (k) => k.slice(0, 8) + '01';
  const addMonths = (k, n) => { const d = parse(k); d.setDate(1); d.setMonth(d.getMonth() + n); return keyOf(d); };
  const fmtLong = (k) => parse(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = (k) => parse(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtHour = (t) => Math.floor(t / 60) + NB + 'h' + NB + pad(t % 60);
  const todayKey = keyOf(new Date());
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  /* ---------- données ---------- */
  const ITEMS = {};
  const SECTION = {};
  BD.groups.forEach((g) => g.sections.forEach((s) => { SECTION[s.id] = { group: g.id, title: s.title }; s.items.forEach((i) => { ITEMS[i.id] = Object.assign({ group: g.id, sec: s.id }, i); }); }));
  const PHONE = CFG.PHONE_DISPLAY || '', TEL = CFG.PHONE_TEL || '';
  const PLACE = BD.place;
  const NAMES = { marina: 'Marina', eva: 'Éva' };
  const S = { cart: [], group: BD.groups[0] ? BD.groups[0].id : '', date: null, time: null, assign: null, step: 1, month: monthStart(todayKey), busy: null, sending: false, ref: '', q: '' };
  const bookable = (i) => i.mode === 'book';
  const total = () => S.cart.reduce((a, id) => a + ITEMS[id].price, 0);
  const totalMin = () => S.cart.reduce((a, id) => a + ITEMS[id].min, 0);
  const api = window.BDX || {};
  const headH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 76;
  const scrollTo = (t, o) => (api.scrollTo ? api.scrollTo(t, o) : (typeof t === 'string' ? $(t) : t).scrollIntoView({ behavior: 'smooth' }));

  /* qui intervient : praticiennes imposées par les soins choisis, sinon « l'une ou l'autre » */
  const required = () => Array.from(new Set(S.cart.map((id) => ITEMS[id].who).filter((w) => w === 'marina' || w === 'eva')));
  const stepMin = () => (S.cart.length && S.cart.every((id) => ITEMS[id].step === 15) ? 15 : POL.stepMin);
  const cancelHours = () => (S.cart.length ? Math.max(...S.cart.map((id) => ITEMS[id].cancelH || POL.cancelHours)) : POL.cancelHours);
  const pLabel = (keys) => keys.map((k) => NAMES[k]).join(' et ');

  /* ---------- lignes de la carte ---------- */
  const WHO_TAG = { marina: 'avec Marina', eva: 'avec Éva' };
  const SEC_NAMED = new Set(['gel-eva', 'sp-eva', 'gel-marina', 'sp-marina']);
  function priceHtml(i) {
    if (i.mode === 'info') return '<span class="crow__price">' + i.priceMin + NB + '–' + NB + i.priceMax + NB + '€</span>';
    if (i.price > 0) return '<span class="crow__price">' + (i.addon ? '+' + NB : '') + eur(i.price) + '</span>';
    return '<span class="crow__price"><small>sur appel</small></span>';
  }
  function rowHtml(i) {
    const call = i.mode === 'call';
    const info = i.mode === 'info';
    let action = '';
    if (call) action = '<a class="crow__call" href="tel:' + TEL + '" aria-label="Réserver par téléphone : ' + esc(i.name) + '"><svg aria-hidden="true"><use href="#i-phone"/></svg>Sur appel</a>';
    else if (info) action = '<span class="crow__call" style="border-style:solid;border-color:var(--line);cursor:default">Selon la déco</span>';
    else action = '<button type="button" class="crow__add" aria-pressed="false" aria-label="Ajouter : ' + esc(i.name) + '"><svg aria-hidden="true"><use href="#i-plus"/></svg></button>';
    const dur = fmtDur(i.min);
    const tag = (i.who === 'eva' || i.who === 'marina') && !SEC_NAMED.has(i.sec) ? '<span class="crow__tag">' + WHO_TAG[i.who] + '</span>' : '';
    const hay = plain(i.name + ' ' + (i.sub || '') + ' ' + (i.desc || '') + ' ' + SECTION[i.sec].title);
    return '<article class="crow' + (i.addon ? ' crow--addon' : '') + (call ? ' crow--call' : '') + '" data-id="' + i.id + '" data-hay="' + esc(hay) + '">' +
      '<div class="crow__main"><h4 class="crow__name">' + esc(i.name) + tag + (i.sub ? '<span class="crow__sub">' + esc(i.sub) + '</span>' : '') + '</h4>' +
      (i.desc ? '<button type="button" class="crow__more" aria-expanded="false">Le détail</button>' : '') + '</div>' +
      '<div class="crow__meta">' + (dur ? '<span class="crow__dur"><svg aria-hidden="true"><use href="#i-clock"/></svg>' + dur + '</span>' : '') + priceHtml(i) + action + '</div>' +
      (i.desc ? '<div class="crow__desc"><div>' + esc(i.desc) + '</div></div>' : '') + '</article>';
  }
  function sectionHtml(s) {
    return '<div class="psec" data-sec="' + s.id + '"><h3 class="psec__t">' + esc(s.title) + '</h3>' + (s.note ? '<p class="psec__note">' + esc(s.note) + '</p>' : '') + s.items.map((i) => rowHtml(ITEMS[i.id])).join('') + '</div>';
  }
  function groupHtml(g) {
    const hasCall = g.sections.some((s) => s.items.some((i) => i.mode === 'call'));
    return '<section class="cgroup" data-g="' + g.id + '" aria-label="' + esc(g.title) + '"><p class="cgroup__intro">' + esc(g.intro) + '</p>' + g.sections.map(sectionHtml).join('') +
      (hasCall ? '<p class="cgroup__note"><svg aria-hidden="true"><use href="#i-phone"/></svg><span>Les prestations « sur appel » (forfaits, séances de cure…) se réservent par téléphone : <a href="tel:' + TEL + '">' + PHONE + '</a>.</span></p>' : '') + '</section>';
  }

  const tabs = $('#tabs'), list = $('#menuList'), picked = $('#picked'), search = $('#menuSearch'), searchX = $('#menuSearchX');
  function renderPicker() {
    tabs.innerHTML = BD.groups.map((g) => '<button type="button" class="tab' + (g.id === S.group ? ' is-on' : '') + '" role="tab" data-g="' + g.id + '" aria-selected="' + (g.id === S.group) + '">' + esc(g.title) + '<sup data-n="' + g.id + '"></sup></button>').join('');
    list.innerHTML = BD.groups.map(groupHtml).join('') + '<p class="plist__empty" id="plistEmpty" hidden>Aucun soin ne correspond à cette recherche. Essayez un autre mot, ou appelez le <a href="tel:' + TEL + '">' + PHONE + '</a>.</p>';
    applyFilter();
  }
  function applyFilter() {
    const q = plain(S.q.trim());
    let shown = 0;
    $$('.cgroup', list).forEach((g) => {
      if (!q) { g.classList.toggle('is-on', g.dataset.g === S.group); $$('.crow, .psec', g).forEach((e) => { e.hidden = false; }); $$('.cgroup__intro, .cgroup__note', g).forEach((e) => { e.hidden = false; }); return; }
      let n = 0;
      $$('.psec', g).forEach((p) => {
        let m = 0;
        $$('.crow', p).forEach((r) => { const ok = q.split(/\s+/).every((w) => r.dataset.hay.includes(w)); r.hidden = !ok; if (ok) m++; });
        p.hidden = !m; n += m;
      });
      $$('.cgroup__intro, .cgroup__note', g).forEach((e) => { e.hidden = true; });
      g.classList.toggle('is-on', n > 0); shown += n;
    });
    $('#plistEmpty').hidden = !(q && !shown);
    tabs.style.opacity = q ? '.45' : '';
    searchX.hidden = !q;
  }
  search.addEventListener('input', () => { S.q = search.value; applyFilter(); });
  searchX.addEventListener('click', () => { search.value = ''; S.q = ''; applyFilter(); search.focus(); });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.tab'); if (!b) return;
    S.q = ''; search.value = '';
    openGroup(b.dataset.g);
  });
  function openGroup(id) {
    if (!BD.groups.some((g) => g.id === id)) return;
    S.group = id; S.q = ''; search.value = '';
    $$('.tab', tabs).forEach((t) => { const on = t.dataset.g === id; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); if (on && t.scrollIntoView) { try { tabs.scrollTo({ left: t.offsetLeft - 20, behavior: 'smooth' }); } catch (e) { /* anciens navigateurs */ } } });
    applyFilter();
    if (S.step !== 1) go(1, false);
  }

  document.addEventListener('click', (e) => {
    const more = e.target.closest('.crow__more');
    if (more) { const r = more.closest('.crow'); const open = r.classList.toggle('is-open'); more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Réduire' : 'Le détail'; return; }
    const add = e.target.closest('.crow__add');
    if (add) { toggle(add.closest('.crow').dataset.id); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { toggle(rm.dataset.rm); return; }
    const op = e.target.closest('[data-open]');
    if (op) openGroup(op.dataset.open);
  });

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 4600);
  }
  function toggle(id) {
    const it = ITEMS[id];
    if (!it || !bookable(it)) return;
    const k = S.cart.indexOf(id);
    if (k >= 0) {
      S.cart.splice(k, 1);
      const orphans = S.cart.filter((x) => ITEMS[x].addon && !ITEMS[x].requires.some((r) => S.cart.includes(r)));
      if (orphans.length) { S.cart = S.cart.filter((x) => !orphans.includes(x)); toast('« ' + ITEMS[orphans[0]].name + ' » a été retiré avec le soin auquel il se rattache.'); }
    } else {
      if (it.addon && !it.requires.some((r) => S.cart.includes(r))) { toast('« ' + it.name + ' » s’ajoute à un soin principal : choisissez d’abord ce soin (' + SECTION[ITEMS[it.requires[0]].sec].title + ').'); return; }
      if (totalMin() + it.min > POL.maxTotalMin) { toast('Un rendez-vous ne peut pas dépasser ' + fmtDur(POL.maxTotalMin) + '. Retirez un soin ou réservez un second rendez-vous.'); return; }
      S.cart.push(id);
    }
    if (S.date && S.time != null && !slotFor(S.date, S.time)) { S.time = null; S.assign = null; }
    refresh();
  }

  /* ---------- récapitulatif ---------- */
  function refresh() {
    $$('.crow', list).forEach((r) => {
      const on = S.cart.includes(r.dataset.id);
      r.classList.toggle('is-sel', on);
      const b = $('.crow__add', r);
      if (b) { b.setAttribute('aria-pressed', String(on)); b.innerHTML = '<svg aria-hidden="true"><use href="#' + (on ? 'i-check' : 'i-plus') + '"/></svg>'; }
    });
    BD.groups.forEach((g) => { const n = S.cart.filter((id) => ITEMS[id].group === g.id).length; const s = $('[data-n="' + g.id + '"]', tabs); if (s) s.textContent = n || ''; });
    picked.hidden = !S.cart.length && S.step !== 1;
    picked.innerHTML = S.cart.length
      ? S.cart.map((id) => '<div class="picked__it"><div><b>' + esc(ITEMS[id].name) + '</b>' + (fmtDur(ITEMS[id].min) ? '<small>' + fmtDur(ITEMS[id].min) + '</small>' : '') + '</div><span>' + eur(ITEMS[id].price) + '<button type="button" data-rm="' + id + '" aria-label="Retirer ' + esc(ITEMS[id].name) + '"><svg aria-hidden="true"><use href="#i-close"/></svg></button></span></div>').join('')
      : '<p class="picked__empty">Aucun soin choisi pour l’instant. Touchez le «&nbsp;+&nbsp;» d’un soin dans la liste ci-dessous.</p>';
    const ul = $('#sumList');
    const req = required();
    $('#sumInst').textContent = 'Beauté en douceur · ' + (req.length ? 'avec ' + pLabel(req) : 'Marina ou Éva');
    ul.innerHTML = S.cart.length
      ? S.cart.map((id) => '<li><span>' + esc(ITEMS[id].name) + (fmtDur(ITEMS[id].min) ? '<small>' + fmtDur(ITEMS[id].min) + '</small>' : '') + '</span><b>' + eur(ITEMS[id].price) + '</b></li>').join('')
      : '<li class="sum__empty">Aucun soin sélectionné.</li>';
    $('#sumDur').textContent = fmtDur(totalMin()) || '0' + NB + 'min';
    $('#sumTotal').textContent = eur(total());
    const dc = depositCents(total());
    $('#sumDeposit').textContent = eurC(dc);
    $('#sumRest').textContent = eurC(total() * 100 - dc);
    $$('[data-delay]').forEach((el) => { el.textContent = fmtDelay(cancelHours()); });
    $$('[data-pct]').forEach((el) => { el.textContent = POL.depositPct; });
    const when = $('#sumWhenRow');
    if (S.date && S.time != null) { when.hidden = false; $('#sumWhen').textContent = fmtShort(S.date) + ' · ' + fmtHour(S.time); } else when.hidden = true;
    const pill = $('#pill');
    if (pill) { $('#pillN').textContent = S.cart.length; $('#pillL').textContent = S.cart.length > 1 ? 'soins' : 'soin'; $('#pillP').textContent = eur(total()); pill.hidden = !S.cart.length; if (!S.cart.length) pill.classList.remove('is-on'); updatePill(); }
    nav();
  }

  /* bouton flottant : visible tant que la réservation n'est pas à l'écran */
  let bookVisible = false;
  function updatePill() {
    const pill = $('#pill'); if (!pill) return;
    pill.classList.toggle('is-on', !!S.cart.length && !bookVisible && S.step !== 5);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { bookVisible = e.isIntersecting; updatePill(); }, { threshold: 0.12 }).observe($('#reserver'));
  const pillBtn = $('#pill');
  if (pillBtn) pillBtn.addEventListener('click', () => scrollTo('#reserver', { offset: -headH() }));

  /* ---------- navigation entre étapes ---------- */
  const btnNext = $('#btnNext'), btnBack = $('#btnBack'), btnLabel = $('#btnNextLabel');
  function nav() {
    const s = S.step;
    btnBack.hidden = s === 1 || s === 5;
    $('#flowSide').hidden = s === 5;
    $('#bookNav').hidden = s === 4 || s === 5;
    btnLabel.textContent = { 1: 'Choisir la date', 2: 'Mes informations', 3: 'Passer à l’acompte' }[s] || '';
    btnNext.hidden = s === 4 || s === 5;
    btnNext.disabled = (s === 1 && !S.cart.length) || (s === 2 && (S.time == null || !S.date));
  }
  function go(step, scrollTop = true) {
    S.step = step;
    $('.book__grid').classList.remove('is-done'); $('.book__grid').dataset.step = step;
    $$('.step').forEach((sec) => { const on = +sec.dataset.step === step; sec.hidden = !on; sec.classList.toggle('is-on', on); });
    $$('#stepper li').forEach((li) => { const n = +li.dataset.s; li.classList.toggle('is-on', n === step); li.classList.toggle('is-done', n < step); });
    $('#stepper').hidden = step === 5;
    if (step === 2) { buildCal(); buildSlots(); }
    if (step === 4) preparePay();
    nav(); refresh();
    if (scrollTop) scrollTo('#bookCard', { offset: -(headH() + 12) });
  }
  btnNext.addEventListener('click', () => {
    if (S.step === 1 && S.cart.length) go(2);
    else if (S.step === 2 && S.time != null) go(3);
    else if (S.step === 3 && validateInfos()) go(4);
  });
  btnBack.addEventListener('click', () => go(Math.max(1, S.step - 1)));

  /* ---------- étape 2 : calendrier et créneaux ---------- */
  const calDays = $('#calDays'), calTitle = $('#calTitle'), prev = $('#calPrev'), next = $('#calNext');
  const minStartMs = () => Date.now() + POL.minNoticeHours * 3600e3;
  const maxKey = () => addDays(todayKey, POL.maxDaysAhead);
  const hoursOf = (k) => BD.hours[parse(k).getDay()];
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const demoCache = {};
  function demoBusy(agenda, k) {
    const key = agenda + k;
    if (demoCache[key]) return demoCache[key];
    const h = hoursOf(k); if (!h) return (demoCache[key] = []);
    const r = mulberry(Number(k.replace(/-/g, '')) + (agenda === 'eva' ? 77711 : 0));
    const open = toMin(h[0]), close = toMin(h[1]), blocks = [];
    const n = r() < 0.07 ? 99 : (r() < 0.5 ? 1 : 2);      /* quelques jours complets, sinon un ou deux rendez-vous déjà pris */
    if (n === 99) blocks.push([open, close]);
    else for (let i = 0; i < n; i++) { const dur = [45, 60, 90, 120][Math.floor(r() * 4)]; const st = open + Math.floor(r() * Math.max(1, (close - open - dur) / 30)) * 30; blocks.push([st, Math.min(close, st + dur)]); }
    return (demoCache[key] = blocks);
  }
  function isBusy(agenda, k, start, end) {
    if (S.busy && S.busy[agenda]) {
      const a = parse(k); a.setHours(0, start, 0, 0); const b = parse(k); b.setHours(0, end, 0, 0);
      return S.busy[agenda].some(([x, y]) => a < y && b > x);
    }
    return demoBusy(agenda, k).some(([x, y]) => start < y && end > x);
  }
  /* un créneau est libre si toutes les praticiennes imposées sont libres, ou — sans exigence — si l'une des deux l'est. Renvoie la praticienne retenue. */
  function slotFor(k, t) {
    const h = hoursOf(k); if (!h || !S.cart.length || k > maxKey()) return null;
    const dur = totalMin(), open = toMin(h[0]), close = toMin(h[1]);
    if (t < open || t + dur > close || (t - open) % stepMin()) return null;
    const st = parse(k); st.setHours(0, t, 0, 0);
    if (st.getTime() < minStartMs()) return null;
    const req = required();
    if (req.length) return req.every((a) => !isBusy(a, k, t, t + dur)) ? req : null;
    const free = ['marina', 'eva'].find((a) => !isBusy(a, k, t, t + dur));
    return free ? [free] : null;
  }
  function slotsFor(k) {
    const h = hoursOf(k); if (!h || !S.cart.length || k > maxKey()) return [];
    const open = toMin(h[0]), close = toMin(h[1]), dur = totalMin(), out = [];
    for (let t = open; t + dur <= close; t += stepMin()) if (slotFor(k, t)) out.push(t);
    return out;
  }
  function monthHasSlot(m) {
    const first = parse(m), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= dim; n++) if (slotsFor(first.getFullYear() + '-' + pad(first.getMonth() + 1) + '-' + pad(n)).length) return true;
    return false;
  }
  let autoSkipped = false;
  function buildCal() {
    if (!autoSkipped && !S.date && !monthHasSlot(S.month) && addMonths(S.month, 1) <= monthStart(maxKey())) { S.month = addMonths(S.month, 1); }
    autoSkipped = true;
    const first = parse(S.month);
    calTitle.textContent = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    prev.disabled = S.month <= monthStart(todayKey);
    next.disabled = addMonths(S.month, 1) > monthStart(maxKey());
    const lead = (first.getDay() + 6) % 7, dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    let h = '';
    for (let b = 0; b < lead; b++) h += '<span class="cday is-blank"></span>';
    for (let n = 1; n <= dim; n++) {
      const k = first.getFullYear() + '-' + pad(first.getMonth() + 1) + '-' + pad(n);
      const ok = slotsFor(k).length > 0;
      h += '<button type="button" class="cday' + (ok ? ' is-open' : '') + (k === todayKey ? ' is-today' : '') + (k === S.date ? ' is-sel' : '') + '" data-k="' + k + '"' + (ok ? '' : ' disabled') + ' aria-label="' + fmtLong(k) + (ok ? ', créneaux disponibles' : ', indisponible') + '">' + n + '</button>';
    }
    calDays.innerHTML = h;
  }
  prev.addEventListener('click', () => { S.month = addMonths(S.month, -1); buildCal(); });
  next.addEventListener('click', () => { S.month = addMonths(S.month, 1); buildCal(); });
  calDays.addEventListener('click', (e) => {
    const b = e.target.closest('.cday[data-k]'); if (!b || b.disabled) return;
    S.date = b.dataset.k; S.time = null; S.assign = null; buildCal(); buildSlots(); refresh();
    if (innerWidth < 900) scrollTo('#slotsTitle', { offset: -110 });
  });
  const slotsGrid = $('#slotsGrid');
  function buildSlots() {
    const t = $('#slotsTitle'), sub = $('#slotsSub');
    if (!S.date) { t.textContent = 'Choisissez un jour'; sub.textContent = 'Durée de votre rendez-vous : ' + fmtDur(totalMin()) + '. Les horaires proposés en tiennent compte.'; slotsGrid.innerHTML = ''; return; }
    t.textContent = fmtShort(S.date);
    const req = required();
    sub.textContent = 'Rendez-vous de ' + fmtDur(totalMin()) + (req.length ? ' avec ' + pLabel(req) : ' avec Marina ou Éva') + ' · choisissez l’heure d’arrivée.';
    const s = slotsFor(S.date);
    slotsGrid.innerHTML = s.length ? s.map((m) => '<button type="button" class="slot' + (m === S.time ? ' is-sel' : '') + '" role="option" aria-selected="' + (m === S.time) + '" data-t="' + m + '">' + fmtHour(m) + '</button>').join('') : '<p class="slots__empty">Plus de créneau ce jour-là pour cette durée. Essayez un autre jour.</p>';
  }
  slotsGrid.addEventListener('click', (e) => { const b = e.target.closest('.slot'); if (!b) return; S.time = +b.dataset.t; S.assign = slotFor(S.date, S.time); buildSlots(); refresh(); });

  async function loadAvailability() {
    if (!CFG.AVAILABILITY_URL) return;
    const grab = async (agenda) => {
      const u = CFG.AVAILABILITY_URL + (CFG.AVAILABILITY_URL.includes('?') ? '&' : '?') + 'agenda=' + agenda + '&from=' + todayKey + '&to=' + maxKey();
      const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      return (j.busy || []).map((b) => [new Date(Array.isArray(b) ? b[0] : b.start), new Date(Array.isArray(b) ? b[1] : b.end)]).filter((x) => !isNaN(x[0]) && !isNaN(x[1]));
    };
    try { S.busy = { marina: await grab('marina'), eva: await grab('eva') }; } catch (e) { S.busy = null; }
    if (S.step === 2) { buildCal(); buildSlots(); }
  }

  /* ---------- étape 3 : coordonnées ---------- */
  const F = { first: $('#fFirst'), last: $('#fLast'), email: $('#fEmail'), phone: $('#fPhone'), cgv: $('#fCgv') };
  const rules = {
    first: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre prénom.'),
    last: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Adresse e-mail invalide.'),
    phone: (v) => { const d = v.replace(/\D/g, ''); return d.length >= 9 && d.length <= 15 ? '' : 'Numéro de téléphone invalide.'; },
    cgv: () => (F.cgv.checked ? '' : 'Merci de cocher cette case pour continuer.')
  };
  function check(n) {
    const msg = rules[n](n === 'cgv' ? '' : F[n].value);
    const slot = $('[data-err="' + n + '"]'); if (slot) slot.textContent = msg;
    if (n !== 'cgv') F[n].classList.toggle('is-bad', !!msg);
    return msg;
  }
  ['first', 'last', 'email', 'phone'].forEach((n) => { F[n].addEventListener('blur', () => check(n)); F[n].addEventListener('input', () => { if (F[n].classList.contains('is-bad')) check(n); }); });
  function validateInfos() {
    let bad = ''; ['first', 'last', 'email', 'phone', 'cgv'].forEach((n) => { if (check(n) && !bad) bad = n; });
    if (bad) { F[bad].focus(); return false; }
    return true;
  }

  /* ---------- étape 4 : acompte et paiement ---------- */
  const payBtn = $('#payBtn'), payMsg = $('#payMsg'), modal = $('#payModal');
  function preparePay() {
    const dc = depositCents(total());
    $('#payAmount').textContent = eurC(dc);
    $('#payRest').textContent = 'Le solde de ' + eurC(total() * 100 - dc) + ' se règle à l’institut.';
    payMsg.textContent = '';
    payBtn.querySelector('span').textContent = CFG.PAYMENT_MODE === 'none' ? 'Confirmer le rendez-vous' : 'Payer l’acompte de ' + eurC(dc);
  }
  function makeRef() { return 'BD-' + S.date.replace(/-/g, '').slice(2) + '-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); }
  const address = () => PLACE.street + ', ' + PLACE.zip + ' ' + PLACE.city;
  function booking() {
    const items = S.cart.map((id) => ({ id, name: ITEMS[id].name, min: ITEMS[id].min, price: ITEMS[id].price }));
    const dc = depositCents(total());
    const hhmm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
    const who = S.assign && S.assign.length ? S.assign : (required().length ? required() : ['marina']);
    return {
      ref: S.ref || (S.ref = makeRef()), institut: 'oraison', institutName: PLACE.name, practitioner: pLabel(who), practitioners: who, address: address(),
      date: S.date, start: hhmm(S.time), startMin: S.time, durationMin: totalMin(), timezone: 'Europe/Paris',
      startLocal: S.date + 'T' + hhmm(S.time) + ':00', endLocal: S.date + 'T' + hhmm(S.time + totalMin()) + ':00',
      items, total: total(), depositCents: dc, deposit: dc / 100, cancelHours: cancelHours(),
      first: F.first.value.trim(), last: F.last.value.trim(), email: F.email.value.trim(), phone: F.phone.value.trim(),
      visit: ($('input[name=visit]:checked') || {}).value || 'new', message: $('#fMsg').value.trim(), locale: 'fr', page: location.href.split('?')[0].split('#')[0], sentAt: new Date().toISOString()
    };
  }
  payBtn.addEventListener('click', async () => {
    if (S.sending) return;
    if ($('#fHp').value) { finish(booking(), { demo: true }); return; }          /* pot de miel */
    const mode = CFG.PAYMENT_MODE || 'demo', b = booking();
    if (mode === 'demo') { $('#payModalAmount').textContent = eurC(b.depositCents); openModal(); return; }
    S.sending = true; payBtn.disabled = true; payMsg.textContent = '';
    try {
      if (mode === 'stripe') {
        if (!CFG.CHECKOUT_ENDPOINT) throw new Error('config');
        sessionStorage.setItem('bd-pending', JSON.stringify(b));
        const r = await fetch(CFG.CHECKOUT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) throw new Error(j.error || 'checkout');
        location.href = j.url; return;
      }
      if (mode === 'none') {
        const ok = await sendBooking(b);
        if (!ok.ok) throw new Error(ok.conflict ? 'conflict' : 'send');
        finish(b, { unpaid: true });
      }
    } catch (err) {
      payMsg.textContent = err.message === 'conflict' ? 'Ce créneau vient d’être pris. Merci d’en choisir un autre.' : 'Le paiement n’a pas pu être lancé. Appelez le ' + PHONE + ' ou réessayez dans un instant.';
      if (err.message === 'conflict') { S.time = null; S.assign = null; go(2); }
    } finally { S.sending = false; payBtn.disabled = false; }
  });
  async function sendBooking(b) {
    if (!CFG.BOOKING_WEBHOOK) return { ok: true, demo: true };
    try {
      const r = await fetch(CFG.BOOKING_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(b) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) return { ok: false, conflict: !!j.conflict };
      return { ok: true };
    } catch (e) { return { ok: false }; }
  }
  function openModal() { modal.hidden = false; document.body.classList.add('modal-open'); if (api.lenis) api.lenis.stop(); $('#payModalOk').focus(); }
  function closeModal() { modal.hidden = true; document.body.classList.remove('modal-open'); if (api.lenis) api.lenis.start(); }
  $('#payModalCancel').addEventListener('click', closeModal);
  $('#payModalOk').addEventListener('click', () => { closeModal(); finish(booking(), { demo: true }); });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* ---------- confirmation + agenda de la cliente ---------- */
  const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const stamp = (k, min) => k.replace(/-/g, '') + 'T' + pad(Math.floor(min / 60)) + pad(min % 60) + '00';
  function fold(line) { const out = []; while (line.length > 72) { out.push(line.slice(0, 72)); line = ' ' + line.slice(72); } out.push(line); return out.join('\r\n'); }
  function finish(b, opt) {
    opt = opt || {};
    S.step = 5;
    $('.book__grid').classList.add('is-done');
    $$('.step').forEach((sec) => { const on = +sec.dataset.step === 5; sec.hidden = !on; sec.classList.toggle('is-on', on); });
    $('#stepper').hidden = true; $('#flowSide').hidden = true; $('#bookNav').hidden = true;
    $('#doneTitle').textContent = opt.demo ? 'Rendez-vous préparé' : 'Rendez-vous confirmé';
    const when = fmtLong(b.date) + ' à ' + b.start.replace(':', NB + 'h' + NB);
    $('#doneText').textContent = opt.demo
      ? 'Merci ' + b.first + ' ! Voici le récapitulatif de votre rendez-vous du ' + when + '. Une fois la page reliée à l’agenda et à Stripe, ce même parcours enregistre le créneau et encaisse l’acompte.'
      : 'Merci ' + b.first + ' ! ' + b.practitioner + ' vous attend le ' + when + ' à l’institut' + (opt.unpaid ? '. L’acompte se règle à l’institut.' : '. Votre acompte est bien reçu.') + ' Un e-mail de confirmation vous a été envoyé.';
    $('#doneSum').innerHTML = [['Avec', b.practitioner], ['Date', fmtShort(b.date)], ['Heure', b.start.replace(':', NB + 'h' + NB)], ['Durée', fmtDur(b.durationMin)], ['Acompte', eurC(b.depositCents)], ['Adresse', b.address || address()], ['Référence', b.ref]].map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('');
    $('#doneDemo').hidden = !opt.demo;
    const names = b.items.map((i) => i.name).join(', ');
    const place = (b.address || address()) + ' (' + PLACE.area + ')';
    const title = 'Beauté en douceur · ' + b.practitioner;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Beaute en douceur//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + b.ref + '@beaute-en-douceur', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'DTSTART:' + stamp(b.date, b.startMin), 'DTEND:' + stamp(b.date, b.startMin + b.durationMin), 'SUMMARY:' + icsEsc(title), 'LOCATION:' + icsEsc(place),
      'DESCRIPTION:' + icsEsc(names + ' · Réf. ' + b.ref + ' · ' + PHONE + ' · Annulation ou déplacement gratuits jusqu’à ' + fmtDelay(b.cancelHours || cancelHours()) + ' avant, sinon l’acompte reste acquis à l’institut.'), 'END:VEVENT', 'END:VCALENDAR'];
    const a = $('#btnIcs'); if (a.dataset.u) URL.revokeObjectURL(a.dataset.u);
    a.href = URL.createObjectURL(new Blob([lines.map(fold).join('\r\n')], { type: 'text/calendar;charset=utf-8' })); a.dataset.u = a.href; a.download = 'rendez-vous-beaute-en-douceur-' + b.date + '.ics';
    $('#btnGcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + stamp(b.date, b.startMin) + '/' + stamp(b.date, b.startMin + b.durationMin) + '&location=' + encodeURIComponent(place) + '&details=' + encodeURIComponent(names + ' · Réf. ' + b.ref) + '&ctz=Europe/Paris';
    $('#btnRoute').href = 'https://www.google.com/maps/dir/?api=1&destination=' + PLACE.lat + ',' + PLACE.lng;
    $('#done').hidden = false;
    updatePill();
    scrollTo('#bookCard', { offset: -90 });
  }
  $('#doneNew').addEventListener('click', () => { S.cart = []; S.date = null; S.time = null; S.assign = null; S.ref = ''; $('#flowSide').hidden = false; go(1, true); });

  /* ---------- API publique + démarrage ---------- */
  window.BDB = { open: openGroup, add: (id) => toggle(id), state: S, items: ITEMS };

  if (CFG.DEMO_MODE) { const b = $('#demoBanner'); if (b) b.hidden = false; }
  $('.book__grid').dataset.step = 1;
  renderPicker(); refresh(); nav(); loadAvailability();

  /* retour de Stripe */
  const qs = new URLSearchParams(location.search);
  const pending = () => { try { return JSON.parse(sessionStorage.getItem('bd-pending') || 'null'); } catch (e) { return null; } };
  if (qs.get('paiement') === 'ok') {
    const b = pending();
    if (b && b.ref === qs.get('ref')) { sessionStorage.removeItem('bd-pending'); finish(b, {}); }
  } else if (qs.get('paiement') === 'annule') {
    const b = pending();
    if (b) {
      S.cart = b.items.map((i) => i.id).filter((id) => ITEMS[id] && bookable(ITEMS[id])); S.date = b.date; S.time = b.startMin; S.assign = b.practitioners || null;
      F.first.value = b.first; F.last.value = b.last; F.email.value = b.email; F.phone.value = b.phone; F.cgv.checked = true;
      go(4, false); payMsg.textContent = 'Le paiement a été annulé. Vous pouvez réessayer.';
    }
  }
})();
