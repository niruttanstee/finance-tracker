# Finance Tracker

Personal finance tracker using the Wise API to sync and visualize transaction data.

## Features

- Sync transactions from Wise API
- Monthly spending trends (line chart)
- Category breakdown (pie chart)
- Manual transaction categorization
- Local SQLite database (data persists)
- Responsive design

## Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd finance-tracker
   npm install
   ```

2. **Configure Wise API**
   - Get your Personal API Token from Wise: Settings → API tokens
   - Create `.env.local`:
     ```
     WISE_API_TOKEN=your_token_here
     ```

3. **Initialize database**
   ```bash
   npm run db:init
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Usage

1. Click "Sync with Wise" to fetch your transactions
2. Navigate to Transactions to categorize them
3. View your spending breakdown on the Dashboard

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Tech Stack

- Next.js 14
- TypeScript
- SQLite (better-sqlite3)
- Drizzle ORM
- Shadcn UI
- Recharts
