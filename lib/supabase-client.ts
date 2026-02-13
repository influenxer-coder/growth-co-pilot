import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazily initialized browser client (avoids build-time env var issues)
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// ─── Shared types ────────────────────────────────────────────────────────────

export interface DailySummary {
  run_date: string;
  apps_scraped: number;
  reviews_processed: number;
  complaints_found: number;
  by_complaint_category: Record<string, number>;
  by_app_category: Record<string, Record<string, number>>;
  top_complaints: { text: string; category: string; count: number; app: string }[];
  status: 'pending' | 'running' | 'complete' | 'failed';
  error?: string;
  completed_at?: string;
}

export interface AgentRun {
  id: string;
  run_date: string;
  step: string;
  status: 'running' | 'success' | 'failed';
  apps_processed: number;
  reviews_processed: number;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export const COMPLAINT_CATEGORIES = [
  'Bugs/Crashes',
  'Performance',
  'UI/UX',
  'Pricing/Subscriptions',
  'Missing Features',
  'Customer Support',
  'Privacy/Security',
  'Content Quality',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Bugs/Crashes':          '#ef4444',
  'Performance':           '#f97316',
  'UI/UX':                 '#eab308',
  'Pricing/Subscriptions': '#84cc16',
  'Missing Features':      '#06b6d4',
  'Customer Support':      '#8b5cf6',
  'Privacy/Security':      '#ec4899',
  'Content Quality':       '#64748b',
};
