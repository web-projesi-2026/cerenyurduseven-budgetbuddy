// ============================================
// BudgetBuddy – main.js (localStorage versiyonu)
// ============================================

// ─── LocalStorage Veritabanı ─────────────────
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

  // Kullanıcı yoksa ekle
  const users = DB.get('bb_users', []);
  if (!users.find(u => u.email === demoUser.email)) {
    users.push(demoUser);
    DB.set('bb_users', users);
  }

  // Demo işlemler yoksa ekle
  const txKey = `bb_transactions_${DEMO_USER_ID}`;
  if (!DB.get(txKey)) {
    const bugun = new Date();
    const tarih = (ay, gun) => {
      const d = new Date(bugun.getFullYear(), bugun.getMonth() - ay, gun);
      return d.toISOString().split('T')[0];
    };
    DB.set(txKey, [
      { id: 1, tur: 'gelir',  miktar: 25000, aciklama: 'Maaş',           kategori: 'Maaş',     renk: '#22c55e', kategori_id: 1, tarih: tarih(0, 1)  },
      { id: 2, tur: 'gider',  miktar: 8500,  aciklama: 'Kira',            kategori: 'Kira',     renk: '#ec4899', kategori_id: 8, tarih: tarih(0, 3)  },
      { id: 3, tur: 'gider',  miktar: 1200,  aciklama: 'Market alışveriş',kategori: 'Market',   renk: '#ef4444', kategori_id: 5, tarih: tarih(0, 5)  },
      { id: 4, tur: 'gider',  miktar: 650,   aciklama: 'Elektrik faturası',kategori: 'Faturalar',renk: '#f97316', kategori_id: 6, tarih: tarih(0, 6)  },
      { id: 5, tur: 'gelir',  miktar: 3500,  aciklama: 'Freelance proje', kategori: 'Serbest',  renk: '#10b981', kategori_id: 2, tarih: tarih(0, 8)  },
      { id: 6, tur: 'gider',  miktar: 420,   aciklama: 'Ulaşım kartı',    kategori: 'Ulaşım',   renk: '#eab308', kategori_id: 7, tarih: tarih(0, 10) },
      { id: 7, tur: 'gider',  miktar: 890,   aciklama: 'Spor salonu',     kategori: 'Sağlık',   renk: '#06b6d4', kategori_id: 9, tarih: tarih(0, 12) },
      { id: 8, tur: 'gelir',  miktar: 25000, aciklama: 'Maaş',            kategori: 'Maaş',     renk: '#22c55e', kategori_id: 1, tarih: tarih(1, 1)  },
      { id: 9, tur: 'gider',  miktar: 8500,  aciklama: 'Kira',            kategori: 'Kira',     renk: '#ec4899', kategori_id: 8, tarih: tarih(1, 3)  },
      { id:10, tur: 'gider',  miktar: 2100,  aciklama: 'Market alışveriş',kategori: 'Market',   renk: '#ef4444', kategori_id: 5, tarih: tarih(1, 7)  },
      { id:11, tur: 'gelir',  miktar: 25000, aciklama: 'Maaş',            kategori: 'Maaş',     renk: '#22c55e', kategori_id: 1, tarih: tarih(2, 1)  },
      { id:12, tur: 'gider',  miktar: 8500,  aciklama: 'Kira',            kategori: 'Kira',     renk: '#ec4899', kategori_id: 8, tarih: tarih(2, 3)  },
      { id:13, tur: 'gider',  miktar: 1800,  aciklama: 'Alışveriş',       kategori: 'Eğlence',  renk: '#a855f7', kategori_id:10, tarih: tarih(2, 15) },
      { id:14, tur: 'gelir',  miktar: 2000,  aciklama: 'Yatırım getirisi',kategori: 'Yatırım',  renk: '#3b82f6', kategori_id: 3, tarih: tarih(2, 20) },
    ]);
  }

  // Demo tasarruf hedefleri
  const hedefKey = `bb_hedefler_${DEMO_USER_ID}`;
  if (!DB.get(hedefKey)) {
    DB.set(hedefKey, [
      { id: 1, baslik: 'Tatil Fonu',    hedef_miktar: 15000, mevcut_miktar: 6500, bitis_tarihi: '2026-08-01', yuzde: 43 },
      { id: 2, baslik: 'Acil Durum',    hedef_miktar: 30000, mevcut_miktar: 12000, bitis_tarihi: '2026-12-31', yuzde: 40 },
      { id: 3, baslik: 'Yeni Bilgisayar',hedef_miktar: 25000, mevcut_miktar: 18000, bitis_tarihi: '2026-06-01', yuzde: 72 },
    ]);
  }
}

