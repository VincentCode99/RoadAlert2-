// ═══════════════════════════════════════════════
// ADMIN PANEL — FixMyRoad BN
// ═══════════════════════════════════════════════

const API_BASE = 'https://roadalert2.onrender.com/api';

// ── Hardcoded credentials (change as needed) ──
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Toting33!'
};

// ── State ──
let allReports = [];
let filteredList = [];
let selectedId = null;
let adminMap = null;
let adminMarkers = {}; // id → marker

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
function checkSession() {
  return sessionStorage.getItem('fmr_admin_auth') === 'true';
}

function login(user, pass) {
  return user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password;
}

// ── Login form ──
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('login-error');
  const btnTxt = document.getElementById('login-btn-text');
  const btnSpin = document.getElementById('login-spinner');

  errEl.classList.add('hidden');
  btnTxt.textContent = 'Authenticating…';
  btnSpin.classList.remove('hidden');

  // Tiny delay for UX
  await new Promise(r => setTimeout(r, 600));

  if (login(user, pass)) {
    sessionStorage.setItem('fmr_admin_auth', 'true');
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('admin-shell').classList.remove('hidden');
    // Delay so the shell has real pixel dimensions before Leaflet mounts
    setTimeout(() => initDashboard(), 50);
  } else {
    btnTxt.textContent = 'Login to Admin Panel';
    btnSpin.classList.add('hidden');
    errEl.classList.remove('hidden');
  }
});

// ── Logout ──
document.getElementById('admin-logout').addEventListener('click', () => {
  if (!confirm('Logout from admin panel?')) return;
  sessionStorage.removeItem('fmr_admin_auth');
  document.getElementById('admin-shell').classList.add('hidden');
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
});

// ── Auto-restore session ──
if (checkSession()) {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('admin-shell').classList.remove('hidden');
  // Small delay ensures the shell is visible (has real dimensions) before Leaflet init
  setTimeout(() => {
    initDashboard().catch(err => {
      console.error('Dashboard init failed:', err);
      // Clear broken session and show login again
      sessionStorage.removeItem('fmr_admin_auth');
      document.getElementById('admin-shell').classList.add('hidden');
      document.getElementById('login-overlay').classList.remove('hidden');
    });
  }, 50);
}

// ══════════════════════════════════════
// INIT DASHBOARD
// ══════════════════════════════════════
async function initDashboard() {
  initAdminMap();
  await loadReports();
  initFilters();
  initSearch();
  initEditPanel();
}

// ══════════════════════════════════════
// MAP
// ══════════════════════════════════════
function initAdminMap() {
  if (adminMap) return;

  const streetTiles = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 20 }
  );
  const satelliteTiles = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles © Esri' }
  );

  adminMap = L.map('admin-map', {
    zoomControl: true,
    layers: [streetTiles]
  }).setView([4.5353, 114.7277], 10);

  L.control.layers(
    { '🗺️ Street': streetTiles, '🛰️ Satellite': satelliteTiles },
    null, { position: 'topleft' }
  ).addTo(adminMap);

  streetTiles.on('load', () => {
    document.getElementById('admin-map-loading').style.display = 'none';
  });

  // Force a size recalculation after mount so Leaflet fills the container
  setTimeout(() => adminMap.invalidateSize(), 100);
  setTimeout(() => adminMap.invalidateSize(), 500);
}

function markerColor(severity) {
  return {
    'Low': '#22C55E',
    'Medium': '#F5C400',
    'High': '#EF4444',
    'Critical': '#a855f7'
  }[severity] || '#F5C400';
}

function statusRing(status) {
  return {
    'Open': '#F5C400',
    'In Progress': '#FF8C00',
    'Resolved': '#22C55E'
  }[status] || '#F5C400';
}

function makeIcon(report) {
  const bg = markerColor(report.severity);
  const ring = statusRing(report.status);
  const size = report.severity === 'Critical' ? 22 : 16;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 0 0 2px ${ring};transition:transform 0.2s"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -14]
  });
}

