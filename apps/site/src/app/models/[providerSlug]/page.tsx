import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Cpu, Globe, Zap, Download } from 'lucide-react';
import { modelUrl, getProviderBySlug, getProviderModels, providerSlugs, providerColors, type Model } from '@1router/models';
import { cn } from '@/lib/utils';

function formatContext(length: number) {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(length % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(length / 1000)}K`;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(0)}`;
}

export function generateStaticParams() {
  return providerSlugs.map((slug) => ({ providerSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerSlug: string }>;
}): Promise<Metadata> {
  const { providerSlug } = await params;
  const provider = getProviderBySlug(providerSlug);
  if (!provider) {
    return { title: 'Provider Not Found' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://1router.com';
  const url = `${siteUrl}/models/${providerSlug}`;

  return {
    title: provider.name,
    description: `All ${provider.modelCount} AI models from ${provider.name} available through 1Router. Compare pricing, context length, and capabilities.`,
    openGraph: {
      type: 'website',
      url,
      title: `${provider.name} — 1Router`,
      description: `All ${provider.modelCount} AI models from ${provider.name} available through 1Router.`,
      siteName: '1Router',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${provider.name} — 1Router`,
      description: `All ${provider.modelCount} AI models from ${provider.name} available through 1Router.`,
    },
    keywords: [provider.name, 'AI models', 'LLM', 'API', 'AI provider', ...provider.series],
  };
}

function ProviderModelCard({ model }: { model: Model }) {
  return (
    <Link
      href={modelUrl(model)}
      className="group flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
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
            <h3 className="text-sm font-semibold leading-tight group-hover:text-primary">{model.name}</h3>
            <p className="text-xs text-muted-foreground">{model.series}</p>
          </div>
        </div>
        {model.freeEndpoint && (
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
            Free
          </span>
        )}
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

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ providerSlug: string }>;
}) {
  const { providerSlug } = await params;
  const provider = getProviderBySlug(providerSlug);
  if (!provider) {
    notFound();
  }

  const providerModels = getProviderModels(providerSlug);
  const freeCount = providerModels.filter((m) => m.freeEndpoint).length;
  const downloadableCount = providerModels.filter((m) => m.downloadable).length;
  const maxContext = Math.max(...providerModels.map((m) => m.contextLength));

  const stats = [
    { icon: Cpu, label: 'Models', value: provider.modelCount.toString() },
    { icon: Globe, label: 'Max Context', value: formatContext(maxContext) },
    { icon: Zap, label: 'Free Endpoints', value: freeCount.toString() },
    { icon: Download, label: 'Downloadable', value: downloadableCount.toString() },
  ];

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/models" className="hover:text-foreground">Models</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{provider.name}</span>
      </nav>

      {/* Back link */}
      <Link
        href="/models"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Models
      </Link>

      {/* Provider header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
              providerColors[providerSlug] || 'bg-secondary text-muted-foreground'
            )}
          >
            {provider.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{provider.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.series.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Link
          href="/chat"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try in Chat
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.label}
            </div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          All Models <span className="text-muted-foreground">({providerModels.length})</span>
        </h2>
      </div>

      {/* Model grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providerModels.map((model) => (
          <ProviderModelCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  );
}
