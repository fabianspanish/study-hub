// =============================================================
// CALCULADORA DE REGA
// Reproduz a planilha calculadora-de-rega1.xlsx (Cultlight)
// 3 cálculos: Field Capacity, Shot Size, Dryback (precisa + simples)
// =============================================================

const fmtBR = (n, dec = 1) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: dec, maximumFractionDigits: dec
}).format(n);

// ============ FIELD CAPACITY ============
function recalcFC() {
  const substrato = parseFloat(document.getElementById('fc-substrato').value) || 0;
  const aplicada  = parseFloat(document.getElementById('fc-aplicada').value) || 0;
  const runoff    = parseFloat(document.getElementById('fc-runoff').value) || 0;

  const retida = aplicada - runoff;
  const fc = substrato > 0 ? (retida / substrato) * 100 : 0;

  document.getElementById('fc-out-retida').innerHTML = `${fmtBR(retida, 2)}<span class="unit">L</span>`;
  document.getElementById('fc-out-pct').innerHTML = `${fmtBR(fc, 0)}<span class="unit">%</span>`;
}

// ============ SHOT SIZE ============
function recalcSS() {
  const volume = parseFloat(document.getElementById('ss-volume').value) || 0;
  const vazao  = parseFloat(document.getElementById('ss-vazao').value) || 0;

  const tbody = document.getElementById('ss-tabela');
  if (!tbody) return;

  const pcts = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
  tbody.innerHTML = pcts.map(p => {
    const ml = volume * p;
    const tempo = vazao > 0 ? (ml / vazao) * 60 : 0; // segundos
    const recomendado = (p >= 0.03 && p <= 0.06);
    return `
      <tr style="${recomendado ? 'background:rgba(200,131,42,.06)' : ''}">
        <td><strong>${(p * 100).toFixed(0)}%</strong>${recomendado ? ' <span style="color:var(--amber);font-size:10px;letter-spacing:.1em">RECOM.</span>' : ''}</td>
        <td>${fmtBR(ml, 0)} mL</td>
        <td>${fmtBR(tempo, 0)} s</td>
      </tr>
    `;
  }).join('');
}

// ============ DRYBACK PRECISA ============
function recalcDB() {
  const volume = parseFloat(document.getElementById('db-volume').value) || 0;
  const wc     = parseFloat(document.getElementById('db-wc').value) || 0;
  const pmax   = parseFloat(document.getElementById('db-pmax').value) || 0;
  const pmin   = parseFloat(document.getElementById('db-pmin').value) || 0;

  const aguaIni = volume * (wc / 100);                    // L
  const perdida = pmax - pmin;                             // kg ≈ L
  const aguaFinal = aguaIni - perdida;
  const dryback = aguaIni > 0 ? (perdida / aguaIni) * 100 : 0;

  document.getElementById('db-out-aguaIni').innerHTML = `${fmtBR(aguaIni, 2)}<span class="unit">L</span>`;
  document.getElementById('db-out-perdida').innerHTML = `${fmtBR(perdida, 2)}<span class="unit">L</span>`;
  document.getElementById('db-out-pct').innerHTML = `${fmtBR(dryback, 1)}<span class="unit">%</span>`;
  document.getElementById('db-out-estimulo').innerHTML = estimuloLabel(dryback);
}

// ============ DRYBACK SIMPLES ============
function recalcDBS() {
  const pseco = parseFloat(document.getElementById('dbs-pseco').value) || 0;
  const pmax  = parseFloat(document.getElementById('dbs-pmax').value) || 0;
  const pmin  = parseFloat(document.getElementById('dbs-pmin').value) || 0;

  const retida = pmax - pseco;
  const perdida = pmax - pmin;
  const dryback = retida > 0 ? (perdida / retida) * 100 : 0;

  document.getElementById('dbs-out-retida').innerHTML = `${fmtBR(retida, 0)}<span class="unit">g</span>`;
  document.getElementById('dbs-out-perdida').innerHTML = `${fmtBR(perdida, 0)}<span class="unit">g</span>`;
  document.getElementById('dbs-out-pct').innerHTML = `${fmtBR(dryback, 1)}<span class="unit">%</span>`;
  document.getElementById('dbs-out-estimulo').innerHTML = estimuloLabel(dryback);
}

function estimuloLabel(db) {
  if (db < 5) return 'Estímulo: <strong>excessivamente vega</strong> (rever)';
  if (db <= 15) return 'Estímulo: <strong>vegetativo</strong>';
  if (db <= 30) return 'Estímulo: <strong>bulking</strong> (engorda)';
  if (db <= 50) return 'Estímulo: <strong>generativo</strong> (floração)';
  return 'Estímulo: <strong>excessivo</strong> (planta sob estresse)';
}

// ============ TABS ============
function setupTabs() {
  document.querySelectorAll('.calc-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.calc-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-tab-content]').forEach(c => {
        c.style.display = c.dataset.tabContent === tab ? '' : 'none';
      });
    });
  });
}

export function initCalcRega() {
  // FC
  ['fc-substrato', 'fc-aplicada', 'fc-runoff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcFC);
  });
  // SS
  ['ss-volume', 'ss-vazao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcSS);
  });
  // DB precisa
  ['db-volume', 'db-wc', 'db-pmax', 'db-pmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcDB);
  });
  // DB simples
  ['dbs-pseco', 'dbs-pmax', 'dbs-pmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcDBS);
  });

  setupTabs();
  recalcFC();
  recalcSS();
  recalcDB();
  recalcDBS();
}
