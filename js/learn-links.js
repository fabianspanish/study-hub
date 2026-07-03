// =============================================================
// LEARN LINKS · Injeta ícones de link para Microsoft Learn
// em cada elemento com [data-learn="path/da/url"]
// URL é construída como: https://learn.microsoft.com/{lang}/{path}
// =============================================================

import { getLang } from './i18n.js';

const SVG_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

/**
 * Mapa: chave i18n do tópico → caminho na Microsoft Learn (sem locale prefix).
 * O locale será inserido em tempo de render conforme o idioma atual.
 */
const TOPIC_URLS = {
  // ============ SECTION 1 — Overview ============
  'section1.exam_structure':    'credentials/certifications/exams/az-900',
  'section1.domains_title':     'credentials/certifications/resources/study-guides/az-900',
  'section1.callout_text':      'credentials/certifications/resources/study-guides/az-900',

  // ============ SECTION 2 — Domain 1: Cloud Concepts ============
  'section2.compute_title':         'training/modules/describe-cloud-compute/',
  'section2.shared_resp_topic':     'azure/security/fundamentals/shared-responsibility',
  'section2.models_title':          'training/modules/describe-cloud-compute/4-define-cloud-models',
  'section2.consumption_title':     'training/modules/describe-cloud-compute/6-describe-consumption-based-model',
  'section2.serverless_title':      'azure/azure-functions/functions-overview',
  'section2.benefits_title':        'training/modules/describe-benefits-use-cloud-services/',
  'section2.service_types_title':   'training/modules/describe-cloud-service-types/',
  'section2.iaas_title':            'training/modules/describe-cloud-service-types/3-describe-iaas',
  'section2.paas_title':            'training/modules/describe-cloud-service-types/4-describe-paas',
  'section2.saas_title':            'training/modules/describe-cloud-service-types/5-describe-saas',

  // ============ SECTION 3 — Domain 2: Architecture & Services ============
  'section3.arch_title':         'training/modules/describe-core-architectural-components-of-azure/',
  'section3.regions_topic':      'azure/reliability/cross-region-replication-azure',
  'section3.az_topic':           'azure/reliability/availability-zones-overview',
  'section3.dc_topic':           'azure/reliability/regions-overview',
  'section3.hierarchy_title':    'azure/governance/management-groups/overview',

  'section3.compute_title':      'training/modules/describe-azure-compute-networking-services/',
  'section3.hosting_title':      'azure/architecture/guide/technology-choices/compute-decision-tree',

  'section3.network_title':      'training/modules/describe-azure-networking-services/',
  'section3.endpoints_topic':    'azure/private-link/private-endpoint-overview',

  'section3.storage_title':         'training/modules/describe-azure-storage-services/',
  'section3.storage_tiers_title':   'azure/storage/blobs/access-tiers-overview',
  'section3.redundancy_title':      'azure/storage/common/storage-redundancy',
  'section3.movetools_title':       'azure/storage/common/storage-use-azcopy-v10',

  'section3.iam_title':          'training/modules/describe-azure-identity-access-security/',
  'section3.entraid_topic':      'entra/fundamentals/whatis',
  'section3.entrads_topic':      'entra/identity/domain-services/overview',
  'section3.auth_title':         'entra/identity/authentication/concept-authentication-methods',
  'section3.cond_topic':         'entra/identity/conditional-access/overview',
  'section3.rbac_topic':         'azure/role-based-access-control/overview',
  'section3.zerotrust_topic':    'security/zero-trust/zero-trust-overview',
  'section3.dd_topic':           'azure/security/fundamentals/network-best-practices',
  'section3.defender_topic':     'azure/defender-for-cloud/defender-for-cloud-introduction',

  // ============ SECTION 4 — Domain 3: Management & Governance ============
  'section4.cost_title':       'training/modules/describe-cost-management-azure/',
  'section4.cost_factors':     'azure/cost-management-billing/cost-management-billing-overview',
  'section4.calc_topic':       'azure/cost-management-billing/manage/tco-calculator',
  'section4.cm_topic':         'azure/cost-management-billing/costs/overview-cost-management',
  'section4.tags_topic':       'azure/azure-resource-manager/management/tag-resources',

  'section4.gov_title':        'training/modules/describe-features-tools-azure-for-governance-compliance/',
  'section4.purview_topic':    'purview/purview',
  'section4.policy_topic':     'azure/governance/policy/overview',
  'section4.locks_topic':      'azure/azure-resource-manager/management/lock-resources',

  'section4.deploy_title':     'training/modules/describe-features-tools-manage-deploy-azure-resources/',

  'section4.monitor_title':    'training/modules/describe-monitoring-tools-azure/',
  'section4.advisor_topic':    'azure/advisor/advisor-overview',
  'section4.health_topic':     'azure/service-health/overview',
  'section4.monitor_topic':    'azure/azure-monitor/overview',
};

