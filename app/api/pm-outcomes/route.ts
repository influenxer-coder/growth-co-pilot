import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }

  // Return the most recent scrape's outcomes for this company
  const { data, error } = await supabase
    .from('pm_outcomes')
    .select('*')
    .eq('company_id', companyId)
    .order('scraped_date', { ascending: false })
    .order('job_count', { ascending: false })
    .limit(20); // fetch up to 20, then filter to latest date below

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data?.length) return NextResponse.json([]);

  // Return only the latest scrape date's outcomes (max 5)
  const latestDate = data[0].scraped_date;
  const latest = data.filter((o) => o.scraped_date === latestDate).slice(0, 5);
  return NextResponse.json(latest);
}
