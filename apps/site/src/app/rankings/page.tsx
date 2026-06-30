'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { models, modelUrl, providerColors } from '@1router/models';
import { cn } from '@/lib/utils';

interface RankingEntry {
  rank: number;
  modelId: string;
  tokens: { '24h': string; '7d': string; '30d': string; all: string };
  change: { '24h': number; '7d': number; '30d': number; all: number };
}

// Simulated ranking data derived from model list
const rankings: RankingEntry[] = models.map((m, i) => ({
  rank: i + 1,
  modelId: m.id,
  tokens: {
    '24h': `${(Math.random() * 15 + 0.1).toFixed(1)}B`,
    '7d': `${(Math.random() * 80 + 1).toFixed(1)}B`,
    '30d': `${(Math.random() * 300 + 5).toFixed(0)}B`,
    all: `${(Math.random() * 2000 + 10).toFixed(0)}B`,
  },
  change: {
    '24h': parseFloat(((Math.random() - 0.4) * 20).toFixed(1)),
    '7d': parseFloat(((Math.random() - 0.3) * 40).toFixed(1)),
    '30d': parseFloat(((Math.random() - 0.2) * 80).toFixed(1)),
    all: parseFloat(((Math.random() - 0.1) * 200).toFixed(1)),
  },
}));

const timeRanges = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
] as const;

type TimeRange = (typeof timeRanges)[number]['value'];

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-emerald-500">
        <ArrowUp className="h-3 w-3" />
        {value.toFixed(1)}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-red-500">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}

export default function RankingsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'tokens' | 'change'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: 'rank' | 'tokens' | 'change') => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'rank' ? 'asc' : 'desc');
    }
  };

  const filteredRankings = useMemo(() => {
    const filtered = rankings.filter((r) => {
      const model = models.find((m) => m.id === r.modelId);
      if (!model) return false;
      const q = searchQuery.toLowerCase();
      return model.name.toLowerCase().includes(q) || model.provider.toLowerCase().includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'rank') cmp = a.rank - b.rank;
      else if (sortBy === 'tokens') cmp = parseFloat(a.tokens[timeRange]) - parseFloat(b.tokens[timeRange]);
      else if (sortBy === 'change') cmp = a.change[timeRange] - b.change[timeRange];
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [searchQuery, sortBy, sortDir, timeRange]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-world model usage by tokens consumed through 1Router
        </p>
      </div>

      {/* Time range tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                timeRange === range.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search models…"
            className="w-full rounded-lg border border-border bg-secondary/30 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('rank')}
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Rank
                    {sortBy === 'rank' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Model
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('tokens')}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Tokens
                    {sortBy === 'tokens' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('change')}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Change
                    {sortBy === 'change' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRankings.map((entry, idx) => {
                const model = models.find((m) => m.id === entry.modelId);
                if (!model) return null;
                return (
                  <tr
                    key={entry.modelId}
                    className="border-b border-border/40 transition-colors last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold',
                        idx < 3 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      )}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={modelUrl(model)} className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                            providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {model.provider.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium hover:text-primary">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.provider}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{entry.tokens[timeRange]}</span>
                      <span className="ml-1 text-xs text-muted-foreground">tokens</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangeIndicator value={entry.change[timeRange]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRankings.length === 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          No models match your search.
        </div>
      )}
    </div>
  );
}
