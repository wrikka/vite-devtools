import { z } from 'zod'

export const ComponentSchema = z.object({
  /** Repo-relative path, posix separators. */
  file: z.string(),
  name: z.string(),
  /** PascalCase exports of the file — a file can host several components. */
  exports: z.array(z.string()),
  loc: z.number(),
  /** Files (other than itself) that mention this component by name. */
  refs: z.number(),
  kind: z.enum(['component', 'page', 'layout', 'hook']),
})

export type ComponentRow = z.infer<typeof ComponentSchema>
export type ComponentKind = ComponentRow['kind']

export interface ComponentsReport {
  root: string
  components: ComponentRow[]
  truncated: boolean
}
