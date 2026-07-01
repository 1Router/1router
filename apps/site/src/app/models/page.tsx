'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Grid, List, SlidersHorizontal, X, Check, ArrowDownUp, ChevronDown } from 'lucide-react';
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
      className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-md py-2.5 pl-1 pr-2 text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60"
    >
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  );
}

function SortField({
  sortBy,
  onChange,
}: {
  sortBy: SortValue;
  onChange: (v: SortValue) => void;
}) {
  return (
    <div className="relative">
      <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value as SortValue)}
        className="w-full appearance-none rounded-lg border border-border bg-secondary/30 py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 min-h-[44px]"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
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

  // Mobile filter sheet — a true <dialog> that slides up from the bottom on
  // phones and appears as a centered modal on sm+. Backdrop-tap closes it.
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const openFilters = () => filterDialogRef.current?.showModal();
  const closeFilters = () => filterDialogRef.current?.close();

  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) dialog.close();
    };
    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, []);

  // Shared filter body — used by both the desktop sidebar and the mobile sheet.
  const filterBody = (
    <div className="space-y-6">
      {/* Sort by — only on the mobile sheet; desktop has the sort in the toolbar */}
      <div className="lg:hidden">
        <h3 className="mb-3 text-sm font-semibold">Sort by</h3>
        <SortField sortBy={sortBy} onChange={setSortBy} />
      </div>

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
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredModels.length} of {models.length} models
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Reset ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop filters (sticky) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pr-2">
            {filterBody}
          </div>
        </aside>

        {/* Main content */}
        <div>
          {/* Toolbar: search + filters + sort (lg+) + view toggle */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models, providers, descriptions…"
                className="w-full rounded-lg border border-border bg-secondary/30 py-2.5 pl-10 pr-4 text-base outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={openFilters}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="hidden shrink-0 lg:block">
              <SortField sortBy={sortBy} onChange={setSortBy} />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <p className="text-lg font-medium">No models found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-border px-4 text-sm transition-colors hover:bg-secondary"
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

      {/* Mobile filter bottom-sheet — only rendered when the dialog is opened
          (on lg+ this stays display:none and never opens). */}
      <dialog
        ref={filterDialogRef}
        aria-label="Filter models"
        className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-full border-0 bg-background p-0 backdrop:bg-black/45 sm:m-auto sm:h-[85vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl lg:hidden"
      >
        <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden sm:h-full">
          {/* Sticky header */}            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Filters</h2>
              {activeFilterCount > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activeFilterCount} active · {filteredModels.length} of {models.length} match
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={closeFilters}
              aria-label="Close filters"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
            {filterBody}
          </div>

          {/* Sticky footer */}            <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-background px-5 py-4">
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            ) : (
              <div className="flex-1" />
            )}
            <button
              type="button"
              onClick={closeFilters}
              className="inline-flex min-h-[44px] flex-[2] items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Show {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
