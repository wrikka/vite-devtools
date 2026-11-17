import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import {
  RUNTIME_KINDS,
  clearEvents,
  pushEvents,
  readEvents,
  replayRequest as replay,
  ringStats,
} from '../../modules/runtime'
import type { RuntimeEvent } from '../../modules/runtime'
import { localPageFetcher } from '../../infra/local-page-fetcher'
import { viteServerContext } from '../../infra/vite-server-context'

export { pushEvents, readEvents, clearEvents }
export type { RuntimeEvent }

const MAX_BATCH = 50

export function createRuntimeRpc() {
  const pushRuntimeEvent = defineRpcFunction({
    name: 'push-runtime-event',
    type: 'action',
    jsonSerializable: true,
    args: [
      z.object({
        events: z
          .array(
            z.object({
              kind: z.enum(RUNTIME_KINDS),
              at: z.number().optional(),
              data: z.record(z.string(), z.unknown()),
            }),
          )
          .max(MAX_BATCH),
      }),
    ],
    agent: {
      description:
        'Append a batch (max 50) of browser runtime events (network, console, vital, state) to the in-memory ring buffers shown in the Network/Performance/Console/State panels',
    },
    returns: z.object({ accepted: z.number(), dropped: z.number() }),
    handler: ({ events }) => pushEvents(events),
  })

  const getRuntime = defineRpcFunction({
    name: 'get-runtime',
    type: 'query',
    jsonSerializable: true,
    args: [
      z.object({
        kind: z.enum(RUNTIME_KINDS).optional(),
        since: z.number().optional(),
        limit: z.number().optional(),
      }),
    ],
    agent: {
      description:
        'Read captured browser runtime events newest-first, optionally filtered by kind and by a `since` timestamp; includes per-kind totals and drop counts',
    },
    returns: z.object({
      kinds: z.record(
        z.string(),
        z.object({ total: z.number(), kept: z.number(), dropped: z.number() }),
      ),
      events: z.array(
        z.object({
          id: z.number(),
          kind: z.enum(RUNTIME_KINDS),
          at: z.number(),
          data: z.record(z.string(), z.unknown()),
        }),
      ),
    }),
    handler: ({ kind, since, limit }) => ({ kinds: ringStats(), events: readEvents(kind, since, limit ?? 500) }),
  })

  const clearRuntime = defineRpcFunction({
    name: 'clear-runtime',
    type: 'action',
    jsonSerializable: true,
    args: [z.object({ kind: z.enum(RUNTIME_KINDS).optional() })],
    agent: {
      description: 'Drop captured runtime events from the ring buffers (all kinds, or one kind)',
    },
    returns: z.object({ cleared: z.number() }),
    handler: ({ kind }) => ({ cleared: clearEvents(kind) }),
  })

  const replayRequest = defineRpcFunction({
    name: 'replay-request',
    type: 'action',
    jsonSerializable: true,
    args: [
      z.object({
        url: z.string(),
        method: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.string().optional(),
      }),
    ],
    agent: {
      description:
        'Replay an HTTP request against the local dev server (same-origin only) and return status, headers, and a truncated body preview',
    },
    returns: z.object({
      ok: z.boolean(),
      status: z.number(),
      durationMs: z.number(),
      headers: z.array(z.object({ name: z.string(), value: z.string() })),
      body: z.string(),
      truncated: z.boolean(),
      error: z.string().optional(),
    }),
    handler: async ({ url, method, headers, body }) =>
      replay(localPageFetcher, viteServerContext, { url, method, headers, body }),
  })

  return { pushRuntimeEvent, getRuntime, clearRuntime, replayRequest }
}
