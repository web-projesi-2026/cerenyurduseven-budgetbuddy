// ============================================
// BudgetBuddy – main.js (temiz versiyon)
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
      { id:7,  tur:'gider', miktar:890,   aciklama:'Spor salonu',      kategori:'Sağlık',   renk:'#06b6d4', kategori_id:9, tarih:tarih(0,12) },
      { id:8,  tur:'gelir', miktar:25000, aciklama:'Maaş',             kategori:'Maaş',     renk:'#22c55e', kategori_id:1, tarih:tarih(1,1)  },
      { id:9,  tur:'gider', miktar:8500,  aciklama:'Kira',             kategori:'Kira',     renk:'#ec4899', kategori_id:8, tarih:tarih(1,3)  },
      { id:10, tur:'gider', miktar:2100,  aciklama:'Market alışveriş', kategori:'Market',   renk:'#ef4444', kategori_id:5, tarih:tarih(1,7)  },
      { id:11, tur:'gelir', miktar:25000, aciklama:'Maaş',             kategori:'Maaş',     renk:'#22c55e', kategori_id:1, tarih:tarih(2,1)  },
      { id:12, tur:'gider', miktar:8500,  aciklama:'Kira',             kategori:'Kira',     renk:'#ec4899', kategori_id:8, tarih:tarih(2,3)  },
      { id:13, tur:'gider', miktar:1800,  aciklama:'Alışveriş',        kategori:'Eğlence',  renk:'#a855f7', kategori_id:10,tarih:tarih(2,15) },
      { id:14, tur:'gelir', miktar:2000,  aciklama:'Yatırım getirisi', kategori:'Yatırım',  renk:'#3b82f6', kategori_id:3, tarih:tarih(2,20) },
    ]);
  }
  const hedefKey = `bb_hedefler_${DEMO_USER_ID}`;
  if (!DB.get(hedefKey)) {
    DB.set(hedefKey, [
      { id:1, baslik:'Tatil Fonu',     hedef_miktar:15000, mevcut_miktar:6500,  bitis_tarihi:'2026-08-01', yuzde:43 },
      { id:2, baslik:'Acil Durum',     hedef_miktar:30000, mevcut_miktar:12000, bitis_tarihi:'2026-12-31', yuzde:40 },
      { id:3, baslik:'Yeni Bilgisayar',hedef_miktar:25000, mevcut_miktar:18000, bitis_tarihi:'2026-06-01', yuzde:72 },
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
    if (!session?.user) throw new Error('Oturum yok');
    return session;
  },
};

function getUserId() { return DB.get('bb_session')?.user?.id || null; }

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
    const cats = Categories._all();
    const cat = cats.find(c => c.id == data.kategori_id) || { ad: 'Diğer', renk: '#6b7280' };
    const t = { id: Date.now(), ...data, kategori: cat.ad, renk: cat.renk };
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

// ─── Categories ───────────────────────────────
const DEFAULT_CATS = [
  { id:1,  ad:'Maaş',        tur:'gelir', renk:'#22c55e' },
  { id:2,  ad:'Serbest',     tur:'gelir', renk:'#10b981' },
  { id:3,  ad:'Yatırım',     tur:'gelir', renk:'#3b82f6' },
  { id:4,  ad:'Diğer Gelir', tur:'gelir', renk:'#8b5cf6' },
  { id:5,  ad:'Market',      tur:'gider', renk:'#ef4444' },
  { id:6,  ad:'Faturalar',   tur:'gider', renk:'#f97316' },
  { id:7,  ad:'Ulaşım',      tur:'gider', renk:'#eab308' },
  { id:8,  ad:'Kira',        tur:'gider', renk:'#ec4899' },
  { id:9,  ad:'Sağlık',      tur:'gider', renk:'#06b6d4' },
  { id:10, ad:'Eğlence',     tur:'gider', renk:'#a855f7' },
  { id:11, ad:'Eğitim',      tur:'gider', renk:'#14b8a6' },
  { id:12, ad:'Diğer',       tur:'gider', renk:'#6b7280' },
];
const Categories = {
  _key() { return `bb_categories_${getUserId()}`; },
  _all() { const s = DB.get(this._key()); if (!s) { DB.set(this._key(), DEFAULT_CATS); return DEFAULT_CATS; } return s; },
  list() { return Promise.resolve({ categories: this._all() }); },
  create(data) { const all = this._all(); const cat = { id: Date.now(), ...data }; all.push(cat); DB.set(this._key(), all); return Promise.resolve({ success: true, category: cat }); },
  remove(id) { DB.set(this._key(), this._all().filter(c => c.id != id)); return Promise.resolve({ success: true }); },
};

// ─── Reports ──────────────────────────────────
const Reports = {
  ozet() {
    const all = Transactions._all();
    const now = new Date();
    const buAy = all.filter(t => { const d = new Date(t.tarih); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const sum = (arr, tur) => arr.filter(t => t.tur === tur).reduce((s, t) => s + Number(t.miktar), 0);
    const totalGelir = sum(all, 'gelir'), totalGider = sum(all, 'gider');
    return Promise.resolve({ bakiye: totalGelir - totalGider, toplam_gelir: totalGelir, toplam_gider: totalGider, bu_ay: { gelir: sum(buAy,'gelir'), gider: sum(buAy,'gider'), bakiye: sum(buAy,'gelir')-sum(buAy,'gider') }, son_islemler: all.slice(0,10) });
  },
  aylik() {
    const all = Transactions._all(); const now = new Date(); const aylar = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ay = all.filter(t => { const td = new Date(t.tarih); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); });
      aylar.push({ etiket: d.toLocaleDateString('tr-TR', { month:'short', year:'2-digit' }), gelir: ay.filter(t=>t.tur==='gelir').reduce((s,t)=>s+Number(t.miktar),0), gider: ay.filter(t=>t.tur==='gider').reduce((s,t)=>s+Number(t.miktar),0) });
    }
    return Promise.resolve({ aylik: aylar });
  },
  kategoriler(params = {}) {
    const all = Transactions._all(); const filtered = params.tur ? all.filter(t => t.tur === params.tur) : all; const map = {};
    filtered.forEach(t => { if (!map[t.kategori]) map[t.kategori] = { kategori: t.kategori, renk: t.renk, toplam: 0 }; map[t.kategori].toplam += Number(t.miktar); });
    return Promise.resolve({ kategoriler: Object.values(map) });
  },
  tasarruf() { return Promise.resolve({ hedefler: DB.get(`bb_hedefler_${getUserId()}`, []) }); },
  haftalik() {
    const all = Transactions._all(); const now = new Date(); const gunler = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const dateStr = d.toISOString().split('T')[0]; const gun = all.filter(t => t.tarih === dateStr); gunler.push({ etiket: d.toLocaleDateString('tr-TR', { weekday:'short' }), gelir: gun.filter(t=>t.tur==='gelir').reduce((s,t)=>s+Number(t.miktar),0), gider: gun.filter(t=>t.tur==='gider').reduce((s,t)=>s+Number(t.miktar),0) }); }
    return Promise.resolve({ haftalik: gunler });
  },
};

