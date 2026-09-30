import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { projects } from './projects.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const COLORS = { ink: '#0C0E13', ivory: '#F2ECE3', ember: '#FF5B35' };

/* ------------------------------------------------------------------
   Projects
   ------------------------------------------------------------------ */
function renderProjects() {
  $('.projects').innerHTML = projects.map((p, i) => `
    <article class="project" data-reveal-card tabindex="0" role="button" data-id="${p.id}" aria-label="Open the ${p.name} case study">
      <div class="project__frame">
        <span class="mono project__num">${String(i + 1).padStart(2, '0')} · ${p.kind}</span>
        <span class="mono project__count">${p.shots.length} screens</span>
        <div class="stack">
          ${p.shots.slice(0, 4).map((s) => `<div class="stack__card"><img src="${s.src}" alt="${p.name}: ${s.caption}" loading="lazy" decoding="async"/></div>`).join('')}
        </div>
      </div>
      <div class="project__body">
        <div>
          <h3 class="project__name">${p.name}</h3>
          <p class="project__tagline">${p.tagline}</p>
        </div>
        <span class="project__open" aria-hidden="true">→</span>
      </div>
      <div class="project__metrics">
        ${p.metrics.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}
      </div>
    </article>`).join('');

  $$('.project').forEach((card) => {
    const frame = $('.project__frame', card);
    card.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      frame.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    const open = () => openCase(card.dataset.id, card);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ------------------------------------------------------------------
   Text splitting
   ------------------------------------------------------------------ */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const outer = document.createElement('span');
          outer.className = 'split-line';
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
  return $$('.split-line > span', el);
}

function splitStatement(el) {
  const key = /^(end|pixel\.|business|actually|Data|Science|real|products\.)$/;
  el.innerHTML = el.textContent.trim().split(/\s+/)
    .map((w) => `<span class="w${key.test(w) ? ' is-key' : ''}">${w}</span>`).join(' ');
  return $$('.w', el);
}

/* ------------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------------ */
let lenis = null;
function initScroll() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // anchor links go through Lenis so the section transitions play
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
  }));
}

/* ------------------------------------------------------------------
   Section-to-section transitions
   Each incoming panel rises as a rounded card and expands to full
   bleed, while the outgoing one sinks, shrinks and dims behind it.
   ------------------------------------------------------------------ */
