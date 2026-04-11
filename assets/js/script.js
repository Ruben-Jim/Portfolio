'use strict';

    
// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });

// navbar (hamburger) – one per article; each toggle opens its own menu
document.querySelectorAll("[data-navbar-btn]").forEach(function (btn) {
  var nav = btn.closest("[data-navbar]");
  if (nav) {
    btn.addEventListener("click", function () { nav.classList.toggle("open"); });
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.querySelectorAll("[data-navbar]").forEach(function (nav) {
      nav.classList.remove("open");
    });
  }
});

// testimonials variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

// modal variable
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
}

// add click event to all modal items
for (let i = 0; i < testimonialsItem.length; i++) {

  testimonialsItem[i].addEventListener("click", function () {

    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
    modalTitle.innerHTML = this.querySelector("[data-testimonials-title]").innerHTML;
    modalText.innerHTML = this.querySelector("[data-testimonials-text]").innerHTML;

    testimonialsModalFunc();

  });

}

// add click event to modal close button
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);





// blog modal variables
let blogItems = document.querySelectorAll("[data-blog-item]");
const blogModalContainer = document.querySelector("[data-blog-modal-container]");
const blogModalCloseBtn = document.querySelector("[data-blog-modal-close-btn]");
const blogOverlay = document.querySelector("[data-blog-overlay]");


// Simple authentication system - Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// Global currentUser - simple session management
let currentUser = null;

// Authentication state management
function updateAuthUI() {
  // Re-render blog posts to show/hide edit/delete buttons
  if (typeof renderBlogPosts === 'function') {
    renderBlogPosts();
  }
  // Also update admin dashboard if user is admin
  if (currentUser && currentUser.role === 'admin') {
    renderAdminBlogPosts();
  }
}

// Helper function to check if user is logged in as admin
function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

// Blog management moved to admin tab only - authentication required for editing

// blog modal elements
const blogModalImage = document.querySelector("[data-blog-modal-image]");
const blogModalCategory = document.querySelector("[data-blog-modal-category]");
const blogModalDate = document.querySelector("[data-blog-modal-date]");
const blogModalTitle = document.querySelector("[data-blog-modal-title]");
const blogModalText = document.querySelector("[data-blog-modal-text]");

// blog modal toggle function
const blogModalFunc = function () {
  blogModalContainer.classList.toggle("active");
  blogOverlay.classList.toggle("active");
}

// Firestore functions
async function loadBlogPostsFromFirestore() {
  try {
    if (!window.db) {
      console.log('Firebase not initialized, using default posts');
      blogPosts = [...defaultBlogPosts];
      return;
    }

    isLoading = true;
    showLoadingState();

    const blogPostsRef = window.collection(window.db, 'blogPosts');
    const q = window.query(blogPostsRef, window.orderBy('createdAt', 'desc'));
    const querySnapshot = await window.getDocs(q);
    
    blogPosts = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      blogPosts.push({
        id: doc.id,
        title: data.title,
        category: data.category,
        date: data.date,
        image: data.image || './assets/images/blog-1.jpg',
        excerpt: data.excerpt,
        content: data.content,
        createdAt: data.createdAt
      });
    });

    // If no posts in Firestore, use default posts
    if (blogPosts.length === 0) {
      blogPosts = [...defaultBlogPosts];
    }

    hideLoadingState();
  } catch (error) {
    console.error('Error loading blog posts:', error);
    blogPosts = [...defaultBlogPosts];
    hideLoadingState();
    showError('Failed to load blog posts. Using default content.');
  }
}

async function saveBlogPostToFirestore(postData) {
  try {
    if (!window.db) {
      console.error('Firebase not initialized! window.db is:', window.db);
      const error = new Error('Firebase is not initialized. Please refresh the page and try again.');
      showErrorMessage(error.message);
      throw error;
    }

    console.log('Saving blog post to Firestore:', postData);
    console.log('window.db:', window.db);
    console.log('window.collection:', typeof window.collection);
    console.log('window.addDoc:', typeof window.addDoc);
    console.log('window.serverTimestamp:', typeof window.serverTimestamp);
    
    const blogPostsRef = window.collection(window.db, 'blogPosts');
    console.log('blogPostsRef created:', blogPostsRef);
    
    const docRef = await window.addDoc(blogPostsRef, {
      ...postData,
      createdAt: window.serverTimestamp()
    });

    console.log('Blog post saved successfully with ID:', docRef.id);
    console.log('docRef:', docRef);
    
    if (!docRef || !docRef.id) {
      throw new Error('Failed to save post - no document ID returned from Firestore');
    }
    
    return {
      ...postData,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error saving blog post to Firestore:', error);
    console.error('Error details:', error.message, error.code);
    console.error('Error stack:', error.stack);
    showErrorMessage(`Failed to save blog post: ${error.message}`);
    throw error;
  }
}

async function updateBlogPostInFirestore(postId, postData) {
  try {
    if (!window.db) {
      console.error('Firebase not initialized! window.db is:', window.db);
      showErrorMessage('Firebase is not initialized. Please refresh the page and try again.');
      return postData;
    }

    console.log('Updating blog post in Firestore:', postId, postData);
    const postRef = window.doc(window.db, 'blogPosts', postId);
    await window.updateDoc(postRef, {
      ...postData,
      updatedAt: window.serverTimestamp()
    });

    console.log('Blog post updated successfully');
    return {
      ...postData,
      id: postId
    };
  } catch (error) {
    console.error('Error updating blog post in Firestore:', error);
    console.error('Error details:', error.message, error.code);
    showErrorMessage(`Failed to update blog post: ${error.message}`);
    throw error;
  }
}

async function deleteBlogPostFromFirestore(postId) {
  try {
    if (!window.db) {
      console.error('Firebase not initialized! window.db is:', window.db);
      showErrorMessage('Firebase is not initialized. Please refresh the page and try again.');
      return;
    }

    console.log('Deleting blog post from Firestore:', postId);
    const postRef = window.doc(window.db, 'blogPosts', postId);
    await window.deleteDoc(postRef);
    console.log('Blog post deleted successfully');
  } catch (error) {
    console.error('Error deleting blog post from Firestore:', error);
    console.error('Error details:', error.message, error.code);
    showErrorMessage(`Failed to delete blog post: ${error.message}`);
    throw error;
  }
}

function showLoadingState() {
  const blogPostsList = document.getElementById('blog-posts-list');
  blogPostsList.innerHTML = `
    <li class="loading-item">
      <div class="loading-spinner"></div>
      <p>Loading blog posts...</p>
    </li>
  `;
}

function hideLoadingState() {
  isLoading = false;
}

function showError(message) {
  const blogPostsList = document.getElementById('blog-posts-list');
  blogPostsList.innerHTML = `
    <li class="error-item">
      <p>${message}</p>
    </li>
  `;
}

// Function to render blog posts
function renderBlogPosts() {
  const blogPostsList = document.getElementById('blog-posts-list');
  blogPostsList.innerHTML = '';

  if (blogPosts.length === 0) {
    blogPostsList.innerHTML = `
      <li class="empty-item">
        <p>No blog posts found. Create your first post!</p>
      </li>
    `;
    return;
  }

  console.log('Rendering blog posts:', blogPosts);

  blogPosts.forEach(post => {
    const blogItem = document.createElement('li');
    blogItem.className = 'blog-post-item';
    blogItem.innerHTML = `
      <a href="#" data-blog-item data-blog-id="${post.id}">
        <figure class="blog-banner-box">
          <img src="${post.image}" alt="${post.title}" loading="lazy" data-blog-image>
        </figure>
        
        <div class="blog-content">
          <div class="blog-meta">
            <p class="blog-category" data-blog-category>${post.category}</p>
            <span class="dot"></span>
            <time datetime="${post.date}" data-blog-date>${formatDate(post.date)}</time>
          </div>
          
          <h3 class="h3 blog-item-title" data-blog-title>${post.title}</h3>
          
          <p class="blog-text" data-blog-excerpt>${post.excerpt}</p>
        </div>
      </a>
    `;
    blogPostsList.appendChild(blogItem);
  });

  // Re-attach event listeners
  attachBlogEventListeners();
}

// Function to render blog posts in admin dashboard
function renderAdminBlogPosts() {
  const adminBlogPostsList = document.getElementById('admin-blog-posts-list');
  if (!adminBlogPostsList) return;

  adminBlogPostsList.innerHTML = '';

  if (blogPosts.length === 0) {
    adminBlogPostsList.innerHTML = `
      <div class="empty-item">
        <p>No blog posts found. Create your first post!</p>
      </div>
    `;
    return;
  }

  console.log('Rendering blog posts in admin dashboard:', blogPosts);

  blogPosts.forEach(post => {
    const blogItem = document.createElement('li');
    blogItem.className = 'blog-post-item';
    blogItem.innerHTML = `
      <a href="#" data-blog-item data-blog-id="${post.id}">
        <figure class="blog-banner-box">
          <img src="${post.image}" alt="${post.title}" loading="lazy" data-blog-image>
        </figure>

        <div class="blog-content">
          <div class="blog-meta">
            <p class="blog-category" data-blog-category>${post.category}</p>
            <span class="dot"></span>
            <time datetime="${post.date}" data-blog-date>${formatDate(post.date)}</time>
          </div>

          <h3 class="h3 blog-item-title" data-blog-title>${post.title}</h3>

          <p class="blog-text" data-blog-excerpt>${post.excerpt}</p>
        </div>
      </a>
        <div class="blog-post-actions">
          <button class="blog-action-btn edit-btn" data-edit-blog="${post.id}" title="Edit Post">
            <ion-icon name="create-outline"></ion-icon>
          </button>
          <button class="blog-action-btn delete-btn" data-delete-blog="${post.id}" title="Delete Post">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
    `;
    adminBlogPostsList.appendChild(blogItem);
  });

  // Re-attach event listeners
  attachBlogEventListeners();

  // Attach edit/delete button listeners (always shown in admin dashboard when logged in)
  attachEditDeleteListeners();
}

// Function to attach blog event listeners
function attachBlogEventListeners() {
  // Remove existing event listeners to prevent duplicates
  const existingItems = document.querySelectorAll("[data-blog-item]");
  existingItems.forEach(item => {
    item.replaceWith(item.cloneNode(true));
  });
  
  // Get fresh references to blog items
  blogItems = document.querySelectorAll("[data-blog-item]");
  
  console.log('Attaching event listeners to', blogItems.length, 'blog items');
  
  for (let i = 0; i < blogItems.length; i++) {
    blogItems[i].addEventListener("click", function (e) {
      e.preventDefault();
      
      const blogId = this.getAttribute('data-blog-id');
      console.log('Clicked blog item with ID:', blogId);
      console.log('Available blog posts:', blogPosts.map(p => ({ id: p.id, title: p.title })));
      
      const post = blogPosts.find(p => p.id === blogId);
      
      if (post) {
        console.log('Found post:', post);
        // Update modal content
        blogModalImage.src = post.image;
        blogModalImage.alt = post.title;
        blogModalCategory.innerHTML = post.category;
        blogModalDate.innerHTML = formatDate(post.date);
        blogModalDate.setAttribute('datetime', post.date);
        blogModalTitle.innerHTML = post.title;
        blogModalText.innerHTML = post.content;
        
        blogModalFunc();
      } else {
        console.error('Blog post not found:', blogId);
        console.error('Available IDs:', blogPosts.map(p => p.id));
      }
    });
  }
}

// Function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// ── Copy-paste snippets (Blog tab + Admin Blog Management) ──
const SNIPPETS_STORAGE_KEY = 'portfolio_copy_paste_snippets_v1';

function generateSnippetId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function getDefaultSnippetsSeed() {
  return [
    {
      id: 'seed-expo-start',
      label: 'React Native Expo Start',
      code: 'npx create-expo-app my-app\ncd my-app\nnpx expo start'
    }
  ];
}

function loadSnippetsArray() {
  try {
    const raw = localStorage.getItem(SNIPPETS_STORAGE_KEY);
    if (raw !== null && raw !== '') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          id: String(s.id || generateSnippetId()),
          label: String(s.label || 'Snippet').slice(0, 200),
          code: String(s.code ?? '')
        }));
      }
    }
    if (raw === null) {
      const seed = getDefaultSnippetsSeed();
      try {
        localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(seed));
      } catch (e2) {}
      return seed.map((s) => ({ ...s }));
    }
  } catch (e) {
    console.warn('Snippets: could not read storage', e);
  }
  return [];
}

function saveSnippetsArray(arr) {
  try {
    localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Snippets: save failed', e);
    if (typeof showErrorMessage === 'function') {
      showErrorMessage('Could not save snippets (storage may be full or disabled).');
    }
  }
  renderPublicSnippets();
  renderAdminSnippets();
}

function renderPublicSnippets() {
  const grid = document.getElementById('snippets-grid');
  if (!grid) return;
  const items = loadSnippetsArray();
  grid.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'snippets-empty-hint';
    empty.textContent = 'No snippets yet. Add some in Admin → Blog Management.';
    grid.appendChild(empty);
    return;
  }
  items.forEach((sn) => {
    const card = document.createElement('div');
    card.className = 'snippet-card';
    const header = document.createElement('div');
    header.className = 'snippet-header';
    const label = document.createElement('span');
    label.className = 'snippet-label';
    label.textContent = sn.label;
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'snippet-copy-btn';
    copyBtn.setAttribute('data-snippet-copy', '');
    copyBtn.setAttribute('aria-label', 'Copy snippet');
    copyBtn.innerHTML = '<ion-icon name="copy-outline"></ion-icon><span class="snippet-copy-text">Copy</span>';
    header.appendChild(label);
    header.appendChild(copyBtn);
    const pre = document.createElement('pre');
    pre.className = 'snippet-code has-scrollbar';
    const code = document.createElement('code');
    code.setAttribute('data-snippet', '');
    code.textContent = sn.code;
    pre.appendChild(code);
    card.appendChild(header);
    card.appendChild(pre);
    grid.appendChild(card);
  });
}

function renderAdminSnippets() {
  const list = document.getElementById('admin-snippets-list');
  if (!list) return;
  const isAdmin = currentUser && currentUser.role === 'admin';
  if (!isAdmin) {
    list.innerHTML = '<div class="empty-item"><p>Log in to manage snippets.</p></div>';
    return;
  }
  const items = loadSnippetsArray();
  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-item"><p>No snippets yet. Click Add Snippet.</p></div>';
    return;
  }
  items.forEach((sn) => {
    const row = document.createElement('div');
    row.className = 'admin-snippet-row';
    const main = document.createElement('div');
    main.className = 'admin-snippet-row-main';
    const title = document.createElement('strong');
    title.className = 'admin-snippet-row-title';
    title.textContent = sn.label;
    const preview = document.createElement('span');
    preview.className = 'admin-snippet-row-preview';
    const firstLine = (sn.code || '').split('\n')[0] || '(empty)';
    preview.textContent = firstLine.length > 72 ? firstLine.slice(0, 72) + '…' : firstLine;
    main.appendChild(title);
    main.appendChild(preview);
    const actions = document.createElement('div');
    actions.className = 'admin-snippet-row-actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'blog-action-btn edit-btn';
    editBtn.setAttribute('data-edit-snippet', sn.id);
    editBtn.title = 'Edit snippet';
    editBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon>';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'blog-action-btn delete-btn';
    delBtn.setAttribute('data-delete-snippet', sn.id);
    delBtn.title = 'Delete snippet';
    delBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(main);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

function openSnippetEditModal(mode, snippetId) {
  const modal = document.getElementById('snippet-edit-modal');
  const titleEl = document.getElementById('snippet-edit-modal-title');
  const idInput = document.getElementById('snippet-edit-id');
  const labelInput = document.getElementById('snippet-edit-label');
  const codeInput = document.getElementById('snippet-edit-code');
  if (!modal || !titleEl || !idInput || !labelInput || !codeInput) return;
  if (mode === 'edit' && snippetId) {
    const items = loadSnippetsArray();
    const sn = items.find((s) => s.id === snippetId);
    if (!sn) return;
    titleEl.textContent = 'Edit Snippet';
    idInput.value = sn.id;
    labelInput.value = sn.label;
    codeInput.value = sn.code;
  } else {
    titleEl.textContent = 'New Snippet';
    idInput.value = '';
    labelInput.value = '';
    codeInput.value = '';
  }
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  labelInput.focus();
}

function closeSnippetEditModal() {
  const modal = document.getElementById('snippet-edit-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function initSnippetManagementUI() {
  renderPublicSnippets();
  renderAdminSnippets();

  const grid = document.getElementById('snippets-grid');
  if (grid) {
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-snippet-copy]');
      if (!btn || !grid.contains(btn)) return;
      const card = btn.closest('.snippet-card');
      const codeEl = card ? card.querySelector('[data-snippet]') : null;
      if (!codeEl) return;
      const text = codeEl.textContent || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          const span = btn.querySelector('.snippet-copy-text');
          const orig = span ? span.textContent : 'Copy';
          if (span) span.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.classList.remove('copied');
            if (span) span.textContent = orig;
          }, 2000);
        }).catch(function () {
          fallbackCopySnippetText(text, btn);
        });
      } else {
        fallbackCopySnippetText(text, btn);
      }
    });
  }

  function fallbackCopySnippetText(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      const span = btn.querySelector('.snippet-copy-text');
      if (span) span.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.classList.remove('copied');
        if (span) span.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      const span = btn.querySelector('.snippet-copy-text');
      if (span) span.textContent = 'Failed';
    }
    document.body.removeChild(ta);
  }

  const addBtn = document.getElementById('admin-add-snippet-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (!currentUser || currentUser.role !== 'admin') return;
      openSnippetEditModal('add');
    });
  }

  const list = document.getElementById('admin-snippets-list');
  if (list) {
    list.addEventListener('click', function (e) {
      const editBtn = e.target.closest('[data-edit-snippet]');
      const delBtn = e.target.closest('[data-delete-snippet]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-edit-snippet');
        openSnippetEditModal('edit', id);
        return;
      }
      if (delBtn) {
        const id = delBtn.getAttribute('data-delete-snippet');
        if (!id || !confirm('Delete this snippet?')) return;
        const next = loadSnippetsArray().filter((s) => s.id !== id);
        saveSnippetsArray(next);
      }
    });
  }

  const form = document.getElementById('snippet-edit-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const idVal = document.getElementById('snippet-edit-id').value.trim();
      const label = document.getElementById('snippet-edit-label').value.trim();
      const code = document.getElementById('snippet-edit-code').value;
      if (!label) return;
      let items = loadSnippetsArray();
      if (idVal) {
        items = items.map((s) => (s.id === idVal ? { ...s, label, code } : s));
      } else {
        items.push({ id: generateSnippetId(), label, code });
      }
      saveSnippetsArray(items);
      closeSnippetEditModal();
    });
  }

  const closeBtn = document.getElementById('snippet-edit-close-btn');
  const cancelBtn = document.getElementById('snippet-edit-cancel-btn');
  const overlay = document.getElementById('snippet-edit-overlay');
  if (closeBtn) closeBtn.addEventListener('click', closeSnippetEditModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSnippetEditModal);
  if (overlay) overlay.addEventListener('click', closeSnippetEditModal);
}

window.renderAdminSnippets = renderAdminSnippets;
window.initSnippetManagementUI = initSnippetManagementUI;

document.addEventListener('DOMContentLoaded', function () {
  if (typeof initSnippetManagementUI === 'function') {
    initSnippetManagementUI();
  }
});

// Blog management functionality
const addBlogBtn = document.getElementById('add-blog-btn');
const addBlogModal = document.getElementById('add-blog-modal');
const addBlogOverlay = document.getElementById('add-blog-overlay');
const addBlogCloseBtn = document.getElementById('add-blog-close-btn');
const cancelBlogBtn = document.getElementById('cancel-blog-btn');
const addBlogForm = document.getElementById('add-blog-form');
const contentTextarea = document.getElementById('blog-content');
const lineNumbers = document.getElementById('editor-line-numbers');
const charCount = document.querySelector('.char-count');
const wordCount = document.querySelector('.word-count');

// Update line numbers
function updateLineNumbers() {
  if (!lineNumbers || !contentTextarea) return;
  
  const lines = contentTextarea.value.split('\n');
  const lineCount = lines.length || 1;
  
  let lineNumbersHTML = '';
  for (let i = 1; i <= lineCount; i++) {
    lineNumbersHTML += `${i}\n`;
  }
  
  lineNumbers.textContent = lineNumbersHTML;
}

// Update character and word count
function updateCounts() {
  if (!charCount || !wordCount || !contentTextarea) return;
  
  const text = contentTextarea.value;
  const charCountValue = text.length;
  const wordCountValue = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  charCount.textContent = `${charCountValue.toLocaleString()} characters`;
  wordCount.textContent = `${wordCountValue.toLocaleString()} words`;
}

// Open add blog modal (only from admin dashboard)
if (addBlogBtn) {
  addBlogBtn.addEventListener('click', function() {
    // Security check: Only allow admin users to open add blog modal
    if (!isAdmin()) {
      showErrorMessage('Access denied. Admin privileges required to add blog posts.');
      return;
    }
    
    // Use the proper function to open modal (which has additional security checks)
    openAddBlogModal();
  });
}

