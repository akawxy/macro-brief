# Macro Brief

Real-time dashboard: CTA positioning (CFTC COT) + Fed balance sheet (H.4.1) + market data.

**No API keys required. No AI.**

## Data sources

| Data | Source | Update frequency |
|------|--------|-----------------|
| NQ / SPX / VIX / 10Y | Yahoo Finance | real-time (60s refresh) |
| CTA proxy (non-commercial NQ positions) | CFTC Socrata public API | weekly (Friday) |
| Fed balance sheet (total assets, reserves, treasuries, MBS) | FRED CSV public endpoint | weekly (Thursday) |

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "init"
# create repo on github, then:
git remote add origin https://github.com/YOU/macro-brief.git
git push -u origin main

# 2. vercel.com → New Project → Import → Deploy
# No environment variables needed.
```

Done. No API keys, no database, no setup.

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

## What the brief tells you

- **CTA direction**: non-commercial (systematic/CTA proxy) net long or short NQ, vs 52-week percentile
- **Fed**: weekly change in balance sheet, QT status
- **VIX regime**: low / normal / elevated vol → affects NQ range expectations
- **10Y yield**: sharp moves flagged as NQ correlation risk
