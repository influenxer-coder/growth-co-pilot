/**
 * PM Jobs Intelligence Agent
 *
 * Scrapes entry-level PM / APM job listings from The Muse,
 * filters for software companies, then uses Claude to extract
 * the key outcomes each company expects an APM to drive.
 *
 * Run:  npm run pm-agent
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchPMJobs } from './steps/fetchPMJobs';
import { generatePMOutcomes } from './steps/generatePMOutcomes';

const scrapeDate = new Date().toISOString().split('T')[0];

async function run() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  PM Jobs Agent — ${scrapeDate}`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    // Step 1: Fetch and store jobs
    const jobCount = await fetchPMJobs();
    console.log(`\n  ✓ Jobs stored: ${jobCount}`);

    if (jobCount === 0) {
      console.log('  No jobs found — check API or filters.');
      process.exit(0);
    }

    // Step 2: Generate outcomes per company
    const outcomeCount = await generatePMOutcomes(scrapeDate);
    console.log(`  ✓ Outcomes generated: ${outcomeCount}`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  DONE — Jobs: ${jobCount} | Outcomes: ${outcomeCount}`);
    console.log(`${'═'.repeat(60)}\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ PM Agent failed:', (err as Error).message);
    process.exit(1);
  }
}

run();
