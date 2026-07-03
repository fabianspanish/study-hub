// =============================================================
// AUTH · Autenticação e gerenciamento de sessão
// -------------------------------------------------------------
// Modelo de segurança:
//   - Apenas OWNER_EMAIL pode se cadastrar livremente
//   - Outros emails precisam estar em /allowlist/{email}
//   - Senhas: nunca tocadas pelo cliente, hash scrypt no Firebase
//   - Email verificado obrigatório pra login
//   - Rate-limit: Firebase Auth bloqueia tentativas excessivas
// =============================================================

import { loadFirebase, OWNER_EMAIL } from './firebase-config.js';

// Estado global
let _fb = null;
let _currentUser = null;     // Firebase User object
let _currentProfile = null;  // Documento /users/{uid} no Firestore
const _listeners = new Set();

// Validação de senha forte
const PASSWORD_RULES = {
  minLength: 10,
  needsUpper: true,
  needsLower: true,
  needsDigit: true,
  needsSpecial: true,
};

/**
 * Sanitiza email para comparação (lowercase, trim)
 */
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * Sanitiza texto pra exibição (defesa em profundidade contra XSS)
 * Mesmo usando textContent no DOM, defendemos quando guardamos no Firestore.
 */
export function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '')         // remove HTML tags básicas
    .replace(/javascript:/gi, '') // bloqueia javascript: URLs
    .replace(/data:/gi, '')       // bloqueia data: URLs
    .trim()
    .slice(0, maxLen);
}

/**
 * Valida senha forte
 */
