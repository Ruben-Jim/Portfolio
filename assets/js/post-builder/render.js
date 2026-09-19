/**
 * Post builder — turns a slide into DOM. The editor and the PNG export both use this,
 * so what you see while editing is exactly what gets exported.
 *
 * Slide root carries `ig-mockup-root` + `artboard` so the project-post styles in
 * /assets/css/ig-mockup.css (brand, laptop, stores, cta) apply unchanged.
 */
import { FORMATS, COLORS, sizingOf } from './model.js?v=pb1';
import { iconSvg } from './icons.js?v=pb1';

var LOGO = '/assets/images/logo/logo.jpg';
var BADGE_APP = '/examples/instagram/badges/app-store.svg';
var BADGE_PLAY = '/examples/instagram/badges/google-play.png';

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `*words*` become gold highlights; newlines become line breaks. */
export function richText(text) {
  return esc(text)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function colorCss(token) {
  return (COLORS[token] || COLORS.white).css;
}

function textStyle(p) {
  var s = 'font-size:' + p.size + 'px;font-weight:' + p.weight + ';line-height:' + p.lineHeight +
    ';letter-spacing:' + p.letterSpacing + 'em;text-align:' + p.align + ';';
  if (p.uppercase) s += 'text-transform:uppercase;';
  if (p.color !== 'goldGradient') s += 'color:' + colorCss(p.color) + ';';
  return s;
}

function deviceHtml(p) {
  var crop = p.cropBottom ? ' pb-crop' : '';
  if (p.kind === 'laptop') {
    return '<div class="pb-comp pb-laptop-solo">' + laptopHtml(p.src) + '</div>';
  }
  if (p.kind === 'combo') {
    return '<div class="pb-comp pb-combo' + crop + '"><div class="stage">' + laptopHtml(p.src) +
      '<div class="phone"><img src="' + esc(p.src2) + '" alt="" /></div></div></div>';
  }
  return '<div class="pb-comp pb-phone' + crop + '"><img src="' + esc(p.src) + '" alt="" /></div>';
}

function laptopHtml(src) {
  return '<div class="laptop"><div class="laptop-lid">' +
    '<div class="laptop-bar" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<img class="laptop-screen" src="' + esc(src) + '" alt="" />' +
    '</div><div class="laptop-base"></div></div>';
}

function innerHtml(el, ctx) {
  var p = el.props;
  switch (el.type) {
    case 'text':
      return '<div class="pb-text' + (p.color === 'goldGradient' ? ' pb-grad' : '') + '" style="' + textStyle(p) + '">' + richText(p.text) + '</div>';
    case 'checklist':
      return '<ul class="pb-checks" style="grid-template-columns:repeat(' + (p.columns === 1 ? 1 : 2) + ',1fr);font-size:' + p.size +
        'px;font-weight:' + p.weight + ';color:' + colorCss(p.color) + ';">' +
        (p.items || []).filter(Boolean).map(function (item) {
          return '<li>' + iconSvg('check') + '<span>' + richText(item) + '</span></li>';
        }).join('') + '</ul>';
    case 'device':
      return deviceHtml(p);
    case 'chip':
      return '<div class="pb-comp pb-chip"><i>' + iconSvg(p.icon) + '</i><span>' + esc(p.text) + '</span></div>';
    case 'button':
      return p.variant === 'tag'
        ? '<div class="pb-comp pb-tag">' + esc(p.text) + '</div>'
        : '<div class="pb-comp cta pb-cta">' + esc(p.text) + '</div>';
    case 'replyPill':
      return '<div class="pb-comp pb-reply">' + iconSvg('chat') + '<span>' + richText(p.text) + '</span></div>';
    case 'badges':
      return '<div class="pb-comp stores">' +
        (p.which !== 'google' ? '<img src="' + BADGE_APP + '" alt="Download on the App Store" />' : '') +
        (p.which !== 'apple' ? '<img class="play" src="' + BADGE_PLAY + '" alt="Get it on Google Play" />' : '') +
        '</div>';
    case 'logoHeader':
      return '<div class="pb-comp brand"><img src="' + LOGO + '" alt="" /><div>' +
        '<div class="wordmark">CodeWith<span>Ruben</span></div>' +
        '<span class="brand-sub">' + esc(p.sub) + '</span></div></div>';
    case 'counter':
      return '<div class="pb-comp pb-count">' + esc(p.auto ? (ctx.index + 1) + '/' + ctx.total : p.text) + '</div>';
    case 'image':
      return p.src
        ? '<img class="pb-img" src="' + esc(p.src) + '" alt="" style="object-fit:' + (p.fit === 'contain' ? 'contain' : 'cover') +
          ';border-radius:' + (p.radius || 0) + 'px;opacity:' + p.opacity + ';" />'
        : '<div class="pb-img-empty" style="border-radius:' + (p.radius || 0) + 'px;">Add an image</div>';
    case 'shape': {
      var radius = p.kind === 'circle' ? '50%' : p.kind === 'line' ? '999px' : (p.radius || 0) + 'px';
      return '<div class="pb-shape" style="background:' + colorCss(p.fill) + ';border-radius:' + radius + ';opacity:' + p.opacity + ';"></div>';
    }
    case 'icon':
      return '<div class="pb-icon pb-icon--' + (p.style || 'plain') + '" style="color:' +
        (p.style === 'solid' ? COLORS.ink.css : colorCss(p.color === 'goldGradient' ? 'gold' : p.color)) + ';">' + iconSvg(p.name) + '</div>';
    default:
      return '';
  }
}

/** Position + size on the wrapper. Component scale is applied to the inner node. */
export function applyBox(node, el) {
  node.style.transform = 'translate(' + el.x + 'px, ' + el.y + 'px) rotate(' + (el.rotate || 0) + 'deg)';
  var sizing = sizingOf(el.type);
  if (sizing === 'width') {
    node.style.width = el.w + 'px';
    node.style.height = '';
  } else if (sizing === 'box') {
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
  } else if (sizing === 'square') {
    node.style.width = el.w + 'px';
    node.style.height = el.w + 'px';
  } else {
    var inner = node.firstElementChild;
    if (inner) inner.style.transform = 'scale(' + (el.props.scale || 1) + ')';
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
  }
}

export function renderElement(el, ctx) {
  var node = document.createElement('div');
  node.className = 'pb-el pb-el--' + el.type + ' pb-size--' + sizingOf(el.type);
  node.setAttribute('data-id', el.id);
  node.innerHTML = innerHtml(el, ctx);
  if (el.hidden) node.classList.add('is-hidden');
  if (el.locked) node.classList.add('is-locked');
  applyBox(node, el);
  return node;
}

export function backgroundStyle(bg) {
  if (bg.preset !== 'photo' || !bg.src) return '';
  var o = Math.max(0, Math.min(0.95, Number(bg.overlay) || 0));
  var shade = 'rgba(7,9,14,' + o + ')';
  return 'background:linear-gradient(' + shade + ',' + shade + '),url("' + String(bg.src).replace(/"/g, '%22') + '") center / cover no-repeat,#07090e;';
}

/**
 * Build the slide DOM. mode 'export' skips hidden elements.
 * Returns { root, board }; call layoutSlide(board, slide) once it is in the document.
 */
export function renderSlide(design, index, mode) {
  var f = FORMATS[design.format];
  var slide = design.slides[index];
  var root = document.createElement('div');
  root.className = 'ig-mockup-root pb-slide-root';
  var board = document.createElement('div');
  board.className = 'artboard pb-slide pb-bg--' + slide.background.preset;
  board.style.width = f.w + 'px';
  board.style.height = f.h + 'px';
  var bg = backgroundStyle(slide.background);
  if (bg) board.setAttribute('style', board.getAttribute('style') + bg);
  var ctx = { index: index, total: design.slides.length, mode: mode };
  slide.elements.forEach(function (el) {
    if (mode === 'export' && el.hidden) return;
    board.appendChild(renderElement(el, ctx));
  });
  root.appendChild(board);
  return { root: root, board: board };
}

/**
 * Measure content-sized elements and cache their w/h on the model.
 * Components: natural size of the inner node × scale. Text: rendered height.
 */
export function layoutSlide(board, slide) {
  slide.elements.forEach(function (el) {
    var node = board.querySelector('[data-id="' + el.id + '"]');
    if (node) layoutElement(node, el);
  });
}

export function layoutElement(node, el) {
  var sizing = sizingOf(el.type);
  if (sizing === 'scale') {
    var inner = node.firstElementChild;
    if (!inner) return;
    var s = el.props.scale || 1;
    el.w =Math.round(inner.offsetWidth * s * 10) / 10;
    el.h = Math.round(inner.offsetHeight * s * 10) / 10;
    node.style.width = el.w + 'px';
    node.style.height = el.h + 'px';
  } else if (sizing === 'width') {
    el.h = node.offsetHeight;
  } else if (sizing === 'square') {
    el.h = el.w;
  }
}

/**
 * Load every Poppins weight the builder uses. document.fonts.ready alone doesn't load
 * a weight nothing on screen uses yet, so measuring a slide first would use fallback widths.
 */
var fontsPromise = null;
export function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  if (!fontsPromise) {
    fontsPromise = Promise.all([400, 500, 600, 700, 800].map(function (w) {
      return document.fonts.load(w + ' 16px Poppins').catch(function () {});
    })).then(function () { return document.fonts.ready; });
  }
  return fontsPromise;
}

/** Resolve once every <img> in root has loaded or failed (8s cap each). */
export function waitForImages(root) {
  var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
  return Promise.all(imgs.map(function (img) {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(function (resolve) {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 8000);
    });
  }));
}
