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

  function renderContactFormSourceBadgeHtml(forAdmin) {
    var label = forAdmin ? 'Contact form submission' : 'Sent via contact form';
    return (
      '<span class="dm-message-source-badge dm-message-source-badge--contact">' +
      '<ion-icon name="mail-outline" aria-hidden="true"></ion-icon>' +
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
        var readBit =
          options.showReadState && !mine
            ? ' · Read: ' + (msg.readByCustomer ? 'yes' : 'no')
            : '';
        return (
          '<div class="dm-message-row ' +
          (mine ? 'dm-message-customer' : 'dm-message-admin') +
          (fromContact ? ' dm-message-row--from-contact-form' : '') +
          '">' +
          '<div class="dm-message-bubble' +
          (fromContact ? ' dm-message-bubble--from-contact-form' : '') +
          '">' +
          (fromContact ? renderContactFormSourceBadgeHtml(false) : '') +
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
    var authorLabel = mine ? 'You' : 'Customer';
    var readBit = mine ? ' · Read: ' + (msg.readByCustomer ? 'yes' : 'no') : '';
    return (
      '<div class="dm-message-row ' +
      (mine ? 'dm-message-admin' : 'dm-message-customer') +
      (fromContact ? ' dm-message-row--from-contact-form' : '') +
      '">' +
      '<div class="dm-message-bubble' +
      (fromContact ? ' dm-message-bubble--from-contact-form' : '') +
      '">' +
      (fromContact ? renderContactFormSourceBadgeHtml(true) : '') +
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
    var updated = formatDMDate(meta && (meta.lastMessageAt || meta.updatedAt || meta.createdAt));
    var unread = Number((meta && meta.unreadCustomer) || 0);
    return [
      '<span class="dm-customer-status-pill dm-customer-status-pill--' +
        escapeDmHtml(status) +
        '">Status: ' +
        escapeDmHtml(statusLabel) +
        '</span>',
      updated ? '<span class="dm-customer-status-pill">Updated: ' + escapeDmHtml(updated) + '</span>' : '',
      unread > 0
        ? '<span class="dm-customer-status-pill">Unread: ' + unread + '</span>'
        : '<span class="dm-customer-status-pill">Unread: 0</span>'
    ].join('');
  }

  async function getOrCreateConversationForEmail(email, name, options) {
    options = options || {};
    var metaRoot = window.rtdbRef(window.rtdb, 'dm/meta');
    var q = window.rtdbQuery(
      metaRoot,
      window.rtdbOrderByChild('customerEmail'),
      window.rtdbEqualTo(email.toLowerCase()),
      window.rtdbLimitToFirst(1)
    );
    var snap = await promiseWithTimeout(window.rtdbGet(q), 20000);
    var val = snap.val();
    if (val) {
      var id = Object.keys(val)[0];
      var existing = Object.assign({}, val[id], { id: id });
      if (options.agencyProjectId && !existing.agencyProjectId) {
        await promiseWithTimeout(
          window.rtdbUpdate(rtdbMetaRef(id), {
            agencyProjectId: options.agencyProjectId,
            updatedAt: window.rtdbServerTimestamp()
          }),
          20000
        ).catch(function () {});
        existing.agencyProjectId = options.agencyProjectId;
      }
      return existing;
    }

    var newRef = window.rtdbPush(metaRoot);
    var newId = newRef.key;
    var now = window.rtdbServerTimestamp();
    var tags = Array.isArray(options.tags) ? options.tags.slice() : ['portal'];
    if (tags.indexOf('portal') < 0) tags.push('portal');
    await promiseWithTimeout(
      window.rtdbSet(newRef, {
        customerName: name,
        customerEmail: email.toLowerCase(),
        source: options.source || 'portal',
        status: 'open',
        priority: 'normal',
        tags: tags,
        assignee: 'Admin',
        agencyProjectId: options.agencyProjectId || '',
        unreadAdmin: 0,
        unreadCustomer: 0,
        lastMessage: '',
        createdAt: now,
        updatedAt: now
      }),
      20000
    );
    return { id: newId, customerName: name, customerEmail: email.toLowerCase() };
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
    var threadRef = rtdbThreadRef(conversationId);
    var q = window.rtdbQuery(threadRef, window.rtdbOrderByChild('createdAt'), window.rtdbLimitToFirst(200));

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
      if (window.rtdbUpdate) {
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

    return {
      stop: function () {
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
    renderContactFormSourceBadgeHtml: renderContactFormSourceBadgeHtml,
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
    subscribeCustomerThread: subscribeCustomerThread,
    sendCustomerMessage: sendCustomerMessage,
    setCustomerTyping: setCustomerTyping
  };
})();
