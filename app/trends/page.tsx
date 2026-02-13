'use client';

import { useEffect, useState } from 'react';
import { TrendLineChart } from '@/components/charts/TrendLineChart';

interface HistoryRow {
  run_date: string;
  complaints_found: number;
  reviews_processed: number;
  apps_scraped: number;
  by_complaint_category: Record<string, number>;
  status: string;
}

export default function TrendsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/summary/history?days=${days}`)
      .then((r) => r.json())
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Complaint Trends</h1>
          <p className="text-gray-400 mt-1 text-sm">How complaint categories change over time</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Complaints Over Time (by type)</h2>
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No data yet</div>
        ) : (
          <TrendLineChart history={history} />
        )}
      </div>

      {/* Daily totals table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Daily Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Date</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Apps</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Reviews</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Complaints</th>
                <th className="text-left py-2 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((row) => (
                <tr key={row.run_date} className="border-b border-gray-800/50">
                  <td className="py-2.5 pr-4 text-gray-300 font-mono text-xs">{row.run_date}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-400">{row.apps_scraped}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-400">{row.reviews_processed}</td>
                  <td className="py-2.5 pr-4 text-right text-white font-medium">{row.complaints_found}</td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.status === 'complete' ? 'bg-green-900 text-green-300' :
                      row.status === 'failed'   ? 'bg-red-900 text-red-300' :
                      row.status === 'running'  ? 'bg-blue-900 text-blue-300' :
                                                  'bg-gray-700 text-gray-400'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
