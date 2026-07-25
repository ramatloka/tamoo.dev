// =========================================================================
// ENGINE BRIDGE BARU: SUPABASE CLIENT (TAMOO DEV)
// =========================================================================
const SUPABASE_URL = 'https://pqavtpxnnsavwqrvxlst.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxYXZ0cHhubnNhdndxcnZ4bHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTE2NDMsImV4cCI6MjEwMDUyNzY0M30.dkqS29xYf3VzQxZ3SnpFBYRPK4HKAy59S4L6V38KrH4';     

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tes Koneksi Supabase Otomatis
(async function testConnection() {
    try {
        const { data, error } = await db.from('app_config').select('*');
        if (error) throw error;
        console.log('✅ Berhasil terhubung ke Supabase! Data Config:', data);
    } catch (err) {
        console.error('❌ Gagal terhubung ke Supabase:', err.message);
    }
})();

// =========================================================================
// INITIALIZATION & CLIENT ROUTING (SUPABASE VERSION)
// =========================================================================
const urlParams = new URLSearchParams(window.location.search);
const MODE = urlParams.get('mode') || 'main';
const IS_PUBLIC_MODE = MODE === 'public';
const IS_TV_MODE = MODE === 'tv';

let currentQuestions = []; 
let fullGuestData = []; 
let filteredGuestData = []; 
let spreadsheetUrl = ""; 
let appWebAppUrl = ""; 
let greetingPrefix = "Bapak / Ibu"; 
let greetingSuffix = ""; 
let enableSoundSuccess = true; 
let enableSoundError = true; 
let dynamicSouvenirLabel = "SOUVENIR"; 
let isSouvenirPerPax = false; 
let currentPage = 1; 
const rowsPerPage = 10; 
let selectedGuestsForZip = new Set(); 
let currentUserRole = IS_PUBLIC_MODE ? "Public" : "";

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
    
    appWebAppUrl = window.location.origin + window.location.pathname;
    let pubInput = document.getElementById('publicLinkDisplay'); 
    if(pubInput) pubInput.value = appWebAppUrl + "?mode=public";
};

