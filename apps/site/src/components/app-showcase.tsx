"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

const tabs = [
  { name: "Today", period: "today" },
  { name: "This Week", period: "week" },
  { name: "This Month", period: "month" },
]

const apps = [
  {
    name: "Cline",
    description: "Autonomous coding agent right in your IDE",
    letter: "C",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    tokens: { today: "15.5B", week: "82.3B", month: "312B" },
    href: "#",
  },
  {
    name: "Roo-Cline",
    description: "Fork of Cline with experimental features",
    letter: "R",
    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    tokens: { today: "7.16B", week: "38.4B", month: "145B" },
    href: "#",
  },
  {
    name: "aide",
    description: "Open-source AI-native IDE",
    letter: "A",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    tokens: { today: "1.7B", week: "9.2B", month: "34.8B" },
    href: "#",
  },
  {
    name: "1Router Chatroom",
    description: "Chat with multiple LLMs at once",
    letter: "1",
    color: "bg-primary/15 text-primary",
    tokens: { today: "1.08B", week: "5.6B", month: "21.2B" },
    href: "#",
  },
  {
    name: "SillyTavern",
    description: "LLM frontend for power users",
    letter: "S",
    color: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    tokens: { today: "916M", week: "4.8B", month: "18.1B" },
    href: "#",
  },
  {
    name: "LibreChat",
    description: "Enhanced ChatGPT clone with plugins",
    letter: "L",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    tokens: { today: "642M", week: "3.1B", month: "11.7B" },
    href: "#",
  },
]

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState("today")

  return (
    <section className="py-20">
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">App Showcase</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Top apps consuming tokens through 1Router
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.period}
              onClick={() => setActiveTab(tab.period)}
              className={cn(
                "min-h-[40px] rounded-md px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.period
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* App list */}
        <div className="space-y-1.5">
          {apps.map((app, i) => (
            <Link
              key={app.name}
              href={app.href}
              className="group flex flex-col gap-3 rounded-xl border border-transparent p-4 transition-all hover:border-border/60 hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="w-6 shrink-0 text-right text-sm font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold",
                    app.color
                  )}
                >
                  {app.letter}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-medium leading-tight transition-colors group-hover:text-primary">
                    {app.name}
                  </h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{app.description}</p>
                </div>
              </div>
              <div className="text-right sm:shrink-0">
                <div className="font-semibold">
                  {app.tokens[activeTab as keyof typeof app.tokens]}
                </div>
                <div className="text-xs text-muted-foreground">tokens</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
