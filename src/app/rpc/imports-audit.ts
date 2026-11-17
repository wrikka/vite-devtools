import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditImports as runAudit } from '../../modules/audits/usecases/audit-imports'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

export { relativeImports, exportedIdentifiers, resolveRelative } from '../../modules/audits/usecases/audit-imports'
export type { SourceFile } from '../../contracts/source-scan'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const auditImports = defineRpcFunction({
  name: 'audit-imports',
  type: 'query',
  agent: {
    description:
      'Build the relative import graph: importers per file, unresolved relative specifiers, and exported identifiers no other file mentions (candidates for dead exports)',
  },
  args: [z.object({ dir: z.string().optional() })],
  returns: z.object({
    root: z.string(),
    scanned: z.number(),
    truncated: z.boolean(),
    edges: z.number(),
    files: z.array(z.object({ file: z.string(), importers: z.array(z.string()), imports: z.array(z.string()) })),
    unused: z.array(z.object({ file: z.string(), name: z.string() })),
    unresolved: z.array(z.object({ file: z.string(), specifier: z.string() })),
  }),
  handler: async ({ dir } = {}) => runAudit(deps, dir),
})
