/**
 * Post builder — persistence.
 *
 * Firebase (admin session): full design at RTDB postDesigns/<id>, a small summary at
 * postDesignIndex/<id> for the library, uploads + thumbnail in Storage under
 * postDesigns/<id>/. Uses the window.rtdb* / window.storage* globals that index.html
 * exposes, same as assets/js/ig-posts.js.
 *
 * Local (dev harness, or no admin session): localStorage.
 *
 * Every change is also backed up to localStorage until Firebase confirms the save,
 * so a dropped connection on a phone doesn't lose work.
 */
import { normalizeDesign, summarize, uid } from './model.js?v=pb1';

var LOCAL_INDEX = 'pb:index';
var LOCAL_DESIGN = 'pb:design:';
var BACKUP = 'pb:backup:';
var SAVE_DELAY = 1500;
var MAX_IMAGE = 2160;

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

function lsRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function plain(design) {
  return JSON.parse(JSON.stringify(design));
}

export function firebaseReady() {
  return !!(window.rtdb && window.rtdbRef && window.rtdbSet && window.rtdbGet && window.currentUser && window.currentUser.role === 'admin');
}

/** Downscale big photos (phone cameras) before upload or embedding. */
export async function prepareImage(file) {
  var type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  var bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    return file;
  }
  var scale = Math.min(1, MAX_IMAGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3 * 1024 * 1024) return file;
  var canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise(function (resolve) {
    canvas.toBlob(function (blob) { resolve(blob || file); }, type, 0.9);
  });
}

function blobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function createStore(mode) {
  var useFirebase = mode === 'firebase';
  var timer = null;
  var pending = null;
  var onStatus = function () {};

  function ref(path) { return window.rtdbRef(window.rtdb, path); }

  async function uploadBlob(path, blob) {
    var r = window.storageRef(window.firebaseStorage, path);
    await window.uploadBytes(r, blob, { contentType: blob.type || 'image/png' });
    return window.getDownloadURL(r);
  }

  async function writeDesign(design) {
    var data = plain(design);
    if (useFirebase) {
      await Promise.all([
        window.rtdbSet(ref('postDesigns/' + data.id), data),
        window.rtdbSet(ref('postDesignIndex/' + data.id), summarize(data))
      ]);
    } else {
      if (!lsSet(LOCAL_DESIGN + data.id, data)) throw new Error('This browser is out of storage space.');
      var index = lsGet(LOCAL_INDEX) || {};
      index[data.id] = summarize(data);
      lsSet(LOCAL_INDEX, index);
      window.dispatchEvent(new CustomEvent('pb:local-index'));
    }
  }

  var api = {
    mode: useFirebase ? 'firebase' : 'local',

    /** Library listing, newest first. Returns an unsubscribe function. */
    subscribe: function (cb) {
      function sortAndSend(obj) {
        var list = Object.keys(obj || {}).map(function (k) { return obj[k]; }).filter(Boolean);
        list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        cb(list);
      }
      if (useFirebase) {
        return window.rtdbOnValue(ref('postDesignIndex'), function (snap) { sortAndSend(snap.val()); });
      }
      var fire = function () { sortAndSend(lsGet(LOCAL_INDEX)); };
      fire();
      window.addEventListener('pb:local-index', fire);
      return function () { window.removeEventListener('pb:local-index', fire); };
    },

    /** Load a design. A newer unsaved local backup wins (flagged with restored = true). */
    load: async function (id) {
      var raw = null;
      if (useFirebase) {
        var snap = await window.rtdbGet(ref('postDesigns/' + id));
        raw = snap.val();
      } else {
        raw = lsGet(LOCAL_DESIGN + id);
      }
      var backup = lsGet(BACKUP + id);
      if (backup && (!raw || (backup.updatedAt || 0) > (raw.updatedAt || 0))) {
        var restored = normalizeDesign(backup);
        restored.restored = true;
        return restored;
      }
      if (!raw) throw new Error('Design not found.');
      return normalizeDesign(raw);
    },

    save: async function (design) {
      await writeDesign(design);
      lsRemove(BACKUP + design.id);
    },

    /** Debounced autosave; status is 'saving' | 'saved' | 'local' | 'error'. */
    scheduleSave: function (design, statusCb) {
      if (statusCb) onStatus = statusCb;
      delete design.restored;
      lsSet(BACKUP + design.id, plain(design));
      pending = design;
      onStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(api.flush, SAVE_DELAY);
    },

    flush: async function () {
      clearTimeout(timer);
      timer = null;
      var design = pending;
      pending = null;
      if (!design) return;
      try {
        await api.save(design);
        onStatus(useFirebase ? 'saved' : 'local');
      } catch (err) {
        console.error('[post-builder] save failed', err);
        onStatus('error', err);
      }
    },

    remove: async function (summary) {
      var id = summary.id;
      lsRemove(BACKUP + id);
      if (!useFirebase) {
        lsRemove(LOCAL_DESIGN + id);
        var index = lsGet(LOCAL_INDEX) || {};
        delete index[id];
        lsSet(LOCAL_INDEX, index);
        window.dispatchEvent(new CustomEvent('pb:local-index'));
        return;
      }
      var full = null;
      try { full = (await window.rtdbGet(ref('postDesigns/' + id))).val(); } catch (e) {}
      await Promise.all([window.rtdbRemove(ref('postDesigns/' + id)), window.rtdbRemove(ref('postDesignIndex/' + id))]);
      if (window.deleteObject && window.storageRef) {
        var paths = ((full && full.assets) || []).concat(['postDesigns/' + id + '/exports/thumb.jpg']);
        await Promise.all(paths.map(function (p) {
          return window.deleteObject(window.storageRef(window.firebaseStorage, p)).catch(function () {});
        }));
      }
    },

    /** Returns { url, path }. path is '' for local data URLs. */
    uploadImage: async function (design, file) {
      var blob = await prepareImage(file);
      if (!useFirebase) return { url: await blobToDataUrl(blob), path: '' };
      var ext = blob.type === 'image/png' ? 'png' : 'jpg';
      var path = 'postDesigns/' + design.id + '/assets/' + uid('a') + '.' + ext;
      return { url: await uploadBlob(path, blob), path: path };
    },

    saveThumb: async function (design, blob) {
      if (!blob) return;
      var url;
      if (useFirebase) {
        url = await uploadBlob('postDesigns/' + design.id + '/exports/thumb.jpg', blob);
        url += (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
        await Promise.all([
          window.rtdbUpdate(ref('postDesigns/' + design.id), { thumbUrl: url }),
          window.rtdbUpdate(ref('postDesignIndex/' + design.id), { thumbUrl: url })
        ]);
      } else {
        url = await blobToDataUrl(blob);
        var index = lsGet(LOCAL_INDEX) || {};
        if (index[design.id]) {
          index[design.id].thumbUrl = url;
          lsSet(LOCAL_INDEX, index);
          window.dispatchEvent(new CustomEvent('pb:local-index'));
        }
        var stored = lsGet(LOCAL_DESIGN + design.id);
        if (stored) { stored.thumbUrl = url; lsSet(LOCAL_DESIGN + design.id, stored); }
      }
      design.thumbUrl = url;
    }
  };
  return api;
}
