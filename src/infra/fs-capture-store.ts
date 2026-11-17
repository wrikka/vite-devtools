import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  CaptureData,
  CaptureFile,
  CaptureStore,
  SavedCapture,
} from '../modules/capture'

const MAX_CAPTURE_BYTES = 10 * 1024 * 1024
/** Filenames come from the client — never let them escape the captures dir. */
const SAFE_NAME = /^[A-Za-z0-9._-]+\.png$/

function slugPage(page: string): string {
  return page
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'page'
}

export class FsCaptureStore implements CaptureStore {
  private readonly dir: string

  constructor(storageDir: string) {
    this.dir = join(storageDir, 'captures')
  }

  async save(dataUrl: string, page: string): Promise<SavedCapture> {
    const buffer = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64')
    if (buffer.byteLength > MAX_CAPTURE_BYTES) throw new Error('capture too large (max 10 MiB)')
    await mkdir(this.dir, { recursive: true })
    const file = join(this.dir, `${Date.now()}-${slugPage(page)}.png`)
    await writeFile(file, buffer)
    return { path: file, bytes: buffer.byteLength }
  }

  async list(): Promise<{ files: CaptureFile[] }> {
    let names: string[] = []
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith('.png'))
    } catch {
      names = []
    }
    names.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    return { files: names.slice(0, 50).map((name) => ({ name, path: join(this.dir, name) })) }
  }

  async read(name: string): Promise<CaptureData> {
    if (!SAFE_NAME.test(name)) throw new Error('invalid capture name')
    const buffer = await readFile(join(this.dir, name))
    if (buffer.byteLength > MAX_CAPTURE_BYTES) throw new Error('capture too large (max 10 MiB)')
    return {
      name,
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      bytes: buffer.byteLength,
    }
  }
}
