/**
 * Starter content for the Template Outreach Scripts composer.
 *
 * This file is NOT referenced from any page. outreach-composer.js injects it
 * on demand, and only when RTDB `agencyOutreachScripts` is empty — so these
 * scripts are never served to a public visitor of the site, and after the
 * first seed the live copy lives in RTDB where you can edit it from the admin.
 *
 * Placeholders the composer fills: [Name], [Company], [City], [demo link].
 * Any other bracketed text (e.g. "[later today / tomorrow]") is left alone.
 *
 * Once RTDB is seeded this file is disposable — delete it and the composer
 * keeps working from RTDB.
 */
(function (global) {
  'use strict';

  global.OUTREACH_SCRIPT_SEEDS = [
    {
      id: 'realtor',
      label: 'Realtor & insurance',
      tag: 'Realtor & Insurance Platform',
      vertical: 'real estate and insurance offices',
      demoLink: '',
      order: 10,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build client portals for real estate & insurance offices. Listings or plans, quotes, signed docs, and messages in one branded app instead of split across email and DocuSign. Custom builds like this usually run $15k–$40k; I offer it as a fixed $3,500 package. [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — one place for listings, quotes & client docs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most real estate and insurance offices I talk to in [City] are juggling listings or plans, quote requests, signed documents, and client messages across email, DocuSign, and text — easy for something to slip through.\n' +
        '\n' +
        'I build a branded platform that puts all of it in one place: property or plan browsing, a guided quote flow, a client portal for documents and payments, and direct messaging — plus an admin dashboard for leads and policies.\n' +
        '\n' +
        'A custom platform like this usually costs $15,000–$40,000 from an agency. I offer it as our Growth Platform package: a fixed $3,500, 50% to start, launched in about 3–4 weeks.\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll send a one-pager and hold 15 minutes — fit call, not a pitch deck — to see if it maps to how your office runs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build client portals for real estate and insurance offices in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "It’s one branded app for listings or plans, quotes, signed docs, and client messages — instead of split across email, DocuSign, and text. Custom builds like this usually run $15k to $40k. I do it as a fixed $3,500 package. Worth a 15-minute look at how it’d fit [Company]?"'
    },
    {
      id: 'lawn',
      label: 'Lawn & landscape',
      tag: 'Lawnscaper Platform',
      vertical: 'lawn care and landscape crews',
      demoLink: 'https://lawncare.expo.app',
      order: 20,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build scheduling apps for lawn & landscape crews. Recurring routes, seasonal add-ons, and deposits, so you’re not re-quoting prices in a text thread every week. [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — routes & pricing off of text threads?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most lawn and landscape crews I talk to in [City] are running recurring routes and seasonal add-ons over text — re-explaining pricing every week and chasing payment after the job is done.\n' +
        '\n' +
        'I build a branded scheduling app for lawn care crews: customers book recurring service, add seasonal work, and pay through the app — you see every route and job in one dashboard instead of a group chat.\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll send a one-pager and hold 15 minutes — fit call, not a pitch deck — to see if it matches how your crew runs routes today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build scheduling apps for lawn and landscape crews in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Customers book recurring routes and seasonal add-ons right from their phone, and it’s all in one dashboard for you — no more re-quoting in texts. Worth a 15-minute look?"'
    },
    {
      id: 'trades',
      label: 'Trade services',
      tag: 'Trade Services Platform (reference demo)',
      vertical: 'trade crews',
      demoLink: 'https://tradeservice.expo.app',
      order: 30,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for [trade] crews in [City]. Customers pick a service and time slot and pay a deposit up front, so you’re not chasing calls. https://tradeservice.expo.app\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — fewer calls, more booked jobs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most [trade] crews I talk to in [City] are still running scheduling through phone tag and texts — and it’s easy for a job to slip through the cracks between the quote and the deposit.\n' +
        '\n' +
        'I build a branded booking app for trade crews: customers pick a service, a time slot, and pay a deposit before you show up — you see every request and job status in one dashboard. Live reference build: https://tradeservice.expo.app\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll send a one-pager and hold 15 minutes — fit call, not a pitch deck — to see if it maps to how you run jobs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I’m reaching out to a few [City] [roof / plumbing / HVAC / electrical] shops. We set up a ready-made customer booking flow — schedule, deposit, reminders — so small crews spend less time on phone tag. Have I caught you for 20 seconds, or is [later today / tomorrow morning] better?"\n' +
        '[continue] "Rather than describe it — I’ll show you what the homeowner sees and what you see on your side. Are you open [Option A] or [Option B] for a quick share?"'
    },
    {
      id: 'salon',
      label: 'Salon / barber / tattoo',
      tag: 'Salon / Barber / Tattoo Platform (reference demo)',
      vertical: 'barbers, salons, and tattoo studios',
      demoLink: 'https://barbershoptemplate.expo.app',
      order: 40,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for salons, barbershops & tattoo studios. Clients pick a stylist or artist, book a slot, and pay a deposit, so no more DMs at 11pm. https://barbershoptemplate.expo.app\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — still booking through IG DMs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most salons, barbershops, and tattoo studios I talk to in [City] are still booking through Instagram DMs and texts — easy to lose track of who’s confirmed and who’s a no-show.\n' +
        '\n' +
        'I build a branded booking app for appearance-based businesses: clients pick a stylist or artist, a service, and a time slot, and pay a deposit up front — you see your whole day in one dashboard. Reference build: https://barbershoptemplate.expo.app\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll send a one-pager and hold 15 minutes — fit call, not a pitch deck — to see if it fits your shop.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking apps for salons, barbershops, and tattoo studios in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Clients book a stylist or artist and a time slot right from their phone, deposit included — instead of DMs and no-shows. Worth a 15-minute look?"'
    },
    {
      id: 'electrician',
      label: 'Electrician',
      tag: 'Electrician Platform (Sunergy Electric demo)',
      vertical: 'electrical contractors',
      demoLink: 'https://sunergyelectricservices.expo.app',
      order: 42,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for electricians in [City]. Homeowners request panel upgrades, EV chargers, or wiring work with the details up front, and your techs see the job on their phone. Here’s a live electrician build: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — quote requests with the job details already filled in?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most electrical contractors I talk to in [City] get quote requests as missed calls and vague texts — “need an outlet looked at” — and spend the callback just figuring out what the job is.\n' +
        '\n' +
        'I build a branded app for electricians: homeowners pick the service (panel upgrade, EV charger, wiring, troubleshooting), describe the job, and request a quote or a visit. You see every request in one dashboard, and your field techs get their jobs on their phone.\n' +
        '\n' +
        'Here’s a live electrician build you can tap through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll hold 15 minutes — fit call, not a pitch deck — to see if it maps to how you run jobs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking apps for electricians in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow morning] better?"\n' +
        '[continue] "Homeowners request a panel upgrade, EV charger, or wiring job with the details already filled in, and your techs see it on their phone — fewer callbacks just to figure out the job. I can send you a live electrician build right now. Worth a 15-minute look?"'
    },
    {
      id: 'carpet',
      label: 'Carpet & upholstery cleaning',
      tag: 'Carpet Cleaning Platform (Master’s Carpet demo)',
      vertical: 'carpet and upholstery cleaners',
      demoLink: 'https://carpet.expo.app',
      order: 44,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for carpet cleaners in [City]. Customers pick carpet, upholstery, or floors, tell you the rooms, and request a quote, with no back-and-forth to price the job. Here’s a live carpet cleaning build: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — quotes without the “how many rooms?” back-and-forth?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most carpet cleaners I talk to in [City] spend half their calls just pricing the job — how many rooms, any stairs, a couch too? — and a lot of those callers never book.\n' +
        '\n' +
        'I build a branded app for carpet and upholstery cleaners: customers pick carpet, upholstery, or floor cleaning, tell you the rooms, and request a free quote or a time. You see every request in one dashboard, and your crew sees the day’s jobs on their phone.\n' +
        '\n' +
        'Here’s a live carpet cleaning build you can tap through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll hold 15 minutes — fit call, not a pitch deck — to see if it fits how you book jobs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking apps for carpet cleaners in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Customers pick carpet, upholstery, or floors, tell you the rooms, and request a quote from their phone — so you’re not pricing every job over the phone. I can text you a live carpet cleaning build. Worth a 15-minute look?"'
    },
    {
      id: 'grooming',
      label: 'Dog grooming & pet wash',
      tag: 'Pet Grooming Platform (Paws & Shine demo)',
      vertical: 'dog groomers and pet wash shops',
      demoLink: 'https://pawshine.expo.app',
      order: 46,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for dog groomers in [City]. Owners pick a wash or groom, their dog’s size, and a time, so no more booking through DMs and voicemail. Here’s a live grooming build: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — grooming appointments without the DMs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most groomers I talk to in [City] are booking through Instagram DMs, texts, and voicemail — while they’re in the middle of a groom — and it’s easy to double-book or lose a regular.\n' +
        '\n' +
        'I build a branded booking app for groomers and pet wash shops: owners pick a wash or full groom, their dog’s size, and a time, or request a free groom quote. You see your whole day in one dashboard, and your team sees it too.\n' +
        '\n' +
        'Here’s a live grooming build you can tap through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll hold 15 minutes — fit call, not a pitch deck — to see if it fits your shop.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking apps for dog groomers in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Owners book a wash or groom for their dog’s size right from their phone, so you’re not answering DMs mid-groom. I can send you a live grooming build right now. Worth a 15-minute look?"'
    },
    {
      id: 'roof-exterior',
      label: 'Roof cleaning & exterior wash',
      tag: 'Roof & Exterior Platform (Trade Service Specialists demo)',
      vertical: 'roof cleaning and exterior washing crews',
      demoLink: 'https://roofcleaning.expo.app',
      order: 48,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking apps for roof cleaning & exterior crews in [City]. Homeowners pick roof cleaning, moss removal, or a house wash, send the address, and request a quote, with no site visit just to price it. Here’s a live build: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — roof & exterior quotes with the address already in?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most roof cleaning and exterior crews I talk to in [City] burn time on calls and drive-bys just to price a job — and homeowners who wait for a callback often book someone else.\n' +
        '\n' +
        'I build a branded app for roof and exterior crews: homeowners pick roof cleaning, moss removal, or exterior washing, add their address and job details, and request a free quote. You see every request in one dashboard, and your crew sees the jobs on their phone.\n' +
        '\n' +
        'Here’s a live roof and exterior build you can tap through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll hold 15 minutes — fit call, not a pitch deck — to see if it maps to how you run jobs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking apps for roof cleaning and exterior crews in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow morning] better?"\n' +
        '[continue] "Homeowners pick roof cleaning, moss removal, or a house wash, drop their address, and request a quote from their phone — fewer drive-bys just to price a job. I can send you a live build right now. Worth a 15-minute look?"'
    },
    {
      id: 'tree',
      label: 'Tree service',
      tag: 'Tree Service Platform (Tree Service demo)',
      vertical: 'tree service companies',
      demoLink: 'https://treeservice.expo.app',
      order: 49,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking sites for tree service companies in [City]. Homeowners pick trimming, removal, or stump grinding, add the address, and request an estimate before you even call back. Here’s a live build: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — tree job requests with the address already in?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most tree service companies I talk to in [City] are pricing jobs over the phone and driving out just to see the tree — and homeowners who wait for a callback often call the next company on the list.\n' +
        '\n' +
        'I build a branded booking site for tree crews: homeowners pick trimming, removal, or stump grinding, add their address and job details, and request an estimate or a time before you even call back. You see every request in one dashboard.\n' +
        '\n' +
        'Here’s a live tree service build you can tap through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll hold 15 minutes — fit call, not a pitch deck — to see if it maps to how you run jobs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking sites for tree service companies in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Homeowners request trimming, removal, or stump grinding with their address from their phone, so you’re not driving out just to price a job. I can send you a live build right now. Worth a 15-minute look?"'
    },
    {
      id: 'lawn-ads',
      label: 'Lawn & landscape — running ads',
      tag: 'Running Ads · No Website — Lawn & Landscape',
      vertical: 'lawn care and landscape crews',
      demoLink: 'https://lawncare.expo.app',
      order: 50,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking pages for lawn & landscape crews in [City]. Saw your ad running. The link goes to your Facebook page, so anyone ready to book has to message you and wait. Here’s that same traffic landing on a page that takes the address and the service instead: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — your ad sends people to Facebook, not a quote',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads — the link goes to your Facebook page. That means someone ready to book has to message you and then wait for a reply, and most people don’t wait.\n' +
        '\n' +
        'The fix isn’t a bigger ad budget. It’s sending that same traffic to a page that takes the address, the yard size, and the service they want, then puts the request in front of you.\n' +
        '\n' +
        '[demo link]\n' +
        '\n' +
        'That’s a live build you can tap through right now. If it looks like it’d fit [Company], I’ll hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking pages for lawn and landscape crews in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "I noticed you’re running ads that point at your Facebook page. You’re already paying for those clicks — I build the page that turns them into quote requests with the address and service already filled in. Worth a 15-minute look?"'
    },
    {
      id: 'cleaning-ads',
      label: 'Cleaning — running ads',
      tag: 'Running Ads · No Website — Cleaning',
      vertical: 'cleaning and field service crews',
      demoLink: 'https://procleaning.expo.app',
      order: 60,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking pages for cleaning crews in [City]. Saw your ad. It lands on your Facebook page, so someone ready to book has to message for a price, then message again for a time. Here’s what that ad could land on instead: [demo link]\n\nThey pick the type of clean, the beds and baths, a date, and leave a deposit. Worth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — paying for ads that land on a Facebook page?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads, and the link goes to your Facebook page. Someone ready to book a clean has to message you, wait for a price, and then wait again to pick a time — that’s three chances to lose them.\n' +
        '\n' +
        'I build the page that ad should land on: they pick the type of clean, how many beds and baths, a date, and pay a deposit — before you ever pick up the phone. Recurring customers rebook themselves.\n' +
        '\n' +
        '[demo link]\n' +
        '\n' +
        'That’s a live cleaning build you can tap through. If it fits how [Company] runs, I’ll hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking pages for cleaning crews in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "You’re running ads that land on Facebook, so every booking starts as a DM asking for a price. I build the page that quotes and books them without you touching it — and takes the deposit. Worth a 15-minute look?"'
    },
    {
      id: 'trades-ads',
      label: 'Trade services — running ads',
      tag: 'Running Ads · No Website — Trades',
      vertical: 'trade crews',
      demoLink: 'https://tradeservice.expo.app',
      order: 70,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking pages for trade crews in [City]. Saw your ad. It points at your Facebook page, so you paid for a click from someone with a problem right now, then asked them to send a message and wait. Here’s where that click could go instead: [demo link]\n\nService, time slot, deposit, before you drive out. Worth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — ad traffic going to Facebook instead of your calendar',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads and the link points at your Facebook page. For a trade, that’s the expensive kind of leak — you paid for a click from someone with a problem right now, and then asked them to send a message and wait.\n' +
        '\n' +
        'I build the page that ad should land on: they pick the service, describe the job, choose a time slot, and leave a deposit. You see the request and the job status in one dashboard instead of phone tag.\n' +
        '\n' +
        '[demo link]\n' +
        '\n' +
        'That’s a live build you can tap through right now. If it maps to how [Company] runs jobs, I’ll hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking pages for trade crews in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "You’re running ads pointed at Facebook. Someone with a burst pipe clicks, has to DM you, and calls the next guy while they wait. I build the page that books the job and takes the deposit instead. Worth a 15-minute look?"'
    },
    {
      id: 'salon-ads',
      label: 'Salon / barber — running ads',
      tag: 'Running Ads · No Website — Salon / Barber',
      vertical: 'barbers, salons, and tattoo studios',
      demoLink: 'https://barbershoptemplate.expo.app',
      order: 80,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build booking pages for shops in [City]. Saw your ad. It lands on your IG, so a ready-to-book client ends up in your DMs next to every other message, and you book after hours. Here’s what it could land on instead: [demo link]\n\nBarber, service, time, deposit, no DM needed. Worth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — ads pointing at your IG instead of your books',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads that land on your Instagram. That sends a ready-to-book client into your DMs, where they sit next to every other message — and you end up booking after hours.\n' +
        '\n' +
        'I build the page that ad should land on: they pick the barber or stylist, the service, and a time, and leave a deposit so no-shows cost them instead of you. Your whole day shows up in one dashboard.\n' +
        '\n' +
        '[demo link]\n' +
        '\n' +
        'That’s a live build you can tap through. If it fits your shop, I’ll hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking pages for barbershops and salons in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Your ads point at your IG, so every booking starts as a DM and you’re answering them at 11pm. I build the page that books the chair and takes the deposit — no-shows cost them instead of you. Worth a 15-minute look?"'
    },
    {
      id: 'no-site-ig',
      label: 'No website — Instagram DM',
      tag: 'No Website · Instagram DM (risk-reversal)',
      vertical: 'local businesses on Instagram without a website',
      demoLink: '',
      order: 90,
      text: 'Hey! I’m Ruben with @codewithruben. I know you’re busy, so I’ll cut right to the chase: I noticed [Company] doesn’t have a website up yet. I’m happy to build you one to your needs, with changes along the way, and you only pay if you like the final result. No deposit required. Want to see a quick mockup?\n\nFor reference, [package], with your first month of care included.\n\nNot ready for a full site? I also build a custom link page for your Instagram bio (a branded Linktree), live in a few days from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: [Company] — free mockup for a simple website?',
      email:
        'Hi,\n' +
        '\n' +
        'I\'m Ruben with CodeWithRuben (@codewithruben). I noticed [Company] doesn\'t have a website up yet.\n' +
        '\n' +
        'Happy to build you one to your needs, with changes along the way — you only pay if you like the final result. No deposit required.\n' +
        '\n' +
        'Want me to put together a quick mockup?\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Not ready for a full website yet? I also build a custom link page for your Instagram bio — a branded Linktree with your logo, services, and booking or contact buttons. It’s live in a few days, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this the owner for [Company]? This is Ruben with CodeWithRuben. Have I caught you for 20 seconds?"\n' +
        '[continue] "I noticed you\'re on Instagram but don\'t have a website yet. I can build one to your needs — changes along the way, no deposit, and you only pay if you like the final result. Want me to send a quick mockup?"\n' +
        '[if not ready for a site] "No problem — I can start you with a custom link page for your Instagram bio, a branded Linktree. Live in a few days, from $99. Want me to text you an example?"\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."'
    },
    {
      id: 'no-site-ig-trades',
      label: 'No website — IG · trades / junk / field',
      tag: 'No Website · IG DM · Trades / Junk / Field',
      vertical: 'trade, junk removal, and field service crews',
      demoLink: 'https://tradeservice.expo.app',
      order: 100,
      text: 'Hey! I’m Ruben with @codewithruben. I know you’re busy, so I’ll cut right to the chase: I noticed [Company] doesn’t have a website up yet. I’m happy to build you a simple site (and booking if you want it) to your needs, with changes along the way. You only pay if you like the final result. No deposit required. Want a quick mockup?\n\nLive example: [demo link]\n\nFor reference, [package], with your first month of care included.\n\nNot ready for a full site? I also build a custom link page for your Instagram bio (a branded Linktree), live in a few days from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: [Company] — mockup for a site (no deposit)?',
      email:
        'Hi,\n' +
        '\n' +
        'I\'m Ruben with CodeWithRuben (@codewithruben). I noticed [Company] in [City] doesn\'t have a website up yet — mostly Instagram / Google.\n' +
        '\n' +
        'Happy to build you a simple site to your needs (booking + quote flow optional), with changes along the way. You only pay if you like the final result — no deposit required.\n' +
        '\n' +
        'Live example you can tap through: [demo link]\n' +
        '\n' +
        'Want a quick mockup for [Company]?\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Not ready for a full website yet? I can start you with a custom link page for your Instagram bio — a branded Linktree with your logo, services, and a quote or booking button. Live in a few days, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben. Got 20 seconds?"\n' +
        '[continue] "I saw you\'re active online but don\'t have a website yet. I can build one to your needs — changes along the way, no deposit, pay only if you like it. Want me to send a mockup, or a live booking demo?"\n' +
        '[if not ready for a site] "No problem — I can start you with a custom link page for your Instagram bio, a branded Linktree. Live in a few days, from $99. Want me to text you an example?"\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."'
    },
    {
      id: 'no-site-ig-bump',
      label: 'No website — IG follow-up bump',
      tag: 'No Website · Instagram DM · Follow-up',
      vertical: 'local businesses on Instagram without a website',
      demoLink: '',
      order: 110,
      text: 'Hey, Ruben again. I know you’re busy, so I’ll keep this quick: still happy to put together a mockup for [Company] at no cost and no deposit. You only pay if you like how it looks. Want me to send one over?\n\nFor reference, [package], with your first month of care included.\n\nOr if a full site is too much right now, I can start you with a custom link page for your Instagram bio (a branded Linktree), from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: Re: mockup for [Company]?',
      email:
        'Hi,\n' +
        '\n' +
        'Quick bump — still glad to put a mockup together for [Company]. No deposit, and you only pay if you like the final result.\n' +
        '\n' +
        'Want me to send one over?\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Or, if a full site is too much right now, I can start you with a custom link page for your Instagram bio — a branded Linktree, live in a few days from $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — Ruben again with CodeWithRuben, quick follow-up on [Company]. Still open to a free mockup — no deposit, pay only if you like it?"\n' +
        '[if not ready for a site] "Totally fine — I can start you with a branded link page for your Instagram bio instead. From $99. Want an example?"\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."'
    },
    {
      id: 'restaurant',
      label: 'Restaurant & pizzeria',
      tag: 'Restaurant Ordering Platform (CWR restaurant template) · call between 2–4pm, never during the lunch or dinner rush',
      vertical: 'local restaurants, pizzerias, and takeout kitchens',
      demoLink: 'https://pizza.expo.app',
      order: 92,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so I’ll cut right to the chase: I build online ordering for local restaurants. Customers order and pay ahead for pickup, and it lands on a kitchen screen, with no 15–30% delivery-app cut. A local pizzeria I built this for saw online orders go up 40%.\n\nLive demo you can order from: [demo link]\n\nWant me to set one up with [Company]’s menu?',
      subject: 'Subject: [Company] — your own online ordering (no app fees)',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I’m Ruben with CodeWithRuben here in [City]. Most restaurants I talk to are either missing calls during the rush or giving DoorDash and Uber Eats 15–30% of every order.\n' +
        '\n' +
        'I build branded online ordering for local restaurants: customers browse your menu, add extras and a tip, pay ahead for pickup, and track their order live. Your kitchen sees every order on one board, can mark items sold out, and can switch ordering off when you’re slammed.\n' +
        '\n' +
        'A local pizzeria I built this for saw online orders go up 40%.\n' +
        '\n' +
        'Live demo you can order from: [demo link]\n' +
        '\n' +
        'It also runs pop-up event and promo banners, and can take catering and event orders. Want me to set it up with [Company]’s menu so you can see it?\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. I know you’re busy — got 20 seconds?"\n' +
        '[continue] "I build online ordering for local restaurants. People order and pay ahead for pickup, and it shows up on a kitchen screen, with no delivery-app cut on each order."\n' +
        '[if they use DoorDash / Uber Eats] "Keep them for delivery if they work. This is for your regulars, so those orders stop losing 15–30%."\n' +
        '[close] "A pizzeria I built this for saw online orders go up 40%. Can I text you the live demo?"'
    },
    {
      id: 'restaurant-ads',
      label: 'Restaurant — running ads',
      tag: 'Running Ads · Restaurant (the ad sends people to Facebook or a delivery app)',
      vertical: 'local restaurants, pizzerias, and takeout kitchens',
      demoLink: 'https://pizza.expo.app',
      order: 93,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. Saw [Company]’s ad. Quick thought: it sends people to Facebook or a delivery app, so either they wait on a reply and order somewhere else, or the app takes 15–30%. I build ordering pages that take the order and payment straight from the ad, with no app cut.\n\nLive demo: [demo link]\n\nWant one with your menu?',
      subject: 'Subject: [Company] — your ad is paying a delivery app',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads — nice. The link goes to Facebook or a delivery app, which means someone hungry right now either waits on a reply or pays through an app that keeps 15–30% of the order.\n' +
        '\n' +
        'The fix is not a bigger ad budget. It is sending that same traffic to your own ordering page: they pick from your menu, pay, and the order lands on your kitchen screen.\n' +
        '\n' +
        'Live demo you can order from: [demo link]\n' +
        '\n' +
        'A local pizzeria I built this for saw online orders go up 40%. If it looks like a fit for [Company], I will hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. Got 20 seconds?"\n' +
        '[continue] "I saw your ad — it sends people to Facebook / a delivery app. I build ordering pages so that ad traffic orders and pays with you directly, no app cut."\n' +
        '[close] "Can I text you a live demo to tap through?"'
    },
    {
      id: 'food-truck',
      label: 'Food truck / pop-up / caterer',
      tag: 'Food Truck · Pop-up · Caterer (open/closed toggle, event banner, pre-orders, catering requests)',
      vertical: 'food trucks, pop-ups, and caterers',
      demoLink: 'https://pizza.expo.app',
      order: 94,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so I’ll cut right to the chase: I build ordering apps for food trucks and pop-ups. Customers see where you’ll be next, order and pay ahead, and get notified when it’s ready. You flip ordering on and off from your phone, and it takes catering and event requests too.\n\nLive demo: [demo link]\n\nWant one set up for [Company]?',
      subject: 'Subject: [Company] — pre-orders + where you’ll be next',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I’m Ruben with CodeWithRuben here in [City]. Food trucks and pop-ups I talk to lose orders to the line — people see the wait, or can’t find where you’ll be next, and leave.\n' +
        '\n' +
        'I build ordering apps for trucks, pop-ups, and caterers: a live banner with your next stop or event, pay-ahead pre-orders, live “ready” tracking, and one switch to open or close ordering from your phone. It can also take catering and event requests, so private bookings come to you directly.\n' +
        '\n' +
        'Live demo you can order from: [demo link]\n' +
        '\n' +
        'Want me to set it up with [Company]’s menu?\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. Got 20 seconds?"\n' +
        '[continue] "I build ordering apps for food trucks and pop-ups — people see your next stop, pre-order and pay, and you turn ordering on or off from your phone."\n' +
        '[if they cater] "It can also take catering and event requests, so those come straight to you."\n' +
        '[close] "Can I text you the live demo?"'
    },
    {
      id: 'photographer',
      label: 'Photographer — weddings & quince',
      tag: 'Photographer Booking Platform (CWR photographer template) · send photographer.expo.app/es to Spanish-speaking leads',
      vertical: 'wedding, quinceañera, and portrait photographers',
      demoLink: 'https://photographer.expo.app',
      order: 95,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so I’ll cut right to the chase: I build booking sites for wedding and quinceañera photographers in [City]. Clients see your packages, pick their date, and pay the retainer online, instead of “how much for a quince?” in your DMs. English and Spanish pages included. Live demo: [demo link]\n\nWorth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — book dates and retainers without the DMs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most wedding and quinceañera photographers I talk to in [City] book through Instagram DMs: “how much?”, “are you free on the 14th?”, then chasing the retainer over Venmo and sending the contract as a PDF.\n' +
        '\n' +
        'I build booking sites for photographers that handle that part for you. Clients browse your gallery by session type, compare your packages, pick their date, and pay the retainer to hold it. After that they get a client portal with their session status, balance due, and contract in one place. Every page comes in English and Spanish, so families searching in Spanish find you too.\n' +
        '\n' +
        'Here’s a live demo you can click through: [demo link]\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll set it up with your packages and hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben with CodeWithRuben — I build booking sites for wedding and quinceañera photographers in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Most of your bookings probably start as a DM asking for prices. This lets clients see your packages, pick a date, and pay the retainer online, then follow their session and contract in a client portal. English and Spanish."\n' +
        '[if they say DMs work fine] "Keep Instagram for showing your work. This just takes the back-and-forth off your phone once someone is ready to book."\n' +
        '[close] "Can I text you the live demo?"'
    },
    {
      id: 'photographer-ads',
      label: 'Photographer — running ads',
      tag: 'Running Ads — Photographer · send photographer.expo.app/es to Spanish-speaking leads',
      vertical: 'wedding, quinceañera, and portrait photographers',
      demoLink: 'https://photographer.expo.app',
      order: 96,
      text: '[Name] — this is Ruben with CodeWithRuben. I know you’re busy, so I’ll cut right to the chase: I saw your ad. It lands on your Instagram, so a couple ready to book ends up in your DMs asking for prices, and some book someone else before you reply. Here’s what it could land on instead: [demo link]\n\nPackages, date, and retainer, no DM needed. Worth a 2-minute look? Reply STOP to opt out.',
      subject: 'Subject: [Company] — your ads are landing in your DMs',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I saw [Company] running ads that land on your Instagram. That sends a couple who is ready to book into your DMs to ask about prices and dates, and by the time you reply, some have booked someone else.\n' +
        '\n' +
        'I build the page that ad should land on: they see your packages, check your date, and pay the retainer to hold it, in English or Spanish. Their contract and balance live in a client portal, so you’re not chasing either one.\n' +
        '\n' +
        '[demo link]\n' +
        '\n' +
        'That’s a live demo you can click through. If it fits [Company], I’ll hold 15 minutes — fit call, not a pitch deck.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build booking sites for wedding and quinceañera photographers in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "Your ads point at your Instagram, so every lead starts as a DM asking how much. I build the page the ad lands on: packages, date, and the retainer paid online. Worth a 15-minute look?"'
    },
    {
      id: 'no-site-ig-photographer',
      label: 'No website — IG · photographer',
      tag: 'No Website · IG DM · Photographer · send photographer.expo.app/es to Spanish-speaking leads',
      vertical: 'photographers on Instagram without a website',
      demoLink: 'https://photographer.expo.app',
      order: 105,
      text: 'Hey! I’m Ruben with @codewithruben. I know you’re busy, so I’ll cut right to the chase: your Instagram already shows your work, but [Company] doesn’t have a website where clients can book. I build booking sites for photographers: packages, date, and retainer online, in English and Spanish. You only pay if you like the final result. No deposit required. Want a quick mockup?\n\nLive example: [demo link]\n\nFor reference, [package], with your first month of care included.\n\nNot ready for a full site? I also build a custom link page for your Instagram bio (a branded Linktree), live in a few days from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: [Company] — a booking site to go with your Instagram?',
      email:
        'Hi,\n' +
        '\n' +
        'I\'m Ruben with CodeWithRuben (@codewithruben). Your Instagram already shows your work, but [Company] doesn\'t have a website yet, so every booking starts as a DM.\n' +
        '\n' +
        'Happy to build you a booking site to your needs: your gallery by session type, your packages, and online booking that takes the retainer to hold the date, with English and Spanish pages. Changes along the way, and you only pay if you like the final result. No deposit required.\n' +
        '\n' +
        'Live example you can click through: [demo link]\n' +
        '\n' +
        'Want a quick mockup for [Company]?\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Not ready for a full website yet? I can start you with a custom link page for your Instagram bio — a branded Linktree with your logo, packages, and a booking or contact button. Live in a few days, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben. Got 20 seconds?"\n' +
        '[continue] "I saw your work on Instagram but couldn\'t find a website to book you. I build booking sites for photographers: packages, date, and the retainer paid online, in English and Spanish. No deposit, and you only pay if you like it. Want me to send a mockup or the live demo?"\n' +
        '[if not ready for a site] "No problem — I can start you with a custom link page for your Instagram bio, a branded Linktree. Live in a few days, from $99. Want me to text you an example?"\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."'
    },
    {
      id: 'site-down',
      label: 'Website down / error',
      tag: 'Website Down · Heads-up (site not loading or showing an error) · check it again right before you send',
      vertical: 'local businesses whose website is down or erroring',
      demoLink: '',
      order: 115,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. Quick heads-up: I tried [Company]’s website and it isn’t loading right now (it shows an error), so customers searching for you may be hitting the same thing. I build websites and booking apps for local service businesses, and you’d keep your same domain. Want me to send a quick mockup?\n\nHere’s one I built: [demo link]\n\nFor reference, [package], with your first month of care included.\n\nIn the meantime, I can also put up a custom link page (a branded Linktree) so customers can still reach you while the site is down, live in a day or two from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: Heads up — [Company]’s website is down',
      email:
        'Hi [Name],\n' +
        '\n' +
        'This is Ruben with CodeWithRuben here in [City]. Heads up — I noticed [Company]’s website is currently down (it isn’t loading / shows an error).\n' +
        '\n' +
        'I build websites and apps for local service businesses. Here’s one I built: [demo link]\n' +
        '\n' +
        'You’d keep your same domain. Happy to help either way.\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'In the meantime, I can put up a custom link page — a branded Linktree with your phone, services, and booking or contact buttons — so customers can still reach you while the site is down. It’s live in a day or two, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. Got 20 seconds?"\n' +
        '[continue] "Quick heads-up — I tried your website today and it isn’t loading, it shows an error. Were you aware?"\n' +
        '[if no] "Customers searching for you are probably hitting the same thing. I build websites for local businesses, and you’d keep your same domain. Want me to send you a quick mockup or a fix-it plan?"\n' +
        '[if yes] "Got it. If you want a hand getting it back up, or a fresh site on the same domain, I can send a quick mockup. No pressure either way."\n' +
        '[stopgap] "While it’s down, I can also put up a branded link page so customers can still reach you — live in a day or two, from $99."\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."'
    },
    {
      id: 'site-outdated',
      label: 'Website outdated',
      tag: 'Website Problems · Outdated (old design, not mobile-friendly, slow) · open their site on your phone first so you can be specific',
      vertical: 'local businesses with an outdated website',
      demoLink: '',
      order: 116,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so I’ll cut right to the chase: I pulled up [Company]’s website on my phone and it’s hard to use there, which is where most of your customers are looking. I can rebuild it mobile-friendly, keep your content and the same web address, and add online booking or estimate requests.\n\nHere’s one I built: [demo link]\n\nFor reference, [package], with your first month of care included.\n\nNot ready for a full rebuild? I also build a custom link page for your Instagram bio (a branded Linktree), from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: A fresh, mobile-friendly site for [Company]?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I’m Ruben with CodeWithRuben here in [City]. I came across [Company]’s website and pulled it up on my phone — it’s hard to use there, and that’s where most of your customers are looking.\n' +
        '\n' +
        'I’d love to give it a fresh, mobile-friendly rebuild: same content, same web address, nothing lost, plus a way for customers to book or request an estimate right from the site.\n' +
        '\n' +
        'Here’s one I built: [demo link]\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Not ready for a full rebuild? I also build a custom link page for your Instagram bio — a branded Linktree with your logo, services, and booking or contact buttons. It’s live in a few days, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        'Want me to put together a quick mockup of the new homepage?\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. Got 20 seconds?"\n' +
        '[continue] "I pulled up your website on my phone and it’s tough to use there. I rebuild sites mobile-friendly — same content, same web address — and add online booking or estimate requests."\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."\n' +
        '[if not ready for a site] "No problem — I can start you with a custom link page for your Instagram bio. Live in a few days, from $99. Want me to text you an example?"\n' +
        '[close] "Want me to send a quick mockup of what the new homepage could look like?"'
    },
    {
      id: 'site-platform',
      label: 'Upgrade from WordPress / Wix / Squarespace',
      tag: 'Website Problems · Platform upgrade (paying a builder monthly, plugins breaking, no booking) · check the footer or page source to confirm the platform',
      vertical: 'businesses on WordPress, Wix, Squarespace, or GoDaddy builders',
      demoLink: '',
      order: 117,
      text: 'Hey! I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so I’ll cut right to the chase: I noticed [Company]’s site is on a website builder. A lot of owners I talk to are paying for the builder plus add-ons every month and still don’t have online booking. I can move you to a custom, mobile-friendly site — same content, same web address — with booking or estimate requests built in, and hosting included in your care plan.\n\nHere’s one I built: [demo link]\n\nFor reference, [package], with your first month of care included.\n\nNot ready for a full move? I also build a custom link page for your Instagram bio (a branded Linktree), from $99: rubenjimenez.dev/link-in-bio',
      subject: 'Subject: [Company] — off the website builder, with booking built in',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I’m Ruben with CodeWithRuben here in [City]. I noticed [Company]’s site runs on a website builder (WordPress, Wix, Squarespace and similar). Most owners I talk to are paying for the builder plus add-ons every month, fixing plugins that break after updates, and still don’t have a simple way for customers to book.\n' +
        '\n' +
        'I can move you to a custom, mobile-friendly site: same content, same web address, nothing lost, with online booking or estimate requests built in. Hosting comes included in your care plan, so you’re not paying for a builder and add-ons on top.\n' +
        '\n' +
        'Here’s one I built: [demo link]\n' +
        '\n' +
        'For reference, [package], with your first month of care included.\n' +
        '\n' +
        'Not ready for a full move? I also build a custom link page for your Instagram bio — a branded Linktree with your logo, services, and booking or contact buttons. It’s live in a few days, starting at $99. Example: rubenjimenez.dev/link-in-bio\n' +
        '\n' +
        'Want me to put together a quick mockup?\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben here in [City]. Got 20 seconds?"\n' +
        '[continue] "I noticed your site runs on a website builder. Are you paying for that plus add-ons every month?"\n' +
        '[if yes] "I move businesses to a custom, mobile-friendly site — same content and web address — with booking built in, and hosting is included in the care plan."\n' +
        '[if they ask the price] "For reference, [package], with your first month of care included."\n' +
        '[if not ready for a site] "No problem — I can start you with a custom link page for your Instagram bio. From $99. Want an example?"\n' +
        '[close] "Want me to send a quick mockup?"'
    },
    {
      id: 'landline',
      label: 'Landline — email/form first, then call',
      tag: 'Landline number · Text step = paste into their website contact form (use Copy, not Text) · call only after 3–4 days with no reply',
      vertical: 'businesses whose listed number is a landline',
      demoLink: '',
      order: 120,
      text:
        'Hi, I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so I’ll cut right to the chase: I build websites and booking apps for local service businesses, and I have a few ideas for [Company]. Here’s a live example: [demo link]\n' +
        '\n' +
        'Want a free mockup of your homepage? No commitment. You can reach me at (559) 653-7380 or ruben.jim.co@gmail.com.',
      subject: 'Subject: [Company] — free homepage mockup?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'I’m Ruben with CodeWithRuben here in [City]. I know you’re busy, so instead of a cold call I’ll cut right to the chase: I build websites and booking apps for local service businesses, so customers can request quotes and book online instead of waiting on a callback.\n' +
        '\n' +
        'Here’s a live example you can tap through: [demo link]\n' +
        '\n' +
        'If it’s useful, I’ll put together a free mockup of the [Company] homepage. No commitment. Just reply here and I’ll send it over.\n' +
        '\n' +
        'Not interested? Reply “no” and I won’t follow up.\n' +
        '\n' +
        '— Ruben\n' +
        'CodeWithRuben · (559) 653-7380 · rubenjimenez.dev',
      call:
        'Only call if there’s no reply 3–4 days after the email or contact form.\n' +
        '\n' +
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben with CodeWithRuben. I sent [Company] a quick note a few days ago about a free website mockup. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "I build websites and booking apps for local service businesses, so customers can request quotes online instead of waiting on a callback. I can send you the live example right now. Worth a 15-minute look?"\n' +
        '\n' +
        'Voicemail (under 20 seconds):\n' +
        '"Hi, this is Ruben with CodeWithRuben in [City]. I sent [Company] a note about a free website mockup. If you’d like to see it, call or text me at 559-653-7380. Thanks!"'
    }
  ];
})(window);
