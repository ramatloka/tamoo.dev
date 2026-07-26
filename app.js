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
    let announcementText = data.Announcement || "Selamat Datang";
    setText('runningTextDisplay', announcementText); 
    setVal('adminAnnouncement', announcementText);

    // --- AKTIFKAN RUNNING TEXT DI DOM ---
    let tickerContainer = document.getElementById('tickerWrapContainer') || document.querySelector('.ticker-wrap');
    if (tickerContainer && announcementText.trim() !== "") {
    tickerContainer.classList.add('active-ticker');
    tickerContainer.style.display = 'block';
 }     
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

// =========================================================================
// SETUP FIELD FORMULIR (MENGIKUTI UI ASLI TAMOO)
// =========================================================================

function renderSetupQuestionsTable() {
    let container = document.getElementById('setupQuestionsList') || 
                    document.getElementById('setupQuestionsTableBody') ||
                    document.getElementById('questionsContainer');
                    
    let targetBtn = null;

    // Pelacakan Pintar Anti-Bocor: Cari tombol tapi batasi panjang teksnya (< 40 karakter)
    if (!container) {
        let allElements = document.querySelectorAll('button, div, a');
        for (let el of allElements) {
            let txt = el.innerText ? el.innerText.trim().toUpperCase() : "";
            // Hanya tangkap elemen tombol kecil, BUKAN elemen bungkus satu halaman penuh
            if ((txt.includes('TAMBAH FIELD') || txt.includes('+ TAMBAH')) && txt.length < 40) {
                targetBtn = el;
                break;
            }
        }

        if (targetBtn) {
            container = targetBtn.parentElement; // Jadikan bungkus tombol sebagai container
        }
    }

    // Proteksi ekstra agar tidak bocor ke Body/Atap Web
    if (!container || container.tagName === 'BODY' || container.tagName === 'HTML') {
        console.error("❌ Gagal menemukan lokasi halaman formulir yang tepat di HTML.");
        return;
    }

    // Buat wadah khusus untuk list jika belum ada
    let listWrapper = container.querySelector('.tamoo-dynamic-list-box');
    if (!listWrapper) {
        listWrapper = document.createElement('div');
        listWrapper.className = 'tamoo-dynamic-list-box';
        listWrapper.style.cssText = "margin-bottom: 20px; width: 100%; display: block;";
        
        // Taruh tepat di atas tombol "+ Tambah Field"
        if (targetBtn) {
            container.insertBefore(listWrapper, targetBtn);
        } else {
            container.insertBefore(listWrapper, container.firstChild);
        }
    }

    // Bersihkan daftar sebelum dirender ulang
    listWrapper.innerHTML = "";

    // Jika tidak ada pertanyaan, beri tahu dengan rapi
    if (!currentQuestions || currentQuestions.length === 0) {
        listWrapper.innerHTML = `<div style="text-align:center; padding: 15px; border: 1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); font-size:13px;">Belum ada field pertanyaan. Klik tombol di bawah untuk menambah.</div>`;
        return;
    }

    // Render list box seperti Gambar 2 Anda
    currentQuestions.forEach((q, index) => {
        let box = document.createElement('div');
        box.className = "setup-question-item";
        box.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #f0e6d2); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: left; width: 100%; box-sizing: border-box;";
        
        let badges = "";
        if (q.showOnTv || q.show_on_tv) badges += `<span style="background: #e6f4ea; color: #137333; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">TV</span>`;
        if (q.required) badges += `<span style="background: #fce8e6; color: #c5221f; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">Wajib</span>`;

        box.innerHTML = `
            <div style="flex-grow: 1;">
                <span style="font-weight: 600; color: var(--text-main); font-size: 14px;">${q.label}</span>
                ${badges}
                <br><small style="color: #999; font-size: 11px;">Tipe: ${q.type}</small>
            </div>
            <button type="button" onclick="deleteQuestion('${q.id}')" style="background: #fce8e6; color: #c5221f; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                <i class="fas fa-times" style="font-size: 14px;"></i>
            </button>
        `;
        listWrapper.appendChild(box);
    });
}

