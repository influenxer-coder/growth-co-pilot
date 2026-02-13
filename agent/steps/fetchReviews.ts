import store from 'app-store-scraper';
import { supabase, type AppRecord, type ReviewRecord } from '../lib/supabase';

const CONCURRENCY = 10;   // process N apps at a time
const MAX_RATING = 3;     // only collect complaints (1–3 stars)
const REVIEWS_PER_APP = 50;

async function fetchReviewsForApp(appRecord: AppRecord): Promise<ReviewRecord[]> {
  try {
    const raw = await store.reviews({
      id: Number(appRecord.app_id),
      country: 'us',
      sort: store.sort.RECENT,
      page: 1,
      num: REVIEWS_PER_APP,
    });

    // Only keep low-rating reviews (potential complaints)
    return raw
      .filter((r) => r.score <= MAX_RATING)
      .map((r) => ({
        app_id: appRecord.app_id,
        itunes_id: r.id,
        rating: r.score,
        title: r.title,
        body: r.text,
        author: r.userName,
        review_date: r.updated ? new Date(r.updated).toISOString() : undefined,
      }));
  } catch (err) {
    // Individual app failures shouldn't abort the whole run
    console.warn(`  ⚠ Could not fetch reviews for ${appRecord.name}: ${(err as Error).message}`);
    return [];
  }
}

export async function fetchReviews(apps: AppRecord[]): Promise<number> {
  console.log(`\n📝 Fetching reviews for ${apps.length} apps (≤${MAX_RATING} stars only)...`);

  let totalInserted = 0;

  // Process in batches to avoid hammering the API
  for (let i = 0; i < apps.length; i += CONCURRENCY) {
    const batch = apps.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(fetchReviewsForApp));
    const allReviews = batchResults.flat();

    if (allReviews.length === 0) continue;

    // Upsert — UNIQUE(app_id, itunes_id) prevents duplicates
    const { error, count } = await supabase
      .from('reviews')
      .upsert(allReviews, {
        onConflict: 'app_id,itunes_id',
        ignoreDuplicates: true,
        count: 'exact',
      });

    if (error) {
      console.warn(`  ⚠ Review upsert error (batch ${i / CONCURRENCY + 1}): ${error.message}`);
    } else {
      totalInserted += count ?? 0;
    }

    const processed = Math.min(i + CONCURRENCY, apps.length);
    console.log(`  ${processed}/${apps.length} apps done, ${totalInserted} reviews inserted so far`);

    // Small delay to be polite to iTunes API
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`  ✓ Total new reviews inserted: ${totalInserted}`);
  return totalInserted;
}
