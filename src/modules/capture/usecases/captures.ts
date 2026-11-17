import { assertCan } from '../../../core/access'
import type { CaptureStore } from '../ports/capture-store'

export function saveCapture(store: CaptureStore, dataUrl: string, page: string) {
  assertCan('capture:write')
  return store.save(dataUrl, page)
}

export function listCaptures(store: CaptureStore) {
  return store.list()
}

export function readCapture(store: CaptureStore, name: string) {
  return store.read(name)
}
