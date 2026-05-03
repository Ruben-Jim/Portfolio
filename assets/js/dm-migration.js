/* global window */
(function () {
  'use strict';

  function legacyTimestampToMillis(ts) {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
    return Date.now();
  }

  async function migrateLegacyMessagesToConversations() {
    if (!window.db || !window.rtdb || !window.rtdbRef || !window.rtdbSet || !window.rtdbPush || !window.collection || !window.query || !window.orderBy || !window.getDocs || !window.updateDoc || !window.doc || !window.serverTimestamp) {
      throw new Error('Firebase helpers are not available on window.');
    }

    const legacySnapshot = await window.getDocs(
      window.query(
        window.collection(window.db, 'messages'),
        window.orderBy('timestamp', 'asc')
      )
    );

    let converted = 0;
    for (const legacyDoc of legacySnapshot.docs) {
      const data = legacyDoc.data();
      if (data.conversationId) continue;

      const conversationId = 'conv_' + legacyDoc.id;
      const tsMillis = legacyTimestampToMillis(data.timestamp);
      await window.rtdbSet(window.rtdbRef(window.rtdb, 'dm/meta/' + conversationId), {
        customerName: data.name || 'Customer',
        customerEmail: data.email || '',
        status: data.status === 'replied' ? 'closed' : 'open',
        priority: 'normal',
        tags: ['migrated'],
        assignee: 'Admin',
        unreadAdmin: 0,
        unreadCustomer: 0,
        lastMessage: data.message || '',
        lastMessageAt: tsMillis,
        createdAt: tsMillis,
        updatedAt: window.rtdbServerTimestamp(),
        legacyMessageId: legacyDoc.id,
        source: data.source || 'contact'
      });

      const msgRef = window.rtdbPush(window.rtdbRef(window.rtdb, 'dm/threadMessages/' + conversationId));
      await window.rtdbSet(msgRef, {
        senderRole: 'customer',
        senderName: data.name || 'Customer',
        body: data.message || '',
        createdAt: tsMillis,
        readByAdmin: true,
        readByCustomer: true,
        type: 'text',
        migratedFrom: legacyDoc.id
      });

      await window.updateDoc(window.doc(window.db, 'messages', legacyDoc.id), {
        conversationId: conversationId,
        migratedAt: window.serverTimestamp()
      });
      converted++;
    }

    return converted;
  }

  window.dmMigration = {
    migrateLegacyMessagesToConversations
  };
})();
