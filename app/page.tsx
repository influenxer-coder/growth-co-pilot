'use client';

import { useEffect, useState } from 'react';
import { ComplaintBarChart } from '@/components/charts/ComplaintBarChart';
import { StatusBadge } from '@/components/StatusBadge';
import type { DailySummary } from '@/lib/supabase-client';
import { CATEGORY_COLORS } from '@/lib/supabase-client';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/summary/today')
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Overview</h1>
          <p className="text-gray-400 mt-1 text-sm">{today}</p>
        </div>
        {summary && <StatusBadge status={summary.status} />}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-24 text-gray-500">
          <div className="text-4xl mb-4">⟳</div>
          Loading today&apos;s data...
        </div>
      )}

      {/* No data yet */}
      {!loading && !summary && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <div className="text-4xl mb-4">🕐</div>
          <h2 className="text-lg font-medium text-white mb-2">Agent hasn&apos;t run yet today</h2>
          <p className="text-gray-400 text-sm">
            The agent runs daily at 2:00 AM UTC. You can trigger a manual run from{' '}
            <a href="/runs" className="underline text-blue-400">Agent Runs</a>.
          </p>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Apps Scraped',        value: summary.apps_scraped },
              { label: 'Reviews Analyzed',    value: summary.reviews_processed },
              { label: 'Complaints Found',    value: summary.complaints_found },
              { label: 'App Categories',      value: Object.keys(summary.by_app_category ?? {}).length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="text-2xl font-bold text-white">
                  {stat.value?.toLocaleString() ?? '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Complaint breakdown chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-base font-semibold text-white mb-4">Complaints by Type</h2>
            {summary.by_complaint_category && Object.keys(summary.by_complaint_category).length > 0 ? (
              <ComplaintBarChart data={summary.by_complaint_category} />
            ) : (
              <p className="text-gray-500 text-sm">No complaint data yet.</p>
            )}
          </div>

          {/* Top complaints */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-base font-semibold text-white mb-4">Top Complaints Today</h2>
            <div className="space-y-3">
              {(summary.top_complaints ?? []).slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800">
                  <span className="text-gray-500 text-xs w-5 shrink-0 pt-0.5">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-relaxed">{c.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[c.category]}20`,
                          color: CATEGORY_COLORS[c.category] ?? '#6b7280',
                        }}
                      >
                        {c.category}
                      </span>
                      <span className="text-xs text-gray-500">{c.app}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{c.count}×</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By app category */}
          {summary.by_app_category && Object.keys(summary.by_app_category).length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-base font-semibold text-white mb-4">
                Complaints by App Category
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">App Category</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Total</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Top Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.by_app_category)
                      .sort((a, b) => {
                        const totalA = Object.values(a[1]).reduce((s, n) => s + n, 0);
                        const totalB = Object.values(b[1]).reduce((s, n) => s + n, 0);
                        return totalB - totalA;
                      })
                      .map(([appCat, complaints]) => {
                        const total = Object.values(complaints).reduce((s, n) => s + n, 0);
                        const topIssue = Object.entries(complaints).sort((a, b) => b[1] - a[1])[0];
                        return (
                          <tr key={appCat} className="border-b border-gray-800/50">
                            <td className="py-2.5 pr-4 text-gray-300">{appCat}</td>
                            <td className="py-2.5 pr-4 text-right text-white font-medium">{total}</td>
                            <td className="py-2.5">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[topIssue?.[0]]}20`,
                                  color: CATEGORY_COLORS[topIssue?.[0]] ?? '#6b7280',
                                }}
                              >
                                {topIssue?.[0]} ({topIssue?.[1]})
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
