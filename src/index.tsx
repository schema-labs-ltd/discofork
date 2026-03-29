import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"

import { App } from "./app/App.tsx"
import { parseCliOptions, renderHelpText } from "./app/args.ts"

const cliOptions = parseCliOptions(process.argv.slice(2))

if (cliOptions.help) {
  console.log(renderHelpText())
} else {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  })

  createRoot(renderer).render(<App cliOptions={cliOptions} />)
}
