/**
 * Post builder — PNG export, download, share and zip.
 * Rasterizes each slide at native size in an off-screen host with html-to-image,
 * the same approach as rasterize() in assets/js/ig-posts.js.
 */
import { FORMATS, clone, slugify } from './model.js?v=pb1';
import { renderSlide, layoutSlide, waitForImages, ensureFonts } from './render.js?v=pb1';

var h2iPromise = null;
var zipPromise = null;
var fontCssPromise = null;

var FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
var FONT_SUBSETS = { latin: 1, 'latin-ext': 1 };

/**
 * html-to-image cannot read the cross-origin Google Fonts stylesheet (cssRules throws),
 * so exports silently fall back to a system font. Build the @font-face CSS ourselves:
 * fetch the stylesheet (CORS-enabled) and inline the latin woff2 files as data URLs.
 */
function poppinsEmbedCss() {
  if (!fontCssPromise) {
    fontCssPromise = (async function () {
      var css = await (await fetch(FONT_CSS_URL)).text();
      var blocks = [];
      var re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
      var m;
      while ((m = re.exec(css))) {
        if (FONT_SUBSETS[m[1]]) blocks.push(m[2]);
      }
      var inlined = await Promise.all(blocks.map(async function (block) {
        var url = (block.match(/url\(([^)]+)\)/) || [])[1];
        if (!url) return block;
        var data = await blobToDataUrl(await (await fetch(url.replace(/['"]/g, ''))).blob());
        return block.replace(url, data);
      }));
      return inlined.join('\n');
    })().catch(function (err) {
      fontCssPromise = null;
      throw err;
    });
  }
  return fontCssPromise;
}

function blobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadHtmlToImage() {
  if (!h2iPromise) h2iPromise = import('https://esm.sh/html-to-image@1.11.11');
  return h2iPromise;
}

function loadJsZip() {
  if (!zipPromise) zipPromise = import('https://esm.sh/jszip@3.10.1').then(function (m) { return m.default || m; });
  return zipPromise;
}

function nextFrame() {
  return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
}

function makeHost() {
  var host = document.createElement('div');
  host.className = 'pb-render-host';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(host);
  return host;
}

/**
 * Render slides to blobs. opts: { indexes, pixelRatio, type: 'png'|'jpeg', onProgress }.
 * Works on a copy so layout caches never touch the live design.
 */
export async function renderSlides(design, opts) {
  var o = opts || {};
  var mod = await loadHtmlToImage();
  var copy = clone(design);
  var f = FORMATS[copy.format];
  var indexes = o.indexes || copy.slides.map(function (_, i) { return i; });
  var host = makeHost();
  var out = [];
  try {
    var fontEmbedCSS = await poppinsEmbedCss();
    await ensureFonts();
    for (var k = 0; k < indexes.length; k++) {
      var i = indexes[k];
      if (o.onProgress) o.onProgress(k, indexes.length);
      var built = renderSlide(copy, i, 'export');
      host.innerHTML = '';
      host.appendChild(built.root);
      layoutSlide(built.board, copy.slides[i]);
      await waitForImages(host);
      await nextFrame();
      var options = {
        width: f.w,
        height: f.h,
        pixelRatio: o.pixelRatio || 1,
        cacheBust: false,
        backgroundColor: '#07090e',
        fontEmbedCSS: fontEmbedCSS
      };
      var blob;
      if (o.type === 'jpeg') {
        options.quality = 0.82;
        blob = await (await fetch(await mod.toJpeg(built.board, options))).blob();
      } else {
        blob = await mod.toBlob(built.board, options);
      }
      out.push({ index: i, blob: blob, name: fileName(copy, i) });
    }
  } finally {
    host.remove();
  }
  return out;
}

export function fileName(design, i) {
  var n = design.slides.length > 1 ? '-' + String(i + 1).padStart(2, '0') : '';
  return slugify(design.name) + n + '.png';
}

/** Small JPEG of slide 1 for the library grid. */
export async function renderThumb(design) {
  var res = await renderSlides(design, { indexes: [0], pixelRatio: 1 / 3, type: 'jpeg' });
  return res[0] && res[0].blob;
}

export function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}

export async function downloadAll(files) {
  for (var i = 0; i < files.length; i++) {
    downloadBlob(files[i].blob, files[i].name);
    await new Promise(function (r) { setTimeout(r, 350); });
  }
}

export async function downloadZip(files, zipName) {
  var JSZip = await loadJsZip();
  var zip = new JSZip();
  files.forEach(function (f) { zip.file(f.name, f.blob); });
  var blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName);
}

export function canShareFiles() {
  try {
    var probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    return !!(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch (e) {
    return false;
  }
}

/** Native share sheet with every slide (Instagram accepts several images as a carousel). */
export async function shareFiles(files, title) {
  var list = files.map(function (f) { return new File([f.blob], f.name, { type: f.blob.type || 'image/png' }); });
  await navigator.share({ files: list, title: title });
}