// BUKA MODAL POP-UP BAWAAN HTML ASLI
function addQuestion() {
    // Cek apakah HTML memiliki modal bawaan dengan ID standar
    let nativeModal = document.getElementById('modalAddField') || document.getElementById('addFieldModal');
    
    if (nativeModal) {
        // Jika ada modal bawaan asli di HTML, langsung buka modal tersebut!
        nativeModal.style.display = 'flex';
        nativeModal.classList.add('active');
    } else {
        // Fallback jika tidak ditemukan, kita perbaiki posisi CSS modal cadangan agar berada di tengah layar (Z-Index tinggi)
        let oldModal = document.getElementById('tamooModalAddField');
        if (oldModal) oldModal.remove();

        const typeOptionsHtml = `
            <option value="text">Teks Singkat</option>
            <option value="textarea">Kotak Pesan</option>
            <option value="dropdown">Pilihan (Dropdown)</option>
            <option value="radio">Pilihan (Radio Button)</option>
            <option value="checkbox">Centang (Checkbox)</option>
            <option value="date">Tanggal</option>
            <option value="number">Angka</option>
        `;

        const modalHtml = `
            <div id="tamooModalAddField" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;">
                <div class="luxury-popup" style="background: #ffffff; width: 100%; max-width: 450px; border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); position: relative; text-align: left;">
                    <h3 style="margin-top: 0; font-family: 'Playfair Display', serif; color: var(--gold-dark); border-bottom: 1px solid #f0e6d2; padding-bottom: 10px;">Tambah Field</h3>
                    <div style="margin-top: 15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600;">Label Pertanyaan</label>
                        <input type="text" id="popUpQLabel" class="form-control-custom" placeholder="..." style="width:100%; padding:10px; border:1px solid #f0e6d2; border-radius:8px;" required>
                    </div>
                    <div style="margin-top: 15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600;">Tipe Data</label>
                        <select id="popUpQType" class="form-control-custom" style="width:100%; padding:10px; border:1px solid #f0e6d2; border-radius:8px;" onchange="togglePopUpOptDisplay()">
                            ${typeOptionsHtml}
                        </select>
                    </div>
                    <div style="margin-top: 15px; display:none;" id="popUpQOptContainer">
                        <label style="display:block; margin-bottom:5px; font-weight:600;">Opsi (pisahkan dgn koma,)</label>
                        <input type="text" id="popUpQOptions" class="form-control-custom" style="width:100%; padding:10px; border:1px solid #f0e6d2; border-radius:8px;" placeholder="Contoh: VIP, Regular, VVIP">
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:20px; border-top:1px solid #f0e6d2; padding-top:15px;">
                        <label><input type="checkbox" id="popUpQTv" checked> Tampil di Layar TV</label>
                        <label><input type="checkbox" id="popUpQReq"> Wajib Diisi</label>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                        <button onclick="closeTamooPopUpModal()" style="padding:10px 20px; background:#eee; border:none; border-radius:8px; cursor:pointer;">Batal</button>
                        <button onclick="handlePopUpSave()" style="padding:10px 20px; background:var(--gold-dark, #846924); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Simpan</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

function handlePopUpSave() {
    let elTxt = document.getElementById('popUpQLabel') || document.getElementById('modalQLabel'); 
    let elType = document.getElementById('popUpQType') || document.getElementById('modalQType');
    let elOpt = document.getElementById('popUpQOptions') || document.getElementById('modalQOptions');
    let elReq = document.getElementById('popUpQReq') || document.getElementById('modalQReq');
    let elTv = document.getElementById('popUpQTv') || document.getElementById('modalQTv');

    let label = elTxt ? elTxt.value.trim() : "";
    let type = elType ? elType.value : "text";
    let optStr = elOpt ? elOpt.value.trim() : "";
    let req = elReq ? elReq.checked : false;
    let tv = elTv ? elTv.checked : true;

    if (!label) { 
        Swal.fire({ title: 'Gagal', text: 'Label pertanyaan wajib diisi!', icon: 'warning' }); 
        return; 
    }
    
    if ((type === 'dropdown' || type === 'radio' || type === 'checkbox') && !optStr) {
        Swal.fire({ title: 'Gagal', text: 'Tipe pilihan wajib mengisi kotak Opsi!', icon: 'warning' });
        return;
    }

    let id = "c_" + label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if(currentQuestions.some(q => q.id === id)) { id += "_" + Math.floor(Math.random() * 100); }

    currentQuestions.push({ id, label, type, options: optStr ? optStr.split(",") : [], showOnTv: tv, required: req });
    
    renderSetupQuestionsTable();
    closeTamooPopUpModal();
    
    Swal.fire({ title: 'Ditambahkan', text: 'Berhasil masuk list sementara! Jangan lupa klik Simpan Semua Perubahan.', icon: 'success', timer: 2000, showConfirmButton: false });
}

function closeTamooPopUpModal() {
    let nativeModal = document.getElementById('modalAddField') || document.getElementById('addFieldModal');
    if (nativeModal) {
        nativeModal.style.display = 'none';
        nativeModal.classList.remove('active');
    }
    let fallbackModal = document.getElementById('tamooModalAddField');
    if (fallbackModal) fallbackModal.remove();
}

function togglePopUpOptDisplay() {
    let elType = document.getElementById('popUpQType') || document.getElementById('modalQType');
    let container = document.getElementById('popUpQOptContainer') || document.getElementById('modalQOptContainer');
    if (container && elType) {
        let type = elType.value;
        if (type === 'dropdown' || type === 'radio' || type === 'checkbox') { 
            container.style.display = 'block'; 
        } else { 
            container.style.display = 'none'; 
        }
    }
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
async function saveAdminSettingsData() {
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
    let elType = document.getElementById('newQType');
    let container = document.getElementById('newQOptContainer') || document.getElementById('newQOptionsContainer'); // Fallback multi-ID HTML
    let type = elType ? elType.value : "text";
    
    if (container) {
        if (type === 'dropdown' || type === 'radio' || type === 'checkbox') { 
            container.style.display = 'block'; 
        } else { 
            container.style.display = 'none'; 
        }
    }
}

// =========================================================================
// SINKRONISASI TOMBOL PENGATURAN GLOBAL
// =========================================================================
// Fungsi pembantu jika HTML memanggil nama fungsi lama untuk simpan tema/global
async function saveGlobalSettings() {
    await saveAdminSettingsData();
}

function initTvMode() { 
    console.log("Layar TV Extended Aktif."); 
}
// =========================================================================
// AUDIO SOUND GENERATOR (WEB AUDIO API)
// =========================================================================
function playBeepSound(type) {
    // Cek dulu apakah suara diaktifkan di menu Setup Admin
    if (type === 'success' && !enableSoundSuccess) return;
    if (type === 'error' && !enableSoundError) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            // Suara BEEP Tinggi (Tanda Berhasil Scan)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // Nada A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'error') {
            // Suara BEEP Rendah/Ganda (Tanda Gagal / Sudah Scan)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime); // Nada A3
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {
        console.log("Audio not supported or blocked by user gesture:", e);
    }
}
// =========================================================================
// REGISTRASI TAMU MANDIRI & GENERATE QR CODE (SUPABASE)
// =========================================================================

// 1. Pemicu Utama (Tombol Formulir): Menampilkan Dialog Konfirmasi Ala App Lama
function confirmTamu() {
    Swal.fire({
        title: 'Konfirmasi',
        text: 'Simpan pendaftaran Anda?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya',
        cancelButtonText: 'Cancel',
        customClass: { 
            popup: 'luxury-popup', 
            confirmButton: 'btn-action-swal', 
            cancelButton: 'btn-action-swal' 
        }
    }).then((result) => {
        if (result.isConfirmed) {
            executeGuestRegistration(); // Jika ditekan "Ya", eksekusi pengiriman data
        }
    });
}

// Alias pendukung
function submitForm() { confirmTamu(); }
function submitGuestForm() { confirmTamu(); }

// 2. Eksekusi Pengiriman Data ke Supabase
async function executeGuestRegistration() {
    try {
        // Validasi Input Dinamis
        let formPayload = {};
        let missingRequired = false;

        currentQuestions.forEach(q => {
            let el = document.getElementById('field_' + q.id);
            let val = "";

            if (q.type === 'radio') {
                let checkedRadio = document.querySelector(`input[name="field_${q.id}"]:checked`);
                val = checkedRadio ? checkedRadio.value : "";
            } else if (q.type === 'checkbox') {
                let checkedBoxes = Array.from(document.querySelectorAll(`input[name="field_${q.id}"]:checked`)).map(cb => cb.value);
                val = checkedBoxes.join(', ');
            } else if (el) {
                val = el.value.trim();
            }

            if (q.required && !val) {
                missingRequired = true;
            }

            formPayload[q.id] = val;
        });

        if (missingRequired) {
            Swal.fire({ title: 'Mohon Lengkapi', text: 'Semua kolom bertanda bintang (*) wajib diisi!', icon: 'warning', customClass: { popup: 'luxury-popup' } });
            return;
        }

        // Tampilkan loading
        Swal.fire({ title: 'Memproses...', text: 'Mendaftarkan data & membuat QR Code', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // Generate ID Unique Tamu & Timestamp
        const timestamp = new Date().toISOString();
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const guestId = "TMO-" + Date.now().toString().slice(-6) + randomCode;
        const guestName = formPayload['nama_tamu'] || formPayload[Object.keys(formPayload)[0]] || "Tamu Undangan";

        // Masukkan Data ke Tabel data_tamu Supabase
        const insertData = {
            id: guestId,
            nama_tamu: guestName,
            kategori_tamu: formPayload['kategori_tamu'] || formPayload['kategori'] || 'Umum',
            status_kehadiran: 'BELUM_HADIR',
            status_souvenir: 'BELUM_AMBIL',
            form_data: formPayload,
            created_at: timestamp
        };

        const { data, error } = await db.from('data_tamu').insert([insertData]);
        if (error) throw error;

        // Play sound effect jika sukses
        if (typeof playBeepSound === "function") playBeepSound('success');

        // Tampilkan Pop-Up QR Code
        showQrCodeModal(guestId, guestName);

    } catch (err) {
        if (typeof playBeepSound === "function") playBeepSound('error');
        Swal.fire({ title: 'Gagal Mendaftar', text: err.message, icon: 'error', customClass: { popup: 'luxury-popup' } });
    }
}

// =========================================================================
// UI POP-UP QR CODE & GENERATOR E-TICKET (GAMBAR HD)
// =========================================================================

function showQrCodeModal(guestId, guestName) {
    const eventTitle = document.getElementById('adminEventTitle')?.value || "GUEST BOOK TICKET";
    const eventDate = document.getElementById('adminEventDate')?.value || "";
    const eventLoc = document.getElementById('adminEventLocation')?.value || "";

    Swal.fire({
        html: `
            <div style="text-align:center; padding: 5px; font-family:'Montserrat', sans-serif;">
                <h3 style="margin: 0 0 10px 0; font-family:'Playfair Display', serif; color:var(--gold-dark); letter-spacing:1px; font-size:18px;">QR CODE ANDA</h3>
                <h2 style="margin: 0 0 15px 0; font-weight:800; font-size:24px; color:#333; text-transform:uppercase;">${guestName}</h2>
                
                <div id="qrcodeDisplay" style="display:inline-block; border: 2px solid #f0e6d2; border-radius: 15px; padding: 10px; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <img id="qrImgSource" src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(guestId)}" 
                         crossorigin="anonymous" alt="QR Code" style="display:block; width:180px; height:180px;">
                </div>

                <div style="margin-top: 20px;">
                    <button onclick="downloadETicket('${guestId}', '${guestName}', '${eventTitle}', '${eventDate}', '${eventLoc}')" 
                            class="btn-action-swal" style="width:100%; border-radius:50px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:10px; padding: 12px 0;">
                        <i class="fas fa-download"></i> DOWNLOAD E-TICKET
                    </button>
                </div>
                <button onclick="Swal.close()" style="background:none; border:none; color:#aaa; font-size:12px; margin-top:15px; cursor:pointer;">Tutup</button>
            </div>
        `,
        showConfirmButton: false,
        width: '340px',
        padding: '20px',
        customClass: { popup: 'luxury-popup' }
    }).then(() => {
        // Reset Total Seluruh Isian Formulir Tanpa Sisa Teks setelah popup ditutup
        let formContainer = document.getElementById('dynamicFormContainer');
        if (formContainer) {
            let inputs = formContainer.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="date"], select, textarea');
            inputs.forEach(i => i.value = "");

            let checks = formContainer.querySelectorAll('input[type="checkbox"], input[type="radio"]');
            checks.forEach(c => c.checked = false);
        }
    });
}

async function downloadETicket(id, name, title, date, loc) {
    const btn = window.event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMPROSES...';
    btn.disabled = true;

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 850;

        // 1. Background & Border Mewah (Gold)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#846924';
        ctx.lineWidth = 15;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        // 2. Judul Acara (Tiket Digital)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#846924';
        ctx.font = 'bold 32px serif';
        ctx.fillText(title.toUpperCase(), canvas.width / 2, 110);

        // Garis Pemisah
        ctx.beginPath();
        ctx.moveTo(150, 135);
        ctx.lineTo(450, 135);
        ctx.stroke();

        // 3. Info Tanggal & Lokasi
        ctx.fillStyle = '#777';
        ctx.font = '600 18px sans-serif';
        ctx.fillText(`${date}  |  ${loc.toUpperCase()}`, canvas.width / 2, 175);

        // 4. Header Tiket
        ctx.fillStyle = '#999';
        ctx.font = '500 20px sans-serif';
        ctx.letterSpacing = "4px";
        ctx.fillText("E-TICKET PASS", canvas.width / 2, 230);
        ctx.letterSpacing = "0px";

        // 5. Nama Tamu
        ctx.fillStyle = '#222';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(name.toUpperCase(), canvas.width / 2, 300);

        // 6. Gambar QR Code
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(id)}`;
        
        await new Promise((resolve) => { qrImg.onload = resolve; });
        
        // Frame putih untuk QR
        ctx.fillStyle = '#fdfaf3';
        ctx.fillRect(150, 360, 300, 300);
        ctx.drawImage(qrImg, 175, 385, 250, 250);

        // 7. Footer & Instruksi
        ctx.fillStyle = '#888';
        ctx.font = 'italic 16px sans-serif';
        ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 730);

        ctx.fillStyle = '#846924';
        ctx.font = 'bold 24px sans-serif';
        ctx.letterSpacing = "5px";
        ctx.fillText("RAMATLOKA", canvas.width / 2, 800);

        // 8. Proses Download
        const link = document.createElement('a');
        link.download = `Tiket-${name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        Swal.fire({ title: 'Tersimpan!', text: 'Tiket berhasil diunduh ke perangkat Anda.', icon: 'success', timer: 1500, showConfirmButton: false });

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal Download', 'Terjadi kesalahan saat membuat gambar tiket.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function downloadETicket(id, name, title, date, loc) {
    const btn = window.event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMPROSES...';
    btn.disabled = true;

    try {
        // Buat Canvas (Ukuran Portrait HD)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 850;

        // 1. Background & Border Mewah (Gold)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#846924';
        ctx.lineWidth = 15;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        // 2. Judul Acara (Tiket Digital)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#846924';
        ctx.font = 'bold 32px serif';
        ctx.fillText(title.toUpperCase(), canvas.width / 2, 110);

        // Garis Pemisah
        ctx.beginPath();
        ctx.moveTo(150, 135);
        ctx.lineTo(450, 135);
        ctx.stroke();

        // 3. Info Tanggal & Lokasi
        ctx.fillStyle = '#777';
        ctx.font = '600 18px sans-serif';
        ctx.fillText(`${date}  |  ${loc.toUpperCase()}`, canvas.width / 2, 175);

        // 4. Header Tiket
        ctx.fillStyle = '#999';
        ctx.font = '500 20px sans-serif';
        ctx.letterSpacing = "4px";
        ctx.fillText("E-TICKET PASS", canvas.width / 2, 230);
        ctx.letterSpacing = "0px";

        // 5. Nama Tamu
        ctx.fillStyle = '#222';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(name.toUpperCase(), canvas.width / 2, 300);

        // 6. Gambar QR Code
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        // Gunakan ukuran lebih besar untuk hasil download yang tajam
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(id)}`;
        
        await new Promise((resolve) => { qrImg.onload = resolve; });
        
        // Frame putih untuk QR
        ctx.fillStyle = '#fdfaf3';
        ctx.fillRect(150, 360, 300, 300);
        ctx.drawImage(qrImg, 175, 385, 250, 250);

        // 7. Footer & Instruksi
        ctx.fillStyle = '#888';
        ctx.font = 'italic 16px sans-serif';
        ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 730);

        ctx.fillStyle = '#846924';
        ctx.font = 'bold 24px sans-serif';
        ctx.letterSpacing = "5px";
        ctx.fillText("RAMATLOKA", canvas.width / 2, 800);

        // 8. Proses Download
        const link = document.createElement('a');
        link.download = `Tiket-${name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        Swal.fire({ title: 'Tersimpan!', text: 'Tiket berhasil diunduh ke perangkat Anda.', icon: 'success', timer: 1500, showConfirmButton: false });

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal Download', 'Terjadi kesalahan saat membuat gambar tiket.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
    // =========================================================================
// =========================================================================
// ENGINE PROCESSOR CHECK-IN TAMU (SUPABASE)
// =========================================================================

// Pembersih Input Manual Global
function clearManualInput() {
    let activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === 'INPUT') {
        activeEl.value = "";
    }
    
    let inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(i => {
        if (i.id.includes('Scan') || i.id.includes('Qr') || i.placeholder?.includes('ID') || i.placeholder?.includes('manual')) {
            i.value = "";
        }
    });
}

// FUNGSI 1: Eksekusi Utama Check-in ke Supabase (Wajib Async)
async function processGuestCheckIn(guestId) {
    if (!guestId || guestId.trim() === "") return;
    
    const cleanId = guestId.trim();
    
    // Bersihkan kolom input langsung saat proses dimulai
    clearManualInput();

    try {
        Swal.fire({ title: 'Memverifikasi...', text: 'Mengecek kode QR tamu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // 1. Ambil data tamu berdasarkan ID dari Supabase
        const { data: guest, error: fetchError } = await db.from('data_tamu').select('*').eq('id', cleanId).maybeSingle();
        
        if (fetchError) throw fetchError;
        
        // JIKA TAMU TIDAK DITEMUKAN
        if (!guest) {
            if (typeof playBeepSound === "function") playBeepSound('error');
            Swal.fire({ title: 'Scan Gagal', text: `ID Tamu (${cleanId}) tidak terdaftar di sistem!`, icon: 'error', customClass: { popup: 'luxury-popup' } });
            clearManualInput();
            return;
        }

        // JIKA TAMU SUDAH PERNAH CHECK-IN
        if (guest.status_kehadiran === 'HADIR') {
            if (typeof playBeepSound === "function") playBeepSound('error');
            Swal.fire({ 
                title: 'Sudah Hadir', 
                html: `<b style="font-size:18px; color:var(--gold-dark);">${guest.nama_tamu}</b><br><br>Telah melakukan check-in pada:<br><b>${new Date(guest.waktu_hadir).toLocaleString('id-ID')}</b>`, 
                icon: 'warning', 
                customClass: { popup: 'luxury-popup' } 
            });
            clearManualInput();
            return;
        }

        // 2. Update Status Kehadiran Tamu menjadi HADIR di Supabase
        const timestamp = new Date().toISOString();
        const { error: updateError } = await db.from('data_tamu').update({
            status_kehadiran: 'HADIR',
            waktu_hadir: timestamp
        }).eq('id', cleanId);

        if (updateError) throw updateError;

        // Bunyikan Bell Sukses Check-in!
        if (typeof playBeepSound === "function") playBeepSound('success');

        // 3. Tampilkan Pop-Up Selamat Datang Mewah
        Swal.fire({
            title: 'BERHASIL CHECK-IN',
            html: `
                <div style="text-align:center; padding:5px;">
                    <h1 style="margin:10px 0; font-family:'Playfair Display', serif; color:var(--gold-dark); font-size:28px;">Selamat Datang</h1>
                    <h2 style="margin:0 0 10px 0; font-weight:800; text-transform:uppercase; color:#222;">${guest.nama_tamu}</h2>
                    <span style="background:#e6f4ea; color:#137333; font-weight:bold; padding:5px 15px; border-radius:50px; font-size:13px;">
                        ${guest.kategori_tamu || 'Tamu Undangan'}
                    </span>
                </div>
            `,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            customClass: { popup: 'luxury-popup' }
        });

        clearManualInput();
        
        if (typeof loadForm === "function") loadForm();

    } catch (err) {
        if (typeof playBeepSound === "function") playBeepSound('error');
        Swal.fire({ title: 'Sistem Error', text: err.message, icon: 'error', customClass: { popup: 'luxury-popup' } });
        clearManualInput();
    }
}

// FUNGSI 2: Jembatan Input Ketik Manual / USB Barcode Scanner
// (Mencari elemen input manual bawaan HTML Anda dan mendengarkan tombol Enter)
function initManualScannerBridge() {
    let inputManual = document.getElementById('manualScanInput') || 
                       document.getElementById('inputQrCode') || 
                       document.querySelector('input[placeholder*="Ketik ID"], input[placeholder*="Scan manual"]');
                       
    if (inputManual) {
        // Jika petugas menekan Enter (atau USB Scanner menembak kode)
        inputManual.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                processGuestCheckIn(this.value);
            }
        });
    }
}

function resetManualScanInput() {
    let inputManual = document.getElementById('manualScanInput') || 
                       document.getElementById('inputQrCode') || 
                       document.querySelector('input[placeholder*="Ketik ID"], input[placeholder*="Scan manual"]');
    if (inputManual) {
        inputManual.value = "";
        inputManual.focus(); // Selalu fokuskan kembali agar USB scanner stand-by
    }
}

// Jalankan bridge pencarian input manual saat script termuat
setTimeout(initManualScannerBridge, 1000);

// =========================================================================
// HANDLER KAMERA WEBCAM & HP (NATIVE VIDEO CANVAS + jsQR SCANNER)
// =========================================================================

let cameraMediaStream = null;
let cameraScanAnimationId = null;
let currentFacingMode = "environment"; // Default kamera belakang

async function openCameraModal() {
    Swal.fire({
        title: 'Scan QR Code Tamu',
        html: `
            <div style="text-align:center; padding: 5px;">
                <div style="margin-bottom: 10px;">
                    <button id="btnSwitchCamera" type="button" style="background: #f4f4f5; color: #333; border: 1px solid #ccc; padding: 6px 14px; font-size: 11px; border-radius: 20px; font-weight: bold; cursor: pointer;">
                        🔄 Ganti Kamera
                    </button>
                </div>

                <div style="position: relative; width: 100%; max-width: 280px; height: 240px; margin: 0 auto; background: #000; border-radius: 12px; overflow: hidden; border: 2px solid var(--gold-dark, #846924); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <video id="nativeWebcamVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
                    
                    <canvas id="qrScanCanvas" style="display: none;"></canvas>

                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 160px; height: 160px; border: 2px solid #fff; border-radius: 10px; box-shadow: 0 0 0 2000px rgba(0,0,0,0.4); pointer-events: none;"></div>
                </div>
                
                <p style="font-size: 11px; color: #777; margin-top: 10px;">Arahkan kamera tepat ke QR Code milik tamu</p>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: '340px',
        padding: '15px',
        customClass: { popup: 'luxury-popup' },
        didOpen: () => {
            const btnSwitch = document.getElementById('btnSwitchCamera');
            const videoEl = document.getElementById('nativeWebcamVideo');
            const canvasEl = document.getElementById('qrScanCanvas');
            const canvasCtx = canvasEl ? canvasEl.getContext('2d') : null;

            // 1. Fungsi Menyalakan Stream Kamera
            const startNativeCamera = async (facingMode) => {
                stopCameraStream(); // Hentikan stream & animasi lama

                try {
                    cameraMediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
                    });

                    if (videoEl && cameraMediaStream) {
                        videoEl.srcObject = cameraMediaStream;
                        await videoEl.play();

                        // Mulai loop pemindaian QR begitu video aktif
                        requestAnimationFrame(scanQrFrame);
                    }
                } catch (err) {
                    console.error("Gagal membuka kamera:", err);
                }
            };

            // 2. Loop Pemindai QR Real-time (Menggunakan jsQR)
            const scanQrFrame = () => {
                if (!videoEl || videoEl.paused || videoEl.ended || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
                    cameraScanAnimationId = requestAnimationFrame(scanQrFrame);
                    return;
                }

                if (canvasEl && canvasCtx) {
                    canvasEl.height = videoEl.videoHeight;
                    canvasEl.width = videoEl.videoWidth;
                    canvasCtx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

                    const imageData = canvasCtx.getImageData(0, 0, canvasEl.width, canvasEl.height);
                    
                    // Ekstrak QR Code jika jsQR tersedia
                    if (typeof jsQR !== "undefined") {
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });

                        if (code && code.data) {
                            // BILA QR CODE TERBACA:
                            stopCameraStream();
                            Swal.close();
                            processGuestCheckIn(code.data); // Eksekusi Check-In Supabase
                            return;
                        }
                    }
                }

                cameraScanAnimationId = requestAnimationFrame(scanQrFrame);
            };

            // Jalankan kamera pertama kali
            startNativeCamera(currentFacingMode);

            // Handler Tombol Switch Kamera
            if (btnSwitch) {
                btnSwitch.addEventListener('click', () => {
                    currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
                    startNativeCamera(currentFacingMode);
                });
            }
        },
        willClose: () => {
            stopCameraStream();
        }
    });
}

