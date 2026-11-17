import { readdir, readFile, stat } from 'node:fs/promises'
import type { DirentLike, ProjectFs } from '../core/ports/project-fs'

export const nodeProjectFs: ProjectFs = {
  readdir: (dir, opts) => readdir(dir, opts as never) as unknown as Promise<DirentLike[]>,
  readFile: (path, encoding) => readFile(path, encoding),
  stat: async (path) => {
    const info = await stat(path)
    return { size: info.size, isDirectory: () => info.isDirectory(), isFile: () => info.isFile() }
  },
}
