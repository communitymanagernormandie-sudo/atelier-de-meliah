/* ═══════════════════════════════════════════════════════════════
   L'Atelier de Meliah — Animations
   ─────────────────────────────────────────────────────────────────
   INSTALLATION (1 ligne) : ajoutez juste avant </body> de chaque page :

     <script src="meliah-animations.js" defer></script>

   Le script s'applique automatiquement :
   • Entrée du hero en cascade (1re section de la page)
   • Apparition au défilement de chaque section (fondu + translation)
   • Compteurs animés : entourez le nombre de
       <span data-count="500">500</span>   (+ data-decimals="1" si 4.9)
     — sinon les stats restent statiques, rien ne casse.
   • Zoom doux des images au survol (cartes, grilles)
   • Parallaxe légère : ajoutez data-parallax="0.08" sur une image
   • Respecte prefers-reduced-motion (tout est désactivé si demandé)

   OPTIONS : window.MELIAH_ANIM = { vitesse: 1, parallaxe: true }
   (à définir AVANT le script pour personnaliser)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var opts = Object.assign({ vitesse: 1, parallaxe: true }, window.MELIAH_ANIM || {});
  var speed = opts.vitesse || 1;

  /* ── CSS injecté (keyframes + hover) ─────────────────────────── */
  var css = [
    '@keyframes meliahUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes meliahKenburns{from{transform:scale(1)}to{transform:scale(1.07)}}',
    '.meliah-hero-anim{animation:meliahUp ' + (1 / speed) + 's cubic-bezier(.22,1,.36,1) both}',
    '.meliah-kenburns{animation:meliahKenburns 16s ease-out both}',
    '.meliah-reveal{opacity:0;transform:translateY(26px);transition:opacity ' + (0.8 / speed) + 's cubic-bezier(.22,1,.36,1),transform ' + (0.9 / speed) + 's cubic-bezier(.22,1,.36,1)}',
    '.meliah-reveal.is-visible{opacity:1;transform:translateY(0)}',
    '.meliah-img-zoom{overflow:hidden}',
    '.meliah-img-zoom img{transition:transform .7s cubic-bezier(.22,1,.36,1)}',
    '.meliah-img-zoom:hover img{transform:scale(1.06)}',
    'a.btn,button,.btn{transition:transform .3s ease,box-shadow .3s ease,background .3s ease}',
    'a.btn:hover,.btn:hover{transform:translateY(-2px)}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function init() {
    /* ── 1. Hero : entrée en cascade ─────────────────────────────── */
    var hero = document.querySelector('header, main > section:first-of-type, body > section:first-of-type');
    if (hero) {
      var heroKids = Array.prototype.slice.call(hero.children).filter(function (el) {
        return !/(IMG|PICTURE|VIDEO)/.test(el.tagName);
      });
      // si le hero a un seul conteneur, animer ses enfants
      if (heroKids.length === 1 && heroKids[0].children.length > 1) {
        heroKids = Array.prototype.slice.call(heroKids[0].children);
      }
      heroKids.forEach(function (el, i) {
        el.classList.add('meliah-hero-anim');
        el.style.animationDelay = (0.1 + i * 0.15) / speed + 's';
      });
      var heroImg = hero.querySelector('img');
      if (heroImg) heroImg.classList.add('meliah-kenburns');
    }

    /* ── 2. Apparition au défilement ─────────────────────────────── */
    // cible : enfants directs des sections (hors hero), ou data-reveal manuel
    var revealEls = [];
    document.querySelectorAll('[data-reveal]').forEach(function (el) { revealEls.push(el); });
    if (revealEls.length === 0) {
      document.querySelectorAll('section, footer').forEach(function (sec) {
        if (sec === hero) return;
        Array.prototype.slice.call(sec.children).forEach(function (child, i) {
          if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') return;
          child.setAttribute('data-reveal', String(Math.min(i + 1, 6)));
          revealEls.push(child);
        });
      });
    }
    revealEls.forEach(function (el) { el.classList.add('meliah-reveal'); });

    function reveal(el) {
      if (el._revealed) return;
      el._revealed = true;
      var order = parseInt(el.getAttribute('data-reveal'), 10) || 1;
      el.style.transitionDelay = ((order - 1) * 0.12) / speed + 's';
      el.classList.add('is-visible');
      io.unobserve(el);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    /* ── 3. Compteurs animés (éléments [data-count]) ─────────────── */
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    function startCounter(el) {
      if (el._counted) return;
      el._counted = true;
      cio.unobserve(el);
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var dur = 1600 / speed;
      var t0 = performance.now();
      (function tick(t) {
        var p = Math.min(1, ((t || performance.now()) - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
      })();
    }
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) startCounter(entry.target);
      });
    }, { threshold: 0 });
    counters.forEach(function (el) {
      el.textContent = (0).toFixed(parseInt(el.getAttribute('data-decimals') || '0', 10));
      cio.observe(el);
    });

    /* ── 4. Zoom des images au survol (cartes / grilles) ─────────── */
    document.querySelectorAll('a > img, figure > img, .card img').forEach(function (img) {
      var parent = img.parentElement;
      if (parent && !parent.classList.contains('meliah-kenburns')) {
        parent.classList.add('meliah-img-zoom');
      }
    });

    /* ── 5. Parallaxe légère ([data-parallax="0.08"]) ────────────── */
    var pEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    function onParallax() {
      var vh = window.innerHeight;
      pEls.forEach(function (el) {
        var f = parseFloat(el.getAttribute('data-parallax'));
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2 - vh / 2;
        el.style.translate = '0 ' + (-center * f).toFixed(1) + 'px';
      });
    }
    if (opts.parallaxe && pEls.length) {
      window.addEventListener('scroll', onParallax, { passive: true });
      onParallax();
    }

    /* ── 6. Filet de sécurité : défilement très rapide ───────────── */
    function safetyPass() {
      var vh = window.innerHeight;
      revealEls.forEach(function (el) {
        if (el._revealed) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 || r.bottom < 0) reveal(el);
      });
      counters.forEach(function (el) {
        if (el._counted) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh || r.bottom < 0) startCounter(el);
      });
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(safetyPass); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
