#!/usr/bin/env node

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const currentFile = fileURLToPath(import.meta.url)
const packageRoot = path.resolve(path.dirname(currentFile), "..")
const entryPath = path.join(packageRoot, "src", "index.tsx")

if (!existsSync(entryPath)) {
  console.error("Discofork is missing its runtime entrypoint.")
  process.exit(1)
}

const bunExecutable = process.env.BUN_BINARY || "bun"
const child = spawn(bunExecutable, [entryPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
})

child.on("error", (error) => {
  if ("code" in error && error.code === "ENOENT") {
    console.error("Discofork requires Bun on PATH to run via npx. Install Bun from https://bun.sh and try again.")
    process.exit(1)
  }

  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
