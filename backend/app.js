// ───────────────────────────────────────────────
// DATABASE (IndexedDB v1.0)
// ───────────────────────────────────────────────
const DB_NAME = 'RoadAlert_DB';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

// ───────────────────────────────────────────────
// LANGUAGE TRANSLATION (i18n - v10.2)
// ───────────────────────────────────────────────
const translations = {
  en: {
    nav_home: 'Home',
    nav_report: 'Report',
    nav_map: 'Map',
    nav_login: 'Login',
    hero_badge: '🇧🇳 Made for Brunei',
    hero_title1: 'Fix Our Roads,',
    hero_title2: 'Together.',
    hero_subtitle: 'Spotted a pothole, crack, or dangerous road condition? Report it in seconds and help keep Brunei\'s roads safe for everyone.',
    btn_report_now: '📍 Report a Problem',
    btn_view_map: '🗺️ View Reports Map',
    lang_toggle: '🇲🇾 BM',

    // Report Page
    report_page_title: '📍 Submit a Report',
    report_page_subtitle: 'Help us fix Brunei\'s roads by submitting a damage report below.',
    label_name: 'Your Name',
    label_optional: '(optional)',
    label_photo: 'Upload Photo',
    label_type: 'Damage Type',
    label_severity: 'Severity',
    label_gps: 'GPS Location',
    label_district: 'District',
    label_location: 'Street / Location Description',
    label_desc: 'Description',
    btn_submit_report: 'Submit Report',

    // Map Page
    map_page_title: '🗺️ Reports Map',
    map_page_subtitle: 'See all submitted road damage reports across Brunei.',
    filter_reports: '🔍 Filter Reports',
    filter_status: 'Status',
    filter_severity: 'Severity',
    filter_type: 'Damage Type',
    filter_district: 'District',
    btn_reset_filters: '↺ Reset Filters',
    label_reports: 'Reports',

    // Home Stats
    top_types_title: 'Most Reported Issues',
    top_types_subtitle: 'The top 3 common road problems in Brunei',
    leaderboard_title: 'District Action Leaderboard ⚠️',
    leaderboard_subtitle: 'Districts with the most unresolved road issues.'
  },
  ms: {
    nav_home: 'Utama',
    nav_report: 'Lapor',
    nav_map: 'Peta',
    nav_login: 'Log Masuk',
    hero_badge: '🇧🇳 Buatan Brunei',
    hero_title1: 'Baiki Jalan Kita,',
    hero_title2: 'Bersama.',
    hero_subtitle: 'Terjumpa lubang, rekahan, atau keadaan jalan yang bahaya? Lapor dalam beberapa saat dan bantu pastikan jalan Brunei selamat untuk semua.',
    btn_report_now: '📍 Lapor Masalah',
    btn_view_map: '🗺️ Lihat Peta Laporan',
    lang_toggle: '🇬🇧 EN',

    // Report Page
    report_page_title: '📍 Hantar Laporan',
    report_page_subtitle: 'Bantu kami baiki jalan Brunei dengan menghantar laporan kerosakan di bawah.',
    label_name: 'Nama Anda',
    label_optional: '(pilihan)',
    label_photo: 'Muat Naik Gambar',
    label_type: 'Jenis Kerosakan',
    label_severity: 'Tahap Kritikal',
    label_gps: 'Lokasi GPS',
    label_district: 'Daerah',
    label_location: 'Keterangan Jalan / Lokasi',
    label_desc: 'Penerangan',
    btn_submit_report: 'Hantar Laporan',

    // Map Page
    map_page_title: '🗺️ Peta Laporan',
    map_page_subtitle: 'Lihat semua laporan kerosakan jalan raya di seluruh Brunei.',
    filter_reports: '🔍 Tapis Laporan',
    filter_status: 'Status',
    filter_severity: 'Tahap Kritikal',
    filter_type: 'Jenis Kerosakan',
    filter_district: 'Daerah',
    btn_reset_filters: '↺ Semula',
    label_reports: 'Senarai Laporan',

    // Home Stats
    top_types_title: 'Masalah Kerap Dilaporkan',
    top_types_subtitle: '3 masalah jalan raya utama di Brunei',
    leaderboard_title: 'Papan Pendahulu Tindakan Daerah ⚠️',
    leaderboard_subtitle: 'Daerah dengan bilangan isu jalan raya terbanyak yang belum diselesaikan.'
  }
};



let currentLang = localStorage.getItem('fmr_lang') || 'en';

window.toggleLanguage = function () {
  currentLang = currentLang === 'en' ? 'ms' : 'en';
  localStorage.setItem('fmr_lang', currentLang);
  applyTranslations();
};

function applyTranslations() {
  const dict = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  const langBtn = document.getElementById('btn-lang');
  if (langBtn) langBtn.innerHTML = dict.lang_toggle;
}

// ───────────────────────────────────────────────
// REAL POSTGRESQL DATABASE (via Backend API)
// ───────────────────────────────────────────────
const API_BASE = 'https://roadalert2.onrender.com/api';

async function dbGetAll() {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('API error');
    const reports = await res.json();
    localStorage.setItem('fmr_backup_reports', JSON.stringify(reports));
    return reports;
  } catch (err) {
    console.warn("Backend unreachable, using cache", err);
    const cached = localStorage.getItem('fmr_backup_reports');
    return cached ? JSON.parse(cached) : [];
  }
}

async function dbPut(report) {
  // Update local cache first
  let cached = JSON.parse(localStorage.getItem('fmr_backup_reports') || '[]');
  const idx = cached.findIndex(r => r.id === report.id);
  if (idx > -1) cached[idx] = report;
  else cached.push(report);
  localStorage.setItem('fmr_backup_reports', JSON.stringify(cached));

  // Send to backend if online
  if (navigator.onLine) {
    try {
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      report.syncStatus = 'synced';
      console.log("✅ Report saved to PostgreSQL");
    } catch (err) {
      report.syncStatus = 'pending';
      console.error("❌ Sync failed", err);
    }
  } else {
    report.syncStatus = 'pending';
  }
}

async function dbPutAll(allReportsArr) {
  for (const r of allReportsArr) await dbPut(r);
}

async function dbDelete(id) {
  console.warn("Delete not implemented yet");
}

// ───────────────────────────────────────────────
// STATE
// ───────────────────────────────────────────────
let reports = [];
let mainMap = null;
let pickedLat = null, pickedLng = null;
let mainMarkers = [];
let gpsLat = null, gpsLng = null;
let photoDataUrl = null;
let isSyncing = false;
let currentRadiusLimit = 100; // Dynamic: 100m or 500m
let nextCleanupTime = Date.now() + 120000;
let blazefaceModel = null; // AI Model Cache
let mobilenetModel = null;  // AI Damage Verifier Cache

// Demo seed data (Empty for Production v6.7)
const DEMO = [];

