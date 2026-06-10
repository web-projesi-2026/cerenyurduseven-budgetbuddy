// ============================================
// BudgetBuddy – main.js (TAM VE KUSURSUZ SÜRÜM)
// ============================================

const DB = {
  get(key, def = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
};

function loadDemoData() {
  const DEMO_USER_ID = 'demo_user';
  const demoUser = { id: DEMO_USER_ID, ad: 'Ceren', soyad: 'Kullanıcı', email: 'demo@budgetbuddy.com', sifre: 'demo123' };
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
    if (!session?.user) return { user: { id: 'demo_user', ad: 'Ceren', soyad: 'Yrv', email: 'demo@budgetbuddy.com' } };
    return session;
  },
};

function getUserId() { return DB.get('bb_session')?.user?.id || 'demo_user'; }

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
    const t = { id: Date.now(), ...data, kategori: data.kategori_id === '12' ? 'Diğer' : 'İşlem', renk: '#6b7280' };
    all.unshift(t);
    DB.set(this._key(), all);
    return Promise.resolve({ success: true, transaction: t });
  }
};

const DEFAULT_CATS = [
  { id:1,  ad:'Maaş',        tur:'gelir', renk:'#22c55e' },
  { id:5,  ad:'Market',      tur:'gider', renk:'#ef4444' },
  { id:6,  ad:'Faturalar',   tur:'gider', renk:'#f97316' },
  { id:12, ad:'Diğer',       tur:'gider', renk:'#6b7280' },
];

const Categories = {
  _key() { return `bb_categories_${getUserId()}`; },
  _all() { const s = DB.get(this._key()); if (!s) { DB.set(this._key(), DEFAULT_CATS); return DEFAULT_CATS; } return s; },
  list() { return Promise.resolve({ categories: this._all() }); }
};

// GRAFİKLERİ VE VERİLERİ BESLEYEN FULL RAPORLAR
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
  }
};