// Fungsi Pembantu Mematikan Kamera Secara Total
function stopCameraStream() {
    if (cameraScanAnimationId) {
        cancelAnimationFrame(cameraScanAnimationId);
        cameraScanAnimationId = null;
    }
    if (cameraMediaStream) {
        try {
            cameraMediaStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
        cameraMediaStream = null;
    }
}

// 2. FUNGSI UPLOAD FILE GAMBAR QR (DIBERSIHKAN DARI ERROR UNDEFINED)
async function handleNativeCamera(eventOrElement) {
    let file = null;

    // Aman menangkap file baik dikirim berupa event, input element, atau dipanggil manual
    if (eventOrElement && eventOrElement.target && eventOrElement.target.files) {
        file = eventOrElement.target.files[0];
    } else if (eventOrElement && eventOrElement.files) {
        file = eventOrElement.files[0];
    } else {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput && fileInput.files) file = fileInput.files[0];
    }

    if (!file) return;

    Swal.fire({ 
        title: 'Membaca Gambar...', 
        text: 'Mengecek kode QR dari file...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    try {
        if (typeof Html5Qrcode !== "undefined") {
            const html5QrCode = new Html5Qrcode("reader" || "temp-reader");
            const decodedText = await html5QrCode.scanFile(file, true);
            
            Swal.close();
            processGuestCheckIn(decodedText);
        } else {
            throw new Error("Library Html5Qrcode tidak ditemukan.");
        }
    } catch (err) {
        if (typeof playBeepSound === "function") playBeepSound('error');
        Swal.fire({ 
            title: 'Gagal Membaca QR', 
            text: 'Tidak dapat menemukan QR Code yang valid pada gambar tersebut.', 
            icon: 'error', 
            customClass: { popup: 'luxury-popup' } 
        });
    } finally {
        // Reset nilai input file agar bisa upload file yang sama jika diperlukan
        let inputs = document.querySelectorAll('input[type="file"]');
        inputs.forEach(i => i.value = "");
    }
}

// 3. FUNGSI SCAN MANUAL / USB BARCODE SCANNER (GLOBAL DETECT)
function submitManualCheckIn() {
    // Ambil elemen yang sedang aktif/fokus saat tombol Enter ditekan
    let activeEl = document.activeElement;
    let targetValue = "";

    // Coba deteksi elemen input manual dengan berbagai pendekatan
    let inputManual = document.getElementById('manualScanInput') || 
                       document.getElementById('inputQrCode') || 
                       document.getElementById('scanInput') ||
                       document.querySelector('input[placeholder*="ID"]') ||
                       document.querySelector('input[placeholder*="manual"]');

    if (activeEl && activeEl.tagName === 'INPUT' && activeEl.value.trim() !== "") {
        targetValue = activeEl.value.trim();
    } else if (inputManual && inputManual.value.trim() !== "") {
        targetValue = inputManual.value.trim();
    }

    if (targetValue !== "") {
        console.log("Memproses check-in manual untuk ID:", targetValue);
        processGuestCheckIn(targetValue);
    } else {
        Swal.fire({ 
            title: 'Input Kosong', 
            text: 'Silakan ketik atau tempel Kode ID Tamu terlebih dahulu.', 
            icon: 'warning',
            customClass: { popup: 'luxury-popup' }
        });
    }
}

// PENDENGAR GLOBAL: Tidak peduli ID-nya apa, selama dia elemen input di halaman scanner dan ditekan Enter
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        let activeEl = document.activeElement;
        // Pastikan kursor memang lagi ada di dalam kotak input teks
        if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'text') {
            e.preventDefault(); // Hentikan reload halaman bawaan form browser
            submitManualCheckIn();
        }
    }
});
// =========================================================================
// MODUL REKAPITULASI TAMU (UI VERSI AWAL + LIVE FILTERING SECARA A-Z)
// =========================================================================

