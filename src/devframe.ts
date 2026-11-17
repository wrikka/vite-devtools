import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { defineDevframe } from 'devframe'
import pkg from '../package.json'
import { FsCommentStore } from './infra/fs-comment-store'
import { cliAgentDriver } from './infra/cli-agent-driver'
import { createAgentRpc } from './app/rpc/agents'
import { auditBundle } from './app/rpc/bundle'
import { createCaptureRpc } from './app/rpc/capture'
import { createCommentRpc } from './app/rpc/comments'
import { auditEnv } from './app/rpc/env-audit'
import { createHeadersRpc } from './app/rpc/headers'
import { auditI18n } from './app/rpc/i18n-audit'
import { createIdeasRpc } from './app/rpc/ideas'
import { auditImports } from './app/rpc/imports-audit'
import { createMcpRpc } from './app/rpc/mcp'
import { createRuntimeRpc } from './app/rpc/runtime'
import { createSkillsRpc } from './app/rpc/skills'
import { getMeta, scanDir } from './app/rpc/meta'
import { searchSource } from './app/rpc/search'
import { listComponents } from './app/rpc/components'
import { listRoutes } from './app/rpc/routes'
import { auditSeo } from './app/rpc/seo'
import { listTests, runTest } from './app/rpc/tests'
import { auditTheme } from './app/rpc/theme-audit'
import { roleFromEnv, setRole } from './core/access'
import type { Role } from './contracts/protocol'
import type { DriverPreference } from './contracts/agents'

const clientAssets = resolve(import.meta.dirname, 'client')
const overlayScript = resolve(import.meta.dirname, 'overlay/index.mjs')

export interface UseWrikkaViteDevtoolsAgentOptions {
  /** Which agent CLI to drive. `'auto'` picks the first installed of claude → codex → opencode. */
  driver?: DriverPreference
  /** Start the agent the moment a comment is submitted. Default true. */
  autoRun?: boolean
}

export interface DevframeOptions {
  /** Directories scanned by `list-skills` (each holds `<skill>/SKILL.md`). */
  skillsRoots?: string[]
  agent?: UseWrikkaViteDevtoolsAgentOptions
  /** Inject the in-page comment overlay. Default true. */
  overlay?: boolean
  /**
   * Read/write role for this session. Defaults to `WRIKKA_DEVTOOLS_ROLE`, then
   * `operator`. A `viewer` session keeps every scanner but refuses mutations.
   */
  role?: Role
}

export function defaultSkillRoots(): string[] {
  const home = homedir()
  return [
    join(home, 'AppData', 'Roaming', 'devin', 'skills'),
    join(home, '.claude', 'skills'),
    join(home, '.qoder', 'skills'),
    join(process.cwd(), 'skills'),
    join(process.cwd(), '.claude', 'skills'),
    join(process.cwd(), '.devin', 'skills'),
  ]
}

export function createDevframeDefinition(options: DevframeOptions = {}) {
  const preference: DriverPreference = options.agent?.driver ?? 'auto'
  const autoRun = options.agent?.autoRun !== false
  setRole(options.role ?? roleFromEnv(process.env.WRIKKA_DEVTOOLS_ROLE))

  return defineDevframe({
    id: 'wrikka-vite-devtools',
    name: 'Comments',
    version: pkg.version,
    packageName: pkg.name,
    importMetaUrl: import.meta.url,
    homepage: pkg.homepage ?? 'https://devfra.me',
    description: 'In-page comments and ideas that drive agent CLIs',
    icon: 'ph:chat-circle',
    clientAssets,
    capabilities: { dev: true, build: true },
    dock:
      options.overlay === false
        ? undefined
        : {
            // The dock entry doubles as the hub tab (clientAssets page) and the
            // host for the in-page pill script.
            clientScript: { importFrom: overlayScript, eager: true },
          },
    async setup(ctx) {
      const us = ctx.scope('wrikka-vite-devtools')
      us.rpc.register(getMeta)
      us.rpc.register(scanDir)

      const storageDir = ctx.host.getStorageDir('project')
      const store = new FsCommentStore(storageDir)
      await store.load()
      const state = await us.rpc.sharedState('comments', { initialValue: { items: store.all() } })
      store.onSync((items) => state.mutate((draft) => void (draft.items = items)))

      const channel = us.rpc.streaming.create<string>('agent-logs', {
        replayWindow: 4096,
        closedStreamRetention: 5 * 60_000,
      })
      const agents = createAgentRpc({ store, channel, preference, driver: cliAgentDriver })
      const comments = createCommentRpc({
        store,
        onNew: (comment) => {
          if (autoRun && comment.kind === 'comment') void agents.run(comment.id)
        },
      })
      const skills = createSkillsRpc({ roots: options.skillsRoots ?? defaultSkillRoots() })
      const capture = createCaptureRpc({ storageDir })
      const ideas = createIdeasRpc({ preference })
      const mcp = createMcpRpc()
      const headers = createHeadersRpc()
      const runtime = createRuntimeRpc()

      for (const fn of [
        comments.listComments,
        comments.submitComment,
        comments.updateComment,
        comments.deleteComment,
        agents.runAgentRpc,
        agents.cancelAgentRpc,
        agents.runnerInfo,
        skills.listSkills,
        capture.saveCapture,
        capture.listCaptures,
        capture.readCapture,
        ideas.generateIdeas,
        searchSource,
        listComponents,
        listRoutes,
        auditSeo,
        auditTheme,
        auditEnv,
        auditImports,
        auditI18n,
        auditBundle,
        listTests,
        runTest,
        mcp.listTools,
        mcp.callTool,
        headers.auditHeaders,
        runtime.pushRuntimeEvent,
        runtime.getRuntime,
        runtime.clearRuntime,
        runtime.replayRequest,
      ]) {
        us.rpc.register(fn)
      }
    },
  })
}

export default createDevframeDefinition()
