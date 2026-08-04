import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedIdentity } from "@/lib/request-auth"
import { createApplication, listOwnedApplications } from "@/lib/applications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function identityFor(request: NextRequest): Promise<string | null> {
  try {
    return await authenticatedIdentity(request)
  } catch (error) {
    console.error("application authentication failed", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  const identity = await identityFor(request)
  if (!identity) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })

  try {
    return Response.json({ data: await listOwnedApplications(identity) })
  } catch (error) {
    console.error("application list failed", error)
    return Response.json({ error: { message: "Applications are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  const identity = await identityFor(request)
  if (!identity) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    slug?: unknown
    name?: unknown
    description?: unknown
    websiteUrl?: unknown
    public?: unknown
  } | null
  if (!body || typeof body.slug !== "string" || typeof body.name !== "string") {
    return Response.json({ error: { message: "slug and name are required.", type: "invalid_request_error" } }, { status: 400 })
  }

  try {
    const application = await createApplication(identity, {
      slug: body.slug,
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
      websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl : undefined,
      public: body.public === true,
    })
    return Response.json({ data: application }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create application."
    console.error("application creation failed", error)
    if (message.includes("duplicate key") || message.includes("router_applications_slug_key")) {
      return Response.json({ error: { message: "That application slug is already in use.", type: "conflict_error" } }, { status: 409 })
    }
    if (message.includes("Application slugs") || message.includes("Application name") || message.includes("Website URL")) {
      return Response.json({ error: { message, type: "invalid_request_error" } }, { status: 400 })
    }
    return Response.json({ error: { message: "Applications are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}
