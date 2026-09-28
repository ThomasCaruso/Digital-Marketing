/* ==========================================================================
   FORM — demo experience logic (vanilla JS)
   Structure: mock data → state → helpers → renderers → flows → events → init
   ========================================================================== */

/* ---- 1. Mock data -------------------------------------------------------- */

const PALETTES = {
  top:   ['#24262b', '#d6cfc2', '#2c3a31', '#4b2430', '#2f3d55'],
  pants: ['#2e2f31', '#cfc8ba', '#4c4a44', '#2c3547', '#1c1c1e'],
  shoes: ['#d9d2c6', '#1e1e20', '#c9b58e', '#5d4531', '#8f8d88']
};
const PALETTE_NAMES = {
  top:   ['Charcoal', 'Stone', 'Forest', 'Burgundy', 'Navy'],
  pants: ['Charcoal', 'Stone', 'Dark Taupe', 'Navy', 'Black'],
  shoes: ['White / Gum', 'Black', 'Sand', 'Chestnut', 'Grey']
};

const LOOKS = [
  {
    id: 'look-01',
    number: '01',
    title: 'Quiet confidence',
    vibe: 'Strong fit for your style',
    description: 'Clean proportions, neutral layers, and enough structure to look deliberate without feeling overdressed.',
    why: 'You lean minimal with elevated-casual edges, so this stays tonal: a fine merino layer, a straight trouser with real drape, and one classic sneaker. The silhouette is straight through the leg, which suits your 6’0" / M frame.',
    scene: { a: '#b8b1a5', b: '#e9e4da' },
    products: [
      {
        id: 'l1-top', slot: 'top',
        brand: 'COS', name: 'Merino Zip Polo', price: 99,
        color: 'Charcoal', size: 'M', garment: '#24262b',
        details: 'Fine-gauge extra-fine merino, knit in a clean polo silhouette. True to size; hem sits at the hip.',
        alternatives: [
          { brand: 'Uniqlo', name: 'Fine Gauge Crew', price: 39, color: 'Stone', garment: '#d6cfc2', reason: 'Lower price' },
          { brand: 'Todd Snyder', name: 'Merino Polo', price: 128, color: 'Forest', garment: '#2c3a31', reason: 'More texture' },
          { brand: 'COS', name: 'Knit Overshirt', price: 135, color: 'Stone', garment: '#d6cfc2', reason: 'More relaxed' },
          { brand: 'Club Monaco', name: 'Half-Zip Knit', price: 119, color: 'Navy', garment: '#2f3d55', reason: 'Warmer for the evening' }
        ]
      },
      {
        id: 'l1-pants', slot: 'pants',
        brand: 'Abercrombie', name: 'Tailored Straight Trouser', price: 90,
        color: 'Dark Taupe', size: '31×32', garment: '#4c4a44',
        details: 'Four-way stretch with a tailored straight leg. Runs true; 32" inseam clears a low sneaker.',
        alternatives: [
          { brand: 'Uniqlo', name: 'Pleated Wide Trouser', price: 59, color: 'Charcoal', garment: '#2e2f31', reason: 'Lower price' },
          { brand: 'COS', name: 'Pleated Wool Trouser', price: 159, color: 'Charcoal', garment: '#2e2f31', reason: 'More formal' },
          { brand: 'J.Crew', name: 'Weekday Chino', price: 80, color: 'Stone', garment: '#cfc8ba', reason: 'More casual' },
          { brand: 'Aritzia Men', name: 'Effortless Pant', price: 98, color: 'Black', garment: '#1c1c1e', reason: 'Dressier drape' }
        ]
      },
      {
        id: 'l1-shoes', slot: 'shoes',
        brand: 'Adidas', name: 'Samba OG', price: 97,
        color: 'White / Gum', size: '10', garment: '#d9d2c6',
        details: 'Low-profile leather terrace sneaker. Fits true to size; works with a straight or wide leg opening.',
        alternatives: [
          { brand: 'Veja', name: 'Campo Sneaker', price: 110, color: 'White / Gum', garment: '#d9d2c6', reason: 'Cleaner lines' },
          { brand: 'New Balance', name: '1906', price: 115, color: 'Grey', garment: '#8f8d88', reason: 'More cushion' },
          { brand: 'Morjas', name: 'Penny Loafer', price: 149, color: 'Chestnut', garment: '#5d4531', reason: 'More formal' },
          { brand: 'Vans', name: 'Authentic', price: 60, color: 'Black', garment: '#1e1e20', reason: 'Lower price' }
        ]
      }
    ]
  },
  {
    id: 'look-02',
    number: '02',
    title: 'Soft structure',
    vibe: 'Leans into your neutrals',
    description: 'A lighter palette with sharper trousers — polished enough for the evening, relaxed enough to enjoy it.',
    why: 'This one plays to your budget priority: the knit is the value piece, and the spend moves to the trouser, where a wool blend reads noticeably better at night. The stone-on-black pairing flatters your neutral palette.',
    scene: { a: '#ccc3b7', b: '#f1ede6' },
    products: [
      {
        id: 'l2-top', slot: 'top',
        brand: 'Uniqlo U', name: 'Fine Gauge Knit', price: 59,
        color: 'Stone', size: 'M', garment: '#d6cfc2',
        details: 'Lightweight crew with a slightly boxy body. Size down for a closer fit through the chest.',
        alternatives: [
          { brand: 'Muji', name: 'Cashmere Blend Crew', price: 79, color: 'Stone', garment: '#d6cfc2', reason: 'Softer hand' },
          { brand: 'COS', name: 'Merino Zip Polo', price: 99, color: 'Charcoal', garment: '#24262b', reason: 'More structure' },
          { brand: 'Uniqlo', name: 'Lambswool V-Neck', price: 49, color: 'Charcoal', garment: '#24262b', reason: 'Lower price' },
          { brand: 'Everlane', name: 'ReCashmere Crew', price: 98, color: 'Sand', garment: '#c9b58e', reason: 'Warmer' }
        ]
      },
      {
        id: 'l2-pants', slot: 'pants',
        brand: 'COS', name: 'Pleated Wool Trouser', price: 159,
        color: 'Black', size: '31', garment: '#1c1c1e',
        details: 'Single-pleat wool blend with a pressed crease and tapered leg. High rise; pair with a tucked or short hem.',
        alternatives: [
          { brand: 'Aritzia Men', name: 'Relaxed Crease Pant', price: 145, color: 'Black', garment: '#1c1c1e', reason: 'More relaxed' },
          { brand: 'Abercrombie', name: 'Tailored Straight Trouser', price: 90, color: 'Dark Taupe', garment: '#4c4a44', reason: 'Lower price' },
          { brand: 'Suitsupply', name: 'Brescia Trouser', price: 199, color: 'Charcoal', garment: '#2e2f31', reason: 'More formal' },
          { brand: 'Uniqlo', name: 'Easy Pants', price: 49, color: 'Navy', garment: '#2c3547', reason: 'Most relaxed' }
        ]
      },
      {
        id: 'l2-shoes', slot: 'shoes',
        brand: 'New Balance', name: 'RC42', price: 100,
        color: 'Grey', size: '10', garment: '#8f8d88',
        details: 'Slim retro runner on a low wedge. True to size; the grey tone keeps the look quiet.',
        alternatives: [
          { brand: 'Adidas', name: 'Samba OG', price: 97, color: 'White / Gum', garment: '#d9d2c6', reason: 'Sharper profile' },
          { brand: 'Veja', name: 'Campo Sneaker', price: 110, color: 'Black', garment: '#1e1e20', reason: 'Leather upgrade' },
          { brand: 'Converse', name: 'Chuck 70', price: 85, color: 'Black', garment: '#1e1e20', reason: 'Lower price' },
          { brand: 'Salomon', name: 'XT-6', price: 160, color: 'Grey', garment: '#8f8d88', reason: 'More technical' }
        ]
      }
    ]
  },
  {
    id: 'look-03',
    number: '03',
    title: 'Night shift',
    vibe: 'A bolder read for the night',
    description: 'Darker and slightly more directional — built for dinner that turns into a longer night out.',
    why: 'FORM went one step outside your usual palette here: head-to-toe black with a textured layer on top. The overshirt keeps it from reading as a suit, and the white sneaker gives the eye somewhere to land.',
    scene: { a: '#8d8982', b: '#d6d2ca' },
    products: [
      {
        id: 'l3-top', slot: 'top',
        brand: 'Zara', name: 'Textured Overshirt', price: 89,
        color: 'Black', size: 'M', garment: '#24262b',
        details: 'Boxy overshirt with a seersucker-style texture. Roomy through the chest; wears open or buttoned.',
        alternatives: [
          { brand: 'COS', name: 'Knit Overshirt', price: 135, color: 'Charcoal', garment: '#24262b', reason: 'More texture' },
          { brand: 'AllSaints', name: 'Patch Shirt', price: 129, color: 'Black', garment: '#1c1c1e', reason: 'More edge' },
          { brand: 'Uniqlo', name: 'Flannel Overshirt', price: 59, color: 'Charcoal', garment: '#2e2f31', reason: 'Lower price' },
          { brand: 'Theory', name: 'Irving Shirt', price: 185, color: 'Black', garment: '#1c1c1e', reason: 'More refined' }
        ]
      },
      {
        id: 'l3-pants', slot: 'pants',
        brand: 'Aritzia Men', name: 'Relaxed Crease Pant', price: 145,
        color: 'Black', size: '31', garment: '#1c1c1e',
        details: 'Fluid crease-front pant with a relaxed leg. Sits at the natural waist; drapes over sneakers cleanly.',
        alternatives: [
          { brand: 'COS', name: 'Pleated Wool Trouser', price: 159, color: 'Black', garment: '#1c1c1e', reason: 'More formal' },
          { brand: 'Levi’s', name: '511 Slim', price: 69, color: 'Black', garment: '#1c1c1e', reason: 'Lower price' },
          { brand: 'Lululemon', name: 'ABC Pant', price: 128, color: 'Black', garment: '#1c1c1e', reason: 'More comfort' },
          { brand: 'Suitsupply', name: 'Winter Trouser', price: 199, color: 'Charcoal', garment: '#2e2f31', reason: 'Dressier' }
        ]
      },
      {
        id: 'l3-shoes', slot: 'shoes',
        brand: 'Veja', name: 'Campo Sneaker', price: 110,
        color: 'White / Gum', size: '10', garment: '#d9d2c6',
        details: 'Chrome-free leather low-top with a rubber sole. Runs slightly large; half size down if between.',
        alternatives: [
          { brand: 'Adidas', name: 'Samba OG', price: 97, color: 'White / Gum', garment: '#d9d2c6', reason: 'Lower price' },
          { brand: 'Common Projects', name: 'Achilles', price: 210, color: 'White', garment: '#e4ded2', reason: 'Minimal icon' },
          { brand: 'Morjas', name: 'Penny Loafer', price: 149, color: 'Chestnut', garment: '#5d4531', reason: 'More formal' },
          { brand: 'New Balance', name: '1906', price: 115, color: 'Grey', garment: '#8f8d88', reason: 'Sportier' }
        ]
      }
    ]
  }
];

