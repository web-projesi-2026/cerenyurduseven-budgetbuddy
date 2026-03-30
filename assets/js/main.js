// ============================================
// BudgetBuddy – main.js
// API istemcisi + yardımcı fonksiyonlar
// ============================================

const API_BASE = '/cerenyurduseven-budgetbuddy/api';

// ─── API İstemcisi ──────────────────────────
const api = {
  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();

  if (res.status === 401) {
      const currentPage = window.location.pathname;
      if (!currentPage.includes('giris.html') && !currentPage.includes('kayit.html')) {
       window.location.href = '/cerenyurduseven-budgetbuddy/pages/giris.html';
      }
      return;
    }
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  },
  get   : (path)        => api.request('GET',    path),
  post  : (path, body)  => api.request('POST',   path, body),
  put   : (path, body)  => api.request('PUT',    path, body),
  delete: (path)        => api.request('DELETE', path),
};

// ─── Auth Yardımcıları ───────────────────────
const Auth = {
  async giris(email, sifre) {
    return api.post('/auth?action=giris', { email, sifre });
  },
  async kayit(ad, soyad, email, sifre) {
    return api.post('/auth?action=kayit', { ad, soyad, email, sifre });
  },
  async cikis() {
    await api.post('/auth?action=cikis');
    window.location.href = '/cerenyurduseven-budgetbuddy/pages/giris.html';
  },
  async ben() {
    return api.get('/auth?action=ben');
  },
};

// ─── İşlemler ───────────────────────────────
const Transactions = {
  list  : (params = {}) => api.get('/transactions?' + new URLSearchParams(params)),
  create: (data)        => api.post('/transactions', data),
  update: (id, data)    => api.put('/transactions?id=' + id, data),
  remove: (id)          => api.delete('/transactions?id=' + id),
};

// ─── Kategoriler ─────────────────────────────
const Categories = {
  list  : ()      => api.get('/categories'),
  create: (data)  => api.post('/categories', data),
  remove: (id)    => api.delete('/categories?id=' + id),
};

// ─── Raporlar ───────────────────────────────
const Reports = {
  ozet      : ()       => api.get('/reports?action=ozet'),
  aylik     : ()       => api.get('/reports?action=aylik'),
  kategoriler: (params)=> api.get('/reports?action=kategoriler&' + new URLSearchParams(params)),
  haftalik  : ()       => api.get('/reports?action=haftalik'),
  tasarruf  : ()       => api.get('/reports?action=tasarruf'),
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
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error  : (m) => Toast.show(m, 'error'),
  info   : (m) => Toast.show(m, 'info'),
};

// ─── Para Birimi Formatı ─────────────────────
function formatPara(amount, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
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
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  document.querySelector('.sidebar')?.classList.toggle('open');
});

// ─── Sayfa Yüklenince ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  setActiveNav();
});
