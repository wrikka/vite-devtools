import type { PageFetcher } from '../../../core/ports/page-fetcher'
import type { ViteServerContext } from '../../../core/ports/vite-server'
import { assertLocalOrigin } from './audit-seo'
import { judgeHeaders, scoreChecks, type HeaderCheck } from '../domain/header-checks'

export { judgeHeaders, scoreChecks }
export type { HeaderCheck, HeaderCheckStatus } from '../domain/header-checks'

const MAX_HEADERS = 80

export interface HeadersAuditReport {
  ok: boolean
  url: string
  status: number
  durationMs: number
  score: number
  error?: string
  checks: HeaderCheck[]
  headers: { name: string; value: string }[]
}

export async function auditHeaders(
  fetcher: PageFetcher,
  server: ViteServerContext,
  url?: string,
): Promise<HeadersAuditReport> {
  const startedAt = Date.now()
  const fail = (error: string, reportUrl: string): HeadersAuditReport => ({
    ok: false,
    url: reportUrl,
    status: 0,
    durationMs: Date.now() - startedAt,
    score: 0,
    error,
    checks: [],
    headers: [],
  })

  let target: URL
  try {
    target = assertLocalOrigin(url?.trim() || server.origin('/') || 'http://localhost:5173/')
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), url ?? '')
  }

  const result = await fetcher.fetch(target.toString())
  if (result.error) {
    return fail(result.error === 'timeout' ? 'request timed out' : 'request failed', target.toString())
  }

  const headers: { name: string; value: string }[] = Object.entries(result.headers ?? {})
    .slice(0, MAX_HEADERS)
    .map(([name, value]) => ({ name, value }))
  headers.sort((a, b) => a.name.localeCompare(b.name))
  const checks = judgeHeaders(new Headers(result.headers ?? {}), target.protocol)
  return {
    ok: true,
    url: target.toString(),
    status: result.status,
    durationMs: Date.now() - startedAt,
    score: scoreChecks(checks),
    checks,
    headers,
  }
}
