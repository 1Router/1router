import type { Metadata } from "next"
import Link from "next/link"
import { Shield, Server, Database, Eye } from "lucide-react"

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: '1Router privacy policy. When you self-host, we collect nothing. When you use our cloud, we collect the minimum needed for billing — and never your prompt content.',
  openGraph: {
    title: 'Privacy Policy — 1Router',
    description: 'When you self-host, we collect nothing. When you use our cloud, we collect the minimum needed for billing.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — 1Router',
    description: 'When you self-host, we collect nothing. When you use our cloud, we collect the minimum needed for billing.',
  },
}

const sections = [
  {
    icon: Eye,
    title: "What We Collect",
    body: [
      "API keys you provide for model providers (stored encrypted, never logged in plaintext).",
      "Usage metadata: model IDs, token counts, timestamps, and request status — for billing and analytics.",
      "Account information: email address (only for cloud users).",
      "We do NOT collect or store: the content of your prompts or completions (in cloud mode, these pass through transitively but are not persisted).",
    ],
  },
  {
    icon: Server,
    title: "Self-Hosted Mode",
    body: [
      "When self-hosting, 1Router collects zero data. No telemetry, no analytics, no phone-home.",
      "All data stays in your infrastructure — your database, your logs, your rules.",
      "You are responsible for your own privacy compliance when self-hosting.",
    ],
  },
  {
    icon: Database,
    title: "Data Storage",
    body: [
      "Cloud mode: usage metadata is stored in our PostgreSQL database for billing and dashboard analytics.",
      "Prompt and completion content is NOT persisted in cloud mode — it streams through and is discarded.",
      "API keys are encrypted at rest using AES-256-GCM.",
      "You can request complete data deletion at any time by emailing privacy@1router.com.",
    ],
  },
  {
    icon: Shield,
    title: "Your Rights",
    body: [
      "Access: Request a copy of all data we hold about you.",
      "Deletion: Request permanent deletion of your account and all associated data.",
      "Portability: Export your usage data in JSON format at any time.",
      "Opt-out: Self-host 1Router to eliminate all data sharing with us.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
            <Shield className="h-4 w-4" />
            Privacy
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: June 2026. We take privacy seriously. When you self-host, we collect nothing. When you use our cloud, we collect the minimum needed for billing — and never your prompt content.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-border/60 bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.body.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 rounded-xl border border-border/60 bg-secondary/20 p-6 text-center">
          <h3 className="font-semibold">Questions about privacy?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Email us at <a href="mailto:privacy@1router.com" className="font-medium text-primary hover:underline">privacy@1router.com</a> or consider <Link href="/self-host" className="font-medium text-primary hover:underline">self-hosting</Link> for complete data sovereignty.
          </p>
        </div>
      </div>
    </div>
  )
}
