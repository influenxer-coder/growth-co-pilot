/**
 * Generate 7-10 global, cross-company MECE outcomes from ALL PM jobs.
 * One set per run, stored in pm_global_outcomes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `You are an experienced product manager studying entry-level PM job postings.

Given a list of PM job titles and description snippets from multiple companies, identify 7-10 core job requirements — the recurring daily and weekly activities that a PM in these roles actually spends their time on.

Think of this as: "If I joined one of these companies tomorrow, what would fill my calendar and take up most of my working hours?"

Examples of the right framing:
- "Analyze data to inform product decisions" (not "Drive data strategy")
- "Write product specs and PRDs" (not "Define product vision")
- "Run A/B tests and interpret experiment results"
- "Conduct user interviews and synthesize research"
- "Coordinate cross-functional delivery with engineering and design"

Rules:
- Between 7 and 10 requirements total (aim for ~8)
- Each should be a concrete, recurring activity — something you actually DO, not a business result
- MECE: no significant overlap between activities
- Title: verb-led, practical (e.g. "Define and track product metrics" not "Data-driven decision making")
- Description: 1-2 sentences on what this looks like day-to-day and how frequently it comes up across companies
- job_indices: 0-based array of ALL job indices where this activity is prominently required
- Every job must appear in at least one requirement

Return ONLY valid JSON array. No markdown.
[{"title":"...","description":"...","job_indices":[0,5,12]}]`;

interface JobSummary {
  id: string;
  title: string;
  company: string;
  snippet: string;
}

interface GlobalOutcome {
  title: string;
  description: string;
  job_indices: number[];
}

async function clusterAllJobs(jobs: JobSummary[]): Promise<GlobalOutcome[]> {
  const jobsText = jobs
    .map((j, i) => `[${i}] ${j.company}: ${j.title} — ${j.snippet}`)
    .join('\n');

  const userPrompt = `${jobs.length} entry-level PM jobs across multiple companies:\n\n${jobsText}\n\nGenerate 7-10 MECE cross-company outcomes. Return JSON array.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
  const content = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(content);
    const items: GlobalOutcome[] = Array.isArray(parsed) ? parsed : parsed.outcomes ?? [];
    return items.filter(
      (o) => typeof o.title === 'string' && Array.isArray(o.job_indices)
    );
  } catch {
    console.error('  Failed to parse global outcomes:', content.slice(0, 300));
    return [];
  }
}

export async function generatePMOutcomes(scrapeDate: string): Promise<number> {
  console.log('\n── Generate Global PM Outcomes ─────────────────────────────');

  // Fetch all jobs scraped today with title + short description
  const { data: jobs, error } = await supabase
    .from('pm_jobs')
    .select('id, title, company_name, description')
    .not('description', 'is', null);

  if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
  if (!jobs?.length) {
    console.log('  No jobs found — skipping outcome generation');
    return 0;
  }

  console.log(`  Building global outcomes from ${jobs.length} jobs...`);

  // Build compact summaries (title + first 180 chars of description)
  const summaries: JobSummary[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company_name,
    snippet: (j.description ?? '').slice(0, 180).replace(/\n/g, ' '),
  }));

  const outcomes = await clusterAllJobs(summaries);

  if (!outcomes.length) {
    console.log('  Claude returned no outcomes');
    return 0;
  }

  // Cap at 10
  const capped = outcomes.slice(0, 10);

  // Delete existing outcomes for this date (idempotent)
  await supabase.from('pm_global_outcomes').delete().eq('scraped_date', scrapeDate);

  // Map indices → real job IDs
  const rows = capped.map((o) => ({
    scraped_date: scrapeDate,
    title: o.title,
    description: o.description ?? null,
    job_count: o.job_indices.filter((i) => i >= 0 && i < jobs.length).length,
    job_ids: o.job_indices
      .filter((i) => i >= 0 && i < jobs.length)
      .map((i) => jobs[i].id),
  }));

  const { error: insertErr } = await supabase.from('pm_global_outcomes').insert(rows);
  if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

  rows.forEach((r) => console.log(`  ✓ ${r.title} (${r.job_count} jobs)`));
  console.log(`\n  Total: ${rows.length} global outcomes`);
  return rows.length;
}