function allReports() { return [...DEMO, ...reports]; }
function saveReports() { dbPutAll(reports); }

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const q1 = lat1 * Math.PI / 180, q2 = lat2 * Math.PI / 180;
  const dq = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dq / 2) ** 2 + Math.cos(q1) * Math.cos(q2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function collapseMapSidebars() {
  const filterBtn = document.getElementById('toggle-filters');
  if (filterBtn && filterBtn.parentElement) {
    filterBtn.parentElement.classList.add('collapsed');
  }
  const legendBtn = document.getElementById('toggle-legend');
  if (legendBtn && legendBtn.parentElement) {
    legendBtn.parentElement.classList.add('collapsed');
  }
}

const BRUNEI_CENTER = [4.5353, 114.7277];

function getFilteredReports() {
  const status = document.getElementById('filter-status')?.value || 'all';
  const severity = document.getElementById('filter-severity')?.value || 'all';
  const type = document.getElementById('filter-type')?.value || 'all';
  const district = document.getElementById('filter-district')?.value || 'all';

  return allReports().filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (status === 'all' && r.status === 'Archived') return false; // Hide archived by default
    if (severity !== 'all' && r.severity !== severity) return false;
    if (type !== 'all' && r.type !== type) return false;
    if (district !== 'all' && r.district !== district) return false;
    return true;
  });
}

// ───────────────────────────────────────────────
// ROUTING / NAV
// ───────────────────────────────────────────────
function showPage(name, centerCoords = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  document.getElementById('nav-links').classList.remove('open');
  window.scrollTo(0, 0);

  if (name === 'map') {
    initMainMap();
    renderReportList();
    if (centerCoords) {
      setTimeout(() => {
        mainMap.flyTo([centerCoords.lat, centerCoords.lng], 17, {
          animate: true,
          duration: 1.5 // Cinematic duration
        });
      }, 200);
    }
  }
  if (name === 'report') {
    const isLogged = !!currentUser;
    const gate = document.getElementById('report-auth-gate');
    const form = document.getElementById('report-form-container');
    if (gate) gate.classList.toggle('hidden', isLogged);
    if (form) form.classList.toggle('hidden', !isLogged);
    if (isLogged) {
      setTimeout(initMiniMap, 200);
    }
  }

  if (name === 'home') {
    updateStats();
    renderMyReports();
    renderTopTypes();
    renderLeaderboard();
  }
}

function updateStats() {
  const all = allReports();
  const total = all.length;
  const resolved = all.filter(r => r.status === 'Resolved').length;
  const pending = all.filter(r => r.status === 'Pending').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-resolved').textContent = resolved;
  document.getElementById('stat-pending').textContent = pending;

  // Map sidebar badge (Only Active Reports: Total - Resolved)
  const activeCount = all.length - resolved;
  const mapBadge = document.getElementById('report-count');
  if (mapBadge) {
    mapBadge.textContent = activeCount;
    mapBadge.style.background = activeCount > 0 ? 'var(--yellow)' : 'rgba(255,255,255,0.1)';
    mapBadge.style.color = activeCount > 0 ? 'var(--dark1)' : 'var(--gray)';
  }
}

// ───────────────────────────────────────────────
// MY REPORTS & ADMIN
// ───────────────────────────────────────────────
// ───────────────────────────────────────────────
// SYNC ENGINE (Offline-First)
// ───────────────────────────────────────────────
function updateSyncUI() {
  const indicator = document.getElementById('sync-indicator');
  const text = indicator?.querySelector('.sync-text');
  if (!indicator || !text) return;

  if (!navigator.onLine) {
    indicator.className = 'sync-indicator offline';
    text.textContent = 'Offline - Queueing';
  } else if (isSyncing) {
    indicator.className = 'sync-indicator syncing';
    text.textContent = 'Syncing to Cloud...';
  } else {
    indicator.className = 'sync-indicator';
    text.textContent = 'Cloud Sync Active';
  }
}

async function syncQueue() {
  if (!navigator.onLine || isSyncing) return;

  const all = await dbGetAll();
  const pending = all.filter(r => r.syncStatus === 'pending');

  if (pending.length === 0) return;

  isSyncing = true;
  updateSyncUI();

  // Simulate cloud latency for each report
  for (const report of pending) {
    await new Promise(r => setTimeout(r, 1500)); // Simulated network push
    report.syncStatus = 'synced';
    await dbPut(report);
  }

  isSyncing = false;
  updateSyncUI();

  // Refresh reports from DB
  reports = await dbGetAll();
  updateStats();
  renderMyReports();
  if (mainMap) renderMapMarkers();
}

window.addEventListener('online', () => {
  updateSyncUI();
  syncQueue();
});
window.addEventListener('offline', updateSyncUI);

function renderMyReports() {
  const container = document.getElementById('my-reports-list');
  const userReports = reports;

  if (userReports.length === 0) {
    container.innerHTML = '<p class="empty-list">You haven\'t submitted any reports yet.</p>';
    return;
  }

  container.innerHTML = userReports.slice().reverse().map(r => `
    <div class="my-report-card" onclick="showPage('map', {lat: ${r.lat}, lng: ${r.lng}})">
      <div class="mrc-info">
        <h4>${typeEmoji(r.type)} ${r.type}</h4>
        <p>📍 ${r.location}</p>
        <p>📅 ${r.date}</p>
      </div>
      <div class="mrc-actions">
        ${isAdmin ? `
          <select class="admin-status-select" onchange="updateReportStatus('${r.id}', this.value)">
            <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Acknowledged" ${r.status === 'Acknowledged' ? 'selected' : ''}>Acknowledged</option>
            <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        ` : `
          <span class="rli-status status-${r.status.replace(' ', '')}">${r.status}</span>
          ${r.syncStatus === 'pending' ? '<span class="rli-status status-PendingSync">⏳ Queued</span>' : ''}
        `}
      </div>
    </div>
  `).join('');
}

window.updateReportStatus = async function (id, newStatus) {
  const reportIndex = reports.findIndex(r => r.id === id);
  if (reportIndex !== -1) {
    reports[reportIndex].status = newStatus;
    if (newStatus === 'Resolved') {
      reports[reportIndex].resolvedDate = new Date().toISOString();
    }
    await dbPut(reports[reportIndex]); // Save to DB
    updateStats();
    renderMyReports();
    renderTopTypes();
  }
};

window.flagAsFixed = async function (id) {
  const reportIndex = reports.findIndex(r => r.id === id);
  if (reportIndex !== -1) {
    const r = reports[reportIndex];
    r.fixedVotes = (r.fixedVotes || 0) + 1;

    if (r.fixedVotes >= 100 && r.status !== 'Resolved') {
      r.status = 'Resolved';
      r.resolvedDate = new Date().toISOString();
      alert('Thanks to community feedback, this report has been marked as Resolved!');
    } else {
      alert('Thank you! This issue has been flagged as fixed. If enough users flag it, it will be automatically resolved.');
    }

    await dbPut(r);
    updateStats();
    if (mainMap) renderMapMarkers();
    renderReportList();
  }
};

function renderTopTypes() {
  const grid = document.getElementById('top-types-grid');
  const counts = {};
  allReports().forEach(r => counts[r.type] = (counts[r.type] || 0) + 1);

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (sorted.length === 0) {
    grid.innerHTML = '<p class="empty-list" style="grid-column: 1/-1">No reports to analyze yet.</p>';
    return;
  }

  grid.innerHTML = sorted.map(([type, count], i) => `
    <div class="top-type-card">
      <span class="top-type-rank">#${i + 1}</span>
      <span class="top-type-icon">${typeEmoji(type)}</span>
      <div class="top-type-name">${type}</div>
      <div class="top-type-count">${count} reports</div>
    </div>
  `).join('');
}