const LOAD_LINES = [
  'Considering your style',
  'Balancing the budget',
  'Matching silhouettes',
  'Finding the right shoes'
];

/* ---- 2. State ------------------------------------------------------------ */

const state = {
  view: 'cover',            // 'cover' | 'app'
  tab: 'home',              // 'home' | 'results' | 'saved' | 'profile'
  onboardingStep: 1,
  profile: {
    name: 'Thomas',
    height: '6’0"',
    topSize: 'M',
    waist: '30',
    inseam: '32',
    shoe: '10',
    budget: 300,
    styles: ['Minimal', 'Elevated casual'],
    priority: 'Best overall look',
    brands: ['COS', 'Uniqlo', 'New Balance']
  },
  sessions: [],             // { id, occasion, looks, at }
  activeSession: null,      // session id shown in Results
  saved: [],                // { id, occasion, at }
  ratings: {},              // lookId -> 'passed'
  photos: [],               // [dataURL, dataURL, dataURL]
  currentLookId: null,
  tryonReady: {},           // lookId -> true once a preview has been generated
  viewingTryon: false,
  swapProductId: null,
  loading: false
};

/* ---- 3. Helpers ----------------------------------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function lookById(id) {
  for (const session of state.sessions) {
    const hit = session.looks.find(look => look.id === id);
    if (hit) return hit;
  }
  return null;
}

function activeSession() {
  return state.sessions.find(s => s.id === state.activeSession) || null;
}

function lookTotal(look) {
  return look.products.reduce((sum, p) => sum + p.price, 0);
}

function freshLooks() {
  return JSON.parse(JSON.stringify(LOOKS));
}

function allLooks() {
  return state.sessions.flatMap(s => s.looks);
}

function dayLabel(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${state.profile.name}`;
}

function avatarHTML(top, pants, shoes) {
  // Spans (not divs) so the figure is valid markup inside <button> contexts too.
  return `
    <span class="avatar-head"></span><span class="avatar-neck"></span>
    <span class="avatar-top" style="--garment:${top}"></span>
    <span class="avatar-pants" style="--pants:${pants}"></span>
    <span class="avatar-shoe left" style="--shoe:${shoes}"></span>
    <span class="avatar-shoe right" style="--shoe:${shoes}"></span>`;
}

function figureColors(look) {
  const by = slot => look.products.find(p => p.slot === slot);
  return { top: by('top').garment, pants: by('pants').garment, shoes: by('shoes').garment };
}

function sceneStyle(look) {
  return `--scene-a:${look.scene.a};--scene-b:${look.scene.b}`;
}

function setFigureVars(avatarEl, look) {
  const c = figureColors(look);
  avatarEl.style.setProperty('--garment', c.top);
  avatarEl.style.setProperty('--pants', c.pants);
  avatarEl.style.setProperty('--shoe', c.shoes);
}

function budgetNote(total) {
  return total <= state.profile.budget
    ? 'It sits inside your usual budget.'
    : `It runs a little over your usual $${state.profile.budget} — chosen for the occasion.`;
}

function styleLine(styles) {
  const has = (...names) => names.some(n => styles.includes(n));
  const calm = has('Minimal', 'Classic', 'Elevated casual', 'Formal');
  const edge = has('Streetwear', 'Rugged', 'Bold');
  const fun = has('Playful');
  if (calm && edge) return 'Clean lines with a relaxed edge.';
  if (edge && fun) return 'Confident color, easy shapes.';
  if (calm) return 'Lean, neutral, quietly structured.';
  if (edge) return 'Honest materials, easy confidence.';
  if (fun) return 'Open to color and pattern.';
  return 'Still learning your direction.';
}

/* ---- 4. View + tab plumbing ------------------------------------------------ */

