'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CATEGORY_COLORS } from '@/lib/supabase-client';

interface Complaint {
  id: string;
  complaint_category: string;
  complaint_text: string;
  severity: number;
  run_date: string;
  apps: { name: string; icon_url: string; app_category: string } | null;
}

export default function AppsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      ...(catFilter && { complaint_category: catFilter }),
    });
    fetch(`/api/complaints?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setComplaints(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, catFilter]);

  const filtered = filter
    ? complaints.filter((c) =>
        c.apps?.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.complaint_text.toLowerCase().includes(filter.toLowerCase())
      )
    : complaints;

  const CATEGORIES = [
    'Bugs/Crashes', 'Performance', 'UI/UX', 'Pricing/Subscriptions',
    'Missing Features', 'Customer Support', 'Privacy/Security', 'Content Quality',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">App Complaints</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Browse all extracted complaints · {total.toLocaleString()} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search app name or complaint..."
          className="flex-1 min-w-48 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900">
              {c.apps?.icon_url && (
                <Image
                  src={c.apps.icon_url}
                  alt={c.apps.name ?? ''}
                  width={36}
                  height={36}
                  className="rounded-lg shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400">{c.apps?.name}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600">{c.apps?.app_category}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600 font-mono">{c.run_date}</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{c.complaint_text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[c.complaint_category]}20`,
                      color: CATEGORY_COLORS[c.complaint_category] ?? '#6b7280',
                    }}
                  >
                    {c.complaint_category}
                  </span>
                  <span className="text-xs text-gray-600">
                    severity {c.severity}/5
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Page {page} · {total.toLocaleString()} results</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={complaints.length < 50}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
