"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Github } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const tabs = [
  { name: "Today", href: "#" },
  { name: "This Week", href: "#" },
  { name: "This Month", href: "#" },
]

const apps = [
  {
    name: "Cline",
    description: "Autonomous coding agent right in your IDE",
    icon: "/github-mark.svg",
    tokens: "15.5B tokens",
    href: "#",
  },
  {
    name: "Roo-Cline",
    description: "Fork of Cline with some experimental features",
    icon: "/github-mark.svg",
    tokens: "7.16B tokens",
    href: "#",
  },
  {
    name: "aide",
    description: "Open-source AI-native IDE",
    icon: "/aide-logo.png",
    tokens: "1.7B tokens",
    href: "#",
  },
  {
    name: "OpenRouter: Chatroom",
    description: "Chat with multiple LLMs at once",
    icon: "/openrouter-logo.png",
    tokens: "1.08B tokens",
    href: "#",
  },
  {
    name: "SillyTavern",
    description: "LLM frontend for power users",
    icon: "/sillytavern-logo.png",
    tokens: "916M tokens",
    href: "#",
  },
]

export function AppShowcase() {
  return (
    <section className="py-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">APP SHOWCASE</h2>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
            RECENT ANNOUNCEMENTS →
          </Link>
        </div>

        <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-8">
          {tabs.map((tab) => (
            <Button
              key={tab.name}
              variant={tab.name === "Today" ? "default" : "ghost"}
              className={cn(
                "flex-1 text-sm",
                tab.name === "Today" ? "" : "text-muted-foreground"
              )}
            >
              {tab.name}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {apps.map((app, i) => (
            <Link
              key={app.name}
              href={app.href}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm w-6">{i + 1}.</span>
                <div className="w-8 h-8 relative">
                  <Image
                    src={app.icon}
                    alt={app.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    {app.name} <span className="text-muted-foreground">→</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{app.tokens}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
