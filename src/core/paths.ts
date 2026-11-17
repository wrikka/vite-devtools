import { relative, resolve, sep } from 'node:path'

export function relFromRoot(root: string, full: string): string {
  return relative(root, full).split(sep).join('/')
}

/** Guard every path an RPC takes from the client. */
export function isInside(root: string, target: string): boolean {
  const r = resolve(root)
  const t = resolve(target)
  return t === r || t.startsWith(r.endsWith(sep) ? r : `${r}${sep}`)
}

export function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot)
}
