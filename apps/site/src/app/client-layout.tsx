"use client"

import { usePathname } from "next/navigation"
import { Nav } from "@/components/Nav"
import { Footer } from "@/components/Footer"
import { Providers } from "@/components/providers"

// Routes that are full-viewport app surfaces — the footer is hidden
// and the main element fills the remaining height under the fixed nav.
const APP_ROUTES = ["/chat"]

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAppRoute = APP_ROUTES.includes(pathname)

  return (
    <Providers>
      <div className="relative flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        {!isAppRoute && <Footer />}
      </div>
    </Providers>
  )
}
