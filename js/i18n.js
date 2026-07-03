// =============================================================
// i18n · Sistema simples de tradução
// Uso: <span data-i18n="hero.title"></span>
//      data-i18n-attr="placeholder" para traduzir atributos
//      data-i18n-html para traduzir HTML interno (cuidado com XSS)
// =============================================================

const STORAGE_KEY = 'study-hub-lang';
let currentLang = 'pt';
let currentDict = {};

/**
 * Pega valor aninhado: get(obj, 'hero.title') → obj.hero.title
 */
function get(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Aplica traduções a todos elementos com data-i18n no escopo
 */
function applyTranslations(scope = document) {
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = get(currentDict, key);
    if (value === undefined) return; // sem tradução, mantém

    const attr = el.getAttribute('data-i18n-attr');
    const isHtml = el.hasAttribute('data-i18n-html');

    if (attr) {
      el.setAttribute(attr, value);
    } else if (isHtml) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });
}

/**
 * Carrega um dicionário e aplica no escopo dado
 * @param {string} dictName  ex: 'az900' → tenta /i18n/az900-pt.json
 * @param {string} lang      'pt' ou 'en'
 * @param {Element} scope    onde aplicar (default: document)
 */
export async function loadI18n(dictName, lang = null, scope = document) {
  // Lang vem do parâmetro, do localStorage, ou padrão pt
  currentLang = lang || localStorage.getItem(STORAGE_KEY) || 'pt';
  localStorage.setItem(STORAGE_KEY, currentLang);

  try {
    const res = await fetch(`i18n/${dictName}-${currentLang}.json`);
    if (!res.ok) throw new Error(`i18n missing: ${dictName}-${currentLang}`);
    currentDict = await res.json();
    applyTranslations(scope);
  } catch (err) {
    console.warn(`[i18n] Falha ao carregar ${dictName}-${currentLang}:`, err);
  }
}

/**
 * Troca o idioma e recarrega
 */
export async function setLang(dictName, lang, scope = document) {
  await loadI18n(dictName, lang, scope);
  // Notifica componentes que querem reagir
  document.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
}

export function getLang() {
  return currentLang;
}

/**
 * Pega uma tradução por chave (para JS dinâmico)
 */
export function t(key, fallback = '') {
  return get(currentDict, key) ?? fallback;
}

/**
 * Injeta um seletor de idioma PT/EN num container
 */
export function mountLangSelector(container, dictName, onChange = null) {
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'lang-selector';
  wrapper.innerHTML = `
    <button data-lang="pt" class="${currentLang === 'pt' ? 'active' : ''}">PT</button>
    <span class="sep">·</span>
    <button data-lang="en" class="${currentLang === 'en' ? 'active' : ''}">EN</button>
  `;

  wrapper.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    const newLang = btn.dataset.lang;
    if (newLang === currentLang) return;
    await setLang(dictName, newLang, container.closest('[data-i18n-scope]') || document);
    wrapper.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === newLang);
    });
    if (onChange) onChange(newLang);
  });

  container.appendChild(wrapper);
}
