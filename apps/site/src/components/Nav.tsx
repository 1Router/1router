"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { Search, Star } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const links = [
  { href: "/models", label: "Models" },
  { href: "/rankings", label: "Rankings" },
  { href: "/chat", label: "Chat" },
  { href: "/docs", label: "Docs" },
  { href: "/self-host", label: "Self-Host" },
]

export function Nav() {
  const pathname = usePathname()
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="container flex h-14 items-center gap-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        <div className="flex items-center gap-1 text-sm font-medium">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                pathname === href
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto hidden md:flex items-center">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-1.5 transition-all w-56",
              searchFocused && "border-primary ring-1 ring-primary/30 w-72"
            )}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models…"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⇧K
            </kbd>
          </div>
        </div>

        {/* GitHub stars + CTA + theme */}
        <div className="flex items-center gap-2">
          <Link
            href="https://github.com/1router/1router-frontend"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <Star className="h-4 w-4" />
            <span className="tabular-nums">128</span>
          </Link>
          <Link
            href="/chat"
            className="hidden sm:inline-flex items-center rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <ModeToggle />
        </div>
      </nav>
    </header>
  )
}
