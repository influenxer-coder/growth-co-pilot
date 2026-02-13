'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CATEGORY_COLORS } from '@/lib/supabase-client';
import { format, parseISO } from 'date-fns';

interface HistoryRow {
  run_date: string;
  by_complaint_category: Record<string, number>;
  complaints_found: number;
}

interface Props {
  history: HistoryRow[];
}

export function TrendLineChart({ history }: Props) {
  // Build a unified dataset: one entry per date, with all categories as keys
  const allCategories = new Set<string>();
  history.forEach((row) => {
    Object.keys(row.by_complaint_category ?? {}).forEach((c) => allCategories.add(c));
  });

  const chartData = history.map((row) => ({
    date: format(parseISO(row.run_date), 'MMM d'),
    total: row.complaints_found,
    ...Object.fromEntries(
      Array.from(allCategories).map((cat) => [cat, row.by_complaint_category?.[cat] ?? 0])
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
          itemStyle={{ color: '#d1d5db' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
        {Array.from(allCategories).map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat] ?? '#6b7280'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
