type AuthEmail = {
  to: string
  subject: string
  text: string
  html: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/**
 * Send an authentication email without exposing provider credentials to the
 * browser. Resend is used through its HTTP API so self-hosted deployments do
 * not need an additional runtime dependency or SMTP server.
 */
export async function sendAuthEmail({ to, subject, text, html }: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Magic-link email is not configured: set RESEND_API_KEY and RESEND_EMAIL_FROM")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Authentication email delivery failed (${response.status}): ${detail.slice(0, 300)}`)
  }
}
