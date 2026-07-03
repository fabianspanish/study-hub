# Study Hub

Hub pessoal de estudos: certificações Microsoft, cultivo indoor mineral (básico e avançado), diário de cultivo e calculadoras profissionais. Com login privado e CRUD de usuários.

Estrutura modular, fácil de expandir. Sem build step, sem framework — HTML + CSS + JS puro.

---

## Estrutura

```
projeto/
├── index.html                     ← Shell (boot splash + header oculto até login)
├── FIREBASE-SETUP.md              ← Passo a passo de configuração Firebase
├── firestore.rules                ← Regras de segurança (colar no console)
├── storage.rules                  ← Regras do Storage (colar no console)
├── css/
│   ├── global.css                 ← Variáveis, header, layout base
│   ├── login.css                  ← Tela de login + boot splash
│   ├── cert.css                   ← Certificações + home (paleta neutra)
│   ├── cultivo.css                ← Cultivo (paleta verde)
│   ├── calculadoras.css           ← As 3 calculadoras
│   └── diario.css                 ← CRUD do diário
├── i18n/                          ← Dicionários PT/EN
│   ├── az900-pt.json
│   └── az900-en.json
├── data/
│   └── az900-questions.json       ← 65 questões AZ-900
├── js/
│   ├── app.js                     ← ★ Orquestrador (auth + router)
│   ├── auth.js                    ← ★ Módulo de autenticação
│   ├── login.js                   ← Forms de login/cadastro/recovery
│   ├── perfil.js                  ← CRUD do próprio perfil
│   ├── admin.js                   ← Painel admin (allowlist + usuários)
│   ├── firebase-config.js         ← Config Firebase
│   ├── i18n.js                    ← Sistema de tradução PT/EN
│   ├── learn-links.js             ← Injetor de ícones Microsoft Learn
│   ├── quiz-az900.js              ← Motor do banco de questões
│   ├── diario.js                  ← CRUD do diário
│   ├── calc-luz.js
│   ├── calc-rega.js
│   └── calc-fertilizacao.js
├── pages/
│   ├── login.html                 ← Tela de login (primeira a abrir)
│   ├── perfil.html                ← Editar dados pessoais
│   ├── admin.html                 ← Painel admin
│   ├── home.html
│   ├── cert-az900.html
│   ├── cert-az900-quiz.html
│   ├── cultivo-mineral-basico.html
│   ├── cultivo-mineral-avancado.html
│   ├── diario.html
│   ├── calc-luz.html
│   ├── calc-rega.html
│   └── calc-fertilizacao.html
└── README.md
```

---

## ★ Autenticação e usuários (NOVO)

A primeira tela a aparecer é sempre a de **login**. O resto do app só carrega depois que o usuário se autentica.

### Modelo

- **Owner único** (você, `fabianspanish@gmail.com`) com role `admin`. Pode se cadastrar livremente na primeira vez.
- **Outros usuários** só conseguem cadastrar se você adicionar o email deles à **allowlist** (no menu Admin).
- **Métodos**: Email/senha (com senha forte exigida) ou login com Google.
- **Senha**: hasheada nos servidores Google (scrypt+sal). Nem o app nem o admin têm acesso.
- **CRUD do próprio perfil**: nome, telefone, foto. Foto sobe pro Firebase Storage.
- **Admin** (só você): listar/gerenciar allowlist + listar todos usuários.

### Documentação de setup

Veja **`FIREBASE-SETUP.md`** para o passo a passo completo de configuração no console do Firebase. Resumido:

1. Habilitar Email/Senha e Google em Authentication → Sign-in method
2. Colar `firestore.rules` em Firestore → Regras → Publicar
3. Ativar Storage e colar `storage.rules` → Publicar
4. Adicionar `seu-usuario.github.io` em Authentication → Settings → Authorized domains (quando publicar)
5. Abrir o site, ir em "Criar conta" e usar `fabianspanish@gmail.com`

---



## Passo a passo · Como rodar e configurar

### 1. Rodar localmente

Como o projeto usa `fetch()` e ES Modules, **não dá para abrir o `index.html` direto** pelo `file://` — o navegador bloqueia. Precisa de um servidor HTTP local.

