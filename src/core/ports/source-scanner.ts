import type { ScanOptions, SourceScan } from '../../contracts/source-scan'

/** Port: walk + read the host project's source files — implemented by `infra/scanners/source-scanner`. */
export interface SourceScanner {
  scan(options?: ScanOptions): Promise<SourceScan>
}
