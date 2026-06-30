import type { Metadata } from "next"
import Link from "next/link"
import { GitBranch, Mail, MessageSquare, Globe, Shield, Server } from "lucide-react"

export const metadata: Metadata = {
  title: 'About',
  description: '1Router believes AI infrastructure should be open, transparent, and self-hostable. Learn about our mission, values, and open-source commitment.',
  openGraph: {
    title: 'About 1Router',
    description: 'We believe AI infrastructure should be open, transparent, and self-hostable.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About 1Router',
    description: 'We believe AI infrastructure should be open, transparent, and self-hostable.',
  },
}

const values = [
  {
    icon: Shield,
    title: "Privacy by Default",
    description: "Your data is yours. We don't sell analytics, train on your prompts, or lock you in. Self-host and keep everything in your network.",
  },
  {
    icon: Server,
    title: "Open Infrastructure",
    description: "Every release is source-available under the Functional Source License (FSL-1.1-Apache-2.0) and irrevocably scheduled to convert to plain Apache 2.0 two years after its release date. The license also grants an explicit patent license for permitted uses — a real advantage over MIT.",
  },
  {
    icon: Globe,
    title: "Universal Access",
    description: "One API for every model. No more managing a dozen SDKs, API keys, and billing relationships. Just point and go.",
  },
]

const team = [
  { name: "Engineering", desc: "Building the routing control plane and provider integrations." },
  { name: "Community", desc: "Supporting self-hosters and open-source contributors on GitHub." },
  { name: "Infrastructure", desc: "Keeping the managed cloud fast, reliable, and globally distributed." },
]

export default function AboutPage() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About 1Router
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We believe AI infrastructure should be open, transparent, and self-hostable. No walled gardens, no vendor lock-in, no subscriptions.
        </p>
      </div>

      {/* Mission */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Our Mission</h2>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <p className="text-lg leading-relaxed text-muted-foreground">
            The AI landscape is fragmented across dozens of providers, each with their own API, pricing, and quirks.
            Developers waste time managing integrations instead of building products. 1Router fixes this with a single,
            OpenAI-compatible API — but we go further: the entire control plane is open source and self-hostable.
            You can use our cloud for convenience, or run it yourself for complete sovereignty. Your choice, your data, your rules.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">What We Value</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <value.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{value.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Source */}
      <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border/60 bg-secondary/20 p-8 text-center">
        <GitBranch className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h3 className="text-xl font-bold">Source-Available, Converts to Apache 2.0</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          1Router is released under the Functional Source License (FSL-1.1-Apache-2.0). Every release is automatically and
          irrevocably granted an additional Apache 2.0 license that becomes effective two years after the release date —
          so within roughly two years, every commit becomes fully open source.
        </p>
        <Link
          href="https://github.com/1router/1router"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <GitBranch className="h-4 w-4" />
          View on GitHub
        </Link>
      </div>

      {/* Team / Contact */}
      <div className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Get in Touch</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {team.map((group) => (
            <div key={group.name} className="rounded-xl border border-border/60 bg-card p-6 text-center">
              <h3 className="font-semibold">{group.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{group.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="https://github.com/1router"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <GitBranch className="h-4 w-4" />
            GitHub
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Link>
          <a
            href="mailto:hello@1router.com"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      </div>
    </div>
  )
}