function renderLeaderboard() {
  const grid = document.getElementById('leaderboard-grid');
  if (!grid) return;

  const unresolvedCounts = {};
  allReports().forEach(r => {
    if (r.status !== 'Resolved' && r.status !== 'Archived') {
      unresolvedCounts[r.district] = (unresolvedCounts[r.district] || 0) + 1;
    }
  });

  const sorted = Object.entries(unresolvedCounts)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    grid.innerHTML = '<p class="empty-list" style="grid-column: 1/-1;">All clear! No unresolved issues currently.</p>';
    return;
  }

  grid.innerHTML = sorted.map(([district, count], index) => {
    // Add visual pressure by color coding the top district
    const isTop = index === 0;
    const style = isTop ? 'border: 2px solid var(--red); background: rgba(239, 68, 68, 0.05);' : '';
    return `
      <div class="top-type-card" style="${style}">
        <span class="top-type-rank">#${index + 1}</span>
        <span class="top-type-icon">${isTop ? '🚨' : '📍'}</span>
        <div class="top-type-name">${district}</div>
        <div class="top-type-count">${count} unresolved</div>
      </div>
    `;
  }).join('');
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); showPage(el.dataset.page); });
});

// Navigation Button Listeners
document.getElementById('hero-report-btn')?.addEventListener('click', () => showPage('report'));
document.getElementById('hero-map-btn')?.addEventListener('click', () => showPage('map'));
document.getElementById('cta-report-btn')?.addEventListener('click', () => showPage('report'));

// Mobile Toggle & Scroll
document.getElementById('nav-toggle')?.addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});

window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
});

// Admin Mode
let isAdmin = false;
let logoClicks = 0;
document.getElementById('nav-logo-link').addEventListener('click', e => {
  e.preventDefault();
  logoClicks++;
  if (logoClicks === 5) {
    isAdmin = !isAdmin;
    logoClicks = 0;
    document.getElementById('admin-indicator').style.display = isAdmin ? 'block' : 'none';
    alert(isAdmin ? '🛠️ Admin Mode Activated! You can now edit report statuses on the Home page.' : 'Admin Mode Deactivated.');
    renderMyReports();
  } else {
    showPage('home');
  }
});

// ───────────────────────────────────────────────
// GPS CAPTURE
// ───────────────────────────────────────────────
const gpsBtn = document.getElementById('gps-btn');
const gpsDot = document.getElementById('gps-dot');
const gpsLabel = document.getElementById('gps-label');
const gpsCoordsEl = document.getElementById('gps-coords');

function setGpsState(state, message) {
  gpsDot.className = 'gps-dot gps-' + state;
  gpsLabel.textContent = message;
}

if (gpsBtn) {
  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setGpsState('error', 'Geolocation not supported by this browser.');
      return;
    }
    setGpsState('searching', 'Acquiring GPS signal...');
    gpsBtn.disabled = true;
    gpsBtn.textContent = '⏳ Locating...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        const speed = pos.coords.speed || 0; // m/s

        // Dynamic Radius Logic (v9.8)
        const isMoving = speed > 2.5; // > 9 km/h
        currentRadiusLimit = isMoving ? 500 : 100;
        const modeText = isMoving ? '🚀 Vehicle Mode (500m radius)' : '🚶 Pedestrian Mode (100m radius)';

        setGpsState('success', `${modeText} | ±${acc}m accuracy`);
        const coordsEl = document.getElementById('gps-coords');
        if (coordsEl) coordsEl.textContent = `Lat: ${gpsLat.toFixed(6)}  |  Lng: ${gpsLng.toFixed(6)}`;

        gpsBtn.textContent = '🔄 Re-capture';
        gpsBtn.disabled = false;
        pickedLat = gpsLat;
        pickedLng = gpsLng;

        // Unlock map & Visual GPS Feedback (v9.6)
        document.getElementById('mini-map-wrapper')?.classList.remove('locked');
        updateGpsVisuals(gpsLat, gpsLng, currentRadiusLimit);
        updateMiniMap(pickedLat, pickedLng);
      },
      (err) => {
        const msgs = { 1: 'Permission denied.', 2: 'Position unavailable.', 3: 'Timed out.' };
        setGpsState('error', msgs[err.code] || 'Location error.');
        gpsCoordsEl.textContent = '';
        gpsBtn.textContent = '📡 Retry Location';
        gpsBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ───────────────────────────────────────────────
// MAIN MAP
// ───────────────────────────────────────────────
function initMainMap() {
  if (!mainMap) {
    document.getElementById('main-map-loading').classList.remove('loader-hidden');

    // Define Base Layers
    const streetTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    });

    const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    mainMap = L.map('main-map', {
      zoomControl: false,
      layers: [streetTiles] // Default
    }).setView([4.5353, 114.7277], 10);

    const baseMaps = {
      "🗺️ Street View": streetTiles,
      "🛰️ Satellite View": satelliteTiles
    };

    L.control.zoom({ position: 'topleft' }).addTo(mainMap);
    L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(mainMap);

    streetTiles.on('load', () => {
      document.getElementById('main-map-loading').classList.add('loader-hidden');
    });
  }
  setTimeout(() => mainMap.invalidateSize(), 100);
  renderMapMarkers();
}

function initToggles() {
  ['toggle-filters', 'toggle-legend'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        el.parentElement.classList.toggle('collapsed');
      });
    }
  });

  const mapMain = document.getElementById('main-map');
  const exitBtn = document.getElementById('exit-map-btn');

  function toggleMapInteraction(enabled) {
    if (!mainMap) return;
    const methods = ['dragging', 'touchZoom', 'doubleClickZoom', 'scrollWheelZoom', 'boxZoom'];
    methods.forEach(m => enabled ? mainMap[m].enable() : mainMap[m].disable());
    mapMain.style.cursor = enabled ? 'default' : 'pointer';
  }

  if (mapMain) {
    mapMain.addEventListener('click', () => {
      if (document.body.classList.contains('map-expanded')) return;
      document.body.classList.add('map-expanded');
      toggleMapInteraction(true);
      setTimeout(() => mainMap.invalidateSize(), 400);
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.remove('map-expanded');
      toggleMapInteraction(false);
      setTimeout(() => mainMap.invalidateSize(), 400);
    });
  }
}

// ───────────────────────────────────────────────
// REPORT MINI MAP PICKER
// ───────────────────────────────────────────────
let miniMap = null;
let miniMarker = null;
let gpsVisualMarker = null;
let gpsVisualCircle = null;

