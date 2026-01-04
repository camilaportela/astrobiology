// --- DADOS ---

// Prova Prática
// - A capa (microscópio) permanece fixa no código.
// - Os cards do tipo "game" são carregados de um JSON editável (content/flashcards-pratica.json).

const PRACTICA_WELCOME_CARD = { id: 0, isWelcome: true, type: 'microscope', title: '', description: '' };

// Configuração do Resultado (balões das estrelas) — pode ser sobrescrita via JSON.
const __PRACTICA_RESULT_DEFAULT = {
  hint: 'Mova o robô para coletar a estrela.',
  celebrateMessage: 'Parabéns! Continue assim.',
  sadMessages: ['Fiquei triste, precisa estudar mais.', 'Acredito na sua capacidade.', 'Você consegue!'],
  anadixSpeech: 'Este robô veio de outra galáxia e está estudando plantas.<br>Ajude-o a coletar flores para levá-las ao seu planeta.'
};

// Estado atual (carregado do JSON; cai no default quando ausente)
window.__praticaResultConfig = window.__praticaResultConfig || { ...__PRACTICA_RESULT_DEFAULT };

// Fallback local (caso o JSON não carregue). Mantém o projeto funcionando mesmo sem servidor.
const __PRACTICA_GAMES_FALLBACK = [
  {
    img: 'https://i.imgur.com/k8D25Bs.jpeg',
    anadixSpeech: 'Olá! Sou <b>Anadix</b>. Guardiã do conhecimento.<br>Vamos praticar identificando estruturas.<br><br>Dica: clique nos pontos e associe ao nome correto.',
    references: [
      { id: 1, label: 'Xilema' },
      { id: 2, label: 'Floema' },
      { id: 3, label: 'Câmbio' }
    ],
    hotspots: [
      { id: 'h1', top: '48%', left: '52%', correctRefId: 1 },
      { id: 'h2', top: '50%', left: '66%', correctRefId: 2 },
      { id: 'h3', top: '58%', left: '49%', correctRefId: 3 }
    ]
  }
];

let flashcardsPratica = [PRACTICA_WELCOME_CARD];

function __normalizePraticaResultConfig(result) {
  const out = { ...__PRACTICA_RESULT_DEFAULT };
  if (!result || typeof result !== 'object') return out;

  // Permite desativar a dica definindo hint: "" no JSON
  if (Object.prototype.hasOwnProperty.call(result, 'hint') && typeof result.hint === 'string') {
    out.hint = result.hint;
  }
  if (typeof result.celebrateMessage === 'string' && result.celebrateMessage.trim()) out.celebrateMessage = result.celebrateMessage;
  if (typeof result.anadixSpeech === 'string' && result.anadixSpeech.trim()) out.anadixSpeech = result.anadixSpeech;
  if (Array.isArray(result.sadMessages)) {
    const list = result.sadMessages
      .filter(s => typeof s === 'string')
      .map(s => s.trim())
      .filter(Boolean);
    if (list.length) out.sadMessages = list;
  }
  return out;
}

function __extractPraticaContent(payload) {
  // Suporta 2 formatos:
  // 1) Array: [ {game}, {game} ... ] (legado)
  // 2) Objeto: { result: {...}, games: [ {game} ... ] }
  try {
    if (Array.isArray(payload)) {
      window.__praticaResultConfig = { ...__PRACTICA_RESULT_DEFAULT };
      return { games: payload };
    }

    if (payload && typeof payload === 'object') {
      const games = Array.isArray(payload.games) ? payload.games : [];
      window.__praticaResultConfig = __normalizePraticaResultConfig(payload.result);
      return { games };
    }
  } catch (e) {}

  window.__praticaResultConfig = { ...__PRACTICA_RESULT_DEFAULT };
  return { games: [] };
}

function __normalizePraticaGames(games) {
  if (!Array.isArray(games)) return [];

  const normalized = games.map((g, idx) => {
    const references = Array.isArray(g && g.references)
      ? g.references
        .filter(r => r && (typeof r.id === 'number' || typeof r.id === 'string') && typeof r.label === 'string')
        .map(r => ({ id: r.id, label: r.label }))
      : [];

    const refIds = new Set(references.map(r => r.id));

    const hotspots = Array.isArray(g && g.hotspots)
      ? g.hotspots
        .filter(h => h && (typeof h.top === 'string') && (typeof h.left === 'string'))
        .map((h, hIdx) => {
          const id = (typeof h.id === 'string' && h.id.trim()) ? h.id : ('h' + (hIdx + 1));
          const correctRefId = (h.correctRefId !== undefined) ? h.correctRefId : null;
          if (correctRefId !== null && !refIds.has(correctRefId)) {
            try { console.warn('[Prática JSON] hotspot correctRefId não existe em references:', { cardIndex: idx, hotspotId: id, correctRefId }); } catch (e) {}
          }
          return { id, top: h.top, left: h.left, correctRefId };
        })
      : [];

    return {
      id: (typeof g && typeof g.id === 'number') ? g.id : (idx + 1),
      type: 'game',
      img: (g && typeof g.img === 'string') ? g.img : '',
      anadixSpeech: (g && typeof g.anadixSpeech === 'string') ? g.anadixSpeech : '',
      references,
      hotspots
    };
  });

  // Garante IDs únicos e positivos nos games
  const used = new Set();
  for (let i = 0; i < normalized.length; i++) {
    let id = normalized[i].id;
    if (typeof id !== 'number' || !isFinite(id) || id <= 0) id = i + 1;
    while (used.has(id) || id === 0) id++;
    used.add(id);
    normalized[i].id = id;
  }

  return normalized;
}

function __rebuildFlashcardsPraticaFromGames(games) {
  const normalizedGames = __normalizePraticaGames(games);
  flashcardsPratica = [PRACTICA_WELCOME_CARD, ...normalizedGames];
}

function __bootPraticaContent() {
  // Precisa de servidor (http://localhost) para o fetch funcionar em todos os browsers.
  const url = 'content/flashcards-pratica.json';
  try {
    __rebuildFlashcardsPraticaFromGames(__PRACTICA_GAMES_FALLBACK);
  } catch (e) {
    flashcardsPratica = [PRACTICA_WELCOME_CARD];
  }

  try {
    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((payload) => {
        const extracted = __extractPraticaContent(payload);
        __rebuildFlashcardsPraticaFromGames(extracted.games);
        try {
          dlog('Prática: JSON carregado', {
            count: Array.isArray(extracted.games) ? extracted.games.length : 0,
            hasResultConfig: !!(payload && typeof payload === 'object' && !Array.isArray(payload) && payload.result)
          });
        } catch (e) {}
      })
      .catch((err) => {
        try { console.warn('[Prática] Não foi possível carregar', url, '- usando fallback.', err); } catch (e) {}
      });
  } catch (e) {
    // Mantém fallback
  }
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __bootPraticaContent);
  } else {
    __bootPraticaContent();
  }
} catch (e) {}












// --- LÓGICA ---

// Debug flag: set to true to enable console logs
window.DEBUG = window.DEBUG === undefined ? false : window.DEBUG;

function dlog(...args) {
  try { if (window.DEBUG) console.log(...args); } catch (e) {}
}

// Parallax global (mobile + desktop)
// - Atualiza CSS vars para Kodama (shift) e Anadix (parallax)
// - Usa Pointer Events (e touchmove fallback) sem bloquear scroll
function initGlobalParallaxVars() {
  const prefersReduced = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();
  if (prefersReduced) return;

  const root = document.documentElement;

  const state = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    w: Math.max(1, window.innerWidth || 1),
    h: Math.max(1, window.innerHeight || 1)
  };

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  function setTargetFromClientXY(cx, cy) {
    const nx = clamp01(cx / state.w) - 0.5;
    const ny = clamp01(cy / state.h) - 0.5;
    // ranges (px): leves para não desorganizar layout
    state.targetX = nx * 18;
    state.targetY = ny * 12;
  }

  function onMove(ev) {
    if (!ev) return;
    if (ev.touches && ev.touches[0]) {
      setTargetFromClientXY(ev.touches[0].clientX, ev.touches[0].clientY);
      return;
    }
    if (ev.targetTouches && ev.targetTouches[0]) {
      setTargetFromClientXY(ev.targetTouches[0].clientX, ev.targetTouches[0].clientY);
      return;
    }
    if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
      setTargetFromClientXY(ev.clientX, ev.clientY);
    }
  }

  function onResize() {
    state.w = Math.max(1, window.innerWidth || 1);
    state.h = Math.max(1, window.innerHeight || 1);
  }

  window.addEventListener('resize', onResize, { passive: true });
  // Em mobile, muitas vezes o usuário “encosta e arrasta”; garantir resposta já no toque inicial.
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('touchstart', onMove, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });

  // Primeira pintura: central
  setTargetFromClientXY(state.w * 0.5, state.h * 0.5);

  function tick() {
    state.x += (state.targetX - state.x) * 0.08;
    state.y += (state.targetY - state.y) * 0.08;

    // Anadix mais evidente
    root.style.setProperty('--anadix-parallax-x', `${state.x.toFixed(2)}px`);
    root.style.setProperty('--anadix-parallax-y', `${state.y.toFixed(2)}px`);

    // Kodama mais sutil
    root.style.setProperty('--kodama-shift-x', `${(state.x * 0.55).toFixed(2)}px`);
    root.style.setProperty('--kodama-shift-y', `${(state.y * 0.40).toFixed(2)}px`);

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalParallaxVars);
  } else {
    initGlobalParallaxVars();
  }
} catch (e) {}

