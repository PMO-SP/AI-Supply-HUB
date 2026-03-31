# Container Planner

A web app for planning container shipments from China to Germany. Calculates when containers need to be ordered and loaded based on monthly sales forecasts, article-specific lead times, current stock levels, dynamic safety stock, and real-time performance tracking.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (via better-sqlite3) for local storage of plans and overrides
- **Data Source**: Google Sheets API v4 (service account authentication)
- **Client State**: SWR for data fetching and caching

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Google Cloud project with Sheets API enabled
- A Google Service Account with access to your spreadsheet

## Setup

### 1. Install Dependencies

```bash
cd container-planner
npm install
```

### 2. Google Sheets Setup

#### Create the Spreadsheet

Create a Google Sheet with five tabs:

**Tab 1 - "articles":**

| article_id | article_name | units_per_container | production_lead_time_weeks | transit_lead_time_weeks |
|---|---|---|---|---|
| ART-001 | Widget A | 500 | 4 | 6 |
| ART-002 | Widget B | 200 | 3 | 6 |

**Tab 2 - "forecast":**

| article_id | year | month | target_units |
|---|---|---|---|
| ART-001 | 2026 | 4 | 2000 |
| ART-001 | 2026 | 5 | 1500 |
| ART-002 | 2026 | 4 | 800 |

**Tab 3 - "stock_levels":**

| article_id | current_stock_units | last_updated |
|---|---|---|
| ART-001 | 800 | 2026-03-25 |
| ART-002 | 150 | 2026-03-25 |

**Tab 4 - "monthly_performance":**

| article_id | year | month | actual_units_sold |
|---|---|---|---|
| ART-001 | 2026 | 1 | 1800 |
| ART-001 | 2026 | 2 | 2100 |
| ART-001 | 2026 | 3 | 1950 |

**Tab 5 - "seasonality":**

| article_id | month | seasonality_coefficient |
|---|---|---|
| ART-001 | 1 | 0.8 |
| ART-001 | 11 | 1.2 |
| ART-001 | 12 | 1.3 |

Seasonality coefficients are manually maintained per article per month:
- 1.0 = normal demand
- 1.3 = 30% higher demand (e.g. holiday season)
- 0.8 = 20% lower demand (e.g. post-holiday)

#### Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin > Service Accounts**
5. Click **Create Service Account**
6. Give it a name (e.g., "container-planner")
7. Click **Done** (no additional roles needed)
8. Click on the new service account > **Keys** > **Add Key** > **Create new key** > **JSON**
9. Save the downloaded JSON file as `credentials/google-service-account.json`

#### Share the Spreadsheet

Share your Google Sheet with the service account email address (found in the JSON key file as `client_email`). Give it **Viewer** access.

### 3. Configure Environment

Edit `.env.local` and fill in your values:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/google-service-account.json
DATABASE_PATH=./db/planner.db
```

The spreadsheet ID is the long string in your Google Sheet URL:
`https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Initial Sync

Click the **"Sync from Sheets"** button in the top-right corner to pull data from all 5 Google Sheet tabs and compute the shipment plan.

## How It Works

### Planning Algorithm

For each article and month in the forecast:

1. **Stock buffer**: Subtract current stock from forecast need. If stock covers the full forecast, no container is needed.
   - `units_needed = target_units - current_stock_units`
2. **Safety stock**: Dynamically calculated per article per month:
   - `Safety Stock = (avg_daily_sales x transit_days x uncertainty_factor x sell_through_multiplier) x seasonality_coefficient`
   - **uncertainty_factor** = `1 + AVG(ABS(actual - forecast) / forecast)` over last 3-6 months
   - **sell_through_multiplier**: fast movers (top 33%) = 1.3x, medium = 1.0x, slow (bottom 33%) = 0.8x
   - **seasonality_coefficient**: from Sheet 5, per article per month
3. **Total units needed** = `units_needed_after_stock + safety_stock`
4. **Containers needed** = `CEIL(total_units_needed / units_per_container)`
5. **Ship date** = arrival month minus `transit_lead_time_weeks`
6. **Production start** = ship date minus `production_lead_time_weeks`

### Performance Tracking (Current Month)

- Compares actual sales vs. forecast for the current month
- **Selling faster** (actual > forecast): flags "accelerate" and pulls container date 1 week earlier
- **Selling slower** (actual < forecast): flags "delay" and pushes container date 1 week later
- Variance % displayed on dashboard per article

### Status Color Coding

- **Green**: Stock sufficient, on track, no issues
- **Yellow**: Stock running low, performance deviation > 10%, or high container count
- **Red**: Urgent reorder needed, performance deviation > 25%, or dates in the past

### Warnings

The app flags issues automatically:
- **Late Production Start**: Production must start before today but hasn't
- **Missed Ship Date**: Ship date has already passed
- **Urgent Reorder**: Performance deviation exceeds 25%
- **Stock Running Low**: Stock coverage below 1 month or deviation > 10%
- **High Container Count**: More than 10 containers needed (verify with logistics)

### Views

- **Timeline**: Visual 12-month calendar view with color-coded bars, stock coverage mini-bars, and performance variance badges per article
- **Table**: Detailed table with stock & coverage column, safety stock with hover breakdown tooltip, expandable rows showing full calculation details
- **Warnings**: Filtered view of problematic shipments with context (stock, safety stock, variance)

### Safety Stock Breakdown

Click any row in the Table view (or hover over the safety stock value) to see:
- Average daily sales
- Transit days
- Uncertainty factor (from historical forecast error)
- Sell-through tier (fast/medium/slow) and multiplier
- Seasonality coefficient
- Final safety stock result

### Manual Overrides

Click "Edit" on any shipment to override:
- Container count
- Target units
- Ship date
- Production start date

Overrides persist across syncs. Original values are preserved for reference.

## Project Structure

```
container-planner/
├── credentials/           # Google service account key (gitignored)
├── db/
│   ├── schema.sql         # SQLite table definitions (8 tables)
│   └── planner.db         # Database file (gitignored, auto-created)
├── src/
│   ├── app/
│   │   ├── api/           # API routes (sync, plans, overrides, warnings, articles, forecasts)
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── Dashboard.tsx       # Main dashboard with stats
│   │   ├── TimelineView.tsx    # 12-month timeline grid
│   │   ├── TableView.tsx       # Detailed table with expandable rows
│   │   ├── WarningsPanel.tsx   # Warnings grouped by severity
│   │   ├── OverrideModal.tsx   # Override dialog
│   │   ├── SyncButton.tsx      # Sync trigger
│   │   └── ArticleFilter.tsx   # Article dropdown filter
│   ├── hooks/             # SWR data fetching hooks
│   └── lib/
│       ├── db.ts          # SQLite connection with auto-migration
│       ├── google-sheets.ts  # Google Sheets API client (5 sheets)
│       ├── planner.ts     # Core planning algorithm with safety stock
│       ├── sync-service.ts   # Sync orchestration
│       └── types.ts       # TypeScript interfaces
├── .env.local             # Environment variables
└── package.json
```