function setView(view) {
  state.view = view;
  $('#coverView').classList.toggle('is-active', view === 'cover');
  $('#appView').classList.toggle('is-active', view === 'app');
  $('#appView').setAttribute('aria-hidden', view === 'app' ? 'false' : 'true');
  window.scrollTo({ top: 0 });
}

function setTab(tab) {
  state.tab = tab;
  $$('.nav-link').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    if (btn.classList.contains('side-link')) btn.classList.toggle('active', active);
  });
  $$('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });
  if (tab === 'saved') renderSaved();
  if (tab === 'profile') renderProfile();
  if (tab === 'home') { renderRecent(); renderSaved(); }
  closeLook();
  closeSwap();
  window.scrollTo({ top: 0 });
}

/* ---- 5. Renderers ------------------------------------------------------------ */

function renderGreeting() {
  $('#greetingLine').textContent = greeting();
}

function renderSessionResults(session) {
  state.activeSession = session.id;
  $('#resultsTitle').textContent = `“${session.occasion}”`;
  $('#looksGrid').innerHTML = session.looks.map(lookCardHTML).join('');
}

function lookCardHTML(look) {
  const saved = state.saved.some(entry => entry.id === look.id);
  const total = lookTotal(look);
  const passed = state.ratings[look.id] === 'passed';
  const swatches = look.products
    .map(p => `<span class="swatch-mini" style="background:${p.garment}"></span>`)
    .join('');
  return `
    <article class="look-card ${passed ? 'dismissed' : ''}" data-look-card="${look.id}">
      <div class="look-visual look-scene" data-open-look="${look.id}" style="${sceneStyle(look)}">
        <span class="vibe-pill">${look.vibe}</span>
        <button class="save-card ${saved ? 'saved' : ''}" data-save="${look.id}"
                aria-label="${saved ? 'Remove from saved' : 'Save'} ${look.title}">${saved ? '♥' : '♡'}</button>
        <div class="avatar">${avatarHTML(
          figureColors(look).top, figureColors(look).pants, figureColors(look).shoes)}</div>
      </div>
      <div class="look-body">
        <p class="eyebrow">Look ${look.number}</p>
        <h4 class="look-title">${look.title}</h4>
        <p class="look-desc">${look.description}</p>
        <div class="item-row">
          <span class="item-swatches">${swatches}</span>
          <span class="item-count">${look.products.length} pieces · ${look.products.map(p => p.brand).join(', ')}</span>
        </div>
        ${passed ? '<span class="passed-tag">Passed — FORM will adjust</span>' : ''}
      </div>
      <div class="look-foot">
        <span class="look-total">$${total}<span>total</span></span>
        <div class="look-actions">
          <button class="btn btn-ghost" data-open-look="${look.id}">View look</button>
          <button class="btn btn-dark" data-tryon="${look.id}">Try on</button>
          <button class="btn btn-ghost btn-heart" data-save="${look.id}" aria-label="Save ${look.title}">${saved ? '♥' : '♡'}</button>
        </div>
      </div>
    </article>`;
}