// Fundo interativo (canvas) — parallax + vagalumes (original, sem assets externos)
function initInteractiveBackground() {
  const canvas = document.getElementById('interactive-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const prefersReduced = (() => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();

  let rafId = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;

  const pointer = { x: 0.5, y: 0.5 };
  const parallax = { x: 0, y: 0 };

  const rnd = (min, max) => min + Math.random() * (max - min);

  const fireflies = [];
  const fireflyCount = prefersReduced ? 0 : 46;
  for (let i = 0; i < fireflyCount; i++) {
    fireflies.push({
      x: Math.random(),
      y: Math.random(),
      vx: rnd(-0.018, 0.018),
      vy: rnd(-0.012, 0.012),
      r: rnd(0.7, 1.9),
      phase: rnd(0, Math.PI * 2),
      speed: rnd(0.6, 1.4)
    });
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.max(1, Math.floor(window.innerWidth));
    h = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground() {
    // Base gradient (noite)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#03040a');
    g.addColorStop(0.55, '#07111a');
    g.addColorStop(1, '#020308');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w, h) * 0.2, w * 0.5, h * 0.55, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawParallaxLayers(t) {
    // Parallax suave baseado no ponteiro
    const targetX = (pointer.x - 0.5) * 22;
    const targetY = (pointer.y - 0.5) * 14;
    parallax.x += (targetX - parallax.x) * 0.06;
    parallax.y += (targetY - parallax.y) * 0.06;

    // Camadas de silhuetas (formas abstratas) — aparência de floresta sem copiar arte
    const layers = [
      { y: 0.72, a: 0.20, c: 'rgba(8,22,24,0.85)', px: 0.30 },
      { y: 0.78, a: 0.26, c: 'rgba(6,18,20,0.92)', px: 0.55 },
      { y: 0.84, a: 0.32, c: 'rgba(4,12,14,0.96)', px: 0.85 }
    ];

    for (const L of layers) {
      const ox = -parallax.x * L.px;
      const oy = -parallax.y * (L.px * 0.7);
      const baseY = h * L.y + oy;
      const amp = h * L.a;

      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(-40 + ox, h + 40);
      ctx.lineTo(-40 + ox, baseY);

      const steps = 7;
      for (let i = 0; i <= steps; i++) {
        const x = (w / steps) * i + ox;
        const n = Math.sin((i * 1.7) + t * 0.00035) * 0.45 + Math.sin((i * 0.9) + t * 0.00022) * 0.55;
        const y = baseY - (0.35 + 0.65 * Math.abs(n)) * amp;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w + 40 + ox, baseY);
      ctx.lineTo(w + 40 + ox, h + 40);
      ctx.closePath();
      ctx.fill();
    }

    // Brilhos suaves “bioluminescentes”
    if (!prefersReduced) {
      const glowCount = 6;
      for (let i = 0; i < glowCount; i++) {
        const gx = w * (0.12 + i * 0.15) + Math.sin(t * 0.0006 + i) * 18 + parallax.x * 0.15;
        const gy = h * (0.35 + (i % 3) * 0.14) + Math.cos(t * 0.00055 + i * 1.3) * 14 + parallax.y * 0.12;
        const r = 90 + (i % 2) * 40;
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        rg.addColorStop(0, 'rgba(45, 180, 255, 0.10)');
        rg.addColorStop(1, 'rgba(45, 180, 255, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
    }
  }

  function drawFireflies(t) {
    if (prefersReduced) return;

    for (const p of fireflies) {
      p.phase += 0.035 * p.speed;
      p.x += p.vx * 0.003;
      p.y += p.vy * 0.003;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y > 1.05) p.y = -0.05;

      const px = p.x * w + parallax.x * 0.25;
      const py = p.y * h + parallax.y * 0.18;
      const pulse = 0.55 + 0.45 * Math.sin(p.phase);
      const rr = p.r + pulse * 1.4;
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr * 8);
      g.addColorStop(0, `rgba(255, 220, 120, ${0.22 * pulse})`);
      g.addColorStop(0.18, `rgba(255, 220, 120, ${0.10 * pulse})`);
      g.addColorStop(1, 'rgba(255, 220, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rr * 8, py - rr * 8, rr * 16, rr * 16);

      ctx.fillStyle = `rgba(255, 245, 200, ${0.55 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.8, rr * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(t) {
    drawBackground();
    drawParallaxLayers(t);
    drawFireflies(t);
    rafId = requestAnimationFrame(frame);
  }

  function onPointerMove(ev) {
    const cx = (typeof ev.clientX === 'number') ? ev.clientX : (w * 0.5);
    const cy = (typeof ev.clientY === 'number') ? ev.clientY : (h * 0.5);
    pointer.x = w ? Math.max(0, Math.min(1, cx / w)) : 0.5;
    pointer.y = h ? Math.max(0, Math.min(1, cy / h)) : 0.5;
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointerdown', onPointerMove, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  // Fallback para browsers sem Pointer Events
  window.addEventListener('touchstart', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });

  // Renderiza estático se usuário preferir menos movimento
  if (prefersReduced) {
    drawBackground();
    drawParallaxLayers(0);
    return;
  }

  rafId = requestAnimationFrame(frame);

  // Se alguém remover o canvas do DOM, para a animação
  const obs = new MutationObserver(() => {
    if (!document.getElementById('interactive-bg')) {
      try { cancelAnimationFrame(rafId); } catch (e) {}
      try { window.removeEventListener('resize', resize); } catch (e) {}
      try { window.removeEventListener('pointerdown', onPointerMove); } catch (e) {}
      try { window.removeEventListener('pointermove', onPointerMove); } catch (e) {}
      try { window.removeEventListener('touchstart', onPointerMove); } catch (e) {}
      try { obs.disconnect(); } catch (e) {}
    }
  });
  try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
}

try {
  function __shouldUseInteractiveBgFallback() {
    try {
      const hasKodamaSvg = !!document.querySelector('[data-svg=artwork]');
      const hasTweenMax = (typeof window.TweenMax === 'function');
      // Se o cenário Kodama existe e o GSAP está disponível, não use o fallback do canvas.
      return !(hasKodamaSvg && hasTweenMax);
    } catch (e) {
      return true;
    }
  }

  function __bootInteractiveBackgroundIfNeeded() {
    try {
      if (__shouldUseInteractiveBgFallback()) initInteractiveBackground();
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __bootInteractiveBackgroundIfNeeded);
  } else {
    __bootInteractiveBackgroundIfNeeded();
  }
} catch (e) {}

// Fundo "Kodama" (SVG + GSAP/TweenMax) — inicializa apenas se o SVG existir.
// Observação: o SVG do cenário NÃO veio na mensagem; sem ele, este bloco não faz nada e o canvas continua como fallback.
(function initKodamaBackgroundModule() {
  var __kodamaStarted = false;

  function ensureKodamaSvgLoaded() {
    try {
      // Já existe no DOM
      if (document.querySelector('[data-svg=artwork]')) return Promise.resolve(true);

      const host = document.getElementById('kodama-graphic');
      if (!host) return Promise.resolve(false);

      // Tenta carregar do arquivo local do projeto.
      // Observação: em `file://` alguns browsers bloqueiam fetch; nesse caso, cai no fallback.
      return fetch('kodama-artwork.svg', { cache: 'force-cache' })
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function(svgText) {
          // Substitui o placeholder pelo SVG inline (necessário para GSAP animar nós internos).
          host.innerHTML = svgText;
          return true;
        })
        .catch(function() {
          return false;
        });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function hasTouch() {
    try {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    } catch (e) {
      return false;
    }
  }

  function canRunKodama() {
    try {
      const svg = document.querySelector('[data-svg=artwork]');
      if (!svg) return false;
      if (typeof window.TweenMax !== 'function') return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  // Este código é o JS enviado pelo usuário, com proteções para evitar crash.
  var features = {
    vines: true,
    shrooms: true,
    fireflies: true,
    sunrays: false,
    filters: true,
    transparency: true,
    vinesMotion: true,
    shroomsMotion: true,
    textMotion: true,
    mouseAction: true,
    shroomTrip: true,
    init: function() {
      // Se touch device, switch off all fanciness
      var isTouchDevice = false;
      try {
        isTouchDevice = !!(window.Modernizr && Modernizr.touchevents);
      } catch (e) {}
      if (!isTouchDevice) {
        isTouchDevice = hasTouch();
      }

      if (isTouchDevice) {
        // Em mobile/tablet: simplifica extras, mas mantém parallax (mouseAction)
        this.vines = false;
        this.shrooms = false;
        this.fireflies = false;
        this.sunrays = false;
        this.filters = false;
        this.transparency = false;
        this.vinesMotion = false;
        this.shroomsMotion = false;
        this.textMotion = false;
        this.mouseAction = true;
        this.shroomTrip = false;
      }
    }
  };

  var o = {
    init: function() {
      if (!canRunKodama()) return;

      // Se o Kodama vai rodar, esconde o canvas de fallback.
      try {
        const fallback = document.getElementById('interactive-bg');
        if (fallback) fallback.style.display = 'none';
      } catch (e) {}

      o.cacheDOM();
      if (!o.svg) return;
      o.bindEvents();
      o.settings();
      o.resetStart();
      o.animate();
    },
    cacheDOM: function() {
      o.svg = document.querySelector('[data-svg=artwork]');
      o.audio = document.querySelector('[data-audio=group]');

      o.elements = [
        'sunray'
      ];
      o.lists = [
        'layers',
        'glows',
        'kodamas',
        'kodamaGlows',
        'heads',
        'fireflyGroups',
        'fireflies',
        'vines',
        'shrooms',
        'shroomGroups',
        'texts',
        'textsMobile'
      ];
      o.el = {};
      o.li = {};

      if (!o.svg) return;

      for (var i = 0; i < o.elements.length; i++) {
        o.el[o.elements[i]] = o.svg.querySelector('[data-kodama=' + o.elements[i] + ']');
      }
      for (var j = 0; j < o.lists.length; j++) {
        o.li[o.lists[j]] = o.svg.querySelectorAll('[data-kodama=' + o.lists[j] + ']');
      }

      o.li.offsetLayers = o.svg.querySelectorAll('[data-hax=offsetLayers]');
      o.li.filters = o.svg.querySelectorAll('[filter]');

      o.muteButton = document.querySelector('[data-btn=mute]');
      o.replayButton = document.querySelector('[data-btn=replay]');

      if (o.audio) {
        o.ambientAudio = o.audio.querySelector('[data-audio=ambient]');
        o.spinAudio1 = o.audio.querySelector('[data-audio=spin1]');
        o.spinAudio2 = o.audio.querySelector('[data-audio=spin2]');
        o.spinAudio3 = o.audio.querySelector('[data-audio=spin3]');
      } else {
        o.ambientAudio = null;
        o.spinAudio1 = null;
        o.spinAudio2 = null;
        o.spinAudio3 = null;
      }
    },
    settings: function() {
      features.init();
      // Parallax settings
      o.vw = 0;
      o.vh = 0;
      o.layerObj = [];
      o.resize();
      o.mouse = { x: o.vw / 2, y: o.vh / 2 };
      o.acceleration = { val: 0 };

      // other stuff
      o.isMute = false;
      o.tl = null;
      try {
        if (o.li.kodamas && o.li.kodamas[0]) {
          TweenMax.set(o.li.kodamas[0], { scale: 0.8, transformOrigin: 'bottom center' });
        }
      } catch (e) {}
      o.kodamaTransparency = 0.65;

      // Set transparency of glowy blob things
      try {
        var opacity = [0.65, 0.75, 0.75, 0.45, 0.6, 0.65, 0.75, 1];
        if (o.li.glows) {
          for (var i = 0; i < o.li.glows.length; i++) {
            TweenMax.set(o.li.glows[i], { autoAlpha: opacity[i] });
          }
        }
      } catch (e) {}
    },
    bindEvents: function() {
      try { if (o.muteButton) o.muteButton.addEventListener('click', o.toggleAudio); } catch (e) {}
      try { if (o.replayButton) o.replayButton.addEventListener('click', o.replay); } catch (e) {}
      try { window.addEventListener('resize', o.resize); } catch (e) {}
    },
    resetStart: function() {
      o.killTls();
      o.resetStartPosLayers();
      o.resetExtras();
    },
    animate: function() {
      o.initExtras();
      o.revealScene();
      o.playMusic();
      o.playTimeline();
    },
    toggleAudio: function() {
      if (!o.ambientAudio || !o.spinAudio1 || !o.spinAudio2 || !o.spinAudio3) return;
      if (o.ambientAudio.volume === 0) {
        o.ambientAudio.volume = 0.1;
        o.spinAudio1.volume = 1;
        o.spinAudio2.volume = 1;
        o.spinAudio3.volume = 1;
        o.isMute = false;
      } else {
        o.ambientAudio.volume = 0;
        o.spinAudio1.volume = 0;
        o.spinAudio2.volume = 0;
        o.spinAudio3.volume = 0;
        o.isMute = true;
      }
    },
    replay: function() {
      o.resetStart();
      o.animate();
    },
    killTls: function() {
      if (o.tl !== null) {
        try { o.tl.kill(); } catch (e) {}
      }
    },
    resetStartPosLayers: function() {
      if (!o.li.layers) return;
      try {
        TweenMax.set(o.li.layers[0], { y: -0 });
        TweenMax.set(o.li.layers[1], { y: -50 });
        TweenMax.set(o.li.layers[2], { y: -100 });
        TweenMax.set(o.li.layers[3], { y: -200 });
        TweenMax.set(o.li.layers[4], { y: -300 });
        TweenMax.set(o.li.layers[5], { y: -300 });
        TweenMax.set(o.li.layers[6], { y: -400 });
        TweenMax.set(o.li.layers[7], { y: -500 });

        TweenMax.set(o.li.offsetLayers, { x: -50 });
      } catch (e) {}
    },
    resetExtras: function() {
      // Reset acceleration value
      try { TweenMax.set(o.acceleration, { val: 0 }); } catch (e) {}
      // Hide elements
      try { TweenMax.set([o.svg, o.li.kodamas, o.li.texts, o.li.textsMobile, o.el.sunray], { autoAlpha: 0 }); } catch (e) {}
    },
    revealScene: function() {
      try { TweenMax.to(o.svg, 1, { autoAlpha: 1 }); } catch (e) {}
      // Mantém compatibilidade com o CSS original (inicia invisível)
      try {
        var host = document.getElementById('kodama-graphic');
        if (host) host.style.opacity = '1';
      } catch (e) {}
    },
    playTimeline: function() {
      o.tl = o.getTimeline();
      try { if (o.tl && o.tl.play) o.tl.play(); } catch (e) {}
    },
    playMusic: function() {
      if (!o.ambientAudio) return;
      try {
        if (o.isMute) {
          o.ambientAudio.volume = 0;
        } else {
          o.ambientAudio.volume = 0.1;
        }
        o.ambientAudio.currentTime = 0;
        var p = o.ambientAudio.play();
        if (p && typeof p.catch === 'function') p.catch(function(){});
      } catch (e) {}
    },
    initExtras: function() {
      // Call if false
      if (!features.vines) { o.removeVines(); }
      if (!features.shrooms) { o.removeShrooms(); }
      if (!features.fireflies) { o.removeFireflies(); } else { o.playFireflies(); }
      if (!features.sunrays) { o.removeSunrays(); }
      if (!features.filters) { o.removeFilters(); }
      if (!features.transparency) { o.removeTransparency(); }

      // Demo original: só toca o intro quando NÃO há mouseAction.
      if (!features.mouseAction) {
        o.playIntro();
      }

      // Call if true
      if (features.vinesMotion) { o.playVines(); }
      if (features.shroomsMotion) { o.playShrooms(); }
      if (features.textMotion) { o.playText(); }
      if (features.mouseAction) { o.bindParallax(); }
      if (features.shroomTrip) { o.bindShrooms(); }
    },
    getTimeline: function() {
      var tl = new TimelineMax({ paused: true });

      tl
        .add('revealKodamas')
        .to(o.li.kodamas[0], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut }, 7)
        .to(o.li.kodamas[1], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut }, 9.5)
        .to(o.li.kodamas[2], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut }, 10.5)

        .add('revealTitle')
        .to(o.li.texts[0], 3, { autoAlpha: 1, ease: Power3.easeOut }, 11.3)
        .to(o.li.texts[1], 3, { autoAlpha: 0.7, ease: Power3.easeOut }, 12.2)
        .to(o.el.sunray, 3, { autoAlpha: 0.2 }, 10)

        .add('spinHeads')
        .add('spin1')
        .to(o.li.heads[0], 2, { rotation: 90, transformOrigin: 'center center' }, 'spin1')
        .to(o.li.heads[0], 2, { rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: 'center center' }, 'spin1 =+2')
        .call(o.playSFX, [o.spinAudio1], this, 'spin1')
        .add('spin2', 'spin1 =+2')
        .to(o.li.heads[1], 2, { rotation: 90, transformOrigin: 'center center' }, 'spin2')
        .to(o.li.heads[1], 2, { rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: 'center center' }, 'spin2 =+2')
        .call(o.playSFX, [o.spinAudio2], this, 'spin2')
        .add('spin3', 'spin1 =+2.3')
        .to(o.li.heads[2], 2, { rotation: 90, transformOrigin: 'center center' }, 'spin3')
        .to(o.li.heads[2], 2, { rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: 'center center' }, 'spin3 =+2')
        .call(o.playSFX, [o.spinAudio3], this, 'spin3');

      return tl;
    },
    playSFX: function(audio) {
      if (!audio) return;
      try {
        if (o.isMute) {
          audio.volume = 0;
        }
        audio.currentTime = 0;
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function(){});
      } catch (e) {}
    },
    removeVines: function() {
      if (!o.li.vines || !o.li.shroomGroups || !o.li.shroomGroups[0]) return;
      if (o.li.shroomGroups[0].parentNode) {
        for (var i = 0; i < o.li.vines.length; i++) {
          if (o.li.vines[i] && o.li.vines[i].parentNode) o.li.vines[i].parentNode.removeChild(o.li.vines[i]);
        }
      }
    },
    playVines: function() {
      if (!o.li.vines) return;
      for (var i = 0; i < o.li.vines.length; i++) {
        o.swingVine(i);
      }
    },
    swingVine: function(i) {
      if (!o.li.vines || !o.li.vines[i]) return;
      var duration = random(3, 5);
      var rotation = random(-5, 5);

      TweenMax.to(o.li.vines[i], duration, {
        rotation: rotation,
        transformOrigin: 'top center',
        ease: Power1.easeInOut,
        onComplete: o.swingVine,
        onCompleteParams: [i]
      });
    },
    removeShrooms: function() {
      if (!o.li.shroomGroups || !o.li.shroomGroups[0]) return;
      if (o.li.shroomGroups[0].parentNode) {
        for (var i = 0; i < o.li.shroomGroups.length; i++) {
          if (o.li.shroomGroups[i] && o.li.shroomGroups[i].parentNode) o.li.shroomGroups[i].parentNode.removeChild(o.li.shroomGroups[i]);
        }
      }
    },
    playShrooms: function() {
      if (!o.li.shrooms) return;
      for (var i = 0; i < o.li.shrooms.length; i++) {
        o.pulseShroom(i);
      }
    },
    pulseShroom: function(i) {
      if (!o.li.shrooms || !o.li.shrooms[i]) return;
      var duration = random(0.5, 1);
      var scale = random(1.1, 1.3);
      var delay = random(1, 4);

      TweenMax.to(o.li.shrooms[i], duration, {
        scale: scale,
        transformOrigin: 'center center',
        ease: SlowMo.ease.config(0.1, 0.1, true),
        delay: delay,
        onComplete: o.pulseShroom,
        onCompleteParams: [i]
      });
    },
    bindShrooms: function() {
      if (!o.li.shroomGroups) return;
      for (var i = 0; i < o.li.shroomGroups.length; i++) {
        try { o.li.shroomGroups[i].addEventListener('click', o.eatShroom); } catch (e) {}
      }
    },
    eatShroom: function() {
      // original: console.log("Trippy colors, unproportional scale, reverse movement");
    },
    removeFireflies: function() {
      if (!o.li.fireflyGroups || !o.li.fireflyGroups[0]) return;
      if (o.li.fireflyGroups[0].parentNode) {
        for (var i = 0; i < o.li.fireflyGroups.length; i++) {
          if (o.li.fireflyGroups[i] && o.li.fireflyGroups[i].parentNode) o.li.fireflyGroups[i].parentNode.removeChild(o.li.fireflyGroups[i]);
        }
      }
    },
    playFireflies: function() {
      if (!o.li.fireflyGroups || !o.li.fireflies) return;
      TweenMax.set(o.li.fireflyGroups, { autoAlpha: 1 });
      for (var i = 0; i < o.li.fireflyGroups.length; i++) {
        o.newFireflyGroupPos(i);
      }
      for (var j = 0; j < o.li.fireflies.length; j++) {
        o.newFireflyPos(j);
      }
    },
    newFireflyGroupPos: function(i) {
      if (!o.li.fireflyGroups || !o.li.fireflyGroups[i]) return;
      var duration = random(1, 5);
      var rotation = random(0, 360);
      var scale = random(0.5, 1);
      // O demo original usa regiões diferentes para alguns grupos; aqui alternamos por índice.
      var idx = (i % 2);
      var x = [random(1250, 1350), random(1050, 1150)][idx];
      var y = [random(25, 100), random(325, 400)][idx];

      TweenMax.to(o.li.fireflyGroups[i], duration, {
        rotation: rotation,
        scale: scale,
        x: x,
        y: y,
        ease: Power1.easeInOut,
        onComplete: o.newFireflyGroupPos,
        onCompleteParams: [i]
      });
    },
    newFireflyPos: function(i) {
      if (!o.li.fireflies || !o.li.fireflies[i]) return;
      var duration = random(5, 7);
      var x = [random(-45, 45), random(-45, 45), random(-45, 45), random(-45, 45), random(-45, 45)];

      TweenMax.to(o.li.fireflies[i], duration, {
        bezier: {
          curviness: 1,
          values: [
            { x: x[0], y: x[1] },
            { x: x[1], y: x[2] },
            { x: x[2], y: x[3] },
            { x: x[3], y: x[4] },
            { x: x[4], y: x[0] }
          ]
        },
        scale: random(0.2, 1.3),
        autoAlpha: random(0.7, 1),
        ease: Linear.easeNone,
        onComplete: o.newFireflyPos,
        onCompleteParams: [i]
      });
    },
    removeSunrays: function() {
      if (!o.el.sunray) return;
      if (o.el.sunray.parentNode) {
        o.el.sunray.parentNode.removeChild(o.el.sunray);
      }
    },
    removeFilters: function() {
      if (!o.li.filters || !o.li.filters[0]) return;
      if (o.li.filters[0].parentNode) {
        for (var i = 0; i < o.li.filters.length; i++) {
          if (o.li.filters[i] && o.li.filters[i].parentNode) o.li.filters[i].parentNode.removeChild(o.li.filters[i]);
        }
      }
    },
    removeTransparency: function() {
      o.kodamaTransparency = 1;
    },
    playText: function() {
      if (!o.li.texts) return;
      TweenMax.to(o.li.texts[0], 6, { y: 20, ease: Power1.easeInOut, repeat: -1, yoyo: true });
      TweenMax.to(o.li.texts[1], 6, { y: 20, ease: Power1.easeInOut, repeat: -1, yoyo: true, delay: 1.8 });
    },
    playIntro: function() {
      if (!o.li.layers) return;
      TweenMax.to(o.li.layers, 9, { y: 50, ease: Back.easeOut });
    },
    resize: function() {
      o.vw = window.innerWidth;
      o.vh = window.innerHeight;
    },
    bindParallax: function() {
      if (!o.svg) return;
      // Ouvir no window garante parallax mesmo com UI por cima do SVG.
      // (Se escutar só no SVG, os overlays bloqueiam o mousemove.)
      try {
        if (!o._parallaxBound) {
          window.addEventListener('pointermove', o.updateMouseObj, { passive: true });
          window.addEventListener('touchmove', o.updateMouseObj, { passive: true });
          o._parallaxBound = true;
        }
      } catch (e) {}

      // Mantém também no SVG (quando o ponteiro estiver sobre ele).
      try { o.svg.addEventListener('mousemove', o.updateMouseObj); } catch (e) {}
      try { o.svg.addEventListener('touchmove', o.updateMouseObj, { passive: true }); } catch (e) {}

      TweenMax.to(o.acceleration, 10, { val: 0.05, ease: Linear.easeNone });

      if (!o.li.layers) return;
      for (var i = 0; i < o.li.layers.length; i++) {
        o.linkLayer(i);
      }
    },
    linkLayer: function(i) {
      if (!o.li.layers || !o.li.layers[i]) return;
      var offset = 20*i;

      o.layerObj[i] = {
        pos: o.li.layers[i]._gsTransform,
        x: 0,
        xMin: offset,
        xMax: -offset,
        y: 0,
        yMin: offset,
        yMax: -offset
      };

      TweenMax.to(o.li.layers[i], 1000, { x: 0, y: 0, repeat: -1, ease: Linear.easeNone,
        modifiers: {
          x: function() {
            o.layerObj[i].x = map(o.mouse.x, 0, o.vw, o.layerObj[i].xMin, o.layerObj[i].xMax);
            return o.layerObj[i].pos.x + ( o.layerObj[i].x - o.layerObj[i].pos.x ) * o.acceleration.val;
          },
          y: function() {
            // Demo original usa vw aqui (não vh). Mantemos para ficar idêntico.
            o.layerObj[i].y = map(o.mouse.y, 0, o.vw, o.layerObj[i].yMin, o.layerObj[i].yMax);
            return o.layerObj[i].pos.y + ( o.layerObj[i].y - o.layerObj[i].pos.y ) * o.acceleration.val;
          }
        }
      });
    },
    updateMouseObj: function(e) {
      if (e.targetTouches && e.targetTouches[0]) {
        o.mouse.x = e.targetTouches[0].clientX;
        o.mouse.y = e.targetTouches[0].clientY;
      } else {
        o.mouse.x = e.clientX;
        o.mouse.y = e.clientY;
      }
    }
  };

  function random(min, max) {
    if (max === null) {
      max = min;
      min = 0;
    }
    return Math.random() * (max - min) + min;
  }

  function map(value, sourceMin, sourceMax, destinationMin, destinationMax) {
    return destinationMin + (destinationMax - destinationMin) * ((value - sourceMin) / (sourceMax - sourceMin)) || 0;
  }

  function __startKodamaOnce() {
    if (__kodamaStarted) return;
    __kodamaStarted = true;
    try {
      ensureKodamaSvgLoaded().then(function() {
        try { o.init(); } catch (e) {}
      });
    } catch (e) {
      try { o.init(); } catch (e2) {}
    }
  }

  // Tenta iniciar o quanto antes (quando o DOM estiver pronto) para evitar
  // aparecer um fundo de fallback antes das árvores.
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', __startKodamaOnce);
    } else {
      __startKodamaOnce();
    }
  } catch (e) {}

  // Mantém um fallback no "load" caso algum recurso demore (ex.: libs externas).
  try { window.addEventListener('load', __startKodamaOnce); } catch (e) {}
})();