/**
 * Sub-cards mapeados pelo data-i18n do <h4> dentro dos cards
 */
const CARD_URLS = {
  // Domain 1 cards
  'section2.shared_resp_h1':  'azure/security/fundamentals/shared-responsibility#iaas',
  'section2.shared_resp_h2':  'azure/security/fundamentals/shared-responsibility#paas',
  'section2.shared_resp_h3':  'azure/security/fundamentals/shared-responsibility#saas',
  'section2.public':          'azure/architecture/cloud-adoption/getting-started/what-is-a-cloud-deployment-environment',
  'section2.private':         'azure/architecture/cloud-adoption/getting-started/what-is-a-cloud-deployment-environment',
  'section2.hybrid':          'azure/architecture/hybrid/hybrid-start-here',
  'section2.multi':           'azure/architecture/multicloud/start-here',
  'section2.pricing_h1':      'azure/cost-management-billing/manage/ea-pricing',
  'section2.pricing_h2':      'azure/cost-management-billing/reservations/save-compute-costs-reservations',
  'section2.pricing_h3':      'azure/virtual-machines/spot-vms',
  'section2.pricing_h4':      'azure/cost-management-billing/savings-plan/savings-plan-compute-overview',
  'section2.serverless_h1':   'azure/azure-functions/functions-overview#features',

  // Domain 2 — compute cards
  'section3.vm_card':         'azure/virtual-machines/overview',
  'section3.vmss_card':       'azure/virtual-machine-scale-sets/overview',
  'section3.as_card':         'azure/virtual-machines/availability-set-overview',
  'section3.avd_card':        'azure/virtual-desktop/overview',
  'section3.container_card':  'azure/container-instances/container-instances-overview',
  'section3.aks_card':        'azure/aks/intro-kubernetes',
  'section3.functions_card':  'azure/azure-functions/functions-overview',
  'section3.appservice_card': 'azure/app-service/overview',

  // Domain 2 — networking cards
  'section3.vnet_card':       'azure/virtual-network/virtual-networks-overview',
  'section3.subnet_card':     'azure/virtual-network/virtual-network-manage-subnet',
  'section3.peering_card':    'azure/virtual-network/virtual-network-peering-overview',
  'section3.dns_card':        'azure/dns/dns-overview',
  'section3.vpn_card':        'azure/vpn-gateway/vpn-gateway-about-vpngateways',
  'section3.er_card':         'azure/expressroute/expressroute-introduction',

  // Domain 2 — storage cards
  'section3.blob_card':       'azure/storage/blobs/storage-blobs-introduction',
  'section3.files_card':      'azure/storage/files/storage-files-introduction',
  'section3.queue_card':      'azure/storage/queues/storage-queues-introduction',
  'section3.table_card':      'azure/storage/tables/table-storage-overview',
  'section3.disk_card':       'azure/virtual-machines/managed-disks-overview',

  // Domain 3 cards
  'section4.portal_card':     'azure/azure-portal/azure-portal-overview',
  'section4.shell_card':      'azure/cloud-shell/overview',
  'section4.cli_card':        'cli/azure/what-is-azure-cli',
  'section4.ps_card':         'powershell/azure/what-is-azure-powershell',
  'section4.arc_card':        'azure/azure-arc/overview',
  'section4.iac_card':        'devops/deliver/what-is-infrastructure-as-code',
  'section4.arm_card':        'azure/azure-resource-manager/management/overview',
  'section4.armtpl_card':     'azure/azure-resource-manager/bicep/overview',

  // Section 5 — learning paths (titles dentro dos cards)
  'section5.week1_title':     'training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/',
  'section5.week2_title':     'training/paths/azure-fundamentals-describe-azure-architecture-services/',
  'section5.week3_title':     'training/paths/describe-azure-management-governance/',
  'section5.week4_title':     'training/paths/introduction-cloud-infrastructure-apply-azure-skills-guided-projects/',
};

