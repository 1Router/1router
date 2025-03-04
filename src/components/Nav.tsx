"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import Image from "next/image"

const links = [
  { href: "/", label: "Home" },
  { href: "/models", label: "Models" },
  { href: "/chat", label: "Chat" },
  { href: "/rankings", label: "Rankings" },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 items-center">
        <div className="mr-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/1router-logo.jpg"
              alt="1Router"
              width={32}
              height={32}
              className="rounded-sm"
            />
            <span className="text-xl font-bold">1Router</span>
          </Link>
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === href ? "text-foreground font-semibold" : "text-foreground/60"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
        </div>
      </nav>
    </header>
  )
}
