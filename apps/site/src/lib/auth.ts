import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { apiKey } from "@better-auth/api-key"
import { bearer, genericOAuth, magicLink, organization } from "better-auth/plugins"
import { authEmailConfigurationError, escapeHtml, sendAuthEmail } from "@/lib/auth-email"
import { stripe } from "@better-auth/stripe"
import Stripe from "stripe"
import { database } from "@/lib/database"

const isDevelopment = process.env.NODE_ENV === "development"
const isBuild = process.env.NEXT_PHASE === "phase-production-build"
const betterAuthSecret = process.env.BETTER_AUTH_SECRET
const betterAuthUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
const magicLinkEmailError = authEmailConfigurationError()
const enterpriseOidcValues = [process.env.ENTERPRISE_OIDC_ISSUER, process.env.ENTERPRISE_OIDC_CLIENT_ID, process.env.ENTERPRISE_OIDC_CLIENT_SECRET]
const enterpriseOidcConfigured = enterpriseOidcValues.every(Boolean)

function enterpriseOidcConfigurationError(): string {
  if (enterpriseOidcValues.every((value) => !value) || enterpriseOidcConfigured) return ""
  return "Enterprise OIDC requires ENTERPRISE_OIDC_ISSUER, ENTERPRISE_OIDC_CLIENT_ID, and ENTERPRISE_OIDC_CLIENT_SECRET"
}

// Next evaluates route modules while building. Keep that evaluation
// side-effect-safe, but expose a runtime error below instead of ever using a
// build placeholder to serve real requests.
export const authConfigurationError = !isDevelopment && !isBuild
  ? [
      !betterAuthSecret || betterAuthSecret.length < 32 ? "BETTER_AUTH_SECRET must be set to at least 32 characters" : null,
      !process.env.DATABASE_URL ? "DATABASE_URL must be configured" : null,
      !process.env.BETTER_AUTH_URL ? "BETTER_AUTH_URL must be configured" : null,
      stripeConfigurationError() || null,
      enterpriseOidcConfigurationError() || null,
      magicLinkEmailError || null,
    ].filter((message): message is string => Boolean(message)).join("; ")
  : ""

const authSecretForInitialization = betterAuthSecret || "build-only-secret-not-for-runtime-32-chars"

function stripeConfigurationError(): string {
  if (process.env.DEPLOYMENT_MODE !== "managed") return ""
  const values = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_PRICE_ID]
  if (values.every(Boolean) || values.every((value) => !value)) return ""
  return "Managed Stripe billing requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_ID"
}

if (stripeConfigurationError()) {
  // Keep this visible during startup without throwing while the route module
  // is imported. The route handlers return a controlled configuration error.
  console.error(stripeConfigurationError())
}

// The same PostgreSQL contract works for a self-hosted installation and the
// managed service. Self-hosters run this database themselves; managed mode
// supplies a managed DATABASE_URL.

function createStripePlugin() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const priceId = process.env.STRIPE_PRICE_ID

  // Stripe is managed-service-only. Self-hosted deployments keep it disabled
  // even if an operator has unrelated Stripe variables in its environment.
  if (process.env.DEPLOYMENT_MODE !== "managed") return null
  if (stripeConfigurationError() || !secretKey || !webhookSecret || !priceId) return null

  const stripeClient = new Stripe(secretKey)

  return stripe({
    stripeClient,
    stripeWebhookSecret: webhookSecret,
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: [
        {
          name: "cloud",
          priceId,
          limits: {
            mode: "managed",
          },
        },
      ],
    },
    onEvent: async (event) => {
      // Better Auth persists subscription state. This hook is intentionally
      // available for managed-only analytics, notifications, and metering.
      console.info("stripe event received", event.type)
    },
  })
}

const stripePlugin = createStripePlugin()

const enterpriseOidcPlugin = enterpriseOidcConfigured
  ? genericOAuth({
      config: [{
        providerId: "enterprise-oidc",
        clientId: process.env.ENTERPRISE_OIDC_CLIENT_ID!,
        clientSecret: process.env.ENTERPRISE_OIDC_CLIENT_SECRET!,
        discoveryUrl: `${process.env.ENTERPRISE_OIDC_ISSUER!.replace(/\/$/, "")}/.well-known/openid-configuration`,
        issuer: process.env.ENTERPRISE_OIDC_ISSUER,
        scopes: ["openid", "profile", "email"],
        pkce: true,
        requireIssuerValidation: true,
      }],
    })
  : null

export const auth = betterAuth({
  database,
  baseURL: betterAuthUrl,
  secret: authSecretForInitialization,
  trustedOrigins: [
    betterAuthUrl,
    ...(process.env.TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) || []),
  ],
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [
    magicLink({
      expiresIn: 600,
      sendMagicLink: async ({ email, url }) => {
        const safeUrl = escapeHtml(url)
        await sendAuthEmail({
          to: email,
          subject: "Your 1Router sign-in link",
          text: `Sign in to 1Router: ${url}\n\nThis link expires in 10 minutes and can only be used once.`,
          html: `<p>Sign in to 1Router by clicking the link below:</p><p><a href="${safeUrl}">Sign in to 1Router</a></p><p>This link expires in 10 minutes and can only be used once.</p>`,
        })
      },
    }),
    organization(),
    apiKey({
      references: "user",
      defaultPrefix: "router_",
      requireName: true,
    }),
    bearer(),
    ...(stripePlugin ? [stripePlugin] : []),
    ...(enterpriseOidcPlugin ? [enterpriseOidcPlugin] : []),
    // Better Auth documents nextCookies as the final plugin.
    nextCookies(),
  ],
})

export type Auth = typeof auth
