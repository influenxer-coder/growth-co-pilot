import { supabase } from '../lib/supabase';

interface ComplaintRow {
  app_id: string;
  app_category: string;
  complaint_category: string;
  complaint_text: string;
  severity: number;
  appName: string;
}

function extractAppName(apps: unknown, fallback: string): string {
  if (!apps) return fallback;
  if (Array.isArray(apps)) return (apps[0] as { name?: string })?.name ?? fallback;
  return (apps as { name?: string })?.name ?? fallback;
}

export async function aggregate(
  runDate: string,
  appsScraped: number,
  reviewsProcessed: number
): Promise<void> {
  console.log(`\n📊 Aggregating results for ${runDate}...`);

  // Fetch all complaints for today
  const { data: complaints, error } = await supabase
    .from('complaints')
    .select('app_id, app_category, complaint_category, complaint_text, severity, apps(name)')
    .eq('run_date', runDate);

  if (error) throw new Error(`Failed to fetch complaints for aggregation: ${error.message}`);

  const rows: ComplaintRow[] = (complaints ?? []).map((c: unknown) => {
    const row = c as Record<string, unknown>;
    return {
      app_id: row.app_id as string,
      app_category: row.app_category as string,
      complaint_category: row.complaint_category as string,
      complaint_text: row.complaint_text as string,
      severity: row.severity as number,
      appName: extractAppName(row.apps, row.app_id as string),
    };
  });

  // ── by_complaint_category ────────────────────────────────────────────────
  const byComplaintCategory: Record<string, number> = {};
  for (const row of rows) {
    byComplaintCategory[row.complaint_category] =
      (byComplaintCategory[row.complaint_category] ?? 0) + 1;
  }

  // ── by_app_category ───────────────────────────────────────────────────────
  const byAppCategory: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byAppCategory[row.app_category]) byAppCategory[row.app_category] = {};
    const cat = byAppCategory[row.app_category];
    cat[row.complaint_category] = (cat[row.complaint_category] ?? 0) + 1;
  }

  // ── top_complaints (deduplicated by text similarity — just top 20 by count) ─
  const complaintFreq: Record<string, { count: number; app: string; category: string }> = {};
  for (const row of rows) {
    const key = row.complaint_text.slice(0, 100).toLowerCase();
    if (!complaintFreq[key]) {
      complaintFreq[key] = {
        count: 0,
        app: row.appName,
        category: row.complaint_category,
      };
    }
    complaintFreq[key].count++;
  }

  const topComplaints = Object.entries(complaintFreq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([text, meta]) => ({
      text,
      category: meta.category,
      count: meta.count,
      app: meta.app,
    }));

  // ── upsert summary ────────────────────────────────────────────────────────
  const { error: summaryError } = await supabase
    .from('daily_summaries')
    .upsert({
      run_date: runDate,
      apps_scraped: appsScraped,
      reviews_processed: reviewsProcessed,
      complaints_found: rows.length,
      by_complaint_category: byComplaintCategory,
      by_app_category: byAppCategory,
      top_complaints: topComplaints,
      status: 'complete',
      completed_at: new Date().toISOString(),
    });

  if (summaryError) throw new Error(`Failed to upsert summary: ${summaryError.message}`);

  console.log(`  ✓ Summary saved: ${rows.length} complaints across ${Object.keys(byAppCategory).length} app categories`);
  console.log('  Top complaint categories:', JSON.stringify(byComplaintCategory, null, 2));
}
