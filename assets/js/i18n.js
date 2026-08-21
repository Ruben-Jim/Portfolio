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
      'nav.start_project':    'Start a project',
      'nav.toggle_aria':      'Switch language',
      'portal.recovery_lead': 'Existing client?',
      'portal.recovery_cta':  'Open your portal',
      'portal.recovery_submit': 'Email me my portal link',
      'portal.recovery_email_ph': 'Your client email',

      /* ── Home ───────────────────────────────────────────── */
      'home.brand_sub':       'Web &amp; Mobile Dev Studio',
      'home.hero_title':      'Run your business<br>from your phone',
      'home.price_line':      'Packages from <strong>$499</strong> · Maintenance starting as low as <strong>$44/mo</strong>',
      'home.proof_line':      '<span class="cwr-landing-proof-accent">Fresno-based studio</span> · Web + iOS + Android · Real-time admin dashboards <span class="cwr-landing-stars" aria-hidden="true">★★★★★</span>',
      'home.cta_start':       'Start a project',
      'home.cta_pricing':     'See pricing',
      'home.cta_work':        'View work',
      'home.stores_kicker':   'From idea to launch',
      'home.stores_title':    'We put your app on the App Store and Google Play',
      'home.stores_lead':     'Full native builds, submitted and published under your name — not just a website wrapped in a shell.',
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
      'home.step4_desc':      'Ship to web and app stores with docs, training, and 1 month of the maintenance plan you pick.',
      'home.proof_kicker':    'Social proof',
      'home.proof_title':     'Trusted by local businesses',
      'home.testimonials_kicker': 'Testimonials',
      'home.testimonials_title':  'What clients say',
      'home.testimonials_link':   'Read more on About',
      'home.cta_title':       'Ready to run your business from your phone?',
      'home.cta_lead':        'Packages from <strong>$499</strong> · Maintenance starting as low as <strong>$44/mo</strong> · Fresno-based studio',

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
      'about.cta_lead':       'Packages from <strong>$499</strong> · Web + iOS + Android · Fresno-based studio',
      'about.cta_btn':        'Start a project',

      /* ── Portfolio ──────────────────────────────────────── */
      'portfolio.title':       'Portfolio',
      'portfolio.industry':    'Industry',
      'portfolio.filter_all':  'All',
      'portfolio.loading':     'Loading projects\u2026',

      /* ── Services & Pricing ─────────────────────────────── */
      'services.title':        'Services &amp; Pricing',
      'services.intro':        'Housecall Pro, Jobber, GoDaddy, and tools like them rent you a template — monthly fees, their rules, and no way to own it. We license a branded website and app built around how you actually work. You pay a setup package, then a monthly care plan for hosting, updates, and support. CodeWithRuben owns the product until you buy it out. Every package includes 1 month of the care plan you pick.',
      'services.agency_reveal': 'Larger company or studio? See Field Ops &amp; Studio \u2192',

      'services.platform_website': 'Website',
      'services.platform_web_admin': 'Website + Admin',
      'services.platform_app':     'App',
      'services.platform_web_app': 'Website + App',

      'services.page_title':   'Starter Page',
      'services.page_sub':     'One public page for customers, plus an owner admin — like a lawn-care site with quotes, jobs, and messages. No phone app.',
      'services.page_note':    'Fixed package \u00b7 ~1 week \u00b7 Maintenance included \u00b7 1 month only',
      'services.page_f1':      'One branded page (home) for customers',
      'services.page_f2':      'Owner admin at /admin',
      'services.page_f3':      'Quotes, inbox, and a simple job list',
      'services.page_f4':      'Change services, photos, and hours yourself',
      'services.page_f5':      'Reviews + English and Spanish',
      'services.page_cta':     'Choose $499 Package',

      'services.examples_btn':          'See examples',
      'services.examples_lead':         'Projects built at this package level.',
      'services.examples_open':         'Open details',
      'services.examples_title_page':   'Starter Page examples',
      'services.examples_title_web':    'Business Website examples',
      'services.examples_title_starter':'Starter Presence examples',
      'services.examples_title_growth': 'Growth Platform examples',
      'services.examples_title_linktree':'Link Tree examples',

      'services.web_title':    'Business Website',
      'services.web_sub':      'A 1\u20133 page branded site plus the same owner admin \u2014 more room than Starter Page, still no phone app.',
      'services.web_note':     'Fixed package \u00b7 ~1\u20132 weeks \u00b7 Maintenance included \u00b7 1 month only',
      'services.web_f1':       'Everything in Starter Page',
      'services.web_f2':       '1\u20133 pages instead of one',
      'services.web_f3':       'Live chat, gallery, and extra forms',
      'services.web_f4':       'SEO, hosting, and a branded Link Tree',
      'services.web_cta':      'Choose $999 Package',

      'services.starter_title': 'Starter Presence',
      'services.starter_sub':   'The same branded site, plus iOS &amp; Android for you and the team. Customers stay on the website \u2014 quotes and chat, not a full ops dashboard.',
      'services.starter_note':  'Fixed package \u00b7 ~2\u20133 weeks \u00b7 Maintenance included \u00b7 1 month only',
      'services.starter_f1':    'Everything in Business Website',
      'services.starter_f2':    'iOS &amp; Android for you and the team',
      'services.starter_f3':    'App store setup',
      'services.starter_f4':    'Alerts on new inquiries',
      'services.starter_cta':   'Choose $1,500 Package',

      'services.growth_badge':  'Most Popular',
      'services.growth_title':  'Growth Platform',
      'services.growth_sub':    'One branded website for customers, iOS &amp; Android for the crew, and an admin to run leads, jobs, money, and the team.',
      'services.growth_note':   'Fixed package \u00b7 3\u20134 weeks \u00b7 Maintenance included \u00b7 1 month only',
      'services.growth_f1':     'Everything in Starter Presence',
      'services.growth_f2':     'Admin: calendar, crew, and job workflow',
      'services.growth_f3':     'Stripe, PDFs, and Tap to Pay',
      'services.growth_f4':     'Crew hours + before/after you approve',
      'services.growth_cta':    'Choose $3,500 Package',

      'services.biz_badge':     'Field Ops',
      'services.biz_title':     'Business Platform',
      'services.biz_sub':       'Website + mobile app for crews in the field — take payments, assign jobs, and run day-to-day ops from one dashboard.',
      'services.biz_inv_label': 'Investment',
      'services.biz_inv_note':  'Scoped after discovery \u00b7 1 month maintenance included',
      'services.biz_f1':        'Everything in Growth Platform',
      'services.biz_f2':        'Role-based staff login (owner vs. worker)',
      'services.biz_f3':        'One app customers and crew can share',
      'services.biz_f4':        'Custom field ops scoped after discovery',
      'services.biz_cta':       'Book Discovery Call',

      'services.studio_badge':  'Enterprise',
      'services.studio_title':  'Studio Build',
      'services.studio_sub':    'Full field-service operations platform (website + app) — the tier we use for live production apps with crews, billing, and back-office automation.',
      'services.studio_inv_note': 'Custom scope \u00b7 Timeline after discovery \u00b7 1 month maintenance included',
      'services.studio_f1':     'Everything in Business Platform',
      'services.studio_f2':     'Quote \u2192 estimate \u2192 job \u2192 invoice pipeline',
      'services.studio_f3':     'Recurring billing (weekly, monthly, custom)',
      'services.studio_f4':     'Multi-location, tax regions, tips, promo codes',
      'services.studio_cta':    'Start Discovery',

      'services.linktree_h3':    'Just need a bio link?',
      'services.linktree_lead':  'A branded Link Tree for Instagram and TikTok — one link that sends people to book, call, or visit your site. No full website required.',
      'services.linktree_badge': 'Standalone',
      'services.linktree_title': 'Link Tree',
      'services.linktree_sub':   'One polished link-in-bio page with your brand — avatar, bio, stacked action links, and social icons. Perfect when you only need the bio link.',
      'services.linktree_note':  'One-time \u00b7 ~3\u20135 days \u00b7 Design + setup',
      'services.linktree_f1':    'Branded page for Instagram, TikTok, and other social bios',
      'services.linktree_f2':    'Avatar, business name, short bio, and your brand colors',
      'services.linktree_f3':    'Stacked action links — book, call, website, menu, and more',
      'services.linktree_f4':    'Social icons row + mobile-first, fast-loading layout',
      'services.linktree_f5':    'One revision round \u00b7 hosting setup help (subdomain or path)',
      'services.linktree_cta':   'Start from $99',

      'services.maint_title':   'Maintenance Plans',
      'services.maint_lead':    'After your first included month (the plan you pick): pay monthly, or choose annual billing and <strong>save 45%</strong> compared to paying month-to-month.',
      'services.monthly_label': 'Monthly',

      'services.ess_title':     'Essential Care',
      'services.ess_sub':       'Keep hosting, updates, and monitoring healthy between busy seasons — weekday replies, one work session.',
      'services.ess_mo_note':   '5 business days \u00b7 2 hrs \u00b7 1 work session',
      'services.ess_ann_label': 'Annual <span class="maintenance-save-badge">Save 45%</span>',
      'services.ess_ann_note':  'Same as ~$44/mo \u00b7 billed once per year',
      'services.ess_f1':        'Hosting, updates, monitoring',
      'services.ess_f2':        'Reply in 5 business days \u00b7 if you\u2019re down, we reply within 1 business day (weekdays)',
      'services.ess_f3':        'Bug fixes after Standard and Priority',
      'services.ess_f4':        'Store updates 4\u00d7/year in your session',
      'services.ess_f5':        'New features quoted separately',

      'services.std_title':     'Standard Care',
      'services.std_sub':       'Recommended for live day-to-day ops — evenings and weekends if something is down, monthly content, and add-ons on a set cadence.',
      'services.std_mo_note':   '3 business days \u00b7 6 hrs \u00b7 2 work sessions',
      'services.std_ann_label': 'Annual <span class="maintenance-save-badge">Save 45%</span>',
      'services.std_ann_note':  'Same as ~$83/mo \u00b7 billed once per year',
      'services.std_f1':        'Everything in Essential Care',
      'services.std_f2':        'Faster replies \u2014 3 business days, 4 hours if you\u2019re down (nights and weekends too)',
      'services.std_f3':        'Monthly store + content updates',
      'services.std_f4':        'New features and improvements each month',
      'services.std_f5':        'A bigger addition each quarter \u00b7 one major overhaul each year',

      'services.pri_title':     'Priority Care',
      'services.pri_sub':       'Everything in Standard, with more hours, faster replies, weekly content, and add-ons more often.',
      'services.pri_mo_note':   '24 hours \u00b7 10 hrs \u00b7 3 work sessions',
      'services.pri_ann_label': 'Annual <span class="maintenance-save-badge">Save 45%</span>',
      'services.pri_ann_note':  'Same as ~$165/mo \u00b7 billed once per year',
      'services.pri_f1':        'Everything in Standard Care',
      'services.pri_f2':        'Faster replies \u2014 24 hours, 2 hours if you\u2019re down (nights and weekends too)',
      'services.pri_f3':        'Store updates as needed \u00b7 weekly content',
      'services.pri_f4':        'Bigger additions more often \u00b7 a major overhaul every 6 months',
      'services.pri_f5':        'Unused hours carry 30 days',
      'services.maint_cta':     'Discuss Plan',
      'services.maint_policy':  'Your first included month is the plan you pick. Queue is Priority, then Standard, then Essential. Custom work beyond the add-on cadence is quoted separately. We reply on the clock; the repair uses leftover hours. Weekdays 10am\u20136pm Pacific. Portal preferred; email and text also count.',

      'services.buyout_h3':     'Ownership Upgrade (Buyout)',
      'services.buyout_badge':  'Optional',
      'services.buyout_title':  'Ownership Upgrade (Buyout Option)',
      'services.buyout_sub':    'Ready to own it outright? This one-time buyout transfers the site, app, code, stores, and accounts to you. After handoff, CodeWithRuben no longer hosts, maintains, or supports the product — it\u2019s yours to run or hand to another developer.',
      'services.buyout_note':   'One-time fee \u00b7 Scope-based \u00b7 Separate from setup packages and monthly care',
      'services.buyout_f1':     'Full ownership — code, files, and store listings transfer to you',
      'services.buyout_f2':     'Accounts, logins, and documentation handed to you or your developer',
      'services.buyout_f3':     'CWR hosting, maintenance, and support stop at handoff',
      'services.buyout_cta':    'Discuss Ownership Transfer',
      'services.note':          '<strong>Note:</strong> Packages are a license to use what we build, plus the monthly care plan you pick (first month included). CodeWithRuben owns the product until an Ownership Upgrade (buyout) is completed. After buyout, hosting, maintenance, and support from CWR end.',

      /* ── Hire Me form ───────────────────────────────────── */
      'hire.package_label':       'Package or service',
      'hire.package_placeholder': 'Not sure yet / custom scope',
      'hire.package_none':        'Not sure yet / custom scope',
      'hire.package_linktree':    'Link Tree — $99–$199',
      'hire.package_page':        'Starter Page — $499',
      'hire.package_website':     'Business Website — $999',
      'hire.package_starter':     'Starter Presence (Website + App) — $1,500',
      'hire.package_growth':      'Growth Platform (Website + App) — $3,500',
      'hire.package_agency':      'Business Platform (Website + App) — $6k–$12k',
      'hire.package_studio':      'Studio Build (Website + App) — $15k–$40k',
      'hire.package_hint':        'Need help choosing?',
      'hire.package_hint_link':   'See package details',

      /* ── Onboarding banners ─────────────────────────────── */
      'cookie.title':   'We use analytics cookies',
      'cookie.desc':    'Google Analytics helps us understand how visitors use this site. No personal data is sold or shared with advertisers.',
      'cookie.decline': 'Decline',
      'cookie.accept':  'Accept',

      /* ── Contact ────────────────────────────────────────── */
      'contact.title':          'Contact',
      'contact.page_lead':      'Quick questions, maintenance, or ownership \u2014 for a full project brief,',
      'contact.page_lead_link': 'start a project',
      'contact.form_title':     'Send a quick message',
      'contact.form_lead':      'Ask anything short — I\u2019ll reply in your private thread.',
      'contact.ph_name':        'Full name',
      'contact.ph_email':       'Email address',
      'contact.ph_message':     'Your quick question or note',
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
      'nav.start_project':    'Iniciar un proyecto',
      'nav.toggle_aria':      'Cambiar idioma',
      'portal.recovery_lead': '¿Ya eres cliente?',
      'portal.recovery_cta':  'Abrir tu portal',
      'portal.recovery_submit': 'Envíame mi enlace del portal',
      'portal.recovery_email_ph': 'Tu correo de cliente',

      /* ── Home ───────────────────────────────────────────── */
      'home.brand_sub':       'Estudio de Desarrollo Web y M\u00f3vil',
      'home.hero_title':      'Administra tu negocio<br>desde tu tel\u00e9fono',
      'home.price_line':      'Paquetes desde <strong>$499</strong> \u00b7 Mantenimiento desde <strong>$44/mes</strong>',
      'home.proof_line':      '<span class="cwr-landing-proof-accent">Estudio en Fresno</span> \u00b7 Web + iOS + Android \u00b7 Paneles en tiempo real <span class="cwr-landing-stars" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span>',
      'home.cta_start':       'Iniciar un proyecto',
      'home.cta_pricing':     'Ver precios',
      'home.cta_work':        'Ver trabajos',
      'home.stores_kicker':   'De la idea al lanzamiento',
      'home.stores_title':    'Publicamos tu app en App Store y Google Play',
      'home.stores_lead':     'Builds nativas completas, enviadas y publicadas a tu nombre — no solo un sitio web envuelto en un shell.',
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
      'home.step4_desc':      'Publicamos en web y tiendas de apps con documentaci\u00f3n, capacitaci\u00f3n y 1 mes del plan de mantenimiento que elijas.',
      'home.proof_kicker':    'Clientes satisfechos',
      'home.proof_title':     'La confianza de negocios locales',
      'home.testimonials_kicker': 'Testimonios',
      'home.testimonials_title':  'Lo que dicen los clientes',
      'home.testimonials_link':   'Leer m\u00e1s en Nosotros',
      'home.cta_title':       '\u00bfListo para administrar tu negocio desde tu tel\u00e9fono?',
      'home.cta_lead':        'Paquetes desde <strong>$499</strong> \u00b7 Mantenimiento desde <strong>$44/mes</strong> \u00b7 Estudio en Fresno',

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
      'about.cta_lead':       'Paquetes desde <strong>$499</strong> \u00b7 Web + iOS + Android \u00b7 Estudio en Fresno',
      'about.cta_btn':        'Iniciar un proyecto',

      /* ── Portfolio ──────────────────────────────────────── */
      'portfolio.title':      'Portafolio',
      'portfolio.industry':   'Industria',
      'portfolio.filter_all': 'Todos',
      'portfolio.loading':    'Cargando proyectos\u2026',

      /* ── Services & Pricing ─────────────────────────────── */
      'services.title':       'Servicios y Precios',
      'services.intro':       'Housecall Pro, Jobber, GoDaddy y herramientas as\u00ed te rentan una plantilla \u2014 cuotas mensuales, sus reglas y sin forma de ser due\u00f1o. Licenciamos un sitio y app con tu marca, armados alrededor de c\u00f3mo trabajas. Pagas un paquete de arranque y luego un plan mensual de cuidado (hospedaje, actualizaciones y soporte). CodeWithRuben es due\u00f1o del producto hasta que lo compres. Cada paquete incluye 1 mes del plan de cuidado que elijas.',
      'services.agency_reveal': '\u00bfEmpresa m\u00e1s grande o studio? Ver Operaciones de Campo y Studio \u2192',

      'services.platform_website': 'Sitio web',
      'services.platform_web_admin': 'Sitio + Admin',
      'services.platform_app':     'App',
      'services.platform_web_app': 'Sitio + App',

      'services.page_title':   'P\u00e1gina Starter',
      'services.page_sub':     'Una p\u00e1gina p\u00fablica para clientes, m\u00e1s un panel de due\u00f1o \u2014 como un sitio de jardiner\u00eda con cotizaciones, trabajos y mensajes. Sin app de tel\u00e9fono.',
      'services.page_note':    'Paquete fijo \u00b7 ~1 semana \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.page_f1':      'Una p\u00e1gina con tu marca (inicio) para clientes',
      'services.page_f2':      'Panel de due\u00f1o en /admin',
      'services.page_f3':      'Cotizaciones, bandeja y lista simple de trabajos',
      'services.page_f4':      'Cambia servicios, fotos y horarios t\u00fa mismo',
      'services.page_f5':      'Rese\u00f1as + ingl\u00e9s y espa\u00f1ol',
      'services.page_cta':     'Elegir paquete de $499',

      'services.examples_btn':          'Ver ejemplos',
      'services.examples_lead':         'Proyectos de este nivel de paquete.',
      'services.examples_open':         'Ver detalles',
      'services.examples_title_page':   'Ejemplos de P\u00e1gina Starter',
      'services.examples_title_web':    'Ejemplos de Sitio web',
      'services.examples_title_starter':'Ejemplos de Presencia Inicial',
      'services.examples_title_growth': 'Ejemplos de Plataforma de Crecimiento',
      'services.examples_title_linktree':'Ejemplos de Link Tree',

      'services.web_title':    'Sitio web del negocio',
      'services.web_sub':      'Un sitio de 1\u20133 p\u00e1ginas con tu marca m\u00e1s el mismo panel de due\u00f1o \u2014 m\u00e1s espacio que P\u00e1gina Starter, a\u00fan sin app.',
      'services.web_note':     'Paquete fijo \u00b7 ~1\u20132 semanas \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.web_f1':       'Todo lo de P\u00e1gina Starter',
      'services.web_f2':       '1\u20133 p\u00e1ginas en vez de una',
      'services.web_f3':       'Chat en vivo, galer\u00eda y formularios extra',
      'services.web_f4':       'SEO, hospedaje y Link Tree con tu marca',
      'services.web_cta':      'Elegir paquete de $999',

      'services.starter_title': 'Presencia Inicial',
      'services.starter_sub':   'El mismo sitio con tu marca, m\u00e1s iOS y Android para ti y el equipo. Los clientes se quedan en la web \u2014 cotizaciones y chat, no un panel de operaciones.',
      'services.starter_note':  'Paquete fijo \u00b7 ~2\u20133 semanas \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.starter_f1':    'Todo lo del Sitio web del negocio',
      'services.starter_f2':    'iOS y Android para ti y el equipo',
      'services.starter_f3':    'Configuraci\u00f3n en las tiendas de apps',
      'services.starter_f4':    'Alertas cuando alguien consulta',
      'services.starter_cta':   'Elegir paquete de $1,500',

      'services.growth_badge':  'M\u00e1s Popular',
      'services.growth_title':  'Plataforma de Crecimiento',
      'services.growth_sub':    'Un sitio con tu marca para clientes, iOS y Android para el equipo, y un panel para leads, trabajos, dinero y el personal.',
      'services.growth_note':   'Paquete fijo \u00b7 3\u20134 semanas \u00b7 Mantenimiento incluido \u00b7 solo 1 mes',
      'services.growth_f1':     'Todo lo de Presencia Inicial',
      'services.growth_f2':     'Admin: calendario, equipo y flujo de trabajos',
      'services.growth_f3':     'Stripe, PDFs y Tap to Pay',
      'services.growth_f4':     'Horas del equipo + antes/despu\u00e9s que t\u00fa apruebas',
      'services.growth_cta':    'Elegir paquete de $3,500',

      'services.biz_badge':     'Operaciones de Campo',
      'services.biz_title':     'Plataforma Empresarial',
      'services.biz_sub':       'Sitio web + app m\u00f3vil para equipos en campo \u2014 acepta pagos, asigna trabajos y gestiona operaciones diarias desde un panel.',
      'services.biz_inv_label': 'Inversi\u00f3n',
      'services.biz_inv_note':  'Definido tras descubrimiento \u00b7 1 mes de mantenimiento incluido',
      'services.biz_f1':        'Todo lo de Plataforma de Crecimiento',
      'services.biz_f2':        'Acceso del personal con roles (due\u00f1o vs. trabajador)',
      'services.biz_f3':        'Una app que clientes y equipo pueden compartir',
      'services.biz_f4':        'Operaciones de campo a medida, tras descubrimiento',
      'services.biz_cta':       'Agendar Llamada de Descubrimiento',

      'services.studio_badge':  'Empresarial',
      'services.studio_title':  'Studio Build',
      'services.studio_sub':    'Plataforma completa de operaciones de campo (sitio + app) \u2014 el nivel que usamos para apps en producci\u00f3n con equipos, facturaci\u00f3n y automatizaci\u00f3n back-office.',
      'services.studio_inv_note': 'Alcance personalizado \u00b7 Tiempo tras descubrimiento \u00b7 1 mes de mantenimiento incluido',
      'services.studio_f1':     'Todo lo de Plataforma Empresarial',
      'services.studio_f2':     'Cotizaci\u00f3n \u2192 presupuesto \u2192 trabajo \u2192 factura',
      'services.studio_f3':     'Facturaci\u00f3n recurrente (semanal, mensual, a medida)',
      'services.studio_f4':     'Varias ubicaciones, impuestos, propinas, c\u00f3digos promo',
      'services.studio_cta':    'Iniciar Descubrimiento',

      'services.linktree_h3':    '\u00bfSolo necesitas un enlace de bio?',
      'services.linktree_lead':  'Un Link Tree con tu marca para Instagram y TikTok — un enlace que lleva a reservar, llamar o visitar tu sitio. No necesitas un sitio completo.',
      'services.linktree_badge': 'Independiente',
      'services.linktree_title': 'Link Tree',
      'services.linktree_sub':   'Una p\u00e1gina de enlaces con tu marca — avatar, bio, botones de acci\u00f3n e iconos sociales. Ideal cuando solo necesitas el enlace de bio.',
      'services.linktree_note':  'Pago \u00fanico \u00b7 ~3\u20135 d\u00edas \u00b7 Dise\u00f1o + configuraci\u00f3n',
      'services.linktree_f1':    'P\u00e1gina con tu marca para Instagram, TikTok y otras redes',
      'services.linktree_f2':    'Avatar, nombre del negocio, bio corta y tus colores',
      'services.linktree_f3':    'Enlaces de acci\u00f3n — reservar, llamar, sitio, men\u00fa y m\u00e1s',
      'services.linktree_f4':    'Fila de iconos sociales + dise\u00f1o m\u00f3vil r\u00e1pido',
      'services.linktree_f5':    'Una ronda de revisi\u00f3n \u00b7 ayuda con hospedaje (subdominio o ruta)',
      'services.linktree_cta':   'Comenzar desde $99',

      'services.maint_title':   'Planes de Mantenimiento',
      'services.maint_lead':    'Despu\u00e9s de tu primer mes incluido (el plan que elijas): paga mensual, o elige facturaci\u00f3n anual y <strong>ahorra 45%</strong> comparado con el pago mensual.',
      'services.monthly_label': 'Mensual',

      'services.ess_title':     'Cuidado Esencial',
      'services.ess_sub':       'Mant\u00e9n el hospedaje, las actualizaciones y el monitoreo entre temporadas — respuestas en d\u00edas h\u00e1biles, una sesi\u00f3n de trabajo.',
      'services.ess_mo_note':   '5 d\u00edas h\u00e1biles \u00b7 2 hrs \u00b7 1 sesi\u00f3n de trabajo',
      'services.ess_ann_label': 'Anual <span class="maintenance-save-badge">Ahorra 45%</span>',
      'services.ess_ann_note':  'Equivale a ~$44/mes \u00b7 facturado una vez al a\u00f1o',
      'services.ess_f1':        'Hospedaje, actualizaciones, monitoreo',
      'services.ess_f2':        'Respondemos en 5 d\u00edas h\u00e1biles \u00b7 si el sitio o la app se cae, respondemos en 1 d\u00eda h\u00e1bil (d\u00edas de semana)',
      'services.ess_f3':        'Errores despu\u00e9s de Est\u00e1ndar y Prioritario',
      'services.ess_f4':        'Actualizaciones a tiendas 4 veces al a\u00f1o, en tu sesi\u00f3n',
      'services.ess_f5':        'Funciones nuevas se cotizan aparte',

      'services.std_title':     'Cuidado Est\u00e1ndar',
      'services.std_sub':       'Recomendado para el d\u00eda a d\u00eda — noches y fines de semana si algo se cae, contenido mensual y extras en un ritmo fijo.',
      'services.std_mo_note':   '3 d\u00edas h\u00e1biles \u00b7 6 hrs \u00b7 2 sesiones de trabajo',
      'services.std_ann_label': 'Anual <span class="maintenance-save-badge">Ahorra 45%</span>',
      'services.std_ann_note':  'Equivale a ~$83/mes \u00b7 facturado una vez al a\u00f1o',
      'services.std_f1':        'Todo lo de Cuidado Esencial',
      'services.std_f2':        'Respuestas m\u00e1s r\u00e1pidas \u2014 3 d\u00edas h\u00e1biles, 4 horas si se cae (noches y fines de semana tambi\u00e9n)',
      'services.std_f3':        'Actualizaciones mensuales a tiendas y contenido',
      'services.std_f4':        'Nuevas funciones y mejoras cada mes',
      'services.std_f5':        'Una adici\u00f3n m\u00e1s grande cada trimestre \u00b7 una renovaci\u00f3n mayor cada a\u00f1o',

      'services.pri_title':     'Cuidado Prioritario',
      'services.pri_sub':       'Todo lo de Est\u00e1ndar, con m\u00e1s horas, respuestas m\u00e1s r\u00e1pidas, contenido semanal y extras m\u00e1s seguido.',
      'services.pri_mo_note':   '24 horas \u00b7 10 hrs \u00b7 3 sesiones de trabajo',
      'services.pri_ann_label': 'Anual <span class="maintenance-save-badge">Ahorra 45%</span>',
      'services.pri_ann_note':  'Equivale a ~$165/mes \u00b7 facturado una vez al a\u00f1o',
      'services.pri_f1':        'Todo lo de Cuidado Est\u00e1ndar',
      'services.pri_f2':        'Respuestas m\u00e1s r\u00e1pidas \u2014 24 horas, 2 horas si se cae (noches y fines de semana tambi\u00e9n)',
      'services.pri_f3':        'Actualizaciones a tiendas cuando las necesites \u00b7 contenido semanal',
      'services.pri_f4':        'Adiciones m\u00e1s seguido \u00b7 una renovaci\u00f3n mayor cada 6 meses',
      'services.pri_f5':        'Las horas no usadas pasan 30 d\u00edas',
      'services.maint_cta':     'Hablar sobre el Plan',
      'services.maint_policy':  'Tu primer mes incluido es el plan que elijas. La cola es Prioritario, luego Est\u00e1ndar, luego Esencial. El trabajo a la medida fuera del ritmo de extras se cotiza aparte. Respondemos en el reloj; la reparaci\u00f3n usa las horas que queden. D\u00edas de semana 10am\u20136pm Pac\u00edfico. Portal de preferencia; correo y texto tambi\u00e9n cuentan.',

      'services.buyout_h3':     'Mejora de Propiedad (Compra)',
      'services.buyout_badge':  'Opcional',
      'services.buyout_title':  'Mejora de Propiedad (Opci\u00f3n de Compra)',
      'services.buyout_sub':    '\u00bfListo para ser due\u00f1o total? Esta compra \u00fanica te transfiere el sitio, la app, el c\u00f3digo, las tiendas y las cuentas. Despu\u00e9s de la entrega, CodeWithRuben ya no hospeda, mantiene ni da soporte \u2014 lo corres t\u00fa o tu desarrollador.',
      'services.buyout_note':   'Pago \u00fanico \u00b7 Basado en alcance \u00b7 Separado de los paquetes de arranque y el cuidado mensual',
      'services.buyout_f1':     'Propiedad total \u2014 c\u00f3digo, archivos y fichas de tienda pasan a ti',
      'services.buyout_f2':     'Cuentas, accesos y documentaci\u00f3n para ti o tu desarrollador',
      'services.buyout_f3':     'El hospedaje, mantenimiento y soporte de CWR terminan en la entrega',
      'services.buyout_cta':    'Hablar sobre la Transferencia',
      'services.note':          '<strong>Nota:</strong> Los paquetes son una licencia para usar lo que construimos, m\u00e1s el plan de cuidado mensual que elijas (primer mes incluido). CodeWithRuben es due\u00f1o del producto hasta que se complete una Mejora de Propiedad (compra). Despu\u00e9s de la compra, el hospedaje, mantenimiento y soporte de CWR terminan.',

      /* ── Hire Me form ───────────────────────────────────── */
      'hire.package_label':       'Paquete o servicio',
      'hire.package_placeholder': 'A\u00fan no s\u00e9 / alcance personalizado',
      'hire.package_none':        'A\u00fan no s\u00e9 / alcance personalizado',
      'hire.package_linktree':    'Link Tree — $99–$199',
      'hire.package_page':        'P\u00e1gina Starter — $499',
      'hire.package_website':     'Sitio web del negocio — $999',
      'hire.package_starter':     'Presencia Inicial (Sitio + App) — $1,500',
      'hire.package_growth':      'Plataforma de Crecimiento (Sitio + App) — $3,500',
      'hire.package_agency':      'Plataforma Empresarial (Sitio + App) — $6k–$12k',
      'hire.package_studio':      'Studio Build (Sitio + App) — $15k–$40k',
      'hire.package_hint':        '\u00bfNecesitas ayuda para elegir?',
      'hire.package_hint_link':   'Ver detalles de paquetes',

      /* ── Onboarding banners ─────────────────────────────── */
      'cookie.title':   'Usamos cookies de an\u00e1lisis',
      'cookie.desc':    'Google Analytics nos ayuda a entender c\u00f3mo los visitantes usan este sitio. No se venden ni comparten datos personales con anunciantes.',
      'cookie.decline': 'Rechazar',
      'cookie.accept':  'Aceptar',

      /* ── Contact ────────────────────────────────────────── */
      'contact.title':          'Contacto',
      'contact.page_lead':      'Preguntas r\u00e1pidas, mantenimiento o propiedad \u2014 para un brief completo,',
      'contact.page_lead_link': 'iniciar un proyecto',
      'contact.form_title':     'Env\u00eda un mensaje r\u00e1pido',
      'contact.form_lead':      'Pregunta algo breve — te respondo en tu hilo privado.',
      'contact.ph_name':        'Nombre completo',
      'contact.ph_email':       'Correo electr\u00f3nico',
      'contact.ph_message':     'Tu pregunta o nota breve',
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

    var hirePackageInput = document.querySelector('[data-page="hire-me"] [data-hire-package-input]');
    if (hirePackageInput && typeof window.syncBusinessDocSelectUI === 'function') {
      window.syncBusinessDocSelectUI(hirePackageInput);
    }
  }

  window.cwrSetLang = function (lang) { applyTranslations(lang); };
  window.cwrT = function (key, fallback) {
    var lang = document.documentElement.getAttribute('data-lang') || localStorage.getItem('cwr-lang') || 'en';
    if (!CWR_I18N[lang]) lang = 'en';
    var val = CWR_I18N[lang][key];
    if (val == null && lang !== 'en') val = CWR_I18N.en[key];
    if (val == null) return fallback || '';
    return String(val).replace(/<[^>]*>/g, '');
  };
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
