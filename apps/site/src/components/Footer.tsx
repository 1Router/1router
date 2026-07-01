import Link from "next/link"
import { Logo } from "@/components/logo"
import { Github, Star } from "lucide-react"

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Models", href: "/models" },
      { label: "Rankings", href: "/rankings" },
      { label: "Chat", href: "/chat" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api-reference" },
      { label: "Self-Host", href: "/self-host" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Pitch", href: "/pitch" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="w-full border-t border-border/60 bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              One interface for all AI models. Self-host or use our cloud — better prices, better uptime, no subscription.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} 1Router, Inc. Released under{' '}
            <a
              href="https://github.com/1Router/1router/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              FSL-1.1-Apache-2.0
            </a>
            .
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/1router/1router"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
            >
              <Star className="h-3.5 w-3.5" />
              <span>Star us on GitHub</span>
            </Link>
            <Link
              href="https://github.com/1router"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
