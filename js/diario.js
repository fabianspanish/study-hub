// =============================================================
// DIÁRIO DE CULTIVO · CRUD
// Backend: Firebase Firestore (com fallback automático para localStorage)
// Auth: usa sessão do auth.js (usuário já autenticado pelo app principal)
// =============================================================

import { FIREBASE_CONFIGURED, loadFirebase } from './firebase-config.js';
import { getCurrentUser, getCurrentProfile } from './auth.js';

// ===========================
// ESTADO
// ===========================
let currentUser = null;
let entries = [];
let currentFilter = 'all';
let editingId = null;

// Firebase carregado (ou null se indisponível)
let fb = null;

// ===========================
// STORAGE ABSTRATO
// (firebase ou localStorage)
// ===========================
const storage = {
  async listEntries(uid) {
    if (fb && uid && uid !== 'local') {
      const { collection, query, orderBy, getDocs } = fb.dbMod;
      const q = query(
        collection(fb.db, 'users', uid, 'diary'),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      // fallback localStorage
      const raw = localStorage.getItem('diary_entries') || '[]';
      const arr = JSON.parse(raw);
      return arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
  },

  async createEntry(uid, data) {
    if (fb && uid && uid !== 'local') {
      const { collection, addDoc, serverTimestamp } = fb.dbMod;
      const ref = await addDoc(collection(fb.db, 'users', uid, 'diary'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } else {
      const raw = localStorage.getItem('diary_entries') || '[]';
      const arr = JSON.parse(raw);
      const id = 'local_' + Date.now();
      arr.push({ id, ...data, createdAt: Date.now(), updatedAt: Date.now() });
      localStorage.setItem('diary_entries', JSON.stringify(arr));
      return id;
    }
  },

  async updateEntry(uid, id, data) {
    if (fb && uid && uid !== 'local') {
      const { doc, updateDoc, serverTimestamp } = fb.dbMod;
      await updateDoc(doc(fb.db, 'users', uid, 'diary', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      const raw = localStorage.getItem('diary_entries') || '[]';
      const arr = JSON.parse(raw);
      const idx = arr.findIndex(e => e.id === id);
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...data, updatedAt: Date.now() };
        localStorage.setItem('diary_entries', JSON.stringify(arr));
      }
    }
  },

  async deleteEntry(uid, id) {
    if (fb && uid && uid !== 'local') {
      const { doc, deleteDoc } = fb.dbMod;
      await deleteDoc(doc(fb.db, 'users', uid, 'diary', id));
    } else {
      const raw = localStorage.getItem('diary_entries') || '[]';
      const arr = JSON.parse(raw).filter(e => e.id !== id);
      localStorage.setItem('diary_entries', JSON.stringify(arr));
    }
  }
};

// ===========================
// AUTH
// ===========================
async function setupAuth() {
  // Tenta carregar Firebase (já inicializado pelo app.js)
  fb = await loadFirebase();

  // Usa o usuário já autenticado pelo app.js
  const authUser = getCurrentUser();
  if (authUser && fb) {
    currentUser = authUser;
    return;
  }

  // Fallback: modo local (Firebase indisponível ou não logado por algum motivo)
  fb = null;
  currentUser = {
    uid: 'local',
    email: authUser?.email || (FIREBASE_CONFIGURED ? 'modo offline' : 'modo local'),
  };
}

// ===========================
// RENDER
// ===========================
function renderAuthBar() {
  const el = document.getElementById('authBar');
  if (!el) return;

  const profile = getCurrentProfile();
  const displayName = profile?.name || currentUser?.email || 'usuário';

  let status;
  if (fb && currentUser?.uid !== 'local') {
    status = `Conectado · <span class="user-email">${displayName}</span>`;
  } else if (FIREBASE_CONFIGURED) {
    status = `<span class="user-email">${displayName} (offline)</span>`;
  } else {
    status = `<span class="user-email">Modo local — Firebase não configurado</span>`;
  }

  el.innerHTML = `
    <div class="auth-card">
      <div class="auth-info">
        <strong>Status:</strong> ${status}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--moss)">
        ${entries.length} ${entries.length === 1 ? 'registro' : 'registros'}
      </div>
    </div>
  `;
}

function renderEntries() {
  const el = document.getElementById('entriesList');
  if (!el) return;

  let list = entries;
  if (currentFilter !== 'all') {
    list = entries.filter(e => e.stage === currentFilter);
  }

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">∅</div>
        <h3>Nenhum registro ainda</h3>
        <p>Comece registrando o primeiro dia do seu cultivo. Anote tudo: ambiente, planta, ações. Cada ciclo é uma nova chance de aprimoramento.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnNew').click()">+ Novo registro</button>
      </div>
    `;
    return;
  }

  el.innerHTML = list.map(e => {
    const date = e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const stageLabel = STAGE_LABELS[e.stage] || e.stage;
    return `
      <article class="entry">
        <div class="entry-head">
          <div>
            <div class="entry-date">${date}</div>
            ${e.day ? `<div class="entry-day-num">Dia ${e.day}</div>` : ''}
          </div>
        </div>
        ${e.stage ? `<span class="entry-stage ${e.stage}">${stageLabel}</span>` : ''}
        <h3 class="entry-title">${escapeHtml(e.title || 'Sem título')}</h3>
        ${e.strain ? `<div class="entry-strain">${escapeHtml(e.strain)}</div>` : ''}

        <div class="entry-metrics">
          ${e.tempC != null && e.tempC !== '' ? `<span class="m-label">Temp</span><span class="m-value">${e.tempC}°C</span>` : ''}
          ${e.rh != null && e.rh !== '' ? `<span class="m-label">UR</span><span class="m-value">${e.rh}%</span>` : ''}
          ${e.ph != null && e.ph !== '' ? `<span class="m-label">pH</span><span class="m-value">${e.ph}</span>` : ''}
          ${e.ec != null && e.ec !== '' ? `<span class="m-label">EC</span><span class="m-value">${e.ec}</span>` : ''}
          ${e.lightHours != null && e.lightHours !== '' ? `<span class="m-label">Luz</span><span class="m-value">${e.lightHours}h</span>` : ''}
          ${e.heightCm != null && e.heightCm !== '' ? `<span class="m-label">Altura</span><span class="m-value">${e.heightCm} cm</span>` : ''}
        </div>

        ${e.observations ? `<div class="entry-notes">${escapeHtml(e.observations)}</div>` : ''}

        <div class="entry-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${e.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-delete="${e.id}">Excluir</button>
        </div>
      </article>
    `;
  }).join('');

  // wire up actions
  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.edit));
  });
  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.delete));
  });
}

const STAGE_LABELS = {
  germ: 'Germinação',
  muda: 'Muda',
  vega: 'Vegetativo',
  flora: 'Floração',
  colheita: 'Colheita',
  cura: 'Cura',
};

// ===========================
// MODAL
// ===========================
function openModal(id = null) {
  const modal = document.getElementById('modalEntry');
  const form = document.getElementById('formEntry');
  form.reset();

  editingId = id;

  if (id) {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    document.getElementById('modalTitle').textContent = 'Editar registro';
    Object.entries(e).forEach(([k, v]) => {
      const input = form.elements[k];
      if (input && v != null) input.value = v;
    });
  } else {
    document.getElementById('modalTitle').textContent = 'Novo registro';
    form.elements['date'].value = new Date().toISOString().slice(0, 10);
  }

  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modalEntry').classList.remove('open');
  editingId = null;
}

async function saveEntry(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  // converte numéricos
  ['day', 'tempC', 'rh', 'ph', 'ec', 'lightHours', 'heightCm', 'ppfd', 'runoffEc'].forEach(k => {
    if (data[k] === '' || data[k] == null) {
      delete data[k];
    } else {
      data[k] = Number(data[k]);
    }
  });

  // remove campos vazios
  Object.keys(data).forEach(k => {
    if (data[k] === '' || data[k] == null) delete data[k];
  });

  try {
    if (editingId) {
      await storage.updateEntry(currentUser?.uid, editingId, data);
      showToast('Registro atualizado', 'success');
    } else {
      await storage.createEntry(currentUser?.uid, data);
      showToast('Registro criado', 'success');
    }
    await reload();
    closeModal();
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar', 'error');
  }
}

async function deleteEntry(id) {
  if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
  try {
    await storage.deleteEntry(currentUser?.uid, id);
    showToast('Registro excluído', 'success');
    await reload();
  } catch (err) {
    console.error(err);
    showToast('Erro ao excluir', 'error');
  }
}

async function reload() {
  entries = await storage.listEntries(currentUser?.uid);
  renderAuthBar();
  renderEntries();
  updateStats();
}

function updateStats() {
  const totalEl = document.getElementById('statTotal');
  const activeEl = document.getElementById('statActive');
  if (totalEl) totalEl.textContent = entries.length;
  if (activeEl) {
    const active = entries.filter(e => !['colheita', 'cura'].includes(e.stage)).length;
    activeEl.textContent = active;
  }
}

// ===========================
// HELPERS
// ===========================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let toastTimer;
function showToast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ===========================
// INIT (chamado pelo router)
// ===========================
export async function initDiario() {
  await setupAuth();

  // Wire up
  document.getElementById('btnNew')?.addEventListener('click', () => openModal());
  document.getElementById('formEntry')?.addEventListener('submit', saveEntry);
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalEntry')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalEntry') closeModal();
  });

  document.querySelectorAll('.filter-pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      currentFilter = p.dataset.filter;
      renderEntries();
    });
  });

  await reload();
}
