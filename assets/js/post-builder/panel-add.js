/**
 * Post builder — "Add" pane: everything you can drop onto a slide.
 */
import { uiIcon, iconSvg, ICONS } from './icons.js?v=pb1';

var GROUPS = [
  {
    title: 'Text',
    items: [
      { type: 'text', preset: 'headline', label: 'Headline', icon: 'type' },
      { type: 'text', preset: 'price', label: 'Price', glyph: '$' },
      { type: 'text', preset: 'body', label: 'Body', glyph: 'Aa' },
      { type: 'text', preset: 'kicker', label: 'Kicker', glyph: 'AB' },
      { type: 'text', preset: 'label', label: 'Label', glyph: 'ab' },
      { type: 'checklist', label: 'Checklist', icon: 'check' }
    ]
  },
  {
    title: 'Devices',
    items: [
      { type: 'device', kind: 'phone', label: 'Phone', icon: 'phone' },
      { type: 'device', kind: 'laptop', label: 'Laptop', icon: 'dashboard' },
      { type: 'device', kind: 'combo', label: 'Laptop + phone', icon: 'copy' }
    ]
  },
  {
    title: 'Brand',
    items: [
      { type: 'logoHeader', label: 'Logo header', icon: 'star' },
      { type: 'button', variant: 'cta', label: 'CTA button', icon: 'arrow' },
      { type: 'button', variant: 'tag', label: 'Tag', icon: 'more' },
      { type: 'replyPill', label: 'Reply pill', icon: 'chat' },
      { type: 'badges', label: 'Store badges', icon: 'download' },
      { type: 'chip', label: 'Notification', icon: 'bell' },
      { type: 'counter', label: 'Slide counter', glyph: '1/6' }
    ]
  },
  {
    title: 'Media + shapes',
    items: [
      { type: 'upload', label: 'Upload image', icon: 'image' },
      { type: 'shape', kind: 'rect', label: 'Rectangle', icon: 'square' },
      { type: 'shape', kind: 'circle', label: 'Circle', icon: 'circle' },
      { type: 'shape', kind: 'line', label: 'Line', icon: 'line' },
      { type: 'icons', label: 'Icon', icon: 'heart' }
    ]
  }
];

function itemHtml(item, g, i) {
  var visual = item.glyph ? '<b class="pb-add-glyph">' + item.glyph + '</b>' : uiIcon(item.icon);
  return '<button type="button" class="pb-add" data-group="' + g + '" data-item="' + i + '">' + visual + '<span>' + item.label + '</span></button>';
}

function imageSize(url) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () { resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = function () { resolve({ w: 1, h: 1 }); };
    img.src = url;
  });
}

export function renderAddPane(container, ctx) {
  container.innerHTML = GROUPS.map(function (group, g) {
    return '<div class="pb-group"><h4 class="pb-group-title">' + group.title + '</h4><div class="pb-add-grid">' +
      group.items.map(function (item, i) { return itemHtml(item, g, i); }).join('') + '</div></div>';
  }).join('') +
    '<div class="pb-icon-picker" hidden><h4 class="pb-group-title">Pick an icon</h4><div class="pb-icon-grid">' +
    Object.keys(ICONS).map(function (name) {
      return '<button type="button" class="pb-icon-choice" data-icon="' + name + '" aria-label="' + name + '">' + iconSvg(name) + '</button>';
    }).join('') + '</div></div>' +
    '<input type="file" accept="image/*" class="pb-file" hidden />';

  var picker = container.querySelector('.pb-icon-picker');
  var file = container.querySelector('.pb-file');

  container.onclick = function (e) {
    var choice = e.target.closest('[data-icon]');
    if (choice) {
      picker.hidden = true;
      ctx.addElement('icon', { name: choice.getAttribute('data-icon'), w: 120, h: 120 });
      return;
    }
    var btn = e.target.closest('.pb-add');
    if (!btn) return;
    var item = GROUPS[+btn.getAttribute('data-group')].items[+btn.getAttribute('data-item')];
    if (item.type === 'upload') { file.click(); return; }
    if (item.type === 'icons') { picker.hidden = !picker.hidden; return; }
    ctx.addElement(item.type, { preset: item.preset, kind: item.kind, variant: item.variant });
  };

  file.onchange = async function () {
    var f = file.files && file.files[0];
    file.value = '';
    if (!f) return;
    var local = URL.createObjectURL(f);
    var size = await imageSize(local);
    URL.revokeObjectURL(local);
    var url;
    try { url = await ctx.uploadImage(f); } catch (e) { return; }
    var fmt = ctx.format();
    var w = Math.min(fmt.w - 120, 800);
    var h = Math.round(w * size.h / size.w);
    if (h > fmt.h - 240) { h = fmt.h - 240; w = Math.round(h * size.w / size.h); }
    ctx.addElement('image', { src: url, w: w, h: h, props: { src: url } });
  };
}