// ─── Toast ────────────────────────────────────
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = `toast ${type}`;
    t.innerHTML = `<span>${{success:'✓',error:'✕',info:'ℹ'}[type]||'ℹ'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, duration);
  },
  success: m => Toast.show(m,'success'),
  error:   m => Toast.show(m,'error'),
  info:    m => Toast.show(m,'info'),
};

// ─── Formatters ───────────────────────────────
function formatPara(amount, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency, minimumFractionDigits:2 }).format(amount || 0);
}
function formatTarih(dateStr, opts = {}) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric', ...opts });
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
    if (initEl) {
      const savedPhoto = localStorage.getItem('bb_avatar_' + u.id) || u.avatar_url;
      if (savedPhoto) { initEl.style.backgroundImage=`url(${savedPhoto})`; initEl.style.backgroundSize='cover'; initEl.style.backgroundPosition='center'; initEl.textContent=''; }
      else { initEl.textContent = (u.ad[0] + u.soyad[0]).toUpperCase(); }
    }
    document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.cikis());
  } catch {}
}

function setActiveNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(a => { const href = a.getAttribute('href')?.split('/').pop(); a.classList.toggle('active', href === current); });
}

// ─── Modal ────────────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll(){ document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); },
};
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
  if (e.target.dataset.closeModal) Modal.close(e.target.dataset.closeModal);
});

// ─── Çıkış Onay ───────────────────────────────
function showLogoutConfirm() {
  return new Promise(resolve => {
    const old = document.getElementById('logoutPopup'); if (old) old.remove();
    const popup = document.createElement('div');
    popup.id = 'logoutPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    popup.innerHTML = `<div style="background:#111318;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px;max-width:340px;width:100%;text-align:center;"><div style="font-size:3rem;margin-bottom:12px;">👋</div><h3 style="font-family:Syne,sans-serif;font-size:1.2rem;color:#f0f2f8;margin-bottom:8px;">Çıkış yapmak istiyor musunuz?</h3><p style="color:#8891a8;font-size:.875rem;margin-bottom:24px;">Oturumunuz kapatılacak.</p><div style="display:flex;gap:12px;justify-content:center;"><button id="logoutCancel" style="flex:1;padding:12px;border-radius:10px;background:#1e2330;border:1px solid rgba(255,255,255,.1);color:#8891a8;cursor:pointer;font-family:inherit;">İptal</button><button id="logoutConfirm" style="flex:1;padding:12px;border-radius:10px;background:#ef4444;border:none;color:#fff;cursor:pointer;font-weight:600;font-family:inherit;">Evet, Çık</button></div></div>`;
    document.body.appendChild(popup);
    document.getElementById('logoutConfirm').onclick = () => { popup.remove(); resolve(true); };
    document.getElementById('logoutCancel').onclick  = () => { popup.remove(); resolve(false); };
    popup.addEventListener('click', e => { if (e.target === popup) { popup.remove(); resolve(false); } });
  });
}

// ─── Hamburger Menü ───────────────────────────
window.addEventListener('load', function() {
  const btn     = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!btn || !sidebar) return;
  function openSidebar()  { sidebar.style.transform='translateX(0)'; sidebar.classList.add('open'); if(overlay){overlay.style.display='block';overlay.style.opacity='1';} document.body.style.overflow='hidden'; }
  function closeSidebar() { sidebar.style.transform='translateX(-260px)'; sidebar.classList.remove('open'); if(overlay){overlay.style.opacity='0';setTimeout(()=>overlay.style.display='none',300);} document.body.style.overflow=''; }
  btn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  if (overlay) overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeSidebar(); });
  window.addEventListener('resize', () => { if(window.innerWidth>768) closeSidebar(); });
});

// ─── Dark Mode ────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('bb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (document.getElementById('themeToggle')) return;
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (!sidebarFooter) return;
  const themeRow = document.createElement('div');
  themeRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;';
  themeRow.innerHTML = '<span style="font-size:.8rem;color:var(--text-3);">Tema</span>';
  const btn = document.createElement('button');
  btn.id = 'themeToggle';
  const knob = document.createElement('div');
  knob.style.cssText = `width:20px;height:20px;border-radius:50%;background:var(--green);transition:transform .3s;transform:${saved==='light'?'translateX(26px)':'translateX(0)'};display:flex;align-items:center;justify-content:center;font-size:12px;`;
  knob.textContent = saved === 'dark' ? '🌙' : '☀️';
  btn.style.cssText = 'width:52px;height:26px;border-radius:13px;background:var(--bg-3);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;padding:2px;transition:all .3s;';
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

// ─── Yukarı Çık ───────────────────────────────
function initScrollToTop() {
  if (document.getElementById('scrollTopBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'scrollTopBtn';
  btn.innerHTML = '↑';
  btn.style.cssText = 'position:fixed;bottom:96px;right:24px;z-index:997;width:44px;height:44px;border-radius:50%;background:var(--bg-3);border:1px solid var(--border);color:var(--text-1);cursor:pointer;font-size:20px;font-weight:700;display:none;align-items:center;justify-content:center;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,.3);';
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => { btn.style.display = window.scrollY > 300 ? 'flex' : 'none'; });
  btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
}

// ─── Tabs ─────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-group').forEach(group => {
    const tabs = group.querySelectorAll('.tab-btn');
    const panels = group.querySelectorAll('.tab-panel');
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => { p.style.display = 'none'; });
        tab.classList.add('active');
        if (panels[i]) panels[i].style.display = 'block';
      });
    });
    if (tabs[0]) tabs[0].click();
  });
}

// ─── Slider ───────────────────────────────────
function initSlider() {
  document.querySelectorAll('.slider-wrap').forEach(wrap => {
    const slides = wrap.querySelectorAll('.slide');
    if (!slides.length) return;
    let current = 0;
    const prev = wrap.querySelector('.slide-prev');
    const next = wrap.querySelector('.slide-next');
    const dots = wrap.querySelectorAll('.slide-dot');
    function goTo(n) {
      slides[current].classList.remove('active');
      if (dots[current]) dots[current].classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
    }
    if (prev) prev.addEventListener('click', () => goTo(current - 1));
    if (next) next.addEventListener('click', () => goTo(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    slides[0].classList.add('active');
    if (dots[0]) dots[0].classList.add('active');
    setInterval(() => goTo(current + 1), 4000);
  });
}

// ─── Buddy AI ─────────────────────────────────
function buddySmartReply(text) {
  const t = text.toLowerCase();
  const session = JSON.parse(localStorage.getItem('bb_session') || 'null');
  const userId = session?.user?.id;
  const txList = JSON.parse(localStorage.getItem('bb_transactions_' + userId) || '[]');
  const gelir = txList.filter(x=>x.tur==='gelir').reduce((s,x)=>s+Number(x.miktar),0);
  const gider = txList.filter(x=>x.tur==='gider').reduce((s,x)=>s+Number(x.miktar),0);
  const bakiye = gelir - gider;
  const fmt = n => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n);
  if (t.includes('bakiye')||t.includes('ne kadar')||t.includes('param')) return `💰 Toplam bakiyeniz <strong>${fmt(bakiye)}</strong>. ${bakiye>0?'Harika gidiyorsunuz! 🎉':'Dikkatli olun! ⚠️'}`;
  if (t.includes('gider')||t.includes('harcama')) return `📊 Toplam gideriniz <strong>${fmt(gider)}</strong>.`;
  if (t.includes('gelir')||t.includes('kazanç')||t.includes('maaş')) return `💚 Toplam geliriniz <strong>${fmt(gelir)}</strong>.`;
  if (t.includes('tasarruf')||t.includes('biriktir')) return `🎯 Gelirinizin %20'sini biriktirmeyi hedefleyin! Şu an bakiyeniz ${fmt(bakiye)}.`;
  if (t.includes('merhaba')||t.includes('selam')) return `👋 Merhaba! Ben Buddy, finansal asistanınızım. Bakiye, gelir, gider hakkında sorabilirsiniz! 💰`;
  if (t.includes('teşekkür')) return `😊 Rica ederim! İyi günler! 🌟`;
  const msgs = ['💡 50/30/20 kuralı: Gelirinizin %50 ihtiyaç, %30 istek, %20 tasarruf.','📈 Düzenli bütçe takibi gereksiz harcamaları azaltır! 💪','🎯 Küçük tasarruflar zamanla büyük fark yaratır!'];
  return msgs[Math.floor(Math.random()*msgs.length)];
}

