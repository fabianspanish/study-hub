# 🚀 COMO SUBIR · Passo a passo completo

Este é o guia único pra colocar o Study Hub no ar, do zero ao site público. Siga **na ordem** — cada passo prepara o próximo.

**Tempo estimado:** ~30 minutos na primeira vez, ~5 minutos pra atualizações futuras.

---

## ✅ Pré-requisitos

Antes de começar, confirme que você tem:

- [ ] Conta no GitHub — se não, criar em <https://github.com/signup>
- [ ] Git instalado — testar com `git --version` no terminal. Se não tiver: <https://git-scm.com/downloads>
- [ ] Python 3 instalado (pra testar local) — testar com `python3 --version`
- [ ] Acesso ao Firebase Console — <https://console.firebase.google.com/project/study-hub-pessoal>
- [ ] Este projeto descompactado em algum lugar do seu computador

---

## 🔥 PARTE 1 — Configurar o Firebase (~10 min)

Faça **isso primeiro**. O site não funciona sem essas configurações.

### 1.1 Habilitar Email/Senha + Google

1. Abra <https://console.firebase.google.com/project/study-hub-pessoal/authentication/providers>
2. Clique em **Email/Password** → toggle "Enable/Habilitar" → **Save**
3. Clique em **Google** → toggle "Enable" → em "Project public-facing name" deixe "Study Hub" → "Project support email" selecione `fabianspanish@gmail.com` → **Save**
4. Se "Anonymous/Anônima" estiver habilitado, **desabilite** (não usamos mais)

- [ ] Email/Senha habilitado
- [ ] Google habilitado
- [ ] Anônima desabilitado

### 1.2 Aplicar regras do Firestore

1. Abra <https://console.firebase.google.com/project/study-hub-pessoal/firestore/databases/-default-/rules>
2. **Apague tudo** que está no editor
3. Abra o arquivo `firestore.rules` deste projeto (pode abrir no Notepad/TextEdit/VS Code), **copie todo o conteúdo** e **cole** no editor do console
4. Clique em **Publish/Publicar**
5. Aguarde 5 segundos pelo "Rules deployed successfully"

- [ ] Regras Firestore publicadas

### 1.3 Ativar o Storage

1. Abra <https://console.firebase.google.com/project/study-hub-pessoal/storage>
2. Se aparecer "Get started/Começar":
   - Clique → selecione **Start in test mode/Modo de teste**
   - Localização: aceite a sugerida (ou `southamerica-east1` se aparecer)
   - **Done/Concluído**
3. Depois de criado, vá na aba **Rules/Regras**
4. **Apague tudo** que está lá
5. Abra `storage.rules` deste projeto, **copie e cole** no editor
6. **Publish/Publicar**

> ⚠️ **Sobre cobrança**: o Storage no Spark (gratuito) atende sua necessidade folgado. Limites: 5 GB armazenamento, 1 GB/dia download. Avatar de 200KB × 50 usuários = 10 MB total. Você não chega nem perto.
> Se aparecer prompt pedindo plano Blaze (Pay as you go), pode aceitar com tranquilidade — não há cobrança dentro do free tier, e o Firebase **avisa** antes de cobrar qualquer coisa.

- [ ] Storage ativado
- [ ] Regras Storage publicadas

---

## 🧪 PARTE 2 — Testar localmente antes de publicar (~5 min)

Antes de subir no GitHub, confirme que funciona no seu computador.

### 2.1 Iniciar servidor local

Abra o **Terminal** (Mac/Linux) ou **PowerShell** (Windows), navegue até a pasta `projeto`:

```bash
cd caminho/para/projeto
python3 -m http.server 8000
```

> No Windows, se `python3` não funcionar, tente `python` (sem o 3).

Você deve ver algo como `Serving HTTP on 0.0.0.0 port 8000`.

### 2.2 Abrir no navegador

1. Abra <http://localhost:8000> no Chrome/Firefox/Edge
2. Vai aparecer um boot splash (200ms) e depois a **tela de login**

### 2.3 Criar sua conta admin

1. Clique na aba **"Criar conta"**
2. Preencha:
   - **Nome**: Fabian Gutierrez
   - **Email**: `fabianspanish@gmail.com`
   - **Telefone**: `(61) 99901-9926`
   - **Senha**: escolha uma forte (mín 10 chars, com maiúscula, minúscula, número, especial)
   - **Confirmar senha**: a mesma
3. **Criar conta**
4. Se tudo deu certo: você é redirecionado pra home com seu nome no canto superior direito

