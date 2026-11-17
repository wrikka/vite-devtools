/** Port: fetch a page from the local dev server — implemented by `infra/local-page-fetcher`. */
export interface PageFetchInit {
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface PageFetchResult {
  /** HTTP status, or 0 when the request failed before a response. */
  status: number
  body: string
  /** 'timeout' when the request was aborted, 'network' on other fetch failures. */
  error?: 'timeout' | 'network'
  /** Response headers as a lowercase-name → value record (first value wins). */
  headers?: Record<string, string>
}

export interface PageFetcher {
  /** Fetch `url` (must be loopback) and return status + body text. */
  fetch(url: string, init?: PageFetchInit): Promise<PageFetchResult>
}