// Demo verileri yükle
loadDemoData();

// ─── Auth ────────────────────────────────────
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
    DB.set('bb_session', null);
    window.location.href = '/cerenyurduseven-budgetbuddy/pages/giris.html';
  },
  async ben() {
    const session = DB.get('bb_session');
    if (!session?.user) throw new Error('Oturum yok');
    return session;
  },
};

// ─── Kullanıcı ID ─────────────────────────────
function getUserId() {
  return DB.get('bb_session')?.user?.id || null;
}

// ─── İşlemler ───────────────────────────────
const Transactions = {
  _key() { return `bb_transactions_${getUserId()}`; },
  _all() { return DB.get(this._key(), []); },
  list(params = {}) {
    let data = this._all();
    if (params.tur) data = data.filter(t => t.tur === params.tur);
    if (params.kategori_id) data = data.filter(t => t.kategori_id == params.kategori_id);
    data.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
    return Promise.resolve({ transactions: data });
  },
  create(data) {
    const all = this._all();
    const cats = Categories._all();
    const cat = cats.find(c => c.id == data.kategori_id) || { ad: 'Diğer', renk: '#6b7280' };
    const t = { id: Date.now(), ...data, kategori: cat.ad, renk: cat.renk, olusturulma: new Date().toISOString() };
    all.unshift(t);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true, transaction: t });
  },
  update(id, data) {
    const all = this._all();
    const i = all.findIndex(t => t.id == id);
    if (i === -1) throw new Error('İşlem bulunamadı');
    const cats = Categories._all();
    const cat = cats.find(c => c.id == data.kategori_id) || { ad: 'Diğer', renk: '#6b7280' };
    all[i] = { ...all[i], ...data, kategori: cat.ad, renk: cat.renk };
    DB.set(this._key(), all);
    return Promise.resolve({ success: true });
  },
  remove(id) {
    const all = this._all().filter(t => t.id != id);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true });
  },
};

// ─── Kategoriler ─────────────────────────────
const DEFAULT_CATS = [
  { id: 1, ad: 'Maaş',        tur: 'gelir',  renk: '#22c55e' },
  { id: 2, ad: 'Serbest',     tur: 'gelir',  renk: '#10b981' },
  { id: 3, ad: 'Yatırım',     tur: 'gelir',  renk: '#3b82f6' },
  { id: 4, ad: 'Diğer Gelir', tur: 'gelir',  renk: '#8b5cf6' },
  { id: 5, ad: 'Market',      tur: 'gider',  renk: '#ef4444' },
  { id: 6, ad: 'Faturalar',   tur: 'gider',  renk: '#f97316' },
  { id: 7, ad: 'Ulaşım',      tur: 'gider',  renk: '#eab308' },
  { id: 8, ad: 'Kira',        tur: 'gider',  renk: '#ec4899' },
  { id: 9, ad: 'Sağlık',      tur: 'gider',  renk: '#06b6d4' },
  { id: 10, ad: 'Eğlence',    tur: 'gider',  renk: '#a855f7' },
  { id: 11, ad: 'Eğitim',     tur: 'gider',  renk: '#14b8a6' },
  { id: 12, ad: 'Diğer',      tur: 'gider',  renk: '#6b7280' },
];

const Categories = {
  _key() { return `bb_categories_${getUserId()}`; },
  _all() {
    const stored = DB.get(this._key());
    if (!stored) { DB.set(this._key(), DEFAULT_CATS); return DEFAULT_CATS; }
    return stored;
  },
  list() { return Promise.resolve({ categories: this._all() }); },
  create(data) {
    const all = this._all();
    const cat = { id: Date.now(), ...data };
    all.push(cat);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true, category: cat });
  },
  remove(id) {
    const all = this._all().filter(c => c.id != id);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true });
  },
};