### 2.4 Validar que é admin

1. No menu **Conta** (topo direito) → deve aparecer o item **"Admin"**
2. Clique em **Admin** → você vê o painel com "0 usuários" e "0 permitidos"
3. Se "Admin" não apareceu: recarregue a página (F5) — às vezes o role demora um instante pra propagar

- [ ] Tela de login apareceu
- [ ] Conta criada com sucesso
- [ ] Item "Admin" visível no menu
- [ ] Painel admin abre

### 2.5 (Opcional) Subir sua foto

1. Menu **Conta → Meu perfil**
2. **Escolher arquivo** → seleciona uma foto (até 2MB)
3. Foto aparece imediatamente no preview e no chip do header

- [ ] Foto carregou (se quiser)

### 2.6 Parar o servidor local

No terminal, aperte **Ctrl+C**.

---

## 📤 PARTE 3 — Subir pro GitHub (~10 min)

### 3.1 Criar o repositório

1. Acesse <https://github.com/new>
2. **Repository name**: `study-hub`
3. **Description**: "Hub pessoal de estudos" (opcional)
4. **Visibilidade**: marque **Public**
   > Por quê público: GitHub Pages em repo privado exige plano pago ($4/mês). E o código não tem segredos — credenciais Firebase são públicas por design, segurança vem das Rules.
5. **NÃO** marque "Add a README file", "Add .gitignore" nem "Choose a license"
   > O projeto já tem todos esses arquivos. Marcar criaria conflitos.
6. **Create repository**

- [ ] Repositório criado

Anote a URL que aparece, vai ser algo como: `https://github.com/SEU-USUARIO/study-hub.git`

### 3.2 Configurar Git localmente (só na primeira vez)

No terminal, navegue até a pasta `projeto`:

```bash
cd caminho/para/projeto

# Configura quem você é (só precisa fazer uma vez na vida)
git config --global user.name "Fabian Gutierrez"
git config --global user.email "fabianspanish@gmail.com"
```

### 3.3 Criar Personal Access Token (substitui senha)

GitHub não aceita mais senha em pushes desde 2021. Precisa criar um token:

1. Acesse <https://github.com/settings/tokens?type=beta> (Fine-grained tokens — mais seguros que os clássicos)
2. **Generate new token**
3. **Token name**: `study-hub deploy`
4. **Expiration**: 90 days (depois cria outro)
5. **Repository access**: "Only select repositories" → seleciona `study-hub`
6. **Repository permissions**:
   - **Contents**: Read and write
   - **Metadata**: Read-only (vem por padrão)
7. **Generate token**
8. **COPIE o token** que aparece (começa com `github_pat_...`) e cole num lugar seguro — você só vê uma vez

- [ ] Token gerado e copiado

### 3.4 Inicializar git e fazer o primeiro push

Ainda no terminal, dentro de `projeto`:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/study-hub.git
git push -u origin main
```

> Substitua `SEU-USUARIO` pelo seu username do GitHub.

Na hora do `git push`, vai pedir:
- **Username**: seu username do GitHub
- **Password**: cole o **token** (não a senha do GitHub)

Aguarde alguns segundos. Quando voltar pro prompt sem erro, deu certo.

- [ ] `git push` concluído sem erro

> 💡 **Dica de produtividade (opcional)**: pra não digitar usuário/token toda vez, use o **Git Credential Manager**: `git config --global credential.helper store` (Linux/Mac) ou já vem no Git for Windows.

### 3.5 Confirmar que subiu

Abra `https://github.com/SEU-USUARIO/study-hub` no navegador. Você deve ver todos os arquivos do projeto listados.

- [ ] Arquivos visíveis no GitHub

---

## 🌐 PARTE 4 — Publicar no GitHub Pages (~3 min)

### 4.1 Habilitar Pages

1. No seu repositório, vá em **Settings** (engrenagem no topo)
2. Menu lateral → **Pages**
3. **Source**: "Deploy from a branch"
4. **Branch**: `main` · pasta: `/ (root)` → **Save**
5. A página recarrega e mostra: "Your site is being built. Check progress."
6. Aguarde 1-2 minutos
7. Recarrega a página e vai aparecer:
   > 🟢 Your site is live at `https://SEU-USUARIO.github.io/study-hub/`

- [ ] Pages habilitado
- [ ] URL pública apareceu

### 4.2 Autorizar o domínio no Firebase

