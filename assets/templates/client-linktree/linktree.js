(function () {
  var root = document.documentElement;
  var langBtns = document.querySelectorAll('[data-lang]');
  var hourEls = document.querySelectorAll('[data-hours]');
  var countdown = document.querySelector('[data-countdown]');
  var ba = document.querySelector('[data-ba]');
  var chat = document.querySelector('[data-chat]');
  var chatForm = document.querySelector('[data-chat-form]');
  var chatLog = document.querySelector('[data-chat-log]');

  function inWindow(nowMinutes, open, close) {
    if (open <= close) return nowMinutes >= open && nowMinutes < close;
    return nowMinutes >= open || nowMinutes < close;
  }

  function refreshHours() {
    if (!hourEls.length) return;
    var now = new Date();
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now);
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var minutes = Number(map.hour) * 60 + Number(map.minute);
    var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
    hourEls.forEach(function (el) {
      var open = Number(el.getAttribute('data-open') || 7) * 60;
      var close = Number(el.getAttribute('data-close') || 18) * 60;
      var off = (el.getAttribute('data-off') || '0').split(',').map(Number);
      var openNow = off.indexOf(weekday) === -1 && inWindow(minutes, open, close);
      var dot = el.querySelector('.lt-dot');
      var label = el.querySelector('[data-hours-label]');
      if (dot) {
        dot.classList.toggle('is-open', openNow);
        dot.classList.toggle('is-closed', !openNow);
      }
      if (label) {
        var key = (root.lang === 'es' ? 'data-es-' : 'data-en-') + (openNow ? 'open' : 'closed');
        var next = label.getAttribute(key);
        if (next) label.textContent = next;
      }
    });
  }

  function setLang(lang) {
    root.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (el.hasAttribute('data-hours-label')) return;
      var next = el.getAttribute(lang === 'es' ? 'data-es' : 'data-en');
      if (next != null) el.textContent = next;
    });
    document.querySelectorAll('[data-en][placeholder]').forEach(function (el) {
      var next = el.getAttribute(lang === 'es' ? 'data-es' : 'data-en');
      if (next != null) el.setAttribute('placeholder', next);
    });
    langBtns.forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-lang') === lang);
    });
    refreshHours();
  }

  langBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'));
    });
  });

  refreshHours();
  if (hourEls.length) setInterval(refreshHours, 60000);

  function pad(n) { return String(n).padStart(2, '0'); }
  function tickCountdown() {
    if (!countdown) return;
    var end = new Date();
    end.setHours(23, 59, 59, 0);
    var ms = Math.max(0, end - new Date());
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    countdown.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  }
  if (countdown) {
    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  if (ba) {
    var after = ba.querySelector('.lt-ba-after');
    var handle = ba.querySelector('.lt-ba-handle');
    function setPct(pct) {
      pct = Math.min(95, Math.max(5, pct));
      if (after) after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      if (handle) handle.style.left = pct + '%';
    }
    function fromEvent(e) {
      var rect = ba.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setPct((x / rect.width) * 100);
    }
    ba.addEventListener('pointerdown', function (e) {
      ba.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    ba.addEventListener('pointermove', function (e) {
      if (e.buttons) fromEvent(e);
    });
  }

  document.querySelectorAll('[data-open-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-open-dialog'));
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    });
  });
  document.querySelectorAll('[data-close-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = btn.closest('dialog');
      if (dlg) dlg.close();
    });
  });

  document.querySelectorAll('[data-chat-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (chat) chat.classList.toggle('is-open');
    });
  });
  if (chatForm && chatLog) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = chatForm.querySelector('input');
      var text = (input && input.value || '').trim();
      if (!text) return;
      var you = document.createElement('p');
      you.textContent = text;
      chatLog.appendChild(you);
      input.value = '';
      setTimeout(function () {
        var reply = document.createElement('p');
        reply.textContent = chatForm.getAttribute('data-reply') || 'Thanks — we will text you back shortly.';
        chatLog.appendChild(reply);
        chatLog.scrollTop = chatLog.scrollHeight;
      }, 500);
    });
  }
})();
