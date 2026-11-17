import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import type { DriverPreference } from '../../contracts/agents'
import { generateIdeas } from '../../modules/ideas'
import type { AgentDriverPort } from '../../modules/agents'
import { IdeaSchema } from '../../contracts/protocol'

export interface IdeasRpcDeps {
  preference: DriverPreference
  driver: AgentDriverPort
}

export function createIdeasRpc(deps: IdeasRpcDeps) {
  const generateIdeasRpc = defineRpcFunction({
    name: 'generate-ideas',
    type: 'action',
    jsonSerializable: true,
    agent: {
      description:
        'Ask an agent CLI to propose feature ideas for this project (page context + optional focus). Returns parsed ideas; can take a minute or more.',
    },
    args: [z.object({ page: z.string().max(500), focus: z.string().max(2000).optional() })],
    returns: z.object({ ideas: z.array(IdeaSchema), driver: z.string().nullable(), raw: z.string().optional() }),
    handler: async ({ page, focus }) => generateIdeas(deps.driver, deps.preference, page, focus),
  })
  return { generateIdeas: generateIdeasRpc }
}
