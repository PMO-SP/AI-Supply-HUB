# AI Supply Hub

> Internes Supply Chain Management Dashboard für Sportstech — Forecast-Analyse, Inbound-Planung, Lieferantenüberwachung und Produktionstracking in einer Anwendung.

[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## Übersicht

Sportstech importiert Fitnessgeräte aus China per Container. Das AI Supply Hub vereint alle relevanten Daten — von Forecast über Zahlungen bis hin zu Lieferstatus — in einem zentralen Dashboard. Die Daten werden direkt aus Google Sheets synchronisiert und in einer lokalen SQLite-Datenbank verarbeitet.

## Features

- **Dashboard** — Mahnstufen-Übersicht, Container Value, Deposit Tracking mit Herstellerfilter
- **Forecast** — Performance nach Produktkategorie (M-3, M-2, M-1), Top 10 Über-/Unterperformer, 3M Trend
- **Sales Push / Brake** — Automatische Handlungsempfehlungen basierend auf Forecast-Erreichung
- **Lieferverzug** — Stockouts, Verzugsquoten, Offline-Artikel
- **Inbound Plan current** — Aktuelle Bestellungen aus Google Sheets
- **AI Inbound Plan** — KI-basierte Container-Berechnung mit Safety Stock
- **In Production** — Offene Bestellungen in Produktion mit Anzahlungen
- **Goods on the Way** — Verschiffte Ware mit ETD/ETA, Warenwert, Restbetrag
- **Hersteller Zahlungen** — Cash Flow, Mahnstufen, Vorkasse/Kreditlinie, Top 10 Lieferanten
- **Safety Stock** — Dynamische Sicherheitsbestandsberechnung
- **Google Sheets Sync** — 14 Sheet-Tabs parallel synchronisiert

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Styling | Tailwind CSS |
| Datenbank | Turso (libSQL / SQLite, hosted) |
| DB-Client | @libsql/client |
| Datenquelle | Google Sheets API v4 (Service Account) |
| Data Fetching | SWR |
| Hosting | Vercel |

---

## Lokale Entwicklung

### Voraussetzungen
- Node.js 20+
- npm
- Google Cloud Projekt mit aktivierter Sheets API
- Service Account mit Lesezugriff auf das Spreadsheet
- Turso-Account mit einer Datenbank (kostenloser Starter-Plan reicht)

### Setup

```bash
# 1. Repo klonen
git clone https://github.com/PMO-SP/AI-Supply-HUB.git
cd AI-Supply-HUB

# 2. Dependencies installieren
npm install

# 3. Environment Variables einrichten
cp .env.example .env.local
# Werte eintragen (Keys bei PMO anfragen)
# Benötigt: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, Google Sheets Credentials

# 4. Turso Datenbank einrichten (einmalig)
# → https://turso.tech → Account erstellen → DB anlegen → URL + Token kopieren
# turso db create ai-supply-hub
# turso db tokens create ai-supply-hub

# 5. Service Account JSON ablegen
# service-account.json ins Projekt-Root kopieren (NICHT committen!)

# 6. Dev Server starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

### Erster Sync

Klicke auf **"Google Sheets sync"** oben rechts, um alle 14 Sheet-Tabs zu synchronisieren.

---

## Projekt-Struktur

```
src/
├── app/              # Next.js App Router (Pages, Layouts, 14 API Routes)
├── components/       # React-Komponenten (Dashboard, Views, Filter)
├── hooks/            # SWR Data Hooks (12 Hooks)
└── lib/              # DB, Google Sheets, Planner, Sync, Types
db/
└── schema.sql        # SQLite Schema (14 Tabellen)
docs/
├── architektur.md    # Technischer Aufbau
└── deployment.md     # Vercel Setup
tasks/
├── todo.md           # Aktuelle Aufgaben
└── lessons.md        # Gelernte Muster
```

---

## Google Sheets Tabs

| # | Tab | Beschreibung |
|---|-----|-------------|
| 1 | articles | Artikel mit Kategorie, Laufzeiten |
| 2 | forecasts | Monats-Forecast pro Artikel |
| 3 | stock_levels | Aktueller Bestand |
| 4 | monthly_performance | Performance %, M-3/M-2/M-1, 3M Trend |
| 5 | seasonality | Saisonkoeffizienten |
| 6 | suppliers | Lieferantenstammdaten |
| 7 | payments | Zahlungen mit Mahnstufen |
| 8 | stockouts | Out-of-Stock & Offline Artikel |
| 9 | sales_actions | Aktionsempfehlungen |
| 10 | inbound_orders | Aktuelle Bestellungen |
| 11 | goods_on_the_way | Verschiffte Container |
| 12 | in_production | Bestellungen in Produktion |
| 13 | delay_by_month | Verzugsdaten pro Monat |
| 14 | overrides | Manuelle Überschreibungen |

---

## Deployment

Gehostet auf **Vercel**. Jeder Push auf `main` triggert automatisch ein Re-Deploy.

Setup-Anleitung: [docs/deployment.md](docs/deployment.md)

---

## Environment Variables

Alle benötigten Keys sind in `.env.example` dokumentiert.

| Variable | Beschreibung |
|----------|-------------|
| `TURSO_DATABASE_URL` | libSQL-URL der Turso-Datenbank (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Auth-Token für Turso-Datenbankzugriff |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-Mail des Google Service Accounts |
| `GOOGLE_PRIVATE_KEY` | Private Key des Service Accounts |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID des Google Spreadsheets |

Niemals `.env.local` oder `service-account.json` committen — beide sind in `.gitignore`.

---

## Architektur

Technischer Überblick: [docs/architektur.md](docs/architektur.md)

---

## Kontakt

Bei Fragen zum Projekt oder Deployment: **PMO-SP** (GitHub)
