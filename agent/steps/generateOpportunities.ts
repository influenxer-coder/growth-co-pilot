/**
 * Step 5: Generate per-app opportunities
 *
 * For each app that has complaints today, ask Claude to group those complaints
 * into 3-5 MECE product opportunities. Results are stored in app_opportunities.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface Complaint {
  id: string;
  complaint_text: string;
  complaint_category: string;
  severity: number;
}

interface Opportunity {
  title: string;
  description: string;
  complaint_indices: number[];
}

const SYSTEM_PROMPT = `You are a product strategist analyzing user complaints to identify improvement opportunities.

Given a list of complaints for a single iOS app, group them into 3-5 mutually exclusive, collectively exhaustive (MECE) product opportunities.

Rules:
- Between 3 and 5 opportunities total (fewer is better if complaints cluster naturally)
- Each opportunity must be meaningfully distinct — no overlap
- Together they should cover all significant complaints
- Title: short, action-oriented (e.g. "Fix Stability & Crashes", "Simplify Subscription Flow")
- Description: 1-2 sentences explaining the pattern and user impact
- complaint_indices: array of 0-based indices of complaints belonging to this opportunity

Return ONLY a valid JSON array. No markdown, no explanation.
Example: [{"title":"...","description":"...","complaint_indices":[0,2,5]}]`;

async function clusterComplaints(
  appName: string,
  complaints: Complaint[]
): Promise<Opportunity[]> {
  const complaintsText = complaints
    .map(
      (c, i) =>
        `[${i}] [${c.complaint_category}] (severity ${c.severity}) ${c.complaint_text}`
    )
    .join('\n');

  const userPrompt = `App: ${appName}\n\nComplaints (${complaints.length} total):\n${complaintsText}\n\nGroup these into 3-5 MECE product opportunities. Return JSON array.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw =
    response.content[0]?.type === 'text' ? response.content[0].text : '[]';
  const content = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(content);
    const items: Opportunity[] = Array.isArray(parsed)
      ? parsed
      : parsed.opportunities ?? [];
    return items.filter(
      (o) =>
        typeof o.title === 'string' &&
        Array.isArray(o.complaint_indices)
    );
  } catch {
    console.error(`  Failed to parse opportunities for ${appName}:`, content.slice(0, 200));
    return [];
  }
}

export async function generateOpportunities(runDate: string): Promise<number> {
  console.log('\n── Step 5: Generating opportunities ───────────────────────');

  // Fetch all apps that have complaints for this run date
  const { data: appsWithComplaints, error: appsErr } = await supabase
    .from('complaints')
    .select('app_id')
    .eq('run_date', runDate);

  if (appsErr) throw new Error(`Failed to fetch apps: ${appsErr.message}`);

  const appIds = [...new Set((appsWithComplaints ?? []).map((r) => r.app_id))];
  console.log(`  Found ${appIds.length} apps with complaints`);

  if (appIds.length === 0) return 0;

  // Fetch app names
  const { data: appRecords } = await supabase
    .from('apps')
    .select('app_id, name')
    .in('app_id', appIds);

  const appNameMap = new Map(
    (appRecords ?? []).map((a) => [a.app_id, a.name])
  );

  // Delete existing opportunities for this run date (re-run idempotency)
  await supabase
    .from('app_opportunities')
    .delete()
    .eq('run_date', runDate);

  let totalOpportunities = 0;

  for (const appId of appIds) {
    const appName = appNameMap.get(appId) ?? appId;

    // Fetch complaints for this app (cap at 100 to keep prompt manageable)
    const { data: complaints, error: cErr } = await supabase
      .from('complaints')
      .select('id, complaint_text, complaint_category, severity')
      .eq('app_id', appId)
      .eq('run_date', runDate)
      .order('severity', { ascending: false })
      .limit(100);

    if (cErr || !complaints || complaints.length === 0) continue;

    console.log(`  ${appName}: ${complaints.length} complaints → generating opportunities...`);

    try {
      const opportunities = await clusterComplaints(appName, complaints);

      if (opportunities.length === 0) continue;

      // Map indices back to real complaint IDs and cap at 5
      const rows = opportunities.slice(0, 5).map((opp) => ({
        app_id: appId,
        run_date: runDate,
        title: opp.title,
        description: opp.description ?? null,
        review_count: opp.complaint_indices.length,
        complaint_ids: opp.complaint_indices
          .filter((i) => i >= 0 && i < complaints.length)
          .map((i) => complaints[i].id),
      }));

      const { error: insertErr } = await supabase
        .from('app_opportunities')
        .insert(rows);

      if (insertErr) {
        console.error(`  Failed to insert opportunities for ${appName}:`, insertErr.message);
      } else {
        console.log(`  ✓ ${appName}: ${rows.length} opportunities stored`);
        totalOpportunities += rows.length;
      }
    } catch (err) {
      console.error(`  Error processing ${appName}:`, (err as Error).message);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n  Total opportunities generated: ${totalOpportunities}`);
  return totalOpportunities;
}
