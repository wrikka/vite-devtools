import type { SeoReport, SeoRow } from '../../../contracts/seo'
import type { PageFetcher } from '../../../core/ports/page-fetcher'
import { decodeEntities, extractHead, judge, metaByPrefix } from '../domain/seo-parse'

export { decodeEntities, metaByPrefix, judge }

const CONCURRENCY = 4
const MAX_ROUTES = 60
const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0', '::1'])

/** Only the dev server on this machine — the hub runs unattended, so no outbound fetches. */
export function assertLocalOrigin(raw: string): URL {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('origin must be http(s)')
  if (!PRIVATE_HOSTS.has(url.hostname)) throw new Error(`refused: ${url.hostname} is not a local dev origin`)
  return url
}

async function auditOne(fetcher: PageFetcher, origin: URL, path: string): Promise<Omit<SeoRow, 'issues'>> {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, origin)
  const started = Date.now()
  const result = await fetcher.fetch(url.href)
  const partial = extractHead(result.body)
  return {
    ...partial,
    path: url.pathname,
    url: url.href,
    status: result.error === 'timeout' ? -1 : result.status,
    ms: Date.now() - started,
  }
}

export async function auditSeo(fetcher: PageFetcher, origin: string, paths: string[]): Promise<SeoReport> {
  const base = assertLocalOrigin(origin)
  const queue = paths.slice(0, MAX_ROUTES)
  const rows: SeoRow[] = []
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const path = queue[cursor++]!
      const partial = await auditOne(fetcher, base, path)
      rows.push({ ...partial, issues: judge(partial) })
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
  rows.sort((a, b) => a.path.localeCompare(b.path))
  return { rows, origin: base.origin }
}
