import type { DriverPreference } from '../../../contracts/agents'
import type { Idea } from '../../../contracts/protocol'
import { buildIdeasPrompt, parseIdeas } from '../../../core/prompts'
import type { AgentDriverPort } from '../../../core/ports/agent-driver'

export interface GenerateIdeasResult {
  ideas: Idea[]
  driver: string | null
  raw?: string
}

export async function generateIdeas(
  driverPort: AgentDriverPort,
  preference: DriverPreference,
  page: string,
  focus?: string,
): Promise<GenerateIdeasResult> {
  const driver = driverPort.pick(preference)
  if (!driver) return { ideas: [], driver: null, raw: 'no agent CLI found (install claude, codex, or opencode)' }
  const result = await driverPort.run(driver, buildIdeasPrompt({ cwd: process.cwd(), driver }, page, focus), {
    cwd: process.cwd(),
    timeoutMs: 5 * 60_000,
  })
  const ideas = parseIdeas(result.output)
  return { ideas, driver, raw: ideas.length > 0 || result.ok ? undefined : result.output.slice(0, 2000) }
}