// Variable Global untuk menyimpan cache data tamu agar filter cepat tanpa request ulang ke server
let rawGuestDataCache = [];

async function loadGuestRecapTable() {
    const ticker = document.getElementById('tickerWrapContainer');
    if (ticker) ticker.style.display = 'none';

    const tableBody = document.getElementById('guestTableBody') || 
                      document.getElementById('rekapTableBody') || 
                      document.querySelector('#rekapTable tbody');
    
    if (!tableBody) return;

    try {
        if (typeof db === "undefined" || !db) return;

        // Tarik seluruh data dari tabel Supabase (diurutkan A-Z)
        const { data: guests, error } = await db
            .from('data_tamu')
            .select('*')
            .order('nama_tamu', { ascending: true });

        if (error) throw error;

        // Simpan ke cache global
        rawGuestDataCache = guests || [];

        // Jalankan filter pertama kali untuk merender data ke tabel
        applyFilters();

    } catch (err) {
        console.error("Gagal memuat rekap data_tamu:", err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc2626;">Gagal mengambil data dari server.</td></tr>`;
        }
    }
}

// =========================================================================
// FUNGSI LOGIKA FILTER & PENCARIAN REKAPITULASI TAMU (REAL-TIME RENDERING)
// =========================================================================
function applyFilters() {
    const tableBody = document.getElementById('guestTableBody') || 
                      document.getElementById('rekapTableBody') || 
                      document.querySelector('#rekapTable tbody');

    if (!tableBody) return;

    // 1. Ambil nilai dari input pencarian & dropdown filter
    const searchVal = (document.getElementById('searchRekapInput')?.value || '').toLowerCase().trim();
    const filterKatVal = document.getElementById('filterKategori')?.value || 'ALL';
    const filterStatVal = document.getElementById('filterStatus')?.value || 'ALL';
    const filterSouvVal = document.getElementById('filterSouvenir')?.value || 'ALL';

    // 2. Terapkan Logika Penyaringan pada Data Cache
    const filteredGuests = rawGuestDataCache.filter(guest => {
        // A. Filter Nama Tamu
        const namaTamu = (guest.nama_tamu || '').toLowerCase();
        const matchNama = !searchVal || namaTamu.includes(searchVal);

        // B. Filter Kategori (VIP / Reguler)
        let rawKategori = (guest.kategori_tamu || 'Reguler').toUpperCase();
        if (rawKategori === 'UMUM') rawKategori = 'REGULER';
        
        let matchKategori = true;
        if (filterKatVal !== 'ALL') {
            const targetKat = filterKatVal.toUpperCase();
            matchKategori = rawKategori.includes(targetKat);
        }

        // C. Filter Status Kehadiran (Hadir / Belum Hadir)
        const isHadir = guest.status_kehadiran === 'HADIR';
        let matchStatus = true;
        if (filterStatVal === 'Hadir') matchStatus = isHadir;
        else if (filterStatVal === 'Belum Hadir') matchStatus = !isHadir;

        // D. Filter Souvenir (Sudah Ambil / Belum Ambil)
        const isSouvenir = guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL';
        let matchSouvenir = true;
        if (filterSouvVal === 'Sudah Ambil') matchSouvenir = isSouvenir;
        else if (filterSouvVal === 'Belum Ambil') matchSouvenir = !isSouvenir;

        return matchNama && matchKategori && matchStatus && matchSouvenir;
    });

    // 3. Update Kartu Ringkasan Statistik berdasarkan data yang terfilter
    if (typeof updateRekapSummaryCards === "function") {
        updateRekapSummaryCards(filteredGuests);
    }

    // 4. Jika Data Tidak Ditemukan setelah difilter
    if (filteredGuests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 25px; color: #888; font-weight: 600;">
                    <i class="fas fa-search" style="margin-right: 8px; color: #b39343;"></i>
                    Tidak ada data tamu yang cocok dengan filter.
                </td>
            </tr>
        `;
        return;
    }

    // 5. Render Baris Tabel Hasil Filter
    tableBody.innerHTML = filteredGuests.map((guest) => {
        const namaTamu = guest.nama_tamu || '-';
        const jumlahOrang = guest.jumlah_aktual || 1;
        
        let rawKategori = guest.kategori_tamu || 'Reguler';
        if (rawKategori.toLowerCase() === 'umum') rawKategori = 'Reguler';
        const kategoriTamu = rawKategori.toUpperCase();

        const isHadir = guest.status_kehadiran === 'HADIR';
        const isSouvenir = guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL';

        let katBadge = `<span style="background: #f1f3f4; color: #5f6368; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">${kategoriTamu}</span>`;
        if (kategoriTamu === 'VIP' || kategoriTamu === 'TAMU VIP') {
            katBadge = `<span style="background: #fef08a; color: #854d0e; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;"><i class="fas fa-crown"></i> VIP</span>`;
        }

        const hadirBadge = isHadir 
            ? `<span style="background: #e6f4ea; color: #137333; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">HADIR</span>`
            : `<span style="background: #fce8e6; color: #c5221f; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">BELUM HADIR</span>`;

        const souvBadge = isSouvenir
            ? `<span style="background: #e8f0fe; color: #1967d2; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">SOUVENIR: SUDAH AMBIL</span>`
            : `<span style="background: #f1f3f4; color: #5f6368; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">SOUVENIR: BELUM AMBIL</span>`;

        const aksiHtml = `
            <i class="fas fa-user-edit" 
               onclick="toggleGuestAttendance('${guest.id}', '${guest.status_kehadiran}')" 
               style="color: #1967d2; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Ubah Status Kehadiran"></i>
            <i class="fas fa-qrcode" 
               onclick="viewGuestQr('${guest.id}')" 
               style="color: #333; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Lihat & Download QR Code"></i>
            <i class="fas fa-print" 
               onclick="printGuestTicket('${guest.id}')" 
               style="color: #1967d2; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Cetak E-Ticket"></i>
            <i class="fas fa-crown" 
               onclick="toggleGuestVipStatus('${guest.id}', '${guest.kategori_tamu || 'Reguler'}')" 
               style="color: #b39343; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Ubah Kategori (VIP/Reguler)"></i>
            <i class="fab fa-whatsapp" style="color: #137333; cursor: pointer; margin: 0 5px; font-size: 14px;" title="Kirim WA"></i>
        `;

        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="text-align: center; padding: 15px 10px;">
                    <input type="checkbox" class="chk-select-guest" value="${guest.id}" style="transform: scale(1.2); cursor: pointer;">
                </td>
                <td style="padding: 15px 10px;">
                    <div style="font-weight: 800; color: #333; font-size: 0.95rem; margin-bottom: 4px;">${namaTamu}</div>
                    <div style="color: #b39343; font-weight: 800; font-size: 0.75rem;">
                        <i class="fas fa-user-friends"></i> ${jumlahOrang} Orang
                    </div>
                </td>
                <td style="padding: 15px 10px; vertical-align: middle;">
                    ${katBadge}
                </td>
                <td style="padding: 15px 10px;">
                    <div style="margin-bottom: 6px;">${hadirBadge}</div>
                    <div>${souvBadge}</div>
                </td>
                <td style="text-align: center; padding: 15px 10px; vertical-align: middle; white-space: nowrap;">
                    ${aksiHtml}
                </td>
            </tr>
        `;
    }).join('');
}
// =========================================================================
// FUNGSI PEMBANTU: UPDATE ANGKA KARTU STATISTIK (DIPERBAIKI)
// =========================================================================
function updateRekapSummaryCards(guests) {
    // Hitung berdasarkan kepala (jumlah_aktual)
    const totalTamu = guests.reduce((sum, g) => sum + (parseInt(g.jumlah_aktual) || 1), 0);
    
    // Hitung yang hadir saja
    const totalHadir = guests
        .filter(g => g.status_kehadiran === 'HADIR')
        .reduce((sum, g) => sum + (parseInt(g.jumlah_aktual) || 1), 0);
    
    // Hitung yang sudah ambil souvenir
    const totalSouvenir = guests
        .filter(g => g.status_souvenir === 'SUDAH_AMBIL' || g.status_souvenir === 'SUDAH AMBIL')
        .length; // Jika souvenir dihitung 1 per nama/baris

    // Targetkan ID dari index.html Anda
    const elTotal = document.getElementById('rekapTotalTerdaftar');
    const elHadir = document.getElementById('rekapTotalHadir');
    const elSouvenir = document.getElementById('rekapTotalSouvenir');

    // Update angkanya di layar
    if (elTotal) elTotal.innerText = totalTamu;
    if (elHadir) elHadir.innerText = totalHadir;
    if (elSouvenir) elSouvenir.innerText = totalSouvenir;
}

