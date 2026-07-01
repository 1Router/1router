"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface PitchSection {
  id: string
  roman: string
  label: string
}

/**
 * Sticky-table-of-contents list with active-state highlighting.
 *
 * Uses a single IntersectionObserver against all section ids, marking the
 * section that has just entered the top band of the viewport. The rootMargin
 * is set so the active band is just below the sticky Nav (≈ 3.5rem) and
 * extends to the upper third of the viewport — a section becomes active
 * when the user has read its headline.
 */
export function PitchContentsList({
  sections,
  className = "",
}: {
  sections: PitchSection[]
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null)

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    if (targets.length === 0) return

    // IntersectionObserver's rootMargin only accepts px or % — rem is
    // rejected with a SyntaxError at construction time. Convert the
    // Tailwind `h-14` value (3.5rem) to pixels based on the actual root
    // font-size so the active band tracks the rendered sticky Nav even
    // when the user/UA adjusts the document font-size.
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    // px or % only — no rem, no other units.
    const navClearancePx = Math.round(3.5 * rootFontSize)
    const rootMargin = `-${navClearancePx}px 0px -85% 0px`

    let observer: IntersectionObserver | null = null
    try {
      observer = new IntersectionObserver(
        (entries) => {
          // Last intersecting entry wins; this produces a stable single-active
          // highlight when scrolling through sections that share the band.
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id)
            }
          }
        },
        {
          // Top band: just under the sticky Nav down to ~15% from the top
          // of the viewport. Section transitions become active as their
          // headline crosses the Nav's bottom edge.
          rootMargin,
          threshold: 0,
        },
      )
    } catch {
      // Some platforms reject the rootMargin altogether. Fall back
      // gracefully — the initial activeId, seeded to sections[0], stays lit.
    }

    if (!observer) return
    const obs = observer
    targets.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])

  return (
    <ol className={className}>
      {sections.map(({ id, roman, label }) => {
        const isActive = activeId === id
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "group flex min-h-[40px] items-baseline gap-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "w-6 shrink-0 font-mono text-[11px] uppercase tracking-widest transition-colors group-hover:text-primary",
                  isActive && "text-primary"
                )}
              >
                {roman}
              </span>
              <span className="truncate">{label}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
