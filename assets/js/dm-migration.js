/* global window */
(function () {
  'use strict';

  async function migrateLegacyMessagesToConversations() {
    if (!window.db || !window.collection || !window.query || !window.orderBy || !window.getDocs || !window.setDoc || !window.addDoc || !window.updateDoc) {
      throw new Error('Firestore helpers are not available on window.');
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
      await window.setDoc(
        window.doc(window.db, 'conversations', conversationId),
        {
          customerName: data.name || 'Customer',
          customerEmail: data.email || '',
          status: data.status === 'replied' ? 'closed' : 'open',
          priority: 'normal',
          tags: ['migrated'],
          assignee: 'Admin',
          unreadAdmin: 0,
          unreadCustomer: 0,
          lastMessage: data.message || '',
          lastMessageAt: data.timestamp || window.serverTimestamp(),
          createdAt: data.timestamp || window.serverTimestamp(),
          updatedAt: window.serverTimestamp(),
          legacyMessageId: legacyDoc.id
        },
        { merge: true }
      );

      await window.addDoc(
        window.collection(window.db, 'conversations', conversationId, 'messages'),
        {
          senderRole: 'customer',
          senderName: data.name || 'Customer',
          body: data.message || '',
          createdAt: data.timestamp || window.serverTimestamp(),
          readByAdmin: true,
          readByCustomer: true,
          type: 'text',
          migratedFrom: legacyDoc.id
        }
      );

      await window.updateDoc(
        window.doc(window.db, 'messages', legacyDoc.id),
        {
          conversationId: conversationId,
          migratedAt: window.serverTimestamp()
        }
      );
      converted++;
    }

    return converted;
  }

  window.dmMigration = {
    migrateLegacyMessagesToConversations
  };
})();