// ─── Raporlar ───────────────────────────────
const Reports = {
  ozet() {
    const all = Transactions._all();
    const now = new Date();
    const buAy = all.filter(t => {
      const d = new Date(t.tarih);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (arr, tur) => arr.filter(t => t.tur === tur).reduce((s, t) => s + Number(t.miktar), 0);
    const totalGelir = sum(all, 'gelir');
    const totalGider = sum(all, 'gider');
    return Promise.resolve({
      bakiye: totalGelir - totalGider,
      toplam_gelir: totalGelir,
      toplam_gider: totalGider,
      bu_ay: {
        gelir: sum(buAy, 'gelir'),
        gider: sum(buAy, 'gider'),
        bakiye: sum(buAy, 'gelir') - sum(buAy, 'gider'),
      },
      son_islemler: all.slice(0, 10),
    });
  },
  aylik() {
    const all = Transactions._all();
    const now = new Date();
    const aylar = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ay = all.filter(t => {
        const td = new Date(t.tarih);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      aylar.push({
        etiket: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        gelir: ay.filter(t => t.tur === 'gelir').reduce((s, t) => s + Number(t.miktar), 0),
        gider: ay.filter(t => t.tur === 'gider').reduce((s, t) => s + Number(t.miktar), 0),
      });
    }
    return Promise.resolve({ aylik: aylar });
  },
  kategoriler(params = {}) {
    const all = Transactions._all();
    const filtered = params.tur ? all.filter(t => t.tur === params.tur) : all;
    const map = {};
    filtered.forEach(t => {
      if (!map[t.kategori]) map[t.kategori] = { kategori: t.kategori, renk: t.renk, toplam: 0 };
      map[t.kategori].toplam += Number(t.miktar);
    });
    return Promise.resolve({ kategoriler: Object.values(map) });
  },
  tasarruf() {
    const hedefler = DB.get(`bb_hedefler_${getUserId()}`, []);
    return Promise.resolve({ hedefler });
  },
  haftalik() {
    const all = Transactions._all();
    const now = new Date();
    const gunler = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const gun = all.filter(t => t.tarih === dateStr);
      gunler.push({
        etiket: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        gelir: gun.filter(t => t.tur === 'gelir').reduce((s, t) => s + Number(t.miktar), 0),
        gider: gun.filter(t => t.tur === 'gider').reduce((s, t) => s + Number(t.miktar), 0),
      });
    }
    return Promise.resolve({ haftalik: gunler });
  },
};

// ─── Toast Bildirimleri ──────────────────────
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ';
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error  : (m) => Toast.show(m, 'error'),
  info   : (m) => Toast.show(m, 'info'),
};

// ─── Para Birimi Formatı ─────────────────────
function formatPara(amount, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0);
}

// ─── Tarih Formatı ──────────────────────────
function formatTarih(dateStr, opts = {}) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', ...opts });
}

// ─── Kullanıcı Bilgisi Yükle ─────────────────
async function loadUserInfo() {
  try {
    const data = await Auth.ben();
    if (!data?.user) return;
    const u = data.user;
    const nameEl  = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const initEl  = document.getElementById('userInitials');
    if (nameEl)  nameEl.textContent  = `${u.ad} ${u.soyad}`;
    if (emailEl) emailEl.textContent = u.email;
    if (initEl)  initEl.textContent  = (u.ad[0] + u.soyad[0]).toUpperCase();
    document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.cikis());
  } catch {}
}

// ─── Aktif Nav Linki ─────────────────────────
function setActiveNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href')?.split('/').pop();
    a.classList.toggle('active', href === current);
  });
}

// ─── Modal Yönetimi ──────────────────────────
const Modal = {
  open (id) { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); },
};
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
  if (e.target.dataset.closeModal) Modal.close(e.target.dataset.closeModal);
});

// ─── Mobil Menü ─────────────────────────────
window.addEventListener('load', function () {
  var btn     = document.getElementById('mobileMenuBtn');
  var sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!btn || !sidebar) return;

  function openSidebar() {
    sidebar.style.transform = 'translateX(0)';
    sidebar.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.style.opacity = '1';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.style.transform = 'translateX(-260px)';
    sidebar.classList.remove('open');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(function() { overlay.style.display = 'none'; }, 300);
    }
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSidebar();
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) closeSidebar();
  });
});

// ─── Sayfa Yüklenince ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  setActiveNav();
});
