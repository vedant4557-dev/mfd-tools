# MFD Tools

AI-native portfolio intelligence platform for Mutual Fund Distributors (MFDs) in India.

**Core flow**: Upload client CAS PDF → deterministic analytics engine → structured insights + portfolio score → AI analyst explanation → Ask Portfolio chat.

---

## Architecture

```
Next.js 14 App Router (Vercel)
  ├── app/(dashboard)/*         — authenticated pages
  ├── app/api/*                 — API routes
  └── components/*              — UI components

lib/
  ├── analytics/*               — deterministic portfolio analytics (no LLM)
  ├── portfolio/                — normalize, insight-engine, analyze pipeline
  ├── fund-master/              — AMFI scheme master sync
  ├── ai/                       — Gemini: explain-portfolio, portfolio-chat
  ├── queue/                    — BullMQ queue definitions
  └── cas-parser.ts             — Railway CAS parser client

workers/
  ├── index.ts                  — worker process entrypoint
  ├── cas-parse.worker.ts       — CAS parse + portfolio analysis pipeline
  └── fund-master-sync.worker.ts— nightly AMFI scheme master sync
```

### Key principle

Math is always deterministic code, never LLM. Every number in every insight comes from lib/analytics/*. The LLM only explains pre-computed results.

---

## Setup

```bash
cp .env.example .env.local    # fill in all values
npm install
npx prisma migrate deploy
npm run dev                   # app on localhost:3000
npm run worker                # worker process (separate terminal)
```

Seed Fund Master (run once after deploy):
```bash
curl -X POST http://localhost:3000/api/admin/fund-master/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Generate secrets:
```bash
openssl rand -base64 32                                                  # AUTH_SECRET, CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" # APP_ENCRYPTION_KEY
```

---

## Tests

```bash
npm test   # 12 suites, 76 tests
```

---

## Key routes

| Route | Purpose |
|---|---|
| `/dashboard` | Stats + recent analyses |
| `/clients` | Client list |
| `/clients/new` | Add client |
| `/clients/[id]` | Client detail + upload history |
| `/generate?clientId=[id]` | Upload CAS |
| `/portfolio/[casUploadId]` | Portfolio Analyst + AI chat |
| `/settings` | Brand identity and ARN |

---

## Extending the Railway CAS parser

Add to parser response to unlock full analytics:
```typescript
funds: [{ ..., isin: "INF846K01EW2", expenseRatio: 1.2 }]
transactions: [{ schemeName, date, type: "SIP", amount, units }]
```

Enrichment and SIP extraction are already implemented and tested — they no-op gracefully until the parser returns these fields.
