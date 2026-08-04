"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { apiKeyClient } from "@better-auth/api-key/client"
import { stripeClient } from "@better-auth/stripe/client"

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    apiKeyClient(),
    // The server only exposes Stripe endpoints when Stripe is configured.
    // Keeping the client plugin here lets managed deployments use the same
    // client bundle without making Stripe mandatory for self-hosters.
    stripeClient({ subscription: true }),
  ],
})

export const { useSession, signIn, signUp, signOut } = authClient
