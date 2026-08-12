import { database } from "../src/lib/database"
import { runControlPlaneJobs } from "../src/lib/control-plane-jobs"

const intervalSeconds = Number.parseInt(process.env.CONTROL_PLANE_JOB_INTERVAL_SECONDS || "0", 10)
let stopping = false

async function runOnce() {
  const summary = await runControlPlaneJobs()
  console.info("control-plane maintenance completed", summary)
}

process.once("SIGINT", () => { stopping = true })
process.once("SIGTERM", () => { stopping = true })

try {
  do {
    await runOnce()
    if (intervalSeconds <= 0) break
    await new Promise<void>((resolve) => setTimeout(resolve, intervalSeconds * 1000))
  } while (!stopping)
} catch (error) {
  console.error("control-plane maintenance failed", error)
  process.exitCode = 1
} finally {
  await database.end()
}
