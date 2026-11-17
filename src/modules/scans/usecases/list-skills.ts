import { join } from 'node:path'
import type { ScansDeps } from '../deps'

const MAX_SKILLS = 400

const NAME_RE = /^name:\s*(.+)$/m
const DESC_RE = /^description:\s*(.+)$/m

export interface SkillRow {
  name: string
  description: string
  path: string
  root: string
}

function frontmatterField(re: RegExp, raw: string): string {
  const match = re.exec(raw)
  return (match?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
}

async function scanRoot(deps: ScansDeps, root: string, out: SkillRow[]): Promise<void> {
  let dirents
  try {
    dirents = await deps.fs.readdir(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of dirents) {
    if (out.length >= MAX_SKILLS) return
    if (!entry.isDirectory()) continue
    const skillFile = join(root, entry.name, 'SKILL.md')
    try {
      const raw = await deps.fs.readFile(skillFile, 'utf8')
      const front = raw.slice(0, raw.indexOf('\n---', 3) > 0 ? raw.indexOf('\n---', 3) + 4 : 1200)
      const name = frontmatterField(NAME_RE, front) || entry.name
      out.push({
        name,
        description: frontmatterField(DESC_RE, raw.slice(0, 4000)).slice(0, 300),
        path: skillFile,
        root,
      })
    } catch {
      /* no SKILL.md in this directory — skip */
    }
  }
}

export async function listSkills(deps: ScansDeps, roots: string[], override?: string[]): Promise<{ skills: SkillRow[]; roots: string[] }> {
  const effective = override && override.length > 0 ? override : roots
  const skills: SkillRow[] = []
  for (const root of effective) await scanRoot(deps, root, skills)
  return { skills, roots: effective }
}
