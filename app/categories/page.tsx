'use client';

import { useEffect, useState } from 'react';
import { ComplaintBarChart } from '@/components/charts/ComplaintBarChart';

export default function CategoriesPage() {
  const [data, setData] = useState<Record<string, Record<string, number>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        setData(d ?? {});
        const first = Object.keys(d ?? {})[0];
        if (first) setSelected(first);
      })
      .finally(() => setLoading(false));
  }, []);

  const appCategories = Object.entries(data)
    .map(([cat, complaints]) => ({
      name: cat,
      total: Object.values(complaints).reduce((s, n) => s + n, 0),
      breakdown: complaints,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">By App Category</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Complaint breakdown across iOS App Store categories
        </p>
      </div>

      {loading && (
        <div className="text-center py-24 text-gray-500">Loading...</div>
      )}

      {!loading && appCategories.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-500">
          No data yet — run the agent first.
        </div>
      )}

      {!loading && appCategories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: category list */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-1">
            <p className="text-xs text-gray-500 px-2 pb-2">App Categories</p>
            {appCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelected(cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                  selected === cat.name
                    ? 'bg-blue-900/50 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-gray-500">{cat.total}</span>
              </button>
            ))}
          </div>

          {/* Right: breakdown chart */}
          <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6">
            {selected && data[selected] ? (
              <>
                <h2 className="text-base font-semibold text-white mb-1">{selected}</h2>
                <p className="text-xs text-gray-500 mb-4">
                  {appCategories.find((c) => c.name === selected)?.total ?? 0} total complaints today
                </p>
                <ComplaintBarChart data={data[selected]} />
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a category</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