// Close add blog modal
function closeAddBlogModal() {
  if (addBlogModal) {
    addBlogModal.classList.remove('active');
    // Clear all inline styles set when opening the modal
    addBlogModal.style.display = '';
    addBlogModal.style.visibility = '';
    addBlogModal.style.opacity = '';
    addBlogModal.style.zIndex = '';
    addBlogModal.style.position = '';
    addBlogModal.style.top = '';
    addBlogModal.style.left = '';
    addBlogModal.style.width = '';
    addBlogModal.style.height = '';
  }
  
  // Clear overlay inline styles
  if (addBlogOverlay) {
    addBlogOverlay.style.opacity = '';
    addBlogOverlay.style.visibility = '';
    addBlogOverlay.style.zIndex = '';
  }
  
  // Reset form
  if (addBlogForm) {
    addBlogForm.reset();
  }
}

// Event listeners for add modal
if (addBlogCloseBtn) {
  addBlogCloseBtn.addEventListener('click', closeAddBlogModal);
}
if (addBlogOverlay) {
  addBlogOverlay.addEventListener('click', closeAddBlogModal);
}
if (cancelBlogBtn) {
  cancelBlogBtn.addEventListener('click', closeAddBlogModal);
}

// Prevent clicks inside modal content from closing the modal
if (addBlogModal) {
  const addBlogContent = addBlogModal.querySelector('.add-blog-content');
  if (addBlogContent) {
    addBlogContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// ESC key to close modals
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' || e.keyCode === 27) {
    // Close add modal if it's open
    if (addBlogModal && addBlogModal.classList.contains('active')) {
      closeAddBlogModal();
    }
    // Close edit modal if it's open
    if (editBlogModal && editBlogModal.classList.contains('active')) {
      closeEditBlogModal();
    }
  }
});

// Editor toolbar functionality
const editorBtns = document.querySelectorAll('.editor-btn');

// Sync scroll between textarea and line numbers
function syncScroll() {
  if (!lineNumbers || !contentTextarea) return;
  lineNumbers.scrollTop = contentTextarea.scrollTop;
}

// Initialize editor features
function initEditorFeatures() {
  if (!contentTextarea) return;
  
  // Update on input
  contentTextarea.addEventListener('input', function() {
    updateLineNumbers();
    updateCounts();
  });
  
  // Update on scroll
  contentTextarea.addEventListener('scroll', syncScroll);
  
  // Initial update
  updateLineNumbers();
  updateCounts();
  
  // Update when modal opens
  if (addBlogModal) {
    const observer = new MutationObserver(function(mutations) {
      if (addBlogModal.classList.contains('active')) {
        setTimeout(function() {
          updateLineNumbers();
          updateCounts();
        }, 100);
      }
    });
    
    observer.observe(addBlogModal, { attributes: true, attributeFilter: ['class'] });
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditorFeatures);
} else {
  initEditorFeatures();
}

// Enhanced editor functionality with modern features
class BlogEditor {
  constructor(container, isEdit = false) {
    console.log('BlogEditor constructor called for', isEdit ? 'edit' : 'add', 'modal');
    console.log('Container element:', container ? container.tagName + '.' + container.className : 'null');

    this.container = container;
    this.isEdit = isEdit;

    // Find the content-editor div within the modal
    const contentEditor = container.querySelector('.content-editor');
    console.log('Content editor found:', !!contentEditor);

    if (contentEditor) {
      this.textarea = contentEditor.querySelector('.editor-textarea');
      this.preview = contentEditor.querySelector('.preview-content');
      this.lineNumbers = contentEditor.querySelector('.editor-line-numbers');
      this.charCount = contentEditor.querySelector('.char-count');
      this.wordCount = contentEditor.querySelector('.word-count');
      this.lineCount = contentEditor.querySelector('.line-count');
      this.modeToggles = contentEditor.querySelectorAll('.mode-toggle');
      this.editorWrapper = contentEditor.querySelector('.editor-wrapper');
      this.previewContainer = contentEditor.querySelector('.editor-preview');
    } else {
      console.log('Content editor not found, falling back to direct queries');
      this.textarea = container.querySelector('.editor-textarea');
      this.preview = container.querySelector('.preview-content');
      this.lineNumbers = container.querySelector('.editor-line-numbers');
      this.charCount = container.querySelector('.char-count');
      this.wordCount = container.querySelector('.word-count');
      this.lineCount = container.querySelector('.line-count');
      this.modeToggles = container.querySelectorAll('.mode-toggle');
      this.editorWrapper = container.querySelector('.editor-wrapper');
      this.previewContainer = container.querySelector('.editor-preview');
    }

    console.log('BlogEditor elements found:', {
      textarea: !!this.textarea,
      preview: !!this.preview,
      previewContainer: !!this.previewContainer,
      editorWrapper: !!this.editorWrapper,
      modeToggles: this.modeToggles.length,
      charCount: !!this.charCount,
      wordCount: !!this.wordCount,
      lineCount: !!this.lineCount
    });

    this.init();
  }

  init() {
    console.log('BlogEditor: Initializing editor for', this.isEdit ? 'edit' : 'add', 'modal');
    console.log('BlogEditor: Found elements:', {
      textarea: !!this.textarea,
      preview: !!this.preview,
      previewContainer: !!this.previewContainer,
      modeToggles: this.modeToggles.length
    });

    this.setupToolbar();
    this.setupKeyboardShortcuts();
    this.setupModeToggles();
    this.updateStats();
    this.updateLineNumbers();

    // Live updates
    this.textarea.addEventListener('input', () => {
      this.updateStats();
      this.updateLineNumbers();
      if (this.previewContainer.classList.contains('show')) {
        this.updatePreview();
      }
    });

    this.textarea.addEventListener('scroll', () => {
      if (this.lineNumbers) {
        this.lineNumbers.scrollTop = this.textarea.scrollTop;
      }
    });

    // Tab and Enter handling
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.updateStats();
        this.updateLineNumbers();
      } else if (e.key === 'Enter') {
        // Allow Enter key to create new lines normally
        // Don't prevent default - let the browser handle line breaks
        setTimeout(() => {
          this.updateStats();
          this.updateLineNumbers();
        }, 0);
      }
    });

    console.log('BlogEditor: Initialization complete');
  }

  setupToolbar() {
    const buttons = this.container.querySelectorAll('.editor-btn');
    console.log('BlogEditor: Found', buttons.length, 'toolbar buttons in', this.isEdit ? 'edit' : 'add', 'modal');

    buttons.forEach(btn => {
      const command = btn.getAttribute('data-command');
      console.log('BlogEditor: Setting up button with command:', command);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.getAttribute('data-command');
        console.log('BlogEditor: Toolbar button clicked:', command);

        if (command === 'preview') {
          this.togglePreview();
        } else if (command === 'fullscreen') {
          this.toggleFullscreen();
        } else if (command.startsWith('h')) {
          this.insertHeading(command);
        } else if (command === 'heading') {
          this.toggleHeadingDropdown(btn);
        } else {
          this.executeCommand(command);
        }
      });
    });

    // Setup dropdown menu items
    const dropdownItems = this.container.querySelectorAll('.dropdown-item');
    console.log('BlogEditor: Found dropdown items:', dropdownItems.length);
    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const command = item.getAttribute('data-command');
        console.log('BlogEditor: Dropdown item clicked:', command);
        if (command && command.startsWith('h')) {
          this.insertHeading(command);
          this.closeAllDropdowns();
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-container')) {
        this.closeAllDropdowns();
      }
    });
  }

  setupKeyboardShortcuts() {
    // Keyboard shortcuts removed for simplicity - can be re-added later if needed
  }

  setupModeToggles() {
    this.modeToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const mode = toggle.getAttribute('data-mode');
        this.setMode(mode);

        // Update active state
        this.modeToggles.forEach(t => t.classList.remove('active'));
        toggle.classList.add('active');
      });
    });
  }

  executeCommand(command) {
    console.log('BlogEditor: Executing command:', command);
    this.textarea.focus();
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    console.log('BlogEditor: Selected text length:', selectedText.length);
    let newText = '';
    let cursorPos = start;

    switch(command) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorPos = start + (selectedText ? newText.length : 7);
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorPos = start + (selectedText ? newText.length : 8);
        break;
      case 'underline':
        newText = `<u>${selectedText || 'underlined text'}</u>`;
        cursorPos = start + (selectedText ? newText.length : 11);
        break;
      case 'strikethrough':
        newText = `~~${selectedText || 'strikethrough text'}~~`;
        cursorPos = start + (selectedText ? newText.length : 11);
        break;
      case 'insertUnorderedList':
        newText = selectedText
          ? `\n- ${selectedText}\n`
          : `\n- List item\n`;
        cursorPos = start + newText.length;
        break;
      case 'insertOrderedList':
        newText = selectedText
          ? `\n1. ${selectedText}\n`
          : `\n1. List item\n`;
        cursorPos = start + newText.length;
        break;
      case 'indent':
        this.indentText();
        return;
      case 'outdent':
        this.outdentText();
        return;
      case 'insertCode':
        newText = `\`${selectedText || 'code'}\``;
        cursorPos = start + (selectedText ? newText.length : 6);
        break;
      case 'insertCodeBlock':
        newText = selectedText
          ? `\`\`\`\n${selectedText}\n\`\`\``
          : `\`\`\`\ncode block\n\`\`\``;
        cursorPos = start + newText.length;
        break;
      case 'insertQuote':
        newText = selectedText
          ? `> ${selectedText}`
          : `> Quote text`;
        cursorPos = start + newText.length;
        break;
      case 'insertLink':
        const url = prompt('Enter URL:', 'https://');
        if (url) {
          newText = `[${selectedText || 'link text'}](${url})`;
          cursorPos = start + (selectedText ? newText.length : 11);
        } else {
          return;
        }
        break;
      case 'insertImage':
        const imageUrl = prompt('Enter image URL:', 'https://');
        if (imageUrl) {
          newText = `![${selectedText || 'Alt text'}](${imageUrl})`;
          cursorPos = start + (selectedText ? newText.length : 13);
        } else {
          return;
        }
        break;
    }

    if (newText) {
      this.textarea.value = this.textarea.value.substring(0, start) + newText + this.textarea.value.substring(end);
      this.textarea.focus();
      this.textarea.setSelectionRange(cursorPos, cursorPos);
      this.updateStats();
      this.updateLineNumbers();
      if (this.previewContainer.classList.contains('show')) {
        this.updatePreview();
      }
    }
  }

  insertHeading(level) {
    this.textarea.focus();
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    const hashes = '#'.repeat(parseInt(level.replace('h', '')));
    const newText = `\n${hashes} ${selectedText || 'Heading'}\n`;
    const cursorPos = start + newText.length;

    this.textarea.value = this.textarea.value.substring(0, start) + newText + this.textarea.value.substring(end);
    this.textarea.focus();
    this.textarea.setSelectionRange(cursorPos, cursorPos);
    this.updateStats();
    this.updateLineNumbers();
    if (this.previewContainer.classList.contains('show')) {
      this.updatePreview();
    }
  }

  toggleHeadingDropdown(btn) {
    const dropdown = btn.closest('.dropdown-container').querySelector('.dropdown-menu');
    const isOpen = dropdown.classList.contains('show');

    this.closeAllDropdowns();

    if (!isOpen) {
      dropdown.classList.add('show');
      btn.classList.add('active');
    }
  }

  closeAllDropdowns() {
    const dropdowns = this.container.querySelectorAll('.dropdown-menu');
    const triggers = this.container.querySelectorAll('.dropdown-trigger');

    dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
    triggers.forEach(trigger => trigger.classList.remove('active'));
  }

  indentText() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;
    const lines = text.split('\n');
    let newStart = start;
    let newEnd = end;

    // Find the lines that contain the selection
    let startLine = 0, endLine = 0;
    let charCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineStart = charCount;
      const lineEnd = charCount + lines[i].length;

      if (start >= lineStart && start <= lineEnd) startLine = i;
      if (end >= lineStart && end <= lineEnd) endLine = i;

      charCount += lines[i].length + 1; // +1 for newline
    }

    // Indent each line in the selection
    for (let i = startLine; i <= endLine; i++) {
      if (lines[i].trim()) { // Don't indent empty lines
        lines[i] = '  ' + lines[i];
        if (i === startLine) newStart += 2;
        if (i <= endLine) newEnd += 2;
      }
    }

    this.textarea.value = lines.join('\n');
    this.textarea.focus();
    this.textarea.setSelectionRange(newStart, newEnd);
    this.updateStats();
    this.updateLineNumbers();
  }

  outdentText() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;
    const lines = text.split('\n');
    let newStart = start;
    let newEnd = end;

    // Find the lines that contain the selection
    let startLine = 0, endLine = 0;
    let charCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineStart = charCount;
      const lineEnd = charCount + lines[i].length;

      if (start >= lineStart && start <= lineEnd) startLine = i;
      if (end >= lineStart && end <= lineEnd) endLine = i;

      charCount += lines[i].length + 1;
    }

    // Outdent each line in the selection
    for (let i = startLine; i <= endLine; i++) {
      if (lines[i].startsWith('  ')) {
        lines[i] = lines[i].substring(2);
        if (i === startLine) newStart = Math.max(0, newStart - 2);
        if (i <= endLine) newEnd = Math.max(0, newEnd - 2);
      } else if (lines[i].startsWith('\t')) {
        lines[i] = lines[i].substring(1);
        if (i === startLine) newStart = Math.max(0, newStart - 1);
        if (i <= endLine) newEnd = Math.max(0, newEnd - 1);
      }
    }

    this.textarea.value = lines.join('\n');
    this.textarea.focus();
    this.textarea.setSelectionRange(newStart, newEnd);
    this.updateStats();
    this.updateLineNumbers();
  }

  togglePreview() {
    console.log('BlogEditor: Toggle preview called for', this.isEdit ? 'edit' : 'add', 'modal');
    console.log('BlogEditor: previewContainer exists:', !!this.previewContainer);
    if (this.previewContainer) {
      console.log('BlogEditor: previewContainer classList:', this.previewContainer.classList.toString());
    }
    const isPreview = this.previewContainer && this.previewContainer.classList.contains('show');
    console.log('BlogEditor: Current preview state:', isPreview);

    if (isPreview) {
      console.log('BlogEditor: Switching to write mode');
      this.setMode('write');
    } else {
      console.log('BlogEditor: Switching to preview mode');
      this.setMode('preview');
    }
  }

  setMode(mode) {
    console.log('BlogEditor: Setting mode to:', mode);
    if (mode === 'preview') {
      console.log('BlogEditor: Activating preview mode');
      if (this.editorWrapper) {
        this.editorWrapper.style.display = 'none';
      }
      if (this.previewContainer) {
        this.previewContainer.style.display = 'block';
        this.previewContainer.classList.add('show');
        this.updatePreview();
      } else {
        console.log('BlogEditor: Preview container not found');
      }
    } else {
      console.log('BlogEditor: Activating write mode');
      if (this.editorWrapper) {
        this.editorWrapper.style.display = 'flex';
      }
      if (this.previewContainer) {
        this.previewContainer.style.display = 'none';
        this.previewContainer.classList.remove('show');
      }
    }

    // Update toggle buttons
    console.log('BlogEditor: Updating toggle buttons');
    this.modeToggles.forEach(toggle => {
      toggle.classList.toggle('active', toggle.getAttribute('data-mode') === mode);
    });
  }

  updatePreview() {
    console.log('BlogEditor: Updating preview');
    if (!this.preview) {
      console.log('BlogEditor: Preview element not found');
      return;
    }

    // Simple markdown-like preview (can be enhanced with a proper markdown parser)
    const content = this.textarea.value;
    console.log('BlogEditor: Preview content length:', content.length);
    let html = content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^\- (.*)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.*)$/gm, '<ol><li>$1</li></ol>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">');

    this.preview.innerHTML = html;
  }

  toggleFullscreen() {
    const container = this.container.closest('.add-blog-modal');
    if (container) {
      container.classList.toggle('fullscreen-editor');
    }
  }

  updateStats() {
    if (!this.charCount || !this.wordCount || !this.lineCount) return;

    const text = this.textarea.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;

    this.charCount.innerHTML = `<ion-icon name="text-outline"></ion-icon> ${chars.toLocaleString()}`;
    this.wordCount.innerHTML = `<ion-icon name="document-text-outline"></ion-icon> ${words.toLocaleString()}`;
    this.lineCount.innerHTML = `<ion-icon name="list-outline"></ion-icon> ${lines.toLocaleString()}`;
  }

  updateLineNumbers() {
    if (!this.lineNumbers) return;

    const lines = this.textarea.value.split('\n').length;
    let lineNumbersHtml = '';

    for (let i = 1; i <= Math.max(lines, 20); i++) {
      lineNumbersHtml += `${i}<br>`;
    }

    this.lineNumbers.innerHTML = lineNumbersHtml;
  }
}

// Initialize editors when modals are opened
function initializeEditor(modalId, isEdit = false) {
  console.log('initializeEditor called for modal:', modalId, 'isEdit:', isEdit);
  const modal = document.getElementById(modalId);
  if (modal) {
    console.log('Modal element found:', modalId, 'tagName:', modal.tagName, 'className:', modal.className);
    const editorKey = isEdit ? 'editEditor' : 'addEditor';
    console.log('Using editor key:', editorKey);

    // Always reinitialize to ensure fresh state
    if (window[editorKey]) {
      console.log('Cleaning up existing editor instance');
      delete window[editorKey];
    }

    console.log('Creating new BlogEditor instance for modal:', modalId);
    window[editorKey] = new BlogEditor(modal, isEdit);
    console.log('Editor initialized successfully:', editorKey);
    return window[editorKey];
  }
  console.log('Modal element not found:', modalId);
  return null;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Editors will be initialized when modals are opened
});

// Handle form submission - attach listener when DOM is ready
function setupAddBlogFormListener() {
  const form = document.getElementById('add-blog-form');
  if (!form) {
    console.error('add-blog-form not found!');
    return;
  }
  
  console.log('Setting up add blog form listener');
  
  // Remove any existing listeners by cloning
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  // Get the new form reference
  const freshForm = document.getElementById('add-blog-form');
  
  // Add onsubmit attribute as backup
  freshForm.setAttribute('onsubmit', 'event.preventDefault(); return false;');
  freshForm.setAttribute('action', 'javascript:void(0);');
  
  // Attach submit listener
  freshForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('Add blog form submitted - event caught!');
    
    // Security check: Only allow admin users to add blog posts
    if (!isAdmin()) {
      console.warn('Access denied - not admin');
      showErrorMessage('Access denied. Admin privileges required to add blog posts.');
      return false;
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    if (!submitBtn) {
      console.error('Submit button not found in form');
      return false;
    }
    
    console.log('Submit button found:', submitBtn);
    const originalText = submitBtn.textContent;
    
    try {
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      
      const formData = new FormData(this);
      const newPost = {
        title: formData.get('title'),
        category: formData.get('category'),
        date: formData.get('date'),
        image: formData.get('image') || './assets/images/blog-1.jpg',
        excerpt: formData.get('excerpt'),
        content: formData.get('content')
      };
      
      console.log('New post data:', newPost);
      
      // Validate required fields
      if (!newPost.title || !newPost.category || !newPost.date || !newPost.excerpt || !newPost.content) {
        throw new Error('Please fill in all required fields');
      }
      
      // Save to Firestore
      console.log('Saving to Firestore...');
      const savedPost = await saveBlogPostToFirestore(newPost);
      console.log('Saved post:', savedPost);
      
      if (!savedPost || !savedPost.id) {
        throw new Error('Failed to save post - no ID returned from Firestore');
      }
      
      // Add to local array
      blogPosts.unshift(savedPost);
      
      // Re-render blog posts (both regular view and admin dashboard)
      renderBlogPosts();
      if (isAdmin()) {
        renderAdminBlogPosts();
      }
      
      // Reload from Firestore to ensure we have the latest data (including server timestamp)
      // This ensures consistency, but the local update above provides immediate feedback
      loadBlogPostsFromFirestore().then(() => {
        renderBlogPosts();
        if (isAdmin()) {
          renderAdminBlogPosts();
        }
      }).catch(err => {
        console.warn('Failed to reload blog posts from Firestore:', err);
        // Continue anyway since we already updated locally
      });
      
      // Close modal
      closeAddBlogModal();
      
      // Show success message
      showSuccessMessage('Blog post created successfully!');
      
    } catch (error) {
      console.error('Error creating blog post:', error);
      console.error('Error stack:', error.stack);
      showErrorMessage(`Failed to create blog post: ${error.message || 'Please try again.'}`);
    } finally {
      // Reset button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
    
    return false;
  });
  
  console.log('Add blog form listener attached successfully');
}

// Make function globally accessible
window.setupAddBlogFormListener = setupAddBlogFormListener;

// Setup form listener when DOM is ready
if (addBlogForm) {
  setupAddBlogFormListener();
} else {
  // If form not found initially, try again when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('add-blog-form')) {
      setupAddBlogFormListener();
    }
  });
}