function renderMarkers() {
  // Remove all old markers
  Object.values(adminMarkers).forEach(m => m.remove());
  adminMarkers = {};

  filteredList.filter(r => r.lat && r.lng).forEach(r => {
    const m = L.marker([r.lat, r.lng], { icon: makeIcon(r) }).addTo(adminMap);

    // DB returns snake_case; frontend uses camelCase — handle both
    const desc           = r.description || r.desc || '';
    const privacyRegions = r.privacy_regions || r.privacyRegions || [];
    const photoSrc       = r.photo || '';
    // safeId: used ONLY for the DOM element id (dashes are valid but keep it clean)
    const domId      = 'apc-' + r.id.replace(/[^a-zA-Z0-9]/g, '-');
    const safeType   = (r.type     || '').replace(/['"]/g, '');
    const safeLoc    = (r.location || '').replace(/['"]/g, '');
    // r.id is passed directly to JS functions — dashes are fine in string arguments

    const popupContent = `
      <div class="leaflet-custom-popup">
        <div class="popup-photo-container" id="${domId}">
          ${photoSrc ? `<img src="${photoSrc}" class="popup-photo" alt="Damage Photo"
            onclick="openAdminLightbox('${r.id}', '${safeType} at ${safeLoc}')">` : ''}
          <div class="privacy-mask-layer">
            ${privacyRegions.map(region => `
              <div class="privacy-region" style="top:${region.y}%; left:${region.x}%; width:${region.w}%; height:${region.h}%;">
                <div class="region-label">AI BLUR</div>
              </div>
            `).join('')}
          </div>
          ${photoSrc ? '<div class="privacy-info-tag">🛡️ AI Privacy Mask Active</div>' : ''}
        </div>
        <div class="popup-body">
          <div class="popup-header">
            <span class="popup-type-icon">${typeEmoji(r.type)}</span>
            <div>
              <div class="popup-title">${r.type}</div>
              <div class="popup-subtitle">📍 ${r.location || '—'}</div>
            </div>
          </div>
          <div class="popup-badges">
            <span class="popup-badge badge-sev-${r.severity}">${r.severity} Priority</span>
            <span class="popup-badge badge-status st-${(r.status || '').replace(' ', '')}">${r.status}</span>
          </div>
          <p class="popup-desc">${desc || 'No additional details provided.'}</p>
          <div class="popup-meta">
            <span>👤 Reported by: <b>${r.name || 'Anonymous'}</b></span>
            <span>🏢 District: ${r.district || '—'}</span>
            <span>📅 ${r.date ? new Date(r.date).toLocaleString() : '—'}</span>
          </div>
          ${(r.upvotes || 0) > 0 ? `
            <div class="popup-support-badge">
              🔥 Supported by <b>${r.upvotes}</b> other users
            </div>
          ` : ''}
          <!-- Admin-only: Edit button instead of "This is Fixed" -->
          <button class="admin-popup-edit" onclick="selectReport('${r.id}')">
            ✏️ Edit this report
          </button>
        </div>
      </div>`;

    m.bindPopup(popupContent, { maxWidth: 280, className: 'fmr-popup' });
    m.on('click', () => {
      adminMap.flyTo([r.lat, r.lng], 17, { animate: true, duration: 1.0 });
      selectReport(r.id);
    });

    // Store photo src on marker for lightbox lookup
    m._photoSrc = photoSrc;
    adminMarkers[r.id] = m;
  });
}

// ══════════════════════════════════════
// LOAD REPORTS
// ══════════════════════════════════════
async function loadReports() {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    allReports = await res.json();
  } catch {
    // Fallback to localStorage cache
    const cached = localStorage.getItem('fmr_backup_reports');
    allReports = cached ? JSON.parse(cached) : [];
  }
  applyFilter();
}

// ══════════════════════════════════════
// FILTER + SEARCH
// ══════════════════════════════════════
let activeStatus = 'all';
let searchQuery = '';

function initFilters() {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.dataset.status;
      applyFilter();
    });
  });
}

function initSearch() {
  document.getElementById('admin-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    applyFilter();
  });
}