function initTransitions() {
  const panels = $$('.panel');
  panels.forEach((panel, i) => {
    if (i === 0 || reduced) return;
    const prev = panels[i - 1];
    const prevColor = COLORS[prev.dataset.theme];
    // the experience track is excluded: scaling a track that wide would shove its cards sideways
    const behind = $$(':scope > .panel__inner, .exp__head', prev);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top top', scrub: true },
      defaults: { ease: 'none' },
    });
    tl.fromTo(panel, { clipPath: 'inset(0% 6% 0% 6% round 56px 56px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' }, 0)
      .fromTo(behind, { y: 0, scale: 1 }, { y: () => innerHeight * 0.3, scale: 0.92, transformOrigin: '50% 0%' }, 0)
      .fromTo(prev, { '--shade': 0 }, { '--shade': 0.55 }, 0)
      .fromTo(document.body, { backgroundColor: prevColor }, { backgroundColor: gsap.utils.interpolate(prevColor, COLORS.ink, 0.55), immediateRender: false }, 0);
  });

  // giant outlined words drifting across the section backgrounds
  $$('.ghost span').forEach((g) => {
    gsap.fromTo(g, { xPercent: 0 }, {
      xPercent: -35, ease: 'none',
      scrollTrigger: { trigger: g.closest('.panel'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ------------------------------------------------------------------
   Nav theme, active link, chapter rail
   ------------------------------------------------------------------ */
function initChrome() {
  const nav = $('.nav');
  const pill = $('.nav__pill');
  const rail = $('.rail');
  const railCur = $('.rail__cur');
  const railLabel = $('.rail__label');

  const movePill = (link) => {
    if (!link) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  const setChapter = (panel) => {
    nav.dataset.navTheme = panel.dataset.theme;
    const id = panel.id;
    $$('.nav__links a').forEach((a) => a.classList.toggle('is-active', a.dataset.link === id));
    movePill($(`.nav__links a[data-link="${id}"]`));
    if (railCur.textContent !== panel.dataset.index) {
      gsap.timeline()
        .to([railCur, railLabel], { yPercent: -100, opacity: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => { railCur.textContent = panel.dataset.index; railLabel.textContent = panel.dataset.label; })
        .fromTo([railCur, railLabel], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    }
    rail.classList.toggle('is-on', panel.dataset.index !== '00');
  };

  $$('.panel').forEach((panel) => {
    ScrollTrigger.create({
      trigger: panel, start: 'top 60px', end: 'bottom 60px',
      onToggle: (self) => self.isActive && setChapter(panel),
    });
  });

  gsap.to('.rail__fill', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  // hide the nav while reading downwards, bring it back on the way up
  let last = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      if (document.body.classList.contains('menu-open')) return;
      if (y > 400 && y > last + 4) nav.classList.add('is-hidden');
      else if (y < last - 4 || y < 400) nav.classList.remove('is-hidden');
      last = y;
    },
  });

  // mobile menu
  $('.nav__burger').addEventListener('click', () => {
    document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
  });
  $$('.menu a').forEach((a) => a.addEventListener('click', closeMenu));
}
function openMenu() {
  document.body.classList.add('menu-open');
  $('.menu').classList.add('is-open');
  $('.menu').setAttribute('aria-hidden', 'false');
  $('.nav__burger').setAttribute('aria-expanded', 'true');
  lenis?.stop();
}
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  $('.menu').classList.remove('is-open');
  $('.menu').setAttribute('aria-hidden', 'true');
  $('.nav__burger').setAttribute('aria-expanded', 'false');
  lenis?.start();
}

/* ------------------------------------------------------------------
   Reveals
   ------------------------------------------------------------------ */
function initReveals() {
  $$('[data-split]').forEach((el) => {
    if (el.closest('.hero')) return;
    const words = splitWords(el);
    if (reduced) return;
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  const statement = $('[data-words]');
  const words = splitStatement(statement);
  if (!reduced) {
    gsap.to(words, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  }

  if (reduced) return;
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: (batch) => gsap.fromTo(batch, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
  gsap.set('[data-reveal]', { opacity: 0 });

  ScrollTrigger.batch('[data-reveal-card]', {
    start: 'top 90%',
    onEnter: (batch) => gsap.fromTo(batch,
      { y: 120, opacity: 0, rotate: (i) => (i % 2 ? 3 : -3) },
      { y: 0, opacity: 1, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, overwrite: true }),
  });
  gsap.set('[data-reveal-card]', { opacity: 0 });

  // education timeline draws itself
  gsap.to('.edu__line line', {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.edu', start: 'top 70%', end: 'bottom 60%', scrub: true },
  });

  // language meters fill in
  gsap.from('.langs i', { '--v': 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.langs', start: 'top 85%' } });

  // contact headline scales up out of the section before it
  gsap.from('.contact__title', {
    scale: 0.85, transformOrigin: '0% 100%', ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true },
  });
}

/* ------------------------------------------------------------------
   Experience: horizontal track pinned while scrolling
   ------------------------------------------------------------------ */
function initExperience() {
  const section = $('.experience');
  const track = $('.exp__track');
  const cards = $$('.exp-card', track);
  const count = $('.exp__count');
  const [prevBtn, nextBtn] = $$('.exp__btn');
  let stops = [0];          // horizontal offsets where a card lines up with the left edge
  let current = 0;
  let goTo = () => {};      // set by the active layout below

  const measure = (max) => {
    const first = cards[0].offsetLeft;
    stops = [...new Set(cards.map((c) => Math.min(max, Math.max(0, c.offsetLeft - first))))];
  };
  const setCurrent = (offset) => {
    let best = 0;
    stops.forEach((s, i) => { if (Math.abs(s - offset) < Math.abs(stops[best] - offset)) best = i; });
    current = best;
    count.textContent = `${String(best + 1).padStart(2, '0')} / ${String(stops.length).padStart(2, '0')}`;
    prevBtn.disabled = best === 0 && offset < 4;
    nextBtn.disabled = best === stops.length - 1;
  };
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  const mm = gsap.matchMedia();
  mm.add({
    pinned: '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    wide: '(min-width: 761px)',
  }, (ctx) => {
    const { pinned, wide } = ctx.conditions;

    if (pinned) {
      // Pinned: vertical scroll drives the track. The run is ~2.4x the travel so each
      // card stays readable, with a short hold on the first and the last card.
      const HOLD = 0.15, MOVE = 1, TOTAL = HOLD + MOVE + HOLD;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.exp__pin', start: 'top top', end: () => `+=${Math.round(dist() * 2.4 + innerHeight * 0.4)}`,
          pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onRefresh: () => { measure(dist()); setCurrent(-gsap.getProperty(track, 'x')); },
          onUpdate: () => setCurrent(-gsap.getProperty(track, 'x')),
        },
      });
      tl.to(track, { x: () => -dist(), duration: MOVE }, HOLD)
        .fromTo('.exp__progress i', { scaleX: 0 }, { scaleX: 1, duration: MOVE }, HOLD)
        .to({}, { duration: HOLD });

      goTo = (i) => {
        const st = tl.scrollTrigger;
        const idx = gsap.utils.clamp(0, stops.length - 1, i);
        const d = dist() || 1;
        const progress = idx === 0 ? 0 : (HOLD + (stops[idx] / d) * MOVE) / TOTAL;
        const y = st.start + progress * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else scrollTo({ top: y, behavior: 'smooth' });
      };
      measure(dist());
      setCurrent(0);
      return () => { goTo = () => {}; };
    }

    if (wide) {
      // Touch devices and narrow windows: a native swipe carousel, free to go back and forth.
      section.classList.add('is-swipe');
      const bar = $('.exp__progress i');
      const onScroll = () => {
        const max = track.scrollWidth - track.clientWidth;
        gsap.set(bar, { scaleX: max > 0 ? track.scrollLeft / max : 1 });
        setCurrent(track.scrollLeft);
      };
      const onResize = () => { measure(track.scrollWidth - track.clientWidth); onScroll(); };
      track.addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onResize);
      goTo = (i) => {
        const idx = gsap.utils.clamp(0, stops.length - 1, i);
        track.scrollTo({ left: stops[idx], behavior: reduced ? 'auto' : 'smooth' });
      };
      onResize();
      return () => {
        section.classList.remove('is-swipe');
        track.removeEventListener('scroll', onScroll);
        removeEventListener('resize', onResize);
        gsap.set(bar, { clearProps: 'transform' });
        goTo = () => {};
      };
    }
  });
}

/* ------------------------------------------------------------------
   Hero: generative field + intro
   ------------------------------------------------------------------ */
function initHeroCanvas() {
  const canvas = $('.hero__canvas');
  const ctx = canvas.getContext('2d');
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let w, h, dpr, pts = [], running = true, t = 0;
  const GAP = 28;

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) pts.push([x, y]);
  };
  resize();
  addEventListener('resize', resize);
  $('.hero').addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
  });
  $('.hero').addEventListener('pointerleave', () => { mouse.tx = -9999; mouse.ty = -9999; });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: (s) => { running = s.isActive; if (running) loop(); } });

  const R = 170;
  function loop() {
    if (!running) return;
    t += reduced ? 0 : 0.012;
    mouse.x += (mouse.tx - mouse.x) * 0.12; mouse.y += (mouse.ty - mouse.y) * 0.12;
    if (mouse.tx < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    ctx.clearRect(0, 0, w, h);
    const near = [];
    for (const [bx, by] of pts) {
      const n = Math.sin(bx * 0.011 + t * 0.9) + Math.cos(by * 0.016 - t * 0.7) + Math.sin((bx + by) * 0.005 + t * 0.5);
      let x = bx + Math.cos(n) * 3, y = by + n * 5;
      const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy);
      const k = (n + 3) / 6;
      if (d < R) {
        const f = 1 - d / R;
        x += (dx / (d || 1)) * f * 26; y += (dy / (d || 1)) * f * 26;
        ctx.fillStyle = `rgba(255, 91, 53, ${0.35 + f * 0.65})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + f * 1.8, 0, 6.283); ctx.fill();
        if (f > 0.35) near.push([x, y, f]);
      } else {
        ctx.fillStyle = `rgba(242, 236, 227, ${0.06 + k * 0.2})`;
        ctx.fillRect(x - 0.8, y - 0.8, 1.6 + k, 1.6 + k);
      }
    }
    ctx.lineWidth = 0.6;
    for (const [x, y, f] of near) {
      ctx.strokeStyle = `rgba(255, 91, 53, ${f * 0.35})`;
      ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(x, y); ctx.stroke();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

function heroIntro() {
  const words = $$('.hero__title .word');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from(words, { yPercent: 110, duration: 1.4, stagger: 0.12 })
    .from('.hero__badge', { scale: 0, rotate: -120, duration: 1.2 }, 0.5)
    .from('.hero__eyebrow, .hero__lede, .hero__actions > *', { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, 0.4)
    .from('.hero__stats li', { y: 40, opacity: 0, duration: 1, stagger: 0.08 }, 0.7)
    .from('.hero__canvas', { opacity: 0, duration: 2, ease: 'power2.out' }, 0)
    .from('.nav', { top: -90, opacity: 0, duration: 1.2 }, 0.3)
    .add(() => {
      $$('[data-count]').forEach((b) => {
        const o = { v: 0 };
        gsap.to(o, { v: +b.dataset.count, duration: 1.6, ease: 'power3.out', onUpdate: () => { b.textContent = Math.round(o.v); } });
      });
    }, 0.8);

  // scroll-away: the name drifts apart as the hero leaves
  if (!reduced) {
    gsap.to('.hero__title .line:first-child', { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__title .line--serif', { xPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
}

/* ------------------------------------------------------------------
   Loader
   ------------------------------------------------------------------ */
function runLoader() {
  document.body.classList.add('is-loading');
  const num = $('.loader__num');
  const imgs = $$('.project img').slice(0, 8);
  let loaded = 0;
  const target = { v: 0 };
  const progress = () => Math.min(1, 0.35 + (loaded / imgs.length) * 0.65);
  imgs.forEach((img) => {
    const done = () => { loaded++; };
    if (img.complete) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    img.loading = 'eager';
  });

  return new Promise((resolve) => {
    const tl = gsap.timeline();
    tl.from('.loader__name > *', { yPercent: 120, duration: 1, stagger: 0.1, ease: 'expo.out' });
    gsap.to(target, {
      v: 100, duration: reduced ? 0.2 : 1.8, ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.min(target.v, Math.max(progress() * 100, target.v > 92 ? target.v : 0));
        num.textContent = Math.round(v);
        gsap.set('.loader__bar i', { scaleX: v / 100 });
      },
      onComplete: () => {
        num.textContent = '100';
        gsap.set('.loader__bar i', { scaleX: 1 });
        gsap.timeline({ onComplete: () => { $('.loader').remove(); document.body.classList.remove('is-loading'); resolve(); } })
          .to('.loader__name, .loader__count', { yPercent: -40, opacity: 0, duration: 0.6, ease: 'power3.in' })
          .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.2')
          .add(heroIntro, '-=0.55');
      },
    });
  });
}

/* ------------------------------------------------------------------
   Cursor & magnetic buttons
   ------------------------------------------------------------------ */
function initCursor() {
  if (!finePointer) return;

  $$('.magnetic').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ------------------------------------------------------------------
   Case study overlay
   ------------------------------------------------------------------ */
const caseEl = $('.case');
let current = null, shotIndex = 0, returnFocus = null;

function showShot(i) {
  const shots = current.shots;
  shotIndex = (i + shots.length) % shots.length;
  const img = $('.case__stage img');
  const s = shots[shotIndex];
  gsap.fromTo(img, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  img.src = s.src; img.alt = `${current.name}: ${s.caption}`;
  $('.case__stage figcaption').textContent = s.caption;
  $('.case__count').textContent = `${String(shotIndex + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
  $$('.case__thumbs button').forEach((b, j) => b.classList.toggle('is-active', j === shotIndex));
  $$('.case__thumbs button')[shotIndex]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

function openCase(id, from) {
  current = projects.find((p) => p.id === id);
  returnFocus = from;
  $('.case__kind').textContent = `${current.kind} · ${current.year}`;
  $('.case__title').textContent = current.name;
  $('.case__tagline').textContent = current.tagline;
  $('.case__summary').textContent = current.summary;
  $('.case__meta').innerHTML =
    `<div><dt>Role</dt><dd>${current.role}</dd></div><div><dt>Year</dt><dd>${current.year}</dd></div>` +
    current.metrics.map(([v, l]) => `<div class="metric"><dt>${l}</dt><dd>${v}</dd></div>`).join('');
  $('.case__highlights').innerHTML = current.highlights.map((h) => `<li>${h}</li>`).join('');
  $('.case__stack').innerHTML = current.stack.map((s) => `<span>${s}</span>`).join('');
  $('.case__links').innerHTML = current.links.length
    ? current.links.map(([l, u]) => `<a class="btn btn--ember magnetic" href="${u}" target="_blank" rel="noopener">${l} <span class="arrow">↗</span></a>`).join('')
    : '<span class="mono" style="opacity:.5">Private project · demo on request</span>';
  $('.case__thumbs').innerHTML = current.shots.map((s, i) => `<button aria-label="Show ${s.caption}"><img src="${s.src}" alt="" loading="lazy"/></button>`).join('');
  $$('.case__thumbs button').forEach((b, i) => b.addEventListener('click', () => showShot(i)));
  showShot(0);

  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
  caseEl.classList.add('is-open');
  caseEl.setAttribute('aria-hidden', 'false');
  caseEl.scrollTop = 0;
  gsap.timeline()
    .fromTo(caseEl, { clipPath: 'inset(100% 0% 0% 0% round 48px 48px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', duration: 1, ease: 'expo.inOut' })
    .from('.case__info > *', { y: 40, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, 0.45)
    .from('.case__gallery', { y: 80, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.5);
  $('.case__close').focus({ preventScroll: true });
}

function closeCase() {
  if (!caseEl.classList.contains('is-open')) return;
  gsap.to(caseEl, {
    clipPath: 'inset(0% 0% 100% 0% round 0px 0px 48px 48px)', duration: 0.8, ease: 'expo.inOut',
    onComplete: () => {
      caseEl.classList.remove('is-open');
      caseEl.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
      lenis?.start();
      returnFocus?.focus({ preventScroll: true });
    },
  });
}

function initCase() {
  $('.case__close').addEventListener('click', closeCase);
  $$('.case__nav button').forEach((b) => b.addEventListener('click', () => showShot(shotIndex + Number(b.dataset.dir))));
  addEventListener('keydown', (e) => {
    if (!caseEl.classList.contains('is-open')) { if (e.key === 'Escape') closeMenu(); return; }
    if (e.key === 'Escape') closeCase();
    if (e.key === 'ArrowRight') showShot(shotIndex + 1);
    if (e.key === 'ArrowLeft') showShot(shotIndex - 1);
  });
}

/* ------------------------------------------------------------------
   Small things
   ------------------------------------------------------------------ */
function initMisc() {
  const copy = $('.contact__copy');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = 'Copied ✓'; }
    catch { copy.textContent = 'Select & copy'; }
    copy.classList.add('is-done');
    setTimeout(() => { copy.textContent = 'Copy'; copy.classList.remove('is-done'); }, 2000);
  });

  const clock = $('.clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' });
  const tickClock = () => { clock.textContent = fmt.format(new Date()); };
  tickClock(); setInterval(tickClock, 10000);
}

/* ------------------------------------------------------------------ */
renderProjects();
initScroll();
initReveals();
initTransitions();
initExperience();
initChrome();
initHeroCanvas();
initCursor();
initCase();
initMisc();
ScrollTrigger.sort();
runLoader().then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
