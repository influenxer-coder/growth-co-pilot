-- PM Jobs Intelligence — tables for product manager job scraping

-- ─── COMPANIES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_companies (
  id           text PRIMARY KEY,          -- The Muse company slug
  name         text NOT NULL,
  job_count    int  DEFAULT 0,
  last_scraped date,
  created_at   timestamptz DEFAULT now()
);

-- ─── JOBS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_jobs (
  id           text PRIMARY KEY,          -- The Muse job ID as string
  company_id   text NOT NULL REFERENCES pm_companies(id),
  company_name text NOT NULL,
  title        text NOT NULL,
  location     text,
  level        text,
  description  text,                      -- plain text stripped from HTML
  url          text,
  posted_date  date,
  scraped_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_jobs_company_idx ON pm_jobs(company_id);

-- ─── OUTCOMES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_outcomes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   text NOT NULL REFERENCES pm_companies(id),
  company_name text NOT NULL,
  scraped_date date NOT NULL,
  title        text NOT NULL,
  description  text,
  job_count    int  DEFAULT 0,
  job_ids      jsonb DEFAULT '[]',        -- array of pm_job id strings
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_outcomes_company_date_idx ON pm_outcomes(company_id, scraped_date);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE pm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_outcomes  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON pm_companies FOR SELECT USING (true);
CREATE POLICY "public read" ON pm_jobs      FOR SELECT USING (true);
CREATE POLICY "public read" ON pm_outcomes  FOR SELECT USING (true);
