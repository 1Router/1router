import type { Metadata } from "next"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a 1Router account.",
}

export default function SignUpPage() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <AuthForm mode="sign-up" />
    </div>
  )
}