**Opção mais simples — Python** (já vem no Linux/Mac, no Windows instale via [python.org](https://python.org)):

```bash
cd projeto
python3 -m http.server 8000
```

Abra no navegador: <http://localhost:8000>

Outras opções:

```bash
# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Ou no VS Code: extensão **Live Server** → clique direito no `index.html` → "Open with Live Server".

### 2. Testar todas as páginas

Use estas URLs para validar que tudo carrega:

| URL                                       | O que mostra                                |
| ----------------------------------------- | ------------------------------------------- |
| `http://localhost:8000/`                  | Home com 7 atalhos                          |
| `#/cert/az900`                            | AZ-900 Azure Fundamentals                   |
| `#/cultivo/mineral-basico`                | Resumo das apostilas 1–4 (Cultivo Básico)   |
| `#/cultivo/mineral-avancado`              | Curso Cultlight (119 pgs, 6 seções)         |
| `#/cultivo/diario`                        | CRUD do diário                              |
| `#/cultivo/calc/luz`                      | Calculadora de Luz                          |
| `#/cultivo/calc/rega`                     | Calculadora de Rega (FC, Shot, Dryback)     |
| `#/cultivo/calc/fertilizacao`             | Calculadora de Fertilização                 |

Para testar cada calculadora — basta mexer nos inputs e os resultados atualizam em tempo real (sem botão "calcular").

### 3. Configurar o Firebase (só para o diário sincronizar)

> **Sem Firebase configurado, o diário ainda funciona** — ele cai automaticamente no `localStorage` do navegador. Se quiser sincronizar entre dispositivos, siga abaixo.

#### 3.1 — Criar o projeto

1. Acesse <https://console.firebase.google.com>
2. **Adicionar projeto** → dê um nome (ex: `study-hub-pessoal`)
3. Pode **desabilitar Google Analytics** (não precisa) → criar projeto
4. Aguarde 30s. Pronto.

#### 3.2 — Registrar Web App

1. No painel do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido (ex: `study-hub-web`) → **Registrar app**
3. Vai aparecer um bloco com `firebaseConfig` parecido com isto:

```js
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "study-hub-pessoal.firebaseapp.com",
  projectId: "study-hub-pessoal",
  storageBucket: "study-hub-pessoal.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Copie esse objeto inteiro** — você vai colar no passo 3.5.

#### 3.3 — Criar o banco Firestore

1. Menu lateral: **Build → Firestore Database → Criar banco de dados**
2. Escolha o **modo de teste** (regras abertas por 30 dias — vamos refinar logo abaixo)
3. Região: **`southamerica-east1`** (São Paulo) — mais rápido para Brasil
4. Criar.

#### 3.4 — Habilitar Autenticação Anônima

1. Menu lateral: **Build → Authentication → Começar**
2. Aba **Sign-in method**
3. Clique em **Anônimo** → ativar → salvar

> Por que anônimo? O diário usa um UID único do navegador, sem precisar de login com email/senha. Se você abrir em outro dispositivo, vai criar outro UID — daí, se quiser ver os mesmos dados, troque pra Google sign-in depois.

#### 3.5 — Colar credenciais no projeto

Abra `js/firebase-config.js` e substitua o objeto `firebaseConfig` pelas suas credenciais:

```js
const firebaseConfig = {
  apiKey: "SEU_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

Salve. Recarregue a página. Abra o diário — agora ele salva no Firebase.

#### 3.6 — Regras de segurança (CRÍTICO)

No modo de teste, qualquer um pode ler e escrever no seu banco. Em **Firestore Database → Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/diary/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

**Publicar**. Agora cada usuário (UID) só acessa os próprios registros.

#### 3.7 — Autorizar domínios

Em **Authentication → Settings → Authorized domains**, adicione (se ainda não estiver):

- `localhost` (já vem por padrão)
- `seu-usuario.github.io` (se você for fazer deploy no GitHub Pages)

### 4. Deploy no GitHub Pages (opcional)

Para hospedar online de graça:

```bash
cd projeto
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

No GitHub:

1. **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `root` → Save
4. Aguarde 1–2 minutos. Acesse `https://seu-usuario.github.io/seu-repo/`

> ⚠️ **Por que hash routing?** O GitHub Pages não suporta rotas SPA com History API. Hash (`#/cert/az900`) resolve sem precisar de configuração.

### 5. Validar tudo (smoke test)

Lista de verificação rápida:

- [ ] **Home** carrega com 7 cards de atalho
- [ ] Menu **Cultivo** abre e mostra: Mineral Básico, Mineral Avançado, Diário, Calc Luz, Calc Rega, Calc Fertilização
- [ ] **Cultivo Básico** carrega (HTML preservado da apostila Cultlight)
- [ ] **Cultivo Avançado** mostra hero verde + 6 seções (Planejamento, Automação, Crop Steering, Genética, Vega/Flora, Pós-colheita)
- [ ] **Diário** abre o formulário; tente criar um registro
- [ ] **Calc Luz**: muda área de 12 para 16 — todos os números atualizam
- [ ] **Calc Rega**: aba "Fórmula simples" funciona; muda peso e dryback recalcula
- [ ] **Calc Fertilização**: clica em "Flora 1–3 sem (Stretch)" e a tabela muda valores (EC base 2,672)

Se Firebase configurado:

- [ ] Crie um registro no diário; F5 → ele continua lá (não é só localStorage)
- [ ] Abra o Firestore → verá `users/{seu-uid}/diary/{entryId}`

---



## Banco de questões AZ-900

A página da AZ-900 inclui um banco com **65 questões originais** em PT/EN, divididas por domínio na proporção do exame real:

- **Domínio 1** (Conceitos de nuvem) — 17 questões
- **Domínio 2** (Arquitetura e serviços) — 25 questões
- **Domínio 3** (Gerenciamento e governança) — 23 questões

Acesse em `#/cert/az900/quiz` ou clique no atalho "Banco de questões" no submenu Certificações.

### Modos de uso

- **Modo Estudo** — resposta imediata após cada questão, com explicação e link para a referência oficial Microsoft Learn. Sem timer.
- **Modo Simulado** — 60 questões, 65 minutos (como o exame real). Score só no final, com desempenho por domínio. Aprovação ≥ 70% (proxy do 700/1000 oficial).

### Filtros

Você pode filtrar por domínio antes de iniciar — ótimo pra revisar pontos fracos depois de uma rodada cheia.

### Idiomas

A página da AZ-900 e o banco de questões têm **seletor PT/EN** no canto superior direito. A preferência fica salva no `localStorage` (`study-hub-lang`). Os textos são carregados dos arquivos `i18n/az900-pt.json` e `i18n/az900-en.json`. As questões têm campos paralelos `question_pt`/`question_en`, `options_pt`/`options_en`, `explanation_pt`/`explanation_en`.

### Por que não usar dumps de exame

O banco foi construído **do zero** baseado no [skills outline oficial](https://learn.microsoft.com/pt-br/credentials/certifications/resources/study-guides/az-900) atualizado em 14 de janeiro de 2026, com referências para Microsoft Learn em cada questão. Não usamos questões vazadas de exames reais (que são copyright Microsoft + violam o NDA dos candidatos) — além de muitas questões em dumps virem com respostas erradas, decoradas e propagadas em sites pirata.

### Como adicionar mais questões

Edite `data/az900-questions.json`. Cada questão precisa dos campos:

```json
{
  "id": "d1-018",
  "domain": "d1",
  "topic": "service_types",
  "type": "single",
  "question_pt": "Pergunta em português com <strong>HTML</strong> permitido",
  "question_en": "Question in English with <strong>HTML</strong> allowed",
  "options_pt": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "options_en": ["Option A", "Option B", "Option C", "Option D"],
  "correct": [2],
  "explanation_pt": "Explicação em português...",
  "explanation_en": "Explanation in English...",
  "reference": "https://learn.microsoft.com/..."
}
```

Tipos: `single` (radio), `multi` (checkboxes), `tf` (true/false). O campo `correct` é sempre array de índices (0-based) — para `single`/`tf` tem 1 elemento, para `multi` pode ter vários.

## Como adicionar novas áreas

### Adicionar nova certificação (ex: AI-900)

1. Crie `pages/cert-ai900.html` copiando a estrutura de `cert-az900.html`
2. Registre em `js/router.js`:
   ```js
   const routes = {
     // ...
     '/cert/ai900': 'pages/cert-ai900.html',
   };
   ```
3. Adicione ao menu em `index.html`, dentro do `<ul class="submenu">` de Certificações:
   ```html
   <li><a href="#/cert/ai900">AI-900 · AI Fundamentals<small>Iniciante · IA</small></a></li>
   ```

### Adicionar nova calculadora

1. Crie `pages/calc-nova.html` (copie a estrutura de `pages/calc-luz.html`)
2. Crie `js/calc-nova.js` exportando `initCalcNova()`
3. Em `js/router.js`:
   ```js
   '/cultivo/calc/nova': 'pages/calc-nova.html',
   ```
   E em `pageInitializers`:
   ```js
   '/cultivo/calc/nova': async () => {
     const mod = await import('./calc-nova.js');
     mod.initCalcNova();
   },
   ```
4. Adicione no submenu de Cultivo no `index.html`

---

## Stack

- **HTML + CSS + JS puro** — sem build, sem dependências
- **ES Modules** com `<script type="module">` — código moderno
- **Hash routing** — funciona em qualquer servidor estático
- **Firebase Firestore + Auth Anônimo** — banco gratuito (1 GB)
- **GitHub Pages** — hospedagem gratuita
- **Tipografia**: Fraunces (serif) + JetBrains Mono + Inter

## Tema visual

- **Microsoft / Home / Certificações** — paleta neutra (carvão + bronze)
- **Cultivo / Calculadoras** — paleta verde (folha + âmbar)
- **Acent comum**: âmbar `#c8832a` em ambas — pontes visuais entre as áreas

---

## Solução de problemas

**A página fica em "Carregando" para sempre**
→ Você abriu o `index.html` direto pelo `file://`. Use um servidor (`python3 -m http.server 8000`).

**O diário não salva nada**
→ Sem Firebase configurado, salva em `localStorage` do navegador. Abra o DevTools → Application → Local Storage → `localhost:8000` → veja a chave `study-hub-diary`.

**O diário diz "salvando..." e nunca termina**
→ Firebase mal configurado. Console do navegador (F12) vai mostrar o erro. Verifique:
  - Credenciais corretas em `firebase-config.js`
  - Autenticação Anônima ativada
  - Regras do Firestore publicadas
  - Domínio autorizado em Authentication → Settings

**As calculadoras não recalculam**
→ Console do navegador (F12). Provavelmente um erro de sintaxe no JS. Os módulos são carregados sob demanda — só falham quando a rota é acessada.
