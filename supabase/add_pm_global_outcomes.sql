-- Global cross-company PM outcomes (one set per scrape run, ≤10 total)
CREATE TABLE IF NOT EXISTS pm_global_outcomes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scraped_date date NOT NULL,
  title        text NOT NULL,
  description  text,
  job_count    int  DEFAULT 0,
  job_ids      jsonb DEFAULT '[]',   -- pm_job id strings
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_global_outcomes_date_idx ON pm_global_outcomes(scraped_date, job_count DESC);

ALTER TABLE pm_global_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON pm_global_outcomes FOR SELECT USING (true);
