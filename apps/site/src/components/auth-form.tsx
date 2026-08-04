"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient, socialProviders } from "@/lib/auth-client"

type Mode = "sign-in" | "sign-up"

export function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pending, setPending] = useState(false)

  const isSignUp = mode === "sign-up"

  async function signInWith(provider: "google" | "github") {
    setError("")
    setNotice("")
    setPending(true)
    const result = await authClient.signIn.social({
      provider,
      callbackURL: "/account",
      newUserCallbackURL: "/account",
    })
    setPending(false)
    if (result.error) setError(result.error.message || `Unable to sign in with ${provider}.`)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setPending(true)

    const result = await authClient.signIn.magicLink({
      email,
      name: isSignUp ? name : undefined,
      callbackURL: "/account",
      newUserCallbackURL: "/account",
    })

    setPending(false)

    if (result.error) {
      setError(result.error.message || "Unable to send a sign-in link. Please try again.")
      return
    }

    setNotice("Check your email for a secure sign-in link. It expires in 10 minutes.")
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">1Router account</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in securely with a magic link or your preferred provider. No password required.
        </p>
      </div>

      {(socialProviders.google || socialProviders.github) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {socialProviders.google && (
            <button
              type="button"
              disabled={pending}
              onClick={() => signInWith("google")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>
          )}
          {socialProviders.github && (
            <button
              type="button"
              disabled={pending}
              onClick={() => signInWith("github")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with GitHub
            </button>
          )}
        </div>
      )}

      {(socialProviders.google || socialProviders.github) && (
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>or email link</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

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

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Email me a sign-in link"}
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
