import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const idsParam  = searchParams.get('ids'); // comma-separated job IDs

  let query = supabase
    .from('pm_jobs')
    .select('id, company_id, company_name, title, location, level, url, posted_date, description')
    .order('posted_date', { ascending: false });

  if (companyId) query = query.eq('company_id', companyId);
  if (idsParam) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
