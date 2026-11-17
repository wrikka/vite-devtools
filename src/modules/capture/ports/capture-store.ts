export interface SavedCapture {
  path: string
  bytes: number
}

export interface CaptureFile {
  name: string
  path: string
}

export interface CaptureData {
  name: string
  dataUrl: string
  bytes: number
}

/** Port: page-capture PNG storage — implemented by `infra/fs-capture-store`. */
export interface CaptureStore {
  save(dataUrl: string, page: string): Promise<SavedCapture>
  list(): Promise<{ files: CaptureFile[] }>
  read(name: string): Promise<CaptureData>
}
