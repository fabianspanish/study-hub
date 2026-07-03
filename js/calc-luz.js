// =============================================================
// CALCULADORA DE LUZ
// Reproduz a planilha calculo-luz-ambiente1.xlsx (Cultlight)
// Constantes do Database Custos Totais (sheet)
// =============================================================

// Custos por m² (referência: quarto de 12m² = R$44.200 total, R$3.683/m²)
const CUSTO = {
  infra:   1866.67,   // R$/m² infraestrutura
  cultivo:  150.00,   // R$/m² cultivo (fertilizantes, substrato, vasos por 1 ano)
  ilumin:  1666.67,   // R$/m² iluminação (painéis)
};

// Parâmetros operacionais (do sheet)
const OP = {
  desumid_pct_dia: 0.30,   // desumidificador % do dia ligado (proporcional à luz)
  ar_pct_ilumin:   0.42,   // AC parametrizado em % da potência iluminação
  horas_luz_dia:   12,     // floração 12/12 — pior caso
  dias_mes:        30,
};

function fmtBR(n) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
}
function fmtBR2(n) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtMoney(n) {
  return 'R$ ' + fmtBR(n);
}

function recalcular() {
  const area      = parseFloat(document.getElementById('cl-area').value) || 0;
  const tarifa    = parseFloat(document.getElementById('cl-tarifa').value) || 1.10;
  const wattsM2   = parseFloat(document.getElementById('cl-watts').value) || 267;
  const gPorWatt  = parseFloat(document.getElementById('cl-rendimento').value) || 1.0;

  // Potência total
  const potencia = area * wattsM2;

  // Colheita
  const colhMin = potencia * gPorWatt;
  const colhMax = potencia * (gPorWatt * 1.5);

  // Custos
  const custoInfra   = area * CUSTO.infra;
  const custoIlumin  = area * CUSTO.ilumin;
  const custoCultivo = area * CUSTO.cultivo;
  const custoTotal   = custoInfra + custoIlumin + custoCultivo;

  // Conta de luz
  // Iluminação: potencia (W) × horas/dia × 30 dias × tarifa / 1000 (kWh)
  const kwhIluminMes = (potencia * OP.horas_luz_dia * OP.dias_mes) / 1000;
  const contaIlumin  = kwhIluminMes * tarifa;

  // AC: 42% da potência da iluminação, mesmas horas
  const potenciaAC = potencia * OP.ar_pct_ilumin;
  const contaAC = (potenciaAC * OP.horas_luz_dia * OP.dias_mes / 1000) * tarifa;

  // Desumidificador: estimativa baseada na planilha (% sobre conta de iluminação)
  // sheet usa 0.30 × 0.15 (uma das parametrizações empíricas). Mantemos.
  const contaDesumid = contaIlumin * OP.desumid_pct_dia * 0.5;
  // Conta total
  const contaTotal = contaIlumin + contaAC + contaDesumid;

  // ============ ATUALIZA OUTPUTS ============
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerHTML = txt; };

  set('cl-out-potencia', `${fmtBR(potencia)}<span class="unit">W</span>`);
  set('cl-out-colhmin', `${fmtBR(colhMin)}<span class="unit">g</span>`);
  set('cl-out-colhmin-kg', `~${fmtBR2(colhMin/1000)} kg por ciclo`);
  set('cl-out-colhmax', `${fmtBR(colhMax)}<span class="unit">g</span>`);
  set('cl-out-colhmax-kg', `~${fmtBR2(colhMax/1000)} kg por ciclo`);

  set('cl-out-infra', `${fmtBR(custoInfra)}<span class="unit">R$</span>`);
  set('cl-out-ilum', `${fmtBR(custoIlumin)}<span class="unit">R$</span>`);
  set('cl-out-cultivo', `${fmtBR(custoCultivo)}<span class="unit">R$</span>`);
  set('cl-out-total', `${fmtBR(custoTotal)}<span class="unit">R$</span>`);

  set('cl-out-luz-ilum', fmtMoney(contaIlumin));
  set('cl-out-luz-total', fmtMoney(contaTotal));
}

export function initCalcLuz() {
  ['cl-area', 'cl-tarifa', 'cl-watts', 'cl-rendimento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcular);
  });
  recalcular();
}
