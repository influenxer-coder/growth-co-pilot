import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env.local for local development (no-op when env is already set, e.g. GitHub Actions)
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Typed helpers ────────────────────────────────────────────────────────────

export type ComplaintCategory =
  | 'Bugs/Crashes'
  | 'Performance'
  | 'UI/UX'
  | 'Pricing/Subscriptions'
  | 'Missing Features'
  | 'Customer Support'
  | 'Privacy/Security'
  | 'Content Quality';

export interface AppRecord {
  app_id: string;
  name: string;
  developer?: string;
  app_category: string;
  icon_url?: string;
  current_rank?: number;
  avg_rating?: number;
  last_scraped?: string;
}

export interface ReviewRecord {
  app_id: string;
  itunes_id: string;
  rating: number;
  title?: string;
  body: string;
  author?: string;
  review_date?: string;
}

export interface ComplaintRecord {
  review_id: string;
  app_id: string;
  app_category: string;
  complaint_category: ComplaintCategory;
  complaint_text: string;
  severity: number;
  run_date: string;
}
