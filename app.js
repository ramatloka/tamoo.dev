// =========================================================================
// ENGINE BRIDGE UNTUK MENGHUBUNGKAN STATIC GITHUB PAGES KE WEB APP API (GS)
// =========================================================================
const google = {
  script: {
    get run() {
      const url = "https://script.google.com/macros/s/AKfycbwyf9RjqNIoxWqapa32v0X7dK8xEEW7QG6TVYDty8PakY47IdOiP_FAFXYo4xQTJWGE/exec";
      class Runner {
        constructor() { this._success = null; this._failure = null; }
        withSuccessHandler(cb) { this._success = cb; return this; }
        withFailureHandler(cb) { this._failure = cb; return this; }
        async _call(action, data = {}) {
          try {
            const response = await fetch(url, {
              redirect: "follow",
              method: "POST",
              headers: {
                "Content-Type": "text/plain;charset=utf-8",
              },
              body: JSON.stringify({ action, data })
            });
            const result = await response.json();
            if (result.status === "success") {
              if (this._success) this._success(result.data);
            } else {
              if (this._failure) this._failure(new Error(result.message));
              else Swal.fire("Error Backend", result.message, "error");
            }
          } catch (err) {
            if (this._failure) this._failure(err);
            else console.error(err);
          }
        }
        getFormInitData() { this._call('getFormInitData'); }
        getAppUrl() { if (this._success) this._success(window.location.origin + window.location.pathname); }
        saveAdminSettings(settings, conf, posterData) { this._call('saveAdminSettings', { settings, conf, posterData }); }
        simpanPendaftaran(formData) { this._call('simpanPendaftaran', { formData }); }
        tambahTamuManual(formData, kategoriTamu) { this._call('tambahTamuManual', { formData, kategoriTamu }); }
        simpanPendaftaranBulk(guestsData) { this._call('simpanPendaftaranBulk', { guestsData }); }
        toggleGuestKategori(primaryValue) { this._call('toggleGuestKategori', { primaryValue }); }
        toggleGuestKehadiran(qrData) { return this._call('toggleGuestKehadiran', { qrData }); }
        getGuestList() { this._call('getGuestList'); }
        processScan(qrData, forceRecord) { this._call('processScan', { qrData, forceRecord }); }
        processScanSouvenir(qrData, forceRecord) { this._call('processScanSouvenir', { qrData, forceRecord }); }
        getAttendanceStats() { this._call('getAttendanceStats'); }
        getSouvenirStats() { this._call('getSouvenirStats'); }
        updateJumlahTamu(qrData, newCount) { this._call('updateJumlahTamu', { qrData, newCount }); }
      }
      return new Runner();
    }
  }
};

// =========================================================================
// INITIALIZATION & CLIENT ROUTING
// =========================================================================
const urlParams = new URLSearchParams(window.location.search);
const MODE = urlParams.get('mode') || 'main';
const IS_PUBLIC_MODE = MODE === 'public';
const IS_TV_MODE = MODE === 'tv';

let currentQuestions = []; let fullGuestData = []; let filteredGuestData = []; let spreadsheetUrl = ""; let appWebAppUrl = ""; let greetingPrefix = "Bapak / Ibu"; let greetingSuffix = ""; let enableSoundSuccess = true; let enableSoundError = true; let dynamicSouvenirLabel = "SOUVENIR"; let isSouvenirPerPax = false; let currentPage = 1; const rowsPerPage = 10; let selectedGuestsForZip = new Set(); let currentUserRole = IS_PUBLIC_MODE ? "Public" : "";

window.onload = () => { 
    if (IS_TV_MODE) {
        document.body.classList.add('tv-mode');
        document.getElementById('layoutTv').style.display = 'block';
        initTvMode();
        return;
    }

    document.getElementById('layoutMain').style.display = 'flex';

    if (IS_PUBLIC_MODE) {
        const style = document.createElement('style');
        style.innerHTML = `
          .app-header { display: none !important; } .bottom-nav { display: none !important; } .btn-fullscreen { display: none !important; } .btn-logout { display: none !important; } .tv-action-btn { display: none !important; } .tab-badge { display: none !important; }
        `;
        document.head.appendChild(style);
    } else {
        let mc = document.querySelector('.main-card'); if(mc) mc.style.display = 'none';
        let fc = document.querySelector('.footer-container'); if(fc) fc.style.display = 'none';
        showLoginPopup();
    }
    loadForm();
    google.script.run.withSuccessHandler(url => { 
        appWebAppUrl = url; 
        let pubInput = document.getElementById('publicLinkDisplay'); if(pubInput) pubInput.value = url + "?mode=public";
    }).getAppUrl();
};

function initTvMode() {
    let tvDisplayTimeout;
    google.script.run.withSuccessHandler(data => {
      if(data) {
        applyAppTheme(data.appTheme || "classic_gold");
        document.getElementById('tvDisplayEventTitle').innerText = data.eventTitle || "GUEST BOOK"; document.getElementById('tvRunningText').innerText = data.announcement || "Selamat Datang";
        if (data.posterUrl && data.posterUrl.trim() !== "") { let posterEl = document.getElementById('tvPosterImage'); posterEl.src = data.posterUrl; posterEl.style.display = 'block'; setTimeout(() => { posterEl.style.opacity = '1'; }, 200); }
      }
    }).getFormInitData();

    window.addEventListener('storage', function(e) {
      if(e.key === 'guest_display_data' && e.newValue) {
        let guest = JSON.parse(e.newValue); let prefixText = guest.prefix ? `, ${guest.prefix}` : ""; let posterEl = document.getElementById('tvPosterImage');
        if(posterEl && posterEl.src) { posterEl.style.opacity = '0'; }
        document.getElementById('tvGreetingText').innerText = "Selamat Datang" + prefixText;
        let nameHtml = guest.nama;
        if (guest.suffix) { nameHtml += `<div style="font-family:'Montserrat', sans-serif; font-size:3rem; font-weight:600; color:var(--text-muted); text-transform:none; letter-spacing:2px; line-height:1.2; margin-top:10px;">${guest.suffix}</div>`; }
        if (guest.extraHtml) { nameHtml += `<div style="display:block; width:100%; margin-top:25px; padding-top:25px; border-top:2px dashed var(--border-color); text-align:center;">${guest.extraHtml}</div>`; }
        let badgeContainer = document.getElementById('tvBadgeContainer'); if(guest.kategori === 'VIP') { badgeContainer.innerHTML = `<div class="tv-badge-vip animate__animated animate__fadeInDown">Tamu VIP</div>`; } else { badgeContainer.innerHTML = ""; }
        let nameElement = document.getElementById('tvGuestName'); nameElement.innerHTML = nameHtml; nameElement.classList.remove('animate__animated', 'animate__zoomIn'); void nameElement.offsetWidth; nameElement.classList.add('animate__animated', 'animate__zoomIn');
        clearTimeout(tvDisplayTimeout);
        tvDisplayTimeout = setTimeout(() => {
            document.getElementById('tvGuestName').innerHTML = `<span style="font-family:'Montserrat'; font-size:2rem; font-weight:600; color:var(--text-muted); letter-spacing:2px;">- MENUNGGU SCANNER -</span>`; document.getElementById('tvGreetingText').innerText = ""; document.getElementById('tvBadgeContainer').innerHTML = ""; if(posterEl && posterEl.src) { posterEl.style.opacity = '1'; }
        }, 12000);
      }
    });
}

// =========================================================================
// CORE LOGIC FUNCTIONS
// =========================================================================
function applyAppTheme(themeKey) {
  const APP_THEMES = {
    "classic_gold": { bg: "#fdfaf3", dark: "#846924", light: "#b39343", grad: "linear-gradient(to right, #cfaf57, #a9852c)", textMain: "#333333", textMuted: "#999999", cardBg: "#ffffff", border: "#f0e6d2" },
    "royal_navy": { bg: "#f0f4f8", dark: "#1a365d", light: "#3182ce", grad: "linear-gradient(to right, #4299e1, #2b6cb0)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "midnight": { bg: "#f7fafc", dark: "#1a202c", light: "#4a5568", grad: "linear-gradient(to right, #718096, #2d3748)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "emerald": { bg: "#f0fff4", dark: "#22543d", light: "#38a169", grad: "linear-gradient(to right, #48bb78, #276749)", textMain: "#22543d", textMuted: "#718096", cardBg: "#ffffff", border: "#c6f6d5" }
  };
  const t = APP_THEMES[themeKey] || APP_THEMES["classic_gold"];
  document.documentElement.style.setProperty('--bg-color', t.bg); document.documentElement.style.setProperty('--gold-dark', t.dark); document.documentElement.style.setProperty('--gold-light', t.light); document.documentElement.style.setProperty('--gold-gradient', t.grad); document.documentElement.style.setProperty('--text-main', t.textMain); document.documentElement.style.setProperty('--text-muted', t.textMuted); document.documentElement.style.setProperty('--card-bg', t.cardBg); document.documentElement.style.setProperty('--border-color', t.border);
}

function toggleFullScreen() {
  let btn = document.getElementById('btnFullscreenIcon');
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => {}); if(btn) btn.className = 'fas fa-compress'; } 
  else { if (document.exitFullscreen) { document.exitFullscreen(); if(btn) btn.className = 'fas fa-expand'; } }
}
document.addEventListener('fullscreenchange', () => { let btn = document.getElementById('btnFullscreenIcon'); if (!document.fullscreenElement && btn) { btn.className = 'fas fa-expand'; } });

