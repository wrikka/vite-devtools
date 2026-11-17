import type { Comment } from '../../contracts/protocol'

export type SyncSink = (items: Comment[]) => void

/** Port: source of truth for overlay comments — implemented by `infra/fs-comment-store`. */
export interface CommentStore {
  all(): Comment[]
  get(id: string): Comment | undefined
  add(comment: Comment): Comment
  delete(id: string): boolean
  update(id: string, patch: Partial<Comment>): Comment | undefined
  onSync(sink: SyncSink): void
}
