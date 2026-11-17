import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { SeoAuditSchema } from '../../contracts/seo'
import { auditSeo as runAudit } from '../../modules/audits/usecases/audit-seo'
import type { PageFetcher } from '../../core/ports/page-fetcher'
import { infraDeps } from '../infra'

export { assertLocalOrigin, decodeEntities, judge, metaByPrefix } from '../../modules/audits/usecases/audit-seo'
export type { SeoRow, SeoIssue, SeoReport } from '../../contracts/seo'

const MAX_ROUTES = 60

export function createSeoRpc(deps: { fetcher: PageFetcher }) {
  const auditSeo = defineRpcFunction({
    name: 'audit-seo',
    type: 'query',
    agent: {
      description:
        'Fetch each route from the local dev server and report the served <title>, meta description, og/twitter tags, canonical, lang and h1 count with pass-or-warn issues per path (localhost origins only)',
    },
    args: [
      z.object({
        origin: z.string().min(1),
        paths: z.array(z.string()).min(1).max(MAX_ROUTES),
      }),
    ],
    returns: z.object({ rows: z.array(SeoAuditSchema), origin: z.string() }),
    handler: async ({ origin, paths }) => runAudit(deps.fetcher, origin, paths),
  })

  return { auditSeo }
}

// Named exports kept for the package's public API.
export const { auditSeo } = createSeoRpc(infraDeps)
