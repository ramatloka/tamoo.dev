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
// CORE LOGIC FUNCTIONS (MENGGUNAKAN SUPABASE) - FORM & SETTINGS LOADER
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

        // Ambil data pertanyaan dari database Supabase
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

        // PERIKSA STATUS FORM (TUTUP)
        if (data.FormStatus === "TUTUP") {
            document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-lock" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">PENDAFTARAN DITUTUP</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, pendaftaran online untuk acara ini sudah resmi ditutup oleh panitia.</p></div>';
            let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
            let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
            document.getElementById('pubEventName').innerText = data.EventName || data.EventTitle; return;
        }

        // PERIKSA KUOTA MAKSIMAL
        let maxQ = parseInt(data.MaxQuota) || 0; let curRegHead = parseInt(data.currentRegistered) || 0;
        if (maxQ > 0 && curRegHead >= maxQ) {
            document.getElementById('dynamicFormContainer').innerHTML = '<div style="text-align:center; padding: 40px 20px; background:#fce8e6; border:2px dashed #c5221f; border-radius:12px; color: #c5221f; margin-bottom:15px;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom:15px;"></i><br><h3 style="margin:0; font-family:\'Playfair Display\', serif;">MOHON MAAF</h3><p style="margin-top:8px; font-weight:600; line-height:1.4;">Mohon maaf, kapasitas kuota penampung tamu untuk acara ini sudah terisi penuh.</p></div>';
            let btnSub = document.getElementById('btnSubmitForm'); if(btnSub) btnSub.style.display = 'none';
            let pubE = document.getElementById('publicEventInfo'); if (pubE) pubE.style.display = 'block';
            document.getElementById('pubEventName').innerText = data.EventName || data.EventTitle; return;
        }

        if (IS_PUBLIC_MODE) {
            document.getElementById('publicEventInfo').style.display = 'block'; 
            let elTitle = document.getElementById('pubEventTitle');
            if(elTitle) elTitle.innerText = data.EventTitle || "GUEST BOOK PRO";
            let elName = document.getElementById('pubEventName');
            if(elName) elName.innerText = data.EventName || "";
            
            let dateLoc = []; 
            if(data.EventDate) dateLoc.push(data.EventDate); 
            if(data.EventLocation) dateLoc.push(data.EventLocation); 
            document.getElementById('pubEventDateLoc').innerText = dateLoc.join("  |  ");
            
            if(data.DetailUrl && data.DetailUrl.trim() !== "") { 
                let btnDetail = document.getElementById('pubDetailBtn'); 
                let finalUrl = data.DetailUrl.startsWith('http') ? data.DetailUrl : 'https://' + data.DetailUrl; 
                btnDetail.href = finalUrl; 
                btnDetail.style.display = 'inline-block'; 
            }
        }
        
        // RENDER FORM UTAMA DAN SINKRONISASI MODAL REKAP
        renderGuestForm();
        renderSetupQuestionsTable();
        loadCheckInStats(); // <-- Tambahkan baris ini
        
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
// HANDLER UPLOAD POSTER TV KE SUPABASE STORAGE
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const posterInput = document.getElementById('adminPosterUpload');
    if (posterInput) {
        posterInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Validasi Ukuran (Maksimal 5 MB agar tetap ramping)
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    title: 'File Terlalu Besar',
                    text: 'Ukuran poster maksimal adalah 5 MB.',
                    icon: 'warning'
                });
                this.value = '';
                return;
            }

            Swal.fire({
                title: 'Mengunggah Poster...',
                text: 'Menyimpan gambar ke Supabase Storage...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `tv_poster_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                // 2. Upload file ke Bucket 'posters'
                const { data, error } = await db.storage
                    .from('posters')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;

                // 3. Dapatkan Public URL gambar
                const { data: publicUrlData } = db.storage
                    .from('posters')
                    .getPublicUrl(filePath);

                const finalPosterUrl = publicUrlData.publicUrl;

                // 4. Simpan URL ke input tersembunyi & perbarui status
                document.getElementById('adminPosterUrl').value = finalPosterUrl;
                const statusEl = document.getElementById('posterPreviewStatus');
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Poster baru siap disimpan.';
                }

                Swal.fire({
                    title: 'Berhasil Diunggah!',
                    text: 'Klik "Simpan Semua Perubahan" untuk menerapkan poster ke Layar TV.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

            } catch (err) {
                console.error("Gagal upload poster:", err);
                Swal.fire('Gagal Unggah', err.message || 'Terjadi kesalahan saat mengunggah poster.', 'error');
                this.value = '';
            }
        });
    }
});

