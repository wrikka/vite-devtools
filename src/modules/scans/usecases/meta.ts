import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { ViteServerContext } from '../../../core/ports/vite-server'
import { capabilities, currentRole } from '../../../core/access'

const MAX_ENTRIES = 200
const DEFAULT_LIMIT = 50

export interface DirEntry {
  name: string
  kind: 'file' | 'dir' | 'other'
  size: number | null
}

export interface MetaReport {
  tool: string
  version: string
  platform: string
  cwd: string
  generatedAt: string
  role: ReturnType<typeof currentRole>
  capabilities: string[]
  hostBase: string
}

export async function getMeta(server: ViteServerContext, pkg: { name: string; version: string }): Promise<MetaReport> {
  return {
    tool: pkg.name,
    version: pkg.version,
    platform: `${process.platform} ${process.arch}`,
    cwd: process.cwd(),
    generatedAt: new Date().toISOString(),
    role: currentRole(),
    capabilities: capabilities(),
    hostBase: server.hostBase(),
  }
}

export async function scanDir(path = '.', limit = DEFAULT_LIMIT): Promise<{ dir: string; entries: DirEntry[]; truncated: boolean }> {
  const dir = resolve(process.cwd(), path)
  const dirents = await readdir(dir, { withFileTypes: true })
  const capped = dirents.slice(0, Math.min(limit, MAX_ENTRIES))
  const entries = await Promise.all(
    capped.map(async (d): Promise<DirEntry> => {
      let size: number | null = null
      try {
        if (d.isFile()) size = (await stat(join(dir, d.name))).size
      } catch {
        size = null
      }
      const kind: 'dir' | 'file' | 'other' = d.isDirectory() ? 'dir' : d.isFile() ? 'file' : 'other'
      return { name: d.name, kind, size }
    }),
  )
  return { dir, entries, truncated: dirents.length > capped.length }
}