// =========================================================================
// MODUL TAMBAH TAMU MANUAL (MODAL FORM FORMULIR)
// =========================================================================
async function openAddGuestModal() {
    const { value: formValues } = await Swal.fire({
        title: '<h2 style="font-family: \'Playfair Display\', serif; color: #846924; margin:0; font-weight: 900;">TAMBAH TAMU MANUAL</h2>',
        html: `
            <div style="text-align: left; font-family: 'Montserrat', sans-serif; font-size: 0.85rem; padding-top: 10px;">
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Nama Tamu</label>
                <input id="swal-input-nama" class="swal2-input" placeholder="Masukkan nama..." style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; box-sizing: border-box;">
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Institusi</label>
                <select id="swal-input-institusi" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
                    <option value="Civitas SMKN 10 Bandung">Civitas SMKN 10 Bandung</option>
                    <option value="Umum">Umum</option>
                </select>
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Asal (bila anda memilih umum diatas)</label>
                <input id="swal-input-asal" class="swal2-input" placeholder="Kota/Instansi..." style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; box-sizing: border-box;">
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Jumlah tamu hadir (termasuk anda)</label>
                <select id="swal-input-jumlah" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    <option value="4">4</option><option value="5">5</option>
                </select>

                <hr style="border: 0; border-top: 2px dashed #eee; margin: 25px 0 20px 0;">

                <label style="font-weight: 900; color: #846924; display: block; margin-bottom: 5px;">KATEGORI TAMU</label>
                <select id="swal-input-kategori" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 2px solid #846924; font-weight: bold; color: #846924; border-radius: 6px; box-sizing: border-box;">
                    <option value="Reguler">Tamu Reguler</option>
                    <option value="VIP">Tamu VIP</option>
                </select>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Buat & Tampilkan QR',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#b39343',
        cancelButtonColor: '#b39343',
        width: '450px',
        preConfirm: () => {
            const nama = document.getElementById('swal-input-nama').value;
            const institusi = document.getElementById('swal-input-institusi').value;
            const asal = document.getElementById('swal-input-asal').value;
            const jumlah = document.getElementById('swal-input-jumlah').value;
            const kategori = document.getElementById('swal-input-kategori').value;
            
            if (!nama) {
                Swal.showValidationMessage('Nama tamu wajib diisi!');
                return false;
            }
            return { nama, institusi, asal, jumlah, kategori };
        }
    });

    if (formValues) saveNewGuestManual(formValues);
}

// =========================================================================
// MODUL TAMBAH TAMU MANUAL (DINAMIS DARI TABEL form_settings)
// =========================================================================

async function openAddGuestModal() {
    // 1. Tampilkan indicator loading sebentar saat mengambil opsi dari Supabase
    Swal.fire({ 
        title: 'Memuat Form...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    // Opsi default jika koneksi/data di Supabase belum terbaca
    let optionsJumlahArray = ['1', '2', '3'];

    try {
        if (typeof db !== "undefined" && db) {
            // Tarik data konfigurasi form dari tabel 'form_settings'
            const { data: formSettings, error } = await db.from('form_settings').select('*').limit(1);

            if (!error && formSettings && formSettings.length > 0) {
                // Ambil data dari kolom c_jumlah_tamu_termasuk_anda
                const rawJumlahData = formSettings[0].c_jumlah_tamu_termasuk_anda;

                if (rawJumlahData) {
                    // Jika datanya berbentuk Array (misal: ['1','2','3'])
                    if (Array.isArray(rawJumlahData)) {
                        optionsJumlahArray = rawJumlahData;
                    } 
                    // Jika datanya berbentuk Teks/String terpisah koma (misal: "1,2,3" atau "1, 2, 3")
                    else if (typeof rawJumlahData === 'string') {
                        optionsJumlahArray = rawJumlahData.split(',').map(item => item.trim());
                    }
                }
            }
        }
    } catch (err) {
        console.warn("Gagal mengambil form_settings, menggunakan default 1-3:", err);
    }

    // Buat HTML elemen <option> secara dinamis berdasarkan data Supabase
    const dynamicOptionsHtml = optionsJumlahArray
        .map(val => `<option value="${val}">${val}</option>`)
        .join('');

    // 2. Tutup loading dan Tampilkan Form Tambah Tamu
    Swal.close();

    const { value: formValues } = await Swal.fire({
        title: '<h2 style="font-family: \'Playfair Display\', serif; color: #846924; margin:0; font-weight: 900;">TAMBAH TAMU MANUAL</h2>',
        html: `
            <div style="text-align: left; font-family: 'Montserrat', sans-serif; font-size: 0.85rem; padding-top: 10px;">
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Nama Tamu</label>
                <input id="swal-input-nama" class="swal2-input" placeholder="Masukkan nama..." style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; box-sizing: border-box;">
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Institusi</label>
                <select id="swal-input-institusi" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
                    <option value="Civitas SMKN 10 Bandung">Civitas SMKN 10 Bandung</option>
                    <option value="Umum">Umum</option>
                </select>
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Asal (bila anda memilih umum diatas)</label>
                <input id="swal-input-asal" class="swal2-input" placeholder="Kota/Instansi..." style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; box-sizing: border-box;">
                
                <label style="font-weight: 800; color: #777; display: block; margin-bottom: 5px;">Jumlah tamu hadir (termasuk anda)</label>
                <select id="swal-input-jumlah" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
                    ${dynamicOptionsHtml}
                </select>

                <hr style="border: 0; border-top: 2px dashed #eee; margin: 25px 0 20px 0;">

                <label style="font-weight: 900; color: #846924; display: block; margin-bottom: 5px;">KATEGORI TAMU</label>
                <select id="swal-input-kategori" class="swal2-select" style="width: 100%; margin: 0 0 15px 0; height: 42px; font-size: 0.9rem; border: 2px solid #846924; font-weight: bold; color: #846924; border-radius: 6px; box-sizing: border-box;">
                    <option value="Reguler">Tamu Reguler</option>
                    <option value="VIP">Tamu VIP</option>
                </select>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Buat & Tampilkan QR',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#b39343',
        cancelButtonColor: '#b39343',
        width: '450px',
        preConfirm: () => {
            const nama = document.getElementById('swal-input-nama').value;
            const institusi = document.getElementById('swal-input-institusi').value;
            const asal = document.getElementById('swal-input-asal').value;
            const jumlah = document.getElementById('swal-input-jumlah').value;
            const kategori = document.getElementById('swal-input-kategori').value;
            
            if (!nama) {
                Swal.showValidationMessage('Nama tamu wajib diisi!');
                return false;
            }
            return { nama, institusi, asal, jumlah, kategori };
        }
    });

    if (formValues) saveAndGenerateTicketManual(formValues);
}

