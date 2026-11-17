import type { SeoIssue, SeoRow } from '../../../contracts/seo'

function attr(html: string, re: RegExp): string | undefined {
  const m = re.exec(html)
  return m?.[1] ? decodeEntities(m[1]) : undefined
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/** Meta tags grouped by `property`/`name` prefix, e.g. og / twitter. */
export function metaByPrefix(html: string, prefix: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    const key = /(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]
    const content = /content=["']([^"']*)["']/i.exec(tag)?.[1]
    if (key?.startsWith(`${prefix}:`) && content !== undefined) out[key.slice(prefix.length + 1)] = decodeEntities(content)
  }
  return out
}

export function extractHead(html: string): Omit<SeoRow, 'issues'> {
  const head = html.slice(0, Math.max(html.indexOf('</head>'), 4000))
  return {
    path: '',
    url: '',
    status: 0,
    title: attr(head, /<title[^>]*>([^<]*)<\/title>/i),
    description:
      attr(head, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
      attr(head, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i),
    og: metaByPrefix(head, 'og'),
    twitter: metaByPrefix(head, 'twitter'),
    canonical: attr(head, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i),
    lang: attr(html.slice(0, 2000), /<html\b[^>]*lang=["']([^"']*)["']/i),
    h1: (html.match(/<h1\b/gi) ?? []).length,
    bytes: html.length,
    ms: 0,
  }
}

export function judge(row: Omit<SeoRow, 'issues'>): SeoIssue[] {
  const issues: SeoIssue[] = []
  const push = (level: 'bad' | 'warn', what: string): void => void issues.push({ level, what })
  /** -1 is the abort sentinel, 0 is a fetch that threw before a response. */
  if (row.status === -1) push('bad', 'request timed out')
  else if (row.status === 0) push('bad', 'no response from the dev server')
  else if (row.status >= 400) push('bad', `http ${row.status}`)
  if (!row.title) push('bad', 'no <title>')
  else if (row.title.length < 10) push('warn', `title too short (${row.title.length})`)
  else if (row.title.length > 60) push('warn', `title too long (${row.title.length})`)
  if (!row.description) push('bad', 'no meta description')
  else if (row.description.length < 50) push('warn', `description too short (${row.description.length})`)
  else if (row.description.length > 160) push('warn', `description too long (${row.description.length})`)
  if (!row.og.image) push('warn', 'no og:image')
  if (!row.og.title) push('warn', 'no og:title')
  if (!row.twitter.card) push('warn', 'no twitter:card')
  if (!row.canonical) push('warn', 'no canonical link')
  if (!row.lang) push('warn', 'html has no lang attribute')
  if (row.h1 === 0) push('warn', 'no h1 in the served html')
  else if (row.h1 > 1) push('warn', `${row.h1} h1 elements`)
  return issues
}
