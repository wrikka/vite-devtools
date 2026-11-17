/** Port: fetch a page from the local dev server — implemented by `infra/local-page-fetcher`. */
export interface PageFetcher {
  /** Fetch `url` (must be loopback) and return status + body text. */
  fetch(url: string): Promise<{ status: number; body: string }>
}
