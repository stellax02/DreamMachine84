const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");

// ---------------------------
// RNG
// - On fxhash: uses $fx.rand()
// - Locally: uses a deterministic RNG seeded from the URL (?s= / ?seed=)
// ---------------------------
const fx = typeof window !== "undefined" && window.$fx ? window.$fx : null;

// Small, deterministic string->seed hash (cyrb128) + PRNG (sfc32)
function cyrb128(str) {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function makeShortSeed(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) out += BASE62[(rand() * BASE62.length) | 0];
  return out;
}

function getUrlSeed() {
  const u = new URL(window.location.href);
  return u.searchParams.get("s") || u.searchParams.get("seed") || "";
}

let __localSeed = getUrlSeed();
if (!fx && !__localSeed) {
  __localSeed = makeShortSeed(6);
  const u = new URL(window.location.href);
  u.searchParams.set("s", __localSeed);
  u.searchParams.delete("seed");
  history.replaceState(null, "", u.toString());
}

let __localRng = !fx ? sfc32(...cyrb128(__localSeed)) : null;

// Use fxhash RNG when available; otherwise use deterministic local RNG
function rand() {
  return fx && typeof fx.rand === "function" ? fx.rand() : __localRng();
}
function chance(p) {
  return rand() < p;
}
function randRange(a, b) {
  return a + (b - a) * rand();
}
function randInt(n) {
  return (rand() * n) | 0;
}

// ---------------------------
// Movement modes (pixel / glitch)
// ---------------------------
const MOVES = {
  pixel: { name: "Dream Machine '84", slug: "dream-machine-84" },
  glitch: { name: "Glitch Crawl", slug: "glitch-crawl" },
  datamosh: { name: "Data Mosh", slug: "data-mosh" },
};
const MOVE_ORDER = ["pixel", "glitch", "datamosh"];
let movementMode = "pixel";

// ---------------------------
// "Semantic marks" layer: glitchy text / blueprint doodles
// ---------------------------
const MARKS = {
  off: { name: "Marks Off", slug: "marks-off" },
  text: { name: "Glitch Text", slug: "glitch-text" },
  blueprint: { name: "Blueprint", slug: "blueprint" },
  mixed: { name: "Mixed", slug: "mixed" },
};
const MARK_ORDER = ["mixed", "text", "blueprint", "off"];
let marksMode = "mixed";
let eightiesTheme = true;

const TEXT_SOURCES = {
  design80s: { name: "80s Design Labels", slug: "80s-design" },
  original: { name: "Original Phrases", slug: "original" },
  hooks80s: { name: "80s Hooks", slug: "80s-hooks" },
  mixed: { name: "Mixed Text", slug: "mixed" },
};
const TEXT_ORDER = ["mixed", "design80s", "original", "hooks80s"];
let textSource = "mixed";

// ---------------------------
// Palettes
// ---------------------------
const PALETTES = [
  {
    name: "Opal Sheen",
    slug: "opal-sheen",
    colors: ["#05060A", "#F6F2FF", "#40E0FF", "#FF4FD8"],
  },
  {
    name: "Prism Aurora",
    slug: "prism-aurora",
    colors: ["#0A1020", "#7B61FF", "#35F4C6", "#FFE66D"],
  },
  {
    name: "Oil Slick",
    slug: "oil-slick",
    colors: ["#05060A", "#2B2F36", "#3DF2FF", "#B8FF3D"],
  },
  {
    name: "Laser Orchid",
    slug: "laser-orchid",
    colors: ["#060518", "#FF4FD8", "#7B61FF", "#4DFFF3"],
  },
  {
    name: "Chrome Candy",
    slug: "chrome-candy",
    colors: ["#0B0B0C", "#DDE3F0", "#FF3EA5", "#2AF1FF"],
  },
  {
    name: "Pearl Neon",
    slug: "pearl-neon",
    colors: ["#0B1026", "#F3F0E8", "#22C55E", "#60A5FA"],
  },
  {
    name: "Glacier Holo",
    slug: "glacier-holo",
    colors: ["#06101C", "#A7C7E7", "#7CE7FF", "#FF5FA2"],
  },
  {
    name: "Unicorn Plastic",
    slug: "unicorn-plastic",
    colors: ["#0B0B0C", "#F6F2FF", "#A855F7", "#34D399"],
  },
  {
    name: "CD Rainbow",
    slug: "cd-rainbow",
    colors: ["#070915", "#F3F0E8", "#00D9FF", "#F7D200"],
  },
  {
    name: "Iridescent Ink",
    slug: "iridescent-ink",
    colors: ["#05060A", "#111827", "#6EE7FF", "#D946EF"],
  },
  {
    name: "Biochrome",
    slug: "biochrome",
    colors: ["#05060A", "#E5E7EB", "#22D3EE", "#A3E635"],
  },
  {
    name: "Vapor Holo",
    slug: "vapor-holo",
    colors: ["#0B1026", "#FF5FA2", "#60A5FA", "#F3F0E8"],
  },
  {
    name: "Synth Foil",
    slug: "synth-foil",
    colors: ["#05060A", "#C7A34A", "#7CE7FF", "#FF2DAA"],
  },
  {
    name: "Aurora Lime",
    slug: "aurora-lime",
    colors: ["#05060A", "#B8FF3D", "#35F4C6", "#7B61FF"],
  },
  {
    name: "Electric Opaline",
    slug: "electric-opaline",
    colors: ["#060518", "#F6F2FF", "#2AF1FF", "#FF3EA5"],
  },
  {
    name: "Holo Titanium",
    slug: "holo-titanium",
    colors: ["#0B0B0C", "#2B2F36", "#DDE3F0", "#7CE7FF"],
  },
  {
    name: "Spectral Rose",
    slug: "spectral-rose",
    colors: ["#05060A", "#F6F2FF", "#FB7185", "#22D3EE"],
  },
  {
    name: "Mint Prism",
    slug: "mint-prism",
    colors: ["#06101C", "#34D399", "#7B61FF", "#F6F2FF"],
  },
  {
    name: "Holo Sunset",
    slug: "holo-sunset",
    colors: ["#0A1020", "#FF7849", "#FF4FD8", "#40E0FF"],
  },
  {
    name: "Cosmic Foil",
    slug: "cosmic-foil",
    colors: ["#05060A", "#7B61FF", "#FF4FD8", "#FFE66D"],
  },
  {
    name: "Sterling Aura",
    slug: "sterling-aura",
    colors: ["#0B0B0C", "#DDE3F0", "#60A5FA", "#A855F7"],
  },
  {
    name: "Prismatic Sea",
    slug: "prismatic-sea",
    colors: ["#051225", "#22D3EE", "#35F4C6", "#F6F2FF"],
  },
  {
    name: "Neon Cellophane",
    slug: "neon-cellophane",
    colors: ["#05060A", "#F6F2FF", "#A3E635", "#FF5FA2"],
  },
  {
    name: "Laser Ice",
    slug: "laser-ice",
    colors: ["#06101C", "#7CE7FF", "#F6F2FF", "#7B61FF"],
  },
];

// Backward-compat: older URL parsing expects PALETTE_META indexed object
const PALETTE_META = Object.fromEntries(
  PALETTES.map((p, i) => [i, { name: p.name, slug: p.slug }])
);

// ---------------------------
// Helpers
// ---------------------------
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const s =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function shortestHueDelta(a, b) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function pickWeightedIndex(weights) {
  let sum = 0;
  for (const w of weights) sum += w;
  let r = rand() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---------------------------
// Palette state
// ---------------------------
let paletteMode = 0;
let lastPaletteMode = null;

let bgHue = 220,
  bgSat = 26,
  bgLight = 7;

const PALETTE_HSL = PALETTES.map((p) => p.colors.map(hexToHsl));
const PALETTE_RGB = PALETTES.map((p) => p.colors.map(hexToRgb));

function getPaletteSlug() {
  return PALETTES[paletteMode]?.slug || `palette-${paletteMode}`;
}
function getPaletteName() {
  return PALETTES[paletteMode]?.name || `Palette ${paletteMode}`;
}

function pickPaletteAccentHex() {
  const colors = PALETTES[paletteMode]?.colors || PALETTES[0].colors;
  const hsls = PALETTE_HSL[paletteMode] || PALETTE_HSL[0];
  let bestI = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < colors.length; i++) {
    const c = hsls[i];
    const vis = 1 - Math.abs(c.l - 55) / 55;
    const score = vis * (0.75 + c.s / 110);
    if (score > bestScore) {
      bestScore = score;
      bestI = i;
    }
  }
  return colors[bestI] || colors[0];
}

function reseedBackgroundFromPalette() {
  const hsls = PALETTE_HSL[paletteMode] || PALETTE_HSL[0];
  let darkest = hsls[0];
  for (const c of hsls) if (c.l < darkest.l) darkest = c;
  bgHue = (bgHue + (rand() * 22 - 11) + 360) % 360;
  bgSat = clamp(bgSat + (rand() * 8 - 4), 8, 40);
  bgLight = clamp(bgLight + (rand() * 2 - 1), 2.6, 11);
}

let paletteBag = [];
function refillPaletteBag() {
  paletteBag = Array.from({ length: PALETTES.length }, (_, i) => i);
  shuffleInPlace(paletteBag);

  if (
    lastPaletteMode !== null &&
    paletteBag.length > 1 &&
    paletteBag[paletteBag.length - 1] === lastPaletteMode
  ) {
    const j = paletteBag.findIndex((v) => v !== lastPaletteMode);
    if (j >= 0) {
      [paletteBag[j], paletteBag[paletteBag.length - 1]] = [
        paletteBag[paletteBag.length - 1],
        paletteBag[j],
      ];
    }
  }
}

function drawPaletteModeFromBag() {
  if (paletteBag.length === 0) refillPaletteBag();
  let candidate = paletteBag[paletteBag.length - 1];

  if (lastPaletteMode !== null && candidate === lastPaletteMode) {
    for (let i = 0; i < paletteBag.length - 1; i++) {
      if (paletteBag[i] !== lastPaletteMode) {
        [paletteBag[i], paletteBag[paletteBag.length - 1]] = [
          paletteBag[paletteBag.length - 1],
          paletteBag[i],
        ];
        break;
      }
    }
  }
  return paletteBag.pop();
}

function applyPaletteMode(mode) {
  paletteMode = clamp(mode | 0, 0, PALETTES.length - 1);
  lastPaletteMode = paletteMode;
  reseedBackgroundFromPalette();
}

function reseedPalette() {
  applyPaletteMode(drawPaletteModeFromBag());
}

function updateTitlePill() {
  const textEl = document.getElementById("title-text");
  const swatchEl = document.getElementById("palette-swatch");
  if (!textEl || !swatchEl) return;

  const moveName = MOVES[movementMode]?.name || movementMode;
  const marksName = MARKS[marksMode]?.name || marksMode;
  const textName = TEXT_SOURCES[textSource]?.name || textSource;

  const marksShort =
    marksMode === "off"
      ? "Marks Off"
      : marksMode === "blueprint"
      ? "Blueprint"
      : marksMode === "text"
      ? "Glitch Text"
      : "Mixed";
  const textShort =
    textSource === "hooks80s"
      ? "80s Hooks"
      : textSource === "design80s"
      ? "80s Design"
      : textSource === "original"
      ? "Original"
      : "Mixed Text";
  const themeShort = eightiesTheme ? "Dream Machine '84" : "Any Symbols";

  textEl.textContent = `${moveName} • ${getPaletteName()}`;
  swatchEl.style.background = pickPaletteAccentHex();
}

function updateSeedInUrl() {
  const url = new URL(window.location.href);
  // short, reproducible URLs:
  //   ?s=<seed>&p=<palette>&m=<move>&mk=<marks>&tx=<text>&th=<theme>
  // Most params are omitted when they match defaults.
  const paletteSlug = getPaletteSlug();
  const moveSlug = MOVES[movementMode]?.slug || movementMode;
  const marksSlug = MARKS[marksMode]?.slug || marksMode;
  const textSlug = TEXT_SOURCES[textSource]?.slug || textSource;
  const themeSlug = eightiesTheme ? "80s" : "any";

  const seedCode =
    window.$fx && window.$fx.hash
      ? window.$fx.hash.slice(-6)
      : typeof __localSeed === "string"
      ? __localSeed
      : "local";

  url.searchParams.set("s", seedCode);
  url.searchParams.set("p", paletteSlug);

  if (moveSlug !== "pixel") url.searchParams.set("m", moveSlug);
  else url.searchParams.delete("m");

  if (marksSlug !== "mixed") url.searchParams.set("mk", marksSlug);
  else url.searchParams.delete("mk");

  if (textSlug !== "mixed") url.searchParams.set("tx", textSlug);
  else url.searchParams.delete("tx");

  if (themeSlug !== "80s") url.searchParams.set("th", themeSlug);
  else url.searchParams.delete("th");

  // Back-compat: remove old verbose param if present.
  url.searchParams.delete("seed");
  url.searchParams.delete("seedStr");
  window.history.replaceState({}, "", url);
}

// ---------------------------
// Canvas sizing
// ---------------------------
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return { width: rect.width, height: rect.height };
}

// ---------------------------
// Pixel engine (low-res buffer scaled up)
// ---------------------------
let px = {
  w: 0,
  h: 0,
  size: 3,
  canvas: null,
  ctx: null,
  img: null,
  data: null,
  heads: [],
  frame: 0,
};

function pickRgbFromPalette() {
  const arr = PALETTE_RGB[paletteMode] || PALETTE_RGB[0];
  const hsls = PALETTE_HSL[paletteMode] || PALETTE_HSL[0];
  const weights = hsls.map((c) => {
    const mid = 1 - Math.abs(c.l - 58) / 58;
    const sat = 0.6 + c.s / 120;
    const avoidBlack = c.l < 10 ? 0.25 : 1;
    return Math.max(0.06, mid * sat * avoidBlack);
  });
  return arr[pickWeightedIndex(weights)];
}

function putPixel(x, y, r, g, b, a = 255) {
  x = (x + px.w) % px.w;
  y = (y + px.h) % px.h;
  const i = (y * px.w + x) * 4;
  px.data[i] = r;
  px.data[i + 1] = g;
  px.data[i + 2] = b;
  px.data[i + 3] = a;
}

function blendPixel(x, y, r, g, b, t) {
  x = (x + px.w) % px.w;
  y = (y + px.h) % px.h;
  const i = (y * px.w + x) * 4;
  px.data[i] = lerp(px.data[i], r, t) | 0;
  px.data[i + 1] = lerp(px.data[i + 1], g, t) | 0;
  px.data[i + 2] = lerp(px.data[i + 2], b, t) | 0;
  px.data[i + 3] = 255;
}

const HOLD_STRENGTH = 0.92;
const HOLD_FRAME_DECAY = 0.9986;

function paintBlend(x, y, r, g, b, t) {
  x = (x + px.w) % px.w;
  y = (y + px.h) % px.h;

  if (px.hold) {
    const hi = (y * px.w + x) | 0;
    const h = px.hold[hi] / 255;
    t = t * (1 - h * HOLD_STRENGTH);
    if (t < 0.02) return;
  }
  blendPixel(x, y, r, g, b, t);
}

function getPixel(x, y) {
  x = (x + px.w) % px.w;
  y = (y + px.h) % px.h;
  const i = (y * px.w + x) * 4;
  return {
    r: px.data[i],
    g: px.data[i + 1],
    b: px.data[i + 2],
    a: px.data[i + 3],
  };
}

function clearPixelBuffer() {
  const bg = `hsl(${bgHue}, ${bgSat}%, ${bgLight}%)`;
  px.ctx.fillStyle = bg;
  px.ctx.fillRect(0, 0, px.w, px.h);
  px.img = px.ctx.getImageData(0, 0, px.w, px.h);
  px.data = px.img.data;

  const specks = Math.floor(px.w * px.h * 0.02);
  for (let i = 0; i < specks; i++) {
    const x = randInt(px.w);
    const y = randInt(px.h);
    const c = pickRgbFromPalette();
    const t = 0.15 + rand() * 0.5;

    blendPixel(x, y, c.r, c.g, c.b, t);
  }

  if (px.hold) px.hold.fill(0);
}

