'use client';

import { useEffect, useState, useCallback } from 'react';

interface Company {
  id: string;
  name: string;
  job_count: number;
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

const OPP_COLORS = [
  { bg: 'bg-violet-900/40', border: 'border-violet-700/50', text: 'text-violet-300', dot: 'bg-violet-400' },
  { bg: 'bg-cyan-900/40',   border: 'border-cyan-700/50',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  { bg: 'bg-amber-900/40',  border: 'border-amber-700/50',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  { bg: 'bg-emerald-900/40',border: 'border-emerald-700/50',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  { bg: 'bg-rose-900/40',   border: 'border-rose-700/50',   text: 'text-rose-300',   dot: 'bg-rose-400' },
  { bg: 'bg-sky-900/40',    border: 'border-sky-700/50',    text: 'text-sky-300',    dot: 'bg-sky-400' },
  { bg: 'bg-orange-900/40', border: 'border-orange-700/50', text: 'text-orange-300', dot: 'bg-orange-400' },
  { bg: 'bg-teal-900/40',   border: 'border-teal-700/50',   text: 'text-teal-300',   dot: 'bg-teal-400' },
  { bg: 'bg-pink-900/40',   border: 'border-pink-700/50',   text: 'text-pink-300',   dot: 'bg-pink-400' },
  { bg: 'bg-lime-900/40',   border: 'border-lime-700/50',   text: 'text-lime-300',   dot: 'bg-lime-400' },
];

const LEVEL_COLOR: Record<string, string> = {
  'Entry Level': 'bg-green-900/40 text-green-300',
  'Associate':   'bg-blue-900/40 text-blue-300',
  'Mid Level':   'bg-yellow-900/40 text-yellow-300',
};

export default function PMJobsPage() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [jobs, setJobs] = useState<PMJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Load outcomes + companies on mount
  useEffect(() => {
    fetch('/api/pm-outcomes')
      .then((r) => r.json())
      .then((d: Outcome[]) => setOutcomes(d ?? []))
      .finally(() => setOutcomesLoading(false));

    fetch('/api/pm-companies')
      .then((r) => r.json())
      .then((d: Company[]) => setCompanies(d ?? []));
  }, []);

  // Load jobs whenever selection changes
  const loadJobs = useCallback((outcome: Outcome | null, company: Company | null) => {
    if (!outcome && !company) { setJobs([]); return; }
    setJobsLoading(true);
    setExpandedJob(null);

    const params = new URLSearchParams();
    // When both selected: pass outcome IDs + company filter → server applies AND
    if (outcome && outcome.job_ids.length > 0) params.set('ids', outcome.job_ids.join(','));
    if (company) params.set('company_id', company.id);

    fetch(`/api/pm-jobs?${params}`)
      .then((r) => r.json())
      .then((d: PMJob[]) => setJobs(d ?? []))
      .finally(() => setJobsLoading(false));
  }, []);

  useEffect(() => {
    loadJobs(selectedOutcome, selectedCompany);
  }, [selectedOutcome, selectedCompany, loadJobs]);

  const handleSelectOutcome = (o: Outcome) => {
    setSelectedOutcome((prev) => (prev?.id === o.id ? null : o));
  };

  const handleSelectCompany = (c: Company) => {
    setSelectedCompany((prev) => (prev?.id === c.id ? null : c));
  };

  const clearAll = () => { setSelectedOutcome(null); setSelectedCompany(null); };

  const filteredCompanies = compSearch
    ? companies.filter((c) => c.name.toLowerCase().includes(compSearch.toLowerCase()))
    : companies;

  const hasSelection = selectedOutcome || selectedCompany;

  const companiesHit = jobs.length > 0 ? new Set(jobs.map((j) => j.company_id)).size : 0;

  const jobsHeader = (() => {
    if (selectedOutcome && selectedCompany)
      return `${selectedCompany.name} · ${selectedOutcome.title} · ${jobs.length} jobs`;
    if (selectedOutcome)
      return `${selectedOutcome.title} · ${jobs.length} jobs across ${companiesHit} companies`;
    if (selectedCompany)
      return `${selectedCompany.name} · ${jobs.length} PM jobs`;
    return '';
  })();

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-gray-800">

      {/* ── Col 1: Outcomes (1/4) ─────────────────────────────────────────── */}
      <div className="w-1/4 min-w-48 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">APM Outcomes</p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {outcomes.length > 0
                ? `${outcomes.length} cross-company · by job count`
                : 'What an AI PM must own'}
            </p>
          </div>
          {hasSelection && (
            <button onClick={clearAll} className="text-[10px] text-blue-400 hover:text-blue-300">Clear ×</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {outcomesLoading ? (
            <p className="text-xs text-gray-600 text-center mt-8">Loading...</p>
          ) : outcomes.length === 0 ? (
            <div className="text-center mt-8 space-y-1">
              <p className="text-xs text-gray-600">No outcomes yet.</p>
              <p className="text-[10px] text-gray-700">Run <code className="text-gray-500">npm run pm-agent</code></p>
            </div>
          ) : (
            outcomes.map((o, i) => {
              const color = OPP_COLORS[i % OPP_COLORS.length];
              const isSelected = selectedOutcome?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => handleSelectOutcome(o)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${color.bg} ${color.border} ${
                    isSelected ? 'ring-1 ring-white/20 opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${color.text}`}>{o.title}</p>
                      {o.description && (
                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
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

      {/* ── Col 2: Companies (1/4) ────────────────────────────────────────── */}
      <div className="w-1/4 min-w-44 flex flex-col border-r border-gray-800 bg-gray-900/70">
        <div className="p-3 border-b border-gray-800 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">Companies</p>
          <input
            value={compSearch}
            onChange={(e) => setCompSearch(e.target.value)}
            placeholder="Filter companies..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs">No companies yet</div>
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

      {/* ── Col 3: Jobs (1/2) ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-900/50 min-w-0">
        {hasSelection ? (
          <>
            <div className="px-5 py-4 border-b border-gray-800">
              <p className="text-sm font-semibold text-white">{jobsHeader}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {jobsLoading ? (
                <div className="text-center py-16 text-gray-500 text-sm">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">No matching jobs.</div>
              ) : (
                jobs.map((job) => {
                  const isExpanded = expandedJob === job.id;
                  return (
                    <div key={job.id} className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white leading-snug">{job.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-400 font-medium">{job.company_name}</span>
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
                        <span className="text-gray-600 text-xs shrink-0 mt-0.5">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-800">
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line mt-3 max-h-72 overflow-y-auto">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-8">
            <p className="text-gray-400 text-sm font-medium">Select an outcome or company</p>
            <p className="text-gray-600 text-xs">Outcomes are cross-company themes · select both to intersect</p>
          </div>
        )}
      </div>
    </div>
  );
}