function showLoginPopup() {
  Swal.fire({
    title: 'LOGIN SISTEM', html: '<input id="u" class="swal2-input" placeholder="Username" autocomplete="off"><input id="p" type="password" class="swal2-input" placeholder="Password">', confirmButtonText: 'Masuk', allowOutsideClick: false, allowEscapeKey: false, customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal', title: 'luxury-title' },
    preConfirm: () => { let u = document.getElementById('u'); let p = document.getElementById('p'); return [(u ? u.value : ""), (p ? p.value : "")]; }
  }).then((r) => { 
      // TAMBAHAN: Cegah error jika popup ditutup paksa oleh sistem bypass
      if (!r.isConfirmed || !r.value) return; 

      let u = r.value[0]; let p = r.value[1];
      if(u === 'Admin55' && p === 'QRCode') { currentUserRole = "Admin"; loginSuccess(); } 
      else if(u === 'Scan' && p === '1234') { currentUserRole = "Scanner"; loginSuccess(); } 
      else { Swal.fire({ title: 'Akses Ditolak', text: 'Username atau Password salah!', icon: 'error', allowOutsideClick: false, customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal' } }).then(() => showLoginPopup()); }
  });
}

function loginSuccess() {
    let mc = document.querySelector('.main-card'); if(mc) { mc.style.display = 'block'; mc.classList.add('animate__fadeInUp'); }
    let fc = document.querySelector('.footer-container'); if(fc) fc.style.display = 'flex';
    let btnOut = document.getElementById('btnLogoutBtn'); if(btnOut) btnOut.style.display = 'flex';
    if(currentUserRole === "Scanner") {
        let nR = document.getElementById('navRekap'); if(nR) nR.style.display = 'none';
        let nS = document.getElementById('navSetup'); if(nS) nS.style.display = 'none';
    }
    Swal.fire({ title: 'Berhasil Login', text: `Selamat datang, ${currentUserRole}!`, icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'luxury-popup', title: 'luxury-title' } });
}

function logoutSystem() {
    Swal.fire({ title: 'Keluar?', text: "Anda akan mengakhiri sesi keamanan ini.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Logout', cancelButtonText: 'Batal', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' }
    }).then((res) => {
        if (res.isConfirmed) {
            currentUserRole = ""; let mc = document.querySelector('.main-card'); if(mc) mc.style.display = 'none'; let fc = document.querySelector('.footer-container'); if(fc) fc.style.display = 'none'; let btnOut = document.getElementById('btnLogoutBtn'); if(btnOut) btnOut.style.display = 'none'; showLoginPopup();
        }
    });
}

function updateSouvenirLabelDOM(label) {
    let upper = label.toUpperCase(); document.querySelectorAll('.dyn-souvenir-text').forEach(el => el.innerText = upper);
    let filterSouv = document.getElementById('filterSouvenir'); if(filterSouv && filterSouv.options.length > 0) filterSouv.options[0].text = "Semua " + label;
    let navSouv = document.getElementById('navSouvenir'); if(navSouv) navSouv.title = "Mode " + label;
}

function updateRekapStats() {
    let totalTerdaftar = 0; fullGuestData.forEach(g => { totalTerdaftar += 1; });
    let totalHadir = fullGuestData.filter(g => g.status === 'Hadir').length;
    let totalSouvenir = 0;
    fullGuestData.forEach(g => { if (g.souvenir === 'Sudah Ambil') { totalSouvenir += (isSouvenirPerPax ? (parseInt(g.jumlahTamu) || 1) : 1); } });
    google.script.run.withSuccessHandler(serverData => {
        let liveHeadCount = serverData.currentRegistered || totalTerdaftar;
        let el1 = document.getElementById('rekapTotalTerdaftar'); if(el1) el1.innerText = liveHeadCount < 10 ? '0'+liveHeadCount : liveHeadCount;
    }).getFormInitData();
    let el2 = document.getElementById('rekapTotalHadir'); if(el2) el2.innerText = totalHadir < 10 ? '0'+totalHadir : totalHadir;
    let el3 = document.getElementById('rekapTotalSouvenir'); if(el3) el3.innerText = totalSouvenir < 10 ? '0'+totalSouvenir : totalSouvenir;
}

function showPolosPublicFormQR() {
    if(!appWebAppUrl) { Swal.fire('Error', 'Link publik belum siap. Harap muat ulang halaman.', 'error'); return; }
    let fullUrl = appWebAppUrl + "?mode=public";
    let qrServerUrl = "https://quickchart.io/qr?size=500&margin=1&text=" + encodeURIComponent(fullUrl);
    Swal.fire({
      title: 'QR CODE FORM PUBLIK (POLOS)',
      html: '<p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:15px;">QR Code murni tanpa hiasan/bingkai. Sangat cocok ditaruh di desain poster registrasi On-The-Spot.</p>' +
            '<img src="' + qrServerUrl + '" width="260" id="imgPolosQr" style="border: 1px solid var(--border-color); padding:10px; background:#fff; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">' +
            '<div><button onclick="downloadPolosQR(\'' + qrServerUrl + '\', \'' + fullUrl + '\')" class="btn-submit" style="width:auto; padding:12px 25px; border-radius:30px;"><i class="fas fa-download"></i> DOWNLOAD GAMBAR QR</button></div>',
      showConfirmButton: false, showCloseButton: true, customClass: { popup: 'luxury-popup', title: 'luxury-title' }
    });
}

function downloadPolosQR(qrUrl, fullUrl) {
    Swal.fire({ title: 'Mengunduh QR...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    fetch(qrUrl).then(res => { if(!res.ok) throw new Error("Network error"); return res.blob(); }).then(blob => {
        let objectUrl = URL.createObjectURL(blob); let a = document.createElement('a'); a.style.display = 'none'; a.href = objectUrl; a.download = 'QR_Pendaftaran_Polos.png'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(objectUrl); document.body.removeChild(a); Swal.close();
    }).catch(() => { Swal.close(); window.open(qrUrl, '_blank'); });
}

function toggleSelectAll(isChecked) {
    if (isChecked) { filteredGuestData.forEach(g => selectedGuestsForZip.add(g.qrString)); } else { selectedGuestsForZip.clear(); }
    renderRekapRows();
}

function toggleSelectGuest(qrString, isChecked) {
    if (isChecked) { selectedGuestsForZip.add(qrString); } else { selectedGuestsForZip.delete(qrString); }
    let chkAll = document.getElementById('chkSelectAll'); if (chkAll) { chkAll.checked = (selectedGuestsForZip.size === filteredGuestData.length && filteredGuestData.length > 0); }
}

function toggleAcc(id) {
    let el = document.getElementById(id); let icon = document.getElementById('icon_' + id);
    if (el.classList.contains('active')) { el.classList.remove('active'); icon.className = 'fas fa-chevron-down'; } 
    else { document.querySelectorAll('.acc-content').forEach(c => c.classList.remove('active')); document.querySelectorAll('.acc-header i').forEach(i => i.className = 'fas fa-chevron-down'); el.classList.add('active'); icon.className = 'fas fa-chevron-up'; }
}

function loadForm() {
  google.script.run.withSuccessHandler(data => {
      try {
        if(!data) throw new Error("Data dari server terputus.");
        let currentTheme = data.appTheme || "classic_gold"; applyAppTheme(currentTheme);
        let elTheme = document.getElementById('adminAppTheme'); if(elTheme) elTheme.value = currentTheme;
        currentQuestions = data.questions || []; spreadsheetUrl = data.spreadsheetUrl || ""; greetingPrefix = data.prefix || ""; greetingSuffix = data.suffix || "";
        
        let setVal = (id, val) => { let el = document.getElementById(id); if(el) el.value = val || ""; };
        let setText = (id, val) => { let el = document.getElementById(id); if(el) el.innerText = val || ""; };

        setVal('adminPrefix', data.prefix); setVal('adminSuffix', data.suffix);
        setText('displayEventTitle', data.eventTitle || "GUEST BOOK PRO"); setVal('adminEventTitle', data.eventTitle);
        setText('runningTextDisplay', data.announcement || "Selamat Datang"); setVal('adminAnnouncement', data.announcement);
        setVal('adminEventName', data.eventName); setVal('adminEventDate', data.eventDate); setVal('adminEventLocation', data.eventLocation); 
        setVal('adminPosterUrl', data.posterUrl); setVal('adminDetailUrl', data.detailUrl);
        enableSoundSuccess = data.soundSuccess !== "false"; enableSoundError = data.soundError !== "false";
        setVal('adminSoundSuccess', data.soundSuccess || "true"); setVal('adminSoundError', data.soundError || "true");
        dynamicSouvenirLabel = data.souvenirLabel || "SOUVENIR"; setVal('adminSouvenirLabel', dynamicSouvenirLabel); updateSouvenirLabelDOM(dynamicSouvenirLabel);
        isSouvenirPerPax = (data.souvenirPerPax === "true"); setVal('adminSouvenirPerPax', data.souvenirPerPax || "false");
        setVal('adminMaxQuota', data.maxQuota); setVal('adminFormStatus', data.formStatus || "BUKA"); setVal('adminWaTemplate', data.waTemplate); 
        // TAMBAHAN: Set nilai dropdown admin dari database
        setVal('adminRequireLogin', data.requireLogin || "true");

       // ==========================================
        // EKSEKUTOR BYPASS LOGIN (DENGAN BACKDOOR)
        // ==========================================
        const urlParams = new URLSearchParams(window.location.search);
        const forceLogin = urlParams.get('force') === 'login';

        if (!IS_PUBLIC_MODE && currentUserRole === "" && data.requireLogin === "false") {
            if (forceLogin) {
                console.log("Backdoor aktif: Menahan popup login untuk Admin.");
            } else {
                Swal.close(); 
                currentUserRole = "Scanner"; 
                loginSuccess(); 
            }
        }

        if (data.posterUrl && data.posterUrl.trim() !== "") { let preSt = document.getElementById('posterPreviewStatus'); if(preSt) preSt.style.display = 'block'; }

        if (data.formStatus === "TUTUP") {
            document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-lock" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">PENDAFTARAN DITUTUP</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, pendaftaran online untuk acara ini sudah resmi ditutup oleh panitia.</p></div>';
            let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
            let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
            document.getElementById('pubEventName').innerText = data.eventName || data.eventTitle; return;
        }

        let maxQ = parseInt(data.maxQuota) || 0; let curRegHead = parseInt(data.currentRegistered) || 0;
        if (maxQ > 0 && curRegHead >= maxQ) {
            document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">MOHON MAAF</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, kapasitas kuota penampung tamu untuk acara ini sudah terisi penuh.</p></div>';
            let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
            let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
            document.getElementById('pubEventName').innerText = data.eventName || data.eventTitle; return;
        }

        if (IS_PUBLIC_MODE) {
            document.getElementById('publicEventInfo').style.display = 'block'; document.getElementById('pubEventName').innerText = data.eventName || data.eventTitle;
            let dateLoc = []; if(data.eventDate) dateLoc.push(data.eventDate); if(data.eventLocation) dateLoc.push(data.eventLocation); document.getElementById('pubEventDateLoc').innerText = dateLoc.join("  |  ");
            if(data.detailUrl && data.detailUrl.trim() !== "") { let btnDetail = document.getElementById('pubDetailBtn'); let finalUrl = data.detailUrl.startsWith('http') ? data.detailUrl : 'https://' + data.detailUrl; btnDetail.href = finalUrl; btnDetail.style.display = 'inline-block'; }
        }
        renderGuestForm();
      } catch(e) { Swal.fire({ title: 'Error UI', text: e.message, icon: 'error' }); }
  }).withFailureHandler(err => {
      Swal.fire({ title: 'Koneksi Gagal', text: err.message, icon: 'error', confirmButtonText: 'Muat Ulang' }).then(() => { location.reload(); });
      document.getElementById('displayEventTitle').innerText = "SYSTEM ERROR";
      document.getElementById('dynamicFormContainer').innerHTML = "<div style='color:red; text-align:center; font-weight:bold;'>Gagal memuat database. Harap Refresh halaman.</div>";
  }).getFormInitData();
}

function copyPublicLink() {
    let copyText = document.getElementById("publicLinkDisplay");
    if(copyText && copyText.value) { 
        copyText.select(); copyText.setSelectionRange(0, 99999); 
        try {
            let successful = document.execCommand('copy');
            if(successful) { Swal.fire({ title: 'Disalin!', text: 'Link Publik berhasil disalin.', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'luxury-popup', title: 'luxury-title' } }); } else { throw new Error("Copy command failed"); }
        } catch(err) { Swal.fire('Gagal', 'Sistem browser menolak akses copy otomatis. Silakan blok link lalu Copy manual.', 'error'); }
        window.getSelection().removeAllRanges();
    }
}

function openTvWindow() { if(window.location.href) window.open(window.location.origin + window.location.pathname + "?mode=tv", "_blank"); }
function updateNavHighlight(activeId) { document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-icon')); let el = document.getElementById(activeId); if(el) el.classList.add('active-icon'); }

function goToHome() { 
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); document.getElementById('secTamu').classList.add('active'); document.getElementById('tickerWrapContainer').classList.remove('active-ticker'); updateNavHighlight('navHome'); let mainCard = document.querySelector('.main-card'); if(mainCard) mainCard.classList.remove('main-card-wide');
}

function activateTab(tab) {
  if(currentUserRole === "Scanner" && (tab === 'rekap' || tab === 'admin')) { Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat membuka halaman ini.', 'warning'); return; }
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  let targetSec = document.getElementById('sec' + tab.charAt(0).toUpperCase() + tab.slice(1)); if(targetSec) targetSec.classList.add('active');
  let mainCard = document.querySelector('.main-card'); if(mainCard) { if(tab === 'rekap') { mainCard.classList.add('main-card-wide'); } else { mainCard.classList.remove('main-card-wide'); } }
  let ticker = document.getElementById('tickerWrapContainer');
  if(tab === 'petugas') { 
      fetchTotalHadir(); updateNavHighlight('navScan'); if(ticker) ticker.classList.add('active-ticker'); setTimeout(() => { let scanInp = document.getElementById('usbScannerInput'); if(scanInp) scanInp.focus(); }, 500);
  } else if(tab === 'souvenir') {
      fetchSouvenirStats(); updateNavHighlight('navSouvenir'); if(ticker) ticker.classList.add('active-ticker'); setTimeout(() => { let scanInp = document.getElementById('usbScannerSouvenirInput'); if(scanInp) scanInp.focus(); }, 500); 
  } else { if(ticker) ticker.classList.remove('active-ticker'); }
  if(tab === 'rekap') { loadRekapData(); updateNavHighlight('navRekap'); }
  if(tab === 'admin') { renderAdminUI(); updateNavHighlight('navSetup'); }
}

function renderGuestForm() {
  let html = '';
  currentQuestions.forEach(q => {
    let isReq = q.required ? 'required' : ''; let reqLabel = q.required ? '<span style="color:red;">*</span>' : '';
    html += '<div class="form-group"><label>' + q.label + ' ' + reqLabel + '</label>';
    if(q.type === 'dropdown') { html += '<select id="field_' + q.id + '" ' + isReq + '><option value="">-- Pilih --</option>' + q.options.map(o => '<option value="' + o + '">' + o + '</option>').join('') + '</select>'; } 
    else if (q.type === 'radio') { q.options.forEach(o => { html += '<div style="margin-bottom:8px;"><input type="radio" name="field_' + q.id + '" value="' + o + '" ' + isReq + ' style="width:auto; display:inline-block; margin-right:8px;"> ' + o + '</div>'; }); } 
    else if (q.type === 'checkbox') { q.options.forEach(o => { html += '<div style="margin-bottom:8px;"><input type="checkbox" name="field_' + q.id + '" value="' + o + '" style="width:auto; display:inline-block; margin-right:8px;"> ' + o + '</div>'; }); } 
    else { html += '<input type="' + q.type + '" id="field_' + q.id + '" placeholder="..." ' + isReq + '>'; }
    html += '</div>';
  });
  document.getElementById('dynamicFormContainer').innerHTML = html;
}

function confirmTamu() {
  if(currentQuestions.length === 0) return;
  let isValid = true; let firstInvalidField = null;
  currentQuestions.forEach(q => {
      if (q.required) {
          let isFieldFilled = false;
          if (q.type === 'radio') { let el = document.querySelector('input[name="field_' + q.id + '"]:checked'); if (el && el.value !== "") isFieldFilled = true; } 
          else if (q.type === 'checkbox') { let els = document.querySelectorAll('input[name="field_' + q.id + '"]:checked'); if (els && els.length > 0) isFieldFilled = true; } 
          else { let field = document.getElementById('field_' + q.id); if (field && field.value.trim() !== "") isFieldFilled = true; }
          if (!isFieldFilled) { isValid = false; if (!firstInvalidField) { if (q.type === 'radio' || q.type === 'checkbox') { firstInvalidField = document.querySelector('input[name="field_' + q.id + '"]'); } else { firstInvalidField = document.getElementById('field_' + q.id); } } }
      }
  });
  if (!isValid) { Swal.fire({ title: 'Data Belum Lengkap!', text: 'Mohon isi semua pertanyaan yang wajib diisi (bertanda bintang merah *).', icon: 'warning', customClass: { popup: 'luxury-popup' } }); if (firstInvalidField) firstInvalidField.focus(); return; }

  Swal.fire({ title: 'Konfirmasi', text: 'Simpan pendaftaran Anda?', showCancelButton: true, confirmButtonText: 'Ya', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' } }).then(r => {
    if(r.isConfirmed) {
      let data = {};
      currentQuestions.forEach(q => { 
          if(q.type === 'radio') { let el = document.querySelector('input[name="field_' + q.id + '"]:checked'); data[q.id] = el ? el.value : ""; } 
          else if(q.type === 'checkbox') { let els = document.querySelectorAll('input[name="field_' + q.id + '"]:checked'); let vals = Array.from(els).map(e => e.value); data[q.id] = vals.join(", "); } 
          else { let field = document.getElementById('field_' + q.id); data[q.id] = field ? field.value : ""; }
      });
      Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      google.script.run.withSuccessHandler((res) => { 
          if(res.status === 'success') {
              // Tangkap nama tamu dari form pertama
              let namaTamu = data[currentQuestions[0].id] || "Tamu";
              showQrPopup(namaTamu, res.qrId);
              
              if (IS_PUBLIC_MODE) {
                  // --- SKENARIO PUBLIK: KUNCI FORM & MUNCULKAN PESAN ---
                  // 1. Sembunyikan Form dan Tombol Submit
                  document.getElementById('dynamicFormContainer').style.display = 'none';
                  document.getElementById('btnSubmitForm').style.display = 'none';
                  
                  // 2. Masukkan Nama dan Detail Acara ke Pesan Sukses
                  document.getElementById('teksNamaTamu').innerText = namaTamu;
                  let eventName = document.getElementById('pubEventName').innerText;
                  let eventDateLoc = document.getElementById('pubEventDateLoc').innerText;
                  document.getElementById('teksEventSukses').innerHTML = eventName + "<br>" + eventDateLoc;
                  
                  // 3. Tampilkan Kotak Pesan Sukses
                  document.getElementById('pesanSuksesPublik').style.display = 'block';
              } else {
                  // --- SKENARIO PETUGAS: KOSONGKAN FORM (Siap input lagi) ---
                  currentQuestions.forEach(q => { 
                      if(q.type === 'radio' || q.type === 'checkbox') { 
                          let els = document.querySelectorAll('input[name="field_' + q.id + '"]'); 
                          els.forEach(e => e.checked = false); 
                      } else { 
                          let field = document.getElementById('field_' + q.id); 
                          if (field) field.value = ''; 
                      } 
                  });
              }
          } else { 
              Swal.fire('Gagal', res.message, 'error').then(() => loadForm()); 
          }
      }).withFailureHandler(err => { Swal.fire({title: 'Error', text: err.message, icon: 'error'}); }).simpanPendaftaran(data);
    }
  });
}

function showQrPopup(nama, qrStr) {
  let qrUrl = "https://quickchart.io/qr?size=500&margin=1&text=" + encodeURIComponent(qrStr);
  let safeName = nama.replace(/'/g, "\\'").replace(/"/g, '"'); 
  Swal.fire({
    title: 'QR CODE ANDA',
    html: '<div style="font-family:\'Playfair Display\', serif; color:var(--gold-dark); font-weight:900; font-size:2rem; line-height:1.1; margin-top:5px; margin-bottom:15px; text-transform:uppercase;">' + nama + '</div>' +
          '<img src="' + qrUrl + '" width="200" style="border-radius:12px; margin-bottom:5px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">' +
          '<div style="margin-top: 15px;"><button onclick="downloadDigitalTicket(\'' + qrUrl + '\', \'' + safeName + '\')" style="background: var(--gold-gradient); color: #ffffff; border: none; padding: 12px 25px; border-radius: 30px; font-family: \'Montserrat\', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.15); transition: transform 0.2s;"><i class="fas fa-download"></i>  DOWNLOAD E-TICKET</button></div>',
    showConfirmButton: false, showCloseButton: true, customClass: { popup: 'luxury-popup', title: 'luxury-title' }
  });
}

// =========================================
// VARIABEL PALET WARNA TIKET (GLOBAL)
// =========================================
const APP_THEMES_LOCAL = {
    "classic_gold": { bg: "#fdfaf3", dark: "#846924", light: "#b39343", grad: "linear-gradient(to right, #cfaf57, #a9852c)", textMain: "#333333", textMuted: "#999999", cardBg: "#ffffff", border: "#f0e6d2" },
    "royal_navy": { bg: "#f0f4f8", dark: "#1a365d", light: "#3182ce", grad: "linear-gradient(to right, #4299e1, #2b6cb0)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "midnight": { bg: "#f7fafc", dark: "#1a202c", light: "#4a5568", grad: "linear-gradient(to right, #718096, #2d3748)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "emerald": { bg: "#f0fff4", dark: "#22543d", light: "#38a169", grad: "linear-gradient(to right, #48bb78, #276749)", textMain: "#22543d", textMuted: "#718096", cardBg: "#ffffff", border: "#c6f6d5" }
};

function downloadDigitalTicket(qrUrl, guestName) {
  Swal.fire({ title: 'Menyiapkan Tiket...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  let activeThemeKey = document.getElementById('adminAppTheme') ? document.getElementById('adminAppTheme').value : "classic_gold";
  let tColor = APP_THEMES_LOCAL[activeThemeKey] || APP_THEMES_LOCAL["classic_gold"];
  let elName = document.getElementById('adminEventName'); let elDate = document.getElementById('adminEventDate'); let elLoc = document.getElementById('adminEventLocation'); let elTitle = document.getElementById('adminEventTitle');
  let eventName = (elName && elName.value) ? elName.value : (elTitle && elTitle.value ? elTitle.value : "EVENT TICKET");
  let eventDate = (elDate && elDate.value) ? elDate.value : ""; let eventLoc = (elLoc && elLoc.value) ? elLoc.value : "";
  let dateLocText = ""; if (eventDate && eventLoc) dateLocText = eventDate + "  |  " + eventLoc; else if (eventDate) dateLocText = eventDate; else if (eventLoc) dateLocText = eventLoc;
  
  const img = new Image();
  img.crossOrigin = "Anonymous"; 
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 500; canvas.height = 700; ctx.fillStyle = tColor.cardBg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = tColor.border; ctx.lineWidth = 8; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60); ctx.fillStyle = tColor.dark; ctx.textAlign = "center"; let titleFontSize = 32; 
      ctx.font = "bold " + titleFontSize + "px sans-serif";
      while (ctx.measureText(eventName.toUpperCase()).width > canvas.width - 80 && titleFontSize > 14) { titleFontSize -= 2; ctx.font = "bold " + titleFontSize + "px sans-serif"; }
      ctx.fillText(eventName.toUpperCase(), canvas.width / 2, 90); ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 120, 110); ctx.lineTo(canvas.width / 2 + 120, 110); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.stroke();
      if(dateLocText) { ctx.fillStyle = tColor.textMuted; ctx.font = "bold 13px sans-serif"; ctx.fillText(dateLocText.toUpperCase(), canvas.width / 2, 140); }
      ctx.fillStyle = tColor.textMuted; ctx.font = "bold 16px sans-serif"; ctx.fillText("E - T I C K E T   P A S S", canvas.width / 2, 175); ctx.fillStyle = tColor.textMain; let nameFontSize = 28; ctx.font = "bold " + nameFontSize + "px sans-serif";
      while (ctx.measureText(guestName.toUpperCase()).width > canvas.width - 100 && nameFontSize > 14) { nameFontSize -= 2; ctx.font = "bold " + nameFontSize + "px sans-serif"; }
      ctx.fillText(guestName.toUpperCase(), canvas.width / 2, 220); ctx.fillStyle = tColor.bg; ctx.fillRect(115, 255, 270, 270); ctx.drawImage(img, 125, 265, 250, 250); ctx.fillStyle = tColor.textMuted; ctx.font = "600 14px sans-serif"; ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 580); ctx.fillStyle = tColor.light; ctx.font = "bold 18px sans-serif"; ctx.fillText("R A M A T L O K A", canvas.width / 2, 630);
      
      const a = document.createElement('a'); a.style.display = 'none'; a.href = canvas.toDataURL('image/png'); let safeNameForFile = guestName.replace(/[^a-z0-9]/gi, '_').toLowerCase(); a.download = 'Tiket_' + safeNameForFile + '.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); Swal.close(); 
    } catch(err) { Swal.close(); window.open(qrUrl, '_blank'); }
  };
  img.onerror = () => { Swal.close(); window.open(qrUrl, '_blank'); };
  img.src = qrUrl;
}

