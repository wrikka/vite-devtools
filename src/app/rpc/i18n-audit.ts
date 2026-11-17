import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditI18n as runAudit } from '../../modules/audits/usecases/audit-i18n'
import { nodeProjectFs } from '../../infra/node-project-fs'
import { sourceScanner } from '../../infra/scanners/source-scanner'
import { viteServerContext } from '../../infra/vite-server-context'

export { flattenJson, tCallKeys, hardcodedCopy } from '../../modules/audits/usecases/audit-i18n'

const deps = { fs: nodeProjectFs, scanner: sourceScanner, server: viteServerContext }

export const auditI18n = defineRpcFunction({
  name: 'audit-i18n',
  type: 'query',
  agent: {
    description:
      'Audit i18n: locale catalogs under locales/i18n/lang/messages, per-locale key coverage, keys referenced by `t()` calls but missing from a catalog, unused catalog keys, and JSX text that bypasses translation',
  },
  args: [z.object({ dir: z.string().optional() })],
  returns: z.object({
    root: z.string(),
    detected: z.boolean(),
    used: z.array(z.string()),
    locales: z.array(
      z.object({
        locale: z.string(),
        file: z.string(),
        keys: z.number(),
        missing: z.array(z.string()),
        coverage: z.number(),
      }),
    ),
    unused: z.array(z.object({ locale: z.string(), key: z.string() })),
    hardcoded: z.array(z.object({ file: z.string(), text: z.string() })),
  }),
  handler: async ({ dir } = {}) => runAudit(deps, dir),
})
