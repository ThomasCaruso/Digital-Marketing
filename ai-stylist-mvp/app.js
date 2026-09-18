const state = {
  onboardingStep: 1,
  profile: {
    name: 'Thomas',
    height: `6'0"`,
    topSize: 'M',
    waist: '31',
    inseam: '32',
    shoe: '10',
    budget: 300,
    styles: ['Minimal', 'Elevated casual'],
    priority: 'Best overall look'
  },
  saved: new Set(),
  ratings: {},
  currentLookId: null,
  photos: []
};

const looks = [
  {
    id: 'look-01',
    title: 'Quiet confidence',
    match: 96,
    total: 286,
    description: 'Clean proportions, neutral layers, and enough structure to look deliberate without feeling overdressed.',
    topColor: '#202329',
    pantsColor: '#4c4a46',
    sceneA: '#b7b0a4',
    sceneB: '#e9e4db',
    products: [
      { brand: 'COS', name: 'Merino Zip Polo', price: 99, color: 'Charcoal', size: 'M' },
      { brand: 'Abercrombie', name: 'Tailored Straight Trouser', price: 90, color: 'Dark Taupe', size: '31×32' },
      { brand: 'Adidas', name: 'Samba OG', price: 97, color: 'White / Gum', size: '10' }
    ]
  },
  {
    id: 'look-02',
    title: 'Soft structure',
    match: 93,
    total: 318,
    description: 'A lighter palette with sharper trousers for a polished evening look that still feels relaxed.',
    topColor: '#d8d0c5',
    pantsColor: '#2f3031',
    sceneA: '#ccc3b7',
    sceneB: '#f1ede6',
    products: [
      { brand: 'Uniqlo U', name: 'Fine Gauge Knit', price: 59, color: 'Stone', size: 'M' },
      { brand: 'COS', name: 'Pleated Wool Trouser', price: 159, color: 'Black', size: '31' },
      { brand: 'New Balance', name: 'RC42', price: 100, color: 'Sea Salt', size: '10' }
    ]
  },
  {
    id: 'look-03',
    title: 'Night shift',
    match: 91,
    total: 344,
    description: 'Darker, slightly more directional, and built for dinner turning into a longer night out.',
    topColor: '#2b2b28',
    pantsColor: '#191a1a',
    sceneA: '#8d8982',
    sceneB: '#d6d2ca',
    products: [
      { brand: 'Zara', name: 'Textured Overshirt', price: 89, color: 'Black', size: 'M' },
      { brand: 'Aritzia Men', name: 'Relaxed Crease Pant', price: 145, color: 'Black', size: '31' },
      { brand: 'Veja', name: 'Campo Leather Sneaker', price: 110, color: 'Extra White', size: '10' }
    ]
  }
];