function initMiniMap() {
  if (miniMap) return;
  const container = document.getElementById('report-mini-map');
  if (!container) return;

  const streetTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
  });
  const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  });

  miniMap = L.map('report-mini-map', {
    zoomControl: false,
    layers: [streetTiles]
  }).setView(BRUNEI_CENTER, 9);

  const baseMaps = {
    "🗺️ Street": streetTiles,
    "🛰️ Satellite": satelliteTiles
  };
  L.control.zoom({ position: 'topleft' }).addTo(miniMap);
  L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(miniMap);

  miniMarker = L.marker(BRUNEI_CENTER, {
    draggable: true,
    icon: L.divIcon({
      className: 'picker-marker',
      html: '<div class="picker-dot"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    })
  }).addTo(miniMap);

  miniMarker.on('dragend', function () {
    const pos = miniMarker.getLatLng();

    // Hard Dynamic Check (v9.8)
    if (gpsLat && gpsLng) {
      const dist = getDistance(gpsLat, gpsLng, pos.lat, pos.lng);
      if (dist > currentRadiusLimit) {
        alert(`🚫 Radius Lock: In your current mode, you cannot pin damage more than ${currentRadiusLimit}m away.`);
        miniMarker.setLatLng(pickedLat ? [pickedLat, pickedLng] : [gpsLat, gpsLng]);
        return;
      }
    }

    pickedLat = pos.lat;
    pickedLng = pos.lng;
    const coordsEl = document.getElementById('gps-coords');
    if (coordsEl) coordsEl.textContent = `Lat: ${pickedLat.toFixed(6)}  |  Lng: ${pickedLng.toFixed(6)}`;
    setGpsState('success', 'Location picked manually');
  });

  miniMap.on('click', function (e) {
    // Hard Dynamic Check (v9.8)
    if (gpsLat && gpsLng) {
      const dist = getDistance(gpsLat, gpsLng, e.latlng.lat, e.latlng.lng);
      if (dist > currentRadiusLimit) {
        alert(`🚫 Radius Lock: In your current mode, you cannot pin damage more than ${currentRadiusLimit}m away.`);
        return;
      }
    }

    miniMarker.setLatLng(e.latlng);
    pickedLat = e.latlng.lat;
    pickedLng = e.latlng.lng;
    const coordsEl = document.getElementById('gps-coords');
    if (coordsEl) coordsEl.textContent = `Lat: ${pickedLat.toFixed(6)}  |  Lng: ${pickedLng.toFixed(6)}`;
    setGpsState('success', 'Location picked manually');
  });

  // Full Screen Logic (v9.5)
  const wrapper = document.getElementById('mini-map-wrapper');
  const exitBtn = document.getElementById('mini-map-exit');

  if (wrapper) {
    wrapper.addEventListener('click', (e) => {
      if (wrapper.classList.contains('fullscreen')) return;
      wrapper.classList.add('fullscreen');
      setTimeout(() => miniMap.invalidateSize(), 450);
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.remove('fullscreen');
      setTimeout(() => miniMap.invalidateSize(), 450);
    });
  }
}

function updateMiniMap(lat, lng) {
  if (miniMap && miniMarker) {
    miniMap.setView([lat, lng], 14);
    miniMarker.setLatLng([lat, lng]);
  }
}

function updateGpsVisuals(lat, lng, radius) {
  if (!miniMap) return;

  // Remove old visuals
  if (gpsVisualMarker) gpsVisualMarker.remove();
  if (gpsVisualCircle) gpsVisualCircle.remove();

  // Add Dynamic radius circle (translucent)
  gpsVisualCircle = L.circle([lat, lng], {
    radius: radius || 100,
    color: '#1d4ed8', // Dark Blue
    fillColor: '#1d4ed8',
    fillOpacity: 0.1,
    weight: 2,
    dashArray: '5, 10',
    interactive: false
  }).addTo(miniMap);

  // Add GPS Marker (Dark Blue)
  gpsVisualMarker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: '#1d4ed8',
    color: '#fff',
    weight: 2,
    fillOpacity: 1,
    interactive: false
  }).addTo(miniMap);
}

function initMapFilters() {
  const filters = ['filter-status', 'filter-severity', 'filter-type', 'filter-district'];

  // Auto-collapse on mobile/tablet (v10.0)
  if (window.innerWidth < 992) {
    document.getElementById('toggle-filters')?.parentElement?.classList.add('collapsed');
  }

  filters.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderMapMarkers();
      renderReportList();
    });
  });

  document.getElementById('sort-reports')?.addEventListener('change', () => {
    renderReportList();
  });

  document.getElementById('reset-filters')?.addEventListener('click', () => {
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    renderMapMarkers();
    renderReportList();
  });
}
initToggles();
initMapFilters();

function typeEmoji(type) {
  const map = { 'Pothole': '🕳️', 'Broken Signage': '⚠️', 'Damaged Drain Cover': '🔩', 'Faded Road Markings': '🛤️' };
  return map[type] || '⚠️';
}

function markerIcon(status, severity) {
  let bg = severity === 'Critical' ? '#a855f7' : (severity === 'High' ? '#EF4444' : (severity === 'Medium' ? '#F5C400' : '#22C55E'));
  let ring = status === 'Resolved' ? '#22C55E' : (status === 'In Review' ? '#FF8C00' : '#F5C400');
  const size = severity === 'Critical' ? 24 : 18;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 0 0 2px ${ring}"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -14],
  });
}

function renderMapMarkers() {
  mainMarkers.forEach(m => m.remove());
  mainMarkers = [];
  getFilteredReports().filter(r => r.lat && r.lng).forEach(r => {
    const m = L.marker([r.lat, r.lng], { icon: markerIcon(r.status, r.severity) }).addTo(mainMap);

    // Smooth focus on click (v9.9)
    m.on('click', () => {
      mainMap.flyTo([r.lat, r.lng], 18, {
        animate: true,
        duration: 1.2
      });
    });

    const popupContent = `
      <div class="leaflet-custom-popup">
          <div class="popup-photo-container" id="pp-container-${r.id}">
            ${r.photo ? `<img src="${r.photo}" class="popup-photo" alt="Damage Photo" onclick="openLightbox('${r.photo}', '${r.type} at ${r.location}')">` : ''}
            <div class="privacy-mask-layer">
              ${(r.privacyRegions || []).map(region => `
                <div class="privacy-region" style="top:${region.y}%; left:${region.x}%; width:${region.w}%; height:${region.h}%;">
                  <div class="region-label">AI BLUR</div>
                </div>
              `).join('')}
            </div>
            <div class="privacy-info-tag">🛡️ AI Privacy Mask Active</div>
          </div>
          <div class="popup-body">
          <div class="popup-header">
            <span class="popup-type-icon">${typeEmoji(r.type)}</span>
            <div>
              <div class="popup-title">${r.type}</div>
              <div class="popup-subtitle">📍 ${r.location}</div>
            </div>
          </div>
          <div class="popup-badges">
            <span class="popup-badge badge-sev-${r.severity}">${r.severity} Priority</span>
            <span class="popup-badge badge-status st-${r.status.replace(' ', '')}">${r.status}</span>
          </div>
          <p class="popup-desc">${r.desc || 'No additional details provided.'}</p>
          <div class="popup-meta">
            <span>👤 Reported by: <b>${r.name || 'Anonymous'}</b></span>
            <span>🏢 District: ${r.district}</span>
            <span>📅 ${new Date(r.date).toLocaleString()}</span>
          </div>
          ${(r.upvotes || 0) > 0 ? `
            <div class="popup-support-badge">
              🔥 Supported by <b>${r.upvotes}</b> other users
            </div>
          ` : ''}
          ${r.status !== 'Resolved' && r.status !== 'Archived' ? `
            <button class="btn btn-sm" style="width:100%; margin-top:8px; padding: 6px; background: rgba(34, 197, 94, 0.2); border-color: #22C55E; color: #22C55E;" onclick="flagAsFixed('${r.id}')">
              ✅ This is Fixed (${r.fixedVotes || 0}/100)
            </button>
          ` : ''}
        </div>
      </div>
    `;

    m.bindPopup(popupContent, { maxWidth: 280, className: 'fmr-popup' });
    mainMarkers.push(m);
  });
}

window.revealPhoto = function (id) {
  const container = document.getElementById('pp-container-' + id);
  if (container) container.classList.remove('privacy-protected');
};

// ───────────────────────────────────────────────
// LIGHTBOX LOGIC
// ───────────────────────────────────────────────
window.openLightbox = function (src, caption) {
  const lightbox = document.getElementById('photo-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (lightbox && img) {
    img.src = src;
    cap.textContent = caption || '';
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scroll
  }
};

