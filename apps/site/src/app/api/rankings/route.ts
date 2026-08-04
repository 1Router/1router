import { getPublicRankings } from "@/lib/usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getPublicRankings()
    return Response.json({
      data,
      dataSource: "first_party_usage",
      available: true,
      generatedAt: new Date().toISOString(),
      reportingNote: data.length === 0
        ? "No verified usage has been collected by this deployment yet."
        : "Successful authenticated requests recorded by this deployment; totals exclude anonymous and direct-gateway traffic.",
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("public rankings query failed", error)
    return Response.json({
      data: [],
      dataSource: "first_party_usage",
      available: false,
      generatedAt: new Date().toISOString(),
      reportingNote: "Verified usage is temporarily unavailable; the database may not be initialized.",
    }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }
}
