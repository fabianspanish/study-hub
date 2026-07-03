// =============================================================
// QUIZ ENGINE · AZ-900
// Modos: study (resposta imediata) / exam (60q, 65min, score final)
// Persistência: progresso em localStorage
// =============================================================

import { loadI18n, mountLangSelector, t, getLang } from './i18n.js';

const STORAGE_PROGRESS = 'study-hub-az900-progress';
const EXAM_QUESTIONS = 60;
const EXAM_DURATION_MS = 65 * 60 * 1000; // 65 minutos
const PASSING_PCT = 70;

let allQuestions = [];
let currentSet = [];      // questões da sessão atual
let currentIdx = 0;
let mode = 'study';
let filter = 'all';
let answers = {};         // { qid: { selected: [], correct: bool } }
let examStartTime = null;
let examEndTime = null;
let timerInterval = null;
let progress = loadProgress();

// ============ STORAGE ============

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS);
    if (!raw) return { answered: {}, correct: 0, total_attempts: 0 };
    return JSON.parse(raw);
  } catch {
    return { answered: {}, correct: 0, total_attempts: 0 };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.warn('Falha ao salvar progresso:', e);
  }
}

// ============ UTILS ============

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((v, i) => v === bSorted[i]);
}

function getQuestionText(q) {
  return getLang() === 'en' ? q.question_en : q.question_pt;
}
function getOptions(q) {
  return getLang() === 'en' ? q.options_en : q.options_pt;
}
function getExplanation(q) {
  return getLang() === 'en' ? q.explanation_en : q.explanation_pt;
}

// ============ UI · STATS ============

function refreshStats() {
  const totalAnswered = Object.keys(progress.answered).length;
  const correctCount = Object.values(progress.answered).filter(a => a.correct).length;
  const rate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : null;

  const elTotal = document.getElementById('stat-total');
  const elAnswered = document.getElementById('stat-answered');
  const elCorrect = document.getElementById('stat-correct');
  const elRate = document.getElementById('stat-rate');

  if (elTotal) elTotal.textContent = allQuestions.length;
  if (elAnswered) elAnswered.textContent = totalAnswered;
  if (elCorrect) elCorrect.textContent = correctCount;
  if (elRate) {
    elRate.innerHTML = rate === null ? '—<span class="pct">%</span>' : `${rate}<span class="pct">%</span>`;
  }
}

function updateFilterCount() {
  const filtered = filter === 'all' ? allQuestions : allQuestions.filter(q => q.domain === filter);
  const el = document.getElementById('quiz-filter-count');
  if (el) el.textContent = filtered.length;
}

// ============ UI · QUESTION RENDER ============

function renderQuestion() {
  const q = currentSet[currentIdx];
  if (!q) return;

  const isMulti = q.type === 'multi';
  const isTF = q.type === 'tf';
  const options = getOptions(q);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const domainPillText = t(`quiz.domain_pill_${q.domain}`, q.domain.toUpperCase());
  const hint = isMulti ? t('quiz.select_multiple', 'Select all correct.')
              : t('quiz.select_one', 'Select the best option.');

  const optionsHTML = options.map((opt, i) => `
    <label class="quiz-option" data-idx="${i}">
      <input type="${isMulti ? 'checkbox' : 'radio'}" name="opt-${q.id}" value="${i}">
      <span class="quiz-option-letter">${isTF ? '' : letters[i] + '.'}</span>
      <span class="quiz-option-text">${opt}</span>
    </label>
  `).join('');

  const card = document.getElementById('quiz-question-card');
  card.innerHTML = `
    <div class="quiz-q-meta">
      <span class="quiz-q-domain ${q.domain}">${domainPillText}</span>
      <span class="quiz-q-hint">${hint}</span>
    </div>
    <div class="quiz-q-text">${getQuestionText(q)}</div>
    <div class="quiz-options" id="quiz-options-list">${optionsHTML}</div>
    <div id="quiz-feedback-slot"></div>
  `;

  // Click handlers
  card.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      if (opt.classList.contains('locked')) return;
      const input = opt.querySelector('input');
      if (e.target !== input) input.checked = !input.checked || isMulti;
      // Atualiza estilo selected
      card.querySelectorAll('.quiz-option').forEach(o => {
        const inp = o.querySelector('input');
        o.classList.toggle('selected', inp.checked);
      });
    });
  });

  // Progress
  const progressText = document.getElementById('quiz-progress-text');
  const progressFill = document.getElementById('quiz-progress-fill');
  if (progressText) progressText.textContent = `${currentIdx + 1} / ${currentSet.length}`;
  if (progressFill) progressFill.style.width = `${((currentIdx + 1) / currentSet.length) * 100}%`;

  renderActions();
}

