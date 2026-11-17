import type { PageFetcher } from '../core/ports/page-fetcher'
import type { TestRunner } from '../core/ports/test-runner'
import type { AuditsDeps } from '../modules/audits'
import type { ScansDeps } from '../modules/scans'
import { localPageFetcher } from '../infra/local-page-fetcher'
import { nodeProjectFs } from '../infra/node-project-fs'
import { processTestRunner } from '../infra/process-test-runner'
import { sourceScanner } from '../infra/scanners/source-scanner'
import { viteServerContext } from '../infra/vite-server-context'

/** Every infrastructure adapter the RPC delivery layer needs. */
export interface InfraDeps extends ScansDeps, AuditsDeps {
  fetcher: PageFetcher
  runner: TestRunner
}

/** Composition root: the only place infra adapters are instantiated. */
export function createInfraDeps(): InfraDeps {
  return {
    fs: nodeProjectFs,
    scanner: sourceScanner,
    server: viteServerContext,
    fetcher: localPageFetcher,
    runner: processTestRunner,
  }
}

/** Default adapters for statically exported RPCs kept for API compatibility. */
export const infraDeps = createInfraDeps()