// 2. Fungsi Utama Eksekusi Simpan & Langsung Generate Tiket
async function saveAndGenerateTicketManual(data) {
    // Tampilkan loading screen sementara
    Swal.fire({ title: 'Menyimpan & Membuat Tiket...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terkoneksi.");

        // A. Generate ID unik untuk QR Code (Contoh: TMO-169800000)
        const newIdForQr = "TMO-" + Date.now();
        
        // B. Buat objek data baru yang akan dikirim ke Supabase tabel data_tamu
        const guestDataToSave = {
            id: newIdForQr,
            nama_tamu: data.nama,
            kategori_tamu: data.kategori, // VIP atau Reguler
            jumlah_aktual: parseInt(data.jumlah),
            status_kehadiran: 'BELUM_HADIR',
            status_souvenir: 'BELUM_AMBIL',
            // Kita simpan institusi/asal di kolom keterangan_tambahan sebagai JSON
            keterangan_tambahan: JSON.stringify({ institusi: data.institusi, asal: data.asal })
        };

        // C. Eksekusi simpan ke database tabel data_tamu
        const { error } = await db.from('data_tamu').insert([guestDataToSave]);
        
        if (error) throw error;
        
        // D. SUKSES SIMPAN: Langsung generate tiket dan tampilkan modal hasil (Persis alur Versi Awal)
        // Kita tutup modal loading, lalu panggil modal sukses
        Swal.close();
        showGeneratedQrCard(guestDataToSave);
        
    } catch (err) {
        console.error("Gagal simpan/generate manual:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan data atau membuat tiket.', 'error');
    }
}

// 3. Fungsi Menampilkan Modal "QR Code Anda" (Tampilan seperti Gambar 8)
async function showGeneratedQrCard(guestData) {
    // Tentukan Judul Dinamis: Poin 2 Wajib Tercantum "(VIP)" jika kategori VIP
    const isVip = guestData.kategori_tamu.toUpperCase() === 'VIP';
    const dynamicTitleName = guestData.nama_tamu + (isVip ? ' (VIP)' : '');
    
    // Gunakan SweetAlert2 untuk membuat kartu UI mengambang (seperti Gambar 8)
    Swal.fire({
        html: `
            <div id="swalGeneratedQrCard" style="text-align: center; font-family: 'Playfair Display', serif; background: #fff; padding: 10px; position: relative;">
                
                <i class="fas fa-times" onclick="Swal.close()" style="position: absolute; top: 10px; right: 10px; color: #ccc; cursor: pointer; font-size: 1.2rem;"></i>

                <h2 style="color: #846924; font-weight: 900; margin-top: 15px; margin-bottom: 5px;">QR CODE ANDA</h2>
                <h1 style="color: #846924; font-weight: 900; margin-top: 0; margin-bottom: 25px; font-size: 1.8rem;">${dynamicTitleName}</h1>

                <div id="swalQrCanvasWrapper" style="display: inline-block; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"></div>
                
                <br>

                <button id="btnDownloadTicket" class="swal2-confirm swal2-styled" style="background-color: #b39343; color: white; border-radius: 25px; padding: 12px 25px; font-family: 'Montserrat', sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 0.8rem; border: none;">
                    <i class="fas fa-download"></i> DOWNLOAD E-TICKET
                </button>
            </div>
        `,
        showConfirmButton: false, // Kita buat tombol confirm sendiri agar mirip Gambar 8
        width: '400px',
        background: '#fff',
        padding: '15px',
        didOpen: () => {
            // A. Generate Gambar QR ke dalam wrapper modal menggunakan library qrcodejs yang baru ditambahkan
            const qrWrapper = document.getElementById('swalQrCanvasWrapper');
            new QRCode(qrWrapper, {
                text: guestData.id, // Isi QR adalah ID unik tamu (misal: TMO-169800000)
                width: 180,
                height: 180,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // B. Event Listener untuk Tombol Download
            document.getElementById('btnDownloadTicket').addEventListener('click', () => {
                generateAndDownloadTicket(guestData);
            });
        },
        willClose: () => {
            // Refresh ulang tabel rekap di latar belakang agar data baru VIP terlihat
            if (typeof loadGuestRecapTable === "function") loadGuestRecapTable();
        }
    });
}

// 4. Fungsi Utama Membuat File PNG E-Ticket Utuh (Dinamis + Auto Close Popup)
function generateAndDownloadTicket(guestData) {
    const rawEventName = document.getElementById('adminEventName')?.value || 'NAMA ACARA BELUM DISET';
    const rawEventDate = document.getElementById('adminEventDate')?.value || 'TANGGAL';
    const rawEventLocation = document.getElementById('adminEventLocation')?.value || 'LOKASI';
    
    const eventNameText = rawEventName.toUpperCase();
    const eventSubText = `${rawEventDate} | ${rawEventLocation}`.toUpperCase();

    const isVip = guestData.kategori_tamu.toUpperCase() === 'VIP';
    const nameOnTicket = guestData.nama_tamu + (isVip ? ' (VIP)' : '');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 800;

    // Background & Bingkai Emas
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#b39343"; ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header Judul Acara (Auto Resize)
    ctx.fillStyle = "#846924"; 
    ctx.textAlign = "center";
    
    let fontSizeTitle = 45; 
    ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
    while (ctx.measureText(eventNameText).width > 520 && fontSizeTitle > 16) {
        fontSizeTitle -= 2;
        ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
    }
    ctx.fillText(eventNameText, canvas.width/2, 100);

    // Sub-Judul (Tanggal | Lokasi)
    ctx.fillStyle = "#333";
    let fontSizeSub = 18;
    ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
    while (ctx.measureText(eventSubText).width > 520 && fontSizeSub > 10) {
        fontSizeSub -= 1;
        ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
    }
    ctx.fillText(eventSubText, canvas.width/2, 160);

    // E-Ticket Pass
    ctx.fillStyle = "#777";
    ctx.font = "800 24px 'Montserrat'";
    ctx.fillText("E - T I C K E T   P A S S", canvas.width/2, 220);

    // Nama Tamu
    ctx.fillStyle = "#333";
    let fontSizeName = 42;
    ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
    while (ctx.measureText(nameOnTicket).width > 520 && fontSizeName > 20) {
        fontSizeName -= 2;
        ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
    }
    ctx.fillText(nameOnTicket, canvas.width/2, 300);

    // Gambar QR Code
    const qrWrapper = document.getElementById('swalQrCanvasWrapper');
    const qrImageSource = qrWrapper ? qrWrapper.querySelector('img') : null;

    if (qrImageSource && qrImageSource.complete && qrImageSource.src) {
        ctx.drawImage(qrImageSource, canvas.width/2 - 100, 360, 200, 200);
    } else {
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, { text: guestData.id, width: 200, height: 200 });
        const tempImg = tempDiv.querySelector('img');
        if (tempImg && tempImg.src) {
             ctx.drawImage(tempImg, canvas.width/2 - 100, 360, 200, 200);
        }
    }

    // Footer Teks
    ctx.fillStyle = "#777";
    ctx.font = "600 14px 'Montserrat'";
    ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width/2, 620);

    ctx.fillStyle = "#846924";
    ctx.font = "800 22px 'Montserrat'";
    ctx.fillText("R A M A T L O K A", canvas.width/2, 680);

    // Process Download File PNG & Auto Close Popup
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const safeName = guestData.nama_tamu.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const vipSuffix = isVip ? '_VIP' : '';
        a.download = `tamoo_ticket_${safeName}${vipSuffix}.png`;
        
        a.href = url; 
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a); 
        URL.revokeObjectURL(url);

        // Tutup Popup QR secara otomatis setelah unduhan berjalan
        Swal.close();
    }, 'image/png');
}

