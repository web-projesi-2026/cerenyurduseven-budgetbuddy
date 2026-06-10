// ============================================
// BudgetBuddy – main.js (Orijinal + API Entegreli Sürüm)
// ============================================

// ─── LocalStorage DB ─────────────────────────
const DB = {
  get(key, def = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
};

// ─── Demo Veriler ─────────────────────────────
function loadDemoData() {
  const DEMO_USER_ID = 'demo_user';
  const demoUser = { id: DEMO_USER_ID, ad: 'Demo', soyad: 'Kullanıcı', email: 'demo@budgetbuddy.com', sifre: 'demo123' };
  const users = DB.get('bb_users', []);
  if (!users.find(u => u.email === demoUser.email)) { users.push(demoUser); DB.set('bb_users', users); }
  const txKey = `bb_transactions_${DEMO_USER_ID}`;
  if (!DB.get(txKey)) {
    const bugun = new Date();
    const tarih = (ay, gun) => { const d = new Date(bugun.getFullYear(), bugun.getMonth() - ay, gun); return d.toISOString().split('T')[0]; };
    DB.set(txKey, [
      { id:1,  tur:'gelir', miktar:25000, aciklama:'Maaş',            kategori:'Maaş',     renk:'#22c55e', kategori_id:1, tarih:tarih(0,1)  },
      { id:2,  tur:'gider', miktar:8500,  aciklama:'Kira',             kategori:'Kira',     renk:'#ec4899', kategori_id:8, tarih:tarih(0,3)  },
      { id:3,  tur:'gider', miktar:1200,  aciklama:'Market alışveriş', kategori:'Market',   renk:'#ef4444', kategori_id:5, tarih:tarih(0,5)  },
      { id:4,  tur:'gider', miktar:650,   aciklama:'Elektrik faturası',kategori:'Faturalar',renk:'#f97316', kategori_id:6, tarih:tarih(0,6)  },
      { id:5,  tur:'gelir', miktar:3500,  aciklama:'Freelance proje',  kategori:'Serbest',  renk:'#10b981', kategori_id:2, tarih:tarih(0,8)  },
      { id:6,  tur:'gider', miktar:420,   aciklama:'Ulaşım kartı',     kategori:'Ulaşım',   renk:'#eab308', kategori_id:7, tarih:tarih(0,10) },
      { id:7,  tur:'gider', miktar:890,   aciklama:'Spor salonu',      kategori:'Sağlık',   renk:'#06b6d4', kategori_id:9, tarih:tarih(0,12) }
    ]);
  }
  const hedefKey = `bb_hedefler_${DEMO_USER_ID}`;
  if (!DB.get(hedefKey)) {
    DB.set(hedefKey, [
      { id:1, baslik:'Tatil Fonu',     hedef_miktar:15000, mevcut_miktar:6500,  bitis_tarihi:'2026-08-01', yuzde:43 },
      { id:2, baslik:'Acil Durum',     hedef_miktar:30000, mevcut_miktar:12000, bitis_tarihi:'2026-12-31', yuzde:40 }
    ]);
  }
}
loadDemoData();

// ─── Auth ─────────────────────────────────────
const Auth = {
  async giris(email, sifre) {
    const users = DB.get('bb_users', []);
    const user = users.find(u => u.email === email && u.sifre === sifre);
    if (!user) throw new Error('E-posta veya şifre hatalı.');
    DB.set('bb_session', { user: { id: user.id, ad: user.ad, soyad: user.soyad, email: user.email } });
    return { success: true };
  },
  async kayit(ad, soyad, email, sifre) {
    const users = DB.get('bb_users', []);
    if (users.find(u => u.email === email)) throw new Error('Bu e-posta zaten kayıtlı.');
    const user = { id: Date.now(), ad, soyad, email, sifre };
    users.push(user);
    DB.set('bb_users', users);
    DB.set('bb_session', { user: { id: user.id, ad, soyad, email } });
    return { success: true };
  },
  async cikis() {
    const confirmed = await showLogoutConfirm();
    if (!confirmed) return;
    DB.set('bb_session', null);
    window.location.href = '/cerenyurduseven-budgetbuddy/pages/giris.html';
  },
  async ben() {
    const session = DB.get('bb_session');
    // Session yoksa Demo kullanıcıyı ver (Sayfa hataya düşmesin)
    if (!session?.user) return { user: { id: 'demo_user', ad: 'Ceren', soyad: 'Kullanıcı', email: 'ceren@budgetbuddy.com' } };
    return session;
  },
};

function getUserId() { return DB.get('bb_session')?.user?.id || 'demo_user'; }

// ─── Transactions ──────────────────────────────
const Transactions = {
  _key() { return `bb_transactions_${getUserId()}`; },
  _all() { return DB.get(this._key(), []); },
  list(params = {}) {
    let data = this._all();
    if (params.tur) data = data.filter(t => t.tur === params.tur);
    data.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
    return Promise.resolve({ transactions: data });
  },
  create(data) {
    const all = this._all();
    const t = { id: Date.now(), ...data, kategori: 'Yeni', renk: '#6b7280' };
    all.unshift(t);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true, transaction: t });
  }
};

