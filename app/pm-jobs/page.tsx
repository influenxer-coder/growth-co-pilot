'use client';

import { useEffect, useState, useCallback } from 'react';

interface Company {
  id: string;
  name: string;
  job_count: number;
  last_scraped: string;
}

interface PMJob {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  location?: string;
  level?: string;
  url?: string;
  posted_date?: string;
  description?: string;
}

interface Outcome {
  id: string;
  title: string;
  description?: string;
  job_count: number;
  job_ids: string[];
}

// Cycling accent colours for outcome cards
const OPP_COLORS = [
  { bg: 'bg-violet-900/40', border: 'border-violet-700/50', text: 'text-violet-300', dot: 'bg-violet-400' },
  { bg: 'bg-cyan-900/40',   border: 'border-cyan-700/50',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  { bg: 'bg-amber-900/40',  border: 'border-amber-700/50',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  { bg: 'bg-emerald-900/40',border: 'border-emerald-700/50',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  { bg: 'bg-rose-900/40',   border: 'border-rose-700/50',   text: 'text-rose-300',   dot: 'bg-rose-400' },
];

const LEVEL_COLOR: Record<string, string> = {
  'Entry Level': 'bg-green-900/40 text-green-300',
  'Associate':   'bg-blue-900/40 text-blue-300',
  'Mid Level':   'bg-yellow-900/40 text-yellow-300',
};

export default function PMJobsPage() {
  // Company sidebar
  const [companies, setCompanies] = useState<Company[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Outcomes panel
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [outcomesLoading, setOutcomesLoading] = useState(false);

  // Jobs panel
  const [jobs, setJobs] = useState<PMJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Load companies
  useEffect(() => {
    fetch('/api/pm-companies')
      .then((r) => r.json())
      .then((d: Company[]) => {
        setCompanies(d ?? []);
        if (d?.length) setSelectedCompany(d[0]);
      })
      .finally(() => setCompaniesLoading(false));
  }, []);

  // Load outcomes when company changes
  useEffect(() => {
    if (!selectedCompany) return;
    setSelectedOutcome(null);
    setOutcomes([]);
    setOutcomesLoading(true);
    fetch(`/api/pm-outcomes?company_id=${encodeURIComponent(selectedCompany.id)}`)
      .then((r) => r.json())
      .then((d: Outcome[]) => setOutcomes(d ?? []))
      .finally(() => setOutcomesLoading(false));
  }, [selectedCompany]);

  // Load jobs when company or outcome changes
  const loadJobs = useCallback((companyId: string, outcome: Outcome | null) => {
    setJobsLoading(true);
    setExpandedJob(null);
    const params = new URLSearchParams({ company_id: companyId });
    if (outcome && outcome.job_ids.length > 0) {
      params.set('ids', outcome.job_ids.join(','));
    }
    fetch(`/api/pm-jobs?${params}`)
      .then((r) => r.json())
      .then((d: PMJob[]) => setJobs(d ?? []))
      .finally(() => setJobsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    loadJobs(selectedCompany.id, selectedOutcome);
  }, [selectedCompany, selectedOutcome, loadJobs]);

  const handleSelectCompany = (c: Company) => {
    setSelectedCompany(c);
    setSelectedOutcome(null);
  };

  const handleSelectOutcome = (o: Outcome) => {
    if (selectedOutcome?.id === o.id) {
      setSelectedOutcome(null);
    } else {
      setSelectedOutcome(o);
    }
  };

  const filteredCompanies = compSearch
    ? companies.filter((c) => c.name.toLowerCase().includes(compSearch.toLowerCase()))
    : companies;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-gray-800">

      {/* ── Col 1: Company list (1/4) ──────────────────────────────────────── */}
      <div className="w-1/4 min-w-44 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-3 border-b border-gray-800 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">Software Companies</p>
          <input
            value={compSearch}
            onChange={(e) => setCompSearch(e.target.value)}
            placeholder="Search companies..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {companiesLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>No companies yet.</p>
              <p className="text-xs mt-1 text-gray-600">Run <code className="text-gray-500">npm run pm-agent</code></p>
            </div>
          ) : (
            filteredCompanies.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCompany(c)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-gray-800/50 ${
                  selectedCompany?.id === c.id
                    ? 'bg-blue-900/40 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {/* Company initial avatar */}
                <div className="w-7 h-7 rounded-lg bg-gray-700 shrink-0 flex items-center justify-center text-xs font-bold text-gray-300">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-600">{c.job_count} {c.job_count === 1 ? 'job' : 'jobs'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Col 2: Outcomes (1/4) ─────────────────────────────────────────── */}
      <div className="w-1/4 min-w-44 flex flex-col border-r border-gray-800 bg-gray-900/70">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">APM Outcomes</p>
          <p className="text-[10px] text-gray-600 mt-0.5">What this AI PM must drive</p>
          {selectedOutcome && (
            <button
              onClick={() => setSelectedOutcome(null)}
              className="mt-1 text-[10px] text-blue-400 hover:text-blue-300"
            >
              ← Show all jobs
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!selectedCompany ? (
            <p className="text-xs text-gray-600 text-center mt-8">Select a company</p>
          ) : outcomesLoading ? (
            <p className="text-xs text-gray-600 text-center mt-8">Analysing...</p>
          ) : outcomes.length === 0 ? (
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-gray-600">No outcomes yet.</p>
              <p className="text-[10px] text-gray-700">Run the agent to generate them.</p>
            </div>
          ) : (
            outcomes.map((o, i) => {
              const color = OPP_COLORS[i % OPP_COLORS.length];
              const isSelected = selectedOutcome?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => handleSelectOutcome(o)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${color.bg} ${color.border} ${
                    isSelected ? 'ring-1 ring-white/20 shadow-lg' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${color.text}`}>{o.title}</p>
                      {o.description && (
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-3">
                          {o.description}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1.5">
                        {o.job_count} {o.job_count === 1 ? 'job' : 'jobs'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Col 3: Jobs (1/2) ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-900/50 min-w-0">
        {selectedCompany ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-700 shrink-0 flex items-center justify-center text-sm font-bold text-gray-200">
                {selectedCompany.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">{selectedCompany.name}</h2>
                <p className="text-xs text-gray-500">
                  {selectedOutcome
                    ? `${selectedOutcome.title} · ${jobs.length} jobs`
                    : `${jobs.length} entry-level PM jobs`}
                </p>
              </div>
              {selectedCompany.last_scraped && (
                <span className="ml-auto text-[10px] text-gray-600 shrink-0">
                  Scraped {selectedCompany.last_scraped}
                </span>
              )}
            </div>

            {/* Job list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {jobsLoading ? (
                <div className="text-center py-16 text-gray-500 text-sm">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">No jobs found.</div>
              ) : (
                jobs.map((job) => {
                  const isExpanded = expandedJob === job.id;
                  return (
                    <div
                      key={job.id}
                      className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden"
                    >
                      {/* Job header — always visible */}
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white leading-snug">{job.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {job.level && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${LEVEL_COLOR[job.level] ?? 'bg-gray-700 text-gray-400'}`}>
                                {job.level}
                              </span>
                            )}
                            {job.location && (
                              <span className="text-[10px] text-gray-500">{job.location}</span>
                            )}
                            {job.posted_date && (
                              <span className="text-[10px] text-gray-600 ml-auto">
                                {new Date(job.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs shrink-0 mt-0.5">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Expanded description */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-800">
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line mt-3 max-h-64 overflow-y-auto">
                            {job.description ?? 'No description available.'}
                          </p>
                          {job.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              View on The Muse →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a company to view jobs
          </div>
        )}
      </div>
    </div>
  );
}