let currentMode = '';
let currentIndex = 0;
let cardOrder = [];
let currentFlashcards = [];
// contagem de acertos na sessão atual
let correctCount = 0;
let lastVerifySuccess = false;
// resultados detalhados para revisão ao final
let reviewResults = [];
// (Teoria removida) sem estado extra de overlay

const menuScreen = document.getElementById('menuScreen');
const flashcardScreen = document.getElementById('flashcardScreen');
const flashcard = document.getElementById('flashcard');
const cardImage = document.getElementById('cardImage');
const cardAnswer = document.getElementById('cardAnswer');
const cardFrontText = document.getElementById('cardFrontText');
const zoomBtn = document.getElementById('zoomBtn');
const zoomOverlay = document.getElementById('zoomOverlay');
const zoomImage = document.getElementById('zoomImage');
const zoomClose = document.getElementById('zoomClose');

// id do container interativo (criado dinamicamente)
const interactiveId = 'interactiveContainer';

let currentImageUrl = '';
let hasShuffled = false;

// Helper: cria um botão 'Voltar' padronizado.

// Vincular botões principais do menu, se existirem
try {
  const btnPratica = document.getElementById('startPratica') || document.querySelector('[data-action="start-pratica"]');
  if (btnPratica && !btnPratica._bound) {
    btnPratica.addEventListener('click', (e) => { e.preventDefault(); startMode('pratica'); });
    btnPratica._bound = true;
  } else {
    const menuCards = Array.from(document.querySelectorAll('.menu-card'));
    const praticaCard = menuCards.length > 1 ? menuCards[1] : null;
    if (praticaCard && !praticaCard._bound) {
      praticaCard.addEventListener('click', (e) => { e.preventDefault(); startMode('pratica'); });
      praticaCard._bound = true;
    }
  }
} catch (e) { /* ignore */ }
function createStandardBackButton(options = {}) {
  const {
    id = 'menu-back-button',
    href = '#',
    title = 'Voltar',
    subtitle = '',
    fixed = true,
    onClick = null,
    // full CSS expression to use for `left`, e.g. 'calc(var(--notebook-side-gap) - 20px)'
    leftExpression = '320px',
    // se true, adiciona uma linha de legend abaixo do título (por padrão não adiciona)
    showSubtitle = false
  } = options;

  // remover existente
  try { const ex = document.getElementById(id); if (ex) ex.remove(); } catch (e) {}

  const a = document.createElement('button');
  a.id = id;
  a.className = 'back';
  a.type = 'button';
  // use aria-label for accessibility
  a.setAttribute('aria-label', title);

  const c = document.createElement('div');
  const h = document.createElement('h4'); h.textContent = String(title || '').toUpperCase();
  // a seta será desenhada via CSS pseudo-elemento (.back div::after)
  // (não inserimos <img> aqui para evitar duplicação)
  a.appendChild(c); a.appendChild(h);
  if (showSubtitle && subtitle) {
    const s = document.createElement('span'); s.className = 'back-btn-text'; s.textContent = subtitle;
    a.appendChild(s);
  }

// Helper global para testes: dispara confetti manualmente via Console
// Uso: abra DevTools Console e execute `__test_confetti()`
try {
  window.__test_confetti = function() {
    try {
      // Reuse the same launcher logic used by _fireConfettiOnce
      function _createLauncherAndFireTest() {
        try {
          if (!window.__confettiLauncher) {
            const canvas = document.createElement('canvas');
            canvas.id = '__confetti_canvas';
            canvas.style.position = 'fixed';
            canvas.style.inset = '0';
            canvas.style.left = '0';
            canvas.style.top = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999999';
            document.body.appendChild(canvas);
            if (window.confetti && typeof window.confetti.create === 'function') {
              window.__confettiLauncher = window.confetti.create(canvas, { resize: true });
            } else {
              window.__confettiLauncher = function(opts) { try { window.confetti(opts); } catch(e){} };
            }
          }
          try { window.__confettiLauncher({ particleCount: 120, spread: 70, origin: { y: 0.6 } }); } catch(e) { console.error('confetti error', e); }
        } catch (e) { console.error('Erro criando launcher de confetti (test)', e); }
      }
      if (window.confetti && typeof window.confetti.create === 'function') { _createLauncherAndFireTest(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
      s.async = true;
      s.onload = function() { try { _createLauncherAndFireTest(); } catch(e) { console.error('confetti test onload error', e); } };
      s.onerror = function() { console.warn('Falha ao carregar a lib de confetti'); };
      document.head.appendChild(s);
    } catch (e) { console.error('Erro em __test_confetti', e); }
  };
} catch (e) {}

  if (fixed) {
    a.style.position = 'fixed';
    // posicionamento relativo à variável CSS do gap (pode ser sobrescrito por leftExpression)
    a.style.left = leftExpression;
    a.style.top = '24px';
    a.style.zIndex = '2000';
  }

  if (typeof onClick === 'function') {
    a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); onClick(ev); });
  }

  return a;
}

// Assistente: transição ao entrar/sair da tela de cards
// - Ao entrar: some no menu, a tela de cards aparece, e o assistente reaparece recortado dentro do card.
// - Ao sair: some no card e volta ao overlay do menu.
const __assistenteCardTransition = (() => {
  try {
    const assistente = document.getElementById('assistente-fixo');
    if (!assistente) return null;

    const homeParent = assistente.parentNode;
    const homeNextSibling = assistente.nextSibling;

    const DURATION_MS = 320;
    let transitionTimer = 0;

    function getCardTarget() {
      return document.querySelector('#flashcardScreen .card-face.card-front');
    }

    function fadeOutThen(fn) {
      try { if (transitionTimer) window.clearTimeout(transitionTimer); } catch (_) {}
      transitionTimer = 0;
      try { assistente.classList.add('assistente-hidden'); } catch (_) {}
      transitionTimer = window.setTimeout(() => {
        transitionTimer = 0;
        try { fn(); } catch (_) {}
      }, DURATION_MS);
    }

    function fadeIn() {
      try {
        window.requestAnimationFrame(() => {
          try { assistente.classList.remove('assistente-hidden'); } catch (_) {}
        });
      } catch (_) {
        try { assistente.classList.remove('assistente-hidden'); } catch (_) {}
      }
    }

    function toCards(enterCardsCb) {
      const target = getCardTarget();
      if (!target) {
        if (typeof enterCardsCb === 'function') enterCardsCb();
        return;
      }

      fadeOutThen(() => {
        // primeiro: trocar a tela
        if (typeof enterCardsCb === 'function') enterCardsCb();

        // depois: mover e reaparecer dentro do card
        try { target.classList.add('assistente-card-clip'); } catch (_) {}
        try { assistente.classList.add('assistente-in-card'); } catch (_) {}
        try { target.appendChild(assistente); } catch (_) {}
        fadeIn();
      });
    }

    function toMenu() {
      fadeOutThen(() => {
        const target = getCardTarget();
        try { if (target) target.classList.remove('assistente-card-clip'); } catch (_) {}
        try { assistente.classList.remove('assistente-in-card'); } catch (_) {}
        try { assistente.classList.remove('anadix-microscope-card'); } catch (_) {}
        try { assistente.classList.remove('anadix-right-cards'); } catch (_) {}

        try {
          if (homeParent) {
            if (homeNextSibling && homeNextSibling.parentNode === homeParent) {
              homeParent.insertBefore(assistente, homeNextSibling);
            } else {
              homeParent.appendChild(assistente);
            }
          } else {
            document.body.appendChild(assistente);
          }
        } catch (_) {}

        // Restaurar texto da HOME ao voltar pro menu
        try {
          if (window.__anadixBalloon && typeof window.__anadixBalloon.restoreHome === 'function') {
            window.__anadixBalloon.restoreHome();
          }
        } catch (_) {}

        fadeIn();
      });
    }

    return { toCards, toMenu, DURATION_MS };
  } catch (e) {
    return null;
  }
})();

// Anadix: transição de fade ao trocar de card (avançar/continuar)
function renderCurrentCardWithAnadixTransition() {
  try {
    const assistente = document.getElementById('assistente-fixo');
    const duration = (typeof __assistenteCardTransition !== 'undefined' && __assistenteCardTransition && __assistenteCardTransition.DURATION_MS)
      ? __assistenteCardTransition.DURATION_MS
      : 320;

    // Se não estiver dentro do card (ou não existir), renderiza normal
    if (!assistente || !assistente.classList.contains('assistente-in-card')) {
      renderCurrentCard();
      return;
    }

    try { assistente.classList.add('assistente-hidden'); } catch (e) {}
    window.setTimeout(() => {
      try { renderCurrentCard(); } catch (e) {}
      try {
        window.requestAnimationFrame(() => {
          try { assistente.classList.remove('assistente-hidden'); } catch (e) {}
        });
      } catch (e) {
        try { assistente.classList.remove('assistente-hidden'); } catch (e2) {}
      }
    }, duration);
  } catch (e) {
    try { renderCurrentCard(); } catch (e2) {}
  }
}

function startMode(mode) {
  dlog('startMode called', mode);
  currentMode = mode;
  // Se houver microscópio rodando no menu (ou em card anterior), descarte antes de renderizar o modo.
  try { if (window.Microscope3D && typeof window.Microscope3D.disposeAll === 'function') window.Microscope3D.disposeAll(); } catch (e) {}
  try { document.body.classList.toggle('mode-pratica', mode === 'pratica'); } catch(e) {}
  // Teoria removida
  try { document.body.classList.remove('mode-teorica'); } catch(e) {}
  hasShuffled = false;
  // reset de contadores e resultados ao iniciar um novo modo
  try {
    correctCount = 0;
    lastVerifySuccess = false;
    reviewResults = [];
  } catch (e) {}
  
  if (mode !== 'pratica') {
    // Teoria removida: qualquer modo desconhecido volta ao menu para evitar estados quebrados
    goToMenu();
    return;
  }

  currentFlashcards = flashcardsPratica;
  currentIndex = 0; // Prática: Mostra capa
  
  cardOrder = [...Array(currentFlashcards.length).keys()];

  function enterCardsUI() {
    menuScreen.classList.add('hidden');
    flashcardScreen.classList.remove('hidden');
    renderCurrentCard();

    // show fallback back-button if present
    try {
      const fb = document.getElementById('global-back-fallback');
      // only show the global fallback if there isn't an existing back button
      // injected by the UI (menu-back-button) or a
      // top-nav child already present. This prevents duplicate back buttons.
      const hasMenuBack = !!document.getElementById('menu-back-button');
      const hasTheoryBack = false;
      const topNav = document.querySelector('.top-nav');
      const topNavHasChildren = topNav && topNav.children && topNav.children.length > 0;
      if (fb) {
        if (hasMenuBack || hasTheoryBack || topNavHasChildren) {
          fb.style.display = 'none';
        } else {
          fb.style.display = '';
        }
      }
    } catch (e) {}
  }

  // Assistente: ao entrar na tela de cards, some antes e reaparece recortado dentro do card
  try {
    if (typeof __assistenteCardTransition !== 'undefined' && __assistenteCardTransition && typeof __assistenteCardTransition.toCards === 'function') {
      __assistenteCardTransition.toCards(enterCardsUI);
      return;
    }
  } catch (e) {}

  enterCardsUI();
}

// garantir acesso global para chamadas inline no HTML
try { window.startMode = startMode; } catch(e) {}

// volta ao menu principal e remove estados temporários da visão TEORIA
function goBackToMenu() {
  dlog('goBackToMenu called', { currentMode: typeof currentMode !== 'undefined' ? currentMode : null, currentIndex: typeof currentIndex !== 'undefined' ? currentIndex : null });
  // Descartar qualquer instância do microscópio para não deixar animação rodando em background.
  try { if (window.Microscope3D && typeof window.Microscope3D.disposeAll === 'function') window.Microscope3D.disposeAll(); } catch (e) {}

  // Assistente: ao sair da tela de cards, volta para o overlay do menu (com transição)
  try {
    if (typeof __assistenteCardTransition !== 'undefined' && __assistenteCardTransition && typeof __assistenteCardTransition.toMenu === 'function') {
      __assistenteCardTransition.toMenu();
    }
  } catch (e) {}

  // Ensure the menu is shown immediately as a fail-safe so the user can always
  // return to the main screen even if later cleanup throws an error.
  try {
    const menuScreenEl = document.getElementById('menuScreen');
    const flashScreenEl = document.getElementById('flashcardScreen');
    if (menuScreenEl) {
      menuScreenEl.classList.remove('hidden');
      menuScreenEl.style.display = '';
    }
    if (flashScreenEl) {
      flashScreenEl.classList.add('hidden');
      flashScreenEl.style.display = 'none';
    }
  } catch (e) {}

  try {
    // cleanup: remove interactive containers
    try {
      const interactive = document.getElementById(interactiveId);
      if (interactive) interactive.remove();
    } catch (e) {}

    // remover possíveis classes de notebook da face do card
    const frontFace = document.querySelector('.card-face.card-front');
    if (frontFace) frontFace.classList.remove('notebook-view');
    const cardImg = document.querySelector('.card-image');
    if (cardImg) cardImg.classList.remove('notebook-image');
    // garantir que a área do card não contenha o painel do caderno
    try { if (cardImg) cardImg.innerHTML = ''; } catch (e) {}
    dlog('goBackToMenu: cleaned overlays and interactive containers');
    // mostrar menu e esconder tela de flashcards
    const menuScreenEl = document.getElementById('menuScreen');
    const flashScreen = document.getElementById('flashcardScreen');
    if (menuScreenEl) {
      menuScreenEl.classList.remove('hidden');
      menuScreenEl.style.display = '';
    }
    if (flashScreen) {
      flashScreen.classList.add('hidden');
      flashScreen.style.display = 'none';
    }
    // restaurar top-nav para seu estado padrão (botão de voltar simples)
    const topNav = document.querySelector('.top-nav');
    if (topNav) {
      topNav.innerHTML = '';
      // inserir botão de voltar padronizado (não fixo) para tela de flashcards
      const menuBack = createStandardBackButton({
        id: 'menu-back-button',
        fixed: false,
        title: 'Voltar',
        onClick: () => goBackToMenu()
      });
      topNav.appendChild(menuBack);
      // remover expansão do notebook se aplicada
      try {
        const mainContainer = document.querySelector('.container');
        if (mainContainer) mainContainer.classList.remove('notebook-expanded');
      } catch (e) {}
    }
  } catch (e) {
    // fail silently
  }

  // hide fallback back-button if present
  try {
    const fb = document.getElementById('global-back-fallback');
    if (fb) fb.style.display = 'none';
    dlog('goBackToMenu: hid global-back-fallback');
  } catch (e) {}

  // Extra aggressive cleanup: remove any leftover notebook or overlay elements
  try {
    // remove by id or class if any remain
    const maybeOverlays = Array.from(document.querySelectorAll('.notebook-panel, .notebook-full'));
    maybeOverlays.forEach(el => { try { el.remove(); } catch(e){} });
    // hide zoom overlay if visible
    try { const z = document.getElementById('zoomOverlay'); if (z) z.classList.remove('active'); if (z) z.style.display = 'none'; } catch(e) {}
    // ensure interactive container removed
    try { const ii = document.getElementById(interactiveId); if (ii) ii.remove(); } catch(e) {}
    // ensure flashcardScreen is behind and menuScreen is on top
    try { const menuEl = document.getElementById('menuScreen'); if (menuEl) { menuEl.style.zIndex = '4000'; menuEl.style.position = menuEl.style.position || 'relative'; menuEl.scrollIntoView({behavior: 'smooth'}); } } catch(e) {}
    try { const flashEl = document.getElementById('flashcardScreen'); if (flashEl) { flashEl.style.zIndex = '0'; } } catch(e) {}
    dlog('goBackToMenu: performed extra aggressive cleanup');
  } catch (e) {}
  try { document.body.classList.remove('mode-pratica'); } catch(e) {}
  try { document.body.classList.remove('mode-teorica'); } catch(e) {}
}

