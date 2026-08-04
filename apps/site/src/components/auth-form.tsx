"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

type Mode = "sign-in" | "sign-up"

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const isSignUp = mode === "sign-up"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)

    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })

    setPending(false)

    if (result.error) {
      setError(result.error.message || "Unable to authenticate. Please try again.")
      return
    }

    router.push("/account")
    router.refresh()
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">1Router account</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp
            ? "Create a workspace for the managed service or your self-hosted control plane."
            : "Sign in to manage your workspace, API keys, and billing."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {isSignUp && (
          <label className="block text-sm font-medium">
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="name"
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Working…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "New to 1Router?"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-primary hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  )
}
