import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Returns breakdown of complaints by app category for a given date
export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const runDate = searchParams.get('run_date') ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_summaries')
    .select('by_app_category')
    .eq('run_date', runDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.by_app_category ?? {});
}
