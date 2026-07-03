// =============================================================
// LOGIN PAGE · Controla os 3 forms (signin, signup, forgot)
// =============================================================

import {
  signIn, signUp, signInWithGoogle, sendPasswordReset,
  validatePassword, validateEmail, validatePhone,
} from './auth.js';

let activeTab = 'signin';

// ============ TAB SWITCHING ============

function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.login-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('signin-form').style.display = tab === 'signin' ? 'flex' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'flex' : 'none';
  document.getElementById('forgot-form').style.display = tab === 'forgot' ? 'flex' : 'none';
  // Esconde abas no modo forgot
  document.querySelector('.login-tabs').style.display = tab === 'forgot' ? 'none' : 'grid';
  clearMessage();
}

// ============ MESSAGES ============

function showMessage(type, text) {
  const slot = document.getElementById('login-message-slot');
  if (!slot) return;
  // Usa textContent pra não permitir HTML — defesa contra XSS
  slot.innerHTML = '';
  const div = document.createElement('div');
  div.className = `login-message ${type}`;
  div.textContent = text;
  slot.appendChild(div);
}

function clearMessage() {
  const slot = document.getElementById('login-message-slot');
  if (slot) slot.innerHTML = '';
}

function setLoading(buttonId, isLoading, originalLabel) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.dataset.originalLabel = originalLabel || btn.textContent;
    btn.innerHTML = '<span class="login-loading"></span>Aguarde...';
  } else if (btn.dataset.originalLabel) {
    btn.textContent = btn.dataset.originalLabel;
  }
}

// ============ ERROR MAPPING (Firebase codes → mensagens amigáveis) ============

function friendlyError(err) {
  const code = err?.code || '';
  const msg = err?.message || 'Erro desconhecido';

  const map = {
    'auth/invalid-email':        'Email inválido.',
    'auth/user-disabled':        'Conta desativada. Contate o admin.',
    'auth/user-not-found':       'Email não encontrado.',
    'auth/wrong-password':       'Senha incorreta.',
    'auth/invalid-credential':   'Email ou senha incorretos.',
    'auth/email-already-in-use': 'Este email já tem conta. Use a aba Entrar.',
    'auth/weak-password':        'Senha muito fraca. Use pelo menos 10 caracteres.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    'auth/popup-closed-by-user': 'Login com Google cancelado.',
    'auth/popup-blocked':        'O navegador bloqueou o popup do Google. Permita popups e tente de novo.',
    'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
    'auth/operation-not-allowed': 'Método de login não habilitado no Firebase.',
    'auth/unauthorized-domain':   'Este domínio não está autorizado no Firebase. Adicione em Authentication > Settings > Authorized domains.',
  };

  return map[code] || msg;
}

// ============ PASSWORD METER ============

function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

function updatePasswordMeter(pw) {
  const score = scorePassword(pw);
  const bars = document.querySelectorAll('.login-pwmeter-bar');
  bars.forEach((bar, i) => {
    bar.classList.remove('lvl1', 'lvl2', 'lvl3', 'lvl4');
    if (i < score) {
      bar.classList.add(`lvl${score}`);
    }
  });
  const hint = document.getElementById('signup-pwhint');
  if (hint) {
    const v = validatePassword(pw);
    if (v.ok) {
      hint.textContent = '✓ Senha forte';
      hint.style.color = '#5a7d4a';
    } else {
      hint.textContent = pw ? ('Falta: ' + v.errors.join(', ')) : 'Mínimo 10 caracteres, com maiúscula, minúscula, número e especial';
      hint.style.color = '';
    }
  }
}

// ============ HANDLERS ============

async function handleSignIn(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!validateEmail(email)) {
    showMessage('error', 'Email inválido.');
    return;
  }
  if (!password) {
    showMessage('error', 'Digite sua senha.');
    return;
  }

  setLoading('signin-submit', true);
  try {
    await signIn({ email, password });
    // Login bem-sucedido: o onAuthChange no app.js cuida da navegação
  } catch (err) {
    showMessage('error', friendlyError(err));
  } finally {
    setLoading('signin-submit', false);
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  clearMessage();

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;
  const password2 = document.getElementById('signup-password2').value;

  if (!name || name.length < 2) {
    showMessage('error', 'Nome obrigatório (mínimo 2 caracteres).');
    return;
  }
  if (!validateEmail(email)) {
    showMessage('error', 'Email inválido.');
    return;
  }
  if (phone && !validatePhone(phone)) {
    showMessage('error', 'Telefone inválido. Use formato (11) 99999-9999.');
    return;
  }
  const pwCheck = validatePassword(password);
  if (!pwCheck.ok) {
    showMessage('error', 'Senha fraca: ' + pwCheck.errors.join(', '));
    return;
  }
  if (password !== password2) {
    showMessage('error', 'As senhas não coincidem.');
    return;
  }

  setLoading('signup-submit', true);
  try {
    await signUp({ email, password, name, phone });
    showMessage('success', 'Conta criada! Verifique seu email para confirmar.');
    // onAuthChange já vai redirecionar
  } catch (err) {
    showMessage('error', friendlyError(err));
  } finally {
    setLoading('signup-submit', false);
  }
}

async function handleGoogle() {
  clearMessage();
  const btnId = activeTab === 'signup' ? 'signup-google' : 'signin-google';
  setLoading(btnId, true, 'Continuar com Google');
  try {
    await signInWithGoogle();
  } catch (err) {
    showMessage('error', friendlyError(err));
  } finally {
    setLoading(btnId, false);
  }
}

async function handleForgot(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById('forgot-email').value.trim();
  if (!validateEmail(email)) {
    showMessage('error', 'Email inválido.');
    return;
  }
  setLoading('forgot-submit', true);
  try {
    await sendPasswordReset(email);
    showMessage('success', 'Link enviado! Verifique seu email (e a pasta de spam).');
  } catch (err) {
    showMessage('error', friendlyError(err));
  } finally {
    setLoading('forgot-submit', false);
  }
}

// ============ INIT ============

export function initLogin() {
  // Tab buttons
  document.querySelectorAll('.login-tab').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Forms
  document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('signup-form')?.addEventListener('submit', handleSignUp);
  document.getElementById('forgot-form')?.addEventListener('submit', handleForgot);

  // Google buttons
  document.getElementById('signin-google')?.addEventListener('click', handleGoogle);
  document.getElementById('signup-google')?.addEventListener('click', handleGoogle);

  // Forgot links
  document.getElementById('forgot-link')?.addEventListener('click', () => showTab('forgot'));
  document.getElementById('forgot-back')?.addEventListener('click', () => showTab('signin'));

  // Password meter
  document.getElementById('signup-password')?.addEventListener('input', e => {
    updatePasswordMeter(e.target.value);
  });

  // Foca no email do signin
  setTimeout(() => {
    document.getElementById('signin-email')?.focus();
  }, 100);
}
