import type { DriverPreference } from '../../../contracts/agents'
import { buildCommentPrompt } from '../../../core/prompts'
import type { CommentStore } from '../../../core/ports/comment-store'
import type { AgentDriverPort } from '../../../core/ports/agent-driver'
import type { LogsChannel } from '../ports/logs-channel'

export interface AgentRunnerDeps {
  store: CommentStore
  channel: LogsChannel
  preference: DriverPreference
  driver: AgentDriverPort
}

export function createAgentRunner(deps: AgentRunnerDeps) {
  const running = new Set<string>()
  const controllers = new Map<string, AbortController>()
  const resolveDriver = () => deps.driver.pick(deps.preference)

  function cancel(commentId: string): boolean {
    const controller = controllers.get(commentId)
    if (!controller) return false
    controller.abort()
    return true
  }

  async function run(commentId: string): Promise<{ started: boolean; streamId?: string; reason?: string }> {
    if (running.has(commentId)) {
      const existing = deps.store.get(commentId)
      return { started: false, streamId: existing?.streamId, reason: 'already running' }
    }
    const comment = deps.store.get(commentId)
    if (!comment) return { started: false, reason: 'comment not found' }
    const driver = resolveDriver()
    if (!driver) {
      deps.store.update(commentId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        resultSummary: 'no agent CLI found (install claude, codex, or opencode)',
      })
      return { started: false, reason: 'no agent CLI found' }
    }

    const streamId = `comment-${commentId}-${Date.now()}`
    const controller = new AbortController()
    running.add(commentId)
    controllers.set(commentId, controller)
    deps.store.update(commentId, {
      status: 'running',
      streamId,
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      resultSummary: undefined,
    })
    const stream = deps.channel.start({ id: streamId })
    stream.signal.addEventListener('abort', () => controller.abort(), { once: true })
    stream.write(`[${driver}] working on comment ${commentId} in ${process.cwd()}\n`)

    void deps.driver
      .run(driver, buildCommentPrompt(comment, { cwd: process.cwd(), driver }), {
        cwd: process.cwd(),
        onChunk: (text) => {
          try {
            stream.write(text)
          } catch {
            /* stream closed by consumers — keep running */
          }
        },
        signal: controller.signal,
        timeoutMs: 15 * 60_000,
      })
      .then((result) => {
        const cancelled = controller.signal.aborted
        stream.write(`\n[${driver}] exit ${result.exitCode ?? 'null'} ${cancelled ? 'CANCELLED' : result.ok ? 'ok' : 'FAILED'}\n`)
        stream.close()
        deps.store.update(commentId, {
          status: cancelled ? 'failed' : result.ok ? 'done' : 'failed',
          finishedAt: new Date().toISOString(),
          resultSummary: cancelled
            ? 'cancelled by user'
            : (result.ok ? deps.driver.summarize(result.output) : result.error ?? deps.driver.summarize(result.output)).slice(0, 1000),
        })
      })
      .catch((err: unknown) => {
        stream.error(err)
        deps.store.update(commentId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          resultSummary: String(err).slice(0, 500),
        })
      })
      .finally(() => {
        running.delete(commentId)
        controllers.delete(commentId)
      })

    return { started: true, streamId }
  }

  return { run, cancel }
}
