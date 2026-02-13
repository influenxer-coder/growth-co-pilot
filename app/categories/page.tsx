'use client';

import { useEffect, useState, useCallback } from 'react';
import { ComplaintBarChart } from '@/components/charts/ComplaintBarChart';

interface Complaint {
  id: string;
  complaint_text: string;
  complaint_category: string;
  severity: number;
  run_date: string;
  apps: { name: string; icon_url?: string } | null;
}

const SEVERITY_COLOR: Record<number, string> = {
  1: 'bg-gray-700 text-gray-300',
  2: 'bg-yellow-900/60 text-yellow-300',
  3: 'bg-orange-900/60 text-orange-300',
  4: 'bg-red-900/60 text-red-300',
  5: 'bg-red-700 text-white',
};

export default function CategoriesPage() {
  const [data, setData] = useState<Record<string, Record<string, number>>>({});
  const [selectedAppCat, setSelectedAppCat] = useState<string | null>(null);
  const [selectedComplaintCat, setSelectedComplaintCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<Complaint[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Load category summary data
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        setData(d ?? {});
        const first = Object.keys(d ?? {})[0];
        if (first) setSelectedAppCat(first);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load reviews whenever app category, complaint category, or page changes
  const loadReviews = useCallback(
    (appCat: string | null, complaintCat: string | null, p: number) => {
      if (!appCat) return;
      setReviewsLoading(true);
      const params = new URLSearchParams({
        app_category: appCat,
        limit: String(LIMIT),
        page: String(p),
      });
      if (complaintCat) params.set('complaint_category', complaintCat);

      fetch(`/api/complaints?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setReviews(d.data ?? []);
          setReviewsTotal(d.total ?? 0);
        })
        .finally(() => setReviewsLoading(false));
    },
    []
  );

  useEffect(() => {
    setPage(1);
    loadReviews(selectedAppCat, selectedComplaintCat, 1);
  }, [selectedAppCat, selectedComplaintCat, loadReviews]);

  useEffect(() => {
    loadReviews(selectedAppCat, selectedComplaintCat, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAppCatClick = (cat: string) => {
    setSelectedAppCat(cat);
    setSelectedComplaintCat(null);
  };

  const handleBarClick = (name: string) => {
    setSelectedComplaintCat((prev) => (prev === name ? null : name));
  };

  const appCategories = Object.entries(data)
    .map(([cat, complaints]) => ({
      name: cat,
      total: Object.values(complaints).reduce((s, n) => s + n, 0),
      breakdown: complaints,
    }))
    .sort((a, b) => b.total - a.total);

  const totalPages = Math.ceil(reviewsTotal / LIMIT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">By App Category</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Click a bar to drill into complaints — click again to clear
        </p>
      </div>

      {loading && <div className="text-center py-24 text-gray-500">Loading...</div>}

      {!loading && appCategories.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-500">
          No data yet — run the agent first.
        </div>
      )}

      {!loading && appCategories.length > 0 && (
        <>
          {/* Top section: sidebar + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: app category list */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-1">
              <p className="text-xs text-gray-500 px-2 pb-2">App Categories</p>
              {appCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleAppCatClick(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    selectedAppCat === cat.name
                      ? 'bg-blue-900/50 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-gray-500">{cat.total}</span>
                </button>
              ))}
            </div>

            {/* Right: chart */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6">
              {selectedAppCat && data[selectedAppCat] ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-base font-semibold text-white">{selectedAppCat}</h2>
                    {selectedComplaintCat && (
                      <button
                        onClick={() => setSelectedComplaintCat(null)}
                        className="text-xs text-gray-500 hover:text-white transition-colors"
                      >
                        ✕ Clear filter
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {appCategories.find((c) => c.name === selectedAppCat)?.total ?? 0} total complaints
                    {selectedComplaintCat && (
                      <span className="ml-2 text-blue-400">· Showing: {selectedComplaintCat}</span>
                    )}
                  </p>
                  <ComplaintBarChart
                    data={data[selectedAppCat]}
                    selectedBar={selectedComplaintCat}
                    onBarClick={handleBarClick}
                  />
                </>
              ) : (
                <p className="text-gray-500 text-sm">Select a category</p>
              )}
            </div>
          </div>

          {/* Reviews panel */}
          {selectedAppCat && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  {selectedComplaintCat
                    ? `${selectedComplaintCat} complaints in ${selectedAppCat}`
                    : `All complaints in ${selectedAppCat}`}
                </h3>
                <span className="text-xs text-gray-500">{reviewsTotal} total</span>
              </div>

              {reviewsLoading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">No complaints found.</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-gray-800 bg-gray-800/40 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            {r.apps?.icon_url && (
                              <img
                                src={r.apps.icon_url}
                                alt=""
                                className="w-6 h-6 rounded"
                              />
                            )}
                            <span className="text-xs text-gray-400 truncate">
                              {r.apps?.name ?? 'Unknown App'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                SEVERITY_COLOR[r.severity] ?? 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              Severity {r.severity}
                            </span>
                            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                              {r.complaint_category}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{r.complaint_text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Previous
                      </button>
                      <span className="text-xs text-gray-500">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
