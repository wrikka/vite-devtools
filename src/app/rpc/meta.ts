import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { RoleSchema } from '../../contracts/protocol'
import { getMeta as readMeta, scanDir as readDir } from '../../modules/scans'
import type { MetaReport } from '../../modules/scans'
import pkg from '../../../package.json'
import type { ViteServerContext } from '../../core/ports/vite-server'
import { infraDeps } from '../infra'

const DirEntrySchema = z.object({
  name: z.string(),
  kind: z.enum(['file', 'dir', 'other']),
  size: z.number().nullable(),
})

export function createMetaRpc(deps: { server: ViteServerContext }) {
  const getMeta = defineRpcFunction({
    name: 'get-meta',
    type: 'static',
    jsonSerializable: true,
    args: [],
    agent: { description: 'Get tool name, version, platform and server working directory' },
    returns: z.object({
      tool: z.string(),
      version: z.string(),
      platform: z.string(),
      cwd: z.string(),
      generatedAt: z.string(),
      role: RoleSchema,
      /** Capability ids the current role holds; empty for a viewer. */
      capabilities: z.array(z.string()),
      /** Host Vite base (`/` unless the app sets one) — Canvas previews join routes onto it. */
      hostBase: z.string(),
    }),
    handler: async (): Promise<MetaReport> => readMeta(deps.server, pkg),
  })

  const scanDir = defineRpcFunction({
    name: 'scan-dir',
    type: 'query',
    agent: { description: 'List entries in a directory (relative to server cwd), capped at 200' },
    args: [z.object({ path: z.string().optional(), limit: z.number().optional() })],
    returns: z.object({
      dir: z.string(),
      entries: z.array(DirEntrySchema),
      truncated: z.boolean(),
    }),
    handler: async ({ path = '.', limit = 50 }) => readDir(path, limit),
  })

  return { getMeta, scanDir }
}

// Static exports kept for the package's public API (`get-meta`, `scan-dir`).
export const { getMeta, scanDir } = createMetaRpc(infraDeps)
