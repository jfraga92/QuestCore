# Questionário Web

Questionário web simples (HTML + Express) que guarda as respostas no **Supabase**.
Pronto a publicar no **GitHub** e no **Railway**.

- Formulário gerado dinamicamente a partir de [`questions.js`](questions.js) — editas um ficheiro e o formulário muda.
- As chaves do Supabase ficam **só no servidor** (nunca expostas ao browser).
- Endpoint protegido para consultar respostas.

## 1. Configurar o Supabase

1. No [Supabase Dashboard](https://supabase.com/dashboard), abre o teu projeto.
2. Vai a **SQL Editor → New query**, cola o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e carrega em **Run**.
3. Vai a **Project Settings → API** e copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Correr localmente

```bash
npm install
cp .env.example .env      # no Windows/PowerShell: copy .env.example .env
# preenche o .env com as tuas chaves
npm run dev
```

Abre http://localhost:3000

## 3. Publicar no GitHub

```bash
git init
git add .
git commit -m "Questionário web com Supabase"
git branch -M main
git remote add origin https://github.com/<utilizador>/<repo>.git
git push -u origin main
```

> O `.env` está no `.gitignore` — as tuas chaves **não** vão para o GitHub.

## 4. Publicar no Railway

1. Em [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** e escolhe este repositório.
2. O Railway deteta o Node automaticamente (`npm install` + `npm start`).
3. Em **Variables**, adiciona:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_TOKEN` (uma frase longa à tua escolha)
   - (`PORT` é definido automaticamente pelo Railway — não precisas de a criar.)
4. Em **Settings → Networking → Generate Domain** para obteres o link público.

## Ver as respostas

- No Supabase: **Table Editor → responses**.
- Ou via API protegida:

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://<o-teu-dominio>/api/responses
```

## Adaptar as perguntas

Edita [`questions.js`](questions.js). Tipos suportados: `text`, `email`, `textarea`,
`rating`, `radio`, `checkbox`. Cada resposta é guardada como JSON na coluna `answers`,
por isso mudar as perguntas **não exige** alterar a base de dados.