**Esse passo é crítico** — sem ele, o login com Google não funciona em produção:

1. Abra <https://console.firebase.google.com/project/study-hub-pessoal/authentication/settings>
2. Seção **Authorized domains** (role pra baixo)
3. **Add domain**
4. Digite (sem `https://`, sem barra final): `SEU-USUARIO.github.io`
5. **Add**

- [ ] Domínio adicionado no Firebase

### 4.3 Testar em produção

1. Abra `https://SEU-USUARIO.github.io/study-hub/` no navegador
2. Boot splash → tela de login
3. Faça login com a conta que criou em 2.3
4. Confirma que tudo funciona igual à versão local

- [ ] Login funciona em produção
- [ ] Menu Conta → Admin acessível

---

## 🔁 PARTE 5 — Atualizar o site depois

Quando você fizer qualquer mudança no projeto e quiser publicar:

```bash
cd caminho/para/projeto

git add .
git commit -m "Descrição do que mudou"
git push
```

Pronto. O GitHub Pages redeploya automaticamente em ~1 minuto.

> Se o token de 90 dias expirar, gere um novo em <https://github.com/settings/tokens?type=beta> e use ele.

---

## 👥 PARTE 6 — Liberar outros usuários

Quando alguém pedir acesso:

1. Você acessa o site logado como admin
2. Menu **Conta → Admin**
3. Digite o email da pessoa → **+ Adicionar**
4. Avisa a pessoa que ela pode ir em `https://SEU-USUARIO.github.io/study-hub/`, clicar em "Criar conta" e usar aquele email
5. Se quiser remover acesso depois: na mesma tela, botão **Remover** na frente do email

> ⚠️ Remover da allowlist **impede novos cadastros**, mas **não desativa contas que já existem**. Pra revogar um usuário existente:
> - Console Firebase → Authentication → Users → encontra o usuário → 3 pontinhos → "Disable account"
> - Opcionalmente, Firestore → users → apaga o documento dele

---

## 🆘 Solução de problemas

### "Firebase indisponível" na hora do cadastro
→ Esqueceu de habilitar Email/Senha em Authentication. Volta na **Parte 1.1**.

### "Email já em uso" mas você não criou conta antes
→ Você criou conta no console manualmente em algum momento. Vai em Authentication → Users e apaga.

### Login com Google: "unauthorized-domain"
→ Esqueceu de adicionar `SEU-USUARIO.github.io` em Authorized domains. **Parte 4.2**.

### Login com Google funciona mas dá "Permission denied" depois
→ Regras do Firestore não foram publicadas. **Parte 1.2**.

### Site abre mas fica em "Iniciando · Study Hub" eternamente
→ Erro no carregamento do Firebase. Abre o DevTools (F12) → aba Console pra ver o erro. Causas comuns:
- Firewall/AdBlocker bloqueando `gstatic.com`
- Credenciais erradas em `firebase-config.js` (não deveria, vem pronto)

### `git push` pede senha mas rejeita o token
→ Você gerou um token sem permissão de escrita. **Parte 3.3** — refaz e marca "Contents: Read and write".

### Upload de foto falha com "permission-denied"
→ Regras do Storage não foram publicadas. **Parte 1.3**.

### Tudo funciona local mas não em produção
→ Provavelmente domínio do GitHub Pages não está autorizado. **Parte 4.2**.

### Apareceu "Verifique seu email" mas você não recebeu
→ Cheque a pasta de spam. O remetente é `noreply@study-hub-pessoal.firebaseapp.com`. Se nada chegar, ignore — você pode usar a conta mesmo sem verificar (só vai aparecer um aviso amarelo no perfil).

---

## 📋 Checklist final

Marque conforme completar:

**Firebase:**
- [ ] Email/Senha habilitado
- [ ] Google habilitado  
- [ ] firestore.rules publicado
- [ ] Storage ativado
- [ ] storage.rules publicado

**Teste local:**
- [ ] Site rodou em localhost:8000
- [ ] Conta admin criada com `fabianspanish@gmail.com`
- [ ] Menu Admin acessível

**GitHub:**
- [ ] Repositório criado
- [ ] Token gerado
- [ ] git push concluído
- [ ] Arquivos visíveis no GitHub

**GitHub Pages:**
- [ ] Pages habilitado
- [ ] URL pública apareceu
- [ ] Domínio adicionado em Authorized domains no Firebase
- [ ] Login funciona na URL pública

Tudo marcado? Parabéns 🎉 — seu hub tá no ar.
