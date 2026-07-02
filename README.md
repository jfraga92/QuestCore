# A Tua Rota · inCentea Core

Questionário interativo **mobile-first** para uma sessão de equipa da inCentea Core
sobre a transformação com IA e o perfil "AI Engineer". Os participantes entram por
**QR code**, respondem a 10 sinais e recebem o seu perfil (Pioneiro/Curioso/Guardião/
Observador), mapa, eixos e SWOT pessoal. As respostas ficam guardadas no **Supabase**
e há um **painel de administração** com estatísticas.

## Páginas

| Rota | O que é |
|---|---|
| `/` | **Landing** para projetar na sala, com o QR code de acesso |
| `/quiz` | O **questionário** (mobile-first): nome → 10 sinais → resultado |
| `/admin` | **Painel** de respostas e estatísticas (protegido por token) |

## Stack

- Node.js + Express (servidor), HTML/CSS/JS puro (sem framework)
- Supabase (Postgres) para guardar as respostas
- QR code gerado no servidor (`qrcode`)
- Tipografia Syne / DM Sans / DM Mono · identidade escura + verde-lima inCentea

## Variáveis de ambiente

Copia `.env.example` para `.env` (local) ou define no Railway:

| Nome | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (só no servidor) |
| `ADMIN_TOKEN` | Token para aceder ao `/admin` |
| `PORT` | Definido automaticamente pelo Railway |

## Correr localmente

```bash
npm install
cp .env.example .env   # e preencher
npm run dev            # http://localhost:3000
```

## Base de dados

Tabela `rota_responses` (ver [`supabase/schema.sql`](supabase/schema.sql)). Guarda:
nome, perfil, pontos de Abertura/Ação (brutos e normalizados) e o array de respostas.
A pontuação é calculada **no servidor** (fonte única de verdade).

## Conteúdo do questionário

Todo o conteúdo (sinais, perguntas, opções, ecos, factos, perfis e SWOT) está em
[`public/quiz-data.js`](public/quiz-data.js) — texto fechado, transcrito à letra.

## Ver as respostas

- **Painel:** abre `/admin` e introduz o `ADMIN_TOKEN`.
- **Supabase:** Table Editor → `rota_responses`.
