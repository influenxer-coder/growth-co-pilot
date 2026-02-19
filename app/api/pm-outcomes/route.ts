import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get the most recent scrape date
  const { data: latest, error: dateErr } = await supabase
    .from('pm_global_outcomes')
    .select('scraped_date')
    .order('scraped_date', { ascending: false })
    .limit(1)
    .single();

  if (dateErr || !latest) return NextResponse.json([]);

  // Return all outcomes for that date, ordered by job_count desc
  const { data, error } = await supabase
    .from('pm_global_outcomes')
    .select('*')
    .eq('scraped_date', latest.scraped_date)
    .order('job_count', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
