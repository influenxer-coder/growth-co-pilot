-- App Complaint Intelligence Agent — Supabase Schema
-- Run this in Supabase SQL editor to set up the database

-- ─── APPS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
  app_id        TEXT PRIMARY KEY,         -- iTunes numeric ID (e.g. "284882215")
  name          TEXT NOT NULL,
  developer     TEXT,
  app_category  TEXT NOT NULL,            -- e.g. "Games", "Social Networking"
  icon_url      TEXT,
  current_rank  INTEGER,
  avg_rating    DECIMAL(2,1),
  last_scraped  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id      TEXT REFERENCES apps(app_id) ON DELETE CASCADE,
  itunes_id   TEXT,                       -- iTunes review ID (for dedup)
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT NOT NULL,
  author      TEXT,
  review_date TIMESTAMPTZ,
  scraped_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, itunes_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_app_id    ON reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_reviews_scraped_at ON reviews(scraped_at);
CREATE INDEX IF NOT EXISTS idx_reviews_rating     ON reviews(rating);

-- ─── COMPLAINTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id          UUID REFERENCES reviews(id) ON DELETE CASCADE,
  app_id             TEXT REFERENCES apps(app_id) ON DELETE CASCADE,
  app_category       TEXT NOT NULL,
  complaint_category TEXT NOT NULL CHECK (complaint_category IN (
    'Bugs/Crashes',
    'Performance',
    'UI/UX',
    'Pricing/Subscriptions',
    'Missing Features',
    'Customer Support',
    'Privacy/Security',
    'Content Quality'
  )),
  complaint_text     TEXT NOT NULL,
  severity           INTEGER CHECK (severity BETWEEN 1 AND 5),
  run_date           DATE NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_run_date          ON complaints(run_date);
CREATE INDEX IF NOT EXISTS idx_complaints_app_category      ON complaints(app_category);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_category ON complaints(complaint_category);
CREATE INDEX IF NOT EXISTS idx_complaints_app_id            ON complaints(app_id);

-- ─── DAILY SUMMARIES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_summaries (
  run_date              DATE PRIMARY KEY,
  apps_scraped          INTEGER DEFAULT 0,
  reviews_processed     INTEGER DEFAULT 0,
  complaints_found      INTEGER DEFAULT 0,
  -- { "Bugs/Crashes": 430, "Pricing/Subscriptions": 210, ... }
  by_complaint_category JSONB DEFAULT '{}'::jsonb,
  -- { "Games": { "Bugs/Crashes": 120, "Performance": 45 }, ... }
  by_app_category       JSONB DEFAULT '{}'::jsonb,
  -- [{ "text": "...", "category": "...", "count": 12, "app": "..." }]
  top_complaints        JSONB DEFAULT '[]'::jsonb,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','complete','failed')),
  error                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

-- ─── AGENT RUNS (monitoring log) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date          DATE NOT NULL,
  step              TEXT NOT NULL CHECK (step IN (
    'init', 'fetch_apps', 'fetch_reviews', 'analyze', 'aggregate', 'done'
  )),
  status            TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  apps_processed    INTEGER DEFAULT 0,
  reviews_processed INTEGER DEFAULT 0,
  error             TEXT,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_run_date ON agent_runs(run_date);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Public read access for the dashboard (anon key)
ALTER TABLE apps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read apps"            ON apps            FOR SELECT USING (true);
CREATE POLICY "Public read reviews"         ON reviews         FOR SELECT USING (true);
CREATE POLICY "Public read complaints"      ON complaints      FOR SELECT USING (true);
CREATE POLICY "Public read daily_summaries" ON daily_summaries FOR SELECT USING (true);
CREATE POLICY "Public read agent_runs"      ON agent_runs      FOR SELECT USING (true);

-- Service role (used by agent) has full access by default in Supabase.
-- No additional policies needed for writes — agent uses service_role key.
