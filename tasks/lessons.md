# Lessons Learned — AI Supply Hub

## Turso / libSQL
- **FK-Constraints aktiv per Default**: Turso erzwingt `FOREIGN KEY`-Constraints ohne explizites `PRAGMA foreign_keys = ON`. Das `pragma()`-Wrapper in `db.ts` ist ein No-Op — Constraints greifen trotzdem. Vor dem Einfügen prüfen ob eine FK-Beziehung wirklich nötig ist.
- **Denormalisierte Tabellen brauchen keinen FK**: Wenn `supplier_name` direkt in `payments` gespeichert ist und `/api/payments` keinen JOIN braucht, ist ein `FOREIGN KEY (supplier_id) REFERENCES suppliers` nur ein Risiko — nicht entfernen → Sync-Fehler.
- **Stille FK-Filterung = Datenverlust**: Ein `payments.filter((p) => supplierIds.has(p.supplier_id))` vor dem INSERT verwirft alle Zeilen kommentarlos wenn supplier_ids nicht exakt übereinstimmen. Zähler immer auf den tatsächlich inserierten Wert setzen (`validX.length`), nicht auf den geholten (`x.length`).
- **Schema-Änderungen brauchen Migrationen**: `CREATE TABLE IF NOT EXISTS` ändert bestehende Tabellen nie. FK-Constraint entfernen = Tabelle droppen und neu anlegen. Pattern: `PRAGMA foreign_key_list(table)` prüfen → bei Treffern DROP + CREATE in einem Batch. Flag `migrationsRun` verhindert doppelte Ausführung pro Prozess.
- **`args: []` in `c.batch()` Pflicht**: Jedes Statement im `c.batch()`-Array muss `args` enthalten — auch DDL ohne Parameter. Fehlt es, bricht der TypeScript-Build mit `Property 'args' is missing in type 'InStatement'`.

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
