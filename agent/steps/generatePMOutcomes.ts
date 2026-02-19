/**
 * Generate 7-10 global, cross-company MECE outcomes from ALL PM jobs.
 * One set per run, stored in pm_global_outcomes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `You are a senior product strategy analyst studying entry-level PM job postings.

Given a list of PM job titles and description snippets from multiple companies, identify 7-10 MECE (mutually exclusive, collectively exhaustive) strategic outcomes that entry-level PMs are hired to drive across the industry.

These should be high-level, cross-company themes — the core "jobs to be done" for an AI PM agent replacing these humans.

Rules:
- Between 7 and 10 outcomes total (aim for ~8)
- Each outcome is a meaningful product/business result, not a task list
- MECE: no significant overlap
- Title: short, action-oriented (e.g. "Own End-to-End Feature Delivery" not "Product Development")
- Description: 1-2 sentences on what success looks like across companies
- job_indices: 0-based array of ALL job indices that strongly match this outcome
- Every job must appear in at least one outcome

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
