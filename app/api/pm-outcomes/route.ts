import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');

  if (companyId) {
    // Per-company outcomes — return latest scrape, max 5
    const { data, error } = await supabase
      .from('pm_outcomes')
      .select('*')
      .eq('company_id', companyId)
      .order('scraped_date', { ascending: false })
      .order('job_count', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json([]);

    const latestDate = data[0].scraped_date;
    return NextResponse.json(data.filter((o) => o.scraped_date === latestDate).slice(0, 5));
  }

  // All outcomes across companies — return latest scrape date's outcomes, ordered by job_count desc
  const { data: latestRow, error: dateErr } = await supabase
    .from('pm_outcomes')
    .select('scraped_date')
    .order('scraped_date', { ascending: false })
    .limit(1)
    .single();

  if (dateErr || !latestRow) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('pm_outcomes')
    .select('*')
    .eq('scraped_date', latestRow.scraped_date)
    .order('job_count', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
