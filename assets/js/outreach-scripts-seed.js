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
      text: '[Name] — this is Ruben, I build client portals for real estate & insurance offices. Listings or plans, quotes, signed docs, and messages — all in one branded app instead of split across email and DocuSign. Worth a 2-minute look? [demo link]',
      subject: 'Subject: [Company] — one place for listings, quotes & client docs?',
      email:
        'Hi [Name],\n' +
        '\n' +
        'Most real estate and insurance offices I talk to in [City] are juggling listings or plans, quote requests, signed documents, and client messages across email, DocuSign, and text — easy for something to slip through.\n' +
        '\n' +
        'I build a branded platform that puts all of it in one place: property or plan browsing, a guided quote flow, a client portal for documents and payments, and direct messaging — plus an admin dashboard for leads and policies.\n' +
        '\n' +
        'If it’s relevant for [Company], I’ll send a one-pager and hold 15 minutes — fit call, not a pitch deck — to see if it maps to how your office runs today.\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hi, is this [Name]? This is Ruben — I build client portals for real estate and insurance offices in [City]. Have I caught you for 20 seconds, or is [later today / tomorrow] better?"\n' +
        '[continue] "It’s one branded app for listings or plans, quotes, signed docs, and client messages — instead of split across email, DocuSign, and text. Worth a 15-minute look at how it’d fit [Company]?"'
    },
    {
      id: 'lawn',
      label: 'Lawn & landscape',
      tag: 'Lawnscaper Platform',
      vertical: 'lawn care and landscape crews',
      demoLink: 'https://lawncare.expo.app',
      order: 20,
      text: '[Name] — this is Ruben, I build scheduling apps for lawn & landscape crews. Recurring routes, seasonal add-ons, and deposits — no more re-quoting pricing in a text thread every week. Worth a 2-minute look? [demo link]',
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
      text: '[Name] — this is Ruben, I build booking apps for [trade] crews in [City]. Customers pick a service and time slot and pay a deposit up front, so you’re not chasing calls. Worth a 2-minute look? https://tradeservice.expo.app',
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
      text: '[Name] — this is Ruben, I build booking apps for salons, barbershops & tattoo studios. Clients pick a stylist or artist, book a slot, and pay a deposit — no more DMs at 11pm. Worth a 2-minute look? https://barbershoptemplate.expo.app',
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
      id: 'lawn-ads',
      label: 'Lawn & landscape — running ads',
      tag: 'Running Ads · No Website — Lawn & Landscape',
      vertical: 'lawn care and landscape crews',
      demoLink: 'https://lawncare.expo.app',
      order: 50,
      text:
        '[Name] — this is Ruben, I build booking pages for lawn & landscape crews in [City]. Saw your ad running — the link goes to your Facebook page, so anyone ready to book has to message you and wait. Here’s that same traffic landing on a page that takes the address and the service instead: [demo link]\n' +
        '\n' +
        'Worth a 2-minute look? Reply STOP to opt out.',
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
      text:
        '[Name] — this is Ruben, I build booking pages for cleaning crews in [City]. Saw your ad — it lands on your Facebook page, so someone ready to book has to message for a price, then message again for a time. Here’s what that ad could land on instead: [demo link]\n' +
        '\n' +
        'They pick the type of clean, the beds and baths, a date, and leave a deposit. Worth a 2-minute look? Reply STOP to opt out.',
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
      text:
        '[Name] — this is Ruben, I build booking pages for trade crews in [City]. Saw your ad — it points at your Facebook page. You paid for a click from someone with a problem right now, then asked them to send a message and wait. Here’s where that click could go instead: [demo link]\n' +
        '\n' +
        'Service, time slot, deposit — before you drive out. Worth a 2-minute look? Reply STOP to opt out.',
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
      text:
        '[Name] — this is Ruben, I build booking pages for shops in [City]. Saw your ad — it lands on your IG, so a ready-to-book client ends up in your DMs next to every other message, and you book after hours. Here’s what it could land on instead: [demo link]\n' +
        '\n' +
        'Barber, service, time, deposit — no DM needed. Worth a 2-minute look? Reply STOP to opt out.',
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
      text:
        'Hey! I\'m Ruben with @codewithruben. Noticed [Company] doesn\'t have a website up yet — happy to build you one to your needs, with changes along the way, and you only pay if you like the final result. No deposit required. Let me know if you\'d want to see a mockup!',
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
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this the owner for [Company]? This is Ruben with CodeWithRuben. Have I caught you for 20 seconds?"\n' +
        '[continue] "I noticed you\'re on Instagram but don\'t have a website yet. I can build one to your needs — changes along the way, no deposit, and you only pay if you like the final result. Want me to send a quick mockup?"'
    },
    {
      id: 'no-site-ig-trades',
      label: 'No website — IG · trades / junk / field',
      tag: 'No Website · IG DM · Trades / Junk / Field',
      vertical: 'trade, junk removal, and field service crews',
      demoLink: 'https://tradeservice.expo.app',
      order: 100,
      text:
        'Hey! I\'m Ruben with @codewithruben. Noticed [Company] doesn\'t have a website up yet — happy to build you a simple site (and booking if you want it) to your needs, with changes along the way. You only pay if you like the final result. No deposit required. Want a quick mockup?\n' +
        '\n' +
        'Live example: [demo link]',
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
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — is this [Name] with [Company]? This is Ruben with CodeWithRuben. Got 20 seconds?"\n' +
        '[continue] "I saw you\'re active online but don\'t have a website yet. I can build one to your needs — changes along the way, no deposit, pay only if you like it. Want me to send a mockup, or a live booking demo?"'
    },
    {
      id: 'no-site-ig-bump',
      label: 'No website — IG follow-up bump',
      tag: 'No Website · Instagram DM · Follow-up',
      vertical: 'local businesses on Instagram without a website',
      demoLink: '',
      order: 110,
      text:
        'Hey — just floating this back up. Still happy to knock out a mockup for [Company] at no cost / no deposit. Only pay if you like how it looks. Want me to send one over?',
      subject: 'Subject: Re: mockup for [Company]?',
      email:
        'Hi,\n' +
        '\n' +
        'Quick bump — still glad to put a mockup together for [Company]. No deposit, and you only pay if you like the final result.\n' +
        '\n' +
        'Want me to send one over?\n' +
        '\n' +
        '— Ruben',
      call:
        'You:\n' +
        '"Hey — Ruben again with CodeWithRuben, quick follow-up on [Company]. Still open to a free mockup — no deposit, pay only if you like it?"'
    }
  ];
})(window);
