export interface GraphNode {
  id?: string | null
  file?: string | null
  importedModules?: Set<GraphNode>
  transformResult?: { code?: string } | null
}

export interface ModuleGraph {
  idToModuleMap: Map<string, GraphNode>
}

export function cleanId(id: string): string {
  return id.split('?')[0]!
}

/** DFS over project-local modules; returns import cycles up to `limit`. */
export function findCycles(local: Map<string, GraphNode>, limit = 8): string[][] {
  const cycles: string[][] = []
  const state = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []

  function visit(id: string): void {
    if (cycles.length >= limit) return
    const mark = state.get(id) ?? 0
    if (mark === 1) {
      const at = stack.indexOf(id)
      if (at >= 0) cycles.push([...stack.slice(at), id])
      return
    }
    if (mark === 2) return
    state.set(id, 1)
    stack.push(id)
    for (const child of local.get(id)?.importedModules ?? []) {
      const childId = child.id ? cleanId(child.id) : ''
      if (childId && local.has(childId)) visit(childId)
      if (cycles.length >= limit) break
    }
    stack.pop()
    state.set(id, 2)
  }

  for (const id of local.keys()) visit(id)
  return cycles
}
