import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { RouteSchema, type RoutesReport } from '../../contracts/routes'
import { listRoutes as scanRoutes } from '../../modules/scans'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

export type { RouteRow, RoutesReport } from '../../contracts/routes'
export { pathFromFile, kindFromFile, parseRoute } from '../../modules/scans/domain/route-parse'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const listRoutes = defineRpcFunction({
  name: 'list-routes',
  type: 'query',
  agent: {
    description:
      'Inventory of file-based routes (TanStack Router conventions): url path, source file, loader/head/ssr flags, params and the statically declared title/description',
  },
  args: [z.object({ dir: z.string().optional() })],
  returns: z.object({
    routes: z.array(RouteSchema),
    /** `none` when no route folder was found — the panel shows that instead of an empty table. */
    detected: z.enum(['tanstack-router', 'file-based', 'none']),
    root: z.string(),
  }),
  handler: async ({ dir } = {}): Promise<RoutesReport> => scanRoutes(deps, dir),
})
