import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditHeaders as runAudit } from '../../modules/audits/usecases/audit-headers'
import type { PageFetcher } from '../../core/ports/page-fetcher'
import type { ViteServerContext } from '../../core/ports/vite-server'

export { judgeHeaders, scoreChecks } from '../../modules/audits/usecases/audit-headers'
export type { HeaderCheck, HeaderCheckStatus } from '../../modules/audits/usecases/audit-headers'

export function createHeadersRpc(deps: { fetcher: PageFetcher; server: ViteServerContext }) {
  const auditHeaders = defineRpcFunction({
    name: 'audit-headers',
    type: 'query',
    jsonSerializable: true,
    args: [z.object({ url: z.string().optional() })],
    agent: {
      description:
        'Fetch a local dev URL (default: the app root) and grade its security response headers (CSP, HSTS, COOP/COEP, nosniff, referrer, permissions) with a 0–100 score',
    },
    returns: z.object({
      ok: z.boolean(),
      url: z.string(),
      status: z.number(),
      durationMs: z.number(),
      score: z.number(),
      error: z.string().optional(),
      checks: z.array(
        z.object({
          name: z.string(),
          header: z.string(),
          value: z.string().optional(),
          status: z.enum(['ok', 'warn', 'missing', 'info']),
          weight: z.number(),
          detail: z.string(),
        }),
      ),
      headers: z.array(z.object({ name: z.string(), value: z.string() })),
    }),
    handler: async ({ url }) => runAudit(deps.fetcher, deps.server, url),
  })

  return { auditHeaders }
}
