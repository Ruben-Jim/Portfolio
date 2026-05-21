/**
 * Google-only admin authentication for the portfolio dashboard.
 * Requires Firebase Auth globals from index.html module (getAuth, signInWithPopup, etc.).
 */
(function () {
  'use strict';

  var callbacks = {};
  var signInBusy = false;

  function getAdminAllowlistEmails() {
    var list = window.ADMIN_ALLOWLIST_EMAILS;
    if (!Array.isArray(list)) return [];
    return list
      .map(function (e) {
        return String(e).trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function isAdminEmail(email) {
    if (!email) return false;
    var normalized = String(email).trim().toLowerCase();
    return getAdminAllowlistEmails().indexOf(normalized) >= 0;
  }

  function isAdmin() {
    var fbUser = window.firebaseAuth && window.firebaseAuth.currentUser;
    return !!(fbUser && isAdminEmail(fbUser.email));
  }

  function adminAuthErrorMessage(err) {
    if (!err || !err.code) {
      return err && err.message ? err.message : 'Sign-in failed.';
    }
    var host = window.location.hostname;
    if (err.code === 'auth/invalid-continue-uri' || err.code === 'auth/unauthorized-domain') {
      var authHandlerHost =
        (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.authDomain) ||
        'portfolio-2578e.firebaseapp.com';
      return (
        'This site host ("' +
        host +
        '") must be listed under Firebase → Authentication → Authorized domains. ' +
        'Redirect handler: https://' +
        authHandlerHost +
        '/__/auth/handler'
      );
    }
    if (err.code === 'auth/operation-not-allowed') {
      return (
        'Google sign-in is disabled for this Firebase project. Enable Google under ' +
        'Authentication → Sign-in method (portfolio-2578e).'
      );
    }
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return '';
    }
    if (err.code === 'auth/popup-blocked') {
      return 'Popup blocked. Allow popups for this site or try again (redirect will be used automatically).';
    }
    return err.message || 'Sign-in failed.';
  }

  function showError(message) {
    var text = message || '';
    var el = document.getElementById('admin-login-error-gate');
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
  }

  function syncAdminArticleAuth() {
    var el = document.querySelector('article.admin[data-page="admin"]');
    if (!el) return;
    el.setAttribute('data-admin-auth', isAdmin() ? 'signed-in' : 'guest');
  }

  function setSignInBusy(busy) {
    signInBusy = !!busy;
    document.querySelectorAll('.admin-google-signin-btn, #admin-google-signin').forEach(function (btn) {
      btn.disabled = signInBusy;
      btn.setAttribute('aria-busy', signInBusy ? 'true' : 'false');
    });
  }

  function getGoogleProvider() {
    if (!window.GoogleAuthProvider) return null;
    var provider = new window.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }

  async function signInWithGoogle() {
    if (!window.firebaseAuth) {
      showError('Authentication service not initialized.');
      return;
    }
    if (!window.signInWithPopup || !window.GoogleAuthProvider) {
      showError('Google sign-in is not available. Reload the page.');
      return;
    }
    if (signInBusy) return;

    showError('');
    setSignInBusy(true);

    var provider = getGoogleProvider();
    try {
      var userCredential = await window.signInWithPopup(window.firebaseAuth, provider);
      var firebaseUser = userCredential.user;
      if (!isAdminEmail(firebaseUser.email)) {
        if (typeof window.signOut === 'function') {
          await window.signOut(window.firebaseAuth);
        }
        showError('Access denied. This Google account is not authorized for admin.');
      }
    } catch (popupErr) {
      if (
        popupErr &&
        (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') &&
        typeof window.signInWithRedirect === 'function'
      ) {
        try {
          await window.signInWithRedirect(window.firebaseAuth, provider);
          return;
        } catch (redirectErr) {
          console.error('Google redirect sign-in:', redirectErr);
          showError(adminAuthErrorMessage(redirectErr));
        }
      } else {
        var msg = adminAuthErrorMessage(popupErr);
        if (msg) {
          console.error('Google sign-in:', popupErr);
          showError(msg);
        }
      }
    } finally {
      setSignInBusy(false);
    }
  }

  async function signOut() {
    if (window.firebaseAuth && typeof window.signOut === 'function') {
      try {
        await window.signOut(window.firebaseAuth);
      } catch (signOutErr) {
        console.warn('Firebase sign-out:', signOutErr);
      }
    }
  }

  function bindUi() {
    document.querySelectorAll('.admin-google-signin-btn, #admin-google-signin').forEach(function (btn) {
      if (btn.dataset.googleSigninBound) return;
      btn.dataset.googleSigninBound = '1';
      btn.addEventListener('click', function () {
        signInWithGoogle();
      });
    });
  }

  function handleAuthStateChange(firebaseUser) {
    if (!firebaseUser) {
      syncAdminArticleAuth();
      if (typeof callbacks.onSignedOut === 'function') {
        callbacks.onSignedOut();
      }
      return;
    }

    if (!isAdminEmail(firebaseUser.email)) {
      signOut().then(function () {
        showError('Access denied. This Google account is not authorized for admin.');
        syncAdminArticleAuth();
        if (typeof callbacks.onSignedOut === 'function') {
          callbacks.onSignedOut();
        }
      });
      return;
    }

    syncAdminArticleAuth();
    if (typeof callbacks.onSignedIn === 'function') {
      callbacks.onSignedIn(firebaseUser);
    }
  }

  /**
   * @param {{ onSignedIn?: function, onSignedOut?: function }} opts
   * @returns {Promise<void>} resolves after first auth state is known
   */
  async function init(opts) {
    callbacks = opts || {};
    bindUi();

    if (!window.firebaseAuth || typeof window.onAuthStateChanged !== 'function') {
      console.warn('Firebase Auth not initialized');
      syncAdminArticleAuth();
      if (typeof callbacks.onSignedOut === 'function') {
        callbacks.onSignedOut();
      }
      return;
    }

    if (typeof window.getRedirectResult === 'function') {
      try {
        var redirectResult = await window.getRedirectResult(window.firebaseAuth);
        if (redirectResult && redirectResult.user && !isAdminEmail(redirectResult.user.email)) {
          await signOut();
          showError('Access denied. This Google account is not authorized for admin.');
        }
      } catch (redirectErr) {
        console.warn('getRedirectResult:', redirectErr);
        var redirectMsg = adminAuthErrorMessage(redirectErr);
        if (redirectMsg) showError(redirectMsg);
      }
    }

    return new Promise(function (resolve) {
      var initialAuthResolved = false;
      window.onAuthStateChanged(window.firebaseAuth, function (firebaseUser) {
        handleAuthStateChange(firebaseUser);
        if (!initialAuthResolved) {
          initialAuthResolved = true;
          resolve();
        }
      });
    });
  }

  window.AdminAuth = {
    init: init,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    isAdmin: isAdmin,
    isAdminEmail: isAdminEmail,
    showError: showError,
    syncAdminArticleAuth: syncAdminArticleAuth
  };

  window.isAdminEmail = isAdminEmail;
})();