function renderActions() {
  const actions = document.getElementById('quiz-actions');
  if (!actions) return;

  const isLast = currentIdx === currentSet.length - 1;
  const checkLabel = t('quiz.check', 'Verificar');
  const nextLabel = t('quiz.next', 'Próxima');
  const finishLabel = t('quiz.finish', 'Finalizar');

  if (mode === 'study') {
    actions.innerHTML = `
      <button class="quiz-btn quiz-btn-primary" id="btn-check">${checkLabel}</button>
    `;
    document.getElementById('btn-check').addEventListener('click', checkAnswer);
  } else {
    actions.innerHTML = `
      <button class="quiz-btn quiz-btn-primary" id="btn-next">
        ${isLast ? finishLabel : nextLabel}
      </button>
    `;
    document.getElementById('btn-next').addEventListener('click', () => {
      // No modo exam, registra a resposta selecionada e avança
      recordAnswer();
      if (isLast) {
        finishExam();
      } else {
        currentIdx++;
        renderQuestion();
      }
    });
  }
}

// ============ CHECK ANSWER (study mode) ============

function getSelectedIndices() {
  const inputs = document.querySelectorAll('#quiz-options-list input');
  const selected = [];
  inputs.forEach((inp, i) => { if (inp.checked) selected.push(i); });
  return selected;
}

function checkAnswer() {
  const q = currentSet[currentIdx];
  const selected = getSelectedIndices();
  if (selected.length === 0) return; // não selecionou nada

  const isCorrect = arraysEqual(selected, q.correct);

  // Atualiza progresso global
  progress.answered[q.id] = { selected, correct: isCorrect };
  progress.total_attempts++;
  saveProgress();

  // Trava opções e marca correctas/incorretas
  const card = document.getElementById('quiz-question-card');
  card.querySelectorAll('.quiz-option').forEach((opt, i) => {
    opt.classList.add('locked');
    if (q.correct.includes(i)) opt.classList.add('correct');
    else if (selected.includes(i)) opt.classList.add('incorrect');
  });

  // Renderiza feedback
  const slot = document.getElementById('quiz-feedback-slot');
  const refLink = q.reference
    ? `<div class="quiz-feedback-ref"><a href="${q.reference}" target="_blank" rel="noopener">${t('quiz.reference', 'Referência')} →</a></div>`
    : '';

  slot.innerHTML = `
    <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
      <div class="quiz-feedback-title">${isCorrect ? t('quiz.correct', 'Correto!') : t('quiz.incorrect', 'Incorreto.')}</div>
      <div class="quiz-feedback-text">${getExplanation(q)}</div>
      ${refLink}
    </div>
  `;

  // Substitui "check" por "next"
  const actions = document.getElementById('quiz-actions');
  const isLast = currentIdx === currentSet.length - 1;
  const nextLabel = isLast ? t('quiz.restart', 'Reiniciar') : t('quiz.next', 'Próxima');
  actions.innerHTML = `<button class="quiz-btn quiz-btn-primary" id="btn-next">${nextLabel}</button>`;
  document.getElementById('btn-next').addEventListener('click', () => {
    if (isLast) {
      // No modo estudo, ao final volta para a tela inicial
      backToSetup();
    } else {
      currentIdx++;
      renderQuestion();
    }
  });

  refreshStats();
}

