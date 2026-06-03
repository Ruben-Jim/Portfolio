/**
 * Business Systems Explorer — capabilities & add-ons only (no packages or prices).
 * Fixed tiers and pricing live on Services & Pricing.
 */
(function (global) {
  'use strict';

  var BOOKING_DEMO_URL = 'https://roof-cleaning-template.expo.app';

  global.BUSINESS_SYSTEMS_DATA = {
    pageTitle: 'What We Build',
    pageLead:
      'Explore what Code With Ruben can build for your business. Tap what interests you, then contact us with your list. For packages and pricing, see Services & Pricing.',

    paths: {
      newBrand: {
        id: 'newBrand',
        label: 'Starting fresh',
        sublabel: 'New business — no site or app yet',
        description:
          'Pick the capabilities you want — we’ll match them to the right package on a discovery call.',
        icon: 'rocket-outline'
      },
      existingApp: {
        id: 'existingApp',
        label: 'We already have something',
        sublabel: 'Existing website or app',
        description:
          'Add features or rebrand a proven flow — without starting from zero.',
        icon: 'construct-outline'
      }
    },

    catalogs: {
      newBrand: [
        {
          id: 'presence',
          title: 'Get found & take bookings',
          cards: [
            {
              id: 'branded-booking-app',
              title: 'Branded booking app',
              summary:
                'Your logo and colors on a proven flow — customers pick a service, book a time, pay a deposit, and get reminders. You see every request in one place.',
              tags: ['Fast launch', 'Your brand'],
              demoUrl: BOOKING_DEMO_URL,
              featured: true
            },
            {
              id: 'website-presence',
              title: 'Website & online presence',
              summary:
                'A professional site or simple storefront so people can find you, request a quote, or ask to book — with your branding and contact channels.',
              tags: ['Website', 'Get found', 'Quotes'],
              demoUrl: ''
            },
            {
              id: 'online-booking-deposits',
              title: 'Online booking & deposits',
              summary:
                'Customers schedule from their phone; you can collect a deposit up front so fewer appointments get skipped.',
              tags: ['Appointments', 'Less no-shows'],
              demoUrl: BOOKING_DEMO_URL
            },
            {
              id: 'service-intake',
              title: 'Clear service requests',
              summary:
                'Customers choose what they need — service type, options, urgency, time slot — so you get organized requests instead of back-and-forth messages.',
              tags: ['Less phone tag', 'Clear requests'],
              demoUrl: BOOKING_DEMO_URL
            }
          ]
        },
        {
          id: 'operations',
          title: 'Run your business',
          cards: [
            {
              id: 'business-dashboard',
              title: 'Your business dashboard',
              summary:
                'See new requests, today’s work, and what’s done — update status and assign your team without group-chat chaos.',
              tags: ['One dashboard', 'Your team'],
              demoUrl: BOOKING_DEMO_URL
            },
            {
              id: 'quotes-invoices',
              title: 'Quotes, estimates & invoices',
              summary:
                'Send a clear price before you start and follow up with an invoice when you’re ready.',
              tags: ['Quotes', 'Billing'],
              demoUrl: ''
            },
            {
              id: 'customer-messaging',
              title: 'Customer messaging',
              summary:
                'Customers reach you inside your brand instead of only through personal texts or scattered social DMs.',
              tags: ['Messages', 'Support'],
              demoUrl: ''
            },
            {
              id: 'card-payments',
              title: 'Card payments online',
              summary:
                'Take payment by card at booking or checkout instead of cash-only or chasing payment after the job.',
              tags: ['Get paid', 'Cards'],
              demoUrl: ''
            },
            {
              id: 'team-updates',
              title: 'Photos & updates from your team',
              summary:
                'Staff attach photos and notes from a job or visit so the office stays in the loop without extra calls.',
              tags: ['Proof of work', 'Stay in sync'],
              demoUrl: BOOKING_DEMO_URL
            }
          ]
        },
        {
          id: 'scale',
          title: 'Phone apps & repeat business',
          cards: [
            {
              id: 'phone-apps',
              title: 'Phone apps for customers & staff',
              summary:
                'iPhone and Android apps alongside your website — for booking, payments, and day-to-day operations on the go.',
              tags: ['iPhone', 'Android', 'Operations'],
              demoUrl: ''
            },
            {
              id: 'recurring-routes',
              title: 'Recurring visits & routes',
              summary:
                'Repeat appointments, memberships, or weekly routes without re-explaining pricing every time.',
              tags: ['Repeat customers', 'Schedules'],
              demoUrl: ''
            },
            {
              id: 'works-on-the-go',
              title: 'Works when you’re on the go',
              summary:
                'Important updates still go through when your team is out in the field, not only at a desk.',
              tags: ['Mobile', 'Reliable'],
              demoUrl: BOOKING_DEMO_URL
            },
            {
              id: 'custom-build',
              title: 'Fully custom product',
              summary:
                'Memberships, alerts, different access for staff vs customers, and full handoff when you want to own everything.',
              tags: ['Built for you', 'Your rules'],
              demoUrl: ''
            }
          ]
        }
      ],

      existingApp: [
        {
          id: 'improve',
          title: 'Add to what you have',
          cards: [
            {
              id: 'rebrand-proven-flow',
              title: 'Rebrand a proven booking flow',
              summary:
                'Swap in your logo, services, and pricing on a setup that already works — faster than building from scratch.',
              tags: ['Your brand', 'Fast launch'],
              demoUrl: BOOKING_DEMO_URL,
              featured: true
            },
            {
              id: 'add-booking-deposits',
              title: 'Add booking & deposits',
              summary:
                'Let customers book, pay a deposit, and get reminders — even if you only have a contact form today.',
              tags: ['Bookings', 'Deposits'],
              demoUrl: BOOKING_DEMO_URL
            },
            {
              id: 'add-dashboard',
              title: 'Add a business dashboard',
              summary:
                'See new requests, what’s in progress, and what’s done — stop losing leads in text threads.',
              tags: ['Dashboard', 'Leads'],
              demoUrl: BOOKING_DEMO_URL
            },
            {
              id: 'add-payments',
              title: 'Add card payments',
              summary:
                'Move from cash-only, emailed invoices, or manual tracking to online checkout.',
              tags: ['Cards', 'Checkout'],
              demoUrl: ''
            },
            {
              id: 'add-messaging',
              title: 'Add customer messaging',
              summary:
                'Keep conversations inside your brand instead of only on personal phones.',
              tags: ['Messages', 'Support'],
              demoUrl: ''
            },
            {
              id: 'add-routes',
              title: 'Add routes & recurring schedules',
              summary:
                'Plan repeat visits or weekly routes when your team runs on timetables and locations.',
              tags: ['Routes', 'Repeat customers'],
              demoUrl: ''
            }
          ]
        },
        {
          id: 'assess',
          title: 'Not sure where to start?',
          cards: [
            {
              id: 'discovery-fit',
              title: 'Discovery call',
              summary:
                'A short call about what you have today, what’s frustrating, and what would help most.',
              tags: ['Clarity', 'No pressure'],
              demoUrl: ''
            },
            {
              id: 'priority-backlog',
              title: 'Your improvement plan',
              summary:
                'A prioritized list — quick wins first, then bigger items that save time or bring in more business.',
              tags: ['Roadmap', 'Priorities'],
              demoUrl: ''
            }
          ]
        }
      ]
    }
  };
})(typeof window !== 'undefined' ? window : global);
