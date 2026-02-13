import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('app_id');
  const runDate = searchParams.get('run_date');

  if (!appId) {
    return NextResponse.json({ error: 'app_id is required' }, { status: 400 });
  }

  let query = supabase
    .from('app_opportunities')
    .select('*')
    .eq('app_id', appId)
    .order('review_count', { ascending: false });

  if (runDate) {
    query = query.eq('run_date', runDate);
  } else {
    // Default to most recent run date for this app
    query = query.limit(5);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If no run_date specified, return only the latest run's opportunities
  if (!runDate && data && data.length > 0) {
    const latestDate = data[0].run_date;
    const latest = data.filter((o) => o.run_date === latestDate);
    return NextResponse.json(latest);
  }

  return NextResponse.json(data ?? []);
}
