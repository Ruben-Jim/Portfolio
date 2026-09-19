/**
 * Services kit → Post builder starters. Runs only with ?dump=1.
 * Measures every board rendered by services.js, maps each piece to a builder element
 * (see assets/js/post-builder/model.js) and writes the result into
 * <script id="pb-dump" type="application/json"> for scripts/build-post-starters.mjs.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (params.get('dump') !== '1') return;
  var lang = params.get('lang') === 'es' ? 'es' : 'en';

  var TOKENS = {
    white: [244, 247, 251], soft: [174, 181, 197], muted: [139, 147, 167],
    gold: [255, 219, 110], ink: [26, 18, 4], navy: [7, 9, 14]
  };
  var PHONE_W = 330;   // .pb-phone natural width
  var COMBO_W = 960;   // .pb-combo natural width
  var CROPPED = { barbershop: 1, rizo: 1 };
  var nextId = 0;

  function r1(n) { return Math.round(n * 10) / 10; }

  function token(css) {
    var m = String(css).match(/\d+(\.\d+)?/g);
    if (!m) return 'white';
    var rgb = m.slice(0, 3).map(Number);
    var best = 'white';
    var bestD = Infinity;
    Object.keys(TOKENS).forEach(function (k) {
      var t = TOKENS[k];
      var d = Math.pow(t[0] - rgb[0], 2) + Math.pow(t[1] - rgb[1], 2) + Math.pow(t[2] - rgb[2], 2);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function box(node, board, pad) {
    var r = node.getBoundingClientRect();
    var b = board.getBoundingClientRect();
    return { x: r1(r.left - b.left), y: r1(r.top - b.top), w: r1(r.width + (pad || 0)), h: r1(r.height) };
  }

  // <em>/<b> become *gold*; <br> becomes a newline; other markup is dropped.
  function rich(node, skip) {
    var copy = node.cloneNode(true);
    if (skip) copy.querySelectorAll(skip).forEach(function (n) { n.remove(); });
    copy.querySelectorAll('svg').forEach(function (n) { n.remove(); });
    copy.querySelectorAll('em, b').forEach(function (n) { n.replaceWith('*' + n.textContent + '*'); });
    copy.querySelectorAll('br').forEach(function (n) { n.replaceWith('\n'); });
    return copy.textContent.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  }

  function el(type, b, props) {
    return { id: 'x' + (nextId++), type: type, x: b.x, y: b.y, w: b.w, h: b.h, rotate: 0, locked: false, hidden: false, props: props };
  }

  function text(node, board, opts) {
    var o = opts || {};
    var cs = getComputedStyle(node);
    var size = parseFloat(cs.fontSize);
    var clip = cs.webkitBackgroundClip || cs.backgroundClip;
    var lh = parseFloat(cs.lineHeight);
    var align = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left';
    var b = box(node, board, o.pad);
    if (o.width != null) b.w = r1(o.width);
    return el('text', b, {
      text: o.text != null ? o.text : rich(node, o.skip),
      preset: o.preset || 'body',
      size: size,
      weight: parseInt(cs.fontWeight, 10) || 400,
      color: clip === 'text' ? 'goldGradient' : token(cs.color),
      align: align,
      lineHeight: isFinite(lh) ? Math.round(lh / size * 100) / 100 : 1.2,
      letterSpacing: Math.round((parseFloat(cs.letterSpacing) || 0) / size * 1000) / 1000,
      uppercase: cs.textTransform === 'uppercase'
    });
  }

  function captureId(src) {
    var m = String(src).match(/captures\/([^/]+)\//);
    return m ? m[1] : '';
  }

  function absolute(src) {
    return '/examples/instagram/' + String(src).replace(/^.*?(captures\/)/, '$1');
  }

  function withTag(node, board, out) {
    var tag = node.querySelector('em');
    var nb = node.getBoundingClientRect();
    var width = tag ? tag.getBoundingClientRect().left - nb.left - 8 : nb.width + 6;
    out.push(text(node, board, { skip: 'em', width: width }));
    if (tag) out.push(el('button', box(tag, board), { variant: 'tag', text: tag.textContent.trim(), scale: 1 }));
  }

  var HANDLERS = [
    ['.brand', function (n, board, out) {
      var sub = n.querySelector('.brand-sub');
      out.push(el('logoHeader', box(n, board), { sub: sub ? sub.textContent.trim() : '', scale: 1 }));
    }],
    // The story set starts with an uncounted cover, so its frames keep their fixed "1/3" text.
    ['.pk-count', function (n, board, out) {
      out.push(el('counter', box(n, board), { auto: board.id.indexOf('post-') === 0, text: n.textContent.trim(), scale: 1 }));
    }],
    ['.pk-pill', function (n, board, out) { withTag(n, board, out); }],
    ['.pk-row-text span', function (n, board, out) { withTag(n, board, out); }],
    ['.pk-price', function (n, board, out) { out.push(text(n, board, { preset: 'price', pad: 8 })); }],
    ['.pk-title', function (n, board, out) { out.push(text(n, board, { preset: 'headline', pad: 4 })); }],
    ['.pk-sub, .pk-kicker, .pk-dm', function (n, board, out) { out.push(text(n, board, { pad: 4 })); }],
    ['.pk-muted, .pk-rows strong, .pk-row-text b', function (n, board, out) { out.push(text(n, board, { pad: 8 })); }],
    ['.pk-tag b, .pk-tag span', function (n, board, out) { out.push(text(n, board, { pad: 8 })); }],
    ['.pk-swipe', function (n, board, out) { out.push(text(n, board, { text: n.textContent.trim() + ' →', pad: 8 })); }],
    ['.pk-checks', function (n, board, out) {
      var items = Array.prototype.map.call(n.querySelectorAll('li'), function (li) { return li.textContent.trim(); });
      var li = n.querySelector('li');
      var cs = getComputedStyle(li);
      out.push(el('checklist', box(n, board), {
        items: items, columns: 2, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10), color: 'white'
      }));
    }],
    ['.stage', function (n, board, out) {
      var laptop = n.querySelector('.laptop-screen');
      var phone = n.querySelector('.phone img');
      var b = box(n, board);
      out.push(el('device', b, {
        kind: 'combo', src: absolute(laptop.getAttribute('src')), src2: absolute(phone.getAttribute('src')),
        cropBottom: !!CROPPED[captureId(laptop.getAttribute('src'))], scale: r1(b.w / COMBO_W * 1000) / 1000
      }));
    }],
    ['.pk-phone', function (n, board, out) {
      var img = n.querySelector('img');
      var b = box(n, board);
      out.push(el('device', b, {
        kind: 'phone', src: absolute(img.getAttribute('src')), src2: '',
        cropBottom: !!CROPPED[captureId(img.getAttribute('src'))], scale: Math.round(b.w / PHONE_W * 1000) / 1000
      }));
    }],
    ['.pk-chip', function (n, board, out) {
      out.push(el('chip', box(n, board), { icon: n.getAttribute('data-icon') || 'bell', text: n.textContent.trim(), scale: 1 }));
    }],
    ['.stores', function (n, board, out) {
      out.push(el('badges', box(n, board), { which: 'both', scale: 1 }));
    }],
    ['.pk-reply', function (n, board, out) {
      out.push(el('replyPill', box(n, board), { text: rich(n), scale: 1 }));
    }],
    ['.cta', function (n, board, out) {
      out.push(el('button', box(n, board), { variant: 'cta', text: n.textContent.trim(), scale: 1 }));
    }]
  ];

  var SELECTOR = HANDLERS.map(function (h) { return h[0]; }).join(', ');

  function dumpBoard(board) {
    var out = [];
    board.querySelectorAll(SELECTOR).forEach(function (n) {
      for (var i = 0; i < HANDLERS.length; i++) {
        if (n.matches(HANDLERS[i][0])) { HANDLERS[i][1](n, board, out); break; }
      }
    });
    return { background: { preset: 'glow', src: '', overlay: 0.55 }, elements: out };
  }

  function set(prefix, format, name) {
    var boards = Array.prototype.filter.call(document.querySelectorAll('.artboard.pk'), function (b) {
      return b.id.indexOf(prefix) === 0;
    });
    return {
      id: 'services-' + (prefix === 'post-' ? 'carousel' : 'stories') + '-' + lang,
      name: name,
      lang: lang,
      format: format,
      boards: boards.map(function (b) {
        return { id: b.id, thumb: '/examples/instagram/services/' + lang + '/' + b.id + '.png' };
      }),
      slides: boards.map(dumpBoard)
    };
  }

  function run() {
    var label = lang === 'es' ? 'ES' : 'EN';
    var result;
    try {
      result = [
        set('post-', 'feed34', 'Services carousel (' + label + ')'),
        set('story-', 'story', 'Services stories (' + label + ')')
      ];
    } catch (err) {
      result = { error: String(err && err.stack || err) };
    }
    var out = document.createElement('script');
    out.type = 'application/json';
    out.id = 'pb-dump';
    out.textContent = JSON.stringify(result);
    document.body.appendChild(out);
  }

  // rAF does not tick under headless --dump-dom, so wait on fonts + a timer instead.
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    setTimeout(run, 300);
  });
})();