// =========================================================================
// CORE LOGIC FUNCTIONS (MENGGUNAKAN SUPABASE)
// =========================================================================
async function loadForm() {
  try {
    const { data: configData, error: configError } = await db.from('app_config').select('*');
    if (configError) throw configError;
    
    let data = {};
    configData.forEach(row => {
        data[row.key] = row.value;
    });

    const { data: settingsData, error: settingsError } = await db.from('form_settings').select('*').order('sort_order', { ascending: true });
    if (settingsError) throw settingsError;

    const { count, error: countError } = await db.from('data_tamu').select('*', { count: 'exact', head: true });
    if (!countError) {
        data.currentRegistered = count || 0;
    }

    currentQuestions = settingsData.map(q => ({
        id: q.id,
        label: q.label,
        type: q.type,
        options: q.options ? q.options.split(",") : [],
        showOnTv: q.show_on_tv,
        required: q.required
    }));

    let currentTheme = data.AppTheme || "classic_gold"; applyAppTheme(currentTheme);
    let elTheme = document.getElementById('adminAppTheme'); if(elTheme) elTheme.value = currentTheme;
    spreadsheetUrl = "https://supabase.com"; 
    greetingPrefix = data.GreetingPrefix || "Bapak / Ibu"; 
    greetingSuffix = data.GreetingSuffix || "";
    
    let setVal = (id, val) => { let el = document.getElementById(id); if(el) el.value = val || ""; };
    let setText = (id, val) => { let el = document.getElementById(id); if(el) el.innerText = val || ""; };

    setVal('adminPrefix', data.GreetingPrefix); setVal('adminSuffix', data.GreetingSuffix);
    setText('displayEventTitle', data.EventTitle || "GUEST BOOK PRO"); setVal('adminEventTitle', data.EventTitle);
    setText('runningTextDisplay', data.Announcement || "Selamat Datang"); setVal('adminAnnouncement', data.Announcement);
    setVal('adminEventName', data.EventName); setVal('adminEventDate', data.EventDate); setVal('adminEventLocation', data.EventLocation); 
    setVal('adminPosterUrl', data.PosterUrl); setVal('adminDetailUrl', data.DetailUrl);
    enableSoundSuccess = data.SoundSuccess !== "false"; enableSoundError = data.SoundError !== "false";
    setVal('adminSoundSuccess', data.SoundSuccess || "true"); setVal('adminSoundError', data.SoundError || "true");
    dynamicSouvenirLabel = data.SouvenirLabel || "SOUVENIR"; setVal('adminSouvenirLabel', dynamicSouvenirLabel); updateSouvenirLabelDOM(dynamicSouvenirLabel);
    isSouvenirPerPax = (data.SouvenirPerPax === "true"); setVal('adminSouvenirPerPax', data.SouvenirPerPax || "false");
    setVal('adminMaxQuota', data.MaxQuota); setVal('adminFormStatus', data.FormStatus || "BUKA"); setVal('adminWaTemplate', data.WaTemplate); 
    setVal('adminRequireLogin', data.RequireLogin || "true");

    if (!IS_PUBLIC_MODE && currentUserRole === "" && data.RequireLogin === "false") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('force') === 'login') {
            console.log("Backdoor aktif: Menahan popup login untuk Admin.");
        } else {
            Swal.close(); 
            currentUserRole = "Scanner"; 
            loginSuccess(); 
        }
    }

    if (data.PosterUrl && data.PosterUrl.trim() !== "") { let preSt = document.getElementById('posterPreviewStatus'); if(preSt) preSt.style.display = 'block'; }

    if (data.FormStatus === "TUTUP") {
        document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-lock" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">PENDAFTARAN DITUTUP</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, pendaftaran online untuk acara ini sudah resmi ditutup oleh panitia.</p></div>';
        let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
        let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
        document.getElementById('pubEventName').innerText = data.EventName || data.EventTitle; return;
    }

    let maxQ = parseInt(data.MaxQuota) || 0; let curRegHead = parseInt(data.currentRegistered) || 0;
    if (maxQ > 0 && curRegHead >= maxQ) {
        document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">MOHON MAAF</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, kapasitas kuota penampung tamu untuk acara ini sudah terisi penuh.</p></div>';
        let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
        let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
        document.getElementById('pubEventName').innerText = data.EventName || data.EventTitle; return;
    }

    if (IS_PUBLIC_MODE) {
        document.getElementById('publicEventInfo').style.display = 'block'; document.getElementById('pubEventName').innerText = data.EventName || data.EventTitle;
        let dateLoc = []; if(data.EventDate) dateLoc.push(data.EventDate); if(data.EventLocation) dateLoc.push(data.EventLocation); document.getElementById('pubEventDateLoc').innerText = dateLoc.join("  |  ");
        if(data.DetailUrl && data.DetailUrl.trim() !== "") { let btnDetail = document.getElementById('pubDetailBtn'); let finalUrl = data.DetailUrl.startsWith('http') ? data.DetailUrl : 'https://' + data.DetailUrl; btnDetail.href = finalUrl; btnDetail.style.display = 'inline-block'; }
    }
    
    renderGuestForm();
    renderSetupQuestionsTable();
    
  } catch(e) { 
      Swal.fire({ title: 'Error UI', text: e.message, icon: 'error' }); 
  }
}

// =========================================================================
// SETUP ACCORDION & MANAGEMENT UTILS (PENGENDALI ACTION SETUP)
// =========================================================================
function toggleAcc(headerEl) {
    // Ambil elemen yang sedang aktif diklik secara global (bulletproof fallback)
    let target = headerEl;
    if (window.event && window.event.currentTarget) {
        target = window.event.currentTarget;
    } else if (window.event && window.event.target) {
        target = window.event.target;
    }
    
    // Cari elemen pembungkus header terdekat secara manual merangkak naik ke atas DOM tree
    let currentHeader = target;
    while (currentHeader && currentHeader !== document.body) {
        if (currentHeader.tagName === 'DIV' && (currentHeader.onclick || currentHeader.getAttribute('onclick'))) {
            break;
        }
        currentHeader = currentHeader.parentElement;
    }
    
    if (!currentHeader) currentHeader = target;

    // Cari elemen konten (biasanya berada tepat setelah header ini)
    const content = currentHeader.nextElementSibling;
    const icon = currentHeader.querySelector('.fas.fa-chevron-down') || currentHeader.querySelector('.fa-chevron-down');

    if (content) {
        // Cek status tampilan saat ini
        if (content.style.display === "block" || (content.style.maxHeight && content.style.maxHeight !== "0px")) {
            content.style.display = "none";
            content.style.maxHeight = "0px";
            if (icon) icon.style.transform = "rotate(0deg)";
        } else {
            content.style.display = "block";
            content.style.maxHeight = content.scrollHeight + "px";
            if (icon) icon.style.transform = "rotate(180deg)";
        }
    }
}

