# Setup do Firebase — Passo a passo

Este documento explica **tudo que você precisa configurar no console do Firebase** para o login funcionar. As credenciais já estão preenchidas em `js/firebase-config.js`, então não precisa colar nada lá — só ativar as features no painel.

URL do seu console: <https://console.firebase.google.com/project/study-hub-pessoal/overview>

---

## 1. Authentication — habilitar métodos de login

1. No menu lateral, vá em **Build → Authentication**
2. Aba **Sign-in method**
3. Clique em **Email/Password** → ative o toggle "Habilitar" → **Salvar**
4. Clique em **Google** → ative o toggle "Habilitar"
   - **Email de suporte**: selecione `fabianspanish@gmail.com`
   - **Salvar**
5. **Desabilite** o método **Anônima** se estiver habilitado (não usamos mais — tudo passa por login)

### Pular verificação de email (opcional)

Por padrão, o Firebase manda um email de verificação ao criar conta. Você pode logar mesmo sem verificar, mas vai aparecer um aviso na tela "Meu perfil". Se quiser **forçar** verificação para liberar o app, me avise que eu adapto o código.

---

## 2. Firestore Database — colar as regras de segurança

1. **Build → Firestore Database**
2. Se ainda não existe, clique **Criar banco**:
   - Modo: **teste** (vamos sobrescrever as regras já já)
   - Localização: **`southamerica-east1`** (São Paulo)
3. Depois de criado, aba **Regras**
4. Apague tudo que está lá e cole o conteúdo do arquivo **`firestore.rules`** deste projeto
5. **Publicar**

---

## 3. Storage — ativar para fotos de perfil

1. **Build → Storage**
2. Clique **Começar/Get started**
3. Modo: **teste** (vamos sobrescrever)
4. Localização: aceite a sugerida (geralmente `us-central1` ou `southamerica-east1`)
5. Aba **Regras**: cole o conteúdo de **`storage.rules`** → **Publicar**

> ⚠️ O Storage no plano gratuito (Spark) pode pedir confirmação de plano de cobrança a partir de outubro/2025. Se aparecer aviso, leia com calma: o plano Blaze tem custo zero até atingir limites generosos (5 GB de armazenamento, 1 GB/dia de download). Se preferir, dá pra desativar foto de perfil e usar só inicial.

---

## 4. Authorized domains — permitir GitHub Pages

1. **Authentication → Settings → Authorized domains**
2. Você já deve ver `localhost` e `study-hub-pessoal.firebaseapp.com`
3. Quando publicar no GitHub Pages, **adicione**:
   - `seu-usuario.github.io` (substitua "seu-usuario" pelo seu nome de usuário do GitHub)

Sem isso, o login com Google não funciona em produção (popup retorna erro `unauthorized-domain`).

---

## 5. Primeiro acesso — criar sua conta

Depois das configurações acima, abra o site (`localhost:8000` ou seu GitHub Pages) e:

1. Vai aparecer a **tela de login** (não tem como pular)
2. Clique na aba **"Criar conta"**
3. Preencha:
   - **Nome**: Fabian Gutierrez
   - **Email**: `fabianspanish@gmail.com` (esse email é o owner — é o **único** que pode se cadastrar sem estar na allowlist)
   - **Telefone**: `(61) 99901-9926` (ou no formato que preferir)
   - **Senha**: crie uma forte (mín 10 caracteres, com maiúscula, minúscula, número, especial)
4. **Criar conta**
5. Verifica o email para confirmação (você pode logar antes, é só um aviso)

Quando o documento `/users/{seu-uid}` for criado, o `auth.js` reconhece seu email como `OWNER_EMAIL` e atribui automaticamente `role: "admin"`. Daí o item **"Admin"** aparece no menu Conta.

---

## 6. Liberar outros usuários

No menu **Conta → Admin**:

1. Digite o email da pessoa que quer dar acesso
2. **+ Adicionar**
3. Avisa a pessoa que ela já pode criar conta no site

Sem o email na allowlist, qualquer outra pessoa que tentar cadastrar verá: _"Este email não tem permissão para se cadastrar. Solicite acesso ao administrador."_

---

## 7. Foto de perfil (depois)

Quando quiser subir sua foto:

1. Menu **Conta → Meu perfil**
2. Clique **Escolher arquivo** → seleciona a imagem (até 2MB)
3. Sobe automático para `gs://study-hub-pessoal.firebasestorage.app/avatars/{seu-uid}.{ext}`
4. URL pública é salva em `/users/{seu-uid}.photoURL`

---

## Resumo do modelo de segurança

| Camada                    | Como protege                                          |
|---------------------------|-------------------------------------------------------|
| **Senhas**                | Hashing scrypt+sal no servidor Google. Você nunca vê. |
| **Email duplicado**       | Firebase rejeita automaticamente.                     |
| **Senha fraca**           | Validador no cliente (10+ chars, complexidade) + Firebase exige mín 6 chars.|
| **Brute force**           | Firebase Auth tem rate-limit automático.              |
| **XSS**                   | Sanitização em `auth.js`, `textContent` no DOM.       |
| **CSRF**                  | Não aplicável (sem sessão de servidor próprio).       |
| **Acesso a dados alheios**| Firestore Rules: `request.auth.uid == uid`.           |
| **Privilégio admin**      | Role `admin` no doc `/users/{uid}`, checado nas rules.|
| **Cadastro indevido**     | Allowlist + `OWNER_EMAIL` no `auth.js`.               |
| **Upload mal-intencionado**| Storage Rules: max 2MB, só imagens, só próprio uid.   |
| **Credenciais públicas**  | Por design. Segurança = Rules + Authorized Domains.   |

## Backup / migração

Os dados estão em **três lugares**:

- **Firebase Auth** (usuários, emails, senhas hasheadas): exportar via Firebase Console → Users → Exportar
- **Firestore** (`/users` e `/allowlist`): exportar via `gcloud firestore export gs://bucket/path`
- **Storage** (fotos): via `gsutil cp -r gs://study-hub-pessoal.firebasestorage.app/avatars/ ./backup`

Em cenário de troca de provider, o mais "preso" ao Firebase é o Auth (senhas só funcionam lá). Os outros migram fácil.
