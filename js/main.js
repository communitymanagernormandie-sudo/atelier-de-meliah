/* =========================================================
   L'Atelier de Meliah — moteur front (vanilla JS, sans build)
   ========================================================= */

/* ---------- Utils ---------- */
const euros = n => n.toLocaleString('fr-FR', { style:'currency', currency:'EUR' }).replace(',00','');
const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

/* ---------- Cart store (localStorage) ---------- */
const Cart = {
  key: 'adm_cart',
  read(){ try{ return JSON.parse(localStorage.getItem(this.key)) || []; }catch(e){ return []; } },
  write(items){ localStorage.setItem(this.key, JSON.stringify(items)); renderCart(); },
  add(id, opts={}){
    const items = this.read();
    const optKey = JSON.stringify(opts);
    const existing = items.find(i => i.id === id && JSON.stringify(i.opts||{}) === optKey);
    if(existing){ existing.qty += 1; }
    else{ items.push({ id, qty:1, opts }); }
    this.write(items);
  },
  setQty(idx, qty){
    const items = this.read();
    if(!items[idx]) return;
    if(qty <= 0){ items.splice(idx,1); } else { items[idx].qty = qty; }
    this.write(items);
  },
  remove(idx){ const items = this.read(); items.splice(idx,1); this.write(items); },
  count(){ return this.read().reduce((s,i)=>s+i.qty,0); },
  subtotal(){ return this.read().reduce((s,i)=>{ const p = findProduct(i.id); return p ? s + p.price*i.qty : s; },0); }
};

/* ---------- Favorites store ---------- */
const Favorites = {
  key: 'adm_favorites',
  read(){ try{ return JSON.parse(localStorage.getItem(this.key)) || []; }catch(e){ return []; } },
  write(list){ localStorage.setItem(this.key, JSON.stringify(list)); renderFavCount(); },
  toggle(id){
    const list = this.read();
    const i = list.indexOf(id);
    if(i>-1){ list.splice(i,1); } else { list.push(id); }
    this.write(list);
    return list.includes(id);
  },
  has(id){ return this.read().includes(id); }
};

/* ---------- Header scroll state ---------- */
function initHeader(){
  const header = $('header.site');
  if(!header) return;
  const onScroll = () => {
    if(window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  const burger = $('.burger');
  const mobileNav = $('.mobile-nav');
  const mobileNavClose = $('.mobile-nav-close');
  if(burger && mobileNav){
    const closeMenu = () => {
      burger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    if(mobileNavClose) mobileNavClose.addEventListener('click', closeMenu);
    $$('.mobile-nav a').forEach(a => a.addEventListener('click', closeMenu));
  }
}

/* ---------- Reveal on scroll ---------- */
function initReveal(){
  const els = $$('.reveal');
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold:0.12 });
  els.forEach(el => io.observe(el));
}

/* ---------- Hero parallax ---------- */
function initParallax(){
  const bg = $('.hero-bg');
  if(!bg) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if(y < window.innerHeight){ bg.style.transform = `scale(1.08) translateY(${y*0.15}px)`; }
  }, { passive:true });
}

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg){
  let toast = $('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ---------- Product card renderer ---------- */
function productCardHTML(p){
  const stars = '★★★★★☆☆☆☆☆'.slice(5-p.rating, 10-p.rating);
  const isFav = Favorites.has(p.id);
  return `
  <div class="product-card reveal" data-id="${p.id}">
    <a href="produit.html?id=${p.id}" class="product-media" aria-label="${p.name}">
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      <img class="img-base" src="${p.img}" alt="${p.name}" loading="lazy">
      <img class="img-hover" src="${p.imgHover}" alt="" loading="lazy">
      <div class="product-quickadd">
        <button class="btn btn-primary btn-sm btn-block" onclick="event.preventDefault(); Cart.add('${p.id}'); showToast('${p.name.replace(/'/g,"\\'")} ajouté au panier');">Ajouter au panier</button>
      </div>
    </a>
    <button class="product-fav ${isFav?'active':''}" aria-label="Ajouter aux favoris" onclick="const on=Favorites.toggle('${p.id}'); this.classList.toggle('active',on);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6Z"/></svg>
    </button>
    <a href="produit.html?id=${p.id}" class="product-info">
      <div>
        <div class="cat">${p.category}</div>
        <h3>${p.name}</h3>
        <div class="product-stars"><span class="stars">${stars}</span> (${p.reviews})</div>
      </div>
      <div class="product-price">${euros(p.price)}</div>
    </a>
  </div>`;
}

function renderProductGrid(container, list){
  if(!container) return;
  container.innerHTML = list.map(productCardHTML).join('');
  initReveal();
}

/* ---------- Cart drawer render ---------- */
function renderCart(){
  const badge = $('.icon-badge.cart-count');
  const count = Cart.count();
  if(badge){ badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }

  const list = $('.cart-items');
  if(list){
    const items = Cart.read();
    if(!items.length){
      list.innerHTML = `<div class="cart-empty">
        <p>Votre panier est vide pour l'instant.</p>
        <a href="boutique.html" class="btn btn-outline-dark btn-sm" style="margin-top:1.5rem;">Découvrir la boutique</a>
      </div>`;
    } else {
      list.innerHTML = items.map((item, idx) => {
        const p = findProduct(item.id);
        if(!p) return '';
        const optsTxt = item.opts && item.opts.prenom ? `Prénom : ${item.opts.prenom}` : '';
        return `
        <div class="cart-line">
          <img src="${p.img}" alt="${p.name}">
          <div class="cart-line-info">
            <h4>${p.name}</h4>
            ${optsTxt ? `<div class="opt">${optsTxt}</div>` : ''}
            <div class="opt">${euros(p.price)}</div>
            <div class="cart-qty">
              <button onclick="Cart.setQty(${idx}, ${item.qty-1})">−</button>
              <span>${item.qty}</span>
              <button onclick="Cart.setQty(${idx}, ${item.qty+1})">+</button>
            </div>
            <button class="cart-remove" onclick="Cart.remove(${idx})">Retirer</button>
          </div>
        </div>`;
      }).join('');
    }
  }
  const subtotalEl = $('.cart-subtotal .amount');
  if(subtotalEl) subtotalEl.textContent = euros(Cart.subtotal());

  // full cart page (panier.html) if present
  const pageList = $('#panier-page-items');
  if(pageList) renderCartPage();
}

function renderFavCount(){
  const badge = $('.icon-badge.fav-count');
  const count = Favorites.read().length;
  if(badge){ badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
}

/* ---------- Cart drawer open/close ---------- */
function initCartDrawer(){
  const drawer = $('.cart-drawer');
  const overlay = $('.cart-overlay');
  if(!drawer || !overlay) return;
  const open = () => { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow='hidden'; };
  const close = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow=''; };
  $$('[data-cart-open]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  $$('[data-cart-close]').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', close);
}

/* ---------- Newsletter ---------- */
function initNewsletterForms(){
  $$('.newsletter-form, .footer-newsletter-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Merci ! Vous êtes inscrite à notre newsletter. 🤍');
      form.reset();
    });
  });
}

/* ---------- Contact form ---------- */
function initContactForm(){
  const form = $('#contact-form');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Votre message a bien été envoyé, merci !');
    form.reset();
  });
}

/* ---------- Init on load ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initReveal();
  initParallax();
  initCartDrawer();
  initNewsletterForms();
  initContactForm();
  renderCart();
  renderFavCount();

  // year in footer
  $$('.year').forEach(el => el.textContent = new Date().getFullYear());
});
