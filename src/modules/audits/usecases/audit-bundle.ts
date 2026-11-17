import { relative, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { AuditsDeps } from '../deps'
import { cleanId, findCycles, type GraphNode, type ModuleGraph } from '../domain/cycle-detect'

export { findCycles }
export type { GraphNode, ModuleGraph }

export interface BundleReport {
  available: boolean
  reason?: string
  modules: number
  total: number
  localBytes: number
  depBytes: number
  top: { file: string; size: number; gzip?: number; local: boolean }[]
  cycles: string[][]
}

export async function auditBundle(deps: AuditsDeps): Promise<BundleReport> {
  const graph = deps.server.clientModuleGraph() as ModuleGraph | undefined
  if (!graph) {
    return {
      available: false,
      reason: 'dev server module graph is unavailable — start the hub with `vite` (not a static build)',
      modules: 0,
      total: 0,
      localBytes: 0,
      depBytes: 0,
      top: [],
      cycles: [],
    }
  }

  const root = deps.server.root()
  const rows: { file: string; size: number; gzip?: number; local: boolean; id: string }[] = []
  const local = new Map<string, GraphNode>()
  let localBytes = 0
  let depBytes = 0

  for (const [id, node] of graph.idToModuleMap) {
    const clean = cleanId(id)
    const code = node.transformResult?.code
    if (!code) continue
    const size = Buffer.byteLength(code, 'utf8')
    const isLocal = !clean.includes('/node_modules/')
    if (isLocal) {
      local.set(clean, node)
      localBytes += size
    } else {
      depBytes += size
    }
    const file = isLocal ? relative(root, clean).split(sep).join('/') : clean.replace(/^.*\/node_modules\//, '')
    rows.push({ file, size, local: isLocal, id: clean })
  }

  rows.sort((a, b) => b.size - a.size)
  const top = rows.slice(0, 40).map((row) => {
    let gzip: number | undefined
    try {
      const code = graph.idToModuleMap.get(row.id)?.transformResult?.code
      if (code && code.length <= 2 * 1024 * 1024) gzip = gzipSync(Buffer.from(code, 'utf8')).length
    } catch {
      /* gzip is a nice-to-have estimate */
    }
    return { file: row.file, size: row.size, gzip, local: row.local }
  })

  const cycles = findCycles(local).map((cycle) =>
    cycle.map((id) => (id.includes('/node_modules/') ? id.replace(/^.*\/node_modules\//, '') : relative(root, id).split(sep).join('/'))),
  )

  return {
    available: true,
    modules: rows.length,
    total: localBytes + depBytes,
    localBytes,
    depBytes,
    top,
    cycles,
  }
}