/**
 * Tópicos sem chave i18n (matching por texto/atributo específico)
 */
const EXTRA_URLS = {
  'serverless_h1':            'azure/azure-functions/functions-overview',
  'auth_sso':                 'entra/identity/enterprise-apps/what-is-single-sign-on',
  'auth_mfa':                 'entra/identity/authentication/concept-mfa-howitworks',
  'auth_passwordless':        'entra/identity/authentication/concept-authentication-passwordless',
  'auth_external':            'entra/external-id/external-identities-overview',
};

const labelByLang = {
  pt: 'Abrir no Microsoft Learn (nova aba)',
  en: 'Open in Microsoft Learn (new tab)',
};

/**
 * Pega a URL completa para o idioma atual
 */
function buildUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const lang = getLang();
  const locale = lang === 'en' ? 'en-us' : 'pt-br';
  return `https://learn.microsoft.com/${locale}/${path}`;
}

/**
 * Cria o <a> com o ícone
 */
function createLink(path, title) {
  const a = document.createElement('a');
  a.href = buildUrl(path);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'learn-link';
  a.setAttribute('aria-label', title);
  a.title = title;
  a.innerHTML = SVG_ICON;
  return a;
}

/**
 * Anexa um link no final do elemento target.
 * Se já existir um link nesse elemento, atualiza apenas o href (re-render por troca de idioma).
 */
function attachLink(el, path, title) {
  if (!el || !path) return;
  const existing = el.querySelector(':scope > .learn-link');
  if (existing) {
    existing.href = buildUrl(path);
    existing.setAttribute('aria-label', title);
    existing.title = title;
    return;
  }
  el.appendChild(createLink(path, title));
}

/**
 * Aplica todos os links no escopo dado (default: document)
 */
export function applyLearnLinks(scope = document) {
  const lang = getLang();
  const title = labelByLang[lang] || labelByLang.pt;

  // Headings principais (h3) por data-i18n
  scope.querySelectorAll('h3[data-i18n]').forEach(h => {
    const key = h.getAttribute('data-i18n');
    const path = TOPIC_URLS[key] || CARD_URLS[key];
    if (path) attachLink(h, path, title);
  });

  // Sub-headings h4 (cards e subseções)
  scope.querySelectorAll('h4[data-i18n]').forEach(h => {
    const key = h.getAttribute('data-i18n');
    const path = CARD_URLS[key] || TOPIC_URLS[key];
    if (path) attachLink(h, path, title);
  });

  // Topic-title divs
  scope.querySelectorAll('.topic-title[data-i18n]').forEach(div => {
    const key = div.getAttribute('data-i18n');
    if (TOPIC_URLS[key]) attachLink(div, TOPIC_URLS[key], title);
  });
}

/**
 * Inicialização: aplica logo e re-aplica quando o idioma muda
 */
export function initLearnLinks(scope = document) {
  applyLearnLinks(scope);
  document.addEventListener('lang-changed', () => applyLearnLinks(scope));
}
