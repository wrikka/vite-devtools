/** Vite's own `import.meta.env` members; never report these as user variables. */
const BUILTIN = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'])

export function envRefs(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)) out.add(m[1]!)
  for (const m of text.matchAll(/\bimport\.meta\.env\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g)) out.add(m[1]!)
  for (const m of text.matchAll(/\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)) out.add(m[1]!)
  for (const m of text.matchAll(/\bprocess\.env\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g)) out.add(m[1]!)
  return [...out].filter((n) => !BUILTIN.has(n))
}

export function parseEnvKeys(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^export\s+/, '')
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(trimmed)
    if (m) out.push(m[1]!)
  }
  return [...new Set(out)]
}

export function isSecretName(name: string): boolean {
  return /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|AUTH|DSN|CONN|SALT|COOKIE)/i.test(name)
}
