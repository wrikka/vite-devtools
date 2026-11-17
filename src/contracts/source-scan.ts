export const CODE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.vue',
  '.svelte',
  '.astro',
])

export const WEB_EXT = new Set([...CODE_EXT, '.html', '.css', '.scss'])

export interface SourceFile {
  /** Project-relative path, posix separators. */
  rel: string
  full: string
  text: string
}

export interface SourceScan {
  root: string
  /** Directory the walk started from, project-relative. */
  dir: string
  files: SourceFile[]
  truncated: boolean
}

export interface ScanOptions {
  /** Project-relative sub-directory; defaults to the project root. */
  dir?: string
  exts?: Set<string>
  maxFiles?: number
  maxFileSize?: number
}
