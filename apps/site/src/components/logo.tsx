import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Rounded square background */}
        <rect width="32" height="32" rx="7" fill="hsl(var(--primary))" />
        {/* Routing paths converging to center */}
        <path
          d="M8 8 L16 16 L24 8 M8 24 L16 16 L24 24 M16 16 L16 22"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Center node */}
        <circle cx="16" cy="16" r="2.8" fill="white" />
        {/* Endpoint nodes */}
        <circle cx="8" cy="8" r="1.8" fill="white" opacity="0.7" />
        <circle cx="24" cy="8" r="1.8" fill="white" opacity="0.7" />
        <circle cx="8" cy="24" r="1.8" fill="white" opacity="0.7" />
        <circle cx="24" cy="24" r="1.8" fill="white" opacity="0.7" />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">1Router</span>
      )}
    </div>
  )
}