// Unified init to attach global delegated listeners once
function initOnce() {
  if (window.__appInitialized) return;
  window.__appInitialized = true;

  // Delegated fallback: clicks on any '.back' trigger goBackToMenu
  document.addEventListener('click', (ev) => {
    try {
      const el = ev.target.closest && ev.target.closest('.back');
      if (el) {
        dlog('delegated back click on', el.id || el.className || el);
        ev.preventDefault();
        ev.stopPropagation();
        try { goBackToMenu(); } catch (e) { /* silent */ }
      }
    } catch (e) {}
  }, { capture: true, passive: true });

  // Teoria removida: sem fallback

  // Safety: expose startMode and attach menu-card fallbacks
  try { window.startMode = startMode; } catch (e) {}
  try {
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach(card => {
      if (card.dataset.startAttached) return;
      const onclick = card.getAttribute('onclick') || '';
      const m = onclick.match(/startMode\(['"](\w+)['"]\)/);
      if (m) {
        card.addEventListener('click', (ev) => { ev.preventDefault(); startMode(m[1]); }, { passive: false });
        card.dataset.startAttached = '1';
      }
    });
  } catch (e) {}

  // Delegated fallback for menu cards (robust)
  document.addEventListener('click', (ev) => {
    try {
      const el = ev.target.closest && ev.target.closest('.menu-card');
      if (el) {
        const onclick = el.getAttribute && el.getAttribute('onclick') || '';
        const m = onclick.match(/startMode\(['"](\w+)['"]\)/);
        const mode = m ? m[1] : (el.dataset && el.dataset.mode);
        dlog('delegated menu-card click', { id: el.id, mode });
        if (mode) {
          ev.preventDefault(); ev.stopPropagation();
          try { startMode(mode); } catch(e) {}
        }
      }
    } catch (e) {}
  }, { capture: true });

  // Fixed fallback back-button
  try {
    if (!document.getElementById('global-back-fallback')) {
      const a = document.createElement('button');
      a.id = 'global-back-fallback';
      a.type = 'button';
      a.setAttribute('aria-label', 'Voltar');
      a.style.position = 'fixed';
      a.style.left = '12px';
      a.style.top = '12px';
      a.style.width = '36px';
      a.style.height = '36px';
      a.style.borderRadius = '50%';
      a.style.background = '#ffffffff';
      a.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
      a.style.zIndex = '4000';
      a.style.display = 'none';
      a.style.backgroundImage = "url('https://s3-eu-west-1.amazonaws.com/thomascullen-codepen/back.svg')";
      a.style.backgroundRepeat = 'no-repeat';
      a.style.backgroundPosition = 'center';
      a.style.backgroundSize = '18px';
      a.style.cursor = 'pointer';
      a.addEventListener('click', (ev) => { ev.preventDefault(); try { goBackToMenu(); } catch(e){} });
      document.body.appendChild(a);
    }
  } catch (e) {}
}

// Boot init once DOM is ready
document.addEventListener('DOMContentLoaded', initOnce, { once: true });

function renderCurrentCard() {
  dlog('renderCurrentCard called', { currentMode: typeof currentMode !== 'undefined' ? currentMode : null, currentIndex: typeof currentIndex !== 'undefined' ? currentIndex : null });
  // Ensure flashcard screen is visible (force) in case prior cleanups hid it
  try {
    const menu = document.getElementById('menuScreen');
    const flash = document.getElementById('flashcardScreen');
    if (menu) { menu.classList.add('hidden'); menu.style.display = 'none'; menu.style.zIndex = '0'; }
    if (flash) { flash.classList.remove('hidden'); flash.style.display = ''; flash.style.zIndex = '2000'; }
  } catch(e) {}
  // garantir que nav/top e controles estejam visíveis ao abrir um flashcard
  try {
    const topNav = document.querySelector('.top-nav');
    if (topNav) topNav.style.display = '';
    const controlsEl = document.querySelector('.controls');
    // Mostrar controles apenas no modo prática; esconder na visão TEORIA
    if (controlsEl) controlsEl.style.display = (currentMode === 'pratica') ? '' : 'none';
    // garantir que exista um botão de voltar padronizado na top-nav (modo flashcards/pratica)
    try {
      if (topNav && !document.getElementById('menu-back-button')) {
        topNav.innerHTML = '';
        try { const ex = document.getElementById('menu-back-button'); if (ex) ex.remove(); } catch(e) {}
        const menuBack = createStandardBackButton({
          id: 'menu-back-button',
          fixed: true,
          title: 'Voltar',
          onClick: () => goBackToMenu(),
          leftExpression: '340px'
        });
        document.body.appendChild(menuBack);
      }
    } catch (e) {}
  } catch (e) {}
  const actualIndex = cardOrder[currentIndex];
  const card = currentFlashcards[actualIndex];

  // Anadix: atualizar posição/texto para o card atual (precisa rodar também nos cards do tipo game)
  try {
    const anadix = window.__anadixBalloon;
    const assistenteEl = document.getElementById('assistente-fixo');
    const isMicroscopeWelcome = !!(card && card.isWelcome && card.type === 'microscope');
    const isPlayableGameCard = !!(card && !card.isWelcome && currentMode === 'pratica');

    // A partir do 2º card: mover Anadix e balão para a direita (aproveitar área em branco)
    try {
      const shiftRight = !!assistenteEl && (currentMode === 'pratica') && (currentIndex >= 1) && assistenteEl.classList.contains('assistente-in-card');
      if (assistenteEl) assistenteEl.classList.toggle('anadix-right-cards', shiftRight && !isMicroscopeWelcome);
    } catch (_) {}

    // Classe para ajustes visuais específicos do card do microscópio (capa)
    try {
      if (assistenteEl) assistenteEl.classList.toggle('anadix-microscope-card', isMicroscopeWelcome);
    } catch (_) {}

    // Texto do balão
    try {
      if (anadix && typeof anadix.forceReappear === 'function') {
        const defaultMsg = "Olá! Sou <b>Anadix</b>. Guardiã do conhecimento.<br>Vou te guiar na descoberta das plantas vasculares.";
        const microscopeMsg = "Este é um microscópio interativo.<br>Você pode clicar, mover e ajustar cada detalhe.<br><br>Explore com calma. Está preparado?";
        const perCardMsg = (card && typeof card.anadixSpeech === 'string' && card.anadixSpeech.trim()) ? card.anadixSpeech : '';
        const msg = isMicroscopeWelcome ? microscopeMsg : (perCardMsg || defaultMsg);
        // Nos cards de jogo: balão fica oculto e só abre ao clicar na Anadix.
        try { if (typeof anadix.setManualOnly === 'function') anadix.setManualOnly(isPlayableGameCard); } catch (e) {}
        anadix.forceReappear(msg);
      }
    } catch (e) {}
  } catch (e) {}

  // Card do microscópio (capa): remover “borda branca” interna (full-bleed)
  try {
    const frontFace = document.querySelector('.card-face.card-front');
    const isMicroscopeWelcome = !!(card && card.isWelcome && card.type === 'microscope');
    if (frontFace) frontFace.classList.toggle('microscope-fullbleed', isMicroscopeWelcome);
  } catch (e) {}
  
  // No modo prática: se for a capa (isWelcome) renderiza apenas a imagem (manual do game).
  // Somente os demais cards usam o layout interativo.
  if (currentMode === 'pratica') {
    if (!card.isWelcome) {
      renderGame(card);
      return;
    } else {
      // garante que qualquer container interativo seja removido quando for a capa
      const existing = document.getElementById(interactiveId);
      if (existing) existing.remove();
      const inner = cardImage.querySelector('.game-layout');
      if (inner) inner.remove();
      const cardContainer = document.querySelector('.card-container');
      if (cardContainer) cardContainer.style.display = '';
      // continuará a execução normal abaixo para renderizar a capa (imagem)
    }
  } else {
    // garante que o container interativo seja removido quando não for jogo
    const existing = document.getElementById(interactiveId);
    if (existing) existing.remove();
    // remove game layout inside cardImage if present
    const inner = cardImage.querySelector('.game-layout');
    if (inner) inner.remove();
    const cardContainer = document.querySelector('.card-container');
    if (cardContainer) cardContainer.style.display = '';
  }
  
  cardAnswer.textContent = card.description;
  cardFrontText.textContent = card.frontText || '';
  
  cardImage.innerHTML = '';
  cardImage.style.display = 'flex';
  cardFrontText.style.display = 'none';
  zoomBtn.style.display = 'none';

  if (card.isWelcome) {
    // Lógica da Capa
    if (card.type === 'microscope') {
      // Card inicial: microscópio 3D totalmente interativo
      const host = document.createElement('div');
      host.className = 'microscope-card-host';
      host.style.width = '100%';
      host.style.height = '100%';
      host.style.flex = '1 1 auto';
      cardImage.appendChild(host);
      try {
        if (window.Microscope3D && typeof window.Microscope3D.mount === 'function') {
          window.Microscope3D.mount(host, { showUI: true, framePadding: 1.35, centerBiasY: 0.08 });
        }
      } catch (e) {}
    } else if(card.img) {
      const img = document.createElement('img');
      img.src = card.img;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      cardImage.appendChild(img);
    } else {
      cardImage.style.display = 'none';
      cardFrontText.textContent = card.title || card.frontText;
      cardFrontText.style.display = 'flex';
      cardFrontText.style.alignItems = 'center';
      cardFrontText.style.justifyContent = 'center';
    }
    // Botão Avançar movido para o card inicial (modo prática)
    if (currentMode === 'pratica') {
      // ajustar cardImage para empilhar verticalmente e centralizar
      cardImage.style.flexDirection = 'column';
      if (card.type === 'microscope') {
        cardImage.style.justifyContent = 'stretch';
        cardImage.style.alignItems = 'stretch';
      } else {
        cardImage.style.justifyContent = 'center';
        cardImage.style.alignItems = 'center';
      }
      cardImage.style.position = 'relative';
      
      const advanceBar = document.createElement('div');
      advanceBar.className = 'advance-toolbar';
      
      const advanceBtn = document.createElement('button');
      advanceBtn.type = 'button';
      advanceBtn.className = 'advance-btn shimmer-btn';
      advanceBtn.innerHTML = '<span class="text">Avançar</span><span class="shimmer"></span>';
      advanceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentIndex < currentFlashcards.length - 1) {
          currentIndex++;
          renderCurrentCardWithAnadixTransition();
        }
      });
      advanceBar.appendChild(advanceBtn);
      cardImage.appendChild(advanceBar);
    }
  } else {
    // Lógica dos Cards Normais
    if (card.img) {
      const img = document.createElement('img');
      img.src = card.img;
      img.alt = "Imagem do card";
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      
      currentImageUrl = card.img;
      zoomBtn.style.display = 'block';
      
      cardImage.appendChild(img);
    } else {
      cardImage.style.display = 'none';
      cardFrontText.style.display = 'flex';
      cardFrontText.style.height = '100%';
      cardFrontText.style.alignItems = 'center';
      cardFrontText.style.justifyContent = 'center';
      cardFrontText.style.fontSize = '1.5rem';
      cardFrontText.style.fontWeight = 'bold';
    }
  }
  
  flashcard.classList.remove('flipped');

  // Controle dos botões (prevBtn, nextBtn e shuffleBtn removidos)
}



function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- Funções para o Jogo Interativo (Hotspots) ---
function createInteractiveContainer() {
  let existing = document.getElementById(interactiveId);
  if (existing) return existing;

  const container = document.createElement('div');
  container.id = interactiveId;
  container.className = 'game-layout';

  const left = document.createElement('div');
  left.className = 'game-left';
  container.appendChild(left);

  const right = document.createElement('div');
  right.className = 'game-right';
  container.appendChild(right);

  const flashcardScreenEl = document.getElementById('flashcardScreen');
  const controls = flashcardScreenEl.querySelector('.controls');
  flashcardScreenEl.insertBefore(container, controls);

  return container;
}

function renderGame(card) {
  // Se o card anterior era o microscópio, descarte a instância antes de limpar o DOM.
  try { if (window.Microscope3D && typeof window.Microscope3D.disposeAll === 'function') window.Microscope3D.disposeAll(); } catch (e) {}
  // garantir que o flashcard não esteja virado e manter o card padrão visível
  const flashcardEl = document.querySelector('.card');
  if (flashcardEl) flashcardEl.classList.remove('flipped');
  const cardContainer = document.querySelector('.card-container');
  if (cardContainer) cardContainer.style.display = '';

  // remover zoom button se presente
  if (zoomBtn) zoomBtn.style.display = 'none';

  // vamos inserir o layout de jogo DENTRO do cardImage, ao lado da imagem
  cardImage.innerHTML = '';
  cardImage.style.display = 'flex';
  cardImage.style.position = 'relative';

  // game layout (dentro do card)
  const gameLayout = document.createElement('div');
  gameLayout.className = 'game-layout';
  gameLayout.style.width = '100%';
  gameLayout.style.height = '100%';

  const left = document.createElement('div');
  left.className = 'game-left';
  left.style.height = '100%';
  // empilhar imagem e botão verticalmente e centralizar
  try {
    // Ajuste: empilhar imagem e botão, com a imagem ocupando espaço principal
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.justifyContent = 'flex-start';
    left.style.alignItems = 'center';
    left.style.paddingTop = '24px';
    left.style.paddingBottom = '24px';
  } catch (e) {}
  gameLayout.appendChild(left);

  const right = document.createElement('div');
  right.className = 'game-right';
  gameLayout.appendChild(right);

  // inserir o layout dentro do cardImage
  cardImage.appendChild(gameLayout);

  // imagem dentro da coluna esquerda
  const img = document.createElement('img');
  img.src = card.img;
  img.alt = 'Imagem do card (interativa)';
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.flex = '1 1 auto';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  // anexar imagem diretamente ao container esquerdo (sem wrapper) — preserva tamanho original
  left.appendChild(img);

  // detecta se a imagem é majoritariamente escura ou clara para escolher cor dos hotspots
  // (hotspot color logic removed — restoring previous static visuals)

  // Painel tipo caderno na direita
  const notebook = document.createElement('div');
  notebook.className = 'notebook-panel';
  // título removido conforme solicitado (painel ficará sem título)
  const list = document.createElement('div');
  list.className = 'notebook-list';
  notebook.appendChild(list);

  // snapshot das referências iniciais (as definidas no código) - não podem ser editadas
  const initialRefIds = (card.references || []).map(r => r.id + '');

  // helper: cria um elemento de referência editável
  function createRefItem(ref) {
    const item = document.createElement('div');
    item.className = 'ref-item';
    item.setAttribute('data-ref-id', ref.id);
    const isLocked = initialRefIds.indexOf(String(ref.id)) !== -1;
    if (isLocked) item.classList.add('locked');

    // index span (updated by refreshRefsUI)
    const idxSpan = document.createElement('span');
    idxSpan.className = 'ref-index';
    idxSpan.textContent = '0';
    item.appendChild(idxSpan);

    // label area (editable only if not locked)
    const label = document.createElement('div');
    label.className = 'ref-label';
    label.contentEditable = !isLocked;
    label.spellcheck = false;
    label.textContent = ref.label || '';
    item.appendChild(label);

    // selection behavior: clicking anywhere selects the item
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const prev = list.querySelector('.ref-item.selected');
      if (prev && prev !== item) prev.classList.remove('selected');
      item.classList.add('selected');
      selectedRefId = ref.id;
      if (!isLocked) {
        // focus label and place caret at end
        const range = document.createRange();
        range.selectNodeContents(label);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        label.focus();
      }
    });

    if (!isLocked) {
      label.addEventListener('blur', () => {
        const text = label.textContent.trim();
        const idx = (card.references || []).findIndex(rr => String(rr.id) === String(ref.id));
        if (idx !== -1) card.references[idx].label = text;
        item.classList.remove('selected');
        selectedRefId = null;
        refreshHotspotsUI();
        refreshRefsUI();
      });
    }
    return item;
  }
  // renderizar referências iniciais no painel (se houver)
  (card.references || []).forEach(r => {
    const it = createRefItem(r);
    list.appendChild(it);
  });
  // garantir que a numeração esteja correta
  if (typeof refreshRefsUI === 'function') refreshRefsUI();
  
  notebook.appendChild(list);

  // botão Adicionar logo abaixo da lista de opções (dentro do notebook)
  const toolbar = document.createElement('div');
  toolbar.className = 'notebook-toolbar';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-point-btn';
  addBtn.type = 'button';
  addBtn.textContent = 'Adicionar';
  toolbar.appendChild(addBtn);
  notebook.appendChild(toolbar);

  right.appendChild(notebook);

  // botão Avançar padronizado — canto inferior direito do card (anexado ao cardImage/gameLayout)
  const advanceBar = document.createElement('div');
  advanceBar.className = 'advance-toolbar';
  const advanceBtn = document.createElement('button');
  advanceBtn.className = 'advance-btn shimmer-btn';
  advanceBtn.type = 'button';
  advanceBtn.innerHTML = '<span class="text">Avançar</span><span class="shimmer"></span>';
  advanceBar.appendChild(advanceBtn);
  // anexar ao gameLayout (ou cardImage) para que fique no canto do card
  gameLayout.appendChild(advanceBar);

  // helper: dispara confetti uma vez, carregando a lib sob demanda se necessário
  function _fireConfettiOnce() {
    // Respeitar usuários que preferem reduzir movimento
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
    } catch (e) {}
    try {
      // cria/obtém um launcher que usa um canvas overlay com z-index alto
      function _createLauncherAndFire() {
        try {
          if (!window.__confettiLauncher) {
            // criar canvas overlay para garantir que os confetes fiquem acima de tudo
            const canvas = document.createElement('canvas');
            canvas.id = '__confetti_canvas';
            canvas.style.position = 'fixed';
            canvas.style.inset = '0';
            canvas.style.left = '0';
            canvas.style.top = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999999';
            document.body.appendChild(canvas);
            if (window.confetti && typeof window.confetti.create === 'function') {
              window.__confettiLauncher = window.confetti.create(canvas, { resize: true });
            } else {
              // fallback: call global confetti if create is not present
              window.__confettiLauncher = function(opts) { try { window.confetti(opts); } catch(e){} };
            }
          }
          try { window.__confettiLauncher({ particleCount: 120, spread: 70, origin: { y: 0.6 } }); } catch(e) { console.error('confetti error', e); }
        } catch (e) { console.error('Erro criando launcher de confetti', e); }
      }

      if (window.confetti && typeof window.confetti.create === 'function') {
        _createLauncherAndFire();
        return;
      }
      // carregar lib dinamicamente e então criar launcher
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
      s.async = true;
      s.onload = function() {
        try {
          if (window.confetti) {
            _createLauncherAndFire();
          }
        } catch(e) { console.error('confetti onload error', e); }
      };
      s.onerror = function() { console.warn('Falha ao carregar a lib de confetti'); };
      document.head.appendChild(s);
    } catch (e) {
      console.error('Erro ao tentar disparar confetti', e);
    }
  }

  // estado interno
  const hotspotState = {}; // hotspotId -> refId
  // estado visual: 'selected' (amarelo) ou 'correct' (verde)
  const hotspotVisualState = {}; // hotspotId -> 'selected' | 'correct'
  const hotspotTimers = {}; // hotspotId -> timeoutId
  let selectedRefId = null;
  let addMode = false;
  // cache de elementos de hotspot para evitar querySelector repetidas
  const hotspotElements = {};
  // cache das dimensões da imagem/container para evitar muitos getBoundingClientRect()
  let imgRectCache = null;
  let renderedImgRectCache = null;
  let leftRectCache = null;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Retângulo da ÁREA RENDERIZADA da imagem dentro do elemento <img>
  // (importante quando o <img> cresce via flex e usa object-fit: contain)
  function getRenderedImageRect(imgEl) {
    const rect = imgEl.getBoundingClientRect();
    const iw = Number(imgEl.naturalWidth) || 0;
    const ih = Number(imgEl.naturalHeight) || 0;
    if (!iw || !ih || !rect.width || !rect.height) return rect;

    const scale = Math.min(rect.width / iw, rect.height / ih);
    const rw = iw * scale;
    const rh = ih * scale;
    const ox = (rect.width - rw) / 2;
    const oy = (rect.height - rh) / 2;

    return {
      left: rect.left + ox,
      top: rect.top + oy,
      width: rw,
      height: rh,
      right: rect.left + ox + rw,
      bottom: rect.top + oy + rh
    };
  }

  // helper: seleciona um item de referência pelo id (marca visualmente e define selectedRefId)
  function selectRefById(refId) {
    // limpar seleção anterior
    const prev = list.querySelector('.ref-item.selected');
    if (prev) prev.classList.remove('selected');
    if (refId == null) { selectedRefId = null; return; }
    const item = list.querySelector(`.ref-item[data-ref-id="${refId}"]`);
    if (!item) { selectedRefId = null; return; }
    item.classList.add('selected');
    selectedRefId = refId;
    // rolar para o item caso esteja fora da viewport do painel
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function assignRefToHotspot(hotspotId, refId) {
    hotspotState[hotspotId] = refId;
    hotspotVisualState[hotspotId] = 'selected';

    // reinicia timer de revelação
    try {
      if (hotspotTimers[hotspotId]) clearTimeout(hotspotTimers[hotspotId]);
    } catch (e) {}

    const assignedSnapshot = String(refId);
    hotspotTimers[hotspotId] = setTimeout(() => {
      try {
        // se o usuário mudou a escolha nesse meio tempo, ignora
        if (String(hotspotState[hotspotId] ?? '') !== assignedSnapshot) return;

        const hot = (card.hotspots || []).find(x => String(x.id) === String(hotspotId));
        const correctRefId = hot ? hot.correctRefId : null;

        if (correctRefId != null && String(correctRefId) === assignedSnapshot) {
          hotspotVisualState[hotspotId] = 'correct';
        } else {
          // incorreto: permanece amarelo
          hotspotVisualState[hotspotId] = 'selected';
        }
        refreshHotspotsUI();
      } catch (e) {}
    }, 2000);

    refreshHotspotsUI();
    refreshRefsUI();
  }

  function refreshHotspotsUI() {
    // atualiza visual dos hotspots e da lista
    (card.hotspots || []).forEach(h => {
      const el = hotspotElements[h.id] || left.querySelector(`.hotspot[data-hotspot-id="${h.id}"]`);
      if (el && !hotspotElements[h.id]) hotspotElements[h.id] = el;
      if (!el) return;
      el.classList.remove('correct','wrong','selected');
      const assigned = hotspotState[h.id];

      if (assigned) {
        // mostra o número REAL escolhido (id da referência)
        el.textContent = String(assigned);
        el.dataset.assigned = String(assigned);
        el.dataset.numbered = '1';

        const vs = hotspotVisualState[h.id] || 'selected';
        if (vs === 'correct') el.classList.add('correct');
        else el.classList.add('selected');
      } else {
        el.textContent = '';
        el.dataset.assigned = '';
        delete el.dataset.numbered;
        delete hotspotVisualState[h.id];
      }
    });

    // marca itens da lista como atribuídos se existirem hotspots vinculados
    (card.references || []).forEach(r => {
      const item = list.querySelector(`.ref-item[data-ref-id="${r.id}"]`);
      if (!item) return;
      const used = Object.values(hotspotState).some(val => val === r.id);
      if (used) item.classList.add('assigned'); else item.classList.remove('assigned');
    });
  }

  // atualiza os índices/numeração da lista de referências
  function refreshRefsUI() {
    (card.references || []).forEach((r, i) => {
      const item = list.querySelector(`.ref-item[data-ref-id="${r.id}"]`);
      if (!item) return;
      const idxSpan = item.querySelector('.ref-index');
      if (idxSpan) idxSpan.textContent = `${i + 1} -`;
    });
  }

  function createHotspotElement(h) {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.dataset.hotspotId = h.id;
    // posicionar o hotspot em pixels relativo ao container `left`, calculando
    // a partir das porcentagens armazenadas (se existirem) usando as dimensões atuais da imagem
    try {
      const imgRect = renderedImgRectCache || imgRectCache || getRenderedImageRect(img);
      const leftRect = leftRectCache || left.getBoundingClientRect();
      if (typeof h.left === 'string' && h.left.includes('%')) {
        const pctX = parseFloat(h.left) / 100;
        const px = (imgRect.left - leftRect.left) + pctX * imgRect.width;
        el.style.left = `${px}px`;
      } else if (typeof h.left === 'string' && h.left.endsWith('px')) {
        el.style.left = h.left;
      } else if (typeof h.left === 'number') {
        el.style.left = `${h.left}px`;
      } else {
        el.style.left = h.left || '0px';
      }

      if (typeof h.top === 'string' && h.top.includes('%')) {
        const pctY = parseFloat(h.top) / 100;
        const py = (imgRect.top - leftRect.top) + pctY * imgRect.height;
        el.style.top = `${py}px`;
      } else if (typeof h.top === 'string' && h.top.endsWith('px')) {
        el.style.top = h.top;
      } else if (typeof h.top === 'number') {
        el.style.top = `${h.top}px`;
      } else {
        el.style.top = h.top || '0px';
      }
    } catch (err) {
      // fallback: aplicar valores brutos
      el.style.top = h.top;
      el.style.left = h.left;
    }
    el.dataset.assigned = '';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (addMode) return; // se em modo adicionar, ignorar cliques em hotspots

      const hid = h.id;

      if (selectedRefId) {
        assignRefToHotspot(hid, selectedRefId);
        // limpa seleção após atribuir
        const prev = notebook.querySelector('.ref-item.selected');
        if (prev) prev.classList.remove('selected');
        selectedRefId = null;
        return;
      }

      // se o hotspot já tem uma referência atribuída, abrir o menu para permitir trocar
      if (hotspotState[hid]) {
        openHotspotMenuAt(el, h);
        return;
      }

      // se não havia ordenação, abrir o menu de atribuição para escolher a referência
      openHotspotMenuAt(el, h);
      return;
    });

    // abrir menu de atribuição ao clicar com o botão direito
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (addMode) return;
      openHotspotMenuAt(el, h);
    });
    // anexar hotspot ao container esquerdo (mesmo lugar da imagem)
    left.appendChild(el);
    // cachear o elemento para acessos rápidos
    hotspotElements[h.id] = el;
    return el;
  }

  // fecha menus abertos
  function closeAllHotspotMenus() {
    const existing = left.querySelectorAll('.hotspot-menu');
    existing.forEach(m => m.remove());
  }

  // abre menu de atribuição posicionado próximo ao elemento hotspot
  function openHotspotMenuAt(el, h) {
    closeAllHotspotMenus();
    const menu = document.createElement('div');
    menu.className = 'hotspot-menu';
    menu.dataset.forHotspot = h.id;

    const currentAssigned = hotspotState[h.id];

    (card.references || []).forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'hotspot-menu-btn';
      btn.textContent = `${r.label || ''}`;
      if (currentAssigned != null && String(currentAssigned) === String(r.id)) {
        btn.setAttribute('aria-current', 'true');
        btn.dataset.selected = '1';
      }
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        assignRefToHotspot(h.id, r.id);
        menu.remove();
      });
      menu.appendChild(btn);
    });

    left.appendChild(menu);
    // garantir z-index alto inline caso a imagem/container crie outro stacking context
    menu.style.zIndex = '9999';
    // posicionar relativo ao container esquerdo
    const hotspotRect = el.getBoundingClientRect();
    const parentRect = left.getBoundingClientRect();
    let topPx = hotspotRect.top - parentRect.top + hotspotRect.height + 6;
    let leftPx = hotspotRect.left - parentRect.left;
    // ajustar se sair do painel à direita
    const menuW = menu.offsetWidth || 220;
    if (leftPx + menuW > parentRect.width) leftPx = parentRect.width - menuW - 8;
    // aplicar posições
    menu.style.top = `${topPx}px`;
    menu.style.left = `${leftPx}px`;
  }

  // fechar menus ao clicar fora
  document.addEventListener('click', (e) => { closeAllHotspotMenus(); }, { passive: true });

  // renderizar hotspots existentes
  // calcular e armazenar retângulos uma vez para evitar múltiplos reflows
  function updateRects() {
    try {
      imgRectCache = img.getBoundingClientRect();
      renderedImgRectCache = getRenderedImageRect(img);
      leftRectCache = left.getBoundingClientRect();
    } catch (e) {
      imgRectCache = null;
      renderedImgRectCache = null;
      leftRectCache = null;
    }
  }

  function repositionHotspots() {
    (card.hotspots || []).forEach(h => {
      const el = hotspotElements[h.id];
      if (!el) return;
      try {
        const imgRect = renderedImgRectCache || imgRectCache || getRenderedImageRect(img);
        const leftRect = leftRectCache || left.getBoundingClientRect();
        if (typeof h.left === 'string' && h.left.includes('%')) {
          const pctX = parseFloat(h.left) / 100;
          const px = (imgRect.left - leftRect.left) + pctX * imgRect.width;
          el.style.left = `${px}px`;
        }
        if (typeof h.top === 'string' && h.top.includes('%')) {
          const pctY = parseFloat(h.top) / 100;
          const py = (imgRect.top - leftRect.top) + pctY * imgRect.height;
          el.style.top = `${py}px`;
        }
      } catch (e) {
        // ignore - keep previous positions
      }
    });
  }

  updateRects();
  (card.hotspots || []).forEach(h => {
    createHotspotElement(h);
  });
  // garantir que os hotspots estejam posicionados corretamente
  repositionHotspots();

  // atualizar caches e reposicionar em resize / quando a imagem carregar
  // remove listeners anteriores (se existirem) e registra os novos para esta instância
  try {
    if (window.__hotspot_resize_handler) window.removeEventListener('resize', window.__hotspot_resize_handler);
  } catch (e) {}
  // Debounce resize to avoid excessive repositioning
  window.__hotspot_resize_handler = () => { updateRects(); repositionHotspots(); };
  if (window.__hotspot_resize_debounced) {
    window.removeEventListener('resize', window.__hotspot_resize_debounced);
  }
  window.__hotspot_resize_debounced = (() => {
    let rafId = null;
    return function() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        try { window.__hotspot_resize_handler(); } catch (e) {}
      });
    };
  })();
  window.addEventListener('resize', window.__hotspot_resize_debounced, { passive: true });

  try {
    if (window.__hotspot_lastImg && window.__hotspot_imgload_handler) window.__hotspot_lastImg.removeEventListener('load', window.__hotspot_imgload_handler);
  } catch (e) {}
  window.__hotspot_imgload_handler = () => { updateRects(); repositionHotspots(); };
  window.__hotspot_lastImg = img;
  img.addEventListener('load', window.__hotspot_imgload_handler, { once: true });

  // adicionar comportamento do botão 'Adicionar Ponto'
  addBtn.addEventListener('click', () => {
    // Sempre copia as referências atuais (para o ADM colar no JSON)
    // - Silencioso: não abre prompt em caso de falha para não atrapalhar jogadores.
    try {
      const refs = Array.isArray(card.references) ? card.references : [];
      const IND = '          ';
      const refsLines = refs.map((r, idx) => {
        const id = r && (typeof r.id === 'number' || typeof r.id === 'string') ? r.id : '';
        const label = (r && typeof r.label === 'string') ? r.label : '';
        const comma = (idx < refs.length - 1) ? ',' : '';
        return `${IND}  { "id": ${id}, "label": ${JSON.stringify(label)} }${comma}`;
      });

      const refsSnippet = [
        `${IND}"references": [`,
        ...refsLines,
        `${IND}],`
      ].join('\n');

      if (refsSnippet && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(refsSnippet).catch(() => {
          try { console.warn('[Hotspots] Falha ao copiar references para o clipboard'); } catch (e) {}
        });
      }
    } catch (e) {}

    addMode = !addMode;
    // atualizar texto do botão simples (não tem .text span)
    addBtn.textContent = addMode ? 'Clique na imagem para adicionar' : 'Adicionar';

    // Durante o modo adicionar, permitir clicar mesmo se o balão da Anadix estiver por cima.
    try { document.body.classList.toggle('hotspot-add-mode', !!addMode); } catch (e) {}
  });

  

  // clique na área da imagem para criar ponto quando em addMode
  function __suggestNextHotspotId() {
    try {
      const hs = Array.isArray(card.hotspots) ? card.hotspots : [];
      let maxN = 0;
      hs.forEach(h => {
        const id = h && typeof h.id === 'string' ? h.id : '';
        const m = /^h(\d+)$/.exec(id.trim());
        if (m) {
          const n = Number(m[1]);
          if (Number.isFinite(n) && n > maxN) maxN = n;
        }
      });
      return 'h' + String(maxN + 1);
    } catch (e) {
      return 'h1';
    }
  }

  function __tryAddHotspotAtClientPoint(clientX, clientY) {
    if (!addMode) return false;
    // calcula posição relativa dentro da ÁREA RENDERIZADA (evita erro com object-fit: contain)
    const rect = renderedImgRectCache || getRenderedImageRect(img);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return false;

    const leftPctNum = clamp((x / rect.width) * 100, 0, 100);
    const topPctNum = clamp((y / rect.height) * 100, 0, 100);
    const leftPct = leftPctNum.toFixed(0) + '%';
    const topPct = topPctNum.toFixed(0) + '%';
    const suggestedId = __suggestNextHotspotId();
    const newHot = { id: suggestedId, top: topPct, left: leftPct };
    card.hotspots = card.hotspots || [];
    card.hotspots.push(newHot);

    // Copiar snippet do hotspot SEMPRE, já pronto para colar no JSON:
    // - id sugerido como hN (baseado no que já existe no card)
    // - top/left conforme o clique
    // - correctRefId: placeholder numérico (0) para você trocar pelo id da opção
    try {
      const refs = card.references || [];
      const hasSelectedRef = (selectedRefId != null) && refs.some(r => String(r.id) === String(selectedRefId));
      const snippetHotspot = `{ "id": "${suggestedId}", "top": "${topPct}", "left": "${leftPct}", "correctRefId": 0 },`;

      if (hasSelectedRef) {
        newHot.correctRefId = selectedRefId;
      }

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(snippetHotspot).then(() => {
            try {
              addBtn.textContent = 'Copiado!';
              setTimeout(() => { try { if (!addMode) addBtn.textContent = 'Adicionar'; } catch (e) {} }, 900);
            } catch (e) {}
          }).catch(() => {
            try { window.prompt('Copie e cole no JSON:', snippetHotspot); } catch (e) {}
          });
        } else {
          try { window.prompt('Copie e cole no JSON:', snippetHotspot); } catch (e) {}
        }
      } catch (e) {
        try { window.prompt('Copie e cole no JSON:', snippetHotspot); } catch (e2) {}
      }
    } catch (e) {}

    // cria o hotspot (atribuição é livre via menu/seleção)
    createHotspotElement(newHot);
    try { updateRects(); repositionHotspots(); } catch (e) {}
    addMode = false;
    addBtn.textContent = 'Adicionar';
    try { document.body.classList.remove('hotspot-add-mode'); } catch (e) {}

    refreshHotspotsUI();
    return true;
  }

  // Captura em nível global (fase capture) para funcionar mesmo se o clique cair no balão/Anadix.
  try {
    if (window.__hotspot_add_capture_handler) {
      document.removeEventListener('click', window.__hotspot_add_capture_handler, true);
    }
  } catch (e) {}

  window.__hotspot_add_capture_handler = (ev) => {
    try {
      if (!addMode) return;
      const handled = __tryAddHotspotAtClientPoint(ev.clientX, ev.clientY);
      if (!handled) return;
      try { ev.preventDefault(); } catch (e) {}
      try { ev.stopPropagation(); } catch (e) {}
      try { if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation(); } catch (e) {}
    } catch (e) {}
  };
  document.addEventListener('click', window.__hotspot_add_capture_handler, true);

  // Fallback local (caso algum browser não dispare o capture como esperado)
  left.addEventListener('click', (ev) => {
    try { __tryAddHotspotAtClientPoint(ev.clientX, ev.clientY); } catch (e) {}
  });

  // rotina de verificação compartilhada: marca hotspots, mostra feedback e retorna se está tudo correto
  function verifyAndFeedback() {
    (card.hotspots || []).forEach(h => {
      const el = hotspotElements[h.id] || left.querySelector(`.hotspot[data-hotspot-id="${h.id}"]`);
      if (el && !hotspotElements[h.id]) hotspotElements[h.id] = el;
      if (!el) return;
      el.classList.remove('correct','wrong');
      const chosen = hotspotState[h.id];

      if (h.correctRefId && chosen != null) {
        if (String(chosen) === String(h.correctRefId)) {
          hotspotVisualState[h.id] = 'correct';
          el.classList.add('correct');
        } else {
          // incorreto: permanece amarelo
          hotspotVisualState[h.id] = 'selected';
        }
      }
    });
    const hotspots = (card.hotspots || []).filter(h => !!h.correctRefId);
    const allCorrect = hotspots.length > 0 && hotspots.every(h => hotspotState[h.id] === h.correctRefId);
    lastVerifySuccess = allCorrect;
    // coletar dados de revisão para este card
    try {
      const result = { id: card.id, img: card.img || currentImageUrl || '', items: [] };
      hotspots.forEach(h => {
        const chosen = hotspotState[h.id];
        const refLabel = (card.references || []).find(r => r.id === (chosen ?? h.correctRefId))?.label || '';
        const correctLabel = (card.references || []).find(r => r.id === h.correctRefId)?.label || '';
        result.items.push({
          hotspotId: h.id,
          chosenRefId: chosen,
          correctRefId: h.correctRefId,
          chosenLabel: refLabel,
          correctLabel: correctLabel,
          isCorrect: !!(chosen === h.correctRefId)
        });
      });
      const idx = reviewResults.findIndex(r => r.id === result.id);
      if (idx >= 0) reviewResults[idx] = result; else reviewResults.push(result);
    } catch(e) {}
    showFeedback(allCorrect);
    if (allCorrect) setTimeout(() => { _fireConfettiOnce(); }, 150);
    return allCorrect;
  }

  // popup de feedback simples
  function showFeedback(success) {
    try {
      const existing = document.getElementById('feedback-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'feedback-modal';
      modal.className = 'feedback-modal';
      const content = document.createElement('div');
      content.className = 'feedback-content ' + (success ? 'success' : 'error');
      content.textContent = success ? 'Parabéns! Você acertou tudo.' : 'Não está correto!';
      modal.appendChild(content);
      const actions = document.createElement('div');
      actions.className = 'feedback-actions';

      if (!success) {
        const retry = document.createElement('button');
        retry.className = 'btn';
        retry.textContent = 'Tentar novamente.';
        retry.addEventListener('click', () => {
          try { modal.remove(); } catch (e) {}
        });
        actions.appendChild(retry);
      }

      const ok = document.createElement('button');
      ok.className = 'btn';
      ok.textContent = success ? 'Continuar' : 'Ok, continuar mesmo assim.';
      ok.addEventListener('click', () => {
        try {
          modal.remove();
          // contabiliza acerto se o último veredito foi sucesso
          if (lastVerifySuccess) correctCount++;
          // Avança quando o usuário confirmar no popup ou mostra resumo ao final
          const totalPlayable = currentFlashcards.filter(c => !c.isWelcome).length;
          const isLast = currentIndex >= currentFlashcards.length - 1;
          if (isLast) {
            showFinalSummary(totalPlayable);
          } else {
            currentIndex++;
            renderCurrentCardWithAnadixTransition();
          }
        } catch(e) {}
      });
      actions.appendChild(ok);
      modal.appendChild(actions);
      document.body.appendChild(modal);
    } catch (e) { /* ignore */ }
  }

  // botão unificado: verifica e, se correto, avança
  advanceBtn.addEventListener('click', () => {
    const ok = verifyAndFeedback();
    if (ok) {
      // não avançar automaticamente, esperar o usuário clicar em "Continuar"
      // setTimeout foi removido
    }
  });

  function showFinalSummary(totalPlayable) {
    try {
      const existing = document.getElementById('final-summary-modal');
      if (existing) existing.remove();

      const host = document.getElementById('cardImage');
      if (!host) return;

      // Anadix: vamos manter visível no Resultado, mas dentro do overlay
      // (necessário para o robô conseguir sobrepor a Anadix via z-index).
      let anadixEl = null;
      let anadixPrevParent = null;
      let anadixPrevNext = null;
      try {
        anadixEl = document.getElementById('assistente-fixo');
        if (anadixEl && anadixEl.parentNode) {
          anadixPrevParent = anadixEl.parentNode;
          anadixPrevNext = anadixEl.nextSibling;
        }
      } catch (e) {}

      // Estado: overlay de resultado aberto (usado para reposicionar a Anadix via CSS)
      try {
        const anadix = document.getElementById('assistente-fixo');
        if (anadix) anadix.classList.add('anadix-result-open');
      } catch (e) {}

      const modal = document.createElement('div');
      modal.id = 'final-summary-modal';
      modal.className = 'result-overlay final-summary-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      // Colocar a Anadix dentro do overlay para compartilhar o mesmo stacking context
      try {
        if (anadixEl) modal.appendChild(anadixEl);
      } catch (e) {}

      const safeTotal = Math.max(0, Number(totalPlayable) || 0);
      const safeCorrect = Math.max(0, Number(correctCount) || 0);
      const pct = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;

      // Regra (como você descreveu):
      // - < 50%: abaixo da média (triste)
      // - >= 50%: acima da média (parabéns)
      // A estrela deve aparecer sempre que houver perguntas (safeTotal > 0).
      const passed = safeTotal > 0 && safeCorrect >= Math.ceil(safeTotal / 2);
      const starMode = safeTotal > 0 ? (passed ? 'celebrate' : 'sad') : 'none';

      const resultCfg = (() => {
        try {
          const cfg = window.__praticaResultConfig;
          if (cfg && typeof cfg === 'object') return cfg;
        } catch (e) {}
        return __PRACTICA_RESULT_DEFAULT;
      })();

      // No Resultado, o balão da Anadix deve exibir uma mensagem específica.
      try {
        const msg = (typeof resultCfg.anadixSpeech === 'string' && resultCfg.anadixSpeech.trim())
          ? resultCfg.anadixSpeech
          : __PRACTICA_RESULT_DEFAULT.anadixSpeech;
        if (window.__anadixBalloon && typeof window.__anadixBalloon.forceReappear === 'function') {
          try { if (typeof window.__anadixBalloon.setManualOnly === 'function') window.__anadixBalloon.setManualOnly(false); } catch (_) {}
          window.__anadixBalloon.forceReappear(msg);
        }
      } catch (e) {}

      const content = document.createElement('div');
      content.className = 'feedback-content final-summary-content ' + (passed ? 'success' : 'error');

      try { modal.classList.add(passed ? 'is-passed' : 'is-failed'); } catch (e) {}

      const title = document.createElement('div');
      title.className = 'final-summary-title';
      title.textContent = 'Resultado';
      content.appendChild(title);

      // palco: robô + balão se movem juntos
      const stage = document.createElement('div');
      stage.className = 'final-summary-stage';

      const speech = document.createElement('div');
      speech.className = 'speech';

      const speechLine1 = document.createElement('div');
      speechLine1.className = 'speech-line speech-line-1';
      speechLine1.textContent = `${pct}% de acertos`;

      const speechLine2 = document.createElement('div');
      speechLine2.className = 'speech-line speech-line-2 ' + (passed ? 'is-passed' : 'is-failed');
      speechLine2.textContent = `Acertos: ${safeCorrect}/${safeTotal}`;

      speech.appendChild(speechLine1);
      speech.appendChild(speechLine2);

      // Dica (discreta) para a estrela: mostrar apenas quando a estrela existir
      if (starMode !== 'none') {
        const hintText = (() => {
          try {
            // Se vier vazio no JSON, não mostrar
            if (typeof resultCfg.hint === 'string') return resultCfg.hint;
          } catch (e) {}
          return __PRACTICA_RESULT_DEFAULT.hint;
        })();

        if (typeof hintText === 'string' && hintText.trim()) {
          const speechHint = document.createElement('div');
          speechHint.className = 'speech-line speech-hint';
          speechHint.textContent = hintText;
          speech.appendChild(speechHint);
        }
      }
      stage.appendChild(speech);

      // Colecionáveis: múltiplas estrelas + múltiplos balões (modo triste), ou 1 estrela (modo parabéns)
      // Regra: nenhuma mensagem pode abrir antes do robô se mover até a estrela.
      let hasMovedSinceOpen = false;
      const STAR_LOCAL = 'assets/flower.png';
      const STAR_URL = 'https://i.ibb.co/3Y6M5V7/flower.png';
      const COLLECTIBLE_SIZE = 52;
      const collectibles = [];

      // No modo triste, a mensagem deve seguir a ORDEM DE COLETA (e não a ordem/posição das estrelas).
      // Padrão solicitado:
      // 1) "Fiquei triste, precisa estudar mais."
      // 2) "Acredito na sua capacidade."
      // 3) "Você consegue!"
      const sadMessagesByOrder = (() => {
        if (starMode !== 'sad') return null;
        const list = Array.isArray(resultCfg.sadMessages)
          ? resultCfg.sadMessages.filter(s => typeof s === 'string').map(s => s.trim()).filter(Boolean)
          : [];
        return (list && list.length) ? list : __PRACTICA_RESULT_DEFAULT.sadMessages.slice();
      })();
      let sadCollectedCount = 0;

      const createSpeechSecondary = (message) => {
        const el = document.createElement('div');
        el.className = 'speech speech-secondary is-hidden';
        el.textContent = String(message || '');
        modal.appendChild(el);
        return el;
      };

      const createStarEl = () => {
        const el = document.createElement('img');
        el.className = 'collectible-star';
        el.src = STAR_LOCAL;
        el.addEventListener('error', () => {
          try { el.src = STAR_URL; } catch (e) {}
        }, { once: true });
        try { el.crossOrigin = 'anonymous'; } catch (e) {}
        try { el.referrerPolicy = 'no-referrer'; } catch (e) {}
        el.alt = '';
        el.decoding = 'async';
        try { el.setAttribute('draggable', 'false'); } catch (e) {}
        el.setAttribute('aria-hidden', 'true');
        return el;
      };

      const addCollectible = (message) => {
        const item = {
          message: String(message || ''),
          starEl: null,
          speechEl: null,
          collected: false,
          pinned: false,
          pinnedLeft: 0,
          pinnedTop: 0
        };
        item.speechEl = createSpeechSecondary(item.message);
        if (starMode !== 'none') {
          item.starEl = createStarEl();
          modal.appendChild(item.starEl);
        }
        collectibles.push(item);
        return item;
      };

      if (starMode === 'celebrate') {
        const msg = (typeof resultCfg.celebrateMessage === 'string' && resultCfg.celebrateMessage.trim())
          ? resultCfg.celebrateMessage
          : __PRACTICA_RESULT_DEFAULT.celebrateMessage;
        addCollectible(msg);
      } else if (starMode === 'sad') {
        // A mensagem será definida no momento da coleta, seguindo `sadMessagesByOrder`.
        const count = sadMessagesByOrder && sadMessagesByOrder.length ? sadMessagesByOrder.length : 3;
        for (let i = 0; i < count; i++) addCollectible('');
      }

      const perso = document.createElement('div');
      perso.className = 'perso';
      const eve = document.createElement('div');
      eve.className = 'eve';
      const head = document.createElement('div');
      head.className = 'head';
      const face = document.createElement('div');
      face.className = 'face';

      // olhos em duas camadas: neutro (original) + mood (passou/falhou)
      const eyesNeutral = document.createElement('div');
      eyesNeutral.className = 'eyes eyes-neutral';
      const eyesMood = document.createElement('div');
      eyesMood.className = 'eyes eyes-mood';
      face.appendChild(eyesNeutral);
      face.appendChild(eyesMood);

      head.appendChild(face);
      const body = document.createElement('div');
      body.className = 'body';
      const headshadow = document.createElement('div');
      headshadow.className = 'headshadow';
      body.appendChild(headshadow);
      eve.appendChild(head);
      eve.appendChild(body);
      const shadow = document.createElement('div');
      shadow.className = 'shadow';
      perso.appendChild(eve);
      perso.appendChild(shadow);
      stage.appendChild(perso);

      // controles (D-pad)
      const control = document.createElement('div');
      control.className = 'control';
      const btTop = document.createElement('button');
      btTop.type = 'button';
      btTop.className = 'bt bt_top';
      btTop.textContent = '<';
      const btRight = document.createElement('button');
      btRight.type = 'button';
      btRight.className = 'bt bt_right';
      btRight.textContent = '>';
      const btBottom = document.createElement('button');
      btBottom.type = 'button';
      btBottom.className = 'bt bt_bottom';
      btBottom.textContent = '>';
      const btLeft = document.createElement('button');
      btLeft.type = 'button';
      btLeft.className = 'bt bt_left';
      btLeft.textContent = '<';
      control.appendChild(btTop);
      control.appendChild(btRight);
      control.appendChild(btBottom);
      control.appendChild(btLeft);

      content.appendChild(stage);
      modal.appendChild(content);

      // O botão "Fechar" é posicionado relativo ao overlay (result-overlay).
      // Para alinhar o controle na mesma altura, o controle também precisa usar o overlay como referência.
      modal.appendChild(control);
      const actions = document.createElement('div');
      actions.className = 'feedback-actions';

      const restart = document.createElement('button');
      restart.className = 'advance-btn shimmer-btn';
      restart.type = 'button';
      restart.setAttribute('aria-label', 'Recomeçar');
      {
        const shimmer = document.createElement('span');
        shimmer.className = 'shimmer';
        const text = document.createElement('span');
        text.className = 'text';
        text.textContent = 'Reiniciar';
        restart.appendChild(shimmer);
        restart.appendChild(text);
      }

      const ok = document.createElement('button');
      ok.className = 'advance-btn shimmer-btn';
      ok.type = 'button';
      ok.setAttribute('aria-label', 'Fechar');
      {
        const shimmer = document.createElement('span');
        shimmer.className = 'shimmer';
        const text = document.createElement('span');
        text.className = 'text';
        text.textContent = 'Fechar';
        ok.appendChild(shimmer);
        ok.appendChild(text);
      }

      // movimentação (sem jQuery) - comportamento do original:
      // - cima/baixo: move apenas o robô
      // - esquerda/direita: move robô + balão juntos
      let roboOffsetX = 0;
      let roboOffsetY = 0;
      const step = 60;

      const getPx = (value) => {
        const n = parseFloat(String(value || '').replace('px', ''));
        return Number.isFinite(n) ? n : 0;
      };

      let roboBaseLeft = 0;
      let roboBaseTop = 0;

      // Wrap-around ("buraco de minhoca"): se sair por um lado, reaparece do outro.
      // Mantém ao menos N px visíveis para não desaparecer totalmente.
      const minVisible = 18;

      // Quando ocorrer wrap, precisamos "teleportar" sem transição.
      // Caso contrário, o CSS (transition) faz o robô atravessar a tela.
      const applyPositionsNoTransitionOnce = () => {
        const prevPersoTransition = perso.style.transition;
        const prevSpeechTransitions = [];
        try { perso.style.transition = 'none'; } catch (e) {}
        try {
          for (const c of collectibles) {
            if (!c || !c.speechEl) continue;
            prevSpeechTransitions.push([c.speechEl, c.speechEl.style.transition]);
            c.speechEl.style.transition = 'none';
          }
        } catch (e) {}
        applyPositions();
        // força o browser a aplicar o estilo sem transição
        try { void perso.offsetHeight; } catch (e) {}
        try {
          for (const c of collectibles) {
            if (c && c.speechEl) { try { void c.speechEl.offsetHeight; } catch (e) {} }
          }
        } catch (e) {}
        requestAnimationFrame(() => {
          try { perso.style.transition = prevPersoTransition; } catch (e) {}
          try {
            for (const t of prevSpeechTransitions) {
              try { t[0].style.transition = t[1]; } catch (e) {}
            }
          } catch (e) {}
        });
      };

      const wrapIfNeeded = () => {
        const bounds = modal.getBoundingClientRect();
        const r = perso.getBoundingClientRect();
        let adjustX = 0;
        let adjustY = 0;

        // saiu pela esquerda -> reaparece à direita
        if (r.right < bounds.left + minVisible) {
          adjustX = (bounds.right - minVisible) - r.left;
        }
        // saiu pela direita -> reaparece à esquerda
        else if (r.left > bounds.right - minVisible) {
          adjustX = (bounds.left + minVisible) - r.right;
        }

        // saiu por cima -> reaparece embaixo
        if (r.bottom < bounds.top + minVisible) {
          adjustY = (bounds.bottom - minVisible) - r.top;
        }
        // saiu por baixo -> reaparece em cima
        else if (r.top > bounds.bottom - minVisible) {
          adjustY = (bounds.top + minVisible) - r.bottom;
        }

        if (adjustX !== 0) {
          roboOffsetX += adjustX;
        }
        if (adjustY !== 0) {
          roboOffsetY += adjustY;
        }
        if (adjustX !== 0 || adjustY !== 0) {
          // teleporte instantâneo ao atravessar a borda
          applyPositionsNoTransitionOnce();
        }
      };

      const applyPositions = () => {
        perso.style.left = `${roboBaseLeft + roboOffsetX}px`;
        perso.style.top = `${roboBaseTop + roboOffsetY}px`;
        try {
          for (const c of collectibles) {
            if (!c || !c.speechEl) continue;
            if (c.pinned) {
              c.speechEl.style.left = `${c.pinnedLeft}px`;
              c.speechEl.style.top = `${c.pinnedTop}px`;
            }
          }
        } catch (e) {}
      };
      applyPositions();

      const rectIntersects = (a, b) => {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      };

      const getForbiddenRects = () => {
        const rects = [];
        const pad = 10;
        const add = (el) => {
          try {
            if (!el) return;
            const r = el.getBoundingClientRect();
            rects.push({
              left: r.left - pad,
              top: r.top - pad,
              right: r.right + pad,
              bottom: r.bottom + pad
            });
          } catch (e) {}
        };

        // Botões (Reiniciar/Fechar)
        try { add(modal.querySelector('.feedback-actions')); } catch (e) {}
        // D-pad
        try { add(modal.querySelector('.control')); } catch (e) {}

        // Anadix (avatar + balão): nunca permitir estrelas abaixo dela
        try {
          const anadix = document.getElementById('assistente-fixo');
          if (anadix) {
            // Preferir o retângulo do avatar (evita considerar o container gigante)
            const avatar = anadix.querySelector('.avatar_help_avatar');
            add(avatar || anadix);

            const balao = anadix.querySelector('#balao-fala');
            if (balao && balao.classList && balao.classList.contains('visivel')) {
              add(balao);
            }
          }
        } catch (e) {}

        return rects;
      };

      const getBalloonRects = () => {
        // Áreas ocupadas pelos balões: principal + secundários visíveis.
        const rects = [];
        const pad = 10;
        const addRect = (el) => {
          try {
            if (!el) return;
            if (el.classList && el.classList.contains('is-hidden')) return;
            const r = el.getBoundingClientRect();
            rects.push({
              left: r.left - pad,
              top: r.top - pad,
              right: r.right + pad,
              bottom: r.bottom + pad
            });
          } catch (e) {}
        };
        try { addRect(speech); } catch (e) {}
        try {
          for (const c of collectibles) {
            if (!c || !c.speechEl) continue;
            // só considera secundários já exibidos
            if (!c.pinned) continue;
            addRect(c.speechEl);
          }
        } catch (e) {}
        return rects;
      };

      const repositionRemainingStarsToAvoidBalloons = () => {
        // Reposiciona apenas estrelas ainda não coletadas que estejam embaixo de algum balão.
        try {
          const pad = 10;
          const starSize = COLLECTIBLE_SIZE;
          const w = Math.max(0, modal.clientWidth || 0);
          const h = Math.max(0, modal.clientHeight || 0);
          const maxX = Math.max(pad, w - starSize - pad);
          const maxY = Math.max(pad, h - starSize - pad);
          const roboRect = perso.getBoundingClientRect();
          const baseForbidden = getForbiddenRects();
          const balloonRects = getBalloonRects();
          const intersects = (ra, rb) => rectIntersects(ra, rb);

          // já colocadas (para não empilhar estrelas)
          const placedStarRects = [];
          for (const c of collectibles) {
            if (!c || !c.starEl || c.collected) continue;
            try {
              const r = c.starEl.getBoundingClientRect();
              placedStarRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, _c: c });
            } catch (e) {}
          }

          for (const c of collectibles) {
            if (!c || !c.starEl || c.collected) continue;
            let starRect;
            try { starRect = c.starEl.getBoundingClientRect(); } catch (e) { continue; }
            let underObstacle = false;
            for (const f of baseForbidden) {
              if (intersects(starRect, f)) { underObstacle = true; break; }
            }
            if (!underObstacle) {
              for (const br of balloonRects) {
                if (intersects(starRect, br)) { underObstacle = true; break; }
              }
            }
            if (!underObstacle) continue;

            // tenta achar novo spot que não colida com robô, botões/dpad e balões
            for (let i = 0; i < 35; i++) {
              const x = Math.round(pad + Math.random() * (maxX - pad));
              const y = Math.round(pad + Math.random() * (maxY - pad));
              c.starEl.style.left = `${x}px`;
              c.starEl.style.top = `${y}px`;
              c.starEl.style.width = `${starSize}px`;
              c.starEl.style.height = `${starSize}px`;

              const sr = c.starEl.getBoundingClientRect();
              let okSpot = !intersects(roboRect, sr);

              if (okSpot && baseForbidden.length) {
                for (const f of baseForbidden) {
                  if (intersects(sr, f)) { okSpot = false; break; }
                }
              }
              if (okSpot && balloonRects.length) {
                for (const br of balloonRects) {
                  if (intersects(sr, br)) { okSpot = false; break; }
                }
              }
              if (okSpot && placedStarRects.length) {
                for (const pr of placedStarRects) {
                  if (pr._c === c) continue;
                  if (intersects(sr, pr)) { okSpot = false; break; }
                }
              }

              if (okSpot) break;
            }
          }
        } catch (e) {}
      };

      // O balão principal deve ficar fixo/centralizado via CSS (não acompanha o robô).

      const getSecondaryMinTop = () => {
        // balão triste SEMPRE abaixo do balão principal
        try {
          const bounds = modal.getBoundingClientRect();
          const s = speech.getBoundingClientRect();
          const gap = 12;
          const pad = 10;
          return Math.max(pad, Math.round((s.bottom - bounds.top) + gap));
        } catch (e) {
          return 10;
        }
      };

      const clampPinnedBalloonToCard = (c) => {
        // Mantém cada balão secundário inteiro dentro do card.
        try {
          if (!c || !c.pinned || !c.speechEl) return;
          const bounds = modal.getBoundingClientRect();
          const pad = 10;

          // Regra: sempre abaixo do balão principal (speech)
          const minTop = getSecondaryMinTop();
          if (c.pinnedTop < minTop) {
            c.pinnedTop = minTop;
            applyPositions();
          }

          // garantir que está medível
          const r = c.speechEl.getBoundingClientRect();
          let dx = 0;
          let dy = 0;
          if (r.left < bounds.left + pad) dx = (bounds.left + pad) - r.left;
          else if (r.right > bounds.right - pad) dx = (bounds.right - pad) - r.right;
          if (r.top < bounds.top + minTop) dy = (bounds.top + minTop) - r.top;
          else if (r.bottom > bounds.bottom - pad) dy = (bounds.bottom - pad) - r.bottom;
          if (dx !== 0 || dy !== 0) {
            c.pinnedLeft += dx;
            c.pinnedTop += dy;

            // Reforça o limite mínimo depois do ajuste
            if (c.pinnedTop < minTop) c.pinnedTop = minTop;
            applyPositions();
          }

          // Evitar cobrir os botões/controle: prefere mover para cima (mas sem passar do minTop),
          // e se não der, move na horizontal.
          try {
            const forbidden = getForbiddenRects();
            if (forbidden.length) {
              let safety = 0;
              while (safety++ < 6) {
                const rr = c.speechEl.getBoundingClientRect();
                let hitRect = null;
                for (const f of forbidden) {
                  if (rectIntersects(rr, f)) { hitRect = f; break; }
                }
                if (!hitRect) break;

                const gap = 10;
                const desiredTop = Math.round((hitRect.top - bounds.top) - gap - rr.height);
                if (desiredTop >= minTop) {
                  c.pinnedTop = desiredTop;
                  applyPositions();
                  continue;
                }

                // Sem espaço para subir: tenta deslocar na horizontal
                let ddx = (hitRect.left - gap) - rr.right;
                if ((rr.left + ddx) < bounds.left + pad) ddx = (hitRect.right + gap) - rr.left;
                c.pinnedLeft += ddx;
                applyPositions();
              }
            }
          } catch (e) {}
        } catch (e) {}
      };

      const resolveOverlapForPinnedBalloon = (c) => {
        // Não move balões já existentes. Se o novo balão nascer sobre outro,
        // ajusta só este (mínimo necessário) para deixar de sobrepor.
        try {
          if (!c || !c.pinned || !c.speechEl) return;
          const gap = 10;
          const minTop = getSecondaryMinTop();

          const rectPad = (el, pad) => {
            const r = el.getBoundingClientRect();
            return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad };
          };

          // Obstáculos “fixos” que não podem ser cobertos por balões de estrelas
          // (principalmente o balão da Anadix quando estiver visível no Resultado).
          const staticObstacleRects = [];
          try {
            const anadix = document.getElementById('assistente-fixo');
            if (anadix) {
              const balaoAnadix = anadix.querySelector('#balao-fala');
              if (balaoAnadix && balaoAnadix.classList && balaoAnadix.classList.contains('visivel')) {
                staticObstacleRects.push(rectPad(balaoAnadix, 10));
              }
            }
          } catch (e) {}

          const isPinnedVisible = (x) => x && x.pinned && x.speechEl && !x.speechEl.classList.contains('is-hidden');
          const others = collectibles.filter(o => o !== c && isPinnedVisible(o));
          if (!others.length && !staticObstacleRects.length) return;

          const resolveAgainstRect = (ro) => {
            // Retorna true se ainda colide após tentar resolver.
            try {
              let r = c.speechEl.getBoundingClientRect();
              if (!rectIntersects(r, ro)) return false;

              // tenta empurrar para baixo; se não der, para cima; se não der, para os lados.
              const overlapY = Math.min(r.bottom, ro.bottom) - Math.max(r.top, ro.top);
              const overlapX = Math.min(r.right, ro.right) - Math.max(r.left, ro.left);

              // down
              c.pinnedTop += Math.max(0, Math.ceil(overlapY + gap));
              applyPositions();
              clampPinnedBalloonToCard(c);
              applyPositions();
              r = c.speechEl.getBoundingClientRect();
              if (!rectIntersects(r, ro)) return false;

              // up (sem passar do minTop)
              c.pinnedTop = Math.max(minTop, c.pinnedTop - Math.max(0, Math.ceil(overlapY + gap)) * 2);
              applyPositions();
              clampPinnedBalloonToCard(c);
              applyPositions();
              r = c.speechEl.getBoundingClientRect();
              if (!rectIntersects(r, ro)) return false;

              // right / left
              const dir = (r.left + r.right) / 2 < (ro.left + ro.right) / 2 ? -1 : 1;
              c.pinnedLeft += dir * Math.max(0, Math.ceil(overlapX + gap));
              applyPositions();
              clampPinnedBalloonToCard(c);
              applyPositions();
              r = c.speechEl.getBoundingClientRect();
              return rectIntersects(r, ro);
            } catch (e) {
              return false;
            }
          };

          // estabiliza em poucas iterações
          for (let safety = 0; safety < 10; safety++) {
            applyPositions();
            let collided = false;

            // 1) Evitar cobrir outros balões de estrelas já fixados
            for (const o of others) {
              let ro;
              try { ro = rectPad(o.speechEl, 8); } catch (e) { continue; }
              if (!rectIntersects(c.speechEl.getBoundingClientRect(), ro)) continue;
              collided = true;
              resolveAgainstRect(ro);
            }

            // 2) Evitar cobrir o balão da Anadix (quando visível)
            for (const ro of staticObstacleRects) {
              if (!rectIntersects(c.speechEl.getBoundingClientRect(), ro)) continue;
              collided = true;
              resolveAgainstRect(ro);
            }

            if (!collided) break;
          }
        } catch (e) {}
      };

      const reflowPinnedBalloons = () => {
        // Garante que, ao surgir/desaparecer o balão da Anadix, os balões já coletados
        // sejam reacomodados para não sobrepor nenhum outro.
        try {
          if (!collectibles || !collectibles.length) return;
          const pinned = collectibles.filter(x => x && x.pinned && x.speechEl && !x.speechEl.classList.contains('is-hidden'));
          if (!pinned.length) return;

          for (let pass = 0; pass < 3; pass++) {
            for (const c of pinned) {
              try {
                clampPinnedBalloonToCard(c);
                resolveOverlapForPinnedBalloon(c);
              } catch (e) {}
            }
          }
        } catch (e) {}
      };

      const checkStarCollision = () => {
        try {
          if (!hasMovedSinceOpen) return;
          const a = perso.getBoundingClientRect();
          for (const c of collectibles) {
            if (!c || c.collected || !c.starEl || !c.speechEl) continue;
            const b = c.starEl.getBoundingClientRect();
            const hit = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
            if (!hit) continue;

            // Define a mensagem no momento da coleta.
            try {
              let messageToShow = c.message;
              if (starMode === 'sad' && sadMessagesByOrder && sadMessagesByOrder.length) {
                const idx = Math.min(Math.max(0, sadCollectedCount), sadMessagesByOrder.length - 1);
                messageToShow = sadMessagesByOrder[idx];
              }
              c.message = String(messageToShow || '');
              c.speechEl.textContent = c.message;
            } catch (e) {}

            // O balão deve aparecer exatamente onde a estrela estava.
            try {
              const starRect = c.starEl.getBoundingClientRect();
              const modalRect = modal.getBoundingClientRect();
              c.pinnedLeft = Math.round(starRect.left - modalRect.left);
              c.pinnedTop = Math.round(starRect.top - modalRect.top);
              c.pinned = true;
            } catch (e) {}

            // Regra: sempre abaixo do balão principal
            try {
              const minTop = getSecondaryMinTop();
              if (c.pinnedTop < minTop) c.pinnedTop = minTop;
            } catch (e) {}

            c.collected = true;
            try { c.starEl.remove(); } catch (e) {}
            try { c.speechEl.classList.remove('is-hidden'); } catch (e) {}

            // Avança o contador só após uma coleta bem-sucedida.
            if (starMode === 'sad') {
              sadCollectedCount += 1;
            }

            applyPositions();
            clampPinnedBalloonToCard(c);
            resolveOverlapForPinnedBalloon(c);
            repositionRemainingStarsToAvoidBalloons();
            reflowPinnedBalloons();
          }
        } catch (e) {}
      };

      const moveHorizontal = (dx) => {
        hasMovedSinceOpen = true;
        roboOffsetX += dx;
        applyPositions();
        wrapIfNeeded();
        checkStarCollision();
      };

      const moveVerticalRobotOnly = (dy) => {
        hasMovedSinceOpen = true;
        roboOffsetY += dy;
        applyPositions();
        wrapIfNeeded();
        checkStarCollision();
      };

      btLeft.addEventListener('click', () => moveHorizontal(-step));
      btRight.addEventListener('click', () => moveHorizontal(step));
      btTop.addEventListener('click', () => moveVerticalRobotOnly(-step));
      btBottom.addEventListener('click', () => moveVerticalRobotOnly(step));

      // Permitir mover com dedo (touch) e mouse (clicar+arrastar).
      // Implementação com Pointer Events para funcionar em qualquer dispositivo.
      let dragPointerId = null;
      let dragLastClientX = 0;
      let dragLastClientY = 0;
      let dragPendingDx = 0;
      let dragPendingDy = 0;
      let dragRaf = 0;

      const dragScheduleApply = () => {
        if (dragRaf) return;
        dragRaf = requestAnimationFrame(() => {
          dragRaf = 0;
          if (dragPendingDx === 0 && dragPendingDy === 0) return;
          hasMovedSinceOpen = true;
          roboOffsetX += dragPendingDx;
          roboOffsetY += dragPendingDy;
          dragPendingDx = 0;
          dragPendingDy = 0;
          applyPositions();
          wrapIfNeeded();
          checkStarCollision();
        });
      };

      const dragTargetIsBlocked = (target) => {
        try {
          if (!target || !target.closest) return false;
          // Não iniciar drag em botões/controles.
          if (target.closest('.feedback-actions')) return true;
          if (target.closest('.control')) return true;
          // Se algum dia os balões voltarem a aceitar eventos, evita iniciar por cima.
          if (target.closest('.speech')) return true;
          return false;
        } catch (e) {
          return false;
        }
      };

      const onStagePointerDown = (ev) => {
        try {
          // Só botão principal do mouse (quando aplicável)
          if (typeof ev.button === 'number' && ev.button !== 0) return;
          if (dragPointerId !== null) return;
          if (dragTargetIsBlocked(ev.target)) return;

          dragPointerId = ev.pointerId;
          dragLastClientX = ev.clientX;
          dragLastClientY = ev.clientY;
          try { stage.setPointerCapture(dragPointerId); } catch (e) {}
          try { ev.preventDefault(); } catch (e) {}
        } catch (e) {}
      };

      const onStagePointerMove = (ev) => {
        try {
          if (dragPointerId === null) return;
          if (ev.pointerId !== dragPointerId) return;
          const dx = ev.clientX - dragLastClientX;
          const dy = ev.clientY - dragLastClientY;
          dragLastClientX = ev.clientX;
          dragLastClientY = ev.clientY;
          dragPendingDx += dx;
          dragPendingDy += dy;
          dragScheduleApply();
          try { ev.preventDefault(); } catch (e) {}
        } catch (e) {}
      };

      const onStagePointerUpOrCancel = (ev) => {
        try {
          if (dragPointerId === null) return;
          if (ev.pointerId !== dragPointerId) return;
          try { stage.releasePointerCapture(dragPointerId); } catch (e) {}
          dragPointerId = null;
          dragPendingDx = 0;
          dragPendingDy = 0;
          if (dragRaf) {
            try { cancelAnimationFrame(dragRaf); } catch (e) {}
            dragRaf = 0;
          }
        } catch (e) {}
      };

      try {
        stage.addEventListener('pointerdown', onStagePointerDown, { passive: false });
        stage.addEventListener('pointermove', onStagePointerMove, { passive: false });
        stage.addEventListener('pointerup', onStagePointerUpOrCancel, { passive: true });
        stage.addEventListener('pointercancel', onStagePointerUpOrCancel, { passive: true });
      } catch (e) {}

      // Reacomodar balões quando o balão da Anadix abrir/fechar
      let anadixBalloonObserver = null;

      const keyHandler = (ev) => {
        // evita rolar a página com setas
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); moveHorizontal(-step); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); moveHorizontal(step); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveVerticalRobotOnly(-step); }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); moveVerticalRobotOnly(step); }
      };
      document.addEventListener('keydown', keyHandler);

      const closeOverlay = () => {
        try { document.removeEventListener('keydown', keyHandler); } catch (e) {}
        try {
          if (anadixBalloonObserver) { anadixBalloonObserver.disconnect(); }
        } catch (e) {}
        try {
          stage.removeEventListener('pointerdown', onStagePointerDown);
          stage.removeEventListener('pointermove', onStagePointerMove);
          stage.removeEventListener('pointerup', onStagePointerUpOrCancel);
          stage.removeEventListener('pointercancel', onStagePointerUpOrCancel);
        } catch (e) {}
        try {
          if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = 0; }
        } catch (e) {}

        // Restaurar Anadix antes de remover o overlay (para ela não sumir junto)
        try {
          if (anadixEl && anadixPrevParent) {
            if (anadixPrevNext && anadixPrevNext.parentNode === anadixPrevParent) {
              anadixPrevParent.insertBefore(anadixEl, anadixPrevNext);
            } else {
              anadixPrevParent.appendChild(anadixEl);
            }
          }
        } catch (e) {}

        try { modal.remove(); } catch (e) {}
        try { host.classList.remove('result-overlay-open'); } catch (e) {}
        try {
          const anadix = document.getElementById('assistente-fixo');
          if (anadix) anadix.classList.remove('anadix-result-open');
        } catch (e) {}
      };

      const closeToMenu = () => {
        closeOverlay();
        try { goBackToMenu(); } catch (e) {}
      };

      const restartFromBeginning = () => {
        closeOverlay();
        try { startMode('pratica'); } catch (e) {}
      };

      restart.addEventListener('click', restartFromBeginning);
      ok.addEventListener('click', closeToMenu);
      actions.appendChild(restart);
      actions.appendChild(ok);
      modal.appendChild(actions);

      // Montar overlay dentro do card, com o mesmo tamanho
      try { host.classList.add('result-overlay-open'); } catch (e) {}
      host.appendChild(modal);

      // Se o balão da Anadix surgir enquanto o Resultado está aberto, evita sobreposição
      try {
        const anadix = document.getElementById('assistente-fixo');
        const balaoAnadix = anadix ? anadix.querySelector('#balao-fala') : null;
        if (balaoAnadix && typeof MutationObserver !== 'undefined') {
          anadixBalloonObserver = new MutationObserver(() => {
            try { reflowPinnedBalloons(); } catch (e) {}
          });
          anadixBalloonObserver.observe(balaoAnadix, { attributes: true, attributeFilter: ['class', 'style'] });
        }
      } catch (e) {}

      // Centralizar ao abrir (precisa estar no DOM)
      requestAnimationFrame(() => {
        try {
          roboBaseLeft = getPx(getComputedStyle(perso).left);
          roboBaseTop = getPx(getComputedStyle(perso).top);

          // garantir posição inicial baseada nas regras do CSS
          applyPositions();

          // Centralizar apenas o robô no palco (o balão principal fica fixo/centralizado via CSS)
          const stageRect = stage.getBoundingClientRect();
          const persoRect = perso.getBoundingClientRect();
          const persoCenterX = persoRect.left + (persoRect.width / 2);
          const persoCenterY = persoRect.top + (persoRect.height / 2);
          const stageCenterX = stageRect.left + (stageRect.width / 2);
          const stageCenterY = stageRect.top + (stageRect.height / 2);

          const dx = Math.round(stageCenterX - persoCenterX);
          const dy = Math.round(stageCenterY - persoCenterY);

          roboOffsetX += dx;
          roboOffsetY += dy;
          applyPositions();
          wrapIfNeeded();

          // posicionar as estrelas em qualquer canto/área do overlay,
          // garantindo que não nasçam em cima do robô nem em cima dos botões/D-pad.
          try {
            if (collectibles && collectibles.length) {
              const pad = 10;
              const starSize = COLLECTIBLE_SIZE;
              const w = Math.max(0, modal.clientWidth || 0);
              const h = Math.max(0, modal.clientHeight || 0);
              const maxX = Math.max(pad, w - starSize - pad);
              const maxY = Math.max(pad, h - starSize - pad);
              const roboRect = perso.getBoundingClientRect();
              const forbidden = getForbiddenRects();
              const balloonRects = getBalloonRects();
              const intersects = (ra, rb) => rectIntersects(ra, rb);
              const placedStarRects = [];
              const starGap = 6;

              for (const c of collectibles) {
                if (!c || !c.starEl) continue;
                // tenta algumas vezes para evitar nascer colada no robô, em áreas proibidas ou em outra estrela
                for (let i = 0; i < 35; i++) {
                  const x = Math.round(pad + Math.random() * (maxX - pad));
                  const y = Math.round(pad + Math.random() * (maxY - pad));
                  c.starEl.style.left = `${x}px`;
                  c.starEl.style.top = `${y}px`;
                  c.starEl.style.width = `${starSize}px`;
                  c.starEl.style.height = `${starSize}px`;
                  const starRect = c.starEl.getBoundingClientRect();

                  let okSpot = !intersects(roboRect, starRect);

                  if (okSpot && forbidden.length) {
                    for (const f of forbidden) {
                      if (intersects(starRect, f)) { okSpot = false; break; }
                    }
                  }

                  if (okSpot && balloonRects.length) {
                    for (const br of balloonRects) {
                      if (intersects(starRect, br)) { okSpot = false; break; }
                    }
                  }

                  if (okSpot && placedStarRects.length) {
                    const expanded = {
                      left: starRect.left - starGap,
                      top: starRect.top - starGap,
                      right: starRect.right + starGap,
                      bottom: starRect.bottom + starGap
                    };
                    for (const pr of placedStarRects) {
                      if (intersects(expanded, pr)) { okSpot = false; break; }
                    }
                  }

                  if (okSpot) {
                    placedStarRects.push({ left: starRect.left, top: starRect.top, right: starRect.right, bottom: starRect.bottom });
                    break;
                  }
                }
              }
            }
          } catch (e) {}
        } catch (e) {}
      });
    } catch(e) {}
  }

  // (Botão Avançar foi movido para o primeiro card - bloco removido aqui)

  // primeira renderização do estado
  refreshHotspotsUI();

  function showReviewModal() {
    try {
      const existing = document.getElementById('review-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'review-modal';
      modal.className = 'feedback-modal';
      const container = document.createElement('div');
      container.className = 'feedback-content';
      const title = document.createElement('div');
      title.textContent = 'Revisão dos cards';
      container.appendChild(title);
      const listWrap = document.createElement('div');
      listWrap.style.maxHeight = '60vh';
      listWrap.style.overflowY = 'auto';
      listWrap.style.display = 'grid';
      listWrap.style.gridTemplateColumns = '1fr';
      listWrap.style.gap = '12px';
      reviewResults.forEach(r => {
        const item = document.createElement('div');
        item.style.display = 'grid';
        item.style.gridTemplateColumns = '140px 1fr';
        item.style.gap = '12px';
        item.style.alignItems = 'start';
        const thumb = document.createElement('img');
        thumb.src = r.img || '';
        thumb.alt = 'Miniatura';
        thumb.style.width = '140px';
        thumb.style.height = 'auto';
        thumb.style.borderRadius = '8px';
        thumb.style.objectFit = 'cover';
        const details = document.createElement('div');
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.margin = '0';
        ul.style.padding = '0';
        r.items.forEach(it => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.padding = '4px 0';
          const left = document.createElement('span');
          left.textContent = `${it.correctLabel}`;
          const right = document.createElement('span');
          right.textContent = it.isCorrect ? '✔️' : `✖️ (${it.chosenLabel || 'sem escolha'})`;
          right.style.color = it.isCorrect ? '#2e7d32' : '#c62828';
          li.appendChild(left);
          li.appendChild(right);
          ul.appendChild(li);
        });
        details.appendChild(ul);
        item.appendChild(thumb);
        item.appendChild(details);
        listWrap.appendChild(item);
      });
      container.appendChild(listWrap);
      const actions = document.createElement('div');
      actions.className = 'feedback-actions';
      const close = document.createElement('button');
      close.className = 'btn';
      close.textContent = 'Fechar';
      close.addEventListener('click', () => { try { modal.remove(); } catch(e){} });
      actions.appendChild(close);
      modal.appendChild(container);
      modal.appendChild(actions);
      document.body.appendChild(modal);
    } catch(e) {}
  }
}

