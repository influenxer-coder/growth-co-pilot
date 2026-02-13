/**
 * App Complaint Intelligence Agent
 *
 * Goal: Every day, fetch the top 100 free iOS apps, collect low-rating reviews,
 * use AI to extract and categorize complaints, and persist a daily summary.
 *
 * Run manually:  npx tsx agent/index.ts
 * Scheduled via: .github/workflows/daily-agent.yml (cron: 0 2 * * *)
 */

import { supabase } from './lib/supabase';
import { fetchApps } from './steps/fetchApps';
import { fetchReviews } from './steps/fetchReviews';
import { analyzeComplaints } from './steps/analyzeComplaints';
import { aggregate } from './steps/aggregate';

const runDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

async function logStep(
  step: string,
  status: 'running' | 'success' | 'failed',
  meta: { apps_processed?: number; reviews_processed?: number; error?: string } = {}
) {
  await supabase.from('agent_runs').insert({
    run_date: runDate,
    step,
    status,
    apps_processed: meta.apps_processed ?? 0,
    reviews_processed: meta.reviews_processed ?? 0,
    error: meta.error ?? null,
    completed_at: status !== 'running' ? new Date().toISOString() : null,
  });
}

async function run() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  App Complaint Agent — ${runDate}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Mark summary as running ───────────────────────────────────────────────
  await supabase.from('daily_summaries').upsert({
    run_date: runDate,
    status: 'running',
  });

  let appsScraped = 0;
  let reviewsInserted = 0;

  try {
    // ── STEP 1: Fetch top 100 apps ──────────────────────────────────────────
    await logStep('fetch_apps', 'running');
    const apps = await fetchApps();
    appsScraped = apps.length;
    await logStep('fetch_apps', 'success', { apps_processed: appsScraped });

    // ── STEP 2: Fetch reviews ───────────────────────────────────────────────
    await logStep('fetch_reviews', 'running', { apps_processed: appsScraped });
    reviewsInserted = await fetchReviews(apps);
    await logStep('fetch_reviews', 'success', {
      apps_processed: appsScraped,
      reviews_processed: reviewsInserted,
    });

    // ── STEP 3: AI complaint analysis ───────────────────────────────────────
    await logStep('analyze', 'running', { reviews_processed: reviewsInserted });
    const complaintsFound = await analyzeComplaints(runDate);
    await logStep('analyze', 'success', {
      apps_processed: appsScraped,
      reviews_processed: reviewsInserted,
    });

    // ── STEP 4: Aggregate & save summary ────────────────────────────────────
    await logStep('aggregate', 'running');
    await aggregate(runDate, appsScraped, reviewsInserted);
    await logStep('aggregate', 'success', {
      apps_processed: appsScraped,
      reviews_processed: reviewsInserted,
    });

    // ── DONE ─────────────────────────────────────────────────────────────────
    await logStep('done', 'success', {
      apps_processed: appsScraped,
      reviews_processed: reviewsInserted,
    });

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  DONE — Apps: ${appsScraped} | Reviews: ${reviewsInserted} | Complaints: ${complaintsFound}`);
    console.log(`${'═'.repeat(60)}\n`);
    process.exit(0);
  } catch (err) {
    const message = (err as Error).message;
    console.error(`\n❌ Agent failed: ${message}`);

    await supabase.from('daily_summaries').upsert({
      run_date: runDate,
      status: 'failed',
      error: message,
    });

    await logStep('done', 'failed', { error: message });
    process.exit(1);
  }
}

run();
