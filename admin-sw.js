/**
 * CWR Admin — service worker for the home-screen admin app (scope /admin).
 *
 * Only job: show admin push notifications and open admin on the item when one
 * is tapped. No caching, so the site always loads fresh. Every push shows a
 * notification — iOS turns push off for apps that receive silent ones.
 * Pushes come from Cloud Functions (functions/admin-push.js) as data-only
 * FCM messages: { data: { title, body, url, tag } }.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

function readPush(event) {
  var json = null;
  try {
    json = event.data ? event.data.json() : null;
  } catch (e) {
    json = null;
  }
  var d = (json && json.data) || {};
  var n = (json && json.notification) || {};
  return {
    title: d.title || n.title || 'CWR Admin',
    body: d.body || n.body || 'Something new in admin.',
    url: d.url || '/admin',
    tag: d.tag || ''
  };
}

self.addEventListener('push', function (event) {
  var p = readPush(event);
  var opts = {
    body: p.body,
    icon: '/assets/images/app/admin-192.png',
    badge: '/assets/images/app/admin-badge-96.png',
    data: { url: p.url }
  };
  if (p.tag) {
    opts.tag = p.tag;
    opts.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(p.title, opts));
});

/** Only admin pages on this site; anything else opens admin's home. */
function safeAdminUrl(raw) {
  var origin = self.location.origin;
  try {
    var u = new URL(raw || '/admin', origin);
    if (u.origin === origin && /^\/admin(\/|$)/.test(u.pathname)) {
      return u.href;
    }
  } catch (e) {}
  return origin + '/admin';
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = safeAdminUrl(event.notification.data && event.notification.data.url);
  var path = target.slice(self.location.origin.length);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (String(c.url).indexOf(self.location.origin + '/admin') === 0) {
          // admin-push.js opens the item in place, so nothing reloads.
          c.postMessage({ type: 'cwr-push-open', url: path });
          return c.focus ? c.focus() : undefined;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