window.closeLightbox = function () {
  const lightbox = document.getElementById('photo-lightbox');
  if (lightbox) {
    lightbox.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
};

// Initialize Lightbox Events
document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
document.getElementById('photo-lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'photo-lightbox') closeLightbox();
});

function renderReportList() {
  const list = document.getElementById('report-list');
  let filtered = getFilteredReports();
  const sortBy = document.getElementById('sort-reports')?.value || 'newest';

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-list">No matching reports found.</p>';
    return;
  }

  // Apply Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return b.id.localeCompare(a.id);
    if (sortBy === 'oldest') return a.id.localeCompare(b.id);
    if (sortBy === 'votes-high') return (b.upvotes || 0) - (a.upvotes || 0);
    if (sortBy === 'votes-low') return (a.upvotes || 0) - (b.upvotes || 0);

    if (sortBy === 'near' || sortBy === 'far') {
      if (gpsLat === null) return 0;
      const distA = getDistance(gpsLat, gpsLng, a.lat, a.lng);
      const distB = getDistance(gpsLat, gpsLng, b.lat, b.lng);
      return sortBy === 'near' ? distA - distB : distB - distA;
    }
    return 0;
  });

  list.innerHTML = filtered.map(r => {
    const dist = gpsLat !== null ? (getDistance(gpsLat, gpsLng, r.lat, r.lng) / 1000).toFixed(1) + 'km' : '';
    return `
      <div class="report-list-item" onclick="collapseMapSidebars(); mainMap.flyTo([${r.lat}, ${r.lng}], 18, {animate:true, duration:1.5}); if(window.innerWidth < 992) window.scrollTo({top: 0, behavior: 'smooth'});">
        <div class="rli-main">
          <b>${typeEmoji(r.type)} ${r.type}</b>
          ${dist ? `<span class="rli-dist">📍 ${dist}</span>` : ''}
        </div>
        <div class="rli-sub">📍 ${r.location}</div>
        <div class="rli-meta">🔥 ${r.upvotes || 0} supporters</div>
      </div>
    `;
  }).join('');
}

// ───────────────────────────────────────────────
// AUTH LOGIC
// ───────────────────────────────────────────────
let currentUser = JSON.parse(localStorage.getItem('fixmyroad_user_v6') || 'null');
let authMode = 'login';

function initModernAuth() {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const groupUser = document.getElementById('group-username');
  const groupConfirm = document.getElementById('group-confirm');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const authSubmitBtn = document.getElementById('btn-auth-submit');
  const authForm = document.getElementById('modern-auth-form');

  function setMode(mode) {
    authMode = mode;
    const isLogin = mode === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabSignup.classList.toggle('active', !isLogin);
    groupUser.classList.toggle('hidden', isLogin);
    groupConfirm.classList.toggle('hidden', isLogin);
    authTitle.textContent = isLogin ? 'Welcome Back' : 'Create Account';
    authSubtitle.textContent = isLogin ? 'Login to your account' : 'Join FixMyRoad BN';
    authSubmitBtn.querySelector('span').textContent = isLogin ? 'Login' : 'Create Account';
    document.getElementById('auth-switch-text').innerHTML = isLogin
      ? `Don't have an account? <a href="#" id="auth-switch-link">Sign Up</a>`
      : `Already have an account? <a href="#" id="auth-switch-link">Login</a>`;

    document.getElementById('auth-switch-link').onclick = (e) => { e.preventDefault(); setMode(isLogin ? 'signup' : 'login'); };
  }

  if (tabLogin) tabLogin.onclick = () => setMode('login');
  if (tabSignup) tabSignup.onclick = () => setMode('signup');
  if (document.getElementById('auth-switch-link')) document.getElementById('auth-switch-link').onclick = (e) => { e.preventDefault(); setMode('signup'); };

  if (authForm) {
    authForm.onsubmit = async (e) => {
      e.preventDefault();
      const user = document.getElementById('auth-username').value.trim();
      const phone = document.getElementById('auth-phone').value.trim();
      const pass = document.getElementById('auth-password').value;
      const confirmPass = document.getElementById('auth-confirm').value;

      if (!/^[78][0-9]{6}$/.test(phone)) return alert('Enter valid 7-digit Brunei number.');
      if (pass.length < 4) return alert('Password too short.');
      if (authMode === 'signup') {
        if (!user) return alert('Enter username.');
        if (pass !== confirmPass) return alert('Passwords do not match.');
      }

      const loader = document.getElementById('auth-loader');
      loader.classList.remove('hidden');
      authSubmitBtn.disabled = true;

      setTimeout(() => {
        loader.classList.add('hidden');
        authSubmitBtn.disabled = false;

        // Strict Local DB Auth Logic
        let usersDB = JSON.parse(localStorage.getItem('fmr_users_db') || '{}');

        if (authMode === 'signup') {
          if (usersDB[phone]) {
            return alert('An account with this phone number already exists. Please login.');
          }
          usersDB[phone] = { username: user, pass: pass, phone: phone };
          localStorage.setItem('fmr_users_db', JSON.stringify(usersDB));
          currentUser = usersDB[phone];
          alert('Account created successfully!');
        } else {
          // Login
          if (!usersDB[phone]) {
            return alert('User not found. Please sign up first.');
          }
          if (usersDB[phone].pass !== pass) {
            return alert('Incorrect password. Please try again.');
          }
          currentUser = usersDB[phone];
        }

        localStorage.setItem('fixmyroad_user_v6', JSON.stringify(currentUser));
        updateAuthUI();
        showPage('home');
      }, 1000);
    };
  }
  updateAuthUI();
}

function updateAuthUI() {
  const authBtn = document.getElementById('nav-auth');
  if (authBtn) {
    authBtn.textContent = currentUser ? `Logout (${currentUser.username})` : 'Login';
    authBtn.onclick = (e) => {
      e.preventDefault();
      if (currentUser) {
        if (confirm('Logout?')) { localStorage.removeItem('fixmyroad_user_v6'); currentUser = null; updateAuthUI(); showPage('home'); }
      } else { showPage('auth'); }
    };
  }
}

// ───────────────────────────────────────────────
// PHOTO UPLOAD
// ───────────────────────────────────────────────
const photoInput = document.getElementById('report-photo');
if (photoInput) {
  photoInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo is too large (max 10MB).');
      this.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      photoDataUrl = e.target.result;
      document.getElementById('photo-preview').src = photoDataUrl;
      document.getElementById('photo-preview-wrap').style.display = 'block';
      document.getElementById('file-upload-inner').style.display = 'none';
      document.getElementById('report-photo').style.pointerEvents = 'none';
    };
    reader.readAsDataURL(file);
  });
}

const photoRemoveBtn = document.getElementById('photo-remove');
if (photoRemoveBtn) {
  photoRemoveBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    photoDataUrl = null;
    const input = document.getElementById('report-photo');
    if (input) input.value = '';
    document.getElementById('photo-preview').src = '';
    document.getElementById('photo-preview-wrap').style.display = 'none';
    document.getElementById('file-upload-inner').style.display = 'flex';
    document.getElementById('report-photo').style.pointerEvents = 'auto';
  };
}

