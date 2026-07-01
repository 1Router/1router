import type { Metadata } from "next"
import Link from "next/link"
import {
  Sparkles,
  Layers,
  TrendingUp,
  EyeOff,
  Network,
  DollarSign,
  Server,
  GitBranch,
  RefreshCw,
  GitCompare,
  BarChart3,
  ShieldCheck,
  MessageSquare,
} from "lucide-react"
import { PitchContentsList, type PitchSection } from "@/components/pitch-contents-list"

/** Doc-wide outline shared by both TOC surfaces and the section iteration below. */
const sectionsMeta: PitchSection[] = [
  { id: 'fracture', roman: 'I', label: 'The Problem' },
  { id: 'convergence', roman: 'II', label: 'The Convergence' },
  { id: 'outcomes', roman: 'III', label: 'What Changes For You' },
  { id: 'roadmap', roman: 'IV', label: 'The Roadmap' },
  { id: 'close', roman: 'V', label: 'Pick The Model' },
]

export const metadata: Metadata = {
  title: 'The Pitch',
  description:
    'In the future there will be many models, and many providers. How will you choose the best one? How will you measure the usage across all of them? 1Router is the single OpenAI-compatible control plane that answers both.',
  alternates: { canonical: '/pitch' },
  openGraph: {
    title: 'The Pitch — 1Router',
    description:
      'Many models. Many providers. One interface. OpenAI-compatible, self-hostable, no subscription.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pitch — 1Router',
    description: 'Many models. Many providers. One interface.',
  },
}

// (sectionsMeta is hoisted near the top of the module so the SSR-rendered
//  <PitchContentsList> call sites and the client-component prop type agree.)

// ── Section content ────────────────────────────────────────────────────

const fracture = [
  {
    icon: Layers,
    title: "The provider graph keeps growing",
    body:
      "OpenAI, Anthropic, Google, xAI, Meta, Mistral, DeepSeek, Qwen, plus a long tail of open-source labs and private endpoints. Each ships its own SDK, its own pricing, its own rate limits, and its own authentication. "
      + "Your integration surface area grows linearly with the number of vendors you adopt — and so does the maintenance burden.",
  },
  {
    icon: TrendingUp,
    title: "Prices move independently, every week",
    body:
      "Provider pricing is now a moving target — per-million-token rates, batch discounts, prompt-cache pricing, regional surcharges, fine-tuning markups. "
      + "Without a single source of truth you can't tell which model is actually cheaper for your workload this month, much less audit last quarter's bill.",
  },
  {
    icon: EyeOff,
    title: "Nobody can tell you what happens to your data",
    body:
      "Logging, retention, and training-on-prompts policies differ by provider, by SKU, and sometimes by region. "
      + "The same 'send a chat completion' call has wildly different downstream consequences depending on which upstream you pick. Today, picking is a guess.",
  },
]

const convergenceItems = [
  {
    icon: Network,
    title: "One interface",
    body: "Every model — hosted and self-hosted — speaks a single OpenAI-compatible API. Your code doesn't change when you change providers.",
  },
  {
    icon: DollarSign,
    title: "Pay-as-you-go, forever",
    body: "No subscriptions, no monthly minimum. Self-host for free; use our cloud for a transparent 5% markup on provider token costs.",
  },
  {
    icon: Server,
    title: "Self-hostable to the metal",
    body: "The entire control plane is source-available. Deploy on Kubernetes, Docker, or your laptop. Your API keys and usage data never leave your network.",
  },
  {
    icon: GitBranch,
    title: "Open by default",
    body: "FSL-1.1 today, Apache 2.0 two years after every release — irrevocably. Use it, fork it, ship it.",
  },
]

const whatYouGet = [
  {
    icon: RefreshCw,
    title: "Switching is one line of code",
    body: "Change the model id, not the SDK. Move a workload from GPT-4o to Claude Sonnet to a self-hosted Llama without rewriting a single call.",
  },
  {
    icon: GitCompare,
    title: "Side-by-side, on real numbers",
    body: "Pricing, context length, capabilities, modality, free endpoints and downloadable weights — laid out so an actual decision can be made in thirty seconds.",
  },
  {
    icon: BarChart3,
    title: "One usage ledger",
    body: "Tokens in, tokens out, cost per call, cost per feature — surfaced in seconds. Stop reconciling per-provider CSVs at the end of every month.",
  },
  {
    icon: ShieldCheck,
    title: "Provable data sovereignty",
    body: "Every upstream you pick publishes a data-handling attestation back to 1Router. You can see what happens to your prompts before you send them.",
  },
]

const roadmap = [
  {
    status: "Today",
    title: "The catalog is live",
    body: "Browse, filter, and compare every supported model. Provider detail pages, capability filtering, free-endpoint callouts, and downloadable-weight badges are all shipped.",
  },
  {
    status: "Now",
    title: "Multi-model chat and rankings",
    body: "Use the chat surface to drive any model directly. Rankings surface what's actually getting used across 1Router — not what's most marketed.",
  },
  {
    status: "Next",
    title: "OpenAI-compatible proxy",
    body: "Replace your existing OpenAI/ Anthropic base URL with 1Router. Routing, failover and load balancing happen behind a stable, drop-in interface.",
  },
  {
    status: "Soon",
    title: "Data-handling attestations",
    body: "Per-provider no-log, retain-prompts, train-on-inputs and eval-share attestation flags flow from the shared catalog into the model pages and the proxy itself.",
  },
  {
    status: "Later",
    title: "Provider pool, auth, metering",
    body: "Federated credentials with rotation, API-key auth, per-key rate limits and spend caps, Postgres-backed usage metering — all self-hostable.",
  },
]

// ── Sub-components ─────────────────────────────────────────────────────

