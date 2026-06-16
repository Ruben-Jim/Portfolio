/* CodeWithRuben — Bilingual i18n (English / Spanish)
   Covers: Home, About, Portfolio, Services & Pricing, Contact
   Admin page is intentionally excluded.
*/
(function () {
  'use strict';

  var CWR_I18N = {
    en: {
      /* ── Navbar ─────────────────────────────────────────── */
      'nav.home':             'Home',
      'nav.about':            'About',
      'nav.portfolio':        'Portfolio',
      'nav.services_pricing': 'Services &amp; Pricing',
      'nav.contact':          'Contact',
      'nav.get_started':      'Get started',
      'nav.toggle_aria':      'Switch language',

      /* ── Home ───────────────────────────────────────────── */
      'home.brand_sub':       'Web &amp; Mobile Dev Studio',
      'home.hero_title':      'Run your business<br>from your phone',
      'home.price_line':      'Packages from <strong>$1,500</strong> · Maintenance starting as low as <strong>$44/mo</strong>',
      'home.proof_line':      '<span class="cwr-landing-proof-accent">Fresno-based studio</span> · Web + iOS + Android · Real-time admin dashboards <span class="cwr-landing-stars" aria-hidden="true">★★★★★</span>',
      'home.cta_start':       'Get started',
      'home.cta_pricing':     'See pricing',
      'home.cta_work':        'View work',
      'home.demo_badge':      '<ion-icon name="play-circle-outline"></ion-icon> Live demos',
      'home.demo_kicker':     'Demo reel',
      'home.demo_title':      'See what we ship for local businesses',
      'home.demo_lead':       'Custom websites, booking flows, admin dashboards, and mobile apps — built for how service businesses actually run day to day.',
      'home.demo_link_full':  'Full portfolio',
      'home.process_kicker':  'Process',
      'home.process_title':   'How it works',
      'home.process_lead':    'From first message to launch — clear milestones, no surprises.',
      'home.step1_title':     'Share your idea',
      'home.step1_desc':      'Tell us your goals, timeline, and what tools you want to replace.',
      'home.step2_title':     'Discovery call',
      'home.step2_desc':      'Quick call to align on scope, users, and the right stack.',
      'home.step3_title':     'Build &amp; review',
      'home.step3_desc':      'We design, develop, and QA with check-ins so you see progress early.',
      'home.step4_title':     'Launch &amp; support',
      'home.step4_desc':      'Ship to web and app stores with docs, training, and 1 month of maintenance.',
      'home.proof_kicker':    'Social proof',
      'home.proof_title':     'Trusted by local businesses',
      'home.testimonials_kicker': 'Testimonials',
      'home.testimonials_title':  'What clients say',
      'home.testimonials_link':   'Read more on About',
      'home.cta_title':       'Ready to run your business from your phone?',
      'home.cta_lead':        'Packages from <strong>$1,500</strong> · Maintenance starting as low as <strong>$44/mo</strong> · Fresno-based studio',

      /* ── About ──────────────────────────────────────────── */
      'about.title':          'About',
      'about.intro':          '<span class="highlight-primary">CodeWithRuben</span> is a <span class="highlight-secondary">Fresno-based dev studio</span> — we design, build, and ship <span class="highlight-accent">web and mobile apps</span> for local service businesses. Real software, not templates.',
      'about.link_work':      'Work',
      'about.link_services':  'Services',
      'about.link_start':     'Start a project',
      'about.founder_role':   'Founder &amp; Developer',
      'about.founder_bio':    'Self-taught developer based in Fresno, CA. I started CWR because local businesses deserve software built for how they actually operate — not generic tools that barely fit. I handle every project personally from first call to launch.',
      'about.stat_builds':    'Paid builds',
      'about.stat_live':      'Live on iOS &amp; Android',
      'about.stat_location':  'Central Valley, CA',
      'about.stat_founded':   'Founded',
      'about.why_title':      'Why CWR',
      'about.why1_title':     'Local, not outsourced',
      'about.why1_desc':      'You talk directly to the person writing your code — not a project manager relaying messages to an overseas team. Fresno-based means fast responses and real accountability.',
      'about.why2_title':     'Real apps in production',
      'about.why2_desc':      'ProCleaning Seattle is live on the App Store — full booking system, Stripe payments, worker management. That\'s the standard we build to for every client.',
      'about.why3_title':     'Built for your operations',
      'about.why3_desc':      'Every build includes a custom admin dashboard so you control bookings, messages, and content without calling a developer. Your business, your software.',
      'about.testimonials_title': 'What Clients Say',
      'about.testimonial_roberto': 'Ruben was hired to create an ordering ecosystem featuring dual interfaces for customers and kitchen staff. Customers enjoy a seamless experience with real-time order tracking and menu browsing, while the Cook Dashboard empowers staff to manage orders from Pending to Completed in real time.',
      'about.cta_title':      'Ready to build something real?',
      'about.cta_lead':       'Packages from <strong>$1,500</strong> · Web + iOS + Android · Fresno-based studio',
      'about.cta_btn':        'Start a project',

      /* ── Portfolio ──────────────────────────────────────── */
      'portfolio.title':       'Portfolio',
      'portfolio.industry':    'Industry',
      'portfolio.filter_all':  'All',
      'portfolio.loading':     'Loading projects\u2026',

      /* ── Services & Pricing ─────────────────────────────── */
      'services.title':        'Services &amp; Pricing',
      'services.intro':        'Fixed packages for service businesses — booking, crews, payments, and admin in one place. Every build includes 1 month of maintenance. Add proven modules \u00e0 la carte, or go all-in with a Studio Build — the same platform we use for live field-service businesses today.',

      'services.starter_title': 'Starter Presence',
      'services.starter_sub':   '1\u20133 page site or starter storefront for businesses that need to look professional and start taking inquiries fast.',
      'services.starter_note':  'Fixed package \u00b7 ~2 weeks \u00b7 Maintenance included \u00b7 1 month only',
      'services.starter_f1':    'Branded pages customers can browse on any device',
      'services.starter_f2':    'Quote request + booking request forms',
      'services.starter_f3':    'Work gallery with customer reviews and testimonials',
      'services.starter_f4':    'Live chat so customers can message you directly',
      'services.starter_f5':    'Bilingual customer-facing pages (English + one language)',
      'services.starter_f6':    'Calendar feed for appointments (Google, Apple, Outlook)',
      'services.starter_f7':    'Multiple service addresses per customer',
      'services.starter_f8':    'Basic SEO + analytics so you know who visits',
      'services.starter_f9':    'Launch + hosting setup support',
      'services.starter_cta':   'Start at $1,500',

      'services.growth_badge':  'Most Popular',
      'services.growth_title':  'Growth Platform',
      'services.growth_sub':    'Up to 5 pages plus a backend so leads and bookings land in one admin — not scattered texts and DMs.',
      'services.growth_note':   'Fixed package \u00b7 3\u20134 weeks \u00b7 Maintenance included \u00b7 1 month only',
      'services.growth_f1':     'Everything in Starter + up to 5 pages',
      'services.growth_f2':     'Online quote capture with customer details saved',
      'services.growth_f3':     'Booking requests routed to your admin dashboard',
      'services.growth_f4':     'Card payments at checkout (Stripe)',
      'services.growth_f5':     'Tip collection at checkout',
      'services.growth_f6':     'PDF estimates &amp; invoices emailed to customers',
      'services.growth_f7':     'Crew assignment, scheduling, and hours per job',
      'services.growth_f8':     'Before/after portfolio \u2014 crew submits photos, you approve, published to your site',
      'services.growth_f9':     'Recurring subscription billing (weekly, monthly, custom)',
      'services.growth_f10':    'Login for you to review leads and update content',
      'services.growth_f11':    'Automated notifications when someone inquires',
      'services.growth_cta':    'Choose $3,500 Package',

      'services.biz_badge':     'Field Ops',
      'services.biz_title':     'Business Platform',
      'services.biz_sub':       'Web + mobile app for crews in the field — take payments, assign jobs, and run day-to-day ops from one dashboard.',
      'services.biz_inv_label': 'Investment',
      'services.biz_inv_note':  'Scoped after discovery \u00b7 1 month maintenance included',
      'services.biz_f1':        'Web + iOS + Android \u2014 one app your customers and crew share',
      'services.biz_f2':        'Staff login with role-based access (owner vs. worker)',
      'services.biz_f3':        'Card payments at checkout (Stripe)',
      'services.biz_f4':        'Job scheduling, assignments, and order history',
      'services.biz_f5':        'Admin dashboard for quotes, bookings, and customers',
      'services.biz_cta':       'Book Discovery Call',

      'services.studio_badge':  'Enterprise',
      'services.studio_title':  'Studio Build',
      'services.studio_sub':    'Full field-service operations platform — the tier we use for live production apps with crews, billing, and back-office automation.',
      'services.studio_inv_note': 'Custom scope \u00b7 Timeline after discovery \u00b7 1 month maintenance included',
      'services.studio_f1':     'Field team management \u2014 assign crews, clock in/out, hours per job',
      'services.studio_f2':     'Quote \u2192 estimate \u2192 booked job \u2192 invoice pipeline',
      'services.studio_f3':     'PDF estimates &amp; invoices emailed to customers',
      'services.studio_f4':     'Recurring subscription billing (weekly, monthly, custom schedules)',
      'services.studio_f5':     'Live chat + admin inbox with full conversation history',
      'services.studio_f6':     'Before/after portfolio with crew submit + owner approval',
      'services.studio_f7':     'Multi-location customers, tax regions, tips, promo codes, iCal feeds',
      'services.studio_cta':    'Start Discovery',

      'services.maint_title':   'Maintenance Plans',
      'services.maint_lead':    'After your first included month: pay monthly, or choose annual billing and <strong>save 45%</strong> compared to paying month-to-month.',
      'services.std_title':     'Standard Care',
      'services.std_sub':       'Ongoing support for hosting, updates, monitoring, and minor fixes across web and mobile (iOS &amp; Android) after your first included month.',
      'services.monthly_label': 'Monthly',
      'services.std_mo_note':   '72-hour response \u00b7 1 maintenance window/month',
      'services.std_ann_label': 'Annual <span class="maintenance-save-badge">Save 45%</span>',
      'services.std_ann_note':  'Same as ~$44/mo \u00b7 billed once per year',
      'services.std_f1':        'Response within 72 business hours',
      'services.std_f2':        '1 maintenance window per month',
      'services.std_f3':        'Hosting, updates, monitoring, minor fixes',
      'services.std_f4':        'Web + iOS + Android support',

      'services.pri_title':     'Priority Care',
      'services.pri_sub':       'Same coverage as Standard Care with faster response times and more frequent maintenance windows across web and mobile (iOS &amp; Android).',
      'services.pri_mo_note':   '24-hour response \u00b7 2 maintenance windows/month',
      'services.pri_ann_label': 'Annual <span class="maintenance-save-badge">Save 45%</span>',
      'services.pri_ann_note':  'Same as ~$83/mo \u00b7 billed once per year',
      'services.pri_f1':        'Response within 24 business hours',
      'services.pri_f2':        '2 maintenance windows per month',
      'services.pri_f3':        'Hosting, updates, monitoring, minor fixes',
      'services.pri_f4':        'Web + iOS + Android support',
      'services.maint_cta':     'Discuss Plan',

      'services.buyout_h3':     'Ownership Upgrade (Buyout)',
      'services.buyout_badge':  'Optional',
      'services.buyout_title':  'Ownership Upgrade (Buyout Option)',
      'services.buyout_sub':    'Want to fully own what we build? This one-time upgrade transfers everything \u2014 all files, code, and accounts \u2014 directly to you or your team.',
      'services.buyout_note':   'One-time fee \u00b7 Scope-based \u00b7 Separate from fixed tiers',
      'services.buyout_f1':     'Full ownership of everything we built \u2014 yours to keep',
      'services.buyout_f2':     'All files and code delivered to your team or developer',
      'services.buyout_f3':     'Accounts, logins, and documentation handed over to you',
      'services.buyout_cta':    'Discuss Ownership Transfer',
      'services.note':          '<strong>Note:</strong> Final scope is confirmed after a discovery call; package pricing above includes maintenance for the first month only. Code ownership remains with the studio until an Ownership Upgrade is completed.',

      /* ── Onboarding banners ─────────────────────────────── */
      'cookie.title':   'We use analytics cookies',
      'cookie.desc':    'Google Analytics helps us understand how visitors use this site. No personal data is sold or shared with advertisers.',
      'cookie.decline': 'Decline',
      'cookie.accept':  'Accept',

      /* ── Contact ────────────────────────────────────────── */
      'contact.title':          'Contact',
      'contact.form_title':     'Contact Form',
      'contact.ph_name':        'Full name',
      'contact.ph_email':       'Email address',
      'contact.ph_message':     'Your Message',
      'contact.send_btn':       'Send Message',
      'contact.success_title':  'Message received',
      'contact.success_text':   'Your message is saved \u2014 we typically reply within 24\u201372 hours. Open your private thread to keep the conversation going.',
      'contact.success_btn':    'Open your conversation',
    },

    es: {
      /* ── Navbar ─────────────────────────────────────────── */
      'nav.home':             'Inicio',
      'nav.about':            'Nosotros',
      'nav.portfolio':        'Portafolio',
      'nav.services_pricing': 'Servicios y Precios',
      'nav.contact':          'Contacto',
      'nav.get_started':      'Comenzar',
      'nav.toggle_aria':      'Cambiar idioma',

      /* ── Home ───────────────────────────────────────────── */
      'home.brand_sub':       'Estudio de Desarrollo Web y M\u00f3vil',
      'home.hero_title':      'Administra tu negocio<br>desde tu tel\u00e9fono',
      'home.price_line':      'Paquetes desde <strong>$1,500</strong> \u00b7 Mantenimiento desde <strong>$44/mes</strong>',
      'home.proof_line':      '<span class="cwr-landing-proof-accent">Estudio en Fresno</span> \u00b7 Web + iOS + Android \u00b7 Paneles en tiempo real <span class="cwr-landing-stars" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span>',
      'home.cta_start':       'Comenzar',
      'home.cta_pricing':     'Ver precios',
      'home.cta_work':        'Ver trabajos',
      'home.demo_badge':      '<ion-icon name="play-circle-outline"></ion-icon> Demos en vivo',
      'home.demo_kicker':     'Demo',
      'home.demo_title':      'Mira lo que construimos para negocios locales',
      'home.demo_lead':       'Sitios web personalizados, flujos de reservas, paneles de administraci\u00f3n y apps m\u00f3viles \u2014 construidos para c\u00f3mo los negocios de servicios operan d\u00eda a d\u00eda.',
      'home.demo_link_full':  'Portafolio completo',
      'home.process_kicker':  'Proceso',
      'home.process_title':   'C\u00f3mo funciona',
      'home.process_lead':    'Del primer mensaje al lanzamiento \u2014 pasos claros, sin sorpresas.',
      'home.step1_title':     'Comparte tu idea',
      'home.step1_desc':      'Cu\u00e9ntanos tus metas, tiempos y qu\u00e9 herramientas quieres reemplazar.',
      'home.step2_title':     'Llamada de descubrimiento',
      'home.step2_desc':      'Llamada r\u00e1pida para alinear el alcance, usuarios y tecnolog\u00eda.',
      'home.step3_title':     'Construir y revisar',
      'home.step3_desc':      'Dise\u00f1amos, desarrollamos y hacemos pruebas con seguimientos para que veas el progreso.',
      'home.step4_title':     'Lanzamiento y soporte',
      'home.step4_desc':      'Publicamos en web y tiendas de apps con documentaci\u00f3n, capacitaci\u00f3n y 1 mes de mantenimiento.',
      'home.proof_kicker':    'Clientes satisfechos',
      'home.proof_title':     'La confianza de negocios locales',
      'home.testimonials_kicker': 'Testimonios',
      'home.testimonials_title':  'Lo que dicen los clientes',
      'home.testimonials_link':   'Leer m\u00e1s en Nosotros',
      'home.cta_title':       '\u00bfListo para administrar tu negocio desde tu tel\u00e9fono?',
      'home.cta_lead':        'Paquetes desde <strong>$1,500</strong> \u00b7 Mantenimiento desde <strong>$44/mes</strong> \u00b7 Estudio en Fresno',

      /* ── About ──────────────────────────────────────────── */
      'about.title':          'Nosotros',
      'about.intro':          '<span class="highlight-primary">CodeWithRuben</span> es un <span class="highlight-secondary">estudio en Fresno</span> \u2014 dise\u00f1amos, construimos y publicamos <span class="highlight-accent">apps web y m\u00f3viles</span> para negocios locales de servicios. Software real, no plantillas.',
      'about.link_work':      'Trabajo',
      'about.link_services':  'Servicios',
      'about.link_start':     'Iniciar un proyecto',
      'about.founder_role':   'Fundador y Desarrollador',
      'about.founder_bio':    'Desarrollador autodidacta en Fresno, CA. Empec\u00e9 CWR porque los negocios locales merecen software hecho para c\u00f3mo operan de verdad \u2014 no herramientas gen\u00e9ricas que apenas encajan. Manejo cada proyecto personalmente, de la primera llamada al lanzamiento.',
      'about.stat_builds':    'Proyectos pagados',
      'about.stat_live':      'En vivo en iOS y Android',
      'about.stat_location':  'Valle Central, CA',
      'about.stat_founded':   'Fundado',
      'about.why_title':      'Por qu\u00e9 CWR',
      'about.why1_title':     'Local, no subcontratado',
      'about.why1_desc':      'Hablas directamente con la persona que escribe tu c\u00f3digo \u2014 no con un gerente de proyectos que transmite mensajes a un equipo en el extranjero. Con base en Fresno significa respuestas r\u00e1pidas y responsabilidad real.',
      'about.why2_title':     'Apps reales en producci\u00f3n',
      'about.why2_desc':      'ProCleaning Seattle est\u00e1 en el App Store \u2014 sistema completo de reservas, pagos con Stripe, gesti\u00f3n de empleados. Ese es el est\u00e1ndar con el que construimos para cada cliente.',
      'about.why3_title':     'Construido para tu negocio',
      'about.why3_desc':      'Cada proyecto incluye un panel de administraci\u00f3n personalizado para que controles reservas, mensajes y contenido sin llamar a un desarrollador. Tu negocio, tu software.',
      'about.testimonials_title': 'Lo que dicen los clientes',
      'about.testimonial_roberto': 'Ruben fue contratado para crear un ecosistema de pedidos con interfaces duales para clientes y personal de cocina. Los clientes disfrutan una experiencia fluida con seguimiento de pedidos en tiempo real, mientras el Panel de Cocina permite al personal gestionar pedidos de Pendiente a Completado en tiempo real.',
      'about.cta_title':      '\u00bfListo para construir algo real?',
      'about.cta_lead':       'Paquetes desde <strong>$1,500</strong> \u00b7 Web + iOS + Android \u00b7 Estudio en Fresno',
      'about.cta_btn':        'Iniciar un proyecto',

      /* ── Portfolio ──────────────────────────────────────── */
      'portfolio.title':      'Portafolio',
      'portfolio.industry':   'Industria',
      'portfolio.filter_all': 'Todos',
      'portfolio.loading':    'Cargando proyectos\u2026',

      /* ── Services & Pricing ─────────────────────────────── */
      'services.title':       'Servicios y Precios',
      'services.intro':       'Paquetes fijos para negocios de servicios \u2014 reservas, equipos, pagos y administraci\u00f3n en un solo lugar. Cada proyecto incluye 1 mes de mantenimiento. Agrega m\u00f3dulos probados \u00e0 la carte, o apuesta por un Studio Build \u2014 la misma plataforma que usamos para negocios en operaci\u00f3n hoy.',

      'services.starter_title': 'Presencia Inicial',
      'services.starter_sub':   'Sitio de 1 a 3 p\u00e1ginas para negocios que necesitan verse profesionales y recibir consultas r\u00e1pido.',
      'services.starter_note':  'Paquete fijo \u00b7 ~2 semanas \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.starter_f1':    'P\u00e1ginas con tu marca que los clientes pueden ver en cualquier dispositivo',
      'services.starter_f2':    'Formularios de cotizaci\u00f3n y reserva',
      'services.starter_f3':    'Galer\u00eda de trabajos con rese\u00f1as y testimonios',
      'services.starter_f4':    'Chat en vivo para que los clientes te escriban directamente',
      'services.starter_f5':    'P\u00e1ginas biling\u00fces para clientes (ingl\u00e9s + un idioma)',
      'services.starter_f6':    'Calendario de citas (Google, Apple, Outlook)',
      'services.starter_f7':    'M\u00faltiples direcciones de servicio por cliente',
      'services.starter_f8':    'SEO b\u00e1sico + anal\u00edticas para saber qui\u00e9n visita',
      'services.starter_f9':    'Soporte de lanzamiento y configuraci\u00f3n de hospedaje',
      'services.starter_cta':   'Comenzar desde $1,500',

      'services.growth_badge':  'M\u00e1s Popular',
      'services.growth_title':  'Plataforma de Crecimiento',
      'services.growth_sub':    'Hasta 5 p\u00e1ginas m\u00e1s un backend para que leads y reservas lleguen a un solo panel \u2014 no en mensajes dispersos.',
      'services.growth_note':   'Paquete fijo \u00b7 3\u20134 semanas \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.growth_f1':     'Todo en Presencia Inicial + hasta 5 p\u00e1ginas',
      'services.growth_f2':     'Captura de cotizaciones en l\u00ednea con datos del cliente guardados',
      'services.growth_f3':     'Solicitudes de reserva enviadas a tu panel de administraci\u00f3n',
      'services.growth_f4':     'Pagos con tarjeta al finalizar (Stripe)',
      'services.growth_f5':     'Recolecci\u00f3n de propinas al finalizar',
      'services.growth_f6':     'Cotizaciones y facturas en PDF enviadas por correo',
      'services.growth_f7':     'Asignaci\u00f3n de equipo, horarios y horas por trabajo',
      'services.growth_f8':     'Portafolio antes/despu\u00e9s \u2014 el equipo sube fotos, t\u00fa apruebas, se publica en tu sitio',
      'services.growth_f9':     'Facturaci\u00f3n de suscripci\u00f3n recurrente (semanal, mensual, personalizada)',
      'services.growth_f10':    'Acceso para revisar leads y actualizar contenido',
      'services.growth_f11':    'Notificaciones autom\u00e1ticas cuando alguien consulta',
      'services.growth_cta':    'Elegir paquete de $3,500',

      'services.biz_badge':     'Operaciones de Campo',
      'services.biz_title':     'Plataforma Empresarial',
      'services.biz_sub':       'App web + m\u00f3vil para equipos en campo \u2014 acepta pagos, asigna trabajos y gestiona operaciones diarias desde un panel.',
      'services.biz_inv_label': 'Inversi\u00f3n',
      'services.biz_inv_note':  'Definido tras descubrimiento \u00b7 1 mes de mantenimiento incluido',
      'services.biz_f1':        'Web + iOS + Android \u2014 una app para clientes y equipo',
      'services.biz_f2':        'Acceso del personal con roles (propietario vs. trabajador)',
      'services.biz_f3':        'Pagos con tarjeta al finalizar (Stripe)',
      'services.biz_f4':        'Programaci\u00f3n de trabajos, asignaciones e historial',
      'services.biz_f5':        'Panel de administraci\u00f3n para cotizaciones, reservas y clientes',
      'services.biz_cta':       'Agendar Llamada de Descubrimiento',

      'services.studio_badge':  'Empresarial',
      'services.studio_title':  'Studio Build',
      'services.studio_sub':    'Plataforma completa de operaciones de campo \u2014 el nivel que usamos para apps en producci\u00f3n con equipos, facturaci\u00f3n y automatizaci\u00f3n back-office.',
      'services.studio_inv_note': 'Alcance personalizado \u00b7 Tiempo tras descubrimiento \u00b7 1 mes de mantenimiento incluido',
      'services.studio_f1':     'Gesti\u00f3n de equipos \u2014 asignar equipos, entrada/salida, horas por trabajo',
      'services.studio_f2':     'Cotizaci\u00f3n \u2192 presupuesto \u2192 trabajo reservado \u2192 factura',
      'services.studio_f3':     'Cotizaciones y facturas en PDF enviadas por correo',
      'services.studio_f4':     'Facturaci\u00f3n recurrente (semanal, mensual, horarios personalizados)',
      'services.studio_f5':     'Chat en vivo + bandeja de administraci\u00f3n con historial completo',
      'services.studio_f6':     'Portafolio antes/despu\u00e9s con env\u00edo del equipo + aprobaci\u00f3n del propietario',
      'services.studio_f7':     'Clientes en m\u00faltiples ubicaciones, regiones fiscales, propinas, c\u00f3digos promo, feeds iCal',
      'services.studio_cta':    'Iniciar Descubrimiento',

      'services.maint_title':   'Planes de Mantenimiento',
      'services.maint_lead':    'Despu\u00e9s de tu primer mes incluido: paga mensual, o elige facturaci\u00f3n anual y <strong>ahorra 45%</strong> comparado con el pago mensual.',
      'services.std_title':     'Cuidado Est\u00e1ndar',
      'services.std_sub':       'Soporte continuo para hospedaje, actualizaciones, monitoreo y correcciones menores en web y m\u00f3vil (iOS y Android) despu\u00e9s de tu primer mes incluido.',
      'services.monthly_label': 'Mensual',
      'services.std_mo_note':   'Respuesta en 72 horas \u00b7 1 ventana de mantenimiento/mes',
      'services.std_ann_label': 'Anual <span class="maintenance-save-badge">Ahorra 45%</span>',
      'services.std_ann_note':  'Equivale a ~$44/mes \u00b7 facturado una vez al a\u00f1o',
      'services.std_f1':        'Respuesta en 72 horas h\u00e1biles',
      'services.std_f2':        '1 ventana de mantenimiento al mes',
      'services.std_f3':        'Hospedaje, actualizaciones, monitoreo, correcciones menores',
      'services.std_f4':        'Soporte Web + iOS + Android',

      'services.pri_title':     'Cuidado Prioritario',
      'services.pri_sub':       'La misma cobertura que Cuidado Est\u00e1ndar con tiempos de respuesta m\u00e1s r\u00e1pidos y ventanas de mantenimiento m\u00e1s frecuentes en web y m\u00f3vil (iOS y Android).',
      'services.pri_mo_note':   'Respuesta en 24 horas \u00b7 2 ventanas de mantenimiento/mes',
      'services.pri_ann_label': 'Anual <span class="maintenance-save-badge">Ahorra 45%</span>',
      'services.pri_ann_note':  'Equivale a ~$83/mes \u00b7 facturado una vez al a\u00f1o',
      'services.pri_f1':        'Respuesta en 24 horas h\u00e1biles',
      'services.pri_f2':        '2 ventanas de mantenimiento al mes',
      'services.pri_f3':        'Hospedaje, actualizaciones, monitoreo, correcciones menores',
      'services.pri_f4':        'Soporte Web + iOS + Android',
      'services.maint_cta':     'Hablar sobre el Plan',

      'services.buyout_h3':     'Mejora de Propiedad (Compra)',
      'services.buyout_badge':  'Opcional',
      'services.buyout_title':  'Mejora de Propiedad (Opci\u00f3n de Compra)',
      'services.buyout_sub':    '\u00bfQuieres ser due\u00f1o total de lo que construimos? Esta mejora \u00fanica transfiere todo \u2014 archivos, c\u00f3digo y cuentas \u2014 directamente a ti o tu equipo.',
      'services.buyout_note':   'Pago \u00fanico \u00b7 Basado en alcance \u00b7 Separado de los paquetes fijos',
      'services.buyout_f1':     'Propiedad total de todo lo construido \u2014 para siempre tuyo',
      'services.buyout_f2':     'Todos los archivos y c\u00f3digo entregados a tu equipo o desarrollador',
      'services.buyout_f3':     'Cuentas, accesos y documentaci\u00f3n entregados a ti',
      'services.buyout_cta':    'Hablar sobre la Transferencia',
      'services.note':          '<strong>Nota:</strong> El alcance final se confirma despu\u00e9s de una llamada de descubrimiento; el precio del paquete incluye mantenimiento solo el primer mes. La propiedad del c\u00f3digo permanece con el estudio hasta que se complete una Mejora de Propiedad.',

      /* ── Onboarding banners ─────────────────────────────── */
      'cookie.title':   'Usamos cookies de an\u00e1lisis',
      'cookie.desc':    'Google Analytics nos ayuda a entender c\u00f3mo los visitantes usan este sitio. No se venden ni comparten datos personales con anunciantes.',
      'cookie.decline': 'Rechazar',
      'cookie.accept':  'Aceptar',

      /* ── Contact ────────────────────────────────────────── */
      'contact.title':          'Contacto',
      'contact.form_title':     'Formulario de Contacto',
      'contact.ph_name':        'Nombre completo',
      'contact.ph_email':       'Correo electr\u00f3nico',
      'contact.ph_message':     'Tu mensaje',
      'contact.send_btn':       'Enviar mensaje',
      'contact.success_title':  'Mensaje recibido',
      'contact.success_text':   'Tu mensaje fue guardado \u2014 normalmente respondemos en 24 a 72 horas. Abre tu hilo privado para continuar la conversaci\u00f3n.',
      'contact.success_btn':    'Abrir tu conversaci\u00f3n',
    }
  };

  function applyTranslations(lang) {
    if (!CWR_I18N[lang]) lang = 'en';
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('cwr-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = CWR_I18N[lang][key];
      if (val !== undefined) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = CWR_I18N[lang][key];
      if (val !== undefined) el.placeholder = val;
    });

    document.querySelectorAll('.cwr-lang-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang-target') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  window.cwrSetLang = function (lang) { applyTranslations(lang); };
  window.cwrToggleLang = function () {
    var cur = document.documentElement.getAttribute('data-lang') || 'en';
    applyTranslations(cur === 'en' ? 'es' : 'en');
  };

  // Apply saved (or default) language once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyTranslations(localStorage.getItem('cwr-lang') || 'en');
    });
  } else {
    applyTranslations(localStorage.getItem('cwr-lang') || 'en');
  }
})();
