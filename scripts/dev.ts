import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawn, type ChildProcess } from "node:child_process"

const root = resolve(import.meta.dir, "..")
const composeFile = resolve(root, "docker-compose.self-hosted.yml")
const inheritedEnvKeys = new Set(Object.keys(process.env))

function loadEnvFile(path: string, allowOverride: boolean) {
  if (!existsSync(path)) return

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || line.startsWith("[")) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    const value = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2")
    // Explicit shell variables always win. .env.local overrides .env.
    if (!inheritedEnvKeys.has(key) && (allowOverride || !(key in process.env))) {
      process.env[key] = value
    }
  }
}

// Explicit shell variables win, then .env.local, then .env.
loadEnvFile(resolve(root, "apps/site/.env"), false)
loadEnvFile(resolve(root, "apps/site/.env.local"), true)

const hostPort = process.env.POSTGRES_HOST_PORT || "5433"
const configuredDatabaseUrl = Boolean(process.env.DATABASE_URL)
if (!configuredDatabaseUrl) {
  process.env.DATABASE_URL = `postgres://postgres:postgres@localhost:${hostPort}/onerouter`
} else if (hostPort !== "5433") {
  // Keep the common copied template aligned when a custom Compose host port
  // is selected. Explicit non-local database URLs are left untouched.
  process.env.DATABASE_URL = process.env.DATABASE_URL?.replace(
    /(@(?:localhost|127\\.0\\.0\\.1):)5433(\\/)/,
    `$1${hostPort}$2`,
  )
}
process.env.BETTER_AUTH_URL ||= "http://localhost:3000"
process.env.BETTER_AUTH_SECRET ||= "local-development-secret-change-me-32-chars"
// The one-command local workflow intentionally uses the local Rust gateway;
// deployed/self-hosted site processes default to https://api.1router.com.
process.env.ROUTER_API_URL = "http://localhost:3001"
process.env.ROUTER_API_KEY ||= "router_sk_test"
process.env.ROUTER_IDENTITY_SECRET ||= "local-development-identity-secret-change-me"
process.env.AUTH_REQUIRED ||= "false"

const bun = process.env.BUN_BIN || "bun"
const children: ChildProcess[] = []
let shuttingDown = false

function run(command: string, args: string[], env = process.env): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
    })
    child.once("error", rejectRun)
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGTERM") resolveRun()
      else rejectRun(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`))
    })
  })
}

async function waitForPostgres() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const result = await new Promise<number>((resolveWait) => {
      const child = spawn(
        "docker",
        ["compose", "-f", composeFile, "exec", "-T", "postgres", "pg_isready", "-U", "postgres", "-d", "onerouter"],
        { cwd: root, env: process.env, stdio: "ignore" },
      )
      child.once("error", () => resolveWait(1))
      child.once("exit", (code) => resolveWait(code ?? 1))
    })

    if (result === 0) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
  }

  throw new Error("PostgreSQL did not become ready within 30 seconds")
}

function stopChild(child: ChildProcess): Promise<void> {
  return new Promise((resolveStop) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveStop()
      return
    }

    const timeout = setTimeout(() => {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL")
        } catch {
          child.kill("SIGKILL")
        }
      }
      resolveStop()
    }, 2_000)
    child.once("exit", () => {
      clearTimeout(timeout)
      resolveStop()
    })
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {
        child.kill("SIGTERM")
      }
    }
  })
}

async function shutdown(exitCode: number) {
  if (shuttingDown) return
  shuttingDown = true
  await Promise.all(children.map(stopChild))
  process.exit(exitCode)
}

process.once("SIGINT", () => void shutdown(130))
process.once("SIGTERM", () => void shutdown(143))

try {
  console.log("[dev] Starting PostgreSQL with Docker Compose…")
  await run("docker", ["compose", "-f", composeFile, "up", "-d", "postgres"])
  await waitForPostgres()

  console.log("[dev] Bootstrapping Better Auth and application tables…")
  await run(bun, ["run", "--cwd", "apps/site", "auth:bootstrap"])

  console.log("[dev] Starting site and Rust API. Press Ctrl-C to stop both.")
  const serviceOptions = { cwd: root, env: process.env, stdio: "inherit" as const, detached: true }
  const site = spawn(bun, ["run", "dev:site"], serviceOptions)
  const api = spawn(bun, ["run", "dev:api"], serviceOptions)
  children.push(site, api)

  const serviceExited = new Promise<number>((resolveExit, rejectExit) => {
    const watch = (name: string, child: ChildProcess) => {
      child.once("error", (error) => rejectExit(new Error(`${name} failed to start: ${error.message}`)))
      child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)))
    }
    watch("site", site)
    watch("api", api)
  })

  const firstExit = await serviceExited
  if (!shuttingDown) {
    console.error(`[dev] A development service exited (${firstExit}); stopping the other service.`)
    await shutdown(firstExit)
  }
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : error}`)
  await shutdown(1)
}