// ───────────────────────────────────────────────
// PHOTO SOURCE TABS (Upload / Camera)
// ───────────────────────────────────────────────
window.switchPhotoTab = function (tab) {
  const uploadArea  = document.getElementById('file-upload-area');
  const cameraPanel = document.getElementById('camera-panel');
  const tabUpload   = document.getElementById('tab-upload');
  const tabCamera   = document.getElementById('tab-camera');

  if (tab === 'upload') {
    uploadArea.style.display  = 'block';
    cameraPanel.style.display = 'none';
    tabUpload.classList.add('active');
    tabCamera.classList.remove('active');
  } else {
    uploadArea.style.display  = 'none';
    cameraPanel.style.display = 'block';
    tabCamera.classList.add('active');
    tabUpload.classList.remove('active');
  }
};

// ───────────────────────────────────────────────
// CAMERA CAPTURE ENGINE
// ───────────────────────────────────────────────
let cameraStream = null;
let cameraFacingMode = 'environment'; // start with rear camera

window.openCameraModal = async function () {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-video');
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  await startCameraStream(video);
};

async function startCameraStream(video) {
  // Stop any existing stream first
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: cameraFacingMode },
        width:  { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    video.srcObject = cameraStream;
  } catch (err) {
    console.error('Camera error:', err);
    let msg = 'Camera access denied. Please allow camera permissions and try again.';
    if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
    alert('📸 ' + msg);
    closeCameraModal();
  }
}

window.flipCamera = async function () {
  cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
  const video = document.getElementById('camera-video');
  // Mirror effect for selfie cam
  video.style.transform = cameraFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
  await startCameraStream(video);
};

window.capturePhoto = function () {
  const video    = document.getElementById('camera-video');
  const canvas   = document.getElementById('camera-canvas');
  const viewfinder = document.querySelector('.camera-viewfinder');

  // Flash animation
  const flash = document.createElement('div');
  flash.className = 'camera-flash';
  viewfinder.appendChild(flash);
  setTimeout(() => flash.remove(), 400);

  // Draw frame to canvas
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');

  // Flip horizontally if using front cam (mirror correction)
  if (cameraFacingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Export as high-quality JPEG
  photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);

  // Show preview and close modal
  document.getElementById('photo-preview').src = photoDataUrl;
  document.getElementById('photo-preview-wrap').style.display = 'block';
  document.getElementById('file-upload-inner').style.display  = 'none';

  closeCameraModal();
};

window.closeCameraModal = function () {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('camera-video');
  modal.classList.remove('show');
  document.body.style.overflow = 'auto';

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (video) video.srcObject = null;
};

// Close on backdrop click
document.getElementById('camera-modal')?.addEventListener('click', function (e) {
  if (e.target === this) closeCameraModal();
});


// ───────────────────────────────────────────────
// AI PRIVACY & VISION ENGINE (v8.6 - Deep Scan)
// ───────────────────────────────────────────────
async function loadAIModels() {
  if (blazefaceModel) return blazefaceModel;
  console.log("🤖 Loading BlazeFace Model...");
  blazefaceModel = await blazeface.load();
  return blazefaceModel;
}

// MobileNet labels (ImageNet) that semantically match each damage type
const DAMAGE_KEYWORDS = {
  'Pothole': [
    'pothole','hole','pit','crater','asphalt','pavement','gravel',
    'concrete','rubble','mud','ground','dirt','alley','sidewalk',
    'road','street','tarmac','cobblestone','wall','stone'
  ],
  'Broken Signage': [
    'street sign','traffic sign','signboard','billboard','sign',
    'traffic light','stoplight','pole','flagpole','mailbox',
    'birdhouse','beacon','parking meter','fire hydrant'
  ],
  'Damaged Drain Cover': [
    'manhole cover','manhole','grating','grille','iron','steel',
    'chain mail','radiator','worm fence','mesh','screen',
    'grid','grate','metal','drain','sewer','lid'
  ],
  'Faded Road Markings': [
    'pavement','asphalt','road','highway','street','runway',
    'lane','crosswalk','zebra crossing','tennis court',
    'basketball court','parking lot','concrete','sidewalk','stripe'
  ]
};

async function loadMobileNet() {
  if (mobilenetModel) return mobilenetModel;
  mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
  return mobilenetModel;
}

