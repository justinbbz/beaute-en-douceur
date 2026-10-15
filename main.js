/* Beauté en douceur · mise en scène : film du héros au défilement, révélations, carte des univers, avis, horaires.
   Réglages : config.js · textes : data.js · prix : catalogue.js (généré) */
(() => {
  'use strict';

  const CFG = window.BD_CONFIG || {};
  const BD = window.BD || { groups: [], hours: {}, place: {}, policy: {} };
  const DATA = window.BD_DATA || { univers: [], ongles: [], faq: [] };
  const AV = window.BD_AVIS || { avis: [], meta: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const html = document.documentElement;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const NB = ' ';
  const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDur = (m) => (m <= 0 ? '' : m < 60 ? m + NB + 'min' : Math.floor(m / 60) + NB + 'h' + (m % 60 ? NB + String(m % 60).padStart(2, '0') : ''));
  const api = (window.BDX = window.BDX || {});

  /* ------------------------------------------------------------------ données du catalogue */
  const ALL = BD.groups.flatMap((g) => g.sections.flatMap((s) => s.items.map((i) => Object.assign({ group: g.id, sec: s.id }, i))));
  const find = (sec, name) => {
    const it = ALL.find((i) => i.sec === sec && i.name.toLowerCase() === name.toLowerCase());
    if (!it) console.error('Catalogue : soin introuvable', sec, name);
    return it;
  };
  const keyOf = (n) => n.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const priceOf = (it) => (it && it.price > 0 ? eur(it.price) : '');

  /* ------------------------------------------------------------------ construction des blocs */
  function buildUnivers() {
    const host = $('#unTrack');
    if (!host) return;
    host.innerHTML = DATA.univers.map((u) => {
      const g = BD.groups.find((x) => x.id === u.open);
      const from = g && g.from ? '<span class="uc__from">à partir de <b>' + eur(g.from) + '</b></span>' : '<span class="uc__from"></span>';
      const base = '' + u.img;
      const srcset = u.fb ? ' srcset="' + base + '-460.webp 460w, ' + base + '-690.webp 690w" sizes="(max-width:820px) 82vw, 30vw"' : ' srcset="' + base + '-900.webp 900w, ' + base + '-1600.webp 1600w" sizes="(max-width:820px) 82vw, 30vw"';
      const src = u.fb ? base + '-690.webp' : base + '-900.webp';
      return '<a class="uc" href="#reserver" data-open="' + u.open + '" data-cursor="Voir"><div class="uc__img"><img src="' + src + '"' + srcset + ' alt="" style="object-position:' + u.pos + '" loading="lazy" decoding="async"></div>' +
        '<div class="uc__body"><span class="uc__num">' + u.num + '</span><h3 class="uc__title">' + esc(u.title) + '</h3><p class="uc__text">' + esc(u.text) + '</p>' +
        '<div class="uc__foot">' + from + '<span class="uc__go" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span></div></div></a>';
    }).join('');
  }

  function buildSpaPrices() {
    const host = $('#spaPrices');
    if (!host) return;
    const row = (label, sub, solo, duo) => '<li><span class="sp-n">' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="sp-p">' + priceOf(solo) + (duo ? '<small>duo ' + priceOf(duo) + '</small>' : '') + '</span></li>';
    const a = find('sauna', 'Sauna/Hammam - 30min'), ad = find('sauna', 'Sauna/Hammam - 30min en DUO');
    const b = find('sauna', 'Sauna/Hammam - 60min'), bd = find('sauna', 'Sauna/Hammam - 60min en DUO');
    const f = find('f-corps', 'Gommage + Hydratation + SPA 1h');
    host.innerHTML = row('Sauna &amp; hammam · 30 min', '', a, ad) + row('Sauna &amp; hammam · 1 heure', '', b, bd) + (f ? row('Gommage + hydratation + spa 1 h', 'formule soin du corps', f, find('f-corps', 'Gommage + Hydratation + SPA 1h en DUO')) : '');
  }

  function buildLpg() {
    const host = $('#lpgList');
    if (!host) return;
    const picks = [find('lpg-corps', 'Bilan LPG'), find('lpg-visage', 'Bilan LPG Visage'), find('lpg-corps', 'Anti-cellulite'), find('lpg-corps', 'Jeune maman'), find('lpg-visage', 'Soins visage : éclat')].filter(Boolean);
    host.innerHTML = picks.map((i) => '<li><span class="l-n">' + esc(i.name) + (i.desc ? '<small>' + esc(i.desc) + '</small>' : '<small>' + fmtDur(i.min) + '</small>') + '</span><span class="l-p">' + priceOf(i) + '</span></li>').join('');
  }

  function buildCmp() {
    const host = $('#cmp');
    if (!host) return;
    const pairs = [['gel-eva', 'gel-marina'], ['sp-eva', 'sp-marina']];
    const rows = [];
    pairs.forEach(([e, m]) => {
      const mar = ALL.filter((i) => i.sec === m && i.mode === 'book' && !i.addon);
      ALL.filter((i) => i.sec === e && i.mode === 'book' && !i.addon && !/^ongle cass/i.test(i.name)).forEach((it) => {
        const other = mar.find((x) => keyOf(x.name) === keyOf(it.name) && x.min > 0);
        if (other && !rows.some((r) => r.k === keyOf(it.name))) rows.push({ k: keyOf(it.name), name: it.name, sub: it.sub, eva: it.price, marina: other.price });
      });
    });
    host.insertAdjacentHTML('beforeend', rows.map((r) => '<div class="cmp__row" role="row"><span role="cell">' + esc(r.name) + '</span><span role="cell"><b>' + eur(r.eva) + '</b></span><span role="cell"><b>' + eur(r.marina) + '</b></span></div>').join(''));
    if (rows.length < 6) console.error('Comparatif Éva / Marina : trop peu de lignes', rows.length);
  }

  function buildNails() {
    const track = $('#nailsTrack');
    if (!track) return;
    const fig = ([n, alt]) => '<figure><img src="' + n + '-460.webp" srcset="' + n + '-460.webp 460w, ' + n + '-' + ({ 'fb-ongles-orange': 690, 'fb-ongles-lait': 690, 'fb-ongles-rouges': 736, 'fb-ongles-chocolat': 860, 'fb-ongles-rose-jean': 920 }[n] || 690) + '.webp 700w" sizes="(max-width:820px) 60vw, 330px" alt="' + esc(alt) + '" loading="lazy" decoding="async"></figure>';
    const once = DATA.ongles.map(fig).join('');
    track.innerHTML = once + once;
  }

  function buildReviews() {
    const host = $('#avisRows');
    if (!host) return;
    const star = '<svg aria-hidden="true"><use href="#i-star"/></svg>';
    const fixApos = (t) => t.replace(/\b([lLdDcCjJmMnNsS]) (?=[aeiouyhéèêàâîïôûœAEIOUH])/g, '$1’');   /* seules les apostrophes manquantes sont rétablies */
    const card = (a) => '<figure class="rv"><div class="rv__stars" aria-label="5 étoiles sur 5">' + star.repeat(5) + '</div><blockquote class="rv__text">' + esc(fixApos(a.texte)) + '</blockquote>' +
      '<figcaption class="rv__who"><span><b>' + esc(a.auteur) + (a.guide ? ' · Local Guide' : '') + '</b>' + esc(a.quand) + (a.soin ? ' · ' + esc(a.soin.length > 44 ? a.soin.slice(0, 42) + '…' : a.soin) : '') + '</span><span class="rv__src">' + (a.source === 'google' ? 'Google' : 'Planity') + '</span></figcaption></figure>';
    const g = AV.avis.filter((a) => a.source === 'google'), p = AV.avis.filter((a) => a.source === 'planity');
    const mix = []; for (let i = 0; i < Math.max(g.length, p.length); i++) { if (g[i]) mix.push(g[i]); if (p[i]) mix.push(p[i]); }
    const half = Math.ceil(mix.length / 2);
    const rows = [mix.slice(0, half), mix.slice(half)];
    host.innerHTML = rows.map((list, k) => '<div class="avis__row" data-dir="' + (k ? 1 : -1) + '"><div class="avis__track">' + list.map(card).join('') + list.map(card).join('') + '</div></div>').join('');
  }

  function buildFaq() {
    const host = $('#faqList');
    if (!host) return;
    host.innerHTML = DATA.faq.map((f, i) => '<div class="qa" data-i="' + i + '"><button type="button" class="qa__q" aria-expanded="false" aria-controls="qa' + i + '"><span>' + esc(f.q) + '</span><i aria-hidden="true"></i></button><div class="qa__a" id="qa' + i + '" role="region"><div>' + f.a + '</div></div></div>').join('');
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.qa__q'); if (!b) return;
      const qa = b.parentElement, open = !qa.classList.contains('is-open');
      $$('.qa.is-open', host).forEach((x) => { x.classList.remove('is-open'); $('.qa__q', x).setAttribute('aria-expanded', 'false'); });
      qa.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    });
  }

  /* horaires de la fiche Google ; « ouvert maintenant » calculé à l'heure de Paris */
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const hLabel = (s) => { const [h, m] = s.split(':').map(Number); return h + NB + 'h' + (m ? NB + String(m).padStart(2, '0') : ''); };
  function parisNow() {
    const p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: +p.hour * 60 + +p.minute };
  }
  function buildHours() {
    const host = $('#hoursList'), badge = $('#openNow');
    if (!host) return;
    const now = parisNow();
    host.innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const h = BD.hours[d];
      return '<li class="' + (d === now.day ? 'is-today' : '') + '"><span>' + DAYS[d] + '</span><span>' + (h ? hLabel(h[0]) + ' – ' + hLabel(h[1]) : 'Fermé') + '</span></li>';
    }).join('');
    if (badge) {
      const h = BD.hours[now.day];
      const open = h && now.min >= toMin(h[0]) && now.min < toMin(h[1]);
      let msg;
      if (open) msg = 'Ouvert maintenant · jusqu’à ' + hLabel(h[1]);
      else {
        let nd = now.day, add = 0, nh = null;
        if (h && now.min < toMin(h[0])) { nh = h; } else { for (let k = 1; k <= 7; k++) { nd = (now.day + k) % 7; if (BD.hours[nd]) { nh = BD.hours[nd]; add = k; break; } } }
        msg = 'Fermé · ouvre ' + (add === 0 ? 'aujourd’hui' : add === 1 ? 'demain' : DAYS[nd]) + ' à ' + hLabel(nh[0]);
      }
      badge.textContent = msg; badge.classList.toggle('is-closed', !open);
    }
  }

  function buildCounters() {
    const n = $('#statSoins');
    if (n) { n.dataset.count = String(ALL.length); n.textContent = String(ALL.length); }
  }

  /* ------------------------------------------------------------------ défilement fluide */
  function closeMenu() {
    const menu = $('#menu'), head = $('#head'), burger = $('#burger');
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open'); head.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('is-locked'); if (api.lenis) api.lenis.start();
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 900);
  }
  function setupScroll() {
    if (!hasGsap) return;
    gsap.registerPlugin(ScrollTrigger);
    if (typeof Lenis !== 'undefined' && !reduce) {
      const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
      api.lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    const headH = () => parseInt(getComputedStyle(html).getPropertyValue('--head-h')) || 76;
    api.scrollTo = (target, opt = {}) => {
      const el = typeof target === 'string' ? $(target) : target;
      if (!el && target !== 0) return;
      const off = opt.offset != null ? opt.offset : -headH() + 6;
      if (api.lenis) api.lenis.scrollTo(target === 0 ? 0 : el, { offset: off, duration: opt.duration || 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (id === '#top') api.scrollTo(0);
      else if (id === '#reserver') api.scrollTo(el, { offset: -headH() });
      else api.scrollTo(el, {});
    });
  }

  /* ------------------------------------------------------------------ en-tête, menu, progression */
  function setupChrome() {
    const head = $('#head'), burger = $('#burger'), menu = $('#menu');
    if (burger) burger.addEventListener('click', () => {
      if (menu.hidden) { menu.hidden = false; void menu.offsetWidth; }
      const open = !menu.classList.contains('is-open');
      head.classList.toggle('menu-open', open);
      if (open) { menu.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu'); document.body.classList.add('is-locked'); if (api.lenis) api.lenis.stop(); }
      else closeMenu();
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    const bar = $('#progress i');
    const onScroll = () => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      head.classList.toggle('is-solid', y > innerHeight - 90);
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* lueur de bougie qui suit le curseur sur les fonds sombres */
  function setupGlow() {
    const g = $('#glow');
    if (!g || !fine || reduce || !hasGsap) return;
    const qx = gsap.quickTo(g, 'x', { duration: .9, ease: 'power3' }), qy = gsap.quickTo(g, 'y', { duration: .9, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      qx(e.clientX); qy(e.clientY);
      g.classList.toggle('is-on', !!e.target.closest('.hero, .spa, .book, .avis, .come, .foot, .menu, .uc'));
    }, { passive: true });
    document.addEventListener('mouseleave', () => g.classList.remove('is-on'));
  }
  function setupMagnetic() {
    if (!fine || reduce || !hasGsap) return;
    $$('[data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.45)' });
      const qy = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.45)' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); qx((e.clientX - (r.left + r.width / 2)) * .22); qy((e.clientY - (r.top + r.height / 2)) * .3); });
      el.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }
  function setupTilt() {
    if (!fine || reduce || !hasGsap) return;
    $$('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' });
      gsap.set(el, { transformPerspective: 800 });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 18); rx(-((e.clientY - r.top) / r.height - .5) * 18); });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ------------------------------------------------------------------ découpage de texte */
  function splitWords(el, mask) {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            if (mask) {
              const w = document.createElement('span'); w.className = 'sw';
              const i = document.createElement('span'); i.className = 'swi'; i.textContent = p; w.appendChild(i); frag.appendChild(w); words.push(i);
            } else {
              const w = document.createElement('span'); w.className = 'w'; w.textContent = p; frag.appendChild(w); words.push(w);
            }
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
    return words;
  }

  /* ------------------------------------------------------------------ héros : le film tourne tout seul en boucle */
  const MOBILE_Q = '(max-width: 820px), (orientation: portrait)';
  /* repères du film (17,7 s) : bougies · massage · visage · mains · peignoir ; la légende change au milieu de chaque fondu */
  const CAP_AT = [0, 0.226, 0.424, 0.613, 0.777];
  function setupHero() {
    const stage = $('#heroStage');
    if (!stage) return Promise.resolve(null);
    const caps = $$('.cap', stage), steps = $$('.hero__steps li', stage), video = $('#heroVideo');
    let cap = -1;
    const setCap = (n) => {
      if (n === cap) return; cap = n;
      caps.forEach((c, i) => c.classList.toggle('is-on', i === n));
      steps.forEach((li, i) => li.classList.toggle('is-on', i === n));
      stage.dataset.cap = String(n + 1);
    };
    setCap(0);
    if (!video) return Promise.resolve(null);
    /* une seule vidéo est téléchargée : la verticale sur téléphone, l'horizontale ailleurs */
    video.src = '' + (matchMedia(MOBILE_Q).matches ? 'film-mobile.mp4' : 'film-bureau.mp4');
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
    const started = new Promise((res) => {
      const ok = () => { video.classList.add('is-on'); res(video); };
      video.addEventListener('playing', ok, { once: true });
      video.addEventListener('error', () => res(null), { once: true });
      setTimeout(() => res(null), 6000);
    });
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); return Promise.resolve(null); }
    const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => { /* lecture refusée : l'image d'accueil reste affichée */ }); };
    play();
    /* légendes calées sur le temps de la vidéo (vérifié quatre fois par seconde : aucune charge) */
    setInterval(() => {
      if (!video.duration || video.paused) return;
      const p = video.currentTime / video.duration;
      let n = 0; CAP_AT.forEach((t, i) => { if (p >= t) n = i; });
      setCap(n);
    }, 250);
    /* économie : la vidéo se met en pause quand le héros n'est plus à l'écran ou que l'onglet est caché */
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { if (e.isIntersecting) play(); else video.pause(); }, { threshold: 0.05 }).observe(stage);
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (stage.getBoundingClientRect().bottom > 0) play(); });
    /* au défilement, le film s'éloigne doucement (simple transformation : rien ne saccade) */
    if (hasGsap && !reduce) {
      gsap.to('.hero__video, .hero__poster', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__copy', { yPercent: -10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: '70% top', scrub: true } });
    }
    return started;
  }

  function heroIntro() {
    if (!hasGsap) return;
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.fromTo('.hero__poster, .hero__video', { scale: 1.1 }, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
      .fromTo('.hero__title .ln > span', { yPercent: 118 }, { yPercent: 0, duration: 1.5, stagger: 0.14 }, 0.1)
      .fromTo('.cap--1 .eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1 }, 0.5)
      .fromTo('.hero__lead', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1 }, 0.8)
      .fromTo('.cap--1 .hero__cta .btn', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, 1.0)
      .fromTo('.hero__rate, .hero__steps, .hero__cue', { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.1 }, 1.3);
  }

  /* ------------------------------------------------------------------ révélations au défilement */
  function setupReveals() {
    if (!hasGsap || reduce) return;
    /* titres : les mots montent un à un */
    $$('[data-split-title]').forEach((h) => {
      const words = splitWords(h, true);
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.07 }) });
    });
    /* manifeste : les mots s'allument */
    const mt = $('#manifestoText');
    if (mt) {
      const words = splitWords(mt, false);
      gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.5, scrollTrigger: { trigger: mt, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 } });
    }
    /* fondus */
    $$('.stat, .uc, .qa, .rv, .lpg__list li, .spa__prices li, .cmp__row, .gift__cta, .come__card > *, .come__hours, .come__map').forEach((el) => {
      if (el.closest('.hero') || el.closest('.un__track') || el.closest('.avis__track')) return;
      gsap.fromTo(el, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    /* photos : rideau qui s'ouvre, image qui se pose */
    $$('[data-reveal="mask"]').forEach((fig) => {
      const img = $('img', fig);
      gsap.fromTo(fig, { clipPath: 'inset(12% 12% 12% 12% round 36px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.5, ease: 'power4.out', scrollTrigger: { trigger: fig, start: 'top 90%', once: true } });
      if (img && !img.hasAttribute('data-parallax')) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 90%', once: true } });
    });
    /* compteurs */
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 94%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } }) });
    });
    /* parallaxe douce des images de fond */
    $$('[data-parallax]').forEach((el) => {
      const f = parseFloat(el.dataset.parallax) || 0.1, dir = f < 0 ? -1 : 1;
      gsap.fromTo(el, { yPercent: -5 * dir }, { yPercent: 5 * dir, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
    /* collages : les images flottent à des vitesses différentes */
    $$('.spa__figs .fig, .lpg__figs figure').forEach((el, i) => {
      gsap.fromTo(el, { y: i % 2 ? 60 : -30 }, { y: i % 2 ? -50 : 40, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    /* mot géant du pied de page */
    const word = $('.foot__word span');
    if (word) gsap.fromTo(word, { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '#foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
  }

  /* bandeaux et rangées d'avis qui défilent (vitesse liée au défilement) */
  function setupTickers() {
    if (!hasGsap || reduce) return;
    let vel = 0;
    if (api.lenis) api.lenis.on('scroll', (e) => { vel = e.velocity || 0; });
    else addEventListener('scroll', (() => { let y = scrollY; return () => { vel = (scrollY - y) * 0.6; y = scrollY; }; })(), { passive: true });
    const items = [];
    const mk = (el, dir, speed) => items.push({ el, x: 0, dir, speed, half: 0, vis: false, paused: false });
    $$('.marquee__track').forEach((el) => mk(el, -1, 46));
    $$('.avis__row').forEach((row) => mk($('.avis__track', row), Number(row.dataset.dir) || -1, 34));
    items.forEach((m) => {
      const host = m.el.parentElement;
      new IntersectionObserver(([e]) => { m.vis = e.isIntersecting; }, { rootMargin: '200px' }).observe(host);
      host.addEventListener('pointerenter', () => { m.paused = true; });
      host.addEventListener('pointerleave', () => { m.paused = false; });
      host.addEventListener('focusin', () => { m.paused = true; });
      host.addEventListener('focusout', () => { m.paused = false; });
    });
    const measure = () => { items.forEach((m) => { m.half = m.el.scrollWidth / 2; if (m.dir > 0 && m.x === 0) m.x = -m.half; }); };
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    gsap.ticker.add((t, dt) => {
      const d = Math.min(dt, 50) / 1000;
      items.forEach((m) => {
        if (!m.vis || !m.half || m.paused) return;
        m.x += m.dir * (m.speed + Math.abs(vel) * 16) * d;
        if (m.x <= -m.half) m.x += m.half; if (m.x > 0) m.x -= m.half;
        gsap.set(m.el, { x: m.x });
      });
    });
  }

  /* carte des univers : défilement horizontal épinglé (ordinateur) */
  function setupUnivers() {
    if (!hasGsap) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px) and (prefers-reduced-motion: no-preference)', () => {
      const pin = $('#unPin'), track = $('#unTrack');
      if (!pin || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingInline) * 1.2);
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.uc__img img', track).forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.uc'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
    });
  }

  /* ------------------------------------------------------------------ écran d'accueil */
  async function runLoader(framesPromise) {
    const loader = $('#loader');
    if (!loader) { api.ready = true; return; }
    if (reduce || !hasGsap) { loader.remove(); document.body.classList.remove('is-locked'); api.ready = true; if (api.lenis) api.lenis.start(); return; }
    document.body.classList.add('is-locked');
    const bar = $('#loaderBar');
    gsap.to(bar, { scaleX: 0.9, duration: 1.6, ease: 'power2.out' });
    const poster = $('#heroPoster img');
    const imgReady = poster && !poster.complete ? new Promise((r) => { poster.addEventListener('load', r, { once: true }); poster.addEventListener('error', r, { once: true }); }) : Promise.resolve();
    await Promise.race([Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), imgReady, framesPromise, sleep(1300)]), sleep(2600)]);
    gsap.to(bar, { scaleX: 1, duration: 0.3, ease: 'none' });
    await sleep(340);
    const tl = gsap.timeline();
    tl.to('.loader__mid', { opacity: 0, scale: 0.94, duration: 0.55, ease: 'power2.in' })
      .to('.loader__half--t', { yPercent: -101, duration: 1.15, ease: 'power4.inOut' }, '>-0.05')
      .to('.loader__half--b', { yPercent: 101, duration: 1.15, ease: 'power4.inOut' }, '<')
      .add(() => { heroIntro(); document.body.classList.remove('is-locked'); if (api.lenis) api.lenis.start(); api.ready = true; }, '<0.5')
      .add(() => loader.remove());
  }

  /* ------------------------------------------------------------------ démarrage */
  function safe(fn) { try { fn(); } catch (err) { console.error('Erreur évitée dans ' + (fn.name || 'une fonction') + ' :', err); } }
  function init() {
    /* un rechargement ne doit pas retomber au milieu du film épinglé : on repart du haut, sauf lien vers une section (retour de paiement) */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) scrollTo(0, 0);
    [buildUnivers, buildSpaPrices, buildLpg, buildCmp, buildNails, buildReviews, buildFaq, buildHours, buildCounters].forEach(safe);
    safe(setupChrome);
    safe(setupScroll);
    if (hasGsap && !reduce) {
      gsap.set('.hero__title .ln > span', { yPercent: 118 });
      gsap.set('.cap--1 .eyebrow, .hero__lead, .cap--1 .hero__cta .btn, .hero__rate, .hero__steps, .hero__cue', { opacity: 0 });
    }
    let framesPromise = Promise.resolve(null);
    safe(() => { framesPromise = setupHero(); });
    [setupReveals, setupTickers, setupUnivers, setupGlow, setupMagnetic, setupTilt].forEach(safe);
    runLoader(framesPromise);
    setInterval(() => safe(buildHours), 60000);
    const refresh = () => hasGsap && ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(refresh, 100));
    addEventListener('load', () => setTimeout(refresh, 500));
    /* le contenu change de hauteur (étapes de réservation, questions dépliées…) : on recalcule les repères du défilement */
    if (hasGsap && 'ResizeObserver' in window) {
      const main = $('#main');
      let last = main.offsetHeight, t = 0;
      new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => {
          const h = main.offsetHeight;
          if (Math.abs(h - last) > 3) { last = h; refresh(); last = main.offsetHeight; }
        }, 260);
      }).observe(main);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
