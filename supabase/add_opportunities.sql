-- App Opportunities table
-- Groups complaints into actionable product opportunities per app per run

CREATE TABLE IF NOT EXISTS app_opportunities (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id       text NOT NULL REFERENCES apps(app_id),
  run_date     date NOT NULL,
  title        text NOT NULL,
  description  text,
  review_count int NOT NULL DEFAULT 0,
  complaint_ids jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_opportunities_app_run_idx ON app_opportunities(app_id, run_date);

ALTER TABLE app_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON app_opportunities FOR SELECT USING (true);
