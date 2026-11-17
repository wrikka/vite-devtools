import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { RouteSchema, type RoutesReport } from '../../contracts/routes'
import { listRoutes as scanRoutes } from '../../modules/scans'
import type { ScansDeps } from '../../modules/scans'
import { infraDeps } from '../infra'

export type { RouteRow, RoutesReport } from '../../contracts/routes'
export { pathFromFile, kindFromFile, parseRoute } from '../../modules/scans/domain/route-parse'

export function createRoutesRpc(deps: ScansDeps) {
  const listRoutes = defineRpcFunction({
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

  return { listRoutes }
}

// Named exports kept for the package's public API.
export const { listRoutes } = createRoutesRpc(infraDeps)
