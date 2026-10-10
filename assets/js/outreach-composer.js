/**
 * Template Outreach Scripts — composer.
 *
 * Scripts load from RTDB `agencyOutreachScripts` (admin-gated), seeded from
 * outreach-scripts-seed.js on first open / merged when new seed ids appear.
 *
 * Flow: pick a script → edit the message here → Copy → paste → send.
 * Name / Company / City / demo are optional helpers that fill tokens when set;
 * they never block Copy. The message box is the source of truth for send.
 */
(function (global) {
  'use strict';

  var RTDB_PATH = 'agencyOutreachScripts';
  var SEED_SRC = '/assets/js/outreach-scripts-seed.js?v=demo-picker-20261009';
  var STORE_KEY = 'cwrOutreachVars';
  // Last script used on this device, so the picker reopens on it (never empty).
  var LAST_SCRIPT_KEY = 'cwrOutreachLastScript';

  function rememberScript(id) {
    try { localStorage.setItem(LAST_SCRIPT_KEY, id); } catch (e) { /* private mode */ }
  }

  function lastScript() {
    try { return localStorage.getItem(LAST_SCRIPT_KEY) || ''; } catch (e) { return ''; }
  }

  /** Optional fill helpers. "[later today / tomorrow]" is prose — left alone. */
  var TOKENS = [
    { token: '[Name]', field: 'name' },
    { token: '[Company]', field: 'company' },
    { token: '[City]', field: 'city' },
    { token: '[demo link]', field: 'demo' },
    // "our Business Website package is $999" — or the live offer wording.
    { token: '[package]', field: 'package' },
    // Whole paragraphs the composer writes from the Demo picker and the controls
    // under Package. Removed (with their blank line) when empty, so templates
    // never carry a half-sentence. Listed in message order — toTemplate() relies
    // on it. See demoLine() / packageLine() / linkTreeLine().
    { token: '[demo line]', field: 'demoLine', block: true },
    { token: '[package line]', field: 'packageLine', block: true },
    { token: '[link tree line]', field: 'linkTreeLine', block: true }
  ];

  var BLOCK_TOKENS = TOKENS.filter(function (t) { return t.block; });

  var DEFAULT_PACKAGE = 'website';
  var LINK_TREE_EXAMPLE = 'rubenjimenez.dev/link-in-bio';
  var OFFER_LEADS = ['This month only', 'This week only', 'Limited-time offer', 'Launch special'];
  var CUSTOM_LEAD = '__custom';

  /**
   * Older saved scripts carry these paragraphs as plain text, which is how they
   * got hand-edited away. Swap them for the block tokens when scripts load.
   */
  var LEGACY_PACKAGE_RE = /For reference, \[package\], with your first month of care included\./g;
  var LEGACY_LINK_TREE_RE = /^(?:Not ready for a full|Or,? if a full site|In the meantime, I can)[^\n]*(?:Linktree|Link Tree|link-in-bio)[^\n]*$/gm;

  function migrateBlocks(body) {
    var out = String(body || '')
      .replace(LEGACY_PACKAGE_RE, '[package line]')
      .replace(LEGACY_LINK_TREE_RE, '[link tree line]');
    // Scripts with a package line but no demo at all get the Live example
    // line right before it (proof before price).
    if (out.indexOf('[package line]') !== -1 && out.indexOf('[demo link]') === -1 && out.indexOf('[demo line]') === -1) {
      out = out.replace('[package line]', '[demo line]\n\n[package line]');
    }
    return out;
  }

  /** Live demos for the Demo picker. Scripts' own demoLink values are added if missing. */
  var DEMOS = [
    { url: 'https://pawshine.expo.app', label: 'Paw Shine — grooming' },
    { url: 'https://pizza.expo.app', label: 'Restaurant — ordering' },
    { url: 'https://tradeservice.expo.app', label: 'Trade Service — quotes & jobs' },
    { url: 'https://roofcleaning.expo.app', label: 'Roof & exterior cleaning' },
    { url: 'https://lawncare.expo.app', label: 'Lawn care' },
    { url: 'https://treeservice.expo.app', label: 'Tree service' },
    { url: 'https://carpet.expo.app', label: 'Carpet cleaning' },
    { url: 'https://procleaning.expo.app', label: 'Pro Cleaning — house cleaning' },
    { url: 'https://sunergyelectricservices.expo.app', label: 'Electrician' },
    { url: 'https://barbershoptemplate.expo.app', label: 'Barber shop' },
    { url: 'https://beautysalon.expo.app', label: 'Beauty salon' },
    { url: 'https://photographer.expo.app', label: 'Photographer' },
    { url: 'https://realtor.expo.app', label: 'Realtor & insurance' }
  ];
  var CUSTOM_DEMO = '__custom';

  function demoOptions() {
    var list = DEMOS.slice();
    scripts.forEach(function (s) {
      var u = String(s.demoLink || '').trim();
      if (u && !list.some(function (d) { return d.url === u; })) {
        list.push({ url: u, label: u.replace(/^https?:\/\//, '') });
      }
    });
    return [{ value: '', label: 'No demo' }]
      .concat(list.map(function (d) { return { value: d.url, label: d.label + ' · ' + d.url.replace(/^https?:\/\//, '') }; }))
      .concat([{ value: CUSTOM_DEMO, label: 'Custom URL…' }]);
  }

  /** Points the picker at whatever URL the demo box holds (script default, prefill, typing). */
  function syncDemoSelect() {
    if (!els.demoSelect || !els.demo) return;
    var url = els.demo.value.trim();
    var known = demoOptions().some(function (o) { return o.value && o.value !== CUSTOM_DEMO && o.value === url; });
    var value = !url ? '' : known ? url : CUSTOM_DEMO;
    if (typeof global.setBusinessDocSelectOptions === 'function') {
      global.setBusinessDocSelectOptions(els.demoSelect, demoOptions(), { value: value, keepValue: false });
    } else {
      els.demoSelect.value = value;
    }
    els.demo.hidden = value !== CUSTOM_DEMO;
  }

  function demoLine() {
    var url = (els.demo && els.demo.value || '').trim();
    return url ? 'Live example: ' + url : '';
  }

  function selectedPackageId() {
    return els.packageSelect ? String(els.packageSelect.value || '') : '';
  }

  /** Fields a script stores in RTDB — also what "Reset to template" copies from the seed. */
  var FIELDS = ['label', 'tag', 'vertical', 'demoLink', 'order', 'text', 'subject', 'email', 'call'];

  var STEPS = [
    { id: 'text', label: 'Text' },
    { id: 'subject', label: 'Subject' },
    { id: 'email', label: 'Email' },
    { id: 'call', label: 'Call' }
  ];

  /** Script → its "running ads" version. Ads versions are reached with the
   *  "They're running ads" checkbox instead of being listed in the picker. */
  var ADS_VERSION = {
    lawn: 'lawn-ads',
    trades: 'trades-ads',
    salon: 'salon-ads',
    carpet: 'cleaning-ads',
    restaurant: 'restaurant-ads'
  };

  function baseOf(id) {
    for (var base in ADS_VERSION) if (ADS_VERSION[base] === id) return base;
    return id;
  }

  function hasScript(id) {
    return scripts.some(function (s) { return s.id === id; });
  }

  var scripts = [];
  var activeId = '';
  var activeStep = 'text';
  var loaded = false;
  var dirty = false;
  var els = {};
  var seedById = {};

  // ——— data ———

  function seedsLoaded() {
    return Array.isArray(global.OUTREACH_SCRIPT_SEEDS) && global.OUTREACH_SCRIPT_SEEDS.length;
  }

  function loadSeedFile() {
    if (seedsLoaded()) return Promise.resolve(global.OUTREACH_SCRIPT_SEEDS);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SEED_SRC;
      s.onload = function () {
        seedsLoaded() ? resolve(global.OUTREACH_SCRIPT_SEEDS) : reject(new Error('seed file loaded but empty'));
      };
      s.onerror = function () { reject(new Error('could not load ' + SEED_SRC)); };
      document.head.appendChild(s);
    });
  }

  function rememberSeeds(seeds) {
    seedById = {};
    (seeds || []).forEach(function (s) { seedById[s.id] = s; });
  }

  function seedFields(s) {
    var out = {};
    FIELDS.forEach(function (f) { out[f] = s[f]; });
    return out;
  }

  /** True when the saved copy of a script no longer matches its seed template. */
  function differsFromSeed(s) {
    var seed = s && seedById[s.id];
    if (!seed) return false;
    return FIELDS.some(function (f) {
      var a = seed[f] == null ? '' : seed[f];
      var b = s[f] == null ? '' : s[f];
      return f === 'order' ? Number(a) !== Number(b) : String(a) !== String(b);
    });
  }

  function normalize(val) {
    return Object.keys(val || {})
      .map(function (id) {
        var r = val[id] || {};
        return {
          id: id,
          label: r.label || id,
          tag: r.tag || '',
          vertical: r.vertical || '',
          demoLink: r.demoLink || '',
          order: typeof r.order === 'number' ? r.order : 999,
          text: migrateBlocks(r.text),
          subject: r.subject || '',
          email: migrateBlocks(r.email),
          call: r.call || '',
          group: r.group || ''
        };
      })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /**
   * On a direct page load the tab can open before Firebase connects and the
   * admin sign-in resolves (scripts are admin-only), so wait for both rather
   * than failing once and leaving the picker empty.
   */
  function rtdbReadyForScripts() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet) return false;
    return typeof global.isAdminSession === 'function' ? !!global.isAdminSession() : true;
  }

  function waitForRtdb(timeoutMs) {
    return new Promise(function (resolve) {
      var waited = 0;
      (function tick() {
        if (rtdbReadyForScripts()) return resolve(true);
        if (waited >= timeoutMs) return resolve(false);
        waited += 250;
        setTimeout(tick, 250);
      })();
    });
  }

  /** RTDB first; seed when empty. Merge NEW seed ids without overwriting edits. */
  async function ensureScripts() {
    if (loaded && scripts.length) return scripts;
    if (!(await waitForRtdb(30000))) {
      throw new Error('Could not reach your scripts — make sure you’re signed in, then reopen this tab.');
    }
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, RTDB_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;

    if (val && Object.keys(val).length) {
      var merged = Object.assign({}, val);
      try {
        var existingSeeds = await loadSeedFile();
        rememberSeeds(existingSeeds);
        var patch = {};
        existingSeeds.forEach(function (s) {
          if (!merged[s.id]) {
            patch[s.id] = seedFields(s);
            merged[s.id] = patch[s.id];
          }
        });
        if (Object.keys(patch).length && global.rtdbUpdate) {
          await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH), patch);
        }
      } catch (err) {
        console.warn('Outreach scripts: merge new seeds skipped', err);
      }
      scripts = normalize(merged);
      loaded = true;
      return scripts;
    }

    var seeds = await loadSeedFile();
    rememberSeeds(seeds);
    var writes = {};
    seeds.forEach(function (s) {
      writes[s.id] = seedFields(s);
    });
    if (global.rtdbSet) {
      try {
        await global.rtdbSet(global.rtdbRef(global.rtdb, RTDB_PATH), writes);
      } catch (err) {
        console.warn('Outreach scripts: seed write failed, using local copy', err);
      }
    }
    scripts = normalize(writes);
    loaded = true;
    return scripts;
  }

  // ——— variables ———

  function readVars() {
    return {
      name: (els.name && els.name.value || '').trim(),
      company: (els.company && els.company.value || '').trim(),
      city: (els.city && els.city.value || '').trim(),
      demo: (els.demo && els.demo.value || '').trim(),
      phone: (els.phone && els.phone.value || '').trim(),
      email: (els.emailAddr && els.emailAddr.value || '').trim(),
      package: selectedPackageId() && global.PackagePricing
        ? global.PackagePricing.packagePhrase(selectedPackageId())
        : '',
      demoLine: demoLine(),
      packageLine: packageLine(),
      linkTreeLine: linkTreeLine()
    };
  }

  // ——— package + Link Tree paragraphs ———

  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }

  function offerLeadIn() {
    var v = els.offerLeadSelect ? String(els.offerLeadSelect.value || '') : OFFER_LEADS[0];
    if (v === CUSTOM_LEAD) {
      var custom = (els.offerLeadCustom && els.offerLeadCustom.value || '').trim();
      return custom || OFFER_LEADS[0];
    }
    return v || OFFER_LEADS[0];
  }

  /** The selected package's live offer, or null when none is running. */
  function selectedOffer() {
    var PP = global.PackagePricing;
    var id = selectedPackageId();
    return PP && id ? PP.activeOffer(id) : null;
  }

  function wholeNumber(el) {
    var n = Math.round(Number(el && el.value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * Offer typed into the composer for this message only, used when the package
   * has no live offer. Same shape as PackagePricing.activeOffer(); null until
   * the price is below the regular price.
   */
  function oneOffOffer() {
    var PP = global.PackagePricing;
    var p = PP && selectedPackageId() ? PP.packageById(selectedPackageId()) : null;
    var price = wholeNumber(els.offerPrice);
    if (!p || !price || price >= p.price) return null;
    var spots = wholeNumber(els.offerSpots);
    var ends = els.offerEnds && /^\d{4}-\d{2}-\d{2}$/.test(els.offerEnds.value) ? els.offerEnds.value : '';
    return { price: price, spots: spots, claimed: 0, spotsLeft: spots, endsAt: ends, oneOff: true };
  }

  /** What "Lead with the offer" uses: the live offer, else the one-off one. */
  function leadOffer() {
    return selectedOffer() || oneOffOffer();
  }

  /**
   * "Business Website — $999: 1–3 pages, … . First month of care included."
   * With "Lead with the offer" on and an offer live:
   * "This month only: our Business Website package is $499 (normally $999) for
   *  the next 3 clients. First month of care included."
   */
  function packageLine() {
    var PP = global.PackagePricing;
    var p = PP && selectedPackageId() ? PP.packageById(selectedPackageId()) : null;
    if (!p) return '';
    var lead = els.offerLead && els.offerLead.checked ? leadOffer() : null;
    if (lead) {
      var limit = PP.offerLimitText(lead, 'en');
      return offerLeadIn() + ': our ' + p.name + ' package is ' + money(lead.price) +
        ' (normally ' + PP.regularLabel(p) + ')' + (limit ? ' ' + limit : '') +
        '. First month of care included.';
    }
    var offer = selectedOffer();
    var price = offer ? money(offer.price) + ' (normally ' + PP.regularLabel(p) + ')' : PP.regularLabel(p);
    return p.summary
      ? p.name + ' — ' + price + ': ' + p.summary + '. First month of care included.'
      : p.name + ' — ' + price + ', with your first month of care included.';
  }

  /** Off when unchecked, and when Link Tree is already the package being pitched. */
  function linkTreeLine() {
    var PP = global.PackagePricing;
    if (!PP || !els.linkTree || !els.linkTree.checked || selectedPackageId() === 'linktree') return '';
    var phrase = PP.packagePhrase('linktree');
    if (!phrase) return '';
    return 'Not ready for a full site? ' + phrase.charAt(0).toUpperCase() + phrase.slice(1) +
      ', with your first month of care included. Example: ' + LINK_TREE_EXAMPLE;
  }

  function templateHas(token) {
    var s = current();
    return !!(s && String(s[activeStep] || '').indexOf(token) !== -1);
  }

  /** Shows the controls only for scripts whose current step uses the blocks. */
  function syncPricingControls() {
    if (!els.pricingBlocks) return;
    var hasPackage = templateHas('[package line]');
    var hasLinkTree = templateHas('[link tree line]');
    els.pricingBlocks.hidden = !hasPackage && !hasLinkTree;
    var offer = hasPackage ? selectedOffer() : null;
    var leading = !!(hasPackage && els.offerLead && els.offerLead.checked);
    if (els.offerWrap) els.offerWrap.hidden = !hasPackage || !selectedPackageId();
    if (els.offerLead) els.offerLead.disabled = false;
    if (els.offerHint) {
      els.offerHint.textContent = offer
        ? '(' + global.PackagePricing.packageOptionLabel(selectedPackageId()) + ')'
        : '(no live offer on this package — add a one-off offer for this message)';
    }
    if (els.offerLeadRow) els.offerLeadRow.hidden = !leading;
    if (els.offerOneOff) els.offerOneOff.hidden = !leading || !!offer;
    if (els.offerOneOffNote && leading && !offer) {
      var p = global.PackagePricing.packageById(selectedPackageId());
      var needsPrice = !oneOffOffer();
      els.offerOneOffNote.textContent = needsPrice
        ? 'Enter an offer price below ' + (p ? global.PackagePricing.regularLabel(p).split('–')[0] : 'the regular price') + ' to use it.'
        : 'One-off offer for this message only. Your site still shows the regular price.';
      els.offerOneOffNote.classList.toggle('is-error', needsPrice);
    }
    if (els.offerLeadCustomWrap) {
      els.offerLeadCustomWrap.hidden = !els.offerLeadSelect || els.offerLeadSelect.value !== CUSTOM_LEAD;
    }
    if (els.linkTreeWrap) els.linkTreeWrap.hidden = !hasLinkTree || selectedPackageId() === 'linktree';
  }

  /** New script → Link Tree starts checked on the no-website DMs, unchecked elsewhere. */
  function resetLinkTreeDefault() {
    if (els.linkTree) els.linkTree.checked = /^no-site/.test(baseOf(activeId));
  }

  function renderOfferLeadSelect() {
    if (!els.offerLeadSelect || typeof global.setBusinessDocSelectOptions !== 'function') return;
    var options = OFFER_LEADS.map(function (l) { return { value: l, label: l }; })
      .concat([{ value: CUSTOM_LEAD, label: 'Custom…' }]);
    global.setBusinessDocSelectOptions(els.offerLeadSelect, options, {
      value: els.offerLeadSelect.value || OFFER_LEADS[0],
      keepValue: false
    });
  }

  /** What the block tokens last rendered as, so a hand-edited message can be patched in place. */
  var lastBlocks = { demo: '', package: '', demoLine: '', packageLine: '', linkTreeLine: '' };

  function rememberBlocks(vars) {
    lastBlocks = {
      demo: vars.demo,
      package: vars.package,
      demoLine: vars.demoLine,
      packageLine: vars.packageLine,
      linkTreeLine: vars.linkTreeLine
    };
  }

  /**
   * Replaces a generated line inside an edited message. A line that wasn't
   * there yet goes in front of the first later block still present (so the
   * demo line lands before the price), else at the end.
   */
  function swapBlock(body, oldText, newText, laterTexts) {
    if (oldText && body.indexOf(oldText) !== -1) {
      return newText ? body.split(oldText).join(newText) : tidyBlankLines(body.split(oldText).join(''));
    }
    if (!newText) return body;
    var later = (laterTexts || []).filter(function (t) { return t && body.indexOf(t) !== -1; })[0];
    if (later) return body.replace(later, newText + '\n\n' + later);
    return body.replace(/\s*$/, '') + '\n\n' + newText;
  }

  function tidyBlankLines(body) {
    return body.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
  }

  /**
   * A pricing control changed. An untouched message just re-renders; a
   * hand-edited one keeps the edit and only has the generated lines swapped.
   */
  function onPricingChange() {
    syncPricingControls();
    if (!dirty) {
      renderPreview(true);
    } else {
      var vars = readVars();
      var body = getBody();
      if (templateHas('[demo line]')) {
        body = swapBlock(body, lastBlocks.demoLine, vars.demoLine, [lastBlocks.packageLine, lastBlocks.linkTreeLine]);
      }
      ['package', 'demo'].forEach(function (k) {
        if (lastBlocks[k] && vars[k] && lastBlocks[k] !== vars[k]) body = body.split(lastBlocks[k]).join(vars[k]);
      });
      if (templateHas('[package line]')) body = swapBlock(body, lastBlocks.packageLine, vars.packageLine, [lastBlocks.linkTreeLine]);
      if (templateHas('[link tree line]')) body = swapBlock(body, lastBlocks.linkTreeLine, vars.linkTreeLine);
      setBody(body);
      rememberBlocks(vars);
      renderPreview(false);
    }
    saveVars();
  }

  function renderPackageSelect() {
    if (!els.packageSelect || !global.PackagePricing) return;
    var current = selectedPackageId();
    var options = [{ value: '', label: 'No package' }].concat(
      global.PackagePricing.PACKAGES.map(function (p) {
        return { value: p.id, label: global.PackagePricing.packageOptionLabel(p.id) };
      })
    );
    if (typeof global.setBusinessDocSelectOptions === 'function') {
      global.setBusinessDocSelectOptions(els.packageSelect, options, { value: current, keepValue: false });
    }
  }

  function saveVars() {
    var v = readVars();
    v.packageId = selectedPackageId();
    v.offerLead = !!(els.offerLead && els.offerLead.checked);
    v.offerLeadIn = els.offerLeadSelect ? els.offerLeadSelect.value : '';
    v.offerLeadCustom = els.offerLeadCustom ? els.offerLeadCustom.value : '';
    delete v.package;
    delete v.packageLine;
    delete v.linkTreeLine;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* private mode */ }
  }

  function restoreVars() {
    var v;
    try { v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { v = {}; }
    ['name', 'company', 'city', 'phone'].forEach(function (k) {
      var el = k === 'phone' ? els.phone : els[k];
      if (el && v[k]) el.value = v[k];
    });
    if (els.packageSelect && v.packageId != null) els.packageSelect.value = v.packageId;
    if (els.offerLead) els.offerLead.checked = v.offerLead === true;
    if (els.offerLeadSelect && v.offerLeadIn) els.offerLeadSelect.value = v.offerLeadIn;
    if (els.offerLeadCustom && v.offerLeadCustom) els.offerLeadCustom.value = v.offerLeadCustom;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function fill(body, vars) {
    var out = body || '';
    var droppedBlock = false;
    TOKENS.forEach(function (t) {
      var v = vars[t.field];
      if (v) out = out.replace(new RegExp(escapeRe(t.token), 'g'), v);
      else if (t.block && out.indexOf(t.token) !== -1) {
        out = out.split(t.token).join('');
        droppedBlock = true;
      }
    });
    return droppedBlock ? tidyBlankLines(out) : out;
  }

  function remainingTokens(body) {
    return TOKENS.filter(function (t) {
      return (body || '').indexOf(t.token) !== -1;
    }).map(function (t) { return t.token; });
  }

  function current() {
    for (var i = 0; i < scripts.length; i++) if (scripts[i].id === activeId) return scripts[i];
    return scripts[0] || null;
  }

  function getBody() {
    if (!els.preview) return '';
    return typeof els.preview.value === 'string' ? els.preview.value : (els.preview.textContent || '');
  }

  function setBody(text) {
    if (!els.preview) return;
    if ('value' in els.preview) els.preview.value = text;
    else els.preview.textContent = text;
  }

  // ——— render ———

  function applyScriptSelection(id, fromUi) {
    if (!id) return;
    // The picker hands over the niche; the checkbox decides which version.
    var base = baseOf(id);
    var adsId = ADS_VERSION[base];
    if (els.adsToggle && els.adsToggle.checked && adsId && hasScript(adsId)) id = adsId;
    else if (id !== base && !(els.adsToggle && els.adsToggle.checked)) id = base;
    var found = null;
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].id === id) {
        found = scripts[i];
        break;
      }
    }
    if (!found) return;
    activeId = id;
    rememberScript(id);
    resetLinkTreeDefault();
    dirty = false;
    if (els.demo) els.demo.value = found.demoLink || '';
    syncDemoSelect();
    if (!fromUi && els.scriptSelect && typeof global.setBusinessDocSelectValue === 'function') {
      global.setBusinessDocSelectValue(els.scriptSelect, baseOf(id), true);
    }
    syncAdsToggle();
    renderScriptMeta();
    renderPreview(true);
  }

  /** Checkbox shows only for scripts that have an ads version. */
  function syncAdsToggle() {
    if (!els.adsWrap || !els.adsToggle) return;
    var adsId = ADS_VERSION[baseOf(activeId)];
    var available = !!adsId && hasScript(adsId);
    els.adsWrap.hidden = !available;
    els.adsToggle.checked = available && activeId === adsId;
  }

  /** Dropdown category, worked out from the script id so scripts saved in
   *  RTDB before categories existed still land in the right group. */
  function scriptGroup(s) {
    if (s.group) return s.group;
    var id = String(s.id || '');
    if (/-ads$/.test(id)) return 'Running ads';
    if (/^no-site/.test(id) || /^site-/.test(id)) return 'Website problems';
    if (id === 'landline') return 'Special cases';
    return 'By niche';
  }

  function renderScriptSelect() {
    if (!els.scriptSelect) return;
    var options = scripts.filter(function (s) {
      return baseOf(s.id) === s.id || !hasScript(baseOf(s.id));
    }).map(function (s) {
      return { value: s.id, label: s.label, group: scriptGroup(s) };
    });
    if (!activeId && scripts.length) activeId = scripts[0].id;
    if (typeof global.setBusinessDocSelectOptions === 'function') {
      global.setBusinessDocSelectOptions(els.scriptSelect, options, {
        value: baseOf(activeId) || (scripts[0] && scripts[0].id) || '',
        keepValue: false
      });
      syncAdsToggle();
    } else {
      // Fallback if admin helpers aren't loaded yet — plain options markup
      var menu = document.getElementById('outreach-script-menu');
      if (menu) {
        menu.innerHTML = options
          .map(function (opt) {
            var active = opt.value === activeId;
            return (
              '<button type="button" class="business-doc-select-option' +
              (active ? ' is-active' : '') +
              '" role="option" aria-selected="' +
              (active ? 'true' : 'false') +
              '" data-value="' +
              String(opt.value).replace(/"/g, '&quot;') +
              '">' +
              String(opt.label).replace(/</g, '&lt;') +
              '</button>'
            );
          })
          .join('');
      }
      els.scriptSelect.value = activeId || '';
      var wrap = els.scriptSelect.closest
        ? els.scriptSelect.closest('.business-doc-select')
        : null;
      var label = wrap && wrap.querySelector
        ? wrap.querySelector('.business-doc-select-trigger-label')
        : null;
      var cur = current();
      if (label && cur) label.textContent = cur.label;
    }
    if (typeof global.initBusinessDocCustomSelects === 'function') {
      global.initBusinessDocCustomSelects();
    }
    if (els.demo && current()) els.demo.value = current().demoLink || '';
    syncDemoSelect();
    renderScriptMeta();
  }

  function renderScriptMeta() {
    if (!els.meta) return;
    var s = current();
    if (els.btnReset) els.btnReset.hidden = !differsFromSeed(s);
    if (!s) {
      els.meta.hidden = true;
      els.meta.textContent = '';
      return;
    }
    var bits = [];
    if (s.tag) bits.push(s.tag);
    else if (s.vertical) bits.push(s.vertical);
    if (s.demoLink) bits.push('Demo ready');
    els.meta.textContent = bits.join(' · ');
    els.meta.hidden = !bits.length;
  }

  function renderSteps() {
    if (!els.steps) return;
    els.steps.innerHTML = '';
    STEPS.forEach(function (st) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'outreach-step' + (st.id === activeStep ? ' is-active' : '');
      b.textContent = st.label;
      b.setAttribute('aria-pressed', st.id === activeStep ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (st.id === activeStep) return;
        function go() {
          activeStep = st.id;
          dirty = false;
          renderSteps();
          renderPreview(true);
        }
        if (!needsEditPrompt()) return go();
        offerToSaveEdits(activeId).then(function (ok) { if (ok) go(); });
      });
      els.steps.appendChild(b);
    });
  }

  /** @param {boolean} [force] reload from template even if edited */
  function renderPreview(force) {
    var s = current();
    if (!s || !els.preview) return;
    var vars = readVars();

    syncPricingControls();
    if (force || !dirty) {
      var raw = s[activeStep] || '';
      setBody(fill(raw, vars));
      rememberBlocks(vars);
      dirty = false;
    }

    var body = getBody();
    var left = remainingTokens(body);
    if (els.warn) {
      if (left.length) {
        els.warn.textContent = 'Still has ' + left.join(' ') + ' — edit above before sending, or fill the helpers.';
        els.warn.hidden = false;
      } else {
        els.warn.hidden = true;
      }
    }

    // Never block copy / send on placeholders
    [els.btnCopy, els.btnText, els.btnEmail].forEach(function (b) {
      if (b) b.disabled = false;
    });
    if (els.btnCall) els.btnCall.disabled = !vars.phone;

    if (els.btnText) els.btnText.hidden = activeStep !== 'text';
    if (els.btnEmail) els.btnEmail.hidden = activeStep !== 'email' && activeStep !== 'subject';
    if (els.btnCall) els.btnCall.hidden = activeStep !== 'call';

    if (els.count) els.count.textContent = body.length + ' chars';
  }

  // ——— actions ———

  function flash(btn, msg) {
    if (!btn) return;
    var prev = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = prev; }, 1400);
  }

  function doCopy() {
    var body = getBody();
    if (!body) return;
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(body).then(function () { flash(els.btnCopy, 'Copied'); })
        .catch(function () { flash(els.btnCopy, 'Copy failed'); });
    } else {
      flash(els.btnCopy, 'Copy failed');
    }
  }

  // ——— working a prospect from the Prospects tab ———

  // Set by "Open script" on a prospect: Text / Email taps get logged to it, and
  // "Add to pipeline" links the new lead back to it.
  var activeProspectId = '';

  function logProspect(kind) {
    if (!activeProspectId || !global.CWR_PROSPECTS) return;
    global.CWR_PROSPECTS.logTouch(activeProspectId, kind).catch(function (err) {
      console.warn('Outreach composer: prospect log failed', err);
    });
  }

  function setProspect(id) {
    activeProspectId = id || '';
    var p = activeProspectId && global.CWR_PROSPECTS ? global.CWR_PROSPECTS.get(activeProspectId) : null;
    if (!p) activeProspectId = '';
    var bar = document.getElementById('outreach-prospect-bar');
    if (!bar && els.root && activeProspectId) {
      bar = document.createElement('div');
      bar.id = 'outreach-prospect-bar';
      bar.className = 'outreach-prospect-bar';
      bar.setAttribute('role', 'status');
      els.root.insertBefore(bar, els.root.firstChild);
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-prospect-act]');
        if (!btn) return;
        if (btn.getAttribute('data-prospect-act') === 'back') {
          var tab = document.getElementById('admin-tab-prospects');
          if (tab) tab.click();
        }
        setProspect('');
      });
    }
    if (!bar) return;
    bar.hidden = !activeProspectId;
    if (!activeProspectId) { bar.innerHTML = ''; return; }
    bar.innerHTML = '<span>Working <strong>' + escapeHtml(p.business) + '</strong> · Text and Email taps are logged to Prospects.</span>' +
      '<button type="button" class="outreach-prospect-btn" data-prospect-act="back">Back to Prospects</button>' +
      '<button type="button" class="outreach-prospect-btn" data-prospect-act="clear" aria-label="Stop logging to this prospect">×</button>';
  }

  /** Called by Prospects → "Open script": fill the helpers and pick the script. */
  async function prefill(opts) {
    opts = opts || {};
    await open();
    cache();
    var set = function (el, v) { if (el) el.value = v || ''; };
    set(els.name, opts.name);
    set(els.company, opts.company);
    set(els.city, opts.city);
    set(els.phone, opts.phone);
    set(els.emailAddr, opts.email);
    if (opts.scriptId && hasScript(opts.scriptId)) {
      if (els.adsToggle) els.adsToggle.checked = baseOf(opts.scriptId) !== opts.scriptId;
      applyScriptSelection(opts.scriptId);
    } else {
      renderPreview(true);
    }
    saveVars();
    setProspect(opts.prospectId);
  }

  function doText() {
    logProspect('texted');
    var vars = readVars();
    var body = getBody();
    var href = 'sms:' + (vars.phone || '') + '?&body=' + encodeURIComponent(body);
    global.location.href = href;
  }

  function doEmail() {
    var s = current();
    var vars = readVars();
    if (!s) return;
    logProspect('emailed');
    var subject = activeStep === 'subject'
      ? getBody().replace(/^Subject:\s*/i, '')
      : fill(s.subject || '', vars).replace(/^Subject:\s*/i, '');
    var body = activeStep === 'email' ? getBody() : fill(s.email || '', vars);
    var href = 'mailto:' + encodeURIComponent(vars.email || '') +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    global.location.href = href;
  }

  /** Overwrite the saved copy of the current script with its latest seed template. */
  async function doReset() {
    var s = current();
    var seed = s && seedById[s.id];
    if (!seed || !global.rtdbUpdate) return;
    if (!global.confirm('Replace the saved "' + s.label + '" script with the latest template?')) return;
    var fields = seedFields(seed);
    els.btnReset.disabled = true;
    try {
      await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH + '/' + s.id), fields);
      var saved = {};
      saved[s.id] = fields;
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].id === s.id) scripts[i] = normalize(saved)[0];
      }
      dirty = false;
      renderScriptSelect();
      renderPreview(true);
    } catch (err) {
      console.warn('Outreach composer: reset failed', err);
      global.alert('Could not reset this script — check your connection and try again.');
    } finally {
      els.btnReset.disabled = false;
    }
  }

  function doCall() {
    var vars = readVars();
    if (!vars.phone) return;
    global.location.href = 'tel:' + vars.phone.replace(/[^\d+]/g, '');
  }

  // ——— ask (inline prompt with several choices) ———

  var askResolve = null;

  /** Shows a short question with buttons; resolves with the chosen value. */
  function ask(message, choices) {
    if (!els.ask) return Promise.resolve(null);
    if (askResolve) askResolve(null);
    els.askText.textContent = message;
    els.askActions.innerHTML = '';
    return new Promise(function (resolve) {
      askResolve = resolve;
      choices.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'outreach-btn' + (c.primary ? ' outreach-btn--primary' : '');
        b.textContent = c.label;
        b.addEventListener('click', function () {
          els.ask.hidden = true;
          askResolve = null;
          resolve(c.value);
        });
        els.askActions.appendChild(b);
      });
      els.ask.hidden = false;
      var first = els.askActions.querySelector('button');
      if (first) first.focus();
    });
  }

  function showLeadStatus(msg, isError) {
    if (!els.leadStatus) return;
    els.leadStatus.textContent = msg;
    els.leadStatus.classList.toggle('is-error', !!isError);
    els.leadStatus.hidden = !msg;
  }

  // ——— saving edits back to a script ———

  /** Puts the [Name]/[Company]/… tokens back where the filled-in values sit,
   *  so a saved edit works for the next lead too. Longest values first. */
  function toTemplate(body, vars, original) {
    var out = body || '';
    TOKENS.slice()
      .filter(function (t) { return vars[t.field] && vars[t.field].length > 1; })
      .sort(function (a, b) { return vars[b.field].length - vars[a.field].length; })
      .forEach(function (t) {
        out = out.split(vars[t.field]).join(t.token);
      });
    // A block that was switched off for this lead (or deleted by hand) stays in
    // the template, so the next lead still gets the package and Link Tree lines.
    BLOCK_TOKENS.forEach(function (t, i) {
      if (String(original || '').indexOf(t.token) === -1 || out.indexOf(t.token) !== -1) return;
      var later = BLOCK_TOKENS.slice(i + 1).filter(function (l) { return out.indexOf(l.token) !== -1; })[0];
      out = later
        ? out.replace(later.token, t.token + '\n\n' + later.token)
        : out.replace(/\s*$/, '') + '\n\n' + t.token;
    });
    return out;
  }

  function slugify(text) {
    return String(text || 'script').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'script';
  }

  /**
   * If the message was hand-edited, ask what to do with the edit before it is
   * thrown away. Resolves false only when the admin backs out entirely.
   */
  /** Only a hand-edited message, on a page that has the prompt, waits. */
  function needsEditPrompt() {
    return dirty && !!(els.ask && els.askText && els.askActions);
  }

  async function offerToSaveEdits(scriptId) {
    if (!needsEditPrompt()) { dirty = false; return true; }
    var s = null;
    for (var i = 0; i < scripts.length; i++) if (scripts[i].id === scriptId) s = scripts[i];
    if (!s) { dirty = false; return true; }
    var stepLabel = (STEPS.filter(function (st) { return st.id === activeStep; })[0] || {}).label || activeStep;
    var choice = await ask('You edited the ' + stepLabel.toLowerCase() + ' message for “' + s.label + '”. Keep this edit?', [
      { value: 'update', label: 'Update this script', primary: true },
      { value: 'new', label: 'Save as new script' },
      { value: 'discard', label: 'Don’t save' },
      { value: 'cancel', label: 'Keep editing' }
    ]);
    if (choice === 'cancel' || choice === null) return false;
    if (choice === 'discard') { dirty = false; return true; }
    var template = toTemplate(getBody(), readVars(), s[activeStep]);
    if (choice === 'update') {
      var patch = {};
      patch[activeStep] = template;
      await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH + '/' + s.id), patch);
      s[activeStep] = template;
      dirty = false;
      showLeadStatus('Updated “' + s.label + '”.', false);
      return true;
    }
    var name = global.prompt('Name for the new script', s.label + ' (my version)');
    if (!name) return false;
    var id = slugify(name) + '-' + Date.now().toString(36);
    var fields = {
      label: name.slice(0, 120),
      tag: s.tag || '',
      vertical: s.vertical || '',
      demoLink: s.demoLink || '',
      order: (Number(s.order) || 0) + 1,
      text: s.text || '',
      subject: s.subject || '',
      email: s.email || '',
      call: s.call || '',
      group: scriptGroup(s)
    };
    fields[activeStep] = template;
    var write = {};
    write[id] = fields;
    await global.rtdbUpdate(global.rtdbRef(global.rtdb, RTDB_PATH), write);
    scripts = normalize(Object.assign(scripts.reduce(function (acc, sc) {
      acc[sc.id] = sc;
      return acc;
    }, {}), write));
    dirty = false;
    renderScriptSelect();
    showLeadStatus('Saved “' + fields.label + '” as a new script.', false);
    return true;
  }

  // ——— push the filled-in lead to Client Pipeline ———

  var PIPELINE_PATH = 'pipelineLeads';
  var FOLLOW_UP_DAYS = 3;

  function digits(v) { return String(v || '').replace(/\D/g, '').slice(-10); }

  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  async function loadPipelineLeads() {
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, PIPELINE_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;
    return Object.keys(val || {}).map(function (id) {
      return Object.assign({ id: id }, val[id]);
    });
  }

  /** Same phone (last 10 digits), same email, or same company name. */
  function findDuplicate(leads, vars) {
    var phone = digits(vars.phone);
    var email = vars.email.toLowerCase();
    var company = vars.company.toLowerCase();
    return leads.find(function (l) {
      return (
        (phone.length === 10 && digits(l.phone) === phone) ||
        (email && String(l.email || '').trim().toLowerCase() === email) ||
        (company && String(l.company || '').trim().toLowerCase() === company)
      );
    }) || null;
  }

  function buildLeadNote(s, vars) {
    var stepLabel = (STEPS.filter(function (st) { return st.id === activeStep; })[0] || {}).label || activeStep;
    var bits = ['Outreach · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })];
    if (s) bits.push('Script: ' + s.label);
    if (vars.city) bits.push(vars.city);
    if (vars.demo) bits.push('demo: ' + vars.demo);
    if (selectedPackageId() && global.PackagePricing) {
      bits.push('package: ' + global.PackagePricing.packageOptionLabel(selectedPackageId()));
    }
    return bits.join(' · ') + '\n\n' + stepLabel + ' message:\n' + getBody();
  }

  function clearLeadForm() {
    ['name', 'company', 'city', 'demo', 'phone', 'emailAddr'].forEach(function (k) {
      if (els[k]) els[k].value = '';
    });
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ }
    syncDemoSelect();
    if (els.packageSelect) {
      els.packageSelect.value = DEFAULT_PACKAGE;
      if (typeof global.syncBusinessDocSelectUI === 'function') global.syncBusinessDocSelectUI(els.packageSelect);
    }
    dirty = false;
    renderPreview(true);
    setProspect('');
  }

  function linkProspect(leadId) {
    if (!activeProspectId || !global.CWR_PROSPECTS) return Promise.resolve();
    return global.CWR_PROSPECTS.linkLead(activeProspectId, leadId);
  }

  async function addToPipeline() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet || !global.rtdbSet || !global.rtdbPush) {
      showLeadStatus('Realtime Database is not ready — sign in to admin first.', true);
      return;
    }
    var vars = readVars();
    if (!vars.name && !vars.company) {
      showLeadStatus('Add at least a name or a company first.', true);
      return;
    }
    // A hand-edited message gets the save prompt first; the lead keeps the
    // message exactly as written either way.
    var note = buildLeadNote(current(), vars);
    if (!(await offerToSaveEdits(activeId))) return;

    var s = current();
    var follow = new Date();
    follow.setDate(follow.getDate() + FOLLOW_UP_DAYS);
    var now = global.rtdbServerTimestamp ? global.rtdbServerTimestamp() : Date.now();
    var leads = await loadPipelineLeads();
    var dup = findDuplicate(leads, vars);
    var who = vars.company || vars.name;

    if (dup) {
      var choice = await ask('“' + (dup.company || dup.name) + '” is already in your pipeline (' + (dup.stage || 'lead') + '). What should I do?', [
        { value: 'update', label: 'Update it', primary: true },
        { value: 'new', label: 'Add as new lead' },
        { value: 'cancel', label: 'Cancel' }
      ]);
      if (choice !== 'update' && choice !== 'new') return;
      if (choice === 'update') {
        var patch = {
          notes: (dup.notes ? String(dup.notes) + '\n\n' : '') + note,
          followUpAt: dateKey(follow),
          outreachScriptId: s ? s.id : null,
          outreachScriptLabel: s ? s.label : null,
          updatedAt: now
        };
        // Only fill blanks — never overwrite what the lead already has.
        if (!dup.name && (vars.name || vars.company)) patch.name = vars.name || vars.company;
        if (!dup.company && vars.company) patch.company = vars.company;
        if (!dup.phone && vars.phone) patch.phone = vars.phone;
        if (!dup.email && vars.email) patch.email = vars.email;
        var upPkg = selectedPackageId() && global.PackagePricing ? global.PackagePricing.packageById(selectedPackageId()) : null;
        if (upPkg) {
          var upOffer = global.PackagePricing.activeOffer(upPkg.id);
          patch.packageId = upPkg.id;
          patch.packageOfferPrice = upOffer ? upOffer.price : null;
          if (!Number(dup.value)) patch.value = global.PackagePricing.packagePrice(upPkg.id);
        }
        await global.rtdbUpdate(global.rtdbRef(global.rtdb, PIPELINE_PATH + '/' + dup.id), patch);
        await linkProspect(dup.id);
        clearLeadForm();
        showLeadStatus('Updated “' + (dup.company || dup.name) + '” in Client Pipeline · follow up ' + dateKey(follow) + '.', false);
        refreshScriptStats();
        return;
      }
    }

    var pkgId = selectedPackageId();
    var PP = global.PackagePricing;
    var pkg = pkgId && PP ? PP.packageById(pkgId) : null;
    var offer = pkg ? PP.activeOffer(pkgId) : null;
    var lead = {
      name: vars.name || vars.company,
      email: vars.email,
      phone: vars.phone,
      company: vars.company,
      projectType: pkg ? pkg.projectType : 'web',
      value: pkg ? PP.packagePrice(pkgId) : 0,
      packageId: pkg ? pkg.id : null,
      // Set while an offer is live, so a deposit on this lead claims a spot.
      packageOfferPrice: offer ? offer.price : null,
      stage: 'lead',
      source: 'cold',
      notes: note,
      followUpAt: dateKey(follow),
      outreachScriptId: s ? s.id : null,
      outreachScriptLabel: s ? s.label : null,
      createdAt: now,
      updatedAt: now
    };
    var ref = global.rtdbPush(global.rtdbRef(global.rtdb, PIPELINE_PATH));
    await global.rtdbSet(ref, lead);
    await linkProspect(ref.key);
    clearLeadForm();
    showLeadStatus('Added “' + who + '” to Client Pipeline · follow up ' + dateKey(follow) + '.', false);
    refreshScriptStats();
  }

  // ——— script results (which scripts move leads forward) ———

  var STAGE_RANK = { lead: 0, 'discovery-call': 1, proposal: 2, deposit: 3 };

  function escapeHtml(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function refreshScriptStats() {
    if (!els.statsBody || !global.rtdbGet) return;
    var leads;
    try { leads = await loadPipelineLeads(); } catch (e) { return; }
    var rows = {};
    leads.forEach(function (l) {
      if (!l.outreachScriptId) return;
      var key = l.outreachScriptId;
      var row = rows[key] || (rows[key] = { label: l.outreachScriptLabel || key, leads: 0, call: 0, won: 0 });
      var rank = STAGE_RANK[String(l.stage || 'lead')] || 0;
      row.leads += 1;
      if (rank >= 1) row.call += 1;
      if (rank >= 3) row.won += 1;
    });
    var list = Object.keys(rows).map(function (k) { return rows[k]; })
      .sort(function (a, b) { return b.leads - a.leads; });
    if (!list.length) {
      els.statsBody.innerHTML = '<p class="outreach-stats-empty">No leads added from Outreach Scripts yet.</p>';
      return;
    }
    function pct(n, d) { return d ? Math.round((n / d) * 100) + '%' : '—'; }
    els.statsBody.innerHTML =
      '<table class="outreach-stats-table"><thead><tr>' +
      '<th scope="col">Script</th><th scope="col">Leads</th><th scope="col">Reached a call</th><th scope="col">Won</th>' +
      '</tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><th scope="row">' + escapeHtml(r.label) + '</th>' +
          '<td>' + r.leads + '</td>' +
          '<td>' + r.call + ' <span class="outreach-stats-pct">' + pct(r.call, r.leads) + '</span></td>' +
          '<td>' + r.won + ' <span class="outreach-stats-pct">' + pct(r.won, r.leads) + '</span></td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  // ——— boot ———

  function cache() {
    els = {
      root: document.getElementById('outreach-composer'),
      scriptSelect: document.getElementById('outreach-script-select'),
      steps: document.getElementById('outreach-steps'),
      preview: document.getElementById('outreach-preview'),
      warn: document.getElementById('outreach-warn'),
      count: document.getElementById('outreach-count'),
      meta: document.getElementById('outreach-script-meta'),
      btnReset: document.getElementById('outreach-reset'),
      status: document.getElementById('outreach-status'),
      name: document.getElementById('outreach-var-name'),
      company: document.getElementById('outreach-var-company'),
      city: document.getElementById('outreach-var-city'),
      demo: document.getElementById('outreach-var-demo'),
      demoSelect: document.getElementById('outreach-var-demo-select'),
      phone: document.getElementById('outreach-var-phone'),
      emailAddr: document.getElementById('outreach-var-email'),
      packageSelect: document.getElementById('outreach-var-package'),
      pricingBlocks: document.getElementById('outreach-pricing-blocks'),
      offerWrap: document.getElementById('outreach-offer-wrap'),
      offerLead: document.getElementById('outreach-offer-lead'),
      offerHint: document.getElementById('outreach-offer-hint'),
      offerLeadRow: document.getElementById('outreach-offer-lead-row'),
      offerLeadSelect: document.getElementById('outreach-offer-lead-select'),
      offerLeadCustomWrap: document.getElementById('outreach-offer-lead-custom-wrap'),
      offerLeadCustom: document.getElementById('outreach-offer-lead-custom'),
      offerOneOff: document.getElementById('outreach-offer-oneoff'),
      offerOneOffNote: document.getElementById('outreach-offer-oneoff-note'),
      offerPrice: document.getElementById('outreach-offer-price'),
      offerSpots: document.getElementById('outreach-offer-spots'),
      offerEnds: document.getElementById('outreach-offer-ends'),
      linkTreeWrap: document.getElementById('outreach-linktree-wrap'),
      linkTree: document.getElementById('outreach-linktree'),
      btnCopy: document.getElementById('outreach-copy'),
      btnText: document.getElementById('outreach-text'),
      btnEmail: document.getElementById('outreach-email'),
      btnCall: document.getElementById('outreach-call'),
      btnAddLead: document.getElementById('outreach-add-lead'),
      adsToggle: document.getElementById('outreach-ads'),
      adsWrap: document.getElementById('outreach-ads-wrap'),
      ask: document.getElementById('outreach-ask'),
      askText: document.getElementById('outreach-ask-text'),
      askActions: document.getElementById('outreach-ask-actions'),
      leadStatus: document.getElementById('outreach-lead-status'),
      statsBody: document.getElementById('outreach-stats-body')
    };
  }

  function bind() {
    ['name', 'company', 'city', 'phone', 'emailAddr'].forEach(function (k) {
      if (!els[k]) return;
      els[k].addEventListener('input', function () {
        dirty = false;
        renderPreview(true);
        saveVars();
      });
    });
    // Pricing controls patch the generated lines in place, so a hand-edited
    // message survives switching package, offer wording, or the Link Tree line.
    [els.packageSelect, els.offerLead, els.offerLeadSelect, els.linkTree].forEach(function (el) {
      if (el) el.addEventListener('change', onPricingChange);
    });
    if (els.demoSelect) {
      els.demoSelect.addEventListener('change', function () {
        var v = els.demoSelect.value;
        if (v !== CUSTOM_DEMO && els.demo) els.demo.value = v;
        if (els.demo) {
          els.demo.hidden = v !== CUSTOM_DEMO;
          if (v === CUSTOM_DEMO && typeof els.demo.focus === 'function') els.demo.focus();
        }
        onPricingChange();
      });
    }
    if (els.demo) els.demo.addEventListener('input', onPricingChange);
    [els.offerLeadCustom, els.offerPrice, els.offerSpots, els.offerEnds].forEach(function (el) {
      if (el) el.addEventListener('input', onPricingChange);
    });
    if (els.offerEnds) els.offerEnds.addEventListener('change', onPricingChange);
    if (global.CarePricing && typeof global.CarePricing.onChange === 'function') {
      global.CarePricing.onChange(function () {
        renderPackageSelect();
        onPricingChange();
      });
    }
    if (els.scriptSelect) {
      els.scriptSelect.addEventListener('change', function () {
        var next = els.scriptSelect.value;
        if (next === baseOf(activeId)) return;
        if (!needsEditPrompt()) return applyScriptSelection(next, true);
        var prev = baseOf(activeId);
        // Ask about unsaved edits against the script they were made on.
        offerToSaveEdits(prev).then(function (ok) {
          if (ok) return applyScriptSelection(next, true);
          if (typeof global.setBusinessDocSelectValue === 'function') {
            global.setBusinessDocSelectValue(els.scriptSelect, prev, true);
          }
        });
      });
    }
    if (els.preview) {
      els.preview.addEventListener('input', function () {
        dirty = true;
        if (els.count) els.count.textContent = getBody().length + ' chars';
        var left = remainingTokens(getBody());
        if (els.warn) {
          if (left.length) {
            els.warn.textContent = 'Still has ' + left.join(' ') + ' — edit above before sending, or fill the helpers.';
            els.warn.hidden = false;
          } else {
            els.warn.hidden = true;
          }
        }
      });
    }
    if (els.btnCopy) els.btnCopy.addEventListener('click', doCopy);
    if (els.btnText) els.btnText.addEventListener('click', doText);
    if (els.btnEmail) els.btnEmail.addEventListener('click', doEmail);
    if (els.btnCall) els.btnCall.addEventListener('click', doCall);
    if (els.btnReset) els.btnReset.addEventListener('click', doReset);
    if (els.adsToggle) els.adsToggle.addEventListener('change', function () {
      var wanted = els.adsToggle.checked;
      function go() { applyScriptSelection(baseOf(activeId), true); }
      if (!needsEditPrompt()) return go();
      offerToSaveEdits(activeId).then(function (ok) {
        if (ok) return go();
        els.adsToggle.checked = !wanted;
      });
    });
    if (els.btnAddLead) els.btnAddLead.addEventListener('click', function () {
      addToPipeline().catch(function (err) {
        console.warn('Outreach composer: add to pipeline failed', err);
        showLeadStatus('Could not save the lead — check your connection and try again.', true);
      });
    });
  }

  var booted = false;
  var rendered = false;

  var opening = null;

  function open() {
    if (rendered) return Promise.resolve();
    if (!opening) {
      opening = openOnce().then(function () { opening = null; }, function () { opening = null; });
    }
    return opening;
  }

  async function openOnce() {
    cache();
    if (!els.root) return;
    // It's a tab now, not a popup: coming back to it keeps whatever you were
    // editing instead of re-rendering the script from scratch.
    if (rendered) return;
    if (!booted) { bind(); restoreVars(); booted = true; }
    if (els.status) { els.status.textContent = 'Loading scripts…'; els.status.hidden = false; }
    try {
      await ensureScripts();
      // Reopen on the last script used here (ads version included); the first
      // script is only the fallback, so the picker always has a selection.
      if (!activeId && hasScript(lastScript())) activeId = lastScript();
      if (!activeId && scripts.length) {
        activeId = scripts[0].id;
      }
      if (els.status) els.status.hidden = true;
      dirty = false;
      renderScriptSelect();
      renderPackageSelect();
      renderOfferLeadSelect();
      resetLinkTreeDefault();
      renderSteps();
      renderPreview(true);
      rendered = true;
      refreshScriptStats();
    } catch (err) {
      console.warn('Outreach composer:', err);
      if (els.status) {
        els.status.textContent = err && err.message ? err.message : 'Could not load scripts.';
        els.status.hidden = false;
      }
      // Say why inside the picker too, so it never opens as an empty box.
      var menu = document.getElementById('outreach-script-menu');
      if (menu && !menu.querySelector('.business-doc-select-option')) {
        menu.innerHTML = '<p class="outreach-script-empty">' +
          escapeHtml(err && err.message ? err.message : 'Could not load scripts.') + '</p>';
      }
    }
  }

  global.CWR_OUTREACH = { open: open, prefill: prefill };

  // The admin can reopen straight onto this tab (saved active tab) before this
  // file loads, so the tab's own open() call would have found nothing.
  var panel = document.getElementById('admin-panel-outreach');
  if (panel && !panel.hidden) open();
})(window);
