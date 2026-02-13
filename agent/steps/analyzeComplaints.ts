import { supabase, type ComplaintRecord } from '../lib/supabase';
import { extractComplaints } from '../lib/groq';

const BATCH_SIZE = 20;       // reviews per LLM call
const LLM_CONCURRENCY = 5;   // parallel Groq requests

interface ReviewRow {
  id: string;
  app_id: string;
  app_category: string;
  rating: number;
  title: string | null;
  body: string;
}

export async function analyzeComplaints(runDate: string): Promise<number> {
  console.log(`\n🤖 Analyzing complaints for ${runDate}...`);

  // Fetch today's reviews that haven't been analyzed yet
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, app_id, apps!inner(app_category), rating, title, body')
    .gte('scraped_at', today.toISOString())
    .order('scraped_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch reviews for analysis: ${error.message}`);
  if (!reviews || reviews.length === 0) {
    console.log('  No reviews to analyze today');
    return 0;
  }

  // Flatten the joined app_category
  const rows: ReviewRow[] = (reviews as any[]).map((r) => ({
    id: r.id,
    app_id: r.app_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app_category: (r.apps as any)?.app_category ?? 'Unknown',
    rating: r.rating,
    title: r.title,
    body: r.body,
  }));

  console.log(`  Analyzing ${rows.length} reviews in batches of ${BATCH_SIZE}...`);

  // Exclude reviews already processed (have complaints for today)
  const { data: existing } = await supabase
    .from('complaints')
    .select('review_id')
    .eq('run_date', runDate);

  const alreadyProcessed = new Set((existing ?? []).map((c: any) => c.review_id));
  const toProcess = rows.filter((r) => !alreadyProcessed.has(r.id));

  console.log(`  Skipping ${rows.length - toProcess.length} already-analyzed, processing ${toProcess.length}`);

  let totalComplaints = 0;
  const batches: ReviewRow[][] = [];

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    batches.push(toProcess.slice(i, i + BATCH_SIZE));
  }

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += LLM_CONCURRENCY) {
    const concurrentBatches = batches.slice(i, i + LLM_CONCURRENCY);

    const results = await Promise.all(
      concurrentBatches.map(async (batch) => {
        const reviewInputs = batch.map((r, idx) => ({
          index: idx,
          rating: r.rating,
          title: r.title ?? '',
          body: r.body,
        }));

        const extracted = await extractComplaints(reviewInputs);

        const complaints: ComplaintRecord[] = extracted
          .map((c) => {
            const review = batch[c.review_index];
            if (!review) return null;
            return {
              review_id: review.id,
              app_id: review.app_id,
              app_category: review.app_category,
              complaint_category: c.complaint_category,
              complaint_text: c.complaint_text,
              severity: Math.min(5, Math.max(1, c.severity)),
              run_date: runDate,
            } as ComplaintRecord;
          })
          .filter((c): c is ComplaintRecord => c !== null);

        if (complaints.length > 0) {
          const { error } = await supabase.from('complaints').insert(complaints);
          if (error) console.warn(`  ⚠ Insert complaints error: ${error.message}`);
        }

        return complaints.length;
      })
    );

    totalComplaints += results.reduce((sum, n) => sum + n, 0);

    const batchsDone = Math.min(i + LLM_CONCURRENCY, batches.length);
    console.log(`  ${batchsDone}/${batches.length} batches done, ${totalComplaints} complaints found`);

    // Respect Groq rate limits — small pause between concurrent groups
    if (i + LLM_CONCURRENCY < batches.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`  ✓ Total complaints extracted: ${totalComplaints}`);
  return totalComplaints;
}
