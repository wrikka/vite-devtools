import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import type { DriverPreference } from '../../contracts/agents'
import type { CommentStore } from '../../core/ports/comment-store'
import { assertCan } from '../../core/access'
import {
  createAgentRunner,
  type AgentDriverPort,
  type LogsChannel,
} from '../../modules/agents'

export interface AgentRpcDeps {
  store: CommentStore
  channel: LogsChannel
  preference: DriverPreference
  driver: AgentDriverPort
}

export function createAgentRpc(deps: AgentRpcDeps) {
  const runner = createAgentRunner(deps)

  const runAgentRpc = defineRpcFunction({
    name: 'run-agent',
    type: 'action',
    jsonSerializable: true,
    agent: { description: 'Start (or report on) an agent-CLI run for a queued comment; logs stream on channel agent-logs' },
    args: [z.object({ commentId: z.string() })],
    returns: z.object({ started: z.boolean(), streamId: z.string().optional(), reason: z.string().optional() }),
    handler: async ({ commentId }) => {
      assertCan('run:start')
      return runner.run(commentId)
    },
  })

  const cancelAgentRpc = defineRpcFunction({
    name: 'cancel-agent',
    type: 'action',
    jsonSerializable: true,
    agent: { description: 'Abort the running agent CLI for a comment; marks it failed (cancelled by user)' },
    args: [z.object({ commentId: z.string() })],
    returns: z.object({ cancelled: z.boolean() }),
    handler: async ({ commentId }) => {
      assertCan('run:cancel')
      return { cancelled: runner.cancel(commentId) }
    },
  })

  const runnerInfo = defineRpcFunction({
    name: 'runner-info',
    type: 'static',
    jsonSerializable: true,
    args: [],
    agent: { description: 'Which agent CLI driver is active and which CLIs are installed' },
    returns: z.object({ preference: z.string(), driver: z.string().nullable(), available: z.array(z.string()) }),
    handler: async () => {
      const available = deps.driver.detect()
      const active =
        deps.preference === 'auto'
          ? available[0]
          : available.includes(deps.preference)
            ? deps.preference
            : undefined
      return { preference: deps.preference, driver: active ?? null, available: [...available] }
    },
  })

  return { runAgentRpc, cancelAgentRpc, runnerInfo, run: runner.run, cancel: runner.cancel }
}
