import { supabase, type ComplaintRecord } from '../lib/supabase';
import { extractComplaints } from '../lib/groq';

const BATCH_SIZE = 20;       // reviews per LLM call
const LLM_CONCURRENCY = 1;   // sequential — Groq free tier is 12k TPM
const BATCH_DELAY_MS = 6000; // ~6s gap keeps us well under 12k TPM

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

  // Process batches sequentially with retry on 429
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const reviewInputs = batch.map((r, idx) => ({
      index: idx,
      rating: r.rating,
      title: r.title ?? '',
      body: r.body,
    }));

    // Retry loop for rate-limit errors
    let extracted;
    let attempt = 0;
    while (true) {
      try {
        extracted = await extractComplaints(reviewInputs);
        break;
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        const is429 = msg.includes('429') || msg.includes('rate_limit_exceeded');
        if (!is429 || attempt >= 5) throw err;
        // Parse "Please try again in Xs" from error message, default 15s
        const match = msg.match(/try again in (\d+(?:\.\d+)?)s/);
        const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 15000;
        attempt++;
        console.log(`  ⏳ Rate limited — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt})...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    const complaints: ComplaintRecord[] = (extracted ?? [])
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

    totalComplaints += complaints.length;

    if ((i + 1) % 10 === 0 || i + 1 === batches.length) {
      console.log(`  ${i + 1}/${batches.length} batches done, ${totalComplaints} complaints found`);
    }

    // Pace requests to stay under Groq free tier 12k TPM
    if (i + 1 < batches.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`  ✓ Total complaints extracted: ${totalComplaints}`);
  return totalComplaints;
}
