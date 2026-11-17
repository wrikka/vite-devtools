import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RPC_DIR = join(import.meta.dirname, '..', '..', 'src', 'app', 'rpc')

interface RpcDef {
  file: string
  name: string
  block: string
}

/** Every `defineRpcFunction({...})` call site in app/rpc, with its source block. */
function rpcDefs(): RpcDef[] {
  const defs: RpcDef[] = []
  for (const file of readdirSync(RPC_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    const src = readFileSync(join(RPC_DIR, file), 'utf8')
    for (const m of src.matchAll(/defineRpcFunction\(\{([\s\S]*?)\n  \}\)/g)) {
      const name = /name:\s*'([^']+)'/.exec(m[1]!)?.[1]
      if (name) defs.push({ file, name, block: m[1]! })
    }
  }
  return defs
}

describe('rpc contract', () => {
  const defs = rpcDefs()

  it('finds every registered rpc', () => {
    expect(defs.length).toBeGreaterThanOrEqual(28)
  })

  it('rpc ids are unique and kebab-case', () => {
    const names = defs.map((d) => d.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('every rpc declares an agent description', () => {
    for (const d of defs) expect(d.block, `${d.file}:${d.name}`).toContain('description:')
  })

  it('mutating rpc kinds keep jsonSerializable', () => {
    for (const d of defs) {
      if (/type:\s*'(action|static)'/.test(d.block)) {
        expect(d.block, `${d.file}:${d.name}`).toContain('jsonSerializable: true')
      }
    }
  })

  it('every rpc declares args and returns schemas', () => {
    for (const d of defs) {
      expect(d.block, `${d.file}:${d.name}`).toContain('args:')
      expect(d.block, `${d.file}:${d.name}`).toContain('returns:')
    }
  })
})
