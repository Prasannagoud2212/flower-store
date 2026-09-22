(() => {
  'use strict';

  /* ---------- 1. Data & helpers ---------- */
  const PRODUCTS = [
    { id: 1, name: 'Pink Lily Plant',  price: 399, oldPrice: 499, off: '-20%', img: 'images/product-1.jpg', alt: 'Pink lilies in a pink pot',            style: 'outline' },
    { id: 2, name: 'Red Rose Bouquet', price: 499, oldPrice: 599, off: '-15%', img: 'images/product-2.jpg', alt: 'Red roses in a glass vase',            style: 'solid'   },
    { id: 3, name: 'Money Plant',      price: 179, oldPrice: 199, off: '-10%', img: 'images/product-3.jpg', alt: 'Money plant in a white pot',           style: 'outline' },
    { id: 4, name: 'Peace Lily',       price: 599, oldPrice: 799, off: '-25%', img: 'images/product-4.jpg', alt: 'Peace lily in a ribbed white pot',     style: 'solid'   },
    { id: 5, name: 'Carnation Plant',  price: 369, oldPrice: 449, off: '-18%', img: 'images/product-5.jpg', alt: 'Pink carnations in a pink pot',        style: 'outline' },
    { id: 6, name: 'Snake Plant',      price: 439, oldPrice: 499, off: '-12%', img: 'images/product-6.jpg', alt: 'Snake plant in a ribbed white pot',    style: 'outline' }
  ];

  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const byId = id => PRODUCTS.find(p => p.id === Number(id));
  const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;

  const store = {
    get(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: ignore */ }
    }
  };

  // cart: { [productId]: quantity }   wishlist: [productId, ...]
  const cart = {};
  const savedCart = store.get('flower:cart', {});
  Object.keys(savedCart).forEach(id => {
    const qty = Number(savedCart[id]);
    if (byId(id) && qty > 0) cart[id] = Math.min(qty, 99);
  });
  let wishlist = store.get('flower:wishlist', []).filter(id => byId(id));

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  /* ---------- 2. Header & nav ---------- */

  const header = $('#header');
  const menuBtn = $('#menu-btn');

  function setMenu(open) {
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', e => {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  
  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- 3. Products ---------- */

  const grid = $('#product-grid');

  function productCard(p) {
    const wished = wishlist.includes(p.id);
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media">
          <span class="badge${p.style === 'solid' ? ' badge--solid' : ''}">${p.off}</span>
          <img src="${p.img}" alt="${p.alt}" width="536" height="632" loading="lazy">
        </div>
        <h3 class="card__title">${p.name}</h3>
        <p class="price"><strong>${money.format(p.price)}</strong><s>${money.format(p.oldPrice)}</s></p>
        <div class="card__actions">
          <button class="btn-add" type="button" data-add="${p.id}">${icon('i-cart')} Add to Cart</button>
          <button class="btn-wish" type="button" data-wish="${p.id}" aria-pressed="${wished}" aria-label="${wished ? 'Remove' : 'Add'} ${p.name} ${wished ? 'from' : 'to'} wishlist">${icon('i-heart')}</button>
        </div>
      </article>`;
  }

  function renderProducts(list = PRODUCTS) {
    grid.innerHTML = list.map(productCard).join('');
  }

  grid.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    const wish = e.target.closest('[data-wish]');
    if (add) addToCart(add.dataset.add);
    if (wish) toggleWish(wish.dataset.wish);
  });

  /* ---------- 4. Cart & wishlist state ---------- */

  const cartCount = $('#cart-count');
  const wishCount = $('#wish-count');

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  }

  function updateBadges() {
    cartCount.textContent = Object.values(cart).reduce((a, b) => a + b, 0);
    wishCount.textContent = wishlist.length;
  }

  function persist() {
    store.set('flower:cart', cart);
    store.set('flower:wishlist', wishlist);
    updateBadges();
  }

  function addToCart(id) {
    const p = byId(id);
    if (!p) return;
    cart[p.id] = Math.min((cart[p.id] || 0) + 1, 99);
    persist(); bump(cartCount);
    toast(`${p.name} added to cart`);
    if (drawerMode === 'wishlist' && drawerOpen) renderDrawer();
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, 99);
    persist(); renderDrawer();
  }

  function toggleWish(id) {
    const p = byId(id);
    if (!p) return;
    const has = wishlist.includes(p.id);
    wishlist = has ? wishlist.filter(x => x !== p.id) : [...wishlist, p.id];
    persist(); bump(wishCount);
    $$(`[data-wish="${p.id}"]`).forEach(btn => {
      btn.setAttribute('aria-pressed', String(!has));
      btn.setAttribute('aria-label', `${has ? 'Add' : 'Remove'} ${p.name} ${has ? 'to' : 'from'} wishlist`);
    });
    toast(has ? `${p.name} removed from wishlist` : `${p.name} saved to wishlist`);
    if (drawerMode === 'wishlist' && drawerOpen) renderDrawer();
  }

  /* ---------- 5. Cart / wishlist  ---------- */

  const drawer = $('#drawer');
  const overlay = $('#overlay');
  const drawerTitle = $('#drawer-title');
  const drawerBody = $('#drawer-body');
  const drawerFoot = $('#drawer-foot');
  let drawerMode = 'cart';
  let drawerOpen = false;
  let lastFocus = null;

  function renderDrawer() {
    if (drawerMode === 'cart') {
      drawerTitle.textContent = 'Your Cart';
      const ids = Object.keys(cart);
      if (!ids.length) {
        drawerBody.innerHTML = `<div class="empty"><p>Your cart is empty. Add a plant or bouquet to get started.</p><button class="btn btn--pink" type="button" data-browse>Browse products</button></div>`;
        drawerFoot.innerHTML = '';
        return;
      }
      drawerBody.innerHTML = ids.map(id => {
        const p = byId(id);
        return `
          <div class="line" data-id="${p.id}">
            <img src="${p.img}" alt="${p.alt}" width="64" height="76">
            <div>
              <p class="line__name">${p.name}</p>
              <p class="line__price">${money.format(p.price)}</p>
              <div class="line__ctrl">
                <div class="qty">
                  <button type="button" data-dec="${p.id}" aria-label="Decrease quantity of ${p.name}">${icon('i-minus')}</button>
                  <output aria-live="polite">${cart[id]}</output>
                  <button type="button" data-inc="${p.id}" aria-label="Increase quantity of ${p.name}">${icon('i-plus')}</button>
                </div>
              </div>
            </div>
            <button class="icon-btn line__remove" type="button" data-remove="${p.id}" aria-label="Remove ${p.name} from cart">${icon('i-trash')}</button>
          </div>`;
      }).join('');
      const total = ids.reduce((sum, id) => sum + byId(id).price * cart[id], 0);
      drawerFoot.innerHTML = `<div class="subtotal"><span>Subtotal</span><span>${money.format(total)}</span></div><button class="btn btn--pink" type="button" data-checkout>Checkout</button>`;
    } else {
      drawerTitle.textContent = 'My Favorites';
      if (!wishlist.length) {
        drawerBody.innerHTML = `<div class="empty"><p>No favorites yet. Tap the heart on any product to save it here.</p><button class="btn btn--pink" type="button" data-browse>Browse products</button></div>`;
        drawerFoot.innerHTML = '';
        return;
      }
      drawerBody.innerHTML = wishlist.map(id => {
        const p = byId(id);
        return `
          <div class="line" data-id="${p.id}">
            <img src="${p.img}" alt="${p.alt}" width="64" height="76">
            <div>
              <p class="line__name">${p.name}</p>
              <p class="line__price">${money.format(p.price)}</p>
              <div class="line__ctrl"><button class="btn-add" type="button" data-add="${p.id}">${icon('i-cart')} Add to Cart</button></div>
            </div>
            <button class="icon-btn line__remove" type="button" data-unwish="${p.id}" aria-label="Remove ${p.name} from favorites">${icon('i-trash')}</button>
          </div>`;
      }).join('');
      drawerFoot.innerHTML = '';
    }
  }

  function openDrawer(mode) {
    drawerMode = mode;
    lastFocus = document.activeElement;
    renderDrawer();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerOpen = true;
    document.body.style.overflow = 'hidden';
    $('#drawer-close').focus();
  }

  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-visible');
    setTimeout(() => { overlay.hidden = true; }, 250);
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  drawer.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.inc) setQty(t.dataset.inc, (cart[t.dataset.inc] || 0) + 1);
    else if (t.dataset.dec) setQty(t.dataset.dec, (cart[t.dataset.dec] || 0) - 1);
    else if (t.dataset.remove) setQty(t.dataset.remove, 0);
    else if (t.dataset.unwish) toggleWish(t.dataset.unwish);
    else if (t.dataset.add) addToCart(t.dataset.add);
    else if (t.dataset.browse !== undefined) { closeDrawer(); $('#products').scrollIntoView(); }
   else if (t.dataset.checkout !== undefined) {
  Object.keys(cart).forEach(id => delete cart[id]);
  persist();
  closeDrawer();
  toast('Order placed successfully!');
}
  });

  $('#cart-btn').addEventListener('click', () => openDrawer('cart'));
  $('#wish-btn').addEventListener('click', () => openDrawer('wishlist'));
  $('#user-btn').addEventListener('click', () => {});
  $('#drawer-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  $$('[data-action]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    const action = link.dataset.action;
    if (action === 'cart') openDrawer('cart');
    else if (action === 'wishlist') openDrawer('wishlist');
  }));

 
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); setMenu(false); }
    if (e.key === 'Tab' && drawerOpen) {
      const focusables = $$('button, [href], input', drawer).filter(el => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- 6. Search ---------- */

  const searchForm = $('#search-form');
  const searchInput = $('#search-input');
  const searchStatus = $('#search-status');

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      renderProducts();
      searchStatus.hidden = true;
      return 0;
    }
    const matches = PRODUCTS.filter(p => p.name.toLowerCase().includes(q));
    renderProducts(matches);
    searchStatus.hidden = false;
    searchStatus.innerHTML = matches.length
      ? `Showing ${matches.length} result${matches.length > 1 ? 's' : ''} for “${q.replace(/[<>&"]/g, '')}”. <button type="button" data-clear-search>Clear search</button>`
      : `No products match “${q.replace(/[<>&"]/g, '')}”. <button type="button" data-clear-search>Show all products</button>`;
    return matches.length;
  }

  searchInput.addEventListener('input', () => runSearch(searchInput.value));
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    runSearch(searchInput.value);
    setMenu(false);
    $('#products').scrollIntoView();
  });
  searchStatus.addEventListener('click', e => {
    if (e.target.closest('[data-clear-search]')) { searchInput.value = ''; runSearch(''); }
  });

  /* ---------- 7. Contact form ---------- */

  const form = $('#contact-form');
  const formStatus = $('#form-status');

  const rules = {
    name:    v => v.trim().length >= 2 ? '' : 'Enter your name.',
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.',
    number:  v => /^\+?[0-9\s()-]{7,18}$/.test(v.trim()) ? '' : 'Enter a valid phone number (7 to 15 digits).',
    message: v => v.trim().length >= 10 ? '' : 'Write a message of at least 10 characters.'
  };
  const fieldIds = { name: 'c-name', email: 'c-email', number: 'c-phone', message: 'c-message' };

  function validateField(name) {
    const input = $('#' + fieldIds[name]);
    const err = $('#' + fieldIds[name] + '-err');
    const message = rules[name](input.value);
    err.textContent = message;
    err.hidden = !message;
    input.setAttribute('aria-invalid', String(!!message));
    if (message) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    return !message;
  }

  Object.keys(rules).forEach(name => {
    const input = $('#' + fieldIds[name]);
    input.addEventListener('blur', () => { if (input.value) validateField(name); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validateField(name); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    formStatus.hidden = true;
    const results = Object.keys(rules).map(validateField);
    const firstBad = Object.keys(rules).find((_, i) => !results[i]);
    if (firstBad) { $('#' + fieldIds[firstBad]).focus(); return; }

   
    form.reset();
    formStatus.textContent = 'Thanks, your message was sent. We will get back to you soon.';
    formStatus.hidden = false;
  });

  /* ---------- 8. Video modal ---------- */

  const modal = $('#video-modal');
  const stage = $('#video-stage');

  function openVideo() {
  const src = './flowers-video.mp4';

  stage.innerHTML = '';

  const video = document.createElement('video');

video.controls = true;
video.playsInline = true;
video.preload = 'metadata';

const source = document.createElement('source');
source.src = new URL('./flowers-video.mp4', window.location.href).href;
source.type = 'video/mp4';

video.appendChild(source);
video.load();

  video.addEventListener('loadedmetadata', () => {
    console.log('Video loaded successfully:', src);
  });

  video.addEventListener('error', () => {
    stage.innerHTML = `
      <p class="video-modal__msg">
        This video cannot be played by the browser.
      </p>
    `;
  });

  stage.appendChild(video);

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}
  function closeVideo() {
    const v = $('video', stage);
    if (v) v.pause();
    stage.innerHTML = '';
    if (modal.open) modal.close();
  }

  $$('[data-video-open]').forEach(btn => btn.addEventListener('click', openVideo));
  $('#video-close').addEventListener('click', closeVideo);
  modal.addEventListener('click', e => { if (e.target === modal) closeVideo(); });
  modal.addEventListener('close', () => { stage.innerHTML = ''; });

  /* ---------- Init ---------- */
  renderProducts();
  updateBadges();
})();
