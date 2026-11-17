import type { SourceFile } from '../../../contracts/source-scan'

const COLOR_UTILITY =
  /^(bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|placeholder|caret|accent|shadow)-(.+)$/

/** Tailwind's stock palettes — any of these means the utility skips the theme. */
const PALETTE =
  /^(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|lightblue|warmgray|truegray|coolgray|bluegray)$/

const ALLOWED = new Set(['white', 'black', 'transparent', 'current', 'inherit'])

/**
 * An `[…]` value is only a color violation when it really carries a color:
 * `text-[13px]` and `border-[length:3px]` are sizes, `text-[#fff]` is a hardcode.
 */
export function arbitraryIsColor(value: string): boolean {
  const inner = value.slice(1, -1).trim()
  const typed = /^(color|length|size|percentage|number)\s*:\s*(.*)$/i.exec(inner)
  if (typed) return typed[1]!.toLowerCase() === 'color'
  if (/^#|^(rgb|hsl|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(inner)) return true
  return !/^-?\d*\.?\d+([a-z%]+)?$/i.test(inner)
}

/** Values that look like colors but are size, weight, or placement utilities. */
const NON_COLOR = new Set([
  'sm', 'xs', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  'left', 'center', 'right', 'justify', 'start', 'end', 'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip',
  'solid', 'dashed', 'dotted', 'double', 'hidden', 'inset', 'radius', 'opacity', 'blend', 'offset',
  't', 'b', 'l', 'r', 'x', 'y', 's', 'e', 'tl', 'tr', 'bl', 'br',
  'none', 'auto', 'full', 'screen', 'min', 'max', 'fit',
])

export type UtilityKind = 'token' | 'allowed' | 'palette' | 'arbitrary' | 'unknown'

export interface UtilityRow {
  name: string
  count: number
  files: string[]
  kind: UtilityKind
  dark: boolean
}

export interface ThemeAuditReport {
  root: string
  hasTheme: boolean
  tokens: string[]
  scanned: number
  truncated: boolean
  utilities: UtilityRow[]
  violations: UtilityRow[]
}

/** Body of the `{...}` starting at `openIndex`, quote- and comment-aware. */
export function objectBody(src: string, openIndex: number): string {
  let depth = 0
  let quote = ''
  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i]!
    if (quote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? src.length : nl
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 1
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return src.slice(openIndex + 1, i)
    }
  }
  return src.slice(openIndex + 1)
}

/** Split an object literal on its top-level commas. */
export function splitTopLevel(body: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  let quote = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (quote) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{' || ch === '[' || ch === '(') depth++
    else if (ch === '}' || ch === ']' || ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      out.push(body.slice(start, i))
      start = i + 1
    }
  }
  out.push(body.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}

/** `{ surface: { DEFAULT, raised } }` → `['surface', 'surface-raised']`. */
export function flattenObjectKeys(body: string, prefix = ''): string[] {
  const out: string[] = []
  for (const entry of splitTopLevel(body)) {
    const m = /^(['"]?)([A-Za-z0-9_$-]+)\1\s*:\s*([\s\S]*)$/.exec(entry)
    if (!m) continue
    const key = m[2]!.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    const name = key === 'default' ? prefix : prefix ? `${prefix}-${key}` : key
    if (!name) continue
    const value = m[3]!.trim()
    if (value.startsWith('{')) out.push(...flattenObjectKeys(objectBody(value, 0), name))
    else out.push(name)
  }
  return [...new Set(out.filter(Boolean))]
}

/** Class-looking tokens inside string literals; CSS declarations are ignored. */
export function classNameTokens(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/['"`]([^'"`\n]{1,600})['"`]/g)) {
    const raw = m[1]!
    if (!/[a-z]-/.test(raw)) continue
    for (const word of raw.split(/\s+/)) {
      if (!word || word.length > 80) continue
      if (/[;{}()]/.test(word) || word.endsWith(':')) continue
      const base = word.slice(word.lastIndexOf(':') + 1).replace(/^!?-?/, '')
      if (!COLOR_UTILITY.test(base)) continue
      out.add(word)
    }
  }
  return [...out]
}

export function classifyColorUtility(
  utility: string,
  tokens: Set<string>,
): { kind: UtilityKind; dark: boolean } | undefined {
  const dark = /(^|:)dark:/.test(utility)
  const base = utility.slice(utility.lastIndexOf(':') + 1).replace(/^!?-?/, '')
  const m = COLOR_UTILITY.exec(base)
  if (!m) return undefined
  const value = m[2]!.replace(/\/\d{1,3}$/, '')
  if (!value) return undefined
  if (value.startsWith('[')) return arbitraryIsColor(value) ? { kind: 'arbitrary', dark } : undefined
  if (/^(linear|radial|conic|gradient)(-|$)/.test(value)) return undefined
  if (value.includes('(')) return { kind: 'arbitrary', dark }
  if (ALLOWED.has(value)) return { kind: 'allowed', dark }
  if (NON_COLOR.has(value) || /^\d+(\.\d+)?%?$/.test(value)) return undefined
  if (PALETTE.test(value) || PALETTE.test(value.replace(/-\d{2,3}$/, ''))) return { kind: 'palette', dark }
  if (tokens.has(value)) return { kind: 'token', dark }
  return { kind: 'unknown', dark }
}

/** Theme tokens declared as `themeColors`/`colors` objects or `--color-*` CSS custom props. */
export function themeTokens(files: SourceFile[]): string[] {
  const tokens = new Set<string>()
  for (const f of files) {
    for (const m of f.text.matchAll(/--color-([a-zA-Z0-9-]+)\s*:/g)) tokens.add(m[1]!.toLowerCase())
    for (const m of f.text.matchAll(/\b(?:themeColors|colors)\b\s*(?::[^={}]*)?=\s*\{/g)) {
      const open = f.text.indexOf('{', m.index + m[0].length - 1)
      if (open >= 0) for (const t of flattenObjectKeys(objectBody(f.text, open))) tokens.add(t)
    }
    const colorsAt = f.text.search(/\bcolors\s*:\s*\{/)
    if (colorsAt >= 0) {
      const open = f.text.indexOf('{', colorsAt)
      for (const t of flattenObjectKeys(objectBody(f.text, open))) tokens.add(t)
    }
  }
  return [...tokens].sort()
}
