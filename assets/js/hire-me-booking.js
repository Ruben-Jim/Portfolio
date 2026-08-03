/**
 * Call booking picker — Hire Me post-submit step + standalone /schedule page.
 * Lead identity: query params → on-page name/email → hireme_inquiry (Hire Me only).
 * Uses window.sendPortfolioEmailRequest for booking_confirmation emails.
 */
(function () {
  'use strict';

  var PATH_AVAILABILITY = 'agencyAvailability/config';
  var PATH_BOOKED_SLOTS = 'agencyBookedSlots';
  var PATH_BOOKINGS = 'agencyBookings';
  var BOOKING_STORAGE_KEY = 'hireme_booking';
  var DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var MAX_LOOKAHEAD_DAYS = 60;
  var MIN_LEAD_MINUTES = 60;

  function rtdbReady() {
    return !!(window.rtdb && window.rtdbRef && window.rtdbGet && window.rtdbSet);
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function dayKeyFor(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function slotKeyFor(d) {
    return dayKeyFor(d) + 'T' + pad2(d.getHours()) + '-' + pad2(d.getMinutes());
  }

  function formatSlotTime(d) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function formatSlotFull(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
      ' at ' + formatSlotTime(d);
  }

  function today0() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isWithinLookahead(date) {
    var diffDays = Math.round((date.getTime() - today0().getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= MAX_LOOKAHEAD_DAYS;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getHireMeInquiry() {
    try {
      var raw = localStorage.getItem('hireme_inquiry');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.name || !parsed.email) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveBookingToStorage(data) {
    try {
      localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getSavedBooking() {
    try {
      var raw = localStorage.getItem(BOOKING_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.callTypeLabel || !parsed.startISO) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function readQueryLead() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return {
        name: String(params.get('name') || '').trim(),
        email: String(params.get('email') || '').trim(),
        hubId: String(params.get('hub') || '').trim(),
        type: String(params.get('type') || '').trim()
      };
    } catch (e) {
      return { name: '', email: '', hubId: '', type: '' };
    }
  }

  function publicOrigin() {
    return String(window.PORTFOLIO_PUBLIC_ORIGIN || window.location.origin || '')
      .replace(/\/$/, '');
  }

  /**
   * Build invite URL for Admin emails / hub actions.
   * @param {{ name?: string, email?: string, hubId?: string, type?: string }} [opts]
   */
  function buildScheduleInviteUrl(opts) {
    opts = opts || {};
    var url = publicOrigin() + '/schedule';
    var params = new URLSearchParams();
    if (opts.name) params.set('name', String(opts.name).trim());
    if (opts.email) params.set('email', String(opts.email).trim());
    if (opts.hubId) params.set('hub', String(opts.hubId).trim());
    if (opts.type) params.set('type', String(opts.type).trim());
    var qs = params.toString();
    return qs ? url + '?' + qs : url;
  }

  window.buildScheduleInviteUrl = buildScheduleInviteUrl;

  async function fetchAgencyCallTypes() {
    if (!rtdbReady()) return [];
    try {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_AVAILABILITY));
      var val = snap.val();
      return Array.isArray(val && val.callTypes) ? val.callTypes.filter(function (ct) {
        return ct && ct.id;
      }) : [];
    } catch (e) {
      console.warn('fetchAgencyCallTypes failed', e);
      return [];
    }
  }

  window.fetchAgencyCallTypes = fetchAgencyCallTypes;

  async function getDefaultScheduleCallType() {
    var types = await fetchAgencyCallTypes();
    return types.length ? types[0] : null;
  }

  window.getDefaultScheduleCallType = getDefaultScheduleCallType;

  /**
   * @param {object} cfg
   * @param {'hire_me'|'schedule'} cfg.source
   * @param {boolean} [cfg.allowHireMeInquiry]
   * @param {boolean} [cfg.autoOpen]
   * @param {boolean} [cfg.showSkip]
   * @param {HTMLElement|null} cfg.bookingStep
   * @param {HTMLElement|null} cfg.pickerWrap
   * @param {HTMLElement|null} cfg.confirmedWrap
   * @param {HTMLElement|null} cfg.confirmedText
   * @param {HTMLElement|null} cfg.typesContainer
   * @param {HTMLElement|null} cfg.selectedTypeWrap
   * @param {HTMLElement|null} cfg.selectedTypeLabelEl
   * @param {HTMLElement|null} cfg.changeTypeBtn
   * @param {HTMLElement|null} cfg.slotsWrap
   * @param {HTMLElement|null} cfg.calMonthEl
   * @param {HTMLElement|null} cfg.calPrevBtn
   * @param {HTMLElement|null} cfg.calNextBtn
   * @param {HTMLElement|null} cfg.calGridEl
   * @param {HTMLElement|null} cfg.slotGridEl
   * @param {HTMLElement|null} cfg.emptyMsgEl
   * @param {HTMLElement|null} cfg.confirmRowEl
   * @param {HTMLElement|null} cfg.selectedLabelEl
   * @param {HTMLElement|null} cfg.confirmBtn
   * @param {HTMLElement|null} [cfg.skipBtn]
   * @param {HTMLElement|null} [cfg.scheduleBtn]
   * @param {HTMLInputElement|null} [cfg.nameInput]
   * @param {HTMLInputElement|null} [cfg.emailInput]
   */
  function createBookingController(cfg) {
    if (!cfg || !cfg.bookingStep || !cfg.typesContainer || !cfg.confirmBtn) return null;

    var state = {
      loaded: false,
      availability: null,
      bookedRanges: [],
      callTypeId: null,
      selectedCallType: null,
      durationMin: 30,
      calendarMonth: null,
      activeDate: null,
      selectedSlot: null
    };

    function getLeadIdentity() {
      var q = readQueryLead();
      var name = '';
      var email = '';
      if (cfg.nameInput) name = String(cfg.nameInput.value || '').trim();
      if (cfg.emailInput) email = String(cfg.emailInput.value || '').trim();
      if (!name && q.name) name = q.name;
      if (!email && q.email) email = q.email;
      var hubId = q.hubId || '';

      if (cfg.allowHireMeInquiry) {
        var inquiry = getHireMeInquiry();
        if (inquiry) {
          if (!name) name = String(inquiry.name || '').trim();
          if (!email) email = String(inquiry.email || '').trim();
          if (name && email) {
            return {
              name: name,
              email: email,
              project_type: inquiry.project_type || '',
              budget: inquiry.budget || '',
              hubId: hubId,
              source: cfg.source || 'hire_me'
            };
          }
        }
      }

      if (!name || !email) return null;
      return {
        name: name,
        email: email,
        project_type: '',
        budget: '',
        hubId: hubId,
        source: cfg.source || 'schedule'
      };
    }

    function applyQueryPrefill() {
      var q = readQueryLead();
      if (cfg.nameInput && q.name && !cfg.nameInput.value) cfg.nameInput.value = q.name;
      if (cfg.emailInput && q.email && !cfg.emailInput.value) cfg.emailInput.value = q.email;
    }

    async function loadAvailability() {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_AVAILABILITY));
      return snap.val();
    }

    async function loadBookedRanges() {
      var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_BOOKED_SLOTS));
      var val = snap.val();
      if (!val || typeof val !== 'object') return [];
      return Object.keys(val).map(function (k) {
        var row = val[k] || {};
        return { start: new Date(row.startISO), end: new Date(row.endISO) };
      }).filter(function (r) {
        return !isNaN(r.start.getTime()) && !isNaN(r.end.getTime());
      });
    }

    function overlaps(startA, endA, startB, endB) {
      return startA < endB && startB < endA;
    }

    function hideConfirmRow() {
      if (!cfg.confirmRowEl) return;
      cfg.confirmRowEl.classList.remove('is-visible');
      cfg.confirmRowEl.hidden = true;
    }

    function showConfirmRow() {
      if (!cfg.confirmRowEl) return;
      cfg.confirmRowEl.hidden = false;
      cfg.confirmRowEl.classList.remove('is-visible');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cfg.confirmRowEl.classList.add('is-visible');
        });
      });
    }

    function getDaySlots(date, durationMin) {
      var availability = state.availability;
      if (!availability) return [];
      var windows = Array.isArray(availability.weeklyWindows) ? availability.weeklyWindows : [];
      var blocked = Array.isArray(availability.blockedDates) ? availability.blockedDates : [];
      var dKey = dayKeyFor(date);
      if (blocked.indexOf(dKey) !== -1) return [];
      var dayId = DAY_IDS[date.getDay()];
      var dayWindows = windows.filter(function (w) { return w && w.day === dayId; });
      if (!dayWindows.length) return [];

      var now = new Date();
      var earliest = new Date(now.getTime() + MIN_LEAD_MINUTES * 60000);
      var slots = [];
      dayWindows.forEach(function (w) {
        var startParts = String(w.start || '').split(':');
        var endParts = String(w.end || '').split(':');
        if (startParts.length < 2 || endParts.length < 2) return;
        var cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
          parseInt(startParts[0], 10), parseInt(startParts[1], 10));
        var windowEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
          parseInt(endParts[0], 10), parseInt(endParts[1], 10));
        while (cursor.getTime() + durationMin * 60000 <= windowEnd.getTime()) {
          var slotEnd = new Date(cursor.getTime() + durationMin * 60000);
          if (cursor >= earliest) {
            var conflict = state.bookedRanges.some(function (r) {
              return overlaps(cursor, slotEnd, r.start, r.end);
            });
            if (!conflict) slots.push({ start: new Date(cursor), end: new Date(slotEnd) });
          }
          cursor = new Date(cursor.getTime() + durationMin * 60000);
        }
      });
      return slots;
    }

    function findFirstAvailableDate(durationMin) {
      var today = today0();
      for (var i = 0; i <= MAX_LOOKAHEAD_DAYS; i++) {
        var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        if (getDaySlots(d, durationMin).length) return d;
      }
      return null;
    }

    function renderCallTypes(availability) {
      cfg.typesContainer.innerHTML = '';
      var types = Array.isArray(availability.callTypes) ? availability.callTypes : [];
      types.forEach(function (ct) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'hire-booking-type-card';
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-checked', 'false');
        card.innerHTML =
          '<span class="hire-booking-type-label">' + escapeHtml(ct.label || 'Call') + '</span>' +
          '<span class="hire-booking-type-duration">' + (ct.durationMin || 30) + ' min</span>';
        card.addEventListener('click', function () {
          selectCallType(ct);
          cfg.typesContainer.querySelectorAll('.hire-booking-type-card').forEach(function (el) {
            el.classList.remove('is-selected');
            el.setAttribute('aria-checked', 'false');
          });
          card.classList.add('is-selected');
          card.setAttribute('aria-checked', 'true');
        });
        cfg.typesContainer.appendChild(card);
      });
    }

    function showTypeStep() {
      state.callTypeId = null;
      state.selectedCallType = null;
      state.selectedSlot = null;
      cfg.typesContainer.hidden = false;
      if (cfg.selectedTypeWrap) cfg.selectedTypeWrap.hidden = true;
      if (cfg.slotsWrap) cfg.slotsWrap.hidden = true;
      if (cfg.emptyMsgEl) cfg.emptyMsgEl.hidden = true;
      hideConfirmRow();
      cfg.typesContainer.querySelectorAll('.hire-booking-type-card').forEach(function (el) {
        el.classList.remove('is-selected');
        el.setAttribute('aria-checked', 'false');
      });
    }

    function selectCallType(ct) {
      state.callTypeId = ct.id;
      state.selectedCallType = ct;
      state.durationMin = Number(ct.durationMin) || 30;
      state.selectedSlot = null;
      hideConfirmRow();

      cfg.typesContainer.hidden = true;
      if (cfg.selectedTypeLabelEl) {
        cfg.selectedTypeLabelEl.textContent = ct.label + ' · ' + (Number(ct.durationMin) || 30) + ' min';
      }
      if (cfg.selectedTypeWrap) cfg.selectedTypeWrap.hidden = false;

      var firstAvail = findFirstAvailableDate(state.durationMin);
      if (!firstAvail) {
        if (cfg.slotsWrap) cfg.slotsWrap.hidden = true;
        if (cfg.emptyMsgEl) {
          cfg.emptyMsgEl.hidden = false;
          cfg.emptyMsgEl.textContent = 'No open times in the next couple months — no worries, I’ll follow up by email.';
        }
        return;
      }
      if (cfg.emptyMsgEl) cfg.emptyMsgEl.hidden = true;
      if (cfg.slotsWrap) cfg.slotsWrap.hidden = false;
      state.calendarMonth = new Date(firstAvail.getFullYear(), firstAvail.getMonth(), 1);
      state.activeDate = firstAvail;
      renderCalendar();
      renderSlotGrid();
    }

    function selectDate(date) {
      state.activeDate = date;
      state.selectedSlot = null;
      hideConfirmRow();
      renderCalendar();
      renderSlotGrid();
    }

    function renderCalendar() {
      if (!cfg.calGridEl || !cfg.calMonthEl) return;
      var month = state.calendarMonth;
      var year = month.getFullYear();
      var mo = month.getMonth();
      cfg.calMonthEl.textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      cfg.calGridEl.innerHTML = '';

      var firstWeekday = new Date(year, mo, 1).getDay();
      var daysInMonth = new Date(year, mo + 1, 0).getDate();
      var today = today0();
      var todayKey = dayKeyFor(today);
      var activeKey = state.activeDate ? dayKeyFor(state.activeDate) : null;

      for (var i = 0; i < firstWeekday; i++) {
        var blank = document.createElement('span');
        blank.className = 'hire-booking-cal-cell hire-booking-cal-cell--empty';
        cfg.calGridEl.appendChild(blank);
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var date = new Date(year, mo, d);
        var dKey = dayKeyFor(date);
        var inWindow = isWithinLookahead(date);
        var hasSlots = inWindow && getDaySlots(date, state.durationMin).length > 0;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hire-booking-cal-cell hire-booking-cal-day';
        if (hasSlots) btn.classList.add('has-slots');
        else btn.classList.add('is-disabled');
        if (dKey === activeKey) btn.classList.add('is-selected');
        if (dKey === todayKey) btn.classList.add('is-today');
        btn.textContent = String(d);
        btn.disabled = !hasSlots;
        btn.setAttribute('role', 'gridcell');
        if (hasSlots) {
          btn.addEventListener('click', (function (dt) {
            return function () { selectDate(dt); };
          })(date));
        }
        cfg.calGridEl.appendChild(btn);
      }

      var todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      if (cfg.calPrevBtn) cfg.calPrevBtn.disabled = month.getTime() <= todayMonthStart.getTime();
      var nextMonthStart = new Date(year, mo + 1, 1);
      if (cfg.calNextBtn) cfg.calNextBtn.disabled = !isWithinLookahead(nextMonthStart);
    }

    function renderSlotGrid() {
      if (!cfg.slotGridEl) return;
      cfg.slotGridEl.innerHTML = '';
      if (!state.activeDate) return;
      var slots = getDaySlots(state.activeDate, state.durationMin);
      slots.forEach(function (slot) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'hire-booking-slot';
        chip.textContent = formatSlotTime(slot.start);
        chip.addEventListener('click', function () {
          state.selectedSlot = slot;
          cfg.slotGridEl.querySelectorAll('.hire-booking-slot').forEach(function (el) {
            el.classList.remove('is-selected');
          });
          chip.classList.add('is-selected');
          if (cfg.selectedLabelEl) {
            cfg.selectedLabelEl.innerHTML = '<strong>' + escapeHtml(state.selectedCallType.label) + '</strong> · ' +
              escapeHtml(formatSlotFull(slot.start));
          }
          showConfirmRow();
        });
        cfg.slotGridEl.appendChild(chip);
      });
    }

    async function confirmBooking() {
      var lead = getLeadIdentity();
      if (!lead) {
        if (cfg.nameInput || cfg.emailInput) {
          alert('Please enter your name and email so I can send the confirmation.');
          if (cfg.nameInput && !cfg.nameInput.value.trim()) cfg.nameInput.focus();
          else if (cfg.emailInput) cfg.emailInput.focus();
        } else {
          alert('Something went wrong finding your inquiry details — please try again from the form.');
        }
        return;
      }
      var slot = state.selectedSlot;
      var ct = state.selectedCallType;
      if (!slot || !ct) return;

      cfg.confirmBtn.disabled = true;
      cfg.confirmBtn.innerHTML = '<ion-icon name="hourglass" aria-hidden="true"></ion-icon><span>Booking…</span>';

      var slotKey = slotKeyFor(slot.start);
      var startISO = slot.start.toISOString();
      var endISO = slot.end.toISOString();

      try {
        await window.rtdbSet(window.rtdbRef(window.rtdb, PATH_BOOKED_SLOTS + '/' + slotKey), {
          startISO: startISO,
          endISO: endISO
        });
      } catch (e) {
        state.bookedRanges.push({ start: slot.start, end: slot.end });
        selectCallType(ct);
        cfg.confirmBtn.disabled = false;
        cfg.confirmBtn.innerHTML = '<ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon><span>Confirm booking</span>';
        alert('That time was just taken — pick another one.');
        return;
      }

      var bookingId = 'bkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      var bookingPayload = {
        name: lead.name,
        email: lead.email,
        callTypeId: ct.id,
        callTypeLabel: ct.label,
        durationMin: Number(ct.durationMin) || 30,
        startISO: startISO,
        endISO: endISO,
        leadProjectType: lead.project_type || '',
        leadBudget: lead.budget || '',
        createdAt: new Date().toISOString(),
        slotKey: slotKey,
        source: lead.source || cfg.source || 'hire_me'
      };
      if (lead.hubId) bookingPayload.hubId = lead.hubId;

      try {
        await window.rtdbSet(window.rtdbRef(window.rtdb, PATH_BOOKINGS + '/' + bookingId), bookingPayload);
      } catch (e) {
        console.warn('Failed to save booking record', e);
      }

      var emailFailed = false;
      try {
        if (typeof window.sendPortfolioEmailRequest === 'function') {
          await window.sendPortfolioEmailRequest({
            type: 'booking_confirmation',
            payload: {
              name: lead.name,
              email: lead.email,
              call_type_label: ct.label,
              start_display: formatSlotFull(slot.start),
              timezone_label: (state.availability && state.availability.timezone) || '',
              start_iso: startISO,
              end_iso: endISO
            }
          });
        }
      } catch (e) {
        console.warn('Booking confirmation email failed', e);
        emailFailed = true;
      }

      if (cfg.pickerWrap) cfg.pickerWrap.hidden = true;
      if (cfg.confirmedWrap) cfg.confirmedWrap.hidden = false;
      if (cfg.confirmedText) {
        cfg.confirmedText.textContent = 'You’re set for ' + ct.label + ' on ' + formatSlotFull(slot.start) + '.' +
          (emailFailed
            ? ' I couldn’t send a confirmation email just now, but you’re on the calendar — I’ll follow up directly.'
            : ' A confirmation is on its way to ' + lead.email + '.');
      }
      state.loaded = true;
      saveBookingToStorage({
        callTypeLabel: ct.label,
        startISO: startISO,
        email: lead.email,
        source: bookingPayload.source
      });
    }

    function restoreConfirmedFromStorage() {
      var saved = getSavedBooking();
      if (!saved) return false;
      if (cfg.source === 'hire_me' && saved.source && saved.source !== 'hire_me') return false;
      if (cfg.source === 'schedule' && saved.source !== 'schedule') return false;
      cfg.bookingStep.hidden = false;
      cfg.bookingStep.classList.remove('hire-form-submitted--animating');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cfg.bookingStep.classList.add('hire-form-submitted--animating');
        });
      });
      if (cfg.pickerWrap) cfg.pickerWrap.hidden = true;
      if (cfg.confirmedWrap) cfg.confirmedWrap.hidden = false;
      if (cfg.confirmedText) {
        cfg.confirmedText.textContent = 'You’re set for ' + saved.callTypeLabel + ' on ' +
          formatSlotFull(new Date(saved.startISO)) + '. A confirmation was sent to ' + saved.email + '.';
      }
      state.loaded = true;
      return true;
    }

    async function openBookingStep() {
      applyQueryPrefill();
      cfg.bookingStep.hidden = false;
      cfg.bookingStep.classList.remove('hire-form-submitted--animating');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cfg.bookingStep.classList.add('hire-form-submitted--animating');
        });
      });
      if (cfg.source !== 'schedule') {
        cfg.bookingStep.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }

      if (state.loaded) return;
      if (!rtdbReady()) {
        if (cfg.emptyMsgEl) {
          cfg.emptyMsgEl.hidden = false;
          cfg.emptyMsgEl.textContent = 'Scheduling isn’t available right now — no worries, I’ll follow up by email.';
        }
        return;
      }
      try {
        var availability = await loadAvailability();
        if (!availability || !Array.isArray(availability.callTypes) || !availability.callTypes.length) {
          if (cfg.emptyMsgEl) {
            cfg.emptyMsgEl.hidden = false;
            cfg.emptyMsgEl.textContent = 'Scheduling isn’t set up yet — no worries, I’ll follow up by email.';
          }
          return;
        }
        state.availability = availability;
        state.bookedRanges = await loadBookedRanges();
        state.loaded = true;
        if (cfg.pickerWrap) cfg.pickerWrap.hidden = false;
        if (cfg.confirmedWrap) cfg.confirmedWrap.hidden = true;
        renderCallTypes(availability);

        var preTypeId = readQueryLead().type || cfg.preselectTypeId || '';
        var types = Array.isArray(availability.callTypes) ? availability.callTypes : [];
        var preCt = null;
        if (preTypeId) {
          for (var ti = 0; ti < types.length; ti++) {
            if (String(types[ti].id) === String(preTypeId)) {
              preCt = types[ti];
              break;
            }
          }
        }
        if (preCt) {
          selectCallType(preCt);
          var cards = cfg.typesContainer.querySelectorAll('.hire-booking-type-card');
          for (var ci = 0; ci < types.length && ci < cards.length; ci++) {
            if (String(types[ci].id) === String(preCt.id)) {
              cards[ci].classList.add('is-selected');
              cards[ci].setAttribute('aria-checked', 'true');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load availability', e);
        if (cfg.emptyMsgEl) {
          cfg.emptyMsgEl.hidden = false;
          cfg.emptyMsgEl.textContent = 'Couldn’t load open times right now — no worries, I’ll follow up by email.';
        }
      }
    }

    cfg.confirmBtn.addEventListener('click', confirmBooking);
    if (cfg.changeTypeBtn) {
      cfg.changeTypeBtn.addEventListener('click', showTypeStep);
    }
    if (cfg.calPrevBtn) {
      cfg.calPrevBtn.addEventListener('click', function () {
        state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
        renderCalendar();
      });
    }
    if (cfg.calNextBtn) {
      cfg.calNextBtn.addEventListener('click', function () {
        state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
        renderCalendar();
      });
    }
    if (cfg.skipBtn && cfg.showSkip !== false) {
      cfg.skipBtn.addEventListener('click', function () {
        cfg.bookingStep.hidden = true;
      });
    } else if (cfg.skipBtn) {
      cfg.skipBtn.hidden = true;
    }
    if (cfg.scheduleBtn) {
      cfg.scheduleBtn.addEventListener('click', openBookingStep);
    }

    return {
      open: openBookingStep,
      restoreConfirmed: restoreConfirmedFromStorage,
      applyQueryPrefill: applyQueryPrefill
    };
  }

  function initHireMeBooking() {
    var scheduleBtn = document.getElementById('hire-success-schedule-btn');
    var bookingStep = document.querySelector('[data-hire-booking-step]');
    if (!scheduleBtn || !bookingStep) return null;

    return createBookingController({
      source: 'hire_me',
      allowHireMeInquiry: true,
      autoOpen: false,
      showSkip: true,
      scheduleBtn: scheduleBtn,
      bookingStep: bookingStep,
      pickerWrap: document.querySelector('[data-hire-booking-picker]'),
      confirmedWrap: document.querySelector('[data-hire-booking-confirmed]'),
      confirmedText: document.getElementById('hire-booking-confirmed-text'),
      typesContainer: document.getElementById('hire-booking-types'),
      selectedTypeWrap: document.getElementById('hire-booking-selected-type'),
      selectedTypeLabelEl: document.getElementById('hire-booking-selected-type-label'),
      changeTypeBtn: document.getElementById('hire-booking-change-type-btn'),
      slotsWrap: document.getElementById('hire-booking-slots'),
      calMonthEl: document.getElementById('hire-booking-cal-month'),
      calPrevBtn: document.getElementById('hire-booking-cal-prev'),
      calNextBtn: document.getElementById('hire-booking-cal-next'),
      calGridEl: document.getElementById('hire-booking-cal-grid'),
      slotGridEl: document.getElementById('hire-booking-slot-grid'),
      emptyMsgEl: document.getElementById('hire-booking-empty'),
      confirmRowEl: document.getElementById('hire-booking-confirm-row'),
      selectedLabelEl: document.getElementById('hire-booking-selected-label'),
      confirmBtn: document.getElementById('hire-booking-confirm-btn'),
      skipBtn: document.getElementById('hire-booking-skip-btn')
    });
  }

  function initSchedulePageBooking() {
    var page = document.querySelector('[data-page="schedule"]');
    var bookingStep = document.querySelector('[data-schedule-booking-step]');
    if (!page || !bookingStep) return null;

    return createBookingController({
      source: 'schedule',
      allowHireMeInquiry: false,
      autoOpen: true,
      showSkip: false,
      bookingStep: bookingStep,
      pickerWrap: document.querySelector('[data-schedule-booking-picker]'),
      confirmedWrap: document.querySelector('[data-schedule-booking-confirmed]'),
      confirmedText: document.getElementById('schedule-booking-confirmed-text'),
      typesContainer: document.getElementById('schedule-booking-types'),
      selectedTypeWrap: document.getElementById('schedule-booking-selected-type'),
      selectedTypeLabelEl: document.getElementById('schedule-booking-selected-type-label'),
      changeTypeBtn: document.getElementById('schedule-booking-change-type-btn'),
      slotsWrap: document.getElementById('schedule-booking-slots'),
      calMonthEl: document.getElementById('schedule-booking-cal-month'),
      calPrevBtn: document.getElementById('schedule-booking-cal-prev'),
      calNextBtn: document.getElementById('schedule-booking-cal-next'),
      calGridEl: document.getElementById('schedule-booking-cal-grid'),
      slotGridEl: document.getElementById('schedule-booking-slot-grid'),
      emptyMsgEl: document.getElementById('schedule-booking-empty'),
      confirmRowEl: document.getElementById('schedule-booking-confirm-row'),
      selectedLabelEl: document.getElementById('schedule-booking-selected-label'),
      confirmBtn: document.getElementById('schedule-booking-confirm-btn'),
      skipBtn: document.getElementById('schedule-booking-skip-btn'),
      nameInput: document.getElementById('schedule-guest-name'),
      emailInput: document.getElementById('schedule-guest-email')
    });
  }

  var hireMeCtrl = initHireMeBooking();
  var scheduleCtrl = initSchedulePageBooking();

  if (hireMeCtrl) {
    window.restoreHireMeBookingConfirmedUI = function () {
      return hireMeCtrl.restoreConfirmed();
    };
    window.openHireMeBookingStep = function () {
      return hireMeCtrl.open();
    };
  }

  function openSchedulePageBooking() {
    if (!scheduleCtrl) return;
    if (scheduleCtrl.restoreConfirmed()) return;
    scheduleCtrl.applyQueryPrefill();
    scheduleCtrl.open();
  }

  window.openSchedulePageBooking = openSchedulePageBooking;

  function tryAutoOpenSchedule() {
    if (!scheduleCtrl) return;
    var page = document.querySelector('[data-page="schedule"]');
    if (!page || !page.classList.contains('active')) return;
    openSchedulePageBooking();
  }

  if (scheduleCtrl) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(tryAutoOpenSchedule, 400);
      });
    } else {
      setTimeout(tryAutoOpenSchedule, 400);
    }
    // Retry once RTDB bindings appear
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (rtdbReady() || tries > 25) {
        clearInterval(timer);
        tryAutoOpenSchedule();
      }
    }, 200);
  }
})();
