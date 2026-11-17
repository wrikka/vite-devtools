import { join } from 'node:path'
import type { AuditsDeps } from '../deps'
import { envRefs, isSecretName, parseEnvKeys } from '../domain/env-parse'
import { CODE_EXT } from '../../../contracts/source-scan'

/** Env files are read by name only — values never leave the server. */
const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local', '.env.example']

export interface EnvRefRow {
  name: string
  files: string[]
  definedIn: string[]
  publicVar: boolean
  secret: boolean
  status: 'ok' | 'missing'
}

export interface EnvAuditReport {
  root: string
  scanned: number
  envFiles: { file: string; keys: string[] }[]
  refs: EnvRefRow[]
  unused: { name: string; definedIn: string[] }[]
  totals: { refs: number; defined: number; missing: number; unused: number }
}

export { envRefs, parseEnvKeys, isSecretName }

async function readEnvFiles(deps: AuditsDeps, root: string): Promise<{ file: string; keys: string[] }[]> {
  const found: { file: string; keys: string[] }[] = []
  let dirents
  try {
    dirents = await deps.fs.readdir(root, { withFileTypes: true })
  } catch {
    return found
  }
  const present = new Set(dirents.filter((d) => d.isFile()).map((d) => d.name))
  for (const name of ENV_FILES) {
    if (!present.has(name)) continue
    try {
      const full = join(root, name)
      const info = await deps.fs.stat(full)
      if (!info.isFile() || info.size > 256 * 1024) continue
      found.push({ file: name, keys: parseEnvKeys(await deps.fs.readFile(full, 'utf8')) })
    } catch {
      /* unreadable env file — skip it */
    }
  }
  return found
}

export async function auditEnv(deps: AuditsDeps, dir?: string): Promise<EnvAuditReport> {
  const root = deps.server.root()
  const scan = await deps.scanner.scan({ dir, exts: new Set([...CODE_EXT]) })
  const envFiles = await readEnvFiles(deps, root)
  const defined = new Map<string, string[]>()
  for (const f of envFiles) for (const key of f.keys) defined.set(key, [...(defined.get(key) ?? []), f.file])

  const refFiles = new Map<string, Set<string>>()
  for (const file of scan.files) {
    for (const name of envRefs(file.text)) {
      const set = refFiles.get(name) ?? new Set<string>()
      set.add(file.rel)
      refFiles.set(name, set)
    }
  }

  const refs = [...refFiles.entries()]
    .map(([name, files]) => ({
      name,
      files: [...files].slice(0, 5),
      definedIn: defined.get(name) ?? [],
      publicVar: name.startsWith('VITE_'),
      secret: isSecretName(name),
      status: (defined.has(name) ? 'ok' : 'missing') as 'ok' | 'missing',
    }))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'missing' ? -1 : 1))

  const unused = [...defined.entries()]
    .filter(([name]) => !refFiles.has(name))
    .map(([name, definedIn]) => ({ name, definedIn }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    root: scan.dir,
    scanned: scan.files.length,
    envFiles: envFiles.map((f) => ({ file: f.file, keys: f.keys })),
    refs,
    unused,
    totals: {
      refs: refs.length,
      defined: defined.size,
      missing: refs.filter((r) => r.status === 'missing').length,
      unused: unused.length,
    },
  }
}
