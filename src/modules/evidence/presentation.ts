import type {
  WorkbenchReadinessEntry,
  WorkbenchSourceManifestEntry,
} from '../../engine/projection'

export function filterSources(
  entries: readonly WorkbenchReadinessEntry[],
  manifest: readonly WorkbenchSourceManifestEntry[],
  query: string,
  state: string,
) {
  const text = query.trim().toLocaleLowerCase()
  return entries.filter(
    (entry) =>
      (state === 'all' || entry.state === state) &&
      [
        entry.moduleId,
        entry.moduleId.replaceAll('_', ' '),
        entry.state,
        ...entry.reasons,
        ...manifest
          .filter((source) => source.moduleId === entry.moduleId)
          .flatMap((source) => [source.identity, ...source.providerIds]),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(text),
  )
}
export function safeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Presentation-only split: default All groups non-supplied modules instead of
 * listing them as if they were visible. Search matching stays authoritative in
 * filterSources; blank/whitespace-only queries are equivalent.
 */
export function partitionSourceLedger(
  filtered: readonly WorkbenchReadinessEntry[],
  query: string,
  state: string,
): Readonly<{
  listed: readonly WorkbenchReadinessEntry[]
  groupedNotSupplied: readonly WorkbenchReadinessEntry[]
}> {
  if (query.trim() !== '' || state !== 'all') {
    return { listed: filtered, groupedNotSupplied: [] }
  }
  return {
    listed: filtered.filter((entry) => entry.state !== 'not_supplied'),
    groupedNotSupplied: filtered.filter((entry) => entry.state === 'not_supplied'),
  }
}
