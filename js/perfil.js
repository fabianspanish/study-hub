// =============================================================
// PERFIL · Edição de dados do usuário
// =============================================================

import {
  getCurrentUser, getCurrentProfile,
  updateUserProfile, uploadProfilePhoto,
  validatePhone,
} from './auth.js';
import { loadFirebase } from './firebase-config.js';

function showMessage(type, text) {
  const slot = document.getElementById('perfil-message-slot');
  if (!slot) return;
  slot.innerHTML = '';
  const div = document.createElement('div');
  div.className = `login-message ${type}`;
  div.textContent = text;
  slot.appendChild(div);
  setTimeout(() => { if (slot.contains(div)) div.remove(); }, 6000);
}

function getInitial(name, email) {
  const src = (name || email || 'U').trim();
  return src.charAt(0).toUpperCase();
}

function renderAvatar(profile, user) {
  const preview = document.getElementById('perfil-avatar-preview');
  const initial = document.getElementById('perfil-avatar-initial');
  if (!preview) return;

  const url = profile?.photoURL || user?.photoURL;
  if (url) {
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = profile?.name || 'avatar';
    preview.appendChild(img);
  } else {
    preview.innerHTML = `<span>${getInitial(profile?.name, user?.email)}</span>`;
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

async function handleSave(e) {
  e.preventDefault();
  const name = document.getElementById('perfil-name').value.trim();
  const phone = document.getElementById('perfil-phone').value.trim();

  if (!name || name.length < 2) {
    showMessage('error', 'Nome obrigatório (mínimo 2 caracteres).');
    return;
  }
  if (phone && !validatePhone(phone)) {
    showMessage('error', 'Telefone inválido. Formato: (11) 99999-9999.');
    return;
  }

  const btn = document.getElementById('perfil-save');
  btn.disabled = true;
  btn.innerHTML = '<span class="login-loading"></span>Salvando...';

  try {
    await updateUserProfile({ name, phone });
    showMessage('success', 'Perfil atualizado!');
    // Atualiza chip no topo
    const label = document.getElementById('user-chip-label');
    if (label) label.textContent = name;
  } catch (err) {
    showMessage('error', err.message || 'Erro ao salvar.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar mudanças';
  }
}

async function handlePhotoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const status = document.getElementById('perfil-photo-status');
  status.textContent = 'Enviando...';
  status.style.color = 'var(--clay)';

  try {
    const url = await uploadProfilePhoto(file);
    status.textContent = '✓ Foto atualizada!';
    status.style.color = '#5a7d4a';
    renderAvatar(getCurrentProfile(), getCurrentUser());
    showMessage('success', 'Foto de perfil atualizada.');
  } catch (err) {
    status.textContent = err.message || 'Erro ao enviar.';
    status.style.color = '#a93b3b';
    showMessage('error', err.message || 'Erro ao enviar foto.');
  }
}

async function handleResendVerification() {
  try {
    const fb = await loadFirebase();
    const user = getCurrentUser();
    if (!user) return;
    await fb.authMod.sendEmailVerification(user);
    showMessage('success', 'Email de verificação reenviado. Verifique sua caixa de entrada.');
  } catch (err) {
    showMessage('error', err.message || 'Erro ao enviar.');
  }
}

export function initPerfil() {
  const user = getCurrentUser();
  const profile = getCurrentProfile();

  if (!user) {
    document.getElementById('page').innerHTML = '<p style="padding:40px">Você precisa estar logado.</p>';
    return;
  }

  // Preenche campos
  document.getElementById('perfil-name').value = profile?.name || user.displayName || '';
  document.getElementById('perfil-phone').value = profile?.phone || '';
  document.getElementById('perfil-email-display').textContent = user.email;
  document.getElementById('perfil-role-display').textContent = (profile?.role || 'member');
  document.getElementById('perfil-since-display').textContent = `desde ${formatDate(profile?.createdAt)}`;

  renderAvatar(profile, user);

  // Verificação de email
  const verifiedSlot = document.getElementById('email-verified-status');
  const resendBtn = document.getElementById('btn-resend-verification');
  if (user.emailVerified) {
    verifiedSlot.innerHTML = '<strong style="color:#5a7d4a">✓ Email verificado</strong>';
  } else {
    verifiedSlot.innerHTML = '<strong style="color:#a93b3b">⚠ Email não verificado</strong> — verifique sua caixa de entrada.';
    if (resendBtn) {
      resendBtn.style.display = '';
      resendBtn.addEventListener('click', handleResendVerification);
    }
  }

  // Handlers
  document.getElementById('perfil-form').addEventListener('submit', handleSave);
  document.getElementById('perfil-photo').addEventListener('change', handlePhotoUpload);
  document.getElementById('perfil-photo-btn').addEventListener('click', () => {
    document.getElementById('perfil-photo').click();
  });
}
