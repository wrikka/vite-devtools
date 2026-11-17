export const RUNTIME_KINDS = ['network', 'console', 'vital', 'state'] as const
export type RuntimeKind = (typeof RUNTIME_KINDS)[number]

/** Events older than this memory budget are dropped even when the ring is not full. */
const RING_LIMITS: Record<RuntimeKind, number> = {
  network: 300,
  console: 500,
  vital: 200,
  state: 50,
}

export interface RuntimeEvent {
  id: number
  kind: RuntimeKind
  at: number
  data: Record<string, unknown>
}

interface RingBuffer {
  events: RuntimeEvent[]
  total: number
  dropped: number
}

const buffers = new Map<RuntimeKind, RingBuffer>()
let nextId = 1

function bufferOf(kind: RuntimeKind): RingBuffer {
  let ring = buffers.get(kind)
  if (!ring) {
    ring = { events: [], total: 0, dropped: 0 }
    buffers.set(kind, ring)
  }
  return ring
}

/** Exported for unit tests: the ring cap and drop counter are the whole retention policy. */
export function pushEvents(
  incoming: { kind: RuntimeKind; at?: number; data: Record<string, unknown> }[],
): { accepted: number; dropped: number } {
  let accepted = 0
  let dropped = 0
  for (const event of incoming) {
    const ring = bufferOf(event.kind)
    ring.events.push({ id: nextId++, kind: event.kind, at: event.at ?? Date.now(), data: event.data })
    ring.total += 1
    accepted += 1
    while (ring.events.length > RING_LIMITS[event.kind]) {
      ring.events.shift()
      ring.dropped += 1
      dropped += 1
    }
  }
  return { accepted, dropped }
}

export function readEvents(kind?: RuntimeKind, since?: number, limit = 500): RuntimeEvent[] {
  const kinds = kind ? [kind] : [...RUNTIME_KINDS]
  const merged: RuntimeEvent[] = []
  for (const k of kinds) {
    for (const event of bufferOf(k).events) {
      if (since !== undefined && event.at <= since) continue
      merged.push(event)
    }
  }
  merged.sort((a, b) => b.at - a.at || b.id - a.id)
  return merged.slice(0, Math.max(1, Math.min(limit, 2000)))
}

export function clearEvents(kind?: RuntimeKind): number {
  let cleared = 0
  for (const k of kind ? [kind] : [...RUNTIME_KINDS]) {
    const ring = bufferOf(k)
    cleared += ring.events.length
    ring.events = []
  }
  return cleared
}

export function ringStats(): Record<RuntimeKind, { total: number; kept: number; dropped: number }> {
  const kinds = {} as Record<RuntimeKind, { total: number; kept: number; dropped: number }>
  for (const k of RUNTIME_KINDS) {
    const ring = bufferOf(k)
    kinds[k] = { total: ring.total, kept: ring.events.length, dropped: ring.dropped }
  }
  return kinds
}
