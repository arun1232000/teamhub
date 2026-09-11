(() => {
  const LEAVE_POLL_MS = 8000;
  const DASHBOARD_POLL_MS = 60000;

  const state = {
    name: localStorage.getItem('teamhub_name') || '',
    departments: [],
    onboarding: [],
    sops: [],
    attendance: null,
    tickets: [],
    reports: [],
    leave: [],
    activeDept: 'all',
    ticketQuery: '',
    ticketStatus: 'all',
    sopQuery: '',
    timers: [],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function api(path, opts) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  // ---------- Toasts ----------
  function toast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast--destructive' : '');
    el.textContent = message;
    $('#toast-host').appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  // ---------- Theme ----------
  const THEMES = ['system', 'light', 'dark'];
  // Inline SVG rather than glyphs like ☀/☾, which render inconsistently
  // depending on the platform's installed fonts.
  const THEME_ICONS = {
    system: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3.1"/><path d="M8 1v1.7M8 13.3V15M1 8h1.7M13.3 8H15M3.1 3.1l1.2 1.2M11.7 11.7l1.2 1.2M12.9 3.1l-1.2 1.2M4.3 11.7l-1.2 1.2"/></svg>',
    dark: '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><path d="M13.6 10.3A5.9 5.9 0 0 1 5.7 2.4a5.9 5.9 0 1 0 7.9 7.9z"/></svg>',
  };

  function applyTheme(theme) {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamhub_theme', theme);
    $('#theme-icon').innerHTML = THEME_ICONS[theme];
    $('#theme-toggle').title = `Theme: ${theme} (click to change)`;
  }

  applyTheme(localStorage.getItem('teamhub_theme') || 'system');
  $('#theme-toggle').addEventListener('click', () => {
    const current = localStorage.getItem('teamhub_theme') || 'system';
    applyTheme(THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);
  });

  // ---------- Gate ----------
  function showGate() {
    state.timers.forEach(clearInterval);
    state.timers = [];
    $('#gate').hidden = false;
    $('#shell').hidden = true;
    $('#gate-input').value = state.name || '';
    $('#gate-input').focus();
  }

  function enterApp(name) {
    state.name = name.trim();
    localStorage.setItem('teamhub_name', state.name);
    $('#gate').hidden = true;
    $('#gate-error').hidden = true;
    $('#gate-field').classList.remove('is-error');
    $('#shell').hidden = false;
    $('#who-pill').textContent = state.name;
    $('#who-pill').title = state.name;
    $('#who-avatar').textContent = initials(state.name);
    boot();
  }

  $('#gate-submit').addEventListener('click', () => {
    const v = $('#gate-input').value.trim();
    if (!v) {
      $('#gate-error').hidden = false;
      $('#gate-field').classList.add('is-error');
      $('#gate-input').focus();
      return;
    }
    enterApp(v);
  });
  $('#gate-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#gate-submit').click(); });
  $('#switch-user').addEventListener('click', showGate);

  // ---------- Tabs ----------
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) setView(btn.dataset.view);
  });

  // Arrow-key navigation between tabs, per the tablist pattern
  $('#tabs').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('#tabs button');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : (i - 1 + tabs.length) % tabs.length;
    tabs[next].focus();
    setView(tabs[next].dataset.view);
  });

  function setView(view) {
    $$('#tabs button').forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('.view').forEach((v) => {
      const on = v.id === `view-${view}`;
      v.classList.toggle('is-active', on);
      v.hidden = !on;
    });
    localStorage.setItem('teamhub_view', view);
  }

  // ---------- Hero greeting ----------
  function renderHero() {
    const hour = new Date().getHours();
    const partOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = state.name.split(/\s+/)[0];
    $('#hero-greeting').textContent = `${partOfDay}, ${firstName}`;

    const away = state.leave.filter((r) => leavePhase(r) === 'current').length;
    const open = state.tickets.filter((t) => t.status !== 'Closed').length;
    const awayText = away === 0
      ? 'Everyone is in today'
      : `<strong>${away}</strong> ${away === 1 ? 'person is' : 'people are'} on leave today`;
    $('#hero-context').innerHTML = `${awayText} · <strong>${open}</strong> open ${open === 1 ? 'ticket' : 'tickets'}`;
  }

  // ---------- Onboarding ----------
  const onboardingKey = () => `teamhub_onboarding_${state.name.toLowerCase()}`;

  function getDoneSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(onboardingKey()) || '[]'));
    } catch {
      return new Set();
    }
  }
  const setDoneSet = (set) => localStorage.setItem(onboardingKey(), JSON.stringify([...set]));

  function renderOnboarding() {
    const done = getDoneSet();
    const groups = {};
    state.onboarding.forEach((item) => {
      (groups[item.category] = groups[item.category] || []).push(item);
    });

    const wrap = $('#onboard-groups');
    wrap.innerHTML = '';
    Object.entries(groups).forEach(([category, items]) => {
      const group = document.createElement('div');
      group.className = 'group';
      group.innerHTML = `<div class="section-head"><h2 class="u-eyebrow">${escapeHtml(category)}</h2></div>`;
      const list = document.createElement('div');
      list.className = 'stack';

      items.forEach((item) => {
        const isDone = done.has(item.id);
        const row = document.createElement('label');
        row.className = 'card card--interactive task' + (isDone ? ' is-done' : '');
        row.innerHTML = `
          <input class="checkbox" type="checkbox" ${isDone ? 'checked' : ''} />
          <div class="task__body">
            <div class="task__title">${escapeHtml(item.title)}</div>
            <div class="task__desc">${escapeHtml(item.description)}</div>
            <a class="task__link" href="${encodeURI(item.link)}" target="_blank" rel="noopener">Open resource →</a>
          </div>`;
        row.querySelector('a').addEventListener('click', (e) => e.stopPropagation());
        // Update in place rather than re-rendering the list, so keyboard focus
        // stays on the checkbox the user just toggled.
        row.querySelector('input').addEventListener('change', (e) => {
          const d = getDoneSet();
          if (e.target.checked) d.add(item.id); else d.delete(item.id);
          setDoneSet(d);
          row.classList.toggle('is-done', e.target.checked);
          renderOnboardingProgress();
        });
        list.appendChild(row);
      });

      group.appendChild(list);
      wrap.appendChild(group);
    });

    renderOnboardingProgress();
  }

  function renderOnboardingProgress() {
    const done = getDoneSet();
    const doneCount = state.onboarding.filter((i) => done.has(i.id)).length;
    const total = state.onboarding.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    $('#onboard-progress-fill').style.width = `${pct}%`;
    $('#onboard-progressbar').setAttribute('aria-valuenow', String(pct));
    $('#onboard-progress-label').textContent = `${doneCount} of ${total} complete`;
    $('#onboard-hint').textContent = doneCount === total && total
      ? 'All done — welcome aboard.'
      : 'Tick items off as you go — your progress is saved on this device.';
    $('#onboard-reset').hidden = doneCount === 0;
  }

  $('#onboard-reset').addEventListener('click', () => {
    setDoneSet(new Set());
    renderOnboarding();
    toast('Onboarding progress reset');
  });

  // ---------- SOPs ----------
  $('#sop-search').addEventListener('input', (e) => {
    state.sopQuery = e.target.value.toLowerCase().trim();
    renderSops();
  });

  function renderSops() {
    const q = state.sopQuery;
    const matches = state.sops.filter((s) =>
      !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));

    const byCategory = {};
    matches.forEach((s) => { (byCategory[s.category] = byCategory[s.category] || []).push(s); });

    const wrap = $('#sop-groups');
    wrap.innerHTML = '';
    $('#sop-empty').hidden = matches.length > 0;

    Object.keys(byCategory).sort().forEach((cat) => {
      const group = document.createElement('div');
      group.className = 'group';
      group.innerHTML = `<div class="section-head"><h2 class="u-eyebrow">${escapeHtml(cat)}</h2></div>`;
      const list = document.createElement('div');
      list.className = 'card card--elevated list';
      byCategory[cat].forEach((s) => {
        const row = document.createElement('div');
        row.className = 'list__row';
        row.innerHTML = `<span>${escapeHtml(s.title)}</span>
          <a href="${encodeURI(s.link)}" target="_blank" rel="noopener">Open →</a>`;
        list.appendChild(row);
      });
      group.appendChild(list);
      wrap.appendChild(group);
    });
  }

  // ---------- Dashboard ----------
  const deptName = (id) => (state.departments.find((d) => d.id === id) || {}).name || id;

  function renderDashboard() {
    renderStats();
    renderDeptFilter();
    renderAttendance();
    renderTicketBars();
    renderTicketTable();
    renderReports();
  }

  function visibleDepts() {
    return state.activeDept === 'all'
      ? state.departments
      : state.departments.filter((d) => d.id === state.activeDept);
  }

  function renderStats() {
    const depts = visibleDepts();
    const openTickets = state.tickets.filter((t) =>
      t.status !== 'Closed' && (state.activeDept === 'all' || t.department === state.activeDept));

    let present = 0, total = 0, headcount = 0;
    depts.forEach((d) => {
      const a = state.attendance && state.attendance.byDepartment[d.id];
      if (!a) return;
      present += a.present;
      total += a.present + a.absent + a.leave;
      headcount += a.headcount;
    });
    const rate = total ? Math.round((present / total) * 100) : 0;
    const awayToday = state.leave.filter((r) => leavePhase(r) === 'current').length;

    const tiles = [
      { label: 'Open tickets', value: openTickets.length, tone: openTickets.length ? 'destructive' : 'success', sub: state.activeDept === 'all' ? 'across all departments' : deptName(state.activeDept) },
      { label: 'Attendance', value: `${rate}%`, tone: rate >= 85 ? 'success' : 'warning', sub: 'present this month' },
      { label: 'On leave today', value: awayToday, tone: awayToday ? 'warning' : '', sub: awayToday === 1 ? 'team member' : 'team members' },
      { label: 'Headcount', value: headcount, tone: '', sub: depts.length === 1 ? deptName(depts[0].id) : `${depts.length} departments` },
    ];

    // Tile tint is positional (1–4), not semantic — the row reads as one
    // colourful set rather than four competing status signals.
    $('#stat-row').innerHTML = tiles.map((t, i) => `
      <div class="stat stat--${i + 1}">
        <div class="u-eyebrow">${t.label}</div>
        <div class="stat__value">${t.value}</div>
        <div class="stat__sub">${escapeHtml(t.sub)}</div>
      </div>`).join('');
  }

  function renderDeptFilter() {
    const wrap = $('#dept-filter');
    wrap.innerHTML = '';
    const mk = (id, label) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = 'segmented__item' + (state.activeDept === id ? ' is-active' : '');
      b.setAttribute('aria-pressed', String(state.activeDept === id));
      b.addEventListener('click', () => { state.activeDept = id; renderDashboard(); });
      wrap.appendChild(b);
    };
    mk('all', 'All departments');
    state.departments.forEach((d) => mk(d.id, d.name));
  }

  function renderAttendance() {
    const wrap = $('#attendance-blocks');
    wrap.innerHTML = '';
    if (!state.attendance) return;
    $('#attendance-month').textContent = state.attendance.month || '';

    visibleDepts().forEach((d) => {
      const a = state.attendance.byDepartment[d.id];
      if (!a) return;
      const total = a.present + a.absent + a.leave;
      const rate = total ? Math.round((a.present / total) * 100) : 0;
      const block = document.createElement('div');
      block.className = 'card card--elevated attendance';
      block.innerHTML = `
        <div class="attendance__head">
          <span class="attendance__name">${escapeHtml(d.name)} <span class="attendance__rate">${rate}%</span></span>
          <span class="attendance__count">${a.headcount} people</span>
        </div>
        <div class="stackbar" role="img" aria-label="${escapeHtml(d.name)}: ${a.present} present, ${a.leave} on leave, ${a.absent} absent">
          <div class="stackbar__seg stackbar__seg--present" style="flex:${a.present}"></div>
          <div class="stackbar__seg stackbar__seg--leave" style="flex:${a.leave}"></div>
          <div class="stackbar__seg stackbar__seg--absent" style="flex:${a.absent}"></div>
        </div>
        <div class="legend">
          <span class="legend__item"><span class="legend__swatch legend__swatch--present"></span>Present (${a.present})</span>
          <span class="legend__item"><span class="legend__swatch legend__swatch--leave"></span>Leave (${a.leave})</span>
          <span class="legend__item"><span class="legend__swatch legend__swatch--absent"></span>Absent (${a.absent})</span>
        </div>`;
      wrap.appendChild(block);
    });
  }

  function renderTicketBars() {
    const counts = state.departments.map((d) => ({
      name: d.name,
      count: state.tickets.filter((t) => t.department === d.id && t.status !== 'Closed').length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    $('#ticket-bars').innerHTML = counts.map(({ name, count }) => `
      <div class="barlist__row">
        <div class="barlist__label">${escapeHtml(name)}</div>
        <div class="barlist__track"><div class="barlist__fill" style="width:${(count / max) * 100}%"></div></div>
        <div class="barlist__value">${count}</div>
      </div>`).join('');
  }

  // Ticket status → badge variant. Unknown statuses fall back to the neutral
  // badge rather than rendering unstyled.
  const STATUS_TONE = { 'Open': 'destructive', 'In Progress': 'warning', 'Closed': 'success' };
  const statusBadge = (status) => {
    const tone = STATUS_TONE[status];
    return `<span class="badge badge--dot ${tone ? `badge--${tone}` : ''}">${escapeHtml(status)}</span>`;
  };

  $('#ticket-search').addEventListener('input', (e) => {
    state.ticketQuery = e.target.value.toLowerCase().trim();
    renderTicketTable();
  });
  $('#status-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (!btn) return;
    state.ticketStatus = btn.dataset.status;
    $$('#status-filter button').forEach((b) => b.classList.toggle('is-active', b === btn));
    renderTicketTable();
  });

  function filteredTickets() {
    const q = state.ticketQuery;
    return state.tickets.filter((t) => {
      if (state.activeDept !== 'all' && t.department !== state.activeDept) return false;
      if (state.ticketStatus !== 'all' && t.status !== state.ticketStatus) return false;
      if (!q) return true;
      return `${t.id} ${t.title} ${t.assignee}`.toLowerCase().includes(q);
    });
  }

  function renderTicketTable() {
    const rows = filteredTickets();
    const tbody = $('#ticket-tbody');
    tbody.innerHTML = '';
    $('#ticket-empty').hidden = rows.length > 0;

    rows.forEach((t) => {
      const tr = document.createElement('tr');
      tr.className = 'is-interactive';
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td class="is-id">${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(deptName(t.department))}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${escapeHtml(t.priority)}</td>
        <td>${escapeHtml(t.assignee)}</td>`;
      tr.addEventListener('click', () => openTicketModal(t));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTicketModal(t); }
      });
      tbody.appendChild(tr);
    });
  }

  function renderReports() {
    const rows = state.activeDept === 'all'
      ? state.reports
      : state.reports.filter((r) => r.department === state.activeDept);
    const wrap = $('#report-list');
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty">No reports for this department yet.</div>';
      return;
    }
    wrap.innerHTML = rows.map((r) => `
      <div class="list__row">
        <div>
          <div>${escapeHtml(r.title)}</div>
          <div class="person__range">${escapeHtml(deptName(r.department))} · ${escapeHtml(r.period)}</div>
        </div>
        <a href="${encodeURI(r.link)}" target="_blank" rel="noopener">Open report →</a>
      </div>`).join('');
  }

  $('#refresh-dashboard').addEventListener('click', async () => {
    await refreshDashboardData();
    toast('Dashboard refreshed');
  });

  // ---------- Ticket modal ----------
  let lastFocused = null;

  function openTicketModal(t) {
    lastFocused = document.activeElement;
    $('#tm-title').textContent = t.title;
    $('#tm-id').textContent = t.id;
    $('#tm-status').innerHTML = statusBadge(t.status);
    $('#tm-priority').textContent = t.priority;
    $('#tm-dept').textContent = deptName(t.department);
    $('#tm-assignee').textContent = t.assignee;
    $('#tm-created').textContent = formatDate(t.createdAt) || t.createdAt;
    $('#tm-desc').textContent = t.description;
    $('#ticket-modal').hidden = false;
    $('#tm-close').focus();
  }

  function closeTicketModal() {
    $('#ticket-modal').hidden = true;
    if (lastFocused) lastFocused.focus();
  }

  $('#tm-close').addEventListener('click', closeTicketModal);
  $('#tm-close-x').addEventListener('click', closeTicketModal);
  $('#ticket-modal').addEventListener('click', (e) => {
    if (e.target === $('#ticket-modal')) closeTicketModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#ticket-modal').hidden) closeTicketModal();
  });

  // ---------- Leave ----------
  // A record is only "current" if today falls inside its date range — a leave
  // booked for next week is upcoming, not away-right-now.
  function leavePhase(record, today = todayStr()) {
    if (!record.onLeave) return 'none';
    const { from, to } = record;
    if (!from && !to) return 'current';
    if (from && today < from) return 'upcoming';
    if (to && today > to) return 'past';
    return 'current';
  }

  const leaveToggle = $('#leave-toggle');

  leaveToggle.addEventListener('change', async () => {
    const on = leaveToggle.checked;
    $('#leave-detail-row').hidden = !on;
    updateToggleLabel();
    if (!on) {
      await saveLeave(false);
    } else if (!$('#leave-from').value) {
      $('#leave-from').value = todayStr();
      $('#leave-to').value = todayStr();
    }
  });

  function updateToggleLabel() {
    const mine = myLeave();
    const phase = mine ? leavePhase(mine) : 'none';
    $('#leave-toggle-label').textContent = leaveToggle.checked ? "I'm on leave" : "I'm available";
    $('#leave-my-status').textContent = !leaveToggle.checked
      ? "Flip this on to let the team know you're on leave."
      : phase === 'upcoming'
        ? `Scheduled: ${describeRange(mine)}`
        : phase === 'current'
          ? `The team can see you're on leave (${describeRange(mine)}).`
          : 'Set your dates below, then save.';
  }

  $('#leave-save').addEventListener('click', () => saveLeave(true));

  async function saveLeave(onLeave) {
    const from = $('#leave-from').value;
    const to = $('#leave-to').value;
    const note = $('#leave-note').value.trim();
    const err = $('#leave-error');

    if (onLeave && from && to && to < from) {
      err.textContent = 'The last day on leave cannot be before the first day.';
      err.hidden = false;
      return;
    }
    err.hidden = true;

    try {
      $('#leave-save').disabled = true;
      const record = await api('/api/leave', {
        method: 'POST',
        body: JSON.stringify({ name: state.name, onLeave, from, to, note }),
      });
      upsertLocalLeave(record);
      renderLeaveBoards();
      updateToggleLabel();
      renderHero();
      toast(onLeave ? 'Leave status saved' : "Marked you as available");
    } catch {
      toast("Couldn't save your status — is the server running?", 'error');
    } finally {
      $('#leave-save').disabled = false;
    }
  }

  const myLeave = () => state.leave.find((r) => r.name.toLowerCase() === state.name.toLowerCase());

  function upsertLocalLeave(record) {
    const i = state.leave.findIndex((r) => r.name.toLowerCase() === record.name.toLowerCase());
    if (i >= 0) state.leave[i] = record; else state.leave.push(record);
  }

  const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  function describeRange({ from, to }) {
    if (!from && !to) return 'no end date set';
    if (from && to) return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
    return from ? `from ${formatDate(from)}` : `until ${formatDate(to)}`;
  }

  function renderLeaveBoards() {
    const today = todayStr();
    const current = state.leave.filter((r) => leavePhase(r, today) === 'current');
    const upcoming = state.leave.filter((r) => leavePhase(r, today) === 'upcoming')
      .sort((a, b) => (a.from || '').localeCompare(b.from || ''));

    $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    renderLeaveList($('#leave-board-current'), current, 'warning', 'On leave', 'Everyone is available today.');
    renderLeaveList($('#leave-board-upcoming'), upcoming, 'primary', 'Upcoming', 'No leave booked ahead.');

    const badge = $('#leave-count');
    badge.textContent = String(current.length);
    badge.hidden = current.length === 0;
  }

  function renderLeaveList(wrap, records, tone, badgeText, emptyText) {
    wrap.innerHTML = '';
    if (!records.length) {
      wrap.innerHTML = `<div class="card empty">${escapeHtml(emptyText)}</div>`;
      return;
    }
    records
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((r) => {
        const isMe = r.name.toLowerCase() === state.name.toLowerCase();
        const row = document.createElement('div');
        row.className = 'card card--elevated person';
        row.innerHTML = `
          <div class="avatar">${escapeHtml(initials(r.name))}</div>
          <div>
            <div class="person__name">${escapeHtml(r.name)}${isMe ? '<span class="person__you">You</span>' : ''}</div>
            <div class="person__range">${escapeHtml(describeRange(r))}</div>
            ${r.note ? `<div class="person__note">${escapeHtml(r.note)}</div>` : ''}
          </div>
          <div class="u-grow"></div>
          <span class="badge badge--dot badge--${tone}">${badgeText}</span>`;
        wrap.appendChild(row);
      });
  }

  function syncOwnLeaveUi() {
    const mine = myLeave();
    const active = mine ? ['current', 'upcoming'].includes(leavePhase(mine)) : false;
    leaveToggle.checked = active;
    $('#leave-detail-row').hidden = !active;
    if (mine) {
      $('#leave-from').value = mine.from || '';
      $('#leave-to').value = mine.to || '';
      $('#leave-note').value = mine.note || '';
    }
    updateToggleLabel();
  }

  // ---------- Data loading ----------
  function showError(message) {
    $('#error-text').textContent = message;
    $('#error-banner').hidden = false;
  }
  $('#error-retry').addEventListener('click', () => { $('#error-banner').hidden = true; boot(); });

  async function pollLeave() {
    try {
      state.leave = await api('/api/leave');
      renderLeaveBoards();
      syncOwnLeaveUi();
      renderHero();
      $('#error-banner').hidden = true;
    } catch {
      showError("Lost contact with the TeamHub server — leave status may be out of date.");
    }
  }

  async function refreshDashboardData() {
    try {
      const [attendance, tickets, reports] = await Promise.all([
        api('/api/attendance'), api('/api/tickets'), api('/api/reports'),
      ]);
      Object.assign(state, { attendance, tickets, reports });
      renderDashboard();
      renderHero();
      $('#error-banner').hidden = true;
    } catch {
      showError("Couldn't refresh dashboard data.");
    }
  }

  async function boot() {
    $('#loading').hidden = false;
    $('#views').hidden = true;

    try {
      const [meta, departments, onboarding, sops, attendance, tickets, reports, leave] = await Promise.all([
        api('/api/meta'), api('/api/departments'), api('/api/onboarding'), api('/api/sops'),
        api('/api/attendance'), api('/api/tickets'), api('/api/reports'), api('/api/leave'),
      ]);
      Object.assign(state, { departments, onboarding, sops, attendance, tickets, reports, leave });
      $('#mock-badge').hidden = meta.usingMonday;
      $('#dashboard-sub').textContent = meta.usingMonday
        ? 'Attendance, tickets, and reports — live from monday.com.'
        : 'Attendance, tickets, and reports — sample data until monday.com boards are mapped.';

      $('#loading').hidden = true;
      $('#views').hidden = false;
      setView(localStorage.getItem('teamhub_view') || 'onboarding');

      renderHero();
      renderOnboarding();
      renderSops();
      renderDashboard();
      renderLeaveBoards();
      syncOwnLeaveUi();

      state.timers.forEach(clearInterval);
      state.timers = [
        setInterval(pollLeave, LEAVE_POLL_MS),
        setInterval(refreshDashboardData, DASHBOARD_POLL_MS),
      ];
    } catch {
      $('#loading').hidden = true;
      showError("Couldn't reach the TeamHub server. Check that it's running, then retry.");
    }
  }

  if (state.name) enterApp(state.name);
  else showGate();
})();
