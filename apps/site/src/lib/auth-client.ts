"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { apiKeyClient } from "@better-auth/api-key/client"
import { stripeClient } from "@better-auth/stripe/client"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    apiKeyClient(),
    magicLinkClient(),
    // The server only exposes Stripe endpoints when Stripe is configured.
    // Keeping the client plugin here lets managed deployments use the same
    // client bundle without making Stripe mandatory for self-hosters.
    stripeClient({ subscription: true }),
  ],
})

export const socialProviders = {
  google: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  github: process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === "true",
}

export const { useSession, signIn, signUp, signOut } = authClient
