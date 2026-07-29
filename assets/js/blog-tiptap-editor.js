/**
 * TipTap blog content editor (vanilla ESM via esm.sh).
 * Exposes window.BlogTipTapEditor + window.createBlogTipTapEditor.
 */
(function () {
  'use strict';

  var TIPTAP_VERSION = '2.11.7';
  var ESM = function (pkg) {
    return 'https://esm.sh/' + pkg + '@' + TIPTAP_VERSION;
  };

  var BLOG_ASSET_IMAGES = [
    '/assets/images/blog/blog-1.jpg',
    '/assets/images/blog/blog-2.jpg',
    '/assets/images/blog/blog-3.jpg',
    '/assets/images/blog/blog-4.jpg',
    '/assets/images/blog/blog-5.jpg',
    '/assets/images/blog/blog-6.jpg'
  ];

  var SLASH_ITEMS = [
    { id: 'h1', label: 'Heading 1', hint: 'Large section title', icon: 'text-outline' },
    { id: 'h2', label: 'Heading 2', hint: 'Section title', icon: 'text-outline' },
    { id: 'h3', label: 'Heading 3', hint: 'Subsection', icon: 'text-outline' },
    { id: 'bullet', label: 'Bullet list', hint: 'Unordered list', icon: 'list-outline' },
    { id: 'ordered', label: 'Numbered list', hint: 'Ordered list', icon: 'list-outline' },
    { id: 'quote', label: 'Quote', hint: 'Blockquote', icon: 'chatbubble-ellipses-outline' },
    { id: 'codeBlock', label: 'Code block', hint: 'Fenced code', icon: 'code-slash-outline' },
    { id: 'image', label: 'Image', hint: 'From repo or URL', icon: 'image-outline' },
    { id: 'hr', label: 'Divider', hint: 'Horizontal rule', icon: 'remove-outline' }
  ];

  var tipTapLibsPromise = null;

  function loadTipTapLibs() {
    if (tipTapLibsPromise) return tipTapLibsPromise;
    tipTapLibsPromise = Promise.all([
      import(ESM('@tiptap/core')),
      import(ESM('@tiptap/starter-kit')),
      import(ESM('@tiptap/extension-underline')),
      import(ESM('@tiptap/extension-link')),
      import(ESM('@tiptap/extension-image')),
      import(ESM('@tiptap/extension-placeholder'))
    ]).then(function (mods) {
      return {
        Editor: mods[0].Editor,
        StarterKit: mods[1].default || mods[1],
        Underline: mods[2].default || mods[2],
        Link: mods[3].default || mods[3],
        Image: mods[4].default || mods[4],
        Placeholder: mods[5].default || mods[5]
      };
    });
    return tipTapLibsPromise;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wordCountFromText(text) {
    var t = String(text || '').trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }

  function ensureImagePickerModal() {
    var existing = document.getElementById('blog-tiptap-image-modal');
    if (existing) return existing;
    var modal = document.createElement('div');
    modal.id = 'blog-tiptap-image-modal';
    modal.className = 'blog-tiptap-image-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="blog-tiptap-image-overlay" data-close="1"></div>' +
      '<div class="blog-tiptap-image-dialog" role="dialog" aria-modal="true" aria-labelledby="blog-tiptap-image-title">' +
      '<div class="blog-tiptap-image-header">' +
      '<h3 class="h3" id="blog-tiptap-image-title">Insert image</h3>' +
      '<button type="button" class="blog-tiptap-image-close" data-close="1" aria-label="Close">' +
      '<ion-icon name="close-outline"></ion-icon></button></div>' +
      '<div class="blog-tiptap-image-body has-scrollbar">' +
      '<p class="form-hint">Pick from <code>assets/images/blog</code> or paste a custom URL.</p>' +
      '<div class="blog-tiptap-image-grid" id="blog-tiptap-image-grid"></div>' +
      '<div class="form-group" style="margin-top:14px">' +
      '<label for="blog-tiptap-image-url">Custom URL</label>' +
      '<div class="blog-tiptap-image-url-row">' +
      '<input type="text" id="blog-tiptap-image-url" placeholder="/assets/images/blog/blog-1.jpg">' +
      '<button type="button" class="btn btn-primary btn-sm" id="blog-tiptap-image-url-add">Add</button>' +
      '</div></div>' +
      '<div class="form-group">' +
      '<label for="blog-tiptap-image-alt">Alt text</label>' +
      '<input type="text" id="blog-tiptap-image-alt" placeholder="Describe the image">' +
      '</div></div></div>';
    document.body.appendChild(modal);

    var grid = modal.querySelector('#blog-tiptap-image-grid');
    grid.innerHTML = BLOG_ASSET_IMAGES.map(function (path) {
      var label = path.replace(/^\/?assets\/images\//, '');
      return (
        '<button type="button" class="blog-tiptap-image-card" data-src="' +
        esc(path) +
        '" title="' +
        esc(label) +
        '">' +
        '<img src="' +
        esc(path) +
        '" alt="" loading="lazy">' +
        '<span>' +
        esc(label) +
        '</span></button>'
      );
    }).join('');

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) {
        closeImagePicker();
      }
    });
    return modal;
  }

  var imagePickerCallback = null;

  function openImagePicker(onPick) {
    imagePickerCallback = onPick;
    var modal = ensureImagePickerModal();
    var urlInput = modal.querySelector('#blog-tiptap-image-url');
    var altInput = modal.querySelector('#blog-tiptap-image-alt');
    if (urlInput) urlInput.value = '';
    if (altInput) altInput.value = '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    function pick(src) {
      var alt = (altInput && altInput.value.trim()) || '';
      if (typeof imagePickerCallback === 'function') imagePickerCallback({ src: src, alt: alt });
      closeImagePicker();
    }

    var grid = modal.querySelector('#blog-tiptap-image-grid');
    grid.onclick = function (e) {
      var card = e.target.closest('[data-src]');
      if (!card) return;
      pick(card.getAttribute('data-src'));
    };
    var addBtn = modal.querySelector('#blog-tiptap-image-url-add');
    addBtn.onclick = function () {
      var src = (urlInput && urlInput.value.trim()) || '';
      if (!src) return;
      pick(src);
    };
  }

  function closeImagePicker() {
    var modal = document.getElementById('blog-tiptap-image-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    imagePickerCallback = null;
  }

  function BlogTipTapEditor(options) {
    this.modal = options.modal;
    this.isEdit = !!options.isEdit;
    this.contentEditor = this.modal.querySelector('.content-editor');
    this.surface = this.contentEditor && this.contentEditor.querySelector('.blog-tiptap-surface');
    this.textarea = this.contentEditor && this.contentEditor.querySelector('textarea.editor-textarea, textarea.blog-tiptap-hidden, textarea[name="content"]');
    this.previewContainer = this.contentEditor && this.contentEditor.querySelector('.editor-preview');
    this.preview = this.contentEditor && this.contentEditor.querySelector('.preview-content');
    this.charCount = this.contentEditor && this.contentEditor.querySelector('.char-count');
    this.wordCount = this.contentEditor && this.contentEditor.querySelector('.word-count');
    this.lineCount = this.contentEditor && this.contentEditor.querySelector('.line-count');
    this.modeToggles = this.contentEditor ? this.contentEditor.querySelectorAll('.mode-toggle') : [];
    this.draftBanner = this.contentEditor && this.contentEditor.querySelector('.blog-tiptap-draft-banner');
    this.slashMenu = null;
    this.editor = null;
    this._autosaveTimer = null;
    this._slashRange = null;
    this._slashIndex = 0;
    this._libs = null;
    this.draftKey = this.isEdit ? null : 'blogTipTapDraft:add';
  }

  BlogTipTapEditor.prototype.setDraftKeyForEdit = function (postId) {
    this.draftKey = postId ? 'blogTipTapDraft:edit:' + postId : null;
  };

  BlogTipTapEditor.prototype.mount = async function (initialHtml) {
    var self = this;
    if (!this.surface || !this.textarea) {
      throw new Error('Blog TipTap: missing surface or textarea');
    }
    this._libs = await loadTipTapLibs();
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    var content = initialHtml != null ? initialHtml : this.textarea.value || '';
    if (!String(content).trim()) content = '<p></p>';

    this.editor = new this._libs.Editor({
      element: this.surface,
      extensions: [
        this._libs.StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          codeBlock: { HTMLAttributes: { class: 'blog-tiptap-codeblock' } }
        }),
        this._libs.Underline,
        this._libs.Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
        }),
        this._libs.Image.configure({
          HTMLAttributes: { loading: 'lazy' },
          allowBase64: false
        }),
        this._libs.Placeholder.configure({
          placeholder: 'Start writing… Type / for blocks'
        })
      ],
      content: content,
      editorProps: {
        attributes: {
          class: 'blog-tiptap-prose blog-modal-text has-scrollbar',
          spellcheck: 'true'
        },
        handleKeyDown: function (view, event) {
          return self._handleKeyDown(view, event);
        }
      },
      onUpdate: function () {
        self.syncToTextarea();
        self.updateStats();
        self._scheduleAutosave();
        self._updateSlashFromEditor();
        if (self.previewContainer && self.previewContainer.classList.contains('show')) {
          self.updatePreview();
        }
        if (typeof window.markBlogFormDirty === 'function') {
          window.markBlogFormDirty(self.isEdit ? 'edit' : 'add');
        }
      },
      onSelectionUpdate: function () {
        self._syncToolbarActive();
      }
    });

    this.syncToTextarea();
    this.updateStats();
    this._ensureSlashMenu();
    this.setupToolbar();
    this.setupModeToggles();
    this._syncToolbarActive();
    this._offerDraftRestore();
    return this;
  };

  BlogTipTapEditor.prototype.destroy = function () {
    if (this._autosaveTimer) clearTimeout(this._autosaveTimer);
    if (this.slashMenu) {
      this.slashMenu.remove();
      this.slashMenu = null;
    }
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  };

  BlogTipTapEditor.prototype.getHTML = function () {
    if (!this.editor) return this.textarea ? this.textarea.value : '';
    var html = this.editor.getHTML();
    if (html === '<p></p>') return '';
    return html;
  };

  BlogTipTapEditor.prototype.setContent = function (html) {
    if (!this.editor) {
      if (this.textarea) this.textarea.value = html || '';
      return;
    }
    this.editor.commands.setContent(html && String(html).trim() ? html : '<p></p>', false);
    this.syncToTextarea();
    this.updateStats();
  };

  BlogTipTapEditor.prototype.syncToTextarea = function () {
    if (!this.textarea || !this.editor) return;
    this.textarea.value = this.getHTML();
  };

  BlogTipTapEditor.prototype.updateStats = function () {
    if (!this.editor) return;
    var text = this.editor.getText() || '';
    var chars = text.length;
    var words = wordCountFromText(text);
    var lines = text ? text.split('\n').length : 0;
    if (this.charCount) {
      this.charCount.innerHTML = '<ion-icon name="text-outline"></ion-icon> ' + chars + ' characters';
    }
    if (this.wordCount) {
      this.wordCount.innerHTML = '<ion-icon name="document-text-outline"></ion-icon> ' + words + ' words';
    }
    if (this.lineCount) {
      this.lineCount.innerHTML = '<ion-icon name="list-outline"></ion-icon> ' + lines + ' lines';
    }
  };

  BlogTipTapEditor.prototype.updatePreview = function () {
    if (!this.preview) return;
    this.preview.innerHTML = this.getHTML() || '<p class="form-hint">Nothing to preview yet.</p>';
  };

  BlogTipTapEditor.prototype.setupModeToggles = function () {
    var self = this;
    this.modeToggles.forEach(function (toggle) {
      if (toggle.dataset.tiptapBound) return;
      toggle.dataset.tiptapBound = '1';
      toggle.addEventListener('click', function () {
        var mode = toggle.getAttribute('data-mode');
        self.setMode(mode);
        self.modeToggles.forEach(function (t) {
          t.classList.toggle('active', t === toggle);
        });
      });
    });
  };

  BlogTipTapEditor.prototype.setMode = function (mode) {
    var writeWrap = this.contentEditor.querySelector('.blog-tiptap-wrap, .editor-wrapper');
    if (mode === 'preview') {
      if (writeWrap) writeWrap.style.display = 'none';
      if (this.previewContainer) {
        this.previewContainer.style.display = 'block';
        this.previewContainer.classList.add('show');
      }
      this.updatePreview();
    } else {
      if (writeWrap) writeWrap.style.display = '';
      if (this.previewContainer) {
        this.previewContainer.style.display = 'none';
        this.previewContainer.classList.remove('show');
      }
      if (this.editor) this.editor.commands.focus();
    }
  };

  BlogTipTapEditor.prototype.setupToolbar = function () {
    var self = this;
    if (!this.contentEditor || this.contentEditor.dataset.tiptapToolbarBound) return;
    this.contentEditor.dataset.tiptapToolbarBound = '1';

    this.contentEditor.addEventListener('click', function (e) {
      var btn = e.target.closest('.editor-btn, .dropdown-item');
      if (!btn || !self.contentEditor.contains(btn)) return;
      e.preventDefault();
      var command = btn.getAttribute('data-command');
      if (!command) return;

      if (command === 'heading') {
        self._toggleHeadingDropdown(btn);
        return;
      }
      if (command === 'preview') {
        var previewToggle = self.contentEditor.querySelector('.mode-toggle[data-mode="preview"]');
        var writeToggle = self.contentEditor.querySelector('.mode-toggle[data-mode="write"]');
        var showing = self.previewContainer && self.previewContainer.classList.contains('show');
        self.setMode(showing ? 'write' : 'preview');
        if (previewToggle && writeToggle) {
          previewToggle.classList.toggle('active', !showing);
          writeToggle.classList.toggle('active', showing);
        }
        return;
      }
      if (command === 'fullscreen') {
        self.modal.classList.toggle('fullscreen-editor');
        return;
      }
      self.runCommand(command);
      self._closeDropdowns();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.dropdown-container')) self._closeDropdowns();
    });
  };

  BlogTipTapEditor.prototype._toggleHeadingDropdown = function (btn) {
    var container = btn.closest('.dropdown-container');
    if (!container) return;
    var menu = container.querySelector('.dropdown-menu');
    if (!menu) return;
    var open = menu.classList.contains('show');
    this._closeDropdowns();
    if (!open) menu.classList.add('show');
  };

  BlogTipTapEditor.prototype._closeDropdowns = function () {
    if (!this.contentEditor) return;
    this.contentEditor.querySelectorAll('.dropdown-menu.show').forEach(function (el) {
      el.classList.remove('show');
    });
  };

  BlogTipTapEditor.prototype._syncToolbarActive = function () {
    if (!this.editor || !this.contentEditor) return;
    var ed = this.editor;
    this.contentEditor.querySelectorAll('.editor-btn[data-command]').forEach(function (btn) {
      var cmd = btn.getAttribute('data-command');
      var active = false;
      if (cmd === 'bold') active = ed.isActive('bold');
      else if (cmd === 'italic') active = ed.isActive('italic');
      else if (cmd === 'underline') active = ed.isActive('underline');
      else if (cmd === 'strikethrough') active = ed.isActive('strike');
      else if (cmd === 'insertUnorderedList') active = ed.isActive('bulletList');
      else if (cmd === 'insertOrderedList') active = ed.isActive('orderedList');
      else if (cmd === 'insertCode') active = ed.isActive('code');
      else if (cmd === 'insertCodeBlock') active = ed.isActive('codeBlock');
      else if (cmd === 'insertQuote') active = ed.isActive('blockquote');
      else if (cmd === 'insertLink') active = ed.isActive('link');
      btn.classList.toggle('active', active);
    });
  };

  BlogTipTapEditor.prototype.runCommand = function (command) {
    if (!this.editor) return;
    var chain = this.editor.chain().focus();
    switch (command) {
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'underline':
        chain.toggleUnderline().run();
        break;
      case 'strikethrough':
        chain.toggleStrike().run();
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        chain.toggleHeading({ level: Number(command.slice(1)) }).run();
        break;
      case 'insertUnorderedList':
        chain.toggleBulletList().run();
        break;
      case 'insertOrderedList':
        chain.toggleOrderedList().run();
        break;
      case 'indent':
        chain.sinkListItem('listItem').run();
        break;
      case 'outdent':
        chain.liftListItem('listItem').run();
        break;
      case 'insertCode':
        chain.toggleCode().run();
        break;
      case 'insertCodeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'insertQuote':
        chain.toggleBlockquote().run();
        break;
      case 'insertLink':
        this._promptLink();
        break;
      case 'insertImage':
        this._insertImage();
        break;
      case 'hr':
        chain.setHorizontalRule().run();
        break;
      default:
        break;
    }
    this._syncToolbarActive();
  };

  BlogTipTapEditor.prototype._promptLink = function () {
    if (!this.editor) return;
    var prev = this.editor.getAttributes('link').href || '';
    var url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    url = String(url).trim();
    if (!url) {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  BlogTipTapEditor.prototype._insertImage = function () {
    var self = this;
    openImagePicker(function (data) {
      if (!self.editor || !data || !data.src) return;
      self.editor
        .chain()
        .focus()
        .setImage({ src: data.src, alt: data.alt || '' })
        .run();
    });
  };

  BlogTipTapEditor.prototype._ensureSlashMenu = function () {
    if (this.slashMenu) return;
    var menu = document.createElement('div');
    menu.className = 'blog-tiptap-slash has-scrollbar';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    menu.innerHTML = SLASH_ITEMS.map(function (item, i) {
      return (
        '<button type="button" class="blog-tiptap-slash-item" role="option" data-slash-id="' +
        item.id +
        '" data-index="' +
        i +
        '">' +
        '<ion-icon name="' +
        item.icon +
        '" aria-hidden="true"></ion-icon>' +
        '<span class="blog-tiptap-slash-copy"><strong>' +
        esc(item.label) +
        '</strong><small>' +
        esc(item.hint) +
        '</small></span></button>'
      );
    }).join('');
    (this.contentEditor || this.modal).appendChild(menu);
    this.slashMenu = menu;
    var self = this;
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-slash-id]');
      if (!item) return;
      self._runSlash(item.getAttribute('data-slash-id'));
    });
  };

  BlogTipTapEditor.prototype._handleKeyDown = function (view, event) {
    if (!this.slashMenu || this.slashMenu.hidden) {
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Let "/" insert, then open menu on next tick from onUpdate
        return false;
      }
      // Shortcuts
      var mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        this.runCommand('bold');
        return true;
      }
      if (mod && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        this.runCommand('italic');
        return true;
      }
      if (mod && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        this.runCommand('underline');
        return true;
      }
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.runCommand('insertLink');
        return true;
      }
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        this._saveDraftNow(true);
        return true;
      }
      if (mod && event.shiftKey && event.key === 'Enter') {
        // soft break already via shift-enter in PM sometimes; keep default
        return false;
      }
      return false;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this._hideSlash();
      return true;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._slashIndex = Math.min(this._slashIndex + 1, SLASH_ITEMS.length - 1);
      this._paintSlashActive();
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._slashIndex = Math.max(this._slashIndex - 1, 0);
      this._paintSlashActive();
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      var item = SLASH_ITEMS[this._slashIndex];
      if (item) this._runSlash(item.id);
      return true;
    }
    return false;
  };

  BlogTipTapEditor.prototype._updateSlashFromEditor = function () {
    if (!this.editor) return;
    var { state } = this.editor;
    var { from, empty } = state.selection;
    if (!empty) {
      this._hideSlash();
      return;
    }
    var $from = state.selection.$from;
    var textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 20), $from.parentOffset, null, '\uffff');
    var match = textBefore.match(/(?:^|\s)\/([a-zA-Z]*)$/);
    if (!match) {
      this._hideSlash();
      return;
    }
    var query = (match[1] || '').toLowerCase();
    var filtered = SLASH_ITEMS.filter(function (item) {
      return !query || item.id.indexOf(query) >= 0 || item.label.toLowerCase().indexOf(query) >= 0;
    });
    if (!filtered.length) {
      this._hideSlash();
      return;
    }
    this._slashQuery = query;
    this._slashFiltered = filtered;
    this._slashIndex = 0;
    this._slashDeleteFrom = from - match[0].replace(/^\s/, '').length;
    this._slashDeleteTo = from;
    this._showSlash(filtered);
  };

  BlogTipTapEditor.prototype._showSlash = function (items) {
    var self = this;
    this._ensureSlashMenu();
    var menu = this.slashMenu;
    menu.hidden = false;
    menu.innerHTML = items
      .map(function (item, i) {
        return (
          '<button type="button" class="blog-tiptap-slash-item' +
          (i === 0 ? ' is-active' : '') +
          '" role="option" data-slash-id="' +
          item.id +
          '" data-index="' +
          i +
          '">' +
          '<ion-icon name="' +
          item.icon +
          '" aria-hidden="true"></ion-icon>' +
          '<span class="blog-tiptap-slash-copy"><strong>' +
          esc(item.label) +
          '</strong><small>' +
          esc(item.hint) +
          '</small></span></button>'
        );
      })
      .join('');

    try {
      var coords = this.editor.view.coordsAtPos(this.editor.state.selection.from);
      var host = this.contentEditor.getBoundingClientRect();
      menu.style.top = Math.max(8, coords.bottom - host.top + 8) + 'px';
      menu.style.left = Math.max(8, coords.left - host.left) + 'px';
    } catch (e) {
      menu.style.top = '72px';
      menu.style.left = '16px';
    }
  };

  BlogTipTapEditor.prototype._paintSlashActive = function () {
    if (!this.slashMenu) return;
    var items = this.slashMenu.querySelectorAll('.blog-tiptap-slash-item');
    items.forEach(function (el, i) {
      el.classList.toggle('is-active', i === this._slashIndex);
    }, this);
  };

  BlogTipTapEditor.prototype._hideSlash = function () {
    if (this.slashMenu) this.slashMenu.hidden = true;
    this._slashFiltered = null;
  };

  BlogTipTapEditor.prototype._runSlash = function (id) {
    if (!this.editor) return;
    var from = this._slashDeleteFrom;
    var to = this._slashDeleteTo;
    if (typeof from === 'number' && typeof to === 'number' && to >= from) {
      this.editor.chain().focus().deleteRange({ from: from, to: to }).run();
    }
    this._hideSlash();
    var map = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      bullet: 'insertUnorderedList',
      ordered: 'insertOrderedList',
      quote: 'insertQuote',
      codeBlock: 'insertCodeBlock',
      image: 'insertImage',
      hr: 'hr'
    };
    this.runCommand(map[id] || id);
  };

  BlogTipTapEditor.prototype._scheduleAutosave = function () {
    var self = this;
    if (!this.draftKey) return;
    if (this._autosaveTimer) clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(function () {
      self._saveDraftNow(false);
    }, 1800);
  };

  BlogTipTapEditor.prototype._saveDraftNow = function (announce) {
    if (!this.draftKey || !this.editor) return;
    try {
      var payload = {
        html: this.getHTML(),
        savedAt: Date.now()
      };
      localStorage.setItem(this.draftKey, JSON.stringify(payload));
      this._setDraftBanner(announce ? 'Draft saved locally' : 'Autosaved', false);
    } catch (e) {
      this._setDraftBanner('Could not autosave', true);
    }
  };

  BlogTipTapEditor.prototype.clearDraft = function () {
    if (!this.draftKey) return;
    try {
      localStorage.removeItem(this.draftKey);
    } catch (e) { /* ignore */ }
    this._setDraftBanner('', false);
  };

  BlogTipTapEditor.prototype._offerDraftRestore = function () {
    if (!this.draftKey) return;
    var raw;
    try {
      raw = localStorage.getItem(this.draftKey);
    } catch (e) {
      return;
    }
    if (!raw) return;
    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!data || !data.html || !String(data.html).trim() || data.html === '<p></p>') return;
    var current = this.getHTML();
    if (current && current !== '<p></p>') return;
    var self = this;
    this._setDraftBanner(
      'Local draft found. <button type="button" class="blog-tiptap-draft-restore">Restore</button> · <button type="button" class="blog-tiptap-draft-discard">Discard</button>',
      false,
      true
    );
    if (!this.draftBanner) return;
    var restore = this.draftBanner.querySelector('.blog-tiptap-draft-restore');
    var discard = this.draftBanner.querySelector('.blog-tiptap-draft-discard');
    if (restore) {
      restore.onclick = function () {
        self.setContent(data.html);
        self._setDraftBanner('Draft restored', false);
      };
    }
    if (discard) {
      discard.onclick = function () {
        self.clearDraft();
      };
    }
  };

  BlogTipTapEditor.prototype._setDraftBanner = function (message, isError, allowHtml) {
    if (!this.draftBanner) return;
    if (!message) {
      this.draftBanner.hidden = true;
      this.draftBanner.innerHTML = '';
      return;
    }
    this.draftBanner.hidden = false;
    this.draftBanner.classList.toggle('is-error', !!isError);
    if (allowHtml) this.draftBanner.innerHTML = message;
    else this.draftBanner.textContent = message;
  };

  async function createBlogTipTapEditor(modalId, isEdit, initialHtml) {
    var modal = document.getElementById(modalId);
    if (!modal) return null;
    var key = isEdit ? 'editEditor' : 'addEditor';
    if (window[key] && typeof window[key].destroy === 'function') {
      try {
        window[key].destroy();
      } catch (e) { /* ignore */ }
    }
    var instance = new BlogTipTapEditor({ modal: modal, isEdit: isEdit });
    if (isEdit) {
      var idEl = document.getElementById('edit-blog-id');
      instance.setDraftKeyForEdit(idEl && idEl.value ? idEl.value : null);
    }
    await instance.mount(initialHtml);
    window[key] = instance;
    return instance;
  }

  window.BlogTipTapEditor = BlogTipTapEditor;
  window.createBlogTipTapEditor = createBlogTipTapEditor;
  window.syncBlogTipTapToForm = function (isEdit) {
    var ed = isEdit ? window.editEditor : window.addEditor;
    if (ed && typeof ed.syncToTextarea === 'function') ed.syncToTextarea();
  };
  window.clearBlogTipTapDraft = function (isEdit) {
    var ed = isEdit ? window.editEditor : window.addEditor;
    if (ed && typeof ed.clearDraft === 'function') ed.clearDraft();
  };
})();
