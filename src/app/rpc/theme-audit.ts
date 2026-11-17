import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { auditTheme as runAudit } from '../../modules/audits/usecases/audit-theme'
import type { AuditsDeps } from '../../modules/audits'

export {
  arbitraryIsColor,
  objectBody,
  splitTopLevel,
  flattenObjectKeys,
  classNameTokens,
  classifyColorUtility,
  themeTokens,
  paletteModules,
} from '../../modules/audits/usecases/audit-theme'
import { infraDeps } from '../infra'
export type { UtilityKind, UtilityRow, ThemeAuditReport } from '../../modules/audits/usecases/audit-theme'

const UtilitySchema = z.object({
  name: z.string(),
  count: z.number(),
  files: z.array(z.string()),
  kind: z.enum(['token', 'allowed', 'palette', 'arbitrary', 'unknown']),
  dark: z.boolean(),
})

export function createThemeAuditRpc(deps: AuditsDeps) {
  const auditTheme = defineRpcFunction({
    name: 'audit-theme',
    type: 'query',
    agent: {
      description:
        'Audit the project against its UnoCSS theme: declared tokens, color utilities actually used, and violations (stock palette hardcodes, arbitrary hex values, dark: variants that the token layer should replace)',
    },
    args: [z.object({ dir: z.string().optional() })],
    returns: z.object({
      root: z.string(),
      hasTheme: z.boolean(),
      tokens: z.array(z.string()),
      scanned: z.number(),
      truncated: z.boolean(),
      utilities: z.array(UtilitySchema),
      violations: z.array(UtilitySchema),
    }),
    handler: async ({ dir } = {}) => runAudit(deps, dir),
  })

  return { auditTheme }
}

// Named exports kept for the package's public API.
export const { auditTheme } = createThemeAuditRpc(infraDeps)
