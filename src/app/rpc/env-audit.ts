import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditEnv as runAudit } from '../../modules/audits/usecases/audit-env'
import type { AuditsDeps } from '../../modules/audits'
import { infraDeps } from '../infra'

export { envRefs, parseEnvKeys, isSecretName } from '../../modules/audits/usecases/audit-env'

export function createEnvAuditRpc(deps: AuditsDeps) {
  const auditEnv = defineRpcFunction({
    name: 'audit-env',
    type: 'query',
    agent: {
      description:
        'Compare environment variables referenced in source (`import.meta.env.X`, `process.env.X`) with the keys defined in `.env*` files. Returns names and defining files only — never values',
    },
    args: [z.object({ dir: z.string().optional() })],
    returns: z.object({
      root: z.string(),
      scanned: z.number(),
      envFiles: z.array(z.object({ file: z.string(), keys: z.array(z.string()) })),
      refs: z.array(
        z.object({
          name: z.string(),
          files: z.array(z.string()),
          definedIn: z.array(z.string()),
          publicVar: z.boolean(),
          secret: z.boolean(),
          status: z.enum(['ok', 'missing']),
        }),
      ),
      unused: z.array(z.object({ name: z.string(), definedIn: z.array(z.string()) })),
      totals: z.object({ refs: z.number(), defined: z.number(), missing: z.number(), unused: z.number() }),
    }),
    handler: async ({ dir } = {}) => runAudit(deps, dir),
  })

  return { auditEnv }
}

// Named exports kept for the package's public API.
export const { auditEnv } = createEnvAuditRpc(infraDeps)