const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.style.cssText="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;"; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = `toast ${type}`;
    t.style.cssText = `background:#1e2330;color:#fff;padding:12px 24px;border-radius:8px;margin-top:10px;border-left:4px solid ${type==='success'?'#22c55e':'#ef4444'}`;
    t.innerHTML = `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },
  success: m => Toast.show(m,'success'),
  error:   m => Toast.show(m,'error'),
  info:    m => Toast.show(m,'info'),
};

function formatPara(amount) {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', minimumFractionDigits:2 }).format(amount || 0);
}
function formatTarih(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
}

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

const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); document.getElementById(id).style.display = 'flex'; },
  close(id) { document.getElementById(id)?.classList.remove('open'); document.getElementById(id).style.display = 'none'; },
  closeAll(){ document.querySelectorAll('.modal-overlay').forEach(m => { m.classList.remove('open'); m.style.display='none'; }); }
};
document.addEventListener('click', e => { if (e.target.dataset.closeModal) Modal.close(e.target.dataset.closeModal); });

function showLogoutConfirm() {
  return new Promise(resolve => {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    popup.innerHTML = `<div style="background:#111318;border-radius:20px;padding:32px;text-align:center;"><h3 style="color:#f0f2f8;margin-bottom:24px;">Çıkış yapmak istiyor musunuz?</h3><div style="display:flex;gap:12px;"><button id="lgCancel" style="flex:1;padding:12px;border-radius:10px;background:#1e2330;color:#8891a8;">İptal</button><button id="lgConfirm" style="flex:1;padding:12px;border-radius:10px;background:#ef4444;color:#fff;">Evet</button></div></div>`;
    document.body.appendChild(popup);
    document.getElementById('lgConfirm').onclick = () => { popup.remove(); resolve(true); };
    document.getElementById('lgCancel').onclick  = () => { popup.remove(); resolve(false); };
  });
}

function initDarkMode() {
  const saved = localStorage.getItem('bb_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

// ─── HARİCİ DÖVİZ APİ (GÜZEL 8 KARTLI TASARIM) ─────────────────────
async function initDovizAPI() {
  const dovizList = document.getElementById('dovizList');
  const dovizAra = document.getElementById('dovizAra');
  if (!dovizList) return;

  async function fetchKurlar() {
    dovizList.innerHTML = '<div style="text-align:center;padding:20px;grid-column:1/-1;"><div class="spinner" style="margin:0 auto 10px;"></div>Kurlar yükleniyor...</div>';
    let kurlar = [];
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      const data = await res.json();
      const calc = (rate) => (1 / rate).toFixed(2);
      kurlar = [
        { kisa: 'US', kod: 'USD', ad: 'ABD Doları', deger: calc(data.rates.USD) },
        { kisa: 'EU', kod: 'EUR', ad: 'Euro', deger: calc(data.rates.EUR) },
        { kisa: 'GB', kod: 'GBP', ad: 'İngiliz Sterlini', deger: calc(data.rates.GBP) },
        { kisa: 'CH', kod: 'CHF', ad: 'İsviçre Frangı', deger: calc(data.rates.CHF) },
        { kisa: 'JP', kod: 'JPY', ad: 'Japon Yeni', deger: calc(data.rates.JPY) },
        { kisa: 'SA', kod: 'SAR', ad: 'S. Arabistan Riyali', deger: calc(data.rates.SAR) },
        { kisa: 'AE', kod: 'AED', ad: 'BAE Dirhemi', deger: calc(data.rates.AED) },
        { kisa: 'DK', kod: 'DKK', ad: 'Danimarka Kronu', deger: calc(data.rates.DKK) }
      ];
    } catch(err) {
      kurlar = [ { kisa: 'US', kod: 'USD', ad: 'ABD Doları', deger: "32.45" }, { kisa: 'EU', kod: 'EUR', ad: 'Euro', deger: "35.12" }, { kisa: 'GB', kod: 'GBP', ad: 'İngiliz Sterlini', deger: "41.50" }, { kisa: 'CH', kod: 'CHF', ad: 'İsviçre Frangı', deger: "35.80" }, { kisa: 'JP', kod: 'JPY', ad: 'Japon Yeni', deger: "0.21" }, { kisa: 'SA', kod: 'SAR', ad: 'S. Arabistan Riyali', deger: "8.65" }, { kisa: 'AE', kod: 'AED', ad: 'BAE Dirhemi', deger: "8.83" }, { kisa: 'DK', kod: 'DKK', ad: 'Danimarka Kronu', deger: "4.70" } ];
    }
    function render(arr) {
      if(arr.length === 0) return dovizList.innerHTML = '<div style="color:var(--text-3);padding:20px;grid-column:1/-1;">Bulunamadı.</div>';
      dovizList.innerHTML = arr.map(k => `
        <div style="background:#151821; padding:20px 10px; border-radius:16px; border:1px solid rgba(255,255,255,0.05); text-align:center; display:flex; flex-direction:column;">
          <div style="font-size:1.5rem; font-weight:700; color:#f0f2f8; margin-bottom:8px;">${k.kisa}</div>
          <div style="font-size:0.75rem; color:#8891a8; line-height:1.4; margin-bottom:16px;">${k.kod}<br>${k.ad}</div>
          <div style="font-size:0.7rem; color:#475569; margin-bottom:4px;">1 ${k.kod} -</div>
          <div style="font-size:1.25rem; font-weight:700; color:#22c55e;">₺${k.deger}</div>
        </div>`).join('');
    }
    render(kurlar);
    if(dovizAra) {
      dovizAra.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        render(kurlar.filter(k => k.kod.toLowerCase().includes(text) || k.ad.toLowerCase().includes(text)));
      });
    }
  }
  fetchKurlar();
}

async function initDashboardUI() {
  try {
    const data = await Reports.ozet();
    const els = { bakiye: document.getElementById('statBakiye'), gelir: document.getElementById('statGelir'), gider: document.getElementById('statGider'), net: document.getElementById('statNet') };
    if(els.bakiye) els.bakiye.textContent = formatPara(data.bakiye);
    if(els.gelir) els.gelir.textContent = formatPara(data.bu_ay.gelir);
    if(els.gider) els.gider.textContent = formatPara(data.bu_ay.gider);
    if(els.net) els.net.textContent = formatPara(data.bu_ay.bakiye);

    const tbody = document.getElementById('sonIslemler');
    if (tbody) {
      if (data.son_islemler.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Henüz işlem yok</td></tr>'; } 
      else {
        tbody.innerHTML = data.son_islemler.map(t => `
          <tr>
            <td>${formatTarih(t.tarih)}</td><td>${t.aciklama}</td>
            <td><span style="background:${t.renk}20;color:${t.renk};padding:4px 8px;border-radius:6px;font-size:0.8rem;">${t.kategori}</span></td>
            <td>${t.tur === 'gelir' ? '💰 Gelir' : '💸 Gider'}</td>
            <td class="text-right" style="color:${t.tur==='gelir'?'#22c55e':'#ef4444'};font-weight:600;">${t.tur==='gelir'?'+':'-'} ${formatPara(t.miktar)}</td>
          </tr>`).join('');
      }
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  setActiveNav();
  initDarkMode();
  initDashboardUI(); 
  initDovizAPI();    

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
        setTimeout(() => window.location.reload(), 1000); 
      }
    });
  }
});
