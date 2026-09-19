/**
 * Post builder — "Slides" pane: live mini previews, switch, add, duplicate, reorder, delete.
 */
import { FORMATS, MAX_SLIDES, clone } from './model.js?v=pb1';
import { renderSlide, layoutSlide } from './render.js?v=pb1';
import { uiIcon } from './icons.js?v=pb1';

var THUMB_W = 120;

export function renderSlidesPane(container, ctx) {
  var d = ctx.design;
  var f = FORMATS[d.format];
  var scale = THUMB_W / f.w;
  var thumbH = Math.round(f.h * scale);
  var n = d.slides.length;

  container.innerHTML =
    '<div class="pb-pane-head"><strong>' + n + ' slide' + (n > 1 ? 's' : '') + '</strong>' +
      '<button type="button" class="pb-btn" data-slide-act="add"' + (n >= MAX_SLIDES ? ' disabled' : '') + '>' + uiIcon('plus') + 'Add slide</button></div>' +
    '<ol class="pb-slide-list">' + d.slides.map(function (_, i) {
      return '<li class="pb-slide-item' + (i === ctx.slideIndex ? ' is-on' : '') + '" data-index="' + i + '">' +
        '<button type="button" class="pb-slide-thumb" data-slide-act="go" aria-label="Go to slide ' + (i + 1) + '">' +
          '<span class="pb-thumb-frame" style="width:' + THUMB_W + 'px;height:' + thumbH + 'px"></span>' +
          '<span class="pb-slide-num">' + (i + 1) + '</span>' +
        '</button>' +
        '<div class="pb-slide-tools">' +
          '<button type="button" class="pb-icon-btn" data-slide-act="up" aria-label="Move slide earlier"' + (i === 0 ? ' disabled' : '') + '>' + uiIcon('up') + '</button>' +
          '<button type="button" class="pb-icon-btn" data-slide-act="down" aria-label="Move slide later"' + (i === n - 1 ? ' disabled' : '') + '>' + uiIcon('down') + '</button>' +
          '<button type="button" class="pb-icon-btn" data-slide-act="duplicate" aria-label="Duplicate slide"' + (n >= MAX_SLIDES ? ' disabled' : '') + '>' + uiIcon('copy') + '</button>' +
          '<button type="button" class="pb-icon-btn pb-danger" data-slide-act="delete" aria-label="Delete slide"' + (n <= 1 ? ' disabled' : '') + '>' + uiIcon('trash') + '</button>' +
        '</div></li>';
    }).join('') + '</ol>';

  // Measure a copy: this pane is often hidden (display:none), where measuring would
  // write zero sizes into the live design.
  var copy = clone(d);
  container.querySelectorAll('.pb-thumb-frame').forEach(function (frame, i) {
    var built = renderSlide(copy, i, 'export');
    var holder = document.createElement('span');
    holder.className = 'pb-thumb-scale';
    holder.style.transform = 'scale(' + scale + ')';
    holder.appendChild(built.root);
    frame.appendChild(holder);
    layoutSlide(built.board, copy.slides[i]);
  });

  container.onclick = function (e) {
    var btn = e.target.closest('[data-slide-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-slide-act');
    if (act === 'add') { ctx.addSlide(); return; }
    var i = +btn.closest('[data-index]').getAttribute('data-index');
    switch (act) {
      case 'go': ctx.setSlide(i); if (ctx.isPhone()) ctx.closeSheet(); break;
      case 'up': ctx.moveSlide(i, -1); break;
      case 'down': ctx.moveSlide(i, 1); break;
      case 'duplicate': ctx.duplicateSlide(i); break;
      case 'delete':
        if (window.confirm('Delete slide ' + (i + 1) + '?')) ctx.removeSlide(i);
        break;
    }
  };
}
