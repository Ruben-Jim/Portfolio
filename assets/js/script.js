'use strict';

    
// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");
const sidebarInfo = document.querySelector(".sidebar-info");
const sidebarBtnLabel = sidebarBtn ? sidebarBtn.querySelector("span") : null;

function isSidebarCollapsibleViewport() {
  return window.matchMedia("(max-width: 1249px)").matches;
}

function setSidebarContactsExpanded(expanded) {
  if (!sidebar) return;
  sidebar.classList.toggle("active", expanded);
  if (sidebarBtnLabel) {
    sidebarBtnLabel.textContent = expanded ? "Hide Contacts" : "Show Contacts";
  }
  if (sidebarBtn) {
    sidebarBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    sidebarBtn.setAttribute("aria-label", expanded ? "Hide contacts" : "Show contacts");
  }
  if (sidebarInfo && isSidebarCollapsibleViewport()) {
    sidebarInfo.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
}

function toggleSidebarContacts() {
  if (!sidebar || !isSidebarCollapsibleViewport()) return;
  setSidebarContactsExpanded(!sidebar.classList.contains("active"));
}

function syncSidebarContactsUiForViewport() {
  if (!sidebar) return;
  if (!isSidebarCollapsibleViewport()) {
    sidebar.classList.remove("active");
    if (sidebarBtnLabel) sidebarBtnLabel.textContent = "Show Contacts";
    if (sidebarBtn) sidebarBtn.setAttribute("aria-expanded", "false");
    if (sidebarInfo) {
      sidebarInfo.removeAttribute("role");
      sidebarInfo.removeAttribute("tabindex");
      sidebarInfo.removeAttribute("aria-expanded");
    }
    return;
  }
  const expanded = sidebar.classList.contains("active");
  if (sidebarBtnLabel) {
    sidebarBtnLabel.textContent = expanded ? "Hide Contacts" : "Show Contacts";
  }
  if (sidebarBtn) sidebarBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
  if (sidebarInfo) {
    sidebarInfo.setAttribute("role", "button");
    sidebarInfo.setAttribute("tabindex", "0");
    sidebarInfo.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
}

if (sidebarBtn) {
  sidebarBtn.setAttribute("aria-expanded", "false");
  sidebarBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleSidebarContacts();
  });
}

if (sidebarInfo) {
  sidebarInfo.addEventListener("click", function () {
    if (!isSidebarCollapsibleViewport()) return;
    toggleSidebarContacts();
  });
  sidebarInfo.addEventListener("keydown", function (e) {
    if (!isSidebarCollapsibleViewport()) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSidebarContacts();
    }
  });
}

window.addEventListener("resize", syncSidebarContactsUiForViewport);
syncSidebarContactsUiForViewport();

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

// Close open navbar menus when clicking/tapping outside
document.addEventListener("click", function (e) {
  if (e.target.closest("[data-navbar]")) return;
  document.querySelectorAll("[data-navbar].open").forEach(function (nav) {
    nav.classList.remove("open");
  });
});

// testimonials modal — event delegation so dynamically loaded items work
const testimonialsList = document.querySelector(".testimonials-list");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

// modal variable
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalTime = document.querySelector("[data-modal-time]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  if (!modalContainer || !overlay) return;
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
};

if (testimonialsList && modalContainer && modalCloseBtn && overlay && modalImg && modalTitle && modalText) {
  testimonialsList.addEventListener("click", function (e) {
    const card = e.target.closest("[data-testimonials-item]");
    if (!card || !testimonialsList.contains(card)) return;
    const av = card.querySelector("[data-testimonials-avatar]");
    const ti = card.querySelector("[data-testimonials-title]");
    const tx = card.querySelector("[data-testimonials-text]");
    if (av) {
      modalImg.src = av.src;
      modalImg.alt = av.alt || "";
    }
    if (ti) modalTitle.innerHTML = ti.innerHTML;
    if (modalTime) {
      var iso = card.getAttribute("data-created-iso");
      var lbl = card.getAttribute("data-created-label");
      if (iso || lbl) {
        if (iso) modalTime.setAttribute("datetime", iso);
        else modalTime.removeAttribute("datetime");
        modalTime.textContent = lbl || "";
        modalTime.hidden = false;
      } else {
        modalTime.removeAttribute("datetime");
        modalTime.textContent = "";
        modalTime.hidden = true;
      }
    }
    if (tx) modalText.innerHTML = tx.innerHTML;
    testimonialsModalFunc();
  });

  modalCloseBtn.addEventListener("click", testimonialsModalFunc);
  overlay.addEventListener("click", testimonialsModalFunc);
}





// blog modal variables
let blogItems = document.querySelectorAll("[data-blog-item]");
const blogModalContainer = document.querySelector("[data-blog-modal-container]");
const blogModalCloseBtn = document.querySelector("[data-blog-modal-close-btn]");
const blogOverlay = document.querySelector("[data-blog-overlay]");


// Global password gate for private blog posts (UI-only, casual security)
const PRIVATE_POST_PASSWORD = 'private123';

/** Set after local admin login and/or Firebase silent sign-in. */
let currentUser = null;

const ADMIN_SESSION_KEY = 'adminUser';

function isAdminEmail(email) {
  if (!email) return false;
  const list = window.ADMIN_ALLOWLIST_EMAILS;
  if (!Array.isArray(list)) return false;
  const normalized = String(email).trim().toLowerCase();
  return list.some(function (e) {
    return String(e).trim().toLowerCase() === normalized;
  });
}

window.isAdminEmail = isAdminEmail;

function isAdminSession() {
  try {
    const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!saved) return false;
    const user = JSON.parse(saved);
    return !!(user && user.role === 'admin');
  } catch (err) {
    return false;
  }
}

/** Firebase ID token for admin-only Cloud Function calls (requires Firebase admin sign-in). */
async function getAdminIdToken() {
  if (!isAdminSession()) {
    throw new Error('Admin sign-in required.');
  }
  if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
    throw new Error(
      'Firebase admin sign-in is disabled. Admin API calls (e.g. testimonial invite, reply email) are unavailable.'
    );
  }
  if (!isAdminEmail(window.firebaseAuth.currentUser.email)) {
    throw new Error('Firebase admin session not allowlisted.');
  }
  return window.firebaseAuth.currentUser.getIdToken();
}

window.getAdminIdToken = getAdminIdToken;

/** Resolves when local admin session exists (optional timeout ms). */
function waitForAdminAuth(timeoutMs) {
  if (isAdminSession()) {
    return Promise.resolve(currentUser || { role: 'admin' });
  }
  const ms = typeof timeoutMs === 'number' ? timeoutMs : 15000;
  return new Promise(function (resolve, reject) {
    const timer = window.setTimeout(function () {
      reject(new Error('Admin sign-in timed out'));
    }, ms);
    const check = window.setInterval(function () {
      if (isAdminSession()) {
        window.clearTimeout(timer);
        window.clearInterval(check);
        resolve(currentUser || { role: 'admin' });
      }
    }, 200);
  });
}

window.waitForAdminAuth = waitForAdminAuth;

// Authentication state management
function updateAuthUI() {
  // Re-render blog posts to show/hide edit/delete buttons
  if (typeof renderBlogPosts === 'function') {
    renderBlogPosts();
  }
  // Also update admin dashboard if user is admin
  if (isAdmin()) {
    renderAdminBlogPosts();
    if (typeof renderAdminPortfolioProjects === 'function') {
      renderAdminPortfolioProjects();
    }
    if (typeof setupPortfolioAdminControls === 'function') {
      setupPortfolioAdminControls();
    }
    if (typeof syncAdminPortfolioLocalBanner === 'function') {
      syncAdminPortfolioLocalBanner();
    }
  }
}

