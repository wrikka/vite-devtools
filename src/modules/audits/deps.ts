import type { ProjectFs } from '../../core/ports/project-fs'
import type { SourceScanner } from '../../core/ports/source-scanner'
import type { ViteServerContext } from '../../core/ports/vite-server'

/** Shared deps for audit use cases — all host IO goes through these ports. */
export interface AuditsDeps {
  fs: ProjectFs
  scanner: SourceScanner
  server: ViteServerContext
}