const colorways = ['#202329', '#d9d4ca', '#21362e', '#4b2328', '#2f3f56', '#8b8173'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function setView(view) {
  $('#landingView').classList.toggle('is-active', view === 'landing');
  $('#appView').classList.toggle('is-active', view === 'app');
  $('#siteHeader').style.display = view === 'landing' ? 'grid' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTab(tab) {
  $$('.side-link').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
  if (tab === 'saved') renderSaved();
  if (tab === 'profile') renderProfile();
}

function renderLooks() {
  $('#looksGrid').innerHTML = looks.map(look => `
    <article class="look-card" data-look-id="${look.id}">
      <button class="save-card" data-save="${look.id}" aria-label="Save ${look.title}">${state.saved.has(look.id) ? '♥' : '♡'}</button>
      <div class="look-image" data-open-look="${look.id}" style="--scene-a:${look.sceneA};--scene-b:${look.sceneB}">
        <span class="look-card-badge">${look.match}% MATCH</span>
        <div class="avatar">
          <div class="avatar-head"></div><div class="avatar-neck"></div>
          <div class="avatar-top" style="--garment:${look.topColor}"></div>
          <div class="avatar-pants" style="background:${look.pantsColor}"></div>
          <div class="avatar-shoe shoe-left"></div><div class="avatar-shoe shoe-right"></div>
        </div>
      </div>
      <div class="look-card-body">
        <div class="look-card-title"><h4>${look.title}</h4><b>$${look.total}</b></div>
        <p>${look.description}</p>
        <div class="piece-row">${look.products.map((_, i) => `<span class="piece-dot" style="opacity:${1 - i * .18}"></span>`).join('')}</div>
      </div>
    </article>
  `).join('');
}

function renderSaved() {
  const savedLooks = looks.filter(look => state.saved.has(look.id));
  $('#savedEmpty').classList.toggle('show', savedLooks.length === 0);
  $('#savedGrid').innerHTML = savedLooks.map(look => `
    <article class="look-card">
      <button class="save-card" data-save="${look.id}">♥</button>
      <div class="look-image" data-open-look="${look.id}" style="--scene-a:${look.sceneA};--scene-b:${look.sceneB}">
        <span class="look-card-badge">${look.match}% MATCH</span>
        <div class="avatar">
          <div class="avatar-head"></div><div class="avatar-neck"></div>
          <div class="avatar-top" style="--garment:${look.topColor}"></div>
          <div class="avatar-pants" style="background:${look.pantsColor}"></div>
          <div class="avatar-shoe shoe-left"></div><div class="avatar-shoe shoe-right"></div>
        </div>
      </div>
      <div class="look-card-body"><div class="look-card-title"><h4>${look.title}</h4><b>$${look.total}</b></div><p>${look.description}</p></div>
    </article>
  `).join('');
}

function openLook(id) {
  const look = looks.find(item => item.id === id);
  if (!look) return;
  state.currentLookId = id;
  $('#modalTitle').textContent = look.title;
  $('#modalDescription').textContent = look.description;
  $('#modalMatch').textContent = `${look.match}% MATCH`;
  $('#modalTotal').textContent = `$${look.total}`;
  $('#modalTop').style.setProperty('--garment', look.topColor);
  $('#modalPants').style.background = look.pantsColor;
  $('#modalSave').textContent = state.saved.has(id) ? '♥' : '♡';
  $('#productList').innerHTML = look.products.map(product => `
    <article class="product-row">
      <div class="product-thumb" style="--product-color:${product.color.toLowerCase().includes('black') ? '#2b2b29' : '#d3cdc4'}"></div>
      <div class="product-meta"><b>${product.brand}</b><span>${product.name}<br>${product.color} · ${product.size}</span></div>
      <div class="product-price"><b>$${product.price}</b><span>DEMO LINK ↗</span></div>
    </article>
  `).join('');
  $('#colorSwatches').innerHTML = colorways.map((color, index) => `<button aria-label="Color ${index + 1}" style="--color:${color}" data-color="${color}"></button>`).join('');
  $('#lookScene').style.background = `linear-gradient(145deg, ${look.sceneA}, ${look.sceneB})`;
  $('#lookModal').classList.add('open');
  $('#lookModal').setAttribute('aria-hidden', 'false');
}

function closeLook() {
  $('#lookModal').classList.remove('open');
  $('#lookModal').setAttribute('aria-hidden', 'true');
}

function toggleSave(id) {
  if (state.saved.has(id)) state.saved.delete(id); else state.saved.add(id);
  renderLooks();
  renderSaved();
  renderProfile();
  if (state.currentLookId === id) $('#modalSave').textContent = state.saved.has(id) ? '♥' : '♡';
  showToast(state.saved.has(id) ? 'Look saved' : 'Look removed');
}

function openOnboarding() {
  state.onboardingStep = 1;
  updateOnboarding();
  $('#onboarding').classList.add('open');
  $('#onboarding').setAttribute('aria-hidden', 'false');
}

function closeOnboarding() {
  $('#onboarding').classList.remove('open');
  $('#onboarding').setAttribute('aria-hidden', 'true');
}

function updateOnboarding() {
  const step = state.onboardingStep;
  $$('.onboarding-step').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.step) === step));
  $('#progressLabel').textContent = `0${step} / 04`;
  $('#progressBar').style.width = `${step * 25}%`;
  $('#onboardBack').style.visibility = step === 1 ? 'hidden' : 'visible';
  $('#onboardNext').innerHTML = step === 4 ? 'Enter FORM <span>↗</span>' : 'Continue <span>→</span>';
}

function completeOnboarding() {
  state.profile.name = $('#nameInput').value.trim() || 'Your profile';
  state.profile.height = $('#heightInput').value.trim() || '—';
  state.profile.topSize = $('#topSize').value;
  state.profile.waist = $('#waistSize').value;
  state.profile.inseam = $('#inseamSize').value;
  state.profile.shoe = $('#shoeSize').value;
  state.profile.budget = Number($('#budgetRange').value);
  closeOnboarding();
  renderProfile();
  setView('app');
  setTab('home');
  showToast('Profile created');
}

