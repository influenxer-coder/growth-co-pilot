'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import type { AgentRun } from '@/lib/supabase-client';
import { formatDistanceToNow, parseISO } from 'date-fns';

const STEP_ORDER = ['init', 'fetch_apps', 'fetch_reviews', 'analyze', 'aggregate', 'done'];
const STEP_LABELS: Record<string, string> = {
  init:           '1. Init',
  fetch_apps:     '2. Fetch Apps',
  fetch_reviews:  '3. Fetch Reviews',
  analyze:        '4. AI Analysis',
  aggregate:      '5. Aggregate',
  done:           '6. Done',
};

export default function RunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/runs?days=14')
      .then((r) => r.json())
      .then(setRuns)
      .finally(() => setLoading(false));
  }, []);

  // Group by run_date
  const byDate: Record<string, AgentRun[]> = {};
  for (const run of runs) {
    if (!byDate[run.run_date]) byDate[run.run_date] = [];
    byDate[run.run_date].push(run);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Runs</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Execution history — last 14 days · runs daily at 2:00 AM UTC
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
        <strong className="text-gray-300">Manual trigger:</strong> go to your GitHub repo →
        Actions → &quot;Daily App Store Complaint Agent&quot; → Run workflow
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      )}

      {!loading && dates.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-500">
          No runs yet — trigger the agent from GitHub Actions to get started.
        </div>
      )}

      <div className="space-y-6">
        {dates.map((date) => {
          const dateRuns = byDate[date];
          const latestByStep = new Map<string, AgentRun>();
          for (const run of dateRuns) {
            latestByStep.set(run.step, run);
          }
          const doneRun = latestByStep.get('done');
          const overallStatus = doneRun?.status === 'success'
            ? 'success'
            : dateRuns.some((r) => r.status === 'failed')
            ? 'failed'
            : 'running';

          return (
            <div key={date} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              {/* Date header */}
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="font-mono text-sm text-white">{date}</span>
                <StatusBadge status={overallStatus} />
              </div>

              {/* Steps */}
              <div className="divide-y divide-gray-800">
                {STEP_ORDER.map((step) => {
                  const run = latestByStep.get(step);
                  if (!run) return null;
                  return (
                    <div key={step} className="px-5 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 w-32">
                          {STEP_LABELS[step] ?? step}
                        </span>
                        {run.apps_processed > 0 && (
                          <span className="text-xs text-gray-600">{run.apps_processed} apps</span>
                        )}
                        {run.reviews_processed > 0 && (
                          <span className="text-xs text-gray-600">{run.reviews_processed} reviews</span>
                        )}
                        {run.error && (
                          <span className="text-xs text-red-400 truncate max-w-sm">{run.error}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600">
                          {formatDistanceToNow(parseISO(run.started_at), { addSuffix: true })}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