// =========================================================================
// SIMPAN PENGATURAN KE SUPABASE (DATABASE BRIDGE)
// =========================================================================
async function saveAdminSettingsData() {
    try {
        Swal.fire({ title: 'Menyimpan...', text: 'Mengirim konfigurasi ke Supabase', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const getVal = (id) => { let el = document.getElementById(id); return el ? el.value : ""; };

        const eventTitle = getVal('adminEventTitle');
        const eventName = getVal('adminEventName');
        const announcement = getVal('adminAnnouncement');
        const posterUrl = getVal('adminPosterUrl');
        const appTheme = getVal('adminAppTheme') || 'gold';

        // 1. Kumpulkan Konfigurasi Utama
        const configs = [
            { key: 'EventTitle', value: eventTitle },
            { key: 'EventName', value: eventName },
            { key: 'EventDate', value: getVal('adminEventDate') },
            { key: 'EventLocation', value: getVal('adminEventLocation') },
            { key: 'Announcement', value: announcement },
            { key: 'GreetingPrefix', value: getVal('adminPrefix') },
            { key: 'GreetingSuffix', value: getVal('adminSuffix') },
            { key: 'SouvenirLabel', value: getVal('adminSouvenirLabel') },
            { key: 'SouvenirPerPax', value: getVal('adminSouvenirPerPax') },
            { key: 'MaxQuota', value: getVal('adminMaxQuota') },
            { key: 'FormStatus', value: getVal('adminFormStatus') },
            { key: 'RequireLogin', value: getVal('adminRequireLogin') },
            { key: 'AppTheme', value: appTheme },
            { key: 'SoundSuccess', value: getVal('adminSoundSuccess') },
            { key: 'SoundError', value: getVal('adminSoundError') },
            { key: 'PosterUrl', value: posterUrl },
            { key: 'DetailUrl', value: getVal('adminDetailUrl') },
            { key: 'WaTemplate', value: getVal('adminWaTemplate') }
        ];

        // Upsert (Simpan/Update) ke tabel app_config Supabase
        const { error: configError } = await db.from('app_config').upsert(configs, { onConflict: 'key' });
        if (configError) throw configError;

        // 2. Simpan Struktur Field Pertanyaan ke tabel form_settings Supabase
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

        // 3. Simpan ke LocalStorage & Kirim Broadcast Instan ke Layar TV
        localStorage.setItem('currentEventTitle', eventTitle);
        localStorage.setItem('currentEventName', eventName);
        localStorage.setItem('currentEventTicker', announcement);
        localStorage.setItem('currentEventPoster', posterUrl);

        if (typeof tvBroadcast !== 'undefined') {
            tvBroadcast.postMessage({
                type: 'INIT_DISPLAY',
                data: { 
                    eventTitle, 
                    eventName, 
                    tickerText: announcement, 
                    posterUrl,
                    theme: appTheme 
                }
            });
        }

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
// FUNGSI HAPUS / NONAKTIFKAN POSTER TV (GLOBAL)
// =========================================================================
async function removeTvPoster() {
    const posterUrlInput = document.getElementById('adminPosterUrl');
    const fileInput = document.getElementById('adminPosterUpload');
    if (posterUrlInput) posterUrlInput.value = '';
    if (fileInput) fileInput.value = '';
    
    const statusEl = document.getElementById('posterPreviewStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#dc3545';
        statusEl.innerHTML = '<i class="fas fa-info-circle"></i> Poster dinonaktifkan. Sedang memperbarui...';
    }

    try {
        const { error } = await db
            .from('app_config')
            .upsert({ key: 'PosterUrl', value: '' }, { onConflict: 'key' });

        if (error) throw error;

        localStorage.setItem('currentEventPoster', '');

        if (typeof tvBroadcast !== 'undefined') {
            tvBroadcast.postMessage({
                type: 'UPDATE_POSTER',
                data: { posterUrl: '' }
            });
        }

        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Poster berhasil dinonaktifkan dari Layar TV.';
        }

        Swal.fire({
            title: 'Poster Dinonaktifkan',
            text: 'Poster telah dihapus dari Layar TV dan kembali ke mode scanner.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Gagal menghapus poster dari Supabase:", err);
        Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus poster.', 'error');
    }
}

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

  // =========================================================================
  // OTOMATIS HITUNG REKAP SOUVENIR & CHECK-IN SAAT TAB DIBUKA
  // =========================================================================
  if (tab === 'souvenir' && typeof loadSouvenirStats === "function") {
      loadSouvenirStats();
  }
  
  if ((tab === 'petugas' || tab === 'tamu' || tab === 'home') && typeof loadCheckInStats === "function") {
      loadCheckInStats();
  }
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

// =========================================================================
// RENDER FORM DINAMIS UNTUK UTAMA & MODAL TAMBAH TAMU
// =========================================================================

function renderGuestForm() {
    const questionsToRender = (typeof currentQuestions !== 'undefined' && currentQuestions.length > 0) 
        ? currentQuestions 
        : [
            { id: 'nama_tamu', label: 'Nama Tamu', type: 'text', required: true },
            { id: 'institusi', label: 'Institusi', type: 'text', required: false },
            { id: 'jumlah_pax', label: 'Jumlah Tamu Termasuk Anda', type: 'dropdown', options: ['1', '2', '3'], required: true }
          ];

    let html = '';
    questionsToRender.forEach(q => {
        let isReq = q.required ? 'required' : '';
        let reqLabel = q.required ? '<span style="color:red;">*</span>' : '';
        
        html += `<div class="form-group" style="margin-bottom:15px; text-align:left;">`;
        html += `<label style="display:block; font-weight:600; margin-bottom:5px; color:#333;">${q.label} ${reqLabel}</label>`;
        
        if (q.type === 'dropdown') {
            html += `<select id="field_${q.id}" class="form-control" ${isReq} style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">`;
            html += `<option value="">-- Pilih --</option>`;
            (q.options || []).forEach(o => {
                html += `<option value="${o}">${o}</option>`;
            });
            html += `</select>`;
        } else if (q.type === 'radio') {
            (q.options || []).forEach(o => {
                html += `<div style="margin-bottom:5px;"><input type="radio" name="field_${q.id}" value="${o}" ${isReq}> ${o}</div>`;
            });
        } else if (q.type === 'checkbox') {
            (q.options || []).forEach(o => {
                html += `<div style="margin-bottom:5px;"><input type="checkbox" name="field_${q.id}" value="${o}"> ${o}</div>`;
            });
        } else {
            html += `<input type="${q.type || 'text'}" id="field_${q.id}" class="form-control" placeholder="Isi ${q.label}..." ${isReq} style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;">`;
        }
        
        html += `</div>`;
    });

    // 1. Inject ke Container Form Utama
    const mainContainer = document.getElementById('dynamicFormContainer');
    if (mainContainer) mainContainer.innerHTML = html;

    // 2. Inject ke Semua Kemungkinan ID Container Modal Tambah Tamu
    const modalContainerIDs = [
        'modalDynamicFormContainer', 
        'adminGuestFormContainer', 
        'rekapDynamicFormContainer',
        'modalTambahTamuForm',
        'modalAddGuestForm',
        'addGuestDynamicForm'
    ];

    modalContainerIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
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
// SINKRONISASI TOMBOL PENGATURAN GLOBAL & TV MONITOR
// =========================================================================

// Inisialisasi Jalur Komunikasi Radio (Broadcast) ke Layar TV
const tvBroadcast = new BroadcastChannel('tamoo_tv_broadcast');

// Fungsi Utama Membuka TV Monitor (Disesuaikan dengan onclick di HTML: openTvWindow)
function openTvWindow() { 
    console.log("Membuka Layar TV Extended..."); 
    
    const eventTitle = document.getElementById('adminEventTitle')?.value || 'TAMOO EVENT';
    const eventName = document.getElementById('adminEventName')?.value || '';
    const tickerText = document.getElementById('adminAnnouncement')?.value || 'Selamat Datang - MOHON SIAPKAN QR CODE ANDA';

    localStorage.setItem('currentEventTitle', eventTitle);
    localStorage.setItem('currentEventName', eventName);
    localStorage.setItem('currentEventTicker', tickerText);

    const monitorWindow = window.open('monitor.html', '_blank');

    setTimeout(() => {
        tvBroadcast.postMessage({
            type: 'INIT_DISPLAY',
            data: { eventTitle, eventName, tickerText }
        });
    }, 1000);
}

// Alias pendukung jika ada bagian lain yang memanggil initTvMode
function initTvMode() {
    openTvWindow();
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
        // 1. Reset Total Seluruh Isian Formulir
        let formContainer = document.getElementById('dynamicFormContainer');
        if (formContainer) {
            let inputs = formContainer.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="date"], select, textarea');
            inputs.forEach(i => i.value = "");

            let checks = formContainer.querySelectorAll('input[type="checkbox"], input[type="radio"]');
            checks.forEach(c => c.checked = false);
        }

        // 2. KUNCI HALAMAN & TAMPILKAN LAYAR TERIMA KASIH (HANYA AKTIF DI LINK PUBLIK)
        if (typeof showPublicSuccessPage === "function") {
            showPublicSuccessPage(guestName);
        }
    });
}

// =========================================================================
// GENERATOR DOWNLOAD E-TICKET ELEGAN (STRUKTUR NAMA BERJENJANG / TIDAK PADAT)
// =========================================================================

async function downloadETicket(id, name, title, date, loc) {
    const btn = window.event ? window.event.target.closest('button') : null;
    let originalText = "";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMPROSES...';
        btn.disabled = true;
    }

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 850;

        // 1. Cek Kategori VIP
        let isVip = false;
        if (typeof rawGuestDataCache !== "undefined" && rawGuestDataCache.length > 0) {
            const currentGuest = rawGuestDataCache.find(g => g.id === id);
            if (currentGuest && currentGuest.kategori_tamu && currentGuest.kategori_tamu.toUpperCase().includes('VIP')) {
                isVip = true;
            }
        }
        if (name.toUpperCase().includes('VIP')) {
            isVip = true;
        }

        // 2. Background & Bingkai Mewah
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#846924';
        ctx.lineWidth = 15;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        // 3. Judul Acara & Sub-judul
        const rawTitle = (document.getElementById('adminEventTitle')?.value || title || "GUEST BOOK").toUpperCase();
        const rawSubTitle = (document.getElementById('adminEventName')?.value || "").toUpperCase();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#846924';
        
        let fontTitleSize = 34;
        ctx.font = `bold ${fontTitleSize}px serif`;
        while (ctx.measureText(rawTitle).width > 500 && fontTitleSize > 18) {
            fontTitleSize -= 2;
            ctx.font = `bold ${fontTitleSize}px serif`;
        }
        ctx.fillText(rawTitle, canvas.width / 2, 90);

        if (rawSubTitle) {
            ctx.fillStyle = '#555555';
            let fontSubSize = 18;
            ctx.font = `bold ${fontSubSize}px sans-serif`;
            while (ctx.measureText(rawSubTitle).width > 500 && fontSubSize > 12) {
                fontSubSize -= 1;
                ctx.font = `bold ${fontSubSize}px sans-serif`;
            }
            ctx.fillText(rawSubTitle, canvas.width / 2, 118);
        }

        // Garis Pemisah
        ctx.beginPath();
        ctx.strokeStyle = '#846924';
        ctx.lineWidth = 2;
        ctx.moveTo(150, 134);
        ctx.lineTo(450, 134);
        ctx.stroke();

        // 4. Info Tanggal & Lokasi
        ctx.fillStyle = '#777';
        ctx.font = '600 15px sans-serif';
        const infoText = `${date || ''} ${date && loc ? '|' : ''} ${(loc || '').toUpperCase()}`.trim() || 'RAMATLOKA EVENT';
        ctx.fillText(infoText, canvas.width / 2, 160);

        // 5. Header Tiket (PASS)
        ctx.fillStyle = '#999';
        ctx.font = '500 17px sans-serif';
        ctx.fillText(isVip ? "VIP ACCESS PASS" : "E-TICKET PASS", canvas.width / 2, 195);

        // 6. RENDER NAMA BERJENJANG (PREFIX -> NAMA -> SUFFIX)
        const prefix = (document.getElementById('adminPrefix')?.value || greetingPrefix || "").trim();
        const suffix = (document.getElementById('adminSuffix')?.value || greetingSuffix || "").trim();
        let pureName = name.replace(/\(VIP\)/gi, '').trim().toUpperCase();

        // A. AWALAN SAPAAN (DI ATAS NAMA - WARNA HITAM)
        if (prefix) {
            ctx.fillStyle = '#333333';
            ctx.font = '500 18px sans-serif';
            ctx.fillText(prefix, canvas.width / 2, 228);
        }

        // B. NAMA UTAMA TAMU (BESAR & TEGAS)
        const namePosY = prefix ? 268 : 250;
        ctx.fillStyle = isVip ? '#846924' : '#222222';
        let fontSizeName = 38;
        ctx.font = `bold ${fontSizeName}px sans-serif`;
        while (ctx.measureText(pureName).width > 480 && fontSizeName > 18) {
            fontSizeName -= 2;
            ctx.font = `bold ${fontSizeName}px sans-serif`;
        }
        ctx.fillText(pureName, canvas.width / 2, namePosY);

        // C. SUB-TEXT / AKHIRAN SAPAAN (DI BAWAH NAMA)
        let subPosY = namePosY + 26;
        if (suffix) {
            ctx.fillStyle = '#333333';
            ctx.font = '500 16px sans-serif';
            ctx.fillText(suffix, canvas.width / 2, subPosY);
            subPosY += 22;
        }

        if (isVip) {
            ctx.fillStyle = '#b39343';
            ctx.font = 'italic bold 14px serif';
            ctx.fillText("• Tamu Kehormatan VIP •", canvas.width / 2, subPosY);
        }

        // 7. Gambar QR Code
        let qrDataUrl = "";
        const existingQrImg = document.querySelector('#qrcodeDisplay img') || document.querySelector('#swalQrCanvasWrapper img');
        if (existingQrImg && existingQrImg.src && existingQrImg.src.startsWith('data:image')) {
            qrDataUrl = existingQrImg.src;
        }

        const qrImg = new Image();
        if (qrDataUrl) {
            qrImg.src = qrDataUrl;
        } else {
            qrImg.crossOrigin = "anonymous";
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(id)}`;
        }

        await new Promise((resolve) => {
            qrImg.onload = resolve;
            qrImg.onerror = resolve;
            setTimeout(resolve, 4000); 
        });

        // Frame Putih QR (Ukuran: 260x260)
        ctx.fillStyle = '#fdfaf3';
        ctx.fillRect(170, 360, 260, 260);
        
        if (qrImg.complete && qrImg.naturalWidth !== 0) {
            ctx.drawImage(qrImg, 185, 375, 230, 230);
        } else {
            ctx.fillStyle = '#846924';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(id, canvas.width / 2, 490);
        }

        // 8. BADGE VIP (DI BAWAH QR CODE - CENTER)
        if (isVip) {
            const badgeW = 160;
            const badgeH = 32;
            const badgeX = (canvas.width - badgeW) / 2;
            const badgeY = 638;

            ctx.fillStyle = '#846924';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
            } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("★ VIP GUEST", canvas.width / 2, badgeY + 21);
        }

        // 9. Footer & Brand
        ctx.fillStyle = '#888';
        ctx.font = 'italic 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width / 2, 735);

        ctx.fillStyle = '#846924';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText("RAMATLOKA", canvas.width / 2, 795);

        // 10. Ekspor & Unduh File PNG
        const safeFileName = pureName.replace(/\s+/g, '-');
        const vipSuffix = isVip ? '_VIP' : '';
        const downloadName = `Tiket-${safeFileName}${vipSuffix}.png`;

        if (navigator.msSaveBlob) {
            canvas.toBlob((blob) => navigator.msSaveBlob(blob, downloadName));
        } else {
            const link = document.createElement('a');
            link.download = downloadName;
            link.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        Swal.fire({ title: 'Tersimpan!', text: `Tiket ${isVip ? 'VIP ' : ''}berhasil diunduh ke perangkat Anda.`, icon: 'success', timer: 1800, showConfirmButton: false });

    } catch (err) {
        console.error("Gagal Download E-Ticket:", err);
        Swal.fire('Gagal Download', 'Terjadi kesalahan saat membuat gambar tiket.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
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

// FUNGSI 1: Eksekusi Utama Check-in ke Supabase (Wajib Async) + Real-time TV Broadcast
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

        // =========================================================================
        // PENGIRIMAN DATA LIVE KE LAYAR MONITOR TV VIA BROADCAST CHANNEL
        // =========================================================================
        try {
            if (typeof tvBroadcast !== "undefined") {
                let dynamicTvBadges = [];

                // Gunakan currentQuestions yang aktif di memori app.js
                const activeQuestionList = (typeof currentQuestions !== 'undefined' && Array.isArray(currentQuestions)) 
                                            ? currentQuestions 
                                            : [];

                activeQuestionList.forEach(q => {
                    // Deteksi baik showOnTv maupun show_on_tv
                    const isShowTv = (q.showOnTv === true || q.showOnTv === 'true' || q.show_on_tv === true || q.show_on_tv === 'true' || q.showOnTv === 1 || q.show_on_tv === 1);
                    
                    if (q.id !== 'nama_tamu' && isShowTv) {
                        let val = (guest.form_data && guest.form_data[q.id] !== undefined) 
                                  ? guest.form_data[q.id] 
                                  : guest[q.id];

                        if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim().toUpperCase() !== "UMUM") {
                            dynamicTvBadges.push({
                                id: q.id,
                                label: q.label,
                                value: String(val).trim()
                            });
                        }
                    }
                });

               // Kirim paket data check-in ke tab TV Monitor
                tvBroadcast.postMessage({
                    type: 'GUEST_CHECKIN',
                    data: {
                        nama_tamu: guest.nama_tamu || 'Tamu Undangan',
                        kategori_tamu: guest.kategori_tamu || '',
                        prefix: greetingPrefix || '',
                        suffix: greetingSuffix || '',
                        tv_badges: dynamicTvBadges
                    }
                });
                
                console.log("✅ Siaran check-in sukses terkirim ke TV Monitor untuk:", guest.nama_tamu);
            }
        } catch (broadcastErr) {
            console.error("Gagal mengirim data ke layar TV monitor:", broadcastErr);
        }
        // =========================================================================

        // PEMBARUAN COUNTER BOX HALAMAN SOUVENIR & CHECK-IN SAAT TAMU BERHASIL CHECK-IN
        if (typeof loadSouvenirStats === "function") loadSouvenirStats();
        if (typeof loadCheckInStats === "function") loadCheckInStats();

        // 3. Tampilkan Pop-Up Selamat Datang Mewah di Laptop Scanner (Sudah Bersih)
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

async function openCameraModal(type = 'checkin') { // <-- Baru
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
                stopCameraStream();
                Swal.close();
    
           // Panggil router pintar dengan mendeteksi parameter type modal (jika ada 'souvenir')
           // Di HTML Anda, tombol memanggil openCameraModal('souvenir')
            routeScannerResult(code.data, (typeof type !== 'undefined') ? type : 'auto');
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

// =========================================================================
// ROUTER PINTAR: MEMASTIKAN HASIL SCAN TIDAK SALAH SASARAN
// =========================================================================

function routeScannerResult(scannedData, dynamicType = 'auto') {
    console.log(`TAMOO ROUTER: Data masuk [${scannedData}], Mode [${dynamicType}]`);

    if (!scannedData) return;

    // 1. Validasi Presisi: Cek halaman mana yang BENAR-BENAR sedang aktif di layar ponsel
    const isSouvenirSectionActive = document.getElementById('secSouvenir')?.classList.contains('active') || false;
    const isCheckinSectionActive = document.getElementById('secTamu')?.classList.contains('active') || false;

    // 2. Tentukan Jalur Berdasarkan Halaman Aktif (Prioritas Utama)
    let finalTarget = 'checkin'; // Default fallback

    if (dynamicType === 'souvenir' || isSouvenirSectionActive) {
        finalTarget = 'souvenir';
    } else if (dynamicType === 'checkin' || isCheckinSectionActive) {
        finalTarget = 'checkin';
    }

    // 3. Eksekusi Pengiriman Data ke Fungsi Masing-Masing
    if (finalTarget === 'souvenir') {
        console.log("TAMOO ROUTER: Mengarahkan ke Modul SOUVENIR...");
        if (typeof processIndependentSouvenir === "function") {
            processIndependentSouvenir(scannedData);
        } else {
            Swal.fire('Error', 'Fungsi processIndependentSouvenir tidak ditemukan!', 'error');
        }
    } else {
        console.log("TAMOO ROUTER: Mengarahkan ke Modul CHECK-IN TAMU...");
        if (typeof processGuestCheckIn === "function") {
            processGuestCheckIn(scannedData);
        } else {
            Swal.fire('Error', 'Fungsi processGuestCheckIn tidak ditemukan!', 'error');
        }
    }
}

// PENDENGAR GLOBAL BARU (MENDUKUNG MULTI-INPUT USB SCANNER)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'text') {
            e.preventDefault(); // Stop reload form bawaan browser
            
            const qrValue = activeEl.value.trim();
            if (qrValue !== "") {
                routeScannerResult(qrValue, 'auto');
            }
        }
    }
});
// =========================================================================
// MODUL REKAPITULASI TAMU + PAGINATION LENGKAP (BERSIH DARI DUPLIKASI)
// =========================================================================

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

        // Tarik data tamu dari Supabase
        const { data: guests, error } = await db
            .from('data_tamu')
            .select('*')
            .order('nama_tamu', { ascending: true });

        if (error) throw error;

        rawGuestDataCache = guests || [];

        // Langsung jalankan filter dan render pagination
        applyFilters(false);

    } catch (err) {
        console.error("Gagal memuat rekap data_tamu:", err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc2626;">Gagal mengambil data dari server.</td></tr>`;
        }
    }
}

