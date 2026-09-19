/**
 * Post builder — "Layers" pane: stacking order (top first), select, hide, lock, reorder.
 * Up/down buttons instead of drag so it works the same on a phone.
 */
import { ELEMENT_TYPES } from './model.js?v=pb1';
import { esc } from './render.js?v=pb1';
import { uiIcon } from './icons.js?v=pb1';

function describe(el) {
  var p = el.props;
  var text = p.text != null ? String(p.text) :
    el.type === 'checklist' ? (p.items || []).join(' · ') :
    el.type === 'device' ? { phone: 'Phone', laptop: 'Laptop', combo: 'Laptop + phone' }[p.kind] :
    el.type === 'shape' ? { rect: 'Rectangle', circle: 'Circle', line: 'Line' }[p.kind] :
    el.type === 'icon' ? p.name :
    el.type === 'logoHeader' ? 'CodeWithRuben' :
    el.type === 'badges' ? { both: 'App Store + Google Play', apple: 'App Store', google: 'Google Play' }[p.which] : '';
  text = String(text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 34 ? text.slice(0, 33) + '…' : text;
}

export function renderLayersPane(container, ctx) {
  var elements = ctx.slide().elements;
  var selected = ctx.selected();
  if (!elements.length) {
    container.innerHTML = '<p class="pb-note">No elements on this slide yet. Add one from <b>Add</b>.</p>';
    return;
  }
  var rows = elements.map(function (el, i) { return { el: el, i: i }; }).reverse().map(function (r) {
    var el = r.el;
    return '<li class="pb-layer' + (selected && selected.id === el.id ? ' is-on' : '') + (el.hidden ? ' is-hidden' : '') + '" data-id="' + el.id + '">' +
      '<button type="button" class="pb-layer-name" data-lay="select"><b>' + esc(ELEMENT_TYPES[el.type].label) + '</b><span>' + esc(describe(el)) + '</span></button>' +
      '<button type="button" class="pb-icon-btn" data-lay="up" aria-label="Move up"' + (r.i === elements.length - 1 ? ' disabled' : '') + '>' + uiIcon('up') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-lay="down" aria-label="Move down"' + (r.i === 0 ? ' disabled' : '') + '>' + uiIcon('down') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-lay="hidden" aria-label="' + (el.hidden ? 'Show' : 'Hide') + '">' + uiIcon(el.hidden ? 'eyeOff' : 'eye') + '</button>' +
      '<button type="button" class="pb-icon-btn' + (el.locked ? ' is-on' : '') + '" data-lay="locked" aria-label="' + (el.locked ? 'Unlock' : 'Lock') + '">' + uiIcon(el.locked ? 'lock' : 'unlock') + '</button>' +
      '</li>';
  }).join('');
  container.innerHTML = '<p class="pb-hint pb-layers-hint">Top of the list is in front. Hidden layers are left out of exports.</p><ol class="pb-layers">' + rows + '</ol>';

  container.onclick = function (e) {
    var btn = e.target.closest('[data-lay]');
    if (!btn) return;
    var id = btn.closest('[data-id]').getAttribute('data-id');
    switch (btn.getAttribute('data-lay')) {
      case 'select': ctx.select(id); break;
      case 'up': ctx.reorder(id, 1); break;
      case 'down': ctx.reorder(id, -1); break;
      case 'hidden': ctx.toggle(id, 'hidden'); break;
      case 'locked': ctx.toggle(id, 'locked'); break;
    }
  };
}
