"use client"

import { Nav } from "@/components/Nav"
import { Footer } from "@/components/Footer"
import { Providers } from "@/components/providers"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="relative flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </Providers>
  )
}
