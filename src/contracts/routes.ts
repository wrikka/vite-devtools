import { z } from 'zod'

export const RouteSchema = z.object({
  file: z.string(),
  /** URL path — from `createFileRoute('/x')` when present, else derived from the filename. */
  path: z.string(),
  kind: z.enum(['layout', 'index', 'page', 'not-found']),
  hasLoader: z.boolean(),
  hasHead: z.boolean(),
  /** `ssr: false` in the route options, when written. */
  ssrOff: z.boolean(),
  params: z.array(z.string()),
  /** Literal `title:` found in the route options/head, `dynamic` when it is a template or call. */
  title: z.string().optional(),
  /** Literal `content:` of the description meta, when statically written. */
  description: z.string().optional(),
  metaNames: z.array(z.string()),
  /** `routeTree.gen.ts` exists, i.e. the project really uses the TanStack router plugin. */
  generated: z.boolean(),
})

export type RouteRow = z.infer<typeof RouteSchema>
export type RouteKind = RouteRow['kind']

export interface RoutesReport {
  routes: RouteRow[]
  detected: 'tanstack-router' | 'file-based' | 'none'
  root: string
}
