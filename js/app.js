// =============================================================
// APP · Orquestrador principal
// 1. Inicia auth (mostra boot splash)
// 2. Se não autenticado → tela de login
// 3. Se autenticado → app normal (header + router)
// =============================================================

import { initAuth, onAuthChange, getCurrentUser, getCurrentProfile, signOut, isAdmin } from './auth.js';

// ============ ROTAS ============

const routes = {
  '/': 'pages/home.html',
  '/home': 'pages/home.html',
  '/cert/az900': 'pages/cert-az900.html',
  '/cert/az900/quiz': 'pages/cert-az900-quiz.html',
  '/cert/az900/aprendizado': 'pages/cert-az900-aprendizado.html',
  '/cultivo/mineral-basico': 'pages/cultivo-mineral-basico.html',
  '/cultivo/mineral-avancado': 'pages/cultivo-mineral-avancado.html',
  '/cultivo/diario': 'pages/diario.html',
  '/cultivo/calc/luz': 'pages/calc-luz.html',
  '/cultivo/calc/rega': 'pages/calc-rega.html',
  '/cultivo/calc/fertilizacao': 'pages/calc-fertilizacao.html',
  '/cultivo/mineral': 'pages/cultivo-mineral-basico.html',
  '/perfil': 'pages/perfil.html',
  '/admin': 'pages/admin.html',
};

const pageInitializers = {
  '/cert/az900': async () => {
    const i18n = await import('./i18n.js');
    const mount = document.getElementById('az-lang-mount');
    if (mount) i18n.mountLangSelector(mount, 'az900');
    await i18n.loadI18n('az900');
    const learnLinks = await import('./learn-links.js');
    learnLinks.initLearnLinks();
  },
  '/cert/az900/quiz': async () => {
    const mod = await import('./quiz-az900.js');
    mod.initQuiz();
  },
  '/cert/az900/aprendizado': async () => {
    const mod = await import('./quiz-az900.js');
    mod.initQuiz({
      bankFile: 'data/az900-questions-extended.json',
      progressKey: 'study-hub-az900-aprendizado-progress',
    });
  },
  '/cultivo/diario': async () => {
    const mod = await import('./diario.js');
    mod.initDiario();
  },
  '/cultivo/calc/luz': async () => {
    const mod = await import('./calc-luz.js');
    mod.initCalcLuz();
  },
  '/cultivo/calc/rega': async () => {
    const mod = await import('./calc-rega.js');
    mod.initCalcRega();
  },
  '/cultivo/calc/fertilizacao': async () => {
    const mod = await import('./calc-fertilizacao.js');
    mod.initCalcFert();
  },
  '/perfil': async () => {
    const mod = await import('./perfil.js');
    mod.initPerfil();
  },
  '/admin': async () => {
    const mod = await import('./admin.js');
    mod.initAdmin();
  },
};

const pageEl = document.getElementById('page');

