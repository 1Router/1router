"use client"

import Link from "next/link"
import { ChevronRight, TrendingUp, Sparkles } from "lucide-react"
import { trendingModels, modelUrl, providerColors } from "@1router/models"
import { cn } from "@/lib/utils"

export function TrendingModels() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              Trending Now
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Popular Models</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Most-used models across the 1Router platform
            </p>
          </div>
          <Link
            href="/models"
            className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trendingModels.map((model) => (
            <Link
              key={model.id}
              href={modelUrl(model)}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Top row */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold",
                      providerColors[model.providerSlug] || "bg-secondary text-muted-foreground"
                    )}
                  >
                    {model.provider.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{model.name}</h3>
                    <p className="text-xs text-muted-foreground">{model.provider}</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {model.series}
                </span>
              </div>

              {/* Description */}
              <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                {model.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Context</span>
                  <span className="font-semibold">
                    {model.contextLength >= 1000000
                      ? `${(model.contextLength / 1000000).toFixed(0)}M`
                      : `${Math.round(model.contextLength / 1000)}K`}
                  </span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">In</span>
                  <span className="font-semibold">
                    ${model.pricing.input < 1 ? model.pricing.input.toFixed(2) : model.pricing.input.toFixed(0)}/M
                  </span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Out</span>
                  <span className="font-semibold">
                    ${model.pricing.output < 1 ? model.pricing.output.toFixed(2) : model.pricing.output.toFixed(0)}/M
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {model.capabilities.slice(0, 3).map((cap) => (
                  <span
                    key={cap}
                    className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {cap.replace(/-/g, " ")}
                  </span>
                ))}
                {model.capabilities.length > 3 && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{model.capabilities.length - 3}
                  </span>
                )}
              </div>

              {/* Sparkle indicator for new/trending */}
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