function printDigitalTicket(qrUrl, guestName) {
  Swal.fire({ title: 'Menyiapkan Cetakan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  let activeThemeKey = document.getElementById('adminAppTheme') ? document.getElementById('adminAppTheme').value : "classic_gold";
  let tColor = APP_THEMES_LOCAL[activeThemeKey] || APP_THEMES_LOCAL["classic_gold"];
  let elName = document.getElementById('adminEventName'); let elDate = document.getElementById('adminEventDate'); let elLoc = document.getElementById('adminEventLocation'); let elTitle = document.getElementById('adminEventTitle');
  let eventName = (elName && elName.value) ? elName.value : (elTitle && elTitle.value ? elTitle.value : "EVENT TICKET");
  let eventDate = (elDate && elDate.value) ? elDate.value : ""; let eventLoc = (elLoc && elLoc.value) ? elLoc.value : "";
  let dateLocText = ""; if (eventDate && eventLoc) dateLocText = eventDate + "  |  " + eventLoc; else if (eventDate) dateLocText = eventDate; else if (eventLoc) dateLocText = eventLoc;
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 500; canvas.height = 700; ctx.fillStyle = tColor.cardBg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = tColor.border; ctx.lineWidth = 8; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60); ctx.fillStyle = tColor.dark; ctx.textAlign = "center"; let titleFontSize = 32; 
      ctx.font = "bold " + titleFontSize + "px sans-serif";
      while (ctx.measureText(eventName.toUpperCase()).width > canvas.width - 80 && titleFontSize > 14) { titleFontSize -= 2; ctx.font = "bold " + titleFontSize + "px sans-serif"; }
      ctx.fillText(eventName.toUpperCase(), canvas.width / 2, 90); ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 120, 110); ctx.lineTo(canvas.width / 2 + 120, 110); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.stroke();
      if(dateLocText) { ctx.fillStyle = tColor.textMuted; ctx.font = "bold 13px sans-serif"; ctx.fillText(dateLocText.toUpperCase(), canvas.width / 2, 140); }
      ctx.fillStyle = tColor.textMuted; ctx.font = "bold 16px sans-serif"; ctx.fillText("E - T I C K E T   P A S S", canvas.width / 2, 175); ctx.fillStyle = tColor.textMain; let nameFontSize = 28; ctx.font = "bold " + nameFontSize + "px sans-serif";
      while (ctx.measureText(guestName.toUpperCase()).width > canvas.width - 100 && nameFontSize > 14) { nameFontSize -= 2; ctx.font = "bold " + nameFontSize + "px sans-serif"; }
      ctx.fillText(guestName.toUpperCase(), canvas.width / 2, 220); ctx.fillStyle = tColor.bg; ctx.fillRect(115, 255, 270, 270); ctx.drawImage(img, 125, 265, 250, 250); ctx.fillStyle = tColor.textMuted; ctx.font = "600 14px sans-serif"; ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 580); ctx.fillStyle = tColor.light; ctx.font = "bold 18px sans-serif"; ctx.fillText("R A M A T L O K A", canvas.width / 2, 630);
      
      const dataUrl = canvas.toDataURL('image/png'); const printWindow = window.open('', '_blank'); printWindow.document.write('<html><head><title>Print - ' + guestName + '</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:100%;height:auto;display:block;}@page{size:auto;margin:0mm;}</style></head><body><img src="' + dataUrl + '" onload="setTimeout(function(){window.print();window.close();},500);"/></body></html>'); printWindow.document.close(); Swal.close(); 
    } catch(err) { Swal.close(); window.open(qrUrl, '_blank'); }
  };
  img.onerror = () => { Swal.close(); window.open(qrUrl, '_blank'); };
  img.src = qrUrl;
}

