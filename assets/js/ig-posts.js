/**
 * Admin → Content → Instagram posts
 * Compose feed (1080×1350) + story (1080×1920) from laptop/phone screenshots,
 * share via native share sheet, and save to Firebase Storage + RTDB.
 */
(function () {
  'use strict';

  var LOGO = '/assets/images/logo/logo.jpg';
  var BADGE_APP = '/examples/instagram/badges/app-store.svg';
  var BADGE_PLAY = '/examples/instagram/badges/google-play.png';
  var CAPTURE_BASE = '/examples/instagram/captures';
  var EXPORT_BASE = '/examples/instagram';
  var PROJECTS_URL = '/examples/instagram/projects.json';

  var projects = [];
  var savedPosts = {};
  var exportIndex = {}; // id -> { feed, story }
  var state = {
    id: '',
    niche: '',
    laptopSrc: '',
    phoneSrc: '',
    laptopBlob: null,
    phoneBlob: null,
    feedBlob: null,
    storyBlob: null,
    feedUrl: '',
    storyUrl: ''
  };

  var htmlToImage = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg) {
    var el = $('ig-status');
    if (el) el.textContent = msg || '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function capturePath(id, kind) {
    return CAPTURE_BASE + '/' + id + '/' + kind + '.png';
  }

  function exportPath(id, kind) {
    return EXPORT_BASE + '/' + id + '-' + kind + '.png';
  }

  async function probeUrl(url) {
    try {
      var res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      if (res.ok) return url;
    } catch (e) {}
    try {
      var res2 = await fetch(url, { method: 'GET', cache: 'no-cache' });
      if (res2.ok) return url;
    } catch (e2) {}
    return '';
  }

  function artboardHtml(kind, niche, laptopSrc, phoneSrc) {
    var proof =
      kind === 'story'
        ? '<strong>Packages from $499</strong><br>Maintenance from $44/mo · Web + iOS + Android<br>Fresno-based studio · Live admin dashboards'
        : '<strong>Packages from $499</strong><br>Maintenance from $44/mo · Web + iOS + Android';
    var lap = laptopSrc || '';
    var pho = phoneSrc || '';
    return (
      '<article class="artboard artboard--' +
      kind +
      '">' +
      '<div class="inner">' +
      '<header class="brand">' +
      '<img src="' +
      LOGO +
      '" alt="" crossorigin="anonymous" />' +
      '<div><div class="wordmark">CodeWith<span>Ruben</span></div>' +
      '<span class="brand-sub">Web &amp; Mobile Dev Studio</span></div>' +
      '</header>' +
      '<div class="copy">' +
      '<h2>Run your business from your phone</h2>' +
      '<p class="niche">' +
      esc(niche || 'Your niche here') +
      '</p>' +
      '<p class="proof">' +
      proof +
      '</p>' +
      '</div>' +
      '<div class="devices"><div class="stage">' +
      '<div class="laptop"><div class="laptop-lid">' +
      '<div class="laptop-bar" aria-hidden="true"><i></i><i></i><i></i></div>' +
      (lap
        ? '<img class="laptop-screen" src="' + esc(lap) + '" alt="" crossorigin="anonymous" />'
        : '<img class="laptop-screen" alt="" style="background:#0b0d12" />') +
      '</div><div class="laptop-base"></div></div>' +
      '<div class="phone">' +
      (pho
        ? '<img class="js-phone" src="' + esc(pho) + '" alt="" crossorigin="anonymous" />'
        : '<img class="js-phone" alt="" style="background:#111" />') +
      '</div>' +
      '</div></div>' +
      '<footer class="foot"><div class="foot-start">' +
      '<span class="cta">Start a project →</span>' +
      '<span class="url">rubenjimenez.dev</span></div>' +
      '<div class="stores">' +
      '<img src="' +
      BADGE_APP +
      '" alt="" crossorigin="anonymous" />' +
      '<img class="play" src="' +
      BADGE_PLAY +
      '" alt="" crossorigin="anonymous" />' +
      '</div></footer>' +
      '</div></article>'
    );
  }

  function refreshPreviews() {
    var feedScale = $('ig-preview-feed-scale');
    var storyScale = $('ig-preview-story-scale');
    if (feedScale) {
      feedScale.innerHTML = artboardHtml('feed', state.niche, state.laptopSrc, state.phoneSrc);
    }
    if (storyScale) {
      storyScale.innerHTML = artboardHtml('story', state.niche, state.laptopSrc, state.phoneSrc);
    }
    updateThumb('ig-preview-laptop', state.laptopSrc);
    updateThumb('ig-preview-phone', state.phoneSrc);
  }

  function updateThumb(imgId, src) {
    var img = $(imgId);
    if (!img) return;
    if (src) {
      img.src = src;
      img.hidden = false;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
    }
  }

  function setGenerated(enabled) {
    ['ig-save-btn', 'ig-share-feed-btn', 'ig-share-story-btn', 'ig-download-feed-btn', 'ig-download-story-btn'].forEach(
      function (id) {
        var el = $(id);
        if (el) el.disabled = !enabled;
      }
    );
  }

  async function loadHtmlToImage() {
    if (htmlToImage) return htmlToImage;
    htmlToImage = await import('https://esm.sh/html-to-image@1.11.11');
    return htmlToImage;
  }

  function waitForImages(root) {
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
    return Promise.all(
      imgs.map(function (img) {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = function () {
            resolve();
          };
          img.onerror = function () {
            resolve();
          };
          setTimeout(resolve, 8000);
        });
      })
    );
  }

  async function rasterize(kind) {
    var mod = await loadHtmlToImage();
    var host = $('ig-render-host');
    if (!host) throw new Error('Render host missing');
    host.innerHTML = artboardHtml(kind, state.niche, state.laptopSrc, state.phoneSrc);
    var board = host.querySelector('.artboard');
    await waitForImages(host);
    await new Promise(function (r) {
      requestAnimationFrame(function () {
        requestAnimationFrame(r);
      });
    });
    var dataUrl = await mod.toPng(board, {
      width: 1080,
      height: kind === 'feed' ? 1350 : 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: '#07090e',
      // Avoid SecurityError when reading cross-origin Google Fonts CSSRules
      skipFonts: false,
      preferredFontFormat: 'woff2',
      style: {
        fontFamily: 'Poppins, system-ui, sans-serif'
      }
    });
    var blob = await (await fetch(dataUrl)).blob();
    host.innerHTML = '';
    return blob;
  }

  async function generateBoth() {
    if (!state.laptopSrc || !state.phoneSrc) {
      setStatus('Add laptop and phone screenshots first.');
      return;
    }
    if (!state.id) {
      setStatus('Pick a project or enter a slug.');
      return;
    }
    var btn = $('ig-generate-btn');
    if (btn) btn.disabled = true;
    setStatus('Generating feed…');
    try {
      state.feedBlob = await rasterize('feed');
      setStatus('Generating story…');
      state.storyBlob = await rasterize('story');
      setGenerated(true);
      // Preview freshly generated PNGs in the export cards (not written to disk yet)
      if (state.id) {
        var feedObj = URL.createObjectURL(state.feedBlob);
        var storyObj = URL.createObjectURL(state.storyBlob);
        showExportThumbs(state.id, feedObj, storyObj);
      }
      setStatus('Ready — share, download, or save to Firebase.');
    } catch (err) {
      console.error(err);
      setStatus((err && err.message) || 'Could not generate images.');
      setGenerated(false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function fileName(kind) {
    return (state.id || 'project') + '-' + kind + '.png';
  }

  function caption() {
    return (
      'Run your business from your phone\n' +
      (state.niche || '') +
      '\nrubenjimenez.dev'
    ).trim();
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  async function shareBlob(blob, kind) {
    if (!blob) {
      setStatus('Generate first.');
      return;
    }
    var file = new File([blob], fileName(kind), { type: 'image/png' });
    var shareData = { files: [file], text: caption(), title: 'CodeWithRuben ' + kind };
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        setStatus('Shared ' + kind + '.');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        setStatus('Share cancelled.');
        return;
      }
      console.warn('Share failed, downloading instead', err);
    }
    downloadBlob(blob, fileName(kind));
    setStatus('Share unavailable — downloaded ' + fileName(kind) + '.');
  }

  function openInstagram() {
    var opened = false;
    try {
      window.location.href = 'instagram://';
      opened = true;
    } catch (e) {}
    setTimeout(function () {
      if (!opened) window.open('https://www.instagram.com/', '_blank', 'noopener');
    }, 400);
    setStatus('Open Instagram, then use Share feed / Share story to attach the PNG.');
  }

  async function probeCapture(id, kind) {
    return probeUrl(capturePath(id, kind));
  }

  async function probeExport(id, kind) {
    return probeUrl(exportPath(id, kind));
  }

  function bust(url) {
    if (!url) return '';
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
  }

  function showExportThumbs(id, feedUrl, storyUrl) {
    var wrap = $('ig-exports-current');
    var label = $('ig-exports-current-label');
    if (wrap) wrap.hidden = !id;
    if (label) label.textContent = id || '';

    var feedImg = $('ig-export-feed-img');
    var storyImg = $('ig-export-story-img');
    var feedMiss = $('ig-export-feed-missing');
    var storyMiss = $('ig-export-story-missing');
    var feedLink = $('ig-export-feed-link');
    var storyLink = $('ig-export-story-link');
    var feedName = $('ig-export-feed-name');
    var storyName = $('ig-export-story-name');

    if (feedName) feedName.textContent = id ? id + '-feed.png' : '';
    if (storyName) storyName.textContent = id ? id + '-story.png' : '';

    if (feedUrl) {
      if (feedImg) {
        feedImg.src = bust(feedUrl);
        feedImg.hidden = false;
      }
      if (feedLink) feedLink.href = feedUrl;
      if (feedMiss) feedMiss.hidden = true;
    } else {
      if (feedImg) {
        feedImg.removeAttribute('src');
        feedImg.hidden = true;
      }
      if (feedLink) feedLink.removeAttribute('href');
      if (feedMiss) feedMiss.hidden = !id;
    }

    if (storyUrl) {
      if (storyImg) {
        storyImg.src = bust(storyUrl);
        storyImg.hidden = false;
      }
      if (storyLink) storyLink.href = storyUrl;
      if (storyMiss) storyMiss.hidden = true;
    } else {
      if (storyImg) {
        storyImg.removeAttribute('src');
        storyImg.hidden = true;
      }
      if (storyLink) storyLink.removeAttribute('href');
      if (storyMiss) storyMiss.hidden = !id;
    }
  }

  async function loadLocalExports(id) {
    if (!id) {
      showExportThumbs('', '', '');
      return { feed: '', story: '' };
    }
    var cached = exportIndex[id];
    var feedUrl = cached && cached.feed ? cached.feed : await probeExport(id, 'feed');
    var storyUrl = cached && cached.story ? cached.story : await probeExport(id, 'story');
    if (feedUrl || storyUrl) {
      exportIndex[id] = { feed: feedUrl || '', story: storyUrl || '' };
    }
    showExportThumbs(id, feedUrl, storyUrl);
    return { feed: feedUrl, story: storyUrl };
  }

  function renderLibrary() {
    var grid = $('ig-library-grid');
    if (!grid) return;
    var ids = Object.keys(exportIndex).filter(function (id) {
      var row = exportIndex[id];
      return row && (row.feed || row.story);
    });
    if (!ids.length) {
      grid.innerHTML = '<p class="form-hint">No <code>*-feed.png</code> / <code>*-story.png</code> files found under examples/instagram.</p>';
      return;
    }
    ids.sort();
    grid.innerHTML = ids
      .map(function (id) {
        var row = exportIndex[id];
        var niche = '';
        var p = projects.find(function (x) {
          return x.id === id;
        });
        if (p && p.niche) niche = p.niche;
        else if (savedPosts[id] && savedPosts[id].niche) niche = savedPosts[id].niche;
        var thumbs =
          '<div class="ig-admin-library-thumbs">' +
          (row.feed
            ? '<img src="' + esc(bust(row.feed)) + '" alt="" loading="lazy">'
            : '<img alt="" style="opacity:.25">') +
          (row.story
            ? '<img data-kind="story" src="' + esc(bust(row.story)) + '" alt="" loading="lazy">'
            : '<img data-kind="story" alt="" style="opacity:.25">') +
          '</div>';
        var flags =
          (row.feed ? 'feed' : '') +
          (row.feed && row.story ? ' · ' : '') +
          (row.story ? 'story' : '');
        return (
          '<button type="button" class="ig-admin-library-card' +
          (state.id === id ? ' is-selected' : '') +
          '" data-ig-lib="' +
          esc(id) +
          '">' +
          thumbs +
          '<strong>' +
          esc(id) +
          '</strong>' +
          '<span>' +
          esc(niche || flags) +
          '</span>' +
          '</button>'
        );
      })
      .join('');
  }

  async function scanLibrary() {
    var ids = {};
    projects.forEach(function (p) {
      ids[p.id] = 1;
    });
    Object.keys(savedPosts).forEach(function (id) {
      ids[id] = 1;
    });
    // Known export filenames from the examples folder (in case projects.json is incomplete)
    [
      'tradeservice',
      'procleaning',
      'rosasalon',
      'barbershop',
      'rizo',
      'grippysocks',
      'hoa',
      'zoomrealty',
      'estate',
      'homeverse'
    ].forEach(function (id) {
      ids[id] = 1;
    });

    var list = Object.keys(ids);
    await Promise.all(
      list.map(async function (id) {
        var feed = await probeExport(id, 'feed');
        var story = await probeExport(id, 'story');
        if (feed || story) exportIndex[id] = { feed: feed || '', story: story || '' };
      })
    );
    renderLibrary();
    fillProjectSelect();
  }

  async function useExisting(kind) {
    var id = state.id || ($('ig-project-id') && $('ig-project-id').value);
    id = slugify(id);
    if (!id) {
      setStatus('Pick a project first.');
      return;
    }
    setStatus('Looking for existing ' + kind + ' capture…');
    var url = await probeCapture(id, kind);
    if (!url) {
      setStatus('No capture at ' + capturePath(id, kind));
      return;
    }
    if (kind === 'laptop') {
      state.laptopSrc = url + '?t=' + Date.now();
      state.laptopBlob = null;
    } else {
      state.phoneSrc = url + '?t=' + Date.now();
      state.phoneBlob = null;
    }
    refreshPreviews();
    setGenerated(false);
    setStatus('Loaded existing ' + kind + ' capture.');
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onFileChosen(kind, file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      setStatus('Please choose an image file.');
      return;
    }
    var dataUrl = await readFileAsDataUrl(file);
    if (kind === 'laptop') {
      state.laptopSrc = dataUrl;
      state.laptopBlob = file;
    } else {
      state.phoneSrc = dataUrl;
      state.phoneBlob = file;
    }
    refreshPreviews();
    setGenerated(false);
    setStatus(kind + ' screenshot ready.');
  }

  function bindDropzone(zoneId, fileId, kind) {
    var zone = $(zoneId);
    var input = $(fileId);
    if (!zone || !input) return;

    function openPicker() {
      input.click();
    }

    zone.addEventListener('click', function (e) {
      if (e.target === input) return;
      openPicker();
    });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (f) onFileChosen(kind, f);
      input.value = '';
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('is-dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFileChosen(kind, f);
    });
  }

  function applyProject(id) {
    id = slugify(id);
    state.id = id;
    var idInput = $('ig-project-id');
    if (idInput) idInput.value = id;
    var fromList = projects.find(function (p) {
      return p.id === id;
    });
    var fromSaved = savedPosts[id];
    if (fromList && fromList.niche) {
      state.niche = fromList.niche;
    }
    if (fromSaved && fromSaved.niche) {
      state.niche = fromSaved.niche;
    }
    var nicheInput = $('ig-niche');
    if (nicheInput) nicheInput.value = state.niche || '';

    if (fromSaved && fromSaved.laptopUrl) state.laptopSrc = fromSaved.laptopUrl;
    else state.laptopSrc = '';
    if (fromSaved && fromSaved.phoneUrl) state.phoneSrc = fromSaved.phoneUrl;
    else state.phoneSrc = '';

    state.feedUrl = (fromSaved && fromSaved.feedUrl) || '';
    state.storyUrl = (fromSaved && fromSaved.storyUrl) || '';
    state.feedBlob = null;
    state.storyBlob = null;
    setGenerated(false);

    refreshPreviews();

    // Prefer local captures when present; also load existing feed/story exports
    if (id) {
      Promise.all([
        probeCapture(id, 'laptop'),
        probeCapture(id, 'phone'),
        loadLocalExports(id)
      ]).then(function (results) {
        var laptopUrl = results[0];
        var phoneUrl = results[1];
        var exports = results[2] || {};
        if (!state.laptopSrc && laptopUrl) state.laptopSrc = laptopUrl;
        if (!state.phoneSrc && phoneUrl) state.phoneSrc = phoneUrl;
        refreshPreviews();
        renderLibrary();

        var localFeed = exports.feed || '';
        var localStory = exports.story || '';
        var feedToLoad = (fromSaved && fromSaved.feedUrl) || localFeed;
        var storyToLoad = (fromSaved && fromSaved.storyUrl) || localStory;

        if (feedToLoad || storyToLoad) {
          state.feedUrl = feedToLoad;
          state.storyUrl = storyToLoad;
          hydrateBlobsFromUrls(feedToLoad, storyToLoad).then(function () {
            if (state.feedBlob || state.storyBlob) {
              setGenerated(!!(state.feedBlob && state.storyBlob));
              // Allow sharing whichever exists
              var sf = $('ig-share-feed-btn');
              var ss = $('ig-share-story-btn');
              var df = $('ig-download-feed-btn');
              var ds = $('ig-download-story-btn');
              var save = $('ig-save-btn');
              if (sf) sf.disabled = !state.feedBlob;
              if (df) df.disabled = !state.feedBlob;
              if (ss) ss.disabled = !state.storyBlob;
              if (ds) ds.disabled = !state.storyBlob;
              if (save) save.disabled = !(state.feedBlob && state.storyBlob);
            }
          });
          if (localFeed || localStory) {
            setStatus('Loaded existing export from examples/instagram — share or regenerate.');
          } else if (fromSaved && fromSaved.feedUrl) {
            setStatus('Loaded saved post from Firebase — you can reshare or regenerate.');
          }
        } else if (state.laptopSrc && state.phoneSrc) {
          setStatus('Captures found — generate when ready.');
        } else {
          setStatus('No export PNGs yet for this project — upload screenshots and generate.');
        }
      });
    } else {
      showExportThumbs('', '', '');
      renderLibrary();
    }
  }

  async function hydrateBlobsFromUrls(feedUrl, storyUrl) {
    try {
      if (feedUrl) {
        state.feedBlob = await (await fetch(feedUrl)).blob();
      }
      if (storyUrl) {
        state.storyBlob = await (await fetch(storyUrl)).blob();
      }
      if (state.feedBlob && state.storyBlob) setGenerated(true);
    } catch (e) {
      console.warn('Could not hydrate saved PNGs', e);
    }
  }

  function fillProjectSelect() {
    var select = $('ig-project-select');
    if (!select) return;
    var opts = projects.map(function (p) {
      var bits = [];
      if (exportIndex[p.id] && (exportIndex[p.id].feed || exportIndex[p.id].story)) bits.push('exported');
      if (savedPosts[p.id]) bits.push('saved');
      var suffix = bits.length ? ' · ' + bits.join(' · ') : '';
      return { value: p.id, label: p.id + ' — ' + (p.niche || '') + suffix };
    });
    Object.keys(exportIndex).forEach(function (id) {
      if (
        !projects.some(function (p) {
          return p.id === id;
        })
      ) {
        opts.push({
          value: id,
          label: id + ' — exported'
        });
      }
    });
    Object.keys(savedPosts).forEach(function (id) {
      if (
        !projects.some(function (p) {
          return p.id === id;
        }) &&
        !exportIndex[id]
      ) {
        opts.push({
          value: id,
          label: id + ' — ' + (savedPosts[id].niche || 'custom') + ' · saved'
        });
      }
    });
    opts.push({ value: '__new__', label: '+ New custom project…' });

    if (typeof window.setBusinessDocSelectOptions === 'function') {
      window.setBusinessDocSelectOptions(select, opts, {
        placeholder: 'Select project…',
        keepValue: true
      });
    }
  }

  async function fetchProjects() {
    try {
      var res = await fetch(PROJECTS_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('projects.json ' + res.status);
      projects = await res.json();
    } catch (e) {
      console.warn(e);
      projects = [];
    }
  }

  function isAdmin() {
    return !!(window.currentUser && window.currentUser.role === 'admin');
  }

  function subscribeSaved() {
    if (!window.rtdb || !window.rtdbRef || !window.rtdbOnValue) return;
    window.rtdbOnValue(window.rtdbRef(window.rtdb, 'instagramPosts'), function (snap) {
      savedPosts = snap.val() || {};
      fillProjectSelect();
    });
  }

  async function uploadBlob(path, blob) {
    if (!window.firebaseStorage || !window.storageRef || !window.uploadBytes || !window.getDownloadURL) {
      throw new Error('Firebase Storage is not available');
    }
    var ref = window.storageRef(window.firebaseStorage, path);
    await window.uploadBytes(ref, blob, { contentType: 'image/png' });
    return window.getDownloadURL(ref);
  }

  async function dataUrlToBlob(dataUrl) {
    return (await fetch(dataUrl)).blob();
  }

  async function saveToFirebase() {
    if (!isAdmin()) {
      setStatus('Sign in as admin to save.');
      return;
    }
    if (!state.id || !state.feedBlob || !state.storyBlob) {
      setStatus('Generate feed + story first.');
      return;
    }
    var btn = $('ig-save-btn');
    if (btn) btn.disabled = true;
    setStatus('Uploading…');
    try {
      var base = 'instagramPosts/' + state.id + '/';
      var laptopBlob = state.laptopBlob;
      if (!laptopBlob && state.laptopSrc && state.laptopSrc.indexOf('data:') === 0) {
        laptopBlob = await dataUrlToBlob(state.laptopSrc);
      } else if (!laptopBlob && state.laptopSrc) {
        try {
          laptopBlob = await (await fetch(state.laptopSrc)).blob();
        } catch (e) {}
      }
      var phoneBlob = state.phoneBlob;
      if (!phoneBlob && state.phoneSrc && state.phoneSrc.indexOf('data:') === 0) {
        phoneBlob = await dataUrlToBlob(state.phoneSrc);
      } else if (!phoneBlob && state.phoneSrc) {
        try {
          phoneBlob = await (await fetch(state.phoneSrc)).blob();
        } catch (e) {}
      }

      var feedUrl = await uploadBlob(base + 'feed.png', state.feedBlob);
      var storyUrl = await uploadBlob(base + 'story.png', state.storyBlob);
      var laptopUrl = state.laptopSrc;
      var phoneUrl = state.phoneSrc;
      if (laptopBlob) laptopUrl = await uploadBlob(base + 'laptop.png', laptopBlob);
      if (phoneBlob) phoneUrl = await uploadBlob(base + 'phone.png', phoneBlob);

      var payload = {
        id: state.id,
        niche: state.niche || '',
        feedUrl: feedUrl,
        storyUrl: storyUrl,
        laptopUrl: laptopUrl || '',
        phoneUrl: phoneUrl || '',
        updatedAt: Date.now()
      };
      await window.rtdbSet(window.rtdbRef(window.rtdb, 'instagramPosts/' + state.id), payload);
      state.feedUrl = feedUrl;
      state.storyUrl = storyUrl;
      state.laptopSrc = laptopUrl || state.laptopSrc;
      state.phoneSrc = phoneUrl || state.phoneSrc;
      refreshPreviews();
      setStatus('Saved to Firebase.');
    } catch (err) {
      console.error(err);
      setStatus((err && err.message) || 'Save failed.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindUi() {
    if (!document.getElementById('admin-panel-instagram')) return;

    bindDropzone('ig-drop-laptop', 'ig-file-laptop', 'laptop');
    bindDropzone('ig-drop-phone', 'ig-file-phone', 'phone');

    var niche = $('ig-niche');
    if (niche) {
      niche.addEventListener('input', function () {
        state.niche = niche.value;
        refreshPreviews();
        setGenerated(false);
      });
    }

    var idInput = $('ig-project-id');
    if (idInput) {
      idInput.addEventListener('change', function () {
        var id = slugify(idInput.value);
        idInput.value = id;
        if (id) applyProject(id);
      });
    }

    var select = $('ig-project-select');
    if (select) {
      select.addEventListener('change', function () {
        var v = select.value;
        if (v === '__new__') {
          state.id = '';
          state.niche = '';
          state.laptopSrc = '';
          state.phoneSrc = '';
          state.feedBlob = null;
          state.storyBlob = null;
          state.feedUrl = '';
          state.storyUrl = '';
          if (idInput) idInput.value = '';
          if (niche) niche.value = '';
          setGenerated(false);
          refreshPreviews();
          showExportThumbs('', '', '');
          renderLibrary();
          setStatus('Enter a slug and upload screenshots.');
          return;
        }
        if (v) applyProject(v);
      });
    }

    var gen = $('ig-generate-btn');
    if (gen) gen.addEventListener('click', function () {
      generateBoth();
    });
    var save = $('ig-save-btn');
    if (save) save.addEventListener('click', function () {
      saveToFirebase();
    });
    var sf = $('ig-share-feed-btn');
    if (sf) sf.addEventListener('click', function () {
      shareBlob(state.feedBlob, 'feed');
    });
    var ss = $('ig-share-story-btn');
    if (ss) ss.addEventListener('click', function () {
      shareBlob(state.storyBlob, 'story');
    });
    var df = $('ig-download-feed-btn');
    if (df) df.addEventListener('click', function () {
      if (state.feedBlob) downloadBlob(state.feedBlob, fileName('feed'));
    });
    var ds = $('ig-download-story-btn');
    if (ds) ds.addEventListener('click', function () {
      if (state.storyBlob) downloadBlob(state.storyBlob, fileName('story'));
    });
    var ig = $('ig-open-instagram-btn');
    if (ig) ig.addEventListener('click', openInstagram);

    var ueL = $('ig-use-existing-laptop');
    if (ueL) ueL.addEventListener('click', function () {
      useExisting('laptop');
    });
    var ueP = $('ig-use-existing-phone');
    if (ueP) ueP.addEventListener('click', function () {
      useExisting('phone');
    });

    var grid = $('ig-library-grid');
    if (grid && !grid.dataset.bound) {
      grid.dataset.bound = '1';
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('[data-ig-lib]');
        if (!card || !grid.contains(card)) return;
        var id = card.getAttribute('data-ig-lib');
        if (!id) return;
        var select = $('ig-project-select');
        if (select) {
          select.value = id;
          if (typeof window.syncBusinessDocSelectUI === 'function') {
            window.syncBusinessDocSelectUI(select);
          }
        }
        applyProject(id);
      });
    }
  }

  async function boot() {
    if (!document.getElementById('admin-panel-instagram')) return;
    bindUi();
    await fetchProjects();
    fillProjectSelect();
    refreshPreviews();
    setStatus('Scanning examples/instagram exports…');
    await scanLibrary();
    setStatus('Pick a project or click an export in the library.');
    if (isAdmin()) subscribeSaved();
  }

  document.addEventListener('adminSessionReady', function (e) {
    if (e.detail && e.detail.isAdmin) subscribeSaved();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
