# Deployment Guide

## Vercel Setup (einmalig)

1. vercel.com → "Add New Project" → GitHub Repo `PMO-SP/AI-Supply-HUB` importieren
2. Framework: Next.js (auto-detected)
3. Environment Variables eintragen (siehe .env.example):
   | Key | Wo bekomme ich den Wert? |
   |-----|--------------------------|
   | GOOGLE_SERVICE_ACCOUNT_EMAIL | Aus service-account.json → `client_email` |
   | GOOGLE_PRIVATE_KEY | Aus service-account.json → `private_key` |
   | GOOGLE_SPREADSHEET_ID | Google Sheet URL → ID zwischen `/d/` und `/edit` |
4. Deploy → fertig

## Domain verbinden (IONOS)

DNS → A-Record → 76.76.21.21 (Vercel IP)
oder CNAME → cname.vercel-dns.com

## Updates deployen

Jeder Push auf `main` → automatisches Re-Deploy via GitHub Actions

## GitHub Secrets einrichten

Im GitHub Repo → Settings → Secrets and variables → Actions:

| Secret | Wo herbekommen |
|--------|----------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel.json` nach `vercel link` |
| `VERCEL_PROJECT_ID` | `vercel.json` nach `vercel link` |

### IDs herausfinden:
```bash
npm i -g vercel
vercel link
cat .vercel/project.json
# → orgId und projectId
```

## Vercel Environment Variables

Alle Keys aus `.env.example` müssen in Vercel eingetragen werden:
vercel.com → Project → Settings → Environment Variables

Environments:
- **Production** → `main` Branch
- **Preview** → alle anderen Branches (gut zum Testen)
