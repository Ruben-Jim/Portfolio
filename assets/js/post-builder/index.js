/**
 * Post builder — entry point for Admin → Content → Post builder.
 *
 * Mounts the library into #pb-root once an admin session is ready (same hook as
 * assets/js/ig-posts.js). `<div id="pb-root" data-local>` skips Firebase and saves to
 * localStorage (examples/instagram/builder.html uses this for local work).
 *
 * Cache-busting: every module import carries ?v=pb1. After changing any file in this
 * folder, bump it everywhere:
 *   sed -i '' 's/?v=pb1/?v=pb2/g' assets/js/post-builder/*.js
 * and bump the <script>/<link> ?v= in index.html (then run scripts/sync-spa-shells.mjs).
 */
import { createStore, firebaseReady } from './store.js?v=pb1';
import { mountLibrary } from './library.js?v=pb1';

function boot() {
  var root = document.getElementById('pb-root');
  if (!root || root.dataset.booted) return;
  if (root.hasAttribute('data-local')) {
    root.dataset.booted = '1';
    mountLibrary(root, createStore('local'));
    return;
  }
  if (firebaseReady()) {
    root.dataset.booted = '1';
    mountLibrary(root, createStore('firebase'));
    return;
  }
  root.innerHTML = '<p class="pb-note">Sign in as admin to use the post builder.</p>';
}

document.addEventListener('adminSessionReady', function (e) {
  if (e.detail && e.detail.isAdmin) boot();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
