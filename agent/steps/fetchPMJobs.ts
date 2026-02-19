/**
 * Fetch entry-level PM jobs from The Muse API (free, no key required).
 * Targets: APM / Associate PM / Entry-level PM at software companies.
 * Fetches up to MAX_PAGES pages per level tier, deduplicates, and upserts.
 */

import { supabase } from '../lib/supabase';

const MUSE_BASE = 'https://www.themuse.com/api/public/jobs';
const MAX_PAGES = 8; // 20 jobs/page → up to 160 per level
const DELAY_MS  = 400; // be polite to The Muse

// Levels that map to APM / entry-level
const TARGET_LEVELS = ['Entry Level', 'Associate'];

// Keywords that indicate a software/tech product role
const TECH_SIGNALS = [
  'software', 'saas', 'platform', 'cloud', 'api', 'app ', 'apps ',
  'mobile', 'digital', 'tech', 'data', 'ai', ' ml ', 'automation',
  'ecommerce', 'fintech', 'healthtech', 'edtech', 'startup', 'product',
];

// Strip HTML tags and normalize whitespace
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isSoftwareCompany(title: string, companyName: string, description: string): boolean {
  const haystack = `${title} ${companyName} ${description}`.toLowerCase();
  return TECH_SIGNALS.some((sig) => haystack.includes(sig));
}

interface MuseJob {
  id: number;
  name: string;
  contents: string;
  publication_date: string;
  company: { id: number; short_name: string; name: string };
  locations: { name: string }[];
  levels: { name: string }[];
  refs: { landing_page: string };
}

interface MuseResponse {
  results: MuseJob[];
  page_count: number;
}

async function fetchPage(level: string, page: number): Promise<MuseResponse> {
  const url = `${MUSE_BASE}?category=Product+Management&level=${encodeURIComponent(level)}&page=${page}&descending=true`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'growth-co-pilot/1.0 (job-intelligence-agent)' },
  });
  if (!res.ok) throw new Error(`Muse API ${res.status} for level="${level}" page=${page}`);
  return res.json();
}

export async function fetchPMJobs(): Promise<number> {
  console.log('\n── Fetch PM Jobs ───────────────────────────────────────────');

  const allJobs: MuseJob[] = [];
  const seenIds = new Set<number>();

  for (const level of TARGET_LEVELS) {
    console.log(`  Fetching "${level}" jobs...`);
    let page = 0;

    while (page < MAX_PAGES) {
      try {
        const data = await fetchPage(level, page);
        const fresh = data.results.filter((j) => !seenIds.has(j.id));
        fresh.forEach((j) => seenIds.add(j.id));
        allJobs.push(...fresh);
        console.log(`    page ${page}: +${fresh.results?.length ?? fresh.length} (total ${allJobs.length})`);

        if (page >= data.page_count - 1) break;
        page++;
        await new Promise((r) => setTimeout(r, DELAY_MS));
      } catch (err) {
        console.error(`    Error page ${page}:`, (err as Error).message);
        break;
      }
    }
  }

  console.log(`  Total raw jobs: ${allJobs.length}`);

  // Filter for software companies & last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const filtered = allJobs.filter((j) => {
    const postedDate = new Date(j.publication_date);
    if (postedDate < sixMonthsAgo) return false;
    const desc = stripHtml(j.contents ?? '');
    return isSoftwareCompany(j.name, j.company.name, desc);
  });

  console.log(`  After filter (software + 6mo): ${filtered.length}`);

  if (filtered.length === 0) return 0;

  // Upsert companies
  const companyMap = new Map<string, { id: string; name: string; count: number }>();
  for (const j of filtered) {
    const cid = j.company.short_name;
    if (!companyMap.has(cid)) {
      companyMap.set(cid, { id: cid, name: j.company.name, count: 0 });
    }
    companyMap.get(cid)!.count++;
  }

  const today = new Date().toISOString().split('T')[0];
  const companyRows = [...companyMap.values()].map(({ id, name, count }) => ({
    id,
    name,
    job_count: count,
    last_scraped: today,
  }));

  const { error: compErr } = await supabase
    .from('pm_companies')
    .upsert(companyRows, { onConflict: 'id' });
  if (compErr) throw new Error(`Company upsert failed: ${compErr.message}`);
  console.log(`  Upserted ${companyRows.length} companies`);

  // Upsert jobs
  const jobRows = filtered.map((j) => ({
    id: String(j.id),
    company_id: j.company.short_name,
    company_name: j.company.name,
    title: j.name,
    location: j.locations?.[0]?.name ?? null,
    level: j.levels?.[0]?.name ?? null,
    description: stripHtml(j.contents ?? '').slice(0, 8000),
    url: j.refs?.landing_page ?? null,
    posted_date: j.publication_date.split('T')[0],
  }));

  const { error: jobErr } = await supabase
    .from('pm_jobs')
    .upsert(jobRows, { onConflict: 'id' });
  if (jobErr) throw new Error(`Job upsert failed: ${jobErr.message}`);
  console.log(`  Upserted ${jobRows.length} jobs`);

  return jobRows.length;
}
