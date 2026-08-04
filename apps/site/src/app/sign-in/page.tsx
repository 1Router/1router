import type { Metadata } from "next"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your 1Router account.",
}

export default function SignInPage() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <AuthForm mode="sign-in" />
    </div>
  )
}
