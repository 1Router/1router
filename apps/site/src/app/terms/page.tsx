import type { Metadata } from "next"
import { FileText, GitBranch, Server, Cloud } from "lucide-react"

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: '1Router terms of service. The managed cloud is pay-as-you-go with a 5% markup. Self-hosted deployments are governed by the FSL-1.1-Apache-2.0 license.',
  openGraph: {
    title: 'Terms of Service — 1Router',
    description: 'Terms of service for the 1Router managed cloud. Self-hosted deployments are governed by the FSL-1.1-Apache-2.0 license.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service — 1Router',
    description: 'Terms of service for the 1Router managed cloud. Self-hosted deployments are governed by the FSL-1.1-Apache-2.0 license.',
  },
}

const sections = [
  {
    icon: GitBranch,
    title: "Software License (FSL-1.1-Apache-2.0)",
    body: [
      "1Router is licensed under the Functional Source License, Version 1.1, with an irrevocable grant of the Apache License, Version 2.0 as the Future License (\"FSL-1.1-Apache-2.0\"). The full text of this license is available in the LICENSE file at the root of the project repository.",
      "Under the FSL, you may use, copy, modify, and redistribute the Software for any Permitted Purpose, including: your own internal use and access, non-commercial education, non-commercial research, and providing professional services to other licensees.",
      "A \"Competing Use\" — making the Software available as part of a commercial product or service that substitutes for, or offers the same or substantially similar functionality to, the Software or other 1Router products — is not a Permitted Purpose. This restriction prevents others from offering a directly competing hosted AI routing service based on 1Router's codebase.",
      "Each release is automatically and irrevocably granted an additional Apache License, Version 2.0 that becomes effective on the second anniversary of the date the Software is made available. On or after that date, the Software may be used under the terms of the Apache License, Version 2.0 without the FSL's Competing Use restriction.",
      "When self-hosting for your own internal, research, or educational purposes, these Cloud Service Terms do not apply to your deployment — you govern your own instance under the FSL.",
      "Contributions to the project are welcome and submitted under the same FSL-1.1-Apache-2.0 license.",
    ],
  },
  {
    icon: Cloud,
    title: "Cloud Service Terms",
    body: [
      "Cloud accounts are provided on a pay-as-you-go basis. You are billed for token usage plus a 5% markup.",
      "You are responsible for keeping your API key secure. Unauthorized use of your key is your responsibility.",
      "We reserve the right to suspend accounts for abuse, fraud, or violation of these terms.",
      "Service is provided \"as is\" without warranty. We do not guarantee uptime, though we strive for 99.9%+ availability.",
    ],
  },
  {
    icon: Server,
    title: "Self-Hosting",
    body: [
      "Self-hosting of 1Router is governed by the FSL-1.1-Apache-2.0 license. For internal, research, and educational Permitted Purposes, self-hosting is free of charge and unrestricted by 1Router beyond the terms of the license itself.",
      "You are responsible for your own infrastructure, security, and compliance when self-hosting.",
      "You are responsible for your own relationships with model providers (OpenAI, Anthropic, etc.) and their terms of service.",
      "No attribution is required, though we appreciate a link back to the project. Self-hosting in a way that constitutes a Competing Use (per the FSL) is not a Permitted Purpose during the FSL period.",
    ],
  },
  {
    icon: FileText,
    title: "Acceptable Use",
    body: [
      "You agree not to use 1Router to violate any applicable law or regulation.",
      "You agree not to attempt to reverse engineer, decompile, or disassemble the managed cloud service.",
      "You agree not to abuse rate limits, attempt to overload the service, or use it for spam.",
      "Generated content is your responsibility. 1Router is not liable for outputs produced by AI models.",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
            <FileText className="h-4 w-4" />
            Terms
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: June 2026. These terms apply to the 1Router managed cloud. Self-hosted deployments are governed by the FSL-1.1-Apache-2.0 license (see LICENSE in the project repository).
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
          <h3 className="font-semibold">Questions about these terms?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Email us at <a href="mailto:legal@1router.com" className="font-medium text-primary hover:underline">legal@1router.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
