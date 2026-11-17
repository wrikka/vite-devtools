import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { ComponentSchema, type ComponentsReport } from '../../contracts/components'
import { listComponents as scanComponents } from '../../modules/scans'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

export type { ComponentRow, ComponentsReport } from '../../contracts/components'
export { exportedNames, kindOf } from '../../modules/scans/domain/component-parse'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const listComponents = defineRpcFunction({
  name: 'list-components',
  type: 'query',
  agent: {
    description:
      'Inventory of React/Solid components in the project: file, exported names, lines of code, and how many other files reference them (refs=0 means unused)',
  },
  args: [z.object({ dir: z.string().optional() })],
  returns: z.object({
    root: z.string(),
    components: z.array(ComponentSchema),
    truncated: z.boolean(),
  }),
  handler: async ({ dir = 'src' } = {}): Promise<ComponentsReport> => scanComponents(deps, dir),
})