function applyFilters(resetToFirstPage = false) {
    const tableBody = document.getElementById('guestTableBody') || 
                      document.getElementById('rekapTableBody') || 
                      document.querySelector('#rekapTable tbody');

    if (!tableBody) return;

    if (resetToFirstPage) {
        currentPage = 1;
    }

    const searchVal = (document.getElementById('searchRekapInput')?.value || '').toLowerCase().trim();
    const filterKatVal = document.getElementById('filterKategori')?.value || 'ALL';
    const filterStatVal = document.getElementById('filterStatus')?.value || 'ALL';
    const filterSouvVal = document.getElementById('filterSouvenir')?.value || 'ALL';

    filteredGuestData = rawGuestDataCache.filter(guest => {
        const namaTamu = (guest.nama_tamu || '').toLowerCase();
        const matchNama = !searchVal || namaTamu.includes(searchVal);

        let rawKategori = (guest.kategori_tamu || 'Reguler').toUpperCase();
        if (rawKategori === 'UMUM') rawKategori = 'REGULER';
        
        let matchKategori = true;
        if (filterKatVal !== 'ALL') {
            matchKategori = rawKategori.includes(filterKatVal.toUpperCase());
        }

        const isHadir = guest.status_kehadiran === 'HADIR';
        let matchStatus = true;
        if (filterStatVal === 'Hadir') matchStatus = isHadir;
        else if (filterStatVal === 'Belum Hadir') matchStatus = !isHadir;

        const isSouvenir = guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL';
        let matchSouvenir = true;
        if (filterSouvVal === 'Sudah Ambil') matchSouvenir = isSouvenir;
        else if (filterSouvVal === 'Belum Ambil') matchSouvenir = !isSouvenir;

        return matchNama && matchKategori && matchStatus && matchSouvenir;
    });

    if (typeof updateRekapSummaryCards === "function") {
        updateRekapSummaryCards(filteredGuestData);
    }

    if (filteredGuestData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 25px; color: #888; font-weight: 600;">
                    <i class="fas fa-search" style="margin-right: 8px; color: #b39343;"></i>
                    Tidak ada data tamu yang cocok dengan filter.
                </td>
            </tr>
        `;
        renderPagination(0);
        return;
    }

    // Hitung Pembagian Halaman (Pagination)
    const totalItems = filteredGuestData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    const paginatedGuests = filteredGuestData.slice(startIndex, endIndex);

    tableBody.innerHTML = paginatedGuests.map((guest) => {
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

        const isChecked = (typeof selectedGuestsForZip !== "undefined" && selectedGuestsForZip.has(guest.id)) ? 'checked' : '';

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
            <i class="fab fa-whatsapp" 
               onclick="copyWaMessage('${guest.id}')" 
               style="color: #137333; cursor: pointer; margin: 0 5px; font-size: 14px;" 
               title="Salin Pesan WhatsApp / Email"></i>
        `;

        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="text-align: center; padding: 15px 10px;">
                    <input type="checkbox" class="chk-select-guest" value="${guest.id}" ${isChecked} style="transform: scale(1.2); cursor: pointer;">
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

    renderPagination(totalItems);
}

function renderPagination(totalItems) {
    const topContainer = document.getElementById('paginationControlsTop');
    const bottomContainer = document.getElementById('paginationControls');

    if (totalItems === 0) {
        if (topContainer) topContainer.innerHTML = '';
        if (bottomContainer) bottomContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    const startNum = (currentPage - 1) * rowsPerPage + 1;
    const endNum = Math.min(currentPage * rowsPerPage, totalItems);

    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';

    const html = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 4px 0;">
            <div style="font-size: 0.8rem; color: #666; font-weight: 600;">
                Menampilkan <b>${startNum}-${endNum}</b> dari <b>${totalItems}</b> Tamu
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-page" onclick="changePage(${currentPage - 1})" ${prevDisabled}>
                    <i class="fas fa-chevron-left"></i> Prev
                </button>
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--gold-dark, #846924); padding: 0 4px;">
                    Hal ${currentPage} / ${totalPages}
                </span>
                <button type="button" class="btn-page" onclick="changePage(${currentPage + 1})" ${nextDisabled}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    if (topContainer) topContainer.innerHTML = html;
    if (bottomContainer) bottomContainer.innerHTML = html;
}

function changePage(newPage) {
    currentPage = newPage;
    applyFilters(false);
}

function toggleSelectAll(isChecked) {
    const checkboxes = document.querySelectorAll('.chk-select-guest');
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
    });
}

