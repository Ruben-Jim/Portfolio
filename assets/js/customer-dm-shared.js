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

  function renderDmMessageBodyHtml(msg) {
    return escapeDmHtml(msg && msg.body ? msg.body : '').replace(/\n/g, '<br>');
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
    return messages
      .map(function (msg) {
        var mine = msg.senderRole === 'customer';
        var fromContact = isContactFormMessage(msg);
        var fromHireMe = isHireMeFormMessage(msg);
        var readBit =
          options.showReadState && !mine
            ? ' · Read: ' + (msg.readByCustomer ? 'yes' : 'no')
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
    var stopped = false;
    var threadRef = rtdbThreadRef(conversationId);
    var q = window.rtdbQuery(threadRef, window.rtdbOrderByChild('createdAt'), window.rtdbLimitToFirst(200));

    // Listeners only work once this browser holds the conversation's session.
    ensureCustomerAuth(session).then(start, function (err) {
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
      if (typeof callbacks.onMeta === 'function') {
        callbacks.onMeta(snap.val() || {});
      }
    });

    if (window.rtdbSet) {
      window
        .rtdbSet(rtdbPresenceRef(conversationId, 'customer'), {
          senderRole: 'customer',
          isOnline: true,
          isTyping: false,
          updatedAt: window.rtdbServerTimestamp()
        })
        .catch(function () {});
    }
    }

    return {
      stop: function () {
        stopped = true;
        if (unsubMessages && typeof unsubMessages === 'function') unsubMessages();
        if (unsubMeta && typeof unsubMeta === 'function') unsubMeta();
        unsubMessages = null;
        unsubMeta = null;
      }
    };
  }

  async function sendCustomerMessage(conversationId, session, text, attachmentUrl) {
    var cleanAttachmentUrl = normalizeDmAttachmentUrl(attachmentUrl);
    var body = String(text || '').trim();
    if (!body && !cleanAttachmentUrl) return;
    var displayName = (session && session.customerName) || 'Customer';
    await ensureCustomerAuth(Object.assign({}, session || {}, { conversationId: conversationId }));
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
    setCustomerTyping: setCustomerTyping
  };
})();
