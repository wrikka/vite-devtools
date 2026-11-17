import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import { listSkills } from '../../modules/scans'
import type { ScansDeps } from '../../modules/scans'

const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  path: z.string(),
  root: z.string(),
})

export interface SkillsRpcDeps {
  roots: string[]
}

export function createSkillsRpc(deps: ScansDeps, options: SkillsRpcDeps) {
  const listSkillsRpc = defineRpcFunction({
    name: 'list-skills',
    type: 'query',
    jsonSerializable: true,
    args: [z.object({ roots: z.array(z.string()).optional() })],
    agent: { description: 'List harness skills (name + description) discoverable from the configured skill roots' },
    returns: z.object({ skills: z.array(SkillSchema), roots: z.array(z.string()) }),
    handler: async ({ roots }) => listSkills(deps, options.roots, roots),
  })
  return { listSkills: listSkillsRpc }
}