function updateRekapSummaryCards(guests) {
    const totalTamu = guests.reduce((sum, g) => sum + (parseInt(g.jumlah_aktual) || 1), 0);
    const totalHadir = guests
        .filter(g => g.status_kehadiran === 'HADIR')
        .reduce((sum, g) => sum + (parseInt(g.jumlah_aktual) || 1), 0);
    const totalSouvenir = guests
        .filter(g => g.status_souvenir === 'SUDAH_AMBIL' || g.status_souvenir === 'SUDAH AMBIL')
        .length;

    const elTotal = document.getElementById('rekapTotalTerdaftar');
    const elHadir = document.getElementById('rekapTotalHadir');
    const elSouvenir = document.getElementById('rekapTotalSouvenir');

    if (elTotal) elTotal.innerText = totalTamu;
    if (elHadir) elHadir.innerText = totalHadir;
    if (elSouvenir) elSouvenir.innerText = totalSouvenir;
}

// =========================================================================
// MODUL TAMBAH TAMU MANUAL (DINAMIS MENGIKUTI FORM ACTIVE SUPABASE)
// =========================================================================

async function openAddGuestModal() {
    const questionsToRender = (typeof currentQuestions !== 'undefined' && currentQuestions.length > 0) 
        ? currentQuestions 
        : [
            { id: 'nama_tamu', label: 'Nama Tamu', type: 'text', required: true },
            { id: 'institusi', label: 'Institusi', type: 'text', required: false },
            { id: 'jumlah_pax', label: 'Jumlah Tamu Termasuk Anda', type: 'dropdown', options: ['1', '2', '3'], required: true }
          ];

    let formFieldsHtml = '';
    questionsToRender.forEach(q => {
        let reqMark = q.required ? '<span style="color:red;">*</span>' : '';
        
        formFieldsHtml += `<div style="margin-bottom: 12px; text-align: left;">`;
        formFieldsHtml += `<label style="font-weight: 800; color: #555; display: block; margin-bottom: 4px; font-size: 0.8rem;">${q.label} ${reqMark}</label>`;
        
        if (q.type === 'dropdown') {
            formFieldsHtml += `<select id="swal_field_${q.id}" class="swal2-select" style="width: 100%; margin: 0; height: 40px; font-size: 0.85rem; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">`;
            formFieldsHtml += `<option value="">-- Pilih ${q.label} --</option>`;
            (q.options || []).forEach(opt => {
                formFieldsHtml += `<option value="${opt}">${opt}</option>`;
            });
            formFieldsHtml += `</select>`;
        } else {
            formFieldsHtml += `<input id="swal_field_${q.id}" class="swal2-input" placeholder="Isi ${q.label}..." style="width: 100%; margin: 0; height: 40px; font-size: 0.85rem; box-sizing: border-box;">`;
        }
        formFieldsHtml += `</div>`;
    });

    formFieldsHtml += `
        <hr style="border: 0; border-top: 2px dashed #eee; margin: 20px 0 15px 0;">
        <div style="margin-bottom: 12px; text-align: left;">
            <label style="font-weight: 900; color: #846924; display: block; margin-bottom: 4px; font-size: 0.8rem;">KATEGORI TAMU</label>
            <select id="swal_field_kategori_tamu" class="swal2-select" style="width: 100%; margin: 0; height: 40px; font-size: 0.85rem; border: 2px solid #846924; font-weight: bold; color: #846924; border-radius: 6px; box-sizing: border-box;">
                <option value="Reguler">Tamu Reguler</option>
                <option value="VIP">Tamu VIP</option>
            </select>
        </div>
    `;

    const { value: formValues } = await Swal.fire({
        title: '<h2 style="font-family: \'Playfair Display\', serif; color: #846924; margin:0; font-weight: 900; font-size: 1.4rem;">TAMBAH TAMU MANUAL</h2>',
        html: `<div style="padding-top: 10px;">${formFieldsHtml}</div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan & Buat QR',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#b39343',
        cancelButtonColor: '#888',
        width: '440px',
        preConfirm: () => {
            let payload = {};
            let missing = false;

            questionsToRender.forEach(q => {
                let el = document.getElementById('swal_field_' + q.id);
                let val = el ? el.value.trim() : '';
                if (q.required && !val) missing = true;
                payload[q.id] = val;
            });

            let elKat = document.getElementById('swal_field_kategori_tamu');
            payload['kategori_tamu'] = elKat ? elKat.value : 'Reguler';

            if (missing) {
                Swal.showValidationMessage('Semua kolom bertanda bintang (*) wajib diisi!');
                return false;
            }
            return payload;
        }
    });

    if (formValues) {
        saveAndGenerateTicketManual(formValues);
    }
}

async function saveAndGenerateTicketManual(formDataPayload) {
    Swal.fire({ title: 'Menyimpan Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        const guestId = "TMO-" + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
        const guestName = formDataPayload['nama_tamu'] || formDataPayload[Object.keys(formDataPayload)[0]] || "Tamu Undangan";
        const paxValue = parseInt(formDataPayload['jumlah_pax'] || formDataPayload['jumlah_tamu'] || formDataPayload['c_jumlah_tamu_termasuk_anda'] || 1, 10) || 1;

        const guestDataToSave = {
            id: guestId,
            nama_tamu: guestName,
            kategori_tamu: formDataPayload['kategori_tamu'] || 'Reguler',
            jumlah_aktual: paxValue,
            status_kehadiran: 'BELUM_HADIR',
            status_souvenir: 'BELUM_AMBIL',
            form_data: formDataPayload,
            created_at: new Date().toISOString()
        };

        const { error } = await db.from('data_tamu').insert([guestDataToSave]);
        if (error) throw error;
        
        Swal.close();
        showQrCodeModal(guestId, guestName);
        if (typeof loadGuestRecapTable === "function") loadGuestRecapTable();

    } catch (err) {
        console.error("Gagal simpan manual:", err);
        Swal.fire('Gagal!', err.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
    }
}

// =========================================================================
// PEMICU OTOMATIS: DENGAR MENU NAVIGASI REKAP DIKLIK
// =========================================================================
document.addEventListener('click', function(e) {
    const target = e.target.closest('#navRekap, [onclick*="rekap"], [data-tab="rekap"]');
    if (target) setTimeout(loadGuestRecapTable, 100);
});

setTimeout(loadGuestRecapTable, 1000);

async function toggleGuestAttendance(guestId, currentStatus) {
    if (!guestId) return;

    const isCurrentlyHadir = currentStatus === 'HADIR';
    const newStatus = isCurrentlyHadir ? 'BELUM_HADIR' : 'HADIR';
    const newWaktuHadir = isCurrentlyHadir ? null : new Date().toISOString();
    const statusTextAlert = isCurrentlyHadir ? 'BELUM HADIR' : 'HADIR';

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

    Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        const { error } = await db
            .from('data_tamu')
            .update({ status_kehadiran: newStatus, waktu_hadir: newWaktuHadir })
            .eq('id', guestId);

        if (error) throw error;

        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Status diperbarui menjadi ${statusTextAlert}`, timer: 1200, showConfirmButton: false });
        loadGuestRecapTable();

    } catch (err) {
        console.error("Gagal update status kehadiran:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat mengupdate status di database.', 'error');
    }
}

async function viewGuestQr(guestId) {
    if (!guestId) return;

    Swal.fire({ title: 'Memuat QR Code...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        const { data: guest, error } = await db.from('data_tamu').select('*').eq('id', guestId).single();
        if (error || !guest) throw new Error("Data tamu tidak ditemukan.");

        Swal.close();
        showQrCodeModal(guest.id, guest.nama_tamu);

    } catch (err) {
        console.error("Gagal memuat QR Code tamu:", err);
        Swal.fire('Gagal!', 'Tidak dapat menampilkan QR Code tamu.', 'error');
    }
}

async function printGuestTicket(guestId) {
    if (!guestId) return;

    Swal.fire({ title: 'Menyiapkan Tiket...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        const { data: guest, error } = await db.from('data_tamu').select('*').eq('id', guestId).single();
        if (error || !guest) throw new Error("Data tamu tidak ditemukan.");

        const rawEventName = document.getElementById('adminEventName')?.value || 'NAMA ACARA';
        const rawEventDate = document.getElementById('adminEventDate')?.value || 'TANGGAL';
        const rawEventLocation = document.getElementById('adminEventLocation')?.value || 'LOKASI';
        
        const eventNameText = rawEventName.toUpperCase();
        const eventSubText = `${rawEventDate} | ${rawEventLocation}`.toUpperCase();
        const isVip = (guest.kategori_tamu || '').toUpperCase() === 'VIP';
        const nameOnTicket = guest.nama_tamu + (isVip ? ' (VIP)' : '');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 800;

        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#b39343"; ctx.lineWidth = 15;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        ctx.fillStyle = "#846924"; ctx.textAlign = "center";
        let fontSizeTitle = 45; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
        while (ctx.measureText(eventNameText).width > 520 && fontSizeTitle > 16) {
            fontSizeTitle -= 2; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
        }
        ctx.fillText(eventNameText, canvas.width/2, 100);

        ctx.fillStyle = "#333";
        let fontSizeSub = 18; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
        while (ctx.measureText(eventSubText).width > 520 && fontSizeSub > 10) {
            fontSizeSub -= 1; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
        }
        ctx.fillText(eventSubText, canvas.width/2, 160);

        ctx.fillStyle = "#777"; ctx.font = "800 24px 'Montserrat'";
        ctx.fillText("E - T I C K E T   P A S S", canvas.width/2, 220);

        ctx.fillStyle = "#333";
        let fontSizeName = 42; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
        while (ctx.measureText(nameOnTicket).width > 520 && fontSizeName > 20) {
            fontSizeName -= 2; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
        }
        ctx.fillText(nameOnTicket, canvas.width/2, 300);

        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, { text: guest.id, width: 200, height: 200 });
        await new Promise(resolve => setTimeout(resolve, 100));
        const tempImg = tempDiv.querySelector('img');
        if (tempImg && tempImg.src) {
            ctx.drawImage(tempImg, canvas.width/2 - 100, 360, 200, 200);
        }

        ctx.fillStyle = "#777"; ctx.font = "600 14px 'Montserrat'";
        ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width/2, 620);
        ctx.fillStyle = "#846924"; ctx.font = "800 22px 'Montserrat'";
        ctx.fillText("R A M A T L O K A", canvas.width/2, 680);

        Swal.close();

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

async function toggleGuestVipStatus(guestId, currentKategori) {
    if (!guestId) return;

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

    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        if (typeof db === "undefined" || !db) throw new Error("Database belum terhubung.");

        const { error } = await db
            .from('data_tamu')
            .update({ kategori_tamu: newKategori })
            .eq('id', guestId);

        if (error) throw error;

        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Kategori tamu kini menjadi ${kategoriTextAlert}`, timer: 1200, showConfirmButton: false });
        loadGuestRecapTable();

    } catch (err) {
        console.error("Gagal update kategori tamu:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat memperbarui database.', 'error');
    }
}

// =========================================================================
// FUNGSI AKSI: COPY PESAN WHATSAPP SESUAI TEMPLATE DINAMIS (SEMUA FORMAT)
// =========================================================================

async function copyWaMessage(guestId) {
    if (!guestId) return;

    try {
        // 1. Ambil data tamu dari cache atau database
        const guest = rawGuestDataCache.find(g => g.id === guestId);
        if (!guest) {
            Swal.fire({ title: 'Gagal', text: 'Data tamu tidak ditemukan!', icon: 'error' });
            return;
        }

        // 2. Ambil template pesan dari input Setup atau fallback default
        let template = document.getElementById('adminWaTemplate')?.value || '';
        
        if (!template.trim()) {
            template = "Halo {{nama}}, terima kasih telah melakukan registrasi. Simpan QR Code ini untuk akses masuk: {{qr_link}}";
        }

        // 3. Buat URL QR Code tamu
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guest.id)}`;
        const guestName = guest.nama_tamu || 'Tamu Undangan';

        // 4. Ganti placeholder (Mendukung {{nama}}, {nama}, [nama], {{qr_link}}, [qr_link], dll)
        let message = template
            .replace(/\{\{\s*nama\s*\}\}/gi, guestName)
            .replace(/\{\s*nama\s*\}/gi, guestName)
            .replace(/\[\s*nama\s*\]/gi, guestName)
            .replace(/\{\{\s*qr_link\s*\}\}/gi, qrCodeUrl)
            .replace(/\{\s*qr_link\s*\}/gi, qrCodeUrl)
            .replace(/\[\s*qr_link\s*\]/gi, qrCodeUrl);

        // 5. Salin teks ke Clipboard
        await navigator.clipboard.writeText(message);

        // 6. Notifikasi Berhasil Disalin
        Swal.fire({
            icon: 'success',
            title: 'Pesan Disalin!',
            html: `<p style="font-size: 0.85rem; color: #555;">Pesan untuk <b>${guestName}</b> berhasil disalin ke clipboard. Silakan tempel (paste) di WhatsApp atau Email.</p>`,
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'luxury-popup' }
        });

    } catch (err) {
        console.error("Gagal menyalin pesan WhatsApp:", err);
        Swal.fire({
            title: 'Gagal Salin',
            text: 'Izin clipboard ditolak oleh browser.',
            icon: 'error',
            customClass: { popup: 'luxury-popup' }
        });
    }
}
// =========================================================================
// HELPER PENARIKAN DATA INSTITUSI & FORMAT TIMESTAMP DINAMIS
// =========================================================================

