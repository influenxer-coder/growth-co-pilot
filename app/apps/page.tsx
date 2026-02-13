'use client';

import { useEffect, useState, useCallback } from 'react';
import { CATEGORY_COLORS } from '@/lib/supabase-client';

interface App {
  app_id: string;
  name: string;
  icon_url?: string;
  app_category: string;
  current_rank?: number;
}

interface Complaint {
  id: string;
  complaint_category: string;
  complaint_text: string;
  severity: number;
  run_date: string;
}

const CATEGORIES = [
  'Bugs/Crashes', 'Performance', 'UI/UX', 'Pricing/Subscriptions',
  'Missing Features', 'Customer Support', 'Privacy/Security', 'Content Quality',
];

const SEVERITY_COLOR: Record<number, string> = {
  1: 'bg-gray-700 text-gray-300',
  2: 'bg-yellow-900/60 text-yellow-300',
  3: 'bg-orange-900/60 text-orange-300',
  4: 'bg-red-900/60 text-red-300',
  5: 'bg-red-700 text-white',
};

const LIMIT = 25;

export default function AppsPage() {
  // App sidebar state
  const [apps, setApps] = useState<App[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);

  // Complaints panel state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // Load apps list
  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then((d: App[]) => {
        setApps(d ?? []);
        if (d?.length) setSelectedApp(d[0]);
      })
      .finally(() => setAppsLoading(false));
  }, []);

  // Load complaints when app / filter / page changes
  const loadComplaints = useCallback(
    (appId: string, cat: string, p: number) => {
      setComplaintsLoading(true);
      const params = new URLSearchParams({
        app_id: appId,
        limit: String(LIMIT),
        page: String(p),
      });
      if (cat) params.set('complaint_category', cat);
      fetch(`/api/complaints?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setComplaints(d.data ?? []);
          setTotal(d.total ?? 0);
        })
        .finally(() => setComplaintsLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!selectedApp) return;
    setPage(1);
    loadComplaints(selectedApp.app_id, catFilter, 1);
  }, [selectedApp, catFilter, loadComplaints]);

  useEffect(() => {
    if (!selectedApp) return;
    loadComplaints(selectedApp.app_id, catFilter, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectApp = (app: App) => {
    setSelectedApp(app);
    setCatFilter('');
    setPage(1);
  };

  const filteredApps = appSearch
    ? apps.filter((a) => a.name.toLowerCase().includes(appSearch.toLowerCase()))
    : apps;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-gray-800">
      {/* ── Left sidebar: app list (1/4) ───────────────────────────── */}
      <div className="w-1/4 min-w-48 flex flex-col border-r border-gray-800 bg-gray-900">
        {/* Search */}
        <div className="p-3 border-b border-gray-800">
          <input
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            placeholder="Search apps..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto">
          {appsLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No apps found</div>
          ) : (
            filteredApps.map((app) => (
              <button
                key={app.app_id}
                onClick={() => handleSelectApp(app)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-gray-800/50 ${
                  selectedApp?.app_id === app.app_id
                    ? 'bg-blue-900/40 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {app.icon_url ? (
                  <img src={app.icon_url} alt="" className="w-7 h-7 rounded-lg shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gray-700 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{app.name}</p>
                  <p className="text-[10px] text-gray-600 truncate">{app.app_category}</p>
                </div>
                {app.current_rank && (
                  <span className="text-[10px] text-gray-600 shrink-0">#{app.current_rank}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main panel: complaints (3/4) ────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-900/50 min-w-0">
        {selectedApp ? (
          <>
            {/* Header + filter bar */}
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedApp.icon_url && (
                  <img src={selectedApp.icon_url} alt="" className="w-9 h-9 rounded-xl shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">{selectedApp.name}</h2>
                  <p className="text-xs text-gray-500">{selectedApp.app_category} · {total} complaints</p>
                </div>
              </div>

              {/* Complaint category filter */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => setCatFilter('')}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    catFilter === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCatFilter(cat); setPage(1); }}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      catFilter === cat
                        ? 'text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                    style={
                      catFilter === cat
                        ? { backgroundColor: CATEGORY_COLORS[cat] ?? '#3b82f6' }
                        : undefined
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Complaints list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {complaintsLoading ? (
                <div className="text-center py-16 text-gray-500 text-sm">Loading reviews...</div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">No complaints found.</div>
              ) : (
                complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-lg border border-gray-800 bg-gray-900 space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[c.complaint_category]}22`,
                          color: CATEGORY_COLORS[c.complaint_category] ?? '#6b7280',
                        }}
                      >
                        {c.complaint_category}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          SEVERITY_COLOR[c.severity] ?? 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        Severity {c.severity}
                      </span>
                      <span className="text-xs text-gray-600 ml-auto">{c.run_date}</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">{c.complaint_text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select an app to view complaints
          </div>
        )}
      </div>
    </div>
  );
}