function applyFilter() {
  filteredList = allReports.filter(r => {
    // Normalise the status stored in DB (Pending → Open, In Review → In Progress)
    const normStatus = normaliseStatus(r.status);
    if (activeStatus !== 'all' && normStatus !== activeStatus) return false;
    if (searchQuery) {
      const haystack = [r.type, r.location, r.district, r.name].join(' ').toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  updateStats();
  renderList();
  renderMarkers();
}

/* Map DB statuses → display statuses */
function normaliseStatus(raw) {
  if (!raw) return 'Open';
  if (raw === 'Pending' || raw === 'Open' || raw === 'Acknowledged') return 'Open';
  if (raw === 'In Review' || raw === 'In Progress') return 'In Progress';
  if (raw === 'Resolved') return 'Resolved';
  return raw;
}

function statusClass(raw) {
  const norm = normaliseStatus(raw);
  return {
    'Open': 'st-open',
    'In Progress': 'st-in-progress',
    'Resolved': 'st-resolved'
  }[norm] || 'st-open';
}

function updateStats() {
  document.getElementById('stat-total').textContent = allReports.length;
  document.getElementById('stat-open').textContent = allReports.filter(r => normaliseStatus(r.status) === 'Open').length;
  document.getElementById('stat-inprogress').textContent = allReports.filter(r => normaliseStatus(r.status) === 'In Progress').length;
  document.getElementById('stat-resolved').textContent = allReports.filter(r => normaliseStatus(r.status) === 'Resolved').length;
}

// ══════════════════════════════════════
// RENDER LIST
// ══════════════════════════════════════
function renderList() {
  const el = document.getElementById('admin-report-list');

  if (filteredList.length === 0) {
    el.innerHTML = '<div class="admin-list-empty">No reports match the current filter.</div>';
    return;
  }

  el.innerHTML = filteredList.map(r => `
    <div class="admin-list-item${r.id === selectedId ? ' selected' : ''}"
         id="list-item-${r.id}"
         onclick="selectReport('${r.id}')">
      <div class="ali-icon">${typeEmoji(r.type)}</div>
      <div class="ali-body">
        <div class="ali-type">${r.type}</div>
        <div class="ali-loc">📍 ${r.location || r.district || '—'}</div>
        <div class="ali-meta">
          <span class="ali-badge sev-${(r.severity || 'medium').toLowerCase()}">${r.severity || 'Medium'}</span>
          <span class="ali-badge ${statusClass(r.status)}">${normaliseStatus(r.status)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
// SELECT REPORT (list click OR pin click)
// ══════════════════════════════════════
window.selectReport = function (id) {
  selectedId = id;
  const r = allReports.find(x => x.id === id);
  if (!r) return;

  // Highlight list item
  document.querySelectorAll('.admin-list-item').forEach(el => el.classList.remove('selected'));
  const listEl = document.getElementById('list-item-' + id);
  if (listEl) {
    listEl.classList.add('selected');
    listEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Fly to marker
  if (r.lat && r.lng) {
    adminMap.flyTo([r.lat, r.lng], 17, { animate: true, duration: 1.0 });
  }

  // Fill edit panel
  document.getElementById('edit-report-id').value = id;
  document.getElementById('edit-type-icon').textContent = typeEmoji(r.type);
  document.getElementById('edit-type-name').textContent = r.type;
  document.getElementById('edit-location').textContent = r.location || r.district || '—';

  // Set selects
  setSelect('edit-severity', r.severity || 'Medium');
  setSelect('edit-category', r.type || 'Other');

  // Normalise status for the edit panel's 3-option select
  const norm = normaliseStatus(r.status);
  setSelect('edit-status', norm);

  // Show panel
  const panel = document.getElementById('admin-edit-panel');
  panel.classList.remove('hidden');
  hideFeedback();
};

function setSelect(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const opt = [...sel.options].find(o => o.value === value);
  if (opt) sel.value = value;
}

// ══════════════════════════════════════
// EDIT PANEL ACTIONS
// ══════════════════════════════════════
function initEditPanel() {
  // Close
  document.getElementById('edit-close').addEventListener('click', () => {
    document.getElementById('admin-edit-panel').classList.add('hidden');
    selectedId = null;
    document.querySelectorAll('.admin-list-item').forEach(el => el.classList.remove('selected'));
  });

  // Save
  document.getElementById('edit-save').addEventListener('click', saveChanges);

  // Delete
  document.getElementById('edit-delete').addEventListener('click', deleteReport);
}

async function saveChanges() {
  const id = document.getElementById('edit-report-id').value;
  const severity = document.getElementById('edit-severity').value;
  const type = document.getElementById('edit-category').value;
  const status = document.getElementById('edit-status').value;

  if (!id) return;

  const saveBtn = document.getElementById('edit-save');
  saveBtn.disabled = true;
  saveBtn.querySelector('span').textContent = '⏳ Saving…';

  try {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity, type, status })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const hint = res.status === 404
        ? '❌ Route not found (404) — push server.js and redeploy on Render.'
        : `❌ Server error ${res.status}: ${body.error || res.statusText}`;
      throw new Error(hint);
    }

    // Patch local state
    const report = allReports.find(r => r.id === id);
    if (report) {
      report.severity = severity;
      report.type = type;
      report.status = status;
    }

    // Also update localStorage cache
    const cached = JSON.parse(localStorage.getItem('fmr_backup_reports') || '[]');
    const ci = cached.findIndex(r => r.id === id);
    if (ci > -1) {
      cached[ci].severity = severity;
      cached[ci].type = type;
      cached[ci].status = status;
      localStorage.setItem('fmr_backup_reports', JSON.stringify(cached));
    }

    // Refresh UI
    applyFilter();

    // Update marker icon live
    if (adminMarkers[id]) {
      adminMarkers[id].setIcon(makeIcon({ severity, status }));
    }

    showFeedback('✅ Changes saved successfully!', 'success');
    // Re-select to keep panel current
    const updatedR = allReports.find(r => r.id === id);
    if (updatedR) {
      document.getElementById('edit-type-name').textContent = updatedR.type;
      document.getElementById('edit-type-icon').textContent = typeEmoji(updatedR.type);
    }

  } catch (err) {
    showFeedback(err.message || '❌ Save failed. Is the backend deployed?', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.querySelector('span').textContent = '💾 Save Changes';
  }
}

async function deleteReport() {
  const id = document.getElementById('edit-report-id').value;
  if (!id) return;

  const r = allReports.find(x => x.id === id);
  const label = r ? `${r.type} at ${r.location || r.district}` : id;

  if (!confirm(`Delete this report?\n\n"${label}"\n\nThis cannot be undone.`)) return;

  const delBtn = document.getElementById('edit-delete');
  delBtn.disabled = true;
  delBtn.querySelector('span').textContent = '⏳ Deleting…';

  try {
    const res = await fetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const hint = res.status === 404
        ? '❌ Route not found (404) — push server.js and redeploy on Render.'
        : `❌ Server error ${res.status}: ${body.error || res.statusText}`;
      throw new Error(hint);
    }

    // Remove from local state
    allReports = allReports.filter(r => r.id !== id);

    // Update localStorage cache
    const cached = JSON.parse(localStorage.getItem('fmr_backup_reports') || '[]');
    localStorage.setItem('fmr_backup_reports', JSON.stringify(cached.filter(r => r.id !== id)));

    // Remove marker
    if (adminMarkers[id]) { adminMarkers[id].remove(); delete adminMarkers[id]; }

    // Hide panel
    document.getElementById('admin-edit-panel').classList.add('hidden');
    selectedId = null;

    applyFilter();

  } catch (err) {
    showFeedback(err.message || '❌ Delete failed. Is the backend deployed?', 'error');
  } finally {
    // Always reset the button — whether success or failure
    delBtn.disabled = false;
    delBtn.querySelector('span').textContent = '🗑️ Delete Report';
  }

}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function typeEmoji(type) {
  const map = {
    'Pothole': '🕳️',
    'Broken Signage': '⚠️',
    'Damaged Drain Cover': '🔩',
    'Faded Road Markings': '🛤️'
  };
  return map[type] || '⚠️';
}

function showFeedback(msg, type) {
  const el = document.getElementById('edit-feedback');
  el.textContent = msg;
  el.className = `edit-feedback ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function hideFeedback() {
  const el = document.getElementById('edit-feedback');
  el.classList.add('hidden');
}

// ══════════════════════════════════════
// LIGHTBOX (admin)
// ══════════════════════════════════════
// Called from popup HTML via onclick — needs to be on window
window.openAdminLightbox = function (reportId, caption) {
  // Look up photo from the marker we stored it on
  const marker = adminMarkers[reportId];
  const src = marker ? marker._photoSrc : '';
  if (!src) return;
  const lb  = document.getElementById('admin-lightbox');
  const img = document.getElementById('admin-lightbox-img');
  const cap = document.getElementById('admin-lightbox-caption');
  if (!lb || !img) return;
  img.src = src;
  if (cap) cap.textContent = caption || '';
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
};

window.closeAdminLightbox = function () {
  const lb = document.getElementById('admin-lightbox');
  if (lb) lb.classList.remove('show');
  document.body.style.overflow = '';
};

document.getElementById('admin-lightbox-close')?.addEventListener('click', window.closeAdminLightbox);
document.getElementById('admin-lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'admin-lightbox') window.closeAdminLightbox();
});
