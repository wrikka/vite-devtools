import type { ProjectFs } from '../../core/ports/project-fs'
import type { SourceScanner } from '../../core/ports/source-scanner'
import type { ViteServerContext } from '../../core/ports/vite-server'

/** Shared deps for project-introspection use cases. */
export interface ScansDeps {
  fs: ProjectFs
  scanner: SourceScanner
  server: ViteServerContext
}