// ---------------------------
// Direction + behavior helpers (pixel progression patterns)
// ---------------------------
const DIR8 = [
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
];
const DIR4I = [0, 2, 4, 6];
const KNIGHT = [
  [2, 1],
  [1, 2],
  [-1, 2],
  [-2, 1],
  [-2, -1],
  [-1, -2],
  [1, -2],
  [2, -1],
];

// ---------------------------
// Shuffle-bag helpers (even frequency / no repeats until cycle)
// ---------------------------

const SYMBOL_COUNT = 80;
let symbolBag = [];
function nextSymbolKind() {
  if (!symbolBag.length) {
    symbolBag = Array.from({ length: SYMBOL_COUNT }, (_, i) => i);
    shuffleInPlace(symbolBag);
  }
  return symbolBag.pop();
}

let stampTypeBag = [];
function nextStampType() {
  if (!stampTypeBag.length) {
    stampTypeBag = ["blueprint", "blueprint", "text"];
    shuffleInPlace(stampTypeBag);
  }
  return stampTypeBag.pop();
}

const phraseBagMap = new Map();
function pickFromBag(key, pool) {
  if (!pool || !pool.length) return "";
  let bag = phraseBagMap.get(key);
  if (!bag || !bag.length) {
    bag = Array.from({ length: pool.length }, (_, i) => i);
    shuffleInPlace(bag);
    phraseBagMap.set(key, bag);
  }
  return pool[bag.pop()];
}

function sgn(n) {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function rotateDirI(i, steps) {
  return (i + steps + 8000) % 8;
}

function dirToward(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = sgn(dx);
  const sy = sgn(dy);
  if (ax === 0 && ay === 0) return randInt(8);
  if (ax > ay * 2) return sx > 0 ? 0 : 4;
  if (ay > ax * 2) return sy > 0 ? 2 : 6;
  if (sx > 0 && sy > 0) return 1;
  if (sx < 0 && sy > 0) return 3;
  if (sx < 0 && sy < 0) return 5;
  return 7;
}

function hash2(x, y, t, seed) {
  let n =
    (x * 374761393 + y * 668265263 + t * 1442695041 + seed * 3266489917) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = (n * 1274126177) | 0;
  return (n ^ (n >>> 16)) >>> 0;
}

function pickBehavior() {
  const keys = ["grid", "zigzag", "orbit", "noise", "burst"];
  const weights = [0.34, 0.22, 0.16, 0.2, 0.08];
  return keys[pickWeightedIndex(weights)];
}

function resetBehavior(h) {
  h.beh = pickBehavior();
  h.behUntil = px.frame + 90 + randInt(240);
  h.turnEvery = 2 + randInt(9);
  h.centerX = randInt(px.w);
  h.centerY = randInt(px.h);
  h.spin = chance(0.5) ? -1 : 1;
  h.zigFlip = 0;
  h.zigA = null;
  h.zigB = null;
  h.burst = 0;
}

function makeHeads(count) {
  px.heads = [];
  const dirWeights = [1.15, 0.85, 1.15, 0.85, 1.15, 0.85, 1.15, 0.85];

  for (let i = 0; i < count; i++) {
    const c = pickRgbFromPalette();
    const dirI = pickWeightedIndex(dirWeights);

    const h = {
      x: randInt(px.w),
      y: (rand() * px.h) | 0,
      dirI,
      seed: randInt(1e9),
      col: { r: c.r, g: c.g, b: c.b },
      step: 1 + randInt(3),
      beh: "grid",
      behUntil: 0,
      turnEvery: 4,
      centerX: 0,
      centerY: 0,
      spin: 1,
      zigFlip: 0,
      zigA: null,
      zigB: null,
      burst: 0,
    };

    resetBehavior(h);
    px.heads.push(h);
  }
}

function initPixelEngine(viewW, viewH) {
  const minDim = Math.min(viewW, viewH);
  const targetCells = 260;
  const pxSize = clamp(Math.floor(minDim / targetCells), 2, 6);

  px.size = pxSize;
  px.w = Math.max(64, Math.floor(viewW / px.size));
  px.h = Math.max(64, Math.floor(viewH / px.size));

  px.canvas = document.createElement("canvas");
  px.canvas.width = px.w;
  px.canvas.height = px.h;
  px.ctx = px.canvas.getContext("2d", { willReadFrequently: true });
  px.ctx.imageSmoothingEnabled = false;

  initStampCanvas();

  clearPixelBuffer();
  px.hold = new Uint8Array(px.w * px.h);
  makeHeads(Math.floor((px.w * px.h) / 900) + 60);
  px.frame = 0;
}

function glitchCopyBlock() {
  if (px.w < 8 || px.h < 8) return;

  const bw = clamp((rand() * px.w) | 0, 6, Math.floor(px.w * 0.28));
  const bh = clamp((rand() * px.h) | 0, 4, Math.floor(px.h * 0.18));

  const sx = ((rand() * (px.w - bw)) | 0) >>> 0;
  const sy = ((rand() * (px.h - bh)) | 0) >>> 0;

  const dx = clamp(sx + ((rand() * 26 - 13) | 0), 0, px.w - bw);
  const dy = clamp(sy + ((rand() * 18 - 9) | 0), 0, px.h - bh);

  // copy row by row
  for (let y = 0; y < bh; y++) {
    const srcI = ((sy + y) * px.w + sx) * 4;
    const dstI = ((dy + y) * px.w + dx) * 4;
    px.data.copyWithin(dstI, srcI, srcI + bw * 4);
  }

  // slight color flare on the copied area edges
  if (rand() < 0.65) {
    const c = pickRgbFromPalette();
    for (let k = 0; k < bw; k++) {
      blendPixel(dx + k, dy, c.r, c.g, c.b, 0.25);
      blendPixel(dx + k, dy + bh - 1, c.r, c.g, c.b, 0.18);
    }
  }
}

function datamoshRows() {
  const rows = 2 + ((rand() * 6) | 0);
  for (let r = 0; r < rows; r++) {
    const y = (rand() * px.h) | 0;
    const shift = ((rand() * 36 - 18) | 0) * 4;
    if (shift === 0) continue;

    const rowStart = y * px.w * 4;
    const rowEnd = rowStart + px.w * 4;
    // rotate row in-place with temp slice
    const tmp = px.data.slice(rowStart, rowEnd);
    const s = ((shift % (px.w * 4)) + px.w * 4) % (px.w * 4);
    for (let i = 0; i < px.w * 4; i++) {
      px.data[rowStart + i] = tmp[(i - s + px.w * 4) % (px.w * 4)];
    }
  }
}

// ---------------------------
// Semantic marks (glitch text / blueprint doodles) stamped into the pixel buffer
// ---------------------------
let stamp = {
  canvas: null,
  ctx: null,
};

const PHRASES_ORIGINAL = [
  "H O L O  W O R L D S",
  "SIGNAL // NOISE",
  "DIAGRAM OF A DREAM",
  "ECHOES IN GLASS",
  "SYSTEMS / SOULS",
  "NOTES FROM TOMORROW",
  "CHROMA MEMORY",
  "ERRORS AS ORNAMENT",
  "THIS IS A BLUEPRINT",
  "GLITCH IS LANGUAGE",
  "DRAW THE INVISIBLE",
  "GHOST IN THE GRID",
  "PHOSPHOR DREAMS",
  "PRISMATIC STATIC",
  "AFTERIMAGE ARCHIVE",
  "PIXEL SERMON",
  "ELECTRIC LULLABY",
  "SPECTRAL SCHEMATICS",
];

const PHRASES_80S_DESIGN = [
  "VHS TRACKING",
  "TRACKING...",
  "SCANLINES // ON",
  "PAL / NTSC",
  "CATHODE RAY",
  "CRT PHOSPHOR",
  "VECTOR WIREFRAME",
  "NEON GRID HORIZON",
  "ANALOG GLOW",
  "CHROME TYPE",
  "CASSETTE TAPE",
  "SIDE A / SIDE B",
  "AUTO-REVERSE",
  "TAPE HISS",
  "CASSETTE CLICK",
  "VINYL CRACKLE",
  "FLOPPY DISK 3.5",
  "POLAROID FLASH",
  "LASERDISC",
  "COMPACT DISC",
  "BOOMBOX BLAST",
  "BRICK PHONE",
  "BEEPER // PAGER",
  "DOT-MATRIX PRINT",
  "DIAL TONE",
  "INSERT COIN",
  "ARCADE // HI-SCORE",
  "ARCADE TOKENS",
  "8-BIT CONSOLE",
  "PRESS START",
  "LEVEL UP!",
  "PAUSE // REWIND",
  "FAST FORWARD",
  "MIDI // CLOCK",
  "GATED SNARE",
  "CHORUS PEDAL",
  "REVERB TAIL",
  "FM STEREO",
  "TOP 40 RADIO",
  "RADIO EDIT",
  "MAXI-SINGLE 12-INCH",
  "ACID WASH",
  "BOXY BLAZER",
  "SHOULDER PADS",
  "HAIRSPRAY CLOUD",
  "HYPERCOLOR",
  "PAC-MAN",
  "SEGA",
  "RADICAL",
  "COMMODORE 64",
  "DONKEY KONG",
  "FANNY PACK",
  "ROLLER RINK",
  "MALL FOOD COURT",
  "SATURDAY MORNING",
  "NEON SUNSET",
  "MIAMI VICE VIBES",
  "CHERRY COLA",
  "BUBBLEGUM POP",
  "STICKER BOOK",
  "TRAPPER KEEPER",
  "ADMIT ONE",
  "MATINEE",
  "MAKE MY DAY",
  "BOGUS",
  "DAMAGE",
  "ROW A",
  "SEAT 12",
  "DANCE FLOOR",
  "TOTAL RAD",
  "NEON NIGHTS",
  "REC ●",
  "PSYCH!",
  "WHOA!",
  "BAM!",
  "LIKE, TOTALLY",
  "BODACIOUS",
  "CHILL PILL",
];

const PHRASES_80S_HOOKS = [
  "TAKE ON ME",
  "SWEET DREAMS",
  "BILLIE JEAN",
  "THRILLER",
  "PURPLE RAIN",
  "1999",
  "LIKE A VIRGIN",
  "MATERIAL GIRL",
  "GIRLS JUST WANT TO HAVE FUN",
  "TIME AFTER TIME",
  "I WANNA DANCE WITH SOMEBODY",
  "CARELESS WHISPER",
  "WAKE ME UP BEFORE YOU GO-GO",
  "NEVER GONNA GIVE YOU UP",
  "EVERY BREATH YOU TAKE",
  "WITH OR WITHOUT YOU",
  "LIVIN' ON A PRAYER",
  "DON'T STOP BELIEVIN'",
  "AFRICA",
  "DANGER ZONE",
  "DON'T YOU WANT ME",
  "TAINTED LOVE",
  "KISS",
  "BAD",
  "BLUE MONDAY",
  "HUNGRY LIKE THE WOLF",
  "RIO",
  "THE FINAL COUNTDOWN",
  "EYE OF THE TIGER",
  "THE POWER OF LOVE",
  "MONEY FOR NOTHING",
  "DANCING IN THE DARK",
  "TAKE MY BREATH AWAY",
  "TRUE COLORS",
  "LAST CHRISTMAS",
  "BACK TO THE FUTURE",
  "GHOSTBUSTERS",
  "WHO YOU GONNA CALL",
  "BEVERLY HILLS COP",
  "TOP GUN",
  "THE KARATE KID",
  "DIRTY DANCING",
  "FOOTLOOSE",
  "WAX ON",
  "WAX OFF",
  "EXCELLENT!",
  "GET A CLUE",
  "LABYRINTH",
  "COMMANDO",
  "THE BREAKFAST CLUB",
  "THE GOONIES",
  "SPACEBALLS",
  "RAIDERS OF THE LOST ARK",
  "E.T.",
  "PARIS, TEXAS",
  "PRETTY IN PINK",
  "REPO MAN",
  "KNIGHT RIDER",
  "AFTER HOURS",
  "GOLDEN GIRLS",
  "MIAMI VICE",
  "BANANA BOAT",
  "IT'S SHOWTIME!",
  "STAND BY ME",
  "I WANT MY MTV",
  "PARTY ON",
  "FIZZ, FIZZ",
];

function initStampCanvas() {
  stamp.canvas = document.createElement("canvas");
  stamp.canvas.width = px.w;
  stamp.canvas.height = px.h;
  stamp.ctx = stamp.canvas.getContext("2d", { willReadFrequently: true });
  stamp.ctx.imageSmoothingEnabled = false;
}

function pickPhrase() {
  if (!eightiesTheme) return pickFromBag("original", PHRASES_ORIGINAL);

  const a = PHRASES_80S_DESIGN.length;
  const b = PHRASES_ORIGINAL.length;
  const c = PHRASES_80S_HOOKS.length;
  const total = a + b + c;
  const r = rand() * total;

  if (r < a) return pickFromBag("design", PHRASES_80S_DESIGN);
  if (r < a + b) return pickFromBag("original", PHRASES_ORIGINAL);
  return pickFromBag("hooks", PHRASES_80S_HOOKS);
}

function stampCompositeRegion(
  x0,
  y0,
  w,
  h,
  strength = 0.92,
  forceBlack = false
) {
  const img = stamp.ctx.getImageData(x0, y0, w, h);
  const d = img.data;

  let invert = false;
  {
    const cx = (x0 + (w >> 1) + px.w) % px.w | 0;
    const cy = (y0 + (h >> 1) + px.h) % px.h | 0;
    const bi = (cy * px.w + cx) * 4;
    const br = px.data[bi],
      bg = px.data[bi + 1],
      bb = px.data[bi + 2];
    const blum = (br * 0.299 + bg * 0.587 + bb * 0.114) / 255;
    invert = blum > 0.55;
    if (chance(0.03)) invert = !invert;
  }
  const isText = forceBlack;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const a = d[si + 3];
      if (a < 12) continue;

      const lum = (d[si] * 0.299 + d[si + 1] * 0.587 + d[si + 2] * 0.114) / 255;
      if (lum < 0.12 && a < 80) continue;

      const t = clamp((a / 255) * strength * (0.55 + 0.6 * lum), 0.06, 0.92);

      const pxX = (x0 + x + px.w) % px.w;
      const pxY = (y0 + y + px.h) % px.h;

      let inkR = 245,
        inkG = 247,
        inkB = 255;

      if (isText) {
        if (lum > 0.62) {
          inkR = 255;
          inkG = 255;
          inkB = 255;
        } else {
          inkR = 0;
          inkG = 0;
          inkB = 0;
        }
      } else {
        if (!invert && chance(0.055)) {
          const c = pickRgbFromPalette();
          inkR = c.r;
          inkG = c.g;
          inkB = c.b;
        }
        if (invert) {
          inkR = 5;
          inkG = 6;
          inkB = 10;
        }
        if (chance(0.08)) {
          inkR = 10;
          inkG = 12;
          inkB = 18;
        }
      }

      blendPixel(pxX, pxY, inkR, inkG, inkB, t);
      if (px.hold) {
        const hi = (pxY * px.w + pxX) | 0;
        const hv = clamp((200 + strength * 90) | 0, 120, 255);
        if (px.hold[hi] < hv) px.hold[hi] = hv;
      }
    }
  }
}

function drawJitterText(x, y, textStr, maxW) {
  const sctx = stamp.ctx;

  const size = 7 + randInt(8);
  sctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  sctx.textBaseline = "top";

  let cx = x;
  const baseY = y;
  const jitter = 0.8 + randInt(1.6);
  const tilt = rand() * 0.16 - 0.08;

  sctx.save();
  sctx.translate(x, y);
  sctx.rotate(tilt);
  sctx.translate(-x, -y);

  sctx.fillStyle = "rgba(0,0,0,0.95)";
  sctx.strokeStyle = "rgba(255,255,255,0.92)";
  sctx.lineWidth = 2;

  for (let i = 0; i < textStr.length; i++) {
    const ch = textStr[i];

    const glitch = movementMode !== "pixel" && rand() < 0.1;
    const gch = String.fromCharCode(33 + randInt(60));

    const dx = rand() * jitter - jitter / 2;
    const dy = rand() * jitter - jitter / 2;

    sctx.strokeText(ch, cx + dx + 1, baseY + dy + 1);
    sctx.fillText(ch, cx + dx, baseY + dy);

    if (glitch) {
      sctx.save();
      sctx.globalAlpha *= 0.55;
      const gx = cx + dx + (rand() < 0.5 ? 2 : -2);
      const gy = baseY + dy + (rand() < 0.5 ? 2 : -2);
      if (rand() < 0.35) sctx.strokeText(gch, gx + 1, gy + 1);
      sctx.fillText(gch, gx, gy);
      sctx.restore();
    }

    const w = sctx.measureText(ch).width;
    cx += w + (rand() < 0.22 ? 0 : 1);
    if (cx > x + maxW) break;
  }

  sctx.restore();
}

