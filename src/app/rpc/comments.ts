import { defineRpcFunction } from 'devframe'
import { z } from 'zod'
import type { Comment } from '../../contracts/protocol'
import { CommentSchema, SelectionSchema } from '../../contracts/protocol'
import type { CommentStore } from '../../core/ports/comment-store'
import {
  deleteComment,
  listComments,
  submitComment,
  updateComment,
} from '../../modules/comments'

const SubmitSchema = z.object({
  body: z.string().min(1).max(8000),
  page: z.string().min(1).max(500),
  kind: z.enum(['comment', 'idea']).optional(),
  selection: SelectionSchema,
  skills: z.array(z.string().max(120)).max(20).optional(),
  capturePath: z.string().max(1000).optional(),
})

export interface CommentRpcDeps {
  store: CommentStore
  onNew?: (comment: Comment) => void
}

export function createCommentRpc(deps: CommentRpcDeps) {
  const listCommentsRpc = defineRpcFunction({
    name: 'list-comments',
    type: 'query',
    jsonSerializable: true,
    args: [],
    agent: { description: 'List all overlay comments/ideas with their agent-run status' },
    returns: z.object({ items: z.array(CommentSchema) }),
    handler: async () => listComments(deps.store),
  })

  const submitCommentRpc = defineRpcFunction({
    name: 'submit-comment',
    type: 'action',
    jsonSerializable: true,
    agent: {
      description:
        'Submit an in-page comment (selection may be an element, component, or the whole page). With autoRun enabled an agent CLI starts on it immediately.',
    },
    args: [SubmitSchema],
    returns: CommentSchema,
    handler: async (input) => submitComment(deps.store, input, deps.onNew),
  })

  const updateCommentRpc = defineRpcFunction({
    name: 'update-comment',
    type: 'action',
    jsonSerializable: true,
    agent: { description: 'Patch a comment: set status (queued|running|done|failed) and/or resultSummary after working on it' },
    args: [
      z.object({
        id: z.string(),
        status: z.enum(['queued', 'running', 'done', 'failed']).optional(),
        resultSummary: z.string().max(1000).optional(),
      }),
    ],
    returns: z.object({ updated: z.boolean() }),
    handler: async ({ id, status, resultSummary }) =>
      updateComment(deps.store, { id, status, resultSummary }),
  })

  const deleteCommentRpc = defineRpcFunction({
    name: 'delete-comment',
    type: 'action',
    jsonSerializable: true,
    agent: { description: 'Remove a comment/idea from the store (dismiss it)' },
    args: [z.object({ id: z.string() })],
    returns: z.object({ deleted: z.boolean() }),
    handler: async ({ id }) => deleteComment(deps.store, id),
  })

  return {
    listComments: listCommentsRpc,
    submitComment: submitCommentRpc,
    updateComment: updateCommentRpc,
    deleteComment: deleteCommentRpc,
  }
}
