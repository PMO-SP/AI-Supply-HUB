# Architektur — AI Supply Hub

## Überblick

```
Google Sheets (14 Tabs)
        │
        ▼ (Google Sheets API v4, Service Account)
   Sync Service (src/lib/sync-service.ts)
        │
        ▼ (Promise.all — parallel)
   SQLite DB (sql.js / WASM)
        │
        ▼ (Next.js API Routes)
   14 API Endpoints (/api/*)
        │
        ▼ (SWR Hooks)
   React Components (Dashboard, Views)
```

## Datenfluss

1. **Google Sheets** → Datenquelle. 14 Tabs mit Artikeln, Forecasts, Zahlungen, etc.
2. **Sync Service** → Liest alle Tabs parallel via `Promise.all`, parsed deutsche Zahlenformate (Komma-Dezimal, Tausender-Punkte, %-Zeichen)
3. **SQLite (sql.js)** → Server-seitige WASM-Datenbank. Auto-Migration bei Schema-Änderungen
4. **API Routes** → 14 GET-Endpoints, teilweise mit JOINs (z.B. article_name aus articles)
5. **SWR Hooks** → Client-side Caching und Revalidierung
6. **Components** → Dashboard mit 11 Tabs, Filter, KPIs

## Schlüsselkomponenten

| Datei | Funktion |
|-------|----------|
| `src/lib/db.ts` | SQLite-Verbindung, Schema-Ausführung, Auto-Migration |
| `src/lib/google-sheets.ts` | 14 Fetch-Funktionen für Google Sheets Tabs |
| `src/lib/sync-service.ts` | Orchestriert den Gesamt-Sync |
| `src/lib/planner.ts` | KI-Container-Berechnung mit Safety Stock |
| `src/lib/types.ts` | Alle TypeScript Interfaces |
| `src/components/Dashboard.tsx` | Haupt-Layout, Navigation, KPIs |

## Datumsformate

- **Eingabe**: `dd.mm.yyyy` (deutsches Format) oder `yyyy-mm-dd` (ISO)
- **Anzeige**: `dd.mm.yyyy` überall in der App
- **DB**: Gespeichert als String im Originalformat

## Zahlenformate

- Deutsche Komma-Dezimalzahlen: `1.234,56` → parsed zu `1234.56`
- Prozent mit %-Zeichen: `85%` → parsed zu `85`
- Währung: Anzeige als `1.234 €` (de-DE Locale)