flashcard.addEventListener('click', () => {
    const card = currentFlashcards[currentIndex];
      // Se for capa, não vira. Se for card normal, vira.
      if (card.isWelcome) return;
      // não permitir giro/flip no modo prática
      if (currentMode === 'pratica') return;
      flashcard.classList.toggle('flipped');
});

// prevBtn removed from HTML

// nextBtn removed from HTML

// shuffleBtn removed from HTML

// Zoom
zoomBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentImageUrl) {
    zoomImage.src = currentImageUrl;
    zoomOverlay.classList.add('active');
  }
});

zoomClose.addEventListener('click', () => {
  zoomOverlay.classList.remove('active');
});

zoomOverlay.addEventListener('click', (e) => {
  if (e.target === zoomOverlay) {
    zoomOverlay.classList.remove('active');
  }
});

// Acessibilidade: permitir ativação via teclado nas imagens de controle
try {
  function attachKeyboardActivation(el) {
    if (!el) return;
    try { el.setAttribute('role', 'button'); } catch(e) {}
    try { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0'); } catch(e) {}
    el.addEventListener('keydown', (e) => {
      const key = e.key || e.code;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        try { el.click(); } catch(err) {}
      }
    });
  }
  // shuffleBtn removed
} catch (e) {}

// Consolidated DOMContentLoaded: ensure menu buttons work and startMode is globally available
document.addEventListener('DOMContentLoaded', () => {
  // Assistente (Melissa) — dicas Anatomia Vegetal
  try {
    (function initAssistenteMelissa() {
      const HOME_CONTEUDOS = [
        "Olá! Sou <b>Anadix</b>. Guardiã do conhecimento.<br>Vou te guiar na descoberta das plantas vasculares."
      ];
      let conteudos = HOME_CONTEUDOS.slice();
      let cardsConteudos = null;
      let context = 'home';

      let indiceTexto = 0;
  const container = document.getElementById('assistente-fixo');
      const balao = document.getElementById('balao-fala');
      const textoBalao = document.getElementById('texto-balao');

      if (!container || !balao || !textoBalao) return;

  const triggerAvatar = container.querySelector('.avatar_help_avatar');
  const triggerBraco = container.querySelector('.bracos_frente_content');
  const triggers = [triggerAvatar, triggerBraco].filter(Boolean);
  if (triggers.length === 0) return;

      let cycleTimer = 0;
      let pauseTimer = 0;
      const SHOW_MS = 17000;
      const PAUSE_MS = 2000;
      let lastActivateAt = 0;
      let manualOnly = false;
      let manualIntroPending = false;
      let manualHideTimer = 0;
      const MANUAL_SHOW_MS = 10000;

      function setTextoComEfeito(html) {
        balao.style.opacity = '0';
        window.setTimeout(() => {
          textoBalao.innerHTML = html;
          balao.style.opacity = '1';
        }, 160);
      }

      function showBalloon() {
        if (!balao.classList.contains('visivel')) {
          balao.classList.add('visivel');
        }
      }

      function hideBalloon() {
        // limpa opacidade inline usada no efeito de troca
        try { balao.style.opacity = ''; } catch (_) {}
        balao.classList.remove('visivel');
      }

      function clearManualTimer() {
        if (manualHideTimer) { window.clearTimeout(manualHideTimer); manualHideTimer = 0; }
      }

      function manualShowThenAutoHide() {
        try { clearManualTimer(); } catch (_) {}
        try { showBalloon(); } catch (_) {}
        try { setTextoComEfeito(conteudos[indiceTexto] || ''); } catch (_) {}
        manualHideTimer = window.setTimeout(() => {
          manualHideTimer = 0;
          try { hideBalloon(); } catch (_) {}
        }, MANUAL_SHOW_MS);
      }

      function setManualOnlyMode(flag) {
        try { manualOnly = !!flag; } catch (_) { manualOnly = false; }
        if (manualOnly) {
          try { clearCycleTimers(); } catch (_) {}
          try { hideBalloon(); } catch (_) {}
          try { clearManualTimer(); } catch (_) {}
          // Em cards de jogo: permitir um “intro” automático por 10s após o texto do card ser aplicado.
          manualIntroPending = true;
        } else {
          manualIntroPending = false;
          try { clearManualTimer(); } catch (_) {}
        }
      }

      function clearCycleTimers() {
        if (cycleTimer) { window.clearTimeout(cycleTimer); cycleTimer = 0; }
        if (pauseTimer) { window.clearTimeout(pauseTimer); pauseTimer = 0; }
      }

      function scheduleNextCycle() {
        if (manualOnly) return;
        clearCycleTimers();

        // mantém a mensagem atual visível por SHOW_MS
        cycleTimer = window.setTimeout(() => {
          hideBalloon();

          // pausa de 2s sem balão
          pauseTimer = window.setTimeout(() => {
            indiceTexto = (indiceTexto + 1) % conteudos.length;
            showBalloon();
            setTextoComEfeito(conteudos[indiceTexto]);
            scheduleNextCycle();
          }, PAUSE_MS);
        }, SHOW_MS);
      }

      function activateBalloon() {
        const now = Date.now();
        // debounce: evita reativar várias vezes ao mover o mouse entre partes do avatar/balão
        if (now - lastActivateAt < 250) return;
        lastActivateAt = now;

        // Modo manual (cards de jogo): só abre/fecha por clique.
        if (manualOnly) {
          try { clearCycleTimers(); } catch (_) {}
          try { clearManualTimer(); } catch (_) {}
          manualIntroPending = false;
          const isVisible = balao.classList.contains('visivel');
          if (isVisible) {
            hideBalloon();
            return;
          }
          try { manualShowThenAutoHide(); } catch (_) {}
          return;
        }

        const wasVisible = balao.classList.contains('visivel');
        showBalloon();

        // só aplica efeito/atualiza texto quando está abrindo agora
        if (!wasVisible) {
          try { textoBalao.innerHTML = conteudos[indiceTexto]; } catch (_) {}
          try { balao.style.opacity = '1'; } catch (_) {}
        }

        // reinicia a contagem: 17s visível + 2s pausa
        scheduleNextCycle();
      }

      // API global para integração com os cards (trocar texto e forçar reaparecimento)
      try {
        window.__anadixBalloon = {
          setConteudos: (arr) => {
            try {
              if (Array.isArray(arr) && arr.length) {
                conteudos = arr.slice(0);
                indiceTexto = 0;
                try { textoBalao.innerHTML = conteudos[0]; } catch (_) {}
              }
            } catch (_) {}
          },
          forceReappear: (html) => {
            // Este método é usado pelos cards: não deve sobrescrever a mensagem da HOME.
            try {
              if (typeof html === 'string' && html.trim()) {
                cardsConteudos = [html];
                context = 'cards';
                conteudos = cardsConteudos;
                indiceTexto = 0;
              }
            } catch (_) {}

            // “reaparecer”: fecha e abre rapidamente para ficar evidente em cada card
            try { clearCycleTimers(); } catch (_) {}
            // No modo manual (cards de jogo), atualiza o texto mas mantém oculto.
            if (manualOnly) {
              try { hideBalloon(); } catch (_) {}
              try { textoBalao.innerHTML = conteudos[indiceTexto] || ''; } catch (_) {}
              // Intro automático por 10s ao entrar no card de jogo.
              if (manualIntroPending) {
                manualIntroPending = false;
                try { manualShowThenAutoHide(); } catch (_) {}
              }
              return;
            }

            try { hideBalloon(); } catch (_) {}
            window.setTimeout(() => {
              try {
                showBalloon();
                setTextoComEfeito(conteudos[indiceTexto] || '');
                scheduleNextCycle();
              } catch (_) {}
            }, 70);
          },
          restoreHome: () => {
            try {
              context = 'home';
              cardsConteudos = null;
              conteudos = HOME_CONTEUDOS.slice();
              indiceTexto = 0;
              try { textoBalao.innerHTML = conteudos[0] || ''; } catch (_) {}
              try { clearCycleTimers(); } catch (_) {}
              try { hideBalloon(); } catch (_) {}
              try { setManualOnlyMode(false); } catch (_) {}
            } catch (_) {}
          },
          activate: () => {
            try { activateBalloon(); } catch (_) {}
          },
          hide: () => {
            try { hideBalloon(); } catch (_) {}
          },
          setManualOnly: (flag) => {
            try { setManualOnlyMode(flag); } catch (_) {}
          }
        };
      } catch (e) {}

      // Tema do balão (configurável pelo sistema via variáveis CSS)
      try {
        if (!window.__anadixTheme) window.__anadixTheme = {};
        window.__anadixTheme.setBalloonStyle = (style) => {
          try {
            const s = style && typeof style === 'object' ? style : {};
            const root = document.documentElement;
            const set = (key, value) => {
              if (value === undefined || value === null) return;
              root.style.setProperty(key, String(value));
            };
            set('--anadix-balloon-bg', s.bg);
            set('--anadix-balloon-color', s.color);
            set('--anadix-balloon-radius', s.radius);
            set('--anadix-balloon-shadow', s.shadow);
            set('--anadix-balloon-padding', s.padding);
            set('--anadix-balloon-font-family', s.fontFamily);
            set('--anadix-balloon-font-size', s.fontSize);
            set('--anadix-balloon-line-height', s.lineHeight);
            set('--anadix-balloon-border', s.border);
          } catch (e) {}
        };
      } catch (e) {}

      if (!container.dataset.melissaAttached) {
        // Mouse/toque: ativa e mantém por 17s, independente de tirar o mouse
        triggers.forEach((el) => {
          el.addEventListener('pointerenter', () => {
            if (manualOnly) return;
            activateBalloon();
          });

          // Toque: mostra ao encostar; some logo após soltar
          el.addEventListener('pointerdown', (ev) => {
            if (manualOnly) return;
            const pt = ev.pointerType;
            if (pt && pt !== 'mouse') {
              activateBalloon();
            }
          });

          // Clique/toque: sempre (inclusive mobile) — no modo manual, é o ÚNICO gatilho.
          el.addEventListener('click', (ev) => {
            try { ev.preventDefault(); } catch (_) {}
            try { activateBalloon(); } catch (_) {}
          });

          // Acessibilidade: teclado em cima do avatar
          el.addEventListener('keydown', (e) => {
            const key = e.key || e.code;
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
              e.preventDefault();
              activateBalloon();
            }
          });
        });

        // estado inicial
        indiceTexto = 0;
        textoBalao.innerHTML = conteudos[0];

        // abrir automaticamente ao carregar a página (com atraso)
        window.setTimeout(() => {
          try { if (!manualOnly) activateBalloon(); } catch (_) {}
        }, 3000);

        container.dataset.melissaAttached = '1';
      }
    })();
  } catch (e) {}

  // Make startMode available globally for inline onclick handlers
  try {
    window.startMode = startMode;
  } catch (e) {}

  // Attach listeners to menu cards
  try {
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach(card => {
      if (card.dataset.startAttached) return;
      const onclick = card.getAttribute('onclick') || '';
      const m = onclick.match(/startMode\(['"](\w+)['"]\)/);
      if (m) {
        card.addEventListener('click', (ev) => {
          ev.preventDefault();
          startMode(m[1]);
        });
        card.dataset.startAttached = '1';
      }
    });
  } catch (e) {}

  // Create fallback back button
  try {
    if (document.getElementById('global-back-fallback')) return;
    const a = document.createElement('button');
    a.id = 'global-back-fallback';
    a.type = 'button';
    a.setAttribute('aria-label', 'Voltar');
    a.style.position = 'fixed';
    a.style.left = '12px';
    a.style.top = '12px';
    a.style.width = '36px';
    a.style.height = '36px';
    a.style.borderRadius = '50%';
    a.style.background = '#ffffff';
    a.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    a.style.zIndex = '4000';
    a.style.display = 'none';
    a.style.backgroundImage = "url('https://s3-eu-west-1.amazonaws.com/thomascullen-codepen/back.svg')";
    a.style.backgroundRepeat = 'no-repeat';
    a.style.backgroundPosition = 'center';
    a.style.backgroundSize = '18px';
    a.style.cursor = 'pointer';
    a.addEventListener('click', (ev) => { ev.preventDefault(); try { goBackToMenu(); } catch(e){} });
    document.body.appendChild(a);
  } catch (e) {}
});