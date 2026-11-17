import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import type { CaptureStore } from '../../modules/capture'
import { listCaptures, readCapture, saveCapture } from '../../modules/capture'

export interface CaptureRpcDeps {
  store: CaptureStore
}

export function createCaptureRpc(deps: CaptureRpcDeps) {
  const saveCaptureRpc = defineRpcFunction({
    name: 'save-capture',
    type: 'action',
    jsonSerializable: true,
    args: [z.object({ dataUrl: z.string().startsWith('data:image/png;base64,'), page: z.string().max(500) })],
    returns: z.object({ path: z.string(), bytes: z.number() }),
    agent: { description: 'internal: store a base64 PNG sent by the comment overlay; returns its file path' },
    handler: async ({ dataUrl, page }) => saveCapture(deps.store, dataUrl, page),
  })

  const listCapturesRpc = defineRpcFunction({
    name: 'list-captures',
    type: 'query',
    jsonSerializable: true,
    args: [],
    agent: { description: 'List saved page-capture PNG files (newest first) with their absolute paths' },
    returns: z.object({ files: z.array(z.object({ name: z.string(), path: z.string() })) }),
    handler: async () => listCaptures(deps.store),
  })

  const readCaptureRpc = defineRpcFunction({
    name: 'read-capture',
    type: 'query',
    jsonSerializable: true,
    args: [z.object({ name: z.string().min(5).max(120) })],
    agent: {
      description:
        'Read a saved capture PNG by filename from list-captures and return it as a data URL (used by the visual-diff panel)',
    },
    returns: z.object({ name: z.string(), dataUrl: z.string(), bytes: z.number() }),
    handler: async ({ name }) => readCapture(deps.store, name),
  })

  return { saveCapture: saveCaptureRpc, listCaptures: listCapturesRpc, readCapture: readCaptureRpc }
}