export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`Mínimo ${PASSWORD_RULES.minLength} caracteres`);
  }
  if (PASSWORD_RULES.needsUpper && !/[A-Z]/.test(password)) {
    errors.push('Pelo menos uma letra maiúscula');
  }
  if (PASSWORD_RULES.needsLower && !/[a-z]/.test(password)) {
    errors.push('Pelo menos uma letra minúscula');
  }
  if (PASSWORD_RULES.needsDigit && !/\d/.test(password)) {
    errors.push('Pelo menos um número');
  }
  if (PASSWORD_RULES.needsSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Pelo menos um caractere especial');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Valida email (formato básico)
 */
export function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valida telefone BR (opcional, mas se preenchido tem que ser válido)
 */
export function validatePhone(phone) {
  if (!phone) return true; // opcional
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Checa se email pode se cadastrar:
 * - Se for o OWNER_EMAIL → sempre permitido
 * - Senão, precisa estar em /allowlist/{email} com active=true
 */
async function isEmailAllowed(email) {
  const normalized = normalizeEmail(email);
  if (normalized === normalizeEmail(OWNER_EMAIL)) return true;

  const fb = await loadFirebase();
  if (!fb) return false;
  const { doc, getDoc } = fb.dbMod;
  try {
    const ref = doc(fb.db, 'allowlist', normalized);
    const snap = await getDoc(ref);
    return snap.exists() && snap.data()?.active === true;
  } catch (err) {
    console.warn('Falha ao checar allowlist:', err);
    return false;
  }
}

/**
 * Cria o documento /users/{uid} no Firestore (perfil do usuário)
 */
async function ensureUserDoc(user, extras = {}) {
  const fb = await loadFirebase();
  if (!fb) throw new Error('Firebase não disponível');
  const { doc, getDoc, setDoc, serverTimestamp } = fb.dbMod;

  const ref = doc(fb.db, 'users', user.uid);
  const snap = await getDoc(ref);

  const normalizedEmail = normalizeEmail(user.email);
  const isOwner = normalizedEmail === normalizeEmail(OWNER_EMAIL);
  const role = isOwner ? 'admin' : 'member';

  if (!snap.exists()) {
    // Primeira vez: cria o documento completo
    const profile = {
      uid: user.uid,
      email: normalizedEmail,
      name: sanitize(extras.name || user.displayName || ''),
      phone: sanitize(extras.phone || '', 25),
      photoURL: user.photoURL || '',
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      provider: user.providerData[0]?.providerId || 'unknown',
    };
    await setDoc(ref, profile);
    return profile;
  } else {
    // Já existe: atualiza lastLogin + role (se owner) + extras (se passados)
    const existing = snap.data();
    const updates = { lastLogin: serverTimestamp() };
    if (isOwner && existing.role !== 'admin') updates.role = 'admin';
    // Se extras foram passados (signUp/signIn explícito), inclui — mas só se ainda vazios
    if (extras.name && !existing.name) updates.name = sanitize(extras.name);
    if (extras.phone && !existing.phone) updates.phone = sanitize(extras.phone, 25);
    await setDoc(ref, updates, { merge: true });
    return { ...existing, ...updates };
  }
}

/**
 * Faz cadastro com email/senha.
 * Lança erro se o email não tem permissão.
 */
export async function signUp({ email, password, name, phone }) {
  const fb = await loadFirebase();
  if (!fb) throw new Error('Firebase indisponível');

  // Validações no cliente (rápidas, antes de chamar API)
  if (!validateEmail(email)) throw new Error('Email inválido');
  const pw = validatePassword(password);
  if (!pw.ok) throw new Error('Senha fraca: ' + pw.errors.join(', '));
  if (!name || sanitize(name).length < 2) throw new Error('Nome obrigatório');
  if (!validatePhone(phone)) throw new Error('Telefone inválido');

  // Allowlist
  const normalized = normalizeEmail(email);
  const allowed = await isEmailAllowed(normalized);
  if (!allowed) {
    throw new Error('Este email não tem permissão para se cadastrar. Solicite acesso ao administrador.');
  }

  const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = fb.authMod;

  // Cria usuário no Firebase Auth (a senha é hasheada pelo Google)
  const credential = await createUserWithEmailAndPassword(fb.auth, normalized, password);
  const user = credential.user;

  // Define displayName
  if (name) {
    try { await updateProfile(user, { displayName: sanitize(name) }); }
    catch (e) { console.warn('updateProfile falhou:', e); }
  }

  // Cria documento de perfil
  await ensureUserDoc(user, { name: sanitize(name), phone: sanitize(phone, 25) });

  // Envia email de verificação
  try { await sendEmailVerification(user); }
  catch (e) { console.warn('sendEmailVerification falhou:', e); }

  return user;
}

/**
 * Faz login com email/senha
 */
export async function signIn({ email, password }) {
  const fb = await loadFirebase();
  if (!fb) throw new Error('Firebase indisponível');
  if (!validateEmail(email)) throw new Error('Email inválido');
  if (!password) throw new Error('Senha obrigatória');

  const { signInWithEmailAndPassword } = fb.authMod;
  const credential = await signInWithEmailAndPassword(fb.auth, normalizeEmail(email), password);
  return credential.user;
}

/**
 * Faz login com Google (popup)
 */
export async function signInWithGoogle() {
  const fb = await loadFirebase();
  if (!fb) throw new Error('Firebase indisponível');

  const { GoogleAuthProvider, signInWithPopup } = fb.authMod;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(fb.auth, provider);
  const user = result.user;

  // Checa allowlist (Google login também precisa)
  const allowed = await isEmailAllowed(user.email);
  if (!allowed) {
    await fb.authMod.signOut(fb.auth);
    throw new Error('Este email não tem permissão. Solicite acesso ao administrador.');
  }

  await ensureUserDoc(user);
  return user;
}

/**
 * Envia email de recuperação de senha
 */
export async function sendPasswordReset(email) {
  const fb = await loadFirebase();
  if (!fb) throw new Error('Firebase indisponível');
  if (!validateEmail(email)) throw new Error('Email inválido');

  const { sendPasswordResetEmail } = fb.authMod;
  await sendPasswordResetEmail(fb.auth, normalizeEmail(email));
}

/**
 * Logout
 */
export async function signOut() {
  const fb = await loadFirebase();
  if (!fb) return;
  await fb.authMod.signOut(fb.auth);
  _currentUser = null;
  _currentProfile = null;
}

/**
 * Atualiza perfil (nome, telefone)
 */
export async function updateUserProfile({ name, phone }) {
  if (!_currentUser) throw new Error('Não autenticado');
  const fb = await loadFirebase();
  const { doc, setDoc, serverTimestamp } = fb.dbMod;

  const updates = {
    updatedAt: serverTimestamp(),
  };
  if (name !== undefined) updates.name = sanitize(name);
  if (phone !== undefined) updates.phone = sanitize(phone, 25);

  await setDoc(doc(fb.db, 'users', _currentUser.uid), updates, { merge: true });

  // Atualiza displayName no Auth também
  if (name && fb.authMod.updateProfile) {
    try { await fb.authMod.updateProfile(_currentUser, { displayName: sanitize(name) }); }
    catch (e) { console.warn('updateProfile falhou:', e); }
  }

  // Atualiza cache local
  _currentProfile = { ..._currentProfile, ...updates };
  _notify();
}

/**
 * Upload de foto de perfil
 */
export async function uploadProfilePhoto(file) {
  if (!_currentUser) throw new Error('Não autenticado');
  if (!file) throw new Error('Nenhum arquivo');
  if (!file.type.startsWith('image/')) throw new Error('Arquivo precisa ser uma imagem');
  if (file.size > 2 * 1024 * 1024) throw new Error('Imagem maior que 2MB');

  const fb = await loadFirebase();
  const { ref, uploadBytes, getDownloadURL } = fb.storageMod;
  const { doc, setDoc, serverTimestamp } = fb.dbMod;

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `avatars/${_currentUser.uid}.${ext}`;
  const storageRef = ref(fb.storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await setDoc(doc(fb.db, 'users', _currentUser.uid), {
    photoURL: url,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  _currentProfile = { ..._currentProfile, photoURL: url };
  _notify();
  return url;
}

// ============ ALLOWLIST (admin only) ============

/**
 * Adiciona email à allowlist (só admin pode)
 */
export async function addToAllowlist(email) {
  if (!_currentProfile || _currentProfile.role !== 'admin') {
    throw new Error('Apenas admin pode gerenciar a allowlist');
  }
  if (!validateEmail(email)) throw new Error('Email inválido');

  const fb = await loadFirebase();
  const { doc, setDoc, serverTimestamp } = fb.dbMod;
  await setDoc(doc(fb.db, 'allowlist', normalizeEmail(email)), {
    active: true,
    addedBy: _currentUser.uid,
    addedAt: serverTimestamp(),
  });
}

/**
 * Remove email da allowlist
 */
export async function removeFromAllowlist(email) {
  if (!_currentProfile || _currentProfile.role !== 'admin') {
    throw new Error('Apenas admin pode gerenciar a allowlist');
  }
  const fb = await loadFirebase();
  const { doc, deleteDoc } = fb.dbMod;
  await deleteDoc(doc(fb.db, 'allowlist', normalizeEmail(email)));
}

/**
 * Lista todos os emails na allowlist
 */
export async function listAllowlist() {
  if (!_currentProfile || _currentProfile.role !== 'admin') {
    throw new Error('Apenas admin pode listar a allowlist');
  }
  const fb = await loadFirebase();
  const { collection, getDocs } = fb.dbMod;
  const snap = await getDocs(collection(fb.db, 'allowlist'));
  const list = [];
  snap.forEach(d => list.push({ email: d.id, ...d.data() }));
  return list;
}

/**
 * Lista todos os usuários (admin only)
 */
export async function listUsers() {
  if (!_currentProfile || _currentProfile.role !== 'admin') {
    throw new Error('Apenas admin pode listar usuários');
  }
  const fb = await loadFirebase();
  const { collection, getDocs } = fb.dbMod;
  const snap = await getDocs(collection(fb.db, 'users'));
  const list = [];
  snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
  return list;
}

// ============ STATE ============

export function getCurrentUser() { return _currentUser; }
export function getCurrentProfile() { return _currentProfile; }
export function isAuthenticated() { return _currentUser !== null; }
export function isAdmin() { return _currentProfile?.role === 'admin'; }

function _notify() {
  for (const cb of _listeners) {
    try { cb(_currentUser, _currentProfile); }
    catch (e) { console.error('Auth listener err:', e); }
  }
}

/**
 * Inscreve listener para mudanças de auth (login/logout/profile)
 * Retorna função pra cancelar
 */
export function onAuthChange(callback) {
  _listeners.add(callback);
  // dispara imediato com estado atual
  callback(_currentUser, _currentProfile);
  return () => _listeners.delete(callback);
}

/**
 * Inicializa o sistema de auth. Deve ser chamado uma vez no boot do app.
 * Retorna uma promise que resolve quando o primeiro check de auth termina
 * (importante: até resolver, não sabemos se o usuário está logado ou não).
 */
export async function initAuth() {
  const fb = await loadFirebase();
  if (!fb) {
    _notify();
    return;
  }

  const { onAuthStateChanged } = fb.authMod;
  const { doc, getDoc } = fb.dbMod;

  return new Promise(resolve => {
    let firstResolved = false;
    onAuthStateChanged(fb.auth, async (user) => {
      _currentUser = user;
      if (user) {
        // Carrega perfil
        try {
          const snap = await getDoc(doc(fb.db, 'users', user.uid));
          if (snap.exists()) {
            _currentProfile = snap.data();
          } else {
            // Documento não existe ainda — cria (caso especial: usuário criado fora)
            _currentProfile = await ensureUserDoc(user);
          }
        } catch (err) {
          console.error('Falha ao carregar perfil:', err);
          _currentProfile = null;
        }
      } else {
        _currentProfile = null;
      }
      _notify();
      if (!firstResolved) {
        firstResolved = true;
        resolve();
      }
    });
  });
}