function getRoute() {
  let hash = window.location.hash.replace(/^#/, '') || '/home';
  if (!hash.startsWith('/')) return null; // anchor interna
  return hash;
}

let currentRoute = null;
let renderMode = 'boot';  // 'boot' | 'login' | 'app'

function setActiveMenu(path) {
  document.querySelectorAll('.menu > li').forEach(li => li.classList.remove('active'));
  if (path.startsWith('/cert')) {
    document.querySelector('.menu > li[data-menu="certificacoes"]')?.classList.add('active');
  } else if (path.startsWith('/cultivo')) {
    document.querySelector('.menu > li[data-menu="cultivo"]')?.classList.add('active');
  } else if (path === '/perfil' || path === '/admin') {
    document.querySelector('.menu > li[data-menu="conta"]')?.classList.add('active');
  } else {
    document.querySelector('.menu > li:first-child')?.classList.add('active');
  }
}

// ============ LOADERS ============

async function loadLoginPage() {
  currentRoute = '__login__';
  pageEl.className = '';
  try {
    const res = await fetch('pages/login.html');
    const html = await res.text();
    pageEl.innerHTML = html;
    const loginMod = await import('./login.js');
    loginMod.initLogin();
  } catch (err) {
    console.error('Falha ao carregar login:', err);
    pageEl.innerHTML = '<div style="padding:40px;color:#fff">Erro ao carregar tela de login.</div>';
  }
}

async function loadAppPage() {
  const path = getRoute();

  if (path === null) {
    // anchor interna
    const anchor = window.location.hash.replace(/^#/, '');
    if (anchor) {
      const target = document.getElementById(anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  if (path === currentRoute) {
    window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }
  currentRoute = path;

  const file = routes[path] || routes['/home'];
  pageEl.className = 'page-loading';
  pageEl.textContent = 'Carregando';

  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Erro ao carregar ${file} (${res.status})`);
    const html = await res.text();

    pageEl.className = '';
    pageEl.innerHTML = html;

    if (pageInitializers[path]) {
      await pageInitializers[path]();
    }

    window.scrollTo({top: 0, behavior: 'instant'});
    setActiveMenu(path);

  } catch (err) {
    console.error(err);
    pageEl.className = '';
    pageEl.innerHTML = `
      <div style="max-width:720px;margin:80px auto;padding:40px;background:var(--paper);border-radius:6px;border-left:4px solid var(--rust);font-family:'Inter',sans-serif">
        <h2 style="font-family:'Fraunces',serif;color:var(--leaf-deep);margin-bottom:12px">Página não encontrada</h2>
        <p style="color:var(--clay)">Não consegui carregar <code>${file}</code>.</p>
        <p style="margin-top:14px"><a href="#/home" style="color:var(--amber)">← Voltar para o início</a></p>
      </div>
    `;
  }
}

// ============ AUTH STATE → RENDER MODE ============

function setRenderMode(mode) {
  if (renderMode === mode) return;
  renderMode = mode;

  const topnav = document.getElementById('topnav');
  const footer = document.getElementById('global-footer');

  if (mode === 'app') {
    if (topnav) topnav.style.display = '';
    if (footer) footer.style.display = '';
    document.body.classList.remove('no-header');
    loadAppPage();
  } else if (mode === 'login') {
    if (topnav) topnav.style.display = 'none';
    if (footer) footer.style.display = 'none';
    document.body.classList.add('no-header');
    currentRoute = null;
    loadLoginPage();
  }
}

function updateUserChip(user, profile) {
  const label = document.getElementById('user-chip-label');
  const adminItem = document.getElementById('menu-admin-item');
  if (label) {
    const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Conta';
    label.textContent = displayName;
  }
  if (adminItem) {
    adminItem.style.display = isAdmin() ? '' : 'none';
  }
}

function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('fade');
  setTimeout(() => { splash.style.display = 'none'; }, 300);
}

// ============ LOGOUT ============

async function handleLogout(e) {
  e.preventDefault();
  if (!confirm('Tem certeza que quer sair?')) return;
  try {
    await signOut();
    // onAuthChange vai disparar e trocar pra tela de login
  } catch (err) {
    console.error('Erro ao sair:', err);
    alert('Erro ao encerrar sessão. Tente recarregar a página.');
  }
}

// ============ BOOT ============

async function boot() {
  // Logout button (delegado, é seguro adicionar mesmo antes do menu existir)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('#btn-logout');
    if (a) {
      handleLogout(e);
      return;
    }
  });

  // Listener de auth state
  onAuthChange((user, profile) => {
    if (user) {
      updateUserChip(user, profile);
      setRenderMode('app');
    } else {
      setRenderMode('login');
    }
  });

  // Inicia auth (espera primeiro check)
  try {
    await initAuth();
  } catch (err) {
    console.error('Falha ao iniciar auth:', err);
    // Cai pra tela de login mesmo assim — usuário vai ver mensagem de erro
    setRenderMode('login');
  } finally {
    hideBootSplash();
  }
}

// Hash change → roteia (só quando logado)
window.addEventListener('hashchange', () => {
  if (renderMode === 'app') loadAppPage();
});

// Anchor interna (#abc sem barra)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#/')) return;
  if (href === '#') return;
  e.preventDefault();
  const id = href.slice(1);
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

window.addEventListener('DOMContentLoaded', boot);