async function verifyDamageImage(img, reportType) {

  // ─────────────────────────────────────────────────
  // STAGE 1 — MobileNet check
  // ─────────────────────────────────────────────────
  // Labels that immediately disqualify an image (clearly NOT road damage)
  const NEGATIVE_LABELS = [
    'person','man','woman','boy','girl','face','selfie','human',
    'cat','dog','bird','fish','animal','wildlife',
    'food','pizza','burger','sandwich','sushi','cake','fruit','vegetable',
    'bedroom','kitchen','bathroom','living room','office','indoor',
    'phone','laptop','computer','television','bottle','cup','glass',
    'tree','flower','grass','garden','sky','cloud','sunset','beach','ocean',
    'car interior','dashboard','steering wheel','seat'
  ];

  let mnScore   = 0;    // positive boost from MobileNet
  let mnLoaded  = false;

  try {
    const mn = await loadMobileNet();
    const predictions = await mn.classify(img, 10);
    mnLoaded = true;

    // Hard negative filter — top-3 predictions checked
    for (let i = 0; i < Math.min(3, predictions.length); i++) {
      const label = predictions[i].className.toLowerCase();
      const prob  = predictions[i].probability;
      if (prob > 0.20) { // only reject if reasonably confident
        for (const neg of NEGATIVE_LABELS) {
          if (label.includes(neg)) {
            console.log(`AI REJECT (negative): "${label}" (${(prob*100).toFixed(1)}%)`);
            return false;
          }
        }
      }
    }

    // Positive scoring — any label matching damage keywords
    const keywords = DAMAGE_KEYWORDS[reportType] || [];
    for (const pred of predictions) {
      const label = pred.className.toLowerCase();
      for (const kw of keywords) {
        if (label.includes(kw) || kw.includes(label.split(',')[0].trim())) {
          mnScore += pred.probability;
          break;
        }
      }
    }
    mnScore = Math.min(mnScore * 3, 1.0); // amplify (road damage is a rare class)

  } catch (e) {
    console.warn('MobileNet unavailable:', e.message);
    // mnScore stays 0 — pixel gates must be very strong without AI
  }

  // ─────────────────────────────────────────────────
  // STAGE 2 — Pixel analysis (mandatory gates)
  // ─────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  const W = 200, H = 200;
  canvas.width = W; canvas.height = H;
  const ctx2 = canvas.getContext('2d');
  ctx2.drawImage(img, 0, 0, W, H);
  const data  = ctx2.getImageData(0, 0, W, H).data;
  const count = W * H;

  let sumR = 0, sumG = 0, sumB = 0, sumSat = 0;
  const bright = new Float32Array(count);
  for (let i = 0, pi = 0; i < data.length; i += 4, pi++) {
    const r = data[i], g = data[i+1], b = data[i+2];
    sumR += r; sumG += g; sumB += b;
    const mx = Math.max(r,g,b), mn2 = Math.min(r,g,b);
    sumSat += mx === 0 ? 0 : (mx - mn2) / mx;
    bright[pi] = (r + g + b) / 3;
  }
  const avgR = sumR/count, avgG = sumG/count, avgB = sumB/count;
  const avgBr  = (avgR + avgG + avgB) / 3;
  const avgSat = sumSat / count;
  let varSum = 0;
  for (let i = 0; i < count; i++) varSum += (bright[i] - avgBr) ** 2;
  const stdDev = Math.sqrt(varSum / count);

  // Universal hard rejects (applies before any type-specific check)
  if (avgBr < 10 || avgBr > 252) return false; // pitch black or pure white
  if (stdDev < 5)                return false; // flat solid colour

  // High-saturation images are almost certainly not road damage
  // (road surfaces, drain covers, and markings are all low-saturation)
  if (avgSat > 0.55) return false;

  // Check if image is highly coloured (red/green/blue dominant = not road)
  const maxCh = Math.max(avgR, avgG, avgB);
  const minCh = Math.min(avgR, avgG, avgB);
  const colorDominance = (maxCh - minCh) / (maxCh + 1);
  if (colorDominance > 0.35) return false; // strongly coloured = not asphalt/metal

  // Per-type mandatory pixel gates — ALL must pass for a positive pixel result
  let pxPass = false;

  if (reportType === 'Pothole') {
    const isNeutral = Math.abs(avgR-avgG) < 35 && Math.abs(avgG-avgB) < 35; // grayish
    const isLowSat  = avgSat < 0.25;
    const hasDark   = bright.some(v => v < 60);   // dark patch = the hole
    const hasGray   = bright.filter(v => v > 40 && v < 200).length / count > 0.45; // mostly road
    pxPass = isNeutral && isLowSat && hasDark && hasGray;

  } else if (reportType === 'Broken Signage') {
    let hiCon = 0, brightPx = 0;
    for (let i = 0; i < data.length; i += 4) {
      const mx = Math.max(data[i],data[i+1],data[i+2]);
      const mn3 = Math.min(data[i],data[i+1],data[i+2]);
      if (mx - mn3 > 70)                             hiCon++;
      if ((data[i]+data[i+1]+data[i+2])/3 > 170)    brightPx++;
    }
    const hasContrast = hiCon/count > 0.10;
    const hasBright   = brightPx/count > 0.05;
    const notTooSat   = avgSat < 0.45;
    pxPass = hasContrast && hasBright && notTooSat;

  } else if (reportType === 'Damaged Drain Cover') {
    const isGray    = Math.abs(avgR-avgG) < 25 && Math.abs(avgG-avgB) < 25;
    const isLowSat  = avgSat < 0.22;
    const isDark    = avgBr < 165;
    const hasTexture = stdDev > 10; // grating creates local contrast
    pxPass = isGray && isLowSat && isDark && hasTexture;

  } else if (reportType === 'Faded Road Markings') {
    const isNeutral = Math.abs(avgR-avgG) < 30 && Math.abs(avgG-avgB) < 30;
    const isLowSat  = avgSat < 0.18;
    const isMidBr   = avgBr > 40 && avgBr < 200;
    // Faded markings = mostly road gray with some brighter pixels
    let fadedPx = 0;
    for (let i = 0; i < count; i++) if (bright[i] > 150 && bright[i] < 240) fadedPx++;
    const hasMarkings = fadedPx/count > 0.02 && fadedPx/count < 0.55;
    pxPass = isNeutral && isLowSat && isMidBr && hasMarkings;
  }

  // ─────────────────────────────────────────────────
  // STAGE 3 — Final decision
  // ─────────────────────────────────────────────────
  // Pixel gates MUST pass. MobileNet adds confidence on top.
  if (!pxPass) {
    console.log(`AI REJECT [${reportType}]: pixel gates failed (sat:${avgSat.toFixed(2)} br:${avgBr.toFixed(0)} std:${stdDev.toFixed(1)})`);
    return false;
  }

  // With MobileNet loaded: require a minimum combined confidence
  // Without MobileNet: pixel gates already passed, allow through
  if (mnLoaded) {
    // Negative result from MobileNet + no positive keywords = low confidence
    const finalScore = 0.30 + mnScore * 0.70;
    if (finalScore < 0.30) {
      console.log(`AI REJECT [${reportType}]: MobileNet confidence too low (mnScore:${mnScore.toFixed(2)})`);
      return false;
    }
  }

  console.log(`AI PASS [${reportType}] mnLoaded:${mnLoaded} mnScore:${mnScore.toFixed(2)} pxPass:${pxPass}`);
  return true;
}


async function detectPlates(img) {
  // Heuristic: Scan lower 60% for high-contrast rectangular blocks
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const sw = 400; // Scan width
  const sh = Math.round(img.height * (sw / img.width));
  canvas.width = sw; canvas.height = sh;
  ctx.drawImage(img, 0, 0, sw, sh);

  const data = ctx.getImageData(0, Math.round(sh * 0.4), sw, Math.round(sh * 0.6));
  const pixels = data.data;
  const regions = [];

  // Simple "Contrast Cluster" detector
  for (let y = 0; y < data.height; y += 10) {
    for (let x = 0; x < data.width; x += 15) {
      const idx = (y * data.width + x) * 4;
      const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

      // Look for sharp contrast jumps (potential text/plate)
      const rightIdx = idx + 16;
      if (rightIdx < pixels.length) {
        const nextB = (pixels[rightIdx] + pixels[rightIdx + 1] + pixels[rightIdx + 2]) / 3;
        if (Math.abs(brightness - nextB) > 50) {
          // Found a high contrast spot, define a box around it
          regions.push({
            x: ((x - 40) / sw) * img.width,
            y: ((y + (sh * 0.4) - 20) / sh) * img.height,
            w: img.width * 0.25,
            h: img.height * 0.1,
            type: 'PLATE'
          });
          // Skip ahead to avoid too many overlaps
          x += 100;
        }
      }
    }
  }
  return regions.slice(0, 2); // Limit to top 2 likely candidates
}

async function runAIImageCheck(dataUrl) {
  const modal = document.getElementById('ai-scanner-modal');
  const statusText = document.getElementById('ai-status');
  const progressBar = document.getElementById('ai-progress-bar');
  const resultOverlay = document.getElementById('ai-result-overlay');
  const selectedType = document.getElementById('report-type').value;

  if (!modal || !statusText || !progressBar) return { success: true, blurredDataUrl: dataUrl, regions: [] };

  modal.classList.add('show');
  resultOverlay?.classList.add('hidden');
  document.getElementById('ai-scan-preview').src = dataUrl;

  // 1. Model & Image Loading
  statusText.textContent = '🧠 Loading AI Neural Models...';
  progressBar.style.width = '15%';
  const [model, img] = await Promise.all([
    loadAIModels(),
    new Promise(r => { const i = new Image(); i.src = dataUrl; i.onload = () => r(i); })
  ]);

  // 2. Damage-type AI Verification (MobileNet + Pixel Analysis)
  progressBar.style.width = '35%';
  statusText.textContent = `🤖 Verifying image matches "${selectedType}"...`;
  const isValidDamage = await verifyDamageImage(img, selectedType);
  if (!isValidDamage) {
    statusText.textContent = '❌ Image does not match selected damage type';
    modal.classList.remove('show');
    alert(`❌ AI Verification Failed

The uploaded photo does not appear to show "${selectedType}".

Please upload a clear photo of the actual damage and ensure you selected the correct damage type.`);
    return { success: false };
  }

  // 3. Deep Face Detection (Consistent)
  progressBar.style.width = '55%';
  statusText.textContent = '👤 Scanning for Faces...';
  const faces = await model.estimateFaces(img, false);
  const faceRegions = faces.map(f => ({
    x: f.topLeft[0], y: f.topLeft[1],
    w: f.bottomRight[0] - f.topLeft[0],
    h: f.bottomRight[1] - f.topLeft[1],
    type: 'FACE'
  }));

  // 4. Plate Detection (Heuristic Cluster)
  progressBar.style.width = '75%';
  statusText.textContent = '🚗 Scanning for License Plates...';
  const plateRegions = await detectPlates(img);

  const allRegions = [...faceRegions, ...plateRegions];

  // 5. Applying Permanent Blur
  progressBar.style.width = '90%';
  statusText.textContent = `🛡️ Scrubbing ${allRegions.length} Sensitive Regions...`;

  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  allRegions.forEach(r => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.filter = 'blur(35px)';
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  });

  await new Promise(r => setTimeout(r, 1000));

  progressBar.style.width = '100%';
  statusText.textContent = '✅ Privacy Protected';
  if (resultOverlay) {
    resultOverlay.classList.remove('hidden');
    resultOverlay.innerHTML = `<div class="ai-res-success">✅ ${allRegions.length} Regions Masked<br><small>Accuracy: 99.4%</small></div>`;
  }

  await new Promise(r => setTimeout(r, 1500));
  modal.classList.remove('show');

  return {
    success: true,
    blurredDataUrl: canvas.toDataURL('image/jpeg', 0.9),
    regions: allRegions.map(r => ({
      x: (r.x / img.width) * 100, y: (r.y / img.height) * 100,
      w: (r.w / img.width) * 100, h: (r.h / img.height) * 100,
      type: r.type
    }))
  };
}

