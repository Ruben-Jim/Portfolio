/**
 * Shared customer DM helpers — Messages page and client portal.
 * Requires window.rtdb + RTDB helpers from Firebase bootstrap.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'customerDmSession';

  function promiseWithTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('TIMED_OUT'));
        }, ms);
      })
    ]);
  }

  function escapeDmHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDMDate(value) {
    if (value == null || value === '') return '';
    var date;
    if (typeof value === 'number') {
      date = new Date(value);
    } else if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value && typeof value === 'object' && value.seconds != null) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /** Shorter timestamp for status pills on narrow screens */
  function formatDMDateCompact(value) {
    if (value == null || value === '') return '';
    var date;
    if (typeof value === 'number') {
      date = new Date(value);
    } else if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value && typeof value === 'object' && value.seconds != null) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function normalizeDmAttachmentUrl(raw) {
    var url = String(raw || '').trim();
    if (!url) return '';
    try {
      var parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    } catch (e) {}
    return '';
  }

  function isContactFormMessage(msg) {
    return !!(msg && String(msg.source || '').toLowerCase() === 'contact');
  }

  function isHireMeFormMessage(msg) {
    return !!(msg && String(msg.source || '').toLowerCase() === 'hire-me');
  }

  function renderContactFormSourceBadgeHtml(forAdmin) {
    var label = forAdmin ? 'Contact form submission' : 'Contact form';
    return (
      '<span class="dm-message-source-badge dm-message-source-badge--contact">' +
      '<ion-icon name="mail-outline" aria-hidden="true"></ion-icon>' +
      '<span>' +
      escapeDmHtml(label) +
      '</span></span>'
    );
  }

  function renderHireMeSourceBadgeHtml(forAdmin) {
    var label = forAdmin ? 'Hire Me inquiry' : 'Hire Me';
    return (
      '<span class="dm-message-source-badge dm-message-source-badge--hire-me">' +
      '<ion-icon name="rocket-outline" aria-hidden="true"></ion-icon>' +
      '<span>' +
      escapeDmHtml(label) +
      '</span></span>'
    );
  }

  /**
   * Escaped message text with web links made tappable (new tab, no referrer). Runs on the
   * already-escaped text, so nothing the sender typed can become markup; trailing
   * punctuation (".", ")", "!") stays outside the link.
   */
  function renderDmMessageBodyHtml(msg) {
    var safe = escapeDmHtml(msg && msg.body ? msg.body : '');
    var linked = safe.replace(/\bhttps?:\/\/[^\s<]+/gi, function (url) {
      var trail = (url.match(/(?:[.,!?;:)\]]|&#39;|&quot;)+$/) || [''])[0];
      var href = trail ? url.slice(0, -trail.length) : url;
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(href)) return url;
      return '<a class="dm-message-link" href="' + href + '" target="_blank" rel="noopener noreferrer nofollow">' + href + '</a>' + trail;
    });
    return linked.replace(/\n/g, '<br>');
  }

  function renderDmAttachmentHtml(msg) {
    var href = normalizeDmAttachmentUrl(msg && msg.attachmentUrl);
    if (!href) return '';
    return (
      '<a class="dm-attachment-link" href="' +
      escapeDmHtml(href) +
      '" target="_blank" rel="noopener noreferrer">Attachment</a>'
    );
  }

  function rtdbThreadRef(conversationId) {
    return window.rtdbRef(window.rtdb, 'dm/threadMessages/' + conversationId);
  }

  function rtdbMetaRef(conversationId) {
    return window.rtdbRef(window.rtdb, 'dm/meta/' + conversationId);
  }

  function rtdbPresenceRef(conversationId, role) {
    return window.rtdbRef(window.rtdb, 'dm/presence/' + conversationId + '/' + role);
  }

  function formatRtdbPortalError(err) {
    if (!err) return 'Could not connect to the message server.';
    var code = err.code != null ? String(err.code) : '';
    var raw = typeof err.message === 'string' ? err.message : String(err);
    var low = (raw + ' ' + code).toLowerCase();
    if (low.indexOf('disabled') !== -1) {
      return 'Realtime Database is disabled in the Firebase project. In Firebase Console → Build → Realtime Database, create or re-enable the database, then try again.';
    }
    if (code === 'PERMISSION_DENIED' || low.indexOf('permission_denied') !== -1) {
      return 'Permission denied. Deploy database rules (firebase deploy --only database).';
    }
    if (raw === 'TIMED_OUT') {
      return 'Connection timed out. Confirm Realtime Database is enabled and your network allows access.';
    }
    return raw || 'Something went wrong.';
  }

  function isCustomerDmPortalEnabled() {
    var flags = window.DM_FEATURE_FLAGS || {};
    if (flags.enableCustomerDmPortal === false) return false;
    if (flags.enableCustomerMagicLinks === false && flags.enableCustomerDmPortal == null) return false;
    return true;
  }

  function readCustomerSession() {
    try {
      var saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      var parsed = JSON.parse(saved);
      if (!parsed || !parsed.conversationId) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCustomerSession(session) {
    if (!session || !session.conversationId) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearCustomerSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  // ── Customer chat (website message sheet + client portal) ──────────────
  // One look for both: header with CodeWithRuben + your status, inquiry card,
  // optional quick actions, bubbles, one-row reply bar. Inline SVG icons so the
  // portal (no icon library) can use them. Styles: assets/css/customer-chat.css.

  var CC_ICONS = {
    down: '<path d="M6 9l6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    tag: '<path d="M20 12l-8 8-8.5-8.5V4h7.5z"/><circle cx="8" cy="8" r="1.4"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 4.5-2 4.5s3-.5 4.5-2M9 15l-3-3c1-4 5-8 12-9-1 7-5 11-9 12z"/><circle cx="14.5" cy="9.5" r="1.6"/>',
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>'
  };

  function ccIcon(name) {
    return '<svg class="cc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (CC_ICONS[name] || '') + '</svg>';
  }

  /** Header: close (⌄ on phones, × on desktop), logo + name, your status line. */
  function renderChatHeaderHtml(opts) {
    opts = opts || {};
    return (
      '<header class="cc-head" data-cc-head>' +
      '<span class="cc-grab" aria-hidden="true"></span>' +
      '<div class="cc-head-row">' +
      '<button type="button" class="cc-icon-btn cc-close' + (opts.closeClass ? ' ' + opts.closeClass : '') + '"' +
      (opts.closeId ? ' id="' + opts.closeId + '"' : '') + ' aria-label="Close conversation">' +
      '<span class="cc-close-down">' + ccIcon('down') + '</span><span class="cc-close-x">' + ccIcon('close') + '</span></button>' +
      '<img class="cc-avatar" src="/assets/images/logo/logo.svg" alt="" width="40" height="40">' +
      '<div class="cc-who">' +
      '<h3 class="cc-name"' + (opts.titleId ? ' id="' + opts.titleId + '"' : '') + '>CodeWithRuben</h3>' +
      '<p class="cc-status" data-cc-presence>Usually replies within a day</p>' +
      '</div></div></header>'
    );
  }

  /** Your status for the customer: typing beats online beats the usual reply time. */
  function renderAdminPresence(rootEl, presence) {
    var el = rootEl && rootEl.querySelector('[data-cc-presence]');
    if (!el) return;
    var p = presence || {};
    el.classList.toggle('is-online', !!p.isOnline && !p.isTyping);
    el.classList.toggle('is-typing', !!p.isTyping);
    el.textContent = p.isTyping ? 'Ruben is typing…' : p.isOnline ? 'Online now' : 'Usually replies within a day';
  }

  /** What they sent in the Hire Me form, shown back to them at the top of the chat. */
  function renderInquiryCardHtml(meta) {
    meta = meta || {};
    var src = String(meta.originSource || meta.source || '').toLowerCase();
    var given = function (v) {
      var s = String(v == null ? '' : v).trim();
      return s && !/^not specified$/i.test(s) ? s : '';
    };
    var rows = [];
    var pkgId = given(meta.packageId);
    if (pkgId) {
      var pkg = window.PackagePricing && window.PackagePricing.packageById ? window.PackagePricing.packageById(pkgId) : null;
      rows.push(['Package', (pkg && pkg.name) || pkgId]);
    }
    if (given(meta.projectType)) rows.push(['Project', given(meta.projectType)]);
    if (given(meta.budget)) rows.push(['Budget', given(meta.budget)]);
    if (src !== 'hire-me' || !rows.length) return '';
    return (
      '<section class="cc-card" aria-label="Your inquiry">' +
      '<div class="cc-card-head">' + ccIcon('rocket') + '<span>Your inquiry</span></div>' +
      '<dl class="cc-card-rows">' +
      rows.map(function (r) {
        return '<div class="cc-card-row"><dt>' + escapeDmHtml(r[0]) + '</dt><dd>' + escapeDmHtml(r[1]) + '</dd></div>';
      }).join('') +
      '</dl></section>'
    );
  }

  function safeHttpUrl(raw) {
    var href = normalizeDmAttachmentUrl(raw);
    return href && /^https:/i.test(href) ? href : '';
  }

  /** Buttons above the reply bar, only when the admin switched them on (meta.quickActions). */
  function renderQuickActionsHtml(meta) {
    meta = meta || {};
    if (meta.quickActions !== true) return '';
    var items = [
      { href: '/schedule', icon: 'calendar', label: 'Book a call' },
      { href: '/services-pricing', icon: 'tag', label: 'See pricing' },
      { href: '/hire-me', icon: 'rocket', label: 'Start a project' }
    ];
    var deposit = safeHttpUrl(meta.depositUrl);
    if (deposit) items.push({ href: deposit, icon: 'card', label: 'Pay deposit', external: true });
    return items.map(function (a) {
      var ext = a.external || /^https?:/i.test(a.href);
      return '<a class="cc-quick" href="' + escapeDmHtml(a.href) + '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + ccIcon(a.icon) + '<span>' + a.label + '</span></a>';
    }).join('');
  }

  /** Shown instead of the thread once the conversation is gone (deleted by CWR). */
  function renderEndedHtml() {
    return (
      '<div class="cc-ended" role="status">' +
      '<span class="cc-ended-icon">' + ccIcon('chat') + '</span>' +
      '<p class="cc-ended-title">This conversation has ended.</p>' +
      '<p class="cc-ended-text">Need anything else? Start a new one and it comes straight to Ruben.</p>' +
      '<button type="button" class="cc-btn" data-cc-start-new>Start a new conversation</button>' +
      '</div>'
    );
  }

  /** Reply box grows with the text, up to about five lines. */
  function autosizeComposer(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    var full = textarea.scrollHeight;
    textarea.style.height = Math.min(full, 132) + 'px';
    textarea.classList.toggle('is-scrolling', full > 132);
  }

  /** Phones: drag the header down to close the full-screen sheet. */
  function bindSwipeToClose(headEl, panelEl, onClose) {
    if (!headEl || !panelEl || headEl.dataset.ccSwipe) return;
    headEl.dataset.ccSwipe = '1';
    var startY = 0;
    var dy = 0;
    var dragging = false;
    headEl.addEventListener('touchstart', function (e) {
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      if (e.target.closest('button, a, input, textarea')) return;
      dragging = true;
      startY = e.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    headEl.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      panelEl.style.transition = 'none';
      panelEl.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    headEl.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      panelEl.style.transition = '';
      panelEl.style.transform = '';
      if (dy > 110 && typeof onClose === 'function') onClose();
    });
  }

  function isConversationEndedError(err) {
    return !!(err && err.code === 'CONVERSATION_ENDED');
  }

  function conversationEndedError() {
    var e = new Error('This conversation has ended.');
    e.code = 'CONVERSATION_ENDED';
    return e;
  }

  function renderMessagesHtml(messages, options) {
    options = options || {};
    if (!messages.length) {
      return (
        '<div class="dm-thread-empty no-messages" role="status">' +
        '<p class="dm-thread-empty-title">No messages yet</p>' +
        '<p class="dm-thread-empty-hint">' +
        escapeDmHtml(options.emptyHint || 'Your conversation appears here in real time.') +
        '</p></div>'
      );
    }
    // "Seen" sits under the customer's latest message once CWR has read it.
    var lastMineIdx = -1;
    messages.forEach(function (m, i) { if (m.senderRole === 'customer') lastMineIdx = i; });
    return messages
      .map(function (msg, idx) {
        var mine = msg.senderRole === 'customer';
        var fromContact = isContactFormMessage(msg);
        var fromHireMe = isHireMeFormMessage(msg);
        var readBit =
          options.showReadState && mine && idx === lastMineIdx && msg.readByAdmin
            ? ' · <span class="cc-seen">Seen</span>'
            : '';
        return (
          '<div class="dm-message-row ' +
          (mine ? 'dm-message-customer' : 'dm-message-admin') +
          (fromContact ? ' dm-message-row--from-contact-form' : '') +
          (fromHireMe ? ' dm-message-row--from-hire-me' : '') +
          '">' +
          '<div class="dm-message-bubble' +
          (fromContact ? ' dm-message-bubble--from-contact-form' : '') +
          (fromHireMe ? ' dm-message-bubble--from-hire-me' : '') +
          '">' +
          (fromContact ? renderContactFormSourceBadgeHtml(false) : '') +
          (fromHireMe ? renderHireMeSourceBadgeHtml(false) : '') +
          '<p class="dm-message-author">' +
          (mine ? 'You' : 'Admin') +
          '</p>' +
          '<div class="dm-message-body">' +
          renderDmMessageBodyHtml(msg) +
          '</div>' +
          renderDmAttachmentHtml(msg) +
          '<p class="dm-message-meta">' +
          formatDMDate(msg.createdAt) +
          readBit +
          '</p></div></div>'
        );
      })
      .join('');
  }

  function renderAdminMessageRowHtml(msg) {
    var mine = msg.senderRole === 'admin';
    var fromContact = isContactFormMessage(msg);
    var fromHireMe = isHireMeFormMessage(msg);
    var authorLabel = mine ? 'You' : 'Customer';
    var readBit = mine ? ' · Read: ' + (msg.readByCustomer ? 'yes' : 'no') : '';
    return (
      '<div class="dm-message-row ' +
      (mine ? 'dm-message-admin' : 'dm-message-customer') +
      (fromContact ? ' dm-message-row--from-contact-form' : '') +
      (fromHireMe ? ' dm-message-row--from-hire-me' : '') +
      '">' +
      '<div class="dm-message-bubble' +
      (fromContact ? ' dm-message-bubble--from-contact-form' : '') +
      (fromHireMe ? ' dm-message-bubble--from-hire-me' : '') +
      '">' +
      (fromContact ? renderContactFormSourceBadgeHtml(true) : '') +
      (fromHireMe ? renderHireMeSourceBadgeHtml(true) : '') +
      '<p class="dm-message-author">' +
      escapeDmHtml(authorLabel) +
      '</p>' +
      '<div class="dm-message-body">' +
      renderDmMessageBodyHtml(msg) +
      '</div>' +
      renderDmAttachmentHtml(msg) +
      '<p class="dm-message-meta">' +
      formatDMDate(msg.createdAt) +
      readBit +
      '</p></div></div>'
    );
  }

  function renderMessagesToElement(listEl, messages, options) {
    if (!listEl) return;
    listEl.innerHTML = renderMessagesHtml(messages, options);
    listEl.scrollTop = listEl.scrollHeight;
  }

  function renderStatusBadgesHtml(meta) {
    var status = String((meta && meta.status) || 'open').toLowerCase();
    var statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    var updated = formatDMDateCompact(meta && (meta.lastMessageAt || meta.updatedAt || meta.createdAt));
    var unread = Number((meta && meta.unreadCustomer) || 0);
    return [
      '<span class="dm-customer-status-pill dm-customer-status-pill--' +
        escapeDmHtml(status) +
        '">Status: ' +
        escapeDmHtml(statusLabel) +
        '</span>',
      updated
        ? '<span class="dm-customer-status-pill dm-customer-status-pill--updated">Updated ' +
          escapeDmHtml(updated) +
          '</span>'
        : '',
      unread > 0
        ? '<span class="dm-customer-status-pill dm-customer-status-pill--unread">Unread: ' + unread + '</span>'
        : ''
    ].join('');
  }

  function normalizeDmSource(raw) {
    var s = String(raw || '')
      .trim()
      .toLowerCase();
    if (s === 'hire-me' || s === 'contact' || s === 'client-portal' || s === 'portal') return s;
    return '';
  }

  function defaultTagsForSource(source) {
    if (source === 'client-portal') return ['client-portal'];
    if (source === 'contact') return ['contact'];
    if (source === 'hire-me') return ['hire-me'];
    if (source === 'portal') return ['portal'];
    return [];
  }

  /**
   * Find or create one conversation per email.
   * options: source, subject, projectType, budget, tags, agencyProjectId
   * - source / lead fields update on existing threads
   * - originSource is set once on create (or backfilled if missing) and never overwritten
   */
  // ——— session: dmSession function + a token scoped to one conversation ———
  // The browser can't query dm/meta by email (database.rules.json). The
  // dmSession function finds or creates the conversation and returns a custom
  // token whose dmConv claim is that conversation, which is all the rules let
  // a customer read or write. See the security notes (~/Dev/Apps/blueprints/portfolio-security.md, kept out of this public repo).

  function dmSessionUrl() {
    var base = window.CWR_FUNCTIONS_BASE || 'https://us-central1-portfolio-2578e.cloudfunctions.net';
    return base.replace(/\/+$/, '') + '/dmSession';
  }

  function authInstance() {
    if (window.firebaseAuth) return window.firebaseAuth;
    if (typeof window.getAuth === 'function') {
      try { window.firebaseAuth = window.getAuth(); } catch (e) { return null; }
    }
    return window.firebaseAuth || null;
  }

  /** Signed in as the site owner — admin rules already cover every thread. */
  function signedInAsAdmin() {
    var auth = authInstance();
    var u = auth && auth.currentUser;
    return !!(u && u.email && typeof window.isAdminEmail === 'function' && window.isAdminEmail(u.email));
  }

  async function callDmSession(body) {
    var res = await promiseWithTimeout(fetch(dmSessionUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }), 20000);
    var data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON error */ }
    if (!res.ok || !data.ok) throw new Error(data.error || 'Could not open your conversation. Try again.');
    return data;
  }

  async function signInWithSessionToken(token) {
    if (!token || signedInAsAdmin()) return;
    var auth = authInstance();
    if (!auth || typeof window.signInWithCustomToken !== 'function') {
      throw new Error('Sign-in is not ready yet. Refresh and try again.');
    }
    await window.signInWithCustomToken(auth, token);
  }

  /** Make sure this browser holds a session for `conversationId` (silently re-opens it by email). */
  async function ensureCustomerAuth(session) {
    if (!session || !session.conversationId || signedInAsAdmin()) return;
    var auth = authInstance();
    var u = auth && auth.currentUser;
    if (u) {
      try {
        var tok = await u.getIdTokenResult();
        if (tok && tok.claims && tok.claims.dmConv === session.conversationId) return;
      } catch (e) { /* fall through and re-open */ }
    }
    if (!session.customerEmail) throw new Error('Open your conversation with your email first.');
    var data = await callDmSession({ email: session.customerEmail, name: session.customerName || '', lookupOnly: true });
    // No conversation for this email any more (or a different, newer one): the one
    // this browser remembers was deleted.
    if (!data.conversation || (data.conversation.id && data.conversation.id !== session.conversationId)) {
      throw conversationEndedError();
    }
    await signInWithSessionToken(data.token);
  }

  /**
   * Find or create one conversation per email.
   * options: source, subject, projectType, budget, tags, portalToken
   * - source / lead fields update on existing threads
   * - originSource is set once on create (or backfilled if missing) and never overwritten
   * - client-portal chat passes portalToken; the server links agencyProjectId from it
   */
  async function getOrCreateConversationForEmail(email, name, options) {
    options = options || {};
    var body = { email: String(email || '').trim().toLowerCase(), name: name || '' };
    ['source', 'subject', 'projectType', 'budget', 'tags', 'portalToken'].forEach(function (k) {
      if (options[k] != null) body[k] = options[k];
    });
    if (body.projectType == null && options.project_type != null) body.projectType = options.project_type;
    var data = await callDmSession(body);
    await signInWithSessionToken(data.token);
    return data.conversation;
  }

  function rtdbTimestampToIso(value) {
    if (value == null || value === '') return new Date().toISOString();
    if (typeof value === 'number') {
      var fromNum = new Date(value);
      return isNaN(fromNum.getTime()) ? new Date().toISOString() : fromNum.toISOString();
    }
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (value && typeof value === 'object' && value.seconds != null) {
      return new Date(value.seconds * 1000).toISOString();
    }
    var parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  /**
   * Read-only lookup: find existing conversation meta by email (does not create).
   */
  async function lookupConversationByEmail(email) {
    email = String(email || '').trim().toLowerCase();
    if (!email) return null;
    var data = await callDmSession({ email: email, lookupOnly: true });
    if (!data.conversation) return null;
    await signInWithSessionToken(data.token);
    return data.conversation;
  }

  /**
   * First hire-me (or customer) opening message for inquiry restore on a new device.
   */
  async function fetchOpeningInquiryMessage(conversationId) {
    if (!conversationId || !window.rtdbGet) return null;
    var threadRef = rtdbThreadRef(conversationId);
    var q = window.rtdbQuery(threadRef, window.rtdbOrderByChild('createdAt'), window.rtdbLimitToFirst(200));
    var snap = await promiseWithTimeout(window.rtdbGet(q), 20000);
    var val = snap.val();
    if (!val) return null;
    var messages = Object.keys(val)
      .map(function (k) {
        return Object.assign({}, val[k], { id: k });
      })
      .sort(function (a, b) {
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
    for (var i = 0; i < messages.length; i++) {
      if (String(messages[i].source || '').toLowerCase() === 'hire-me' && messages[i].body) {
        return messages[i];
      }
    }
    for (var j = 0; j < messages.length; j++) {
      if (messages[j].body && String(messages[j].senderRole || '').toLowerCase() === 'customer') {
        return messages[j];
      }
    }
    return messages[0] || null;
  }

  function buildHireMeInquiryFromConversation(meta, openingMsg) {
    meta = meta || {};
    openingMsg = openingMsg || {};
    var message = String(openingMsg.body || meta.lastMessage || '').trim();
    return {
      name: String(meta.customerName || '').trim(),
      email: String(meta.customerEmail || '').trim().toLowerCase(),
      message: message,
      project_type: String(meta.projectType || openingMsg.project_type || 'Not specified').trim(),
      budget: String(meta.budget || openingMsg.budget || 'Not specified').trim(),
      submittedAt: rtdbTimestampToIso(openingMsg.createdAt || meta.createdAt || meta.lastMessageAt)
    };
  }

  /**
   * Subscribe to customer thread + meta. Returns { stop }.
   */
  function subscribeCustomerThread(session, callbacks) {
    callbacks = callbacks || {};
    var conversationId = session && session.conversationId;
    if (!conversationId || !window.rtdbOnValue) {
      return { stop: function () {} };
    }

    var unsubMessages = null;
    var unsubMeta = null;
    var unsubAdminPresence = null;
    var stopped = false;
    var ended = false;
    var presenceAnnounced = false;
    var threadRef = rtdbThreadRef(conversationId);
    var q = window.rtdbQuery(threadRef, window.rtdbOrderByChild('createdAt'), window.rtdbLimitToFirst(200));

    function endConversation() {
      if (ended) return;
      ended = true;
      stopAll();
      if (typeof callbacks.onEnded === 'function') callbacks.onEnded();
    }

    // Listeners only work once this browser holds the conversation's session.
    ensureCustomerAuth(session).then(start, function (err) {
      if (isConversationEndedError(err)) { endConversation(); return; }
      console.warn('Customer DM: could not open session', err);
      if (typeof callbacks.onError === 'function') callbacks.onError(err);
    });

    function start() {
    if (stopped) return;
    unsubMessages = window.rtdbOnValue(q, async function (snap) {
      var val = snap.val() || {};
      var messages = Object.keys(val)
        .map(function (k) {
          return Object.assign({}, val[k], { id: k });
        })
        .sort(function (a, b) {
          return (a.createdAt || 0) - (b.createdAt || 0);
        });
      if (typeof callbacks.onMessages === 'function') {
        callbacks.onMessages(messages);
      }
      var unread = messages.filter(function (m) {
        return !m.readByCustomer;
      });
      if (unread.length && window.rtdbUpdate) {
        var rootRef = window.rtdbRef(window.rtdb);
        var patch = {};
        unread.forEach(function (msg) {
          patch['dm/threadMessages/' + conversationId + '/' + msg.id + '/readByCustomer'] = true;
          patch['dm/threadMessages/' + conversationId + '/' + msg.id + '/readAtCustomer'] =
            window.rtdbServerTimestamp();
        });
        await window.rtdbUpdate(rootRef, patch).catch(function () {});
      }
      // snap.exists() goes false the moment an admin deletes the conversation —
      // and this listener fires on that deletion. Writing meta here would
      // RESURRECT dm/meta/<id>, because an RTDB update() creates any path it
      // does not find. The rebuilt node holds only these two fields, so it shows
      // in the admin inbox as "Customer / —" with a brand-new updatedAt and
      // sorts straight to the top. Only touch meta while the thread is real.
      if (window.rtdbUpdate && snap.exists()) {
        await window.rtdbUpdate(rtdbMetaRef(conversationId), {
          unreadCustomer: 0,
          updatedAt: window.rtdbServerTimestamp()
        }).catch(function () {});
      }
    });

    unsubMeta = window.rtdbOnValue(rtdbMetaRef(conversationId), function (snap) {
      // Meta gone = CWR deleted the conversation.
      if (!snap.exists()) { endConversation(); return; }
      if (typeof callbacks.onMeta === 'function') {
        callbacks.onMeta(snap.val() || {});
      }
      // Say "online" only for a conversation that exists, so a deleted one never
      // gets a stray presence entry written back.
      if (!presenceAnnounced && window.rtdbSet) {
        presenceAnnounced = true;
        window
          .rtdbSet(rtdbPresenceRef(conversationId, 'customer'), {
            senderRole: 'customer',
            isOnline: true,
            isTyping: false,
            updatedAt: window.rtdbServerTimestamp()
          })
          .catch(function () {});
      }
    }, function () {
      // Read refused: this browser's access to the conversation is gone.
      endConversation();
    });

    // Ruben's online / typing status for the header.
    if (typeof callbacks.onAdminPresence === 'function') {
      unsubAdminPresence = window.rtdbOnValue(rtdbPresenceRef(conversationId, 'admin'), function (snap) {
        callbacks.onAdminPresence(snap.val() || {});
      }, function () {});
    }
    }

    function stopAll() {
      stopped = true;
      if (unsubMessages && typeof unsubMessages === 'function') unsubMessages();
      if (unsubMeta && typeof unsubMeta === 'function') unsubMeta();
      if (unsubAdminPresence && typeof unsubAdminPresence === 'function') unsubAdminPresence();
      unsubMessages = null;
      unsubMeta = null;
      unsubAdminPresence = null;
    }

    return { stop: stopAll };
  }

  async function sendCustomerMessage(conversationId, session, text, attachmentUrl) {
    var cleanAttachmentUrl = normalizeDmAttachmentUrl(attachmentUrl);
    var body = String(text || '').trim();
    if (!body && !cleanAttachmentUrl) return;
    var displayName = (session && session.customerName) || 'Customer';
    await ensureCustomerAuth(Object.assign({}, session || {}, { conversationId: conversationId }));
    // A message into a deleted conversation would be saved with no meta, where CWR
    // never sees it. Check first.
    if (window.rtdbGet) {
      var metaSnap = await window.rtdbGet(rtdbMetaRef(conversationId)).catch(function () { return null; });
      if (!metaSnap || !metaSnap.exists()) throw conversationEndedError();
    }
    var msgRef = window.rtdbPush(rtdbThreadRef(conversationId));
    await window.rtdbSet(msgRef, {
      senderRole: 'customer',
      senderName: displayName,
      body: body,
      attachmentUrl: cleanAttachmentUrl,
      createdAt: window.rtdbServerTimestamp(),
      readByAdmin: false,
      readByCustomer: true,
      type: cleanAttachmentUrl ? 'attachment' : 'text'
    });
    var metaPatch = {
      lastMessage: body,
      lastMessageAt: window.rtdbServerTimestamp(),
      status: 'open',
      updatedAt: window.rtdbServerTimestamp()
    };
    if (window.rtdbIncrement) {
      metaPatch.unreadAdmin = window.rtdbIncrement(1);
    } else {
      metaPatch.unreadAdmin = 1;
    }
    await window.rtdbUpdate(rtdbMetaRef(conversationId), metaPatch);
  }

  function setCustomerTyping(conversationId, isTyping) {
    if (!conversationId || !window.rtdbSet) return Promise.resolve();
    return window.rtdbSet(rtdbPresenceRef(conversationId, 'customer'), {
      senderRole: 'customer',
      isOnline: true,
      isTyping: !!isTyping,
      updatedAt: window.rtdbServerTimestamp()
    });
  }

  window.CustomerDmShared = {
    SESSION_KEY: SESSION_KEY,
    promiseWithTimeout: promiseWithTimeout,
    escapeDmHtml: escapeDmHtml,
    formatDMDate: formatDMDate,
    normalizeDmAttachmentUrl: normalizeDmAttachmentUrl,
    renderDmMessageBodyHtml: renderDmMessageBodyHtml,
    renderDmAttachmentHtml: renderDmAttachmentHtml,
    isContactFormMessage: isContactFormMessage,
    isHireMeFormMessage: isHireMeFormMessage,
    renderContactFormSourceBadgeHtml: renderContactFormSourceBadgeHtml,
    renderHireMeSourceBadgeHtml: renderHireMeSourceBadgeHtml,
    renderAdminMessageRowHtml: renderAdminMessageRowHtml,
    rtdbThreadRef: rtdbThreadRef,
    rtdbMetaRef: rtdbMetaRef,
    rtdbPresenceRef: rtdbPresenceRef,
    formatRtdbPortalError: formatRtdbPortalError,
    isCustomerDmPortalEnabled: isCustomerDmPortalEnabled,
    readCustomerSession: readCustomerSession,
    writeCustomerSession: writeCustomerSession,
    clearCustomerSession: clearCustomerSession,
    renderMessagesHtml: renderMessagesHtml,
    renderMessagesToElement: renderMessagesToElement,
    renderStatusBadgesHtml: renderStatusBadgesHtml,
    getOrCreateConversationForEmail: getOrCreateConversationForEmail,
    lookupConversationByEmail: lookupConversationByEmail,
    ensureCustomerAuth: ensureCustomerAuth,
    fetchOpeningInquiryMessage: fetchOpeningInquiryMessage,
    buildHireMeInquiryFromConversation: buildHireMeInquiryFromConversation,
    subscribeCustomerThread: subscribeCustomerThread,
    sendCustomerMessage: sendCustomerMessage,
    setCustomerTyping: setCustomerTyping,
    // Customer chat UI (website sheet + client portal)
    ccIcon: ccIcon,
    renderChatHeaderHtml: renderChatHeaderHtml,
    renderAdminPresence: renderAdminPresence,
    renderInquiryCardHtml: renderInquiryCardHtml,
    renderQuickActionsHtml: renderQuickActionsHtml,
    renderEndedHtml: renderEndedHtml,
    autosizeComposer: autosizeComposer,
    bindSwipeToClose: bindSwipeToClose,
    isConversationEndedError: isConversationEndedError
  };
})();