function extractInstitusiVal(guest) {
    if (!guest) return 'Umum';
    if (guest.institusi && guest.institusi.trim() !== "" && guest.institusi !== 'Umum') {
        return guest.institusi;
    }
    if (guest.form_data) {
        let fd = typeof guest.form_data === 'string' ? JSON.parse(guest.form_data) : guest.form_data;
        if (fd.institusi && fd.institusi.trim() !== "") return fd.institusi;
        if (fd.c_institusi && fd.c_institusi.trim() !== "") return fd.c_institusi;
        if (fd.asal && fd.asal.trim() !== "") return fd.asal;

        for (let key in fd) {
            let lowerKey = key.toLowerCase();
            if ((lowerKey.includes('inst') || lowerKey.includes('asal')) && fd[key] && fd[key].toString().trim() !== "") {
                return fd[key].toString().trim();
            }
        }
    }
    return guest.institusi || 'Umum';
}

function formatSimpleTimestamp(isoString) {
    if (!isoString || isoString === '-') return '-';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;

        const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        return `${dateStr} ${timeStr}`;
    } catch (e) {
        return isoString;
    }
}

// 1. FUNGSI EXPORT TO EXCEL
function exportToExcel() {
    const targetData = getCurrentlyFilteredData();
    if (targetData.length === 0) {
        alert("Tidak ada data yang dapat diexport berdasarkan filter saat ini.");
        return;
    }

    const currentEventName = document.getElementById('adminEventName')?.value || 'NAMA ACARA BELUM DISET';
    const currentEventDate = document.getElementById('adminEventDate')?.value || 'TANGGAL';

    let totalTerdaftar = 0;
    let totalHadirPax = 0;
    let totalSouvenir = 0;
    let totalBelumHadir = 0;
    let vipHadir = 0;
    let regulerHadir = 0;

    targetData.forEach(g => {
        const pax = parseInt(g.jumlah_aktual || g.jumlah_tamu || 1, 10);
        totalTerdaftar += pax;
        const isHadir = g.status_kehadiran === 'HADIR';
        const isSouv = g.status_souvenir === 'SUDAH_AMBIL' || g.status_souvenir === 'SUDAH AMBIL';
        let kat = (g.kategori_tamu || 'REGULER').toUpperCase();

        if (isHadir) {
            totalHadirPax += pax;
            if (kat === 'VIP' || kat === 'TAMU VIP') vipHadir += pax;
            else regulerHadir += pax;
        } else {
            totalBelumHadir += pax;
        }

        if (isSouv) totalSouvenir += 1;
    });

    const wsData = [
        ["LAPORAN DAFTAR HADIR & REKAPITULASI TAMU"],
        ["Nama Event:", currentEventName.toUpperCase()],
        ["Tanggal Pelaksanaan:", currentEventDate],
        [],
        ["RINGKASAN STATISTIK (Berdasarkan Filter Aktif)"],
        ["Total Nama Terdaftar (Pax)", totalTerdaftar],
        ["Total Kehadiran Tamu (Pax)", totalHadirPax],
        ["Total Ambil Souvenir", totalSouvenir],
        ["Total Belum Hadir (Pax)", totalBelumHadir],
        ["Total Tamu VIP Hadir (Pax)", vipHadir],
        ["Total Tamu Reguler Hadir (Pax)", regulerHadir],
        [],
        ["DAFTAR RINCIAN TAMU UNDANGAN"],
        ["NO", "NAMA TAMU", "INSTITUSI", "KATEGORI", "JUMLAH (PAX)", "STATUS CHECK-IN", "STATUS SOUVENIR", "WAKTU HADIR"]
    ];

    targetData.forEach((guest, index) => {
        wsData.push([
            index + 1,
            guest.nama_tamu || '-',
            extractInstitusiVal(guest),
            (guest.kategori_tamu || 'Reguler').toUpperCase(),
            guest.jumlah_aktual || 1,
            guest.status_kehadiran === 'HADIR' ? 'HADIR' : 'BELUM HADIR',
            (guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL') ? 'SUDAH AMBIL' : 'BELUM AMBIL',
            formatSimpleTimestamp(guest.waktu_hadir)
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Tamu");
    XLSX.writeFile(wb, `Laporan_Rekap_Tamu_${safeFileName(currentEventName)}.xlsx`);
}

// 2. FUNGSI EXPORT TO PDF
function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    
    const targetData = getCurrentlyFilteredData();
    if (targetData.length === 0) {
        alert("Tidak ada data yang dapat diexport berdasarkan filter saat ini.");
        return;
    }

    const currentEventName = document.getElementById('adminEventName')?.value || 'NAMA ACARA BELUM DISET';
    const currentEventDate = document.getElementById('adminEventDate')?.value || 'TANGGAL';

    let totalNamaTerdaftar = targetData.length;
    let totalHadirPax = 0;
    let totalSouvenir = 0;
    let totalBelumHadirNama = 0;
    let vipHadirPax = 0;
    let regulerHadirPax = 0;

    targetData.forEach(g => {
        const pax = parseInt(g.jumlah_aktual || g.jumlah_tamu || 1, 10);
        const isHadir = g.status_kehadiran === 'HADIR';
        const isSouv = g.status_souvenir === 'SUDAH_AMBIL' || g.status_souvenir === 'SUDAH AMBIL';
        let kat = (g.kategori_tamu || 'REGULER').toUpperCase();

        if (isHadir) {
            totalHadirPax += pax;
            if (kat === 'VIP' || kat === 'TAMU VIP') vipHadirPax += pax;
            else regulerHadirPax += pax;
        } else {
            totalBelumHadirNama += 1;
        }

        if (isSouv) totalSouvenir += 1;
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER SECTION
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(179, 147, 67);
    doc.text("TAMOO", pageWidth / 2, 38, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 50);
    doc.text("LAPORAN REKAPITULASI DATA TAMU", pageWidth / 2, 55, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Nama Event: ${currentEventName.toUpperCase()}   |   Tanggal Pelaksanaan: ${currentEventDate}`, pageWidth / 2, 72, { align: "center" });

    // STATISTIK SUMMARY CARD BOX
    const cardX = 40;
    const cardY = 88;
    const cardWidth = pageWidth - 80;
    const cardHeight = 65;

    doc.setDrawColor(218, 192, 123); 
    doc.setFillColor(254, 253, 247); 
    doc.setLineWidth(1);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6, 6, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);

    doc.text(`• Total Kehadiran Nama Terdaftar :  ${totalNamaTerdaftar} Nama`, cardX + 25, cardY + 20);
    doc.text(`• Total Kehadiran Tamu (Pax)     :  ${totalHadirPax} Orang`, cardX + 25, cardY + 38);
    doc.text(`• Total Pengambilan Souvenir     :  ${totalSouvenir} Pcs`, cardX + 25, cardY + 54);

    doc.text(`• Total Belum Hadir              :  ${totalBelumHadirNama} Nama`, cardX + 410, cardY + 20);
    doc.text(`• Total Tamu VIP Hadir (Pax)     :  ${vipHadirPax} Orang`, cardX + 410, cardY + 38);
    doc.text(`• Total Tamu Reguler Hadir (Pax) :  ${regulerHadirPax} Orang`, cardX + 410, cardY + 54);

    // DATA TABLE UNDANGAN
    const tableHeaders = [["NO", "NAMA LENGKAP TAMU", "INSTITUSI", "PAX", "KATEGORI", "STATUS KEHADIRAN", "STATUS SOUVENIR", "WAKTU HADIR"]];
    
    const tableRows = targetData.map((guest, idx) => {
        return [
            idx + 1,
            guest.nama_tamu || '-',
            extractInstitusiVal(guest),
            guest.jumlah_aktual || 1,
            (guest.kategori_tamu || 'Reguler').toUpperCase(),
            guest.status_kehadiran === 'HADIR' ? 'HADIR' : 'BELUM HADIR',
            (guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL') ? 'SUDAH AMBIL' : 'BELUM AMBIL',
            formatSimpleTimestamp(guest.waktu_hadir)
        ];
    });

    doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: cardY + cardHeight + 15,
        margin: { left: 40, right: 40 },
        theme: 'striped',
        headStyles: { 
            fillColor: [179, 147, 67], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold', 
            halign: 'center',
            fontSize: 8.5
        }, 
        styles: { fontSize: 8, cellPadding: 5, verticalAlign: 'middle' },
        columnStyles: {
            0: { halign: 'center', width: 30 },
            1: { halign: 'left', width: 140 },
            2: { halign: 'left', width: 130 },
            3: { halign: 'center', width: 40 },
            4: { halign: 'center', width: 70 },
            5: { halign: 'center', width: 100 },
            6: { halign: 'center', width: 110 },
            7: { halign: 'center', width: 120 }
        },
        didDrawPage: function (data) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("Powered by RAMATLOKA", pageWidth - 145, 575);
        }
    });

    doc.save(`Laporan_Rekap_Tamu_${safeFileName(currentEventName)}.pdf`);
}

function safeFileName(str) {
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + new Date().toISOString().slice(0,10);
}
// =========================================================================
// PENGATURAN TEMPLATE & IMPORT EXCEL PREMIUM (DINAMIS 100% ANTI-GAGAL)
// =========================================================================

// 1. FUNGSI DOWNLOAD TEMPLATE EXCEL (MENGIKUTI STRUKTUR PERTANYAAN AKTIF)
async function downloadExcelTemplate() {
    Swal.fire({
        title: 'Menyiapkan Template...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Ambil daftar pertanyaan aktif dari currentQuestions / Supabase
        const activeQuestions = (typeof currentQuestions !== 'undefined' && currentQuestions.length > 0)
            ? currentQuestions
            : [
                { id: 'nama_tamu', label: 'Nama Tamu' },
                { id: 'institusi', label: 'Institusi' },
                { id: 'jumlah_pax', label: 'Jumlah Tamu Termasuk Anda' }
              ];

        let headers = [];
        let sampleRow = [];

        // Masukkan header dari label pertanyaan dinamis
        activeQuestions.forEach(q => {
            headers.push(q.label);
            if (q.type === 'dropdown' && q.options && q.options.length > 0) {
                sampleRow.push(q.options[0]); // Ambil opsi pertama sebagai contoh
            } else if (q.id.includes('jumlah') || q.label.toLowerCase().includes('jumlah')) {
                sampleRow.push(1);
            } else {
                sampleRow.push("Contoh Jawaban");
            }
        });

        // Tambahkan Kolom Kategori Tamu di Paling Akhir (Opsional)
        headers.push("Kategori (Reguler / VIP)");
        sampleRow.push("Reguler");

        // Proses Pembuatan Dokumen Excel
        const wsData = [headers, sampleRow];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Atur lebar kolom yang ideal
        ws['!cols'] = headers.map(() => ({ wch: 30 }));

        XLSX.utils.book_append_sheet(wb, ws, "Template_Import");
        Swal.close();
        XLSX.writeFile(wb, "Template_Import_Tamu_TAMOO.xlsx");

    } catch (err) {
        console.error("Gagal membuat template dinamis:", err);
        Swal.close();
        // Fallback aman
        const fallbackWs = XLSX.utils.aoa_to_sheet([
            ["Nama Tamu", "Institusi", "Jumlah Tamu Termasuk Anda", "Kategori (Reguler / VIP)"],
            ["Budi Santoso", "Umum", 1, "Reguler"]
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, fallbackWs, "Template_Import");
        XLSX.writeFile(wb, "Template_Import_Tamu_TAMOO.xlsx");
    }
}

// 2. FUNGSI PEMROSES FILE IMPORT EXCEL (MEMBACA DATA DINAMIS KE FORM_DATA)
async function processExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({
        title: 'Membaca File Excel...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Konversi ke JSON data
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (rawJson.length === 0) throw new Error("File Excel kosong atau tidak memiliki data baris.");

            // Hapus baris sampel jika pengguna lupa menghapusnya
            const filteredRows = rawJson.filter(row => {
                const firstVal = Object.values(row)[0] ? Object.values(row)[0].toString().toLowerCase() : '';
                return !firstVal.includes('contoh') && firstVal !== 'budi santoso';
            });

            const dataToProcess = filteredRows.length > 0 ? filteredRows : rawJson;

            // Pemetaan data adaptif ke Supabase
            const payload = dataToProcess.map((row, idx) => {
                let formPayload = {};
                let guestName = '';
                let paxValue = 1;
                let kategoriValue = 'Reguler';

                // Pemetaaan Jawaban berdasarkan Label Pertanyaan
                Object.keys(row).forEach(headerKey => {
                    const cleanHeader = headerKey.trim();
                    const valueStr = row[headerKey] ? row[headerKey].toString().trim() : '';

                    // Cek apakah header cocok dengan pertanyaan aktif
                    const matchedQ = (typeof currentQuestions !== 'undefined') 
                        ? currentQuestions.find(q => q.label.toLowerCase() === cleanHeader.toLowerCase())
                        : null;

                    if (matchedQ) {
                        formPayload[matchedQ.id] = valueStr;
                        if (matchedQ.id === 'nama_tamu' || matchedQ.label.toLowerCase().includes('nama')) {
                            guestName = valueStr;
                        }
                        if (matchedQ.id === 'jumlah_pax' || matchedQ.label.toLowerCase().includes('jumlah')) {
                            paxValue = parseInt(valueStr, 10) || 1;
                        }
                    } else {
                        // Deteksi Kolom Bawaan Kategori / Fallback Nama & Pax
                        const lowerHeader = cleanHeader.toLowerCase();
                        if (lowerHeader.includes('kategori')) {
                            kategoriValue = valueStr || 'Reguler';
                        } else if (!guestName && (lowerHeader.includes('nama') || lowerHeader.includes('tamu'))) {
                            guestName = valueStr;
                        } else if (lowerHeader.includes('jumlah') || lowerHeader.includes('pax')) {
                            paxValue = parseInt(valueStr, 10) || 1;
                        } else {
                            // Simpan kolom kustom lain jika ada
                            formPayload[cleanHeader.toLowerCase().replace(/\s+/g, '_')] = valueStr;
                        }
                    }
                });

                // Fallback nama jika kosong
                if (!guestName) {
                    guestName = Object.values(row)[0] ? Object.values(row)[0].toString() : `Tamu ${idx + 1}`;
                }

                // Generate Unique ID Tamu untuk QR Code
                const randomCode = Math.floor(1000 + Math.random() * 9000);
                const guestId = "TMO-" + (Date.now() + idx).toString().slice(-6) + randomCode;

                return {
                    id: guestId,
                    nama_tamu: guestName,
                    kategori_tamu: kategoriValue,
                    jumlah_aktual: paxValue,
                    status_kehadiran: 'BELUM_HADIR',
                    status_souvenir: 'BELUM_AMBIL',
                    form_data: formPayload,
                    created_at: new Date().toISOString()
                };
            });

            Swal.fire({ title: 'Menyimpan ke Supabase...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            // Kirim data massal ke Supabase
            const { error } = await db.from('data_tamu').insert(payload);
            if (error) throw error;

            // Reset komponen input file
            const inputEl = document.getElementById('excelUploadInput') || document.getElementById('importExcelInput');
            if (inputEl) inputEl.value = "";

            Swal.fire({
                title: 'Berhasil Impor!',
                text: `${payload.length} data tamu sukses dimasukkan ke database & QR Code otomatis dibuat!`,
                icon: 'success',
                customClass: { popup: 'luxury-popup' }
            });
            
            // Perbarui visual tabel rekap secara instan
            if (typeof loadGuestRecapTable === "function") loadGuestRecapTable();

        } catch (err) {
            console.error("Gagal Eksekusi Impor Excel:", err);
            Swal.fire('Gagal Impor!', err.message || 'Terjadi kendala sistem saat membaca format berkas.', 'error');
            
            const inputEl = document.getElementById('excelUploadInput') || document.getElementById('importExcelInput');
            if (inputEl) inputEl.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

// 3. FUNGSI CETAK QR TERPILIH (BATCH DOWNLOAD KE DALAM ZIP)
async function downloadSelectedQRCodes() {
    const checkedBoxes = document.querySelectorAll('.chk-select-guest:checked');
    if (checkedBoxes.length === 0) {
        Swal.fire('Pilih Tamu!', 'Silakan centang minimal satu nama tamu pada tabel terlebih dahulu.', 'warning');
        return;
    }

    const eventNameText = (document.getElementById('adminEventName')?.value || 'NAMA ACARA').toUpperCase();
    const eventSubText = `${document.getElementById('adminEventDate')?.value || 'TANGGAL'} | ${document.getElementById('adminEventLocation')?.value || 'LOKASI'}`.toUpperCase();

    Swal.fire({
        title: 'Mengekstrak E-Ticket...',
        html: `Memproses <b>0</b> dari ${checkedBoxes.length} tiket...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const zip = new JSZip();
        let processedCount = 0;

        for (const checkbox of checkedBoxes) {
            const guestId = checkbox.value;
            const guest = rawGuestDataCache.find(g => g.id === guestId);
            if (!guest) continue;

            const isVip = (guest.kategori_tamu || '').toUpperCase() === 'VIP';
            const nameOnTicket = guest.nama_tamu + (isVip ? ' (VIP)' : '');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 600; canvas.height = 800;

            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#b39343"; ctx.lineWidth = 15;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

            ctx.fillStyle = "#846924"; ctx.textAlign = "center";
            let fontSizeTitle = 45; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
            while (ctx.measureText(eventNameText).width > 520 && fontSizeTitle > 16) {
                fontSizeTitle -= 2; ctx.font = `900 ${fontSizeTitle}px 'Playfair Display'`;
            }
            ctx.fillText(eventNameText, canvas.width/2, 100);

            ctx.fillStyle = "#333";
            let fontSizeSub = 18; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
            while (ctx.measureText(eventSubText).width > 520 && fontSizeSub > 10) {
                fontSizeSub -= 1; ctx.font = `600 ${fontSizeSub}px 'Montserrat'`;
            }
            ctx.fillText(eventSubText, canvas.width/2, 160);

            ctx.fillStyle = "#777"; ctx.font = "800 24px 'Montserrat'";
            ctx.fillText("E - T I C K E T   P A S S", canvas.width/2, 220);

            ctx.fillStyle = "#333";
            let fontSizeName = 42; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
            while (ctx.measureText(nameOnTicket).width > 520 && fontSizeName > 20) {
                fontSizeName -= 2; ctx.font = `900 ${fontSizeName}px 'Montserrat'`;
            }
            ctx.fillText(nameOnTicket, canvas.width/2, 300);

            const tempDiv = document.createElement('div');
            new QRCode(tempDiv, { text: guest.id, width: 200, height: 200 });
            await new Promise(resolve => setTimeout(resolve, 150));
            const tempImg = tempDiv.querySelector('img');
            if (tempImg && tempImg.src) {
                ctx.drawImage(tempImg, canvas.width/2 - 100, 360, 200, 200);
            }

            ctx.fillStyle = "#777"; ctx.font = "600 14px 'Montserrat'";
            ctx.fillText("*Tunjukkan tiket ini kepada petugas di pintu masuk", canvas.width/2, 620);
            ctx.fillStyle = "#846924"; ctx.font = "800 22px 'Montserrat'";
            ctx.fillText("R A M A T L O K A", canvas.width/2, 680);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            // Format Nama File ZIP: nama_eticket_VIP.png
            const safeName = guest.nama_tamu.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const vipSuffix = isVip ? '_VIP' : '';
            const fileName = `${safeName}_eticket${vipSuffix}.png`;
            
            zip.file(fileName, blob);

            processedCount++;
            Swal.getHtmlContainer().innerHTML = `Memproses <b>${processedCount}</b> dari ${checkedBoxes.length} tiket...`;
        }

        Swal.fire({ title: 'Membungkus ZIP...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const zipContent = await zip.generateAsync({ type: "blob" });
        saveAs(zipContent, `E-Tickets_TAMOO_${new Date().toISOString().slice(0,10)}.zip`);
        
        Swal.fire('Berhasil!', `${processedCount} e-ticket berhasil didownload dalam format ZIP.`, 'success');

        checkedBoxes.forEach(cb => cb.checked = false);

    } catch (err) {
        console.error("Gagal memproses ZIP tiket:", err);
        Swal.fire('Gagal!', 'Terjadi kesalahan saat mengekstrak tiket.', 'error');
    }
}
// =========================================================================
// FITUR MODUL: LINK FORM PUBLIK & QR CODE POLOS POSTER
// =========================================================================

// 1. Inisialisasi Link Publik Otomatis saat Halaman Dimuat
function initPublicFormUrl() {
    const inputEl = document.getElementById('publicLinkDisplay');
    if (!inputEl) return;

    // Deteksi URL domain saat ini lalu tambahkan parameter mode=public
    const baseUrl = window.location.origin + window.location.pathname;
    const publicUrl = `${baseUrl}?mode=public`;
    
    inputEl.value = publicUrl;
}

// 2. Fungsi Tombol COPY Link Publik (Sesuai ID & Onclick HTML)
function copyPublicLink() {
    const inputEl = document.getElementById('publicLinkDisplay');
    if (!inputEl || !inputEl.value) return;

    navigator.clipboard.writeText(inputEl.value).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Berhasil Disalin!',
            text: 'Link form publik telah tersimpan di clipboard.',
            timer: 1500,
            showConfirmButton: false
        });
    }).catch(err => {
        console.error('Gagal menyalin link:', err);
        // Fallback untuk browser lama
        inputEl.select();
        document.execCommand('copy');
        Swal.fire('Tersalin!', 'Link form publik berhasil disalin.', 'success');
    });
}

// 3. Fungsi Pop-up Modal LIHAT / DOWNLOAD QR POLOS POSTER
function showPolosPublicFormQR() {
    const inputEl = document.getElementById('publicLinkDisplay');
    const publicUrl = inputEl ? inputEl.value : `${window.location.origin}${window.location.pathname}?mode=public`;

    // Buat container tersembunyi untuk merender QR Code
    const tempDiv = document.createElement('div');
    new QRCode(tempDiv, {
        text: publicUrl,
        width: 300,
        height: 300,
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const qrImg = tempDiv.querySelector('img');
        const qrSrc = qrImg ? qrImg.src : '';

        Swal.fire({
            title: '<strong style="color: #137333; font-size: 1.1rem;"><i class="fas fa-qrcode"></i> QR CODE FORM PUBLIK</strong>',
            html: `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px;">
                    <p style="font-size: 0.8rem; color: #666; margin-bottom: 15px;">
                        Gunakan QR Code polos ini untuk ditempel pada poster venue / standing banner acara.
                    </p>
                    <div style="background: #fff; padding: 15px; border-radius: 12px; border: 2px solid #137333; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <img src="${qrSrc}" style="width: 250px; height: 250px; display: block;" alt="QR Code Poster">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#137333',
            cancelButtonColor: '#888',
            confirmButtonText: '<i class="fas fa-download"></i> Download QR PNG',
            cancelButtonText: 'Tutup'
        }).then((result) => {
            if (result.isConfirmed && qrSrc) {
                // Download file PNG QR Code Polos
                const a = document.createElement('a');
                a.href = qrSrc;
                a.download = `QR_Poster_Form_TAMOO.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    }, 150);
}

// Jalankan inisialisasi link publik otomatis
document.addEventListener('DOMContentLoaded', () => {
    initPublicFormUrl();
});
if (document.readyState === "complete" || document.readyState === "interactive") {
    initPublicFormUrl();
}
// =========================================================================
// LOGIKA PENANGANAN MODE LINK PUBLIK (FORM PUBLIK ONLY)
// =========================================================================

function checkAndApplyPublicMode() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Cek apakah URL memiliki parameter ?mode=public
    if (urlParams.get('mode') === 'public') {
        console.log("TAMOO: Mengaktifkan mode formulir publik...");

        // 1. SEMBUNYIKAN: Navigasi Bawah, Admin Header, DAN TICKER / RUNNING TEXT
        const selectorsToHide = [
            '.bottom-nav', 'nav', '#bottomNav', '.nav-bar', 
            '.admin-header', '.ticker-wrap', '#tickerWrapContainer', 
            '.ticker-container', '#runningTextNav', '.ticker-move'
        ];
        
        selectorsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        });

        // 2. Cari & Tampilkan HANYA section Form Pendaftaran secara akurat
        const formSectionIds = ['secForm', 'secRegister', 'formPendaftaran', 'sectionForm', 'secTamu'];
        let targetFormElement = null;

        for (let id of formSectionIds) {
            const el = document.getElementById(id);
            if (el) {
                targetFormElement = el;
                break;
            }
        }

        if (!targetFormElement) {
            targetFormElement = Array.from(document.querySelectorAll('.section')).find(s => {
                const identity = (s.id + ' ' + s.className).toLowerCase();
                return identity.includes('form') || identity.includes('reg') || identity.includes('tamu');
            });
        }

        // 3. Eksekusi Tampilan Layar Form
        if (targetFormElement) {
            document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
            targetFormElement.style.display = 'block';
            
            if (typeof showSection === 'function') {
                showSection(targetFormElement.id);
            }
        }
    }
}

// Jalankan otomatis saat seluruh elemen DOM HTML selesai di-load
document.addEventListener('DOMContentLoaded', checkAndApplyPublicMode);

// Panggil juga secara langsung untuk mengantisipasi script yang dimuat belakangan
if (document.readyState === "complete" || document.readyState === "interactive") {
    checkAndApplyPublicMode();
}

// =========================================================================
// REAL-TIME VISUAL KONTROL: REKAP BOX INDIKATOR CHECK-IN SCANNER
// =========================================================================
async function loadCheckInStats() {
    try {
        if (typeof db === "undefined" || !db) return;

        const { data: allGuests, error } = await db
            .from('data_tamu')
            .select('jumlah_aktual, status_kehadiran');

        if (error) throw error;

        let totalTamuHadir = 0;
        let totalPengunjungPax = 0;

        if (allGuests && allGuests.length > 0) {
            allGuests.forEach(guest => {
                const pax = parseInt(guest.jumlah_aktual, 10) || 1;
                if (guest.status_kehadiran === 'HADIR') {
                    totalTamuHadir += 1;
                    totalPengunjungPax += pax;
                }
            });
        }

        const padZero = (num) => num < 10 && num >= 0 ? `0${num}` : num;

        // Menggunakan ID presisi dari index.html Anda
        const elRegistered = document.getElementById('totalHadirCounter');
        const elTotal = document.getElementById('totalPengunjungCounter');

        if (elRegistered) elRegistered.innerText = padZero(totalTamuHadir);
        if (elTotal) elTotal.innerText = padZero(totalPengunjungPax);

    } catch (err) {
        console.error("TAMOO Error: Gagal menghitung statistik check-in scanner:", err);
    }
}

// =========================================================================
// LOGIKA SCAN SOUVENIR INDEPENDEN (ANTI-BLOCKING CHECK-IN)
// =========================================================================

// 1. PENDENGAR INPUT USB SCANNER / KETIK MANUAL KHUSUS SOUVENIR
document.addEventListener('DOMContentLoaded', () => {
    const souvenirInput = document.getElementById('usbScannerSouvenirInput');
    if (souvenirInput) {
        souvenirInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const guestId = this.value.trim();
                if (guestId !== "") {
                    processIndependentSouvenir(guestId);
                }
            }
        });
    }
});

