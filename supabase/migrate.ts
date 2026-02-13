/**
 * Run a SQL migration against Supabase using the service role key.
 * Usage: npx tsx supabase/migrate.ts supabase/add_opportunities.sql
 */
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config({ path: '.env.local' });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: npx tsx supabase/migrate.ts <sql-file>');
  process.exit(1);
}

const sql = readFileSync(resolve(sqlFile), 'utf-8');

async function main() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!resp.ok) {
    console.log('\n⚠️  Direct SQL execution not available via REST.\n');
    console.log('Run this SQL in your Supabase dashboard → SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  } else {
    console.log('✅ Migration applied successfully.');
  }
}

main().catch(console.error);
