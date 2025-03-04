"use client"

import Link from "next/link"
import { Button } from "./ui/button"
import { ChevronDown } from "lucide-react"

const models = [
  {
    name: "MiniMax-01",
    description: "MiniMax-01 is a combines MiniMax-Text-01 for text generation and MiniMax-VL-01 for image...",
    author: "minimax",
    status: "new"
  },
  {
    name: "Codestral 2501",
    description: "Mistral's cutting-edge language model for coding. Codestral specializes in low-latency, high-...",
    author: "mistralai",
    status: "new"
  },
  {
    name: "Llama 3 Lumimaid 8B",
    description: "The NeverSleep team is back, with a Llama 3 8B finetune trained on their curated roleplay data...",
    author: "neversleep",
    status: "↑ 13,537%"
  }
]

export function TrendingModels() {
  return (
    <section className="py-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-muted-foreground">TRENDING MODELS:</h2>
            <Button variant="ghost" className="text-sm font-medium flex items-center gap-2">
              All Categories <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.name}
              className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-medium mb-2">{model.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {model.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">by</span>
                  <Link href="#" className="text-sm hover:text-primary">
                    {model.author}
                  </Link>
                </div>
                <span className={`text-sm ${model.status === 'new' ? 'text-primary' : 'text-green-500'}`}>
                  {model.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