function renderSetupQuestionsTable() {
    let tbody = document.getElementById('setupQuestionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = "";
    currentQuestions.forEach((q, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${q.label}</strong><br><small style="color:gray;">ID: ${q.id} | Tipe: ${q.type}</small></td>
            <td style="text-align:center;">${q.required ? '✅ Ya' : '❌ Tidak'}</td>
            <td style="text-align:center;">${q.showOnTv ? '✅ Ya' : '❌ Tidak'}</td>
            <td style="text-align:center;">
                <button type="button" class="btn-action-outline" onclick="deleteQuestion('${q.id}')" style="color:red; border-color:red; padding:4px 8px; font-size:11px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addQuestion() {
    let elTxt = document.getElementById('newQTxt');
    let elType = document.getElementById('newQType');
    let elOpt = document.getElementById('newQOpt') || document.getElementById('newQOptions');
    let elReq = document.getElementById('newQReq');
    let elTv = document.getElementById('newQTv');

    let label = elTxt ? elTxt.value.trim() : "";
    let type = elType ? elType.value : "text";
    let optStr = elOpt ? elOpt.value.trim() : "";
    let req = elReq ? elReq.checked : false;
    let tv = elTv ? elTv.checked : true;

    if (!label) { 
        Swal.fire({ title: 'Gagal', text: 'Label pertanyaan wajib diisi!', icon: 'warning', customClass: { popup: 'luxury-popup' } }); 
        return; 
    }
    
    let id = "c_" + label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if(currentQuestions.some(q => q.id === id)) { id += "_" + Math.floor(Math.random() * 100); }

    currentQuestions.push({ id, label, type, options: optStr ? optStr.split(",") : [], showOnTv: tv, required: req });
    
    if(elTxt) elTxt.value = "";
    if(elOpt) elOpt.value = "";
    if(elReq) elReq.checked = false;
    if(elTv) elTv.checked = true;

    renderSetupQuestionsTable();
    Swal.fire({ title: 'Ditambahkan', text: 'Pertanyaan berhasil masuk list sementara. Klik Simpan Pengaturan di bawah!', icon: 'success', customClass: { popup: 'luxury-popup' } });
}

function deleteQuestion(id) {
    if(id === 'nama_tamu') { 
        Swal.fire({ title: 'Dilarang', text: 'Kolom Nama Lengkap adalah field sistem utama!', icon: 'warning', customClass: { popup: 'luxury-popup' } }); 
        return; 
    }
    currentQuestions = currentQuestions.filter(q => q.id !== id);
    renderSetupQuestionsTable();
}

// =========================================================================
// SIMPAN PENGATURAN KE SUPABASE (DATABASE BRIDGE)
// =========================================================================
async function saveAdminSettings() {
    try {
        Swal.fire({ title: 'Menyimpan...', text: 'Mengirim konfigurasi ke Supabase', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const getVal = (id) => { let el = document.getElementById(id); return el ? el.value : ""; };

        // 1. Kumpulkan Konfigurasi Utama
        const configs = [
            { key: 'EventTitle', value: getVal('adminEventTitle') },
            { key: 'EventName', value: getVal('adminEventName') },
            { key: 'EventDate', value: getVal('adminEventDate') },
            { key: 'EventLocation', value: getVal('adminEventLocation') },
            { key: 'Announcement', value: getVal('adminAnnouncement') },
            { key: 'GreetingPrefix', value: getVal('adminPrefix') },
            { key: 'GreetingSuffix', value: getVal('adminSuffix') },
            { key: 'SouvenirLabel', value: getVal('adminSouvenirLabel') },
            { key: 'SouvenirPerPax', value: getVal('adminSouvenirPerPax') },
            { key: 'MaxQuota', value: getVal('adminMaxQuota') },
            { key: 'FormStatus', value: getVal('adminFormStatus') },
            { key: 'RequireLogin', value: getVal('adminRequireLogin') },
            { key: 'AppTheme', value: getVal('adminAppTheme') },
            { key: 'SoundSuccess', value: getVal('adminSoundSuccess') },
            { key: 'SoundError', value: getVal('adminSoundError') },
            { key: 'PosterUrl', value: getVal('adminPosterUrl') },
            { key: 'DetailUrl', value: getVal('adminDetailUrl') },
            { key: 'WaTemplate', value: getVal('adminWaTemplate') }
        ];

        // Upsert (Simpan/Update) ke tabel app_config Supabase
        const { error: configError } = await db.from('app_config').upsert(configs, { onConflict: 'key' });
        if (configError) throw configError;

        // 2. Simpan Struktur Field Pertanyaan ke tabel form_settings Supabase
        // Hapus data setting lama lalu masukkan list baru
        await db.from('form_settings').delete().neq('id', 'keep_alive_placeholder');

        const questionsPayload = currentQuestions.map((q, index) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            options: Array.isArray(q.options) ? q.options.join(',') : (q.options || null),
            show_on_tv: q.showOnTv,
            required: q.required,
            sort_order: index + 1
        }));

        const { error: formError } = await db.from('form_settings').upsert(questionsPayload, { onConflict: 'id' });
        if (formError) throw formError;

        Swal.fire({ title: 'Berhasil!', text: 'Pengaturan berhasil disimpan ke Supabase!', icon: 'success', customClass: { popup: 'luxury-popup' } });
        
        // Refresh UI Aplikasi
        loadForm();

    } catch (err) {
        Swal.fire({ title: 'Gagal Menyimpan', text: err.message, icon: 'error', customClass: { popup: 'luxury-popup' } });
    }
}

// =========================================================================
// FUNGSI LAYAR PENUH (FULLSCREEN UTIL)
// =========================================================================
function toggleFullScreen() {
  let btn = document.getElementById('btnFullscreenIcon');
  if (!document.fullscreenElement) { 
      document.documentElement.requestFullscreen().catch(err => {}); 
      if(btn) btn.className = 'fas fa-compress'; 
  } else { 
      if (document.exitFullscreen) { 
          document.exitFullscreen(); 
          if(btn) btn.className = 'fas fa-expand'; 
      } 
  }
}
document.addEventListener('fullscreenchange', () => { 
    let btn = document.getElementById('btnFullscreenIcon'); 
    if (!document.fullscreenElement && btn) { btn.className = 'fas fa-expand'; } 
});

// =========================================================================
// INTERFACE NAVIGATION & LOG IN UTILS
// =========================================================================
function showLoginPopup() {
  Swal.fire({
    title: 'LOGIN SISTEM', 
    html: '<input id="u" class="swal2-input" placeholder="Username" autocomplete="off"><input id="p" type="password" class="swal2-input" placeholder="Password">', 
    confirmButtonText: 'Masuk', 
    allowOutsideClick: false, 
    allowEscapeKey: false, 
    customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal', title: 'luxury-title' },
    preConfirm: () => { 
        let u = document.getElementById('u'); 
        let p = document.getElementById('p'); 
        return [(u ? u.value : ""), (p ? p.value : "")]; 
    }
  }).then((r) => { 
      if (!r.isConfirmed || !r.value) return; 
      let u = r.value[0]; let p = r.value[1];
      if(u === 'Admin55' && p === 'QRCode') { currentUserRole = "Admin"; loginSuccess(); } 
      else if(u === 'Scan' && p === '1234') { currentUserRole = "Scanner"; loginSuccess(); } 
      else { 
          Swal.fire({ title: 'Akses Ditolak', text: 'Username atau Password salah!', icon: 'error', allowOutsideClick: false, customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal' } }).then(() => showLoginPopup()); 
      }
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
    goToHome();
}

function logoutSystem() {
    Swal.fire({ title: 'Keluar?', text: "Anda akan mengakhiri sesi keamanan ini.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Logout', cancelButtonText: 'Batal', customClass: { popup: 'luxury-popup', confirmButton: 'btn-action-swal', cancelButton: 'btn-action-swal' }
    }).then((res) => {
        if (res.isConfirmed) {
            currentUserRole = ""; 
            let mc = document.querySelector('.main-card'); if(mc) mc.style.display = 'none'; 
            let fc = document.querySelector('.footer-container'); if(fc) fc.style.display = 'none'; 
            let btnOut = document.getElementById('btnLogoutBtn'); if(btnOut) btnOut.style.display = 'none'; 
            showLoginPopup();
        }
    });
}

function goToHome() { 
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); 
  document.getElementById('secTamu').classList.add('active'); 
  document.getElementById('tickerWrapContainer').classList.remove('active-ticker'); 
  updateNavHighlight('navHome'); 
  let mainCard = document.querySelector('.main-card'); if(mainCard) mainCard.classList.remove('main-card-wide');
}

function activateTab(tab) {
  if(currentUserRole === "Scanner" && (tab === 'rekap' || tab === 'admin')) { 
      Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat membuka halaman ini.', 'warning'); 
      return; 
  }
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  let targetSec = document.getElementById('sec' + tab.charAt(0).toUpperCase() + tab.slice(1)); 
  if(targetSec) targetSec.classList.add('active');
  
  let mainCard = document.querySelector('.main-card'); 
  if(mainCard) { 
      if(tab === 'rekap') { mainCard.classList.add('main-card-wide'); } 
      else { mainCard.classList.remove('main-card-wide'); } 
  }
  updateNavHighlight('nav' + tab.charAt(0).toUpperCase() + tab.slice(1));
}

function updateNavHighlight(activeId) { 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-icon')); 
    let el = document.getElementById(activeId); if(el) el.classList.add('active-icon'); 
}

function applyAppTheme(themeKey) {
  const APP_THEMES = {
    "classic_gold": { bg: "#fdfaf3", dark: "#846924", light: "#b39343", grad: "linear-gradient(to right, #cfaf57, #a9852c)", textMain: "#333333", textMuted: "#999999", cardBg: "#ffffff", border: "#f0e6d2" },
    "royal_navy": { bg: "#f0f4f8", dark: "#1a365d", light: "#3182ce", grad: "linear-gradient(to right, #4299e1, #2b6cb0)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "midnight": { bg: "#f7fafc", dark: "#1a202c", light: "#4a5568", grad: "linear-gradient(to right, #718096, #2d3748)", textMain: "#1a202c", textMuted: "#718096", cardBg: "#ffffff", border: "#e2e8f0" },
    "emerald": { bg: "#f0fff4", dark: "#22543d", light: "#38a169", grad: "linear-gradient(to right, #48bb78, #276749)", textMain: "#22543d", textMuted: "#718096", cardBg: "#ffffff", border: "#c6f6d5" }
  };
  const t = APP_THEMES[themeKey] || APP_THEMES["classic_gold"];
  document.documentElement.style.setProperty('--bg-color', t.bg); 
  document.documentElement.style.setProperty('--gold-dark', t.dark); 
  document.documentElement.style.setProperty('--gold-light', t.light); 
  document.documentElement.style.setProperty('--gold-gradient', t.grad); 
  document.documentElement.style.setProperty('--text-main', t.textMain); 
  document.documentElement.style.setProperty('--text-muted', t.textMuted); 
  document.documentElement.style.setProperty('--card-bg', t.cardBg); 
  document.documentElement.style.setProperty('--border-color', t.border);
}

function updateSouvenirLabelDOM(label) {
    let upper = label.toUpperCase(); document.querySelectorAll('.dyn-souvenir-text').forEach(el => el.innerText = upper);
    let filterSouv = document.getElementById('filterSouvenir'); if(filterSouv && filterSouv.options.length > 0) filterSouv.options[0].text = "Semua " + label;
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

function toggleQOptDisplay() {
    let type = document.getElementById('newQType').value;
    let container = document.getElementById('newQOptContainer');
    if(type === 'dropdown' || type === 'radio' || type === 'checkbox') { if(container) container.style.display = 'block'; } 
    else { if(container) container.style.display = 'none'; }
}

function initTvMode() { console.log("Layar TV Extended Aktif."); }
