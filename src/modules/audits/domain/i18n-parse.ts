const LOCALE_DIR = /(^|\/)(locales?|i18n|lang|langs|messages|translations)\//i

/** `{ a: { b: 'x' } }` → `{ 'a.b': 'x' }`; arrays are leaves. */
export function flattenJson(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (value == null) return out
  if (typeof value === 'string') {
    out[prefix] = value
    return out
  }
  if (typeof value !== 'object') return out
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenJson(child, name, out)
    else out[name] = typeof child === 'string' ? child : String(child)
  }
  return out
}

/** Literal keys passed to `t('…')` / `$t('…')` / `i18n.t('…')`. */
export function tCallKeys(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/(?:\b|\$)t\s*\(\s*['"`]([^'"`$\n]{1,120})['"`]/g)) out.add(m[1]!)
  for (const m of text.matchAll(/\bi18n\.t\s*\(\s*['"`]([^'"`$\n]{1,120})['"`]/g)) out.add(m[1]!)
  return [...out]
}

/** Text nodes in JSX with no interpolation — likely copy that never reached a catalog. */
export function hardcodedCopy(text: string, file: string): { file: string; text: string }[] {
  if (!/\.(tsx|jsx|vue|svelte|astro|html)$/.test(file)) return []
  const out: { file: string; text: string }[] = []
  for (const m of text.matchAll(/>([^<>{}\n]{12,120})</g)) {
    const copy = m[1]!.trim()
    if (!/[A-Za-z]{3}/.test(copy)) continue
    if (/^[\d\s.,:%/()+-]+$/.test(copy)) continue
    if (/^https?:\/\//.test(copy)) continue
    out.push({ file, text: copy })
    if (out.length >= 3) break
  }
  return out
}

export function isLocaleFile(rel: string): boolean {
  return rel.endsWith('.json') && LOCALE_DIR.test(rel)
}
