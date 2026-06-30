import type { Metadata } from "next"
import Link from "next/link"
import { Check, Server, Cloud, Zap } from "lucide-react"

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing. Self-host for free, or use our managed cloud with a 5% markup on provider costs. No subscriptions, no hidden fees.',
  openGraph: {
    title: 'Pricing — 1Router',
    description: 'Simple, transparent pricing. Self-host for free, or use our managed cloud with a 5% markup.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — 1Router',
    description: 'Simple, transparent pricing. Self-host for free, or use our managed cloud with a 5% markup.',
  },
}

const plans = [
  {
    name: "Self-Hosted",
    price: "Free",
    period: "forever",
    icon: Server,
    description: "Run 1Router on your own infrastructure. You only pay your model providers directly.",
    features: [
      "Full control plane",
      "Unlimited models and providers",
      "Custom routing rules",
      "No per-token fees",
      "Community support via GitHub",
      "Open license: FSL-1.1 today, Apache 2.0 in 2 years",
    ],
    cta: "Self-Host Guide",
    ctaHref: "/self-host",
    highlight: false,
  },
  {
    name: "Cloud — Starter",
    price: "Pay-as-you-go",
    period: "no subscription",
    icon: Cloud,
    description: "Use our managed cloud. Transparent markup on provider pricing. No monthly fees.",
    features: [
      "Zero infrastructure to manage",
      "All 31+ models pre-configured",
      "Automatic failover and load balancing",
      "Usage-based billing — no subscription",
      "5% markup on provider token costs",
      "Email support",
    ],
    cta: "Get Started",
    ctaHref: "/chat",
    highlight: true,
  },
  {
    name: "Cloud — Enterprise",
    price: "Custom",
    period: "contact us",
    icon: Zap,
    description: "Dedicated infrastructure, custom SLAs, and priority support for high-volume workloads.",
    features: [
      "Dedicated edge nodes",
      "Custom SLAs and uptime guarantees",
      "Volume discount on token markup",
      "SSO / SAML authentication",
      "Priority support with dedicated engineer",
      "On-premise deployment assistance",
    ],
    cta: "Contact Sales",
    ctaHref: "/about",
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          No subscriptions, no hidden fees. Self-host for free, or use our cloud with a small markup on provider costs.
        </p>
      </div>

      {/* Plans */}
      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
              plan.highlight
                ? "border-primary/40 shadow-lg shadow-primary/10 bg-card"
                : "border-border/60 bg-card hover:border-border"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most Popular
              </div>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <plan.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="ml-2 text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>

            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.ctaHref}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                plan.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-secondary"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* How cloud pricing works */}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">How Cloud Pricing Works</h2>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <div className="font-medium">Provider token cost</div>
                <div className="text-sm text-muted-foreground">What OpenAI, Anthropic, etc. charge</div>
              </div>
              <span className="text-lg font-semibold">$X.00</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <div className="font-medium">1Router markup (5%)</div>
                <div className="text-sm text-muted-foreground">Covers infrastructure and maintenance</div>
              </div>
              <span className="text-lg font-semibold text-primary">+$0.05X</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">You pay</div>
                <div className="text-sm text-muted-foreground">Total per million tokens</div>
              </div>
              <span className="text-xl font-bold">$1.05X</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No subscription. No minimum spend. You only pay for what you use.
        </p>
      </div>
    </div>
  )
}