// ─── Reports ──────────────────────────────────
const Reports = {
  ozet() {
    const all = Transactions._all();
    const now = new Date();
    const buAy = all.filter(t => { const d = new Date(t.tarih); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const sum = (arr, tur) => arr.filter(t => t.tur === tur).reduce((s, t) => s + Number(t.miktar), 0);
    const totalGelir = sum(all, 'gelir'), totalGider = sum(all, 'gider');
    return Promise.resolve({ 
        bakiye: totalGelir - totalGider, 
        toplam_gelir: totalGelir, 
        toplam_gider: totalGider, 
        bu_ay: { gelir: sum(buAy,'gelir'), gider: sum(buAy,'gider'), bakiye: sum(buAy,'gelir')-sum(buAy,'gider') }, 
        son_islemler: all.slice(0,5) 
    });
  }
};

// ─── Toast ────────────────────────────────────
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = `toast ${type}`;
    t.style.cssText = `background:#1e2330;color:#fff;padding:12px 24px;border-radius:8px;margin-top:10px;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'}`;
    t.innerHTML = `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },
  success: m => Toast.show(m,'success'),
  error:   m => Toast.show(m,'error'),
  info:    m => Toast.show(m,'info'),
};

// ─── Formatters ───────────────────────────────
function formatPara(amount) {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', minimumFractionDigits:2 }).format(amount || 0);
}
function formatTarih(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
}

// ─── User Info ────────────────────────────────
async function loadUserInfo() {
  try {
    const data = await Auth.ben();
    if (!data?.user) return;
    const u = data.user;
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const initEl = document.getElementById('userInitials');
    if (nameEl)  nameEl.textContent  = `${u.ad} ${u.soyad}`;
    if (emailEl) emailEl.textContent = u.email;
    if (initEl) { initEl.textContent = (u.ad[0] + u.soyad[0]).toUpperCase(); }
    document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.cikis());
  } catch {}
}

function setActiveNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(a => { const href = a.getAttribute('href')?.split('/').pop(); a.classList.toggle('active', href === current); });
}

// ─── Modal ────────────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); document.getElementById(id).style.display = 'flex'; },
  close(id) { document.getElementById(id)?.classList.remove('open'); document.getElementById(id).style.display = 'none'; },
  closeAll(){ document.querySelectorAll('.modal-overlay').forEach(m => { m.classList.remove('open'); m.style.display='none'; }); }
};
document.addEventListener('click', e => {
  if (e.target.dataset.closeModal) Modal.close(e.target.dataset.closeModal);
});

// ─── Çıkış Onay ───────────────────────────────
function showLogoutConfirm() {
  return new Promise(resolve => {
    const old = document.getElementById('logoutPopup'); if (old) old.remove();
    const popup = document.createElement('div');
    popup.id = 'logoutPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    popup.innerHTML = `<div style="background:#111318;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px;max-width:340px;width:100%;text-align:center;"><div style="font-size:3rem;margin-bottom:12px;">👋</div><h3 style="font-family:Syne,sans-serif;font-size:1.2rem;color:#f0f2f8;margin-bottom:8px;">Çıkış yapmak istiyor musunuz?</h3><div style="display:flex;gap:12px;justify-content:center;"><button id="logoutCancel" style="flex:1;padding:12px;border-radius:10px;background:#1e2330;color:#8891a8;cursor:pointer;">İptal</button><button id="logoutConfirm" style="flex:1;padding:12px;border-radius:10px;background:#ef4444;color:#fff;cursor:pointer;">Evet, Çık</button></div></div>`;
    document.body.appendChild(popup);
    document.getElementById('logoutConfirm').onclick = () => { popup.remove(); resolve(true); };
    document.getElementById('logoutCancel').onclick  = () => { popup.remove(); resolve(false); };
  });
}

// ─── Hamburger Menü ───────────────────────────
window.addEventListener('load', function() {
  const btn     = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!btn || !sidebar) return;
  function openSidebar()  { sidebar.style.transform='translateX(0)'; sidebar.classList.add('open'); if(overlay){overlay.style.display='block';overlay.style.opacity='1';} }
  function closeSidebar() { sidebar.style.transform='translateX(-260px)'; sidebar.classList.remove('open'); if(overlay){overlay.style.opacity='0';setTimeout(()=>overlay.style.display='none',300);} }
  btn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  if (overlay) overlay.addEventListener('click', closeSidebar);
});

// ─── Dark Mode ────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('bb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (!sidebarFooter || document.getElementById('themeToggle')) return;
  const themeRow = document.createElement('div');
  themeRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;';
  themeRow.innerHTML = '<span style="font-size:.8rem;color:var(--text-3);">Tema</span>';
  const btn = document.createElement('button');
  btn.id = 'themeToggle';
  const knob = document.createElement('div');
  knob.style.cssText = `width:20px;height:20px;border-radius:50%;background:var(--green);transition:transform .3s;transform:${saved==='light'?'translateX(26px)':'translateX(0)'};display:flex;align-items:center;justify-content:center;font-size:12px;`;
  knob.textContent = saved === 'dark' ? '🌙' : '☀️';
  btn.style.cssText = 'width:52px;height:26px;border-radius:13px;background:var(--bg-3);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;padding:2px;';
  btn.appendChild(knob);
  themeRow.appendChild(btn);
  sidebarFooter.appendChild(themeRow);
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bb_theme', next);
    knob.textContent = next === 'dark' ? '🌙' : '☀️';
    knob.style.transform = next === 'light' ? 'translateX(26px)' : 'translateX(0)';
  });
}

// ─── UI Verilerini Doldur (İşlemler ve Kartlar) ──────────────
async function initDashboardUI() {
  try {
    const data = await Reports.ozet();
    const els = {
      bakiye: document.getElementById('statBakiye'),
      gelir: document.getElementById('statGelir'),
      gider: document.getElementById('statGider'),
      net: document.getElementById('statNet')
    };
    if(els.bakiye) els.bakiye.textContent = formatPara(data.bakiye);
    if(els.gelir) els.gelir.textContent = formatPara(data.bu_ay.gelir);
    if(els.gider) els.gider.textContent = formatPara(data.bu_ay.gider);
    if(els.net) els.net.textContent = formatPara(data.bu_ay.bakiye);

    const tbody = document.getElementById('sonIslemler');
    if (tbody) {
      if (data.son_islemler.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Henüz işlem yok</td></tr>';
      } else {
        tbody.innerHTML = data.son_islemler.map(t => `
          <tr>
            <td>${formatTarih(t.tarih)}</td>
            <td>${t.aciklama}</td>
            <td><span style="background:${t.renk}20;color:${t.renk};padding:4px 8px;border-radius:6px;font-size:0.8rem;">${t.kategori}</span></td>
            <td>${t.tur === 'gelir' ? '💰 Gelir' : '💸 Gider'}</td>
            <td class="text-right" style="color:${t.tur==='gelir'?'#22c55e':'#ef4444'};font-weight:600;">
              ${t.tur==='gelir'?'+':'-'} ${formatPara(t.miktar)}
            </td>
          </tr>
        `).join('');
      }
    }
  } catch(e) {}
}

// ─── HARİCİ DÖVİZ APİ (SAĞLAMLAŞTIRILDI) ─────────────────────
async function initDovizAPI() {
  const dovizList = document.getElementById('dovizList');
  const dovizAra = document.getElementById('dovizAra');
  if (!dovizList) return;

  async function fetchKurlar() {
    dovizList.innerHTML = '<div style="text-align:center;padding:20px;grid-column:1/-1;">Kurlar yükleniyor...</div>';
    let kurlar = [];
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      const data = await res.json();
      kurlar = [
        { kod: 'USD', deger: (1 / data.rates.USD).toFixed(2), ikon: '💵' },
        { kod: 'EUR', deger: (1 / data.rates.EUR).toFixed(2), ikon: '💶' },
        { kod: 'GBP', deger: (1 / data.rates.GBP).toFixed(2), ikon: '💷' }
      ];
    } catch(err) {
      kurlar = [
        { kod: 'USD', deger: "32.45", ikon: '💵' },
        { kod: 'EUR', deger: "35.12", ikon: '💶' },
        { kod: 'GBP', deger: "41.50", ikon: '💷' }
      ];
    }

    function render(arr) {
      dovizList.innerHTML = arr.map(k => `
        <div style="background:var(--bg-2);padding:14px;border-radius:12px;border:1px solid var(--border);display:flex;justify-content:space-between;">
          <div style="font-weight:600;">${k.ikon} ${k.kod}</div>
          <div style="font-weight:700;">${k.deger} ₺</div>
        </div>
      `).join('');
    }

    render(kurlar);

    if(dovizAra) {
      dovizAra.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        render(kurlar.filter(k => k.kod.toLowerCase().includes(text)));
      });
    }
  }
  fetchKurlar();
}

// ─── Sayfa Yüklenince ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  setActiveNav();
  if (!document.querySelector('.auth-body')) {
    initDarkMode();
    initDashboardUI(); // İşlemleri Yükle
    initDovizAPI();    // API Çalışsın
  }

  // Yeni İşlem Ekleme Formu
  const form = document.getElementById('yeniIslemForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll('input, select');
      const tur = inputs[0]?.value || 'gider'; 
      const miktar = parseFloat(inputs[1]?.value || 0);
      const aciklama = inputs[2]?.value || 'Yeni İşlem';
      
      if (miktar > 0) {
        await Transactions.create({ tur, miktar, aciklama, tarih: new Date().toISOString().split('T')[0] });
        Toast.success('Veri Başarıyla Eklendi!');
        Modal.closeAll();
        setTimeout(() => window.location.reload(), 800); 
      }
    });
  }
});
