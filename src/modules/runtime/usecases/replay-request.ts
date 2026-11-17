import type { PageFetcher } from '../../../core/ports/page-fetcher'
import type { ViteServerContext } from '../../../core/ports/vite-server'
import { assertLocalOrigin } from '../../audits/usecases/audit-seo'

const MAX_BODY_PREVIEW = 4_096

export interface ReplayReport {
  ok: boolean
  status: number
  durationMs: number
  headers: { name: string; value: string }[]
  body: string
  truncated: boolean
  error?: string
}

export async function replayRequest(
  fetcher: PageFetcher,
  server: ViteServerContext,
  args: { url: string; method?: string; headers?: Record<string, string>; body?: string },
): Promise<ReplayReport> {
  const startedAt = Date.now()
  const fail = (error: string, target = ''): ReplayReport => ({
    ok: false,
    status: 0,
    durationMs: Date.now() - startedAt,
    headers: [],
    body: '',
    truncated: false,
    error: `${target}${target ? ': ' : ''}${error}`,
  })
  const raw = args.url.trim()
  let target: URL
  try {
    target = assertLocalOrigin(raw || server.origin('/') || 'http://localhost:5173/')
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), raw)
  }
  const method = (args.method ?? 'GET').toUpperCase()
  const result = await fetcher.fetch(target.toString(), {
    method,
    headers: args.headers,
    body: args.body && method !== 'GET' ? args.body : undefined,
  })
  if (result.error) return fail(result.error === 'timeout' ? 'request timed out' : 'request failed', target.toString())
  const seen = Object.entries(result.headers ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const text = result.body
  return {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    durationMs: Date.now() - startedAt,
    headers: seen,
    body: text.slice(0, MAX_BODY_PREVIEW),
    truncated: text.length > MAX_BODY_PREVIEW,
  }
}