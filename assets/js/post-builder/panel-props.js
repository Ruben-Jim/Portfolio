/**
 * Post builder — "Style" pane. Controls for the selected element, or the slide
 * background when nothing is selected. Brand-locked: colors come from COLORS only.
 *
 * Typing keeps focus: input events mutate with { panels: false } so the pane isn't
 * rebuilt under the cursor; discrete clicks rebuild it to show the new state.
 */
import { COLORS, WEIGHTS, BACKGROUNDS, TEXT_PRESETS, CAPTURES, ELEMENT_TYPES, captureSrc, sizingOf } from './model.js?v=pb1';
import { esc } from './render.js?v=pb1';
import { uiIcon, iconSvg, ICONS } from './icons.js?v=pb1';

// ---------- small HTML helpers ----------

function field(label, control, hint) {
  return '<label class="pb-field"><span class="pb-field-label">' + label + '</span>' + control +
    (hint ? '<span class="pb-hint">' + hint + '</span>' : '') + '</label>';
}

function row(label, control) {
  return '<div class="pb-field"><span class="pb-field-label">' + label + '</span>' + control + '</div>';
}

function seg(key, options, value) {
  return '<div class="pb-seg" role="group">' + options.map(function (o) {
    var v = Array.isArray(o) ? o[0] : o;
    var text = Array.isArray(o) ? o[1] : o;
    return '<button type="button" data-set="' + key + '" data-value="' + esc(v) + '" class="' + (String(value) === String(v) ? 'is-on' : '') + '">' + text + '</button>';
  }).join('') + '</div>';
}

function swatches(key, value, allowed) {
  return '<div class="pb-swatches">' + (allowed || Object.keys(COLORS)).map(function (k) {
    return '<button type="button" class="pb-swatch' + (value === k ? ' is-on' : '') + '" data-set="' + key + '" data-value="' + k +
      '" title="' + COLORS[k].label + '" aria-label="' + COLORS[k].label + '" style="background:' + COLORS[k].css + '"></button>';
  }).join('') + '</div>';
}

function range(key, value, min, max, step, suffix) {
  return '<div class="pb-range"><input type="range" data-field="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" />' +
    '<input type="number" data-field="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" />' +
    (suffix ? '<span class="pb-unit">' + suffix + '</span>' : '') + '</div>';
}

function textInput(key, value, placeholder) {
  return '<input type="text" data-field="' + key + '" value="' + esc(value) + '" placeholder="' + esc(placeholder || '') + '" />';
}

function iconGrid(key, value) {
  return '<div class="pb-icon-grid pb-icon-grid--sm">' + Object.keys(ICONS).map(function (name) {
    return '<button type="button" class="pb-icon-choice' + (value === name ? ' is-on' : '') + '" data-set="' + key + '" data-value="' + name + '" aria-label="' + name + '">' + iconSvg(name) + '</button>';
  }).join('') + '</div>';
}

var GOLD_HINT = 'Wrap words in *stars* to make them gold.';

// ---------- per-type controls ----------