// Edit Blog Modal Elements
const editBlogModal = document.getElementById('edit-blog-modal');
const editBlogOverlay = document.getElementById('edit-blog-overlay');
const editBlogCloseBtn = document.getElementById('edit-blog-close-btn');
const cancelEditBlogBtn = document.getElementById('cancel-edit-blog-btn');
const editBlogForm = document.getElementById('edit-blog-form');
const deleteBlogBtn = document.getElementById('delete-blog-btn');
const editContentTextarea = document.getElementById('edit-blog-content');
const editLineNumbers = document.getElementById('edit-editor-line-numbers');
const editCharCount = document.getElementById('edit-char-count');
const editWordCount = document.getElementById('edit-word-count');

// Update line numbers for edit modal
function updateEditLineNumbers() {
  if (!editLineNumbers || !editContentTextarea) return;
  
  const lines = editContentTextarea.value.split('\n');
  const lineCount = lines.length || 1;
  
  let lineNumbersHTML = '';
  for (let i = 1; i <= lineCount; i++) {
    lineNumbersHTML += `${i}\n`;
  }
  
  editLineNumbers.textContent = lineNumbersHTML;
}

// Update character and word count for edit modal
function updateEditCounts() {
  if (!editCharCount || !editWordCount || !editContentTextarea) return;
  
  const text = editContentTextarea.value;
  const charCountValue = text.length;
  const wordCountValue = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  editCharCount.textContent = `${charCountValue.toLocaleString()} characters`;
  editWordCount.textContent = `${wordCountValue.toLocaleString()} words`;
}

// Sync scroll for edit modal
function syncEditScroll() {
  if (!editLineNumbers || !editContentTextarea) return;
  editLineNumbers.scrollTop = editContentTextarea.scrollTop;
}

// Initialize edit editor features
function initEditEditorFeatures() {
  if (!editContentTextarea) return;
  
  editContentTextarea.addEventListener('input', function() {
    updateEditLineNumbers();
    updateEditCounts();
  });
  
  editContentTextarea.addEventListener('scroll', syncEditScroll);
}

// Initialize edit editor on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditEditorFeatures);
} else {
  initEditEditorFeatures();
}

// Open edit modal with post data
function openEditBlogModal(postId) {
  // Security check: Only allow admin users to edit blog posts
  if (!isAdmin()) {
    showErrorMessage('Access denied. Admin privileges required to edit blog posts.');
    return;
  }

  // Initialize editor for edit blog modal
  initializeEditor('edit-blog-modal', true);
  
  // Additional check: Ensure we're in admin context (not public blog page)
  const adminBlogPostsList = document.getElementById('admin-blog-posts-list');
  if (!adminBlogPostsList) {
    console.warn('Edit blog modal can only be opened from admin dashboard');
    showErrorMessage('Blog management is only available in the admin dashboard.');
    return;
  }

  console.log('Opening edit modal for post:', postId);
  console.log('editBlogModal element:', editBlogModal);

  const post = blogPosts.find(p => p.id === postId);
  if (!post) {
    showErrorMessage('Blog post not found');
    return;
  }

  // Populate form fields
  document.getElementById('edit-blog-id').value = post.id;
  document.getElementById('edit-blog-title').value = post.title;
  document.getElementById('edit-blog-category').value = post.category;
  document.getElementById('edit-blog-date').value = post.date;
  document.getElementById('edit-blog-image').value = post.image || '';
  document.getElementById('edit-blog-excerpt').value = post.excerpt;
  
  // Set content using editor instance if available
  const editTextarea = document.getElementById('edit-blog-content');
  if (editTextarea) {
    editTextarea.value = post.content;
    
    // Update editor stats if editor is initialized
    if (window.editEditor) {
      setTimeout(() => {
        window.editEditor.updateStats();
        window.editEditor.updateLineNumbers();
      }, 100);
    }
  }

  // Open modal with forced visibility
  if (editBlogModal) {
    console.log('Adding active class to edit modal');
    editBlogModal.classList.add('active');
    editBlogModal.style.display = 'flex';
    editBlogModal.style.visibility = 'visible';
    editBlogModal.style.opacity = '1';
    editBlogModal.style.zIndex = '9999';
    editBlogModal.style.position = 'fixed';
    editBlogModal.style.top = '0';
    editBlogModal.style.left = '0';
    editBlogModal.style.width = '100%';
    editBlogModal.style.height = '100%';

    // Force overlay
    if (editBlogOverlay) {
      editBlogOverlay.style.opacity = '0.8';
      editBlogOverlay.style.visibility = 'visible';
      editBlogOverlay.style.zIndex = '9998';
    }

    console.log('Modal should be visible now');
  } else {
    console.error('editBlogModal not found!');
  }
}

// Close edit modal
function closeEditBlogModal() {
  if (editBlogModal) {
    editBlogModal.classList.remove('active');
    // Clear all inline styles set when opening the modal
    editBlogModal.style.display = '';
    editBlogModal.style.visibility = '';
    editBlogModal.style.opacity = '';
    editBlogModal.style.zIndex = '';
    editBlogModal.style.position = '';
    editBlogModal.style.top = '';
    editBlogModal.style.left = '';
    editBlogModal.style.width = '';
    editBlogModal.style.height = '';
  }
  
  // Clear overlay inline styles
  if (editBlogOverlay) {
    editBlogOverlay.style.opacity = '';
    editBlogOverlay.style.visibility = '';
    editBlogOverlay.style.zIndex = '';
  }
  
  // Reset form
  if (editBlogForm) {
    editBlogForm.reset();
  }
}

// Event listeners for edit modal
if (editBlogCloseBtn) {
  editBlogCloseBtn.addEventListener('click', closeEditBlogModal);
}
if (editBlogOverlay) {
  editBlogOverlay.addEventListener('click', closeEditBlogModal);
}
if (cancelEditBlogBtn) {
  cancelEditBlogBtn.addEventListener('click', closeEditBlogModal);
}

// Prevent clicks inside modal content from closing the modal
if (editBlogModal) {
  const editBlogContent = editBlogModal.querySelector('.add-blog-content');
  if (editBlogContent) {
    editBlogContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

// Handle edit form submission
if (editBlogForm) {
  editBlogForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Security check: Only allow admin users to update blog posts
    if (!currentUser || currentUser.role !== 'admin') {
      showErrorMessage('Access denied. Admin privileges required to update blog posts.');
      return;
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    const postId = document.getElementById('edit-blog-id').value;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
      
      const formData = new FormData(this);
      const contentEl = document.getElementById('edit-blog-content');
      const updatedPost = {
        title: formData.get('title'),
        category: formData.get('category'),
        date: formData.get('date'),
        image: formData.get('image') || './assets/images/blog-1.jpg',
        excerpt: formData.get('excerpt'),
        content: (contentEl && contentEl.value) || formData.get('content') || ''
      };
      
      if (!postId) {
        showErrorMessage('Post ID is missing. Please close and reopen the edit modal.');
        return;
      }
      
      // Update in Firestore
      await updateBlogPostInFirestore(postId, updatedPost);
      
      // Update local array
      const index = blogPosts.findIndex(p => p.id === postId);
      if (index !== -1) {
        blogPosts[index] = { ...updatedPost, id: postId };
      }
      
      // Re-render blog posts (both regular view and admin dashboard)
      renderBlogPosts();
      if (currentUser && currentUser.role === 'admin') {
        renderAdminBlogPosts();
      }
      
      // Close modal
      closeEditBlogModal();
      
      // Show success message
      showSuccessMessage('Blog post updated successfully!');
      
    } catch (error) {
      console.error('Error updating blog post:', error);
      showErrorMessage('Failed to update blog post. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Handle delete button
if (deleteBlogBtn) {
  deleteBlogBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    
    // Security check: Only allow admin users to delete blog posts
    if (!currentUser || currentUser.role !== 'admin') {
      showErrorMessage('Access denied. Admin privileges required to delete blog posts.');
      return;
    }
    
    const postId = document.getElementById('edit-blog-id').value;
    if (!postId) return;
    
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from Firestore
      await deleteBlogPostFromFirestore(postId);
      
      // Remove from local array
      blogPosts = blogPosts.filter(p => p.id !== postId);
      
      // Re-render blog posts (both regular view and admin dashboard)
      renderBlogPosts();
      if (currentUser && currentUser.role === 'admin') {
        renderAdminBlogPosts();
      }
      
      // Close modal
      closeEditBlogModal();
      
      // Show success message
      showSuccessMessage('Blog post deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting blog post:', error);
      showErrorMessage('Failed to delete blog post. Please try again.');
    }
  });
}

// Function to open add blog modal for admin dashboard
function openAddBlogModal() {
  // Security check: Only allow admin users to add blog posts
  if (!isAdmin()) {
    showErrorMessage('Access denied. Admin privileges required to add blog posts.');
    return;
  }

  // Initialize editor for add blog modal
  initializeEditor('add-blog-modal', false);
  
  // Additional check: Ensure we're in admin context (not public blog page)
  const adminBlogPostsList = document.getElementById('admin-blog-posts-list');
  if (!adminBlogPostsList) {
    console.warn('Add blog modal can only be opened from admin dashboard');
    showErrorMessage('Blog management is only available in the admin dashboard.');
    return;
  }

  console.log('Opening add blog modal');
  console.log('addBlogModal element:', addBlogModal);

  if (addBlogModal) {
    console.log('Adding active class to add modal');
    addBlogModal.classList.add('active');
    addBlogModal.style.display = 'flex';
    addBlogModal.style.visibility = 'visible';
    addBlogModal.style.opacity = '1';
    addBlogModal.style.zIndex = '9999';
    addBlogModal.style.position = 'fixed';
    addBlogModal.style.top = '0';
    addBlogModal.style.left = '0';
    addBlogModal.style.width = '100%';
    addBlogModal.style.height = '100%';

    // Force overlay
    if (addBlogOverlay) {
      addBlogOverlay.style.opacity = '0.8';
      addBlogOverlay.style.visibility = 'visible';
      addBlogOverlay.style.zIndex = '9998';
    }

    console.log('Add modal should be visible now');

    // Re-attach form listener in case form was reset
    setTimeout(() => {
      setupAddBlogFormListener();
    }, 100);

    // Clear form for new post
    const form = document.getElementById('add-blog-form');
    if (form) {
      form.reset();
    }

    // Set today's date as default
    const dateInput = document.getElementById('blog-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }

    // Focus on title input
    const titleInput = document.getElementById('blog-title');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }

    // Update character/word counts
    setTimeout(() => {
      if (typeof updateCounts === 'function') updateCounts();
    }, 100);
  }
}

// Attach edit/delete button listeners (only in admin context)
function attachEditDeleteListeners() {
  // Security check: Only attach listeners if admin is logged in
  if (!isAdmin()) {
    console.log('Skipping edit/delete listeners - admin not logged in');
    return;
  }
  
  // Only attach to buttons within admin dashboard
  const adminBlogPostsList = document.getElementById('admin-blog-posts-list');
  if (!adminBlogPostsList) {
    console.log('Admin blog posts list not found - skipping edit/delete listeners');
    return;
  }
  
  // Edit buttons (only within admin dashboard)
  const editButtons = adminBlogPostsList.querySelectorAll('[data-edit-blog]');
  editButtons.forEach(btn => {
    // Remove existing listeners to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const postId = this.getAttribute('data-edit-blog');
      openEditBlogModal(postId);
    });
  });
  
  // Delete buttons (only within admin dashboard)
  const deleteButtons = adminBlogPostsList.querySelectorAll('[data-delete-blog]');
  deleteButtons.forEach(btn => {
    // Remove existing listeners to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Security check: Only allow admin users to delete blog posts
      if (!isAdmin()) {
        showErrorMessage('Access denied. Admin privileges required to delete blog posts.');
        return;
      }
      
      const postId = this.getAttribute('data-delete-blog');
      
      if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
        return;
      }
      
      try {
        await deleteBlogPostFromFirestore(postId);
        blogPosts = blogPosts.filter(p => p.id !== postId);
        
        // Re-render blog posts (both regular view and admin dashboard)
        renderBlogPosts();
        if (currentUser && currentUser.role === 'admin') {
          renderAdminBlogPosts();
        }
        
        showSuccessMessage('Blog post deleted successfully!');
      } catch (error) {
        console.error('Error deleting blog post:', error);
        showErrorMessage('Failed to delete blog post. Please try again.');
      }
    });
  });
}

// Enhanced editor toolbar functionality for edit modal
const editEditorBtns = document.querySelectorAll('.editor-btn[data-editor="edit"]');
editEditorBtns.forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const command = this.getAttribute('data-command');
    
    if (command === 'preview') {
      alert('Preview feature coming soon!');
      return;
    }
    
    if (!editContentTextarea) return;
    
    editContentTextarea.focus();
    const start = editContentTextarea.selectionStart;
    const end = editContentTextarea.selectionEnd;
    const selectedText = editContentTextarea.value.substring(start, end);
    let newText = '';
    let cursorPos = start;
    
    switch(command) {
      case 'bold':
        newText = `<strong>${selectedText || 'bold text'}</strong>`;
        cursorPos = start + (selectedText ? newText.length : 7);
        break;
      case 'italic':
        newText = `<em>${selectedText || 'italic text'}</em>`;
        cursorPos = start + (selectedText ? newText.length : 8);
        break;
      case 'underline':
        newText = `<u>${selectedText || 'underlined text'}</u>`;
        cursorPos = start + (selectedText ? newText.length : 11);
        break;
      case 'insertHeading':
        newText = `<h2>${selectedText || 'Heading'}</h2>`;
        cursorPos = start + (selectedText ? newText.length : 4);
        break;
      case 'insertUnorderedList':
        newText = selectedText 
          ? `<ul>\n  <li>${selectedText}</li>\n</ul>`
          : `<ul>\n  <li>List item</li>\n</ul>`;
        cursorPos = start + newText.length - (selectedText ? 6 : 10);
        break;
      case 'insertOrderedList':
        newText = selectedText
          ? `<ol>\n  <li>${selectedText}</li>\n</ol>`
          : `<ol>\n  <li>List item</li>\n</ol>`;
        cursorPos = start + newText.length - (selectedText ? 6 : 10);
        break;
      case 'insertCode':
        if (selectedText.includes('\n')) {
          newText = `<pre><code>${selectedText || 'code block'}</code></pre>`;
        } else {
          newText = `<code>${selectedText || 'code'}</code>`;
        }
        cursorPos = start + (selectedText ? newText.length : (selectedText.includes('\n') ? 17 : 7));
        break;
      case 'insertQuote':
        newText = `<blockquote>\n  ${selectedText || 'Quote text'}\n</blockquote>`;
        cursorPos = start + (selectedText ? newText.length : 11);
        break;
      case 'insertLink':
        const url = prompt('Enter URL:', 'https://');
        if (url) {
          newText = `<a href="${url}" target="_blank">${selectedText || 'link text'}</a>`;
          cursorPos = start + (selectedText ? newText.length : 10);
        } else {
          return;
        }
        break;
    }
    
    if (newText) {
      editContentTextarea.value = editContentTextarea.value.substring(0, start) + newText + editContentTextarea.value.substring(end);
      updateEditLineNumbers();
      updateEditCounts();
      editContentTextarea.focus();
      editContentTextarea.setSelectionRange(cursorPos, cursorPos);
    }
  });
});

