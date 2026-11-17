import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { searchSource as search } from '../../modules/scans'
import type { SearchReport } from '../../modules/scans'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

const MatchSchema = z.object({
  file: z.string(),
  line: z.number(),
  snippet: z.string(),
})

export const searchSource = defineRpcFunction({
  name: 'search-source',
  type: 'query',
  agent: {
    description:
      'Substring-search project source files under the server cwd. scope: local=all source, components=component/ui folders, routes=routes/pages folders',
  },
  args: [
    z.object({
      query: z.string().min(1).max(120),
      scope: z.enum(['local', 'components', 'routes']).optional(),
      limit: z.number().optional(),
    }),
  ],
  returns: z.object({
    query: z.string(),
    scope: z.string(),
    matches: z.array(MatchSchema),
    truncated: z.boolean(),
  }),
  handler: async ({ query, scope = 'local', limit = 30 }): Promise<SearchReport> =>
    search(deps, query, scope, limit),
})
