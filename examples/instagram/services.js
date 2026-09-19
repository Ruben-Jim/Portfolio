/**
 * Services kit — "What $499 vs $1,500 vs $3,500 gets you".
 * One package per slide on real device mockups (captures/), styled like the
 * project posts. English or Spanish (?lang=es); ?export=<board id> shows one board.
 */
(function () {
  'use strict';

  var LOGO = '../../assets/images/logo/logo.jpg';
  var BADGE_APP = 'badges/app-store.svg';
  var BADGE_PLAY = 'badges/google-play.png';
  var SITE = 'rubenjimenez.dev';
  var DM_KEYWORD = 'APP';

  // 24×24 stroke icons (Lucide-style paths).
  var ICONS = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };

  // Each tier: price, which capture to show, and copy per language.
  var TIERS = [
    {
      key: 't499', price: '$499', capture: 'barbershop', layout: 'phone',
      en: {
        name: 'Starter Page', time: '~1 week', short: 'Website',
        title: 'A website you update <em>from your phone</em>',
        checks: ['1-page website', 'Edit it yourself', 'Quotes + inbox', 'Reviews + English/Spanish'],
        chips: [['edit', 'Hours updated'], ['chat', 'New quote request']],
        fit: 'I need people to find me'
      },
      es: {
        name: 'Página Starter', time: '~1 semana', short: 'Sitio web',
        title: 'Un sitio web que cambias <em>desde tu teléfono</em>',
        checks: ['Sitio de 1 página', 'Lo editas tú mismo', 'Cotizaciones + bandeja', 'Reseñas + inglés/español'],
        chips: [['edit', 'Horario actualizado'], ['chat', 'Nueva cotización']],
        fit: 'Necesito que me encuentren'
      }
    },
    {
      key: 't1500', price: '$1,500', capture: 'rizo', layout: 'laptop',
      en: {
        name: 'Starter Presence', time: '~2–3 weeks', short: 'Website + app',
        title: 'Your website + <em>your own app</em>',
        checks: ['Everything in $499', '1–3 pages + SEO', 'iOS + Android app', 'Alerts on every inquiry'],
        chips: [['bell', 'New inquiry']],
        fit: 'I want my own app'
      },
      es: {
        name: 'Presencia Inicial', time: '~2–3 semanas', short: 'Sitio + app',
        title: 'Tu sitio web + <em>tu propia app</em>',
        checks: ['Todo lo de $499', '1–3 páginas + SEO', 'App iOS + Android', 'Alertas de cada consulta'],
        chips: [['bell', 'Nueva consulta']],
        fit: 'Quiero mi propia app'
      }
    },
    {
      key: 't3500', price: '$3,500', capture: 'tradeservice', layout: 'laptop', popular: true,
      en: {
        name: 'Growth Platform', time: '3–4 weeks', short: 'Full platform',
        title: 'Run the whole business <em>from your phone</em>',
        checks: ['Everything in $1,500', 'Booking calendar + jobs', 'Stripe + Tap to Pay', 'Crew hours + photos'],
        chips: [['calendar', 'New booking · Sat 10 AM'], ['card', 'Deposit received · $50'], ['team', 'Job assigned · Crew 2']],
        fit: 'I take bookings + payments daily'
      },
      es: {
        name: 'Plataforma de Crecimiento', time: '3–4 semanas', short: 'Plataforma completa',
        title: 'Administra todo tu negocio <em>desde tu teléfono</em>',
        checks: ['Todo lo de $1,500', 'Agenda + trabajos', 'Stripe + Tap to Pay', 'Horas + fotos del equipo'],
        chips: [['calendar', 'Nueva reserva · sáb 10 AM'], ['card', 'Depósito recibido · $50'], ['team', 'Trabajo asignado · Equipo 2']],
        fit: 'Recibo reservas y pagos a diario'
      }
    }
  ];

  var COPY = {
    en: {
      brandSub: 'Web &amp; Mobile Dev Studio',
      swipe: 'Swipe',
      popular: 'Most popular',
      care: '1st month of care included',
      cover: {
        title: 'What <em>$499</em>, <em>$1,500</em> + <em>$3,500</em> actually get you',
        sub: 'Websites + apps for any business, team or creator'
      },
      compare: {
        kicker: 'Which one is you?',
        title: 'Pick by how <em>you work</em>',
        note: 'Bigger team or fully custom? Builds from $6k.'
      },
      cta: {
        title: 'Not sure which one <em>fits?</em>',
        dm: 'DM me <b>“' + DM_KEYWORD + '”</b>',
        reply: 'Reply <b>“' + DM_KEYWORD + '”</b>',
        sub: 'I’ll point you to the right package.',
        start: 'Start a project',
        note: 'Every package includes your 1st month of care.'
      }
    },
    es: {
      brandSub: 'Estudio de desarrollo web y móvil',
      swipe: 'Desliza',
      popular: 'Más popular',
      care: '1er mes de mantenimiento incluido',
      cover: {
        title: 'Lo que realmente recibes por <em>$499</em>, <em>$1,500</em> y <em>$3,500</em>',
        sub: 'Sitios web + apps para cualquier negocio, equipo o creador'
      },
      compare: {
        kicker: '¿Cuál eres tú?',
        title: 'Elige según <em>cómo trabajas</em>',
        note: '¿Equipo grande o algo a la medida? Desde $6k.'
      },
      cta: {
        title: '¿No sabes cuál <em>te conviene?</em>',
        dm: 'Mándame <b>“' + DM_KEYWORD + '”</b>',
        reply: 'Responde <b>“' + DM_KEYWORD + '”</b>',
        sub: 'Te digo qué paquete te conviene.',
        start: 'Iniciar un proyecto',
        note: 'Cada paquete incluye tu 1er mes de mantenimiento.'
      }
    }
  };

  var params = new URLSearchParams(location.search);
  var lang = params.get('lang') === 'es' ? 'es' : 'en';
  var exportId = params.get('export') || '';
  var t = COPY[lang];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function capture(id, kind) {
    return 'captures/' + id + '/' + kind + '.png';
  }

  function top(n, total) {
    return '<header class="pk-top">' +
      '<div class="brand">' +
        '<img src="' + LOGO + '" alt="" />' +
        '<div><div class="wordmark">CodeWith<span>Ruben</span></div>' +
        '<span class="brand-sub">' + t.brandSub + '</span></div>' +
      '</div>' +
      (n ? '<span class="pk-count">' + n + '/' + total + '</span>' : '') +
    '</header>';
  }

  function stores() {
    return '<div class="stores">' +
      '<img src="' + BADGE_APP + '" alt="Download on the App Store" />' +
      '<img class="play" src="' + BADGE_PLAY + '" alt="Get it on Google Play" />' +
    '</div>';
  }

  function swipe() {
    return '<span class="pk-swipe">' + t.swipe + ' ' + icon('arrow') + '</span>';
  }

  function phone(id, cls) {
    return '<div class="pk-phone pk-phone--' + id + (cls ? ' ' + cls : '') + '"><img src="' + capture(id, 'phone') + '" alt="" /></div>';
  }

  function chips(list) {
    return list.map(function (c, i) {
      return '<span class="pk-chip pk-chip--' + i + '" data-icon="' + c[0] + '"><i>' + icon(c[0]) + '</i>' + esc(c[1]) + '</span>';
    }).join('');
  }

  // Laptop + phone, same markup as the project posts.
  function laptopStage(id) {
    return '<div class="stage">' +
      '<div class="laptop"><div class="laptop-lid">' +
        '<div class="laptop-bar" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<img class="laptop-screen" src="' + capture(id, 'laptop') + '" alt="" />' +
      '</div><div class="laptop-base"></div></div>' +
      '<div class="phone"><img src="' + capture(id, 'phone') + '" alt="" /></div>' +
    '</div>';
  }

  // Three phones rising left to right, one per tier.
  function staircase(withTags) {
    return '<div class="pk-stairs">' + TIERS.map(function (tier, i) {
      var c = tier[lang];
      return '<div class="pk-step pk-step--' + i + '">' +
        (withTags ? '<div class="pk-tag"><b>' + tier.price + '</b><span>' + esc(c.short) + '</span></div>' : '') +
        phone(tier.capture) +
      '</div>';
    }).join('') + '</div>';
  }

  function tierBoard(tier, n, total, foot) {
    var c = tier[lang];
    var stage = tier.layout === 'phone'
      ? '<div class="pk-solo">' + phone(tier.capture) + '</div>'
      : laptopStage(tier.capture);
    return top(n, total) +
      '<div class="pk-pill">' + esc(c.name) + ' · ' + esc(c.time) +
        (tier.popular ? '<em>' + esc(t.popular) + '</em>' : '') + '</div>' +
      '<div class="pk-price">' + tier.price + '</div>' +
      '<h2 class="pk-title">' + c.title + '</h2>' +
      '<div class="pk-stage pk-stage--' + tier.key + '">' + stage + chips(c.chips) + '</div>' +
      '<ul class="pk-checks">' + c.checks.map(function (x) {
        return '<li>' + icon('check') + esc(x) + '</li>';
      }).join('') + '</ul>' +
      foot;
  }

  function feedFoot(tier) {
    var start = tier.key === 't1500' ? stores() : '<span class="pk-muted">' + esc(t.care) + '</span>';
    return '<footer class="pk-foot">' + start + swipe() + '</footer>';
  }

  function storyFoot(last) {
    return '<footer class="pk-foot">' +
      '<span class="pk-reply">' + icon('chat') + t.cta.reply + '</span>' +
      (last ? '<span class="pk-muted">' + SITE + '</span>' : swipe()) +
    '</footer>';
  }

  function coverBoard(n, total) {
    return top(n, total) +
      '<h2 class="pk-title pk-title--cover">' + t.cover.title + '</h2>' +
      '<p class="pk-sub">' + esc(t.cover.sub) + '</p>' +
      staircase(true) +
      (n ? '<footer class="pk-foot"><span class="pk-muted">' + esc(t.care) + '</span>' + swipe() + '</footer>' : '');
  }

  function compareBoard(n, total) {
    return top(n, total) +
      '<span class="pk-kicker">' + esc(t.compare.kicker) + '</span>' +
      '<h2 class="pk-title">' + t.compare.title + '</h2>' +
      '<ol class="pk-rows">' + TIERS.map(function (tier) {
        var c = tier[lang];
        return '<li>' + phone(tier.capture, 'pk-phone--mini') +
          '<div class="pk-row-text"><b>“' + esc(c.fit) + '”</b><span>' + esc(c.name) +
            (tier.popular ? '<em>' + esc(t.popular) + '</em>' : '') + '</span></div>' +
          '<strong>' + tier.price + '</strong></li>';
      }).join('') + '</ol>' +
      '<footer class="pk-foot"><span class="pk-muted">' + esc(t.compare.note) + '</span>' + swipe() + '</footer>';
  }

  function ctaBoard(n, total) {
    return top(n, total) +
      '<h2 class="pk-title">' + t.cta.title + '</h2>' +
      '<div class="pk-dm">' + t.cta.dm + '</div>' +
      '<p class="pk-sub">' + esc(t.cta.sub) + '</p>' +
      '<div class="pk-start"><span class="cta">' + esc(t.cta.start) + ' →</span><span class="pk-muted">' + SITE + '</span></div>' +
      '<div class="pk-start pk-start--meta">' + stores() + '<span class="pk-muted">' + esc(t.cta.note) + '</span></div>' +
      '<div class="pk-rise">' + staircase(false) + '</div>';
  }

  var boards = [
    { id: 'post-1-cover', kind: 'feed', label: 'Carousel 1/6 · Cover', html: coverBoard(1, 6) },
    { id: 'post-2-499', kind: 'feed', label: 'Carousel 2/6 · $499', html: tierBoard(TIERS[0], 2, 6, feedFoot(TIERS[0])) },
    { id: 'post-3-1500', kind: 'feed', label: 'Carousel 3/6 · $1,500', html: tierBoard(TIERS[1], 3, 6, feedFoot(TIERS[1])) },
    { id: 'post-4-3500', kind: 'feed', label: 'Carousel 4/6 · $3,500', html: tierBoard(TIERS[2], 4, 6, feedFoot(TIERS[2])) },
    { id: 'post-5-compare', kind: 'feed', label: 'Carousel 5/6 · Which one is you?', html: compareBoard(5, 6) },
    { id: 'post-6-cta', kind: 'feed', label: 'Carousel 6/6 · Call to action', html: ctaBoard(6, 6) },
    { id: 'story-cover', kind: 'story', label: 'Story / reel cover', html: coverBoard() },
    { id: 'story-1-499', kind: 'story', label: 'Story 1/3 · $499', html: tierBoard(TIERS[0], 1, 3, storyFoot()) },
    { id: 'story-2-1500', kind: 'story', label: 'Story 2/3 · $1,500', html: tierBoard(TIERS[1], 2, 3, storyFoot()) },
    { id: 'story-3-3500', kind: 'story', label: 'Story 3/3 · $3,500', html: tierBoard(TIERS[2], 3, 3, storyFoot(true)) }
  ];

  document.documentElement.lang = lang;

  document.getElementById('kit').innerHTML = boards.map(function (b) {
    var current = b.id === exportId ? ' is-current' : '';
    return '<p class="board-label">' + esc(b.label) + ' · <code>' + b.id + '</code></p>' +
      '<article class="artboard artboard--' + b.kind + ' pk pk--' + b.id + current + '" id="' + b.id + '">' +
        '<div class="pk-inner">' + b.html + '</div>' +
      '</article>';
  }).join('');
})();
