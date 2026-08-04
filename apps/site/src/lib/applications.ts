import { database } from "@/lib/database"

export interface PublicApplication {
  id: string
  slug: string
  name: string
  description: string
  websiteUrl: string | null
  tokens: {
    today: number
    week: number
    month: number
  }
  requests: {
    today: number
    week: number
    month: number
  }
}

export interface OwnedApplication {
  id: string
  slug: string
  name: string
  description: string
  websiteUrl: string | null
  public: boolean
}

function boundedText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}

function parseCount(value: string): number {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : 0
}

export function validApplicationSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)
}

export async function createApplication(
  ownerIdentity: string,
  input: { slug: string; name: string; description?: string; websiteUrl?: string; public?: boolean },
): Promise<OwnedApplication> {
  const slug = input.slug.trim().toLowerCase()
  const name = boundedText(input.name, 120)
  const description = boundedText(input.description || "", 500)
  const websiteUrl = input.websiteUrl ? boundedText(input.websiteUrl, 500) : null
  if (!validApplicationSlug(slug)) throw new Error("Application slugs must use lowercase letters, numbers, and hyphens.")
  if (!name) throw new Error("Application name is required.")
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) throw new Error("Website URL must use http or https.")

  const result = await database.query<OwnedApplication>(
    `INSERT INTO router_applications (owner_identity, slug, name, description, website_url, public)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::text, slug, name, description, website_url AS "websiteUrl", public`,
    [ownerIdentity, slug, name, description, websiteUrl, input.public === true],
  )
  return result.rows[0]
}

export async function listOwnedApplications(ownerIdentity: string): Promise<OwnedApplication[]> {
  const result = await database.query<OwnedApplication>(
    `SELECT id::text, slug, name, description, website_url AS "websiteUrl", public
       FROM router_applications
      WHERE owner_identity = $1
      ORDER BY created_at DESC`,
    [ownerIdentity],
  )
  return result.rows
}

/** Validate an explicit application slug against the authenticated owner. */
export async function resolveApplicationId(ownerIdentity: string, slug: string): Promise<string | null> {
  const result = await database.query<{ id: string }>(
    `SELECT id::text
       FROM router_applications
      WHERE owner_identity = $1 AND slug = $2`,
    [ownerIdentity, slug.trim().toLowerCase()],
  )
  return result.rows[0]?.id || null
}

export async function listPublicApplications(limit = 20): Promise<PublicApplication[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 50)
  const result = await database.query<{
    id: string
    slug: string
    name: string
    description: string
    website_url: string | null
    tokens_today: string
    tokens_week: string
    tokens_month: string
    requests_today: string
    requests_week: string
    requests_month: string
  }>(
    `SELECT
       a.id::text,
       a.slug,
       a.name,
       a.description,
       a.website_url,
       COALESCE(SUM(u.total_tokens) FILTER (WHERE u.created_at >= now() - interval '24 hours'), 0)::text AS tokens_today,
       COALESCE(SUM(u.total_tokens) FILTER (WHERE u.created_at >= now() - interval '7 days'), 0)::text AS tokens_week,
       COALESCE(SUM(u.total_tokens) FILTER (WHERE u.created_at >= now() - interval '30 days'), 0)::text AS tokens_month,
       COUNT(u.id) FILTER (WHERE u.created_at >= now() - interval '24 hours')::text AS requests_today,
       COUNT(u.id) FILTER (WHERE u.created_at >= now() - interval '7 days')::text AS requests_week,
       COUNT(u.id) FILTER (WHERE u.created_at >= now() - interval '30 days')::text AS requests_month
     FROM router_applications a
     LEFT JOIN router_usage u
       ON u.application_id = a.id
      AND u.status >= 200 AND u.status < 300
     WHERE a.public = true
     GROUP BY a.id
     ORDER BY SUM(u.total_tokens) FILTER (WHERE u.created_at >= now() - interval '30 days') DESC NULLS LAST, a.name ASC
     LIMIT $1`,
    [boundedLimit],
  )

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    websiteUrl: row.website_url,
    tokens: {
      today: parseCount(row.tokens_today),
      week: parseCount(row.tokens_week),
      month: parseCount(row.tokens_month),
    },
    requests: {
      today: parseCount(row.requests_today),
      week: parseCount(row.requests_week),
      month: parseCount(row.requests_month),
    },
  }))
}
