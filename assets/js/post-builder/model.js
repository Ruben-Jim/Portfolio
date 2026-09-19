/**
 * Post builder — design data model. Pure functions only (no DOM), so Node tests can import it.
 *
 * design { id, name, format, source?, thumbUrl?, assets?, createdAt, updatedAt, slides[] }
 * slide  { id, background: { preset, src?, overlay? }, elements[] }
 * el     { id, type, x, y, w, h, rotate, locked, hidden, props }
 *
 * Element order in a slide is the stacking order (last = on top).
 * Component types (devices, chips, badges…) are sized by props.scale; their w/h are
 * caches the renderer fills in. Text and checklists own their width; height follows content.
 */

export const FORMATS = {
  feed34: { label: 'Post 3:4', w: 1080, h: 1440 },
  feed45: { label: 'Post 4:5', w: 1080, h: 1350 },
  square: { label: 'Square 1:1', w: 1080, h: 1080 },
  story: { label: 'Story 9:16', w: 1080, h: 1920, safe: { top: 250, bottom: 240 } }
};

export const MAX_SLIDES = 20;

// Brand-locked palette: the only colors the builder offers.
export const COLORS = {
  white: { label: 'White', css: '#f4f7fb' },
  soft: { label: 'Soft', css: '#aeb5c5' },
  muted: { label: 'Muted', css: '#8b93a7' },
  gold: { label: 'Gold', css: '#ffdb6e' },
  goldGradient: { label: 'Gold gradient', css: 'linear-gradient(135deg, #ffdb6e, #ffbc5e)' },
  navy: { label: 'Navy', css: '#07090e' },
  ink: { label: 'Ink', css: '#1a1204' }
};

export const WEIGHTS = [400, 500, 600, 700, 800];

export const BACKGROUNDS = {
  glow: 'CWR glow',
  navy: 'Navy',
  slate: 'Slate',
  gold: 'Gold',
  photo: 'Photo'
};

