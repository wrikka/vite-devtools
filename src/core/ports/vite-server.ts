/** Port: host Vite dev-server context — implemented by `infra/vite-server-context`. */
export interface ViteServerContext {
  /** Absolute project root of the host app. */
  root(): string
  /** Dev-server origin for `path` (e.g. `http://localhost:5173/`), undefined when unknown. */
  origin(path?: string): string | undefined
  /** Host Vite `base` (`/` unless the app sets one). */
  hostBase(): string
  /** Vite client module graph for the bundle audit; undefined when no dev server is attached. */
  clientModuleGraph(): unknown
}
