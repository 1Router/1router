'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Cpu, DollarSign, Calendar, Code2,
  FileText, Eye, Zap, Download, Globe, MessageSquare,
  Check, Copy,
} from 'lucide-react';
import { type Model, providerUrl, providerColors } from '@1router/models';
import { cn } from '@/lib/utils';

function formatContext(length: number) {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(length % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(length / 1000)}K`;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

const codeSnippets = (modelId: string) => ({
  curl: `curl https://api.1router.com/v1/chat/completions \\
  -H "Authorization: Bearer $ROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
  python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.1router.com/v1",
    api_key=os.environ["ROUTER_API_KEY"]
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`,
  javascript: `import OpenAI from "openai"

const client = new OpenAI({
  baseURL: "https://api.1router.com/v1",
  apiKey: process.env.ROUTER_API_KEY,
})

const response = await client.chat.completions.create({
  model: "${modelId}",
  messages: [{ role: "user", content: "Hello!" }],
})
console.log(response.choices[0].message.content)`,
});

const codeTabs = [
  { id: 'curl', label: 'cURL' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
] as const;

type CodeTabId = (typeof codeTabs)[number]['id'];

function CodeBlock({ code, lang }: { code: string; lang: CodeTabId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python (openai SDK)' : 'JavaScript / TypeScript'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );
}

export function ModelDetailClient({ model }: { model: Model }) {
  const [activeTab, setActiveTab] = useState<CodeTabId>('curl');

  const snippets = codeSnippets(model.id);
  const specItems = [
    {
      icon: Cpu,
      label: 'Context Length',
      value: formatContext(model.contextLength),
      sub: `${model.contextLength.toLocaleString()} tokens`,
    },
    {
      icon: DollarSign,
      label: 'Input Price',
      value: formatPrice(model.pricing.input),
      sub: model.pricing.input === 0 ? 'per 1M tokens' : `per 1M tokens`,
    },
    {
      icon: ArrowRight,
      label: 'Output Price',
      value: formatPrice(model.pricing.output),
      sub: model.pricing.output === 0 ? 'per 1M tokens' : `per 1M tokens`,
    },
    {
      icon: Globe,
      label: 'Modalities',
      value: model.modality.length.toString(),
      sub: model.modality.join(', '),
    },
  ];

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/models" className="hover:text-foreground">Models</Link>
        <span>/</span>
        <Link href={providerUrl(model.providerSlug)} className="hover:text-foreground">{model.provider}</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{model.name}</span>
      </nav>

      {/* Back link */}
      <Link
        href="/models"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Models
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
              providerColors[model.providerSlug] || 'bg-secondary text-muted-foreground'
            )}
          >
            {model.provider.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{model.name}</h1>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {model.series}
              </span>
            </div>
            <Link
              href={providerUrl(model.providerSlug)}
              className="mt-1 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              by {model.provider}
            </Link>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {model.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <MessageSquare className="h-4 w-4" />
            Try in Chat
          </Link>
        </div>
      </div>

      {/* Badges */}
      {(model.downloadable || model.freeEndpoint || model.releaseDate || model.license) && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {model.freeEndpoint && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400">
              <Zap className="h-3.5 w-3.5" />
              Free Endpoint
            </span>
          )}
          {model.downloadable && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Download className="h-3.5 w-3.5" />
              Downloadable
            </span>
          )}
          {model.releaseDate && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(model.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
          {model.license && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {model.license} license
            </span>
          )}
          {model.apiCalls30d && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {model.apiCalls30d} API calls / 30d
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-8">
          {/* Specs */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Specifications</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {specItems.map((spec) => (
                <div key={spec.label} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <spec.icon className="h-3.5 w-3.5" />
                    {spec.label}
                  </div>
                  <div className="text-xl font-bold">{spec.value}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground" title={spec.sub}>
                    {spec.sub}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Capabilities */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Capabilities</h2>
            <div className="flex flex-wrap gap-2">
              {model.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm font-medium"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {cap.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </section>

          {/* Tags */}
          {model.tags && model.tags.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* API Usage */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Code2 className="h-5 w-5 text-primary" />
              API Usage
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              1Router is fully OpenAI-compatible. Just set the base URL and use this model ID:
            </p>

            {/* Model ID */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5">
              <code className="text-sm font-mono font-medium">{model.id}</code>
              <button
                onClick={() => navigator.clipboard.writeText(model.id)}
                className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* Code tabs */}
            <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 p-1">
              {codeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <CodeBlock code={snippets[activeTab]} lang={activeTab} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Pricing card */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-4 font-semibold">Pricing</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  Input
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {model.pricing.input === 0 ? 'Free' : `$${model.pricing.input.toFixed(2)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">per 1M tokens</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Output
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {model.pricing.output === 0 ? 'Free' : `$${model.pricing.output.toFixed(2)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">per 1M tokens</div>
                </div>
              </div>
              {model.pricing.input > 0 && model.pricing.output > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Blended (3:1)</span>
                    <span className="font-semibold">
                      ${((model.pricing.input * 3 + model.pricing.output) / 4).toFixed(2)}/M
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-4 font-semibold">Quick Stats</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provider</dt>
                <dd>
                  <Link href={providerUrl(model.providerSlug)} className="font-medium hover:text-primary">
                    {model.provider}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Series</dt>
                <dd className="font-medium">{model.series}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Context</dt>
                <dd className="font-medium">{formatContext(model.contextLength)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Modalities</dt>
                <dd className="font-medium">{model.modality.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Capabilities</dt>
                <dd className="font-medium">{model.capabilities.length}</dd>
              </div>
              {model.license && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">License</dt>
                  <dd className="font-medium">{model.license}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* CTA */}
          <Link
            href="/docs"
            className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 p-5 transition-colors hover:border-primary/30 hover:bg-secondary/40"
          >
            <div>
              <div className="font-semibold">API Docs</div>
              <div className="text-xs text-muted-foreground">Learn how to call this model</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