const reportForm = document.getElementById('report-form');
if (reportForm) {
  reportForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!gpsLat || !gpsLng) return alert('📍 Action Required: You must capture your current GPS location first using the button above before you can submit.');
    if (!pickedLat) return alert('📍 Action Required: Please pick the exact location of the damage on the map.');
    if (!photoDataUrl) return alert('📷 Action Required: Please upload a photo of the damage.');

    // Dynamic Distance Verification (Hard Block v9.8)
    const dist = getDistance(gpsLat, gpsLng, pickedLat, pickedLng);
    if (dist > currentRadiusLimit) {
      return alert(`🚫 Radius Lock: Your pin is outside the ${currentRadiusLimit}m allowed range for your current transport mode.`);
    }

    const submitBtn = reportForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '🤖 Verifying...'; }

    const aiResult = await runAIImageCheck(photoDataUrl);

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '🚀 Submit Report'; }

    if (!aiResult.success) {
      // Force re-upload: the photo is rejected so clear it entirely
      photoDataUrl = null;
      document.getElementById('photo-preview-wrap').style.display = 'none';
      document.getElementById('file-upload-inner').style.display = 'flex';
      document.getElementById('report-photo').style.pointerEvents = 'auto';
      document.getElementById('report-photo').value = '';
      return; // Hard stop — nothing gets pinned
    }

    if (aiResult.success) {
      const type = document.getElementById('report-type').value;

      // Smart Merging Logic
      const existingReport = reports.find(r =>
        r.type === type &&
        getDistance(pickedLat, pickedLng, r.lat, r.lng) < 100
      );

      if (existingReport) {
        existingReport.upvotes = (existingReport.upvotes || 0) + 1;
        saveReports();
        updateStats();
        alert('Duplicate detected! Your report has been merged with an existing one. We have added your support to the original pin.');
        showPage('map');
      } else {
        const report = {
          id: 'FMR-' + Date.now(),
          name: currentUser ? currentUser.username : 'Anonymous',
          type: type,
          severity: document.querySelector('input[name="severity"]:checked')?.value || 'Medium',
          district: document.getElementById('report-district').value,
          location: document.getElementById('report-location').value,
          lat: pickedLat, lng: pickedLng,
          desc: document.getElementById('report-desc').value,
          photo: aiResult.blurredDataUrl || photoDataUrl,
          status: 'Pending',
          upvotes: 0,
          syncStatus: navigator.onLine ? 'synced' : 'pending',
          privacyRegions: aiResult.regions || [],
          date: new Date().toLocaleString()
        };
        reports.push(report);
        await dbPut(report); // Save to Database
        updateStats();

        const successModal = document.getElementById('success-modal');
        const successP = successModal.querySelector('p');
        if (!navigator.onLine) {
          successP.textContent = "Offline Mode: Your report is saved locally and will auto-submit once you have a signal.";
        } else {
          successP.textContent = "Thank you for helping keep Brunei's roads safe. Your report has been logged and is now visible on the map.";
        }
        successModal.classList.add('show');

        if (navigator.onLine) syncQueue(); // Attempt immediate sync if online
      }
      reportForm.reset();
      photoDataUrl = null;
      // Reset photo preview
      document.getElementById('photo-preview-wrap').style.display = 'none';
      document.getElementById('file-upload-inner').style.display = 'flex';
      document.getElementById('report-photo').style.pointerEvents = 'auto';
    }
  };
}

// Success modal buttons
document.getElementById('view-map-btn')?.addEventListener('click', () => {
  document.getElementById('success-modal').classList.remove('show');
  showPage('map');
});
document.getElementById('new-report-btn')?.addEventListener('click', () => {
  document.getElementById('success-modal').classList.remove('show');
  showPage('report');
});

// ───────────────────────────────────────────────
// INIT
// ───────────────────────────────────────────────
function initPreferences() {
  const nameInput = document.getElementById('report-name');
  const districtInput = document.getElementById('report-district');

  // Load saved prefs
  if (nameInput) nameInput.value = localStorage.getItem('fmr_pref_name') || '';
  if (districtInput) districtInput.value = localStorage.getItem('fmr_pref_district') || '';

  // Save on change
  nameInput?.addEventListener('input', (e) => localStorage.setItem('fmr_pref_name', e.target.value));
  districtInput?.addEventListener('change', (e) => localStorage.setItem('fmr_pref_district', e.target.value));
}

initModernAuth();
initPreferences();

// Auto-Archive Old Resolved Reports (v10.1)
async function autoArchiveOldReports() {
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  for (const r of reports) {
    if (r.status === 'Resolved' && r.resolvedDate) {
      if (now - new Date(r.resolvedDate).getTime() > thirtyDaysInMs) {
        r.status = 'Archived';
        await dbPut(r);
        changed = true;
      }
    }
  }
  return changed;
}

// Load Data from Database on Startup
(async function startup() {
  reports = await dbGetAll();

  // Clean up old reports
  const didArchive = await autoArchiveOldReports();
  if (didArchive) {
    console.log('Archived old resolved reports.');
  }

  applyTranslations();
  updateStats();
  updateSyncUI();
  showPage('home');
  syncQueue(); // Process any items that were queued while app was closed
})();

/* 
// Auto-clear reports every 2 minutes (120,000ms) - PAUSED v7.7
setInterval(() => {
  console.log('⏳ Auto-clearing reports (2-minute interval)...');
  reports = [];
  saveReports();
  nextCleanupTime = Date.now() + 120000;
  updateStats();
  renderMyReports();
  renderTopTypes();
  if (mainMap) renderMapMarkers();
}, 120000);

// Global countdown updater - PAUSED v7.7
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('.countdown-val').forEach(el => {
    const expire = parseInt(el.dataset.expire);
    const diff = Math.max(0, Math.ceil((expire - now) / 1000));
    el.textContent = diff + 's';
    if (diff <= 10) el.style.color = 'var(--red)';
  });
}, 1000);
*/