function renderProfile() {
  $('#sidebarName').textContent = state.profile.name;
  $('#profileName').textContent = `${state.profile.name}'s style model`;
  $('#profileStyles').innerHTML = state.profile.styles.map(style => `<span>${style}</span>`).join('');
  const fit = [
    ['Height', state.profile.height],
    ['Top', state.profile.topSize],
    ['Waist', state.profile.waist],
    ['Inseam', state.profile.inseam],
    ['Shoe', state.profile.shoe],
    ['Budget', `$${state.profile.budget}`]
  ];
  $('#fitList').innerHTML = fit.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#savedCount').textContent = state.saved.size;
  $('#ratedCount').textContent = Object.keys(state.ratings).length;
}

function buildLooks() {
  const input = $('#occasionInput');
  const value = input.value.trim() || 'Your occasion';
  const button = $('#buildLooks');
  button.disabled = true;
  button.textContent = 'Building…';
  $('#recommendationTitle').textContent = `Curating for “${value}”`;
  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = 'Build my looks <span>↗</span>';
    $('#recommendationTitle').textContent = 'Three looks, already filtered.';
    renderLooks();
    showToast('3 looks built from your demo profile');
  }, 650);
}

function setupPhotoPreview(input) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const label = input.closest('.upload-slot');
    const img = $('img', label);
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      label.classList.add('has-image');
      state.photos.push(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function bindEvents() {
  $$('[data-scroll]').forEach(button => button.addEventListener('click', () => {
    const target = $(button.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }));

  $$('[data-action="onboard"]').forEach(button => button.addEventListener('click', openOnboarding));
  $$('[data-action="demo"]').forEach(button => button.addEventListener('click', () => {
    setView('app');
    setTab('home');
  }));
  $$('[data-route="landing"]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    setView('landing');
  }));
  $$('[data-close-onboarding]').forEach(button => button.addEventListener('click', closeOnboarding));

  $('#onboardNext').addEventListener('click', () => {
    if (state.onboardingStep < 4) {
      state.onboardingStep += 1;
      updateOnboarding();
    } else completeOnboarding();
  });
  $('#onboardBack').addEventListener('click', () => {
    if (state.onboardingStep > 1) {
      state.onboardingStep -= 1;
      updateOnboarding();
    }
  });

  $$('#stylePicker button').forEach(button => button.addEventListener('click', () => {
    button.classList.toggle('selected');
    state.profile.styles = $$('#stylePicker button.selected').map(btn => btn.dataset.style);
  }));

  $$('#priorityPicker button').forEach(button => button.addEventListener('click', () => {
    $$('#priorityPicker button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    state.profile.priority = button.dataset.priority;
  }));

  $('#budgetRange').addEventListener('input', event => {
    $('#budgetValue').textContent = `$${event.target.value}`;
  });

  ['#photoFront', '#photoSide', '#photoNatural'].forEach(selector => setupPhotoPreview($(selector)));

  $$('.side-link').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
  $$('[data-tab-jump]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tabJump)));
  $('#profileShortcut').addEventListener('click', () => setTab('profile'));

  $$('.suggestion-row button').forEach(button => button.addEventListener('click', () => {
    $('#occasionInput').value = button.dataset.prompt;
    $('#occasionInput').focus();
  }));
  $('#buildLooks').addEventListener('click', buildLooks);

  document.addEventListener('click', event => {
    const openTarget = event.target.closest('[data-open-look]');
    if (openTarget) openLook(openTarget.dataset.openLook);

    const saveTarget = event.target.closest('[data-save]');
    if (saveTarget) {
      event.stopPropagation();
      toggleSave(saveTarget.dataset.save);
    }

    const colorTarget = event.target.closest('[data-color]');
    if (colorTarget) {
      $$('#colorSwatches button').forEach(btn => btn.classList.remove('active'));
      colorTarget.classList.add('active');
      $('#modalTop').style.setProperty('--garment', colorTarget.dataset.color);
      showToast('Color changed locally — no AI regeneration');
    }
  });

  $('#closeLook').addEventListener('click', closeLook);
  $('#lookModal').addEventListener('click', event => {
    if (event.target === $('#lookModal')) closeLook();
  });
  $('#modalSave').addEventListener('click', () => {
    if (state.currentLookId) toggleSave(state.currentLookId);
  });
  $('#tryOnButton').addEventListener('click', () => {
    const shimmer = $('#tryonShimmer');
    shimmer.classList.remove('run');
    void shimmer.offsetWidth;
    shimmer.classList.add('run');
    $('#tryOnButton').innerHTML = 'Preview generated <span>✓</span>';
    showToast('Simulated V1 try-on complete');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeLook();
      closeOnboarding();
    }
  });
}

renderLooks();
renderSaved();
renderProfile();
bindEvents();
