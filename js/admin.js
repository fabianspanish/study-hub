// =============================================================
// ADMIN · Gerenciamento de allowlist e usuários
// =============================================================

import {
  isAdmin, addToAllowlist, removeFromAllowlist,
  listAllowlist, listUsers,
  validateEmail,
} from './auth.js';

function showMessage(type, text) {
  const slot = document.getElementById('admin-message-slot');
  if (!slot) return;
  slot.innerHTML = '';
  const div = document.createElement('div');
  div.className = `login-message ${type}`;
  div.textContent = text;
  slot.appendChild(div);
  setTimeout(() => { if (slot.contains(div)) div.remove(); }, 6000);
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

async function renderAllowlist() {
  const wrapper = document.getElementById('allowlist-table-wrapper');
  try {
    const list = await listAllowlist();
    document.getElementById('admin-allowlist-count').textContent = list.length;

    if (list.length === 0) {
      wrapper.innerHTML = '<p style="color:var(--clay);font-style:italic">Nenhum email na allowlist ainda. Adicione acima.</p>';
      return;
    }

    // Constrói tabela usando textContent (não innerHTML com dados de usuário, defesa XSS)
    wrapper.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Email</th>
          <th>Adicionado em</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="allowlist-tbody"></tbody>
    `;
    wrapper.appendChild(table);
    const tbody = table.querySelector('tbody');

    for (const item of list) {
      const tr = document.createElement('tr');
      const tdEmail = document.createElement('td');
      tdEmail.textContent = item.email;
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(item.addedAt);
      const tdStatus = document.createElement('td');
      tdStatus.innerHTML = item.active
        ? '<span style="color:#5a7d4a">✓ Ativo</span>'
        : '<span style="color:#a93b3b">Inativo</span>';
      const tdAction = document.createElement('td');
      tdAction.style.textAlign = 'right';
      const btnRemove = document.createElement('button');
      btnRemove.className = 'admin-action';
      btnRemove.textContent = 'Remover';
      btnRemove.dataset.email = item.email;
      tdAction.appendChild(btnRemove);

      tr.appendChild(tdEmail);
      tr.appendChild(tdDate);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    }

    // Click handlers (event delegation)
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.admin-action');
      if (!btn) return;
      const email = btn.dataset.email;
      if (!email) return;
      if (!confirm(`Remover ${email} da allowlist? Eles não conseguirão mais se cadastrar.`)) return;
      btn.disabled = true;
      try {
        await removeFromAllowlist(email);
        showMessage('success', `${email} removido.`);
        await renderAllowlist();
      } catch (err) {
        showMessage('error', err.message || 'Erro ao remover.');
        btn.disabled = false;
      }
    });

  } catch (err) {
    console.error(err);
    wrapper.innerHTML = `<p style="color:#a93b3b">Erro ao carregar allowlist: ${err.message}</p>`;
  }
}

async function renderUsers() {
  const wrapper = document.getElementById('users-table-wrapper');
  try {
    const users = await listUsers();
    document.getElementById('admin-users-count').textContent = users.length;

    if (users.length === 0) {
      wrapper.innerHTML = '<p style="color:var(--clay);font-style:italic">Nenhum usuário cadastrado ainda.</p>';
      return;
    }

    wrapper.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Telefone</th>
          <th>Papel</th>
          <th>Desde</th>
          <th>Último login</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    wrapper.appendChild(table);
    const tbody = table.querySelector('tbody');

    // Ordena: admin primeiro, depois por nome
    users.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    for (const u of users) {
      const tr = document.createElement('tr');
      const cells = [
        u.name || '—',
        u.email || '—',
        u.phone || '—',
      ];
      cells.forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      // role com pill
      const tdRole = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = `role-pill ${u.role || 'member'}`;
      pill.textContent = u.role || 'member';
      tdRole.appendChild(pill);
      tr.appendChild(tdRole);
      // datas
      const tdCreated = document.createElement('td');
      tdCreated.textContent = formatDate(u.createdAt);
      tr.appendChild(tdCreated);
      const tdLast = document.createElement('td');
      tdLast.textContent = formatDate(u.lastLogin);
      tr.appendChild(tdLast);

      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error(err);
    wrapper.innerHTML = `<p style="color:#a93b3b">Erro ao carregar usuários: ${err.message}</p>`;
  }
}

async function handleAddAllowlist(e) {
  e.preventDefault();
  const input = document.getElementById('allowlist-email');
  const email = input.value.trim();
  if (!validateEmail(email)) {
    showMessage('error', 'Email inválido.');
    return;
  }
  const btn = document.getElementById('allowlist-add-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="login-loading"></span>Adicionando...';
  try {
    await addToAllowlist(email);
    input.value = '';
    showMessage('success', `${email} adicionado à allowlist.`);
    await renderAllowlist();
  } catch (err) {
    showMessage('error', err.message || 'Erro ao adicionar.');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Adicionar';
  }
}

export function initAdmin() {
  if (!isAdmin()) {
    document.getElementById('page').innerHTML = `
      <div style="max-width:600px;margin:80px auto;padding:40px;background:var(--paper);border-radius:6px;border-left:4px solid #a93b3b">
        <h2 style="font-family:'Fraunces',serif;color:var(--cert-dark, #1a1612)">Acesso negado</h2>
        <p style="color:var(--clay);margin-top:10px">Você não tem permissão para acessar esta página.</p>
        <p style="margin-top:14px"><a href="#/home" style="color:var(--amber)">← Voltar para o início</a></p>
      </div>
    `;
    return;
  }

  document.getElementById('admin-status').textContent = 'Você é admin';

  document.getElementById('allowlist-add-form').addEventListener('submit', handleAddAllowlist);

  renderAllowlist();
  renderUsers();
}
