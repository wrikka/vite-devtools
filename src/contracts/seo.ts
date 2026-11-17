import { z } from 'zod'

const IssueSchema = z.object({
  level: z.enum(['bad', 'warn']),
  what: z.string(),
})

export const SeoAuditSchema = z.object({
  path: z.string(),
  url: z.string(),
  status: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  og: z.record(z.string(), z.string()),
  twitter: z.record(z.string(), z.string()),
  canonical: z.string().optional(),
  lang: z.string().optional(),
  h1: z.number(),
  bytes: z.number(),
  ms: z.number(),
  issues: z.array(IssueSchema),
})

export type SeoRow = z.infer<typeof SeoAuditSchema>
export type SeoIssue = z.infer<typeof IssueSchema>
export interface SeoReport {
  rows: SeoRow[]
  origin: string
}