function captureOptions(kind, src) {
  var need = kind === 'laptop' ? 'laptop' : kind === 'combo' ? 'both' : 'phone';
  var current = (String(src).match(/captures\/([^/]+)\//) || [])[1] || '';
  var opts = CAPTURES.filter(function (c) {
    return need === 'both' ? c.phone && c.laptop : c[need];
  }).map(function (c) {
    return '<option value="' + c.id + '"' + (c.id === current ? ' selected' : '') + '>' + c.label + '</option>';
  });
  if (!current) opts.unshift('<option value="" selected>Your upload</option>');
  return opts.join('');
}

function typeControls(el) {
  var p = el.props;
  switch (el.type) {
    case 'text':
      return field('Text', '<textarea data-field="text" data-focus-text rows="3">' + esc(p.text) + '</textarea>', GOLD_HINT) +
        row('Style', '<div class="pb-chips">' + Object.keys(TEXT_PRESETS).map(function (k) {
          return '<button type="button" data-preset="' + k + '" class="' + (p.preset === k ? 'is-on' : '') + '">' + TEXT_PRESETS[k].label + '</button>';
        }).join('') + '</div>') +
        row('Size', range('size', p.size, 10, 260, 1, 'px')) +
        row('Weight', seg('weight', WEIGHTS, p.weight)) +
        row('Color', swatches('color', p.color, ['white', 'soft', 'muted', 'gold', 'goldGradient', 'navy', 'ink'])) +
        row('Align', seg('align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], p.align)) +
        row('Line height', range('lineHeight', p.lineHeight, 0.8, 2, 0.02)) +
        row('Letter spacing', range('letterSpacing', p.letterSpacing, -0.08, 0.3, 0.005, 'em')) +
        row('Case', seg('uppercase', [['false', 'Normal'], ['true', 'UPPERCASE']], String(!!p.uppercase)));
    case 'checklist':
      return field('Items (one per line)', '<textarea data-field="items" data-focus-text rows="4">' + esc((p.items || []).join('\n')) + '</textarea>', GOLD_HINT) +
        row('Columns', seg('columns', [[1, '1'], [2, '2']], p.columns)) +
        row('Size', range('size', p.size, 12, 80, 1, 'px')) +
        row('Weight', seg('weight', WEIGHTS, p.weight)) +
        row('Color', swatches('color', p.color, ['white', 'soft', 'muted', 'gold']));
    case 'device':
      return row('Device', seg('kind', [['phone', 'Phone'], ['laptop', 'Laptop'], ['combo', 'Laptop + phone']], p.kind)) +
        field(p.kind === 'combo' ? 'Project' : 'Screen', '<select data-field="capture">' + captureOptions(p.kind, p.src) + '</select>') +
        row('Your screenshot', '<div class="pb-btn-row">' +
          (p.kind !== 'phone' ? '<button type="button" class="pb-btn" data-upload="src">' + uiIcon('image') + 'Laptop screen</button>' : '') +
          (p.kind !== 'laptop' ? '<button type="button" class="pb-btn" data-upload="' + (p.kind === 'combo' ? 'src2' : 'src') + '">' + uiIcon('image') + 'Phone screen</button>' : '') +
          '</div>') +
        (p.kind !== 'laptop' ? row('Trim bottom edge', seg('cropBottom', [['false', 'Off'], ['true', 'On']], String(!!p.cropBottom))) : '');
    case 'chip':
      return field('Text', textInput('text', p.text, 'New booking'), '') + row('Icon', iconGrid('icon', p.icon));
    case 'button':
      return row('Style', seg('variant', [['cta', 'CTA button'], ['tag', 'Tag']], p.variant)) + field('Text', textInput('text', p.text));
    case 'replyPill':
      return field('Text', textInput('text', p.text), GOLD_HINT);
    case 'badges':
      return row('Show', seg('which', [['both', 'Both'], ['apple', 'App Store'], ['google', 'Google Play']], p.which));
    case 'logoHeader':
      return field('Tagline', textInput('sub', p.sub));
    case 'counter':
      return row('Number', seg('auto', [['true', 'Automatic'], ['false', 'Custom']], String(!!p.auto))) +
        (p.auto ? '' : field('Text', textInput('text', p.text, '1/6')));
    case 'image':
      return row('Image', '<button type="button" class="pb-btn" data-upload="src">' + uiIcon('image') + (p.src ? 'Replace image' : 'Upload image') + '</button>') +
        row('Fit', seg('fit', [['cover', 'Fill'], ['contain', 'Fit']], p.fit)) +
        row('Corners', range('radius', p.radius, 0, 300, 1, 'px')) +
        row('Opacity', range('opacity', p.opacity, 0, 1, 0.05));
    case 'shape':
      return row('Shape', seg('kind', [['rect', 'Rectangle'], ['circle', 'Circle'], ['line', 'Line']], p.kind)) +
        row('Fill', swatches('fill', p.fill)) +
        row('Opacity', range('opacity', p.opacity, 0, 1, 0.05)) +
        (p.kind === 'rect' ? row('Corners', range('radius', p.radius, 0, 300, 1, 'px')) : '');
    case 'icon':
      return row('Style', seg('style', [['plain', 'Plain'], ['tile', 'Tile'], ['solid', 'Solid']], p.style)) +
        (p.style === 'solid' ? '' : row('Color', swatches('color', p.color, ['white', 'soft', 'muted', 'gold']))) +
        row('Icon', iconGrid('name', p.name));
    default:
      return '';
  }
}

function arrangeHtml(el) {
  var sizing = sizingOf(el.type);
  var sizeField = sizing === 'scale'
    ? numberField('scale', Math.round((el.props.scale || 1) * 100), 'Size %')
    : sizing === 'box'
      ? numberField('w', Math.round(el.w), 'W') + numberField('h', Math.round(el.h), 'H')
      : numberField('w', Math.round(el.w), sizing === 'square' ? 'Size' : 'Width');
  return '<div class="pb-section"><h4 class="pb-group-title">Position</h4>' +
    '<div class="pb-num-grid">' + numberField('x', Math.round(el.x), 'X') + numberField('y', Math.round(el.y), 'Y') + sizeField +
    numberField('rotate', el.rotate || 0, 'Rotate°') + '</div>' +
    '<div class="pb-arrange">' +
      '<div class="pb-nudge" role="group" aria-label="Nudge">' +
        '<button type="button" data-nudge="0,-1" aria-label="Nudge up">' + uiIcon('up') + '</button>' +
        '<button type="button" data-nudge="-1,0" aria-label="Nudge left">' + uiIcon('left') + '</button>' +
        '<button type="button" data-nudge="1,0" aria-label="Nudge right">' + uiIcon('right') + '</button>' +
        '<button type="button" data-nudge="0,1" aria-label="Nudge down">' + uiIcon('down') + '</button>' +
      '</div>' +
      '<label class="pb-step"><input type="checkbox" data-step10 /> 10px steps</label>' +
      '<button type="button" class="pb-icon-btn" data-do="centerH" title="Center horizontally" aria-label="Center horizontally">' + uiIcon('centerH') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-do="centerV" title="Center vertically" aria-label="Center vertically">' + uiIcon('centerV') + '</button>' +
    '</div></div>';
}

function numberField(key, value, label) {
  return '<label class="pb-num"><span>' + label + '</span><input type="number" inputmode="decimal" data-box="' + key + '" value="' + value + '" /></label>';
}

function elementHtml(el) {
  return '<div class="pb-pane-head"><strong>' + (ELEMENT_TYPES[el.type] ? ELEMENT_TYPES[el.type].label : el.type) + '</strong>' +
    '<div class="pb-head-actions">' +
      '<button type="button" class="pb-icon-btn" data-do="front" title="Bring to front" aria-label="Bring to front">' + uiIcon('layers') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-do="lock" title="' + (el.locked ? 'Unlock' : 'Lock') + '" aria-label="' + (el.locked ? 'Unlock' : 'Lock') + '">' + uiIcon(el.locked ? 'lock' : 'unlock') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-do="duplicate" title="Duplicate (Ctrl/⌘ D)" aria-label="Duplicate">' + uiIcon('copy') + '</button>' +
      '<button type="button" class="pb-icon-btn pb-danger" data-do="delete" title="Delete" aria-label="Delete">' + uiIcon('trash') + '</button>' +
      '<button type="button" class="pb-icon-btn pb-phone-only" data-do="deselect" title="Done" aria-label="Done">' + uiIcon('close') + '</button>' +
    '</div></div>' +
    (el.locked ? '<p class="pb-note">Locked — unlock to move or resize.</p>' : '') +
    '<div class="pb-section">' + typeControls(el) + '</div>' +
    arrangeHtml(el);
}

function slideHtml(ctx) {
  var s = ctx.slide();
  var bg = s.background;
  return '<div class="pb-pane-head"><strong>Slide ' + (ctx.slideIndex + 1) + '</strong><span class="pb-muted-text">' + ctx.format().label + '</span></div>' +
    '<p class="pb-note">Tap an element on the canvas to edit it. Double-tap text to type.</p>' +
    '<div class="pb-section">' +
      row('Background', '<div class="pb-chips">' + Object.keys(BACKGROUNDS).map(function (k) {
        return '<button type="button" data-bg="' + k + '" class="' + (bg.preset === k ? 'is-on' : '') + '">' + BACKGROUNDS[k] + '</button>';
      }).join('') + '</div>') +
      (bg.preset === 'photo'
        ? row('Photo', '<button type="button" class="pb-btn" data-upload="bg">' + uiIcon('image') + (bg.src ? 'Replace photo' : 'Upload photo') + '</button>') +
          row('Darken', range('overlay', bg.overlay, 0, 0.95, 0.05))
        : '') +
    '</div>';
}

// ---------- value parsing ----------

function coerce(key, raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (['size', 'weight', 'lineHeight', 'letterSpacing', 'columns', 'radius', 'opacity', 'overlay'].indexOf(key) >= 0) return Number(raw);
  return raw;
}

// ---------- public ----------

export function renderStylePane(container, ctx) {
  var el = ctx.selected();
  container.innerHTML = el ? elementHtml(el) : slideHtml(ctx);
  container.dataset.for = el ? el.id : '';

  var file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  container.appendChild(file);

  function setProp(key, value, opts) {
    var target = ctx.selected();
    if (!target) return;
    ctx.mutate(function () { target.props[key] = value; }, Object.assign({ only: target.id }, opts || {}));
  }

  container.onclick = function (e) {
    var t = e.target;
    var el2 = ctx.selected();

    var preset = t.closest('[data-preset]');
    if (preset && el2) {
      var p = TEXT_PRESETS[preset.getAttribute('data-preset')];
      ctx.mutate(function () {
        Object.assign(el2.props, {
          preset: preset.getAttribute('data-preset'), size: p.size, weight: p.weight, color: p.color,
          lineHeight: p.lineHeight, letterSpacing: p.letterSpacing, uppercase: p.uppercase
        });
      }, { only: el2.id });
      return;
    }

    var set = t.closest('[data-set]');
    if (set && el2) {
      var key = set.getAttribute('data-set');
      var value = coerce(key, set.getAttribute('data-value'));
      if (el2.type === 'shape' && key === 'kind') {
        ctx.mutate(function () {
          el2.props.kind = value;
          if (value === 'line') el2.h = 6;
          if (value === 'circle') el2.h = el2.w;
          if (value === 'rect' && el2.h < 40) el2.h = 200;
        }, { only: el2.id });
        return;
      }
      if (el2.type === 'device' && key === 'kind') {
        ctx.mutate(function () {
          var cap = (String(el2.props.src).match(/captures\/([^/]+)\//) || [])[1] || 'rizo';
          el2.props.kind = value;
          if (value === 'phone') el2.props.src = captureSrc(cap, 'phone');
          else el2.props.src = captureSrc(cap === 'zoomrealty' && value === 'combo' ? 'rizo' : cap, 'laptop');
          el2.props.src2 = value === 'combo' ? captureSrc(cap === 'zoomrealty' ? 'rizo' : cap, 'phone') : '';
        }, { only: el2.id });
        return;
      }
      setProp(key, value);
      return;
    }

    var bgBtn = t.closest('[data-bg]');
    if (bgBtn) {
      ctx.mutate(function () { ctx.slide().background.preset = bgBtn.getAttribute('data-bg'); });
      return;
    }

    var up = t.closest('[data-upload]');
    if (up) {
      file.dataset.target = up.getAttribute('data-upload');
      file.click();
      return;
    }

    var nudge = t.closest('[data-nudge]');
    if (nudge) {
      var d = nudge.getAttribute('data-nudge').split(',').map(Number);
      var step = container.querySelector('[data-step10]') && container.querySelector('[data-step10]').checked ? 10 : 1;
      ctx.nudge(d[0] * step, d[1] * step);
      return;
    }

    var act = t.closest('[data-do]');
    if (!act || !el2) return;
    var f = ctx.format();
    switch (act.getAttribute('data-do')) {
      case 'delete': ctx.removeElement(el2.id); break;
      case 'duplicate': ctx.duplicateElement(el2.id); break;
      case 'front': ctx.reorder(el2.id, 'front'); break;
      case 'lock': ctx.toggle(el2.id, 'locked'); ctx.select(el2.id); break;
      case 'deselect': ctx.select(null); ctx.closeSheet(); break;
      case 'centerH': ctx.mutate(function () { el2.x = Math.round((f.w - el2.w) / 2); }, { only: el2.id }); break;
      case 'centerV': ctx.mutate(function () { el2.y = Math.round((f.h - el2.h) / 2); }, { only: el2.id }); break;
    }
  };

  container.oninput = function (e) {
    var t = e.target;
    var el2 = ctx.selected();
    var key = t.getAttribute('data-field');
    var box = t.getAttribute('data-box');

    if (key === 'overlay') {
      var v = Number(t.value);
      syncTwin(container, t, key);
      ctx.mutate(function () { ctx.slide().background.overlay = v; }, { coalesce: 'overlay', panels: false });
      return;
    }
    if (!el2) return;

    if (box) {
      var n = Number(t.value);
      if (!isFinite(n) || t.value === '') return;
      ctx.mutate(function () {
        if (box === 'scale') el2.props.scale = Math.max(0.05, n / 100);
        else if (box === 'w' && sizingOf(el2.type) === 'square') { el2.w = el2.h = Math.max(8, n); }
        else el2[box] = n;
      }, { only: el2.id, coalesce: 'box:' + box + ':' + el2.id, panels: false });
      return;
    }

    if (!key) return;
    if (key === 'capture') {
      var id = t.value;
      if (!id) return;
      ctx.mutate(function () {
        var k = el2.props.kind;
        el2.props.src = captureSrc(id, k === 'phone' ? 'phone' : 'laptop');
        el2.props.src2 = k === 'combo' ? captureSrc(id, 'phone') : '';
        el2.props.cropBottom = id === 'barbershop' || id === 'rizo';
      }, { only: el2.id });
      return;
    }
    var value = t.value;
    if (key === 'items') value = value.split('\n');
    else value = coerce(key, value);
    if (typeof value === 'number' && !isFinite(value)) return;
    syncTwin(container, t, key);
    setProp(key, value, { coalesce: 'prop:' + key + ':' + el2.id, panels: false });
  };

  file.onchange = async function () {
    var f = file.files && file.files[0];
    var target = file.dataset.target;
    file.value = '';
    if (!f) return;
    var url;
    try { url = await ctx.uploadImage(f); } catch (e) { return; }
    if (target === 'bg') {
      ctx.mutate(function () { ctx.slide().background.src = url; });
      return;
    }
    var el2 = ctx.selected();
    if (!el2) return;
    ctx.mutate(function () {
      el2.props[target] = url;
      if (el2.type === 'device') el2.props.cropBottom = false;
    }, { only: el2.id });
  };
}

// Keep a range slider and its number box showing the same value.
function syncTwin(container, source, key) {
  container.querySelectorAll('[data-field="' + key + '"]').forEach(function (n) {
    if (n !== source) n.value = source.value;
  });
}

/** Refresh the X/Y/size/rotation boxes after a canvas gesture without rebuilding the pane. */
export function syncStyleBox(container, el) {
  if (!container || container.dataset.for !== el.id) return;
  var values = { x: Math.round(el.x), y: Math.round(el.y), w: Math.round(el.w), h: Math.round(el.h), rotate: el.rotate || 0, scale: Math.round((el.props.scale || 1) * 100) };
  container.querySelectorAll('[data-box]').forEach(function (input) {
    if (document.activeElement === input) return;
    input.value = values[input.getAttribute('data-box')];
  });
  var size = container.querySelectorAll('[data-field="size"]');
  size.forEach(function (input) {
    if (document.activeElement !== input && el.props.size != null) input.value = el.props.size;
  });
}
