/**
 * Built-in portfolio entries used when Realtime Database `portfolioProjects` is empty.
 * Admin → Portfolio Projects → "Publish built-in projects" copies these into Firestore.
 */
window.DEFAULT_PORTFOLIO_PROJECTS = [
  {
    order: 10,
    category: 'professional',
    title: 'Pro Cleaning',
    projectUrl: 'https://roof-cleaning-template.expo.app',
    imageUrl: './assets/images/project-procleaning.png',
    imageAlt: 'Pro Cleaning App',
    description:
      'A comprehensive mobile app for professional cleaning services featuring job scheduling, customer management, service tracking, and payment processing. Built to streamline operations for cleaning businesses and enhance customer experience.',
    techTags: ['React Native', 'Expo', 'Firebase'],
    outcome:
      'Successfully deployed and helping cleaning professionals manage their business operations efficiently with improved scheduling and customer communication.',
    buyNowLabel: 'Buy Now: $2,000',
    buyPremiumLabel: 'Premium with Customizations: $2,250 - $2,750',
    showQuoteButton: true
  },
  {
    order: 20,
    category: 'professional',
    title: 'Grippy Socks',
    projectUrl: 'https://grippysocks.expo.app',
    imageUrl: './assets/images/project-grippysocks.png',
    imageAlt: 'Grippy Socks App',
    description:
      'An Expo + Firebase e-commerce app for Grippy Socks with a soccer-themed storefront, single-page shop + cart flow, and admin order management at /admin. MVP checkout is Cash on Delivery, with Stripe card payments prepared for later activation.',
    techTags: ['React Native', 'Expo', 'Mobile'],
    outcome:
      'Live production demo with real-time order handling (Realtime Database), Firestore product support, and a scalable checkout foundation ready for Stripe enablement.',
    showQuoteButton: true
  },
  {
    order: 30,
    category: 'professional',
    title: 'Barber Shop',
    projectUrl: '#',
    imageUrl: './assets/images/project-barbershop.png',
    imageAlt: 'Barber Shop App',
    description:
      'A barber shop management app built with Expo Router, React Native, NativeWind, and Firebase Realtime Database. It supports both owner workflows (admin login, dashboard, appointments, services, customers, messages) and customer flows (booking and messaging).',
    techTags: ['React Native', 'Expo Router', 'Firebase RTDB'],
    outcome:
      'Production-ready web/mobile foundation with real-time bookings/messages, secure admin credentials via bcrypt, and optional Stripe payment integration prepared for activation.',
    showQuoteButton: true
  },
  {
    order: 40,
    category: 'professional',
    title: 'Rizo Pizzeria',
    projectUrl: 'https://rizo-pizza--by3ty9xb6t.expo.app',
    imageUrl: './assets/images/project-rizopizzeria.png',
    imageAlt: 'Rizo Pizzeria',
    description:
      'A production-ready mobile app for Rizo Pizzeria featuring online ordering, real-time order tracking, menu browsing, and seamless payment integration. Built to enhance customer experience and streamline restaurant operations.',
    techTags: ['React Native', 'Expo', 'Firebase'],
    outcome:
      'Successfully deployed and in active use—increased online orders by 40% and improved customer satisfaction with streamlined ordering and real-time tracking.',
    buyNowLabel: 'Buy Now: $500',
    buyPremiumLabel: 'Premium with Customizations: $750 - $1,000',
    showQuoteButton: true
  },
  {
    order: 50,
    category: 'professional',
    title: 'Shelton Springs Home Owners Association App',
    projectUrl: 'https://hoa-demo--l91yvra8kn.expo.app',
    imageUrl: './assets/images/project-sheltonsprings.png',
    imageAlt: 'Shelton Springs HOA App',
    description:
      'A production-ready mobile app for HOA community management with real-time notifications, document sharing, and resident communication.',
    techTags: ['React Native', 'Expo', 'Firebase'],
    outcome:
      'Successfully deployed and in active use by Shelton Springs HOA—streamlined operations and improved resident engagement.',
    buyNowLabel: 'Buy Now: $1,500',
    buyPremiumLabel: 'Premium with Customizations: $2,000 - $2,500',
    showQuoteButton: true
  },
  {
    order: 60,
    category: 'professional',
    title: 'Gadget Garage',
    projectUrl: 'https://gadgetgarage.app',
    imageUrl: './assets/images/project-gadgetgarage.png',
    imageAlt: 'Gadget Garage App',
    description:
      'A comprehensive mobile app for managing and tracking your tech gadgets, warranties, and maintenance schedules. Built with modern mobile technologies.',
    techTags: ['React Native', 'Firebase', 'Node.js'],
    outcome: 'Live production app helping users organize their tech inventory efficiently.',
    buyNowLabel: 'Buy Now: $500',
    buyPremiumLabel: 'Premium with Customizations: $750 - $1,000',
    showQuoteButton: true
  },
  {
    order: 70,
    category: 'professional',
    title: "Rosa's Beauty Salon",
    projectUrl: 'https://rosasalon.expo.app',
    imageUrl: './assets/images/project-rosasalon.png',
    imageAlt: "Rosa's Beauty Salon",
    description:
      'A modern booking and management system for beauty salons. Features appointment scheduling, client management, and service tracking.',
    techTags: ['Web App', 'JavaScript'],
    showQuoteButton: true
  },
  {
    order: 80,
    category: 'professional',
    title: 'Zoom Realty',
    projectUrl: 'https://ruben-jim.github.io/ZoomRealty2025-main/',
    imageUrl: './assets/images/project-zoomrealty.png',
    imageAlt: 'Zoom Realty',
    description:
      'A modern real estate website with property listings, search functionality, and agent profiles. Responsive design optimized for all devices.',
    techTags: ['HTML', 'CSS', 'JavaScript'],
    buyNowLabel: 'Buy Now: $500',
    buyPremiumLabel: 'Premium with Customizations: $750 - $2,500',
    showQuoteButton: true
  },
  {
    order: 90,
    category: 'creative',
    title: 'Estate',
    projectUrl: 'https://ruben-jim.github.io/Real-Estate/',
    imageUrl: './assets/images/project-realestate.png',
    imageAlt: 'Real Estate',
    description:
      'A clean and modern real estate platform showcasing properties with advanced filtering and search capabilities.',
    techTags: ['HTML', 'CSS', 'JavaScript'],
    showQuoteButton: true
  },
  {
    order: 100,
    category: 'creative',
    title: 'Homeverse',
    projectUrl: 'https://ruben-jim.github.io/DEMO/',
    imageUrl: './assets/images/project-homeverse.png',
    imageAlt: 'Homeverse',
    description:
      'An elegant real estate website featuring property showcases, virtual tours, and seamless user experience.',
    techTags: ['HTML', 'CSS', 'JavaScript'],
    showQuoteButton: true
  },
  {
    order: 110,
    category: 'professional',
    title: 'Lawn Care',
    projectUrl: '#',
    imageUrl: './assets/images/project-lawncare.png',
    imageAlt: 'Lawn Care App',
    description:
      'A lawn care and landscaping business app with service booking, recurring routes, and seasonal add-ons—built for crews that want less back-and-forth over pricing in texts.',
    techTags: ['React Native', 'Expo', 'Firebase'],
    showQuoteButton: true
  }
];

/** Local screenshots under assets/images/ (same paths as built-in projects use). */
window.PORTFOLIO_ASSET_IMAGES = (function () {
  var seen = {};
  var list = [];
  function add(url) {
    var u = String(url || '').trim();
    if (!u || seen[u]) return;
    seen[u] = true;
    list.push(u);
  }
  (window.DEFAULT_PORTFOLIO_PROJECTS || []).forEach(function (p) {
    add(p.imageUrl);
  });
  [
    './assets/images/project-lawncare.png',
    './assets/images/project-realestate.png',
    './assets/images/project-zoomrealty.png',
    './assets/images/project-procleaning1.png',
    './assets/images/project-rizopizzeria1.png',
    './assets/images/project-sheltonsprings1.png',
    './assets/images/project-rosasalon1.png',
    './assets/images/project-gadgetgarage2.png',
    './assets/images/project-homeverse2.png'
  ].forEach(add);
  return list.sort();
})();
