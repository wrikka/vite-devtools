/** Port: fetch a page from the local dev server — implemented by `infra/local-page-fetcher`. */
export interface PageFetchResult {
  /** HTTP status, or 0 when the request failed before a response. */
  status: number
  body: string
  /** 'timeout' when the request was aborted, 'network' on other fetch failures. */
  error?: 'timeout' | 'network'
}

export interface PageFetcher {
  /** Fetch `url` (must be loopback) and return status + body text. */
  fetch(url: string): Promise<PageFetchResult>
}
