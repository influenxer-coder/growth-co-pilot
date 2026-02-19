/**
 * For each company with PM jobs, use Claude to synthesize 3-5 key outcomes
 * an entry-level PM / APM must drive, based on their job descriptions.
 * Results stored in pm_outcomes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `You are a senior product leader analyzing entry-level PM job descriptions to identify the core outcomes this role must drive.

Given one or more PM job descriptions from the SAME company, extract 3-5 mutually exclusive, collectively exhaustive (MECE) outcomes that an Associate PM / APM at this company must deliver.

Rules:
- 3 to 5 outcomes total (fewer if descriptions clearly cluster)
- Each outcome is a business or product result, not a task or responsibility
- Outcomes should be specific to this company's domain, not generic PM boilerplate
- Title: concise result-oriented phrase (e.g. "Drive 20% faster checkout conversion", "Own the developer API adoption funnel")
- Description: 1-2 sentences on why this matters and what success looks like
- job_indices: 0-based indices of which job descriptions this outcome appears in

Return ONLY valid JSON array. No markdown.
Example: [{"title":"...","description":"...","job_indices":[0,1]}]`;

interface Job {
  id: string;
  title: string;
  description: string;
}

interface Outcome {
  title: string;
  description: string;
  job_indices: number[];
}

async function clusterJobOutcomes(companyName: string, jobs: Job[]): Promise<Outcome[]> {
  // Truncate each description to keep prompt manageable
  const jobText = jobs
    .map(
      (j, i) =>
        `[${i}] Title: ${j.title}\n${j.description.slice(0, 1200)}`
    )
    .join('\n\n---\n\n');

  const userPrompt = `Company: ${companyName}\n\nJob descriptions (${jobs.length}):\n\n${jobText}\n\nGenerate 3-5 MECE PM outcomes for this company. Return JSON array.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
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
    const items: Outcome[] = Array.isArray(parsed)
      ? parsed
      : parsed.outcomes ?? [];
    return items.filter(
      (o) => typeof o.title === 'string' && Array.isArray(o.job_indices)
    );
  } catch {
    console.error(`  Failed to parse outcomes for ${companyName}:`, content.slice(0, 200));
    return [];
  }
}

export async function generatePMOutcomes(scrapeDate: string): Promise<number> {
  console.log('\n── Generate PM Outcomes ────────────────────────────────────');

  // Fetch all companies that were scraped today
  const { data: companies, error: cErr } = await supabase
    .from('pm_companies')
    .select('id, name')
    .eq('last_scraped', scrapeDate);

  if (cErr) throw new Error(`Failed to fetch companies: ${cErr.message}`);
  console.log(`  Processing ${companies?.length ?? 0} companies`);

  if (!companies?.length) return 0;

  // Clear existing outcomes for this date (idempotent re-runs)
  await supabase.from('pm_outcomes').delete().eq('scraped_date', scrapeDate);

  let totalOutcomes = 0;

  for (const company of companies) {
    // Fetch jobs for this company
    const { data: jobs, error: jErr } = await supabase
      .from('pm_jobs')
      .select('id, title, description')
      .eq('company_id', company.id)
      .not('description', 'is', null)
      .limit(10); // cap for prompt size

    if (jErr || !jobs?.length) continue;

    console.log(`  ${company.name}: ${jobs.length} jobs → generating outcomes...`);

    try {
      const outcomes = await clusterJobOutcomes(company.name, jobs);
      if (!outcomes.length) continue;

      const rows = outcomes.slice(0, 5).map((o) => ({
        company_id: company.id,
        company_name: company.name,
        scraped_date: scrapeDate,
        title: o.title,
        description: o.description ?? null,
        job_count: o.job_indices.length,
        job_ids: o.job_indices
          .filter((i) => i >= 0 && i < jobs.length)
          .map((i) => jobs[i].id),
      }));

      const { error: insErr } = await supabase.from('pm_outcomes').insert(rows);
      if (insErr) {
        console.error(`  Insert failed for ${company.name}:`, insErr.message);
      } else {
        console.log(`  ✓ ${company.name}: ${rows.length} outcomes`);
        totalOutcomes += rows.length;
      }
    } catch (err) {
      console.error(`  Error for ${company.name}:`, (err as Error).message);
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n  Total outcomes: ${totalOutcomes}`);
  return totalOutcomes;
}
