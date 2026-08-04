import { chatPost } from "@/app/api/chat/route"

export const POST = (request: Parameters<typeof chatPost>[0]) => chatPost(request, true)

export const runtime = "nodejs"
