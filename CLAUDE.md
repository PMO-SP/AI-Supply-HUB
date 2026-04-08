# CLAUDE.md — AI Supply Hub

> Sportstech Project Standard | Stack: Next.js 15 + Tailwind + Vercel
> Autor: Céline Grüss | Erstellt: 2026-04-08

---

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Write plan to `tasks/todo.md` before starting — check in before implementing
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go (`- [x]`)
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after any correction

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary.

---

## Sportstech Tech Stack

### Standard Stack (immer verwenden, nie ohne Grund abweichen)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: sql.js (WASM-based SQLite)
- **Data Source**: Google Sheets API v4 (Service Account, readonly)
- **Hosting**: Vercel
- **Repo**: GitHub (Organisation: PMO-SP)

### Erlaubte Dependencies (ohne Rückfrage)
- `date-fns` — Datumsfunktionen
- `swr` — Data Fetching
- `googleapis` — Google Sheets API
- `sql.js` — SQLite im Browser/Server

### Dependencies die Rückfrage erfordern
- Neue Datenbanken, ORMs, Auth-Libraries → erst mit PMO absprechen

---

## Environment Variables

**Regel: Niemals Secrets in Code oder Git!**

- Lokale Entwicklung: `service-account.json` + `.env.local` (in .gitignore)
- Produktion: Vercel Dashboard → Environment Variables
- Welche Keys gebraucht werden: siehe `.env.example` im Root

```bash
# Lokales Setup
cp .env.example .env.local
# Werte eintragen — Keys bei PMO anfragen
```

---

## Git & Commit Konventionen

```bash
# Commit-Format
feat: add supplier filter to dashboard
fix: correct date parsing in container view
docs: update deployment guide
chore: update dependencies
refactor: extract API client to lib/
```

### Branch-Strategie
- `main` — Production (nur via PR mergen)
- `dev` — Entwicklung
- `feature/[name]` — neue Features

### Push-Rhythmus
- Mindestens täglich pushen wenn aktiv entwickelt wird
- Nie länger als 2 Tage ohne Push auf remote

---

## Deployment Checkliste (vor jedem Release)

- [ ] `.env.example` ist aktuell (alle neuen Keys eingetragen)
- [ ] Keine Secrets in Git (`git log --all -S "sk-"` o.ä.)
- [ ] `npm run build` läuft fehlerfrei durch
- [ ] `npm run lint` ohne Fehler
- [ ] Vercel Environment Variables aktuell
- [ ] `docs/architektur.md` aktuell
- [ ] PR erstellt und reviewed

---

## Projekt-Struktur

```
/
├── CLAUDE.md                 ← Diese Datei
├── README.md                 ← Projektbeschreibung
├── .env.example              ← Keys ohne Werte (in Git)
├── .env.local                ← Keys mit Werten (NICHT in Git)
├── .gitignore
├── .github/workflows/
│   └── deploy.yml            ← Auto-Deploy auf Vercel
├── docs/
│   ├── architektur.md        ← Technischer Aufbau
│   └── deployment.md         ← Vercel Setup Guide
├── tasks/
│   ├── todo.md               ← Aktuelle Tasks
│   └── lessons.md            ← Gelernte Muster
├── db/
│   └── schema.sql            ← SQLite Schema
└── src/
    ├── app/                  ← Next.js App Router + API Routes
    ├── components/           ← React Komponenten (Dashboard, Views)
    ├── hooks/                ← SWR Data Hooks
    └── lib/                  ← DB, Google Sheets, Planner, Types
```

---

## Kontakt & Eskalation

Bei technischen Fragen oder vor größeren Architekturentscheidungen:
→ PMO-SP (GitHub) oder direkt ansprechen vor dem Deployment
