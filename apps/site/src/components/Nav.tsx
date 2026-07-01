"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { useState, useRef, useEffect, useCallback } from "react"

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
  const drawerRef = useRef<HTMLDialogElement>(null)

  // Tap on the dimmer (outside the drawer's box) closes it.
  useEffect(() => {
    const dlg = drawerRef.current;
    if (!dlg) return;
    const onClick = (e: MouseEvent) => {
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        dlg.close();
      }
    };
    dlg.addEventListener('click', onClick);
    return () => dlg.removeEventListener('click', onClick);
  }, []);

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

  // Auto-close the drawer whenever the route changes.
  useEffect(() => {
    drawerRef.current?.close()
  }, [pathname])

  const openDrawer = useCallback(() => {
    drawerRef.current?.showModal()
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <nav className="container flex h-14 items-center gap-3 md:gap-6">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          {/* Desktop-only nav links */}
          <div className="hidden items-center gap-1 text-sm font-medium md:flex">
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

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {/* Desktop search */}
            <div className="hidden items-center md:flex">
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
                <kbd className="hidden items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
                  ⇧K
                </kbd>
              </div>
            </div>

            {/* Desktop-only extras */}
            <Link
              href="https://github.com/1router/1router"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary sm:inline-flex"
            >
              <Star className="h-4 w-4" />
              <span className="tabular-nums">128</span>
            </Link>
            <Link
              href="/chat"
              className="hidden items-center rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              Get Started
            </Link>

            <ModeToggle />

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={openDrawer}
              aria-label="Open menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile nav drawer (native <dialog> — Esc / backdrop dismiss natively) */}
      <dialog
        ref={drawerRef}
        aria-label="Site navigation"
        className="fixed inset-y-0 right-0 m-0 h-full w-72 max-w-full border-l border-border bg-background p-0 text-foreground shadow-2xl translate-x-full transition-transform duration-200 ease-out open:translate-x-0 md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <Logo />
            <button
              type="button"
              onClick={() => drawerRef.current?.close()}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center rounded-md px-4 py-3 text-base font-medium transition-colors",
                  pathname === href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border/60 px-5 py-4">
            <Link
              href="https://github.com/1router/1router"
              target="_blank"
              rel="noreferrer"
              className="mb-2 flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Star className="h-4 w-4" />
              <span>Star on GitHub</span>
            </Link>
            <Link
              href="/chat"
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </dialog>
    </>
  )
}
