import type { AuditsDeps } from '../deps'
import { flattenJson, hardcodedCopy, isLocaleFile, tCallKeys } from '../domain/i18n-parse'
import { CODE_EXT } from '../../../contracts/source-scan'

export { flattenJson, tCallKeys, hardcodedCopy }

export interface LocaleRow {
  locale: string
  file: string
  keys: number
  missing: string[]
  coverage: number
}

export interface I18nAuditReport {
  root: string
  detected: boolean
  used: string[]
  locales: LocaleRow[]
  unused: { locale: string; key: string }[]
  hardcoded: { file: string; text: string }[]
}

export async function auditI18n(deps: AuditsDeps, dir?: string): Promise<I18nAuditReport> {
  const scan = await deps.scanner.scan({ dir, exts: new Set([...CODE_EXT, '.json']) })
  const catalogs = scan.files.filter((f) => isLocaleFile(f.rel))

  const messages = new Map<string, Record<string, string>>()
  for (const file of catalogs) {
    try {
      messages.set(file.rel, flattenJson(JSON.parse(file.text)))
    } catch {
      /* invalid JSON — the catalog simply does not count */
    }
  }

  const used = new Set<string>()
  const hardcoded: { file: string; text: string }[] = []
  for (const file of scan.files) {
    if (file.rel.endsWith('.json')) continue
    for (const key of tCallKeys(file.text)) used.add(key)
    if (hardcoded.length < 40) hardcoded.push(...hardcodedCopy(file.text, file.rel))
  }
  const usedKeys = [...used].sort()

  const locales = [...messages.entries()].map(([file, keys]) => {
    const locale = file.replace(/\.json$/, '').split('/').pop() ?? file
    const names = Object.keys(keys)
    const missing = usedKeys.filter((key) => !(key in keys)).slice(0, 50)
    const hit = usedKeys.filter((key) => key in keys).length
    return {
      locale,
      file,
      keys: names.length,
      missing,
      coverage: usedKeys.length ? Math.round((hit / usedKeys.length) * 100) : 100,
    }
  })

  const biggest = [...messages.entries()].sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)[0]
  const unused = biggest
    ? Object.keys(biggest[1])
        .filter((key) => !used.has(key))
        .slice(0, 100)
        .map((key) => ({ locale: biggest[0].replace(/\.json$/, '').split('/').pop() ?? biggest[0], key }))
    : []

  return {
    root: scan.dir,
    detected: messages.size > 0,
    used: usedKeys.slice(0, 200),
    locales: locales.sort((a, b) => b.keys - a.keys),
    unused,
    hardcoded: hardcoded.slice(0, 40),
  }
}
