import type { RouteKind, RouteRow } from '../../../contracts/routes'

/** `src/routes/posts.$postId.tsx` → `/posts/$postId`; `__root` layouts keep their parent path. */
export function pathFromFile(rel: string, dir: string): string {
  const tail = rel.slice(dir.length).replace(/\.tsx?$/, '')
  /** Dots are TanStack's path separator, so `posts.$postId.index` is three segments. */
  const segments = tail
    .split(/[/.]/)
    .filter((s) => s && !s.startsWith('-'))
    .map((s) => s.replace(/(index|layout|not-found)$/, '').replace(/__/g, ''))
    .filter(Boolean)
  const path = `/${segments.join('/')}`
  return tail.endsWith('index') || segments.length === 0 ? (path === '/' ? '/' : path) : path
}

export function kindFromFile(file: string, text: string): RouteKind {
  if (/not-found|__404/.test(file)) return 'not-found'
  if (/\/__[^/]+\.tsx?$/.test(file) || /\.layout\.tsx?$/.test(file) || /const\s+Route[\s\S]{0,200}?\bchildren:/.test(text))
    return 'layout'
  if (/index\.tsx?$/.test(file) || file.endsWith('/__root.tsx')) return 'index'
  return 'page'
}

/** Pull the interesting bits out of a route module without a full TS parse. */
export function parseRoute(file: string, text: string, dir: string, generated: boolean): RouteRow {
  const declared = /createFileRoute\(\s*['"`]([^'"`]+)['"`]/.exec(text)?.[1]
  const path = declared ?? pathFromFile(file, dir)
  const head = /head\s*:/.test(text)
  const titleRaw = /\btitle\s*:\s*(?:async\s*)?\(?[^)]*\)?\s*=>?\s*['"`]([^'"`]+)['"`]|title\s*:\s*['"`]([^'"`]+)['"`]/.exec(text)
  const descRaw = /name:\s*['"`]description['"`]\s*,\s*content:\s*(?:\([^)]*\)\s*=>\s*)?['"`]([^'"`]+)['"`]/.exec(text)
  const metaNames = [...text.matchAll(/name:\s*['"`]([^'"`]{1,40})['"`]/g)].map((m) => m[1]!)
  const params = [...path.matchAll(/\[?([a-zA-Z][\w]*)\]?/g)]
    .filter((m) => /[$[]/.test(path.slice(Math.max(0, (m.index ?? 0) - 1), (m.index ?? 0) + m[0].length + 1)))
    .map((m) => m[1]!)

  return {
    file,
    path,
    kind: kindFromFile(file, text),
    hasLoader: /\bloader\s*:/.test(text),
    hasHead: head,
    ssrOff: /ssr\s*:\s*false/.test(text),
    params: [...new Set(params)],
    title: titleRaw ? (titleRaw[1] ?? titleRaw[2] ?? 'dynamic') : head ? 'dynamic' : undefined,
    description: descRaw?.[1],
    metaNames: [...new Set(metaNames)],
    generated,
  }
}
