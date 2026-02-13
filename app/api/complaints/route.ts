import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const appCategory = searchParams.get('app_category');
  const complaintCategory = searchParams.get('complaint_category');
  const appId = searchParams.get('app_id');
  const runDate = searchParams.get('run_date');
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('complaints')
    .select('*, apps(name, icon_url, app_category)', { count: 'exact' })
    .order('severity', { ascending: false })
    .range(offset, offset + limit - 1);

  if (appCategory) query = query.eq('app_category', appCategory);
  if (complaintCategory) query = query.eq('complaint_category', complaintCategory);
  if (appId) query = query.eq('app_id', appId);
  if (runDate) query = query.eq('run_date', runDate);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