function drawBlueprint(x, y, w, h) {
  const sctx = stamp.ctx;
  sctx.save();

  sctx.translate(x + w * 0.5, y + h * 0.5);
  sctx.rotate(rand() * 0.28 - 0.14);
  sctx.translate(-(x + w * 0.5), -(y + h * 0.5));

  sctx.lineWidth = 1;
  sctx.strokeStyle = "rgba(255,255,255,0.85)";

  const drawMiniLabel = (txt, lx, ly) => {
    sctx.save();
    sctx.globalAlpha = 0.8;
    sctx.font = `8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    sctx.fillStyle = "rgba(255,255,255,0.85)";
    sctx.fillText(String(txt), lx | 0, ly | 0);
    sctx.restore();
  };
  sctx.fillStyle = "rgba(255,255,255,0.14)";

  sctx.strokeRect(x, y, w, h);

  const gx = 3 + randInt(5);
  const gy = 3 + randInt(5);
  sctx.globalAlpha = 0.55;
  for (let i = 1; i < gx; i++) {
    const xx = x + (w * i) / gx;
    sctx.beginPath();
    sctx.moveTo(xx, y);
    sctx.lineTo(xx, y + h);
    sctx.stroke();
  }
  for (let j = 1; j < gy; j++) {
    const yy = y + (h * j) / gy;
    sctx.beginPath();
    sctx.moveTo(x, yy);
    sctx.lineTo(x + w, yy);
    sctx.stroke();
  }
  sctx.globalAlpha = 1;

  function line(x1, y1, x2, y2) {
    sctx.beginPath();
    sctx.moveTo(x1, y1);
    sctx.lineTo(x2, y2);
    sctx.stroke();
  }

  function rectR(rx, ry, rw, rh, r) {
    const rr = Math.min(r, rw * 0.25, rh * 0.25);
    sctx.beginPath();
    sctx.moveTo(rx + rr, ry);
    sctx.lineTo(rx + rw - rr, ry);
    sctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
    sctx.lineTo(rx + rw, ry + rh - rr);
    sctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
    sctx.lineTo(rx + rr, ry + rh);
    sctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
    sctx.lineTo(rx, ry + rr);
    sctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    sctx.stroke();
  }

  if (eightiesTheme) {
    const kind = nextSymbolKind();

    if (kind === 0) {
      // cassette tape
      const bw = Math.max(14, (w * 0.66) | 0);
      const bh = Math.max(10, (h * 0.44) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      sctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.33,
        by + bh * 0.56,
        Math.max(2, (bh * 0.18) | 0),
        0,
        Math.PI * 2
      );
      sctx.arc(
        bx + bw * 0.67,
        by + bh * 0.56,
        Math.max(2, (bh * 0.18) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      line(bx + bw * 0.33, by + bh * 0.56, bx + bw * 0.67, by + bh * 0.56);
      // label stripe
      sctx.globalAlpha = 0.45;
      sctx.strokeRect(bx + 3, by + 3, bw - 6, Math.max(3, (bh * 0.22) | 0));
      sctx.globalAlpha = 1;
    } else if (kind === 1) {
      // VHS tape
      const bw = Math.max(16, (w * 0.76) | 0);
      const bh = Math.max(10, (h * 0.46) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      sctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
      // windows
      const ww = Math.max(3, (bw * 0.18) | 0);
      sctx.strokeRect(bx + bw * 0.18, by + bh * 0.36, ww, ww);
      sctx.strokeRect(bx + bw * 0.64, by + bh * 0.36, ww, ww);
      // center label
      sctx.globalAlpha = 0.45;
      sctx.strokeRect(bx + bw * 0.34, by + 2, bw * 0.32, bh * 0.24);
      sctx.globalAlpha = 1;
    } else if (kind === 2) {
      // floppy disk
      const bw = Math.max(14, (w * 0.54) | 0);
      const bh = Math.max(14, (h * 0.62) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      // shutter + label
      sctx.strokeRect(bx + 2, by + 2, bw - 4, Math.max(3, (bh * 0.18) | 0));
      sctx.globalAlpha = 0.5;
      sctx.strokeRect(bx + 2, by + bh * 0.55, bw - 4, bh * 0.22);
      sctx.globalAlpha = 1;
      // notch
      sctx.fillRect(bx + bw - 3, by + bh - 7, 2, 6);
    } else if (kind === 3) {
      // CRT monitor
      const bw = Math.max(16, (w * 0.68) | 0);
      const bh = Math.max(14, (h * 0.5) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      rectR(bx, by, bw, bh, 3);
      // screen area
      sctx.globalAlpha = 0.55;
      rectR(bx + 2, by + 2, bw - 4, bh - 6, 2);
      sctx.globalAlpha = 1;
      // scanlines
      sctx.globalAlpha = 0.35;
      for (let i = 0; i < 5; i++) {
        const yy = (by + 4 + (i * (bh - 10)) / 4) | 0;
        line(bx + 4, yy, bx + bw - 4, yy);
      }
      sctx.globalAlpha = 1;
      // little stand
      line(bx + bw * 0.35, by + bh + 2, bx + bw * 0.65, by + bh + 2);
    } else if (kind === 4) {
      // arcade cabinet
      const bw = Math.max(16, (w * 0.5) | 0);
      const bh = Math.max(18, (h * 0.72) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      // body
      sctx.beginPath();
      sctx.moveTo(bx, by + bh);
      sctx.lineTo(bx, by + 5);
      sctx.lineTo(bx + bw * 0.22, by);
      sctx.lineTo(bx + bw, by);
      sctx.lineTo(bx + bw, by + bh);
      sctx.closePath();
      sctx.stroke();
      // screen + controls
      sctx.strokeRect(bx + bw * 0.18, by + bh * 0.18, bw * 0.64, bh * 0.26);
      sctx.strokeRect(bx + bw * 0.22, by + bh * 0.55, bw * 0.56, bh * 0.16);
      sctx.beginPath();
      sctx.arc(bx + bw * 0.34, by + bh * 0.63, 2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.66, by + bh * 0.63, 2, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 5) {
      // joystick / controller
      const bw = Math.max(16, (w * 0.66) | 0);
      const bh = Math.max(10, (h * 0.32) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      rectR(bx, by, bw, bh, 3);
      // stick
      line(bx + bw * 0.28, by + bh * 0.2, bx + bw * 0.28, by - bh * 0.35);
      sctx.beginPath();
      sctx.arc(bx + bw * 0.28, by - bh * 0.35, 3, 0, Math.PI * 2);
      sctx.stroke();
      // buttons
      sctx.beginPath();
      sctx.arc(bx + bw * 0.72, by + bh * 0.55, 2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.82, by + bh * 0.45, 2, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 6) {
      // synth keyboard
      const bw = Math.max(18, (w * 0.78) | 0);
      const bh = Math.max(10, (h * 0.28) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      const keys = 10 + randInt(8);
      sctx.globalAlpha = 0.5;
      for (let i = 1; i < keys; i++) {
        const xx = (bx + (bw * i) / keys) | 0;
        line(xx, by + 2, xx, by + bh - 2);
      }
      sctx.globalAlpha = 1;
      // knobs
      sctx.beginPath();
      sctx.arc(bx + bw * 0.12, by + bh * 0.35, 2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.2, by + bh * 0.35, 2, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 7) {
      // Memphis pattern bits: squiggle + triangle + dots
      const sx = x + 3 + randInt(Math.max(1, w - 6));
      const sy = y + 3 + randInt(Math.max(1, h - 6));
      // squiggle
      sctx.globalAlpha = 0.75;
      sctx.beginPath();
      const amp = 2 + randInt(4);
      const len = Math.max(10, (Math.min(w, h) * 0.55) | 0);
      sctx.moveTo(sx, sy);
      for (let i = 0; i < len; i += 3) {
        const xx = sx + i;
        const yy = sy + Math.sin((i / 6) * Math.PI * 2) * amp;
        sctx.lineTo(xx, yy);
      }
      sctx.stroke();
      // triangle
      const tx = (x + w * 0.22) | 0;
      const ty = (y + h * 0.7) | 0;
      sctx.beginPath();
      sctx.moveTo(tx, ty);
      sctx.lineTo(tx + 10, ty - 8);
      sctx.lineTo(tx + 18, ty + 6);
      sctx.closePath();
      sctx.stroke();
      // dots
      for (let i = 0; i < 8; i++) {
        sctx.fillRect(x + 2 + randInt(w - 4), y + 2 + randInt(h - 4), 1, 1);
      }
      sctx.globalAlpha = 1;
    } else if (kind === 8) {
      // circuit traces (still very 80s)
      const n = 10 + randInt(14);
      sctx.globalAlpha = 0.8;
      for (let i = 0; i < n; i++) {
        const x1 = x + 1 + randInt(w - 2);
        const y1 = y + 1 + randInt(h - 2);
        const x2 = x + 1 + randInt(w - 2);
        const y2 = y + 1 + randInt(h - 2);
        line(x1, y1, x2, y1);
        line(x2, y1, x2, y2);
        if (rand() < 0.45) sctx.fillRect(x2 - 1, y2 - 1, 2, 2);
      }
      sctx.globalAlpha = 1;
    } else if (kind === 9) {
      // boombox
      const bw = Math.max(14, (w * 0.74) | 0);
      const bh = Math.max(10, (h * 0.42) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.25,
        by + bh * 0.56,
        Math.max(2, (bh * 0.2) | 0),
        0,
        Math.PI * 2
      );
      sctx.arc(
        bx + bw * 0.75,
        by + bh * 0.56,
        Math.max(2, (bh * 0.2) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      sctx.strokeRect(bx + bw * 0.4, by + 2, bw * 0.2, bh * 0.22);
      line(bx + 2, by + bh * 0.26, bx + bw - 2, by + bh * 0.26);
    } else if (kind === 10) {
      // Walkman
      const bw = Math.max(14, (w * 0.46) | 0);
      const bh = Math.max(16, (h * 0.62) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // tape window
      sctx.strokeRect(bx + 3, by + 4, bw - 6, (bh * 0.28) | 0);
      // divider
      line(bx + 3, (by + bh * 0.42) | 0, bx + bw - 3, (by + bh * 0.42) | 0);

      // buttons
      sctx.beginPath();
      sctx.arc(bx + bw * 0.3, by + bh * 0.78, 1.8, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.5, by + bh * 0.78, 1.8, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.7, by + bh * 0.78, 1.8, 0, Math.PI * 2);
      sctx.stroke();

      // headphones arc + pads
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.5,
        by - 2,
        bw * 0.55,
        Math.PI * 0.15,
        Math.PI * 0.85
      );
      sctx.stroke();
      rectR(bx - 3, by + 2, 5, 7, 2);
      rectR(bx + bw - 2, by + 2, 5, 7, 2);
    } else if (kind === 11) {
      // Palm + sun badge
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.62) | 0;

      // trunk
      line(cx, cy, cx - 2, cy - 10);
      line(cx - 2, cy - 10, cx - 1, cy - 16);

      // fronds
      line(cx - 1, cy - 16, cx - 10, cy - 20);
      line(cx - 1, cy - 16, cx + 8, cy - 22);
      line(cx - 1, cy - 16, cx - 2, cy - 24);

      // sun
      sctx.beginPath();
      sctx.arc(cx + 10, cy - 18, 4, 0, Math.PI * 2);
      sctx.stroke();

      // horizon
      line(x + 3, cy + 2, x + w - 3, cy + 2);
    } else if (kind === 12) {
      // Roller skate
      const bx = (x + w * 0.2) | 0;
      const by = (y + h * 0.45) | 0;
      const bw = Math.max(18, (w * 0.62) | 0);
      const bh = Math.max(10, (h * 0.28) | 0);

      // boot silhouette
      sctx.beginPath();
      sctx.moveTo(bx, by + bh);
      sctx.lineTo(bx + 6, by);
      sctx.lineTo((bx + bw * 0.55) | 0, by);
      sctx.lineTo((bx + bw * 0.7) | 0, (by + bh * 0.35) | 0);
      sctx.lineTo(bx + bw, (by + bh * 0.35) | 0);
      sctx.lineTo(bx + bw, by + bh);
      sctx.closePath();
      sctx.stroke();

      // base plate
      line(bx + 2, by + bh + 2, bx + bw - 2, by + bh + 2);

      // wheels
      sctx.beginPath();
      sctx.arc(bx + bw * 0.25, by + bh + 6, 2.5, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.5, by + bh + 6, 2.5, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.75, by + bh + 6, 2.5, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 13) {
      // High-top sneaker
      const bx = (x + w * 0.18) | 0;
      const by = (y + h * 0.46) | 0;
      const bw = Math.max(20, (w * 0.66) | 0);
      const bh = Math.max(12, (h * 0.3) | 0);

      // sole
      rectR(bx, by + bh, bw, 4, 2);

      // upper
      sctx.beginPath();
      sctx.moveTo(bx + 2, by + bh);
      sctx.lineTo((bx + bw * 0.18) | 0, (by + bh * 0.1) | 0);
      sctx.lineTo((bx + bw * 0.55) | 0, (by + bh * 0.1) | 0);
      sctx.lineTo((bx + bw * 0.68) | 0, (by + bh * 0.45) | 0);
      sctx.lineTo(bx + bw - 2, (by + bh * 0.55) | 0);
      sctx.lineTo(bx + bw - 2, by + bh);
      sctx.closePath();
      sctx.stroke();

      // ankle cuff
      sctx.strokeRect(
        (bx + bw * 0.14) | 0,
        by - 2,
        (bw * 0.16) | 0,
        (bh * 0.28) | 0
      );

      // lace dots
      for (let i = 0; i < 5; i++) {
        sctx.fillRect((bx + bw * 0.32 + i * 4) | 0, (by + bh * 0.36) | 0, 1, 1);
      }
    } else if (kind === 14) {
      // Landline phone (push-button)
      const bw = Math.max(18, (w * 0.72) | 0);
      const bh = Math.max(10, (h * 0.34) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 4); // base

      // keypad
      const kx = (bx + bw * 0.18) | 0;
      const ky = (by + bh * 0.28) | 0;
      const kw = (bw * 0.32) | 0;
      const kh = (bh * 0.52) | 0;
      sctx.strokeRect(kx, ky, kw, kh);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          sctx.fillRect(kx + 2 + c * 4, ky + 2 + r * 4, 1, 1);
        }
      }

      // handset
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.7,
        by + bh * 0.2,
        bw * 0.22,
        Math.PI * 0.15,
        Math.PI * 0.85
      );
      sctx.stroke();
    } else if (kind === 15) {
      // Landline phone (rotary)
      const bw = Math.max(18, (w * 0.72) | 0);
      const bh = Math.max(10, (h * 0.38) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 5);
      // rotary dial
      const cx = (bx + bw * 0.42) | 0;
      const cy = (by + bh * 0.55) | 0;
      const r1 = Math.max(6, (bh * 0.38) | 0);
      sctx.beginPath();
      sctx.arc(cx, cy, r1, 0, Math.PI * 2);
      sctx.arc(cx, cy, Math.max(3, (r1 * 0.45) | 0), 0, Math.PI * 2);
      sctx.stroke();

      // finger holes
      sctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 1.15 + i * 0.22;
        sctx.arc(
          cx + Math.cos(a) * (r1 * 0.68),
          cy + Math.sin(a) * (r1 * 0.68),
          1.2,
          0,
          Math.PI * 2
        );
      }
      sctx.stroke();

      // handset
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.72,
        by + bh * 0.2,
        bw * 0.24,
        Math.PI * 0.12,
        Math.PI * 0.88
      );
      sctx.stroke();
    } else if (kind === 16) {
      // Polaroid camera
      const bw = Math.max(18, (w * 0.7) | 0);
      const bh = Math.max(14, (h * 0.5) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 4);
      // lens
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.62,
        by + bh * 0.55,
        Math.max(4, (bh * 0.22) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.62,
        by + bh * 0.55,
        Math.max(2, (bh * 0.1) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();

      // viewfinder + flash
      sctx.strokeRect(bx + 4, by + 4, (bw * 0.22) | 0, (bh * 0.22) | 0);
      sctx.strokeRect(
        (bx + bw * 0.3) | 0,
        by + 4,
        (bw * 0.18) | 0,
        (bh * 0.14) | 0
      );

      // rainbow stripe
      line(bx + 4, (by + bh * 0.78) | 0, bx + bw - 4, (by + bh * 0.78) | 0);
      line(bx + 4, (by + bh * 0.82) | 0, bx + bw - 4, (by + bh * 0.82) | 0);
    } else if (kind === 17) {
      // Rubik's Cube
      const s = Math.max(16, Math.min(w, h) * 0.62) | 0;
      const bx = (x + (w - s) / 2) | 0;
      const by = (y + (h - s) / 2) | 0;

      rectR(bx, by, s, s, 3);

      // grid 3x3
      for (let i = 1; i < 3; i++) {
        line(bx + (s * i) / 3, by + 1, bx + (s * i) / 3, by + s - 1);
        line(bx + 1, by + (s * i) / 3, bx + s - 1, by + (s * i) / 3);
      }
    } else if (kind === 18) {
      // Sunglasses (aviators-ish)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;
      const r = Math.max(4, (Math.min(w, h) * 0.16) | 0);
      sctx.beginPath();
      sctx.arc(cx - r * 1.8, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + r * 1.8, cy, r, 0, Math.PI * 2);
      sctx.stroke();

      // bridge
      line(cx - r * 0.8, cy, cx + r * 0.8, cy);

      // temples
      line(cx - r * 2.6, cy, x + 2, cy - 2);
      line(cx + r * 2.6, cy, x + w - 2, cy - 2);
    } else if (kind === 19) {
      // Skateboard
      const bw = Math.max(18, (w * 0.74) | 0);
      const bh = Math.max(6, (h * 0.18) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 6);
      // trucks
      line(bx + bw * 0.18, by + bh + 2, bx + bw * 0.18, by + bh + 5);
      line(bx + bw * 0.82, by + bh + 2, bx + bw * 0.82, by + bh + 5);

      // wheels
      sctx.beginPath();
      sctx.arc(bx + bw * 0.16, by + bh + 7, 2.2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.24, by + bh + 7, 2.2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.76, by + bh + 7, 2.2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.84, by + bh + 7, 2.2, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 20) {
      // TV Remote
      const bw = Math.max(10, (w * 0.3) | 0);
      const bh = Math.max(22, (h * 0.74) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 4);

      // top IR bulb
      sctx.beginPath();
      sctx.arc(bx + bw * 0.5, by + 5, 2.2, 0, Math.PI * 2);
      sctx.stroke();

      // buttons
      for (let i = 0; i < 7; i++) {
        sctx.fillRect(bx + 3, by + 10 + i * 5, 2, 2);
        sctx.fillRect(bx + bw - 5, by + 10 + i * 5, 2, 2);
      }
      sctx.strokeRect(bx + 3, (by + bh * 0.62) | 0, bw - 6, 8); // big rocker
    } else if (kind === 21) {
      // Diary / notebook (spiral)
      const bw = Math.max(16, (w * 0.58) | 0);
      const bh = Math.max(20, (h * 0.7) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // spine
      line(bx + 5, by + 2, bx + 5, by + bh - 2);

      // rings
      for (let i = 0; i < 6; i++) {
        sctx.beginPath();
        sctx.arc(bx + 3, by + 5 + i * ((bh - 10) / 5), 1.2, 0, Math.PI * 2);
        sctx.stroke();
      }

      // little lock
      sctx.strokeRect((bx + bw * 0.62) | 0, (by + bh * 0.52) | 0, 6, 6);
      sctx.beginPath();
      sctx.arc(
        ((bx + bw * 0.62) | 0) + 3,
        (by + bh * 0.52) | 0,
        2.5,
        Math.PI,
        0
      );
      sctx.stroke();
    } else if (kind === 22) {
      // Spray paint can
      const bw = Math.max(10, (w * 0.28) | 0);
      const bh = Math.max(22, (h * 0.76) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by + 4, bw, bh - 4, 3); // body
      rectR(bx + 2, by, bw - 4, 6, 2); // cap
      sctx.strokeRect(bx + 3, by + 2, bw - 6, 2); // nozzle slit

      // label bands
      line(bx + 2, (by + bh * 0.38) | 0, bx + bw - 2, (by + bh * 0.38) | 0);
      line(bx + 2, (by + bh * 0.62) | 0, bx + bw - 2, (by + bh * 0.62) | 0);
    } else if (kind === 23) {
      // Pac-Man ghost (simple sprite)
      const s = Math.max(18, Math.min(w, h) * 0.62) | 0;
      const bx = (x + (w - s) / 2) | 0;
      const by = (y + (h - s) / 2) | 0;

      sctx.beginPath();
      sctx.arc(bx + s / 2, by + s / 2, s * 0.42, Math.PI, 0);
      sctx.lineTo(bx + s * 0.92, by + s * 0.92);
      sctx.lineTo(bx + s * 0.78, by + s * 0.78);
      sctx.lineTo(bx + s * 0.64, by + s * 0.92);
      sctx.lineTo(bx + s * 0.5, by + s * 0.78);
      sctx.lineTo(bx + s * 0.36, by + s * 0.92);
      sctx.lineTo(bx + s * 0.22, by + s * 0.78);
      sctx.lineTo(bx + s * 0.08, by + s * 0.92);
      sctx.closePath();
      sctx.stroke();

      // eyes
      sctx.beginPath();
      sctx.arc(bx + s * 0.42, by + s * 0.48, 2, 0, Math.PI * 2);
      sctx.arc(bx + s * 0.6, by + s * 0.48, 2, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 24) {
      // Neon lightning bolt
      const bx = (x + w * 0.3) | 0;
      const by = (y + h * 0.2) | 0;
      const ww = Math.max(16, (w * 0.4) | 0);
      const hh = Math.max(22, (h * 0.6) | 0);

      sctx.beginPath();
      sctx.moveTo(bx + ww * 0.55, by);
      sctx.lineTo(bx + ww * 0.2, by + hh * 0.52);
      sctx.lineTo(bx + ww * 0.52, by + hh * 0.52);
      sctx.lineTo(bx + ww * 0.3, by + hh);
      sctx.lineTo(bx + ww * 0.8, by + hh * 0.4);
      sctx.lineTo(bx + ww * 0.5, by + hh * 0.4);
      sctx.closePath();
      sctx.stroke();
    } else if (kind === 25) {
      // Scrunchie (hair tie)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;
      const rOuter = Math.max(7, (Math.min(w, h) * 0.28) | 0);
      const rInner = Math.max(3, (rOuter * 0.55) | 0);

      sctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = rOuter + Math.sin(a * 5) * 1.2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) sctx.moveTo(px, py);
        else sctx.lineTo(px, py);
      }
      sctx.closePath();
      sctx.stroke();

      sctx.beginPath();
      sctx.arc(cx, cy, rInner, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 26) {
      // Leg warmers (ribbed tubes)
      const bw = Math.max(18, (w * 0.6) | 0);
      const bh = Math.max(20, (h * 0.62) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      // left warmer
      rectR(bx, by, (bw * 0.42) | 0, bh, 4);
      // right warmer
      rectR((bx + bw * 0.56) | 0, by, (bw * 0.42) | 0, bh, 4);

      // ribs
      for (let i = 1; i < 6; i++) {
        line(
          bx + 1,
          by + (bh * i) / 6,
          (bx + bw * 0.42) | (0 - 1),
          by + (bh * i) / 6
        );
        line(
          (bx + bw * 0.56) | (0 + 1),
          by + (bh * i) / 6,
          bx + bw - 2,
          by + (bh * i) / 6
        );
      }
    } else if (kind === 27) {
      // Cherries (arcade fruit vibe)
      const cx = (x + w * 0.46) | 0;
      const cy = (y + h * 0.62) | 0;
      const r = Math.max(3, (Math.min(w, h) * 0.12) | 0);

      sctx.beginPath();
      sctx.arc(cx - r * 1.1, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + r * 1.1, cy + r * 0.25, r, 0, Math.PI * 2);
      sctx.stroke();

      // stems
      line(cx - r * 1.1, cy - r, cx - r * 0.2, cy - r * 2.0);
      line(cx + r * 1.1, cy - r * 0.75, cx - r * 0.2, cy - r * 2.0);
      // little leaf
      sctx.beginPath();
      sctx.moveTo(cx - r * 0.2, cy - r * 2.0);
      sctx.lineTo(cx + r * 0.6, cy - r * 2.2);
      sctx.lineTo(cx + r * 0.2, cy - r * 1.6);
      sctx.closePath();
      sctx.stroke();
    } else if (kind === 28) {
      // Strawberry
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.58) | 0;
      const s = Math.max(14, (Math.min(w, h) * 0.55) | 0);

      // body (rounded triangle)
      sctx.beginPath();
      sctx.moveTo(cx, cy - s * 0.46);
      sctx.bezierCurveTo(
        cx + s * 0.42,
        cy - s * 0.46,
        cx + s * 0.48,
        cy + s * 0.1,
        cx,
        cy + s * 0.52
      );
      sctx.bezierCurveTo(
        cx - s * 0.48,
        cy + s * 0.1,
        cx - s * 0.42,
        cy - s * 0.46,
        cx,
        cy - s * 0.46
      );
      sctx.stroke();

      // seeds
      for (let i = 0; i < 8; i++) {
        const px2 = cx + (randInt(11) - 5) * (s * 0.06);
        const py2 = cy + (randInt(11) - 5) * (s * 0.06);
        sctx.fillRect(px2 | 0, py2 | 0, 1, 1);
      }

      // leaves
      sctx.beginPath();
      sctx.moveTo(cx, cy - s * 0.55);
      sctx.lineTo(cx - s * 0.25, cy - s * 0.68);
      sctx.lineTo(cx - s * 0.1, cy - s * 0.45);
      sctx.lineTo(cx + s * 0.1, cy - s * 0.45);
      sctx.lineTo(cx + s * 0.25, cy - s * 0.68);
      sctx.closePath();
      sctx.stroke();
    } else if (kind === 29) {
      // Lips (pop art)
      const bx = (x + w * 0.18) | 0;
      const by = (y + h * 0.46) | 0;
      const ww = Math.max(22, (w * 0.64) | 0);
      const hh = Math.max(12, (h * 0.24) | 0);

      // top lip
      sctx.beginPath();
      sctx.moveTo(bx, by + hh * 0.55);
      sctx.bezierCurveTo(
        bx + ww * 0.25,
        by,
        bx + ww * 0.35,
        by + hh * 0.25,
        bx + ww * 0.5,
        by + hh * 0.25
      );
      sctx.bezierCurveTo(
        bx + ww * 0.65,
        by + hh * 0.25,
        bx + ww * 0.75,
        by,
        bx + ww,
        by + hh * 0.55
      );
      sctx.stroke();

      // bottom lip
      sctx.beginPath();
      sctx.moveTo(bx, by + hh * 0.55);
      sctx.bezierCurveTo(
        bx + ww * 0.3,
        by + hh,
        bx + ww * 0.7,
        by + hh,
        bx + ww,
        by + hh * 0.55
      );
      sctx.stroke();

      // mouth split
      sctx.globalAlpha = 0.55;
      line(bx + ww * 0.18, by + hh * 0.55, bx + ww * 0.82, by + hh * 0.55);
      sctx.globalAlpha = 1;
    } else if (kind === 30) {
      // Speech bubble "COOL"
      const bw = Math.max(26, (w * 0.68) | 0);
      const bh = Math.max(16, (h * 0.34) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 5);
      // tail
      sctx.beginPath();
      sctx.moveTo(bx + bw * 0.24, by + bh);
      sctx.lineTo(bx + bw * 0.18, by + bh + 6);
      sctx.lineTo(bx + bw * 0.34, by + bh);
      sctx.closePath();
      sctx.stroke();

      sctx.globalAlpha = 0.85;
      sctx.font = `8px ui-monospace, monospace`;
      sctx.fillText("COOL", bx + 6, by + bh - 6);
      sctx.globalAlpha = 1;
    } else if (kind === 31) {
      // Sparkle star
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.52) | 0;
      const r1 = Math.max(6, (Math.min(w, h) * 0.22) | 0);
      const r2 = Math.max(3, (r1 * 0.45) | 0);

      sctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r1 : r2;
        const px2 = cx + Math.cos(a) * rr;
        const py2 = cy + Math.sin(a) * rr;
        if (i === 0) sctx.moveTo(px2, py2);
        else sctx.lineTo(px2, py2);
      }
      sctx.closePath();
      sctx.stroke();

      // tiny cross rays
      sctx.globalAlpha = 0.55;
      line(cx - r1 - 3, cy, cx + r1 + 3, cy);
      line(cx, cy - r1 - 3, cx, cy + r1 + 3);
      sctx.globalAlpha = 1;
    } else if (kind === 32) {
      // Music note
      const bx = (x + w * 0.38) | 0;
      const by = (y + h * 0.22) | 0;
      const hh = Math.max(20, (h * 0.62) | 0);

      // stem
      line(bx + 8, by, bx + 8, by + hh);
      // flag
      sctx.beginPath();
      sctx.moveTo(bx + 8, by);
      sctx.lineTo(bx + 18, by + 4);
      sctx.lineTo(bx + 8, by + 10);
      sctx.closePath();
      sctx.stroke();
      // note head
      sctx.beginPath();
      sctx.arc(bx + 4, by + hh, 4, 0, Math.PI * 2);
      sctx.stroke();
    } else if (kind === 33) {
      // Memphis crown
      const bx = (x + w * 0.22) | 0;
      const by = (y + h * 0.3) | 0;
      const ww = Math.max(22, (w * 0.56) | 0);
      const hh = Math.max(16, (h * 0.4) | 0);

      sctx.beginPath();
      sctx.moveTo(bx, by + hh);
      sctx.lineTo(bx, by + hh * 0.45);
      sctx.lineTo(bx + ww * 0.2, by);
      sctx.lineTo(bx + ww * 0.4, by + hh * 0.45);
      sctx.lineTo(bx + ww * 0.6, by);
      sctx.lineTo(bx + ww * 0.8, by + hh * 0.45);
      sctx.lineTo(bx + ww, by);
      sctx.lineTo(bx + ww, by + hh);
      sctx.closePath();
      sctx.stroke();

      // base
      line(bx, by + hh, bx + ww, by + hh);
    } else if (kind === 34) {
      // Memphis grid tile
      const bw = Math.max(18, (w * 0.52) | 0);
      const bh = Math.max(18, (h * 0.52) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      sctx.strokeRect(bx, by, bw, bh);
      sctx.globalAlpha = 0.55;
      const n = 4;
      for (let i = 1; i < n; i++) {
        const xx = bx + (bw * i) / n;
        const yy = by + (bh * i) / n;
        line(xx, by, xx, by + bh);
        line(bx, yy, bx + bw, yy);
      }
      sctx.globalAlpha = 1;
    } else if (kind === 35) {
      // Pac-Man (simple circle with mouth)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;
      const r = Math.max(8, (Math.min(w, h) * 0.28) | 0);
      const mouth = Math.PI * (0.22 + rand() * 0.1);
      const dir = rand() < 0.5 ? 0 : Math.PI; // face right or left

      sctx.beginPath();
      sctx.arc(cx, cy, r, dir + mouth, dir + Math.PI * 2 - mouth);
      sctx.closePath();
      sctx.stroke();

      // eye
      sctx.beginPath();
      sctx.arc(
        cx + (dir === 0 ? -r * 0.15 : r * 0.15),
        cy - r * 0.35,
        1.5,
        0,
        Math.PI * 2
      );
      sctx.stroke();
    } else if (kind === 36) {
      // Home computer (C64 / Apple II-ish)
      const bw = Math.max(18, (w * 0.74) | 0);
      const bh = Math.max(14, (h * 0.58) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      // monitor
      const mw = (bw * 0.62) | 0;
      const mh = (bh * 0.58) | 0;
      rectR(bx, by, mw, mh, 3);
      sctx.strokeRect(bx + 2, by + 2, mw - 4, mh - 6);
      // tiny scanlines
      for (let yy = by + 4; yy < by + mh - 5; yy += 3)
        line(bx + 3, yy, bx + mw - 3, yy);

      // base / keyboard
      const kbY = by + mh + 2;
      rectR(bx + 2, kbY, bw - 4, bh - mh - 4, 3);
      // keys
      const kx0 = bx + 6,
        ky0 = kbY + 3;
      const kw = (bw - 16) | 0;
      const kh = Math.max(4, (bh - mh - 10) | 0);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 8; c++) {
          const rx = (kx0 + c * (kw / 8)) | 0;
          const ry = ky0 + r * (kh / 2);
          sctx.fillRect(rx, ry, 1, 1);
        }
      }
      drawMiniLabel("READY", bx + 4, by - 7);
    } else if (kind === 37) {
      // Supercar (Countach / Ferrari wedge vibe)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.62) | 0;
      const carW = Math.max(20, (w * 0.78) | 0);
      const carH = Math.max(8, (h * 0.22) | 0);
      const left = cx - (carW >> 1);
      const top = cy - (carH >> 1);

      sctx.beginPath();
      sctx.moveTo(left, top + carH);
      sctx.lineTo(left + carW * 0.2, top + carH * 0.25);
      sctx.lineTo(left + carW * 0.62, top + carH * 0.25);
      sctx.lineTo(left + carW * 0.82, top + carH * 0.55);
      sctx.lineTo(left + carW, top + carH * 0.55);
      sctx.lineTo(left + carW - 2, top + carH);
      sctx.closePath();
      sctx.stroke();

      // wheels
      sctx.beginPath();
      sctx.arc(left + carW * 0.28, top + carH + 2, 2.2, 0, Math.PI * 2);
      sctx.arc(left + carW * 0.74, top + carH + 2, 2.2, 0, Math.PI * 2);
      sctx.stroke();

      // window
      line(
        left + carW * 0.28,
        top + carH * 0.35,
        left + carW * 0.56,
        top + carH * 0.35
      );
      drawMiniLabel("TURBO", left + 2, top - 7);
    } else if (kind === 38) {
      // Pacifier badge / sticker
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.54) | 0;
      // ring
      sctx.beginPath();
      sctx.arc(cx, cy + 6, 5.2, 0, Math.PI * 2);
      sctx.stroke();
      // shield
      rectR(cx - 8, cy - 2, 16, 10, 4);
      // nipple
      sctx.beginPath();
      sctx.arc(cx, cy - 1, 3.0, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("BABY", cx - 8, cy - 12);
    } else if (kind === 39) {
      // Horn hand sign (rock 🤘)
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.6) | 0;
      sctx.beginPath();
      sctx.moveTo(cx - 6, cy + 6);
      sctx.lineTo(cx - 6, cy - 6); // left horn
      sctx.lineTo(cx - 2, cy - 2);
      sctx.lineTo(cx + 0, cy - 8); // right horn
      sctx.lineTo(cx + 2, cy - 2);
      sctx.lineTo(cx + 6, cy - 4); // thumb out
      sctx.lineTo(cx + 5, cy + 6);
      sctx.closePath();
      sctx.stroke();
      drawMiniLabel("ROCK", cx - 8, cy - 14);
    } else if (kind === 40) {
      // Retro headphones (over-ear)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;

      // headband
      sctx.beginPath();
      sctx.arc(
        cx,
        cy,
        Math.max(8, (w * 0.36) | 0),
        Math.PI * 1.05,
        Math.PI * -0.05,
        false
      );
      sctx.stroke();

      // ear cups
      rectR(cx - 12, cy + 2, 7, 10, 3);
      rectR(cx + 5, cy + 2, 7, 10, 3);
      // cable hint
      line(cx, cy + 12, cx + 6, cy + 16);
      drawMiniLabel("HI-FI", cx - 8, cy - 14);
    } else if (kind === 41) {
      // Hollow star sticker / earring
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;
      const R = Math.max(7, (Math.min(w, h) * 0.28) | 0);
      sctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? R : R * 0.45;
        const px2 = cx + Math.cos(a) * rr;
        const py2 = cy + Math.sin(a) * rr;
        if (i === 0) sctx.moveTo(px2, py2);
        else sctx.lineTo(px2, py2);
      }
      sctx.closePath();
      sctx.stroke();
      // little "hole" for earring vibe
      sctx.beginPath();
      sctx.arc(cx + R * 0.35, cy - R * 0.65, 1.4, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("STAR", cx - 10, cy + R + 2);
    } else if (kind === 42) {
      // Rainbow sticker (arc with stripes)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.7) | 0;
      const R = Math.max(10, (Math.min(w, h) * 0.42) | 0);
      const bands = 4;
      sctx.globalAlpha = 0.9;
      for (let i = 0; i < bands; i++) {
        const r = R - i * 3;
        sctx.beginPath();
        sctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
        sctx.stroke();
      }
      sctx.globalAlpha = 1;
      // clouds-ish ends
      sctx.beginPath();
      sctx.arc(cx - R + 2, cy, 3, Math.PI, Math.PI * 2);
      sctx.arc(cx + R - 2, cy, 3, Math.PI, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("RAINBOW", cx - 16, cy - R - 10);
    } else if (kind === 43) {
      // Slinky (spring coil)
      const cx = (x + w * 0.5) | 0;
      const top = (y + h * 0.22) | 0;
      const coilW = Math.max(14, (w * 0.55) | 0);
      const loops = 7 + randInt(4);
      const stepY = Math.max(2, (h * 0.06) | 0);
      for (let i = 0; i < loops; i++) {
        const yy = top + i * stepY * 2;
        sctx.beginPath();
        sctx.ellipse(cx, yy, coilW * 0.5, stepY, 0, 0, Math.PI * 2);
        sctx.stroke();
      }
      // shadow base
      line(
        cx - coilW * 0.35,
        top + loops * stepY * 2 + 2,
        cx + coilW * 0.35,
        top + loops * stepY * 2 + 2
      );
      drawMiniLabel("SLINKY", cx - 16, top - 8);
    } else if (kind === 44) {
      // 8-bit game console (Nintendo-inspired, but brand-neutral)
      const bw = Math.max(22, (w * 0.8) | 0);
      const bh = Math.max(12, (h * 0.36) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      rectR(bx, by, bw, bh, 3);
      // cartridge door
      sctx.strokeRect(bx + 4, by + 3, (bw * 0.42) | 0, bh - 6);
      // vents
      for (let i = 0; i < 5; i++) {
        const vx = (bx + bw * 0.52) | 0;
        const vy = by + 3 + i * 2;
        line(vx, vy, bx + bw - 4, vy);
      }
      // controller hint
      const cx = (bx + bw * 0.28) | 0;
      const cy = by + bh + 8;
      const cw = Math.max(14, (bw * 0.55) | 0);
      const ch = 8;
      rectR(cx - (cw >> 1), cy - (ch >> 1), cw, ch, 3);
      // d-pad
      line(cx - 6, cy, cx - 2, cy);
      line(cx - 4, cy - 2, cx - 4, cy + 2);
      // buttons
      sctx.beginPath();
      sctx.arc(cx + 8, cy, 1.6, 0, Math.PI * 2);
      sctx.arc(cx + 12, cy - 1, 1.6, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("8-BIT", bx + 4, by - 7);
    } else if (kind === 45) {
      // Tennis racket
      const cx = (x + w * 0.55) | 0;
      const cy = (y + h * 0.52) | 0;
      const rw = Math.max(10, (w * 0.3) | 0);
      const rh = Math.max(14, (h * 0.36) | 0);
      sctx.beginPath();
      sctx.ellipse(cx, cy - 4, rw, rh, -0.15, 0, Math.PI * 2);
      sctx.stroke();
      // strings
      sctx.globalAlpha = 0.45;
      for (let i = -2; i <= 2; i++) {
        line(cx - rw + 2, cy - 4 + i * 3, cx + rw - 2, cy - 4 + i * 3);
      }
      for (let i = -2; i <= 2; i++) {
        line(cx + i * 3, cy - rh - 4, cx + i * 3, cy + rh - 4);
      }
      sctx.globalAlpha = 1;
      // handle
      line(cx - 2, cy + rh - 2, cx - 6, cy + rh + 12);
      line(cx + 2, cy + rh - 2, cx - 2, cy + rh + 12);
      drawMiniLabel("TENNIS", cx - 18, cy - rh - 16);
    } else if (kind === 46) {
      // Soda cup with straw
      const bw = Math.max(14, (w * 0.34) | 0);
      const bh = Math.max(16, (h * 0.5) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      // cup
      sctx.beginPath();
      sctx.moveTo(bx + 2, by);
      sctx.lineTo(bx + bw - 2, by);
      sctx.lineTo(bx + bw - 4, by + bh);
      sctx.lineTo(bx + 4, by + bh);
      sctx.closePath();
      sctx.stroke();
      // lid
      line(bx + 1, by + 2, bx + bw - 1, by + 2);
      // straw
      line(bx + bw * 0.65, by - 6, bx + bw * 0.58, by + 2);
      line(bx + bw * 0.65, by - 6, bx + bw * 0.78, by - 10);
      // bubbles
      sctx.beginPath();
      sctx.arc(bx + bw * 0.25, by + bh * 0.5, 1.2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.35, by + bh * 0.62, 1.0, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("SODA", bx, by - 7);
    } else if (kind === 47) {
      // Bubblegum bubble
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.55) | 0;
      const r = Math.max(7, (Math.min(w, h) * 0.26) | 0);
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.stroke();
      // highlight
      sctx.globalAlpha = 0.55;
      sctx.beginPath();
      sctx.arc(
        cx - r * 0.35,
        cy - r * 0.35,
        Math.max(2, (r * 0.35) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      sctx.globalAlpha = 1;
      drawMiniLabel("GUM", cx - 10, cy + r + 2);
    } else if (kind === 48) {
      // Lipstick
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.58) | 0;
      // tube
      rectR(cx - 4, cy - 6, 8, 14, 2);
      // cap line
      line(cx - 4, cy + 2, cx + 4, cy + 2);
      // lipstick tip
      sctx.beginPath();
      sctx.moveTo(cx - 3, cy - 6);
      sctx.lineTo(cx + 3, cy - 6);
      sctx.lineTo(cx + 2, cy - 11);
      sctx.lineTo(cx - 2, cy - 11);
      sctx.closePath();
      sctx.stroke();
      drawMiniLabel("LIP", cx - 10, cy + 12);
    } else if (kind === 49) {
      // Two hearts
      const cx = (x + w * 0.46) | 0;
      const cy = (y + h * 0.56) | 0;
      function heart(hx, hy, s) {
        sctx.beginPath();
        sctx.moveTo(hx, hy);
        sctx.bezierCurveTo(
          hx - s,
          hy - s,
          hx - 2 * s,
          hy + s * 0.3,
          hx,
          hy + 2.1 * s
        );
        sctx.bezierCurveTo(hx + 2 * s, hy + s * 0.3, hx + s, hy - s, hx, hy);
        sctx.closePath();
        sctx.stroke();
      }
      heart(cx - 4, cy - 2, 3.2);
      heart(cx + 6, cy - 4, 3.2);
      drawMiniLabel("LOVE", cx - 12, cy + 16);
    } else if (kind === 50) {
      // Hand V sign (peace ✌)
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.62) | 0;
      sctx.beginPath();
      // two fingers
      sctx.moveTo(cx - 6, cy + 6);
      sctx.lineTo(cx - 2, cy - 8);
      sctx.lineTo(cx + 0, cy - 6);
      sctx.lineTo(cx - 3, cy + 6);
      sctx.closePath();
      sctx.stroke();

      sctx.beginPath();
      sctx.moveTo(cx - 1, cy + 6);
      sctx.lineTo(cx + 4, cy - 9);
      sctx.lineTo(cx + 6, cy - 7);
      sctx.lineTo(cx + 2, cy + 6);
      sctx.closePath();
      sctx.stroke();

      // palm
      rectR(cx - 4, cy + 2, 8, 7, 3);
      drawMiniLabel("PEACE", cx - 16, cy - 16);
    } else if (kind === 51) {
      // Pineapple
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.58) | 0;
      const rw = Math.max(8, (Math.min(w, h) * 0.2) | 0);
      const rh = Math.max(12, (Math.min(w, h) * 0.3) | 0);

      // body
      sctx.beginPath();
      sctx.ellipse(cx, cy + 2, rw, rh, 0, 0, Math.PI * 2);
      sctx.stroke();

      // crisscross
      sctx.globalAlpha = 0.55;
      for (let i = -3; i <= 3; i++) {
        line(cx - rw + 2, cy + i * 3, cx + rw - 2, cy + i * 3 + 6);
        line(cx - rw + 2, cy + i * 3 + 6, cx + rw - 2, cy + i * 3);
      }
      sctx.globalAlpha = 1;

      // leaves
      sctx.beginPath();
      sctx.moveTo(cx, cy - rh - 6);
      sctx.lineTo(cx - 6, cy - rh + 2);
      sctx.lineTo(cx, cy - rh + 1);
      sctx.lineTo(cx + 6, cy - rh + 2);
      sctx.closePath();
      sctx.stroke();
      line(cx, cy - rh - 6, cx - 2, cy - rh - 12);
      line(cx, cy - rh - 6, cx + 2, cy - rh - 12);
      drawMiniLabel("PINEAPPLE", cx - 22, cy + rh + 6);
    } else if (kind === 52) {
      // Prism (triangular)
      const bx = (x + w * 0.22) | 0;
      const by = (y + h * 0.26) | 0;
      const ww = Math.max(22, (w * 0.56) | 0);
      const hh = Math.max(18, (h * 0.44) | 0);

      // front triangle
      sctx.beginPath();
      sctx.moveTo(bx, by + hh);
      sctx.lineTo(bx + ww * 0.5, by);
      sctx.lineTo(bx + ww, by + hh);
      sctx.closePath();
      sctx.stroke();

      // depth offset
      const ox = 6,
        oy = 4;
      sctx.beginPath();
      sctx.moveTo(bx + ox, by + hh + oy);
      sctx.lineTo(bx + ww * 0.5 + ox, by + oy);
      sctx.lineTo(bx + ww + ox, by + hh + oy);
      sctx.closePath();
      sctx.stroke();

      // connectors
      line(bx, by + hh, bx + ox, by + hh + oy);
      line(bx + ww, by + hh, bx + ww + ox, by + hh + oy);
      line(bx + ww * 0.5, by, bx + ww * 0.5 + ox, by + oy);
      drawMiniLabel("PRISM", bx, by - 7);
    } else if (kind === 53) {
      // Dice
      const s = Math.max(18, (Math.min(w, h) * 0.6) | 0);
      const bx = (x + (w - s) / 2) | 0;
      const by = (y + (h - s) / 2) | 0;

      rectR(bx, by, s, s, 3);
      // pips
      const pip = (px, py) => sctx.fillRect((bx + px) | 0, (by + py) | 0, 1, 1);
      const m = (s * 0.22) | 0;
      const c = (s * 0.5) | 0;
      const M = (s * 0.78) | 0;

      // choose face 1..6
      const face = 1 + randInt(6);
      if (face === 1) pip(c, c);
      else if (face === 2) {
        pip(m, m);
        pip(M, M);
      } else if (face === 3) {
        pip(m, m);
        pip(c, c);
        pip(M, M);
      } else if (face === 4) {
        pip(m, m);
        pip(M, m);
        pip(m, M);
        pip(M, M);
      } else if (face === 5) {
        pip(m, m);
        pip(M, m);
        pip(c, c);
        pip(m, M);
        pip(M, M);
      } else {
        // 6
        pip(m, m);
        pip(M, m);
        pip(m, c);
        pip(M, c);
        pip(m, M);
        pip(M, M);
      }
      drawMiniLabel("DICE", bx, by - 7);
    } else if (kind === 54) {
      // Playing cards
      const bw = Math.max(18, (w * 0.46) | 0);
      const bh = Math.max(24, (h * 0.68) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      // back card
      rectR(bx + 6, by + 3, bw, bh, 3);
      // front card
      rectR(bx, by, bw, bh, 3);
      sctx.globalAlpha = 0.55;
      sctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
      sctx.globalAlpha = 1;

      // tiny heart + spade marks
      sctx.beginPath();
      sctx.arc(bx + 6, by + 8, 1.4, 0, Math.PI * 2);
      sctx.stroke();
      sctx.beginPath();
      sctx.arc(bx + bw - 6, by + bh - 8, 1.4, 0, Math.PI * 2);
      sctx.stroke();

      drawMiniLabel("CARDS", bx, by - 7);
    } else if (kind === 55) {
      // Burger
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.58) | 0;
      const ww = Math.max(22, (w * 0.7) | 0);
      const hh = Math.max(16, (h * 0.42) | 0);
      const left = cx - (ww >> 1);

      // top bun
      sctx.beginPath();
      sctx.arc(cx, cy - hh * 0.18, ww * 0.52, Math.PI, 0);
      sctx.stroke();
      // sesame dots
      sctx.globalAlpha = 0.6;
      for (let i = 0; i < 9; i++) {
        sctx.fillRect(
          (left + 6 + randInt(ww - 12)) | 0,
          (cy - hh * 0.42 + randInt(8)) | 0,
          1,
          1
        );
      }
      sctx.globalAlpha = 1;

      // fillings
      line(left + 3, cy, left + ww - 3, cy); // patty
      sctx.globalAlpha = 0.65;
      // lettuce wiggle
      sctx.beginPath();
      sctx.moveTo(left + 3, cy + 4);
      for (let i = 0; i <= 6; i++) {
        const xx = left + 3 + (i * (ww - 6)) / 6;
        const yy = cy + 4 + Math.sin(i * 0.9) * 2;
        sctx.lineTo(xx, yy);
      }
      sctx.stroke();
      sctx.globalAlpha = 1;

      // bottom bun
      sctx.beginPath();
      sctx.arc(cx, cy + hh * 0.2, ww * 0.52, 0, Math.PI);
      sctx.stroke();

      drawMiniLabel("BURGER", left, cy - hh - 6);
    } else if (kind === 56) {
      // Pencils (crossed)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.56) | 0;
      const L = Math.max(22, (Math.min(w, h) * 0.82) | 0);

      function pencil(ax, ay, bx, by) {
        // body
        line(ax, ay, bx, by);
        // tip
        const tx = lerp(ax, bx, 0.9);
        const ty = lerp(ay, by, 0.9);
        line(tx, ty, bx, by);
        // eraser cap
        const ex = lerp(ax, bx, 0.08);
        const ey = lerp(ay, by, 0.08);
        sctx.fillRect(ex | 0, ey | 0, 2, 2);
      }

      pencil(cx - L * 0.45, cy - L * 0.2, cx + L * 0.45, cy + L * 0.2);
      pencil(cx - L * 0.45, cy + L * 0.2, cx + L * 0.45, cy - L * 0.2);
      drawMiniLabel("PENCILS", cx - 18, cy + 18);
    } else if (kind === 57) {
      // Apple (fruit)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.6) | 0;
      const r = Math.max(10, (Math.min(w, h) * 0.28) | 0);

      // body (two lobes)
      sctx.beginPath();
      sctx.arc(cx - r * 0.35, cy, r * 0.85, 0, Math.PI * 2);
      sctx.arc(cx + r * 0.35, cy, r * 0.85, 0, Math.PI * 2);
      sctx.stroke();
      // stem + leaf
      line(cx, cy - r, cx, cy - r - 6);
      sctx.beginPath();
      sctx.moveTo(cx + 2, cy - r - 3);
      sctx.lineTo(cx + 10, cy - r - 6);
      sctx.lineTo(cx + 4, cy - r + 2);
      sctx.closePath();
      sctx.stroke();
      drawMiniLabel("APPLE", cx - 14, cy + r + 6);
    } else if (kind === 58) {
      // Sun sticker
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.55) | 0;
      const r = Math.max(7, (Math.min(w, h) * 0.22) | 0);

      // rays
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * (r + 2);
        const y1 = cy + Math.sin(a) * (r + 2);
        const x2 = cx + Math.cos(a) * (r + 8);
        const y2 = cy + Math.sin(a) * (r + 8);
        line(x1, y1, x2, y2);
      }
      // sun
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("SUN", cx - 8, cy + r + 10);
    } else if (kind === 59) {
      // Flamingo
      const cx = (x + w * 0.52) | 0;
      const cy = (y + h * 0.62) | 0;

      // leg
      line(cx, cy + 2, cx, cy + 16);
      line(cx, cy + 16, cx + 6, cy + 16);

      // body
      sctx.beginPath();
      sctx.arc(cx - 4, cy, 6, 0, Math.PI * 2);
      sctx.stroke();

      // neck (S curve)
      sctx.beginPath();
      sctx.moveTo(cx - 2, cy - 4);
      sctx.bezierCurveTo(cx + 6, cy - 14, cx + 2, cy - 20, cx + 10, cy - 26);
      sctx.stroke();

      // head + beak
      sctx.beginPath();
      sctx.arc(cx + 10, cy - 26, 2.2, 0, Math.PI * 2);
      sctx.stroke();
      line(cx + 12, cy - 26, cx + 18, cy - 24);

      drawMiniLabel("FLAMINGO", cx - 22, cy + 22);
    } else if (kind === 60) {
      // Bangles (rings)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.56) | 0;
      const r = Math.max(7, (Math.min(w, h) * 0.22) | 0);

      sctx.beginPath();
      sctx.arc(cx - 6, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + 6, cy + 2, r, 0, Math.PI * 2);
      sctx.arc(cx, cy - 6, r, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("BANGLES", cx - 18, cy + r + 12);
    } else if (kind === 61) {
      // Bicycle (BMX-ish)
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.62) | 0);
      const r = Math.max(5, Math.min(w, h) * 0.18);

      // wheels
      sctx.beginPath();
      sctx.arc(cx - r * 1.3, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + r * 1.3, cy, r, 0, Math.PI * 2);
      sctx.stroke();

      // frame
      line(cx - r * 1.3, cy, cx - r * 0.2, cy - r * 0.8);
      line(cx - r * 0.2, cy - r * 0.8, cx + r * 0.6, cy);
      line(cx + r * 0.6, cy, cx - r * 0.4, cy);
      line(cx - r * 0.4, cy, cx - r * 0.2, cy - r * 0.8);

      // handlebar + seat
      line(cx + r * 0.6, cy, cx + r * 0.9, cy - r * 0.7);
      line(cx + r * 0.8, cy - r * 0.75, cx + r * 1.05, cy - r * 0.6);
      line(cx - r * 0.35, cy - r * 0.85, cx - r * 0.65, cy - r * 1.0);

      drawMiniLabel("BMX", cx - 12, cy + r + 14);
    } else if (kind === 62) {
      // Candy in a wrapper
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.55) | 0);
      const bw = Math.max(16, (w * 0.62) | 0);
      const bh = Math.max(8, (h * 0.24) | 0);

      // center candy
      rectR(cx - bw * 0.32, cy - bh / 2, bw * 0.64, bh, 3);

      // wrapper twists
      sctx.beginPath();
      sctx.moveTo(cx - bw * 0.32, cy);
      sctx.lineTo(cx - bw * 0.5, cy - bh * 0.45);
      sctx.lineTo(cx - bw * 0.5, cy + bh * 0.45);
      sctx.closePath();
      sctx.stroke();

      sctx.beginPath();
      sctx.moveTo(cx + bw * 0.32, cy);
      sctx.lineTo(cx + bw * 0.5, cy - bh * 0.45);
      sctx.lineTo(cx + bw * 0.5, cy + bh * 0.45);
      sctx.closePath();
      sctx.stroke();

      drawMiniLabel("CANDY", cx - 18, cy + bh + 14);
    } else if (kind === 63) {
      // Sunset
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.58) | 0);
      const r = Math.max(6, Math.min(w, h) * 0.22);

      // horizon
      line(x + 3, cy, x + w - 3, cy);

      // sun half
      sctx.beginPath();
      sctx.arc(cx, cy, r, Math.PI, 0);
      sctx.stroke();

      // rays
      for (let i = -3; i <= 3; i++) {
        const rx = cx + i * (r * 0.35);
        line(rx, cy - r * 1.15, rx, cy - r * 0.75);
      }

      // little waves
      for (let i = 0; i < 3; i++) {
        const yy = cy + 4 + i * 4;
        sctx.beginPath();
        sctx.moveTo(x + 6, yy);
        for (let xx = x + 6; xx < x + w - 6; xx += 6) {
          sctx.lineTo(xx + 3, yy + (i % 2 ? 1 : -1));
          sctx.lineTo(xx + 6, yy);
        }
        sctx.stroke();
      }

      drawMiniLabel("SUNSET", cx - 22, cy + r + 20);
    } else if (kind === 64) {
      // Television set
      const bw = Math.max(18, (w * 0.7) | 0);
      const bh = Math.max(14, (h * 0.48) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 4);

      // screen
      const sx = bx + 4;
      const sy = by + 4;
      const sw = (bw * 0.68) | 0;
      const sh = bh - 8;
      sctx.strokeRect(sx, sy, sw, sh);

      // knobs
      sctx.beginPath();
      sctx.arc(bx + bw - 6, by + bh * 0.38, 2, 0, Math.PI * 2);
      sctx.arc(bx + bw - 6, by + bh * 0.62, 2, 0, Math.PI * 2);
      sctx.stroke();

      // antenna
      line(bx + bw * 0.45, by, bx + bw * 0.35, by - 8);
      line(bx + bw * 0.55, by, bx + bw * 0.65, by - 8);

      drawMiniLabel("TV", bx + 6, by + bh + 14);
    } else if (kind === 65) {
      // Concert / movie ticket stub
      const bw = Math.max(18, (w * 0.78) | 0);
      const bh = Math.max(12, (h * 0.42) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);

      // perforation line
      const px = bx + ((bw * 0.3) | 0);
      for (let yy = by + 2; yy < by + bh - 2; yy += 3) {
        sctx.fillRect(px, yy, 1, 1);
      }

      // stub notches (tiny holes)
      sctx.beginPath();
      sctx.arc(bx + 2, by + 3, 1.5, 0, Math.PI * 2);
      sctx.arc(bx + bw - 2, by + 3, 1.5, 0, Math.PI * 2);
      sctx.arc(bx + 2, by + bh - 3, 1.5, 0, Math.PI * 2);
      sctx.arc(bx + bw - 2, by + bh - 3, 1.5, 0, Math.PI * 2);
      sctx.stroke();

      // text-ish blocks
      sctx.strokeRect(bx + 4, by + 4, (bw * 0.22) | 0, (bh * 0.26) | 0); // date box

      sctx.beginPath();
      sctx.moveTo(px + 3, by + 5);
      sctx.lineTo(bx + bw - 4, by + 5);
      sctx.moveTo(px + 3, by + 9);
      sctx.lineTo(bx + bw - 10, by + 9);
      sctx.moveTo(px + 3, by + 13);
      sctx.lineTo(bx + bw - 6, by + 13);
      sctx.stroke();

      drawMiniLabel("ADMIT ONE", bx + 6, by + bh + 14);
    } else if (kind === 66) {
      // Dumbbells
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.55) | 0);
      const r = Math.max(3, Math.min(w, h) * 0.11);

      // plates
      sctx.beginPath();
      sctx.arc(cx - r * 2.2, cy, r, 0, Math.PI * 2);
      sctx.arc(cx - r * 3.3, cy, r * 0.85, 0, Math.PI * 2);
      sctx.arc(cx + r * 2.2, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + r * 3.3, cy, r * 0.85, 0, Math.PI * 2);
      sctx.stroke();

      // handle
      sctx.strokeRect(
        (cx - r * 2.0) | 0,
        (cy - r * 0.35) | 0,
        (r * 4.0) | 0,
        Math.max(1, (r * 0.7) | 0)
      );

      drawMiniLabel("LIFT", cx - 10, cy + r + 16);
    } else if (kind === 67) {
      // Disco ball
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.52) | 0);
      const r = Math.max(6, Math.min(w, h) * 0.22);

      // hanging string
      line(cx, y + 2, cx, cy - r - 2);

      // ball outline
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.stroke();

      // grid facets (horizontal chords)
      for (let i = -2; i <= 2; i++) {
        const yy = cy + i * (r * 0.33);
        const dx = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
        sctx.beginPath();
        sctx.moveTo(cx - dx, yy);
        sctx.lineTo(cx + dx, yy);
        sctx.stroke();
      }
      // grid facets (vertical chords)
      for (let i = -2; i <= 2; i++) {
        const xx = cx + i * (r * 0.33);
        const dy = Math.sqrt(Math.max(0, r * r - (xx - cx) * (xx - cx)));
        sctx.beginPath();
        sctx.moveTo(xx, cy - dy);
        sctx.lineTo(xx, cy + dy);
        sctx.stroke();
      }

      // sparkle
      line(cx + r + 2, cy - r * 0.2, cx + r + 8, cy - r * 0.2);
      line(cx + r + 5, cy - r * 0.45, cx + r + 5, cy + r * 0.05);

      drawMiniLabel("DISCO", cx - 16, cy + r + 18);
    } else if (kind === 68) {
      // Dance (two stick figures)
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.56) | 0);
      const s = Math.max(10, Math.min(w, h) * 0.35);

      // heads
      sctx.beginPath();
      sctx.arc(cx - s * 0.25, cy - s * 0.45, 2.2, 0, Math.PI * 2);
      sctx.arc(cx + s * 0.25, cy - s * 0.42, 2.2, 0, Math.PI * 2);
      sctx.stroke();

      // bodies
      line(cx - s * 0.25, cy - s * 0.42, cx - s * 0.25, cy - s * 0.05);
      line(cx + s * 0.25, cy - s * 0.39, cx + s * 0.25, cy - s * 0.02);

      // arms (touch)
      line(cx - s * 0.25, cy - s * 0.3, cx, cy - s * 0.22);
      line(cx + s * 0.25, cy - s * 0.26, cx, cy - s * 0.22);

      // legs
      line(cx - s * 0.25, cy - s * 0.05, cx - s * 0.4, cy + s * 0.25);
      line(cx - s * 0.25, cy - s * 0.05, cx - s * 0.1, cy + s * 0.22);
      line(cx + s * 0.25, cy - s * 0.02, cx + s * 0.1, cy + s * 0.24);
      line(cx + s * 0.25, cy - s * 0.02, cx + s * 0.42, cy + s * 0.18);

      // floor
      line(x + 4, cy + s * 0.3, x + w - 4, cy + s * 0.3);

      drawMiniLabel("DANCE", cx - 16, cy + s * 0.36 + 14);
    } else if (kind === 69) {
      // Vinyl record
      const cx = x + ((w * 0.5) | 0);
      const cy = y + ((h * 0.56) | 0);
      const r = Math.max(9, Math.min(w, h) * 0.32);

      // record
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.stroke();
      // grooves
      sctx.beginPath();
      sctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
      sctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      sctx.stroke();
      // label
      sctx.beginPath();
      sctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
      sctx.stroke();

      // spindle hole
      sctx.fillRect((cx | 0) - 1, (cy | 0) - 1, 2, 2);

      // little shine mark
      line(cx - r * 0.2, cy - r * 0.6, cx - r * 0.05, cy - r * 0.82);

      drawMiniLabel("33 RPM", cx - r, cy + r + 16);
      drawMiniLabel("VINYL", cx - r, cy + r + 28);
    } else if (kind === 70) {
      // Cigarette + smoke
      const bx = x + ((w * 0.18) | 0);
      const by = y + ((h * 0.62) | 0);
      const bw = Math.max(18, (w * 0.62) | 0);
      const bh = Math.max(4, (h * 0.1) | 0);

      // body
      rectR(bx, by, bw, bh, 2);
      // filter
      sctx.beginPath();
      sctx.moveTo(bx + bw * 0.78, by);
      sctx.lineTo(bx + bw * 0.78, by + bh);
      sctx.stroke();
      // filter stripes
      for (let i = 0; i < 3; i++) {
        const fx = bx + bw * 0.8 + i * 3;
        line(fx, by + 1, fx, by + bh - 1);
      }

      // ember
      sctx.fillRect((bx - 2) | 0, (by + 1) | 0, 2, Math.max(2, bh - 2));

      // smoke
      const sx = bx + bw * 0.35;
      const sy = by - 1;
      sctx.beginPath();
      sctx.moveTo(sx, sy);
      sctx.bezierCurveTo(sx - 6, sy - 8, sx + 6, sy - 14, sx - 2, sy - 22);
      sctx.bezierCurveTo(sx - 10, sy - 28, sx + 4, sy - 34, sx - 6, sy - 42);
      sctx.stroke();

      drawMiniLabel("FILTER", bx + bw * 0.62, by + bh + 14);
      drawMiniLabel("SMOKE", bx + bw * 0.02, by + bh + 14);
    } else if (kind === 71) {
      // Pager / beeper
      const bw = Math.max(14, (w * 0.44) | 0);
      const bh = Math.max(16, (h * 0.56) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // screen
      sctx.globalAlpha = 0.55;
      sctx.strokeRect(bx + 3, by + 3, bw - 6, (bh * 0.26) | 0);
      sctx.globalAlpha = 1;
      // buttons
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          sctx.fillRect(bx + 4 + c * 3, by + 9 + r * 3, 1, 1);
        }
      }
      drawMiniLabel("BEEP", bx, by - 7);
    } else if (kind === 72) {
      // Trapper Keeper / school binder
      const bw = Math.max(18, (w * 0.68) | 0);
      const bh = Math.max(20, (h * 0.72) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // spine
      line(bx + 5, by + 2, bx + 5, by + bh - 2);
      // zig-zag lightning style
      sctx.globalAlpha = 0.65;
      sctx.beginPath();
      sctx.moveTo(bx + 8, by + 6);
      sctx.lineTo(bx + bw - 6, by + 10);
      sctx.lineTo(bx + 10, by + 14);
      sctx.lineTo(bx + bw - 8, by + 18);
      sctx.stroke();
      sctx.globalAlpha = 1;
      drawMiniLabel("BINDER", bx, by - 7);
    } else if (kind === 73) {
      // TV color bars / test pattern
      const bw = Math.max(20, (w * 0.78) | 0);
      const bh = Math.max(14, (h * 0.5) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      const sx = bx + 3;
      const sy = by + 3;
      const sw = bw - 6;
      const sh = bh - 6;
      // bars
      const bars = 7;
      sctx.globalAlpha = 0.55;
      for (let i = 1; i < bars; i++) {
        const xx = (sx + (sw * i) / bars) | 0;
        line(xx, sy, xx, sy + sh);
      }
      // bottom block row
      line(sx, (sy + sh * 0.7) | 0, sx + sw, (sy + sh * 0.7) | 0);
      sctx.globalAlpha = 1;
      drawMiniLabel("TEST", bx + 2, by - 7);
    } else if (kind === 74) {
      // VHS camcorder / handycam
      const bw = Math.max(22, (w * 0.82) | 0);
      const bh = Math.max(12, (h * 0.42) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // lens
      sctx.beginPath();
      sctx.arc(
        bx + bw - 6,
        by + bh * 0.55,
        Math.max(3, (bh * 0.28) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      sctx.beginPath();
      sctx.arc(
        bx + bw - 6,
        by + bh * 0.55,
        Math.max(1, (bh * 0.12) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
      // top handle
      line(bx + 4, by - 3, bx + bw * 0.45, by - 3);
      line(bx + 4, by - 3, bx + 4, by + 2);
      line(bx + bw * 0.45, by - 3, bx + bw * 0.45, by + 2);
      // tape window
      sctx.globalAlpha = 0.55;
      sctx.strokeRect(bx + 4, by + 3, (bw * 0.48) | 0, (bh * 0.5) | 0);
      sctx.globalAlpha = 1;
      drawMiniLabel("REC", bx + 2, by + bh + 14);
    } else if (kind === 75) {
      // Game cartridge
      const bw = Math.max(18, (w * 0.64) | 0);
      const bh = Math.max(16, (h * 0.56) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // top ridges
      for (let i = 0; i < 4; i++) {
        const xx = bx + 3 + i * 3;
        line(xx, by, xx, by + 4);
      }
      // label
      sctx.globalAlpha = 0.55;
      sctx.strokeRect(bx + 3, by + 6, bw - 6, bh - 9);
      sctx.globalAlpha = 1;
      drawMiniLabel("CART", bx, by - 7);
    } else if (kind === 76) {
      // School bus
      const bw = Math.max(22, (w * 0.84) | 0);
      const bh = Math.max(12, (h * 0.36) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // windows
      const winY = by + 3;
      const winH = Math.max(3, (bh * 0.35) | 0);
      for (let i = 0; i < 4; i++) {
        sctx.strokeRect(bx + 4 + i * 4, winY, 3, winH);
      }
      // door
      sctx.strokeRect(bx + bw - 7, winY, 3, bh - 6);
      // wheels
      sctx.beginPath();
      sctx.arc(bx + bw * 0.28, by + bh + 2, 2.2, 0, Math.PI * 2);
      sctx.arc(bx + bw * 0.72, by + bh + 2, 2.2, 0, Math.PI * 2);
      sctx.stroke();
      drawMiniLabel("BUS", bx + 2, by - 7);
    } else if (kind === 77) {
      // Calculator (school / science)
      const bw = Math.max(16, (w * 0.52) | 0);
      const bh = Math.max(22, (h * 0.76) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // display
      sctx.globalAlpha = 0.55;
      sctx.strokeRect(bx + 3, by + 3, bw - 6, 6);
      sctx.globalAlpha = 1;

      // keypad dots
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          sctx.fillRect(bx + 4 + c * 4, by + 11 + r * 4, 1, 1);
        }
      }
      drawMiniLabel("MATH", bx, by - 7);
    } else if (kind === 78) {
      // Homework sheet (A+)
      const bw = Math.max(18, (w * 0.6) | 0);
      const bh = Math.max(22, (h * 0.76) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;

      rectR(bx, by, bw, bh, 3);
      // corner fold
      sctx.beginPath();
      sctx.moveTo(bx + bw - 6, by);
      sctx.lineTo(bx + bw, by + 6);
      sctx.lineTo(bx + bw - 6, by + 6);
      sctx.closePath();
      sctx.stroke();

      // lines
      sctx.globalAlpha = 0.6;
      for (let i = 0; i < 4; i++) {
        const yy = (by + 8 + i * 4) | 0;
        line(bx + 3, yy, bx + bw - 3, yy);
      }
      sctx.globalAlpha = 1;

      // A+
      sctx.globalAlpha = 0.85;
      sctx.font = `8px ui-monospace, monospace`;
      sctx.fillText("A+", bx + 4, by + bh - 6);
      sctx.globalAlpha = 1;

      drawMiniLabel("HW", bx + 2, by - 7);
    } else if (kind === 79) {
      // Yo-yo (80s toy)
      const cx = (x + w * 0.5) | 0;
      const cy = (y + h * 0.58) | 0;
      const r = Math.max(6, (Math.min(w, h) * 0.22) | 0);

      // string
      sctx.globalAlpha = 0.7;
      sctx.beginPath();
      sctx.moveTo(cx, y + 2);
      sctx.bezierCurveTo(
        cx - 6,
        cy - r * 2.0,
        cx + 8,
        cy - r * 1.3,
        cx,
        cy - r
      );
      sctx.stroke();
      sctx.globalAlpha = 1;

      // yo-yo body (two discs)
      sctx.beginPath();
      sctx.arc(cx - r * 0.35, cy, r, 0, Math.PI * 2);
      sctx.arc(cx + r * 0.35, cy, r, 0, Math.PI * 2);
      sctx.stroke();

      // axle hint
      sctx.globalAlpha = 0.55;
      line(cx - r * 0.2, cy, cx + r * 0.2, cy);
      sctx.globalAlpha = 1;

      drawMiniLabel("YOYO", (cx - r * 1.4) | 0, (cy + r + 14) | 0);
    } else {
      // Fallback: tiny memphis squiggle
      const tx = (x + w * 0.18) | 0;
      const ty = (y + h * 0.55) | 0;
      sctx.beginPath();
      sctx.moveTo(tx, ty);
      sctx.bezierCurveTo(
        tx + w * 0.18,
        ty - h * 0.22,
        tx + w * 0.34,
        ty + h * 0.22,
        tx + w * 0.52,
        ty - h * 0.1
      );
      sctx.stroke();
    }
  } else {
    const kind = randInt(5);
    if (kind === 0) {
      const bw = Math.max(10, (w * 0.62) | 0);
      const bh = Math.max(8, (h * 0.42) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      sctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.33,
        by + bh * 0.55,
        Math.max(2, (bh * 0.18) | 0),
        0,
        Math.PI * 2
      );
      sctx.arc(
        bx + bw * 0.67,
        by + bh * 0.55,
        Math.max(2, (bh * 0.18) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
    } else if (kind === 1) {
      const n = 8 + randInt(10);
      for (let i = 0; i < n; i++) {
        const x1 = x + 1 + randInt(w - 2);
        const y1 = y + 1 + randInt(h - 2);
        const x2 = x + 1 + randInt(w - 2);
        const y2 = y + 1 + randInt(h - 2);
        line(x1, y1, x2, y1);
        line(x2, y1, x2, y2);
        if (rand() < 0.35) sctx.fillRect(x2 - 1, y2 - 1, 2, 2);
      }
    } else if (kind === 2) {
      const bw = Math.max(10, (w * 0.5) | 0);
      const bh = Math.max(10, (h * 0.5) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      line(bx, by, bx + bw, by + bh);
      line(bx + bw, by, bx, by + bh);
    } else if (kind === 3) {
      const bw = Math.max(12, (w * 0.7) | 0);
      const bh = Math.max(10, (h * 0.44) | 0);
      const bx = (x + (w - bw) / 2) | 0;
      const by = (y + (h - bh) / 2) | 0;
      sctx.strokeRect(bx, by, bw, bh);
      sctx.beginPath();
      sctx.arc(
        bx + bw * 0.25,
        by + bh * 0.55,
        Math.max(2, (bh * 0.2) | 0),
        0,
        Math.PI * 2
      );
      sctx.arc(
        bx + bw * 0.75,
        by + bh * 0.55,
        Math.max(2, (bh * 0.2) | 0),
        0,
        Math.PI * 2
      );
      sctx.stroke();
    } else {
      // waveform arcs
      const n = 10 + randInt(14);
      sctx.globalAlpha = 0.75;
      for (let i = 0; i < n; i++) {
        const ox = x + 2 + randInt(w - 4);
        const oy = y + 2 + randInt(h - 4);
        const r = 2 + randInt(Math.max(2, (Math.min(w, h) * 0.22) | 0));
        sctx.beginPath();
        sctx.arc(ox, oy, r, 0, Math.PI * 2);
        sctx.stroke();
        if (rand() < 0.35) {
          const ox2 = x + 2 + randInt(w - 4);
          const oy2 = y + 2 + randInt(h - 4);
          line(ox, oy, ox2, oy2);
        }
      }
      sctx.globalAlpha = 1;
    }
  }
  const labels80 = [
    "NTSC",
    "PAL",
    "TRACK",
    "SIDE A",
    "SIDE B",
    "HI-SCORE",
    "INSERT",
    "MIDI",
    "BPM 120",
    "REV A",
    "SHEET 01",
    "CRT",
    "VHS",
    "FLOPPY",
  ];
  const label = eightiesTheme
    ? labels80[randInt(labels80.length)]
    : rand() < 0.5
    ? "REV A"
    : "SHEET 01";

  sctx.globalAlpha = 0.9;
  sctx.font = `7px ui-monospace, monospace`;
  sctx.fillStyle = "rgba(255,255,255,0.85)";
  sctx.fillText(label, x + 2, y + h - 9);

  sctx.restore();
}

function maybeStampMarks() {
  if (marksMode === "off") return;
  if (!stamp.ctx) initStampCanvas();

  const base =
    movementMode === "pixel" ? 0.14 : movementMode === "glitch" ? 0.18 : 0.16;

  if (rand() > base) return;

  let kind;

  if (marksMode === "blueprint") kind = "blueprint";
  else if (marksMode === "text") kind = "text";
  else kind = nextStampType();

  if (marksMode === "mixed" && kind === "blueprint" && rand() < 0.55) return;

  const W = clamp(56 + randInt(120), 46, Math.floor(px.w * 0.78));
  const H = clamp(28 + randInt(78), 22, Math.floor(px.h * 0.6));
  const x = randInt(Math.max(1, px.w - W));
  const y = randInt(Math.max(1, px.h - H));

  stamp.ctx.clearRect(x - 2, y - 2, W + 4, H + 4);

  if (kind === "text") {
    const phrase = pickPhrase();

    if (rand() < 0.55) {
      stamp.ctx.strokeStyle = "rgba(255,255,255,0.35)";
      stamp.ctx.beginPath();
      stamp.ctx.moveTo(x + 2, (y + H * 0.65) | 0);
      stamp.ctx.lineTo(x + W - 2, (y + H * 0.65) | 0);
      stamp.ctx.stroke();
    }

    drawJitterText(x + 2, y + 2 + randInt(Math.max(1, H - 16)), phrase, W - 6);
  } else {
    drawBlueprint(x + 1, y + 1, W - 2, H - 2);

    if (rand() < 0.6) {
      const note = rand() < 0.5 ? "SPEC // 198X" : "CALC: OK";
      stamp.ctx.font = `7px ui-monospace, monospace`;
      stamp.ctx.fillStyle = "rgba(255,255,255,0.85)";
      stamp.ctx.fillText(note, x + 2, y + 2);
    }
  }

  stampCompositeRegion(
    x - 2,
    y - 2,
    W + 4,
    H + 4,
    kind === "text" ? 0.95 : 0.9,
    kind === "text"
  );

  if (movementMode !== "pixel" && rand() < 0.6) {
    glitchCopyBlock();
  }
}

function tickPixelEngine(dt) {
  px.frame++;

  if (px.hold) {
    for (let i = 0; i < px.hold.length; i++) {
      px.hold[i] = (px.hold[i] * HOLD_FRAME_DECAY) | 0;
    }
  }

  const area = px.w * px.h;
  const base =
    movementMode === "pixel" ? 0.03 : movementMode === "glitch" ? 0.026 : 0.022;
  const steps = clamp(Math.floor(area * base), 900, 4800);

  for (let i = 0; i < steps; i++) {
    const h = px.heads[i % px.heads.length];
    const c = h.col;

    const turnChance =
      movementMode === "pixel"
        ? 0.006
        : movementMode === "glitch"
        ? 0.022
        : 0.015;

    const irregularChance =
      movementMode === "pixel"
        ? 0.0012
        : movementMode === "glitch"
        ? 0.0032
        : 0.0024;

    if (px.frame >= h.behUntil && rand() < 0.18) {
      resetBehavior(h);
    }

    if ((px.frame + h.seed) % h.turnEvery === 0) {
      let dirI = h.dirI;

      if (h.beh === "grid") {
        const r = rand();
        if (r < 0.62) dirI = rotateDirI(dirI, rand() < 0.5 ? 2 : -2); // 90
        else if (r < 0.82) dirI = rotateDirI(dirI, rand() < 0.5 ? 1 : -1); // 45
        else if (r < 0.92) dirI = DIR4I[randInt(4)];
        else dirI = randInt(8);
      } else if (h.beh === "zigzag") {
        if (!h.zigA || !h.zigB) {
          h.zigA = dirI;
          h.zigB = rotateDirI(dirI, rand() < 0.5 ? 2 : -2);
        }
        h.zigFlip ^= 1;
        dirI = h.zigFlip ? h.zigA : h.zigB;
        if (rand() < 0.07) {
          h.zigA = null;
          h.zigB = null;
        }
      } else if (h.beh === "orbit") {
        const vx = h.x - h.centerX;
        const vy = h.y - h.centerY;
        const toward = dirToward(vx, vy);
        dirI = rotateDirI(toward, h.spin * 2);
        if (rand() < 0.07) {
          h.centerX = (h.centerX + sgn(-vx) + px.w) % px.w;
          h.centerY = (h.centerY + sgn(-vy) + px.h) % px.h;
        }
        if (rand() < 0.03) h.spin *= -1;
      } else if (h.beh === "noise") {
        const n = hash2(h.x, h.y, px.frame >> 2, h.seed);
        const bits = n & 7;
        const rr = ((n >>> 3) & 3) - 1;
        if (rr === -1) dirI = rotateDirI(dirI, -1);
        else if (rr === 1) dirI = rotateDirI(dirI, 1);
        else if (rr === 2) dirI = rotateDirI(dirI, (n >>> 5) & 1 ? 2 : -2);

        if ((n & 31) === 0) dirI = DIR4I[(n >>> 8) & 3];
        if ((n & 127) === 1) dirI = bits;
      } else if (h.beh === "burst") {
        if (h.burst <= 0 && rand() < 0.09) {
          h.burst = 8 + randInt(22);
        }
        if (h.burst > 0) {
          h.burst--;
          if (rand() < 0.22) dirI = rotateDirI(dirI, rand() < 0.5 ? 1 : -1);
          if (rand() < 0.05) dirI = randInt(8);
        } else {
          if (rand() < 0.25) dirI = rotateDirI(dirI, rand() < 0.5 ? 2 : -2);
        }
      }

      h.dirI = dirI;
    }

    if (rand() < turnChance) {
      if (rand() < 0.62) h.dirI = rotateDirI(h.dirI, rand() < 0.5 ? 2 : -2);
      else if (rand() < 0.86)
        h.dirI = rotateDirI(h.dirI, rand() < 0.5 ? 1 : -1);
      else h.dirI = randInt(8);
    }

    if (rand() < irregularChance) {
      const r = rand();

      if (r < 0.35) {
        h.dirI = rotateDirI(h.dirI, randInt(5) - 2); // -2..+2
      } else if (r < 0.62 && movementMode !== "pixel") {
        const k = KNIGHT[randInt(KNIGHT.length)];
        h.x = (h.x + k[0] + px.w) % px.w;
        h.y = (h.y + k[1] + px.h) % px.h;
      } else if (r < 0.84) {
        h.x = (h.x + (randInt(25) - 12) + px.w) % px.w;
        h.y = (h.y + (randInt(25) - 12) + px.h) % px.h;
      } else {
        resetBehavior(h);
      }
    }

    if (movementMode !== "pixel" && rand() < 0.0007) {
      h.x = (rand() * px.w) | 0;
      h.y = (rand() * px.h) | 0;
    }

    const d = DIR8[h.dirI] || DIR8[0];
    let step = h.step;

    if (h.beh === "burst" && h.burst > 0)
      step += movementMode === "pixel" ? 1 : 2;

    h.x = (h.x + d.dx * step + px.w) % px.w;
    h.y = (h.y + d.dy * step + px.h) % px.h;

    let x = h.x;
    let y = h.y;
    if (movementMode !== "pixel" && rand() < 0.33) {
      x = (x + (randInt(5) - 2) + px.w) % px.w;
      y = (y + (randInt(5) - 2) + px.h) % px.h;
    }

    // paint cluster
    const t =
      movementMode === "pixel" ? 0.55 : movementMode === "glitch" ? 0.48 : 0.38;

    paintBlend(x, y, c.r, c.g, c.b, t);

    // directional "stitching" (makes ladders, rails, and woven textures)
    if (rand() < 0.52) paintBlend(x + d.dx, y + d.dy, c.r, c.g, c.b, t * 0.52);
    if (rand() < 0.36) paintBlend(x - d.dy, y + d.dx, c.r, c.g, c.b, t * 0.42); // perpendicular
    if (rand() < 0.22) paintBlend(x + d.dy, y - d.dx, c.r, c.g, c.b, t * 0.36); // perpendicular

    // occasional short "segment" to reinforce patterns (rare so it's cheap)
    if (movementMode === "pixel" && rand() < 0.045) {
      const L = 3 + randInt(7);
      let sx = x,
        sy = y;
      for (let k = 0; k < L; k++) {
        sx = (sx + d.dx + px.w) % px.w;
        sy = (sy + d.dy + px.h) % px.h;
        paintBlend(sx, sy, c.r, c.g, c.b, t * 0.35);
        if (rand() < 0.25)
          paintBlend(sx - d.dy, sy + d.dx, c.r, c.g, c.b, t * 0.25);
      }
    }

    if (rand() < (movementMode === "datamosh" ? 0.012 : 0.006)) {
      const cc = pickRgbFromPalette();
      paintBlend(x, y, cc.r, cc.g, cc.b, 0.22 + rand() * 0.28);
    }
  }

  if (movementMode === "glitch" && px.frame % 7 === 0) glitchCopyBlock();
  if (movementMode === "datamosh" && px.frame % 5 === 0) datamoshRows();

  const SYMBOLS_PER_FRAME = 2; // 1 = normal, 2 = double

  for (let i = 0; i < SYMBOLS_PER_FRAME; i++) {
    maybeStampMarks();
  }

  if (px.frame % 4 === 0) {
    const fade =
      movementMode === "pixel"
        ? 0.008
        : movementMode === "glitch"
        ? 0.011
        : 0.013;

    for (let i = 0; i < px.data.length; i += 4) {
      px.data[i] = (px.data[i] * (1 - fade)) | 0;
      px.data[i + 1] = (px.data[i + 1] * (1 - fade)) | 0;
      px.data[i + 2] = (px.data[i + 2] * (1 - fade)) | 0;
      px.data[i + 3] = 255;
    }
  }
}

function renderPixelEngine(viewW, viewH, t) {
  px.ctx.putImageData(px.img, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.drawImage(px.canvas, 0, 0, viewW, viewH);
  ctx.restore();

  drawHoloSheen(viewW, viewH, t);
}

// ---------------------------
// Holo sheen overlay
// ---------------------------
function drawHoloSheen(width, height, t) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.04;

  const a = 0.25 + 0.25 * Math.sin(t * 0.22);
  const x0 = width * (0.15 + 0.25 * Math.sin(t * 0.17));
  const y0 = height * (0.2 + 0.25 * Math.cos(t * 0.19));
  const x1 = width * (0.85 + 0.18 * Math.cos(t * 0.13));
  const y1 = height * (0.8 + 0.18 * Math.sin(t * 0.15));

  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(
    0,
    `hsla(${(bgHue + 30) % 360}, ${clamp(bgSat + 22, 8, 70)}%, ${clamp(
      bgLight + 40,
      10,
      72
    )}%, 1)`
  );
  g.addColorStop(
    0.5,
    `hsla(${(bgHue + 170) % 360}, ${clamp(bgSat + 26, 8, 80)}%, ${clamp(
      bgLight + 30,
      10,
      66
    )}%, ${a})`
  );
  g.addColorStop(
    1,
    `hsla(${(bgHue + 290) % 360}, ${clamp(bgSat + 18, 8, 70)}%, ${clamp(
      bgLight + 38,
      10,
      70
    )}%, 1)`
  );

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------------------------
// Animation loop + UI actions
// ---------------------------
let animationId = null;
let animateRef = null;
let isPaused = false;
let lastT = 0;

// Used to set the *mint/marketplace preview* frame on fxhash.
// (No-op locally.) We guard it so we don't spam repeated preview captures.
let __previewSent = false;
function sendMintPreview() {
  if (__previewSent) return;
  __previewSent = true;

  try {
    if (window.$fx && typeof window.$fx.preview === "function") {
      window.$fx.preview();
    } else if (typeof window.fxpreview === "function") {
      window.fxpreview();
    }
  } catch (_) {
    // ignore
  }
}

function startAnimation(reseedAll = true, updateUrl = true) {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const { width, height } = setupCanvas();

  if (reseedAll) {
    reseedPalette();
    __previewSent = false;
  }

  if (updateUrl) updateSeedInUrl();

  updateTitlePill();
  initPixelEngine(width, height);

  isPaused = false;
  lastT = performance.now();

  function animate(now) {
    if (isPaused) {
      animationId = null;
      return;
    }

    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    const t = now / 1000;

    tickPixelEngine(dt);
    renderPixelEngine(width, height, t);

    animationId = requestAnimationFrame(animate);
  }

  animateRef = animate;
  animationId = requestAnimationFrame(animate);
}

// Capture a mint preview of the *current paused frame* (fxhash uses this as the token preview image).
function mintCurrentFrame() {
  sendMintPreview();
}

function reseed() {
  startAnimation(true);
}

function screenshot() {
  const EXPORT_W = 3000;
  const EXPORT_H = 3000;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = EXPORT_W;
  exportCanvas.height = EXPORT_H;
  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.imageSmoothingEnabled = false;

  // Draw from the canvas' real pixel buffer (device-pixel-sized).
  exportCtx.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    EXPORT_W,
    EXPORT_H
  );

  const paletteSlug = getPaletteSlug();
  const moveSlug = MOVES[movementMode]?.slug || movementMode;

  const link = document.createElement("a");
  link.download = `${moveSlug}-${paletteSlug}-${EXPORT_W}x${EXPORT_H}-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

let __lastPreviewAt = 0;

function triggerFxPreview() {
  const now = performance.now();
  if (now - __lastPreviewAt < 200) return; // tiny debounce
  __lastPreviewAt = now;

  // Support both APIs (depending on fxhash runtime/version)
  try {
    if (window.$fx && typeof window.$fx.preview === "function")
      window.$fx.preview();
  } catch (_) {}

  try {
    if (typeof window.fxpreview === "function") window.fxpreview();
  } catch (_) {}
}

function togglePause() {
  isPaused = !isPaused;

  if (isPaused) {
    // ensure the latest frame is actually on the canvas before preview
    requestAnimationFrame(() => triggerFxPreview());
    return;
  }

  // resuming
  lastT = performance.now();
  if (animateRef && animationId === null) {
    animationId = requestAnimationFrame(animateRef);
  }
}

function cycleMoveMode() {
  const i = MOVE_ORDER.indexOf(movementMode);
  movementMode = MOVE_ORDER[(i + 1) % MOVE_ORDER.length];
  updateSeedInUrl();
  updateTitlePill();
}

const stage = document.getElementById("stage");
const wrap = document.getElementById("canvasWrap");

function isInsideCanvas(e) {
  const rect = wrap.getBoundingClientRect();
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function onPointer(e) {
  // Click/tap behavior:
  // - Click outside the canvas frame: pause/resume
  // - Click inside the canvas:
  //     - running: reseed
  //     - paused: resume (Shift/Alt/Ctrl/Meta + click mints the current frame)
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
  const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
  const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  if (inside) {
    if (isPaused) {
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) mintCurrentFrame();
      else togglePause(); // resume
    } else {
      reseed();
    }
  } else {
    togglePause();
  }
}

stage.addEventListener("click", onPointer);
stage.addEventListener("touchstart", onPointer, { passive: false });

window.addEventListener("keydown", (e) => {
  const k = e.key;

  if (k === "r" || k === "R") {
    const wasPaused = isPaused;
    reseed();
    // If you reseed while paused, auto-resume so you can immediately see the new result.
    if (wasPaused) togglePause();
  } else if (k === "Enter") {
    if (isPaused) mintCurrentFrame();
  } else if (k === " ") {
    e.preventDefault();
    togglePause();
  } else if (k === "s" || k === "S") screenshot();
  else if (k === "p" || k === "P") togglePause();
  else if (k === "m" || k === "M") cycleMoveMode();
  else if (k === "t" || k === "T") {
    const i = MARK_ORDER.indexOf(marksMode);
    marksMode = MARK_ORDER[(i + 1) % MARK_ORDER.length];
    updateTitlePill();
    updateSeedInUrl();
  } else if (k === "l" || k === "L") {
    const i = TEXT_ORDER.indexOf(textSource);
    textSource = TEXT_ORDER[(i + 1) % TEXT_ORDER.length];
    updateTitlePill();
    updateSeedInUrl();
  } else if (k === "8" || k === "o" || k === "O") {
    eightiesTheme = !eightiesTheme;
    updateTitlePill();
    updateSeedInUrl();
  }
});

window.addEventListener("resize", () => {
  startAnimation(false, false);
});

// ---------------------------
// Init from URL (for reproducible links)
// ---------------------------
function findPaletteIndexBySlug(slug) {
  for (const [idx, meta] of Object.entries(PALETTE_META)) {
    if (meta && meta.slug === slug) return Number(idx);
  }
  return null;
}
function setMoveBySlug(slug) {
  for (const [key, meta] of Object.entries(MOVES)) {
    if (meta && meta.slug === slug) {
      movementMode = key;
      return true;
    }
  }
  return false;
}
function setMarksBySlug(slug) {
  for (const [key, meta] of Object.entries(MARKS)) {
    if (meta && meta.slug === slug) {
      marksMode = key;
      return true;
    }
  }
  return false;
}
function setTextBySlug(slug) {
  for (const [key, meta] of Object.entries(TEXT_SOURCES)) {
    if (meta && meta.slug === slug) {
      textSource = key;
      return true;
    }
  }
  return false;
}

function parseLegacySeedIntoParams(seedStr) {
  // Legacy format we used previously:
  //   <paletteSlug>-<moveSlug>-<marksSlug>-<textSlug>-<themeSlug>-<tokenTag>
  // (each slug itself may contain dashes)
  const paletteSlugs = Object.values(PALETTE_META)
    .map((m) => m.slug)
    .sort((a, b) => b.length - a.length);
  const moveSlugs = Object.values(MOVES)
    .map((m) => m.slug)
    .sort((a, b) => b.length - a.length);
  const marksSlugs = Object.values(MARKS)
    .map((m) => m.slug)
    .sort((a, b) => b.length - a.length);
  const textSlugs = Object.values(TEXT_SOURCES)
    .map((m) => m.slug)
    .sort((a, b) => b.length - a.length);

  const takePrefix = (s, list) => {
    for (const slug of list) {
      if (s === slug) return [slug, ""];
      if (s.startsWith(slug + "-")) return [slug, s.slice(slug.length + 1)];
    }
    return [null, s];
  };

  let rest = seedStr;
  const out = { s: null, p: null, m: null, mk: null, tx: null, th: null };

  let slug;
  [slug, rest] = takePrefix(rest, paletteSlugs);
  if (slug) out.p = slug;
  [slug, rest] = takePrefix(rest, moveSlugs);
  if (slug) out.m = slug;
  [slug, rest] = takePrefix(rest, marksSlugs);
  if (slug) out.mk = slug;
  [slug, rest] = takePrefix(rest, textSlugs);
  if (slug) out.tx = slug;

  // Theme: only two values historically
  if (rest.startsWith("80s-dream-")) {
    out.th = "80s";
    rest = rest.slice("80s-dream-".length);
  } else if (rest.startsWith("any-")) {
    out.th = "any";
    rest = rest.slice("any-".length);
  }

  if (rest) out.s = rest;
  return out;
}

function initFromUrl() {
  const u = new URL(window.location.href);
  const sp = u.searchParams;

  // Accept both new params and the older long seed format for backwards compatibility.
  const legacySeed = sp.get("seed");
  if (legacySeed && !sp.get("s")) {
    const parsed = parseLegacySeedIntoParams(legacySeed);
    if (parsed.s) sp.set("s", parsed.s);
    if (parsed.p) sp.set("p", parsed.p);
    if (parsed.m) sp.set("m", parsed.m);
    if (parsed.mk) sp.set("mk", parsed.mk);
    if (parsed.tx) sp.set("tx", parsed.tx);
    if (parsed.th) sp.set("th", parsed.th);
  }

  const s = sp.get("s") || null;
  const p = sp.get("p") || null;
  const m = sp.get("m") || null;
  const mk = sp.get("mk") || null;
  const tx = sp.get("tx") || null;
  const th = sp.get("th") || null;

  // Local seed override (fxhash ignores these, because the hash already defines the RNG)
  if (!fx && s) {
    __localSeed = s;
    const h = cyrb128(__localSeed);
    __localRng = sfc32(h[0], h[1], h[2], h[3]);
  }

  if (p) {
    const idx = findPaletteIndexBySlug(p);
    if (idx !== null) applyPaletteMode(idx);
  }
  if (m) setMoveBySlug(m);
  if (mk) setMarksBySlug(mk);
  if (tx) setTextBySlug(tx);
  if (th === "any") eightiesTheme = false;
  if (th === "80s") eightiesTheme = true;

  // Replace legacy URL with the short params (no reload).
  if (legacySeed) {
    sp.delete("seed");
    history.replaceState(null, "", u.toString());
  }

  return {
    hasExplicitParams: Boolean(s || p || m || mk || tx || th || legacySeed),
  };
}

// Defaults if URL didn't set anything
applyPaletteMode(0);
const { hasExplicitParams } = initFromUrl();
updateTitlePill();

// If the user opened a seeded link, do NOT override it by reseeding.
// Otherwise, start normally and write the params to the URL for sharing.
startAnimation(!hasExplicitParams, !hasExplicitParams);