// 2. FUNGSI UTAMA: Eksekusi Klaim Souvenir Secara Mandiri
async function processIndependentSouvenir(guestId) {
    if (!guestId || guestId.trim() === "") return;
    const cleanId = guestId.trim();

    // Reset kolom input souvenir agar stand-by untuk scan selanjutnya
    const souvenirInput = document.getElementById('usbScannerSouvenirInput');
    if (souvenirInput) souvenirInput.value = "";

    try {
        Swal.fire({ title: 'Memverifikasi...', text: 'Mengecek jatah souvenir...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // Tarik data tamu berdasarkan ID dari Supabase
        const { data: guest, error: fetchError } = await db.from('data_tamu').select('*').eq('id', cleanId).maybeSingle();
        
        if (fetchError) throw fetchError;
        
        // JIKA TAMU TIDAK DITEMUKAN
        if (!guest) {
            if (typeof playBeepSound === "function") playBeepSound('error');
            Swal.fire({ title: 'Scan Gagal', text: `ID Tamu (${cleanId}) tidak terdaftar di sistem!`, icon: 'error', customClass: { popup: 'luxury-popup' } });
            return;
        }

        // JIKA SOUVENIR SUDAH PERNAH DIAMBIL
        if (guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL') {
            if (typeof playBeepSound === "function") playBeepSound('error');
            Swal.fire({ 
                title: 'Sudah Diambil', 
                html: `<b style="font-size:18px; color:#c5221f;">${guest.nama_tamu}</b><br><br>Tamu ini sudah mengambil jatah souvenir sebelumnya!`, 
                icon: 'warning', 
                customClass: { popup: 'luxury-popup' } 
            });
            return;
        }

        // UPDATE STATUS HANYA PADA KOLOM SOUVENIR (Tanpa memedulikan status_kehadiran)
        const { error: updateError } = await db.from('data_tamu').update({
            status_souvenir: 'SUDAH_AMBIL'
        }).eq('id', cleanId);

        if (updateError) throw updateError;

        // Bunyikan Bell Sukses
        if (typeof playBeepSound === "function") playBeepSound('success');

        // Tampilkan Pop-Up Klaim Souvenir Berhasil
        Swal.fire({
            title: 'SOUVENIR BERHASIL KLAIM',
            html: `
                <div style="text-align:center; padding:5px;">
                    <i class="fas fa-gift" style="font-size:48px; color:#1967d2; margin-bottom:15px;"></i>
                    <h2 style="margin:0 0 10px 0; font-weight:800; text-transform:uppercase; color:#222;">${guest.nama_tamu}</h2>
                    <span style="background:#e8f0fe; color:#1967d2; font-weight:bold; padding:6px 20px; border-radius:50px; font-size:14px;">
                        Berikan Jatah: ${guest.jumlah_aktual || 1} Pcs
                    </span>
                    <p style="margin-top: 10px; font-size: 11px; color: #777;">
                        Status Kehadiran: ${guest.status_kehadiran === 'HADIR' ? '🟢 Sudah Check-in' : '⚪ Belum Check-in'}
                    </p>
                </div>
            `,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            customClass: { popup: 'luxury-popup' }
        });

        // Hubungkan kembali untuk merefresh visual counter di box atas souvenir & tabel rekap
        if (typeof loadSouvenirStats === "function") loadSouvenirStats();
        if (typeof loadGuestRecapTable === "function") loadGuestRecapTable();
        if (typeof loadForm === "function") loadForm(); // Jika ada refresh form global

    } catch (err) {
        if (typeof playBeepSound === "function") playBeepSound('error');
        Swal.fire({ title: 'Sistem Error', text: err.message, icon: 'error', customClass: { popup: 'luxury-popup' } });
    }
}

// =========================================================================
// HANDLER UPLOAD FILE GAMBAR QR UNTUK SOUVENIR (INDEPENDEN)
// =========================================================================

async function handleNativeCameraSouvenir(event) {
    let file = null;

    // Menangkap file dari event upload HTML
    if (event && event.target && event.target.files) {
        file = event.target.files[0];
    } else if (event && event.files) {
        file = event.files[0];
    }

    if (!file) return;

    Swal.fire({ 
        title: 'Membaca Gambar...', 
        text: 'Mengecek QR Souvenir dari file...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    try {
        // Pemindaian menggunakan library Html5Qrcode jika tersedia
        if (typeof Html5Qrcode !== "undefined") {
            const html5QrCode = new Html5Qrcode("readerSouvenir" || "reader");
            const decodedText = await html5QrCode.scanFile(file, true);
            
            Swal.close();
            // Eksekusi klaim souvenir independen
            processIndependentSouvenir(decodedText);
        } else {
            throw new Error("Library Html5Qrcode tidak ditemukan di halaman.");
        }
    } catch (err) {
        if (typeof playBeepSound === "function") playBeepSound('error');
        Swal.fire({ 
            title: 'Gagal Membaca QR', 
            text: 'Tidak dapat menemukan Kode QR yang valid pada gambar tersebut.', 
            icon: 'error',
            customClass: { popup: 'luxury-popup' }
        });
    } finally {
        // Reset input file agar gambar yang sama bisa di-upload ulang jika diperlukan
        if (event && event.target) event.target.value = "";
    }
}
// =========================================================================
// REAL-TIME VISUAL KONTROL: REKAP BOX INDIKATOR SOUVENIR
// =========================================================================

async function loadSouvenirStats() {
    try {
        if (typeof db === "undefined" || !db) return;

        // 1. Tarik seluruh data tamu dari Supabase
        const { data: allGuests, error } = await db
            .from('data_tamu')
            .select('jumlah_aktual, status_kehadiran, status_souvenir');

        if (error) throw error;

        let totalSouvenirKeluar = 0;
        let totalTamuHadir = 0;
        let totalSeluruhKuotaPendaftar = 0;

        // 2. Akumulasi data secara cepat
        if (allGuests && allGuests.length > 0) {
            allGuests.forEach(guest => {
                const pax = parseInt(guest.jumlah_aktual, 10) || 1;
                
                // Hitung total seluruh pendaftar (untuk kalkulasi sisa)
                totalSeluruhKuotaPendaftar += pax;

                // Hitung total tamu yang sudah Check-In
                if (guest.status_kehadiran === 'HADIR') {
                    totalTamuHadir++;
                }

                // Hitung total Souvenir yang sudah diserahkan (berdasarkan pax/jumlah_aktual)
                if (guest.status_souvenir === 'SUDAH_AMBIL' || guest.status_souvenir === 'SUDAH AMBIL') {
                    totalSouvenirKeluar += pax; 
                }
            });
        }

        // 3. Hitung Selisih Sisa Belum Ambil
        let totalBelumAmbil = totalSeluruhKuotaPendaftar - totalSouvenirKeluar;
        if (totalBelumAmbil < 0) totalBelumAmbil = 0; // Proteksi agar tidak negatif

        // Format angka menjadi 2 digit (misal: 05, 12)
        const padZero = (num) => num < 10 && num >= 0 ? `0${num}` : num;

        // 4. Inject angka ke elemen HTML
        const elKeluar = document.getElementById('totalSouvenirCounter');
        const elHadir = document.getElementById('totalHadirSouvCounter');
        const elSisa = document.getElementById('sisaSouvCounter');

        if (elKeluar) elKeluar.innerText = padZero(totalSouvenirKeluar);
        if (elHadir) elHadir.innerText = padZero(totalTamuHadir);
        if (elSisa) elSisa.innerText = padZero(totalBelumAmbil);

    } catch (err) {
        console.error("TAMOO Error: Gagal menghitung statistik souvenir:", err);
    }
}
// =========================================================================
// FUNGSI LAYAR TERIMA KASIH (AUTO-LOCK FORM PUBLIK SETELAH REGISTRASI)
// =========================================================================

function showPublicSuccessPage(guestName) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Hanya berlaku jika aplikasi dibuka lewat Link Publik (?mode=public)
    if (urlParams.get('mode') === 'public') {
        
        // Cari container form utama Anda
        const formSec = document.getElementById('secTamu') || 
                        document.getElementById('secForm') || 
                        document.querySelector('.section.active');

        if (formSec) {
            // Sembunyikan isian form pendaftaran agar tidak bisa diisi ulang secara iseng
            formSec.style.display = 'none';

            // Buat elemen Layar Terima Kasih Mewah
            let thankYouBox = document.getElementById('publicThankYouBox');
            if (!thankYouBox) {
                thankYouBox = document.createElement('div');
                thankYouBox.id = 'publicThankYouBox';
                thankYouBox.className = 'section active';
                thankYouBox.style.cssText = 'text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); margin: 20px auto; max-width: 500px; border: 1px solid #f0e6d2;';
                formSec.parentNode.insertBefore(thankYouBox, formSec.nextSibling);
            }

            thankYouBox.innerHTML = `
                <div style="background: #e6f4ea; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; border: 2px solid #137333;">
                    <i class="fas fa-check-circle" style="font-size: 45px; color: #137333;"></i>
                </div>
                <h2 style="font-family: 'Playfair Display', serif; color: var(--gold-dark, #846924); font-size: 1.8rem; margin-bottom: 10px; font-weight: 800;">
                    TERIMA KASIH
                </h2>
                <h3 style="font-size: 1.2rem; color: #222; font-weight: 700; text-transform: uppercase; margin-bottom: 15px;">
                    ${guestName ? guestName : 'Data Anda Berhasil Disimpan'}
                </h3>
                <p style="font-size: 0.95rem; color: #555; line-height: 1.6; margin-bottom: 10px; font-weight: 500;">
                    Pendaftaran Anda telah sukses tercatat di sistem.<br>
                    <b>Pastikan Anda telah menyimpan / mengunduh QR Code E-Ticket</b> untuk ditunjukkan kepada petugas saat hadir di event nanti.
                </p>
            `;
            
            thankYouBox.style.display = 'block';
        }
    }
}
// =========================================================================
// FUNGSI HAPUS / NONAKTIFKAN POSTER TV
// =========================================================================
async function removeTvPoster() {
    // 1. Kosongkan input form
    const posterUrlInput = document.getElementById('adminPosterUrl');
    const fileInput = document.getElementById('adminPosterUpload');
    if (posterUrlInput) posterUrlInput.value = '';
    if (fileInput) fileInput.value = '';
    
    // 2. Perbarui status visual di form admin
    const statusEl = document.getElementById('posterPreviewStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#dc3545';
        statusEl.innerHTML = '<i class="fas fa-info-circle"></i> Poster dinonaktifkan. Sedang memperbarui...';
    }

    try {
        // 3. Update langsung ke Supabase app_config
        const { error } = await db
            .from('app_config')
            .upsert({ key: 'PosterUrl', value: '' }, { onConflict: 'key' });

        if (error) throw error;

        localStorage.setItem('currentEventPoster', '');

        // 4. Siarkan langsung ke TV agar poster seketika hilang
        if (typeof tvBroadcast !== 'undefined') {
            tvBroadcast.postMessage({
                type: 'UPDATE_POSTER',
                data: { posterUrl: '' }
            });
        }

        if (statusEl) {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Poster berhasil dinonaktifkan dari Layar TV.';
        }

        Swal.fire({
            title: 'Poster Dinonaktifkan',
            text: 'Poster telah dihapus dari Layar TV dan kembali ke mode scanner.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Gagal menghapus poster dari Supabase:", err);
        Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus poster.', 'error');
    }
}