function renderRecent() {
  const grid = $('#recentGrid');
  const empty = $('#recentEmpty');
  grid.innerHTML = state.sessions.map(session => {
    const first = session.looks[0];
    return `
      <button class="mini-card" data-open-session="${session.id}">
        <span class="mini-visual look-scene" style="${sceneStyle(first)}">
          <span class="avatar">${avatarHTML(
            figureColors(first).top, figureColors(first).pants, figureColors(first).shoes)}</span>
        </span>
        <span class="mini-body">
          <span class="mini-title">“${escapeHTML(truncate(session.occasion, 42))}”</span>
          <span class="mini-meta">${session.looks.length} looks · ${dayLabel(session.at)}</span>
        </span>
      </button>`;
  }).join('');
  empty.classList.toggle('show', state.sessions.length === 0);
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function savedLooks() {
  return state.saved
    .map(entry => ({ entry, look: lookById(entry.id) }))
    .filter(item => item.look);
}

function savedCardHTML({ entry, look }) {
  const total = lookTotal(look);
  return `
    <article class="look-card">
      <div class="look-visual look-scene" data-open-look="${look.id}" style="${sceneStyle(look)}">
        <span class="vibe-pill">${escapeHTML(truncate(entry.occasion || 'Saved look', 30))}</span>
        <div class="avatar">${avatarHTML(
          figureColors(look).top, figureColors(look).pants, figureColors(look).shoes)}</div>
      </div>
      <div class="look-body">
        <p class="eyebrow">Look ${look.number}</p>
        <h4 class="look-title">${look.title}</h4>
        <p class="look-desc">${look.description}</p>
        <p class="saved-meta">$${total} total · Saved ${dayLabel(entry.at)}</p>
      </div>
      <div class="saved-actions">
        <button data-open-look="${look.id}">Open</button>
        <button data-tryon="${look.id}">Try on</button>
        <button class="danger" data-unsave="${look.id}">Remove</button>
      </div>
    </article>`;
}

function escapeHTML(text) {
  return text.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function renderSaved() {
  const items = savedLooks();
  $('#savedGrid').innerHTML = items.map(savedCardHTML).join('');
  $('#savedEmpty').classList.toggle('show', items.length === 0);
  const strip = $('#savedStrip');
  if (strip) {
    strip.innerHTML = items.slice(0, 3).map(({ look }) => `
      <button class="mini-card" data-open-look="${look.id}">
        <span class="mini-visual look-scene" style="${sceneStyle(look)}">
          <span class="avatar">${avatarHTML(
            figureColors(look).top, figureColors(look).pants, figureColors(look).shoes)}</span>
        </span>
        <span class="mini-body">
          <span class="mini-title">${look.title}</span>
          <span class="mini-meta">$${lookTotal(look)} total</span>
        </span>
      </button>`).join('');
    $('#savedStripEmpty').classList.toggle('show', items.length === 0);
  }
}

function renderProfile() {
  const p = state.profile;
  $('#sidebarName').textContent = p.name;
  $('#userInitial').textContent = p.name.charAt(0).toUpperCase();
  $('#profileStyles').innerHTML = p.styles.map(s => `<span>${escapeHTML(s)}</span>`).join('')
    || '<span>Not set yet</span>';
  $('#styleLine').textContent = styleLine(p.styles);
  $('#prefBudget').textContent = `$${p.budget}`;
  $('#prefPriority').textContent = p.priority;
  $('#brandList').innerHTML = p.brands.map(b => `<span>${escapeHTML(b)}</span>`).join('');
  $('#fitList').innerHTML = [
    ['Height', p.height], ['Top', p.topSize], ['Waist', p.waist],
    ['Inseam', p.inseam], ['Shoe', p.shoe]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(String(v))}</dd></div>`).join('');

  const wall = $('#photoWall');
  const slots = ['Front', 'Side', 'Light'];
  wall.innerHTML = slots.map((label, i) => state.photos[i]
    ? `<span class="ph filled"><img src="${state.photos[i]}" alt="${label} reference photo"></span>`
    : `<span class="ph">${label}</span>`).join('');

  const passedCount = Object.keys(state.ratings).length;
  const paletteLean = savedPaletteLean();
  $('#learnedList').innerHTML = [
    ['Looks saved', String(state.saved.length)],
    ['Directions passed', String(passedCount)],
    ['Palette leaning', paletteLean],
    ['Usual spend', `Under $${p.budget} per look`],
    ['Last styled', state.sessions.length ? truncate(state.sessions[0].occasion, 34) : '—']
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHTML(v)}</dd></div>`).join('');
}

function savedPaletteLean() {
  const colors = savedLooks().map(({ look }) => look.products.find(p => p.slot === 'top')?.color);
  const clean = colors.filter(Boolean);
  if (!clean.length) return 'Neutral (default)';
  const counts = {};
  clean.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return winner;
}

/* ---- 6. Look detail ------------------------------------------------------------ */

function openLook(id, { autoTryon = false } = {}) {
  const look = lookById(id);
  if (!look) return;
  state.currentLookId = id;
  state.viewingTryon = false;

  $('#modalEyebrow').textContent = `Look ${look.number}`;
  $('#modalTitle').textContent = look.title;
  $('#modalDescription').textContent = look.description;
  $('#modalWhy').textContent = `${look.why} ${budgetNote(lookTotal(look))}`;
  $('#modalTotal').textContent = `$${lookTotal(look)}`;
  $('#modalSave').textContent = state.saved.some(e => e.id === id) ? '♥ Saved' : 'Save look';

  const scene = $('#lookScene');
  scene.style.cssText = sceneStyle(look);
  const avatar = $('#modalAvatar');
  avatar.classList.remove('tryon');
  setFigureVars(avatar, look);

  applyLookView('original');
  renderProductRows(look);

  const ready = Boolean(state.tryonReady[id]);
  $('#viewToggle').hidden = !ready;
  $('#tryonActions').hidden = !ready;
  $('#tryOnButton').innerHTML = ready ? 'See try-on again' : 'See it on me';

  $('#lookModal').classList.add('open');
  $('#lookModal').setAttribute('aria-hidden', 'false');
  const card = $('.modal-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';
  $('#closeLook').focus();

  if (autoTryon) startTryOn();
}

function closeLook() {
  const modal = $('#lookModal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  state.viewingTryon = false;
}

function applyLookView(view) {
  const tryon = view === 'tryon';
  state.viewingTryon = tryon;
  const scene = $('#lookScene');
  const avatar = $('#modalAvatar');
  scene.classList.toggle('is-tryon', tryon);
  avatar.classList.toggle('tryon', tryon);
  $('.tryon-tag', scene).hidden = !tryon;
  $$('#viewToggle button').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === view));
  $('#visualCaption').textContent = tryon
    ? 'Try-on preview · simulated fit'
    : 'Original · styling as built';
}

function productRowHTML(product) {
  const swatches = product.palette.map((hex, i) => `
    <button class="swatch ${product.color === product.paletteNames[i] ? 'active' : ''}"
            style="--c:${hex}" data-swatch="${product.id}:${i}"
            aria-label="${product.paletteNames[i]}"></button>`).join('');
  return `
    <article class="product-row" data-product-row="${product.id}">
      <span class="product-thumb" style="--product-color:${product.garment}"></span>
      <div class="product-meta">
        <b>${escapeHTML(product.brand)}</b>
        <span>${escapeHTML(product.name)} · <span data-color-label="${product.id}">${escapeHTML(product.color)}</span> · ${escapeHTML(product.size)}</span>
        <div class="product-cta">
          <button data-swap="${product.id}">Swap</button>
          <button data-color="${product.id}">Color</button>
          <button data-details="${product.id}">Details</button>
        </div>
      </div>
      <span class="product-price" data-price="${product.id}">$${product.price}</span>
      <div class="product-extra">
        <div class="palette-row" data-palette="${product.id}">
          ${swatches}
          <span class="swatch-name" data-swatch-name="${product.id}">${escapeHTML(product.color)}</span>
          <span class="palette-note">Instant preview</span>
        </div>
        <p class="product-details" data-details-text="${product.id}">${escapeHTML(product.details)}</p>
      </div>
    </article>`;
}

function decorateProduct(look) {
  look.products.forEach(product => {
    const index = PALETTES[product.slot].indexOf(product.garment);
    if (index >= 0) {
      product.color = PALETTE_NAMES[product.slot][index];
    }
    product.palette = PALETTES[product.slot];
    product.paletteNames = PALETTE_NAMES[product.slot];
  });
}

function renderProductRows(look) {
  decorateProduct(look);
  $('#productList').innerHTML = look.products.map(productRowHTML).join('');
}

function refreshLookViews(look) {
  // Keep results grid, saved board, and modal totals in sync after a swap/color.
  $('#modalTotal').textContent = `$${lookTotal(look)}`;
  const session = activeSession();
  if (session) $('#looksGrid').innerHTML = session.looks.map(lookCardHTML).join('');
  if (state.saved.some(e => e.id === look.id)) renderSaved();
  setFigureVars($('#modalAvatar'), look);
  $('#modalSave').textContent = state.saved.some(e => e.id === look.id) ? '♥ Saved' : 'Save look';
}

/* ---- 7. Swap drawer -------------------------------------------------------------- */

function openSwap(productId) {
  const look = lookById(state.currentLookId);
  if (!look) return;
  const product = look.products.find(p => p.id === productId);
  if (!product) return;
  state.swapProductId = productId;

  const slotLabel = { top: 'top layer', pants: 'trouser', shoes: 'shoe' }[product.slot];
  $('#swapTitle').textContent = `Swap your ${slotLabel}`;

  $('#swapList').innerHTML = product.alternatives.map((alt, i) => `
    <button class="alt-row" data-alt="${productId}:${i}">
      <span class="alt-thumb" style="--product-color:${alt.garment}"></span>
      <span class="alt-meta">
        <b>${escapeHTML(alt.brand)}</b>
        <span>${escapeHTML(alt.name)} · ${escapeHTML(alt.color)}</span>
        <span class="alt-reason">${escapeHTML(alt.reason)}</span>
      </span>
      <span class="alt-price">$${alt.price}</span>
    </button>`).join('');

  $('#swapDrawer').classList.add('open');
  $('#swapDrawer').setAttribute('aria-hidden', 'false');
}

function closeSwap() {
  const drawer = $('#swapDrawer');
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

function applyAlternative(key) {
  const [productId, index] = key.split(':');
  const look = lookById(state.currentLookId);
  const product = look?.products.find(p => p.id === productId);
  const alt = product?.alternatives[Number(index)];
  if (!look || !product || !alt) return;

  Object.assign(product, {
    brand: alt.brand, name: alt.name, price: alt.price,
    color: alt.color, garment: alt.garment,
    details: `${alt.brand} ${alt.name} — swapped into this look in the demo.`
  });
  delete product.palette;
  delete product.paletteNames;
  decorateProduct(look);

  renderProductRows(look);
  refreshLookViews(look);
  closeSwap();
  toast(`Swapped in ${alt.name} — total $${lookTotal(look)}`);
}

function applySwatch(key) {
  const [productId, index] = key.split(':');
  const look = lookById(state.currentLookId);
  const product = look?.products.find(p => p.id === productId);
  if (!look || !product) return;

  product.garment = product.palette[Number(index)];
  product.color = product.paletteNames[Number(index)];

  const row = $(`[data-product-row="${productId}"]`);
  if (row) {
    $('.product-thumb', row).style.setProperty('--product-color', product.garment);
    $(`[data-color-label="${productId}"]`).textContent = product.color;
    $(`[data-swatch-name="${productId}"]`).textContent = product.color;
    $$('.swatch', row).forEach((btn, i) =>
      btn.classList.toggle('active', i === Number(index)));
  }
  setFigureVars($('#modalAvatar'), look);
  const session = activeSession();
  if (session) $('#looksGrid').innerHTML = session.looks.map(lookCardHTML).join('');
}

/* ---- 8. Try-on --------------------------------------------------------------------- */

function startTryOn() {
  const id = state.currentLookId;
  if (!id || state.loading) return;
  const shimmer = $('#tryonShimmer');
  const button = $('#tryOnButton');
  button.disabled = true;
  shimmer.classList.remove('run');
  void shimmer.offsetWidth;
  shimmer.classList.add('run');

  setTimeout(() => {
    shimmer.classList.remove('run');
    button.disabled = false;
    state.tryonReady[id] = true;
    $('#viewToggle').hidden = false;
    $('#tryonActions').hidden = false;
    button.innerHTML = 'See try-on again';
    applyLookView('tryon');
  }, 1400);
}

/* ---- 9. Home → loading → results ------------------------------------------------------ */

function buildLooks() {
  if (state.loading) return;
  const input = $('#occasionInput');
  const occasion = input.value.trim() || 'Your occasion';
  const button = $('#buildLooks');
  state.loading = true;
  button.disabled = true;
  button.textContent = 'Styling…';

  const overlay = $('#loadingOverlay');
  const line = $('#loadingLine');
  const fill = $('#loadingBarFill');
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  line.textContent = LOAD_LINES[0];
  fill.style.width = '0';
  requestAnimationFrame(() => { fill.style.width = '100%'; });

  let step = 0;
  const rotate = setInterval(() => {
    step += 1;
    if (step >= LOAD_LINES.length) return;
    line.classList.add('swap');
    setTimeout(() => {
      line.textContent = LOAD_LINES[step];
      line.classList.remove('swap');
    }, 220);
  }, 380);

  setTimeout(() => {
    clearInterval(rotate);
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    const session = {
      id: `session-${Date.now()}`,
      occasion,
      looks: freshLooks(),
      at: Date.now()
    };
    session.looks.forEach(decorateProduct);
    state.sessions.unshift(session);
    button.disabled = false;
    button.textContent = 'Style me';
    state.loading = false;
    renderRecent();
    renderSessionResults(session);
    setTab('results');
  }, 1550);
}

/* ---- 10. Save / rate ------------------------------------------------------------------ */

function toggleSave(id) {
  const entry = state.saved.find(e => e.id === id);
  const session = state.sessions.find(s => s.looks.some(l => l.id === id));
  if (entry) {
    state.saved = state.saved.filter(e => e.id !== id);
  } else {
    state.saved.unshift({ id, occasion: session?.occasion || '', at: Date.now() });
  }
  const nowSaved = !entry;
  renderSaved();
  renderProfile();
  if (state.tab === 'results' && activeSession()) {
    $('#looksGrid').innerHTML = activeSession().looks.map(lookCardHTML).join('');
  }
  if (state.currentLookId === id && $('#lookModal').classList.contains('open')) {
    $('#modalSave').textContent = nowSaved ? '♥ Saved' : 'Save look';
  }
  toast(nowSaved ? 'Saved — added to your board' : 'Removed from Saved');
}

function passOnLook(id) {
  state.ratings[id] = 'passed';
  closeLook();
  if (state.tab === 'results' && activeSession()) {
    $('#looksGrid').innerHTML = activeSession().looks.map(lookCardHTML).join('');
  }
  renderProfile();
  toast('Got it — FORM will steer away from this direction');
}

/* ---- 11. Onboarding ---------------------------------------------------------------------- */

function openOnboarding() {
  state.onboardingStep = 1;
  updateOnboarding();
  // Reflect the current profile so setup can be revisited, not just done once.
  $$('#stylePicker button').forEach(button =>
    button.classList.toggle('selected', state.profile.styles.includes(button.dataset.style)));
  $('#nameInput').value = state.profile.name === 'You' ? '' : state.profile.name;
  $('#heightInput').value = state.profile.height === '—' ? '' : state.profile.height;
  $('#budgetRange').value = state.profile.budget;
  $('#budgetValue').textContent = `$${state.profile.budget}`;
  const modal = $('#onboarding');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  const done = $('#onboardDone');
  done.classList.remove('show');
  done.setAttribute('aria-hidden', 'true');
}

function closeOnboarding() {
  const modal = $('#onboarding');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function updateOnboarding() {
  const step = state.onboardingStep;
  $$('.onboarding-step').forEach(panel =>
    panel.classList.toggle('active', Number(panel.dataset.step) === step));
  $('#progressLabel').textContent = `0${step} / 04`;
  $('#progressBar').style.width = `${step * 25}%`;
  $('#onboardBack').style.visibility = step === 1 ? 'hidden' : 'visible';
  $('#onboardNext').innerHTML = step === 4
    ? 'Finish setup <span>↗</span>'
    : 'Continue <span>→</span>';
}

function completeOnboarding() {
  const p = state.profile;
  p.name = $('#nameInput').value.trim() || 'You';
  p.height = $('#heightInput').value.trim() || '—';
  p.topSize = $('#topSize').value;
  p.waist = $('#waistSize').value;
  p.inseam = $('#inseamSize').value;
  p.shoe = $('#shoeSize').value;
  p.budget = Number($('#budgetRange').value);
  const pickedStyles = $$('#stylePicker button.selected').map(btn => btn.dataset.style);
  if (pickedStyles.length) p.styles = pickedStyles;
  p.priority = $('#priorityPicker button.selected')?.dataset.priority || p.priority;
  const pickedBrands = $('#brandInput').value.split(',').map(b => b.trim()).filter(Boolean);
  if (pickedBrands.length) p.brands = pickedBrands;

  const done = $('#onboardDone');
  done.classList.add('show');
  done.setAttribute('aria-hidden', 'false');

  setTimeout(() => {
    closeOnboarding();
    renderProfile();
    renderGreeting();
    setView('app');
    setTab('home');
    toast('Your FORM is ready — describe an occasion to begin');
  }, 1400);
}

/* ---- 12. Photos ---------------------------------------------------------------------------- */

function bindPhotoSlot(input, index) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const label = input.closest('.upload-slot');
    const img = $('.slot-img', label);
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      label.classList.add('has-image');
      state.photos[index] = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---- 13. Events ------------------------------------------------------------------------------ */

function bindEvents() {
  // Global delegation: one listener covers all data-attribute actions.
  document.addEventListener('click', event => {
    const target = event.target;

    const save = target.closest('[data-save]');
    if (save) { event.stopPropagation(); toggleSave(save.dataset.save); return; }

    const unsave = target.closest('[data-unsave]');
    if (unsave) { event.stopPropagation(); toggleSave(unsave.dataset.unsave); return; }

    const tryon = target.closest('[data-tryon]');
    if (tryon) { openLook(tryon.dataset.tryon, { autoTryon: true }); return; }

    const openSession = target.closest('[data-open-session]');
    if (openSession) {
      const session = state.sessions.find(s => s.id === openSession.dataset.openSession);
      if (session) { renderSessionResults(session); setTab('results'); }
      return;
    }

    const openLookTarget = target.closest('[data-open-look]');
    if (openLookTarget) { openLook(openLookTarget.dataset.openLook); return; }

    const swap = target.closest('[data-swap]');
    if (swap) { openSwap(swap.dataset.swap); return; }

    const alt = target.closest('[data-alt]');
    if (alt) { applyAlternative(alt.dataset.alt); return; }

    const swatch = target.closest('[data-swatch]');
    if (swatch) { applySwatch(swatch.dataset.swatch); return; }

    const colorBtn = target.closest('[data-color]');
    if (colorBtn) {
      const row = $(`[data-palette="${colorBtn.dataset.color}"]`);
      row?.classList.toggle('open');
      colorBtn.classList.toggle('picked', row?.classList.contains('open'));
      return;
    }

    const detailsBtn = target.closest('[data-details]');
    if (detailsBtn) {
      const text = $(`[data-details-text="${detailsBtn.dataset.details}"]`);
      text?.classList.toggle('open');
      detailsBtn.classList.toggle('picked', text?.classList.contains('open'));
      return;
    }

    const viewBtn = target.closest('#viewToggle button');
    if (viewBtn) { applyLookView(viewBtn.dataset.view); return; }

    const route = target.closest('[data-route="cover"]');
    if (route) { event.preventDefault(); setView('cover'); return; }

    const action = target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'onboard') openOnboarding();
      if (action.dataset.action === 'demo') { setView('app'); setTab('home'); }
      return;
    }

    const tabLink = target.closest('.nav-link[data-tab]');
    if (tabLink) { setTab(tabLink.dataset.tab); return; }

    if (target.closest('[data-close-look]')) { closeLook(); return; }
    if (target.closest('[data-close-swap]')) { closeSwap(); return; }
    if (target.closest('[data-close-onboarding]')) { closeOnboarding(); return; }
  });

  // Home
  $('#buildLooks').addEventListener('click', buildLooks);
  $$('#chipRow button').forEach(chip => chip.addEventListener('click', () => {
    $('#occasionInput').value = chip.dataset.prompt;
    $('#occasionInput').focus();
  }));
  $('#profileShortcut').addEventListener('click', () => setTab('profile'));

  // Look modal
  $('#closeLook').addEventListener('click', closeLook);
  $('#modalSave').addEventListener('click', () => {
    if (state.currentLookId) toggleSave(state.currentLookId);
  });
  $('#tryOnButton').addEventListener('click', startTryOn);
  $('#dismissLook').addEventListener('click', () => {
    if (state.currentLookId) passOnLook(state.currentLookId);
  });
  $('#tryAnother').addEventListener('click', () => {
    const session = state.sessions.find(s => s.looks.some(l => l.id === state.currentLookId));
    if (!session) return;
    const i = session.looks.findIndex(l => l.id === state.currentLookId);
    const next = session.looks[(i + 1) % session.looks.length];
    openLook(next.id);
  });
  $('#changeItem').addEventListener('click', () => {
    const look = lookById(state.currentLookId);
    if (look) openSwap(look.products[0].id);
  });

  // Swap drawer scrim handled by delegation; nothing extra needed here.

  // Onboarding
  $('#onboardNext').addEventListener('click', () => {
    if (state.onboardingStep < 4) {
      state.onboardingStep += 1;
      updateOnboarding();
    } else {
      completeOnboarding();
    }
  });
  $('#onboardBack').addEventListener('click', () => {
    if (state.onboardingStep > 1) {
      state.onboardingStep -= 1;
      updateOnboarding();
    }
  });

  $$('#stylePicker button').forEach(button => button.addEventListener('click', () => {
    button.classList.toggle('selected');
  }));

  $$('#priorityPicker button').forEach(button => button.addEventListener('click', () => {
    $$('#priorityPicker button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
  }));

  $('#budgetRange').addEventListener('input', event => {
    $('#budgetValue').textContent = `$${event.target.value}`;
  });

  bindPhotoSlot($('#photoFront'), 0);
  bindPhotoSlot($('#photoSide'), 1);
  bindPhotoSlot($('#photoNatural'), 2);

  // Escape closes the topmost layer.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if ($('#swapDrawer').classList.contains('open')) closeSwap();
    else if ($('#lookModal').classList.contains('open')) closeLook();
    else if ($('#onboarding').classList.contains('open')) closeOnboarding();
  });
}

/* ---- 14. Init ---------------------------------------------------------------------------------- */

function decorateProductAll() {
  // Seed palettes onto the source data so first renders have names + swatches.
  LOOKS.forEach(decorateProduct);
}

decorateProductAll();
// The modal figure is static markup: inject the body once here; openLook()
// then just recolors it per look via CSS variables.
$('#modalAvatar').innerHTML = avatarHTML('#24262b', '#4c4a44', '#d9d2c6');
renderGreeting();
renderRecent();
renderSaved();
renderProfile();
bindEvents();
