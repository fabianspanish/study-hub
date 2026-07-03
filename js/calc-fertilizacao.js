// =============================================================
// CALCULADORA DE FERTILIZAÇÃO
// Reproduz a planilha calculadora-fertilizacao-receita1.xlsx
// 5 receitas (Vega, VegaPP, Flora 1-3, Flora 4-7, Finalização)
// Ajuste automático por EC desejada e volume de preparo
// =============================================================

// Receitas no formato base, com EC referência da planilha
// (g/L é a dosagem original; EC_base é o que essa dosagem produz)
const RECIPES = {
  vega: {
    label: 'Vegetativo · @kromafarms',
    ec_base: 2.491,
    npkcamg: { N: 258, P: 54, K: 261, Ca: 263, Mg: 72 },
    items: [
      { ord: 1, name: 'Nitrato de Cálcio CalPrime', brand: 'Haifa',         gL: 1.12 },
      { ord: 2, name: 'Nitrato de Potássio',         brand: 'Yara Krista K', gL: 0.50 },
      { ord: 3, name: 'MKP (Fosfato Mono K)',        brand: 'Haifa',         gL: 0.24 },
      { ord: 4, name: 'Sulfato de Magnésio',         brand: 'Multinutrientes', gL: 0.80 },
      { ord: 5, name: 'Micronutrientes',             brand: 'Rigrantec Micromix', gL: 0.06 },
    ],
  },
  vegaPP: {
    label: 'Vegetativo · alternativa Plant Prod',
    ec_base: 2.198,
    npkcamg: { N: 218, P: 55, K: 257, Ca: 264, Mg: 43 },
    items: [
      { ord: 1, name: 'Nitrato de Cálcio CalPrime', brand: 'Haifa',         gL: 0.80 },
      { ord: 2, name: 'Plant Prod 7-11-27',          brand: 'Plant Prod',     gL: 1.15 },
      { ord: 3, name: 'Micronutrientes',             brand: 'Rigrantec Micromix', gL: 0.24 },
    ],
  },
  flora13: {
    label: 'Flora 1–3 sem (Stretch) · @kromafarms',
    ec_base: 2.672,
    // composição calculada da planilha
    npkcamg: { N: 256, P: 123, K: 362, Ca: 263, Mg: 78 },
    items: [
      { ord: 1, name: 'Nitrato de Cálcio',         brand: 'Haifa',         gL: 1.12 },
      { ord: 2, name: 'Nitrato de Potássio',       brand: 'Yara Krista K', gL: 0.50 },
      { ord: 3, name: 'MKP (Fosfato Mono K)',      brand: 'Haifa',         gL: 0.50 },
      { ord: 4, name: 'Sulfato de Magnésio',       brand: 'Multinutrientes', gL: 0.80 },
      { ord: 5, name: 'Micronutrientes',           brand: 'Rigrantec Micromix', gL: 0.06 },
    ],
  },
  flora47: {
    label: 'Flora 4–7 sem (Bulking) · @kromafarms',
    ec_base: 2.278,
    npkcamg: { N: 185, P: 123, K: 362, Ca: 164, Mg: 79 },
    items: [
      { ord: 1, name: 'Nitrato de Cálcio',         brand: 'Haifa',         gL: 0.70 },
      { ord: 2, name: 'Nitrato de Potássio',       brand: 'Yara Krista K', gL: 0.50 },
      { ord: 3, name: 'MKP (Fosfato Mono K)',      brand: 'Haifa',         gL: 0.50 },
      { ord: 4, name: 'Sulfato de Magnésio',       brand: 'Multinutrientes', gL: 0.80 },
      { ord: 5, name: 'Micronutrientes',           brand: 'Rigrantec Micromix', gL: 0.06 },
    ],
  },
  final: {
    label: 'Finalização · últimas 2 sem · @kromafarms',
    ec_base: 2.001,
    npkcamg: { N: 100, P: 123, K: 355, Ca: 164, Mg: 79 },
    items: [
      { ord: 1, name: 'Nitrato de Cálcio',         brand: 'Haifa Cal Prime',  gL: 0.15 },
      { ord: 2, name: 'Óxido de Cálcio',            brand: 'Cálcio GreenPlus', gL: 0.45 },
      { ord: 3, name: 'Nitrato de Potássio',        brand: 'Yara Krista K',    gL: 0.55 },
      { ord: 4, name: 'MKP (Fosfato Mono K)',       brand: 'Haifa',            gL: 0.55 },
      { ord: 5, name: 'Sulfato de Magnésio',        brand: 'Multinutrientes',  gL: 0.80 },
      { ord: 6, name: 'Micronutrientes',            brand: 'Rigrantec Micromix', gL: 0.06 },
    ],
  },
};

let currentRecipe = 'vega';

const fmtBR = (n, dec = 2) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: dec, maximumFractionDigits: dec
}).format(n);

function recalcular() {
  const recipe = RECIPES[currentRecipe];
  const ecAlvo = parseFloat(document.getElementById('cf-ec').value) || 0;
  const volume = parseFloat(document.getElementById('cf-volume').value) || 0;

  // Fator de proporção: ajustamos as dosagens linearmente para atingir o EC alvo
  const fator = recipe.ec_base > 0 ? ecAlvo / recipe.ec_base : 1;

  // Atualiza tabela
  const tbody = document.getElementById('cf-table');
  if (tbody) {
    tbody.innerHTML = recipe.items.map(it => {
      const gL = it.gL * fator;
      const total = gL * volume;
      return `
        <tr>
          <td><strong>${it.ord}</strong></td>
          <td>${it.name}</td>
          <td><span style="color:var(--clay)">${it.brand}</span></td>
          <td>${fmtBR(gL, 4)}</td>
          <td><strong style="color:var(--rust)">${fmtBR(total, 2)} g</strong></td>
        </tr>
      `;
    }).join('');
  }

  // Outputs
  const ppm = ecAlvo * 500;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerHTML = txt; };

  set('cf-out-ppm', `${fmtBR(ppm, 0)}<span class="unit">ppm</span>`);
  set('cf-out-ec', `${fmtBR(ecAlvo, 2)}<span class="unit">mS/cm</span>`);
  set('cf-out-eccheck', `${fmtBR(ecAlvo, 2)}<span class="unit">mS/cm</span>`);
  set('cf-out-recipe-label', `Receita: <strong>${recipe.label}</strong>`);
  set('cf-ec-base', `EC base da receita: ${fmtBR(recipe.ec_base, 3)} mS/cm. Ajustando proporcionalmente.`);

  // NPK ajustado pelo fator
  const npk = recipe.npkcamg;
  set('cf-out-n',  `${fmtBR(npk.N * fator, 0)}<span class="unit">ppm</span>`);
  set('cf-out-p',  `${fmtBR(npk.P * fator, 0)}<span class="unit">ppm</span>`);
  set('cf-out-k',  `${fmtBR(npk.K * fator, 0)}<span class="unit">ppm</span>`);
  set('cf-out-ca', `${fmtBR(npk.Ca * fator, 0)}<span class="unit">ppm</span>`);
  set('cf-out-mg', `${fmtBR(npk.Mg * fator, 0)}<span class="unit">ppm</span>`);
}

export function initCalcFert() {
  // Pills de receita
  document.querySelectorAll('#cf-pills button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cf-pills button').forEach(b => b.classList.toggle('active', b === btn));
      currentRecipe = btn.dataset.recipe;
      recalcular();
    });
  });

  // Inputs
  ['cf-ec', 'cf-volume'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcular);
  });

  recalcular();
}
