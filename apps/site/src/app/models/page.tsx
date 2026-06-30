'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Grid, List, SlidersHorizontal, X, Check } from 'lucide-react';
import { models, providers, seriesList, modalityOptions, modelUrl, providerColors, type Model } from '@1router/models';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
  { value: 'context-high', label: 'Context: High → Low' },
  { value: 'name', label: 'Name: A → Z' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

function formatContext(length: number) {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(length % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(length / 1000)}K`;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(0)}`;
}

function ModelRow({ model }: { model: Model }) {
  return (
    <Link href={modelUrl(model)} className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
      {/* Provider badge */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground'
        )}
      >
        {model.provider.charAt(0)}
      </div>

      {/* Name + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{model.name}</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {model.series}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{model.description}</p>
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-6 text-sm md:flex">
        <div className="text-center">
          <div className="font-semibold">{formatContext(model.contextLength)}</div>
          <div className="text-xs text-muted-foreground">context</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{formatPrice(model.pricing.input)}</div>
          <div className="text-xs text-muted-foreground">in/M</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{formatPrice(model.pricing.output)}</div>
          <div className="text-xs text-muted-foreground">out/M</div>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex flex-col items-end text-right text-xs md:hidden">
        <span className="font-medium">{formatContext(model.contextLength)}</span>
        <span className="text-muted-foreground">{formatPrice(model.pricing.input)}/M in</span>
      </div>
    </Link>
  );
}

function ModelCard({ model }: { model: Model }) {
  return (
    <Link href={modelUrl(model)} className="group flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold',
              providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground'
            )}
          >
            {model.provider.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{model.name}</h3>
            <p className="text-xs text-muted-foreground">{model.provider}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {model.series}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">{model.description}</p>

      <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
        <div>
          <div className="text-sm font-semibold">{formatContext(model.contextLength)}</div>
          <div className="text-[10px] text-muted-foreground">context</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{formatPrice(model.pricing.input)}</div>
          <div className="text-[10px] text-muted-foreground">in/M</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{formatPrice(model.pricing.output)}</div>
          <div className="text-[10px] text-muted-foreground">out/M</div>
        </div>
      </div>
    </Link>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full cursor-pointer items-center gap-2.5 py-1 text-left"
    >
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  );
}

export default function ModelsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('newest');
  const [contextLength, setContextLength] = useState(2_000_000);
  const [maxPrice, setMaxPrice] = useState(20);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleProvider = (p: string) =>
    setSelectedProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleSeries = (s: string) =>
    setSelectedSeries((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleModality = (m: string) =>
    setSelectedModalities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const resetFilters = () => {
    setFilterQuery('');
    setContextLength(2_000_000);
    setMaxPrice(20);
    setSelectedProviders([]);
    setSelectedSeries([]);
    setSelectedModalities([]);
  };

  const activeFilterCount =
    selectedProviders.length + selectedSeries.length + selectedModalities.length +
    (contextLength < 2_000_000 ? 1 : 0) + (maxPrice < 20 ? 1 : 0);

  const filteredModels = useMemo(() => {
    const filtered = models
      .filter((m) => {
        const q = filterQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
        );
      })
      .filter((m) => m.contextLength <= contextLength)
      .filter((m) => m.pricing.input <= maxPrice)
      .filter((m) => selectedProviders.length === 0 || selectedProviders.includes(m.provider))
      .filter((m) => selectedSeries.length === 0 || selectedSeries.includes(m.series))
      .filter((m) => selectedModalities.length === 0 || m.modality.some((mod) => selectedModalities.includes(mod)));

    switch (sortBy) {
      case 'price-low':
        return [...filtered].sort((a, b) => a.pricing.input - b.pricing.input);
      case 'price-high':
        return [...filtered].sort((a, b) => b.pricing.input - a.pricing.input);
      case 'context-high':
        return [...filtered].sort((a, b) => b.contextLength - a.contextLength);
      case 'name':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return [...filtered].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
    }
  }, [filterQuery, contextLength, maxPrice, selectedProviders, selectedSeries, selectedModalities, sortBy]);

  const sidebar = (
    <div className="space-y-6">
      {/* Providers */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Providers</h3>
        <div className="space-y-0.5">
          {providers.map((p) => (
            <FilterCheckbox
              key={p}
              label={p}
              checked={selectedProviders.includes(p)}
              onChange={() => toggleProvider(p)}
            />
          ))}
        </div>
      </div>

      {/* Context length */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Max Context Length</h3>
        <input
          type="range"
          className="w-full accent-primary"
          min={8000}
          max={2000000}
          step={8000}
          value={contextLength}
          onChange={(e) => setContextLength(Number(e.target.value))}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>8K</span>
          <span className="font-medium text-foreground">{formatContext(contextLength)}</span>
          <span>2M</span>
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Max Input Price</h3>
        <input
          type="range"
          className="w-full accent-primary"
          min={0}
          max={20}
          step={0.1}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Free</span>
          <span className="font-medium text-foreground">${maxPrice.toFixed(1)}/M</span>
          <span>$20+</span>
        </div>
      </div>

      {/* Series */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Series</h3>
        <div className="space-y-0.5">
          {seriesList.map((s) => (
            <FilterCheckbox
              key={s}
              label={s}
              checked={selectedSeries.includes(s)}
              onChange={() => toggleSeries(s)}
            />
          ))}
        </div>
      </div>

      {/* Modality */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Modality</h3>
        <div className="space-y-0.5">
          {modalityOptions.map((m) => (
            <FilterCheckbox
              key={m}
              label={m}
              checked={selectedModalities.includes(m)}
              onChange={() => toggleModality(m)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredModels.length} of {models.length} models
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Reset ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pr-2">
            {sidebar}
          </div>
        </aside>

        {/* Main content */}
        <div>
          {/* Search + sort + view toggle */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models, providers, descriptions…"
                className="w-full rounded-lg border border-border bg-secondary/30 py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortValue)}
              className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none transition-colors hover:bg-secondary"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-2 transition-colors',
                  viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-2 transition-colors',
                  viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile filters drawer */}
          {showFilters && (
            <div className="mb-6 rounded-xl border border-border/60 bg-card p-5 lg:hidden">
              {sidebar}
            </div>
          )}

          {/* Results */}
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <p className="text-lg font-medium">No models found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
              <button
                onClick={resetFilters}
                className="mt-4 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredModels.map((model) => (
                <ModelRow key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
