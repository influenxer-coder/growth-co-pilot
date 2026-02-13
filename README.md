# App Complaint Intelligence

Scrapes the top 100 free iOS apps daily, uses AI to extract and categorize user complaints, and surfaces insights on a dashboard.

## Setup (5 minutes)

### 1. Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Copy your project URL, anon key, and service role key from **Settings → API**

### 2. Groq
1. Get a free API key at [console.groq.com](https://console.groq.com)

### 3. Environment Variables
```bash
cp .env.local.example .env.local
# Fill in the values from steps 1 and 2
```

### 4. GitHub Secrets (for the daily agent)
In your GitHub repo → **Settings → Secrets → Actions**, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

### 5. Deploy to Vercel
```bash
npx vercel
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel dashboard
```

## Running locally

```bash
npm run dev          # Start dashboard at http://localhost:3000
npm run agent        # Run the agent once manually
```

## Architecture

| Component | Technology | Hosting |
|---|---|---|
| Dashboard | Next.js 15 | Vercel (free) |
| Database | Supabase PostgreSQL | Supabase (free) |
| Daily agent | Node.js script | GitHub Actions (free) |
| LLM | Groq llama-3.3-70b | Groq (free tier) |
| App Store data | iTunes RSS + app-store-scraper | Public API (free) |

## Agent schedule

The agent runs daily at **2:00 AM UTC** via `.github/workflows/daily-agent.yml`.

To trigger manually: GitHub → Actions → "Daily App Store Complaint Agent" → **Run workflow**

## Complaint categories

`Bugs/Crashes` · `Performance` · `UI/UX` · `Pricing/Subscriptions` · `Missing Features` · `Customer Support` · `Privacy/Security` · `Content Quality`