// ============ EXAM MODE ============

function recordAnswer() {
  const q = currentSet[currentIdx];
  const selected = getSelectedIndices();
  answers[q.id] = {
    selected,
    correct: arraysEqual(selected, q.correct),
    question: q
  };
}

function startTimer() {
  examStartTime = Date.now();
  examEndTime = examStartTime + EXAM_DURATION_MS;
  const timerEl = document.getElementById('quiz-timer');
  if (timerEl) timerEl.style.display = 'inline';

  timerInterval = setInterval(() => {
    const remaining = examEndTime - Date.now();
    if (remaining <= 0) {
      clearInterval(timerInterval);
      finishExam();
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    if (timerEl) {
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerEl.classList.toggle('warning', remaining < 5 * 60 * 1000);
    }
  }, 1000);
}

function finishExam() {
  // Garante registro da última pergunta
  if (currentSet[currentIdx] && !answers[currentSet[currentIdx].id]) {
    recordAnswer();
  }
  if (timerInterval) clearInterval(timerInterval);

  // Calcula score
  const total = currentSet.length;
  const correctCount = Object.values(answers).filter(a => a.correct).length;
  const pct = Math.round((correctCount / total) * 100);
  const passed = pct >= PASSING_PCT;

  // Por domínio
  const byDomain = { d1: { total: 0, correct: 0 }, d2: { total: 0, correct: 0 }, d3: { total: 0, correct: 0 } };
  Object.values(answers).forEach(a => {
    byDomain[a.question.domain].total++;
    if (a.correct) byDomain[a.question.domain].correct++;
  });

  // Salva no progresso global
  Object.entries(answers).forEach(([qid, a]) => {
    progress.answered[qid] = { selected: a.selected, correct: a.correct };
  });
  progress.total_attempts += total;
  saveProgress();

  // Tempo usado
  const elapsedMs = Date.now() - examStartTime;
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
  const elapsedTxt = `${elapsedMin}m ${elapsedSec}s`;

  // Render results
  document.getElementById('quiz-active').style.display = 'none';
  const resultsEl = document.getElementById('quiz-results');
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `
    <div class="quiz-results-hero">
      <div class="quiz-results-detail">${t('quiz.results_score', 'Pontuação')}</div>
      <div class="quiz-results-score ${passed ? 'pass' : 'fail'}">${pct}%</div>
      <div class="quiz-results-detail">
        ${t('quiz.results_correct', 'Você acertou')} <strong>${correctCount}</strong>
        ${t('quiz.results_of', 'de')} <strong>${total}</strong> ${t('quiz.results_questions', 'questões')}
      </div>
      <div class="quiz-results-verdict">
        ${passed ? t('quiz.results_pass', 'Aprovado (≥ 70%)') : t('quiz.results_fail', 'Ainda não está pronto.')}
      </div>
      <div class="quiz-results-detail" style="margin-top:14px">
        ${t('quiz.results_time', 'Tempo usado')}: <strong>${elapsedTxt}</strong>
      </div>
    </div>

    <div class="quiz-panel">
      <div class="quiz-panel-title">${t('quiz.results_by_domain', 'Acertos por domínio')}</div>
      <div class="quiz-results-by-domain">
        <div class="quiz-domain-card d1">
          <div class="quiz-domain-card-title">D1 · ${t('quiz.filter_d1', 'Conceitos').replace('Domínio 1 · ', '').replace('Domain 1 · ', '')}</div>
          <div class="quiz-domain-card-value">${byDomain.d1.correct}/${byDomain.d1.total}</div>
        </div>
        <div class="quiz-domain-card d2">
          <div class="quiz-domain-card-title">D2 · ${t('quiz.filter_d2', 'Arquitetura').replace('Domínio 2 · ', '').replace('Domain 2 · ', '')}</div>
          <div class="quiz-domain-card-value">${byDomain.d2.correct}/${byDomain.d2.total}</div>
        </div>
        <div class="quiz-domain-card d3">
          <div class="quiz-domain-card-title">D3 · ${t('quiz.filter_d3', 'Governança').replace('Domínio 3 · ', '').replace('Domain 3 · ', '')}</div>
          <div class="quiz-domain-card-value">${byDomain.d3.correct}/${byDomain.d3.total}</div>
        </div>
      </div>

      <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap">
        <button class="quiz-btn quiz-btn-secondary" id="btn-back-setup">${t('quiz.restart', 'Voltar')}</button>
        <button class="quiz-btn quiz-btn-primary" id="btn-retry">${t('quiz.results_retry', 'Tentar novamente')}</button>
      </div>
    </div>
  `;

  document.getElementById('btn-back-setup').addEventListener('click', backToSetup);
  document.getElementById('btn-retry').addEventListener('click', () => {
    backToSetup();
    setTimeout(startQuiz, 100);
  });
}

// ============ FLOW ============

function startQuiz() {
  // Lê seleção
  const modeInput = document.querySelector('input[name="quiz-mode"]:checked');
  mode = modeInput ? modeInput.value : 'study';
  const filterSel = document.getElementById('quiz-filter');
  filter = filterSel ? filterSel.value : 'all';

  // Filtra e embaralha
  let pool = filter === 'all' ? allQuestions : allQuestions.filter(q => q.domain === filter);
  if (pool.length === 0) {
    alert(t('quiz.no_questions', 'Sem questões para o filtro.'));
    return;
  }

  pool = shuffle(pool);

  if (mode === 'exam') {
    // 60 questões respeitando proporção
    currentSet = pool.slice(0, Math.min(EXAM_QUESTIONS, pool.length));
  } else {
    currentSet = pool;
  }

  currentIdx = 0;
  answers = {};

  // Troca telas
  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-active').style.display = 'block';
  document.getElementById('quiz-results').style.display = 'none';

  if (mode === 'exam') {
    startTimer();
  } else {
    document.getElementById('quiz-timer').style.display = 'none';
  }

  renderQuestion();
}

function backToSetup() {
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById('quiz-setup').style.display = 'block';
  document.getElementById('quiz-active').style.display = 'none';
  document.getElementById('quiz-results').style.display = 'none';
  refreshStats();
  updateFilterCount();
}

// ============ INIT ============

export async function initQuiz() {
  // Carrega idioma + seletor
  await loadI18n('az900');
  const mount = document.getElementById('quiz-lang-mount');
  if (mount) {
    mountLangSelector(mount, 'az900', () => {
      // Se está numa questão, re-renderiza
      const active = document.getElementById('quiz-active');
      if (active && active.style.display !== 'none' && currentSet[currentIdx]) {
        renderQuestion();
      }
      refreshStats();
      updateFilterCount();
    });
  }

  // Carrega questões
  try {
    const res = await fetch('data/az900-questions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allQuestions = data.questions || [];
  } catch (err) {
    console.error('Falha ao carregar banco de questões:', err);
    allQuestions = [];
  }

  refreshStats();
  updateFilterCount();

  // Eventos
  document.getElementById('quiz-start')?.addEventListener('click', startQuiz);
  document.getElementById('quiz-filter')?.addEventListener('change', updateFilterCount);

  // Radios visualmente refletindo seleção
  document.querySelectorAll('input[name="quiz-mode"]').forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('.quiz-radio').forEach(label => {
        const inp = label.querySelector('input');
        label.classList.toggle('checked', inp && inp.checked);
      });
    });
  });
  // Estado inicial
  document.querySelectorAll('.quiz-radio').forEach(label => {
    const inp = label.querySelector('input');
    label.classList.toggle('checked', inp && inp.checked);
  });
}
