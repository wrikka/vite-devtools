/** `export (default )?(function|const|class) PascalCase` + `export { A, B }`. */
export function exportedNames(src: string): string[] {
  const names = new Set<string>()
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    names.add(m[1]!)
  }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Z][A-Za-z0-9_]*$/.test(name)) names.add(name)
    }
  }
  return [...names]
}

export function kindOf(file: string, name: string): 'component' | 'page' | 'layout' | 'hook' {
  if (/^use[A-Z]/.test(name)) return 'hook'
  if (/(^|[/])(routes|pages)([/]|$)/.test(file)) return 'page'
  if (/(layout|wrapper|shell)/i.test(file)) return 'layout'
  return 'component'
}
