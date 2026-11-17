import type { AgentDriver, DriverPreference } from '../../contracts/agents'

export interface RunOptions {
  cwd: string
  onChunk?: (text: string) => void
  signal?: AbortSignal
  timeoutMs?: number
}

export interface RunResult {
  ok: boolean
  output: string
  exitCode: number | null
  error?: string
}

/** Port: agent CLI driver — implemented by `infra/cli-agent-driver`. */
export interface AgentDriverPort {
  detect(): AgentDriver[]
  pick(preference: DriverPreference): AgentDriver | undefined
  run(driver: AgentDriver, prompt: string, opts: RunOptions): Promise<RunResult>
  summarize(output: string): string
}
