import { listPublicApplications } from "@/lib/applications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await listPublicApplications()
    return Response.json({
      data,
      dataSource: "first_party_usage_opt_in",
      available: true,
      generatedAt: new Date().toISOString(),
      reportingNote: data.length === 0
        ? "No public applications have opted in on this deployment yet."
        : "Successful usage from applications explicitly registered and opted in by their owners.",
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (error) {
    // A self-hosted site may be started before the optional application
    // migration has been applied. Treat that expected first-run state as an
    // empty showcase, while preserving 503 for real database outages.
    if (error && typeof error === "object" && "code" in error && ["42P01", "42703"].includes(String((error as { code?: unknown }).code))) {
      return Response.json({
        data: [],
        dataSource: "first_party_usage_opt_in",
        available: false,
        generatedAt: new Date().toISOString(),
        reportingNote: "The public application showcase is not initialized yet. Run `bun run --cwd apps/site auth:bootstrap` or `bun run --cwd apps/site app:migrate` to enable it.",
      }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      })
    }

    console.error("public application showcase query failed", error)
    return Response.json({
      data: [],
      dataSource: "first_party_usage_opt_in",
      available: false,
      generatedAt: new Date().toISOString(),
      reportingNote: "The public application database is temporarily unavailable.",
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    })
  }
}
