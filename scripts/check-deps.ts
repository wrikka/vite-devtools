#!/usr/bin/env bun
/**
 * Dependency-direction gate for the Clean Architecture layout.
 *
 * Allowed internal import direction (each layer may import only the layers
 * listed, plus itself):
 *
 *   contracts, config  -> (leaf: no internal imports)
 *   core               -> contracts, config, core
 *   modules            -> contracts, config, core, modules
 *   infra              -> contracts, config, core, modules, infra
 *   app                -> everything except ui
 *   ui                 -> contracts, config, core (browser surfaces talk to
 *                         the server through contracts only)
 *
 * Type-only imports (`import type`) are still checked — direction matters
 * for types too. External packages are ignored.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const SRC = resolve(import.meta.dirname, '../src')

const LAYERS = ['contracts', 'config', 'core', 'modules', 'infra', 'app', 'ui'] as const
type Layer = (typeof LAYERS)[number]

const ALLOWED: Record<Layer, ReadonlySet<Layer>> = {
  contracts: new Set(),
  config: new Set(),
  core: new Set(['contracts', 'config', 'core']),
  modules: new Set(['contracts', 'config', 'core', 'modules']),
  infra: new Set(['contracts', 'config', 'core', 'modules', 'infra']),
  app: new Set(['contracts', 'config', 'core', 'modules', 'infra', 'app']),
  ui: new Set(['contracts', 'config', 'core']),
}

function layerOf(path: string): Layer | null {
  const rel = relative(SRC, path).split(sep)[0] ?? ''
  return (LAYERS as readonly string[]).includes(rel) ? (rel as Layer) : null
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.tsx?$/.test(entry)) yield p
  }
}

const IMPORT_RE = /import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g
const RESOLVE_EXTS = ['.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx']

function resolveImport(fromFile: string, spec: string): string | null {
  const base = resolve(join(fromFile, '..'), spec)
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext
    try {
      statSync(candidate)
      return candidate
    } catch {}
  }
  try {
    statSync(base)
    return base
  } catch {}
  return null
}

const violations: string[] = []
let checked = 0

for (const file of walk(SRC)) {
  const from = layerOf(file)
  if (!from) continue
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1]
    if (!spec) continue
    const target = resolveImport(file, spec)
    if (!target) continue
    const to = layerOf(target)
    if (!to || to === from) continue
    checked++
    if (!ALLOWED[from].has(to)) {
      violations.push(
        `${relative(SRC, file)} -> ${relative(SRC, target)}  (${from} may not import ${to})`,
      )
    }
  }
}

if (violations.length) {
  console.error(`Dependency-direction violations (${violations.length}):`)
  for (const v of violations) console.error('  ' + v)
  process.exit(1)
}

console.log(`check-deps: ${checked} internal cross-layer imports, direction OK`)
process.exit(0)
