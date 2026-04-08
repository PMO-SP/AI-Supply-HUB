# Lessons Learned — AI Supply Hub

## Datenbank
- **ALTER TABLE für neue Spalten**: `CREATE TABLE IF NOT EXISTS` fügt keine neuen Spalten hinzu. Auto-Migration via `PRAGMA table_info()` + `ALTER TABLE ADD COLUMN` in `db.ts` nutzen.
- **DB-Pfad**: Ist `./db/planner.db`, nicht `./data/...`. Immer in `db.ts` nachschauen.
- **UNIQUE constraint**: Bei Duplikaten in Google Sheets `DELETE` + `INSERT OR REPLACE` Pattern nutzen.

## Google Sheets
- **Tab-Namen**: Exakt wie im Code erwartet (z.B. "forecasts" nicht "forecast"). Fehler: "Unable to parse range".
- **Deutsche Zahlen**: Immer `.replace("%", "").replace(",", ".")` vor parseFloat. Tausender-Punkte mit `.replace(/\./g, "")` entfernen.
- **Spaltenreihenfolge**: Nie ändern ohne Fetcher anzupassen. Index-basiert (row[0], row[1], ...).

## UI/UX
- **Kompakte Darstellung**: Für 14"-Laptops: 10px Schrift, 2px Padding, schmale Abstände.
- **Filter**: Payments haben kein `article_id` — Artikelfilter kann Mahnstufen nur indirekt über Supplier filtern.
- **Offline Badge**: Artikel aus `stockouts` mit `available_from_date = "offline"` zeigen schwarzes OFFLINE Badge statt Traffic Light.

## Performance-Daten
- **3M Trend**: Kommt direkt aus Google Sheet (`trend_3m`), wird NICHT berechnet. Sheet kennt Lieferverfügbarkeit, App nicht.
- **performance_pct**: Kommt aus Sheet, nicht berechnet. Unterstützt Komma-Dezimal und %-Zeichen.

## Datumsformate
- **Eingabe**: Beide Formate unterstützen: `dd.mm.yyyy` und `yyyy-mm-dd`
- **Anzeige**: Immer `dd.mm.yyyy` (deutsches Format)
- **Lead Times**: In Tagen (`_days`), nicht Wochen (`_weeks`)

## Container
- **1 order_id = 1 Container**: Containeranzahl aus `inbound_orders` zählen, nicht aus `units / units_per_container` berechnen.
