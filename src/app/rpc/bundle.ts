import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditBundle as runAudit } from '../../modules/audits/usecases/audit-bundle'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

export { findCycles } from '../../modules/audits/usecases/audit-bundle'
export type { GraphNode, ModuleGraph } from '../../modules/audits/usecases/audit-bundle'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const auditBundle = defineRpcFunction({
  name: 'audit-bundle',
  type: 'query',
  agent: {
    description:
      'Inspect the live Vite client module graph: largest transformed modules with estimated gzip size, project-local vs dependency split, and import cycles among local modules',
  },
  args: [z.object({})],
  returns: z.object({
    available: z.boolean(),
    reason: z.string().optional(),
    modules: z.number(),
    total: z.number(),
    localBytes: z.number(),
    depBytes: z.number(),
    top: z.array(z.object({ file: z.string(), size: z.number(), gzip: z.number().optional(), local: z.boolean() })),
    cycles: z.array(z.array(z.string())),
  }),
  handler: async () => runAudit(deps),
})