function openSpreadsheetDatabase() { 
  if (spreadsheetUrl) { Swal.fire({ title: 'Peringatan Keamanan', text: 'Anda akan mengakses database utama Google Sheets. Harap berhati-hati saat mengubah struktur kolom atau data di dalamnya. Lanjutkan?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Buka Database', cancelButtonText: 'Batal', customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' } }).then((result) => { if (result.isConfirmed) { window.open(spreadsheetUrl, '_blank'); } }); } else { Swal.fire('Info', 'Link Spreadsheet tidak ditemukan.', 'info'); }
}

function loadRekapData() { google.script.run.withSuccessHandler(data => { fullGuestData = data.list; updateRekapStats(); applyFilters(); }).getGuestList(); }

function applyFilters() {
    let searchQ = document.getElementById('searchRekapInput') ? document.getElementById('searchRekapInput').value.toLowerCase() : ""; let catFilter = document.getElementById('filterKategori') ? document.getElementById('filterKategori').value : "ALL"; let statFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : "ALL"; let souvFilter = document.getElementById('filterSouvenir') ? document.getElementById('filterSouvenir').value : "ALL";
    filteredGuestData = fullGuestData.filter(g => {
        let matchSearch = g.primaryValue.toLowerCase().includes(searchQ); let matchCat = (catFilter === "ALL" || g.kategori === catFilter); let matchStat = (statFilter === "ALL" || g.status === statFilter); let matchSouv = (souvFilter === "ALL" || g.souvenir === souvFilter); return matchSearch && matchCat && matchStat && matchSouv;
    });
    selectedGuestsForZip.clear(); let chkAll = document.getElementById('chkSelectAll'); if(chkAll) chkAll.checked = false; currentPage = 1; renderRekapRows();
}

function renderRekapRows() {
  let tb = document.getElementById('rekapTableBody'); let pc = document.getElementById('paginationControls'); let pcTop = document.getElementById('paginationControlsTop'); let html = '';
  if(filteredGuestData.length === 0) { html = '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding: 25px;">Tidak ada data ditemukan...</td></tr>'; if(tb) tb.innerHTML = html; if(pc) pc.innerHTML = ''; if(pcTop) pcTop.innerHTML = ''; return; }
  let totalPages = Math.ceil(filteredGuestData.length / rowsPerPage); if(currentPage < 1) currentPage = 1; if(currentPage > totalPages) currentPage = totalPages; let startIndex = (currentPage - 1) * rowsPerPage; let endIndex = startIndex + rowsPerPage; let currentView = filteredGuestData.slice(startIndex, endIndex);
  currentView.forEach(g => {
    let badgKategori = g.kategori === 'VIP' ? 'badge-vip' : 'badge-reg'; let badgStatus = g.status === 'Hadir' ? 'badge-hadir' : 'badge-belum'; let badgSouv = g.souvenir === 'Sudah Ambil' ? 'badge-souv-sudah' : 'badge-souv-belum'; let nameForPrint = g.primaryValue + (g.kategori === 'VIP' ? " (VIP)" : ""); let safeNameForPrint = nameForPrint.replace(/'/g, "\\'").replace(/"/g, '"'); let safeOriginalName = g.primaryValue.replace(/'/g, "\\'").replace(/"/g, '"'); let safeQr = g.qrString.replace(/'/g, "\\'").replace(/"/g, '"'); let qrUrl = "https://quickchart.io/qr?size=500&margin=1&text=" + encodeURIComponent(g.qrString); let isChecked = selectedGuestsForZip.has(g.qrString) ? 'checked' : '';
   html += '<tr><td style="text-align: center;"><input type="checkbox" value="' + safeQr + '" ' + isChecked + ' onclick="toggleSelectGuest(\'' + safeQr + '\', this.checked)" style="transform: scale(1.2); cursor: pointer;"></td><td style="font-weight:700;">' + g.primaryValue + '<br><small style="color:var(--gold-dark); font-weight:600; font-size:0.7rem;"><i class="fas fa-users"></i> ' + g.jumlahTamu + ' Orang</small></td><td><span class="badge-status ' + badgKategori + '">' + g.kategori + '</span></td><td><span class="badge-status ' + badgStatus + '">' + g.status + '</span> <br><span class="badge-status ' + badgSouv + '" style="margin-top:4px;">' + dynamicSouvenirLabel + ': ' + g.souvenir + '</span></td><td style="text-align: center; white-space:nowrap;"><button class="btn-action-icon" style="color:#0275d8;" onclick="toggleKehadiranStatus(\'' + safeOriginalName + '\', \'' + safeQr + '\')" title="Ubah Status Kehadiran"><i class="fas fa-user-check"></i></button><button class="btn-action-icon btn-view-qr" onclick="showQrPopup(\'' + safeNameForPrint + '\', \'' + safeQr + '\')" title="Lihat QR"><i class="fas fa-qrcode"></i></button><button class="btn-action-icon btn-print-qr" onclick="printDigitalTicket(\'' + qrUrl + '\', \'' + safeNameForPrint + '\')" title="Cetak Tiket QR"><i class="fas fa-print"></i></button><button class="btn-action-icon btn-toggle-vip" onclick="toggleVipStatus(\'' + safeOriginalName + '\')" title="Ubah VIP"><i class="fas fa-crown"></i></button><button class="btn-action-icon" style="color:#28a745;" onclick="openMessageTemplate(\'' + safeOriginalName + '\', \'' + safeQr + '\')" title="Copy Pesan Undangan"><i class="fas fa-comment-dots"></i></button></td></tr>';
  });
  if(tb) tb.innerHTML = html;
  let startCount = startIndex + 1; let endCount = Math.min(endIndex, filteredGuestData.length); let btnPrev = '<button class="btn-page" onclick="changePage(-1)" ' + (currentPage === 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>'; let btnNext = '<button class="btn-page" onclick="changePage(1)" ' + (currentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>'; let infoText = '<span>Menampilkan ' + startCount + '-' + endCount + ' dari ' + filteredGuestData.length + '</span>'; let htmlControls = btnPrev + ' ' + infoText + ' ' + btnNext;
  if(pc) pc.innerHTML = htmlControls; if(pcTop) pcTop.innerHTML = htmlControls;
}

function changePage(direction) { currentPage += direction; renderRekapRows(); }

function exportCSV() {
    if (filteredGuestData.length === 0) { 
        Swal.fire('Kosong', 'Tidak ada data untuk diexport.', 'info'); 
        return; 
    }

    // 1. Ambil Nama & Tanggal Event
    let eventTitle = document.getElementById('adminEventTitle') ? document.getElementById('adminEventTitle').value : "LAPORAN TAMU";
    let eventDate = document.getElementById('adminEventDate')?.value || "4 Juli 2026";

    // 2. Kalkulasi Matematika Ringkasan (Termasuk Belum Hadir)
    let totalHadir = 0;
    let totalSouvenir = 0;
    let totalVIP = 0;
    let totalReguler = 0;
    let totalBelumHadir = 0;

    filteredGuestData.forEach(g => {
        if (g.status === 'Hadir' || g.status === 'Sudah Hadir') {
            totalHadir++;
            if (g.kategori === 'VIP') totalVIP++;
            else totalReguler++;
        } else {
            totalBelumHadir++; // Hitung tamu yang statusnya bukan Hadir
        }
        
        if (g.souvenir === 'Sudah Ambil' || g.souvenir === 'Sudah') {
            totalSouvenir++;
        }
    });

    // 3. Susun Header Kolom Tabel
    let headers = currentQuestions.map(q => q.label);
    headers.push("Kategori", "Status Kehadiran", "Status " + dynamicSouvenirLabel);

    // 4. Susun Konten CSV (Dilengkapi Summary Box di Baris Atas)
    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; // BOM agar Excel bisa membaca format text dengan rapi
    
    // --- AREA SUMMARY HEADER CSV ---
    csvContent += "LAPORAN REKAPITULASI DATA TAMU (TAMOO)\n";
    csvContent += "Nama Event:," + eventTitle.replace(/,/g, "") + "\n";
    csvContent += "Tanggal Pelaksanaan:," + eventDate.replace(/,/g, "") + "\n\n";
    
    csvContent += "RINGKASAN KEHADIRAN\n";
    csvContent += "Total Tamu Hadir:," + totalHadir + " Orang\n";
    csvContent += "Total Belum Hadir:," + totalBelumHadir + " Orang\n";
    csvContent += "Total Ambil Souvenir:," + totalSouvenir + " Pcs\n";
    csvContent += "Total Tamu VIP Hadir:," + totalVIP + " Orang\n";
    csvContent += "Total Tamu Reguler Hadir:," + totalReguler + " Orang\n\n";
    
    // --- AREA DATA TABEL UTAMA ---
    // Header tabel
    csvContent += headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(",") + "\n";

    // Isi baris tamu
    filteredGuestData.forEach(g => { 
        let qrObj = g.fullData || {}; 
        // Ambil jawaban custom form
        let row = currentQuestions.map(q => '"' + (qrObj[q.id] || "").toString().replace(/"/g, '""') + '"'); 
        // Tambahkan kolom kategori, status, dan souvenir
        row.push('"' + (g.kategori || "Reguler") + '"', '"' + (g.status || "Belum Hadir") + '"', '"' + (g.souvenir || "Belum Ambil") + '"'); 
        
        csvContent += row.join(",") + "\n"; 
    });

    // 5. Eksekusi Unduh File otomatis
    let encodedUri = encodeURI(csvContent); 
    let link = document.createElement("a"); 
    link.setAttribute("href", encodedUri); 
    link.setAttribute("download", 'Rekap_TAMOO_' + eventTitle.replace(/\s+/g, '_') + '.csv'); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}

function exportPDF() {
    if (filteredGuestData.length === 0) { 
        Swal.fire('Kosong', 'Tidak ada data untuk dicetak.', 'info'); 
        return; 
    }

    // 1. Ambil data Event Title dan Event Date dari DOM Setup secara aman
    let eventTitle = document.getElementById('adminEventTitle') ? document.getElementById('adminEventTitle').value : "LAPORAN TAMU";
    let eventDate = document.getElementById('adminEventDate') ? document.getElementById('adminEventDate').value : "4 Juli 2026";

    // 2. Kalkulasi Matematika Ringkasan Data Ganda
    let totalNamaHadir = 0;
    let totalKehadiranTamu = 0;
    let totalSouvenir = 0;
    let totalVIP = 0;
    let totalReguler = 0;
    let totalBelumHadir = 0;

    filteredGuestData.forEach(g => {
        let jumlahTamu = parseInt(g.jumlahTamu) || 1;

        if (g.status === 'Hadir' || g.status === 'Sudah Hadir') {
            totalNamaHadir++;
            totalKehadiranTamu += jumlahTamu;
            
            if (g.kategori === 'VIP') {
                totalVIP += jumlahTamu;
            } else {
                totalReguler += jumlahTamu;
            }
        } else {
            totalBelumHadir++;
        }
        
        if (g.souvenir === 'Sudah Ambil' || g.souvenir === 'Sudah') {
            totalSouvenir++;
        }
    });

    // 3. Bangun struktur baris tabel data tamu secara dinamis
    let tableRowsHtml = '';
    filteredGuestData.forEach((g, idx) => {
        let jumlahTamu = parseInt(g.jumlahTamu) || 1;
        tableRowsHtml += `
            <tr>
                <td style="text-align:center; padding:8px; border:1px solid #ddd;">${idx + 1}</td>
                <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${g.primaryValue || '-'}</td>
                <td style="text-align:center; padding:8px; border:1px solid #ddd; font-weight:bold; color:#846924;">${jumlahTamu}</td>
                <td style="text-align:center; padding:8px; border:1px solid #ddd;">${g.kategori || 'Reguler'}</td>
                <td style="text-align:center; padding:8px; border:1px solid #ddd;">${g.status || 'Belum Hadir'}</td>
                <td style="text-align:center; padding:8px; border:1px solid #ddd;">${g.souvenir || 'Belum Ambil'}</td>
            </tr>
        `;
    });

    // 4. Buka dokumen print secara aman
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Rekap_TAMOO_${eventTitle.replace(/\s+/g, '_')}</title>
            <style>
                body { font-family: 'Helvetica', Arial, sans-serif; color: #333; padding: 20px; line-height: 1.4; text-align: center; }
                
                .app-branding { font-size: 14px; font-weight: bold; color: #846924; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
                .header-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #111; text-align: center; }
                .sub-title { font-size: 13px; color: #555; margin-bottom: 25px; border-bottom: 1px solid #e0e6ed; padding-bottom: 15px; display: inline-block; width: 85%; text-align: center; }
                
                /* PERBAIKAN: Menggunakan Flexbox & Margin Auto */
                .summary-container { 
                    background-color: #fdfaf3; 
                    border: 1px solid #f0e6d2; 
                    padding: 15px 30px; 
                    border-radius: 8px; 
                    margin: 0 auto 25px auto; 
                    display: flex; 
                    justify-content: space-between; 
                    text-align: left; 
                    width: 80%; 
                    box-sizing: border-box; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.02); 
                }
                .summary-box { width: 48%; }
                .summary-box p { margin: 6px 0; font-size: 13px; color: #444; }
                .summary-box strong { color: #846924; font-size: 13px; }
                .summary-box .text-danger { color: #c5221f; font-size: 13px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; }
                th { background-color: #846924; color: white; padding: 10px; font-size: 12px; text-transform: uppercase; border: 1px solid #846924; }
                td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
                
                .footer-brand { position: fixed; bottom: 20px; right: 20px; font-size: 11px; color: #888; font-style: italic; font-weight: bold; letter-spacing: 1px; }
                
                @media print { 
                    body { padding: 0; } 
                    .summary-container { width: 100%; padding: 15px; }
                }
            </style>
        </head>
        <body>
            <div class="app-branding">TAMOO</div>
            <div class="header-title">LAPORAN REKAPITULASI DATA TAMU</div>
            <div class="sub-title">
                <strong>Nama Event:</strong> ${eventTitle} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tanggal Pelaksanaan:</strong> ${eventDate}
            </div>

            <div class="summary-container">
                <div class="summary-box">
                    <p>Total Kehadiran Nama Terdaftar: <strong>${totalNamaHadir} Nama</strong></p>
                    <p>Total Kehadiran Tamu: <strong>${totalKehadiranTamu} Orang</strong></p>
                    <p>Total Ambil Souvenir: <strong>${totalSouvenir} Pcs</strong></p>
                </div>
                <div class="summary-box">
                    <p>Total Belum Hadir: <span class="text-danger"><strong>${totalBelumHadir} Nama</strong></span></p>
                    <p>Total Tamu VIP Hadir: <strong>${totalVIP} Orang</strong></p>
                    <p>Total Tamu Reguler Hadir: <strong>${totalReguler} Orang</strong></p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%; text-align:center;">No</th>
                        <th>Nama Lengkap Tamu</th>
                        <th style="width: 10%; text-align:center;">Jumlah</th>
                        <th style="width: 12%; text-align:center;">Kategori</th>
                        <th style="width: 18%; text-align:center;">Status Kehadiran</th>
                        <th style="width: 18%; text-align:center;">Status Souvenir</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <div class="footer-brand">Powered by RAMATLOKA</div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function toggleVipStatus(name) { Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); google.script.run.withSuccessHandler(() => { Swal.close(); loadRekapData(); }).toggleGuestKategori(name); }
function toggleKehadiranStatus(name, qrData) {
    Swal.fire({
        title: 'Ubah Kehadiran?',
        text: 'Anda akan merubah status kehadiran untuk tamu: ' + name,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Ubah Status',
        cancelButtonText: 'Batal',
        customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            // MENGGUNAKAN ENGINE BRIDGE ASLI BAWAAN (google.script.run)
            google.script.run.withSuccessHandler((res) => {
                if(res.status === 'success') {
                    Swal.close();
                    loadRekapData(); // Otomatis refresh data rekap
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            }).withFailureHandler(err => {
                Swal.fire('Error', err.message, 'error');
            }).toggleGuestKehadiran(qrData);
        }
    });
}

function openAddGuestModal() {
  let formHtml = '';
  currentQuestions.forEach(q => { 
      formHtml += '<div style="text-align:left; margin-bottom:12px;"><label style="font-weight:700; font-size:0.75rem; color:var(--text-muted);">' + q.label + '</label>'; 
      if(q.type === 'dropdown') { formHtml += '<select id="manual_' + q.id + '" class="swal2-input" style="margin:8px 0; width:100%; box-sizing:border-box;">' + q.options.map(o => '<option value="' + o + '">' + o + '</option>').join('') + '</select>'; } 
      else if(q.type === 'radio') { q.options.forEach(o => { formHtml += '<div style="margin-bottom:5px;"><input type="radio" name="manual_' + q.id + '" value="' + o + '" style="width:auto; display:inline-block; margin-right:8px;"> <span style="font-size:0.9rem; color:var(--text-main);">' + o + '</span></div>'; }); } else if(q.type === 'checkbox') { q.options.forEach(o => { formHtml += '<div style="margin-bottom:5px;"><input type="checkbox" name="manual_' + q.id + '" value="' + o + '" style="width:auto; display:inline-block; margin-right:8px;"> <span style="font-size:0.9rem; color:var(--text-main);">' + o + '</span></div>'; }); } else { formHtml += '<input type="' + q.type + '" id="manual_' + q.id + '" class="swal2-input" style="margin:8px 0; width:100%; box-sizing:border-box;">'; } 
      formHtml += '</div>'; 
  });
  formHtml += '<div style="text-align:left; margin-bottom:12px; margin-top:20px; padding-top:15px; border-top:1px dashed var(--border-color);"><label style="font-weight:900; font-size:0.75rem; color:var(--gold-dark); text-transform:uppercase;">Kategori Tamu</label><select id="manual_kategori" class="swal2-input" style="margin:8px 0; width:100%; box-sizing:border-box; background:var(--gold-gradient); color:#fff; font-weight:700;"><option value="Reguler" style="color:#333; background:#fff;">Tamu Reguler</option><option value="VIP" style="color:#333; background:#fff;">Tamu VIP</option></select></div>';
  Swal.fire({ 
      title: 'TAMBAH TAMU MANUAL', html: '<div style="max-height:450px; overflow-y:auto; padding:5px;">' + formHtml + '</div>', showCancelButton: true, confirmButtonText: 'Buat & Tampilkan QR', customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' }, 
      preConfirm: () => { 
          let data = {}; 
          currentQuestions.forEach(q => { 
              if(q.type === 'radio') { let el = document.querySelector('input[name="manual_' + q.id + '"]:checked'); data[q.id] = el ? el.value : ""; } 
              else if(q.type === 'checkbox') { let els = document.querySelectorAll('input[name="manual_' + q.id + '"]:checked'); let vals = Array.from(els).map(e => e.value); data[q.id] = vals.join(", "); } 
              else { let el = document.getElementById('manual_' + q.id); data[q.id] = el ? el.value : ""; } 
          });
          let katEl = document.getElementById('manual_kategori'); return { formData: data, kategori: katEl ? katEl.value : "Reguler" };
      } 
  }).then(r => { if(r.value) { Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); google.script.run.withSuccessHandler((res) => { loadRekapData(); showQrPopup(r.value.formData[currentQuestions[0].id] + (r.value.kategori === 'VIP' ? " (VIP)" : ""), res.qrId); }).tambahTamuManual(r.value.formData, r.value.kategori); } });
}

function renderAdminUI() { 
  let html = '';
  currentQuestions.forEach((q, idx) => { 
      let badgeTv = q.showOnTv ? '<span style="background:#e6f4ea; color:#107c41; padding:2px 8px; border-radius:10px; font-size:0.6rem;">TV</span>' : ''; let badgeReq = q.required ? '<span style="background:#fce8e6; color:#c5221f; padding:2px 8px; border-radius:10px; font-size:0.6rem;">Wajib</span>' : '';
      html += '<div style="background:var(--bg-color); padding:15px; border-radius:12px; border: 1px solid var(--border-color); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;"><div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">' + q.label + ' ' + badgeTv + ' ' + badgeReq + '</div><button onclick="removeQuestion(' + idx + ')" style="background:none; color:#d9534f; border:none; cursor:pointer;"><i class="fas fa-times-circle" style="font-size:1.2rem;"></i></button></div>'; 
  });
  document.getElementById('adminQuestionList').innerHTML = html;
}

function addQuestion() { 
  Swal.fire({ 
      title: 'Tambah Field', 
      html: '<input id="qLabel" class="swal2-input" placeholder="Label Pertanyaan" style="font-family:Montserrat;"><select id="qType" class="swal2-input" style="font-family:Montserrat; font-size:0.9rem;"><option value="text">Teks Singkat</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="time">Waktu</option><option value="dropdown">Pilihan (Dropdown)</option><option value="radio">Pilihan Ganda</option><option value="checkbox">Kotak Centang</option></select><input id="qOpts" class="swal2-input" placeholder="Opsi (pisahkan dgn koma, jika ada)" style="font-family:Montserrat; font-size:0.9rem;"><div style="margin-top:15px; text-align:left; padding-left:10px;"><input type="checkbox" id="qShowTv" style="transform:scale(1.3); margin-right:10px;"><label for="qShowTv" style="font-family:Montserrat; font-size:0.85rem; font-weight:600; cursor:pointer;">Tampil di Layar Sapaan</label></div><div style="margin-top:10px; text-align:left; padding-left:10px;"><input type="checkbox" id="qRequired" style="transform:scale(1.3); margin-right:10px;"><label for="qRequired" style="font-family:Montserrat; font-size:0.85rem; font-weight:600; cursor:pointer; color:#c5221f;">Wajib Diisi (Required)</label></div>', confirmButtonText: 'Simpan', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal' }, 
      preConfirm: () => { let lbl = document.getElementById('qLabel'); let typ = document.getElementById('qType'); let opt = document.getElementById('qOpts'); let showTv = document.getElementById('qShowTv'); let req = document.getElementById('qRequired'); return { id: 'q_'+Date.now(), label: lbl?lbl.value:"", type: typ?typ.value:"text", options: (opt&&opt.value)?opt.value.split(","):[], showOnTv: showTv.checked, required: req.checked }; } 
  }).then(r => { if(r.value) { currentQuestions.push(r.value); renderAdminUI(); } }); 
}

function removeQuestion(idx) { currentQuestions.splice(idx, 1); renderAdminUI(); }

function saveAdminSettingsData() { 
    let getVal = (id) => { let el = document.getElementById(id); return el ? el.value : ""; }; 
    let conf = { eventTitle: getVal('adminEventTitle'), announcement: getVal('adminAnnouncement'), eventName: getVal('adminEventName'), eventDate: getVal('adminEventDate'), eventLocation: getVal('adminEventLocation'), prefix: getVal('adminPrefix'), suffix: getVal('adminSuffix'), appTheme: getVal('adminAppTheme'), detailUrl: getVal('adminDetailUrl'), soundSuccess: getVal('adminSoundSuccess'), soundError: getVal('adminSoundError'), souvenirLabel: getVal('adminSouvenirLabel'), maxQuota: getVal('adminMaxQuota'), formStatus: getVal('adminFormStatus'), posterUrl: getVal('adminPosterUrl'), waTemplate: getVal('adminWaTemplate'), requireLogin: getVal('adminRequireLogin') };
    let fileInput = document.getElementById('adminPosterUpload');
    if (fileInput && fileInput.files.length > 0) {
        Swal.fire({ title: 'Menyimpan & Mengupload...', text:'Mohon tunggu, sedang mengirim gambar ke Google Drive Anda...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); let file = fileInput.files[0]; let reader = new FileReader();
        reader.onload = function(e) {
            let base64 = e.target.result.split(',')[1]; let posterData = { filename: file.name, mimeType: file.type, base64: base64 };
            google.script.run.withSuccessHandler(msg => { Swal.fire({title:'Berhasil', text:msg, icon:'success', customClass:{popup:'luxury-popup', confirmButton:'btn-action-swal'}}); document.getElementById('adminPosterUpload').value = ''; loadForm(); }).withFailureHandler(err => { Swal.fire({title:'Gagal', text:err.message, icon:'error'}); }).saveAdminSettings(currentQuestions, conf, posterData);
        }; reader.readAsDataURL(file);
    } else {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); google.script.run.withSuccessHandler(msg => { Swal.fire({title:'Berhasil', text:msg, icon:'success', customClass:{popup:'luxury-popup', confirmButton:'btn-action-swal'}}); loadForm(); }).withFailureHandler(err => { Swal.fire({title:'Gagal', text:err.message, icon:'error'}); }).saveAdminSettings(currentQuestions, conf, null);
    }
}

function downloadExcelTemplate() {
    if(currentQuestions.length === 0) { Swal.fire('Error', 'Silakan setup form di menu Admin terlebih dahulu.', 'error'); return; }
    let headers = currentQuestions.map(q => q.label); headers.push("Kategori"); let wb = XLSX.utils.book_new(); let ws = XLSX.utils.aoa_to_sheet([headers]); let wscols = headers.map(h => ({wch: 25})); ws['!cols'] = wscols; XLSX.utils.book_append_sheet(wb, ws, "Template_Tamu"); XLSX.writeFile(wb, "Template_Import_Tamu.xlsx");
}

function handleExcelUpload(event) {
    let file = event.target.files[0]; if(!file) return;
    Swal.fire({ title: 'Membaca Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result); let workbook = XLSX.read(data, {type: 'array'}); let firstSheetName = workbook.SheetNames[0]; let worksheet = workbook.Sheets[firstSheetName]; let json = XLSX.utils.sheet_to_json(worksheet);
        if(json.length === 0) { event.target.value = ''; Swal.fire('Kosong', 'Tidak ada data tamu di dalam file Excel.', 'warning'); return; }
        Swal.fire({ title: 'Menyimpan ke Database...', text: 'Memproses ' + json.length + ' tamu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        google.script.run.withSuccessHandler((res) => { event.target.value = ''; Swal.fire({title: 'Berhasil', text: res.count + ' Tamu berhasil diimport ke sistem.', icon: 'success', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal' }}); loadRekapData(); }).withFailureHandler(err => { event.target.value = ''; Swal.fire('Error', err.message, 'error'); }).simpanPendaftaranBulk(json);
    }; reader.readAsArrayBuffer(file);
}

async function downloadAllQRZip() {
    if(selectedGuestsForZip.size === 0) { Swal.fire('Pilih Tamu', 'Silakan centang minimal satu nama tamu pada tabel terlebih dahulu.', 'info'); return; }
    let guestsToDownload = filteredGuestData.filter(g => selectedGuestsForZip.has(g.qrString));
    Swal.fire({ title: 'Membuat Arsip ZIP...', text: 'Merakit ' + guestsToDownload.length + ' Tiket QR. Proses ini memakan waktu beberapa saat...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    let zip = new JSZip(); let imgFolder = zip.folder("Tiket_Tamu"); let activeThemeKey = document.getElementById('adminAppTheme') ? document.getElementById('adminAppTheme').value : "classic_gold"; 
    let tColor = APP_THEMES_LOCAL[activeThemeKey] || APP_THEMES_LOCAL["classic_gold"]; // <-- BUG FIX PALET WARNA
    let elName = document.getElementById('adminEventName'); let elDate = document.getElementById('adminEventDate'); let elLoc = document.getElementById('adminEventLocation'); let elTitle = document.getElementById('adminEventTitle'); let eventName = (elName && elName.value) ? elName.value : (elTitle && elTitle.value ? elTitle.value : "EVENT TICKET"); let eventDate = (elDate && elDate.value) ? elDate.value : ""; let eventLoc = (elLoc && elLoc.value) ? elLoc.value : "";
    let dateLocText = ""; if (eventDate && eventLoc) dateLocText = eventDate + "  |  " + eventLoc; else if (eventDate) dateLocText = eventDate; else if (eventLoc) dateLocText = eventLoc;
    
    let fetchPromises = guestsToDownload.map(g => {
        return new Promise((resolve) => {
            let safeQr = g.qrString; let qrUrl = "https://quickchart.io/qr?size=500&margin=1&text=" + encodeURIComponent(safeQr); let guestName = g.primaryValue + (g.kategori === 'VIP' ? " (VIP)" : ""); let safeNameForFile = guestName.replace(/[^a-z0-9]/gi, '_').toLowerCase(); let fileName = 'Tiket_' + safeNameForFile + '.png';
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 500; canvas.height = 700; ctx.fillStyle = tColor.cardBg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = tColor.border; ctx.lineWidth = 8; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60); ctx.fillStyle = tColor.dark; ctx.textAlign = "center"; let titleFontSize = 32; ctx.font = "bold " + titleFontSize + "px sans-serif";
                    while (ctx.measureText(eventName.toUpperCase()).width > canvas.width - 80 && titleFontSize > 14) { titleFontSize -= 2; ctx.font = "bold " + titleFontSize + "px sans-serif"; }
                    ctx.fillText(eventName.toUpperCase(), canvas.width / 2, 90); ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 120, 110); ctx.lineTo(canvas.width / 2 + 120, 110); ctx.strokeStyle = tColor.light; ctx.lineWidth = 2; ctx.stroke();
                    if(dateLocText) { ctx.fillStyle = tColor.textMuted; ctx.font = "bold 13px sans-serif"; ctx.fillText(dateLocText.toUpperCase(), canvas.width / 2, 140); }
                    ctx.fillStyle = tColor.textMuted; ctx.font = "bold 16px sans-serif"; ctx.fillText("E - T I C K E T   P A S S", canvas.width / 2, 175); ctx.fillStyle = tColor.textMain; let nameFontSize = 28; ctx.font = "bold " + nameFontSize + "px sans-serif";
                    while (ctx.measureText(guestName.toUpperCase()).width > canvas.width - 100 && nameFontSize > 14) { nameFontSize -= 2; ctx.font = "bold " + nameFontSize + "px sans-serif"; }
                    ctx.fillText(guestName.toUpperCase(), canvas.width / 2, 220); ctx.fillStyle = tColor.bg; ctx.fillRect(115, 255, 270, 270); ctx.drawImage(img, 125, 265, 250, 250); ctx.fillStyle = tColor.textMuted; ctx.font = "600 14px sans-serif"; ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 580); ctx.fillStyle = tColor.light; ctx.font = "bold 18px sans-serif"; ctx.fillText("R A M A T L O K A", canvas.width / 2, 630);
                    canvas.toBlob(function(finalBlob) { imgFolder.file(fileName, finalBlob); resolve(); }, "image/png");
                } catch(e) { resolve(); }
            }; 
            img.onerror = () => { resolve(); }; 
            img.src = qrUrl;
        });
    });
    
    await Promise.all(fetchPromises);
    zip.generateAsync({type:"blob"}).then(function(content) {
        let eventName = document.getElementById('adminEventTitle') ? document.getElementById('adminEventTitle').value : "GUEST_BOOK"; let safeEventName = eventName.replace(/[^a-z0-9]/gi, '_'); saveAs(content, 'Tiket_Terpilih_' + safeEventName + '.zip'); Swal.fire({title: 'Berhasil', text: guestsToDownload.length + ' Tiket berhasil dirakit & diunduh!', icon: 'success', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal' }});
    });
}

const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx = null;
function playSuccessSound() {
    if (!enableSoundSuccess) return;
    try { if (!audioCtx) audioCtx = new AudioContext(); if (audioCtx.state === 'suspended') audioCtx.resume(); let osc = audioCtx.createOscillator(); let gainNode = audioCtx.createGain(); osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.type = 'triangle'; osc.frequency.setValueAtTime(2000, audioCtx.currentTime); gainNode.gain.setValueAtTime(1, audioCtx.currentTime); osc.start(); gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3); osc.stop(audioCtx.currentTime + 0.3); } catch(e) { console.error(e); }
}
function playErrorSound() {
    if (!enableSoundError) return;
    try { if (!audioCtx) audioCtx = new AudioContext(); if (audioCtx.state === 'suspended') audioCtx.resume(); let osc = audioCtx.createOscillator(); let gainNode = audioCtx.createGain(); osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.type = 'square'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); gainNode.gain.setValueAtTime(1, audioCtx.currentTime); osc.start(); gainNode.gain.setValueAtTime(1, audioCtx.currentTime + 0.5); gainNode.gain.linearRampToValueAtTime(0.00001, audioCtx.currentTime + 0.55); osc.stop(audioCtx.currentTime + 0.55); } catch(e) { console.error(e); }
}

function handleNativeCamera(event) { 
  if (event.target.files.length > 0) { 
      Swal.fire({ title: 'Memindai...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const html5QrCode = new Html5Qrcode("reader"); html5QrCode.scanFile(event.target.files[0], true).then(decodedText => { event.target.value = ''; processDataKehadiran(decodedText); }).catch(() => { event.target.value = ''; playErrorSound(); Swal.fire({title:'Gagal', text:'QR tidak terbaca. Pastikan foto jelas.', icon:'error'}); });
  } 
}

function handleNativeCameraSouvenir(event) {
  if (event.target.files.length > 0) {
    Swal.fire({ title: 'Memindai...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const html5QrCode = new Html5Qrcode("readerSouvenir"); html5QrCode.scanFile(event.target.files[0], true).then(decodedText => { event.target.value = ''; processDataSouvenir(decodedText); }).catch(() => { event.target.value = ''; playErrorSound(); Swal.fire({title:'Gagal', text:'QR tidak terbaca. Pastikan foto jelas.', icon:'error'}); });
  }
}

function processDataKehadiran(qrData, force = false) {
  Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  google.script.run.withSuccessHandler(r => {
      if(r.status === 'success' || r.status === 'exists') {
        let extraHtmlTV = ""; let extraHtmlScanner = ""; let extraCount = 0;
        if (r.fullData) { currentQuestions.forEach(q => { if (q.showOnTv && r.fullData[q.id] && q.id !== currentQuestions[0].id) { if (extraCount < 2) { extraHtmlTV += '<div style="margin-bottom:15px; text-align:center;"><div style="font-family:\'Montserrat\', sans-serif; font-size:1.1rem; color:var(--text-muted); font-weight:700; letter-spacing:2px; text-transform:uppercase;">' + q.label + '</div><div style="font-family:\'Playfair Display\', serif; font-size:2.8rem; color:var(--text-main); font-weight:900; line-height:1.1; margin-top:5px;">' + r.fullData[q.id] + '</div></div>'; extraCount++; } extraHtmlScanner += '<div style="font-family:\'Montserrat\', sans-serif; font-size:0.9rem; color:var(--text-muted); margin-top:8px;">' + q.label + ': <span style="font-weight:700; color:var(--text-main);">' + r.fullData[q.id] + '</span></div>'; } }); }
        if (r.status === 'success') {
            playSuccessSound(); localStorage.setItem('guest_display_data', JSON.stringify({ nama: r.namaTamu, kategori: r.kategori, prefix: greetingPrefix, suffix: greetingSuffix, extraHtml: extraHtmlTV, timestamp: Date.now() }));
            let badgeVipHtml = r.kategori === 'VIP' ? '<div style="display:inline-block; background:var(--gold-gradient); color:#fff; padding:6px 20px; border-radius:20px; font-weight:900; font-size:0.75rem; letter-spacing:3px; margin-bottom:15px; box-shadow:0 5px 15px rgba(0,0,0,0.15); text-transform:uppercase;">Tamu VIP</div>' : ''; let prefixHtml = greetingPrefix ? '<div style="font-family:\'Montserrat\', sans-serif; font-size:0.9rem; color:var(--text-muted); font-weight:700;">' + greetingPrefix + '</div>' : ''; let nameHtml = r.namaTamu; if (greetingSuffix) { nameHtml += '<br><span style="font-family:\'Montserrat\', sans-serif; font-size:1.1rem; font-weight:600; color:var(--text-muted); text-transform:none; letter-spacing:0;">' + greetingSuffix + '</span>'; }
            let defaultCount = parseInt(r.jumlahTamu) || 1;
            let counterHtml = `<div style="margin-top:15px; background:var(--bg-color); padding:15px; border-radius:12px; border:1px solid var(--border-color);"><div style="font-family:'Montserrat', sans-serif; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase;">Sesuaikan Jumlah Hadir:</div><div style="display:flex; justify-content:center; align-items:center; gap:15px;"><button type="button" onclick="let inp=document.getElementById('swalCountInput'); if(inp.value>1) inp.value--;" style="width:40px; height:40px; border-radius:50%; border:none; background:#c5221f; color:#fff; font-size:1.5rem; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);"><i class="fas fa-minus"></i></button><input type="number" id="swalCountInput" value="${defaultCount}" style="width:70px; height:45px; text-align:center; font-family:'Montserrat', sans-serif; font-size:1.5rem; font-weight:900; border:2px solid var(--border-color); border-radius:8px; color:var(--text-main); outline:none;"><button type="button" onclick="let inp=document.getElementById('swalCountInput'); inp.value++;" style="width:40px; height:40px; border-radius:50%; border:none; background:#107c41; color:#fff; font-size:1.5rem; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.1);"><i class="fas fa-plus"></i></button></div></div>`;
        Swal.fire({ 
            title: 'Selamat Datang', 
            html: '<div style="margin-top:10px;">' + badgeVipHtml + '</div>' + prefixHtml + '<div style="font-family:\'Playfair Display\', serif; color:var(--gold-dark); font-weight:900; font-size:2.5rem; line-height:1.1; margin-top:5px; margin-bottom:5px;">' + nameHtml + '</div>' + counterHtml + (extraHtmlScanner !== "" ? '<div style="border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;">' + extraHtmlScanner + '</div>' : ""), 
            icon: 'success', 
            showConfirmButton: true, 
            showDenyButton: true, 
            confirmButtonText: '<i class="fas fa-check-circle"></i> OK', 
            denyButtonText: '<i class="fas fa-camera"></i> SCAN LAGI', 
            customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', denyButton: 'btn-action-swal' }, 
            preConfirm: () => { let inp = document.getElementById('swalCountInput'); return inp ? parseInt(inp.value) : defaultCount; },
            preDeny: () => { let inp = document.getElementById('swalCountInput'); return inp ? parseInt(inp.value) : defaultCount; }
        }).then((res) => { 
            let finalCount = res.value || defaultCount; 
            
            if (finalCount !== defaultCount) { 
                google.script.run.withSuccessHandler(() => { fetchTotalHadir(); }).updateJumlahTamu(r.rawData, finalCount); 
            } else { 
                fetchTotalHadir(); 
            } 

            if (res.isDenied) {
                setTimeout(() => { openCameraModal('checkin'); }, 300);
            } else {
                let scn = document.getElementById('usbScannerInput'); 
                if(scn) scn.focus(); 
            }
        });
        } else { 
            playErrorSound(); let waktuText = r.waktuHadir ? '<br><span style="font-size:0.95rem; color:#c5221f; font-weight:bold;">pada ' + r.waktuHadir + '</span>' : ''; let jumlahHtmlExists = (r.jumlahTamu && r.jumlahTamu !== "") ? '<br><span style="font-size:0.95rem; color:var(--gold-dark); font-weight:bold;"><i class="fas fa-users"></i> Tercatat Membawa: ' + r.jumlahTamu + '</span>' : '';
            Swal.fire({ title: 'Perhatian', html: '<div style="font-size:1.1rem; line-height:1.4;"><b>' + r.namaTamu + '</b> sudah check-in sebelumnya.' + waktuText + jumlahHtmlExists + '</div>', icon: 'warning', showCancelButton: true, confirmButtonText: 'Paksa Catat', customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' } }).then(res => { if(res.isConfirmed) processDataKehadiran(r.rawData, true); else { let scn = document.getElementById('usbScannerInput'); if(scn) scn.focus(); }});
        }
      // >>> KODE BARU ERROR CHECK-IN <<<
        } else { 
            playErrorSound(); 
            Swal.fire({
                title: 'Error', 
                text: r.message, 
                icon: 'error',
                showConfirmButton: true, 
                showDenyButton: true, 
                confirmButtonText: 'OK', 
                denyButtonText: '<i class="fas fa-camera"></i> SCAN LAGI', 
                customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', denyButton: 'btn-action-swal' } 
            }).then((res) => { 
                if (res.isDenied) {
                    setTimeout(() => { openCameraModal('checkin'); }, 300);
                } else {
                    let scn = document.getElementById('usbScannerInput'); 
                    if(scn) scn.focus(); 
                }
            });
        }
  }).withFailureHandler(err => { playErrorSound(); Swal.fire('Error Server', err.message, 'error'); }).processScan(qrData, force);
}

function processDataSouvenir(qrData, force = false) {
  Swal.fire({ title: 'Cek ' + dynamicSouvenirLabel + '...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  google.script.run.withSuccessHandler(r => {
      if(r.status === 'success') {
        playSuccessSound(); 
        Swal.fire({ 
            title: 'BERHASIL KLAIM!', 
            html: '<div style="font-family:\'Playfair Display\', serif; color:#1967d2; font-weight:900; font-size:2rem; line-height:1.1; margin-top:5px; margin-bottom:10px;">' + r.namaTamu + '</div><p style="font-weight:bold; color:#555;">Silakan berikan ' + dynamicSouvenirLabel + ' kepada tamu.</p>', 
            icon: 'success', 
            showConfirmButton: true, 
            showDenyButton: true, 
            confirmButtonText: 'OK', 
            denyButtonText: '<i class="fas fa-camera"></i> SCAN LAGI', 
            customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', denyButton: 'btn-action-swal' } 
        }).then((res) => { 
            fetchSouvenirStats(); 
            
            if (res.isDenied) {
                setTimeout(() => { openCameraModal('souvenir'); }, 300);
            } else {
                let scn = document.getElementById('usbScannerSouvenirInput'); 
                if(scn) scn.focus(); 
            }
        });
     } else if(r.status === 'exists') { 
        playErrorSound(); let waktuText = r.waktuSouvenir ? '<br><span style="font-size:0.95rem; color:#c5221f; font-weight:bold;">pada ' + r.waktuSouvenir + '</span>' : '';
        Swal.fire({ title: 'SUDAH DIAMBIL!', html: '<div style="font-family:\'Playfair Display\', serif; color:#c5221f; font-weight:900; font-size:1.8rem; line-height:1.1; margin-top:5px; margin-bottom:10px;">' + r.namaTamu + '</div><p style="font-weight:bold; margin-bottom:5px;">Tamu ini sudah pernah mengklaim ' + dynamicSouvenirLabel + '.</p>' + waktuText, icon: 'error', showCancelButton: true, confirmButtonText: 'Paksa Ambil', customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' } }).then(res => { if(res.isConfirmed) processDataSouvenir(r.rawData, true); else { let scn = document.getElementById('usbScannerSouvenirInput'); if(scn) scn.focus(); }});
      // >>> KODE BARU ERROR SOUVENIR <<<
        } else { 
            playErrorSound(); 
            Swal.fire({
                title: 'Error', 
                text: r.message, 
                icon: 'error',
                showConfirmButton: true, 
                showDenyButton: true, 
                confirmButtonText: 'OK', 
                denyButtonText: '<i class="fas fa-camera"></i> SCAN LAGI', 
                customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', denyButton: 'btn-action-swal' } 
            }).then((res) => { 
                if (res.isDenied) {
                    setTimeout(() => { openCameraModal('souvenir'); }, 300);
                } else {
                    let scn = document.getElementById('usbScannerSouvenirInput'); 
                    if(scn) scn.focus(); 
                }
            });
        }
  }).withFailureHandler(err => { playErrorSound(); Swal.fire('Error Server', err.message, 'error'); }).processScanSouvenir(qrData, force);
}

function fetchTotalHadir() { google.script.run.withSuccessHandler(stats => { let hd = document.getElementById('totalHadirCounter'); let pg = document.getElementById('totalPengunjungCounter'); if(hd) hd.innerText = (stats.totalNama < 10 ? '0'+stats.totalNama : stats.totalNama); if(pg) pg.innerText = (stats.totalPengunjung < 10 ? '0'+stats.totalPengunjung : stats.totalPengunjung); }).getAttendanceStats(); }
function fetchSouvenirStats() { 
    google.script.run.withSuccessHandler(souvStats => { 
        let sv = document.getElementById('totalSouvenirCounter'); if(sv) sv.innerText = (souvStats.souvenirKeluar < 10 ? '0'+souvStats.souvenirKeluar : souvStats.souvenirKeluar); 
        google.script.run.withSuccessHandler(attStats => {
            let hadir = attStats.totalNama || 0; let hdEl = document.getElementById('totalHadirSouvCounter'); if(hdEl) hdEl.innerText = (hadir < 10 ? '0'+hadir : hadir);
            let sisa = hadir - souvStats.souvenirKeluar; if (sisa < 0) sisa = 0; let sisaEl = document.getElementById('sisaSouvCounter'); if(sisaEl) sisaEl.innerText = (sisa < 10 ? '0'+sisa : sisa);
        }).getAttendanceStats();
    }).getSouvenirStats();
}

document.addEventListener("keydown", function(e) { 
  let secP = document.getElementById('secPetugas'); let secS = document.getElementById('secSouvenir'); let f = document.getElementById('qrCapture'); let fS = document.getElementById('qrCaptureSouvenir');
  if (secP && secP.classList.contains('active') && f && !f.files.length) { let inp = document.getElementById('usbScannerInput'); if(inp) inp.focus(); } 
  if (secS && secS.classList.contains('active') && fS && !fS.files.length) { let inp = document.getElementById('usbScannerSouvenirInput'); if(inp) inp.focus(); } 
});
let usb = document.getElementById("usbScannerInput"); if(usb) usb.addEventListener("keypress", e => { if (e.key === "Enter") { processDataKehadiran(e.target.value); e.target.value = ''; } });
let usbSouv = document.getElementById("usbScannerSouvenirInput"); if(usbSouv) usbSouv.addEventListener("keypress", e => { if (e.key === "Enter") { processDataSouvenir(e.target.value); e.target.value = ''; } });

function openMessageTemplate(guestName, qrString) {
    let qrUrl = "https://quickchart.io/qr?size=500&margin=1&text=" + encodeURIComponent(qrString); let fullName = guestName; if (greetingPrefix) fullName = greetingPrefix + " " + fullName; if (greetingSuffix) fullName = fullName + " " + greetingSuffix;
    let templateEl = document.getElementById('adminWaTemplate'); let templateText = (templateEl && templateEl.value) ? templateEl.value : "Yth. [NAMA],\n\nBerikut E-Ticket Anda:\n[QR_LINK]";
    let finalMsg = templateText.replace(/\[NAMA\]/g, fullName).replace(/\[QR_LINK\]/g, qrUrl);
    Swal.fire({
        title: 'TEMPLATE PESAN', html: '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px; text-align:left;">Silakan edit teks di bawah ini jika diperlukan, lalu klik tombol Copy.</div><textarea id="msgTemplateArea" style="width:100%; height:200px; font-family:\'Montserrat\', sans-serif; font-size:0.85rem; padding:15px; border-radius:12px; border:1px solid var(--border-color); box-sizing:border-box; resize:vertical; outline:none;">' + finalMsg + '</textarea>', showCancelButton: true, confirmButtonText: '<i class="fas fa-copy"></i> COPY PESAN', cancelButtonText: 'Tutup', customClass: { popup: 'luxury-popup', title: 'luxury-title', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' },
        preConfirm: () => {
            let textArea = document.getElementById('msgTemplateArea');
            if(textArea) { textArea.select(); textArea.setSelectionRange(0, 99999); try { document.execCommand('copy'); return true; } catch(err) { Swal.showValidationMessage('Silakan blok teks dan copy manual.'); return false; } }
        }
    }).then((result) => { if (result.isConfirmed) { Swal.fire({ title: 'Berhasil Disalin!', text: 'Tinggal Paste di WhatsApp.', icon: 'success', timer: 2000, showConfirmButton: false, customClass: { popup: 'luxury-popup', title: 'luxury-title' }}); } });
}
// =========================================
// SISTEM KAMERA POPUP & TOGGLE (FRONT/REAR)
// =========================================
let currentFacingMode = "environment"; 
let html5QrCode = null; 
let currentScanTarget = "checkin"; 
let isCameraTransitioning = false; 

function openCameraModal(target) {
    if (isCameraTransitioning) return;
    currentScanTarget = target; 
    
    let overlay = document.getElementById('cameraModalOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    let btnToggle = document.getElementById('btnToggleCamera');
    if(btnToggle) {
        btnToggle.innerHTML = (currentFacingMode === "environment") 
            ? '<i class="fas fa-camera-rotate"></i> Gunakan Kamera Depan' 
            : '<i class="fas fa-camera-rotate"></i> Gunakan Kamera Belakang';
    }
    
    startScannerEngine();
}

function closeCameraModal() {
    let overlay = document.getElementById('cameraModalOverlay');
    if (overlay) overlay.style.display = 'none';
    stopScannerEngine();
}

function toggleCameraFacingMode() {
    if (isCameraTransitioning) return; 
    isCameraTransitioning = true;
    
    currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
    
    let btnToggle = document.getElementById('btnToggleCamera');
    if(btnToggle) {
        btnToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menukar Kamera...';
    }

    stopScannerEngine().then(() => {
        setTimeout(() => { 
            html5QrCode = new Html5Qrcode("scannerModalReader"); // <--- SUDAH DIGANTI DI SINI
            startScannerEngine();
            if(btnToggle) {
                btnToggle.innerHTML = (currentFacingMode === "environment") 
                    ? '<i class="fas fa-camera-rotate"></i> Gunakan Kamera Depan' 
                    : '<i class="fas fa-camera-rotate"></i> Gunakan Kamera Belakang';
            }
        }, 300);
    });
}

function startScannerEngine() {
    isCameraTransitioning = true;
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("scannerModalReader"); // <--- DAN DI SINI
    }
    
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
        { facingMode: currentFacingMode },
        config,
       (decodedText) => {
            closeCameraModal(); 
            if (currentScanTarget === "checkin") {
                let inputCheckin = document.getElementById('usbScannerInput');
                if (inputCheckin) {
                    inputCheckin.value = decodedText;
                    if (typeof processDataKehadiran === "function") {
                        processDataKehadiran(decodedText);
                        // Jeda 800ms agar petugas sempat melihat teksnya masuk, lalu otomatis bersih otomatis!
                        setTimeout(() => { inputCheckin.value = ''; }, 800);
                    }
                }
            } else if (currentScanTarget === "souvenir") {
                let inputSouvenir = document.getElementById('usbScannerSouvenirInput');
                if (inputSouvenir) {
                    inputSouvenir.value = decodedText;
                    if (typeof processDataSouvenir === "function") {
                        processDataSouvenir(decodedText);
                        // Jeda 800ms agar petugas sempat melihat teksnya masuk, lalu otomatis bersih otomatis!
                        setTimeout(() => { inputSouvenir.value = ''; }, 800);
                    }
                }
            }
        },
        (errorMessage) => { }
    ).then(() => {
        isCameraTransitioning = false; 
    }).catch((err) => {
        console.warn("Kamera gagal di mode:", currentFacingMode);
        
        if (currentFacingMode === "environment") {
            currentFacingMode = "user";
            html5QrCode = new Html5Qrcode("scannerModalReader"); // <--- DAN DI SINI
            setTimeout(() => { startScannerEngine(); }, 300);
        } else {
            isCameraTransitioning = false;
            Swal.fire('Akses Ditolak', 'Kamera tidak ditemukan atau terblokir.', 'error');
            closeCameraModal();
        }
    });
}

function stopScannerEngine() {
    return new Promise((resolve) => {
        if (html5QrCode) {
            try {
                if (html5QrCode.getState() === 2) {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        resolve();
                    }).catch(() => { resolve(); });
                } else {
                    html5QrCode.clear();
                    resolve();
                }
            } catch(e) {
                resolve();
            }
        } else {
            resolve();
        }
    });
}

// =========================================================================
// MODIFIKASI FUNGSI PENGAMAN MENU (DIJAMIN TIDAK ADA DUPLIKAT ERROR)
// =========================================================================
if (typeof originalActivateTab === "undefined" && typeof activateTab === "function") {
    const originalActivateTab = activateTab;
    activateTab = function(tab) {
        closeCameraModal(); 
        originalActivateTab(tab);
    };
}

if (typeof originalGoToHome === "undefined" && typeof goToHome === "function") {
    const originalGoToHome = goToHome;
    goToHome = function() {
        closeCameraModal(); 
        originalGoToHome();
    };
}
