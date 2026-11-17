import { join, relative, resolve, sep } from 'node:path'
import type { RouteRow, RoutesReport } from '../../../contracts/routes'
import type { ScansDeps } from '../deps'
import { parseRoute } from '../domain/route-parse'

const MAX_FILE_SIZE = 512 * 1024
/** Route dirs this plugin knows about, tried in order; first existing wins. */
const ROUTE_DIRS = ['src/routes', 'app/routes', 'src/pages', 'routes', 'pages', 'app/pages']
const IGNORE = new Set(['node_modules', 'dist', '.git', '.output', 'coverage'])

async function findRoutesDir(deps: ScansDeps, root: string): Promise<{ dir: string; rel: string } | undefined> {
  for (const candidate of ROUTE_DIRS) {
    const at = resolve(root, candidate)
    try {
      const info = await deps.fs.stat(at)
      if (info.isDirectory()) return { dir: at, rel: candidate }
    } catch {
      /* try the next candidate */
    }
  }
  return undefined
}

/** Look for a generated route tree anywhere shallow in the project. */
async function hasRouteTree(deps: ScansDeps, root: string): Promise<boolean> {
  for (const at of ['src', 'app', '.']) {
    try {
      const names = await deps.fs.readdir(resolve(root, at))
      if (names.some((n) => /routeTree\.gen\.ts$/.test(n.name))) return true
    } catch {
      /* unreadable dir — keep looking */
    }
  }
  return false
}

export async function listRoutes(deps: ScansDeps, dir?: string): Promise<RoutesReport> {
  const root = resolve(deps.server.root())
  const found = dir ? { dir: resolve(root, dir), rel: dir } : await findRoutesDir(deps, root)
  if (!found) return { routes: [], detected: 'none', root: dir ?? ROUTE_DIRS[0]! }
  const target = found

  const generated = await hasRouteTree(deps, root)
  const routes: RouteRow[] = []

  async function walk(at: string): Promise<void> {
    for (const d of await deps.fs.readdir(at, { withFileTypes: true })) {
      const full = join(at, d.name)
      if (d.isDirectory()) {
        if (!IGNORE.has(d.name) && !d.name.startsWith('.')) await walk(full)
      } else if (/\.tsx?$/.test(d.name) && !d.name.startsWith('-') && d.name !== 'routeTree.gen.ts') {
        const info = await deps.fs.stat(full)
        if (info.size > MAX_FILE_SIZE) continue
        const text = await deps.fs.readFile(full, 'utf8')
        if (!/createFileRoute|createRoute|<Route|defineRoute/.test(text)) continue
        const file = relative(root, full).split(sep).join('/')
        routes.push(parseRoute(file, text, target.rel, generated))
      }
    }
  }
  try {
    await walk(target.dir)
  } catch {
    /* folder vanished mid-walk — return what we have */
  }
  routes.sort((a, b) => a.path.localeCompare(b.path))
  return { routes, detected: generated ? 'tanstack-router' : 'file-based', root: target.rel }
}
