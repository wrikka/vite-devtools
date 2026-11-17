import type { PageFetcher, PageFetchInit, PageFetchResult } from '../core/ports/page-fetcher'

const TIMEOUT_MS = 8_000
const UA = 'wrikka-vite-devtools-seo-audit'

/** Loopback-only fetch for the audit panels — the hub must never reach outbound hosts. */
export const localPageFetcher: PageFetcher = {
  async fetch(url: string, init?: PageFetchInit): Promise<PageFetchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: init?.method,
        headers: { accept: 'text/html', 'user-agent': UA, ...init?.headers },
        body: init?.body,
        signal: controller.signal,
      })
      const headers: Record<string, string> = {}
      res.headers.forEach((value, name) => {
        if (!(name in headers)) headers[name] = value
      })
      return { status: res.status, body: await res.text(), headers }
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'AbortError'
      return { status: 0, body: '', error: timedOut ? 'timeout' : 'network' }
    } finally {
      clearTimeout(timer)
    }
  },
}