/** Mono number + micro-section label, the document-style "header stamp". */
function SectionKicker({ roman, label }: { roman: string; label: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.18em]">
      <span className="text-primary">{roman}.</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

/** Document-style title block — large but restrained, no gradients. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
      {children}
    </h2>
  )
}

/** Restrained "document card": no individual border (the surrounding
 *  grid uses `gap-px bg-border` to draw a 1px line between cells — keeping
 *  per-card borders on top of that produces three stacked lines per seam).
 *  The card has its own `bg-card` so it reads as a distinct cell and the
 *  `bg-border` shows only through the 1px gaps. */
function DocCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col bg-card p-5 transition-colors hover:bg-secondary">
      <div className="mb-3 flex h-9 w-9 items-center justify-center border border-border/60">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export default function PitchPage() {
  return (
    <>
      <div className="pitch-progress-bar" aria-hidden />

      {/* ── Hero (no CTA) ────────────────────────────────────── */}
      <header className="border-b border-border/60 bg-background py-24 md:py-32">
        <div className="container max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 border border-border/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>The Pitch</span>
            <span aria-hidden className="hidden text-border sm:inline">·</span>
            <span className="hidden sm:inline">v0.1 — June 2026</span>
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            In the future, there will be many models, and providers.
          </h1>

          <h2 className="mt-8 text-balance text-xl leading-snug text-muted-foreground sm:text-2xl md:text-3xl">
            <span className="block">How will you choose the best one?</span>
            <span className="block">And how will you measure the usage?</span>
          </h2>

          <p className="mt-8 text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            1Router is the single, OpenAI-compatible control plane that answers both.
            Every model, every provider, on one bill — and you can run the whole thing on your own hardware.
          </p>
        </div>
      </header>

      {/* ── Document body: TOC rail (lg+) + sections ─────────── */}
      <div className="container py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[14rem_1fr]">
          {/* Sticky left-rail contents (desktop only) */}
          <aside className="hidden lg:block">
            <nav aria-label="Contents" className="sticky top-20">
              <div className="border-l border-border/60 pl-4">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Contents
                </div>
                <PitchContentsList sections={sectionsMeta} />
              </div>
            </nav>
          </aside>

          {/* Inline contents disclosure (mobile / tablet) */}
          <details className="group border border-border/60 p-4 open:bg-secondary/30 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground [&::-webkit-details-marker]:hidden [&::marker]:hidden">
              <span>Contents</span>
              <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
            </summary>
            <PitchContentsList sections={sectionsMeta} className="mt-3 border-t border-border/60 pt-3" />
          </details>

          {/* ── Sections ───────────────────────────────────── */}
          <main className="min-w-0 space-y-20 lg:space-y-24">
            {/* I. The Problem */}
            <section id="fracture" className="scroll-mt-24">
              <SectionKicker roman="I" label="The Problem" />
              <SectionTitle>The next five years look nothing like today.</SectionTitle>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                Three quiet cracks are already forming under the AI stack everyone is standing on.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
                {fracture.map((item) => (
                  <DocCard key={item.title} icon={item.icon} title={item.title}>
                    {item.body}
                  </DocCard>
                ))}
              </div>
            </section>

            {/* II. The Convergence */}
            <section id="convergence" className="scroll-mt-24">
              <SectionKicker roman="II" label="The Convergence" />
              <SectionTitle>1Router is the one place every model meets.</SectionTitle>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                A single API. One bill. One source of truth you can deploy on your own hardware.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
                {convergenceItems.map((item) => (
                  <DocCard key={item.title} icon={item.icon} title={item.title}>
                    {item.body}
                  </DocCard>
                ))}
              </div>
            </section>

            {/* III. What Changes For You */}
            <section id="outcomes" className="scroll-mt-24">
              <SectionKicker roman="III" label="What Changes For You" />
              <SectionTitle>A whole category of work disappears.</SectionTitle>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                You&apos;re not buying a model. You&apos;re buying back the time and
                infrastructure that vendor sprawl took from you.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-px bg-border md:grid-cols-2">
                {whatYouGet.map((item) => (
                  <DocCard key={item.title} icon={item.icon} title={item.title}>
                    {item.body}
                  </DocCard>
                ))}
              </div>
            </section>

            {/* IV. The Roadmap */}
            <section id="roadmap" className="scroll-mt-24">
              <SectionKicker roman="IV" label="The Roadmap" />
              <SectionTitle>Where we are on the journey.</SectionTitle>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                1Router ships in public, every step of the way. Here&apos;s the surface
                area — then the engine underneath it.
              </p>

              <ol className="mt-10 max-w-3xl">
                {roadmap.map((step, i) => (
                  <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-x-6 pb-8 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="font-mono text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      {i < roadmap.length - 1 && (
                        <div className="mt-2 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                        {step.status}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* V. Pick The Model */}
            <section id="close" className="scroll-mt-24 border-t border-border/60 pt-16">
              <SectionKicker roman="V" label="Pick The Model" />
              <SectionTitle>Pick the model. We&apos;ll handle the rest.</SectionTitle>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                One API, every provider, total sovereignty. Start in the browser, or take
                the whole control plane home.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <MessageSquare className="h-4 w-4" />
                  Start chatting
                </Link>
                <Link
                  href="/models"
                  className="inline-flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  <GitCompare className="h-4 w-4" />
                  Browse models
                </Link>
                <Link
                  href="/self-host"
                  className="inline-flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  <Server className="h-4 w-4" />
                  Self-host
                </Link>
              </div>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Open-source · FSL-1.1, irrevocable Apache 2.0 in two years.
              </p>
            </section>
          </main>
        </div>
      </div>
    </>
  )
}
