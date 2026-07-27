/**
 * Optional "schedule a call" step shown after the Hire Me form is submitted.
 * Reads the lead's name/email from the `hireme_inquiry` localStorage record
 * script.js already writes right before it resets the form. No dependency on
 * script.js internals beyond that key and `window.sendPortfolioEmailRequest`.
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

  var scheduleBtn = document.getElementById('hire-success-schedule-btn');
  var bookingStep = document.querySelector('[data-hire-booking-step]');
  var pickerWrap = document.querySelector('[data-hire-booking-picker]');
  var confirmedWrap = document.querySelector('[data-hire-booking-confirmed]');
  var confirmedText = document.getElementById('hire-booking-confirmed-text');
  var typesContainer = document.getElementById('hire-booking-types');
  var selectedTypeWrap = document.getElementById('hire-booking-selected-type');
  var selectedTypeLabelEl = document.getElementById('hire-booking-selected-type-label');
  var changeTypeBtn = document.getElementById('hire-booking-change-type-btn');
  var slotsWrap = document.getElementById('hire-booking-slots');
  var calMonthEl = document.getElementById('hire-booking-cal-month');
  var calPrevBtn = document.getElementById('hire-booking-cal-prev');
  var calNextBtn = document.getElementById('hire-booking-cal-next');
  var calGridEl = document.getElementById('hire-booking-cal-grid');
  var slotGridEl = document.getElementById('hire-booking-slot-grid');
  var emptyMsgEl = document.getElementById('hire-booking-empty');
  var confirmRowEl = document.getElementById('hire-booking-confirm-row');
  var selectedLabelEl = document.getElementById('hire-booking-selected-label');
  var confirmBtn = document.getElementById('hire-booking-confirm-btn');
  var skipBtn = document.getElementById('hire-booking-skip-btn');

  if (!scheduleBtn || !bookingStep) return;

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

  function rtdbReady() {
    return !!(window.rtdb && window.rtdbRef && window.rtdbGet && window.rtdbSet);
  }

  function getLeadInquiry() {
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
    confirmRowEl.classList.remove('is-visible');
    confirmRowEl.hidden = true;
  }

  function showConfirmRow() {
    confirmRowEl.hidden = false;
    confirmRowEl.classList.remove('is-visible');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        confirmRowEl.classList.add('is-visible');
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
    typesContainer.innerHTML = '';
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
        typesContainer.querySelectorAll('.hire-booking-type-card').forEach(function (el) {
          el.classList.remove('is-selected');
          el.setAttribute('aria-checked', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-checked', 'true');
      });
      typesContainer.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showTypeStep() {
    state.callTypeId = null;
    state.selectedCallType = null;
    state.selectedSlot = null;
    typesContainer.hidden = false;
    selectedTypeWrap.hidden = true;
    slotsWrap.hidden = true;
    emptyMsgEl.hidden = true;
    hideConfirmRow();
    typesContainer.querySelectorAll('.hire-booking-type-card').forEach(function (el) {
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

    typesContainer.hidden = true;
    selectedTypeLabelEl.textContent = ct.label + ' · ' + (Number(ct.durationMin) || 30) + ' min';
    selectedTypeWrap.hidden = false;

    var firstAvail = findFirstAvailableDate(state.durationMin);
    if (!firstAvail) {
      slotsWrap.hidden = true;
      emptyMsgEl.hidden = false;
      emptyMsgEl.textContent = 'No open times in the next couple months — no worries, I’ll follow up by email.';
      return;
    }
    emptyMsgEl.hidden = true;
    slotsWrap.hidden = false;
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
    var month = state.calendarMonth;
    var year = month.getFullYear();
    var mo = month.getMonth();
    calMonthEl.textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    calGridEl.innerHTML = '';

    var firstWeekday = new Date(year, mo, 1).getDay();
    var daysInMonth = new Date(year, mo + 1, 0).getDate();
    var today = today0();
    var todayKey = dayKeyFor(today);
    var activeKey = state.activeDate ? dayKeyFor(state.activeDate) : null;

    for (var i = 0; i < firstWeekday; i++) {
      var blank = document.createElement('span');
      blank.className = 'hire-booking-cal-cell hire-booking-cal-cell--empty';
      calGridEl.appendChild(blank);
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
      calGridEl.appendChild(btn);
    }

    var todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    calPrevBtn.disabled = month.getTime() <= todayMonthStart.getTime();
    var nextMonthStart = new Date(year, mo + 1, 1);
    calNextBtn.disabled = !isWithinLookahead(nextMonthStart);
  }

  function renderSlotGrid() {
    slotGridEl.innerHTML = '';
    if (!state.activeDate) return;
    var slots = getDaySlots(state.activeDate, state.durationMin);
    slots.forEach(function (slot) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'hire-booking-slot';
      chip.textContent = formatSlotTime(slot.start);
      chip.addEventListener('click', function () {
        state.selectedSlot = slot;
        slotGridEl.querySelectorAll('.hire-booking-slot').forEach(function (el) {
          el.classList.remove('is-selected');
        });
        chip.classList.add('is-selected');
        selectedLabelEl.innerHTML = '<strong>' + escapeHtml(state.selectedCallType.label) + '</strong> · ' +
          escapeHtml(formatSlotFull(slot.start));
        showConfirmRow();
      });
      slotGridEl.appendChild(chip);
    });
  }

  async function confirmBooking() {
    var lead = getLeadInquiry();
    if (!lead) {
      alert('Something went wrong finding your inquiry details — please try again from the form.');
      return;
    }
    var slot = state.selectedSlot;
    var ct = state.selectedCallType;
    if (!slot || !ct) return;

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<ion-icon name="hourglass" aria-hidden="true"></ion-icon><span>Booking…</span>';

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
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<ion-icon name="checkmark-outline" aria-hidden="true"></ion-icon><span>Confirm booking</span>';
      alert('That time was just taken — pick another one.');
      return;
    }

    var bookingId = 'bkg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try {
      await window.rtdbSet(window.rtdbRef(window.rtdb, PATH_BOOKINGS + '/' + bookingId), {
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
        slotKey: slotKey
      });
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
            timezone_label: state.availability.timezone || '',
            start_iso: startISO,
            end_iso: endISO
          }
        });
      }
    } catch (e) {
      console.warn('Booking confirmation email failed', e);
      emailFailed = true;
    }

    pickerWrap.hidden = true;
    confirmedWrap.hidden = false;
    confirmedText.textContent = 'You’re set for ' + ct.label + ' on ' + formatSlotFull(slot.start) + '.' +
      (emailFailed
        ? ' I couldn’t send a confirmation email just now, but you’re on the calendar — I’ll follow up directly.'
        : ' A confirmation is on its way to ' + lead.email + '.');
    state.loaded = true;
    saveBookingToStorage({
      callTypeLabel: ct.label,
      startISO: startISO,
      email: lead.email
    });
  }

  function restoreConfirmedFromStorage() {
    var saved = getSavedBooking();
    if (!saved) return false;
    bookingStep.hidden = false;
    bookingStep.classList.remove('hire-form-submitted--animating');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bookingStep.classList.add('hire-form-submitted--animating');
      });
    });
    pickerWrap.hidden = true;
    confirmedWrap.hidden = false;
    confirmedText.textContent = 'You’re set for ' + saved.callTypeLabel + ' on ' +
      formatSlotFull(new Date(saved.startISO)) + '. A confirmation was sent to ' + saved.email + '.';
    state.loaded = true;
    return true;
  }

  window.restoreHireMeBookingConfirmedUI = restoreConfirmedFromStorage;
  window.openHireMeBookingStep = openBookingStep;

  async function openBookingStep() {
    bookingStep.hidden = false;
    bookingStep.classList.remove('hire-form-submitted--animating');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bookingStep.classList.add('hire-form-submitted--animating');
      });
    });
    bookingStep.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    if (state.loaded) return;
    if (!rtdbReady()) {
      emptyMsgEl.hidden = false;
      emptyMsgEl.textContent = 'Scheduling isn’t available right now — no worries, I’ll follow up by email.';
      return;
    }
    try {
      var availability = await loadAvailability();
      if (!availability || !Array.isArray(availability.callTypes) || !availability.callTypes.length) {
        emptyMsgEl.hidden = false;
        emptyMsgEl.textContent = 'Scheduling isn’t set up yet — no worries, I’ll follow up by email.';
        return;
      }
      state.availability = availability;
      state.bookedRanges = await loadBookedRanges();
      state.loaded = true;
      renderCallTypes(availability);
    } catch (e) {
      console.warn('Failed to load availability', e);
      emptyMsgEl.hidden = false;
      emptyMsgEl.textContent = 'Couldn’t load open times right now — no worries, I’ll follow up by email.';
    }
  }

  scheduleBtn.addEventListener('click', openBookingStep);
  skipBtn.addEventListener('click', function () {
    bookingStep.hidden = true;
  });
  confirmBtn.addEventListener('click', confirmBooking);
  if (changeTypeBtn) {
    changeTypeBtn.addEventListener('click', showTypeStep);
  }
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', function () {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
      renderCalendar();
    });
  }
  if (calNextBtn) {
    calNextBtn.addEventListener('click', function () {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  }
})();
