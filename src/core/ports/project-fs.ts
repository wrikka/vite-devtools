export interface DirentLike {
  name: string
  isDirectory(): boolean
  isFile(): boolean
}

/** Port: project filesystem access — implemented by `infra/node-project-fs`. */
export interface ProjectFs {
  /** Callers always pass `{ withFileTypes: true }`; returns dirent objects. */
  readdir(dir: string, opts?: { withFileTypes?: boolean }): Promise<DirentLike[]>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  stat(path: string): Promise<{ size: number; isDirectory(): boolean; isFile(): boolean }>
}
