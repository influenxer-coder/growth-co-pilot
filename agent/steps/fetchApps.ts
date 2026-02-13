import store from 'app-store-scraper';
import { supabase, type AppRecord } from '../lib/supabase';

export async function fetchApps(): Promise<AppRecord[]> {
  console.log('📱 Fetching top 100 free iOS apps...');

  const apps = await store.list({
    collection: store.collection.TOP_FREE_IOS,
    country: 'us',
    num: 100,
    fullDetail: false,
  });

  console.log(`  Found ${apps.length} apps`);

  const records: AppRecord[] = apps.map((app, index) => ({
    app_id: String(app.id),
    name: app.title,
    developer: app.developer,
    app_category: app.primaryGenre ?? (app as any).genre ?? 'Uncategorized',
    icon_url: app.icon,
    current_rank: index + 1,
    avg_rating: app.score ?? null,
    last_scraped: new Date().toISOString(),
  }));

  // Upsert — update rank and metadata each run
  const { error } = await supabase
    .from('apps')
    .upsert(records, { onConflict: 'app_id' });

  if (error) throw new Error(`Failed to upsert apps: ${error.message}`);

  console.log(`  ✓ Upserted ${records.length} apps into DB`);
  return records;
}