export const TEXT_PRESETS = {
  headline: { label: 'Headline', size: 64, weight: 800, color: 'white', lineHeight: 1.06, letterSpacing: -0.04, uppercase: false },
  price: { label: 'Price', size: 150, weight: 800, color: 'goldGradient', lineHeight: 0.95, letterSpacing: -0.05, uppercase: false },
  body: { label: 'Body', size: 28, weight: 500, color: 'soft', lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  kicker: { label: 'Kicker', size: 20, weight: 700, color: 'gold', lineHeight: 1.2, letterSpacing: 0.14, uppercase: true },
  label: { label: 'Label', size: 22, weight: 600, color: 'muted', lineHeight: 1.3, letterSpacing: 0, uppercase: false }
};

// Captures that exist under examples/instagram/captures/<id>/.
export const CAPTURES = [
  { id: 'barbershop', label: 'Barbershop', phone: true, laptop: true },
  { id: 'rosasalon', label: 'Salon', phone: true, laptop: true },
  { id: 'rizo', label: 'Restaurant', phone: true, laptop: true },
  { id: 'tradeservice', label: 'Trade service', phone: true, laptop: true },
  { id: 'procleaning', label: 'ProCleaning', phone: true, laptop: true },
  { id: 'grippysocks', label: 'Soccer media', phone: true, laptop: true },
  { id: 'hoa', label: 'HOA', phone: true, laptop: true },
  { id: 'estate', label: 'Real estate', phone: true, laptop: true },
  { id: 'homeverse', label: 'Homeverse', phone: true, laptop: true },
  { id: 'zoomrealty', label: 'Zoom Realty', phone: false, laptop: true }
];

export function captureSrc(id, kind) {
  return '/examples/instagram/captures/' + id + '/' + kind + '.png';
}

export const ELEMENT_TYPES = {
  text: { label: 'Text', sizing: 'width' },
  checklist: { label: 'Checklist', sizing: 'width' },
  device: { label: 'Device', sizing: 'scale' },
  chip: { label: 'Notification chip', sizing: 'scale' },
  button: { label: 'Button', sizing: 'scale' },
  replyPill: { label: 'Reply pill', sizing: 'scale' },
  badges: { label: 'Store badges', sizing: 'scale' },
  logoHeader: { label: 'Logo header', sizing: 'scale' },
  counter: { label: 'Slide counter', sizing: 'scale' },
  image: { label: 'Image', sizing: 'box' },
  shape: { label: 'Shape', sizing: 'box' },
  icon: { label: 'Icon', sizing: 'square' }
};

export function sizingOf(type) {
  return (ELEMENT_TYPES[type] && ELEMENT_TYPES[type].sizing) || 'box';
}

export function uid(prefix) {
  return (prefix || 'e') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultProps(type, opts) {
  var o = opts || {};
  switch (type) {
    case 'text': {
      var preset = TEXT_PRESETS[o.preset] ? o.preset : 'headline';
      var p = TEXT_PRESETS[preset];
      return {
        text: o.text || (preset === 'price' ? '$499' : preset === 'headline' ? 'Run your business *from your phone*' : 'Your text'),
        preset: preset, size: p.size, weight: p.weight, color: p.color, align: 'left',
        lineHeight: p.lineHeight, letterSpacing: p.letterSpacing, uppercase: p.uppercase
      };
    }
    case 'checklist':
      return { items: ['First benefit', 'Second benefit', 'Third benefit', 'Fourth benefit'], columns: 2, size: 26, weight: 600, color: 'white' };
    case 'device':
      return {
        kind: o.kind || 'phone',
        src: o.kind === 'laptop' || o.kind === 'combo' ? captureSrc('rizo', 'laptop') : captureSrc('barbershop', 'phone'),
        src2: o.kind === 'combo' ? captureSrc('rizo', 'phone') : '',
        cropBottom: false,
        scale: 1
      };
    case 'chip':
      return { icon: 'bell', text: 'New booking', scale: 1 };
    case 'button':
      return { variant: o.variant || 'cta', text: o.variant === 'tag' ? 'Most popular' : 'Start a project →', scale: 1 };
    case 'replyPill':
      return { text: 'Reply *“APP”*', scale: 1 };
    case 'badges':
      return { which: 'both', scale: 1 };
    case 'logoHeader':
      return { sub: 'Web & Mobile Dev Studio', scale: 1 };
    case 'counter':
      return { auto: true, text: '1/1', scale: 1 };
    case 'image':
      return { src: o.src || '', fit: 'cover', radius: 24, opacity: 1 };
    case 'shape':
      return { kind: o.kind || 'rect', fill: 'gold', opacity: 1, radius: 24 };
    case 'icon':
      return { name: o.name || 'check', color: 'gold', style: 'tile' };
    default:
      return {};
  }
}

// Starting box for a new element; x/y get centered by the caller.
var DEFAULT_BOX = {
  text: [880, 140], checklist: [900, 100], device: [330, 690], chip: [320, 70], button: [300, 64],
  replyPill: [260, 64], badges: [320, 50], logoHeader: [300, 56], counter: [80, 44],
  image: [600, 600], shape: [400, 300], icon: [96, 96]
};

export function createElement(type, opts, format) {
  var o = opts || {};
  var f = FORMATS[format] || FORMATS.feed34;
  var box = DEFAULT_BOX[type] || [300, 300];
  var w = o.w || box[0];
  var h = o.h || box[1];
  if (type === 'shape' && o.kind === 'line') h = 6;
  if (type === 'shape' && o.kind === 'circle') h = w;
  return {
    id: uid('e'),
    type: type,
    x: o.x != null ? o.x : Math.round((f.w - w) / 2),
    y: o.y != null ? o.y : Math.round((f.h - h) / 2),
    w: w,
    h: h,
    rotate: 0,
    locked: false,
    hidden: false,
    props: Object.assign(defaultProps(type, o), o.props || {})
  };
}

export function createSlide(preset) {
  return { id: uid('s'), background: { preset: preset || 'glow', src: '', overlay: 0.55 }, elements: [] };
}

export function createDesign(format, name) {
  var now = Date.now();
  return {
    id: uid('d'),
    name: name || 'Untitled design',
    format: FORMATS[format] ? format : 'feed34',
    assets: [],
    createdAt: now,
    updatedAt: now,
    slides: [createSlide('glow')]
  };
}

/** Deep copy with fresh ids everywhere. */
export function duplicateDesign(design, name) {
  var copy = normalizeDesign(clone(design));
  var now = Date.now();
  copy.id = uid('d');
  copy.name = name || design.name + ' copy';
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.thumbUrl = '';
  copy.slides.forEach(function (s) {
    s.id = uid('s');
    s.elements.forEach(function (el) { el.id = uid('e'); });
  });
  return copy;
}

export function duplicateSlide(slide) {
  var copy = clone(slide);
  copy.id = uid('s');
  copy.elements.forEach(function (el) { el.id = uid('e'); });
  return copy;
}

export function duplicateElement(el, offset) {
  var copy = clone(el);
  var d = offset == null ? 24 : offset;
  copy.id = uid('e');
  copy.x += d;
  copy.y += d;
  copy.locked = false;
  return copy;
}

/**
 * Fill anything missing. RTDB drops empty arrays and null values, so every
 * design read from Firebase goes through here.
 */
export function normalizeDesign(raw) {
  var d = raw && typeof raw === 'object' ? raw : {};
  var design = {
    id: d.id || uid('d'),
    name: typeof d.name === 'string' && d.name ? d.name : 'Untitled design',
    format: FORMATS[d.format] ? d.format : 'feed34',
    source: d.source || '',
    thumbUrl: d.thumbUrl || '',
    assets: toArray(d.assets).filter(function (a) { return typeof a === 'string'; }),
    createdAt: Number(d.createdAt) || Date.now(),
    updatedAt: Number(d.updatedAt) || Date.now(),
    slides: toArray(d.slides).map(normalizeSlide)
  };
  if (!design.slides.length) design.slides.push(createSlide('glow'));
  return design;
}

function normalizeSlide(raw) {
  var s = raw && typeof raw === 'object' ? raw : {};
  var bg = s.background || {};
  return {
    id: s.id || uid('s'),
    background: {
      preset: BACKGROUNDS[bg.preset] ? bg.preset : 'glow',
      src: bg.src || '',
      overlay: bg.overlay != null ? Number(bg.overlay) : 0.55
    },
    elements: toArray(s.elements).filter(function (el) {
      return el && ELEMENT_TYPES[el.type];
    }).map(normalizeElement)
  };
}

function normalizeElement(raw) {
  var base = createElement(raw.type, { props: {} });
  var props = Object.assign({}, base.props, raw.props || {});
  if (raw.type === 'checklist') props.items = toArray(props.items).map(String);
  return {
    id: raw.id || uid('e'),
    type: raw.type,
    x: num(raw.x, 0),
    y: num(raw.y, 0),
    w: num(raw.w, base.w),
    h: num(raw.h, base.h),
    rotate: num(raw.rotate, 0),
    locked: !!raw.locked,
    hidden: !!raw.hidden,
    props: props
  };
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    // RTDB turns sparse arrays into objects keyed by index.
    return Object.keys(v).sort(function (a, b) { return a - b; }).map(function (k) { return v[k]; });
  }
  return [];
}

function num(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : fallback;
}

/** Returns a list of problems; empty means valid. Used by tests and the starter build. */
export function validateDesign(design) {
  var errors = [];
  if (!design || typeof design !== 'object') return ['design is not an object'];
  if (!FORMATS[design.format]) errors.push('unknown format ' + design.format);
  if (!Array.isArray(design.slides) || !design.slides.length) errors.push('no slides');
  if (Array.isArray(design.slides) && design.slides.length > MAX_SLIDES) errors.push('more than ' + MAX_SLIDES + ' slides');
  (design.slides || []).forEach(function (s, i) {
    if (!BACKGROUNDS[s.background && s.background.preset]) errors.push('slide ' + i + ': bad background');
    (s.elements || []).forEach(function (el, j) {
      var where = 'slide ' + i + ' element ' + j;
      if (!ELEMENT_TYPES[el.type]) errors.push(where + ': unknown type ' + el.type);
      ['x', 'y', 'w', 'h', 'rotate'].forEach(function (k) {
        if (typeof el[k] !== 'number' || !isFinite(el[k])) errors.push(where + ': ' + k + ' is not a number');
      });
      if (!el.props || typeof el.props !== 'object') errors.push(where + ': missing props');
      if (el.props && el.props.color && !COLORS[el.props.color]) errors.push(where + ': color ' + el.props.color + ' is not a brand color');
      if (el.props && el.props.fill && !COLORS[el.props.fill]) errors.push(where + ': fill ' + el.props.fill + ' is not a brand color');
    });
  });
  return errors;
}

/** Small summary kept at postDesignIndex/<id> so the library loads without full designs. */
export function summarize(design) {
  return {
    id: design.id,
    name: design.name,
    format: design.format,
    slides: design.slides.length,
    thumbUrl: design.thumbUrl || '',
    source: design.source || '',
    updatedAt: design.updatedAt
  };
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'design';
}