// =========================================================================
// PEMICU OTOMATIS: DENGAR MENU NAVIGASI REKAP DIKLIK
// =========================================================================
document.addEventListener('click', function(e) {
    const target = e.target.closest('#navRekap, [onclick*="rekap"], [data-tab="rekap"]');
    if (target) setTimeout(loadGuestRecapTable, 100);
});

// Panggil sekali saat script pertama kali termuat
setTimeout(loadGuestRecapTable, 1000);
// =========================================================================
// FUNGSI AKSI: TOGGLE STATUS KEHADIRAN TAMU (TOMBOL BIRU PALING KIRI)
// =========================================================================

async function toggleGuestAttendance(guestId, currentStatus) {
    if (!guestId) return;

    // Tentukan status baru dan waktu hadirnya
    const isCurrentlyHadir = currentStatus === 'HADIR';
    const newStatus = isCurrentlyHadir ? 'BELUM_HADIR' : 'HADIR';
    const newWaktuHadir = isCurrentlyHadir ? null : new Date().toISOString();

    const statusTextAlert = isCurrentlyHadir ? 'BELUM HADIR' : 'HADIR';

    // Konfirmasi dari pengguna menggunakan SweetAlert2
    const result = await Swal.fire({
        title: 'Ubah Status Kehadiran?',
        text: `Status tamu akan diubah menjadi "${statusTextAlert}"`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#b39343',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Ubah!',
        cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    // Tampilkan indikator loading saat update ke Supabase
    Swal.fire({
        title: 'Updating...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        // Update data di tabel 'data_tamu' Supabase
        const { error } = await db
            .from('data_tamu')
            .update({
                status_kehadiran: newStatus,
                waktu_hadir: newWaktuHadir
            })
            .eq('id', guestId);

        if (error) throw error;

        // Notifikasi Sukses Singkat
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Status kehadiran diperbarui menjadi ${statusTextAlert}`,
            timer: 1200,
            showConfirmButton: false
        });

        // Muat ulang data tabel & kartu statistik rekap
        loadGuestRecapTable();

    } catch (err) {
        console.error("Gagal update status kehadiran:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat mengupdate status di database.', 'error');
    }
}

// =========================================================================
// FUNGSI AKSI: LIHAT & DOWNLOAD QR CODE TAMU (TOMBOL QR CODE DI TABEL)
// =========================================================================

async function viewGuestQr(guestId) {
    if (!guestId) return;

    // Indikator loading saat mengambil detail tamu
    Swal.fire({
        title: 'Memuat QR Code...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        // Tarik data spesifik tamu dari Supabase
        const { data: guest, error } = await db
            .from('data_tamu')
            .select('*')
            .eq('id', guestId)
            .single();

        if (error || !guest) throw new Error("Data tamu tidak ditemukan.");

        Swal.close();

        // Siapkan objek data untuk dimasukkan ke pembuat tiket
        const guestDataForTicket = {
            id: guest.id,
            nama_tamu: guest.nama_tamu,
            kategori_tamu: guest.kategori_tamu || 'Reguler'
        };

        // Panggil kembali fungsi modal tampilan QR yang sudah kita buat sebelumnya
        showGeneratedQrCard(guestDataForTicket);

    } catch (err) {
        console.error("Gagal memuat QR Code tamu:", err);
        Swal.fire('Gagal!', 'Tidak dapat menampilkan QR Code tamu.', 'error');
    }
}
// =========================================================================
// FUNGSI AKSI: CETAK E-TICKET TAMU (TOMBOL PRINT DI TABEL)
// =========================================================================
async function printGuestTicket(guestId) {
    if (!guestId) return;

    Swal.fire({
        title: 'Menyiapkan Tiket...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        // 1. Ambil data tamu dari Supabase
        const { data: guest, error } = await db.from('data_tamu').select('*').eq('id', guestId).single();
        if (error || !guest) throw new Error("Data tamu tidak ditemukan.");

        // 2. Tarik setup info untuk data e-ticket
        const rawEventName = document.getElementById('adminEventName')?.value || 'NAMA ACARA';
        const rawEventDate = document.getElementById('adminEventDate')?.value || 'TANGGAL';
        const rawEventLocation = document.getElementById('adminEventLocation')?.value || 'LOKASI';
        
        const eventNameText = rawEventName.toUpperCase();
        const eventSubText = `${rawEventDate} | ${rawEventLocation}`.toUpperCase();
        const isVip = (guest.kategori_tamu || '').toUpperCase() === 'VIP';
        const nameOnTicket = guest.nama_tamu + (isVip ? ' (VIP)' : '');

        // 3. Buat Offscreen Canvas untuk merender Tiket
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 800;

        // Render Background & Bingkai
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#b39343"; ctx.lineWidth = 15;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Render Header & Judul Acara (Auto-Resize)
        ctx.fillStyle = "#846924"; ctx.textAlign = "center";
        let fontSizeTitle = 45; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
        while (ctx.measureText(eventNameText).width > 520 && fontSizeTitle > 16) {
            fontSizeTitle -= 2; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
        }
        ctx.fillText(eventNameText, canvas.width/2, 100);

        // Render Subtitle
        ctx.fillStyle = "#333";
        let fontSizeSub = 18; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
        while (ctx.measureText(eventSubText).width > 520 && fontSizeSub > 10) {
            fontSizeSub -= 1; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
        }
        ctx.fillText(eventSubText, canvas.width/2, 160);

        // E-Ticket Pass Banner
        ctx.fillStyle = "#777"; ctx.font = "800 24px 'Montserrat'";
        ctx.fillText("E - T I C K E T   P A S S", canvas.width/2, 220);

        // Render Nama Tamu (Auto-Resize)
        ctx.fillStyle = "#333";
        let fontSizeName = 42; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
        while (ctx.measureText(nameOnTicket).width > 520 && fontSizeName > 20) {
            fontSizeName -= 2; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
        }
        ctx.fillText(nameOnTicket, canvas.width/2, 300);

        // Render QR Code secara independen via library QRCode
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, { text: guest.id, width: 200, height: 200 });
        
        // Beri jeda micro-task agar image source QR ter-generate sempurna
        await new Promise(resolve => setTimeout(resolve, 100));
        const tempImg = tempDiv.querySelector('img');
        
        if (tempImg && tempImg.src) {
            ctx.drawImage(tempImg, canvas.width/2 - 100, 360, 200, 200);
        }

        // Render Footer Teks
        ctx.fillStyle = "#777"; ctx.font = "600 14px 'Montserrat'";
        ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width/2, 620);
        ctx.fillStyle = "#846924"; ctx.font = "800 22px 'Montserrat'";
        ctx.fillText("R A M A T L O K A", canvas.width/2, 680);

        Swal.close();

        // 4. Proses memicu print browser jendela baru khusus gambar tiket
        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print E-Ticket - ${guest.nama_tamu}</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
                    img { max-width: 100%; max-height: 100%; object-fit: contain; }
                    @page { size: auto; margin: 0mm; }
                </style>
            </head>
            <body>
                <img src="${dataUrl}" onload="window.print(); window.close();" />
            </body>
            </html>
        `);
        printWindow.document.close();

    } catch (err) {
        console.error("Gagal print tiket:", err);
        Swal.fire('Gagal!', 'Tidak dapat memproses cetak tiket.', 'error');
    }
}

// =========================================================================
// FUNGSI AKSI: TOGGLE KATEGORI TAMU VIP / REGULER (TOMBOL MAHKOTA)
// =========================================================================
async function toggleGuestVipStatus(guestId, currentKategori) {
    if (!guestId) return;

    // Tentukan kategori baru berdasarkan status saat ini
    const isCurrentlyVip = currentKategori.toUpperCase() === 'VIP';
    const newKategori = isCurrentlyVip ? 'Reguler' : 'VIP';
    const kategoriTextAlert = isCurrentlyVip ? 'REGULER' : 'VIP';

    const result = await Swal.fire({
        title: 'Ubah Kategori Tamu?',
        text: `Kategori tamu akan diubah menjadi "${kategoriTextAlert}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b39343',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Ubah!',
        cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Memproses...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        // Update kategori_tamu di database Supabase
        const { error } = await db
            .from('data_tamu')
            .update({ kategori_tamu: newKategori })
            .eq('id', guestId);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Kategori tamu kini menjadi ${kategoriTextAlert}`,
            timer: 1200,
            showConfirmButton: false
        });

        // Refresh tabel agar perubahan langsung kelihatan
        loadGuestRecapTable();

    } catch (err) {
        console.error("Gagal update kategori tamu:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat memperbarui database.', 'error');
    }
}
// =========================================================================
// FUNGSI LOGIKA FILTER & PENCARIAN REKAPITULASI TAMU
// =========================================================================

function applyFilters() {
    const tableBody = document.getElementById('guestTableBody') || 
                      document.getElementById('rekapTableBody') || 
                      document.querySelector('#rekapTable tbody');

    if (!tableBody) return;

    // 1. Ambil nilai dari input pencarian & dropdown filter
    const searchVal = (document.getElementById('searchRekapInput')?.value || '').toLowerCase().trim();
    const filterKatVal = document.getElementById('filterKategori')?.value || 'ALL';
    const filterStatVal = document.getElementById('filterStatus')?.value || 'ALL';
    const filterSouvVal = document.getElementById('filterSouvenir')?.value || 'ALL';

    // 2. Terapkan Logika Penyaringan pada Data Cache
    const filteredGuests = rawGuestDataCache.filter(guest => {
        // A. Filter Nama Tamu
        const namaTamu = (guest.nama_tamu || '').toLowerCase();
        const matchNama = !searchVal || namaTamu.includes(searchVal);

        // B. Filter Kategori (VIP / Reguler)
        let rawKategori = (guest.kategori_tamu || 'Reguler').toUpperCase();
        if (rawKategori === 'UMUM') rawKategori = 'REGULER';
        
        let matchKategori = true;
        if (filterKatVal !== 'ALL') {
            const targetKat = filterKatVal.toUpperCase();
            matchKategori = rawKategori.includes(targetKat);
        }

        // C. Filter Status Kehadiran (Hadir / Belum Hadir)
        const isHadir = guest.status_kehadiran === 'HADIR';
        let matchStatus = true;
        if (filterStatVal === 'Hadir') matchStatus = isHadir;
        else if (filterStatVal === 'Belum Hadir') matchStatus = !isHadir;

        // D. Filter Souvenir (Sudah Ambil / Belum Ambil)
        const isSouvenir = guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL';
        let matchSouvenir = true;
        if (filterSouvVal === 'Sudah Ambil') matchSouvenir = isSouvenir;
        else if (filterSouvVal === 'Belum Ambil') matchSouvenir = !isSouvenir;

        return matchNama && matchKategori && matchStatus && matchSouvenir;
    });

    // 3. Update Kartu Ringkasan Statistik berdasarkan data yang terfilter
    if (typeof updateRekapSummaryCards === "function") {
        updateRekapSummaryCards(filteredGuests);
    }

    // 4. Jika Data Tidak Ditemukan
    if (filteredGuests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 25px; color: #888; font-weight: 600;">
                    <i class="fas fa-search" style="margin-right: 8px; color: #b39343;"></i>
                    Tidak ada data tamu yang cocok dengan filter.
                </td>
            </tr>
        `;
        return;
    }

    // 5. Render Baris Tabel Hasil Filter
    tableBody.innerHTML = filteredGuests.map((guest) => {
        const namaTamu = guest.nama_tamu || '-';
        const jumlahOrang = guest.jumlah_aktual || 1;
        
        let rawKategori = guest.kategori_tamu || 'Reguler';
        if (rawKategori.toLowerCase() === 'umum') rawKategori = 'Reguler';
        const kategoriTamu = rawKategori.toUpperCase();

        const isHadir = guest.status_kehadiran === 'HADIR';
        const isSouvenir = guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL';

        let katBadge = `<span style="background: #f1f3f4; color: #5f6368; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">${kategoriTamu}</span>`;
        if (kategoriTamu === 'VIP' || kategoriTamu === 'TAMU VIP') {
            katBadge = `<span style="background: #fef08a; color: #854d0e; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;"><i class="fas fa-crown"></i> VIP</span>`;
        }

        const hadirBadge = isHadir 
            ? `<span style="background: #e6f4ea; color: #137333; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">HADIR</span>`
            : `<span style="background: #fce8e6; color: #c5221f; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">BELUM HADIR</span>`;

        const souvBadge = isSouvenir
            ? `<span style="background: #e8f0fe; color: #1967d2; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">SOUVENIR: SUDAH AMBIL</span>`
            : `<span style="background: #f1f3f4; color: #5f6368; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px;">SOUVENIR: BELUM AMBIL</span>`;

        const aksiHtml = `
            <i class="fas fa-user-edit" 
               onclick="toggleGuestAttendance('${guest.id}', '${guest.status_kehadiran}')" 
               style="color: #1967d2; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Ubah Status Kehadiran"></i>
            <i class="fas fa-qrcode" 
               onclick="viewGuestQr('${guest.id}')" 
               style="color: #333; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Lihat & Download QR Code"></i>
            <i class="fas fa-print" 
               onclick="printGuestTicket('${guest.id}')" 
               style="color: #1967d2; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Cetak E-Ticket"></i>
            <i class="fas fa-crown" 
               onclick="toggleGuestVipStatus('${guest.id}', '${guest.kategori_tamu || 'Reguler'}')" 
               style="color: #b39343; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Ubah Kategori (VIP/Reguler)"></i>
            <i class="fab fa-whatsapp" style="color: #137333; cursor: pointer; margin: 0 5px; font-size: 14px;" title="Kirim WA"></i>
        `;

        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="text-align: center; padding: 15px 10px;">
                    <input type="checkbox" class="chk-select-guest" value="${guest.id}" style="transform: scale(1.2); cursor: pointer;">
                </td>
                <td style="padding: 15px 10px;">
                    <div style="font-weight: 800; color: #333; font-size: 0.95rem; margin-bottom: 4px;">${namaTamu}</div>
                    <div style="color: #b39343; font-weight: 800; font-size: 0.75rem;">
                        <i class="fas fa-user-friends"></i> ${jumlahOrang} Orang
                    </div>
                </td>
                <td style="padding: 15px 10px; vertical-align: middle;">
                    ${katBadge}
                </td>
                <td style="padding: 15px 10px;">
                    <div style="margin-bottom: 6px;">${hadirBadge}</div>
                    <div>${souvBadge}</div>
                </td>
                <td style="text-align: center; padding: 15px 10px; vertical-align: middle; white-space: nowrap;">
                    ${aksiHtml}
                </td>
            </tr>
        `;
    }).join('');
}