function initBuddyAI() {
  if (document.getElementById('buddyBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'buddyBtn';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(34,197,94,.5);display:flex;align-items:center;justify-content:center;font-size:26px;transition:all .3s;';
  btn.innerHTML = '💬';
  btn.title = 'Buddy - Finansal Asistan';
  const box = document.createElement('div');
  box.id = 'buddyBox';
  box.style.cssText = 'display:none;position:fixed;bottom:96px;right:24px;z-index:998;width:320px;background:#111318;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 8px 48px rgba(0,0,0,.7);flex-direction:column;overflow:hidden;';
  box.innerHTML = `<div style="padding:14px 16px;background:linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1));border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:10px;"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">💰</div><div style="flex:1;"><div style="font-family:Syne,sans-serif;font-weight:700;color:#f0f2f8;font-size:.95rem;">Buddy</div><div style="font-size:.72rem;color:#22c55e;">● Çevrimiçi</div></div><button onclick="document.getElementById('buddyBox').style.display='none'" style="background:none;border:none;color:#8891a8;cursor:pointer;font-size:18px;padding:4px;">✕</button></div><div id="buddyMessages" style="overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:260px;"><div style="display:flex;gap:8px;align-items:flex-start;"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">💰</div><div style="background:#1e2330;padding:10px 13px;border-radius:0 12px 12px 12px;color:#f0f2f8;font-size:.85rem;max-width:80%;line-height:1.5;">Merhaba! Ben <strong>Buddy</strong> 👋<br>Finansal sorularınızı sorabilirsiniz! 💰</div></div></div><div style="padding:10px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px;"><input id="buddyInput" type="text" placeholder="Buddy'ye sor..." style="flex:1;background:#1e2330;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;color:#f0f2f8;font-size:.85rem;outline:none;" onkeydown="if(event.key==='Enter')buddySend()" /><button onclick="buddySend()" style="background:linear-gradient(135deg,#22c55e,#10b981);border:none;border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">↑</button></div>`;
  document.body.appendChild(btn);
  document.body.appendChild(box);
  btn.addEventListener('click', () => { box.style.display = box.style.display==='none'?'flex':'none'; if(box.style.display==='flex') document.getElementById('buddyInput').focus(); });
}

async function buddySend() {
  const input = document.getElementById('buddyInput');
  const messages = document.getElementById('buddyMessages');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  messages.innerHTML += `<div style="display:flex;justify-content:flex-end;"><div style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.2);padding:9px 13px;border-radius:12px 0 12px 12px;color:#f0f2f8;font-size:.85rem;max-width:80%;">${text}</div></div>`;
  const id = 'bm-' + Date.now();
  messages.innerHTML += `<div id="${id}" style="display:flex;gap:8px;align-items:flex-start;"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">💰</div><div style="background:#1e2330;padding:10px 13px;border-radius:0 12px 12px 12px;color:#8891a8;font-size:.85rem;max-width:80%;">⏳ Düşünüyor...</div></div>`;
  messages.scrollTop = messages.scrollHeight;
  await new Promise(r => setTimeout(r, 600));
  const el = document.getElementById(id);
  if (el) { el.querySelector('div:last-child').innerHTML = buddySmartReply(text); el.querySelector('div:last-child').style.color = '#f0f2f8'; }
  messages.scrollTop = messages.scrollHeight;
}

// ─── Sayfa Yüklenince ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  setActiveNav();
  if (!document.querySelector('.auth-body')) {
    initDarkMode();
    initScrollToTop();
    initTabs();
    initSlider();
    initBuddyAI();
  }
});