// Helper: local admin session (admin / admin123 gate)
function isAdmin() {
  return isAdminSession();
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
function toIsoDateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function slugifyPostTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeBlogContentHtml(raw) {
  const text = String(raw || '').trim();
  // Keep author flexibility but strip script tags and inline handlers.
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function normalizeBlogPostRecord(input, id) {
  const rec = input || {};
  const tagsArray = Array.isArray(rec.tags)
    ? rec.tags
    : String(rec.tags || '')
        .split(',')
        .map(function (t) { return t.trim(); })
        .filter(Boolean);
  const status = String(rec.status || 'published').toLowerCase();
  return {
    id: id || rec.id || '',
    title: String(rec.title || ''),
    category: String(rec.category || 'General'),
    date: String(rec.date || toIsoDateOnly(Date.now())),
    image: String(rec.image || './assets/images/blog-1.jpg'),
    imageAlt: String(rec.imageAlt || rec.title || ''),
    imageCaption: String(rec.imageCaption || ''),
    excerpt: String(rec.excerpt || ''),
    content: sanitizeBlogContentHtml(rec.content),
    slug: String(rec.slug || slugifyPostTitle(rec.title)),
    seoTitle: String(rec.seoTitle || rec.title || ''),
    seoDescription: String(rec.seoDescription || rec.excerpt || ''),
    authorName: String(rec.authorName || 'Ruben Jimenez'),
    readTimeMinutes: Number(rec.readTimeMinutes) > 0 ? Number(rec.readTimeMinutes) : '',
    tags: tagsArray.slice(0, 20),
    status: ['draft', 'published', 'private'].indexOf(status) >= 0 ? status : 'published',
    publishAt: String(rec.publishAt || ''),
    createdAt: rec.createdAt || null,
    updatedAt: rec.updatedAt || null
  };
}

function isBlogPostPublished(post) {
  if (!post) return false;
  if (String(post.status || '').toLowerCase() !== 'published') return false;
  if (post.publishAt) {
    const publishAtMs = new Date(post.publishAt).getTime();
    if (!Number.isNaN(publishAtMs) && publishAtMs > Date.now()) return false;
  }
  return true;
}

// Returns true for both published posts and private posts (both visible in the public list)
function isBlogPostVisible(post) {
  if (!post) return false;
  const status = String(post.status || '').toLowerCase();
  if (status === 'private') return true;
  return isBlogPostPublished(post);
}

// Opens the blog reader modal with the given post's content
function openBlogReader(post) {
  blogModalImage.src = post.image;
  blogModalImage.alt = post.title;
  blogModalCategory.innerHTML = post.category;
  blogModalDate.innerHTML = formatDate(post.date);
  blogModalDate.setAttribute('datetime', post.date);
  blogModalTitle.innerHTML = post.title;
  blogModalText.innerHTML = post.content;
  blogModalFunc();
}

// --- Private post password modal ---
let pendingPrivatePost = null;

function openPrivatePostModal(post) {
  pendingPrivatePost = post;
  const modal = document.getElementById('private-post-modal');
  const input = document.getElementById('private-post-password-input');
  const errorEl = document.getElementById('private-post-error');
  if (input) input.value = '';
  if (errorEl) errorEl.style.display = 'none';
  if (modal) modal.classList.add('active');
  if (input) setTimeout(function () { input.focus(); }, 80);
}

function closePrivatePostModal() {
  const modal = document.getElementById('private-post-modal');
  if (modal) modal.classList.remove('active');
  pendingPrivatePost = null;
}

function submitPrivatePostPassword() {
  const input = document.getElementById('private-post-password-input');
  const errorEl = document.getElementById('private-post-error');
  const val = input ? input.value : '';
  if (val === PRIVATE_POST_PASSWORD) {
    closePrivatePostModal();
    if (pendingPrivatePost) {
      openBlogReader(pendingPrivatePost);
    }
  } else {
    if (input) {
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      input.value = '';
    }
    if (errorEl) errorEl.style.display = 'block';
  }
}

function isSlugUnique(slug, excludeId) {
  const target = String(slug || '').trim().toLowerCase();
  if (!target) return false;
  return !blogPosts.some(function (p) {
    if (!p) return false;
    if (excludeId && p.id === excludeId) return false;
    return String(p.slug || '').trim().toLowerCase() === target;
  });
}

async function loadBlogPostsFromFirestore() {
  try {
    if (!window.db) {
      console.log('Firebase not initialized, using default posts');
      blogPosts = defaultBlogPosts.map(function (p) { return normalizeBlogPostRecord(p, p.id); });
      return;
    }

    isLoading = true;
    showLoadingState();

    function mapBlogDoc(doc) {
      return normalizeBlogPostRecord(doc.data(), doc.id);
    }

    const collectionCandidates = ['blogPosts', 'blogs', 'blogposts'];
    let foundCollection = null;
    blogPosts = [];

    for (const collectionName of collectionCandidates) {
      const blogPostsRef = window.collection(window.db, collectionName);
      let rows = [];
      try {
        const q = window.query(blogPostsRef, window.orderBy('createdAt', 'desc'));
        const orderedSnapshot = await window.getDocs(q);
        orderedSnapshot.forEach((doc) => {
          rows.push(mapBlogDoc(doc));
        });
      } catch (orderedErr) {
        console.warn('Ordered blog query failed for', collectionName, '- trying unordered fetch', orderedErr);
      }

      if (rows.length === 0) {
        const unorderedSnapshot = await window.getDocs(blogPostsRef);
        unorderedSnapshot.forEach((doc) => {
          rows.push(mapBlogDoc(doc));
        });
      }

      if (rows.length > 0) {
        foundCollection = collectionName;
        blogPosts = rows;
        break;
      }
    }

    if (foundCollection) {
      console.log('Loaded blog posts from Firestore collection:', foundCollection, 'count:', blogPosts.length);
    } else {
      console.warn('No blog documents found in Firestore collections:', collectionCandidates.join(', '));
    }

    // Stable client-side ordering for mixed legacy documents.
    blogPosts.sort(function (a, b) {
      const av = a && a.createdAt && typeof a.createdAt.toMillis === 'function'
        ? a.createdAt.toMillis()
        : Date.parse((a && a.date) || 0) || 0;
      const bv = b && b.createdAt && typeof b.createdAt.toMillis === 'function'
        ? b.createdAt.toMillis()
        : Date.parse((b && b.date) || 0) || 0;
      return bv - av;
    });

    // If no posts in Firestore, use default posts
    if (blogPosts.length === 0) {
      blogPosts = defaultBlogPosts.map(function (p) { return normalizeBlogPostRecord(p, p.id); });
    }

    hideLoadingState();
  } catch (error) {
    console.error('Error loading blog posts:', error);
    blogPosts = defaultBlogPosts.map(function (p) { return normalizeBlogPostRecord(p, p.id); });
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
    
    const cleanPost = normalizeBlogPostRecord(postData);
    const blogPostsRef = window.collection(window.db, 'blogPosts');
    console.log('blogPostsRef created:', blogPostsRef);
    
    const docRef = await window.addDoc(blogPostsRef, {
      ...cleanPost,
      createdAt: window.serverTimestamp()
    });

    console.log('Blog post saved successfully with ID:', docRef.id);
    console.log('docRef:', docRef);
    
    if (!docRef || !docRef.id) {
      throw new Error('Failed to save post - no document ID returned from Firestore');
    }
    
    return {
      ...cleanPost,
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

    const cleanPost = normalizeBlogPostRecord(postData, postId);
    console.log('Updating blog post in Firestore:', postId, cleanPost);
    const postRef = window.doc(window.db, 'blogPosts', postId);
    await window.updateDoc(postRef, {
      ...cleanPost,
      updatedAt: window.serverTimestamp()
    });

    console.log('Blog post updated successfully');
    return {
      ...cleanPost,
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
  const visiblePosts = blogPosts.filter(isBlogPostVisible);

  if (visiblePosts.length === 0) {
    blogPostsList.innerHTML = `
      <li class="empty-item">
        <p>No published blog posts yet.</p>
      </li>
    `;
    return;
  }

  console.log('Rendering blog posts:', visiblePosts);

  visiblePosts.forEach(post => {
    const isPrivate = String(post.status || '').toLowerCase() === 'private';
    const blogItem = document.createElement('li');
    blogItem.className = 'blog-post-item';
    blogItem.innerHTML = `
      <a href="#" data-blog-item data-blog-id="${post.id}" data-blog-private="${isPrivate}">
        <figure class="blog-banner-box">
          <img src="${post.image}" alt="${post.title}" loading="lazy" data-blog-image>
          ${isPrivate ? '<div class="blog-private-lock"><ion-icon name="lock-closed-outline"></ion-icon></div>' : ''}
        </figure>
        
        <div class="blog-content">
          <div class="blog-meta">
            <p class="blog-category" data-blog-category>${post.category}</p>
            <span class="dot"></span>
            <time datetime="${post.date}" data-blog-date>${formatDate(post.date)}</time>
          </div>
          
          <h3 class="h3 blog-item-title" data-blog-title>${post.title}</h3>
          
          <p class="blog-text" data-blog-excerpt>${post.excerpt}</p>
          <p class="blog-text" style="font-size: 12px; opacity: 0.75; margin-top: 8px;">
            ${post.authorName || 'Ruben Jimenez'}${post.readTimeMinutes ? ` • ${post.readTimeMinutes} min read` : ''}
          </p>
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
          <p class="blog-text" style="font-size: 12px; opacity: 0.75; margin-top: 8px; display: flex; align-items: center; gap: 6px;">
            ${String(post.status || 'published').toUpperCase()}${post.publishAt ? ` • ${post.publishAt}` : ''}
            ${String(post.status || '').toLowerCase() === 'private' ? '<span class="blog-private-badge"><ion-icon name="lock-closed-outline"></ion-icon> Private</span>' : ''}
          </p>
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
        const isPrivate = String(post.status || '').toLowerCase() === 'private';
        if (isPrivate && !isAdmin()) {
          openPrivatePostModal(post);
        } else {
          openBlogReader(post);
        }
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
  if (!isAdmin()) {
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
      if (!isAdmin()) return;
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
let addBlogDirty = false;
let editBlogDirty = false;

function markBlogFormDirty(type) {
  if (type === 'add') addBlogDirty = true;
  if (type === 'edit') editBlogDirty = true;
}

function resetBlogFormDirty(type) {
  if (type === 'add') addBlogDirty = false;
  if (type === 'edit') editBlogDirty = false;
}

function ensureBlogFormCanClose(type) {
  const isDirty = type === 'add' ? addBlogDirty : editBlogDirty;
  if (!isDirty) return true;
  return window.confirm('You have unsaved changes. Close without saving?');
}

function collectBlogPostFromForm(form, isEdit) {
  const formData = new FormData(form);
  const id = isEdit ? String(formData.get('id') || '').trim() : '';
  const title = String(formData.get('title') || '').trim();
  const slugRaw = String(formData.get('slug') || '').trim();
  const slug = slugRaw || slugifyPostTitle(title);
  const category = String(formData.get('category') || '').trim();
  const excerpt = String(formData.get('excerpt') || '').trim();
  const content = sanitizeBlogContentHtml(String(formData.get('content') || ''));
  const image = String(formData.get('image') || '').trim() || './assets/images/blog-1.jpg';
  const authorName = String(formData.get('authorName') || '').trim();
  const status = String(formData.get('status') || '').toLowerCase().trim();
  const publishAt = String(formData.get('publishAt') || '').trim();
  const date = String(formData.get('date') || '').trim() || toIsoDateOnly(Date.now());
  const seoTitle = String(formData.get('seoTitle') || '').trim();
  const seoDescription = String(formData.get('seoDescription') || '').trim();
  const imageAlt = String(formData.get('imageAlt') || '').trim();
  const imageCaption = String(formData.get('imageCaption') || '').trim();
  const readTimeMinutes = Number(formData.get('readTimeMinutes') || 0);
  const tags = String(formData.get('tags') || '')
    .split(',')
    .map(function (t) { return t.trim(); })
    .filter(Boolean);

  if (!title || !category || !excerpt || !content || !authorName) {
    throw new Error('Please complete all required fields.');
  }
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug must use lowercase letters, numbers, and hyphens only.');
  }
  if (!isSlugUnique(slug, id || null)) {
    throw new Error('Slug already exists. Please choose a unique slug.');
  }
  if (['draft', 'published', 'private'].indexOf(status) < 0) {
    throw new Error('Status must be draft, published, or private.');
  }

  return normalizeBlogPostRecord({
    title: title,
    slug: slug,
    category: category,
    date: date,
    image: image,
    imageAlt: imageAlt || title,
    imageCaption: imageCaption,
    excerpt: excerpt,
    content: content,
    seoTitle: seoTitle || title,
    seoDescription: seoDescription || excerpt,
    authorName: authorName,
    readTimeMinutes: readTimeMinutes > 0 ? readTimeMinutes : '',
    tags: tags,
    status: status,
    publishAt: publishAt
  }, id || undefined);
}
// Scope to add modal so duplicate ids elsewhere (e.g. admin wrappers) cannot grab the wrong node.
const contentTextarea = addBlogModal
  ? addBlogModal.querySelector('textarea#blog-content')
  : document.getElementById('blog-content');
const lineNumbers = addBlogModal
  ? addBlogModal.querySelector('#editor-line-numbers')
  : document.getElementById('editor-line-numbers');
const charCount = addBlogModal ? addBlogModal.querySelector('.char-count') : document.querySelector('.char-count');
const wordCount = addBlogModal ? addBlogModal.querySelector('.word-count') : document.querySelector('.word-count');

// Update line numbers
function updateLineNumbers() {
  if (!lineNumbers || !contentTextarea) return;

  const textareaValue =
    contentTextarea && typeof contentTextarea.value === 'string' ? contentTextarea.value : '';
  const lines = textareaValue.split('\n');
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
  
  const text = typeof contentTextarea.value === 'string' ? contentTextarea.value : '';
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
  if (!ensureBlogFormCanClose('add')) return;
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
  resetBlogFormDirty('add');
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

// Private post password modal event listeners
(function bindPrivatePostModal() {
  const modal = document.getElementById('private-post-modal');
  if (!modal) return;

  const overlay = document.getElementById('private-post-overlay');
  const closeBtn = document.getElementById('private-post-close-btn');
  const submitBtn = document.getElementById('private-post-submit-btn');
  const input = document.getElementById('private-post-password-input');

  if (overlay) overlay.addEventListener('click', closePrivatePostModal);
  if (closeBtn) closeBtn.addEventListener('click', closePrivatePostModal);
  if (submitBtn) submitBtn.addEventListener('click', submitPrivatePostPassword);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitPrivatePostPassword();
      if (e.key === 'Escape') closePrivatePostModal();
    });
    input.addEventListener('animationend', function () {
      input.classList.remove('shake');
    });
  }
}());

// Prevent clicks inside modal content from closing the modal
if (addBlogModal) {
  const addBlogContent = addBlogModal.querySelector('.add-blog-content');
  if (addBlogContent) {
    addBlogContent.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

(function bindPortfolioModalContentStopPropagation() {
  const root = document.getElementById('portfolio-project-modal');
  if (!root) return;
  const inner = root.querySelector('.add-blog-content');
  if (inner && !inner.dataset.stopBound) {
    inner.dataset.stopBound = '1';
    inner.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
})();

// ESC key to close modals
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' || e.keyCode === 27) {
    const portfolioModal = document.getElementById('portfolio-project-modal');
    if (portfolioModal && portfolioModal.classList.contains('active')) {
      closePortfolioProjectModal();
      return;
    }
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
      
      const newPost = collectBlogPostFromForm(this, false);
      
      console.log('New post data:', newPost);
      
      // Validate required fields
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
      resetBlogFormDirty('add');
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

function bindProfessionalBlogFormEnhancements() {
  const addFormEl = document.getElementById('add-blog-form');
  const editFormEl = document.getElementById('edit-blog-form');
  const addTitle = document.getElementById('blog-title');
  const addSlug = document.getElementById('blog-slug');
  const editTitle = document.getElementById('edit-blog-title');
  const editSlug = document.getElementById('edit-blog-slug');
  const addContent = document.getElementById('blog-content');
  const editContent = document.getElementById('edit-blog-content');

  if (addTitle && addSlug) {
    addTitle.addEventListener('input', function () {
      if (!addSlug.value || addSlug.dataset.auto === '1') {
        addSlug.value = slugifyPostTitle(addTitle.value);
        addSlug.dataset.auto = '1';
      }
    });
    addSlug.addEventListener('input', function () {
      addSlug.dataset.auto = '0';
    });
  }

  if (editTitle && editSlug) {
    editTitle.addEventListener('input', function () {
      if (!editSlug.value || editSlug.dataset.auto === '1') {
        editSlug.value = slugifyPostTitle(editTitle.value);
        editSlug.dataset.auto = '1';
      }
    });
    editSlug.addEventListener('input', function () {
      editSlug.dataset.auto = '0';
    });
  }

  if (addContent) {
    addContent.addEventListener('input', function () {
      markBlogFormDirty('add');
    });
  }

  if (editContent) {
    editContent.addEventListener('input', function () {
      markBlogFormDirty('edit');
    });
  }

  if (addFormEl) {
    addFormEl.addEventListener('input', function () {
      markBlogFormDirty('add');
    });
  }
  if (editFormEl) {
    editFormEl.addEventListener('input', function () {
      markBlogFormDirty('edit');
    });
  }
}

// Setup form listener when DOM is ready
if (addBlogForm) {
  setupAddBlogFormListener();
  bindProfessionalBlogFormEnhancements();
} else {
  // If form not found initially, try again when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('add-blog-form')) {
      setupAddBlogFormListener();
      bindProfessionalBlogFormEnhancements();
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
  var editSlugEl = document.getElementById('edit-blog-slug');
  if (editSlugEl) editSlugEl.value = post.slug || slugifyPostTitle(post.title);
  var editSeoTitleEl = document.getElementById('edit-blog-seo-title');
  if (editSeoTitleEl) editSeoTitleEl.value = post.seoTitle || post.title || '';
  var editSeoDescEl = document.getElementById('edit-blog-seo-description');
  if (editSeoDescEl) editSeoDescEl.value = post.seoDescription || post.excerpt || '';
  var editImageAltEl = document.getElementById('edit-blog-image-alt');
  if (editImageAltEl) editImageAltEl.value = post.imageAlt || post.title || '';
  var editImageCaptionEl = document.getElementById('edit-blog-image-caption');
  if (editImageCaptionEl) editImageCaptionEl.value = post.imageCaption || '';
  var editAuthorEl = document.getElementById('edit-blog-author');
  if (editAuthorEl) editAuthorEl.value = post.authorName || 'Ruben Jimenez';
  var editReadTimeEl = document.getElementById('edit-blog-read-time');
  if (editReadTimeEl) editReadTimeEl.value = post.readTimeMinutes || '';
  var editTagsEl = document.getElementById('edit-blog-tags');
  if (editTagsEl) editTagsEl.value = Array.isArray(post.tags) ? post.tags.join(', ') : '';
  var editStatusEl = document.getElementById('edit-blog-status');
  if (editStatusEl) editStatusEl.value = post.status || 'published';
  var editPublishAtEl = document.getElementById('edit-blog-publish-at');
  if (editPublishAtEl) editPublishAtEl.value = post.publishAt || '';
  
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
  resetBlogFormDirty('edit');

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
  if (!ensureBlogFormCanClose('edit')) return;
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
  resetBlogFormDirty('edit');
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
    if (!isAdmin()) {
      showErrorMessage('Access denied. Admin privileges required to update blog posts.');
      return;
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    const postId = document.getElementById('edit-blog-id').value;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
      
      const updatedPost = collectBlogPostFromForm(this, true);
      
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
      if (isAdmin()) {
        renderAdminBlogPosts();
      }
      
      // Close modal
      resetBlogFormDirty('edit');
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

function closeDeleteBlogConfirmModal() {
  const modal = document.getElementById('delete-blog-confirm-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  delete modal.dataset.pendingPostId;
}

function openDeleteBlogConfirmModal(postId) {
  const modal = document.getElementById('delete-blog-confirm-modal');
  if (!modal || !postId) return;
  modal.dataset.pendingPostId = postId;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  const cancelBtn = document.getElementById('delete-blog-confirm-cancel');
  if (cancelBtn) {
    setTimeout(function () {
      cancelBtn.focus();
    }, 40);
  }
}

async function handleDeleteBlogConfirmClick() {
  const modal = document.getElementById('delete-blog-confirm-modal');
  const postId = modal && modal.dataset ? modal.dataset.pendingPostId : '';
  if (!postId) {
    closeDeleteBlogConfirmModal();
    return;
  }
  if (!isAdmin()) {
    showErrorMessage('Access denied. Admin privileges required to delete blog posts.');
    closeDeleteBlogConfirmModal();
    return;
  }
  try {
    await deleteBlogPostFromFirestore(postId);
    blogPosts = blogPosts.filter(function (p) {
      return p.id !== postId;
    });
    renderBlogPosts();
    if (isAdmin()) {
      renderAdminBlogPosts();
    }
    closeDeleteBlogConfirmModal();
    var editIdEl = document.getElementById('edit-blog-id');
    if (
      editIdEl &&
      editIdEl.value === postId &&
      editBlogModal &&
      editBlogModal.classList.contains('active')
    ) {
      closeEditBlogModal();
    }
    showSuccessMessage('Blog post deleted successfully!');
  } catch (error) {
    console.error('Error deleting blog post:', error);
    closeDeleteBlogConfirmModal();
  }
}

function setupDeleteBlogConfirmModal() {
  const modal = document.getElementById('delete-blog-confirm-modal');
  const overlay = document.getElementById('delete-blog-confirm-overlay');
  const btnClose = document.getElementById('delete-blog-confirm-close');
  const btnCancel = document.getElementById('delete-blog-confirm-cancel');
  const btnDelete = document.getElementById('delete-blog-confirm-delete');
  if (!modal || modal.dataset.bound || !overlay || !btnCancel || !btnDelete) return;
  modal.dataset.bound = '1';
  overlay.addEventListener('click', closeDeleteBlogConfirmModal);
  if (btnClose) {
    btnClose.addEventListener('click', closeDeleteBlogConfirmModal);
  }
  btnCancel.addEventListener('click', closeDeleteBlogConfirmModal);
  btnDelete.addEventListener('click', handleDeleteBlogConfirmClick);
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!modal.classList.contains('active')) return;
    ev.preventDefault();
    closeDeleteBlogConfirmModal();
  });
}

setupDeleteBlogConfirmModal();

// Handle delete button (opens custom confirm modal)
if (deleteBlogBtn) {
  deleteBlogBtn.addEventListener('click', function (e) {
    e.preventDefault();

    if (!isAdmin()) {
      showErrorMessage('Access denied. Admin privileges required to delete blog posts.');
      return;
    }

    const postId = document.getElementById('edit-blog-id').value;
    if (!postId) return;

    openDeleteBlogConfirmModal(postId);
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
    var statusInput = document.getElementById('blog-status');
    if (statusInput) statusInput.value = 'published';
    var authorInput = document.getElementById('blog-author');
    if (authorInput) authorInput.value = 'Ruben Jimenez';
    var slugInput = document.getElementById('blog-slug');
    if (slugInput) {
      slugInput.value = '';
      slugInput.dataset.auto = '1';
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
    resetBlogFormDirty('add');
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
    
    newBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (!isAdmin()) {
        showErrorMessage('Access denied. Admin privileges required to delete blog posts.');
        return;
      }

      const postId = this.getAttribute('data-delete-blog');
      openDeleteBlogConfirmModal(postId);
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

// Initialize blog posts on page load (portfolio loads after Firebase — see admin IIFE DOMContentLoaded)
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


// ═══════════════════════════════════════════════════════════════════════════
// Portfolio projects — Realtime Database `portfolioProjects` + built-in fallback
// (window.DEFAULT_PORTFOLIO_PROJECTS from portfolio-built-in-data.js)
// ═══════════════════════════════════════════════════════════════════════════

let portfolioProjectsRtdb = [];

const PORTFOLIO_PLACEHOLDER_IMAGE = '/assets/images/project-comingsoon.svg';

/** Fallback if portfolio-built-in-data.js fails to load (e.g. /admin/ + relative script path). */
const PORTFOLIO_ASSET_IMAGE_FALLBACK = [
  '/assets/images/project-procleaning.png',
  '/assets/images/project-grippysocks.png',
  '/assets/images/project-barbershop.png',
  '/assets/images/project-rizopizzeria.png',
  '/assets/images/project-sheltonsprings.png',
  '/assets/images/project-gadgetgarage.png',
  '/assets/images/project-rosasalon.png',
  '/assets/images/project-zoomrealty.png',
  '/assets/images/project-realestate.png',
  '/assets/images/project-homeverse.png',
  '/assets/images/project-lawncare.png',
  '/assets/images/project-procleaning1.png',
  '/assets/images/project-rizopizzeria1.png',
  '/assets/images/project-sheltonsprings1.png',
  '/assets/images/project-rosasalon1.png',
  '/assets/images/project-gadgetgarage2.png',
  '/assets/images/project-homeverse2.png'
];

function portfolioEscapeHtml(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Preserve line breaks from admin textarea / RTDB (pair with .portfolio-preserve-breaks CSS). */
function portfolioNormalizeMultilineText(value) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function portfolioSetMultilineElement(el, value) {
  if (!el) return;
  el.textContent = portfolioNormalizeMultilineText(value).trim();
}

function getPortfolioAssetImageOptions() {
  var seen = {};
  var list = [];
  function add(url) {
    var normalized = portfolioNormalizeAssetImageUrl(url);
    if (!normalized || seen[normalized]) return;
    if (/^https?:\/\//i.test(normalized) && !portfolioExtractAssetImagePath(normalized)) return;
    seen[normalized] = true;
    list.push(normalized);
  }
  if (Array.isArray(window.PORTFOLIO_ASSET_IMAGES)) {
    window.PORTFOLIO_ASSET_IMAGES.forEach(add);
  }
  (window.DEFAULT_PORTFOLIO_PROJECTS || []).forEach(function (p) {
    portfolioImageUrlsFromRecord(p).forEach(add);
  });
  if (Array.isArray(portfolioProjectsRtdb)) {
    portfolioProjectsRtdb.forEach(function (p) {
      portfolioImageUrlsFromRecord(p).forEach(add);
    });
  }
  PORTFOLIO_ASSET_IMAGE_FALLBACK.forEach(add);
  return list.sort();
}

function portfolioCleanImageUrlInput(url) {
  return String(url != null ? url : '')
    .replace(/^@+/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

/** Extract /assets/images/file.ext from any path or absolute URL (fixes /admin/assets/... and /portfolio/assets/...). */
function portfolioExtractAssetImagePath(url) {
  var s = portfolioCleanImageUrlInput(url);
  if (!s) return '';
  var match = s.match(/assets\/images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|svg|gif)/i);
  if (!match) return '';
  var file = match[0].slice('assets/images/'.length).toLowerCase();
  return '/assets/images/' + file;
}

/** Canonical storage path: /assets/images/... (root-relative, works on /admin, /portfolio, etc.). */
function portfolioNormalizeAssetImageUrl(url) {
  var s = portfolioCleanImageUrlInput(url);
  if (!s) return '';
  var extracted = portfolioExtractAssetImagePath(s);
  if (extracted) return extracted;
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (/^\.?\/?assets\//i.test(s)) {
    return portfolioExtractAssetImagePath(s) || '/' + s.replace(/^\.?\//, '');
  }
  return s;
}

var PORTFOLIO_IMAGE_CACHE_BUST = '20260518b';

/** Root-relative src for <img> — never breaks on /admin or /portfolio routes. */
function portfolioDisplayImageSrc(url) {
  var path = portfolioNormalizeAssetImageUrl(url) || PORTFOLIO_PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(path)) {
    var extracted = portfolioExtractAssetImagePath(path);
    if (extracted) path = extracted;
    else return path;
  }
  if (path.indexOf('/') !== 0) {
    path = '/' + String(path).replace(/^\.?\//, '');
  }
  return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + PORTFOLIO_IMAGE_CACHE_BUST;
}

/** ./assets/images/... for admin form display (same info as stored /assets/... path). */
function portfolioRelativeAssetPathForForm(url) {
  var normalized = portfolioNormalizeAssetImageUrl(url);
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) {
    var extracted = portfolioExtractAssetImagePath(normalized);
    return extracted ? '.' + extracted : normalized;
  }
  if (normalized.indexOf('/') === 0) return '.' + normalized;
  return normalized;
}

const PORTFOLIO_MAX_SLIDES = 12;

function portfolioImageUrlFromRecord(row) {
  if (!row || typeof row !== 'object') return '';
  return portfolioNormalizeAssetImageUrl(
    row.imageUrl || row.imageURL || row.image || row.thumbnailUrl || ''
  );
}

function portfolioParseImageUrls(raw, legacyUrl) {
  var list = [];
  var seen = {};
  function pushUrl(url) {
    var normalized = portfolioNormalizeAssetImageUrl(url);
    if (!normalized || seen[normalized]) return;
    seen[normalized] = true;
    list.push(normalized);
  }
  if (Array.isArray(raw)) {
    raw.forEach(function (u) {
      if (list.length >= PORTFOLIO_MAX_SLIDES) return;
      pushUrl(u);
    });
  }
  if (!list.length && legacyUrl) pushUrl(legacyUrl);
  return list.slice(0, PORTFOLIO_MAX_SLIDES);
}

function portfolioImageUrlsFromRecord(row) {
  if (!row || typeof row !== 'object') return [];
  if (Array.isArray(row.imageUrls) && row.imageUrls.length) {
    return portfolioParseImageUrls(row.imageUrls, portfolioImageUrlFromRecord(row));
  }
  return portfolioParseImageUrls(null, portfolioImageUrlFromRecord(row));
}

function portfolioPrimaryImageUrl(row) {
  var urls = portfolioImageUrlsFromRecord(row);
  return urls.length ? urls[0] : '';
}

function portfolioRenderCarousel(rootEl, options) {
  if (!rootEl) return;
  var track = rootEl.querySelector('.portfolio-carousel-track');
  var prevBtn = rootEl.querySelector('.portfolio-carousel-prev');
  var nextBtn = rootEl.querySelector('.portfolio-carousel-next');
  var dotsEl = rootEl.querySelector('.portfolio-carousel-dots');
  if (!track) return;

  var urls = (options && options.urls) || [];
  var altBase = (options && options.altBase) || 'Project screenshot';
  var index = (options && options.startIndex) || 0;

  if (!urls.length) {
    urls = [PORTFOLIO_PLACEHOLDER_IMAGE];
  }

  track.innerHTML = urls
    .map(function (url, i) {
      var alt =
        altBase +
        (urls.length > 1 ? ' (' + (i + 1) + ' of ' + urls.length + ')' : '');
      return (
        '<div class="portfolio-carousel-slide' +
        (i === index ? ' is-active' : '') +
        '" data-index="' +
        i +
        '">' +
        '<img src="' +
        portfolioEscapeHtml(portfolioDisplayImageSrc(url)) +
        '" alt="' +
        portfolioEscapeHtml(alt) +
        '" loading="lazy" onerror="portfolioHandleImageError(this)">' +
        '</div>'
      );
    })
    .join('');

  function goTo(i) {
    index = ((i % urls.length) + urls.length) % urls.length;
    track.querySelectorAll('.portfolio-carousel-slide').forEach(function (slide, j) {
      slide.classList.toggle('is-active', j === index);
    });
    if (dotsEl) {
      dotsEl.querySelectorAll('.portfolio-carousel-dot').forEach(function (dot, j) {
        dot.classList.toggle('is-active', j === index);
        dot.setAttribute('aria-selected', j === index ? 'true' : 'false');
      });
    }
  }

  var multi = urls.length > 1;
  if (prevBtn) {
    prevBtn.hidden = !multi;
    prevBtn.onclick = function () {
      goTo(index - 1);
    };
  }
  if (nextBtn) {
    nextBtn.hidden = !multi;
    nextBtn.onclick = function () {
      goTo(index + 1);
    };
  }
  if (dotsEl) {
    if (multi) {
      dotsEl.innerHTML = urls
        .map(function (_, i) {
          return (
            '<button type="button" class="portfolio-carousel-dot' +
            (i === index ? ' is-active' : '') +
            '" role="tab" aria-label="Screenshot ' +
            (i + 1) +
            '" aria-selected="' +
            (i === index ? 'true' : 'false') +
            '" data-index="' +
            i +
            '"></button>'
          );
        })
        .join('');
      dotsEl.hidden = false;
      dotsEl.querySelectorAll('.portfolio-carousel-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
          goTo(parseInt(dot.getAttribute('data-index'), 10));
        });
      });
    } else {
      dotsEl.innerHTML = '';
      dotsEl.hidden = true;
    }
  }
  goTo(index);
}

function populatePortfolioImageAssetSelect() {
  var select = document.getElementById('portfolio-project-image-asset');
  var datalist = document.getElementById('portfolio-project-image-options');
  var options = getPortfolioAssetImageOptions();
  if (select) {
    var current = select.value;
    select.innerHTML =
      '<option value="">Choose a screenshot…</option>' +
      options
        .map(function (path) {
          var label = path.replace(/^\/?assets\/images\//, '');
          return (
            '<option value="' +
            portfolioEscapeHtml(path) +
            '">' +
            portfolioEscapeHtml(label) +
            '</option>'
          );
        })
        .join('');
    if (current && options.indexOf(current) >= 0) select.value = current;
  }
  if (datalist) {
    datalist.innerHTML = options
      .map(function (path) {
        return '<option value="' + portfolioEscapeHtml(path) + '"></option>';
      })
      .join('');
  }
}

function syncPortfolioImageAssetSelectFromInput() {
  var select = document.getElementById('portfolio-project-image-asset');
  var input = document.getElementById('portfolio-project-image');
  if (!select || !input) return;
  var normalized = portfolioNormalizeAssetImageUrl(input.value);
  var options = getPortfolioAssetImageOptions();
  if (normalized && options.indexOf(normalized) >= 0) {
    select.value = normalized;
  } else {
    select.value = '';
  }
}

function portfolioHandleImageError(img) {
  if (!img || img.dataset.portfolioImgFailed === '1') return;
  img.dataset.portfolioImgFailed = '1';
  img.src = portfolioDisplayImageSrc(PORTFOLIO_PLACEHOLDER_IMAGE);
}

window.portfolioHandleImageError = portfolioHandleImageError;

/** Numeric sort key for `order` (RTDB may store strings; avoids lexicographic ordering). */
function portfolioNumericOrder(p) {
  if (!p || p.order == null || p.order === '') return 0;
  const n = Number(String(p.order).trim());
  return Number.isFinite(n) ? n : 0;
}

function comparePortfolioProjectsByOrder(a, b) {
  const da = portfolioNumericOrder(a);
  const db = portfolioNumericOrder(b);
  if (da !== db) return da - db;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function getNextPortfolioOrderValue() {
  if (!portfolioProjectsRtdb.length) return 10;
  const maxOrder = portfolioProjectsRtdb.reduce(function (max, p) {
    return Math.max(max, portfolioNumericOrder(p));
  }, 0);
  return maxOrder + 10;
}

function getBuiltInPortfolioProjects() {
  const src = window.DEFAULT_PORTFOLIO_PROJECTS;
  if (!Array.isArray(src) || src.length === 0) return [];
  const list = src.map(function (p, i) {
    return Object.assign({}, p, { id: 'builtin-' + i });
  });
  list.sort(comparePortfolioProjectsByOrder);
  return list;
}

function getEffectivePortfolioProjects() {
  const list =
    portfolioProjectsRtdb.length > 0
      ? portfolioProjectsRtdb.slice()
      : getBuiltInPortfolioProjects();
  list.sort(comparePortfolioProjectsByOrder);
  return list;
}

function syncWindowPortfolioProjectsRef() {
  window.portfolioProjects = getEffectivePortfolioProjects();
  try {
    document.dispatchEvent(new CustomEvent('portfolioProjectsLoaded'));
  } catch (e) {
    // no-op
  }
}

function normalizePortfolioRtdbRow(row) {
  if (!row || typeof row !== 'object') return {};
  const out = Object.assign({}, row);
  const imageUrls = portfolioImageUrlsFromRecord(row);
  if (imageUrls.length) {
    out.imageUrls = imageUrls;
    out.imageUrl = imageUrls[0];
  } else {
    delete out.imageUrls;
  }
  if (out.order != null && out.order !== '') {
    const n = Number(String(out.order).trim());
    out.order = Number.isFinite(n) ? n : 0;
  }
  if (out.techTags && typeof out.techTags === 'object' && !Array.isArray(out.techTags)) {
    out.techTags = Object.keys(out.techTags)
      .sort()
      .map(function (k) {
        return out.techTags[k];
      })
      .filter(function (x) {
        return x != null && String(x).trim() !== '';
      });
  }
  return out;
}

async function loadPortfolioProjectsFromRtdb() {
  portfolioProjectsRtdb = [];
  if (!window.rtdb || !window.rtdbRef || !window.rtdbGet) {
    syncWindowPortfolioProjectsRef();
    return;
  }
  try {
    // Fail open so the public portfolio never stays stuck on "Loading projects..."
    // when the RTDB read hangs (network/rules/SDK edge cases).
    const snap = await Promise.race([
      window.rtdbGet(window.rtdbRef(window.rtdb, 'portfolioProjects')),
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('Realtime Database read timeout (portfolioProjects)'));
        }, 5000);
      })
    ]);
    const val = snap.val();
    if (val && typeof val === 'object') {
      Object.keys(val).forEach(function (key) {
        const row = normalizePortfolioRtdbRow(val[key]);
        portfolioProjectsRtdb.push(Object.assign({ id: key }, row));
      });
      portfolioProjectsRtdb.sort(comparePortfolioProjectsByOrder);
    }
  } catch (err) {
    console.error('Portfolio RTDB load failed; falling back to built-in projects', err);
  }
  syncWindowPortfolioProjectsRef();
  if (typeof populatePortfolioImageAssetSelect === 'function') {
    populatePortfolioImageAssetSelect();
  }
}

function portfolioParseTechTags(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw.map(function (t) { return String(t).trim(); }).filter(Boolean).slice(0, 24);
  }
  return String(raw)
    .split(/[\n,]+/)
    .map(function (t) { return t.trim(); })
    .filter(Boolean)
    .slice(0, 24);
}

function portfolioTechTagsFromRecord(data) {
  return portfolioParseTechTags(data.techTags);
}

function portfolioSanitizeDocumentPayload(data) {
  const imageUrls = portfolioParseImageUrls(
    data.imageUrls,
    data.imageUrl != null ? data.imageUrl : ''
  );
  const out = {
    order: Number(data.order) || 0,
    category: 'professional',
    title: String(data.title || '').slice(0, 200),
    projectUrl: String(data.projectUrl != null ? data.projectUrl : '').trim().slice(0, 2000),
    imageUrls: imageUrls,
    imageUrl: imageUrls.length ? imageUrls[0] : '',
    imageAlt: String(data.imageAlt != null ? data.imageAlt : '').slice(0, 200),
    description: String(data.description != null ? data.description : '').slice(0, 8000),
    techTags: portfolioParseTechTags(data.techTags),
    outcome: data.outcome != null ? String(data.outcome).slice(0, 4000) : '',
    buyNowLabel: data.buyNowLabel != null ? String(data.buyNowLabel).slice(0, 120) : '',
    buyPremiumLabel: data.buyPremiumLabel != null ? String(data.buyPremiumLabel).slice(0, 160) : '',
    showQuoteButton: data.showQuoteButton !== false,
    adminModalNote: data.adminModalNote != null ? String(data.adminModalNote).slice(0, 2000) : '',
    bestFor: Array.isArray(data.bestFor)
      ? data.bestFor.map(function (x) { return String(x).slice(0, 120); }).filter(Boolean).slice(0, 12)
      : []
  };
  return out;
}

async function saveNewPortfolioProject(payload) {
  const clean = portfolioSanitizeDocumentPayload(payload);
  clean.createdAt = window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
  const newRef = window.rtdbPush(window.rtdbRef(window.rtdb, 'portfolioProjects'));
  await window.rtdbSet(newRef, clean);
  return newRef.key;
}

async function updatePortfolioProjectDoc(id, payload) {
  const clean = portfolioSanitizeDocumentPayload(payload);
  clean.updatedAt = window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
  await window.rtdbSet(window.rtdbRef(window.rtdb, 'portfolioProjects/' + id), clean);
}

async function deletePortfolioProjectDoc(id) {
  await window.rtdbRemove(window.rtdbRef(window.rtdb, 'portfolioProjects/' + id));
}

const PORTFOLIO_CONTACT_ONCLICK =
  'onclick="if(typeof switchToPage === \'function\') { switchToPage(\'contact\'); } else { var btn = Array.from(document.querySelectorAll(\'[data-nav-link]\')).find(function(b){ return b.textContent.trim() === \'Contact\'; }); if(btn) btn.click(); } return false;"';

function portfolioSafeProjectUrl(u) {
  const s = String(u || '').trim();
  if (!s || s === '#') return '#';
  if (/^https?:\/\//i.test(s)) return s;
  return '#';
}

function portfolioDetailBtnShortLabel(longLabel) {
  const s = String(longLabel || '').trim();
  if (!s) return '';
  if (s.length <= 22) return s;
  if (/buy now/i.test(s)) return 'Buy Now';
  if (/premium/i.test(s)) return 'Premium';
  const beforeColon = s.split(':')[0].trim();
  if (beforeColon && beforeColon.length <= 22) return beforeColon;
  return s.length > 24 ? s.slice(0, 22) + '\u2026' : s;
}

function portfolioDetailBtnHtml(iconName, longLabel, shortLabel) {
  const short = shortLabel || portfolioDetailBtnShortLabel(longLabel);
  return (
    '<ion-icon name="' +
    iconName +
    '" aria-hidden="true"></ion-icon>' +
    '<span class="project-detail-btn-text">' +
    '<span class="project-detail-btn-label project-detail-btn-label--long">' +
    portfolioEscapeHtml(longLabel) +
    '</span>' +
    '<span class="project-detail-btn-label project-detail-btn-label--short">' +
    portfolioEscapeHtml(short) +
    '</span></span>'
  );
}

const PORTFOLIO_DETAIL_PRESETS = {
  'Grippy Socks': {
    admin:
      'The admin page is the operations center: review and prioritize new orders, update fulfillment status, and keep customer handoff clean without leaving the dashboard.',
    bestFor: ['Retail brands', 'E-commerce startups', 'Athletic apparel stores', 'Merchandise businesses']
  },
  'Barber Shop': {
    admin:
      'The admin page is critical for daily operations: owners can control availability, confirm bookings, manage services, and respond to messages in one secure workflow.',
    bestFor: ['Barbershops', 'Salons', 'Studios with appointments', 'Service businesses with recurring clients']
  },
  'Pro Cleaning': {
    admin:
      'The admin page keeps crews organized by centralizing job scheduling, assignment visibility, and status updates to reduce missed work and callbacks.',
    bestFor: [
      'Cleaning companies',
      'Landscaping crews',
      'Roof cleaning teams',
      'Home service contractors',
      'Trade services',
      'Field trades'
    ]
  },
  'Rizo Pizzeria': {
    bestFor: ['Restaurants', 'Pizzerias', 'Takeout kitchens', 'Food delivery operators']
  },
  "Rosa's Beauty Salon": {
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
  },
  'Zoom Realty': {
    bestFor: ['Real estate agencies', 'Property teams', 'Independent agents']
  },
  'Estate': {
    bestFor: ['Real estate agencies', 'Property teams', 'Independent agents']
  },
  'Homeverse': {
    bestFor: ['Real estate agencies', 'Property teams', 'Independent agents']
  },
  'Lawn Care': {
    bestFor: ['Lawn care companies', 'Landscaping crews', 'Home service contractors', 'Seasonal outdoor services']
  }
};

/** Curated industries aligned with portfolio projects (chip order = array order; max 9 shown). */
const PORTFOLIO_CURATED_NICHES = [
  {
    id: 'home-services',
    label: 'Home services',
    titleMatch: /cleaning|pro cleaning|roof|field trade|trade service|handyman|pressure wash/i,
    slugMatch: [
      'cleaning-companies',
      'roof-cleaning-teams',
      'home-service-contractors',
      'trade-services',
      'field-trades',
      'trade-contractors',
      'field-trade-contractors'
    ]
  },
  {
    id: 'realtor-broker',
    label: 'Realtor & broker agent',
    titleMatch: /realtor|broker|realty|real[\s-]?estate|homeverse|zoom|insurance/i,
    slugMatch: [
      'real-estate-agencies',
      'property-teams',
      'independent-agents',
      'realtor-broker-agents',
      'insurance-brokers'
    ]
  },
  {
    id: 'barber',
    label: 'Barber & salon',
    titleMatch: /\bbarber\b|beauty|rosa.*salon/i,
    slugMatch: [
      'barbershops',
      'salons',
      'beauty-salons',
      'spas',
      'nail-studios',
      'studios-with-appointments',
      'appointment-based-personal-care-businesses',
      'service-businesses-with-recurring-clients'
    ]
  },
  {
    id: 'trade-services',
    label: 'Trade services',
    titleMatch: /field trade|trade service|roof clean|pressure wash|window clean|pest control|hvac|plumb|electric|handyman/i,
    slugMatch: [
      'trade-services',
      'field-trades',
      'trade-contractors',
      'field-trade-contractors',
      'roof-cleaning-teams'
    ]
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    titleMatch: /pizza|pizzeria|rizo/i,
    slugMatch: ['restaurants', 'pizzerias', 'takeout-kitchens']
  },
  {
    id: 'retail',
    label: 'E-commerce',
    titleMatch: /grippy|socks|retail|e-?commerce/i,
    slugMatch: ['retail-brands', 'e-commerce-startups', 'merchandise-businesses']
  },
  {
    id: 'hoa',
    label: 'HOA',
    titleMatch: /hoa|home owners|shelton|community/i,
    slugMatch: ['hoas', 'property-management-firms', 'condo-associations', 'community-managers']
  },
  {
    id: 'repair',
    label: 'Repair & tech',
    titleMatch: /gadget|garage|repair/i,
    slugMatch: ['repair-shops', 'device-resellers', 'managed-it-teams']
  }
];

const PORTFOLIO_NICHE_MAX = 9;

/** Matched for tagging/filter logic but not shown as its own industry chip (rolls into Home services). */
const PORTFOLIO_NICHE_FILTER_ALIASES = {
  'trade-services': 'home-services'
};

let portfolioFilterNiche = 'all';
let portfolioFilterControlsBound = false;

function portfolioNicheSlug(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function portfolioGetDefaultBestFor(projectTitle, projectCategory) {
  const titleText = (projectTitle || '').toLowerCase();
  const categoryText = (projectCategory || '').toLowerCase();
  const combined = `${titleText} ${categoryText}`;
  if (combined.includes('lawn') || combined.includes('landscap') || combined.includes('mow')) {
    return [
      'Lawn care companies',
      'Landscaping crews',
      'Home service contractors',
      'Seasonal outdoor services'
    ];
  }
  if (combined.includes('real estate') || combined.includes('realty') || combined.includes('realtor')) {
    return ['Real estate agencies', 'Property teams', 'Independent agents'];
  }
  if (combined.includes('barber')) {
    return ['Barbershops', 'Salons', 'Studios with appointments'];
  }
  if (combined.includes('beauty') || combined.includes('salon')) {
    return ['Beauty salons', 'Spas', 'Nail studios'];
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

function portfolioBestForTagsForProject(p) {
  const titleText = String(p.title || '').trim();
  let tags = [];
  if (Array.isArray(p.bestFor) && p.bestFor.length) {
    tags = p.bestFor.slice();
  } else {
    const preset = PORTFOLIO_DETAIL_PRESETS[titleText];
    if (preset && preset.bestFor) tags = preset.bestFor.slice();
    else tags = portfolioGetDefaultBestFor(titleText, '');
  }
  const seen = {};
  const out = [];
  tags.forEach(function (label) {
    const slug = portfolioNicheSlug(label);
    if (!slug || seen[slug]) return;
    seen[slug] = true;
    out.push({ slug: slug, label: String(label).trim() });
  });
  return out;
}

function portfolioCuratedNichesForProject(p) {
  const title = String(p.title || '').toLowerCase();
  const tagSlugs = portfolioBestForTagsForProject(p).map(function (t) {
    return t.slug;
  });
  const keys = [];
  PORTFOLIO_CURATED_NICHES.forEach(function (niche) {
    let matched = false;
    if (niche.titleMatch && niche.titleMatch.test(title)) matched = true;
    if (!matched && niche.slugMatch) {
      matched = niche.slugMatch.some(function (slug) {
        return tagSlugs.indexOf(slug) !== -1;
      });
    }
    if (matched && keys.indexOf(niche.id) === -1) keys.push(niche.id);
  });
  Object.keys(PORTFOLIO_NICHE_FILTER_ALIASES).forEach(function (sourceId) {
    if (keys.indexOf(sourceId) !== -1) {
      var rollInto = PORTFOLIO_NICHE_FILTER_ALIASES[sourceId];
      if (rollInto && keys.indexOf(rollInto) === -1) keys.push(rollInto);
    }
  });
  return keys;
}

function portfolioItemMatchesNicheFilter(itemNiches, filterNiche) {
  if (filterNiche === 'all') return true;
  if (itemNiches.indexOf(filterNiche) !== -1) return true;
  var aliasKeys = Object.keys(PORTFOLIO_NICHE_FILTER_ALIASES);
  for (var ai = 0; ai < aliasKeys.length; ai++) {
    var sourceId = aliasKeys[ai];
    if (
      PORTFOLIO_NICHE_FILTER_ALIASES[sourceId] === filterNiche &&
      itemNiches.indexOf(sourceId) !== -1
    ) {
      return true;
    }
  }
  return false;
}

function collectPortfolioNicheFilters() {
  const used = new Set();
  getEffectivePortfolioProjects().forEach(function (p) {
    portfolioCuratedNichesForProject(p).forEach(function (id) {
      used.add(id);
    });
  });
  return PORTFOLIO_CURATED_NICHES.filter(function (niche) {
    return used.has(niche.id) && !PORTFOLIO_NICHE_FILTER_ALIASES[niche.id];
  })
    .slice(0, PORTFOLIO_NICHE_MAX)
    .map(function (niche) {
      return { slug: niche.id, label: niche.label };
    });
}

function updatePortfolioNicheScrollFades() {
  const wrap = document.querySelector('.portfolio-niche-scroll-wrap');
  const scroll = document.getElementById('portfolio-niche-filters');
  if (!wrap || !scroll) return;
  const maxScroll = scroll.scrollWidth - scroll.clientWidth;
  if (maxScroll <= 4) {
    wrap.classList.add('at-scroll-start', 'at-scroll-end');
    return;
  }
  wrap.classList.toggle('at-scroll-start', scroll.scrollLeft <= 4);
  wrap.classList.toggle('at-scroll-end', scroll.scrollLeft >= maxScroll - 4);
}

function initPortfolioNicheScrollFades() {
  const scroll = document.getElementById('portfolio-niche-filters');
  if (!scroll || scroll.dataset.nicheFadeBound === '1') return;
  scroll.dataset.nicheFadeBound = '1';
  scroll.addEventListener(
    'scroll',
    function () {
      updatePortfolioNicheScrollFades();
    },
    { passive: true }
  );
  window.addEventListener('resize', updatePortfolioNicheScrollFades);
  updatePortfolioNicheScrollFades();
}

function renderPortfolioNicheFilters() {
  const container = document.getElementById('portfolio-niche-filters');
  if (!container) return;
  const niches = collectPortfolioNicheFilters();
  const prevNiche = portfolioFilterNiche;
  let html =
    '<button type="button" class="portfolio-niche-text' +
    (prevNiche === 'all' ? ' active' : '') +
    '" data-portfolio-niche="all" role="tab" aria-selected="' +
    (prevNiche === 'all' ? 'true' : 'false') +
    '">All</button>';
  niches.forEach(function (n) {
    const active = prevNiche === n.slug;
    html +=
      '<button type="button" class="portfolio-niche-text' +
      (active ? ' active' : '') +
      '" data-portfolio-niche="' +
      portfolioEscapeHtml(n.slug) +
      '" role="tab" aria-selected="' +
      (active ? 'true' : 'false') +
      '">' +
      portfolioEscapeHtml(n.label) +
      '</button>';
  });
  container.innerHTML = html;
  if (prevNiche !== 'all' && !niches.some(function (n) { return n.slug === prevNiche; })) {
    portfolioFilterNiche = 'all';
  }
  container.scrollLeft = 0;
  initPortfolioNicheScrollFades();
  updatePortfolioNicheScrollFades();
}

function applyPortfolioFilters() {
  const filterItems = document.querySelectorAll('[data-filter-item]');
  filterItems.forEach(function (item) {
    const itemNiches = (item.dataset.niches || '').split(/\s+/).filter(Boolean);
    const nicheMatch = portfolioItemMatchesNicheFilter(itemNiches, portfolioFilterNiche);
    if (nicheMatch) item.classList.add('active');
    else item.classList.remove('active');
  });
  const nicheChips = document.querySelectorAll('[data-portfolio-niche]');
  nicheChips.forEach(function (btn) {
    const nicheVal = btn.dataset.portfolioNiche || 'all';
    const on = nicheVal === portfolioFilterNiche;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function initPortfolioFilterControls() {
  if (portfolioFilterControlsBound) return;
  const root = document.getElementById('portfolio-filters');
  if (!root) return;
  portfolioFilterControlsBound = true;
  initPortfolioNicheScrollFades();
  root.addEventListener('click', function (e) {
    const nicheBtn = e.target.closest('[data-portfolio-niche]');
    if (nicheBtn) {
      portfolioFilterNiche = nicheBtn.dataset.portfolioNiche || 'all';
      applyPortfolioFilters();
      if (window.matchMedia('(max-width: 767px)').matches) {
        nicheBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
  });
}

function buildPortfolioProjectCardHtml(p) {
  const liveHref = portfolioSafeProjectUrl(p.projectUrl);
  const imgSrc = portfolioDisplayImageSrc(portfolioPrimaryImageUrl(p) || p.imageUrl);
  const nicheSlugs = portfolioCuratedNichesForProject(p).join(' ');
  return (
    '<li class="project-item active" data-filter-item data-niches="' +
    portfolioEscapeHtml(nicheSlugs) +
    '" data-portfolio-id="' +
    portfolioEscapeHtml(p.id) +
    '">' +
    '<div class="project-card">' +
    '<a href="' +
    portfolioEscapeHtml(liveHref) +
    '" class="project-link">' +
    '<figure class="project-img">' +
    '<div class="project-item-icon-box">' +
    '<ion-icon name="eye-outline"></ion-icon>' +
    '</div>' +
    '<img src="' +
    portfolioEscapeHtml(imgSrc) +
    '" alt="' +
    portfolioEscapeHtml(p.imageAlt || p.title || '') +
    '" loading="lazy" onerror="portfolioHandleImageError(this)">' +
    '</figure>' +
    '<div class="project-content">' +
    '<h3 class="project-title">' +
    portfolioEscapeHtml(p.title || '') +
    '</h3>' +
    '<div class="project-bestfor-card" aria-label="Best for"></div>' +
    '</div>' +
    '</a>' +
    '</div></li>'
  );
}

function renderPublicPortfolioProjects() {
  const ul = document.getElementById('portfolio-project-list');
  if (!ul) return;
  const list = getEffectivePortfolioProjects();
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML =
      '<li class="project-item active" data-filter-item><div class="project-card"><p class="portfolio-projects-loading-text">No projects configured.</p></div></li>';
    syncWindowPortfolioProjectsRef();
    return;
  }
  list.forEach(function (p) {
    const wrap = document.createElement('div');
    wrap.innerHTML = buildPortfolioProjectCardHtml(p).trim();
    const li = wrap.firstElementChild;
    if (li) ul.appendChild(li);
  });
  syncWindowPortfolioProjectsRef();
  renderPortfolioNicheFilters();
  applyPortfolioFilters();
}

function applyCurrentPortfolioFilter() {
  applyPortfolioFilters();
}

function syncAdminPortfolioLocalBanner() {
  const banner = document.getElementById('admin-portfolio-local-banner');
  if (!banner) return;
  const empty = !portfolioProjectsRtdb.length;
  banner.hidden = !empty || !window.rtdb;
}

function renderAdminPortfolioProjects() {
  const listEl = document.getElementById('admin-portfolio-projects-list');
  if (!listEl) return;
  if (!isAdmin()) {
    listEl.innerHTML = '<div class="empty-item"><p>Log in as admin to manage portfolio projects.</p></div>';
    return;
  }
  syncAdminPortfolioLocalBanner();
  if (!portfolioProjectsRtdb.length) {
    listEl.innerHTML =
      '<div class="empty-item"><p>No projects in Realtime Database yet. The public portfolio still shows the built-in list until you add one below.</p></div>';
    return;
  }
  portfolioProjectsRtdb.sort(comparePortfolioProjectsByOrder);
  listEl.innerHTML = '';
  portfolioProjectsRtdb.forEach(function (p) {
    const row = document.createElement('div');
    row.className = 'admin-portfolio-row';
    const thumb = portfolioDisplayImageSrc(portfolioPrimaryImageUrl(p) || p.imageUrl);
    const orderNum = p.order != null ? p.order : 0;
    row.innerHTML =
      '<div class="admin-portfolio-row-main">' +
      '<div class="admin-portfolio-thumb-wrap">' +
      '<img class="admin-portfolio-thumb" src="' +
      portfolioEscapeHtml(thumb) +
      '" alt="" loading="lazy" onerror="portfolioHandleImageError(this)">' +
      '</div>' +
      '<div class="admin-portfolio-row-text">' +
      '<span class="admin-portfolio-title">' +
      portfolioEscapeHtml(p.title || 'Untitled') +
      '</span>' +
      '<div class="admin-portfolio-meta-row">' +
      '<span class="admin-portfolio-order" title="Sort order">#' +
      String(orderNum) +
      '</span>' +
      '</div></div></div>' +
      '<div class="admin-portfolio-row-actions">' +
      '<div class="admin-portfolio-order-controls" role="group" aria-label="Sort order controls">' +
      '<button type="button" class="blog-action-btn admin-portfolio-order-btn" data-portfolio-order-up="' +
      portfolioEscapeHtml(p.id) +
      '" title="Move up"><ion-icon name="chevron-up-outline"></ion-icon></button>' +
      '<button type="button" class="blog-action-btn admin-portfolio-order-btn" data-portfolio-order-down="' +
      portfolioEscapeHtml(p.id) +
      '" title="Move down"><ion-icon name="chevron-down-outline"></ion-icon></button>' +
      '</div>' +
      '<button type="button" class="blog-action-btn edit-btn admin-portfolio-action-btn" data-edit-portfolio="' +
      portfolioEscapeHtml(p.id) +
      '" title="Edit project"><ion-icon name="create-outline"></ion-icon></button>' +
      '<button type="button" class="blog-action-btn delete-btn admin-portfolio-action-btn" data-delete-portfolio="' +
      portfolioEscapeHtml(p.id) +
      '" title="Delete project"><ion-icon name="trash-outline"></ion-icon></button>' +
      '</div>';
    listEl.appendChild(row);
  });
}

let portfolioModalHandlersBound = false;
let pendingDeletePortfolioId = null;

function getPortfolioFormImageUrlsFromDom() {
  const list = document.getElementById('portfolio-project-images-list');
  if (!list) return [];
  const raw = [];
  list.querySelectorAll('[data-portfolio-image-url]').forEach(function (inp) {
    raw.push(inp.value);
  });
  return portfolioParseImageUrls(raw);
}

function portfolioUpdateSlidesCount(count) {
  const el = document.getElementById('portfolio-slides-count');
  if (!el) return;
  if (!count) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = count + ' / ' + PORTFOLIO_MAX_SLIDES + ' slides';
}

function portfolioTryAddFormImage(rawUrl, options) {
  options = options || {};
  const raw = String(rawUrl != null ? rawUrl : '').trim();
  if (!raw) {
    if (!options.silent) showErrorMessage('Choose a file or enter a URL.');
    return false;
  }
  const normalized = portfolioNormalizeAssetImageUrl(raw);
  if (!normalized) {
    if (!options.silent) showErrorMessage('Enter a valid image path or URL.');
    return false;
  }
  const current = getPortfolioFormImageUrlsFromDom();
  if (current.indexOf(normalized) >= 0) {
    if (!options.silent) showErrorMessage('That image is already in the slideshow.');
    return false;
  }
  if (current.length >= PORTFOLIO_MAX_SLIDES) {
    if (!options.silent) showErrorMessage('Maximum ' + PORTFOLIO_MAX_SLIDES + ' images per project.');
    return false;
  }
  current.push(normalized);
  renderPortfolioFormImagesList(current);
  const input = document.getElementById('portfolio-project-image');
  const select = document.getElementById('portfolio-project-image-asset');
  if (options.clearInput !== false && input) input.value = '';
  if (select) select.value = '';
  syncPortfolioImageAssetSelectFromInput();
  return true;
}

function portfolioReorderFormImages(fromIndex, toIndex) {
  const current = getPortfolioFormImageUrlsFromDom();
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const item = current.splice(fromIndex, 1)[0];
  current.splice(toIndex, 0, item);
  renderPortfolioFormImagesList(current);
}

let portfolioSlidesDragFromIndex = null;

function initPortfolioSlidesListDrag() {
  const list = document.getElementById('portfolio-project-images-list');
  if (!list || list.dataset.dragBound === '1') return;
  list.dataset.dragBound = '1';

  list.addEventListener('dragstart', function (e) {
    if (
      e.target.closest(
        '[data-portfolio-image-url], .portfolio-slides-remove, .portfolio-slides-thumb, .portfolio-project-images-url-input'
      )
    ) {
      e.preventDefault();
      return;
    }
    const item = e.target.closest('.portfolio-project-images-list-item');
    if (!item || !list.contains(item)) return;
    portfolioSlidesDragFromIndex = parseInt(item.getAttribute('data-portfolio-image-index'), 10);
    if (!Number.isFinite(portfolioSlidesDragFromIndex)) return;
    item.classList.add('is-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(portfolioSlidesDragFromIndex));
    }
  });

  list.addEventListener('dragover', function (e) {
    const item = e.target.closest('.portfolio-project-images-list-item');
    if (!item || !list.contains(item)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    list.querySelectorAll('.portfolio-project-images-list-item.is-drag-over').forEach(function (el) {
      el.classList.remove('is-drag-over');
    });
    item.classList.add('is-drag-over');
  });

  list.addEventListener('dragleave', function (e) {
    const item = e.target.closest('.portfolio-project-images-list-item');
    if (item) item.classList.remove('is-drag-over');
  });

  list.addEventListener('drop', function (e) {
    e.preventDefault();
    const item = e.target.closest('.portfolio-project-images-list-item');
    list.querySelectorAll('.portfolio-project-images-list-item.is-drag-over').forEach(function (el) {
      el.classList.remove('is-drag-over');
    });
    if (!item || portfolioSlidesDragFromIndex == null) return;
    const toIndex = parseInt(item.getAttribute('data-portfolio-image-index'), 10);
    if (Number.isFinite(toIndex)) portfolioReorderFormImages(portfolioSlidesDragFromIndex, toIndex);
  });

  list.addEventListener('dragend', function () {
    portfolioSlidesDragFromIndex = null;
    list.querySelectorAll('.portfolio-project-images-list-item.is-dragging').forEach(function (el) {
      el.classList.remove('is-dragging');
    });
    list.querySelectorAll('.portfolio-project-images-list-item.is-drag-over').forEach(function (el) {
      el.classList.remove('is-drag-over');
    });
  });
}

function renderPortfolioFormImagesList(urls) {
  const list = document.getElementById('portfolio-project-images-list');
  const empty = document.getElementById('portfolio-project-images-empty');
  const parsed = portfolioParseImageUrls(urls);
  if (!list) return;

  list.innerHTML = parsed
    .map(function (url, i) {
      const displayPath = portfolioRelativeAssetPathForForm(url);
      const coverBadge =
        i === 0
          ? '<span class="portfolio-slides-cover-badge">Card cover</span>'
          : '';
      return (
        '<li class="portfolio-project-images-list-item" draggable="true" data-portfolio-image-index="' +
        i +
        '">' +
        '<button type="button" class="portfolio-slides-drag" tabindex="-1" aria-hidden="true">' +
        '<ion-icon name="reorder-three-outline"></ion-icon>' +
        '</button>' +
        '<div class="portfolio-slides-thumb">' +
        '<img src="' +
        portfolioEscapeHtml(portfolioDisplayImageSrc(url)) +
        '" alt="" loading="lazy" onerror="portfolioHandleImageError(this)">' +
        '</div>' +
        '<div class="portfolio-slides-item-body">' +
        '<div class="portfolio-slides-item-meta">' +
        '<span class="portfolio-slides-item-index">Slide ' +
        String(i + 1) +
        '</span>' +
        coverBadge +
        '</div>' +
        '<input type="text" class="portfolio-project-images-url-input" data-portfolio-image-url value="' +
        portfolioEscapeHtml(displayPath) +
        '" aria-label="Image path for slide ' +
        String(i + 1) +
        '">' +
        '</div>' +
        '<button type="button" class="portfolio-slides-remove" data-portfolio-image-remove="' +
        i +
        '" title="Remove slide" aria-label="Remove slide ' +
        String(i + 1) +
        '">' +
        '<ion-icon name="trash-outline"></ion-icon>' +
        '</button>' +
        '</li>'
      );
    })
    .join('');

  list.hidden = parsed.length === 0;
  if (empty) empty.hidden = parsed.length > 0;
  portfolioUpdateSlidesCount(parsed.length);
  syncPortfolioProjectImagePreview();
}

function portfolioAddFormImageFromInputs() {
  const input = document.getElementById('portfolio-project-image');
  return portfolioTryAddFormImage(input && input.value);
}

function resetPortfolioSlidesPreviewDetails() {
  const details = document.getElementById('portfolio-slides-preview-details');
  if (details) details.open = false;
}

function initPortfolioSlidesPreviewCollapse() {
  const details = document.getElementById('portfolio-slides-preview-details');
  if (!details || details.dataset.collapseBound === '1') return;
  details.dataset.collapseBound = '1';
  details.addEventListener('toggle', function () {
    if (details.open) syncPortfolioProjectImagePreview();
  });
}

function syncPortfolioProjectImagePreview() {
  const wrap = document.getElementById('portfolio-project-image-preview-wrap');
  const carousel = document.getElementById('portfolio-project-admin-carousel');
  const err = document.getElementById('portfolio-project-image-preview-error');
  const hint = document.getElementById('portfolio-slides-preview-hint');
  if (!wrap || !carousel) return;

  const urls = getPortfolioFormImageUrlsFromDom();
  if (!urls.length) {
    wrap.hidden = true;
    if (err) err.hidden = true;
    resetPortfolioSlidesPreviewDetails();
    return;
  }

  wrap.hidden = false;
  if (err) err.hidden = true;
  if (hint) {
    hint.textContent =
      urls.length +
      (urls.length === 1 ? ' slide' : ' slides') +
      ' — expand to preview';
  }
  const alt =
    String(document.getElementById('portfolio-project-image-alt')?.value || '').trim() ||
    'Slideshow preview';
  portfolioRenderCarousel(carousel, { urls: urls, altBase: alt });
}

function openPortfolioProjectModal(isNew, project) {
  const modal = document.getElementById('portfolio-project-modal');
  const titleEl = document.getElementById('portfolio-project-modal-title');
  const form = document.getElementById('portfolio-project-form');
  if (!modal || !form) return;
  form.reset();
  document.getElementById('portfolio-project-edit-id').value = isNew ? '' : (project && project.id) || '';
  if (titleEl) titleEl.textContent = isNew ? 'New portfolio project' : 'Edit portfolio project';
  if (!isNew && project) {
    document.getElementById('portfolio-project-title').value = project.title || '';
    document.getElementById('portfolio-project-url').value = project.projectUrl || '';
    document.getElementById('portfolio-project-image').value = '';
    document.getElementById('portfolio-project-image-alt').value = project.imageAlt || '';
    renderPortfolioFormImagesList(portfolioImageUrlsFromRecord(project));
    document.getElementById('portfolio-project-description').value = project.description || '';
    document.getElementById('portfolio-project-tech').value = portfolioParseTechTags(project.techTags).join(', ');
    document.getElementById('portfolio-project-outcome').value = project.outcome || '';
    document.getElementById('portfolio-project-buy-now').value = project.buyNowLabel || '';
    document.getElementById('portfolio-project-buy-premium').value = project.buyPremiumLabel || '';
    document.getElementById('portfolio-project-show-quote').checked = project.showQuoteButton !== false;
    document.getElementById('portfolio-project-admin-note').value = project.adminModalNote || '';
    document.getElementById('portfolio-project-bestfor').value = Array.isArray(project.bestFor)
      ? project.bestFor.join('\n')
      : '';
  } else {
    document.getElementById('portfolio-project-show-quote').checked = true;
    renderPortfolioFormImagesList([]);
  }
  populatePortfolioImageAssetSelect();
  syncPortfolioImageAssetSelectFromInput();
  resetPortfolioSlidesPreviewDetails();
  syncPortfolioProjectImagePreview();
  modal.classList.add('active');
  modal.style.display = 'flex';
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  modal.style.zIndex = '9999';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  const ov = document.getElementById('portfolio-project-modal-overlay');
  if (ov) {
    ov.style.opacity = '0.8';
    ov.style.visibility = 'visible';
    ov.style.zIndex = '9998';
  }
  modal.setAttribute('aria-hidden', 'false');
}

function closePortfolioProjectModal() {
  const modal = document.getElementById('portfolio-project-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = '';
  modal.style.visibility = '';
  modal.style.opacity = '';
  modal.style.zIndex = '';
  modal.style.position = '';
  modal.style.top = '';
  modal.style.left = '';
  modal.style.width = '';
  modal.style.height = '';
  const ov = document.getElementById('portfolio-project-modal-overlay');
  if (ov) {
    ov.style.opacity = '';
    ov.style.visibility = '';
    ov.style.zIndex = '';
  }
  modal.setAttribute('aria-hidden', 'true');
}

function setupPortfolioAdminControls() {
  const addBtn = document.getElementById('admin-add-portfolio-btn');
  const form = document.getElementById('portfolio-project-form');
  const cancelBtn = document.getElementById('portfolio-project-form-cancel');
  const closeBtn = document.getElementById('portfolio-project-modal-close');
  const overlay = document.getElementById('portfolio-project-modal-overlay');

  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', function () {
      if (!isAdmin()) {
        showErrorMessage('Admin privileges required.');
        return;
      }
      if (!window.rtdb) {
        showErrorMessage('Realtime Database is not initialized.');
        return;
      }
      openPortfolioProjectModal(true, null);
    });
  }
  populatePortfolioImageAssetSelect();

  const imageAssetSelect = document.getElementById('portfolio-project-image-asset');
  const imageInput = document.getElementById('portfolio-project-image');
  const imageAltInput = document.getElementById('portfolio-project-image-alt');
  const addFromAssetBtn = document.getElementById('portfolio-project-add-from-asset');

  if (imageAssetSelect && !imageAssetSelect.dataset.bound) {
    imageAssetSelect.dataset.bound = '1';
    imageAssetSelect.addEventListener('change', function () {
      if (!imageAssetSelect.value) return;
      portfolioTryAddFormImage(imageAssetSelect.value);
    });
  }
  if (addFromAssetBtn && !addFromAssetBtn.dataset.bound) {
    addFromAssetBtn.dataset.bound = '1';
    addFromAssetBtn.addEventListener('click', function () {
      portfolioTryAddFormImage(imageAssetSelect && imageAssetSelect.value);
    });
  }
  if (imageInput && !imageInput.dataset.previewBound) {
    imageInput.dataset.previewBound = '1';
    imageInput.addEventListener('input', syncPortfolioImageAssetSelectFromInput);
    imageInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        portfolioAddFormImageFromInputs();
      }
    });
  }
  if (imageAltInput && !imageAltInput.dataset.previewBound) {
    imageAltInput.dataset.previewBound = '1';
    imageAltInput.addEventListener('input', syncPortfolioProjectImagePreview);
  }

  const addImageBtn = document.getElementById('portfolio-project-add-image-btn');
  if (addImageBtn && !addImageBtn.dataset.bound) {
    addImageBtn.dataset.bound = '1';
    addImageBtn.addEventListener('click', portfolioAddFormImageFromInputs);
  }

  initPortfolioSlidesListDrag();
  initPortfolioSlidesPreviewCollapse();

  const imagesList = document.getElementById('portfolio-project-images-list');
  if (imagesList && !imagesList.dataset.bound) {
    imagesList.dataset.bound = '1';
    imagesList.addEventListener('click', function (e) {
      const remove = e.target.closest('[data-portfolio-image-remove]');
      if (!remove) return;
      e.preventDefault();
      const idx = parseInt(remove.getAttribute('data-portfolio-image-remove'), 10);
      const current = getPortfolioFormImageUrlsFromDom();
      current.splice(idx, 1);
      renderPortfolioFormImagesList(current);
    });
    imagesList.addEventListener('input', function (e) {
      if (e.target.matches('[data-portfolio-image-url]')) {
        syncPortfolioProjectImagePreview();
      }
    });
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!isAdmin()) {
        showErrorMessage('Admin privileges required.');
        return;
      }
      if (!window.rtdb) {
        showErrorMessage('Realtime Database is not initialized.');
        return;
      }
      const editId = document.getElementById('portfolio-project-edit-id').value.trim();
      const formImageUrls = getPortfolioFormImageUrlsFromDom();
      const pendingUrl = portfolioNormalizeAssetImageUrl(
        document.getElementById('portfolio-project-image').value
      );
      if (pendingUrl && formImageUrls.indexOf(pendingUrl) < 0) {
        formImageUrls.push(pendingUrl);
      }
      const payload = {
        title: document.getElementById('portfolio-project-title').value,
        projectUrl: document.getElementById('portfolio-project-url').value,
        imageUrls: formImageUrls,
        imageUrl: formImageUrls.length ? formImageUrls[0] : '',
        imageAlt: document.getElementById('portfolio-project-image-alt').value,
        description: document.getElementById('portfolio-project-description').value,
        techTags: document.getElementById('portfolio-project-tech').value,
        outcome: document.getElementById('portfolio-project-outcome').value,
        buyNowLabel: document.getElementById('portfolio-project-buy-now').value,
        buyPremiumLabel: document.getElementById('portfolio-project-buy-premium').value,
        showQuoteButton: document.getElementById('portfolio-project-show-quote').checked,
        adminModalNote: document.getElementById('portfolio-project-admin-note').value,
        bestFor: document
          .getElementById('portfolio-project-bestfor')
          .value.split(/\r?\n/)
          .map(function (l) { return l.trim(); })
          .filter(Boolean)
      };
      try {
        if (editId) {
          const existing = portfolioProjectsRtdb.find(function (x) { return x.id === editId; });
          payload.order = existing ? portfolioNumericOrder(existing) : 0;
          await updatePortfolioProjectDoc(editId, payload);
          showSuccessMessage('Project updated.');
        } else {
          payload.order = getNextPortfolioOrderValue();
          await saveNewPortfolioProject(payload);
          showSuccessMessage('Project created.');
        }
        closePortfolioProjectModal();
        await loadPortfolioProjectsFromRtdb();
        renderPublicPortfolioProjects();
        applyCurrentPortfolioFilter();
        renderAdminPortfolioProjects();
        syncAdminPortfolioLocalBanner();
        if (typeof window.__renderPortfolioBestForHook === 'function') {
          window.__renderPortfolioBestForHook();
        }
      } catch (err) {
        console.error(err);
        showErrorMessage(err.message || 'Save failed.');
      }
    });
  }
  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = '1';
    cancelBtn.addEventListener('click', closePortfolioProjectModal);
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = '1';
    closeBtn.addEventListener('click', closePortfolioProjectModal);
  }
  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', closePortfolioProjectModal);
  }

  const listEl = document.getElementById('admin-portfolio-projects-list');
  if (listEl && !listEl.dataset.delegateBound) {
    listEl.dataset.delegateBound = '1';
    listEl.addEventListener('click', async function (e) {
      const orderUpBtn = e.target.closest('[data-portfolio-order-up]');
      const orderDownBtn = e.target.closest('[data-portfolio-order-down]');
      const editBtn = e.target.closest('[data-edit-portfolio]');
      const delBtn = e.target.closest('[data-delete-portfolio]');
      if (orderUpBtn || orderDownBtn) {
        if (!isAdmin()) {
          showErrorMessage('Admin privileges required.');
          return;
        }
        if (!window.rtdb) {
          showErrorMessage('Realtime Database is not initialized.');
          return;
        }
        const attr = orderUpBtn ? 'data-portfolio-order-up' : 'data-portfolio-order-down';
        const id = (orderUpBtn || orderDownBtn).getAttribute(attr);
        portfolioProjectsRtdb.sort(comparePortfolioProjectsByOrder);
        const currentIndex = portfolioProjectsRtdb.findIndex(function (x) { return x.id === id; });
        if (currentIndex < 0) return;
        const targetIndex = orderUpBtn ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= portfolioProjectsRtdb.length) return;
        const current = portfolioProjectsRtdb[currentIndex];
        const neighbor = portfolioProjectsRtdb[targetIndex];
        const currentPayload = Object.assign({}, current, { order: portfolioNumericOrder(neighbor) });
        const neighborPayload = Object.assign({}, neighbor, { order: portfolioNumericOrder(current) });
        try {
          await Promise.all([
            updatePortfolioProjectDoc(current.id, currentPayload),
            updatePortfolioProjectDoc(neighbor.id, neighborPayload)
          ]);
          await loadPortfolioProjectsFromRtdb();
          renderPublicPortfolioProjects();
          applyCurrentPortfolioFilter();
          renderAdminPortfolioProjects();
          syncAdminPortfolioLocalBanner();
          if (typeof window.__renderPortfolioBestForHook === 'function') {
            window.__renderPortfolioBestForHook();
          }
        } catch (err) {
          console.error(err);
          showErrorMessage(err.message || 'Unable to update sort order.');
        }
        return;
      }
      if (editBtn) {
        const id = editBtn.getAttribute('data-edit-portfolio');
        const p = portfolioProjectsRtdb.find(function (x) { return x.id === id; });
        if (p) openPortfolioProjectModal(false, p);
      }
      if (delBtn) {
        const id = delBtn.getAttribute('data-delete-portfolio');
        pendingDeletePortfolioId = id;
        openDeletePortfolioConfirmModal();
      }
    });
  }

  setupDeletePortfolioConfirmModal();
}

function openDeletePortfolioConfirmModal() {
  const modal = document.getElementById('delete-portfolio-confirm-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  const cancelBtn = document.getElementById('delete-portfolio-confirm-cancel');
  if (cancelBtn) {
    setTimeout(function () {
      cancelBtn.focus();
    }, 40);
  }
}

function closeDeletePortfolioConfirmModal() {
  const modal = document.getElementById('delete-portfolio-confirm-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  pendingDeletePortfolioId = null;
}

function setupDeletePortfolioConfirmModal() {
  const modal = document.getElementById('delete-portfolio-confirm-modal');
  if (!modal || modal.dataset.portfolioDelBound) return;
  modal.dataset.portfolioDelBound = '1';
  const overlay = document.getElementById('delete-portfolio-confirm-overlay');
  const btnClose = document.getElementById('delete-portfolio-confirm-close');
  const btnCancel = document.getElementById('delete-portfolio-confirm-cancel');
  const btnDelete = document.getElementById('delete-portfolio-confirm-delete');
  function close() {
    closeDeletePortfolioConfirmModal();
  }
  [overlay, btnClose, btnCancel].forEach(function (el) {
    if (el) el.addEventListener('click', close);
  });
  if (btnDelete) {
    btnDelete.addEventListener('click', async function () {
      if (!pendingDeletePortfolioId || !window.rtdb) {
        close();
        return;
      }
      try {
        await deletePortfolioProjectDoc(pendingDeletePortfolioId);
        showSuccessMessage('Project deleted.');
        close();
        await loadPortfolioProjectsFromRtdb();
        renderPublicPortfolioProjects();
        applyCurrentPortfolioFilter();
        renderAdminPortfolioProjects();
        syncAdminPortfolioLocalBanner();
        if (typeof window.__renderPortfolioBestForHook === 'function') {
          window.__renderPortfolioBestForHook();
        }
      } catch (err) {
        console.error(err);
        showErrorMessage(err.message || 'Delete failed.');
      }
    });
  }
  document.addEventListener(
    'keydown',
    function portfolioDelEsc(ev) {
      if (ev.key !== 'Escape') return;
      const m = document.getElementById('delete-portfolio-confirm-modal');
      if (!m || !m.classList.contains('active')) return;
      ev.stopImmediatePropagation();
      close();
    },
    true
  );
}


// Portfolio filters (industry niches only; all projects visible by default)
initPortfolioFilterControls();

/**
 * POST to Firebase sendPortfolioEmail (Resend). apiUrl from window.RESEND_EMAIL_CONFIG.
 * @param {{ type: string, payload: Record<string, string> }} body
 * @param {{ requireAdmin?: boolean }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
async function sendPortfolioEmailRequest(body, options) {
  const apiUrl =
    window.RESEND_EMAIL_CONFIG && String(window.RESEND_EMAIL_CONFIG.apiUrl || "").trim();
  if (!apiUrl) {
    throw new Error(
      "Email API URL is not configured. Set RESEND_EMAIL_CONFIG.apiUrl in assets/js/config.js after deploying sendPortfolioEmail (see RESEND_SETUP.md)."
    );
  }
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (options && options.requireAdmin) {
    const token = await getAdminIdToken();
    headers.Authorization = "Bearer " + token;
  }
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch (parseErr) {
    /* ignore */
  }
  if (!res.ok || !data.ok) {
    const msg = (data && data.error) || res.statusText || "Email request failed";
    throw new Error(typeof msg === "string" ? msg : "Email request failed");
  }
  return data;
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

// Enhanced form submission — portfolio email via Resend (HTTPS function)
forms.forEach((form) => {
form.addEventListener("submit", async function(e) {
  e.preventDefault();
    
    const formBtn = form._formBtn;
    const formMessage = form._formMessage;
    const formError = form._formError;
    const isHireMeForm = form.closest('[data-page="hire-me"]') !== null;
    const isContactForm = form.closest('[data-page="contact"]') !== null;
  
  // Hide any existing inline messages (hire-me still uses them when not showing submitted state)
    if (!isContactForm) {
      if (formMessage) formMessage.style.display = 'none';
      if (formError) formError.style.display = 'none';
    }
  
  // Show loading state
    showFormLoading(formBtn, isHireMeForm);
  
  try {
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
    
    const subject = isHireMeForm
      ? 'New Hire Me Inquiry - Portfolio'
      : 'New Contact Form Submission - Portfolio';

    const emailPayload = {
      fullname: String(fullname),
      email: String(email),
      message: String(message),
      subject,
      timestamp: new Date().toISOString(),
      website: window.location.href,
      user_agent: navigator.userAgent,
      project_type: isHireMeForm ? String(projectType) : '',
      budget: isHireMeForm ? String(budget) : ''
    };

    await sendPortfolioEmailRequest({
      type: isHireMeForm ? 'hire_me' : 'contact',
      payload: emailPayload
    });

      // Save to Firestore after successful email send
      try {
        await saveMessageToFirestore({
          name: fullname,
          email: email,
          message: String(message),
          subject,
          timestamp: window.serverTimestamp(),
          status: 'new',
          source: isHireMeForm ? 'hire-me' : 'contact',
          ...(isHireMeForm
            ? { project_type: String(projectType), budget: String(budget) }
            : {})
        });
        console.log('Message saved to Firestore');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        // Don't fail the form submission if Firestore fails, just log it
      }

      const hireArticle = form.closest('[data-page="hire-me"]');
      const hireMain = hireArticle?.querySelector('[data-hire-main-content]');
      const hirePanel = hireArticle?.querySelector('[data-hire-form-panel]');
      const hireSubmitted = hireArticle?.querySelector('[data-hire-form-submitted]');
      const showHireSuccessState = isHireMeForm && hireSubmitted && (hireMain || hirePanel);

      if (showHireSuccessState) {
        if (hireMain) hireMain.hidden = true;
        else if (hirePanel) hirePanel.hidden = true;
        hireSubmitted.classList.remove('hire-form-submitted--animating');
        hireSubmitted.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            hireSubmitted.classList.add('hire-form-submitted--animating');
          });
        });
        hireSubmitted.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      } else if (isContactForm) {
        showSuccessMessage("Message sent successfully! I'll get back to you soon.");
      } else {
        showFormSuccess(formMessage, formError);
      }

      form.reset();
      formBtn.setAttribute("disabled", "");
    
  } catch (error) {
    console.error('Form submission error:', error);
      if (isContactForm) {
        const msg =
          error && error.message === 'Please fill in all required fields'
            ? error.message
            : 'Failed to send message. Please try again.';
        showErrorMessage(msg);
      } else {
        showFormError(formMessage, formError);
      }
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
      console.warn('Firestore not initialized; email may still have been sent via Resend.');
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

// Track project clicks + modern project detail modal (delegated on #portfolio-project-list)
function initPortfolioProjectModal() {
  const modal = document.getElementById('project-detail-modal');
  const overlay = document.getElementById('project-detail-overlay');
  const closeBtn = document.getElementById('project-detail-close');
  const detailCarousel = document.getElementById('project-detail-carousel');
  const outcomeSection = document.getElementById('project-detail-outcome-section');
  const title = document.getElementById('project-detail-title');
  const description = document.getElementById('project-detail-description');
  const tech = document.getElementById('project-detail-tech');
  const outcome = document.getElementById('project-detail-outcome');
  const admin = document.getElementById('project-detail-admin');
  const liveBtn = document.getElementById('project-detail-live');
  const buyNowBtn = document.getElementById('project-detail-buy-now');
  const buyPremiumBtn = document.getElementById('project-detail-buy-premium');
  const quoteBtn = document.getElementById('project-detail-quote');
  const bestForSection = document.getElementById('project-detail-bestfor-section');
  const bestForList = document.getElementById('project-detail-bestfor-list');

  // Hard reset modal state on init so it never renders open by default.
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('project-modal-open');

  function renderPortfolioBestForSections() {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card) => {
      const titleNode = card.querySelector('.project-title');
    const bestForContainer =
      card.querySelector('.project-bestfor-card') || card.querySelector('.project-details-card');
    const existingSection = card.querySelector('.project-fit-section');
    if (!titleNode || !bestForContainer || existingSection) return;

      const titleText = titleNode.textContent.trim();
      const rowItem = card.closest('.project-item');
      const pid = rowItem ? rowItem.getAttribute('data-portfolio-id') : null;
      let customBest = null;
      if (pid && window.portfolioProjects) {
        const rec = window.portfolioProjects.find(function (x) {
          return x.id === pid;
        });
        if (rec && Array.isArray(rec.bestFor) && rec.bestFor.length) {
          customBest = rec.bestFor;
        }
      }
      const preset = PORTFOLIO_DETAIL_PRESETS[titleText];
      const bestForItems =
        customBest || preset?.bestFor || portfolioGetDefaultBestFor(titleText, '');

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

      bestForContainer.appendChild(section);
    });
  }

  const PROJECT_SHEET_SNAPS = [0.5, 0.78, 0.94];
  let projectSheetSnapIndex = 1;
  let projectSheetDragBound = false;

  function isProjectSheetViewport() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function getProjectDetailContent() {
    return modal ? modal.querySelector('.project-detail-content') : null;
  }

  function applyProjectSheetSnap(index) {
    const content = getProjectDetailContent();
    if (!content || !isProjectSheetViewport()) return;
    projectSheetSnapIndex = Math.max(0, Math.min(PROJECT_SHEET_SNAPS.length - 1, index));
    content.style.setProperty(
      '--project-sheet-height',
      (PROJECT_SHEET_SNAPS[projectSheetSnapIndex] * 100).toFixed(1) + 'dvh'
    );
    content.dataset.sheetSnap = String(projectSheetSnapIndex);
  }

  function resetProjectSheetHeight() {
    const content = getProjectDetailContent();
    if (!content) return;
    content.style.removeProperty('--project-sheet-height');
    content.classList.remove('is-sheet-dragging');
    delete content.dataset.sheetSnap;
  }

  function initProjectDetailSheetDrag() {
    const content = getProjectDetailContent();
    const grab = document.getElementById('project-detail-sheet-grab');
    if (!content || !grab || projectSheetDragBound) return;
    projectSheetDragBound = true;

    let dragging = false;
    let startY = 0;
    let startHeightPx = 0;

    function pointerStart(clientY) {
      if (!isProjectSheetViewport()) return;
      dragging = true;
      startY = clientY;
      startHeightPx = content.getBoundingClientRect().height;
      content.classList.add('is-sheet-dragging');
    }

    function pointerMove(clientY) {
      if (!dragging) return;
      const delta = startY - clientY;
      const minH = window.innerHeight * PROJECT_SHEET_SNAPS[0];
      const maxH = window.innerHeight * PROJECT_SHEET_SNAPS[PROJECT_SHEET_SNAPS.length - 1];
      const next = Math.max(minH, Math.min(maxH, startHeightPx + delta));
      content.style.setProperty('--project-sheet-height', Math.round(next) + 'px');
    }

    function pointerEnd() {
      if (!dragging) return;
      dragging = false;
      content.classList.remove('is-sheet-dragging');
      const ratio = content.getBoundingClientRect().height / window.innerHeight;
      let nearest = 0;
      let best = Infinity;
      PROJECT_SHEET_SNAPS.forEach(function (snap, i) {
        const dist = Math.abs(ratio - snap);
        if (dist < best) {
          best = dist;
          nearest = i;
        }
      });
      applyProjectSheetSnap(nearest);
    }

    grab.addEventListener('pointerdown', function (e) {
      if (!isProjectSheetViewport()) return;
      grab.setPointerCapture(e.pointerId);
      pointerStart(e.clientY);
    });
    grab.addEventListener('pointermove', function (e) {
      if (dragging) pointerMove(e.clientY);
    });
    grab.addEventListener('pointerup', function (e) {
      try {
        grab.releasePointerCapture(e.pointerId);
      } catch (err) {
        // no-op
      }
      pointerEnd();
    });
    grab.addEventListener('pointercancel', pointerEnd);

    window.addEventListener('resize', function () {
      if (!modal || !modal.classList.contains('active')) return;
      if (isProjectSheetViewport()) applyProjectSheetSnap(projectSheetSnapIndex);
      else resetProjectSheetHeight();
    });
  }

  function closeProjectModal() {
    if (!modal) return;
    // Prevent aria-hidden warning when close button still holds focus.
    if (document.activeElement && modal.contains(document.activeElement)) {
      try {
        document.activeElement.blur();
      } catch (e) {
        // no-op
      }
    }
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('project-modal-open');
    projectSheetSnapIndex = 1;
    resetProjectSheetHeight();
  }

  function openProjectModal() {
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('project-modal-open');
    initProjectDetailSheetDrag();
    if (isProjectSheetViewport()) applyProjectSheetSnap(projectSheetSnapIndex);
    else resetProjectSheetHeight();
  }

  function fillProjectModal(card, link) {
    const cardImage = card.querySelector('.project-img img');
    const cardTitle = card.querySelector('.project-title');
    const cardDescription = card.querySelector('.project-description');
    const liveUrl = (link.getAttribute('href') || '').trim();
    const hasLiveUrl = liveUrl && liveUrl !== '#' && !liveUrl.startsWith('#');

    const titleText = cardTitle ? cardTitle.textContent.trim() : 'Project';
    let descriptionText = cardDescription ? cardDescription.textContent.trim() : '';
    const projectPreset = PORTFOLIO_DETAIL_PRESETS[titleText];
    const rowItem = card.closest('.project-item');
    const pid = rowItem ? rowItem.getAttribute('data-portfolio-id') : null;
    let record = null;
    if (pid && window.portfolioProjects) {
      record = window.portfolioProjects.find(function (x) {
        return x.id === pid;
      });
    }

    // Card markup is intentionally minimal; rely on the source record for modal description.
    if (record && record.description != null) {
      const d = String(record.description).trim();
      if (d) descriptionText = d;
    }

    var slideUrls = record ? portfolioImageUrlsFromRecord(record) : [];
    if (!slideUrls.length && cardImage && cardImage.getAttribute('src')) {
      var cardSrc = cardImage.getAttribute('src') || '';
      var fromCard = portfolioNormalizeAssetImageUrl(
        cardSrc.replace(/\?v=[^&]+/, '').replace(/^https?:\/\/[^/]+/, '')
      );
      if (fromCard) slideUrls = [fromCard];
    }
    if (detailCarousel) {
      portfolioRenderCarousel(detailCarousel, {
        urls: slideUrls,
        altBase:
          (record && record.imageAlt) ||
          (cardImage && cardImage.getAttribute('alt')) ||
          titleText ||
          'Project preview'
      });
    }
    if (title) title.textContent = titleText;
    if (description) portfolioSetMultilineElement(description, descriptionText);
    if (tech) {
      const tags = record ? portfolioTechTagsFromRecord(record) : [];
      if (tags.length) {
        tech.innerHTML = tags
          .map(function (tag) {
            return '<span class="tech-tag">' + portfolioEscapeHtml(String(tag)) + '</span>';
          })
          .join('');
        tech.hidden = false;
      } else {
        tech.innerHTML = '';
        tech.hidden = true;
      }
    }
    if (outcome) {
      const outcomeText = record && record.outcome != null ? String(record.outcome).trim() : '';
      if (outcomeText) {
        portfolioSetMultilineElement(outcome, outcomeText);
        outcome.hidden = false;
        if (outcomeSection) outcomeSection.hidden = false;
      } else {
        outcome.textContent = '';
        outcome.hidden = true;
        if (outcomeSection) outcomeSection.hidden = true;
      }
    }

    if (admin) {
      if (record && record.adminModalNote && String(record.adminModalNote).trim()) {
        portfolioSetMultilineElement(admin, record.adminModalNote);
      } else if (projectPreset?.admin) {
        portfolioSetMultilineElement(admin, projectPreset.admin);
      } else {
        admin.textContent =
          'Admin page focus: central management panel for operations, user actions, and business updates.';
      }
    }

    if (bestForList && bestForSection) {
      var bestForItems = [];
      if (record && Array.isArray(record.bestFor) && record.bestFor.length) {
        bestForItems = record.bestFor;
      } else if (projectPreset && Array.isArray(projectPreset.bestFor) && projectPreset.bestFor.length) {
        bestForItems = projectPreset.bestFor;
      } else {
        bestForItems = portfolioGetDefaultBestFor(titleText, '');
      }
      if (bestForItems.length) {
        bestForList.innerHTML = bestForItems
          .map(function (item) {
            return (
              '<li>' + portfolioEscapeHtml(String(item).trim()) + '</li>'
            );
          })
          .join('');
        bestForSection.hidden = false;
      } else {
        bestForList.innerHTML = '';
        bestForSection.hidden = true;
      }
    }

    if (liveBtn) {
      if (hasLiveUrl) {
        liveBtn.href = liveUrl;
        liveBtn.hidden = false;
      } else {
        liveBtn.href = '#';
        liveBtn.hidden = true;
      }
    }
    const showBuyButtons = window.PORTFOLIO_SHOW_BUY_BUTTONS === true;
    if (buyNowBtn) {
      const buyNowLabel = record && record.buyNowLabel != null ? String(record.buyNowLabel).trim() : '';
      if (showBuyButtons && buyNowLabel) {
        buyNowBtn.innerHTML = portfolioDetailBtnHtml('cart-outline', buyNowLabel);
        buyNowBtn.hidden = false;
      } else {
        buyNowBtn.hidden = true;
      }
    }
    if (buyPremiumBtn) {
      const buyPremiumLabel =
        record && record.buyPremiumLabel != null ? String(record.buyPremiumLabel).trim() : '';
      if (showBuyButtons && buyPremiumLabel) {
        buyPremiumBtn.innerHTML = portfolioDetailBtnHtml('star-outline', buyPremiumLabel);
        buyPremiumBtn.hidden = false;
      } else {
        buyPremiumBtn.hidden = true;
      }
    }
  }

  const listRoot = document.getElementById('portfolio-project-list');
  if (listRoot && !portfolioModalHandlersBound) {
    portfolioModalHandlersBound = true;
    listRoot.addEventListener('click', function (event) {
      const link = event.target.closest('.project-link');
      if (!link) return;
      const projectCard = link.closest('.project-card');
      const projectTitle =
        projectCard?.querySelector('.project-title')?.textContent || 'Unknown Project';
      trackEvent('project_click', projectTitle, 'Portfolio');

      if (!modal || !projectCard) return;
      event.preventDefault();
      fillProjectModal(projectCard, link);
      openProjectModal();
    });
  }

  window.__renderPortfolioBestForHook = function () {
    renderPortfolioBestForSections();
  };

  renderPortfolioBestForSections();
  initProjectDetailSheetDrag();

  if (closeBtn && !closeBtn.dataset.portfolioDetailBound) {
    closeBtn.dataset.portfolioDetailBound = '1';
    closeBtn.addEventListener('click', closeProjectModal);
  }
  if (overlay && !overlay.dataset.portfolioDetailBound) {
    overlay.dataset.portfolioDetailBound = '1';
    overlay.addEventListener('click', closeProjectModal);
  }

  if (quoteBtn && !quoteBtn.dataset.portfolioDetailBound) {
    quoteBtn.dataset.portfolioDetailBound = '1';
    quoteBtn.addEventListener('click', function (event) {
      event.preventDefault();
      closeProjectModal();
      if (typeof switchToPage === 'function') {
        switchToPage('contact');
      }
    });
  }
  if (buyNowBtn && !buyNowBtn.dataset.portfolioDetailBound) {
    buyNowBtn.dataset.portfolioDetailBound = '1';
    buyNowBtn.addEventListener('click', function (event) {
      event.preventDefault();
      closeProjectModal();
      if (typeof switchToPage === 'function') {
        switchToPage('contact');
      }
    });
  }
  if (buyPremiumBtn && !buyPremiumBtn.dataset.portfolioDetailBound) {
    buyPremiumBtn.dataset.portfolioDetailBound = '1';
    buyPremiumBtn.addEventListener('click', function (event) {
      event.preventDefault();
      closeProjectModal();
      if (typeof switchToPage === 'function') {
        switchToPage('contact');
      }
    });
  }

  if (!document.documentElement.dataset.portfolioModalEsc) {
    document.documentElement.dataset.portfolioModalEsc = '1';
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeProjectModal();
      }
    });
  }
}



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Valid path segments for rubenjimenez.dev/(tab)
var VALID_PAGES = ['about', 'home', 'resume', 'portfolio', 'blog', 'service-pricing', 'services-pricing', 'hire-me', 'contact', 'messages', 'admin'];

function getPageFromPath() {
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '') || '';
  if (path === '') return null;
  if (path === 'home') return 'about';
  if (path === 'service-pricing') return 'services-pricing';
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
    if (normalized === 'service-pricing') return 'services-pricing';
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
  if (pageName !== 'messages' && typeof window.dismissCustomerDmSheetForNavigation === 'function') {
    window.dismissCustomerDmSheetForNavigation();
  }
  // First, remove active class from all pages and navigation links
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  for (let i = 0; i < navigationLinks.length; i++) {
    navigationLinks[i].classList.remove("active");
  }
  document.body.classList.remove("admin-page-active");
  
  // Find and activate the matching page
  for (let i = 0; i < pages.length; i++) {
    if (pageName === pages[i].dataset.page) {
      pages[i].classList.add("active");
      if (pageName === "admin") {
        document.body.classList.add("admin-page-active");
      }
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
        if (navPageName === "dm") {
          navPageName = "messages";
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

      // Dynamic testimonials when Home (about) is shown
      if (pageName === "about") {
        setTimeout(function () {
          if (typeof window.loadDynamicTestimonials === "function") {
            window.loadDynamicTestimonials();
          }
        }, 80);
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
          if (isAdmin()) {
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
    } else if (pageName === "dm") {
      pageName = "messages";
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

/** True when URL is for standalone testimonial.html but the SPA shell (index) was served instead. */
function isTestimonialUrlServedAsSpaShell() {
  try {
    var p = (window.location.pathname || '').toLowerCase();
    if (p.indexOf('testimonial') === -1) return false;
    if (document.getElementById('testimonial-form')) return false;
    return !!document.querySelector('article.about[data-page="about"]');
  } catch (e) {
    return false;
  }
}

// Restore active page from URL path or localStorage on page load with loading animation
function restoreActivePage() {
  var loadingScreen = document.getElementById('loading-screen');
  var redirectPage = getPageFromRedirectParam();
  var pageFromPath = getPageFromPath();
  var savedPage = localStorage.getItem('activePage');
  // If /testimonial(.html) was rewritten to index.html, do not apply last SPA tab (often "contact").
  if (isTestimonialUrlServedAsSpaShell()) {
    savedPage = null;
    pageFromPath = null;
    redirectPage = null;
  }
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
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminDashboardContent = document.getElementById('admin-dashboard-content');
  const adminLoginError = document.getElementById('admin-login-error');
  const messagesList = document.getElementById('firestore-messages-list');

  /** Unsubscribe from prior Firestore snapshot when refresh re-runs fetchMessages */
  let firestoreMessagesUnsubscribe = null;

  /** Latest Firestore contact submissions (for table + drawer + reply). */
  let lastContactFormMessages = [];
  let contactMessagesSort = { key: 'date', dir: 'desc' };
  let contactDetailOpenId = null;

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

      const app = window.initializeApp(firebaseConfig);
      const db = window.getFirestore(app);
      window.db = db;

      if (typeof window.getDatabase === 'function' && firebaseConfig.databaseURL) {
        window.rtdb = window.getDatabase(app);
      } else {
        window.rtdb = null;
        console.warn('Realtime Database not initialized (missing getDatabase or databaseURL).');
      }

      if (typeof window.getAuth === 'function') {
        window.firebaseAuth = window.getAuth(app);
      }

      console.log('Firebase initialized successfully');
      console.log(
        'Firebase project:',
        firebaseConfig.projectId,
        '| authDomain:',
        firebaseConfig.authDomain,
        '| page host:',
        window.location.hostname,
        '| admin auth: local (admin / admin123)'
      );
      console.log('Firestore database:', window.db);
      console.log('Realtime Database:', window.rtdb);
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

  // Initialize Firebase when DOM is ready (load portfolio from Realtime Database before admin session UI)
  document.addEventListener('DOMContentLoaded', async function() {
    // Check if running locally (file:// protocol) which can cause CORS issues
    if (window.location.protocol === 'file:') {
      console.warn('Running locally with file:// protocol. Firestore may not work properly. Deploy to a web server for full functionality.');
    }

    async function bootstrapPortfolioUi() {
      try {
        await loadPortfolioProjectsFromRtdb();
        renderPublicPortfolioProjects();
        applyCurrentPortfolioFilter();
        initPortfolioProjectModal();
        setupPortfolioAdminControls();
        syncAdminPortfolioLocalBanner();
        ensurePortfolioRenderCompletes();
      } catch (err) {
        console.error('Portfolio bootstrap failed', err);
        renderPublicPortfolioProjects();
        applyCurrentPortfolioFilter();
        initPortfolioProjectModal();
        ensurePortfolioRenderCompletes();
      }
    }

    /**
     * Last-resort guard: if loading placeholder still exists after bootstrap,
     * force a render from effective (RTDB or built-in) project data.
     */
    function ensurePortfolioRenderCompletes() {
      window.setTimeout(function () {
        const list = document.getElementById('portfolio-project-list');
        if (!list) return;
        const loadingText = list.querySelector('.portfolio-projects-loading-text');
        if (!loadingText) return;
        const text = String(loadingText.textContent || '').toLowerCase();
        if (text.indexOf('loading projects') === -1) return;
        console.warn('Portfolio list still showing loading placeholder; forcing fallback render.');
        renderPublicPortfolioProjects();
        applyCurrentPortfolioFilter();
      }, 1200);
    }

    if (initializeFirebase()) {
      try {
        await loadBlogPostsFromFirestore();
        renderBlogPosts();
        if (typeof renderAdminBlogPosts === 'function') renderAdminBlogPosts();
      } catch (blogErr) {
        console.error('Post-init blog refresh failed', blogErr);
      }
      await bootstrapPortfolioUi();
      await initAdminSession();
      setupAdminEventListeners();
      if (typeof updateAuthUI === 'function') updateAuthUI();
      if (typeof window.loadDynamicTestimonials === 'function') {
        window.loadDynamicTestimonials();
      }
    } else {
      console.error('Firebase initialization failed');
      await bootstrapPortfolioUi();
      await initAdminSession();
      setupAdminEventListeners();
      if (typeof updateAuthUI === 'function') updateAuthUI();
    }
    
    // Initial resolution log
    logWindowResolution();
  });

  // Test Firestore connectivity (legacy contact submissions, blog, etc.)
  function testFirestoreConnection() {
    if (!window.db) return;

    try {
      const testRef = window.collection(window.db, 'messages');
      console.log('Firestore connection test: collection reference created');
    } catch (error) {
      console.error('Firestore connection test failed:', error);
    }
  }

  function escapeTestimonialHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function testimonialsStarHtml(rating) {
    var n = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    var i;
    var out =
      '<p class="testimonials-rating" aria-label="' +
      n +
      ' out of 5 stars" style="margin:0 0 10px 0;letter-spacing:3px;color:hsl(45,54%,58%);font-size:14px;">';
    for (i = 1; i <= 5; i++) {
      out += n >= i ? "&#9733;" : "&#9734;";
    }
    out += "</p>";
    return out;
  }

  function testimonialCreatedMs(d) {
    var c = d && d.createdAt;
    if (!c) return 0;
    if (typeof c.toMillis === "function") return c.toMillis();
    if (typeof c.seconds === "number") return c.seconds * 1000 + (c.nanoseconds || 0) / 1e6;
    return 0;
  }

  function testimonialDateIso(d) {
    var ms = testimonialCreatedMs(d);
    if (!ms) return "";
    try {
      return new Date(ms).toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  }

  function testimonialDateLabel(d) {
    var ms = testimonialCreatedMs(d);
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  async function loadDynamicTestimonials() {
    if (!window.db || !window.collection || !window.getDocs) {
      return;
    }
    var list =
      document.querySelector("article.about .testimonials-list") ||
      document.querySelector(".testimonials-list");
    if (!list) return;
    try {
      var ref = window.collection(window.db, "testimonials");
      var snap = await window.getDocs(ref);
      var rows = [];
      snap.forEach(function (docSnap) {
        rows.push({ id: docSnap.id, data: docSnap.data() });
      });
      rows.sort(function (a, b) {
        return testimonialCreatedMs(b.data) - testimonialCreatedMs(a.data);
      });
      rows = rows.slice(0, 40);
      list.querySelectorAll('li[data-dynamic-testimonial="1"]').forEach(function (n) {
        n.remove();
      });
      rows.forEach(function (row) {
        var d = row.data;
        var iso = testimonialDateIso(d);
        var label = testimonialDateLabel(d);
        var dateAttrs = "";
        if (iso || label) {
          dateAttrs =
            ' data-created-iso="' +
            escapeTestimonialHtml(iso) +
            '" data-created-label="' +
            escapeTestimonialHtml(label) +
            '"';
        }
        var name = escapeTestimonialHtml(d.name);
        var title = escapeTestimonialHtml(d.title);
        var company = escapeTestimonialHtml(d.company);
        var product = escapeTestimonialHtml(d.product);
        var textRaw = d.text == null ? "" : String(d.text);
        var text = escapeTestimonialHtml(textRaw).replace(/\n/g, "<br>");
        var rating = d.rating;
        var brand =
          (typeof window.TESTIMONIAL_BRAND_LOGO === "string" && window.TESTIMONIAL_BRAND_LOGO.trim()) ||
          "./assets/images/logo.svg";
        var imgSrc = brand.indexOf('"') === -1 ? brand : "./assets/images/logo.svg";
        var li = document.createElement("li");
        li.className = "testimonials-item";
        li.setAttribute("data-dynamic-testimonial", "1");
        li.innerHTML =
          '<div class="content-card" data-testimonials-item' +
          dateAttrs +
          '>' +
          '<figure class="testimonials-avatar-box">' +
          '<img src="' +
          imgSrc +
          '" alt="' +
          name +
          '" width="60" data-testimonials-avatar>' +
          "</figure>" +
          '<h4 class="h4 testimonials-item-title" data-testimonials-title>' +
          name +
          "</h4>" +
          '<div class="testimonials-text" data-testimonials-text>' +
          testimonialsStarHtml(rating) +
          '<p class="testimonials-meta" style="font-size:12px;margin:0 0 10px 0;opacity:0.85;">' +
          title +
          " &middot; " +
          company +
          (product ? " &middot; " + product : "") +
          "</p>" +
          "<p>" +
          text +
          "</p>" +
          "</div></div>";
        list.appendChild(li);
      });
    } catch (e) {
      console.error("loadDynamicTestimonials", e);
    }
  }

  window.loadDynamicTestimonials = loadDynamicTestimonials;

  window.addEventListener('load', function () {
    setTimeout(function () {
      if (typeof window.loadDynamicTestimonials === 'function') {
        window.loadDynamicTestimonials();
      }
    }, 400);
  });

  async function loadTestimonialAdminPanel() {
    var combined = document.getElementById("admin-testimonials-combined-list");
    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    if (!combined) return;
    if (!window.db || !window.collection || !window.getDocs) {
      combined.innerHTML =
        '<div class="empty-item"><p>Firestore is not ready yet. Refresh in a moment.</p></div>';
      return;
    }
    if (!isAdmin()) {
      combined.innerHTML =
        '<div class="empty-item"><p>Open this tab while signed in to load invites and submissions.</p></div>';
      return;
    }
    try {
      var tRef = window.collection(window.db, "testimonialTokens");
      var tsnap = await window.getDocs(tRef);
      var tRows = [];
      tsnap.forEach(function (d) {
        tRows.push({ id: d.id, data: d.data() });
      });
      tRows.sort(function (a, b) {
        return testimonialCreatedMs(b.data) - testimonialCreatedMs(a.data);
      });
      var pRef = window.collection(window.db, "testimonials");
      var psnap = await window.getDocs(pRef);
      var pRows = [];
      psnap.forEach(function (d) {
        pRows.push({ id: d.id, data: d.data() });
      });
      pRows.sort(function (a, b) {
        return testimonialCreatedMs(b.data) - testimonialCreatedMs(a.data);
      });
      pRows = pRows.slice(0, 80);

      var tokenIdSet = {};
      tRows.forEach(function (r) {
        tokenIdSet[r.id] = true;
      });

      var testimonialByToken = {};
      pRows.forEach(function (row) {
        var tid = row.data && row.data.token;
        if (!tid || typeof tid !== "string") return;
        var prev = testimonialByToken[tid];
        if (!prev || testimonialCreatedMs(row.data) > testimonialCreatedMs(prev.data)) {
          testimonialByToken[tid] = { id: row.id, data: row.data };
        }
      });

      combined.innerHTML = "";
      var appended = 0;

      function appendActions(container, tokenId, testimonialId, hasInvite) {
        var actions = document.createElement("div");
        actions.className = "admin-testimonial-combined-actions";
        var btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "btn btn-secondary btn-sm";
        btnDel.textContent = "Delete link";
        if (hasInvite && tokenId) {
          btnDel.setAttribute("data-delete-testimonial-token", tokenId);
        } else {
          btnDel.disabled = true;
          btnDel.title = "No invite document for this row";
        }
        var btnRem = document.createElement("button");
        btnRem.type = "button";
        btnRem.className = "btn btn-secondary btn-sm";
        btnRem.textContent = "Remove testimonial";
        if (testimonialId) {
          btnRem.setAttribute("data-delete-published-testimonial", testimonialId);
        } else {
          btnRem.disabled = true;
          btnRem.title = "No submission on the site for this invite yet";
        }
        actions.appendChild(btnDel);
        actions.appendChild(btnRem);
        container.appendChild(actions);
      }

      tRows.forEach(function (row) {
        var tokenId = row.id;
        var dd = row.data;
        var used = dd.used === true;
        var sub = testimonialByToken[tokenId];
        var wrap = document.createElement("div");
        wrap.className = "admin-testimonial-combined-row";
        var main = document.createElement("div");
        main.className = "admin-testimonial-combined-main";
        var subText = sub ? String(sub.data.text || "") : "";
        main.innerHTML =
          "<strong>" +
          esc(dd.name) +
          "</strong> &lt;" +
          esc(dd.email) +
          "&gt;<br><span style=\"font-size:12px;opacity:.85;\">" +
          esc(dd.product) +
          '</span><br><span style="font-size:11px;">' +
          (used ? "Invite used" : "Invite pending") +
          "</span>" +
          (sub
            ? '<br><span style="font-size:12px;margin-top:8px;display:inline-block;line-height:1.45;opacity:.95;"><em>Submission:</em> ' +
              esc(subText.slice(0, 220)) +
              (subText.length > 220 ? "…" : "") +
              "</span>"
            : '<br><span style="font-size:11px;opacity:.65;margin-top:6px;display:inline-block;">No submission on the site yet.</span>');
        wrap.appendChild(main);
        appendActions(wrap, tokenId, sub ? sub.id : "", true);
        combined.appendChild(wrap);
        appended += 1;
      });

      pRows.forEach(function (row) {
        var tid = row.data && row.data.token;
        if (tid && tokenIdSet[tid]) return;
        var snippet = String(row.data.text || "");
        var wrap = document.createElement("div");
        wrap.className = "admin-testimonial-combined-row";
        var main = document.createElement("div");
        main.className = "admin-testimonial-combined-main";
        main.innerHTML =
          "<strong>" +
          esc(row.data.name) +
          "</strong> — " +
          esc(row.data.product) +
          '<br><span style="font-size:11px;opacity:.75;">Submission without a matching invite in Firestore' +
          (tid ? " (token " + esc(tid.slice(0, 10)) + "…)" : "") +
          "</span>" +
          '<br><span style="font-size:12px;margin-top:6px;display:inline-block;line-height:1.45;">' +
          esc(snippet.slice(0, 220)) +
          (snippet.length > 220 ? "…" : "") +
          "</span>";
        wrap.appendChild(main);
        appendActions(wrap, "", row.id, false);
        combined.appendChild(wrap);
        appended += 1;
      });

      if (!appended) {
        combined.innerHTML =
          '<div class="empty-item"><p>No invites or submitted testimonials yet.</p></div>';
      }
    } catch (e) {
      console.error("loadTestimonialAdminPanel", e);
      combined.innerHTML =
        '<div class="empty-item"><p>Could not load invites or testimonials.</p></div>';
    }
  }

  window.loadTestimonialAdminPanel = loadTestimonialAdminPanel;

  /** DM inbox + magic links (Firebase Realtime Database, dm/* paths) */
  function testRealtimeDatabaseConnection() {
    if (!window.rtdb || !window.rtdbRef || !window.rtdbGet) {
      console.warn('Realtime Database connection test: skipped (not initialized — check databaseURL in config.js)');
      return;
    }
    window.rtdbGet(window.rtdbRef(window.rtdb, 'dm/meta')).then(function () {
      console.log('Realtime Database connection test: reachable (read dm/meta)');
    }).catch(function (err) {
      console.error('Realtime Database connection test failed:', err);
    });
  }

  function syncAdminArticleAuth() {
    var el = document.querySelector('article.admin[data-page="admin"]');
    if (!el) return;
    el.setAttribute('data-admin-auth', isAdminSession() ? 'signed-in' : 'guest');
  }

  function restoreAdminSessionFromStorage() {
    try {
      var saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!saved) return null;
      var user = JSON.parse(saved);
      if (!user || user.role !== 'admin') return null;
      currentUser = user;
      window.currentUser = currentUser;
      return user;
    } catch (err) {
      return null;
    }
  }

  function openAdminLoginModal() {
    if (adminLoginModal) {
      adminLoginModal.classList.add('active');
      adminLoginModal.style.display = '';
    }
    showAdminLoginError('');
  }

  function closeAdminLoginModal() {
    if (adminLoginModal) {
      adminLoginModal.classList.remove('active');
      adminLoginModal.style.display = 'none';
    }
    if (adminLoginForm) adminLoginForm.reset();
    showAdminLoginError('');
    syncAdminArticleAuth();
  }

  function showAdminLoginError(message) {
    var text = message || '';
    [adminLoginError, document.getElementById('admin-login-error-gate')].forEach(function (el) {
      if (!el) return;
      el.textContent = text;
      el.style.display = text ? 'block' : 'none';
    });
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    var creds = window.ADMIN_CREDENTIALS || {};
    var username = document.getElementById('admin-username');
    var password = document.getElementById('admin-password');
    var userVal = username ? String(username.value || '').trim() : '';
    var passVal = password ? String(password.value || '') : '';

    showAdminLoginError('');

    if (!userVal || !passVal) {
      showAdminLoginError('Please enter both username and password.');
      return;
    }

    if (userVal !== creds.username || passVal !== creds.password) {
      showAdminLoginError('Invalid username or password.');
      return;
    }

    currentUser = { username: userVal, role: 'admin' };
    window.currentUser = currentUser;
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentUser));
    closeAdminLoginModal();
    afterAdminSessionReady();
  }

  async function initAdminSession() {
    restoreAdminSessionFromStorage();
    if (isAdminSession()) {
      afterAdminSessionReady();
      return;
    }
    currentUser = null;
    window.currentUser = null;
    showLogin();
  }

  function syncAdminNavVisibility() {
    var isSignedInAdmin = isAdmin();

    document.querySelectorAll('[data-nav-link]').forEach(function (link) {
      if ((link.textContent || '').trim() !== 'Admin') return;
      var item = link.closest('.navbar-item');
      if (item) {
        item.style.display = isSignedInAdmin ? '' : 'none';
      }
    });
  }

  function getAdminLogoutButtons() {
    return Array.from(document.querySelectorAll('.admin-navbar-logout'));
  }

  function setAdminLogoutButtonsVisible(isVisible) {
    getAdminLogoutButtons().forEach(function (btn) {
      btn.style.display = isVisible ? 'inline-flex' : 'none';
    });
  }

  function ensureGlobalNavbarLogoutButtons() {
    var navLists = document.querySelectorAll('.navbar .navbar-list');
    navLists.forEach(function (list) {
      if (list.querySelector('.admin-navbar-logout')) return;

      var item = document.createElement('li');
      item.className = 'navbar-item';
      item.innerHTML =
        '<button type="button" class="navbar-link admin-navbar-logout" style="display: none;" aria-label="Log out of admin">' +
        '<ion-icon name="log-out-outline" aria-hidden="true"></ion-icon>' +
        '<span>Logout</span>' +
        '</button>';
      list.appendChild(item);
    });
  }

  function syncCurrentUserFromFirebase(firebaseUser) {
    if (!firebaseUser || !isAdminEmail(firebaseUser.email)) {
      currentUser = null;
      window.currentUser = null;
      return;
    }
    currentUser = {
      role: 'admin',
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email,
      uid: firebaseUser.uid
    };
    window.currentUser = currentUser;
  }

  // Setup admin event listeners
  function setupAdminEventListeners() {
    ensureGlobalNavbarLogoutButtons();
    restoreAdminSessionFromStorage();

    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', openAdminLoginModal);
    }
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    if (adminLoginCloseBtn) {
      adminLoginCloseBtn.addEventListener('click', closeAdminLoginModal);
    }
    if (adminCancelLoginBtn) {
      adminCancelLoginBtn.addEventListener('click', closeAdminLoginModal);
    }
    if (adminLoginOverlay) {
      adminLoginOverlay.addEventListener('click', closeAdminLoginModal);
    }

    getAdminLogoutButtons().forEach(function (btn) {
      if (btn.dataset.logoutBound) return;
      btn.dataset.logoutBound = '1';
      btn.addEventListener('click', handleLogout);
    });

    // Admin blog management
    const adminAddBlogBtn = document.getElementById('admin-add-blog-btn');
    if (adminAddBlogBtn) {
      adminAddBlogBtn.addEventListener('click', function() {
        openAddBlogModal();
      });
    }

    document.querySelectorAll('#firestore-messages-filter .filter-btn').forEach(btn => {
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
        testRealtimeDatabaseConnection();
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

    const deleteContactConfirmModal = document.getElementById('delete-contact-confirm-modal');
    const deleteContactConfirmOverlay = document.getElementById('delete-contact-confirm-overlay');
    const deleteContactConfirmClose = document.getElementById('delete-contact-confirm-close');
    const deleteContactConfirmCancel = document.getElementById('delete-contact-confirm-cancel');
    const deleteContactConfirmDelete = document.getElementById('delete-contact-confirm-delete');
    if (
      deleteContactConfirmModal &&
      !deleteContactConfirmModal.dataset.bound &&
      deleteContactConfirmOverlay &&
      deleteContactConfirmCancel &&
      deleteContactConfirmDelete
    ) {
      deleteContactConfirmModal.dataset.bound = '1';
      deleteContactConfirmOverlay.addEventListener('click', closeDeleteContactConfirmModal);
      if (deleteContactConfirmClose) {
        deleteContactConfirmClose.addEventListener('click', closeDeleteContactConfirmModal);
      }
      deleteContactConfirmCancel.addEventListener('click', closeDeleteContactConfirmModal);
      deleteContactConfirmDelete.addEventListener('click', handleDeleteContactConfirmClick);
      document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape') return;
        if (!deleteContactConfirmModal.classList.contains('active')) return;
        ev.preventDefault();
        closeDeleteContactConfirmModal();
      });
    }

    var deleteTestimonialConfirmModal = document.getElementById('delete-testimonial-confirm-modal');
    var deleteTestimonialConfirmOverlay = document.getElementById('delete-testimonial-confirm-overlay');
    var deleteTestimonialConfirmClose = document.getElementById('delete-testimonial-confirm-close');
    var deleteTestimonialConfirmCancel = document.getElementById('delete-testimonial-confirm-cancel');
    var deleteTestimonialConfirmDelete = document.getElementById('delete-testimonial-confirm-delete');
    if (
      deleteTestimonialConfirmModal &&
      !deleteTestimonialConfirmModal.dataset.bound &&
      deleteTestimonialConfirmOverlay &&
      deleteTestimonialConfirmCancel &&
      deleteTestimonialConfirmDelete
    ) {
      deleteTestimonialConfirmModal.dataset.bound = '1';
      deleteTestimonialConfirmOverlay.addEventListener('click', closeDeleteTestimonialConfirmModal);
      if (deleteTestimonialConfirmClose) {
        deleteTestimonialConfirmClose.addEventListener('click', closeDeleteTestimonialConfirmModal);
      }
      deleteTestimonialConfirmCancel.addEventListener('click', closeDeleteTestimonialConfirmModal);
      deleteTestimonialConfirmDelete.addEventListener('click', handleDeleteTestimonialConfirmClick);
      document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape') return;
        if (!deleteTestimonialConfirmModal.classList.contains('active')) return;
        ev.preventDefault();
        closeDeleteTestimonialConfirmModal();
      });
    }

    const contactDetailClose = document.getElementById('admin-contact-detail-close');
    const contactDetailBackdrop = document.getElementById('admin-contact-detail-backdrop');
    if (contactDetailClose && !contactDetailClose.dataset.contactDetailBound) {
      contactDetailClose.dataset.contactDetailBound = '1';
      contactDetailClose.addEventListener('click', function () {
        closeContactDetailDrawer();
      });
    }
    if (contactDetailBackdrop && !contactDetailBackdrop.dataset.contactDetailBound) {
      contactDetailBackdrop.dataset.contactDetailBound = '1';
      contactDetailBackdrop.addEventListener('click', function () {
        closeContactDetailDrawer();
      });
    }

    if (messagesList && !messagesList.dataset.adminContactListBound) {
      messagesList.dataset.adminContactListBound = '1';
      messagesList.addEventListener('click', function (e) {
        const th = e.target.closest('th[data-contact-sort]');
        if (th && messagesList.contains(th)) {
          e.preventDefault();
          handleContactTableSortFromTh(th);
          return;
        }
        const row = e.target.closest('tbody tr.admin-contact-table__row[data-id]');
        if (!row || !messagesList.contains(row)) return;
        if (e.target.closest('button') || e.target.closest('a')) return;
        openContactDetailDrawer(row.getAttribute('data-id'));
      });
      messagesList.addEventListener('keydown', function (e) {
        const th = e.target.closest('th[data-contact-sort]');
        if (th && messagesList.contains(th)) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          handleContactTableSortFromTh(th);
          return;
        }
        const row = e.target.closest('tbody tr.admin-contact-table__row[data-id]');
        if (!row || !messagesList.contains(row)) return;
        if (e.key !== 'Enter') return;
        if (e.target.closest('button') || e.target.closest('a')) return;
        e.preventDefault();
        openContactDetailDrawer(row.getAttribute('data-id'));
      });
    }

    if (messagesList && !messagesList.dataset.adminContactTableScrollObs) {
      messagesList.dataset.adminContactTableScrollObs = '1';
      try {
        if (typeof ResizeObserver !== 'undefined') {
          new ResizeObserver(scheduleAdminContactTableScrollSync).observe(messagesList);
        }
      } catch (e) {}
      window.addEventListener('resize', scheduleAdminContactTableScrollSync);
    }

    if (!document.documentElement.dataset.adminContactEscapeBound) {
      document.documentElement.dataset.adminContactEscapeBound = '1';
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const root = document.getElementById('admin-contact-detail');
        if (root && root.classList.contains('is-open')) {
          closeContactDetailDrawer();
        }
      });
    }

    const inviteForm = document.getElementById('admin-testimonial-invite-form');
    const inviteStatus = document.getElementById('admin-testimonial-invite-status');
    if (inviteForm && !inviteForm.dataset.boundTestimonial) {
      inviteForm.dataset.boundTestimonial = '1';
      inviteForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (!isAdmin()) return;
        if (!window.db || !window.setDoc || !window.doc || !window.serverTimestamp) {
          if (inviteStatus) inviteStatus.textContent = 'Firestore is not ready.';
          return;
        }
        var name = document.getElementById('admin-testimonial-invite-name').value.trim();
        var email = document.getElementById('admin-testimonial-invite-email').value.trim();
        var product = document.getElementById('admin-testimonial-invite-product').value.trim();
        if (!name || !email || !product) {
          if (inviteStatus) inviteStatus.textContent = 'Fill in name, email, and product.';
          return;
        }
        var token;
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          token = crypto.randomUUID();
        } else {
          token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0;
            var v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
        var origin =
          (window.PORTFOLIO_PUBLIC_ORIGIN && String(window.PORTFOLIO_PUBLIC_ORIGIN).trim()) ||
          window.location.origin;
        origin = origin.replace(/\/$/, '');
        var url = origin + '/testimonial.html?token=' + encodeURIComponent(token);
        if (inviteStatus) inviteStatus.textContent = 'Saving invite and sending email…';
        try {
          await window.setDoc(window.doc(window.db, 'testimonialTokens', token), {
            name: name,
            email: email,
            product: product,
            used: false,
            createdAt: window.serverTimestamp()
          });
          if (typeof sendPortfolioEmailRequest !== 'function') {
            throw new Error('Email helper missing');
          }
          await sendPortfolioEmailRequest(
            {
              type: 'testimonial_request',
              payload: {
                to_email: email,
                to_name: name,
                product: product,
                testimonial_url: url,
                subject: 'Quick testimonial request from Ruben Jimenez'
              }
            },
            { requireAdmin: true }
          );
          inviteForm.reset();
          if (inviteStatus) inviteStatus.textContent = 'Invite sent to ' + email + '.';
          if (typeof window.loadTestimonialAdminPanel === 'function') {
            window.loadTestimonialAdminPanel();
          }
        } catch (err) {
          console.error(err);
          if (inviteStatus) {
            inviteStatus.textContent = (err && err.message) ? String(err.message) : 'Failed to send invite.';
          }
        }
      });
    }

    var combinedList = document.getElementById("admin-testimonials-combined-list");
    if (combinedList && !combinedList.dataset.boundTestimonialActions) {
      combinedList.dataset.boundTestimonialActions = "1";
      combinedList.addEventListener("click", function (e) {
        var delBtn = e.target.closest("[data-delete-testimonial-token]");
        if (delBtn && combinedList.contains(delBtn) && !delBtn.disabled) {
          var tid = delBtn.getAttribute("data-delete-testimonial-token");
          if (!tid || !window.db || !window.deleteDoc || !window.doc) return;
          openDeleteTestimonialConfirmModal("token", tid);
          return;
        }
        var remBtn = e.target.closest("[data-delete-published-testimonial]");
        if (remBtn && combinedList.contains(remBtn) && !remBtn.disabled) {
          var pid = remBtn.getAttribute("data-delete-published-testimonial");
          if (!pid || !window.db || !window.deleteDoc || !window.doc) return;
          openDeleteTestimonialConfirmModal("published", pid);
        }
      });
    }
  }

  function showLogin() {
    closeAdminLoginModal();
    if (adminDashboardContent) adminDashboardContent.style.display = 'none';
    setAdminLogoutButtonsVisible(false);
    syncAdminArticleAuth();
    syncAdminNavVisibility();
    if (typeof window.unsubscribePipelineLeads === 'function') {
      window.unsubscribePipelineLeads();
    }
  }

  function showDashboard() {
    if (adminDashboardContent) adminDashboardContent.style.display = 'block';
    setAdminLogoutButtonsVisible(true);
    syncAdminArticleAuth();
    syncAdminNavVisibility();
    if (typeof window.subscribePipelineLeads === 'function') {
      window.subscribePipelineLeads();
    }
  }

  function afterAdminSessionReady() {
    showDashboard();
    if (typeof fetchMessages === 'function') fetchMessages();
    if (typeof renderAdminBlogPosts === 'function') renderAdminBlogPosts();
    if (typeof renderAdminPortfolioProjects === 'function') renderAdminPortfolioProjects();
    if (typeof setupPortfolioAdminControls === 'function') setupPortfolioAdminControls();
    if (typeof syncAdminPortfolioLocalBanner === 'function') syncAdminPortfolioLocalBanner();
    if (typeof renderAdminSnippets === 'function') renderAdminSnippets();
    updateAuthUI();
    syncAdminArticleAuth();
    if (typeof window.loadTestimonialAdminPanel === 'function') {
      window.loadTestimonialAdminPanel();
    }
    if (typeof window.subscribePipelineLeads === 'function') {
      window.subscribePipelineLeads();
    }
    document.dispatchEvent(
      new CustomEvent('adminSessionReady', { detail: { isAdmin: true } })
    );
    if (window.AgencyTools && typeof window.AgencyTools.subscribe === 'function') {
      window.AgencyTools.subscribe();
    }
  }

  // Handle logout
  async function handleLogout() {
    if (typeof firestoreMessagesUnsubscribe === 'function') {
      try {
        firestoreMessagesUnsubscribe();
      } catch (unsubErr) {
        console.warn('Firestore listener cleanup on logout:', unsubErr);
      }
      firestoreMessagesUnsubscribe = null;
    }

    if (typeof window.unsubscribePipelineLeads === 'function') {
      window.unsubscribePipelineLeads();
    }
    if (window.AgencyTools && typeof window.AgencyTools.unsubscribe === 'function') {
      window.AgencyTools.unsubscribe();
    }
    document.dispatchEvent(
      new CustomEvent('adminSessionReady', { detail: { isAdmin: false } })
    );

    sessionStorage.removeItem(ADMIN_SESSION_KEY);

    if (window.firebaseAuth && typeof window.signOut === 'function') {
      try {
        await window.signOut(window.firebaseAuth);
      } catch (signOutErr) {
        console.warn('Firebase sign-out:', signOutErr);
      }
    }

    currentUser = null;
    window.currentUser = null;

    showLogin();
    updateAuthUI();
    if (typeof window.loadTestimonialAdminPanel === 'function') {
      window.loadTestimonialAdminPanel();
    }
    if (typeof renderAdminSnippets === 'function') renderAdminSnippets();
    
    console.log('Admin logged out successfully');
  }

  // Handle filter button clicks (Firestore contact list only — DM filters live in the inbox sheet)
  function handleFilterClick(e) {
    const btn = e.target.closest('#firestore-messages-filter .filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter;
    if (!filter) return;

    const group = document.getElementById('firestore-messages-filter');
    if (group) {
      group.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
    }
    btn.classList.add('active');

    filterMessages(filter);
  }

  // Filter messages based on status (datasheet rows)
  function filterMessages(filter) {
    if (!filter) {
      const activeBtn = document.querySelector('#firestore-messages-filter .filter-btn.active');
      filter = activeBtn && activeBtn.dataset.filter ? activeBtn.dataset.filter : 'all';
    }
    const messageItems = document.querySelectorAll('#firestore-messages-list .message-item');

    messageItems.forEach(item => {
      const status = item.dataset.status;
      let show = false;
      switch (filter) {
        case 'all':
          show = true;
          break;
        case 'new':
          show = status === 'new';
          break;
        case 'replied':
          show = status === 'replied';
          break;
        default:
          show = true;
      }
      item.style.display = show ? '' : 'none';
    });
    scheduleAdminContactTableScrollSync();
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
  const businessDocsSummary = document.getElementById('business-docs-summary');

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

  function renderBusinessDocsSummary(allDocs, filteredDocs) {
    if (!businessDocsSummary) return;
    var draftCount = allDocs.filter(function (d) { return d.status === 'draft'; }).length;
    var openCount = allDocs.filter(function (d) {
      return d.status === 'sent' || d.status === 'accepted';
    }).length;
    var proposalCount = allDocs.filter(function (d) { return d.type === 'proposal'; }).length;
    var estimateCount = allDocs.filter(function (d) { return d.type === 'estimate'; }).length;
    var invoiceCount = allDocs.filter(function (d) { return d.type === 'invoice'; }).length;
    var paidCount = allDocs.filter(function (d) { return d.status === 'paid'; }).length;
    var visibleValue = filteredDocs.reduce(function (sum, d) {
      var n = Number(d.total || 0);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    var totalValue = allDocs.reduce(function (sum, d) {
      var n = Number(d.total || 0);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);

    businessDocsSummary.innerHTML = [
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Total docs</span><span class="business-docs-summary-value">' + allDocs.length + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Showing</span><span class="business-docs-summary-value">' + filteredDocs.length + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Proposals</span><span class="business-docs-summary-value">' + proposalCount + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Estimates</span><span class="business-docs-summary-value">' + estimateCount + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Invoices</span><span class="business-docs-summary-value">' + invoiceCount + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Draft</span><span class="business-docs-summary-value">' + draftCount + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Open</span><span class="business-docs-summary-value">' + openCount + '</span></div>',
      '<div class="business-docs-summary-item"><span class="business-docs-summary-label">Paid</span><span class="business-docs-summary-value">' + paidCount + '</span></div>',
      '<div class="business-docs-summary-item business-docs-summary-item--value"><span class="business-docs-summary-label">Portfolio value</span><span class="business-docs-summary-value">$' + totalValue.toFixed(2) + '</span></div>',
      '<div class="business-docs-summary-item business-docs-summary-item--value"><span class="business-docs-summary-label">Visible value</span><span class="business-docs-summary-value">$' + visibleValue.toFixed(2) + '</span></div>'
    ].join('');
  }

  function renderBusinessDocs() {
    if (!businessDocsTbody) return;

    const filtered = applyBusinessDocsFilters(businessDocs.slice().sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }));
    renderBusinessDocsSummary(businessDocs, filtered);

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
      deleteBtn.addEventListener('click', function () {
        openDeleteDocumentConfirmModal(doc.id);
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(pdfBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(actionsTd);

      businessDocsTbody.appendChild(tr);
    });
  }

  function closeDeleteDocumentConfirmModal() {
    var modal = document.getElementById('delete-document-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    delete modal.dataset.pendingDocumentId;
  }

  function openDeleteDocumentConfirmModal(documentId) {
    var modal = document.getElementById('delete-document-confirm-modal');
    if (!modal || !documentId) return;
    modal.dataset.pendingDocumentId = documentId;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    var cancelBtn = document.getElementById('delete-document-confirm-cancel');
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  function handleDeleteDocumentConfirmClick() {
    var modal = document.getElementById('delete-document-confirm-modal');
    var docId = modal && modal.dataset ? modal.dataset.pendingDocumentId : '';
    if (!docId) {
      closeDeleteDocumentConfirmModal();
      return;
    }
    businessDocs = businessDocs.filter(function (d) {
      return d.id !== docId;
    });
    saveBusinessDocs(businessDocs);
    renderBusinessDocs();
    closeDeleteDocumentConfirmModal();
    if (
      businessDocIdInput &&
      businessDocIdInput.value === docId &&
      businessDocModal &&
      businessDocModal.classList.contains('active')
    ) {
      closeBusinessDocModal();
      resetBusinessDocForm();
    }
  }

  function setupDeleteDocumentConfirmModal() {
    var modal = document.getElementById('delete-document-confirm-modal');
    var overlay = document.getElementById('delete-document-confirm-overlay');
    var btnClose = document.getElementById('delete-document-confirm-close');
    var btnCancel = document.getElementById('delete-document-confirm-cancel');
    var btnDelete = document.getElementById('delete-document-confirm-delete');
    if (!modal || modal.dataset.bound || !overlay || !btnCancel || !btnDelete) return;
    modal.dataset.bound = '1';
    overlay.addEventListener('click', closeDeleteDocumentConfirmModal);
    if (btnClose) {
      btnClose.addEventListener('click', closeDeleteDocumentConfirmModal);
    }
    btnCancel.addEventListener('click', closeDeleteDocumentConfirmModal);
    btnDelete.addEventListener('click', handleDeleteDocumentConfirmClick);
    document.addEventListener(
      'keydown',
      function (ev) {
        if (ev.key !== 'Escape') return;
        if (!modal.classList.contains('active')) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        closeDeleteDocumentConfirmModal();
      },
      true
    );
  }

  setupDeleteDocumentConfirmModal();

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

  // Mobile admin bottom tab bar — custom order (long-press to rearrange)
  (function initAdminMobileTabBarOrder() {
    var MOBILE_ORDER_KEY = 'adminMobileTabOrder';
    var PRIMARY_SLOT_COUNT = 4;
    var DEFAULT_ORDER = [
      'overview', 'messages', 'pipeline', 'docs',
      'hub', 'maintenance', 'referrals', 'health',
      'portfolio', 'blog', 'testimonials', 'ops'
    ];
    var VALID_TAB = {
      overview: 1, docs: 1, messages: 1, testimonials: 1, blog: 1, portfolio: 1, pipeline: 1,
      hub: 1, maintenance: 1, referrals: 1, health: 1, ops: 1
    };
    var tabBar = document.querySelector('#admin-tabs .admin-tab-bar');
    var moreWrap = document.getElementById('admin-tab-more-wrap');
    if (!tabBar) return;

    var reorderActive = false;
    var longPressTimer = null;
    var suppressClickUntil = 0;
    var dragTabId = null;
    var currentOrder = loadOrder();
    var reorderDock = null;
    var reorderStrip = null;
    var tabHomes = null;
    var stripEventsBound = false;

    function isMobileBar() {
      return window.matchMedia('(max-width: 767px)').matches;
    }

    function isSignedInAdmin() {
      return typeof isAdminSession === 'function' && isAdminSession();
    }

    function allTabButtons() {
      var root = reorderActive && reorderStrip ? reorderStrip : tabBar;
      return Array.prototype.slice.call(root.querySelectorAll('.admin-tab[data-admin-tab]'));
    }

    function findTabButton(tabId) {
      if (!tabId) return null;
      if (reorderStrip) {
        var inStrip = reorderStrip.querySelector('.admin-tab[data-admin-tab="' + tabId + '"]');
        if (inStrip) return inStrip;
      }
      return tabBar.querySelector('.admin-tab[data-admin-tab="' + tabId + '"]');
    }

    function loadOrder() {
      try {
        var raw = localStorage.getItem(MOBILE_ORDER_KEY);
        if (!raw) return DEFAULT_ORDER.slice();
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_ORDER.slice();
        var seen = {};
        var out = [];
        parsed.forEach(function (id) {
          if (VALID_TAB[id] && !seen[id]) {
            seen[id] = true;
            out.push(id);
          }
        });
        DEFAULT_ORDER.forEach(function (id) {
          if (!seen[id]) out.push(id);
        });
        return out;
      } catch (e) {
        return DEFAULT_ORDER.slice();
      }
    }

    function saveOrder(order) {
      try {
        localStorage.setItem(MOBILE_ORDER_KEY, JSON.stringify(order));
      } catch (e) {}
    }

    function applyOrder(order) {
      currentOrder = order.slice();
      var buttons = allTabButtons();
      var byId = {};
      buttons.forEach(function (btn) {
        byId[btn.getAttribute('data-admin-tab')] = btn;
      });

      order.forEach(function (id, index) {
        var btn = byId[id];
        if (!btn) return;
        if (isMobileBar()) {
          btn.style.order = String(index);
        } else {
          btn.style.order = '';
        }
        if (index < PRIMARY_SLOT_COUNT) {
          btn.setAttribute('data-mobile-primary', '');
          btn.classList.add('is-mobile-primary-slot');
        } else {
          btn.removeAttribute('data-mobile-primary');
          btn.classList.remove('is-mobile-primary-slot');
        }
      });

      if (moreWrap && isMobileBar()) {
        moreWrap.style.order = '1000';
      } else if (moreWrap) {
        moreWrap.style.order = '';
      }

      if (typeof window.rebuildAdminTabMoreDropdown === 'function') {
        window.rebuildAdminTabMoreDropdown();
      }
    }

    function setReorderStep(text) {
      var step = document.getElementById('admin-tab-reorder-step');
      if (step) step.textContent = text;
    }

    function ensureReorderDock() {
      if (reorderDock) return reorderDock;
      reorderDock = document.createElement('div');
      reorderDock.id = 'admin-tab-reorder-dock';
      reorderDock.className = 'admin-tab-reorder-dock';
      reorderDock.hidden = true;

      reorderStrip = document.createElement('div');
      reorderStrip.id = 'admin-tab-reorder-strip';
      reorderStrip.className = 'admin-tab-reorder-strip';
      reorderStrip.setAttribute('role', 'toolbar');
      reorderStrip.setAttribute('aria-label', 'Reorder admin tabs');

      var banner = document.createElement('div');
      banner.id = 'admin-tab-reorder-banner';
      banner.className = 'admin-tab-reorder-banner';
      banner.innerHTML =
        '<p class="admin-tab-reorder-banner-text" id="admin-tab-reorder-step"></p>' +
        '<button type="button" class="admin-tab-reorder-done" id="admin-tab-reorder-done">Done</button>';
      banner.querySelector('#admin-tab-reorder-done').addEventListener('click', function () {
        exitReorderMode(true);
      });

      reorderDock.appendChild(reorderStrip);
      reorderDock.appendChild(banner);
      document.body.appendChild(reorderDock);
      bindReorderStripEvents();
      return reorderDock;
    }

    function captureTabHomes() {
      tabHomes = {};
      tabBar.querySelectorAll('.admin-tab[data-admin-tab]').forEach(function (btn) {
        var id = btn.getAttribute('data-admin-tab');
        tabHomes[id] = { parent: btn.parentNode, next: btn.nextSibling };
      });
    }

    function mountReorderStrip() {
      captureTabHomes();
      ensureReorderDock();
      reorderStrip.innerHTML = '';
      currentOrder.forEach(function (id) {
        var btn = tabBar.querySelector('.admin-tab[data-admin-tab="' + id + '"]');
        if (btn) reorderStrip.appendChild(btn);
      });
      tabBar.classList.add('is-reorder-source-hidden');
    }

    function unmountReorderStrip() {
      if (!tabHomes || !reorderStrip) return;
      currentOrder.forEach(function (id) {
        var btn = reorderStrip.querySelector('.admin-tab[data-admin-tab="' + id + '"]');
        var home = tabHomes[id];
        if (btn && home && home.parent) {
          home.parent.insertBefore(btn, home.next);
        }
      });
      tabBar.classList.remove('is-reorder-source-hidden');
      reorderStrip.innerHTML = '';
    }

    function closeMoreDropdownIfOpen() {
      var dropdown = document.getElementById('admin-tab-more-dropdown');
      var moreBtn = document.getElementById('admin-tab-more-btn');
      if (dropdown) {
        dropdown.classList.remove('is-open');
        dropdown.setAttribute('aria-hidden', 'true');
      }
      if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
    }

    function enterReorderMode() {
      if (!isMobileBar() || !isSignedInAdmin()) return;
      reorderActive = true;
      closeMoreDropdownIfOpen();
      document.body.classList.add('admin-tab-reorder-active');
      mountReorderStrip();
      ensureReorderDock();
      reorderDock.hidden = false;
      setReorderStep(
        'Step 1: Drag a tab left or right. Step 2: First ' +
          PRIMARY_SLOT_COUNT +
          ' tabs stay on the bottom bar. Tap Done when finished.'
      );
      if (navigator.vibrate) {
        try { navigator.vibrate(12); } catch (e) {}
      }
    }

    function exitReorderMode(save) {
      if (save) saveOrder(currentOrder);
      unmountReorderStrip();
      reorderActive = false;
      dragTabId = null;
      document.body.classList.remove('admin-tab-reorder-active');
      if (reorderDock) reorderDock.hidden = true;
      tabBar.querySelectorAll('.admin-tab[data-admin-tab]').forEach(function (btn) {
        btn.classList.remove('is-dragging');
      });
      if (!save) applyOrder(loadOrder());
    }

    function swapToward(dragId, targetId) {
      if (!dragId || !targetId || dragId === targetId) return;
      var from = currentOrder.indexOf(dragId);
      var to = currentOrder.indexOf(targetId);
      if (from < 0 || to < 0) return;
      var next = currentOrder.slice();
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      currentOrder = next;
      applyOrder(currentOrder);
    }

    function clearLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    function onTabPointerDown(e) {
      if (!isMobileBar() || !isSignedInAdmin()) return;
      if (reorderActive) return;
      var tab = e.target.closest('.admin-tab[data-admin-tab]');
      if (!tab || !tabBar.contains(tab)) return;
      var startX = e.clientX;
      var startY = e.clientY;
      var tabId = tab.getAttribute('data-admin-tab');

      clearLongPress();
      longPressTimer = setTimeout(function () {
        longPressTimer = null;
        suppressClickUntil = Date.now() + 700;
        enterReorderMode();
        dragTabId = tabId;
        var stripTab = findTabButton(tabId);
        if (stripTab) stripTab.classList.add('is-dragging');
        if (e.cancelable) e.preventDefault();
        if (tab.setPointerCapture && e.pointerId != null) {
          try { tab.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }, 520);

      function cancelIfMoved(ev) {
        if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) {
          clearLongPress();
        }
      }

      tab.addEventListener('pointermove', cancelIfMoved);
      tab.addEventListener('pointerup', function cleanup() {
        clearLongPress();
        tab.removeEventListener('pointermove', cancelIfMoved);
        tab.removeEventListener('pointerup', cleanup);
        tab.removeEventListener('pointercancel', cleanup);
      });
      tab.addEventListener('pointercancel', function cleanup() {
        clearLongPress();
        tab.removeEventListener('pointermove', cancelIfMoved);
        tab.removeEventListener('pointerup', cleanup);
        tab.removeEventListener('pointercancel', cleanup);
      });
    }

    function tabUnderPointer(clientX, clientY) {
      var hit = document.elementFromPoint(clientX, clientY);
      return hit && hit.closest('.admin-tab[data-admin-tab]');
    }

    function onReorderPointerMove(e) {
      if (!reorderActive || !dragTabId || !reorderStrip) return;
      var target = tabUnderPointer(e.clientX, e.clientY);
      if (target && reorderStrip.contains(target)) {
        swapToward(dragTabId, target.getAttribute('data-admin-tab'));
        setReorderStep('Release to place · first ' + PRIMARY_SLOT_COUNT + ' tabs show on the bar');
      }
    }

    function onReorderPointerUp() {
      if (!reorderActive) return;
      allTabButtons().forEach(function (btn) {
        btn.classList.remove('is-dragging');
      });
      dragTabId = null;
      setReorderStep(
        'Step 1: Drag a tab left or right. Step 2: First ' +
          PRIMARY_SLOT_COUNT +
          ' tabs stay on the bottom bar. Tap Done when finished.'
      );
    }

    function onStripPointerDown(e) {
      if (!reorderActive) return;
      var tab = e.target.closest('.admin-tab[data-admin-tab]');
      if (!tab || !reorderStrip.contains(tab)) return;
      dragTabId = tab.getAttribute('data-admin-tab');
      tab.classList.add('is-dragging');
      setReorderStep('Drag over another tab, then release to swap positions');
      if (tab.setPointerCapture && e.pointerId != null) {
        try { tab.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }

    function bindReorderStripEvents() {
      if (!reorderStrip || stripEventsBound) return;
      stripEventsBound = true;
      reorderStrip.addEventListener('pointerdown', onStripPointerDown);
      reorderStrip.addEventListener('pointermove', onReorderPointerMove);
      reorderStrip.addEventListener('pointerup', onReorderPointerUp);
      reorderStrip.addEventListener('pointercancel', onReorderPointerUp);
    }

    tabBar.addEventListener('pointerdown', onTabPointerDown);

    tabBar.addEventListener('click', function (e) {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    tabBar.addEventListener('contextmenu', function (e) {
      if (isMobileBar() && isSignedInAdmin()) e.preventDefault();
    });

    document.addEventListener('selectstart', function (e) {
      if (reorderActive || longPressTimer) e.preventDefault();
    }, true);

    window.addEventListener('resize', function () {
      if (!isMobileBar() && reorderActive) exitReorderMode(true);
      applyOrder(currentOrder);
    });

    applyOrder(currentOrder);

    window.AdminMobileTabOrder = {
      getOrder: function () { return currentOrder.slice(); },
      apply: function () { applyOrder(currentOrder); },
      isReorderActive: function () { return reorderActive; }
    };
  })();

  // Admin dashboard tabs (Business Documents | Contact Messages | Blog Management)
  function initAdminTabs() {
    var root = document.getElementById('admin-tabs');
    if (!root) return;
    var tabBar = root.querySelector('.admin-tab-bar');
    if (!tabBar) return;
    var tabs = tabBar.querySelectorAll('.admin-tab[role="tab"]');
    var panelHost = root.querySelector('.admin-tab-panels');
    var panels = [];
    if (panelHost) {
      var ch = panelHost.children;
      for (var pi = 0; pi < ch.length; pi++) {
        if (ch[pi].classList && ch[pi].classList.contains('admin-tab-panel')) {
          panels.push(ch[pi]);
        }
      }
    } else {
      panels = Array.prototype.slice.call(root.querySelectorAll('.admin-tab-panel'));
    }
    var STORAGE_KEY = 'adminActiveTab';
    var VALID = {
      overview: 1, docs: 1, messages: 1, testimonials: 1, blog: 1, portfolio: 1, pipeline: 1,
      hub: 1, maintenance: 1, referrals: 1, health: 1, ops: 1
    };
    var AGENCY_TABS = { hub: 1, maintenance: 1, referrals: 1, health: 1 };
    var navGroups = tabBar.querySelectorAll('.admin-nav-group');

    function syncNavGroups(activeTabId) {
      navGroups.forEach(function(group) {
        var hasActive = !!group.querySelector('.admin-tab.is-active');
        group.classList.toggle('has-active', hasActive);
        if (hasActive) {
          group.classList.add('is-expanded');
          var toggle = group.querySelector('.admin-nav-group-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
      });
    }

    function initNavGroupToggles() {
      navGroups.forEach(function(group) {
        var toggle = group.querySelector('.admin-nav-group-toggle');
        if (!toggle || toggle.dataset.bound === '1') return;
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', function(e) {
          if (window.matchMedia('(max-width: 767px)').matches) return;
          e.preventDefault();
          var expanded = group.classList.toggle('is-expanded');
          toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
      });
    }

    function activate(tabId) {
      if (!VALID[tabId]) return;
      tabs.forEach(function(t) {
        var id = t.getAttribute('data-admin-tab');
        var on = id === tabId;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
      });
      panels.forEach(function(p) {
        var id = p.getAttribute('data-admin-tab');
        var on = id === tabId;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });
      syncNavGroups(tabId);
      try {
        sessionStorage.setItem(STORAGE_KEY, tabId);
      } catch (e) {}
      if (tabId === 'testimonials' && typeof window.loadTestimonialAdminPanel === 'function') {
        window.loadTestimonialAdminPanel();
      }
      if (tabId === 'portfolio' && typeof populatePortfolioImageAssetSelect === 'function') {
        populatePortfolioImageAssetSelect();
      }
      if (AGENCY_TABS[tabId] && window.AgencyTools && typeof window.AgencyTools.subscribe === 'function') {
        window.AgencyTools.subscribe();
      }
    }

    var saved = null;
    try {
      saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === 'agency') saved = 'hub';
    } catch (e) {}
    var initial = saved && VALID[saved] ? saved : 'overview';

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        if (window.AdminMobileTabOrder && window.AdminMobileTabOrder.isReorderActive()) return;
        activate(tab.getAttribute('data-admin-tab'));
      });
    });

    tabBar.addEventListener('keydown', function(e) {
      var list = Array.prototype.slice.call(tabs);
      var i = list.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var dir = e.key === 'ArrowRight' ? 1 : -1;
        var j = (i + dir + list.length) % list.length;
        list[j].focus();
        activate(list[j].getAttribute('data-admin-tab'));
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0].focus();
        activate(list[0].getAttribute('data-admin-tab'));
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1].focus();
        activate(list[list.length - 1].getAttribute('data-admin-tab'));
      }
    });

    initNavGroupToggles();
    activate(initial);

    // Expose for KPI cards and Quick Action buttons
    window.adminActivateTab = activate;
  }

  // KPI cards and Quick Action buttons — switch to the target tab
  document.querySelectorAll('[data-admin-kpi-tab], [data-admin-qa-tab]').forEach(function(el) {
    el.addEventListener('click', function() {
      var tabId = el.getAttribute('data-admin-kpi-tab') || el.getAttribute('data-admin-qa-tab');
      if (typeof window.adminActivateTab === 'function') window.adminActivateTab(tabId);
      // For doc quick actions, also trigger the Create Document button after tab switch
      var action = el.getAttribute('data-admin-qa-action');
      if (action === 'create-doc' || action === 'create-invoice') {
        setTimeout(function() {
          var createBtn = document.getElementById('business-doc-create-btn');
          if (createBtn) createBtn.click();
          if (action === 'create-invoice') {
            var typeSelect = document.getElementById('business-doc-filter-type');
            var formType = document.getElementById('business-doc-type');
            if (formType) formType.value = 'invoice';
            if (typeSelect) typeSelect.value = 'invoice';
          }
        }, 80);
      }
      // For add-lead quick action, open lead modal on pipeline tab
      if (el.getAttribute('data-admin-qa-tab') === 'pipeline' && el.getAttribute('data-admin-qa-action') === 'add-lead') {
        setTimeout(function() {
          var addLeadBtn = document.getElementById('admin-add-lead-btn');
          if (addLeadBtn) addLeadBtn.focus();
          if (typeof window.openLeadModal === 'function') window.openLeadModal();
        }, 80);
      }
    });
  });

  // ----------------------------
  // Client Pipeline (Realtime Database: pipelineLeads)
  // ----------------------------

  var PIPELINE_RTD_PATH = 'pipelineLeads';
  var PIPELINE_STAGES = ['lead', 'proposal', 'deposit'];
  var PIPELINE_OPEN_STAGES = ['lead', 'proposal'];
  var PIPELINE_WON_STAGES = ['deposit'];
  var PIPELINE_ACTIVE_STAGES = ['lead', 'proposal', 'deposit'];
  var PIPELINE_LEGACY_STAGE_MAP = {
    discovery: 'proposal',
    building: 'deposit',
    launched: 'deposit',
    maintenance: 'deposit'
  };
  var pipelineLeads = [];
  var pipelineUnsubscribe = null;
  var pipelineDetailLeadId = null;
  var pipelineDragLeadId = null;

  var leadModal = document.getElementById('lead-modal');
  var leadModalOverlay = document.getElementById('lead-modal-overlay');
  var leadModalClose = document.getElementById('lead-modal-close');
  var leadForm = document.getElementById('lead-form');
  var leadIdInput = document.getElementById('lead-id');
  var leadModalTitle = document.getElementById('lead-modal-title');
  var leadDrawer = document.getElementById('lead-detail-drawer');
  var leadDrawerOverlay = document.getElementById('lead-drawer-overlay');
  var leadDrawerClose = document.getElementById('lead-drawer-close');
  var leadDrawerBody = document.getElementById('lead-drawer-body');
  var leadDrawerEditBtn = document.getElementById('lead-drawer-edit-btn');
  var leadDrawerDeleteBtn = document.getElementById('lead-drawer-delete-btn');
  var adminAddLeadBtn = document.getElementById('admin-add-lead-btn');

  function formatPipelineMoney(amount) {
    var n = Number(amount);
    if (isNaN(n) || n < 0) return '$0';
    return '$' + Math.round(n).toLocaleString();
  }

  function pipelineStageLabel(stage) {
    var map = {
      lead: 'Lead',
      proposal: 'Proposal Sent',
      deposit: 'Deposit Paid'
    };
    return map[stage] || stage;
  }

  function pipelineProjectTypeLabel(type) {
    var map = { web: 'Website', app: 'Mobile app', both: 'Web + app', other: 'Other' };
    return map[type] || type;
  }

  function pipelineSourceLabel(source) {
    var map = {
      dm: 'DM / Messages',
      email: 'Email',
      referral: 'Referral',
      social: 'Social',
      cold: 'Cold outreach',
      other: 'Other'
    };
    return map[source] || source;
  }

  function normalizePipelineLead(id, row) {
    if (!row || typeof row !== 'object') row = {};
    var stage = String(row.stage || 'lead').toLowerCase();
    if (PIPELINE_LEGACY_STAGE_MAP[stage]) stage = PIPELINE_LEGACY_STAGE_MAP[stage];
    if (PIPELINE_STAGES.indexOf(stage) < 0) stage = 'lead';
    var projectType = String(row.projectType || 'web').toLowerCase();
    if (['web', 'app', 'both', 'other'].indexOf(projectType) < 0) projectType = 'web';
    var source = String(row.source || 'other').toLowerCase();
    if (['dm', 'email', 'referral', 'social', 'cold', 'other'].indexOf(source) < 0) source = 'other';
    return {
      id: id,
      name: String(row.name || '').trim().slice(0, 120),
      email: String(row.email || '').trim().slice(0, 160),
      phone: String(row.phone || '').trim().slice(0, 40),
      company: String(row.company || '').trim().slice(0, 160),
      projectType: projectType,
      value: Math.max(0, Number(row.value) || 0),
      stage: stage,
      source: source,
      notes: String(row.notes || '').slice(0, 8000),
      createdAt: row.createdAt || null,
      updatedAt: row.updatedAt || null
    };
  }

  function sanitizePipelinePayload(data) {
    var norm = normalizePipelineLead('tmp', data);
    return {
      name: norm.name,
      email: norm.email,
      phone: norm.phone,
      company: norm.company,
      projectType: norm.projectType,
      value: norm.value,
      stage: norm.stage,
      source: norm.source,
      notes: norm.notes
    };
  }

  function pipelineTimestampMs(ts) {
    if (ts == null) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
    var d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function unsubscribePipelineLeads() {
    if (typeof pipelineUnsubscribe === 'function') {
      pipelineUnsubscribe();
      pipelineUnsubscribe = null;
    }
    pipelineLeads = [];
  }

  async function subscribePipelineLeads() {
    if (!isAdmin()) return;
    if (!window.rtdb || !window.rtdbRef || !window.rtdbOnValue) return;

    if (typeof pipelineUnsubscribe === 'function') pipelineUnsubscribe();

    var ref = window.rtdbRef(window.rtdb, PIPELINE_RTD_PATH);
    pipelineUnsubscribe = window.rtdbOnValue(
      ref,
      function (snap) {
        var val = snap.val();
        var leads = [];
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(function (key) {
            leads.push(normalizePipelineLead(key, val[key]));
          });
        }
        leads.sort(function (a, b) {
          return pipelineTimestampMs(b.updatedAt || b.createdAt) - pipelineTimestampMs(a.updatedAt || a.createdAt);
        });
        pipelineLeads = leads;
        renderPipelineBoard(leads);
        renderPipelineSummary(leads);
      },
      function (err) {
        console.error('Pipeline RTDB listener error', err);
      }
    );
  }

  function renderPipelineSummary(leads) {
    var total = leads.length;
    var active = 0;
    var openValue = 0;
    var wonValue = 0;

    leads.forEach(function (lead) {
      if (PIPELINE_ACTIVE_STAGES.indexOf(lead.stage) >= 0) active += 1;
      if (PIPELINE_OPEN_STAGES.indexOf(lead.stage) >= 0) openValue += lead.value;
      if (PIPELINE_WON_STAGES.indexOf(lead.stage) >= 0) wonValue += lead.value;
    });

    var elTotal = document.getElementById('pipeline-total-leads');
    var elActive = document.getElementById('pipeline-active-count');
    var elValue = document.getElementById('pipeline-total-value');
    var elWon = document.getElementById('pipeline-won-value');
    var kpiValue = document.getElementById('kpi-pipeline-value');
    var kpiActive = document.getElementById('kpi-active-projects');

    if (elTotal) elTotal.textContent = String(total);
    if (elActive) elActive.textContent = String(active);
    if (elValue) elValue.textContent = formatPipelineMoney(openValue);
    if (elWon) elWon.textContent = formatPipelineMoney(wonValue);
    if (kpiValue) kpiValue.textContent = formatPipelineMoney(openValue);
    if (kpiActive) kpiActive.textContent = String(active);
  }

  function buildPipelineStageSelect(leadId, currentStage) {
    var html = '<select class="pipeline-card-stage-select" data-lead-id="' + escapeHtml(leadId) + '" aria-label="Change stage">';
    PIPELINE_STAGES.forEach(function (st) {
      html +=
        '<option value="' +
        st +
        '"' +
        (st === currentStage ? ' selected' : '') +
        '>' +
        pipelineStageLabel(st) +
        '</option>';
    });
    html += '</select>';
    return html;
  }

  function renderPipelineBoard(leads) {
    var counts = {};
    PIPELINE_STAGES.forEach(function (st) {
      counts[st] = 0;
      var container = document.getElementById('pipeline-cards-' + st);
      if (container) container.innerHTML = '';
    });

    leads.forEach(function (lead) {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
      var container = document.getElementById('pipeline-cards-' + lead.stage);
      if (!container) return;

      var card = document.createElement('div');
      card.className = 'pipeline-card';
      card.setAttribute('role', 'article');
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-lead-id', lead.id);
      card.setAttribute('tabindex', '0');

      var dateMs = pipelineTimestampMs(lead.updatedAt || lead.createdAt);
      var dateLabel = dateMs ? formatDateDisplay(new Date(dateMs).toISOString()) : '—';

      card.innerHTML =
        '<div class="pipeline-card-name">' +
        escapeHtml(lead.name || 'Untitled lead') +
        '</div>' +
        '<div class="pipeline-card-value">' +
        formatPipelineMoney(lead.value) +
        '</div>' +
        '<div class="pipeline-card-meta">' +
        '<span class="pipeline-card-type">' +
        escapeHtml(pipelineProjectTypeLabel(lead.projectType).toUpperCase()) +
        '</span>' +
        '<span class="pipeline-card-date">' +
        escapeHtml(dateLabel) +
        '</span>' +
        '</div>' +
        '<div class="pipeline-card-footer">' +
        buildPipelineStageSelect(lead.id, lead.stage) +
        '</div>';

      container.appendChild(card);
    });

    PIPELINE_STAGES.forEach(function (st) {
      var countEl = document.getElementById('pipeline-count-' + st);
      if (countEl) countEl.textContent = String(counts[st] || 0);
      var container = document.getElementById('pipeline-cards-' + st);
      if (!container) return;
      if (!counts[st]) {
        container.innerHTML = '<p class="pipeline-empty">No leads yet.</p>';
      }
    });
  }

  function findPipelineLead(id) {
    return pipelineLeads.find(function (l) {
      return l.id === id;
    });
  }

  window.findPipelineLead = findPipelineLead;

  function openLeadModal(lead) {
    if (!leadModal) return;
    var isEdit = !!(lead && lead.id);
    if (leadModalTitle) leadModalTitle.textContent = isEdit ? 'Edit Lead' : 'Add Lead';
    if (leadIdInput) leadIdInput.value = isEdit ? lead.id : '';
    var nameEl = document.getElementById('lead-name');
    var emailEl = document.getElementById('lead-email');
    var phoneEl = document.getElementById('lead-phone');
    var companyEl = document.getElementById('lead-company');
    var typeEl = document.getElementById('lead-project-type');
    var valueEl = document.getElementById('lead-value');
    var stageEl = document.getElementById('lead-stage');
    var sourceEl = document.getElementById('lead-source');
    var notesEl = document.getElementById('lead-notes');

    if (isEdit) {
      if (nameEl) nameEl.value = lead.name || '';
      if (emailEl) emailEl.value = lead.email || '';
      if (phoneEl) phoneEl.value = lead.phone || '';
      if (companyEl) companyEl.value = lead.company || '';
      if (typeEl) typeEl.value = lead.projectType || 'web';
      if (valueEl) valueEl.value = lead.value ? String(lead.value) : '';
      if (stageEl) stageEl.value = lead.stage || 'lead';
      if (sourceEl) sourceEl.value = lead.source || 'other';
      if (notesEl) notesEl.value = lead.notes || '';
    } else {
      if (leadForm) leadForm.reset();
      if (leadIdInput) leadIdInput.value = '';
      if (stageEl) stageEl.value = 'lead';
      if (typeEl) typeEl.value = 'web';
      if (sourceEl) sourceEl.value = 'other';
    }

    leadModal.style.display = '';
    leadModal.classList.add('active');
    leadModal.setAttribute('aria-hidden', 'false');
    if (nameEl) nameEl.focus();
  }

  function closeLeadModal() {
    if (!leadModal) return;
    leadModal.classList.remove('active');
    leadModal.style.display = 'none';
    leadModal.setAttribute('aria-hidden', 'true');
    if (leadForm) leadForm.reset();
    if (leadIdInput) leadIdInput.value = '';
  }

  function openLeadDetail(lead) {
    if (!leadDrawer || !leadDrawerBody || !lead) return;
    pipelineDetailLeadId = lead.id;
    var dateMs = pipelineTimestampMs(lead.updatedAt || lead.createdAt);
    var dateLabel = dateMs ? formatDateDisplay(new Date(dateMs).toISOString()) : '—';

    leadDrawerBody.innerHTML =
      '<dl class="lead-drawer-fields">' +
      '<div><dt>Name</dt><dd>' +
      escapeHtml(lead.name || '—') +
      '</dd></div>' +
      '<div><dt>Email</dt><dd>' +
      (lead.email
        ? '<a href="mailto:' + escapeHtml(lead.email) + '">' + escapeHtml(lead.email) + '</a>'
        : '—') +
      '</dd></div>' +
      '<div><dt>Phone</dt><dd>' +
      escapeHtml(lead.phone || '—') +
      '</dd></div>' +
      '<div><dt>Company</dt><dd>' +
      escapeHtml(lead.company || '—') +
      '</dd></div>' +
      '<div><dt>Project type</dt><dd>' +
      escapeHtml(pipelineProjectTypeLabel(lead.projectType)) +
      '</dd></div>' +
      '<div><dt>Estimated value</dt><dd>' +
      escapeHtml(formatPipelineMoney(lead.value)) +
      '</dd></div>' +
      '<div><dt>Stage</dt><dd><span class="lead-drawer-stage">' +
      escapeHtml(pipelineStageLabel(lead.stage)) +
      '</span></dd></div>' +
      '<div><dt>Source</dt><dd>' +
      escapeHtml(pipelineSourceLabel(lead.source)) +
      '</dd></div>' +
      '<div><dt>Last updated</dt><dd>' +
      escapeHtml(dateLabel) +
      '</dd></div>' +
      '</dl>' +
      '<div class="lead-drawer-notes">' +
      '<h4 class="h4">Notes</h4>' +
      '<p class="lead-drawer-notes-text">' +
      (lead.notes ? escapeHtml(lead.notes).replace(/\n/g, '<br>') : '<span class="text-muted">No notes yet.</span>') +
      '</p></div>';

    var titleEl = document.getElementById('lead-drawer-title');
    if (titleEl) titleEl.textContent = lead.name || 'Lead details';

    leadDrawer.hidden = false;
    leadDrawer.setAttribute('aria-hidden', 'false');
    if (leadDrawerOverlay) {
      leadDrawerOverlay.hidden = false;
      leadDrawerOverlay.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('lead-drawer-open');
  }

  var leadDrawerHubBtn = document.getElementById('lead-drawer-hub-btn');
  if (leadDrawerHubBtn && !leadDrawerHubBtn.dataset.bound) {
    leadDrawerHubBtn.dataset.bound = '1';
    leadDrawerHubBtn.addEventListener('click', function () {
      if (!pipelineDetailLeadId) return;
      closeLeadDetail();
      if (typeof window.switchToPage === 'function') window.switchToPage('admin');
      window.setTimeout(function () {
        var hubTab = document.querySelector('[data-admin-tab="hub"]');
        if (hubTab) hubTab.click();
        if (window.AgencyTools && typeof window.AgencyTools.openProjectHub === 'function') {
          window.AgencyTools.openProjectHub(pipelineDetailLeadId);
        }
      }, 120);
    });
  }

  function closeLeadDetail() {
    pipelineDetailLeadId = null;
    if (leadDrawer) {
      leadDrawer.hidden = true;
      leadDrawer.setAttribute('aria-hidden', 'true');
    }
    if (leadDrawerOverlay) {
      leadDrawerOverlay.hidden = true;
      leadDrawerOverlay.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('lead-drawer-open');
  }

  async function saveLeadFromForm(e) {
    if (e) e.preventDefault();
    if (!window.rtdb || !window.rtdbRef || !window.rtdbSet || !window.rtdbPush) {
      alert('Realtime Database is not available.');
      return;
    }
    if (!isAdmin()) {
      alert('Sign in with an allowlisted Google account to save leads.');
      return;
    }

    var id = leadIdInput ? leadIdInput.value.trim() : '';
    var payload = sanitizePipelinePayload({
      name: document.getElementById('lead-name') && document.getElementById('lead-name').value,
      email: document.getElementById('lead-email') && document.getElementById('lead-email').value,
      phone: document.getElementById('lead-phone') && document.getElementById('lead-phone').value,
      company: document.getElementById('lead-company') && document.getElementById('lead-company').value,
      projectType: document.getElementById('lead-project-type') && document.getElementById('lead-project-type').value,
      value: document.getElementById('lead-value') && document.getElementById('lead-value').value,
      stage: document.getElementById('lead-stage') && document.getElementById('lead-stage').value,
      source: document.getElementById('lead-source') && document.getElementById('lead-source').value,
      notes: document.getElementById('lead-notes') && document.getElementById('lead-notes').value
    });

    if (!payload.name) {
      alert('Lead name is required.');
      return;
    }

    try {
      if (id) {
        var existing = findPipelineLead(id);
        payload.updatedAt = window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
        if (existing && existing.createdAt) payload.createdAt = existing.createdAt;
        await window.rtdbSet(window.rtdbRef(window.rtdb, PIPELINE_RTD_PATH + '/' + id), payload);
      } else {
        payload.createdAt = window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now();
        payload.updatedAt = payload.createdAt;
        var newRef = window.rtdbPush(window.rtdbRef(window.rtdb, PIPELINE_RTD_PATH));
        await window.rtdbSet(newRef, payload);
      }
      closeLeadModal();
      closeLeadDetail();
    } catch (err) {
      console.error('saveLeadFromForm', err);
      alert('Could not save lead. Check console and RTDB rules.');
    }
  }

  async function moveLeadStage(leadId, stage) {
    if (!leadId || PIPELINE_STAGES.indexOf(stage) < 0) return;
    if (!window.rtdb || !window.rtdbUpdate) return;
    if (!isAdmin()) return;
    try {
      await window.rtdbUpdate(window.rtdbRef(window.rtdb, PIPELINE_RTD_PATH + '/' + leadId), {
        stage: stage,
        updatedAt: window.rtdbServerTimestamp ? window.rtdbServerTimestamp() : Date.now()
      });
    } catch (err) {
      console.error('moveLeadStage', err);
      alert('Could not update stage.');
    }
  }

  async function deletePipelineLead(leadId) {
    if (!leadId) return;
    var lead = findPipelineLead(leadId);
    var label = lead && lead.name ? lead.name : 'this lead';
    if (!window.confirm('Delete ' + label + '? This cannot be undone.')) return;
    if (!window.rtdb || !window.rtdbRemove) return;
    if (!isAdmin()) return;
    try {
      await window.rtdbRemove(window.rtdbRef(window.rtdb, PIPELINE_RTD_PATH + '/' + leadId));
      closeLeadDetail();
    } catch (err) {
      console.error('deletePipelineLead', err);
      alert('Could not delete lead.');
    }
  }

  function initPipelineDragDrop() {
    var board = document.getElementById('pipeline-board');
    if (!board || board.dataset.pipelineDndInit === '1') return;
    board.dataset.pipelineDndInit = '1';

    board.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.pipeline-card');
      if (!card) return;
      pipelineDragLeadId = card.getAttribute('data-lead-id');
      card.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', pipelineDragLeadId || '');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    board.addEventListener('dragend', function (e) {
      var card = e.target.closest('.pipeline-card');
      if (card) card.classList.remove('is-dragging');
      pipelineDragLeadId = null;
      board.querySelectorAll('.pipeline-cards.drag-over').forEach(function (el) {
        el.classList.remove('drag-over');
      });
    });

    board.addEventListener('dragover', function (e) {
      var zone = e.target.closest('.pipeline-cards');
      if (!zone) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      board.querySelectorAll('.pipeline-cards.drag-over').forEach(function (el) {
        el.classList.remove('drag-over');
      });
      zone.classList.add('drag-over');
    });

    board.addEventListener('dragleave', function (e) {
      var zone = e.target.closest('.pipeline-cards');
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });

    board.addEventListener('drop', function (e) {
      var zone = e.target.closest('.pipeline-cards');
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('drag-over');
      var col = zone.closest('.pipeline-col');
      if (!col) return;
      var stage = col.getAttribute('data-stage');
      var leadId = pipelineDragLeadId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      if (!leadId || !stage) return;
      var lead = findPipelineLead(leadId);
      if (lead && lead.stage === stage) return;
      moveLeadStage(leadId, stage);
    });
  }

  function initPipelineBoardInteractions() {
    var board = document.getElementById('pipeline-board');
    if (!board || board.dataset.pipelineClickInit === '1') return;
    board.dataset.pipelineClickInit = '1';

    board.addEventListener('click', function (e) {
      if (e.target.closest('.pipeline-card-stage-select')) return;
      var card = e.target.closest('.pipeline-card');
      if (!card) return;
      var lead = findPipelineLead(card.getAttribute('data-lead-id'));
      if (lead) openLeadDetail(lead);
    });

    board.addEventListener('change', function (e) {
      var sel = e.target.closest('.pipeline-card-stage-select');
      if (!sel) return;
      e.stopPropagation();
      var leadId = sel.getAttribute('data-lead-id');
      var stage = sel.value;
      if (leadId && stage) moveLeadStage(leadId, stage);
    });

    board.addEventListener('mousedown', function (e) {
      if (e.target.closest('.pipeline-card-stage-select')) e.stopPropagation();
    });
  }

  function initPipelineControls() {
    if (adminAddLeadBtn) {
      adminAddLeadBtn.addEventListener('click', function () {
        openLeadModal();
      });
    }
    if (leadForm) leadForm.addEventListener('submit', saveLeadFromForm);
    if (leadModalClose) leadModalClose.addEventListener('click', closeLeadModal);
    if (leadModalOverlay) leadModalOverlay.addEventListener('click', closeLeadModal);
    if (leadDrawerClose) leadDrawerClose.addEventListener('click', closeLeadDetail);
    if (leadDrawerOverlay) leadDrawerOverlay.addEventListener('click', closeLeadDetail);
    if (leadDrawerEditBtn) {
      leadDrawerEditBtn.addEventListener('click', function () {
        var lead = findPipelineLead(pipelineDetailLeadId);
        if (lead) {
          closeLeadDetail();
          openLeadModal(lead);
        }
      });
    }
    if (leadDrawerDeleteBtn) {
      leadDrawerDeleteBtn.addEventListener('click', function () {
        deletePipelineLead(pipelineDetailLeadId);
      });
    }
    var resetBtn = document.getElementById('lead-form-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (leadForm) leadForm.reset();
        if (leadIdInput) leadIdInput.value = '';
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (leadModal && leadModal.classList.contains('active')) closeLeadModal();
      else if (leadDrawer && !leadDrawer.hidden) closeLeadDetail();
    });
    initPipelineDragDrop();
    initPipelineBoardInteractions();
  }

  initPipelineControls();
  closeLeadDetail();
  window.openLeadModal = openLeadModal;
  window.subscribePipelineLeads = subscribePipelineLeads;
  window.unsubscribePipelineLeads = unsubscribePipelineLeads;

  initAdminTabs();

  // Sync kpi-new-messages from existing messages stats
  var kpiNewMsgs = document.getElementById('kpi-new-messages');
  var srcNewMsgs = document.getElementById('new-messages');
  if (kpiNewMsgs && srcNewMsgs) {
    var kpiObserver = new MutationObserver(function() {
      kpiNewMsgs.textContent = srcNewMsgs.textContent || '0';
    });
    kpiObserver.observe(srcNewMsgs, { childList: true, characterData: true, subtree: true });
    kpiNewMsgs.textContent = srcNewMsgs.textContent || '0';
  }

  // Mobile "More" overflow dropdown for admin tab bar
  (function initAdminTabMore() {
    var bar      = document.querySelector('.admin-tab-bar');
    var moreWrap = document.getElementById('admin-tab-more-wrap');
    var moreBtn  = document.getElementById('admin-tab-more-btn');
    var dropdown = document.getElementById('admin-tab-more-dropdown');
    if (!bar || !moreBtn || !dropdown) return;

    var overflowTabs = [];

    function collectOverflowTabs() {
      return Array.prototype.slice.call(
        bar.querySelectorAll('.admin-tab[data-admin-tab]:not([data-mobile-primary])')
      );
    }

    function rebuildDropdown() {
      dropdown.innerHTML = '';
      overflowTabs = collectOverflowTabs();
      var order = window.AdminMobileTabOrder && window.AdminMobileTabOrder.getOrder
        ? window.AdminMobileTabOrder.getOrder()
        : null;
      if (order && order.length) {
        var byId = {};
        overflowTabs.forEach(function (tab) {
          byId[tab.getAttribute('data-admin-tab')] = tab;
        });
        overflowTabs = order
          .map(function (id) { return byId[id]; })
          .filter(Boolean);
      }

      overflowTabs.forEach(function(tab) {
        var tabId   = tab.getAttribute('data-admin-tab');
        var iconEl  = tab.querySelector('ion-icon');
        var labelEl = tab.querySelector('.admin-tab-label-mobile') || tab.querySelector('.admin-tab-label-desktop');
        var iconName = iconEl ? iconEl.getAttribute('name') : 'apps-outline';
        var label    = labelEl ? labelEl.textContent.trim() : tabId;

        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'admin-tab-more-item';
        item.setAttribute('role', 'option');
        item.setAttribute('data-more-tab', tabId);
        item.innerHTML = '<ion-icon name="' + iconName + '" aria-hidden="true"></ion-icon><span>' + label + '</span>';

        item.addEventListener('click', function() {
          if (window.AdminMobileTabOrder && window.AdminMobileTabOrder.isReorderActive()) return;
          if (typeof window.adminActivateTab === 'function') window.adminActivateTab(tabId);
          closeDropdown();
          syncMoreState();
        });

        dropdown.appendChild(item);
      });
      syncMoreState();
    }

    window.rebuildAdminTabMoreDropdown = rebuildDropdown;
    rebuildDropdown();

    function openDropdown() {
      var rect = moreBtn.getBoundingClientRect();
      // Detach from tab bar and re-attach to body to escape overflow-x:auto clipping
      if (dropdown.parentNode !== document.body) document.body.appendChild(dropdown);
      // Open upward above the fixed bottom tab bar
      dropdown.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      dropdown.style.right  = (window.innerWidth - rect.right) + 'px';
      dropdown.style.left   = 'auto';
      dropdown.style.top    = 'auto';
      moreBtn.setAttribute('aria-expanded', 'true');
      dropdown.setAttribute('aria-hidden', 'false');
      dropdown.classList.add('is-open');
    }

    function closeDropdown() {
      moreBtn.setAttribute('aria-expanded', 'false');
      dropdown.setAttribute('aria-hidden', 'true');
      dropdown.classList.remove('is-open');
    }

    function syncMoreState() {
      var anyActive = overflowTabs.some(function(t) { return t.classList.contains('is-active'); });
      moreWrap.classList.toggle('has-active', anyActive);
      var labelEl = moreBtn.querySelector('.admin-tab-more-label');
      if (labelEl) labelEl.textContent = anyActive ? 'More' : 'More';

      // Sync active state on dropdown items
      dropdown.querySelectorAll('.admin-tab-more-item').forEach(function(item) {
        var t = document.getElementById('admin-tab-' + item.getAttribute('data-more-tab'));
        item.classList.toggle('is-active', !!(t && t.classList.contains('is-active')));
      });
    }

    moreBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (window.AdminMobileTabOrder && window.AdminMobileTabOrder.isReorderActive()) return;
      if (dropdown.classList.contains('is-open')) { closeDropdown(); } else { openDropdown(); syncMoreState(); }
    });

    // Close on outside click (dropdown may be on body, so check both)
    document.addEventListener('click', function(e) {
      if (!moreWrap.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });

    // Re-sync whenever any tab is clicked (primary or overflow)
    bar.querySelectorAll('.admin-tab[data-admin-tab]').forEach(function(tab) {
      tab.addEventListener('click', function() { setTimeout(syncMoreState, 0); });
    });

    syncMoreState();
  }());

  // Business Documents section collapsible (optional accordion header)
  var businessDocsSection = document.getElementById('business-docs-section');
  var businessDocsToggle = document.getElementById('business-docs-toggle');
  var businessDocsContent = document.getElementById('business-docs-content');
  var BUSINESS_DOCS_OPEN_KEY = 'businessDocsSectionOpen';

  function setBusinessDocsOpen(open) {
    if (!businessDocsSection || !businessDocsContent) return;
    try {
      sessionStorage.setItem(BUSINESS_DOCS_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    businessDocsSection.classList.toggle('business-docs-open', !!open);
    if (businessDocsToggle) {
      businessDocsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  if (businessDocsContent) {
    if (businessDocsToggle) {
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
    } else {
      setBusinessDocsOpen(true);
    }
  }

  // Contact Messages collapsible (optional accordion header)
  var messagesSection = document.getElementById('messages-section');
  var messagesToggle = document.getElementById('messages-toggle');
  var messagesContent = document.getElementById('messages-content');
  var MESSAGES_OPEN_KEY = 'adminMessagesSectionOpen';

  function setMessagesOpen(open) {
    if (!messagesSection || !messagesContent) return;
    try {
      sessionStorage.setItem(MESSAGES_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    messagesSection.classList.toggle('admin-collapsible-open', !!open);
    if (messagesToggle) {
      messagesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  if (messagesContent) {
    if (messagesToggle) {
      var messagesStored = null;
      try {
        messagesStored = sessionStorage.getItem(MESSAGES_OPEN_KEY);
      } catch (e) {}
      var messagesDefaultDesktop =
        messagesStored === '1' ||
        (messagesStored == null && typeof window.matchMedia === 'function' &&
          window.matchMedia('(min-width: 1024px)').matches);
      setMessagesOpen(messagesDefaultDesktop);
      messagesToggle.addEventListener('click', function() {
        var isOpen = messagesSection.classList.contains('admin-collapsible-open');
        setMessagesOpen(!isOpen);
      });
    } else {
      setMessagesOpen(true);
    }
  }

  // Blog Management collapsible (optional accordion header)
  var blogSection = document.getElementById('blog-section');
  var blogToggle = document.getElementById('blog-toggle');
  var blogContent = document.getElementById('admin-blog-collapsible-content');
  var BLOG_OPEN_KEY = 'adminBlogSectionOpen';

  function setBlogOpen(open) {
    if (!blogSection || !blogContent) return;
    try {
      sessionStorage.setItem(BLOG_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
    blogSection.classList.toggle('admin-collapsible-open', !!open);
    if (blogToggle) {
      blogToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  if (blogContent) {
    if (blogToggle) {
      var blogStored = null;
      try {
        blogStored = sessionStorage.getItem(BLOG_OPEN_KEY);
      } catch (e) {}
      setBlogOpen(blogStored === '1');
      blogToggle.addEventListener('click', function() {
        var isOpen = blogSection.classList.contains('admin-collapsible-open');
        setBlogOpen(!isOpen);
      });
    } else {
      setBlogOpen(true);
    }
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
    if (!isAdmin()) {
      return;
    }
    if (!window.db) {
      console.warn('Firestore not initialized, cannot fetch messages');
      lastContactFormMessages = [];
      contactDetailOpenId = null;
      closeContactDetailDrawer();
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
      if (typeof firestoreMessagesUnsubscribe === 'function') {
        try {
          firestoreMessagesUnsubscribe();
        } catch (unsubErr) {
          console.warn('Firestore listener cleanup:', unsubErr);
        }
        firestoreMessagesUnsubscribe = null;
      }

      const messagesRef = window.collection(window.db, 'messages');
      const q = window.query(messagesRef, window.orderBy('timestamp', 'desc'));

      const snapUnsub = window.onSnapshot(q, (snapshot) => {
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
        lastContactFormMessages = [];
        contactDetailOpenId = null;
        closeContactDetailDrawer();
        const permissionHint =
          error && error.code === 'permission-denied'
            ? '<p>Sign in with an allowlisted Google account. Deploy rules: <code>firebase deploy --only firestore:rules,database</code>.</p>'
            : '<p>Make sure firestore.rules is deployed to Firebase.</p>';
        if (messagesList) {
          messagesList.innerHTML = `
            <div class="no-messages">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <p>Error loading messages: ${error.message}</p>
              ${permissionHint}
            </div>
          `;
        }
      });
      if (typeof snapUnsub === 'function') {
        firestoreMessagesUnsubscribe = snapUnsub;
      }
    } catch (error) {
      console.error('Error setting up message listener:', error);
      lastContactFormMessages = [];
      contactDetailOpenId = null;
      closeContactDetailDrawer();
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

  /** Legacy hire-me docs stored one string: "Project Type: …\\nBudget: …\\n\\nMessage:\\n…" */
  function parseLegacyHireMeComposedMessage(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const m = raw.match(
      /^Project Type:\s*(.+?)\r?\nBudget:\s*(.+?)\r?\n\r?\nMessage:\r?\n([\s\S]*)$/
    );
    if (!m) return null;
    return {
      project_type: m[1].trim(),
      budget: m[2].trim(),
      body: m[3]
    };
  }

  function normalizeHireMeCardDisplay(message) {
    const raw = String(message.message || '');
    if ((message.source || '') !== 'hire-me') {
      return { showHireDetails: false, project_type: '', budget: '', body: raw };
    }
    const ptStored = message.project_type != null ? String(message.project_type).trim() : '';
    const bdStored = message.budget != null ? String(message.budget).trim() : '';
    if (ptStored !== '' || bdStored !== '') {
      return {
        showHireDetails: true,
        project_type: ptStored,
        budget: bdStored,
        body: raw
      };
    }
    const legacy = parseLegacyHireMeComposedMessage(raw);
    if (legacy) {
      return {
        showHireDetails: true,
        project_type: legacy.project_type,
        budget: legacy.budget,
        body: legacy.body
      };
    }
    return { showHireDetails: false, project_type: '', budget: '', body: raw };
  }

  function getContactMessageById(messageId) {
    return lastContactFormMessages.find(function (m) {
      return m.id === messageId;
    });
  }

  function getContactTimestampMs(message) {
    if (!message || !message.timestamp) return 0;
    try {
      const d = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    } catch (err) {
      return 0;
    }
  }

  function sortContactMessagesSnapshot(arr, spec) {
    const key = spec.key || 'date';
    const dirMult = spec.dir === 'asc' ? 1 : -1;
    return arr.slice().sort(function (a, b) {
      let cmp = 0;
      if (key === 'date') {
        cmp = getContactTimestampMs(a) - getContactTimestampMs(b);
      } else if (key === 'name') {
        cmp = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
      } else if (key === 'status') {
        cmp = String(a.status || 'new').localeCompare(String(b.status || 'new'));
      }
      return cmp * dirMult;
    });
  }

  function formatContactTableDate(ts) {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(d.getTime())) return '—';
      const compact = window.matchMedia('(max-width: 767px)').matches;
      if (compact) {
        return d.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
  }

  function renderContactSortTh(key, label) {
    const on = contactMessagesSort.key === key;
    const cls =
      'admin-contact-table__th admin-contact-table__th--sortable' +
      (on ? ' is-active is-' + contactMessagesSort.dir : '');
    const ariaSort = on ? (contactMessagesSort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
    return (
      '<th scope="col" class="' +
      cls +
      '" data-contact-sort="' +
      key +
      '" role="columnheader" tabindex="0" aria-sort="' +
      ariaSort +
      '">' +
      label +
      '</th>'
    );
  }

  function closeContactDetailDrawer() {
    const root = document.getElementById('admin-contact-detail');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    contactDetailOpenId = null;
    document.body.classList.remove('admin-contact-detail-open');
  }

  function fillContactDetailDrawer(message) {
    const titleEl = document.getElementById('admin-contact-detail-title');
    const bodyEl = document.getElementById('admin-contact-detail-body');
    const footEl = document.getElementById('admin-contact-detail-foot');
    if (!message || !titleEl || !bodyEl || !footEl) return;

    const disp = normalizeHireMeCardDisplay(message);
    const st = message.status || 'new';
    const safeSt = escapeHtml(st);

    titleEl.textContent = message.subject || 'Contact submission';

    const hireBlocks =
      disp.showHireDetails && (disp.project_type !== '' || disp.budget !== '')
        ? [
            '<div class="message-card-hire-meta">',
            disp.project_type !== ''
              ? '<div class="message-card-hire-section message-card-hire-section--project"><div class="message-card-hire-section-head">' +
                '<span class="message-card-hire-icon-wrap"><ion-icon name="layers-outline" aria-hidden="true"></ion-icon></span>' +
                '<span class="message-card-hire-section-label">Project type</span></div>' +
                '<p class="message-card-hire-section-value">' +
                escapeHtml(disp.project_type) +
                '</p></div>'
              : '',
            disp.budget !== ''
              ? '<div class="message-card-hire-section message-card-hire-section--budget"><div class="message-card-hire-section-head">' +
                '<span class="message-card-hire-icon-wrap"><ion-icon name="wallet-outline" aria-hidden="true"></ion-icon></span>' +
                '<span class="message-card-hire-section-label">Budget</span></div>' +
                '<p class="message-card-hire-section-value">' +
                escapeHtml(disp.budget) +
                '</p></div>'
              : '',
            '</div>'
          ].join('')
        : '';

    const emailRaw = (message.email || '').trim();
    const emailBlock = emailRaw
      ? [
          '<div class="admin-contact-detail__field"><dt>Email</dt><dd><a class="admin-contact-detail__mailto" href="mailto:',
          escapeHtml(emailRaw),
          '">',
          escapeHtml(emailRaw),
          '</a></dd></div>'
        ].join('')
      : '<div class="admin-contact-detail__field"><dt>Email</dt><dd class="admin-contact-detail__empty">—</dd></div>';

    bodyEl.innerHTML = [
      '<dl class="admin-contact-detail__meta">',
      '<div class="admin-contact-detail__field"><dt>Status</dt><dd><span class="status-badge status-' + safeSt + '">' + safeSt + '</span></dd></div>',
      '<div class="admin-contact-detail__field"><dt>From</dt><dd>',
      escapeHtml(message.name || 'Anonymous'),
      '</dd></div>',
      emailBlock,
      message.source
        ? '<div class="admin-contact-detail__field"><dt>Source</dt><dd>' + escapeHtml(String(message.source)) + '</dd></div>'
        : '',
      '<div class="admin-contact-detail__field"><dt>Date</dt><dd>',
      escapeHtml(formatDate(message.timestamp)),
      '</dd></div>',
      '<div class="admin-contact-detail__field admin-contact-detail__field--message"><dt>Message</dt><dd class="admin-contact-detail__prose">',
      escapeHtml(disp.body).replace(/\n/g, '<br>'),
      '</dd></div>',
      '</dl>',
      hireBlocks
    ].join('');

    footEl.innerHTML = [
      '<button type="button" class="btn reply-btn" data-id="',
      escapeHtml(message.id),
      '" title="Reply to this message"><ion-icon name="return-up-forward-outline" aria-hidden="true"></ion-icon><span>Reply</span></button>',
      message.status !== 'replied'
        ? '<button type="button" class="btn btn-secondary mark-replied-btn" data-id="' +
          escapeHtml(message.id) +
          '" title="Mark as replied"><ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon><span>Mark replied</span></button>'
        : '',
      '<button type="button" class="delete-message-btn btn-icon" data-id="' +
        escapeHtml(message.id) +
        '" title="Delete submission"><ion-icon name="trash-outline" aria-hidden="true"></ion-icon></button>'
    ].join('');

    footEl.querySelectorAll('.reply-btn').forEach(function (btn) {
      btn.addEventListener('click', handleReplyClick);
    });
    footEl.querySelectorAll('.mark-replied-btn').forEach(function (btn) {
      btn.addEventListener('click', handleMarkRepliedClick);
    });
    footEl.querySelectorAll('.delete-message-btn').forEach(function (btn) {
      btn.addEventListener('click', handleDeleteMessageBtnClick);
    });
  }

  function openContactDetailDrawer(messageId) {
    const root = document.getElementById('admin-contact-detail');
    const msg = getContactMessageById(messageId);
    if (!root || !msg) return;
    contactDetailOpenId = messageId;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-contact-detail-open');
    fillContactDetailDrawer(msg);
    try {
      const closeBtn = document.getElementById('admin-contact-detail-close');
      if (closeBtn) closeBtn.focus();
    } catch (fe) {}
  }

  function refreshContactDetailDrawerIfOpen() {
    if (!contactDetailOpenId) return;
    const msg = getContactMessageById(contactDetailOpenId);
    if (msg) {
      fillContactDetailDrawer(msg);
    } else {
      closeContactDetailDrawer();
    }
  }

  function handleContactTableSortFromTh(th) {
    const key = th.getAttribute('data-contact-sort');
    if (!key) return;
    if (contactMessagesSort.key === key) {
      contactMessagesSort.dir = contactMessagesSort.dir === 'desc' ? 'asc' : 'desc';
    } else {
      contactMessagesSort.key = key;
      contactMessagesSort.dir = key === 'date' ? 'desc' : 'asc';
    }
    renderMessages(lastContactFormMessages);
    refreshContactDetailDrawerIfOpen();
    try {
      const active = messagesList && messagesList.querySelector('th[data-contact-sort="' + key + '"]');
      if (active) active.focus();
    } catch (e) {}
  }

  /** Toggle has-scroll on the contact table wrap when horizontal overflow exists (pairs with has-scrollbar). */
  let adminContactTableScrollSyncTimer = null;
  function syncAdminContactTableScrollState() {
    if (!messagesList) return;
    const wrap = messagesList.querySelector('.admin-contact-messages__table-wrap');
    if (!wrap || !wrap.classList.contains('has-scrollbar')) return;
    wrap.classList.toggle('has-scroll', wrap.scrollWidth > wrap.clientWidth + 2);
  }

  function scheduleAdminContactTableScrollSync() {
    if (!messagesList) return;
    clearTimeout(adminContactTableScrollSyncTimer);
    adminContactTableScrollSyncTimer = setTimeout(syncAdminContactTableScrollState, 60);
  }

  let adminContactTableDateFmtMq =
    typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 767px)') : null;
  if (adminContactTableDateFmtMq && typeof adminContactTableDateFmtMq.addEventListener === 'function') {
    adminContactTableDateFmtMq.addEventListener('change', function () {
      if (lastContactFormMessages.length) renderMessages(lastContactFormMessages);
    });
  }

  // Render messages in the dashboard (datasheet all sizes; row opens detail drawer)
  function renderMessages(messages) {
    if (!messagesList) return;

    if (messages.length === 0) {
      lastContactFormMessages = [];
      contactDetailOpenId = null;
      closeContactDetailDrawer();
      messagesList.innerHTML = `
        <div class="no-messages">
          <ion-icon name="mail-outline"></ion-icon>
          <p>No messages yet</p>
        </div>
      `;
      return;
    }

    lastContactFormMessages = messages.slice();
    const sorted = sortContactMessagesSnapshot(lastContactFormMessages, contactMessagesSort);

    const tableRows = sorted
      .map(function (message) {
        const st = message.status || 'new';
        const safeSt = escapeHtml(st);
        const em = escapeHtml(message.email || '');
        const src = message.source ? escapeHtml(String(message.source)) : '—';
        return [
          '<tr class="message-item admin-contact-table__row" role="button" tabindex="0" aria-label="Open submission details" data-status="',
          st,
          '" data-id="',
          escapeHtml(message.id),
          '">',
          '<td class="admin-contact-table__td admin-contact-table__td--muted" data-label="Date">',
          escapeHtml(formatContactTableDate(message.timestamp)),
          '</td>',
          '<td class="admin-contact-table__td admin-contact-table__td--status" data-label="Status"><span class="status-badge status-' +
          safeSt +
          '">' +
          safeSt +
          '</span></td>',
          '<td class="admin-contact-table__td" data-label="From">',
          escapeHtml(message.name || 'Anonymous'),
          '</td>',
          '<td class="admin-contact-table__td admin-contact-table__td--ellipsis" data-label="Email">',
          em ? '<a href="mailto:' + em + '">' + em + '</a>' : '—',
          '</td>',
          '<td class="admin-contact-table__td admin-contact-table__td--ellipsis" data-label="Source" title="',
          src,
          '">',
          src,
          '</td>',
          '</tr>'
        ].join('');
      })
      .join('');

    messagesList.innerHTML =
      '<div class="admin-contact-messages">' +
      '<div class="admin-contact-messages__table-wrap has-scrollbar" role="region" aria-label="Contact submissions table">' +
      '<table class="admin-contact-table">' +
      '<thead><tr>' +
      renderContactSortTh('date', 'Date') +
      renderContactSortTh('status', 'Status') +
      renderContactSortTh('name', 'From') +
      '<th scope="col" class="admin-contact-table__th">Email</th>' +
      '<th scope="col" class="admin-contact-table__th">Source</th>' +
      '</tr></thead><tbody>' +
      tableRows +
      '</tbody></table></div></div>';

    filterMessages();
    refreshContactDetailDrawerIfOpen();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        requestAnimationFrame(syncAdminContactTableScrollState);
      });
    } else {
      syncAdminContactTableScrollState();
    }
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

  // Handle reply button click (detail drawer footer — data from Firestore cache)
  function handleReplyClick(e) {
    const btn = e.target.closest('.reply-btn');
    if (!btn || !btn.dataset || !btn.dataset.id) return;
    const msg = getContactMessageById(btn.dataset.id);
    if (!msg) return;
    const disp = normalizeHireMeCardDisplay(msg);
    showReplyModal({
      id: btn.dataset.id,
      name: msg.name || 'Anonymous',
      email: msg.email || '',
      subject: msg.subject || 'No subject',
      message: disp.body
    });
  }

  // Handle mark as replied button click
  async function handleMarkRepliedClick(e) {
    const btn = e.target.closest('.mark-replied-btn');
    const messageId = btn && btn.dataset ? btn.dataset.id : e.target.dataset.id;
    if (!messageId) return;

    try {
      const messageRef = window.doc(window.db, 'messages', messageId);
      await window.updateDoc(messageRef, {
        status: 'replied'
      });
    } catch (error) {
      console.error('Error marking message as replied:', error);
    }
  }

  function closeDeleteContactConfirmModal() {
    const modal = document.getElementById('delete-contact-confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    delete modal.dataset.pendingMessageId;
  }

  function openDeleteContactConfirmModal(messageId) {
    const modal = document.getElementById('delete-contact-confirm-modal');
    if (!modal) return;
    modal.dataset.pendingMessageId = messageId;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    var cancelBtn = document.getElementById('delete-contact-confirm-cancel');
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  async function handleDeleteContactConfirmClick() {
    var modal = document.getElementById('delete-contact-confirm-modal');
    var messageId = modal && modal.dataset ? modal.dataset.pendingMessageId : '';
    if (!messageId || !window.db || !window.deleteDoc) {
      closeDeleteContactConfirmModal();
      return;
    }
    try {
      await window.deleteDoc(window.doc(window.db, 'messages', messageId));
      closeDeleteContactConfirmModal();
      if (contactDetailOpenId === messageId) {
        closeContactDetailDrawer();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      var msg = error && error.message ? error.message : String(error);
      if (typeof showErrorMessage === 'function') {
        showErrorMessage('Could not delete: ' + msg);
      } else {
        alert('Could not delete: ' + msg);
      }
      closeDeleteContactConfirmModal();
    }
  }

  function handleDeleteMessageBtnClick(e) {
    const btn = e.target.closest('.delete-message-btn');
    if (!btn || !window.db || !window.deleteDoc) return;
    const messageId = btn.dataset.id;
    if (!messageId) return;
    openDeleteContactConfirmModal(messageId);
  }

  function closeDeleteTestimonialConfirmModal() {
    var modal = document.getElementById("delete-testimonial-confirm-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    delete modal.dataset.pendingKind;
    delete modal.dataset.pendingId;
  }

  function openDeleteTestimonialConfirmModal(kind, id) {
    var modal = document.getElementById("delete-testimonial-confirm-modal");
    var titleEl = document.getElementById("delete-testimonial-confirm-title");
    var descEl = document.getElementById("delete-testimonial-confirm-desc");
    var delBtn = document.getElementById("delete-testimonial-confirm-delete");
    if (!modal || !titleEl || !descEl || !delBtn) return;
    if (!id || (kind !== "token" && kind !== "published")) return;
    modal.dataset.pendingKind = kind;
    modal.dataset.pendingId = id;
    if (kind === "token") {
      titleEl.textContent = "Delete invite link?";
      descEl.textContent =
        "This removes the invite document from Firestore. If a testimonial was already published with this link, it will stay on the site until you remove it separately.";
      delBtn.textContent = "Delete link";
    } else {
      titleEl.textContent = "Remove testimonial?";
      descEl.textContent =
        "This permanently removes this quote from your Home page. The invite cannot be reused; send a new invite if you need another submission.";
      delBtn.textContent = "Remove";
    }
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    var cancelBtn = document.getElementById("delete-testimonial-confirm-cancel");
    if (cancelBtn) {
      setTimeout(function () {
        cancelBtn.focus();
      }, 40);
    }
  }

  async function handleDeleteTestimonialConfirmClick() {
    var modal = document.getElementById("delete-testimonial-confirm-modal");
    var kind = modal && modal.dataset ? modal.dataset.pendingKind : "";
    var id = modal && modal.dataset ? modal.dataset.pendingId : "";
    if (!modal || !kind || !id || !window.db || !window.deleteDoc || !window.doc) {
      closeDeleteTestimonialConfirmModal();
      return;
    }
    try {
      if (kind === "token") {
        await window.deleteDoc(window.doc(window.db, "testimonialTokens", id));
      } else {
        await window.deleteDoc(window.doc(window.db, "testimonials", id));
        if (typeof window.loadDynamicTestimonials === "function") {
          window.loadDynamicTestimonials();
        }
      }
      closeDeleteTestimonialConfirmModal();
      if (typeof window.loadTestimonialAdminPanel === "function") {
        window.loadTestimonialAdminPanel();
      }
    } catch (error) {
      console.error("Testimonial admin delete failed:", error);
      var msg = error && error.message ? error.message : String(error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage("Could not complete action: " + msg);
      } else {
        alert("Could not complete action: " + msg);
      }
      closeDeleteTestimonialConfirmModal();
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
      closeContactDetailDrawer();
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

  // Send reply / customer copy via Resend (HTTPS function)
  async function sendReplyEmail(messageData, subject, message) {
    if (!messageData || !messageData.email) {
      throw new Error('Missing customer email');
    }
    await sendPortfolioEmailRequest(
      {
        type: 'admin_reply',
        payload: {
          to_email: String(messageData.email),
          to_name: String(messageData.name || 'Customer'),
          from_name: 'Ruben Jimenez',
          subject: String(subject),
          message: String(message),
          timestamp: new Date().toISOString()
        }
      },
      { requireAdmin: true }
    );
    return { ok: true };
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
  window.sendReplyEmail = sendReplyEmail;

})();

// ─────────────────────────────────────────────
// Business Ops protocol links (now on own admin subtab)
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  attachSubModalListeners();
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
    { id: 'nav-portfolio', label: 'Go to Portfolio', icon: 'grid-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('portfolio'); } },
    { id: 'nav-services', label: 'Go to Services & Pricing', icon: 'pricetag-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('services-pricing'); } },
    { id: 'nav-contact', label: 'Go to Contact', icon: 'mail-outline', action: () => { if (typeof switchToPage === 'function') switchToPage('contact'); } },
    { id: 'copy-email', label: 'Copy email', icon: 'copy-outline', action: copyEmail },
    { id: 'toggle-theme', label: 'Toggle dark mode', icon: 'moon-outline', action: () => { if (typeof toggleTheme === 'function') toggleTheme(); } }
  ];

  function isAdminSignedIn() {
    return typeof isAdminSession === 'function' && isAdminSession();
  }

  function runAdminTab(tabId, afterFn) {
    if (typeof switchToPage === 'function') switchToPage('admin');
    setTimeout(function () {
      if (typeof window.adminActivateTab === 'function') window.adminActivateTab(tabId);
      if (typeof afterFn === 'function') setTimeout(afterFn, 90);
    }, 60);
  }

  function clickById(id) {
    var el = document.getElementById(id);
    if (el) el.click();
  }

  function getAdminCommands() {
    if (!isAdminSignedIn()) return [];
    return [
      { id: 'admin-open', label: 'Admin: Open dashboard', icon: 'grid-outline', search: 'admin dashboard', action: function () { if (typeof switchToPage === 'function') switchToPage('admin'); } },
      { id: 'admin-messages', label: 'Admin: Contact messages', icon: 'mail-outline', search: 'admin contact messages inbox', action: function () { runAdminTab('messages'); } },
      { id: 'admin-pipeline', label: 'Admin: Client pipeline', icon: 'git-network-outline', search: 'admin pipeline leads crm', action: function () { runAdminTab('pipeline'); } },
      { id: 'admin-hub', label: 'Admin: Project hub', icon: 'layers-outline', search: 'admin project hub client', action: function () { runAdminTab('hub'); } },
      { id: 'admin-maintenance', label: 'Admin: Maintenance & SLA', icon: 'construct-outline', search: 'admin maintenance sla', action: function () { runAdminTab('maintenance'); } },
      { id: 'admin-portfolio', label: 'Admin: Portfolio projects', icon: 'albums-outline', search: 'admin portfolio projects', action: function () { runAdminTab('portfolio'); } },
      { id: 'admin-blog', label: 'Admin: Blog management', icon: 'newspaper-outline', search: 'admin blog posts', action: function () { runAdminTab('blog'); } },
      { id: 'admin-docs', label: 'Admin: Business documents', icon: 'document-text-outline', search: 'admin documents proposal invoice', action: function () { runAdminTab('docs'); } },
      { id: 'admin-dm-inbox', label: 'Admin: Open DM inbox', icon: 'chatbubbles-outline', search: 'admin dm inbox messages realtime', action: function () { runAdminTab('messages', function () { clickById('admin-open-dm-inbox'); }); } },
      { id: 'admin-add-lead', label: 'Admin: Add pipeline lead', icon: 'person-add-outline', search: 'admin add lead pipeline new', action: function () { runAdminTab('pipeline', function () { if (typeof window.openLeadModal === 'function') window.openLeadModal(); }); } },
      { id: 'admin-new-hub', label: 'Admin: New project hub', icon: 'add-circle-outline', search: 'admin new project hub', action: function () { runAdminTab('hub', function () { clickById('project-hub-add-btn'); }); } },
      { id: 'admin-new-portfolio', label: 'Admin: New portfolio project', icon: 'add-outline', search: 'admin new portfolio project', action: function () { runAdminTab('portfolio', function () { clickById('admin-add-portfolio-btn'); }); } },
      { id: 'admin-new-blog', label: 'Admin: New blog post', icon: 'create-outline', search: 'admin new blog post', action: function () { runAdminTab('blog', function () { clickById('admin-add-blog-btn'); }); } },
      { id: 'admin-new-doc', label: 'Admin: New business document', icon: 'document-outline', search: 'admin new document proposal', action: function () { runAdminTab('docs', function () { clickById('business-doc-create-btn'); }); } }
    ];
  }

  function getCommandPaletteProjects() {
    const raw =
      window.portfolioProjects && window.portfolioProjects.length
        ? window.portfolioProjects
        : (window.DEFAULT_PORTFOLIO_PROJECTS || []).map(function (r, i) {
            return Object.assign({}, r, { id: 'builtin-' + i });
          });
    return raw
      .filter(function (p) {
        const u = String(p.projectUrl || '').trim();
        return u && u !== '#' && /^https?:\/\//i.test(u);
      })
      .map(function (p) {
        return { title: p.title || 'Project', url: String(p.projectUrl).trim() };
      });
  }

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
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--orange-yellow-crayola);color:var(--smoky-black);padding:8px 16px;border-radius:8px;font-size:14px;z-index:10080;animation:fade 0.3s ease;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function buildFullList() {
    const nav = COMMANDS.map(c => ({ ...c, type: 'command', search: c.label.toLowerCase() }));
    const projects = getCommandPaletteProjects().map(function (p) {
      return {
        id: 'proj-' + p.title.toLowerCase().replace(/\s+/g, '-'),
        label: 'Open ' + p.title,
        icon: 'open-outline',
        url: p.url,
        type: 'project',
        search: p.title.toLowerCase()
      };
    });
    return nav.concat(getAdminCommands()).concat(projects);
  }

  let fullList = buildFullList();
  let filtered = [];
  let selectedIndex = 0;

  function isAdminOverlayOpen() {
    if (document.body.classList.contains('admin-contact-detail-open')) return true;
    if (document.body.classList.contains('lead-drawer-open')) return true;
    if (document.body.classList.contains('admin-dm-sheet-open')) return true;
    var dmRoot = document.getElementById('admin-dm-sheet-root');
    if (dmRoot && dmRoot.classList.contains('is-open')) return true;
    if (document.querySelector('.agency-modal.active')) return true;
    if (document.querySelector('.business-doc-modal.active')) return true;
    if (document.querySelector('.add-blog-modal.active')) return true;
    if (document.querySelector('.modal-container.active')) return true;
    if (document.body.classList.contains('project-modal-open')) return true;
    if (document.body.classList.contains('admin-tab-reorder-active')) return true;
    if (document.querySelector('.project-detail-modal.active')) return true;
    return false;
  }

  function syncCommandPaletteHintVisibility() {
    var h = document.getElementById('command-palette-hint');
    if (!h || overlay.classList.contains('active')) return;
    if (isAdminOverlayOpen()) {
      h.style.visibility = 'hidden';
      h.style.opacity = '0';
      h.style.pointerEvents = 'none';
    } else {
      h.style.visibility = '';
      h.style.opacity = '';
      h.style.pointerEvents = '';
    }
  }

  function open() {
    if (isAdminOverlayOpen()) return;
    fullList = buildFullList();
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
    syncCommandPaletteHintVisibility();
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
      if (isAdminOverlayOpen()) return;
      if (overlay.classList.contains('active')) close();
      else open();
    }
  });

  if (typeof MutationObserver !== 'undefined') {
    var overlayObserver = new MutationObserver(syncCommandPaletteHintVisibility);
    overlayObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
      attributeOldValue: false
    });
    ['admin-dm-sheet-root'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) overlayObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
    document.querySelectorAll('.agency-modal, .business-doc-modal, .add-blog-modal, .modal-container').forEach(function (el) {
      overlayObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }
  syncCommandPaletteHintVisibility();

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

  var heroReveal = document.querySelector('[data-home-hero-reveal]');
  if (heroReveal) {
    gsap.from(heroReveal, {
      opacity: 0,
      y: 20,
      duration: 0.55,
      ease: 'power2.out'
    });
  }

  // Staggered Bento reveal on load (includes home Who I Am card after grid)
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
  var magneticTargets = document.querySelectorAll('.btn-hire-me, .btn-bento-cta');
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

// ─────────────────────────────────────────────
// Professional DM System (Realtime Database inbox + customer portal)
// ─────────────────────────────────────────────
(function () {
  'use strict';

  const DM = {
    conversations: [],
    filteredConversations: [],
    activeConversationId: null,
    activeConversationData: null,
    oldestMessageKey: null,
    currentMessagePageSize: 30,
    unsubConversations: null,
    unsubMessages: null,
    unsubCustomerMessages: null,
    unsubAdminPresence: null,
    unsubCustomerPresence: null,
    typingTimer: null,
    customerSession: null
  };

  function hasDMDeps() {
    return !!(
      window.rtdb &&
      window.rtdbRef &&
      window.rtdbOnValue &&
      window.rtdbPush &&
      window.rtdbSet &&
      window.rtdbUpdate &&
      window.rtdbGet &&
      window.rtdbQuery &&
      window.rtdbOrderByChild &&
      window.rtdbOrderByKey &&
      window.rtdbLimitToLast &&
      window.rtdbLimitToFirst &&
      window.rtdbEqualTo &&
      window.rtdbEndBefore &&
      window.rtdbServerTimestamp &&
      window.db &&
      window.collection &&
      window.getDocs &&
      window.query
    );
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

  /** Milliseconds for sorting thread rows (RTDB key order can diverge from createdAt after imports or skew). */
  function dmMessageCreatedMs(msg) {
    if (!msg || msg.createdAt == null || msg.createdAt === '') return 0;
    var v = msg.createdAt;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v != null) {
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (v.seconds != null) {
        return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
      }
    }
    var t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
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

  /**
   * Removes conversation meta, all thread messages, and presence for one id (atomic multi-path update).
   */
  async function deleteConversationFromRtdb(conversationId) {
    const id = String(conversationId || '').trim();
    if (!id) throw new Error('Invalid conversation id');
    if (!window.rtdb || !window.rtdbRef || !window.rtdbUpdate) {
      throw new Error('Realtime Database is not ready');
    }
    const rootRef = window.rtdbRef(window.rtdb);
    const patch = {};
    patch['dm/meta/' + id] = null;
    patch['dm/threadMessages/' + id] = null;
    patch['dm/presence/' + id] = null;
    await window.rtdbUpdate(rootRef, patch);
  }

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
    const flags = window.DM_FEATURE_FLAGS || {};
    if (typeof flags.enableCustomerDmPortal === 'boolean') {
      return flags.enableCustomerDmPortal;
    }
    if (typeof flags.enableCustomerMagicLinks === 'boolean') {
      return flags.enableCustomerMagicLinks;
    }
    return true;
  }

  function getAdminIdentity() {
    if (currentUser && currentUser.username) {
      return { id: 'admin-' + currentUser.username, name: currentUser.username };
    }
    return { id: 'admin', name: 'Admin' };
  }

  function upgradeDmInboxFilterStrip() {
    const root = document.getElementById('dm-inbox-filters');
    if (!root || root.querySelector('[data-filter="pending"]')) return;
    var activeBtn = root.querySelector('.filter-btn.active');
    var key = activeBtn && activeBtn.getAttribute('data-filter') ? activeBtn.getAttribute('data-filter') : 'all';
    if (key === 'new') key = 'unread';
    if (key === 'replied') key = 'closed';
    if (['all', 'unread', 'open', 'pending', 'closed'].indexOf(key) === -1) key = 'all';
    root.innerHTML = [
      '<button type="button" class="filter-btn' + (key === 'all' ? ' active' : '') + '" data-filter="all">All</button>',
      '<button type="button" class="filter-btn' + (key === 'unread' ? ' active' : '') + '" data-filter="unread">Unread</button>',
      '<button type="button" class="filter-btn' + (key === 'open' ? ' active' : '') + '" data-filter="open">Open</button>',
      '<button type="button" class="filter-btn' + (key === 'pending' ? ' active' : '') + '" data-filter="pending">Pending</button>',
      '<button type="button" class="filter-btn' + (key === 'closed' ? ' active' : '') + '" data-filter="closed">Closed</button>'
    ].join('');
  }

  function ensureAdminInboxUI() {
    const sheetBody = document.getElementById('admin-dm-sheet-body');
    if (!sheetBody) return;

    if (!document.getElementById('dm-inbox-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'dm-inbox-toolbar';
      toolbar.className = 'dm-inbox-toolbar messages-controls';
      toolbar.innerHTML = [
        '<input type="search" id="dm-search-input" class="form-input dm-search-input" placeholder="Search threads: name, email, tags…">',
        '<div id="dm-inbox-filters" class="messages-filter dm-inbox-filters" role="group" aria-label="Filter threads by inbox status">',
        '<button type="button" class="filter-btn active" data-filter="all">All</button>',
        '<button type="button" class="filter-btn" data-filter="unread">Unread</button>',
        '<button type="button" class="filter-btn" data-filter="open">Open</button>',
        '<button type="button" class="filter-btn" data-filter="pending">Pending</button>',
        '<button type="button" class="filter-btn" data-filter="closed">Closed</button>',
        '</div>'
      ].join('');
      sheetBody.insertBefore(toolbar, sheetBody.firstChild);
    }

    if (!document.getElementById('dm-layout')) {
      const layout = document.createElement('div');
      layout.className = 'dm-layout';
      layout.id = 'dm-layout';

      const thread = document.createElement('section');
      thread.className = 'dm-thread-panel';
      thread.id = 'dm-thread-panel';
      thread.innerHTML = [
        '<div class="dm-thread-admin-meta">',
        '<header class="dm-thread-header dm-thread-header--admin">',
        '<div class="dm-thread-header-main">',
        '<div class="dm-thread-meta">',
        '<h4 id="dm-thread-title" class="h4 dm-thread-title">Conversation</h4>',
        '<p id="dm-thread-subtitle" class="dm-thread-lead"></p>',
        '</div>',
        '<div class="dm-thread-toolbar">',
        '<div class="dm-thread-actions">',
        '<input id="dm-tag-input" class="form-input dm-mini-input" type="text" placeholder="Tags (comma-separated)">',
        '<select id="dm-status-select" class="form-input dm-mini-select" aria-label="Conversation status">',
        '<option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>',
        '</select>',
        '<select id="dm-priority-select" class="form-input dm-mini-select" aria-label="Priority">',
        '<option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>',
        '</select>',
        '<button id="dm-save-meta" type="button" class="btn btn-secondary btn-sm">Save</button>',
        '</div>',
        '</div>',
        '</div>',
        '</header>',
        '</div>',
        '<div class="dm-presence-row" role="status" aria-live="polite">',
        '<span id="dm-presence-customer" class="dm-presence-pill">Customer offline</span>',
        '<span id="dm-presence-typing" class="dm-presence-pill">Not typing</span>',
        '</div>',
        '<div id="dm-message-list" class="dm-message-list has-scrollbar"></div>',
        '<button id="dm-load-more" type="button" class="btn btn-secondary btn-sm dm-load-more-btn">Load older messages</button>',
        '<form id="dm-admin-composer" class="dm-composer dm-admin-composer" autocomplete="off">',
        '<div class="dm-admin-composer-bar">',
        '<button type="button" id="dm-attachment-toggle" class="dm-admin-icon-btn" aria-label="Add attachment link" aria-expanded="false" aria-controls="dm-admin-attachment-panel">',
        '<ion-icon name="link-outline" aria-hidden="true"></ion-icon>',
        '</button>',
        '<div class="dm-admin-composer-input-wrap">',
        '<textarea id="dm-admin-message" class="form-input dm-reply-textarea dm-admin-composer-textarea" rows="1" placeholder="Reply…" aria-label="Reply to customer" required></textarea>',
        '</div>',
        '<button type="button" id="dm-send-reply-email" class="dm-admin-icon-btn dm-admin-icon-btn-mail" aria-label="Send email copy to customer">',
        '<ion-icon name="mail-outline" aria-hidden="true"></ion-icon>',
        '</button>',
        '<button type="submit" class="dm-admin-icon-btn dm-admin-send-btn" aria-label="Send in thread">',
        '<ion-icon name="send-outline" aria-hidden="true"></ion-icon>',
        '</button>',
        '</div>',
        '<div id="dm-admin-attachment-panel" class="dm-admin-attachment-panel" hidden>',
        '<input id="dm-attachment-url" class="form-input dm-attachment-field" type="url" placeholder="https://…" aria-label="Attachment URL (optional)">',
        '</div>',
        '</form>'
      ].join('');

      const listWrap = document.createElement('div');
      listWrap.className = 'dm-conversation-list-wrap';
      const convList = document.createElement('div');
      convList.id = 'dm-conversation-list';
      convList.className = 'messages-list has-scrollbar';
      listWrap.appendChild(convList);
      layout.appendChild(listWrap);
      layout.appendChild(thread);
      sheetBody.appendChild(layout);
    }
    upgradeDmInboxFilterStrip();
    syncAdminDmLayoutClass();
  }

  function syncAdminDmLayoutClass() {
    const layout = document.getElementById('dm-layout');
    const thread = document.getElementById('dm-thread-panel');
    const sheetBody = document.getElementById('admin-dm-sheet-body');
    const sheet = document.getElementById('admin-dm-sheet');
    const sheetTitle = document.getElementById('admin-dm-sheet-title');
    const hasThread = !!DM.activeConversationId;

    const sheetBack = document.getElementById('admin-dm-sheet-back');
    if (sheetBack) {
      sheetBack.hidden = !hasThread;
      sheetBack.setAttribute('aria-hidden', hasThread ? 'false' : 'true');
    }
    if (sheetTitle) {
      if (!sheetTitle.getAttribute('data-dm-default-title')) {
        sheetTitle.setAttribute('data-dm-default-title', sheetTitle.textContent.trim() || 'DM inbox');
      }
      if (hasThread) {
        sheetTitle.textContent = (DM.activeConversationData && DM.activeConversationData.customerName) || 'Conversation';
      } else {
        sheetTitle.textContent = sheetTitle.getAttribute('data-dm-default-title') || 'DM inbox';
      }
    }
    if (sheetBody) {
      sheetBody.classList.toggle('dm-inbox--thread-open', hasThread);
    }
    if (sheet) {
      sheet.classList.toggle('admin-dm-sheet--conversation-open', hasThread);
    }

    if (!layout || !thread) return;

    layout.classList.toggle('dm-layout--no-thread', !hasThread);
    layout.classList.toggle('dm-layout--thread-only', hasThread);

    thread.classList.toggle('dm-thread-panel--minimal', hasThread);
    if (hasThread) {
      thread.removeAttribute('hidden');
      thread.setAttribute('aria-hidden', 'false');
    } else {
      thread.classList.remove('dm-thread-panel--minimal');
      thread.setAttribute('hidden', '');
      thread.setAttribute('aria-hidden', 'true');
    }
  }

  function clearAdminThreadSelection() {
    const prevId = DM.activeConversationId;
    if (DM.unsubMessages) {
      try {
        DM.unsubMessages();
      } catch (e) {}
      DM.unsubMessages = null;
    }
    if (DM.unsubCustomerPresence) {
      try {
        DM.unsubCustomerPresence();
      } catch (e) {}
      DM.unsubCustomerPresence = null;
    }
    if (DM.unsubAdminPresence) {
      try {
        DM.unsubAdminPresence();
      } catch (e) {}
      DM.unsubAdminPresence = null;
    }
    if (prevId) {
      setAdminPresence(prevId, false, false).catch(function () {});
    }
    DM.activeConversationId = null;
    DM.activeConversationData = null;
    DM.oldestMessageKey = null;
    const loadMoreBtn = document.getElementById('dm-load-more');
    if (loadMoreBtn) loadMoreBtn.disabled = true;
    applyConversationFilters();
    renderConversationList();
    syncAdminDmLayoutClass();
  }

  function renderConversationList() {
    const listEl = document.getElementById('dm-conversation-list');
    const totalEl = document.getElementById('dm-inbox-total');
    const newEl = document.getElementById('dm-inbox-new');
    const closedEl = document.getElementById('dm-inbox-closed');
    if (!listEl) return;

    const list = DM.filteredConversations.length ? DM.filteredConversations : DM.conversations;
    if (totalEl) totalEl.textContent = String(DM.conversations.length);
    if (newEl) newEl.textContent = String(DM.conversations.filter(function (c) { return (c.unreadAdmin || 0) > 0; }).length);
    if (closedEl) closedEl.textContent = String(DM.conversations.filter(function (c) { return c.status === 'closed'; }).length);

    const unreadSum = DM.conversations.reduce(function (acc, c) {
      return acc + (c.unreadAdmin || 0);
    }, 0);
    const badge = document.getElementById('admin-dm-unread-badge');
    if (badge) {
      badge.textContent = String(unreadSum);
      badge.hidden = unreadSum === 0;
    }

    if (!list.length) {
      listEl.innerHTML = '<div class="no-messages"><ion-icon name="chatbubbles-outline"></ion-icon><p>No conversations yet</p></div>';
      return;
    }

    listEl.innerHTML = '<ul class="message-grid">' + list.map(function (conv) {
      const activeClass = DM.activeConversationId === conv.id ? ' dm-conversation-active' : '';
      const unread = conv.unreadAdmin || 0;
      const tags = Array.isArray(conv.tags) ? conv.tags.slice(0, 3) : [];
      return [
        '<li class="message-item" data-status="' + (conv.status || 'open') + '">',
        '<article class="message-card dm-conversation-card' + activeClass + '" data-conversation-id="' + conv.id + '">',
        '<div class="message-card-header">',
        '<h4 class="message-card-name">' + (conv.customerName || 'Customer') + '</h4>',
        '<span class="status-badge status-' + (conv.status || 'open') + '">' + (conv.status || 'open') + '</span>',
        '</div>',
        '<p class="message-card-email">' + (conv.customerEmail || '') + '</p>',
        '<p class="message-card-subject">' + (conv.lastMessage || 'No messages yet') + '</p>',
        '<div class="message-card-footer">',
        '<p class="message-card-date">' + formatDMDate(conv.lastMessageAt || conv.updatedAt || conv.createdAt) + '</p>',
        tags.length ? '<p class="message-card-source">Tags: ' + tags.join(', ') + '</p>' : '',
        '</div>',
        '<div class="message-card-actions dm-conversation-card-actions">',
        '<button class="reply-btn dm-open-conversation" data-id="' + conv.id + '"><ion-icon name="chatbox-ellipses-outline"></ion-icon><span>Open</span></button>',
        (isAdmin()
          ? '<button type="button" class="btn-icon dm-conversation-delete" data-id="' + conv.id + '" aria-label="Delete conversation" title="Delete conversation">'
            + '<ion-icon name="trash-outline" aria-hidden="true"></ion-icon></button>'
          : ''),
        unread > 0 ? '<span class="status-badge status-new">Unread ' + unread + '</span>' : '',
        '</div>',
        '</article>',
        '</li>'
      ].join('');
    }).join('') + '</ul>';

    listEl.querySelectorAll('.dm-open-conversation').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        openConversation(id);
      });
    });

    listEl.querySelectorAll('.dm-conversation-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (!isAdmin()) {
          alert('Sign in as admin to delete conversations.');
          return;
        }
        const id = e.currentTarget.getAttribute('data-id');
        if (!id || !hasDMDeps()) return;
        const card = e.currentTarget.closest('.dm-conversation-card');
        const nameEl = card ? card.querySelector('.message-card-name') : null;
        const label = nameEl ? nameEl.textContent.trim() : id;
        if (!window.confirm('Delete conversation with ' + label + '? This removes all messages and cannot be undone.')) {
          return;
        }
        const delBtn = e.currentTarget;
        delBtn.disabled = true;
        delBtn.setAttribute('aria-busy', 'true');
        deleteConversationFromRtdb(id)
          .then(function () {
            if (DM.activeConversationId === id) {
              clearAdminThreadSelection();
            }
          })
          .catch(function (err) {
            alert(formatRtdbPortalError(err));
            delBtn.disabled = false;
            delBtn.removeAttribute('aria-busy');
          });
      });
    });

    listEl.querySelectorAll('.dm-conversation-card').forEach(function (card) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        const id = card.getAttribute('data-conversation-id');
        if (id) openConversation(id);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        if (e.target.closest('button')) return;
        const id = card.getAttribute('data-conversation-id');
        if (id) openConversation(id);
      });
    });
  }

  function applyConversationFilters() {
    const searchInput = document.getElementById('dm-search-input');
    const queryText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const activeFilter = document.querySelector('#dm-inbox-filters .filter-btn.active');
    const statusFilter = activeFilter ? activeFilter.dataset.filter : 'all';

    DM.filteredConversations = DM.conversations.filter(function (conv) {
      const convStatus = String(conv.status || 'open').toLowerCase();
      const statusMatch =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unread'
            ? (conv.unreadAdmin || 0) > 0
            : statusFilter === 'open'
              ? convStatus === 'open'
              : statusFilter === 'pending'
                ? convStatus === 'pending'
                : statusFilter === 'closed'
                  ? convStatus === 'closed'
                  : convStatus === statusFilter;
      if (!statusMatch) return false;
      if (!queryText) return true;
      const haystack = [
        conv.customerName,
        conv.customerEmail,
        conv.lastMessage,
        Array.isArray(conv.tags) ? conv.tags.join(' ') : ''
      ].join(' ').toLowerCase();
      return haystack.includes(queryText);
    });
  }

  function escapeDmHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeDmAttachmentUrl(raw) {
    const input = String(raw == null ? '' : raw).trim();
    if (!input) return '';
    try {
      const parsed = new URL(input);
      if (!/^https?:$/i.test(parsed.protocol)) return '';
      return parsed.href;
    } catch (error) {
      return '';
    }
  }

  function renderDmMessageBodyHtml(msg) {
    return escapeDmHtml(msg && msg.body ? msg.body : '').replace(/\n/g, '<br>');
  }

  function renderDmAttachmentHtml(msg) {
    const href = normalizeDmAttachmentUrl(msg && msg.attachmentUrl);
    if (!href) return '';
    return '<a class="dm-attachment-link" href="' + escapeDmHtml(href) + '" target="_blank" rel="noopener noreferrer">Attachment</a>';
  }

  function renderThread(conversation, messages) {
    const title = document.getElementById('dm-thread-title');
    const subtitle = document.getElementById('dm-thread-subtitle');
    const list = document.getElementById('dm-message-list');
    const statusSelect = document.getElementById('dm-status-select');
    const prioritySelect = document.getElementById('dm-priority-select');
    const tagInput = document.getElementById('dm-tag-input');
    if (!title || !subtitle || !list) return;

    title.textContent = conversation.customerName || 'Customer';
    subtitle.textContent = (conversation.customerEmail || '') + ' · Assigned: ' + (conversation.assignee || 'unassigned');
    if (statusSelect) statusSelect.value = conversation.status || 'open';
    if (prioritySelect) prioritySelect.value = conversation.priority || 'normal';
    if (tagInput) tagInput.value = Array.isArray(conversation.tags) ? conversation.tags.join(', ') : '';

    if (!messages.length) {
      list.innerHTML = [
        '<div class="no-messages dm-thread-empty">',
        '<ion-icon name="chatbubble-ellipses-outline" aria-hidden="true"></ion-icon>',
        '<p>No messages in this thread yet.</p>',
        '</div>'
      ].join('');
      syncAdminDmLayoutClass();
      return;
    }

    list.innerHTML = messages.map(function (msg) {
      const mine = msg.senderRole === 'admin';
      const authorLabel = mine ? 'You' : 'Customer';
      return [
        '<div class="dm-message-row ' + (mine ? 'dm-message-admin' : 'dm-message-customer') + '">',
        '<div class="dm-message-bubble">',
        '<p class="dm-message-author">' + authorLabel + '</p>',
        '<div class="dm-message-body">' + renderDmMessageBodyHtml(msg) + '</div>',
        renderDmAttachmentHtml(msg),
        '<p class="dm-message-meta">' + formatDMDate(msg.createdAt) + (mine ? (' · Read: ' + (msg.readByCustomer ? 'yes' : 'no')) : '') + '</p>',
        '</div>',
        '</div>'
      ].join('');
    }).join('');
    list.scrollTop = list.scrollHeight;
    syncAdminDmLayoutClass();
  }

  async function markMessagesReadForAdmin(conversationId, messages) {
    const unread = messages.filter(function (m) { return !m.readByAdmin; });
    if (!unread.length) return;
    const rootRef = window.rtdbRef(window.rtdb);
    const patch = {};
    unread.forEach(function (msg) {
      patch['dm/threadMessages/' + conversationId + '/' + msg.id + '/readByAdmin'] = true;
      patch['dm/threadMessages/' + conversationId + '/' + msg.id + '/readAtAdmin'] = window.rtdbServerTimestamp();
    });
    await window.rtdbUpdate(rootRef, patch).catch(function () {});
    await window.rtdbUpdate(rtdbMetaRef(conversationId), {
      unreadAdmin: 0,
      updatedAt: window.rtdbServerTimestamp()
    }).catch(function () {});
  }

  function subscribeThreadPresence(conversationId) {
    if (DM.unsubAdminPresence) DM.unsubAdminPresence();
    if (DM.unsubCustomerPresence) DM.unsubCustomerPresence();

    const customerPresenceEl = document.getElementById('dm-presence-customer');
    const typingEl = document.getElementById('dm-presence-typing');
    DM.unsubCustomerPresence = window.rtdbOnValue(rtdbPresenceRef(conversationId, 'customer'), function (snap) {
      const data = snap.val() || {};
      if (customerPresenceEl) customerPresenceEl.textContent = data.isOnline ? 'Customer online' : 'Customer offline';
      if (typingEl) typingEl.textContent = data.isTyping ? 'Customer typing...' : 'Not typing';
    });
  }

  function setAdminPresence(conversationId, isTyping, isOnline) {
    if (!conversationId) return Promise.resolve();
    const identity = getAdminIdentity();
    return window.rtdbSet(rtdbPresenceRef(conversationId, 'admin'), {
      userId: identity.id,
      senderRole: 'admin',
      isTyping: !!isTyping,
      isOnline: !!isOnline,
      updatedAt: window.rtdbServerTimestamp()
    });
  }

  async function openConversation(conversationId) {
    if (!conversationId) return;
    conversationId = String(conversationId).trim();
    DM.activeConversationId = conversationId;
    DM.activeConversationData = DM.conversations.find(function (c) { return c.id === conversationId; }) || null;
    applyConversationFilters();
    renderConversationList();

    if (DM.unsubMessages) DM.unsubMessages();
    const loadMoreBtn = document.getElementById('dm-load-more');
    if (loadMoreBtn) loadMoreBtn.disabled = true;

    const threadRef = rtdbThreadRef(conversationId);
    const q = window.rtdbQuery(threadRef, window.rtdbOrderByKey(), window.rtdbLimitToLast(DM.currentMessagePageSize));

    DM.unsubMessages = window.rtdbOnValue(q, async function (snap) {
      if (DM.activeConversationId !== conversationId) return;
      const val = snap.val() || {};
      const entries = Object.entries(val).sort(function (a, b) { return a[0].localeCompare(b[0]); });
      DM.oldestMessageKey = entries.length ? entries[0][0] : null;
      const records = entries.map(function (pair) {
        return Object.assign({}, pair[1], { id: pair[0] });
      });
      records.sort(function (a, b) {
        var ta = dmMessageCreatedMs(a);
        var tb = dmMessageCreatedMs(b);
        if (ta !== tb) return ta - tb;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
      var conv =
        DM.conversations.find(function (c) { return c.id === conversationId; }) ||
        DM.activeConversationData;
      if (!conv) {
        conv = {
          id: conversationId,
          customerName: 'Customer',
          customerEmail: '',
          assignee: 'unassigned',
          status: 'open',
          priority: 'normal',
          tags: []
        };
      }
      DM.activeConversationData = conv;
      try {
        renderThread(conv, records);
      } catch (renderErr) {
        console.error('renderThread failed:', renderErr);
      }
      await markMessagesReadForAdmin(conversationId, records);
      if (loadMoreBtn) {
        loadMoreBtn.disabled = records.length === 0 || entries.length < DM.currentMessagePageSize;
      }
    });

    subscribeThreadPresence(conversationId);
    await setAdminPresence(conversationId, false, true);
    syncAdminDmLayoutClass();
  }

  async function loadOlderMessages() {
    if (!DM.activeConversationId || !DM.oldestMessageKey) return;
    const threadRef = rtdbThreadRef(DM.activeConversationId);
    const q = window.rtdbQuery(
      threadRef,
      window.rtdbOrderByKey(),
      window.rtdbEndBefore(DM.oldestMessageKey),
      window.rtdbLimitToLast(DM.currentMessagePageSize)
    );
    const snapshot = await window.rtdbGet(q);
    const list = document.getElementById('dm-message-list');
    if (!list) return;
    const val = snapshot.val() || {};
    const entries = Object.entries(val).sort(function (a, b) { return a[0].localeCompare(b[0]); });
    if (!entries.length) {
      DM.oldestMessageKey = null;
      const loadMoreBtn = document.getElementById('dm-load-more');
      if (loadMoreBtn) loadMoreBtn.disabled = true;
      return;
    }
    const older = entries.map(function (pair) {
      return Object.assign({}, pair[1], { id: pair[0] });
    });
    DM.oldestMessageKey = entries[0][0];
    older.sort(function (a, b) {
      var ta = dmMessageCreatedMs(a);
      var tb = dmMessageCreatedMs(b);
      if (ta !== tb) return ta - tb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    const existingHtml = list.innerHTML;
    const olderHtml = older.map(function (msg) {
      const mine = msg.senderRole === 'admin';
      const authorLabel = mine ? 'You' : 'Customer';
      return [
        '<div class="dm-message-row ' + (mine ? 'dm-message-admin' : 'dm-message-customer') + '">',
        '<div class="dm-message-bubble">',
        '<p class="dm-message-author">' + authorLabel + '</p>',
        '<div class="dm-message-body">' + renderDmMessageBodyHtml(msg) + '</div>',
        renderDmAttachmentHtml(msg),
        '<p class="dm-message-meta">' + formatDMDate(msg.createdAt) + (mine ? (' · Read: ' + (msg.readByCustomer ? 'yes' : 'no')) : '') + '</p>',
        '</div></div>'
      ].join('');
    }).join('');
    list.innerHTML = olderHtml + existingHtml;
    if (entries.length < DM.currentMessagePageSize) {
      const loadMoreBtn = document.getElementById('dm-load-more');
      if (loadMoreBtn) loadMoreBtn.disabled = true;
    }
  }

  async function saveConversationMeta() {
    if (!DM.activeConversationId) return;
    const status = document.getElementById('dm-status-select');
    const priority = document.getElementById('dm-priority-select');
    const tags = document.getElementById('dm-tag-input');
    const data = {
      status: status ? status.value : 'open',
      priority: priority ? priority.value : 'normal',
      tags: tags ? tags.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [],
      assignee: getAdminIdentity().name,
      updatedAt: window.rtdbServerTimestamp()
    };
    await window.rtdbUpdate(rtdbMetaRef(DM.activeConversationId), data);
  }

  async function sendAdminThreadMessage(sendEmailCopy) {
    if (!DM.activeConversationId || !DM.activeConversationData) {
      alert('Select a conversation first.');
      return;
    }
    const messageInput = document.getElementById('dm-admin-message');
    const attachmentInput = document.getElementById('dm-attachment-url');
    if (!messageInput || !messageInput.value.trim()) return;

    const body = messageInput.value.trim();
    const attachmentUrl = attachmentInput && attachmentInput.value.trim() ? attachmentInput.value.trim() : '';
    const admin = getAdminIdentity();

    const newMsgRef = window.rtdbPush(rtdbThreadRef(DM.activeConversationId));
    await window.rtdbSet(newMsgRef, {
      senderRole: 'admin',
      senderName: admin.name,
      senderId: admin.id,
      body: body,
      attachmentUrl: attachmentUrl,
      createdAt: window.rtdbServerTimestamp(),
      readByAdmin: true,
      readByCustomer: false,
      type: attachmentUrl ? 'attachment' : 'text'
    });

    const metaPatch = {
      lastMessage: body,
      lastMessageAt: window.rtdbServerTimestamp(),
      status: 'pending',
      assignee: admin.name,
      updatedAt: window.rtdbServerTimestamp()
    };
    if (window.rtdbIncrement) {
      metaPatch.unreadCustomer = window.rtdbIncrement(1);
    } else {
      metaPatch.unreadCustomer = (DM.activeConversationData.unreadCustomer || 0) + 1;
    }
    await window.rtdbUpdate(rtdbMetaRef(DM.activeConversationId), metaPatch);

    if (sendEmailCopy) {
      try {
        await window.sendReplyEmail(
          {
            name: DM.activeConversationData.customerName || 'Customer',
            email: DM.activeConversationData.customerEmail || ''
          },
          'Re: ' + (DM.activeConversationData.lastMessage || 'Conversation Update'),
          body
        );
      } catch (error) {
        alert('Thread message saved, but email copy failed: ' + error.message);
      }
    }

    messageInput.value = '';
    if (attachmentInput) attachmentInput.value = '';
    await setAdminPresence(DM.activeConversationId, false, true);
  }

  function bindAdminInboxEvents() {
    const searchInput = document.getElementById('dm-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        applyConversationFilters();
        renderConversationList();
      });
    }

    const dmFilterRoot = document.getElementById('dm-inbox-filters');
    if (dmFilterRoot && !dmFilterRoot.dataset.dmInboxFilterClickBound) {
      dmFilterRoot.dataset.dmInboxFilterClickBound = '1';
      dmFilterRoot.addEventListener('click', function (e) {
        const clicked = e.target.closest('.filter-btn');
        if (!clicked || !dmFilterRoot.contains(clicked)) return;
        dmFilterRoot.querySelectorAll('.filter-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        clicked.classList.add('active');
        setTimeout(function () {
          applyConversationFilters();
          renderConversationList();
        }, 0);
      });
    }

    const loadMoreBtn = document.getElementById('dm-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function () {
        loadOlderMessages().catch(function (error) {
          console.error('Load older messages failed:', error);
        });
      });
    }

    const sheetBackBtn = document.getElementById('admin-dm-sheet-back');
    if (sheetBackBtn) {
      sheetBackBtn.addEventListener('click', function () {
        clearAdminThreadSelection();
      });
    }

    const saveMetaBtn = document.getElementById('dm-save-meta');
    if (saveMetaBtn) {
      saveMetaBtn.addEventListener('click', function () {
        saveConversationMeta().catch(function (error) {
          alert('Failed to save conversation metadata: ' + error.message);
        });
      });
    }

    const composer = document.getElementById('dm-admin-composer');
    if (composer) {
      composer.addEventListener('submit', function (e) {
        e.preventDefault();
        sendAdminThreadMessage(false).catch(function (error) {
          alert('Failed to send message: ' + error.message);
        });
      });
    }

    const sendEmailBtn = document.getElementById('dm-send-reply-email');
    if (sendEmailBtn) {
      sendEmailBtn.addEventListener('click', function () {
        sendAdminThreadMessage(true).catch(function (error) {
          alert('Failed to send message: ' + error.message);
        });
      });
    }

    const attachmentToggle = document.getElementById('dm-attachment-toggle');
    const attachmentPanel = document.getElementById('dm-admin-attachment-panel');
    const attachmentUrlInput = document.getElementById('dm-attachment-url');
    if (attachmentToggle && attachmentPanel) {
      attachmentToggle.addEventListener('click', function () {
        const isHidden = attachmentPanel.hasAttribute('hidden');
        if (isHidden) {
          attachmentPanel.removeAttribute('hidden');
          attachmentToggle.setAttribute('aria-expanded', 'true');
          if (attachmentUrlInput) attachmentUrlInput.focus();
        } else {
          attachmentPanel.setAttribute('hidden', '');
          attachmentToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const adminInput = document.getElementById('dm-admin-message');
    if (adminInput) {
      adminInput.addEventListener('input', function () {
        if (!DM.activeConversationId) return;
        setAdminPresence(DM.activeConversationId, true, true).catch(function () {});
        clearTimeout(DM.typingTimer);
        DM.typingTimer = setTimeout(function () {
          setAdminPresence(DM.activeConversationId, false, true).catch(function () {});
        }, 1500);
      });
    }

  }

  function subscribeConversations() {
    if (DM.unsubConversations) DM.unsubConversations();
    const metaRoot = window.rtdbRef(window.rtdb, 'dm/meta');
    const q = window.rtdbQuery(metaRoot, window.rtdbOrderByChild('updatedAt'), window.rtdbLimitToLast(150));
    DM.unsubConversations = window.rtdbOnValue(q, function (snap) {
      const val = snap.val() || {};
      const records = [];
      Object.keys(val).forEach(function (k) {
        records.push(Object.assign({}, val[k], { id: k }));
      });
      records.sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      DM.conversations = records;
      applyConversationFilters();
      renderConversationList();
      if (DM.activeConversationId) {
        const stillThere = records.some(function (r) { return r.id === DM.activeConversationId; });
        if (stillThere) {
          DM.activeConversationData = records.find(function (r) { return r.id === DM.activeConversationId; }) || null;
        } else {
          clearAdminThreadSelection();
        }
      }
      syncAdminDmLayoutClass();
    });
  }

  function setupCustomerPortalUI() {
    if (!isCustomerDmPortalEnabled()) return;
    const portalHost = document.querySelector('article[data-page="messages"]');
    if (!portalHost || document.getElementById('customer-dm-portal')) return;

    const section = document.createElement('section');
    section.className = 'contact-form';
    section.id = 'customer-dm-portal';
    section.innerHTML = [
      (!window.rtdb ? '<p class="dm-help-text dm-rtdb-unavailable" role="alert">Realtime Database is not connected. Add <code>databaseURL</code> in Firebase config, deploy <code>database.rules.json</code> (<code>firebase deploy --only database</code>), then reload.</p>' : ''),
      '<h3 class="h3 form-title">Customer Message Portal</h3>',
      '<p class="dm-help-text">Enter the same name and email you use with this site. We open your conversation in real time (Firebase Realtime Database). No email is sent—this only identifies your thread in this browser.</p>',
      '<div class="dm-customer-auth" id="dm-customer-auth">',
      '<form id="dm-portal-open-form" class="form">',
      '<div class="input-wrapper">',
      '<input type="text" id="dm-portal-name" class="form-input" placeholder="Your name" required>',
      '<input type="email" id="dm-portal-email" class="form-input" placeholder="Your email" required>',
      '</div>',
      '<p id="dm-portal-status" class="dm-portal-status" role="status" aria-live="polite"></p>',
      '<button class="form-btn" type="submit"><ion-icon name="chatbubbles-outline"></ion-icon><span>Open my conversation</span></button>',
      '</form>',
      '</div>',
      '<div id="dm-customer-sheet-root" class="dm-customer-sheet-root" aria-hidden="true">',
      '<div class="dm-customer-sheet-backdrop" id="dm-customer-sheet-backdrop"></div>',
      '<div class="dm-customer-sheet" role="dialog" aria-modal="true" aria-labelledby="dm-customer-sheet-title">',
      '<div class="dm-customer-sheet-grabber" id="dm-customer-sheet-grabber" role="separator" aria-orientation="horizontal" aria-label="Drag up or down to resize" tabindex="0"></div>',
      '<div class="dm-customer-sheet-head">',
      '<h3 id="dm-customer-sheet-title" class="dm-customer-sheet-title">Messages</h3>',
      '<button type="button" class="dm-customer-sheet-close" id="dm-customer-sheet-close" aria-label="Close conversation">',
      '<ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>',
      '</button>',
      '</div>',
      '<section id="dm-customer-thread" class="dm-customer-thread">',
      '<div id="dm-customer-message-list" class="dm-message-list has-scrollbar"></div>',
      '<form id="dm-customer-composer" class="dm-composer">',
      '<div class="dm-composer-input-wrap">',
      '<textarea id="dm-customer-message" class="form-textarea dm-composer-textarea" rows="2" spellcheck="true" placeholder="Message" aria-label="Your message" required></textarea>',
      '</div>',
      '<button class="form-btn dm-composer-send" type="submit" aria-label="Send message"><ion-icon name="send-outline" aria-hidden="true"></ion-icon></button>',
      '</form>',
      '</section>',
      '</div>',
      '</div>'
    ].join('');
    portalHost.appendChild(section);

    bindCustomerPortalEvents();
  }

  async function getOrCreateConversationForEmail(email, name) {
    const metaRoot = window.rtdbRef(window.rtdb, 'dm/meta');
    const q = window.rtdbQuery(
      metaRoot,
      window.rtdbOrderByChild('customerEmail'),
      window.rtdbEqualTo(email.toLowerCase()),
      window.rtdbLimitToFirst(1)
    );
    const snap = await promiseWithTimeout(window.rtdbGet(q), 20000);
    const val = snap.val();
    if (val) {
      const id = Object.keys(val)[0];
      return Object.assign({}, val[id], { id: id });
    }

    const newRef = window.rtdbPush(metaRoot);
    const id = newRef.key;
    const now = window.rtdbServerTimestamp();
    await promiseWithTimeout(window.rtdbSet(newRef, {
      customerName: name,
      customerEmail: email.toLowerCase(),
      source: 'portal',
      status: 'open',
      priority: 'normal',
      tags: ['portal'],
      assignee: 'Admin',
      unreadAdmin: 0,
      unreadCustomer: 0,
      lastMessage: '',
      createdAt: now,
      updatedAt: now
    }), 20000);
    return { id: id, customerName: name, customerEmail: email.toLowerCase() };
  }

  async function validateMagicToken(token) {
    const tokenRef = window.rtdbRef(window.rtdb, 'dm/magicLinks/' + token.trim());
    const snap = await window.rtdbGet(tokenRef);
    if (!snap.exists) throw new Error('Invalid token.');
    const data = snap.val();
    if (!data.expiresAtMs || Date.now() > data.expiresAtMs) {
      throw new Error('Token expired. Open your conversation with your email above.');
    }
    await window.rtdbUpdate(tokenRef, {
      used: true,
      lastUsedAt: window.rtdbServerTimestamp()
    });
    DM.customerSession = {
      conversationId: data.conversationId,
      customerEmail: (data.customerEmail || '').toLowerCase(),
      customerName: data.customerName || 'Customer'
    };
    localStorage.setItem('customerDmSession', JSON.stringify(DM.customerSession));
    return DM.customerSession;
  }

  function renderCustomerThread(messages) {
    const list = document.getElementById('dm-customer-message-list');
    if (!list) return;
    if (!messages.length) {
      list.innerHTML = [
        '<div class="dm-thread-empty no-messages" role="status">',
        '<ion-icon name="chatbubbles-outline" aria-hidden="true"></ion-icon>',
        '<p class="dm-thread-empty-title">No messages yet</p>',
        '<p class="dm-thread-empty-hint">Your conversation appears here in real time.</p>',
        '</div>'
      ].join('');
      return;
    }
    list.innerHTML = messages.map(function (msg) {
      const mine = msg.senderRole === 'customer';
      return [
        '<div class="dm-message-row ' + (mine ? 'dm-message-customer' : 'dm-message-admin') + '">',
        '<div class="dm-message-bubble">',
        '<p class="dm-message-author">' + (mine ? 'You' : 'Admin') + '</p>',
        '<div class="dm-message-body">' + renderDmMessageBodyHtml(msg) + '</div>',
        renderDmAttachmentHtml(msg),
        '<p class="dm-message-meta">' + formatDMDate(msg.createdAt) + (mine ? '' : (' · Read: ' + (msg.readByCustomer ? 'yes' : 'no')) ) + '</p>',
        '</div>',
        '</div>'
      ].join('');
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  async function startCustomerThread(session) {
    if (!session || !session.conversationId) return;

    if (DM.unsubCustomerMessages) DM.unsubCustomerMessages();
    const threadRef = rtdbThreadRef(session.conversationId);
    const q = window.rtdbQuery(threadRef, window.rtdbOrderByChild('createdAt'), window.rtdbLimitToFirst(200));
    DM.unsubCustomerMessages = window.rtdbOnValue(q, async function (snap) {
      const val = snap.val() || {};
      const messages = Object.keys(val)
        .map(function (k) {
          return Object.assign({}, val[k], { id: k });
        })
        .sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      renderCustomerThread(messages);
      const unread = messages.filter(function (m) { return !m.readByCustomer; });
      if (unread.length) {
        const rootRef = window.rtdbRef(window.rtdb);
        const patch = {};
        unread.forEach(function (msg) {
          patch['dm/threadMessages/' + session.conversationId + '/' + msg.id + '/readByCustomer'] = true;
          patch['dm/threadMessages/' + session.conversationId + '/' + msg.id + '/readAtCustomer'] = window.rtdbServerTimestamp();
        });
        await window.rtdbUpdate(rootRef, patch).catch(function () {});
      }
      await window.rtdbUpdate(rtdbMetaRef(session.conversationId), {
        unreadCustomer: 0,
        updatedAt: window.rtdbServerTimestamp()
      }).catch(function () {});
    });

    await window.rtdbSet(rtdbPresenceRef(session.conversationId, 'customer'), {
      senderRole: 'customer',
      isOnline: true,
      isTyping: false,
      updatedAt: window.rtdbServerTimestamp()
    });
  }

  function stripDmTokenQueryParam() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('dm_token')) return;
      url.searchParams.delete('dm_token');
      const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
      window.history.replaceState({}, '', next);
    } catch (err) {}
  }

  function stopCustomerDmMessageSubscription() {
    if (DM.unsubCustomerMessages && typeof DM.unsubCustomerMessages === 'function') {
      DM.unsubCustomerMessages();
      DM.unsubCustomerMessages = null;
    }
  }

  function prefillCustomerPortalForm() {
    if (!DM.customerSession) return;
    const nameEl = document.getElementById('dm-portal-name');
    const emailEl = document.getElementById('dm-portal-email');
    if (nameEl) nameEl.value = DM.customerSession.customerName || '';
    if (emailEl) emailEl.value = DM.customerSession.customerEmail || '';
  }

  const DM_SHEET_MAX_VH_KEY = 'dmCustomerSheetMaxHeightVh';
  const DM_SHEET_MIN_VH = 36;
  const DM_SHEET_MAX_VH_CAP = 100;
  const DM_SHEET_DEFAULT_VH = 85;

  function readStoredCustomerSheetMaxVh() {
    try {
      const n = parseFloat(localStorage.getItem(DM_SHEET_MAX_VH_KEY));
      if (!isNaN(n)) return Math.max(DM_SHEET_MIN_VH, Math.min(DM_SHEET_MAX_VH_CAP, n));
    } catch (e) {}
    return DM_SHEET_DEFAULT_VH;
  }

  function applyCustomerSheetMaxVh(sheetEl, vh) {
    if (!sheetEl) return;
    const v = Math.max(DM_SHEET_MIN_VH, Math.min(DM_SHEET_MAX_VH_CAP, vh));
    sheetEl.style.setProperty('--dm-sheet-max-vh', String(v));
  }

  function syncCustomerSheetHeightFromStorage() {
    const el = document.querySelector('#dm-customer-sheet-root .dm-customer-sheet');
    if (el) applyCustomerSheetMaxVh(el, readStoredCustomerSheetMaxVh());
  }

  function getCustomerSheetMaxVhFromDom(sheetEl) {
    if (!sheetEl) return readStoredCustomerSheetMaxVh();
    const raw = sheetEl.style.getPropertyValue('--dm-sheet-max-vh').trim();
    if (raw) {
      const p = parseFloat(raw);
      if (!isNaN(p)) return Math.max(DM_SHEET_MIN_VH, Math.min(DM_SHEET_MAX_VH_CAP, p));
    }
    return readStoredCustomerSheetMaxVh();
  }

  const ADMIN_DM_SHEET_MAX_VH_KEY = 'dmAdminSheetMaxHeightVh';
  const ADMIN_DM_SHEET_DEFAULT_VH = 90;

  function readStoredAdminSheetMaxVh() {
    try {
      const n = parseFloat(localStorage.getItem(ADMIN_DM_SHEET_MAX_VH_KEY));
      if (!isNaN(n)) return Math.max(DM_SHEET_MIN_VH, Math.min(DM_SHEET_MAX_VH_CAP, n));
    } catch (e) {}
    return ADMIN_DM_SHEET_DEFAULT_VH;
  }

  function syncAdminSheetHeightFromStorage() {
    const el = document.querySelector('#admin-dm-sheet-root .admin-dm-sheet');
    if (el) applyCustomerSheetMaxVh(el, readStoredAdminSheetMaxVh());
  }

  function getAdminSheetMaxVhFromDom(sheetEl) {
    if (!sheetEl) return readStoredAdminSheetMaxVh();
    const raw = sheetEl.style.getPropertyValue('--dm-sheet-max-vh').trim();
    if (raw) {
      const p = parseFloat(raw);
      if (!isNaN(p)) return Math.max(DM_SHEET_MIN_VH, Math.min(DM_SHEET_MAX_VH_CAP, p));
    }
    return readStoredAdminSheetMaxVh();
  }

  function initAdminDmSheetResize() {
    const sheet = document.querySelector('#admin-dm-sheet-root .admin-dm-sheet');
    const grabber = document.getElementById('admin-dm-sheet-grabber');
    if (!sheet || !grabber) return;

    syncAdminSheetHeightFromStorage();

    let dragging = false;
    let startY = 0;
    let startVh = 0;

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      grabber.removeAttribute('aria-grabbed');
      grabber.classList.remove('is-dragging');
      sheet.classList.remove('is-resizing');
      try {
        if (e && e.pointerId != null) grabber.releasePointerCapture(e.pointerId);
      } catch (err) {}
      try {
        const raw = sheet.style.getPropertyValue('--dm-sheet-max-vh').trim();
        const v = parseFloat(raw);
        if (!isNaN(v)) localStorage.setItem(ADMIN_DM_SHEET_MAX_VH_KEY, String(v));
      } catch (err) {}
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      startVh = getAdminSheetMaxVhFromDom(sheet);
      grabber.setAttribute('aria-grabbed', 'true');
      grabber.classList.add('is-dragging');
      sheet.classList.add('is-resizing');
      try {
        grabber.setPointerCapture(e.pointerId);
      } catch (err) {}
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dy = e.clientY - startY;
      const next = startVh - (dy / window.innerHeight) * 100;
      applyCustomerSheetMaxVh(sheet, next);
      e.preventDefault();
    }

    grabber.addEventListener('pointerdown', onPointerDown);
    grabber.addEventListener('pointermove', onPointerMove);
    grabber.addEventListener('pointerup', endDrag);
    grabber.addEventListener('pointercancel', endDrag);
  }

  function setAdminDmSheetOpen(open) {
    const root = document.getElementById('admin-dm-sheet-root');
    if (!root) return;
    if (open) {
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('admin-dm-sheet-open');
      syncAdminSheetHeightFromStorage();
      applyConversationFilters();
      renderConversationList();
      syncAdminDmLayoutClass();
      requestAnimationFrame(function () {
        const search = document.getElementById('dm-search-input');
        if (search) {
          try {
            search.focus();
          } catch (e) {}
        }
      });
    } else {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('admin-dm-sheet-open');
      clearAdminThreadSelection();
    }
  }

  function initAdminDmSheet() {
    const openBtn = document.getElementById('admin-open-dm-inbox');
    const root = document.getElementById('admin-dm-sheet-root');
    const backdrop = document.getElementById('admin-dm-sheet-backdrop');
    const closeBtn = document.getElementById('admin-dm-sheet-close');

    initAdminDmSheetResize();

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        setAdminDmSheetOpen(true);
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setAdminDmSheetOpen(false);
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        setAdminDmSheetOpen(false);
      });
    }

    document.addEventListener('keydown', function adminDmSheetEsc(e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      if (!root || !root.classList.contains('is-open')) return;
      setAdminDmSheetOpen(false);
    });
  }

  function initCustomerSheetResize() {
    const sheet = document.querySelector('#dm-customer-sheet-root .dm-customer-sheet');
    const grabber = document.getElementById('dm-customer-sheet-grabber');
    if (!sheet || !grabber) return;

    syncCustomerSheetHeightFromStorage();

    let dragging = false;
    let startY = 0;
    let startVh = 0;

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      grabber.removeAttribute('aria-grabbed');
      grabber.classList.remove('is-dragging');
      sheet.classList.remove('is-resizing');
      try {
        if (e && e.pointerId != null) grabber.releasePointerCapture(e.pointerId);
      } catch (err) {}
      try {
        const raw = sheet.style.getPropertyValue('--dm-sheet-max-vh').trim();
        const v = parseFloat(raw);
        if (!isNaN(v)) localStorage.setItem(DM_SHEET_MAX_VH_KEY, String(v));
      } catch (err) {}
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      startVh = getCustomerSheetMaxVhFromDom(sheet);
      grabber.setAttribute('aria-grabbed', 'true');
      grabber.classList.add('is-dragging');
      sheet.classList.add('is-resizing');
      try {
        grabber.setPointerCapture(e.pointerId);
      } catch (err) {}
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dy = e.clientY - startY;
      const next = startVh - (dy / window.innerHeight) * 100;
      applyCustomerSheetMaxVh(sheet, next);
      e.preventDefault();
    }

    grabber.addEventListener('pointerdown', onPointerDown);
    grabber.addEventListener('pointermove', onPointerMove);
    grabber.addEventListener('pointerup', endDrag);
    grabber.addEventListener('pointercancel', endDrag);
  }

  function setCustomerPortalAuthVisible(visible) {
    const auth = document.getElementById('dm-customer-auth');
    const sheetRoot = document.getElementById('dm-customer-sheet-root');
    if (auth) auth.style.display = visible ? '' : 'none';
    if (sheetRoot) {
      if (visible) {
        sheetRoot.classList.remove('is-open');
        sheetRoot.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('dm-customer-sheet-open');
      } else {
        sheetRoot.classList.add('is-open');
        sheetRoot.setAttribute('aria-hidden', 'false');
        document.body.classList.add('dm-customer-sheet-open');
        syncCustomerSheetHeightFromStorage();
      }
    }
    if (visible && DM.customerSession) {
      prefillCustomerPortalForm();
    }
  }

  function openCustomerPortalSession() {
    setCustomerPortalAuthVisible(false);
  }

  function tryLegacyDmTokenFromUrl() {
    const raw = new URLSearchParams(window.location.search).get('dm_token');
    if (!raw) return Promise.resolve(false);
    if (!window.rtdb) return Promise.resolve(false);
    return validateMagicToken(raw)
      .then(function (session) {
        stripDmTokenQueryParam();
        openCustomerPortalSession();
        return startCustomerThread(session);
      })
      .then(function () {
        return true;
      })
      .catch(function () {
        stripDmTokenQueryParam();
        return false;
      });
  }

  function restoreCustomerPortalFromStorage() {
    const saved = localStorage.getItem('customerDmSession');
    if (!saved) return false;
    try {
      DM.customerSession = JSON.parse(saved);
      if (!DM.customerSession || !DM.customerSession.conversationId) return false;
      openCustomerPortalSession();
      startCustomerThread(DM.customerSession).catch(function () {});
      return true;
    } catch (error) {
      return false;
    }
  }

  function bindCustomerPortalEvents() {
    const portalForm = document.getElementById('dm-portal-open-form');
    const statusEl = document.getElementById('dm-portal-status');
    const composer = document.getElementById('dm-customer-composer');
    const input = document.getElementById('dm-customer-message');

    function setPortalStatus(message, isError) {
      if (!statusEl) return;
      statusEl.textContent = message || '';
      statusEl.classList.toggle('dm-portal-status-error', !!isError);
    }

    tryLegacyDmTokenFromUrl().then(function (openedFromToken) {
      if (!openedFromToken) {
        restoreCustomerPortalFromStorage();
      }
    });

    if (portalForm) {
      portalForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const emailEl = document.getElementById('dm-portal-email');
        const nameEl = document.getElementById('dm-portal-name');
        if (!emailEl || !nameEl || !window.rtdb) {
          setPortalStatus('Realtime Database is not available.', true);
          return;
        }
        const email = emailEl.value.trim();
        const name = nameEl.value.trim();
        if (!email || !name) {
          setPortalStatus('Please enter your name and email.', true);
          return;
        }
        setPortalStatus('Opening…', false);
        getOrCreateConversationForEmail(email, name)
          .then(function (conv) {
            DM.customerSession = {
              conversationId: conv.id,
              customerEmail: (conv.customerEmail || email).toLowerCase(),
              customerName: conv.customerName || name
            };
            localStorage.setItem('customerDmSession', JSON.stringify(DM.customerSession));
            setPortalStatus('', false);
            openCustomerPortalSession();
            return startCustomerThread(DM.customerSession);
          })
          .catch(function (error) {
            setPortalStatus(formatRtdbPortalError(error), true);
          });
      });
    }

    function closeCustomerSheetToPortal() {
      setCustomerPortalAuthVisible(true);
    }

    const sheetBackdrop = document.getElementById('dm-customer-sheet-backdrop');
    const sheetCloseBtn = document.getElementById('dm-customer-sheet-close');
    if (sheetBackdrop) {
      sheetBackdrop.addEventListener('click', closeCustomerSheetToPortal);
    }
    if (sheetCloseBtn) {
      sheetCloseBtn.addEventListener('click', closeCustomerSheetToPortal);
    }

    document.addEventListener('keydown', function customerSheetEsc(e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      const root = document.getElementById('dm-customer-sheet-root');
      if (!root || !root.classList.contains('is-open')) return;
      closeCustomerSheetToPortal();
    });

    if (composer && input) {
      composer.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!DM.customerSession || !DM.customerSession.conversationId) {
          alert('Enter your name and email above to open your conversation.');
          return;
        }
        const text = input.value.trim();
        if (!text) return;
        const displayName = DM.customerSession.customerName || 'Customer';
        const msgRef = window.rtdbPush(rtdbThreadRef(DM.customerSession.conversationId));
        window.rtdbSet(msgRef, {
          senderRole: 'customer',
          senderName: displayName,
          body: text,
          createdAt: window.rtdbServerTimestamp(),
          readByAdmin: false,
          readByCustomer: true,
          type: 'text'
        }).then(function () {
          const metaPatch = {
            lastMessage: text,
            lastMessageAt: window.rtdbServerTimestamp(),
            status: 'open',
            updatedAt: window.rtdbServerTimestamp()
          };
          if (window.rtdbIncrement) {
            metaPatch.unreadAdmin = window.rtdbIncrement(1);
          } else {
            metaPatch.unreadAdmin = 1;
          }
          return window.rtdbUpdate(rtdbMetaRef(DM.customerSession.conversationId), metaPatch);
        }).then(function () {
          input.value = '';
        }).catch(function (error) {
          alert('Failed to send: ' + error.message);
        });
      });

      input.addEventListener('input', function () {
        if (!DM.customerSession || !DM.customerSession.conversationId) return;
        window.rtdbSet(rtdbPresenceRef(DM.customerSession.conversationId, 'customer'), {
          senderRole: 'customer',
          isOnline: true,
          isTyping: true,
          updatedAt: window.rtdbServerTimestamp()
        }).catch(function () {});
        clearTimeout(DM.typingTimer);
        DM.typingTimer = setTimeout(function () {
          window.rtdbSet(rtdbPresenceRef(DM.customerSession.conversationId, 'customer'), {
            senderRole: 'customer',
            isOnline: true,
            isTyping: false,
            updatedAt: window.rtdbServerTimestamp()
          }).catch(function () {});
        }, 1200);
      });
    }

    initCustomerSheetResize();
  }

  function initializeProfessionalDM() {
    if (!window.db) return;
    if (window.DM_FEATURE_FLAGS && window.DM_FEATURE_FLAGS.enableProfessionalInbox === false) return;

    const previousFetchMessages = typeof window.fetchMessages === 'function' ? window.fetchMessages : null;

    ensureAdminInboxUI();

    if (isCustomerDmPortalEnabled()) {
      setupCustomerPortalUI();
    }

    bindAdminInboxEvents();
    initAdminDmSheet();

    window.fetchMessages = function () {
      if (!isAdmin()) return;
      if (typeof previousFetchMessages === 'function') {
        previousFetchMessages();
      }
      if (hasDMDeps()) {
        subscribeConversations();
      }
    };

    if (!hasDMDeps()) {
      console.warn(
        'Portfolio DM: Realtime Database not ready. Set databaseURL in assets/js/config.js, deploy database.rules.json, and reload. Legacy Firestore messages still work when inbox fallback applies.'
      );
      return;
    }

    if (isAdmin()) {
      subscribeConversations();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initializeProfessionalDM, 250);
  });

  window.addEventListener('beforeunload', function () {
    if (DM.activeConversationId) {
      setAdminPresence(DM.activeConversationId, false, false).catch(function () {});
    }
    if (DM.customerSession && DM.customerSession.conversationId) {
      window.rtdbSet(rtdbPresenceRef(DM.customerSession.conversationId, 'customer'), {
        senderRole: 'customer',
        isOnline: false,
        isTyping: false,
        updatedAt: window.rtdbServerTimestamp()
      }).catch(function () {});
    }
  });

  window.dismissCustomerDmSheetForNavigation = function () {
    const root = document.getElementById('dm-customer-sheet-root');
    if (!root || !root.classList.contains('is-open')) return;
    setCustomerPortalAuthVisible(true);
  };
})();
