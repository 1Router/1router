'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';
import { models, modelUrl, providerColors } from '@1router/models';
import { cn } from '@/lib/utils';

interface RankingEntry {
  modelId: string;
  tokens: { '24h': number; '7d': number; '30d': number; all: number };
  change: { '24h': number | null; '7d': number | null; '30d': number | null; all: null };
  requests: { '24h': number; '7d': number; '30d': number; all: number };
}

const timeRanges = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
] as const;

type TimeRange = (typeof timeRanges)[number]['value'];
type SortColumn = 'rank' | 'tokens' | 'change';

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-medium text-muted-foreground">New</span>;
  }
  if (value > 0) {
    return <span className="inline-flex items-center gap-0.5 font-medium text-emerald-500"><ArrowUp className="h-3 w-3" />{value.toFixed(1)}%</span>;
  }
  if (value < 0) {
    return <span className="inline-flex items-center gap-0.5 font-medium text-red-500"><ArrowDown className="h-3 w-3" />{Math.abs(value).toFixed(1)}%</span>;
  }
  return <span className="inline-flex items-center gap-0.5 font-medium text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
}

export default function RankingsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortColumn>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reportingNote, setReportingNote] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/rankings', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Rankings request failed: ${response.status}`);
        return response.json() as Promise<{ data?: RankingEntry[]; reportingNote?: string; available?: boolean }>;
      })
      .then((payload) => {
        setRankings(payload.data || []);
        setReportingNote(payload.reportingNote || '');
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('rankings request failed', error);
        setStatus('error');
      });
    return () => controller.abort();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir((previous) => previous === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir(column === 'rank' ? 'asc' : 'desc');
    }
  };

  const filteredRankings = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = rankings.filter((entry) => {
      const model = models.find((item) => item.id === entry.modelId);
      return Boolean(model && (model.name.toLowerCase().includes(query) || model.provider.toLowerCase().includes(query)));
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'tokens') comparison = a.tokens[timeRange] - b.tokens[timeRange];
      else if (sortBy === 'change') comparison = (a.change[timeRange] ?? Number.NEGATIVE_INFINITY) - (b.change[timeRange] ?? Number.NEGATIVE_INFINITY);
      else comparison = b.tokens[timeRange] - a.tokens[timeRange];
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return sorted.map((entry, index) => ({ entry, rank: index + 1 }));
  }, [rankings, searchQuery, sortBy, sortDir, timeRange]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verified model usage recorded by this 1Router deployment.</p>
      </div>

      <div className="mb-6 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        {status === 'loading' && 'Loading verified usage…'}
        {status === 'error' && 'Verified usage is temporarily unavailable. Refresh the page to try again.'}
        {status === 'ready' && (reportingNote || 'Rankings are based on successful authenticated proxy requests. Anonymous and direct-gateway traffic is excluded.')}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Ranking time range" className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 p-1">
          {timeRanges.map((range) => (
            <button key={range.value} type="button" role="tab" aria-selected={timeRange === range.value} onClick={() => setTimeRange(range.value)} className={cn('min-h-[40px] rounded-md px-4 py-1.5 text-sm font-medium transition-all', timeRange === range.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {range.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Search models" placeholder="Search models…" className="min-h-[44px] w-full rounded-lg border border-border bg-secondary/30 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
        </div>
      </div>

      {status === 'ready' && filteredRankings.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead><tr className="border-b border-border/60 bg-secondary/30">
                <th className="px-4 py-3 text-left"><button type="button" onClick={() => handleSort('rank')} aria-label="Sort by rank" className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank {sortBy === 'rank' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-right"><button type="button" onClick={() => handleSort('tokens')} aria-label="Sort by tokens" className="ml-auto inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tokens {sortBy === 'tokens' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button></th>
                <th className="px-4 py-3 text-right"><button type="button" onClick={() => handleSort('change')} aria-label="Sort by change" className="ml-auto inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change {sortBy === 'change' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button></th>
              </tr></thead>
              <tbody>{filteredRankings.map(({ entry, rank }) => {
                const model = models.find((item) => item.id === entry.modelId);
                if (!model) return null;
                return <tr key={entry.modelId} className="border-b border-border/40 transition-colors last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3"><span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold', rank <= 3 ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>{rank}</span></td>
                  <td className="px-4 py-3"><Link href={modelUrl(model)} className="flex items-center gap-3"><div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground')}>{model.provider.charAt(0)}</div><div><div className="text-sm font-medium hover:text-primary">{model.name}</div><div className="text-xs text-muted-foreground">{model.provider}</div></div></Link></td>
                  <td className="px-4 py-3 text-right"><span className="font-semibold">{formatTokens(entry.tokens[timeRange])}</span><span className="ml-1 text-xs text-muted-foreground">tokens</span></td>
                  <td className="px-4 py-3 text-right"><ChangeIndicator value={entry.change[timeRange]} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {status === 'loading' && <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground" aria-busy="true"><RefreshCw className="h-4 w-4 animate-spin" />Loading rankings</div>}
      {status === 'ready' && filteredRankings.length === 0 && <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center"><h2 className="text-lg font-semibold">{searchQuery ? 'No models match your search' : 'No verified rankings yet'}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{searchQuery ? 'Try a different model or provider name.' : 'This deployment will populate rankings after authenticated requests have completed through the site proxy. No synthetic values are shown.'}</p></div>}
      {status === 'error' && <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center"><h2 className="text-lg font-semibold">Rankings unavailable</h2><p className="mt-2 text-sm text-muted-foreground">The usage database could not be queried.</p></div>}
    </div>
  );
}
