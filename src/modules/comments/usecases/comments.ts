import type { Comment } from '../../../contracts/protocol'
import { assertCan } from '../../../core/access'
import type { CommentStore } from '../../../core/ports/comment-store'

export interface SubmitCommentInput {
  body: string
  page: string
  kind?: Comment['kind']
  selection: Comment['selection']
  skills?: string[]
  capturePath?: string
}

export function listComments(store: CommentStore): { items: Comment[] } {
  return { items: store.all() }
}

export function submitComment(
  store: CommentStore,
  input: SubmitCommentInput,
  onNew?: (comment: Comment) => void,
): Comment {
  assertCan('comment:write')
  const comment: Comment = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    page: input.page,
    kind: input.kind ?? 'comment',
    status: 'queued',
    body: input.body,
    selection: input.selection,
    skills: input.skills ?? [],
    capturePath: input.capturePath,
  }
  store.add(comment)
  onNew?.(comment)
  return comment
}

export function updateComment(
  store: CommentStore,
  patch: { id: string; status?: Comment['status']; resultSummary?: string },
): { updated: boolean } {
  assertCan('comment:write')
  const updated = store.update(patch.id, {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.resultSummary != null ? { resultSummary: patch.resultSummary } : {}),
  })
  return { updated: Boolean(updated) }
}

export function deleteComment(store: CommentStore, id: string): { deleted: boolean } {
  assertCan('comment:delete')
  return { deleted: store.delete(id) }
}
