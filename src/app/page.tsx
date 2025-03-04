import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShowcase } from "@/components/app-showcase";
import { TrendingModels } from "@/components/trending-models";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="container px-4 py-24 mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          One Interface for all AI models
        </h1>
        <p className="mt-6 text-lg leading-8">
          Better <Link href="/pricing" className="text-primary hover:text-primary/90">prices</Link>, better <Link href="/status" className="text-primary hover:text-primary/90">uptime</Link>, no subscription
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <Button asChild size="lg" className="px-8 gap-2">
            <Link href="/chat">
              Chat <MessageSquare className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href="/models">Browse</Link>
          </Button>
        </div>
      </section>

      {/* Trending Models Section */}
      <TrendingModels />

      {/* Recent Announcements Link */}
      <div className="container px-4 mx-auto">
        <Link 
          href="/announcements" 
          className="flex items-center justify-center py-4 text-sm text-muted-foreground hover:text-primary"
        >
          RECENT ANNOUNCEMENTS →
        </Link>
      </div>

      {/* App Showcase Section */}
      <AppShowcase />
    </>
  )
}