function showSuccessMessage(message) {
  // Create a temporary success message
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: hsl(45, 100%, 72%);
    color: hsl(0, 0%, 7%);
    padding: 15px 24px;
    border-radius: 12px;
    border: 2px solid hsl(45, 100%, 72%);
    box-shadow: 0 8px 24px hsla(45, 100%, 72%, 0.4), var(--shadow-2);
    z-index: 10000;
    font-weight: 600;
    font-size: 15px;
    min-width: 250px;
    text-align: center;
    opacity: 1;
    visibility: visible;
    display: block;
  `;
  
  document.body.appendChild(successDiv);
  
  // Remove after 3 seconds with fade out
  setTimeout(() => {
    successDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    successDiv.style.opacity = '0';
    successDiv.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      successDiv.remove();
    }, 300);
  }, 3000);
}

function showErrorMessage(message) {
  // Create a temporary error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--bittersweet-shimmer);
    color: var(--white-1);
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-1);
    z-index: 1000;
    font-weight: 500;
  `;
  
  document.body.appendChild(errorDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Initialize blog posts on page load
document.addEventListener('DOMContentLoaded', async function() {
  await loadBlogPostsFromFirestore();
  renderBlogPosts();
  updateAuthUI(); // Initialize authentication UI
});

// add click event to blog modal close button
blogModalCloseBtn.addEventListener("click", blogModalFunc);
blogOverlay.addEventListener("click", blogModalFunc);

// Blog management variables
let blogPosts = [];
let isLoading = false;

// Default blog posts (fallback if Firestore is not available)
const defaultBlogPosts = [
  {
    id: "default-1",
    title: "Design conferences in 2022",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-1.jpg",
    excerpt: "Veritatis et quasi architecto beatae vitae dicta sunt, explicabo.",
    content: `
      <p>Design conferences in 2022 brought together the brightest minds in the industry to discuss the latest trends, innovations, and challenges facing designers today. These events served as crucial platforms for knowledge sharing, networking, and professional development.</p>
      
      <h2>Key Themes and Insights</h2>
      
      <code> cout << "Hello World" << endl; </code>
      
      <p>Key themes that emerged throughout the year included the growing importance of inclusive design, the integration of artificial intelligence in design workflows, and the continued evolution of user experience design in an increasingly digital world.</p>
      
      <blockquote>
        "The future of design lies not in creating beautiful interfaces, but in crafting experiences that truly serve human needs while respecting our planet's resources."
      </blockquote>
      
      <h3>Notable Speakers and Case Studies</h3>
      
      <p>Notable speakers from leading tech companies and design agencies shared insights on how design thinking can drive business success, with case studies demonstrating the measurable impact of good design on user engagement and conversion rates.</p>
      
      <p>The conferences also highlighted the importance of sustainability in design, with many sessions dedicated to creating environmentally conscious products and services that meet user needs while minimizing ecological impact.</p>
      
      <h3>Looking Forward</h3>
      
      <p>As we move into 2023, the design community continues to evolve, with new tools, methodologies, and approaches emerging to help designers create more meaningful and impactful work.</p>
    `
  },
  {
    id: "default-2",
    title: "Best fonts every designer",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-2.jpg",
    excerpt: "Sed ut perspiciatis, nam libero tempore, cum soluta nobis est eligendi.",
    content: `
      <p>Typography is the foundation of good design, and choosing the right fonts can make or break a project. In this comprehensive guide, we explore the essential fonts that every designer should have in their toolkit.</p>
      
      <h2>Essential Font Categories</h2>
      
      <p>From timeless classics like <code>Helvetica</code> and <code>Times New Roman</code> to modern favorites like <code>Inter</code> and <code>Poppins</code>, each font brings its own personality and use cases to the table. Understanding when and how to use these fonts is crucial for creating effective designs.</p>
      
      <h3>Serif vs Sans-Serif</h3>
      
      <p>We'll also cover font pairing techniques, ensuring your typography choices work harmoniously together. The right combination can enhance readability, establish hierarchy, and create visual interest that guides users through your content.</p>
      
      <blockquote>
        "Good typography is invisible. Great typography is invisible and beautiful."
      </blockquote>
      
      <h3>Technical Implementation</h3>
      
      <p>Finally, we'll discuss the technical aspects of font implementation, including web font optimization, fallback strategies, and accessibility considerations that ensure your typography works across all devices and for all users.</p>
      
      <pre><code>@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}</code></pre>
    `
  },
  {
    id: "default-3",
    title: "Design digest #80",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-3.jpg",
    excerpt: "Excepteur sint occaecat cupidatat no proident, quis nostrum exercitationem ullam corporis suscipit.",
    content: `
      <p>Welcome to Design Digest #80, your weekly roundup of the most important design news, trends, and insights from around the web. This week, we're covering some exciting developments in the design world.</p>
      
      <p>Figma continues to push the boundaries of collaborative design with new features that make it easier for teams to work together in real-time. The latest updates include improved prototyping capabilities and enhanced developer handoff tools.</p>
      
      <p>In the world of web design, we're seeing a resurgence of bold, experimental layouts that challenge traditional grid systems. Designers are embracing asymmetry and unconventional spacing to create more dynamic and engaging user experiences.</p>
      
      <p>Color trends for 2024 are shifting toward more muted, sophisticated palettes that reflect our current cultural moment. Expect to see more earth tones, soft pastels, and carefully balanced neutrals in upcoming projects.</p>
    `
  },
  {
    id: "default-4",
    title: "UI interactions of the week",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-4.jpg",
    excerpt: "Enim ad minim veniam, consectetur adipiscing elit, quis nostrud exercitation ullamco laboris nisi.",
    content: `
      <p>This week's collection of UI interactions showcases some truly innovative approaches to user interface design. From micro-animations to gesture-based navigation, these examples demonstrate the power of thoughtful interaction design.</p>
      
      <p>One standout example features a card-based layout with smooth hover effects that provide subtle feedback to users. The animations are purposeful and enhance the user experience without being distracting or overwhelming.</p>
      
      <p>Another impressive interaction involves a progress indicator that uses both visual and haptic feedback to guide users through a multi-step process. The design makes complex workflows feel intuitive and manageable.</p>
      
      <p>We're also seeing interesting uses of scroll-triggered animations that reveal content in creative ways. These interactions add depth and engagement to what might otherwise be static content, keeping users interested and encouraging further exploration.</p>
    `
  },
  {
    id: "default-5",
    title: "The forgotten art of spacing",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-5.jpg",
    excerpt: "Maxime placeat, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    content: `
      <p>Spacing is one of the most fundamental yet often overlooked aspects of design. In our rush to add content and features, we sometimes forget that the space between elements is just as important as the elements themselves.</p>
      
      <p>Good spacing creates visual hierarchy, improves readability, and guides users through your interface. It's the invisible structure that makes good design feel effortless and professional. Without proper spacing, even the most beautiful designs can feel cluttered and difficult to navigate.</p>
      
      <p>There are several key principles to consider when working with spacing: consistency, rhythm, and breathing room. Consistent spacing creates a sense of order and predictability, while rhythmic spacing helps establish visual flow and movement.</p>
      
      <p>Don't be afraid of white space. It's not wasted space—it's a powerful design tool that can help highlight important content, create focus, and improve overall user experience. Sometimes, less really is more.</p>
    `
  },
  {
    id: "default-6",
    title: "Design digest #79",
    category: "Design",
    date: "2022-02-23",
    image: "./assets/images/blog-6.jpg",
    excerpt: "Optio cumque nihil impedit uo minus quod maxime placeat, velit esse cillum.",
    content: `
      <p>Design Digest #79 brings you the latest insights from the design community, featuring innovative projects, emerging trends, and expert opinions on the future of design.</p>
      
      <p>This week, we're excited to share some groundbreaking work in the field of sustainable design. Several companies are leading the way in creating products and services that prioritize environmental responsibility without compromising on aesthetics or functionality.</p>
      
      <p>In the realm of digital design, we're seeing interesting experiments with 3D elements and depth in web interfaces. These designs create more immersive experiences while maintaining usability and accessibility standards.</p>
      
      <p>The design community continues to push for more inclusive practices, with new tools and methodologies emerging to help designers create products that work for everyone, regardless of ability, background, or circumstance.</p>
    `
  }
];




// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () { elementToggleFunc(this); });

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);

  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {

  for (let i = 0; i < filterItems.length; i++) {

    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }

  }

}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {

  filterBtn[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;

  });

}



// contact form variables
const forms = document.querySelectorAll("[data-form]");

// Initialize all forms
forms.forEach((form, index) => {
  const formInputs = form.querySelectorAll("[data-form-input]");
  const formBtn = form.querySelector("[data-form-btn]");
  const formMessage = form.closest('article').querySelector('[id*="form-message"]') || document.getElementById("form-message");
  const formError = form.closest('article').querySelector('[id*="form-error"]') || document.getElementById("form-error");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}
  
  // Store form elements for later use
  form._formBtn = formBtn;
  form._formMessage = formMessage;
  form._formError = formError;
});

// Initialize EmailJS when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  if (window.EMAILJS_CONFIG && window.EMAILJS_CONFIG.publicKey) {
    emailjs.init(window.EMAILJS_CONFIG.publicKey);
  }
});

// Enhanced form submission with EmailJS for all forms
forms.forEach((form) => {
form.addEventListener("submit", async function(e) {
  e.preventDefault();
    
    const formBtn = form._formBtn;
    const formMessage = form._formMessage;
    const formError = form._formError;
    const isHireMeForm = form.closest('[data-page="hire-me"]') !== null;
  
  // Hide any existing messages
    if (formMessage) formMessage.style.display = 'none';
    if (formError) formError.style.display = 'none';
  
  // Show loading state
    showFormLoading(formBtn, isHireMeForm);
  
  try {
    // Check if EmailJS is available
    if (typeof emailjs === 'undefined') {
      throw new Error('EmailJS not loaded');
    }
    
    // Get form data
    const formData = new FormData(form);
    const fullname = formData.get('fullname');
    const email = formData.get('email');
    const message = formData.get('message');
      const projectType = formData.get('project-type') || 'Not specified';
      const budget = formData.get('budget') || 'Not specified';
    
    // Validate required fields
    if (!fullname || !email || !message) {
      throw new Error('Please fill in all required fields');
    }
    
    // Create email template parameters
    const templateParams = {
      fullname: fullname,
      email: email,
        message: isHireMeForm 
          ? `Project Type: ${projectType}\nBudget: ${budget}\n\nMessage:\n${message}`
          : message,
      timestamp: new Date().toISOString(),
      website: window.location.href,
      user_agent: navigator.userAgent,
        ip_address: 'N/A',
        to_email: 'Ruben.Jim.co@gmail.com',
        subject: isHireMeForm 
          ? 'New Hire Me Inquiry - Portfolio'
          : 'New Contact Form Submission - Portfolio'
    };
    
    console.log('Sending email with params:', templateParams);
    
    // Send email using EmailJS
    const response = await emailjs.send(
      window.EMAILJS_CONFIG.serviceId,
      window.EMAILJS_CONFIG.templateId,
      templateParams
    );
    
    console.log('EmailJS response:', response);

    if (response.status === 200) {
      // Save to Firestore after successful email send
      try {
        await saveMessageToFirestore({
          name: fullname,
          email: email,
          message: isHireMeForm
            ? `Project Type: ${projectType}\nBudget: ${budget}\n\nMessage:\n${message}`
            : message,
          subject: isHireMeForm
            ? 'New Hire Me Inquiry - Portfolio'
            : 'New Contact Form Submission - Portfolio',
          timestamp: window.serverTimestamp(),
          status: 'new',
          source: isHireMeForm ? 'hire-me' : 'contact'
        });
        console.log('Message saved to Firestore');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        // Don't fail the form submission if Firestore fails, just log it
      }

      showFormSuccess(formMessage, formError);
      form.reset();
      formBtn.setAttribute("disabled", "");
    } else {
      throw new Error('Email sending failed');
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
      showFormError(formMessage, formError);
  } finally {
      hideFormLoading(formBtn, isHireMeForm);
  }
  });
});

function showFormLoading(formBtn, isHireMeForm = false) {
  formBtn.classList.add('loading');
  formBtn.innerHTML = '<ion-icon name="hourglass"></ion-icon><span class="form-btn-text">Sending...</span>';
  formBtn.disabled = true;
}

function hideFormLoading(formBtn, isHireMeForm = false) {
  formBtn.classList.remove('loading');
  const buttonText = isHireMeForm ? 'Send Inquiry' : 'Send Message';
  formBtn.innerHTML = '<ion-icon name="paper-plane"></ion-icon><span class="form-btn-text">' + buttonText + '</span>';
  formBtn.disabled = false;
}

function showFormSuccess(formMessage, formError) {
  if (formMessage) formMessage.style.display = 'block';
  if (formError) formError.style.display = 'none';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideFormMessages(formMessage, formError);
  }, 5000);
}

function showFormError(formMessage, formError) {
  if (formError) formError.style.display = 'block';
  if (formMessage) formMessage.style.display = 'none';
  
  // Auto-hide after 7 seconds
  setTimeout(() => {
    hideFormMessages(formMessage, formError);
  }, 7000);
}

function hideFormMessages(formMessage, formError) {
  if (formMessage) formMessage.style.display = 'none';
  if (formError) formError.style.display = 'none';
}

// Save message to Firestore
async function saveMessageToFirestore(messageData) {
  try {
    // Access the global db instance from the admin module
    if (!window.db) {
      console.warn('Firestore not initialized, but message will still be sent via EmailJS');
      return;
    }

    const messagesRef = window.collection(window.db, 'messages');
    const docRef = await window.addDoc(messagesRef, messageData);
    console.log('Message saved to Firestore successfully with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error saving message to Firestore:', error);
    // Don't throw error - we still want the email to be sent even if Firestore fails
    return null;
  }
}

// Prefill contact form with service details
function prefillContactForm(serviceType, message) {
  // Wait for contact page to be active
  setTimeout(() => {
    const contactForm = document.querySelector('[data-page="contact"] [data-form]');
    if (contactForm) {
      const messageField = contactForm.querySelector('textarea[name="message"]');
      if (messageField) {
        const prefilledMessage = `Service: ${serviceType}\n\n${message}\n\nPlease provide more details about your project:`;
        messageField.value = prefilledMessage;
        messageField.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Track in Google Analytics if available
        if (typeof gtag !== 'undefined') {
          gtag('event', 'service_inquiry', {
            'service_type': serviceType,
            'event_category': 'engagement',
            'event_label': 'Service & Pricing Page'
          });
        }
      }
    }
  }, 300);
}

// Track events for Google Analytics
function trackEvent(eventName, eventLabel, eventValue) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      'event_category': 'engagement',
      'event_label': eventLabel,
      'value': eventValue
    });
  }
  
  // Also track project views
  if (eventName === 'project_view') {
    console.log('Project viewed:', eventLabel);
  }
}

// Track project clicks + modern project detail modal
document.addEventListener('DOMContentLoaded', function() {
  const projectLinks = document.querySelectorAll('.project-list .project-link');
  const modal = document.getElementById('project-detail-modal');
  const overlay = document.getElementById('project-detail-overlay');
  const closeBtn = document.getElementById('project-detail-close');
  const image = document.getElementById('project-detail-image');
  const category = document.getElementById('project-detail-category');
  const title = document.getElementById('project-detail-title');
  const description = document.getElementById('project-detail-description');
  const admin = document.getElementById('project-detail-admin');
  const liveBtn = document.getElementById('project-detail-live');
  const quoteBtn = document.getElementById('project-detail-quote');

  const PROJECT_DETAIL_CONTENT = {
    'Grippy Socks': {
      admin: 'The admin page is the operations center: review and prioritize new orders, update fulfillment status, and keep customer handoff clean without leaving the dashboard.',
      bestFor: ['Retail brands', 'E-commerce startups', 'Athletic apparel stores', 'Merchandise businesses']
    },
    'Barber Shop': {
      admin: 'The admin page is critical for daily operations: owners can control availability, confirm bookings, manage services, and respond to messages in one secure workflow.',
      bestFor: ['Barbershops', 'Salons', 'Studios with appointments', 'Service businesses with recurring clients']
    },
    'Pro Cleaning': {
      admin: 'The admin page keeps crews organized by centralizing job scheduling, assignment visibility, and status updates to reduce missed work and callbacks.',
      bestFor: ['Cleaning companies', 'Landscaping crews', 'Roof cleaning teams', 'Home service contractors']
    },
    'Rizo Pizzeria': {
      bestFor: ['Restaurants', 'Pizzerias', 'Takeout kitchens', 'Food delivery operators']
    },
    'Rosa\'s Beauty Salon': {
      bestFor: ['Beauty salons', 'Spas', 'Nail studios', 'Appointment-based personal care businesses']
    },
    'Central Valley Dealer': {
      bestFor: ['Car dealerships', 'Used auto lots', 'Vehicle brokers', 'Auto retail businesses']
    },
    'Shelton Springs Home Owners Association App': {
      bestFor: ['HOAs', 'Property management firms', 'Residential communities', 'Condo associations']
    },
    'HOA App Template': {
      bestFor: ['HOAs', 'Community managers', 'Property managers', 'Resident communication teams']
    },
    'Gadget Garage': {
      bestFor: ['Repair shops', 'Device resellers', 'Managed IT teams', 'Tech inventory-heavy businesses']
    }
  };

  function getDefaultBestFor(projectTitle, projectCategory) {
    const titleText = (projectTitle || '').toLowerCase();
    const categoryText = (projectCategory || '').toLowerCase();
    const combined = `${titleText} ${categoryText}`;
    if (combined.includes('real estate')) {
      return ['Real estate agencies', 'Property teams', 'Independent agents'];
    }
    if (combined.includes('weather')) {
      return ['Media projects', 'Travel-focused apps', 'Utility app audiences'];
    }
    if (combined.includes('blog')) {
      return ['Developers', 'Content creators', 'Technical writing workflows'];
    }
    if (combined.includes('application') || combined.includes('app')) {
      return ['Service businesses', 'Small-to-midsize businesses', 'Teams needing client-facing apps'];
    }
    return ['Small businesses', 'Growing businesses', 'Teams seeking digital operations workflows'];
  }

  function renderPortfolioBestForSections() {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card) => {
      const titleNode = card.querySelector('.project-title');
      const categoryNode = card.querySelector('.project-category');
      const detailsCard = card.querySelector('.project-details-card');
      const existingSection = card.querySelector('.project-fit-section');
      if (!titleNode || !detailsCard || existingSection) return;

      const titleText = titleNode.textContent.trim();
      const categoryText = categoryNode ? categoryNode.textContent.trim() : 'Project';
      const preset = PROJECT_DETAIL_CONTENT[titleText];
      const bestForItems = preset?.bestFor || getDefaultBestFor(titleText, categoryText);

      const section = document.createElement('section');
      section.className = 'project-fit-section';

      const heading = document.createElement('h5');
      heading.className = 'project-fit-title';
      heading.textContent = 'Best For';

      const list = document.createElement('ul');
      list.className = 'project-fit-list';
      bestForItems.forEach((businessType) => {
        const item = document.createElement('li');
        item.textContent = businessType;
        list.appendChild(item);
      });

      section.appendChild(heading);
      section.appendChild(list);

      const actions = detailsCard.querySelector('.project-actions');
      if (actions) {
        detailsCard.insertBefore(section, actions);
      } else {
        detailsCard.appendChild(section);
      }
    });
  }

  function closeProjectModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('project-modal-open');
  }

  function openProjectModal() {
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('project-modal-open');
  }

  function fillProjectModal(card, link) {
    const cardImage = card.querySelector('.project-img img');
    const cardTitle = card.querySelector('.project-title');
    const cardCategory = card.querySelector('.project-category');
    const cardDescription = card.querySelector('.project-description');
    const liveUrl = (link.getAttribute('href') || '').trim();
    const hasLiveUrl = liveUrl && liveUrl !== '#' && !liveUrl.startsWith('#');

    const titleText = cardTitle ? cardTitle.textContent.trim() : 'Project';
    const categoryText = cardCategory ? cardCategory.textContent.trim() : 'Project';
    const descriptionText = cardDescription ? cardDescription.textContent.trim() : '';
    const projectPreset = PROJECT_DETAIL_CONTENT[titleText];

    if (cardImage && image) {
      image.src = cardImage.getAttribute('src') || './assets/images/project-comingsoon.svg';
      image.alt = cardImage.getAttribute('alt') || 'Project preview';
    }
    if (title) title.textContent = titleText;
    if (category) category.textContent = categoryText;
    if (description) description.textContent = descriptionText;

    if (admin) {
      if (projectPreset?.admin) {
        admin.textContent = projectPreset.admin;
      } else {
        admin.textContent = 'Admin page focus: central management panel for operations, user actions, and business updates.';
      }
    }

    if (liveBtn) {
      if (hasLiveUrl) {
        liveBtn.href = liveUrl;
        liveBtn.style.display = 'inline-flex';
      } else {
        liveBtn.href = '#';
        liveBtn.style.display = 'none';
      }
    }
  }

  projectLinks.forEach((link) => {
    link.addEventListener('click', function(event) {
      const projectCard = this.closest('.project-card');
      const projectTitle = projectCard?.querySelector('.project-title')?.textContent || 'Unknown Project';
      trackEvent('project_click', projectTitle, 'Portfolio');

      if (!modal || !projectCard) return;
      event.preventDefault();
      fillProjectModal(projectCard, this);
      openProjectModal();
    });
  });

  renderPortfolioBestForSections();

  if (closeBtn) closeBtn.addEventListener('click', closeProjectModal);
  if (overlay) overlay.addEventListener('click', closeProjectModal);

  if (quoteBtn) {
    quoteBtn.addEventListener('click', function(event) {
      event.preventDefault();
      closeProjectModal();
      if (typeof switchToPage === 'function') {
        switchToPage('contact');
      }
    });
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeProjectModal();
    }
  });
});



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Valid path segments for rubenjimenez.dev/(tab)
var VALID_PAGES = ['about', 'home', 'resume', 'portfolio', 'blog', 'services-pricing', 'hire-me', 'contact', 'admin'];

function getPageFromPath() {
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '') || '';
  if (path === '') return null;
  if (path === 'home') return 'about';
  if (VALID_PAGES.indexOf(path) !== -1) return path;
  return null;
}

function getPageFromRedirectParam() {
  try {
    if (!window.location || !window.location.search) return null;
    var params = new URLSearchParams(window.location.search);
    var redirect = params.get('redirect') || params.get('p') || params.get('path') || null;
    if (!redirect) return null;
    var normalized = redirect.toString().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
    if (normalized === 'home') return 'about';
    if (VALID_PAGES.indexOf(normalized) !== -1) return normalized;
    return null;
  } catch (e) {
    return null;
  }
}

function updateUrlForPage(pageName, replace) {
  // Only update URL on http(s); file:// would produce invalid URLs like file:///.../index.html/portfolio
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return;
  }
  var url = '/' + pageName;
  if (replace) {
    window.history.replaceState({ page: pageName }, '', url);
  } else {
    window.history.pushState({ page: pageName }, '', url);
  }
}

// Function to switch to a specific page
function switchToPage(pageName, skipSave = false) {
  // First, remove active class from all pages and navigation links
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  for (let i = 0; i < navigationLinks.length; i++) {
    navigationLinks[i].classList.remove("active");
  }
  
  // Find and activate the matching page
  for (let i = 0; i < pages.length; i++) {
    if (pageName === pages[i].dataset.page) {
      pages[i].classList.add("active");
      window.scrollTo(0, 0);
      
      // Find the matching navigation link by comparing text content
      for (let j = 0; j < navigationLinks.length; j++) {
        const navText = navigationLinks[j].textContent.trim();
        // Match by converting both to lowercase and handling special cases
        let navPageName = navText.toLowerCase().trim();
        if (navPageName === "services & pricing" || (navPageName.includes("services") && navPageName.includes("pricing"))) {
          navPageName = "services-pricing";
        }
        if (navPageName === "hire me") {
          navPageName = "hire-me";
        }
        if (navPageName === "home") {
          navPageName = "about";
        }
        if (navPageName === pageName) {
          navigationLinks[j].classList.add("active");
        }
      }
      
      // Save to localStorage and update URL path (unless skipSave is true)
      if (!skipSave) {
        localStorage.setItem('activePage', pageName);
        updateUrlForPage(pageName, false);
      }

      // Re-initialize accordions if resume page is shown
      if (pages[i].dataset.page === "resume") {
        accordionInitialized = false; // Reset flag to allow re-initialization
        setTimeout(function() {
          initClassAccordion();
          initSubjectAccordion();
        }, 150); // Small delay to ensure DOM is ready
      }

      // Handle admin page authentication
      if (pages[i].dataset.page === "admin") {
        setTimeout(function() {
          if (currentUser && currentUser.role === 'admin') {
            if (typeof window.showDashboard === 'function') window.showDashboard();
            if (typeof window.fetchMessages === 'function') window.fetchMessages();
            if (typeof renderAdminBlogPosts === 'function') renderAdminBlogPosts();
          } else {
            if (typeof window.showLogin === 'function') window.showLogin();
          }
        }, 100); // Small delay to ensure DOM is ready
      }
      return; // Exit early when page is found
    }
  }
}

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    let pageName = this.textContent.trim().toLowerCase();
    // Handle special cases for page names
    if (pageName === "services & pricing" || (pageName.includes("services") && pageName.includes("pricing"))) {
      pageName = "services-pricing";
    } else if (pageName === "hire me") {
      pageName = "hire-me";
    } else if (pageName === "home") {
      pageName = "about";
    }
    switchToPage(pageName);
    // close all hamburger menus after navigation
    document.querySelectorAll("[data-navbar]").forEach(function (nav) {
      nav.classList.remove("open");
    });
  });
}

// Restore active page from URL path or localStorage on page load with loading animation
function restoreActivePage() {
  var loadingScreen = document.getElementById('loading-screen');
  var redirectPage = getPageFromRedirectParam();
  var pageFromPath = getPageFromPath();
  var savedPage = localStorage.getItem('activePage');
  // URL path wins (e.g. rubenjimenez.dev/portfolio), then localStorage, then about
  // Redirect param wins (from 404 fallback), then URL path, then localStorage, then about
  var targetPage = redirectPage || pageFromPath || savedPage || 'about';

  // Always show About first (don't save to localStorage during initial load)
  switchToPage('about', true);

  if (targetPage && targetPage !== 'about') {
    setTimeout(function() {
      switchToPage(targetPage, true);
      updateUrlForPage(targetPage, true);
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(function() { loadingScreen.style.display = 'none'; }, 500);
      }
    }, 700);
  } else {
    if (targetPage === 'about') {
      updateUrlForPage('about', true);
    }
    setTimeout(function() {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(function() { loadingScreen.style.display = 'none'; }, 500);
      }
    }, 700);
  }
}

// Back/forward: sync tab to URL path
window.addEventListener('popstate', function(e) {
  var page = (e.state && e.state.page) ? e.state.page : getPageFromPath();
  if (page) {
    switchToPage(page, true);
  }
});

// Restore page on load
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure loading screen is visible
  setTimeout(restoreActivePage, 50);
});

// Also restore if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(restoreActivePage, 50);
  });
} else {
  setTimeout(restoreActivePage, 50);
}



// high-level classes accordion functionality
let accordionInitialized = false;
let accordionDelegateHandler = null;
let accordionTouchHandler = null;

function initClassAccordion() {
  // Use event delegation on the high-level-classes container for reliability
  const highLevelClassesContainer = document.querySelector(".high-level-classes");
  
  if (!highLevelClassesContainer) {
    return; // Container not found
  }
  
  if (accordionInitialized) {
    return;
  }
  
  // Remove old delegation handler if exists
  if (accordionDelegateHandler) {
    highLevelClassesContainer.removeEventListener("click", accordionDelegateHandler);
  }
  if (accordionTouchHandler) {
    highLevelClassesContainer.removeEventListener("touchend", accordionTouchHandler);
  }
  
  // Create new delegation handler
  accordionDelegateHandler = function(e) {
    // Ignore clicks on subject toggle buttons
    const subjectToggle = e.target.closest("[data-subject-toggle]");
    if (subjectToggle) return;
    
    // Check if click is on a button or any element inside a button with data-class-toggle
    const button = e.target.closest("[data-class-toggle]");
    const classHeader = e.target.closest(".class-header");
    
    if (!button && !classHeader) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get the actual button element
    const targetButton = button || classHeader;
    const classItem = targetButton.closest(".class-item");
    
    if (!classItem) return;
    
    const isActive = classItem.classList.contains("active");
    
    // Close all other class items in the same subject section
    const subjectSection = classItem.closest(".class-subject-section");
    if (subjectSection) {
      subjectSection.querySelectorAll(".class-item").forEach(item => {
        if (item !== classItem) {
          item.classList.remove("active");
        }
      });
    }
    
    // Toggle current item
    if (isActive) {
      classItem.classList.remove("active");
    } else {
      classItem.classList.add("active");
    }
  };
  
  // Attach event listeners using delegation
  highLevelClassesContainer.addEventListener("click", accordionDelegateHandler, { passive: false });
  accordionTouchHandler = function(e) {
    accordionDelegateHandler(e);
    e.preventDefault();
  };
  highLevelClassesContainer.addEventListener("touchend", accordionTouchHandler, { passive: false });
  
  accordionInitialized = true;
}

// Subject accordion functionality (to collapse/expand entire subject sections)
let subjectAccordionInitialized = false;
let subjectAccordionDelegateHandler = null;
let subjectAccordionTouchHandler = null;

function initSubjectAccordion() {
  const highLevelClassesContainer = document.querySelector(".high-level-classes");
  
  if (!highLevelClassesContainer) {
    return;
  }
  
  if (subjectAccordionInitialized) {
    return;
  }
  
  // Remove old delegation handler if exists
  if (subjectAccordionDelegateHandler) {
    highLevelClassesContainer.removeEventListener("click", subjectAccordionDelegateHandler);
  }
  if (subjectAccordionTouchHandler) {
    highLevelClassesContainer.removeEventListener("touchend", subjectAccordionTouchHandler);
  }
  
  // Create new delegation handler
  subjectAccordionDelegateHandler = function(e) {
    // Ignore clicks on class items (handled by class accordion)
    const classItem = e.target.closest(".class-item");
    const classHeader = e.target.closest(".class-header");
    if (classItem || classHeader) return;
    
    // Check if click/touch is on a subject toggle button or any element inside it
    const subjectToggle = e.target.closest("[data-subject-toggle]");
    const subjectTitleBtn = e.target.closest(".subject-title-btn");
    
    if (!subjectToggle && !subjectTitleBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get the actual button element
    const targetButton = subjectToggle || subjectTitleBtn;
    const subjectSection = targetButton.closest(".class-subject-section");
    
    if (!subjectSection) return;
    
    const isActive = subjectSection.classList.contains("active");
    
    // Toggle active state
    if (isActive) {
      subjectSection.classList.remove("active");
    } else {
      subjectSection.classList.add("active");
    }
  };
  
  // Attach event listeners using delegation for both click and touch
  highLevelClassesContainer.addEventListener("click", subjectAccordionDelegateHandler, { passive: false });
  subjectAccordionTouchHandler = function(e) {
    subjectAccordionDelegateHandler(e);
    e.preventDefault();
  };
  highLevelClassesContainer.addEventListener("touchend", subjectAccordionTouchHandler, { passive: false });
  
  subjectAccordionInitialized = true;
}

// Initialize subject accordion on page load
document.addEventListener('DOMContentLoaded', function() {
  initSubjectAccordion();
  initTimelineToggle();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSubjectAccordion);
} else {
  initSubjectAccordion();
}

// Re-initialize subject accordion when navigating to resume page (integrated with existing navigation)
// This is handled in the switchToPage function below

// Timeline item expand/collapse toggle
function initTimelineToggle() {
  const timelineItems = document.querySelectorAll('.timeline-item-collapsible');
  timelineItems.forEach(function(item) {
    const btn = item.querySelector('[data-timeline-toggle]');
    if (!btn) return;
    // Avoid double-binding
    if (btn._tlBound) return;
    btn._tlBound = true;
    btn.addEventListener('click', function() {
      const isOpen = item.classList.contains('tl-open');
      item.classList.toggle('tl-open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });
  });
}

// Initialize accordion on page load
function initializeAccordionOnLoad() {
  // Wait a bit to ensure all DOM is ready, especially if page loads on Resume section
  setTimeout(function() {
    initClassAccordion();
    initSubjectAccordion();
    initTimelineToggle();
    // Also check if resume page is active on load and initialize
    const resumePage = document.querySelector('[data-page="resume"]');
    if (resumePage && resumePage.classList.contains('active')) {
      setTimeout(function() {
        initClassAccordion();
        initSubjectAccordion();
        initTimelineToggle();
      }, 100);
    }
  }, 200);
}

document.addEventListener('DOMContentLoaded', initializeAccordionOnLoad);

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccordionOnLoad);
} else {
  initializeAccordionOnLoad();
}

// Also initialize when window loads (as a fallback)
window.addEventListener('load', function() {
  setTimeout(function() {
    initClassAccordion();
    initSubjectAccordion();
    initTimelineToggle();
  }, 100);
});

// Firebase initialization and Admin functionality
(function() {
  'use strict';

  // Firebase variables (only Firestore, no Auth)
  let db = null;

  // DOM elements
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminLoginOverlay = document.getElementById('admin-login-overlay');
  const adminLoginCloseBtn = document.getElementById('admin-login-close-btn');
  const adminCancelLoginBtn = document.getElementById('admin-cancel-login-btn');
  const adminDashboardContent = document.getElementById('admin-dashboard-content');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginError = document.getElementById('admin-login-error');
  const messagesList = document.getElementById('messages-list');

  // Stats elements
  const totalMessagesEl = document.getElementById('total-messages');
  const newMessagesEl = document.getElementById('new-messages');
  const repliedMessagesEl = document.getElementById('replied-messages');

  // Initialize Firebase
  function initializeFirebase() {
    try {
      const firebaseConfig = window.FIREBASE_CONFIG;
      if (!firebaseConfig) {
        console.error('Firebase config not found');
        return false;
      }

      // Initialize Firebase (only Firestore, no Auth)
      const app = window.initializeApp(firebaseConfig);
      const db = window.getFirestore(app);
      
      // Make db available globally
      window.db = db;

      console.log('Firebase initialized successfully');
      console.log('Firestore database:', window.db);
      console.log('Note: Make sure firestore.rules is deployed to Firebase Console for proper permissions');

      // Test Firestore connectivity
      testFirestoreConnection();

      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return false;
    }
  }

  // Debug: Log window resolution for testing responsive issues
  function logWindowResolution() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(`🖥️ Window Resolution: ${width}px x ${height}px`);
    
    // Log which grid layout should be active
    if (width >= 1250) {
      console.log('📊 Grid Layout: 3 columns (large desktop)');
    } else if (width >= 768) {
      console.log('📊 Grid Layout: 2 columns (tablet/medium)');
    } else {
      console.log('📊 Grid Layout: 1 column (mobile)');
    }
  }

  // Log on load and resize
  window.addEventListener('load', logWindowResolution);
  window.addEventListener('resize', logWindowResolution);

  // Initialize Firebase when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Check if running locally (file:// protocol) which can cause CORS issues
    if (window.location.protocol === 'file:') {
      console.warn('Running locally with file:// protocol. Firestore may not work properly. Deploy to a web server for full functionality.');
    }

    if (initializeFirebase()) {
      setupAuthListeners();
      setupAdminEventListeners();
    } else {
      console.error('Firebase initialization failed');
    }
    
    // Initial resolution log
    logWindowResolution();
  });

  // Test Firestore connectivity
  function testFirestoreConnection() {
    if (!window.db) return;

    try {
      // Try to get a reference to test connectivity
      const testRef = window.collection(window.db, 'messages');
      console.log('Firestore connection test: collection reference created');
    } catch (error) {
      console.error('Firestore connection test failed:', error);
    }
  }

  // Setup authentication - check for existing session
  function setupAuthListeners() {
    // Check if user is already logged in (from sessionStorage)
    const savedUser = sessionStorage.getItem('adminUser');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        window.currentUser = currentUser;
        if (currentUser.role === 'admin') {
          showDashboard();
          if (typeof fetchMessages === 'function') fetchMessages();
          if (typeof renderAdminBlogPosts === 'function') renderAdminBlogPosts();
          if (typeof renderAdminSnippets === 'function') renderAdminSnippets();
          updateAuthUI();
          return;
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
        sessionStorage.removeItem('adminUser');
      }
    }
    
    // No valid session, show login
    showLogin();
  }

  // Setup admin event listeners
  function setupAdminEventListeners() {
    // Login button click
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', function() {
        if (adminLoginModal) {
          adminLoginModal.classList.add('active');
          adminLoginModal.style.display = 'flex';
        }
      });
    }

    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', handleAdminLogin);
    }


    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', handleLogout);
    }

    // Modal controls
    if (adminLoginCloseBtn) {
      adminLoginCloseBtn.addEventListener('click', closeAdminLoginModal);
    }

    if (adminCancelLoginBtn) {
      adminCancelLoginBtn.addEventListener('click', closeAdminLoginModal);
    }

    if (adminLoginOverlay) {
      adminLoginOverlay.addEventListener('click', closeAdminLoginModal);
    }

    // Admin blog management
    const adminAddBlogBtn = document.getElementById('admin-add-blog-btn');
    if (adminAddBlogBtn) {
      adminAddBlogBtn.addEventListener('click', function() {
        openAddBlogModal();
      });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', handleFilterClick);
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-messages');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('Manual refresh triggered');
        fetchMessages();
      });
    }

    // Test Firestore button
    const testBtn = document.getElementById('test-firestore');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        testFirestoreConnection();
      });
    }

    // Reply modal
    const replyModal = document.getElementById('reply-modal');
    const replyModalOverlay = document.getElementById('reply-modal-overlay');
    const replyModalClose = document.getElementById('reply-modal-close');
    const cancelReplyBtn = document.getElementById('cancel-reply');
    const replyForm = document.getElementById('reply-form');

    if (replyModalClose) {
      replyModalClose.addEventListener('click', hideReplyModal);
    }

    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', hideReplyModal);
    }

    if (replyModalOverlay) {
      replyModalOverlay.addEventListener('click', hideReplyModal);
    }

    if (replyForm) {
      replyForm.addEventListener('submit', handleReplySubmit);
    }
  }

  // Show login modal
  function showLogin() {
    if (adminLoginModal) {
      adminLoginModal.classList.add('active');
      adminLoginModal.style.display = 'flex';
    }
    if (adminDashboardContent) adminDashboardContent.style.display = 'none';
    // Show login button, hide logout button
    if (adminLoginBtn) adminLoginBtn.style.display = 'inline-flex';
    if (adminLogoutBtn) adminLogoutBtn.style.display = 'none';
  }

  // Show dashboard
  function showDashboard() {
    if (adminLoginModal) {
      adminLoginModal.classList.remove('active');
      adminLoginModal.style.display = 'none'; // Completely hide login modal
    }
    if (adminDashboardContent) adminDashboardContent.style.display = 'block';
    // Hide login button, show logout button
    if (adminLoginBtn) adminLoginBtn.style.display = 'none';
    if (adminLogoutBtn) adminLogoutBtn.style.display = 'inline-flex';
  }

  // Close login modal
  function closeAdminLoginModal() {
    if (adminLoginModal) adminLoginModal.classList.remove('active');
    if (adminLoginForm) adminLoginForm.reset();
    if (adminLoginError) adminLoginError.style.display = 'none';
  }

  // Handle admin login with username/password
  function handleAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    showAdminLoginError(''); // Clear previous errors

    // Simple credential check
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Login successful
      currentUser = {
        username: username,
        role: 'admin'
      };
      window.currentUser = currentUser;
      
      // Save to sessionStorage
      sessionStorage.setItem('adminUser', JSON.stringify(currentUser));
      
      // Update UI
      closeAdminLoginModal();
      showDashboard();
      if (typeof fetchMessages === 'function') fetchMessages();
      if (typeof renderAdminBlogPosts === 'function') renderAdminBlogPosts();
      if (typeof renderAdminSnippets === 'function') renderAdminSnippets();
      updateAuthUI();
    } else {
      // Invalid credentials
      showAdminLoginError('Invalid username or password.');
    }
  }

  // Removed Google Sign-In - using simple username/password auth instead
  // This function is no longer needed
  /*
  async function handleGoogleSignIn() {
    if (!auth) {
      showAdminLoginError('Authentication service not initialized');
      return;
    }

    try {
      showAdminLoginError(''); // Clear previous errors
      
      // Log origin for debugging
      const currentOrigin = window.location.origin;
      const currentHostname = window.location.hostname;
      console.log('=== Google Sign-In Attempt ===');
      console.log('Origin:', currentOrigin);
      console.log('Hostname:', currentHostname);
      console.log('Protocol:', window.location.protocol);
      console.log('Full URL:', window.location.href);
      console.log('============================');
      
      const provider = new window.GoogleAuthProvider();
      // Add custom parameters for better OAuth handling
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Try popup first, fallback to redirect if unauthorized-domain error
      try {
        const userCredential = await window.signInWithPopup(auth, provider);
        const firebaseUser = userCredential.user;
        
        // Check if user is admin
        if (!isAdminEmail(firebaseUser.email)) {
          // User is not admin, sign them out
          await window.signOut(auth);
          showAdminLoginError('Access denied. Admin privileges required.');
        } else {
          // Login successful - onAuthStateChanged will handle UI update
          closeAdminLoginModal();
        }
      } catch (popupError) {
        // If popup fails with unauthorized-domain, try redirect instead
        if (popupError.code === 'auth/unauthorized-domain') {
          console.warn('⚠️ Popup failed with unauthorized-domain');
          console.warn('Domain being checked:', window.location.hostname);
          console.warn('Full origin:', window.location.origin);
          console.warn('Attempting redirect method as fallback...');
          
          // Use redirect method as fallback
          try {
            await window.signInWithRedirect(auth, provider);
            // Note: User will be redirected away, so we don't need to handle the result here
            // The redirect result will be handled in setupAuthListeners()
            console.log('Redirect initiated - user will be redirected to Google');
            return;
          } catch (redirectError) {
            console.error('❌ Redirect also failed:', redirectError);
            // If redirect also fails, show detailed error
            throw redirectError;
          }
        }
        // Re-throw other errors
        throw popupError;
      }
    } catch (error) {
      console.error('=== Google Sign-In Error ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('Current origin:', window.location.origin);
      console.error('Current hostname:', window.location.hostname);
      console.error('Current protocol:', window.location.protocol);
      console.error('===========================');
      
      let errorMessage = 'Google Sign-In failed. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in popup was cancelled.';
      } else if (error.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        errorMessage = `Domain "${hostname}" not authorized. Using redirect method...`;
        
        console.error('🚨 UNAUTHORIZED DOMAIN ERROR');
        console.error('===========================');
        console.error('The domain being checked:', hostname);
        console.error('Full origin:', window.location.origin);
        console.error('');
        console.error('📋 STEPS TO FIX IN FIREBASE CONSOLE:');
        console.error('1. Go to: https://console.firebase.google.com/project/portfolio-2578e/authentication/settings');
        console.error('2. Scroll to "Authorized domains" section');
        console.error('3. Click "Add domain"');
        console.error('4. Add EXACTLY this (without quotes, without protocol):');
        console.error('   →', hostname);
        console.error('5. If you use www, also add:');
        console.error('   → www.' + hostname);
        console.error('6. Click "Add"');
        console.error('7. Wait 5-10 minutes for changes to propagate');
        console.error('8. Clear browser cache (Ctrl+Shift+Delete) and try again');
        console.error('');
        console.error('⚠️ CRITICAL: Domain format must be EXACT:');
        console.error('   ✅ Correct: rubenjimenez.dev');
        console.error('   ❌ Wrong: https://rubenjimenez.dev');
        console.error('   ❌ Wrong: rubenjimenez.dev/');
        console.error('   ❌ Wrong: www.rubenjimenez.dev (unless you actually use www)');
        console.error('');
        console.error('🔍 TROUBLESHOOTING STEPS:');
        console.error('1. Double-check Firebase Console → Authentication → Settings → Authorized domains');
        console.error('2. Make sure "rubenjimenez.dev" is listed (exact match, no spaces)');
        console.error('3. Wait 10-15 minutes after adding (propagation can be slow)');
        console.error('4. Try clearing browser cache completely');
        console.error('5. Try in an incognito/private window');
        console.error('6. Check if you have multiple Firebase projects - ensure you added it to the correct one');
        console.error('');
        console.error('🔄 Attempting redirect method as fallback...');
        
        // Try redirect as fallback
        try {
          const redirectProvider = new window.GoogleAuthProvider();
          redirectProvider.setCustomParameters({
            prompt: 'select_account'
          });
          await window.signInWithRedirect(auth, redirectProvider);
          // User will be redirected, so we don't show error message
          console.log('✅ Redirect initiated successfully');
          return;
        } catch (redirectError) {
          console.error('❌ Redirect also failed:', redirectError);
          errorMessage = `Domain authorization required. Please verify "${hostname}" is correctly added to Firebase authorized domains and wait 10-15 minutes for changes to propagate.`;
        }
      }
      
      showAdminLoginError(errorMessage);
    }
  }
  */

  // Handle logout
  function handleLogout() {
    // Clear session
    currentUser = null;
    window.currentUser = null;
    sessionStorage.removeItem('adminUser');
    
    // Update UI
    showLogin();
    updateAuthUI();
    if (typeof renderAdminSnippets === 'function') renderAdminSnippets();
    
    console.log('Admin logged out successfully');
  }

  // Show login error
  function showAdminLoginError(message) {
    if (adminLoginError) {
      adminLoginError.textContent = message;
      adminLoginError.style.display = message ? 'block' : 'none';
    }
  }

  // Handle filter button clicks
  function handleFilterClick(e) {
    const filter = e.target.dataset.filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    e.target.classList.add('active');

    // Filter messages
    filterMessages(filter);
  }

  // Filter messages based on status
  function filterMessages(filter) {
    const messageItems = document.querySelectorAll('.message-item');

    messageItems.forEach(item => {
      const status = item.dataset.status;

      switch (filter) {
        case 'all':
          item.style.display = 'list-item';
          break;
        case 'new':
          item.style.display = status === 'new' ? 'list-item' : 'none';
          break;
        case 'replied':
          item.style.display = status === 'replied' ? 'list-item' : 'none';
          break;
      }
    });
  }

  // ----------------------------
  // Business Documents (Proposals / Estimates / Invoices)
  // ----------------------------

  const BUSINESS_DOCS_STORAGE_KEY = 'businessDocs.v1';

  /**
   * @typedef {{ label: string, amount: number }} BusinessDocAddOnPriceOption
   * @typedef {{ name: string, description?: string, priceOptions: BusinessDocAddOnPriceOption[] }} BusinessDocAddOn
   */

  /**
   * @typedef {Object} BusinessDocument
   * @property {string} id
   * @property {'proposal'|'estimate'|'invoice'} type
   * @property {string} clientName
   * @property {string=} clientEmail
   * @property {number} total
   * @property {'draft'|'sent'|'accepted'|'paid'} status
   * @property {string=} dueDate
   * @property {string=} notes
   * @property {string=} proposedSiteUrl
   * @property {BusinessDocAddOn[]=} addOns
   * @property {string} createdAt
   * @property {string} updatedAt
   */

  /** @returns {BusinessDocument[]} */
  function loadBusinessDocs() {
    try {
      const raw = localStorage.getItem(BUSINESS_DOCS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn('Failed to load business docs from localStorage', e);
      return [];
    }
  }

  /** @param {BusinessDocument[]} docs */
  function saveBusinessDocs(docs) {
    try {
      localStorage.setItem(BUSINESS_DOCS_STORAGE_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to save business docs to localStorage', e);
    }
  }

  function generateBusinessDocId() {
    return 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatCurrency(amount) {
    if (isNaN(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }

  function formatDateDisplay(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // DOM references for Business Docs
  const businessDocForm = document.getElementById('business-doc-form');
  const businessDocIdInput = document.getElementById('business-doc-id');
  const businessDocTypeInput = document.getElementById('business-doc-type');
  const businessDocStatusInput = document.getElementById('business-doc-status');
  const businessDocClientNameInput = document.getElementById('business-doc-client-name');
  const businessDocClientEmailInput = document.getElementById('business-doc-client-email');
  const businessDocTotalInput = document.getElementById('business-doc-total');
  const businessDocDueDateInput = document.getElementById('business-doc-due-date');
  const businessDocNotesInput = document.getElementById('business-doc-notes');
  const businessDocProposedSiteInput = document.getElementById('business-doc-proposed-site');
  const businessDocProposedSiteWrap = document.getElementById('business-doc-proposed-site-wrap');
  const businessDocResetBtn = document.getElementById('business-doc-reset-btn');
  const businessDocsTbody = document.getElementById('business-docs-tbody');
  const businessDocFilterType = document.getElementById('business-doc-filter-type');
  const businessDocFilterStatus = document.getElementById('business-doc-filter-status');
  const businessDocModal = document.getElementById('business-doc-modal');
  const businessDocModalOverlay = document.getElementById('business-doc-modal-overlay');
  const businessDocModalClose = document.getElementById('business-doc-modal-close');
  const businessDocCreateBtn = document.getElementById('business-doc-create-btn');
  const businessDocAddonsList = document.getElementById('business-doc-addons-list');
  const businessDocAddAddonBtn = document.getElementById('business-doc-add-addon-btn');

  let businessDocs = loadBusinessDocs();

  function generateBusinessAddonDomId() {
    return 'addon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  /**
   * @param {BusinessDocAddOnPriceOption | null | undefined} opt
   */
  function createAddonPriceRowEl(opt) {
    var row = document.createElement('div');
    row.className = 'business-doc-addon-price-row';
    var fg2 = document.createElement('div');
    fg2.className = 'form-group';
    var l2 = document.createElement('label');
    l2.textContent = 'Amount';
    var i2 = document.createElement('input');
    i2.type = 'number';
    i2.className = 'business-doc-addon-price-amount';
    i2.min = '0';
    i2.step = '0.01';
    i2.placeholder = '0.00';
    i2.setAttribute('aria-label', 'Upgrade price amount');
    if (opt && typeof opt.amount === 'number' && !isNaN(opt.amount)) i2.value = String(opt.amount);
    fg2.appendChild(l2);
    fg2.appendChild(i2);
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'business-doc-addon-price-remove';
    rm.setAttribute('aria-label', 'Remove price option');
    rm.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
    rm.addEventListener('click', function () {
      var inner = row.parentElement;
      if (!inner) return;
      if (inner.querySelectorAll('.business-doc-addon-price-row').length <= 1) return;
      row.remove();
    });
    row.appendChild(fg2);
    row.appendChild(rm);
    return row;
  }

  /** @param {BusinessDocAddOn | {}} data */
  function createAddonCardEl(data) {
    data = data || {};
    var card = document.createElement('div');
    card.className = 'business-doc-addon-card';
    card.setAttribute('data-addon-id', generateBusinessAddonDomId());
    var header = document.createElement('div');
    header.className = 'business-doc-addon-card-header';
    var title = document.createElement('span');
    title.className = 'business-doc-addon-card-title';
    title.textContent = 'Upgrade option';
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'business-doc-addon-remove';
    removeBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon> Remove';
    removeBtn.addEventListener('click', function () {
      card.remove();
    });
    header.appendChild(title);
    header.appendChild(removeBtn);
    var nameFg = document.createElement('div');
    nameFg.className = 'business-doc-addon-field';
    var nl = document.createElement('label');
    nl.textContent = 'Name';
    var ni = document.createElement('input');
    ni.type = 'text';
    ni.className = 'business-doc-addon-name';
    ni.placeholder = 'Feature or module name';
    if (data.name) ni.value = data.name;
    nameFg.appendChild(nl);
    nameFg.appendChild(ni);
    var descFg = document.createElement('div');
    descFg.className = 'business-doc-addon-field';
    var dl = document.createElement('label');
    dl.textContent = 'Description (optional)';
    var ta = document.createElement('textarea');
    ta.className = 'business-doc-addon-desc';
    ta.rows = 3;
    ta.placeholder = 'One bullet per line (optional • or -). Example:\nFeature A\nFeature B';
    if (data.description) ta.value = data.description;
    descFg.appendChild(dl);
    descFg.appendChild(ta);
    var pricesWrap = document.createElement('div');
    pricesWrap.className = 'business-doc-addon-prices';
    var pl = document.createElement('span');
    pl.className = 'business-doc-addon-prices-label';
    pl.textContent = 'Price options';
    var pricesInner = document.createElement('div');
    pricesInner.className = 'business-doc-addon-prices-inner';
    var po =
      data.priceOptions && Array.isArray(data.priceOptions) && data.priceOptions.length > 0
        ? data.priceOptions
        : [{}];
    po.forEach(function (p) {
      pricesInner.appendChild(createAddonPriceRowEl(p));
    });
    var addPriceBtn = document.createElement('button');
    addPriceBtn.type = 'button';
    addPriceBtn.className = 'btn btn-secondary business-doc-add-price-option-btn';
    addPriceBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Add price option';
    addPriceBtn.addEventListener('click', function () {
      pricesInner.appendChild(createAddonPriceRowEl(null));
    });
    pricesWrap.appendChild(pl);
    pricesWrap.appendChild(pricesInner);
    pricesWrap.appendChild(addPriceBtn);
    card.appendChild(header);
    card.appendChild(nameFg);
    card.appendChild(descFg);
    card.appendChild(pricesWrap);
    return card;
  }

  function clearBusinessDocAddonsUI() {
    if (!businessDocAddonsList) return;
    businessDocAddonsList.innerHTML = '';
  }

  /**
   * @param {BusinessDocument} doc
   */
  function fillBusinessDocAddonsUI(doc) {
    clearBusinessDocAddonsUI();
    if (!businessDocAddonsList) return;
    var addOns = doc && doc.addOns && Array.isArray(doc.addOns) ? doc.addOns : [];
    addOns.forEach(function (a) {
      businessDocAddonsList.appendChild(createAddonCardEl(a));
    });
  }

  /**
   * @returns {BusinessDocAddOn[] | null} null = validation error
   */
  function collectBusinessDocAddonsFromForm() {
    if (!businessDocAddonsList) return [];
    var cards = businessDocAddonsList.querySelectorAll('.business-doc-addon-card');
    var result = [];
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var nameEl = card.querySelector('.business-doc-addon-name');
      var descEl = card.querySelector('.business-doc-addon-desc');
      var nameVal = nameEl ? nameEl.value.trim() : '';
      var descVal = descEl ? descEl.value.trim() : '';
      var priceRows = card.querySelectorAll('.business-doc-addon-price-row');
      var priceOptions = [];
      for (var j = 0; j < priceRows.length; j++) {
        var row = priceRows[j];
        var amtEl = row.querySelector('.business-doc-addon-price-amount');
        var numVal = amtEl ? parseFloat(amtEl.value) : NaN;
        var amtEmpty = !amtEl || amtEl.value === '' || String(amtEl.value).trim() === '';
        if (amtEmpty) continue;
        if (isNaN(numVal) || numVal < 0) {
          alert('Each price option needs a valid amount (0 or more).');
          return null;
        }
        priceOptions.push({ label: '', amount: numVal });
      }
      if (nameVal === '' && descVal === '' && priceOptions.length === 0) continue;
      if (nameVal === '') {
        alert('Upgrade option name is required when details or prices are provided.');
        return null;
      }
      if (priceOptions.length === 0) {
        alert('Upgrade option "' + nameVal + '" needs at least one price amount.');
        return null;
      }
      /** @type {BusinessDocAddOn} */
      var o = { name: nameVal, priceOptions: priceOptions };
      if (descVal) o.description = descVal;
      result.push(o);
    }
    return result;
  }

  function initBusinessDocAddonsControls() {
    if (businessDocAddAddonBtn && businessDocAddonsList) {
      businessDocAddAddonBtn.addEventListener('click', function () {
        businessDocAddonsList.appendChild(createAddonCardEl(null));
      });
    }
  }

  initBusinessDocAddonsControls();

  /**
   * @param {BusinessDocument} [doc] - If provided, fill form for edit; otherwise reset for create.
   */
  function updateBusinessDocProposedSiteVisibility() {
    if (!businessDocProposedSiteWrap || !businessDocTypeInput) return;
    businessDocProposedSiteWrap.style.display =
      businessDocTypeInput.value === 'proposal' ? 'block' : 'none';
  }

  function openBusinessDocModal(doc) {
    if (doc) {
      fillBusinessDocForm(doc);
    } else {
      resetBusinessDocForm();
    }
    updateBusinessDocProposedSiteVisibility();
    if (businessDocModal) {
      businessDocModal.style.display = 'flex';
      businessDocModal.classList.add('active');
    }
  }

  function closeBusinessDocModal() {
    if (businessDocModal) {
      businessDocModal.classList.remove('active');
      businessDocModal.style.display = 'none';
    }
  }

  function resetBusinessDocForm() {
    if (!businessDocForm) return;
    businessDocForm.reset();
    if (businessDocIdInput) businessDocIdInput.value = '';
    if (businessDocTypeInput) businessDocTypeInput.value = 'proposal';
    if (businessDocStatusInput) businessDocStatusInput.value = 'draft';
    if (businessDocProposedSiteInput) businessDocProposedSiteInput.value = '';
    clearBusinessDocAddonsUI();
    updateBusinessDocProposedSiteVisibility();
  }

  /**
   * @param {BusinessDocument} doc
   */
  function fillBusinessDocForm(doc) {
    if (!doc) return;
    if (businessDocIdInput) businessDocIdInput.value = doc.id;
    if (businessDocTypeInput) businessDocTypeInput.value = doc.type;
    if (businessDocStatusInput) businessDocStatusInput.value = doc.status;
    if (businessDocClientNameInput) businessDocClientNameInput.value = doc.clientName || '';
    if (businessDocClientEmailInput) businessDocClientEmailInput.value = doc.clientEmail || '';
    if (businessDocTotalInput) businessDocTotalInput.value = String(doc.total || '');
    if (businessDocDueDateInput) businessDocDueDateInput.value = doc.dueDate || '';
    if (businessDocNotesInput) businessDocNotesInput.value = doc.notes || '';
    if (businessDocProposedSiteInput) businessDocProposedSiteInput.value = doc.proposedSiteUrl || '';
    fillBusinessDocAddonsUI(doc);
    updateBusinessDocProposedSiteVisibility();
  }

  function getBusinessDocsFilters() {
    return {
      type: businessDocFilterType ? businessDocFilterType.value : 'all',
      status: businessDocFilterStatus ? businessDocFilterStatus.value : 'all'
    };
  }

  function applyBusinessDocsFilters(list) {
    const filters = getBusinessDocsFilters();
    return list.filter(function(doc) {
      if (filters.type !== 'all' && doc.type !== filters.type) return false;
      if (filters.status !== 'all' && doc.status !== filters.status) return false;
      return true;
    });
  }

  function renderBusinessDocs() {
    if (!businessDocsTbody) return;

    const filtered = applyBusinessDocsFilters(businessDocs.slice().sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }));

    if (filtered.length === 0) {
      businessDocsTbody.innerHTML =
        '<tr class="empty-row"><td colspan="6">' +
        '<div class="business-docs-empty-state">' +
        '<ion-icon name="document-outline" aria-hidden="true"></ion-icon>' +
        '<p class="business-docs-empty-message">No proposals, estimates, or invoices yet.</p>' +
        '<button type="button" class="btn btn-secondary" id="business-docs-empty-cta">Create Document</button>' +
        '</div></td></tr>';
      var cta = document.getElementById('business-docs-empty-cta');
      if (cta) cta.addEventListener('click', function() { openBusinessDocModal(); });
      return;
    }

    businessDocsTbody.innerHTML = '';

    filtered.forEach(function(doc) {
      var tr = document.createElement('tr');
      tr.className = 'business-doc-row';

      var typeTd = document.createElement('td');
      typeTd.setAttribute('data-label', 'Type');
      typeTd.innerHTML = '<span class="business-doc-badge business-doc-type-' + doc.type + '">' + doc.type.charAt(0).toUpperCase() + doc.type.slice(1) + '</span>';
      tr.appendChild(typeTd);

      var clientTd = document.createElement('td');
      clientTd.setAttribute('data-label', 'Client');
      clientTd.textContent = doc.clientName || '—';
      tr.appendChild(clientTd);

      var totalTd = document.createElement('td');
      totalTd.setAttribute('data-label', 'Total');
      totalTd.textContent = formatCurrency(doc.total || 0);
      tr.appendChild(totalTd);

      var statusTd = document.createElement('td');
      statusTd.setAttribute('data-label', 'Status');
      statusTd.innerHTML = '<span class="business-doc-badge business-doc-status-' + doc.status + '">' + doc.status.toUpperCase() + '</span>';
      tr.appendChild(statusTd);

      var createdTd = document.createElement('td');
      createdTd.setAttribute('data-label', 'Created');
      createdTd.textContent = formatDateDisplay(doc.createdAt);
      tr.appendChild(createdTd);

      var actionsTd = document.createElement('td');
      actionsTd.setAttribute('data-label', '');
      actionsTd.className = 'business-doc-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit';
      editBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon>';
      editBtn.addEventListener('click', function() {
        openBusinessDocModal(doc);
      });

      var pdfBtn = document.createElement('button');
      pdfBtn.type = 'button';
      pdfBtn.className = 'btn-icon';
      pdfBtn.title = 'Generate PDF';
      pdfBtn.innerHTML = '<ion-icon name="document-text-outline"></ion-icon>';
      pdfBtn.addEventListener('click', function() {
        generateBusinessDocPdf(doc);
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-icon';
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
      deleteBtn.addEventListener('click', function() {
        if (!confirm('Delete this document?')) return;
        businessDocs = businessDocs.filter(function(d) { return d.id !== doc.id; });
        saveBusinessDocs(businessDocs);
        renderBusinessDocs();
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(pdfBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(actionsTd);

      businessDocsTbody.appendChild(tr);
    });
  }

  if (businessDocForm) {
    businessDocForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var id = businessDocIdInput && businessDocIdInput.value ? businessDocIdInput.value : generateBusinessDocId();
      var nowIso = new Date().toISOString();

      var collectedAddOns = collectBusinessDocAddonsFromForm();
      if (collectedAddOns === null) return;

      var doc = /** @type {BusinessDocument} */ ({
        id: id,
        type: businessDocTypeInput ? businessDocTypeInput.value : 'proposal',
        clientName: businessDocClientNameInput ? businessDocClientNameInput.value.trim() : '',
        clientEmail: businessDocClientEmailInput ? businessDocClientEmailInput.value.trim() : '',
        total: businessDocTotalInput ? parseFloat(businessDocTotalInput.value || '0') : 0,
        status: businessDocStatusInput ? businessDocStatusInput.value : 'draft',
        dueDate: businessDocDueDateInput ? businessDocDueDateInput.value : '',
        notes: businessDocNotesInput ? businessDocNotesInput.value.trim() : '',
        createdAt: nowIso,
        updatedAt: nowIso
      });

      var isProposal = businessDocTypeInput && businessDocTypeInput.value === 'proposal';
      if (isProposal && businessDocProposedSiteInput && businessDocProposedSiteInput.value.trim()) {
        doc.proposedSiteUrl = businessDocProposedSiteInput.value.trim();
      } else {
        delete doc.proposedSiteUrl;
      }

      if (collectedAddOns.length > 0) {
        doc.addOns = collectedAddOns;
      } else {
        delete doc.addOns;
      }

      if (!doc.clientName || isNaN(doc.total)) {
        alert('Client name and total amount are required.');
        return;
      }

      var existingIndex = businessDocs.findIndex(function(d) { return d.id === doc.id; });
      if (existingIndex >= 0) {
        doc.createdAt = businessDocs[existingIndex].createdAt;
        businessDocs[existingIndex] = doc;
      } else {
        businessDocs.push(doc);
      }

      saveBusinessDocs(businessDocs);
      closeBusinessDocModal();
      resetBusinessDocForm();
      renderBusinessDocs();
    });
  }

  if (businessDocResetBtn) {
    businessDocResetBtn.addEventListener('click', function() {
      resetBusinessDocForm();
    });
  }

  if (businessDocFilterType) {
    businessDocFilterType.addEventListener('change', renderBusinessDocs);
  }

  if (businessDocFilterStatus) {
    businessDocFilterStatus.addEventListener('change', renderBusinessDocs);
  }

  if (businessDocTypeInput) {
    businessDocTypeInput.addEventListener('change', updateBusinessDocProposedSiteVisibility);
    updateBusinessDocProposedSiteVisibility();
  }

  if (businessDocCreateBtn) {
    businessDocCreateBtn.addEventListener('click', function() { openBusinessDocModal(); });
  }

  if (businessDocModalOverlay) {
    businessDocModalOverlay.addEventListener('click', closeBusinessDocModal);
  }

  if (businessDocModalClose) {
    businessDocModalClose.addEventListener('click', closeBusinessDocModal);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && businessDocModal && businessDocModal.classList.contains('active')) {
      closeBusinessDocModal();
    }
  });

  // Initial render on load
  renderBusinessDocs();

  // Business Documents section collapsible
  var businessDocsSection = document.getElementById('business-docs-section');
  var businessDocsToggle = document.getElementById('business-docs-toggle');
  var businessDocsContent = document.getElementById('business-docs-content');
  var BUSINESS_DOCS_OPEN_KEY = 'businessDocsSectionOpen';

  function setBusinessDocsOpen(open) {
    if (!businessDocsSection || !businessDocsToggle || !businessDocsContent) return;
    try {
      sessionStorage.setItem(BUSINESS_DOCS_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    businessDocsSection.classList.toggle('business-docs-open', !!open);
    businessDocsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (businessDocsToggle && businessDocsContent) {
    var stored = null;
    try {
      stored = sessionStorage.getItem(BUSINESS_DOCS_OPEN_KEY);
    } catch (e) {}
    var initiallyOpen = stored === '1';
    setBusinessDocsOpen(initiallyOpen);

    businessDocsToggle.addEventListener('click', function() {
      var isOpen = businessDocsSection.classList.contains('business-docs-open');
      setBusinessDocsOpen(!isOpen);
    });
  }

  // Contact Messages collapsible
  var messagesSection = document.getElementById('messages-section');
  var messagesToggle = document.getElementById('messages-toggle');
  var messagesContent = document.getElementById('messages-content');
  var MESSAGES_OPEN_KEY = 'adminMessagesSectionOpen';

  function setMessagesOpen(open) {
    if (!messagesSection || !messagesToggle || !messagesContent) return;
    try {
      sessionStorage.setItem(MESSAGES_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    messagesSection.classList.toggle('admin-collapsible-open', !!open);
    messagesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (messagesToggle && messagesContent) {
    var messagesStored = null;
    try {
      messagesStored = sessionStorage.getItem(MESSAGES_OPEN_KEY);
    } catch (e) {}
    setMessagesOpen(messagesStored === '1');
    messagesToggle.addEventListener('click', function() {
      var isOpen = messagesSection.classList.contains('admin-collapsible-open');
      setMessagesOpen(!isOpen);
    });
  }

  // Blog Management collapsible
  var blogSection = document.getElementById('blog-section');
  var blogToggle = document.getElementById('blog-toggle');
  var blogContent = document.getElementById('blog-content');
  var BLOG_OPEN_KEY = 'adminBlogSectionOpen';

  function setBlogOpen(open) {
    if (!blogSection || !blogToggle || !blogContent) return;
    try {
      sessionStorage.setItem(BLOG_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    blogSection.classList.toggle('admin-collapsible-open', !!open);
    blogToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (blogToggle && blogContent) {
    var blogStored = null;
    try {
      blogStored = sessionStorage.getItem(BLOG_OPEN_KEY);
    } catch (e) {}
    setBlogOpen(blogStored === '1');
    blogToggle.addEventListener('click', function() {
      var isOpen = blogSection.classList.contains('admin-collapsible-open');
      setBlogOpen(!isOpen);
    });
  }

  // Copy-Paste Snippets collapsible (blog tab)
  var snippetsSection = document.getElementById('snippets-section');
  var snippetsToggle = document.getElementById('snippets-toggle');
  var snippetsContent = document.getElementById('snippets-content');
  var SNIPPETS_OPEN_KEY = 'snippetsSectionOpen';

  function setSnippetsOpen(open) {
    if (!snippetsSection || !snippetsToggle || !snippetsContent) return;
    try {
      sessionStorage.setItem(SNIPPETS_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    snippetsSection.classList.toggle('admin-collapsible-open', !!open);
    snippetsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (snippetsToggle && snippetsContent) {
    var snippetsStored = null;
    try {
      snippetsStored = sessionStorage.getItem(SNIPPETS_OPEN_KEY);
    } catch (e) {}
    setSnippetsOpen(snippetsStored === '1');
    snippetsToggle.addEventListener('click', function() {
      var isOpen = snippetsSection.classList.contains('admin-collapsible-open');
      setSnippetsOpen(!isOpen);
    });
  }

  // ----------------------------
  // Business Docs PDF generation + sharing
  // ----------------------------

  function escapeHtml(str) {
    if (str == null || str === '') return '';
    var s = String(str);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Strips leading jot/bullet markers and numbered prefixes from one line. */
  function stripLeadingBulletMarker(line) {
    var s = String(line).replace(/^\s+/, '');
    s = s.replace(/^\d+[\.\)]\s+/, '');
    s = s.replace(/^[\u2022\u2023\u25E6\u25AA\u2043\u2219\u00B7\u25CF\-\*•·▪◦]\s*/, '');
    return s.trim();
  }

  /**
   * One list item per non-empty line (project scope & add-on descriptions are jot lists).
   * @param {string} listClass e.g. scope-feature-list | addon-desc-list
   */
  function linesToBulletListHtml(raw, listClass) {
    if (raw == null || String(raw).trim() === '') return '';
    var lines = String(raw).split(/\r?\n/);
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var item = stripLeadingBulletMarker(lines[i]);
      if (item) items.push(item);
    }
    if (!items.length) return '';
    var html = '<ul class="' + listClass + '">';
    for (var j = 0; j < items.length; j++) {
      html += '<li><span class="bullet-li-text">' + escapeHtml(items[j]) + '</span></li>';
    }
    html += '</ul>';
    return html;
  }

  function normalizeProposedSiteHref(url) {
    var s = (url || '').trim();
    if (!s) return '';
    if (/^mailto:/i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return 'https://' + s.replace(/^\/+/, '');
  }

  function formatProposedSitePdfHtml(url) {
    var s = (url || '').trim();
    if (!s) {
      return '<span class="feature-desc-muted">—</span>';
    }
    var href = escapeHtml(normalizeProposedSiteHref(s));
    var label = escapeHtml(s.replace(/^https?:\/\//i, ''));
    return '<a href="' + href + '" class="feature-desc-link">' + label + '</a>';
  }

  /**
   * Value Proposition / scope: framed block + kicker (matches modal “proposed scope”) + jot list.
   */
  function buildScopeBodyHtml(raw) {
    var wrapScope = function (listInner) {
      return (
        '<div class="scope-block">' +
        '<div class="scope-frame">' +
        '<div class="scope-frame-inner">' +
        '<p class="scope-kicker">Proposed scope &amp; deliverables</p>' +
        listInner +
        '</div></div></div>'
      );
    };
    var emptyHint =
      wrapScope(
        '<ul class="scope-feature-list">' +
          '<li><span class="bullet-li-text">Outline the project scope, deliverables, and key terms here.</span></li>' +
          '</ul>'
      );
    var inner = linesToBulletListHtml(raw, 'scope-feature-list');
    if (!inner) return emptyHint;
    return wrapScope(inner);
  }

  function buildAddonDescriptionPdfHtml(raw) {
    return linesToBulletListHtml(raw, 'addon-desc-list');
  }

  /**
   * Builds optional add-ons block for PDF/print HTML (empty string if none).
   * @param {BusinessDocument} doc
   */
  function buildAddOnsPdfHtml(doc) {
    if (!doc || !doc.addOns || !Array.isArray(doc.addOns) || doc.addOns.length === 0) return '';
    var parts = [];
    for (var i = 0; i < doc.addOns.length; i++) {
      var addon = doc.addOns[i];
      if (!addon || !addon.name) continue;
      var opts = addon.priceOptions && Array.isArray(addon.priceOptions) ? addon.priceOptions : [];
      if (!opts.length) continue;
      var nameEsc = escapeHtml(addon.name);
      var descInner = buildAddonDescriptionPdfHtml(addon.description || '');
      var tierRows = '';
      for (var j = 0; j < opts.length; j++) {
        var o = opts[j];
        var amt = typeof o.amount === 'number' && !isNaN(o.amount) ? o.amount : 0;
        tierRows +=
          '<div class="addon-tier-row addon-tier-only">' +
          '<div class="addon-tier-solo">' +
          '<span class="addon-tier-price">' +
          escapeHtml(formatCurrency(amt)) +
          '</span></div>' +
          '</div>';
      }
      parts.push(
        '<div class="addon-card">' +
          '<div class="addon-card-title">' +
          nameEsc +
          '</div>' +
          (descInner
            ? '<div class="addon-card-desc">' + descInner + '</div>'
            : '') +
          '<div class="addon-tier-rows">' +
          tierRows +
          '</div>' +
          '</div>'
      );
    }
    if (!parts.length) return '';
    return (
      '    <hr class="divider">\n' +
      '    <div class="section-title">Optional upgrades for the proposed site</div>\n' +
      '    <p class="addons-section-intro">Optional ways to enhance or extend the proposed build—your customer can choose any tier to upgrade beyond the base scope above.</p>\n' +
      '    <div class="addon-cards-grid">' +
      parts.join('') +
      '</div>\n'
    );
  }

  /**
   * HTML generator for business documents. Produces print-optimized HTML
   * Params: { customer, typeLabel, created, due, scope, totalFormatted, proposedSiteUrl, addOnsBlockHtml }
   */
  function getBusinessDocumentHtml(params) {
    var customer = params.customer || {};
    var C = {
      primary: '#eab308',
      dark: { bg: '#0f172a', card: '#0f141a', text: '#e8e6df', muted: '#94a3b8' }
    };
    var scopeHtml = buildScopeBodyHtml(params.scope);
    var clientName = escapeHtml((customer.name || 'Client').toString().toUpperCase());
    var typeLabel = escapeHtml(params.typeLabel || 'DOCUMENT');
    var created = escapeHtml(params.created || '');
    var due = escapeHtml(params.due || '—');
    var totalFormatted = escapeHtml(params.totalFormatted || '$0.00');
    var id = escapeHtml(params.id || '');
    var addOnsBlockHtml = params.addOnsBlockHtml || '';
    var proposedSiteCell = formatProposedSitePdfHtml(params.proposedSiteUrl || '');
    var proposedSiteFooterBtn = '';
    var proposalUrlTrim = (params.proposedSiteUrl || '').trim();
    if (proposalUrlTrim) {
      proposedSiteFooterBtn =
        '      <a href="' +
        escapeHtml(normalizeProposedSiteHref(proposalUrlTrim)) +
        '" class="btn-primary" target="_blank" rel="noopener noreferrer">View proposed site</a>\n';
    }

    var nextStepsHtml =
      '    <hr class="divider">\n' +
      '    <div class="section-title">Proposed next steps</div>\n' +
      '    <div class="next-steps-grid">\n' +
      '      <div class="next-step"><div class="next-step-num">01</div><div class="next-step-title">Review</div><span class="next-step-blurb">Confirm scope, investment, and deliverables match your goals.' +
      (proposalUrlTrim
        ? ' <a href="' +
          escapeHtml(normalizeProposedSiteHref(proposalUrlTrim)) +
          '" class="next-step-link" target="_blank" rel="noopener noreferrer">Open proposed site</a>.'
        : '') +
      '</span></div>\n' +
      '      <div class="next-step"><div class="next-step-num">02</div><div class="next-step-title">Discuss</div><span class="next-step-blurb">Questions or adjustments? Reach out before you approve.</span></div>\n' +
      '      <div class="next-step"><div class="next-step-num">03</div><div class="next-step-title">Approve</div><span class="next-step-blurb">Confirm acceptance in writing so kickoff, timeline, and next milestones can be scheduled.</span></div>\n' +
      '    </div>\n';

    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>' + typeLabel + ' — ' + (customer.name || '') + '</title>\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n  <style>\n' +
      '@page { size: A4; margin: 12mm; }\n' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { padding: 12px 16px !important; } .doc { page-break-inside: avoid; transform-origin: top center; } .header-tag { padding: 4px 10px; font-size: 10px; margin-bottom: 8px; } .doc-title { font-size: 20px; margin-bottom: 4px; } .doc-subtitle { font-size: 11px; margin-bottom: 12px; } .divider { margin: 10px 0 !important; } .section-title { font-size: 11px; margin-bottom: 6px; } .addons-section-intro { font-size: 10px; margin: -2px 0 10px 0; } .scope-frame { box-shadow: none !important; } .scope-frame-inner { padding: 10px 12px !important; } .scope-kicker { font-size: 12px !important; padding-bottom: 8px !important; margin-bottom: 10px !important; } .scope-feature-list li { font-size: 11px; padding: 6px 8px !important; margin-bottom: 4px !important; } .scope-feature-list li::before { width: 5px; height: 5px; margin-top: 5px; } .addon-cards-grid { gap: 10px; margin-top: 8px; } .addon-card { padding: 12px 14px; } .addon-card-title { font-size: 12px; } .addon-card-desc { font-size: 11px; margin-bottom: 8px; } .addon-desc-list li { font-size: 11px; padding: 5px 0; } .addon-tier-solo { padding: 10px 14px; } .addon-tier-price { font-size: 17px; } .features-grid { gap: 12px; margin-top: 6px; } .feature-title { font-size: 11px; margin-bottom: 2px; } .feature-desc { font-size: 11px; line-height: 1.35; } .pricing-grid { gap: 12px; margin-top: 6px; } .price-card { padding: 12px 16px; } .price-card-primary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-primary .price-amt { font-size: 28px; } .price-card-primary .price-meta { font-size: 11px; margin-top: 8px; line-height: 1.35; } .price-card-secondary .price-label { font-size: 10px; margin-bottom: 4px; } .price-card-secondary .price-meta { font-size: 11px; line-height: 1.4; } .why-list { margin-top: 6px; padding-left: 16px; font-size: 12px; line-height: 1.45; } .why-list li { margin-bottom: 4px; } .next-steps-grid { gap: 12px; margin-top: 6px; } .next-step-num { font-size: 16px; margin-bottom: 4px; padding-bottom: 4px; } .next-step-title { font-size: 12px; margin-bottom: 2px; } .next-step-link { font-size: 11px; } .footer-buttons { margin-top: 12px; gap: 8px; } .btn-primary, .btn-outline { padding: 8px 16px; font-size: 11px; } .footer-meta { margin-top: 12px; padding-top: 10px; font-size: 10px; } }\n' +
      '* { box-sizing: border-box; }\n' +
      'body { margin: 0; padding: 40px 32px; font-family: \'Inter\', sans-serif; background: ' + C.dark.bg + '; color: ' + C.dark.text + '; font-size: 14px; }\n' +
      '.doc { max-width: 800px; margin: 0 auto; }\n' +
      '.header-tag { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: ' + C.primary + '; color: ' + C.dark.bg + '; margin-bottom: 12px; }\n' +
      '.doc-title { font-family: \'Playfair Display\', serif; font-size: 24px; font-weight: 700; color: ' + C.primary + '; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1.2; margin: 0 0 8px 0; }\n' +
      '.doc-subtitle { font-size: 12px; color: ' + C.dark.muted + '; margin-bottom: 24px; }\n' +
      '.doc-subtitle a { color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.divider { border: none; height: 1px; background: rgba(255,255,255,0.1); margin: 24px 0; }\n' +
      '.section-title { font-family: \'Playfair Display\', serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: ' + C.primary + '; margin-bottom: 12px; }\n' +
      '.addons-section-intro { font-size: 12px; line-height: 1.55; color: ' + C.dark.muted + '; margin: -4px 0 14px 0; max-width: 58ch; }\n' +
      '.scope-block { margin-top: 4px; }\n' +
      '.scope-frame { padding: 2px; border-radius: 14px; background: linear-gradient(145deg, ' + C.primary + ' 0%, rgba(234,179,8,0.35) 18%, rgba(15,23,42,0.95) 55%, ' + C.dark.bg + ' 100%); box-shadow: 0 16px 48px rgba(0,0,0,0.4); }\n' +
      '.scope-frame-inner { border-radius: 12px; padding: 18px 20px 16px; background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid rgba(255,255,255,0.1); }\n' +
      '.scope-kicker { margin: 0 0 16px 0; padding: 0 0 12px 0; border-bottom: 1px solid rgba(234,179,8,0.45); font-family: \'Playfair Display\', serif; font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #facc15; text-shadow: 0 1px 2px rgba(0,0,0,0.45); }\n' +
      '.scope-feature-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.scope-feature-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.18); font-size: 13px; line-height: 1.5; font-weight: 500; color: ' + C.dark.text + '; }\n' +
      '.scope-feature-list li:last-child { margin-bottom: 0; }\n' +
      '.scope-feature-list li::before { content: \'\'; flex-shrink: 0; width: 7px; height: 7px; margin-top: 6px; border-radius: 2px; background: linear-gradient(145deg, ' + C.primary + ', #ca8a04); box-shadow: 0 0 0 1px rgba(234,179,8,0.4); }\n' +
      '.bullet-li-text { flex: 1; min-width: 0; letter-spacing: 0.01em; }\n' +
      '.addon-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 12px; }\n' +
      '.addon-desc-list { list-style: none; margin: 0; padding: 0; }\n' +
      '.addon-desc-list li { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; }\n' +
      '.addon-desc-list li:first-child { padding-top: 0; }\n' +
      '.addon-desc-list li:last-child { border-bottom: none; padding-bottom: 0; }\n' +
      '.addon-desc-list li::before { content: \'\'; flex-shrink: 0; width: 5px; height: 5px; margin-top: 6px; border-radius: 50%; background: ' + C.primary + '; opacity: 0.95; }\n' +
      '.addon-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 100%; }\n' +
      '.addon-card-title { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: ' + C.primary + '; margin-bottom: 10px; line-height: 1.35; }\n' +
      '.addon-card-desc { font-size: 12px; color: ' + C.dark.muted + '; line-height: 1.55; margin-bottom: 14px; }\n' +
      '.addon-tier-rows { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }\n' +
      '.addon-tier-row { border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.22) 100%); }\n' +
      '.addon-tier-row.addon-tier-only { display: block; }\n' +
      '.addon-tier-solo { display: flex; align-items: center; justify-content: center; padding: 14px 18px; border-left: 3px solid ' + C.primary + '; background: rgba(234,179,8,0.13); }\n' +
      '.addon-tier-price { font-family: \'Playfair Display\', serif; font-size: 22px; font-weight: 700; color: ' + C.primary + '; white-space: nowrap; line-height: 1; }\n' +
      '.features-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.feature-col { }\n' +
      '.feature-title { font-size: 12px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 6px; }\n' +
      '.feature-desc { font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; }\n' +
      '.feature-desc-muted { color: ' + C.dark.muted + '; }\n' +
      '.feature-desc-link { color: ' + C.primary + '; font-weight: 500; text-decoration: none; word-break: break-all; border-bottom: 1px solid rgba(234,179,8,0.45); }\n' +
      '.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.price-card { padding: 20px; border-radius: 12px; }\n' +
      '.price-card-primary { background: ' + C.primary + '; color: ' + C.dark.bg + '; }\n' +
      '.price-card-primary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(15,23,42,0.8); margin-bottom: 8px; }\n' +
      '.price-card-primary .price-amt { font-family: \'Playfair Display\', serif; font-size: 36px; font-weight: 700; line-height: 1; }\n' +
      '.price-card-primary .price-meta { font-size: 12px; margin-top: 12px; line-height: 1.5; color: rgba(15,23,42,0.85); }\n' +
      '.price-card-secondary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }\n' +
      '.price-card-secondary .price-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ' + C.primary + '; margin-bottom: 8px; }\n' +
      '.price-card-secondary .price-meta { font-size: 12px; color: ' + C.dark.muted + '; line-height: 1.6; }\n' +
      '.why-list { margin: 12px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: ' + C.dark.text + '; }\n' +
      '.why-list li { margin-bottom: 8px; }\n' +
      '.why-list li strong { color: ' + C.primary + '; }\n' +
      '.next-steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 12px; }\n' +
      '.next-step { }\n' +
      '.next-step-num { font-family: \'Playfair Display\', serif; font-size: 20px; font-weight: 700; color: ' + C.primary + '; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid ' + C.primary + '; }\n' +
      '.next-step-title { font-size: 13px; font-weight: 600; color: ' + C.dark.text + '; margin-bottom: 4px; }\n' +
      '.next-step-blurb { font-size: 12px; line-height: 1.5; color: ' + C.dark.muted + '; display: block; margin-top: 2px; }\n' +
      '.next-step-link { font-size: 12px; color: ' + C.primary + '; text-decoration: underline; }\n' +
      '.footer-buttons { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }\n' +
      '.btn-primary { display: inline-block; padding: 12px 24px; background: ' + C.primary + '; color: ' + C.dark.bg + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: none; }\n' +
      '.btn-outline { display: inline-block; padding: 12px 24px; background: transparent; color: ' + C.primary + '; font-family: \'Inter\', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-decoration: none; border-radius: 8px; border: 2px solid ' + C.primary + '; }\n' +
      '.footer-meta { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: ' + C.dark.muted + '; }\n' +
      'a { color: ' + C.primary + '; }\n' +
      '</style>\n</head>\n<body>\n  <div class="doc">\n' +
      '    <div class="header-tag">PROFESSIONAL SYSTEM</div>\n' +
      '    <h1 class="doc-title">' + clientName + ': ' + typeLabel + '</h1>\n' +
      '    <div class="doc-subtitle">Designed & Built by Ruben Jimenez | <a href="https://rubenjimenez.dev">rubenjimenez.dev</a></div>\n' +
      '    <hr class="divider">\n' +
      scopeHtml + '\n' +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Document Summary</div>\n' +
      '    <div class="features-grid">\n' +
      '      <div class="feature-col"><div class="feature-title">Client</div><div class="feature-desc">' + escapeHtml(customer.name || '—') + '</div></div>\n' +
      '      <div class="feature-col"><div class="feature-title">Due Date</div><div class="feature-desc">' + due + '</div></div>\n' +
      '      <div class="feature-col"><div class="feature-title">Proposed Site</div><div class="feature-desc">' + proposedSiteCell + '</div></div>\n' +
      '    </div>\n' +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Turn-Key Pricing</div>\n' +
      '    <div class="pricing-grid">\n' +
      '      <div class="price-card price-card-primary">\n' +
      '        <div class="price-label">' + typeLabel + ' Total</div>\n' +
      '        <div class="price-amt">' + totalFormatted + '</div>\n' +
      '        <div class="price-meta">Includes scope outlined above. Final terms confirmed on acceptance.</div>\n' +
      '      </div>\n' +
      '      <div class="price-card price-card-secondary">\n' +
      '        <div class="price-label">Created</div>\n' +
      '        <div class="price-meta">' + created + '</div>\n' +
      '      </div>\n' +
      '    </div>\n' +
      addOnsBlockHtml +
      '    <hr class="divider">\n' +
      '    <div class="section-title">Why This Document</div>\n' +
      '    <ul class="why-list">\n' +
      '      <li><strong>Scope:</strong> Deliverables and key terms clearly defined above.</li>\n' +
      '      <li><strong>Pricing:</strong> Total and details at a glance.</li>\n' +
      '      <li><strong>Ready:</strong> Professional format for review and acceptance.</li>\n' +
      '    </ul>\n' +
      nextStepsHtml +
      '    <hr class="divider">\n' +
      '    <div class="footer-buttons">\n' +
      proposedSiteFooterBtn +
      '      <a href="https://rubenjimenez.dev" class="btn-outline">View Portfolio</a>\n' +
      '      <a href="mailto:Ruben.Jim.co@gmail.com" class="btn-outline">Contact Me</a>\n' +
      '    </div>\n' +
      '    <div class="footer-meta">Generated from rubenjimenez.dev | ' + '</div>\n' +
      '  </div>\n</body>\n</html>';
  }

  function buildBusinessDocHtml(doc) {
    var created = formatDateDisplay(doc.createdAt);
    var due = doc.dueDate ? formatDateDisplay(doc.dueDate) : '—';
    var typeLabel =
      doc.type === 'proposal' ? 'PROPOSAL' :
      doc.type === 'estimate' ? 'ESTIMATE' :
      doc.type === 'invoice' ? 'INVOICE' : 'DOCUMENT';
    var items = [{ description: typeLabel + ' Total', amount: doc.total || 0 }];
    var addOnsBlockHtml = buildAddOnsPdfHtml(doc);
    return getBusinessDocumentHtml({
      customer: { name: doc.clientName || '', email: doc.clientEmail || '' },
      items: items,
      typeLabel: typeLabel,
      created: created,
      due: due,
      scope: doc.notes || '',
      proposedSiteUrl: doc.proposedSiteUrl || '',
      totalFormatted: formatCurrency(doc.total || 0),
      id: doc.id || '',
      addOnsBlockHtml: addOnsBlockHtml
    });
  }

  /**
   * Hook for native wrappers: override to integrate with iOS/Android share sheets.
   * Signature: (blob, filename, doc) => Promise<void> | void
   */
  if (typeof window.onPortfolioDocShare !== 'function') {
    window.onPortfolioDocShare = null;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  async function shareOrDownloadPdf(blob, filename, doc) {
    // Native wrapper hook wins
    if (typeof window.onPortfolioDocShare === 'function') {
      try {
        await window.onPortfolioDocShare(blob, filename, doc);
        return;
      } catch (e) {
        console.warn('onPortfolioDocShare hook failed, falling back to web share / download', e);
      }
    }

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const canWebShareFile =
      nav &&
      typeof nav.share === 'function' &&
      typeof nav.canShare === 'function' &&
      typeof window.File === 'function';

    if (canWebShareFile) {
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (nav.canShare({ files: [file] })) {
          const isIOS = /iPhone|iPad|iPod/.test(nav.userAgent || '');
          await nav.share(
            isIOS
              ? { files: [file] }
              : { files: [file], title: filename, text: 'Generated from rubenjimenez.dev' }
          );
          return;
        }
      } catch (err) {
        console.warn('Web Share API failed, falling back to download', err);
      }
    }

    // Fallback: download + allow manual print
    downloadBlob(blob, filename);
  }

  async function generateBusinessDocPdf(doc) {
    try {
      if (!doc) return;

      var html = buildBusinessDocHtml(doc);
      var win = window.open('', '_blank');
      if (!win) {
        alert('Unable to open document window. Please allow popups.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();

      // Wait for fonts/content to load, then trigger print (Save as PDF)
      setTimeout(function() {
        try {
          win.print();
        } catch (e) {
          console.warn('print failed', e);
        }
      }, 800);
    } catch (err) {
      console.error('generateBusinessDocPdf error:', err);
      alert('There was a problem generating the PDF. Please try again.');
    }
  }

  // Fetch messages from Firestore
  function fetchMessages() {
    console.log('fetchMessages called, db available:', !!window.db);
    if (!window.db) {
      console.warn('Firestore not initialized, cannot fetch messages');
      if (messagesList) {
        messagesList.innerHTML = `
          <div class="no-messages">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <p>Database not initialized. Check Firebase configuration.</p>
          </div>
        `;
      }
      return;
    }

    try {
      console.log('Setting up Firestore listener...');
      const messagesRef = window.collection(window.db, 'messages');
      const q = window.query(messagesRef, window.orderBy('timestamp', 'desc'));

      window.onSnapshot(q, (snapshot) => {
        console.log('Firestore snapshot received, docs count:', snapshot.size);
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Message doc:', doc.id, data);
          messages.push({ id: doc.id, ...data });
        });

        console.log('Total messages processed:', messages.length);
        renderMessages(messages);
        updateStats(messages);
      }, (error) => {
        console.error('Error fetching messages:', error);
        // Show error in UI
        if (messagesList) {
          messagesList.innerHTML = `
            <div class="no-messages">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <p>Error loading messages: ${error.message}</p>
              <p>Make sure firestore.rules is deployed to Firebase.</p>
            </div>
          `;
        }
      });
    } catch (error) {
      console.error('Error setting up message listener:', error);
      if (messagesList) {
        messagesList.innerHTML = `
          <div class="no-messages">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <p>Error: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  // Render messages in the dashboard
  function renderMessages(messages) {
    if (!messagesList) return;

    if (messages.length === 0) {
      messagesList.innerHTML = `
        <div class="no-messages">
          <ion-icon name="mail-outline"></ion-icon>
          <p>No messages yet</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = `<ul class="message-grid">${messages.map(message => `
      <li class="message-item" data-status="${message.status || 'new'}" data-id="${message.id}">
        <div class="message-card">
        <div class="message-card-icon">
          <ion-icon name="${message.status === 'replied' ? 'checkmark-done-outline' : 'mail-unread-outline'}"></ion-icon>
        </div>
        <div class="message-card-content">
          <div class="message-card-header">
            <h4 class="message-card-name">${message.name || 'Anonymous'}</h4>
            <span class="status-badge status-${message.status || 'new'}">${message.status || 'new'}</span>
          </div>
          <p class="message-card-email">${message.email || ''}</p>
          <p class="message-card-subject">${message.subject || 'No subject'}</p>
            <div class="message-card-text has-scrollbar">${(message.message || '').replace(/\n/g, '<br>')}</div>
            <div class="message-card-footer">
          <p class="message-card-date">${formatDate(message.timestamp)}</p>
          ${message.source ? `<p class="message-card-source">Source: ${message.source}</p>` : ''}
            </div>
          <div class="message-card-actions">
            <button class="reply-btn" data-id="${message.id}" title="Reply to this message">
              <ion-icon name="return-up-forward-outline"></ion-icon>
              <span>Reply</span>
            </button>
            ${message.status !== 'replied' ? `<button class="mark-replied-btn" data-id="${message.id}" title="Mark as replied">
              <ion-icon name="checkmark-outline"></ion-icon>
              <span>Mark Replied</span>
            </button>` : ''}
            </div>
          </div>
        </div>
      </li>
    `).join('')}</ul>`;

    // Add event listeners to buttons
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', handleReplyClick);
    });

    document.querySelectorAll('.mark-replied-btn').forEach(btn => {
      btn.addEventListener('click', handleMarkRepliedClick);
    });
  }

  // Update dashboard stats
  function updateStats(messages) {
    const total = messages.length;
    const newCount = messages.filter(m => (m.status || 'new') === 'new').length;
    const repliedCount = messages.filter(m => m.status === 'replied').length;

    if (totalMessagesEl) totalMessagesEl.textContent = total;
    if (newMessagesEl) newMessagesEl.textContent = newCount;
    if (repliedMessagesEl) repliedMessagesEl.textContent = repliedCount;
  }

  // Format timestamp for display
  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Handle reply button click
  function handleReplyClick(e) {
    const messageId = e.target.closest('.reply-btn').dataset.id;
    const messageCard = e.target.closest('.message-card');
    const messageData = {
      name: messageCard.querySelector('.message-card-name').textContent,
      email: messageCard.querySelector('.message-card-email').textContent,
      subject: messageCard.querySelector('.message-card-subject').textContent,
      message: messageCard.querySelector('.message-card-text').textContent,
      id: messageId
    };

    showReplyModal(messageData);
  }

  // Handle mark as replied button click
  async function handleMarkRepliedClick(e) {
    const messageId = e.target.dataset.id;

    try {
      const messageRef = window.doc(window.db, 'messages', messageId);
      await window.updateDoc(messageRef, {
        status: 'replied'
      });
    } catch (error) {
      console.error('Error marking message as replied:', error);
    }
  }

  // Show reply modal
  function showReplyModal(messageData) {
    const replyModal = document.getElementById('reply-modal');
    const replyFrom = document.getElementById('reply-from');
    const replySubject = document.getElementById('reply-subject');
    const replyMessage = document.getElementById('reply-message');
    const replySubjectInput = document.getElementById('reply-subject-input');
    const replyMessageInput = document.getElementById('reply-message-input');
    const replyForm = document.getElementById('reply-form');

    if (replyModal && replyFrom && replySubject && replyMessage && replySubjectInput && replyMessageInput) {
      // Populate original message data
      replyFrom.textContent = `${messageData.name} (${messageData.email})`;
      replySubject.textContent = messageData.subject;
      replyMessage.innerHTML = (messageData.message || '').replace(/\n/g, '<br>');

      // Set default reply subject
      replySubjectInput.value = `Re: ${messageData.subject}`;

      // Clear reply message
      replyMessageInput.value = '';

      // Store message data for reply
      replyForm._messageData = messageData;

      // Show modal using consistent class toggle
      replyModal.classList.add('active');

      // Focus on reply message
      setTimeout(() => replyMessageInput.focus(), 100);
    }
  }

  // Hide reply modal
  function hideReplyModal() {
    const replyModal = document.getElementById('reply-modal');
    if (replyModal) {
      replyModal.classList.remove('active');
    }
  }

  // Handle reply form submission
  async function handleReplySubmit(e) {
    e.preventDefault();

    const replyForm = e.target;
    const messageData = replyForm._messageData;
    const replySubject = document.getElementById('reply-subject-input').value;
    const replyMessage = document.getElementById('reply-message-input').value;

    if (!messageData || !replySubject || !replyMessage) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Send reply email via EmailJS
      await sendReplyEmail(messageData, replySubject, replyMessage);

      // Update message status in Firestore
      await updateMessageStatus(messageData.id, 'replied');

      // Hide modal
      hideReplyModal();

      // Show success message
      alert('Reply sent successfully!');

    } catch (error) {
      console.error('Reply error:', error);
      alert('Failed to send reply. Please try again.');
    }
  }

  // Send reply email via EmailJS
  async function sendReplyEmail(messageData, subject, message) {
    if (typeof emailjs === 'undefined') {
      throw new Error('EmailJS not loaded');
    }

    const templateParams = {
      to_email: messageData.email,
      to_name: messageData.name,
      from_name: 'Ruben Jimenez',
      subject: subject,
      message: message,
      original_subject: messageData.subject,
      original_message: messageData.message,
      timestamp: new Date().toISOString()
    };

    // Try to use a reply template first, fallback to contact template
    let templateId = 'reply_template';
    let response;

    try {
      response = await emailjs.send(
      window.EMAILJS_CONFIG.serviceId,
        templateId,
      templateParams
    );
    } catch (error) {
      // If reply template doesn't exist, try the contact template
      console.warn('Reply template not found, trying contact template:', error);
      templateId = window.EMAILJS_CONFIG.templateId;
      response = await emailjs.send(
        window.EMAILJS_CONFIG.serviceId,
        templateId,
        templateParams
      );
    }

    if (response.status !== 200) {
      throw new Error('Email sending failed');
    }

    return response;
  }

  // Update message status in Firestore
  async function updateMessageStatus(messageId, status) {
    if (!window.db) {
      throw new Error('Firestore not initialized');
    }

    const messageRef = window.doc(window.db, 'messages', messageId);
    await window.updateDoc(messageRef, {
      status: status,
      repliedAt: window.serverTimestamp()
    });
  }

  // Expose admin functions to global scope for switchToPage
  window.showLogin = showLogin;
  window.showDashboard = showDashboard;
  window.fetchMessages = fetchMessages;

})();

// ─────────────────────────────────────────────
// Main Business Ops Manual Modal
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const opsModal    = document.getElementById('ops-modal');
  const opsOverlay  = document.getElementById('ops-overlay');
  const opsCloseBtn = document.getElementById('ops-close-btn');
  const showOpsBtn  = document.getElementById('show-ops-manual');

  if (!opsModal || !showOpsBtn) {
    console.warn('Main Ops modal elements missing');
    return;
  }

  // Open main modal
  showOpsBtn.addEventListener('click', () => {
    opsModal.classList.add('active');
    document.body.classList.add('modal-open');
    opsModal.querySelector('button')?.focus();

    // IMPORTANT: Attach sub-modal listeners NOW (after main modal is visible)
    attachSubModalListeners();
  });

  // Close main modal
  const closeOpsModal = () => {
    opsModal.classList.remove('active');
    document.body.classList.remove('modal-open');
    showOpsBtn.focus();
  };

  opsCloseBtn.addEventListener('click', closeOpsModal);
  opsOverlay.addEventListener('click', closeOpsModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && opsModal.classList.contains('active')) {
      closeOpsModal();
    }
  });
});

// ─────────────────────────────────────────────
// Attach listeners for ALL sub-modals (only once)
// ─────────────────────────────────────────────
function attachSubModalListeners() {
  if (window.subModalsAttached) {
    console.log("Sub-modals already attached — skipping");
    return;
  }
  window.subModalsAttached = true;

  console.log("Attaching sub-modal listeners now...");

  const subModals = [
    { trigger: 'open-sales-routine',   modal: 'sales-modal',    close: 'sales-close-btn',    overlay: 'sales-overlay'    },
    { trigger: 'open-turnkey',         modal: 'turnkey-modal',   close: 'turnkey-close-btn',   overlay: 'turnkey-overlay'   },
    { trigger: 'open-endtoend',        modal: 'endtoend-modal',  close: 'endtoend-close-btn',  overlay: 'endtoend-overlay'  },
    { trigger: 'open-questions',       modal: 'questions-modal', close: 'questions-close-btn', overlay: 'questions-overlay' },
    { trigger: 'open-components',      modal: 'components-modal',close: 'components-close-btn',overlay: 'components-overlay'},
    { trigger: 'open-template-scripts', modal: 'template-scripts-modal', close: 'template-scripts-close-btn', overlay: 'template-scripts-overlay' }
  ];

  subModals.forEach(config => {
    const triggerEl = document.getElementById(config.trigger);
    const modalEl   = document.getElementById(config.modal);

    console.log(`Checking ${config.trigger}: trigger found = ${!!triggerEl}, modal found = ${!!modalEl}`);

    if (!triggerEl || !modalEl) {
      console.warn(`Cannot attach listener for ${config.modal} — missing element`);
      return;
    }

    triggerEl.addEventListener('click', () => {
      console.log(`Trigger clicked: ${config.trigger} → opening ${config.modal}`);
      modalEl.classList.add('active');
      document.body.classList.add('modal-open');
      modalEl.querySelector('button')?.focus();
    });

    const closeFn = () => {
      modalEl.classList.remove('active');
      document.body.classList.remove('modal-open');
      triggerEl.focus();
    };

    document.getElementById(config.close)?.addEventListener('click', closeFn);
    document.getElementById(config.overlay)?.addEventListener('click', closeFn);
  });

  // ESC handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll(
        '#sales-modal.active, #turnkey-modal.active, #endtoend-modal.active, #questions-modal.active, #components-modal.active, #template-scripts-modal.active'
      ).forEach(modal => modal.classList.remove('active'));
      document.body.classList.remove('modal-open');
    }
  });

  console.log("Sub-modal listeners attached successfully");
}

// Template Outreach Scripts modal: exclusive accordion (one open details at a time)
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('template-scripts-modal');
  if (!modal) return;
  const items = modal.querySelectorAll('details.template-script-accordion-item');
  items.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      items.forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });

  modal.querySelectorAll('.template-script-sub-accordion').forEach((container) => {
    const subItems = container.querySelectorAll('details.template-script-sub-item');
    subItems.forEach((d) => {
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        subItems.forEach((other) => {
          if (other !== d) other.open = false;
        });
      });
    });
  });
});

// ─────────────────────────────────────────────
// Dark/Light mode toggle
// ─────────────────────────────────────────────
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('portfolio-theme', next);
}

// ─────────────────────────────────────────────
// Command Palette (Cmd+K / Ctrl+K)
// ─────────────────────────────────────────────
(function initCommandPalette() {
  const overlay = document.getElementById('command-palette-overlay');
  const input = document.getElementById('command-palette-input');
  const listEl = document.getElementById('command-palette-list');

  if (!overlay || !input || !listEl) return;

  const COMMANDS = [
    { id: 'nav-home', label: 'Go to Home', icon: 'home-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('about'); } },
    { id: 'nav-resume', label: 'Go to Resume', icon: 'document-text-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('resume'); } },
    { id: 'nav-portfolio', label: 'Go to Portfolio', icon: 'grid-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('portfolio'); } },
    { id: 'nav-blog', label: 'Go to Blog', icon: 'newspaper-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('blog'); } },
    { id: 'nav-services', label: 'Go to Services & Pricing', icon: 'pricetag-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('services-pricing'); } },
    { id: 'nav-contact', label: 'Go to Contact', icon: 'mail-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('contact'); } },
    { id: 'copy-email', label: 'Copy email', icon: 'copy-outline', action: copyEmail },
    { id: 'toggle-theme', label: 'Toggle dark mode', icon: 'moon-outline', action: () => { if (typeof toggleTheme === 'function') toggleTheme(); } }
  ];

  const PROJECTS = [
    { title: 'Field Trades demo', url: 'https://roof-cleaning-template.expo.app' },
    { title: 'Rizo Pizzeria', url: 'https://rizo-pizza--by3ty9xb6t.expo.app' },
    { title: 'Shelton Springs HOA', url: 'https://hoa-demo--l91yvra8kn.expo.app' },
    { title: 'Gadget Garage', url: 'https://gadgetgarage.app' },
    { title: 'Rosa\'s Beauty Salon', url: 'https://rosasalon.expo.app' },
    { title: 'Zoom Realty', url: 'https://ruben-jim.github.io/ZoomRealty2025-main/' },
    { title: 'Estate', url: 'https://ruben-jim.github.io/Real-Estate/' },
    { title: 'Homeverse', url: 'https://ruben-jim.github.io/DEMO/' }
  ];

  function copyEmail() {
    const email = 'Ruben.Jim.co@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(() => showCmdFeedback('Copied!')).catch(() => fallbackCopy(email));
    } else {
      fallbackCopy(email);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCmdFeedback('Copied!');
    } catch (e) { showCmdFeedback('Failed to copy'); }
    document.body.removeChild(ta);
  }

  function showCmdFeedback(msg) {
    const prev = document.querySelector('.command-palette-feedback');
    if (prev) prev.remove();
    const el = document.createElement('div');
    el.className = 'command-palette-feedback';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--orange-yellow-crayola);color:var(--smoky-black);padding:8px 16px;border-radius:8px;font-size:14px;z-index:10001;animation:fade 0.3s ease;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function buildFullList() {
    const nav = COMMANDS.map(c => ({ ...c, type: 'command', search: c.label.toLowerCase() }));
    const projects = PROJECTS.map(p => ({
      id: 'proj-' + p.title.toLowerCase().replace(/\s+/g, '-'),
      label: 'Open ' + p.title,
      icon: 'open-outline',
      url: p.url,
      type: 'project',
      search: p.title.toLowerCase()
    }));
    return nav.concat(projects);
  }

  const fullList = buildFullList();
  let filtered = [];
  let selectedIndex = 0;

  function open() {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    input.value = '';
    input.focus();
    filter('');
    var h = document.getElementById('command-palette-hint');
    if (h) h.style.visibility = 'hidden';
  }

  function close() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    selectedIndex = 0;
    var h = document.getElementById('command-palette-hint');
    if (h) h.style.visibility = '';
  }

  function filter(q) {
    const ql = q.trim().toLowerCase();
    if (!ql) {
      filtered = fullList;
    } else {
      filtered = fullList.filter(item => item.search.includes(ql));
    }
    selectedIndex = 0;
    render();
  }

  function render() {
    listEl.innerHTML = '';
    filtered.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'command-palette-item' + (i === selectedIndex ? ' selected' : '');
      div.setAttribute('role', 'option');
      div.setAttribute('aria-selected', i === selectedIndex);
      div.innerHTML = '<ion-icon name="' + item.icon + '"></ion-icon><span>' + item.label + '</span>';
      div.addEventListener('click', () => execute(item));
      listEl.appendChild(div);
    });
  }

  function execute(item) {
    close();
    if (item.type === 'project' && item.url) {
      window.open(item.url, '_blank');
    } else if (item.action) {
      item.action();
    }
  }

  function moveSelection(delta) {
    if (filtered.length === 0) return;
    selectedIndex = (selectedIndex + delta + filtered.length) % filtered.length;
    render();
    const items = listEl.querySelectorAll('.command-palette-item');
    if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => filter(input.value));

  function handlePaletteKeydown(e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) execute(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  document.addEventListener('keydown', handlePaletteKeydown);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('active')) close();
      else open();
    }
  });

  overlay.querySelector('[data-cmd-close]').addEventListener('click', close);

  var hintBtn = document.getElementById('command-palette-hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', open);
    var kbd = hintBtn.querySelector('.command-palette-hint-kbd');
    if (kbd && !/Mac|iPhone|iPad/i.test(navigator.platform)) {
      kbd.textContent = 'Ctrl+K';
    }
  }
})();

// ─────────────────────────────────────────────
// GSAP Micro-interactions
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // Staggered Bento reveal on load
  var bentoCells = document.querySelectorAll('[data-bento-cell]');
  if (bentoCells.length) {
    gsap.from(bentoCells, {
      opacity: 0,
      y: 24,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out'
    });
  }

  // Magnetic effect on primary buttons
  var magneticTargets = document.querySelectorAll('.btn-hire-me, .btn-bento-cta, .bento-hire-btn');
  magneticTargets.forEach(function(btn) {
    btn.addEventListener('mouseenter', function() {
      gsap.to(btn, { scale: 1.02, duration: 0.2, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', function() {
      gsap.to(btn, { scale: 1, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    });
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var x = (e.clientX - rect.left - rect.width / 2) * 0.15;
      var y = (e.clientY - rect.top - rect.height / 2) * 0.15;
      gsap.to(btn, { x: x, y: y, duration: 0.3, ease: 'power2.out' });
    });
  });

  // Subtle hover scale on Bento cards
  var bentoCards = document.querySelectorAll('.bento-card');
  bentoCards.forEach(function(card) {
    card.addEventListener('mouseenter', function() {
      gsap.to(card, { scale: 1.02, duration: 0.25, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', function() {
      gsap.to(card, { scale: 1, duration: 0.3, ease: 'power2.out' });
    });
  });
});