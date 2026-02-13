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

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  review_count: number;
  complaint_ids: string[];
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

// Opportunity accent colours (cycling)
const OPP_COLORS = [
  { bg: 'bg-violet-900/40', border: 'border-violet-700/50', text: 'text-violet-300', dot: 'bg-violet-400' },
  { bg: 'bg-cyan-900/40',   border: 'border-cyan-700/50',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  { bg: 'bg-amber-900/40',  border: 'border-amber-700/50',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  { bg: 'bg-emerald-900/40',border: 'border-emerald-700/50',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  { bg: 'bg-rose-900/40',   border: 'border-rose-700/50',   text: 'text-rose-300',   dot: 'bg-rose-400' },
];

const LIMIT = 25;

export default function AppsPage() {
  // App sidebar state
  const [apps, setApps] = useState<App[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);

  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [oppsLoading, setOppsLoading] = useState(false);

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

  // Load opportunities when app changes
  useEffect(() => {
    if (!selectedApp) return;
    setSelectedOpportunity(null);
    setOpportunities([]);
    setOppsLoading(true);
    fetch(`/api/opportunities?app_id=${encodeURIComponent(selectedApp.app_id)}`)
      .then((r) => r.json())
      .then((d: Opportunity[]) => setOpportunities(d ?? []))
      .finally(() => setOppsLoading(false));
  }, [selectedApp]);

  // Load complaints when app / filter / page / selected opportunity changes
  const loadComplaints = useCallback(
    (appId: string, cat: string, p: number, opp: Opportunity | null) => {
      setComplaintsLoading(true);
      const params = new URLSearchParams({
        app_id: appId,
        limit: String(LIMIT),
        page: String(p),
      });
      if (cat) params.set('complaint_category', cat);
      if (opp && opp.complaint_ids.length > 0) {
        params.set('ids', opp.complaint_ids.join(','));
      }
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
    loadComplaints(selectedApp.app_id, catFilter, 1, selectedOpportunity);
  }, [selectedApp, catFilter, selectedOpportunity, loadComplaints]);

  useEffect(() => {
    if (!selectedApp) return;
    loadComplaints(selectedApp.app_id, catFilter, page, selectedOpportunity);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectApp = (app: App) => {
    setSelectedApp(app);
    setCatFilter('');
    setPage(1);
    setSelectedOpportunity(null);
  };

  const handleSelectOpportunity = (opp: Opportunity) => {
    if (selectedOpportunity?.id === opp.id) {
      // Deselect — show all complaints
      setSelectedOpportunity(null);
    } else {
      setSelectedOpportunity(opp);
      setCatFilter('');
    }
    setPage(1);
  };

  const filteredApps = appSearch
    ? apps.filter((a) => a.name.toLowerCase().includes(appSearch.toLowerCase()))
    : apps;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-gray-800">

      {/* ── Col 1: App list (1/4) ──────────────────────────────────────────── */}
      <div className="w-1/4 min-w-44 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <input
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            placeholder="Search apps..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
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

      {/* ── Col 2: Opportunities (1/4) ────────────────────────────────────── */}
      <div className="w-1/4 min-w-44 flex flex-col border-r border-gray-800 bg-gray-900/70">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Opportunities</p>
          {selectedOpportunity && (
            <button
              onClick={() => { setSelectedOpportunity(null); setPage(1); }}
              className="mt-1 text-[10px] text-blue-400 hover:text-blue-300"
            >
              ← Show all complaints
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!selectedApp ? (
            <p className="text-xs text-gray-600 text-center mt-8">Select an app</p>
          ) : oppsLoading ? (
            <p className="text-xs text-gray-600 text-center mt-8">Analysing...</p>
          ) : opportunities.length === 0 ? (
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-gray-600">No opportunities yet.</p>
              <p className="text-[10px] text-gray-700">Run the agent to generate them.</p>
            </div>
          ) : (
            opportunities.map((opp, i) => {
              const color = OPP_COLORS[i % OPP_COLORS.length];
              const isSelected = selectedOpportunity?.id === opp.id;
              return (
                <button
                  key={opp.id}
                  onClick={() => handleSelectOpportunity(opp)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${color.bg} ${color.border} ${
                    isSelected ? 'ring-1 ring-white/20 shadow-lg' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${color.text}`}>{opp.title}</p>
                      {opp.description && (
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-3">
                          {opp.description}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1.5">
                        {opp.review_count} {opp.review_count === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Col 3: Complaints (1/2) ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-900/50 min-w-0">
        {selectedApp ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedApp.icon_url && (
                  <img src={selectedApp.icon_url} alt="" className="w-9 h-9 rounded-xl shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">{selectedApp.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedApp.app_category}
                    {selectedOpportunity
                      ? ` · ${selectedOpportunity.title}`
                      : ` · ${total} complaints`}
                  </p>
                </div>
              </div>

              {/* Category filter — hidden when an opportunity is active */}
              {!selectedOpportunity && (
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
              )}
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
