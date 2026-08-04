import { toNextJsHandler } from "better-auth/next-js"
import { auth, authConfigurationError } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handlers = toNextJsHandler(auth)

function unavailable() {
  return Response.json(
    {
      error: {
        message: `Authentication is not configured: ${authConfigurationError}`,
        type: "configuration_error",
      },
    },
    { status: 503 },
  )
}

export async function GET(request: Request) {
  return authConfigurationError ? unavailable() : handlers.GET(request)
}

export async function POST(request: Request) {
  return authConfigurationError ? unavailable() : handlers.POST(request)
}

export async function PATCH(request: Request) {
  return authConfigurationError ? unavailable() : handlers.PATCH(request)
}

export async function PUT(request: Request) {
  return authConfigurationError ? unavailable() : handlers.PUT(request)
}

export async function DELETE(request: Request) {
  return authConfigurationError ? unavailable() : handlers.DELETE(request)
}
