import {
  parseWorkbenchProjection,
  WorkbenchProjectionError,
  type WorkbenchAttentionItem,
  type WorkbenchEvidenceRow,
  type WorkbenchProjection,
} from './projection'

const RELEASE_017_READINESS_MODULES = [
  'evidence_diff',
  'review_history',
  'search_analytics',
  'search_change',
  'page_focus',
  'discovery_diagnostics',
  'ai_visibility',
] as const

function invalid(message: string): never {
  throw new WorkbenchProjectionError('invalid_projection', message)
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) invalid(`${label} must be unique.`)
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sameEvidenceIdentity(
  evidence: WorkbenchEvidenceRow,
  attention: WorkbenchAttentionItem,
): boolean {
  return evidence.id === attention.id
    && evidence.moduleId === attention.moduleId
    && evidence.kind === attention.originalKind
    && evidence.state === attention.originalState
    && evidence.evidenceIdentity === attention.evidenceIdentity
    && evidence.url === attention.identity.url
    && evidence.query === attention.identity.query
    && evidence.promptId === attention.identity.promptId
    && evidence.cohortHash === attention.identity.cohortHash
    && sameStrings(evidence.readinessContext, attention.readinessContext)
}

function stateCounts(rows: readonly WorkbenchEvidenceRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.state, (counts.get(row.state) ?? 0) + 1)
  return counts
}

function validateRelease017Consistency(projection: WorkbenchProjection): void {
  const { workspace } = projection

  const readinessModules = workspace.readiness.map((entry) => entry.moduleId)
  unique(readinessModules, 'Release 0.17 readiness module IDs')
  if (!sameStrings(readinessModules, RELEASE_017_READINESS_MODULES)) {
    invalid('Release 0.17 readiness must preserve the accepted seven-module service-brief order.')
  }

  const readinessByModule = new Map(
    workspace.readiness.map((entry) => [entry.moduleId, entry] as const),
  )
  const manifestModules = workspace.sourceManifest.map((entry) => entry.moduleId)
  unique(manifestModules, 'Source-manifest module IDs')
  const suppliedModules = workspace.readiness
    .filter((entry) => entry.state !== 'not_supplied')
    .map((entry) => entry.moduleId)
  if (!sameStrings(manifestModules, suppliedModules)) {
    invalid('Source manifest must correspond exactly to supplied Release 0.17 modules in module order.')
  }
  for (const entry of workspace.sourceManifest) {
    const readiness = readinessByModule.get(entry.moduleId)
    if (readiness === undefined || readiness.state === 'not_supplied') {
      invalid(`Source manifest cannot exist for unsupplied module ${entry.moduleId}.`)
    }
    if (entry.readiness !== readiness.state || !sameStrings(entry.reasons, readiness.reasons)) {
      invalid(`Source-manifest readiness must match module readiness for ${entry.moduleId}.`)
    }
  }

  unique(workspace.attention.map((item) => item.id), 'Attention IDs')
  unique(workspace.evidenceRows.map((row) => row.id), 'Evidence-row IDs')
  if (workspace.attention.length !== workspace.evidenceRows.length) {
    invalid('Release 0.17 evidence rows and Attention items must have the same cardinality.')
  }
  const evidenceById = new Map(workspace.evidenceRows.map((row) => [row.id, row] as const))
  const providersByModule = new Map(
    workspace.sourceManifest.map((entry) => [entry.moduleId, entry.providerIds] as const),
  )
  for (const [index, item] of workspace.attention.entries()) {
    if (item.navigationOrder !== index + 1) {
      invalid('Attention navigationOrder must be contiguous and one-based.')
    }
    const evidence = evidenceById.get(item.id)
    if (evidence === undefined || !sameEvidenceIdentity(evidence, item)) {
      invalid(`Evidence row does not faithfully project Attention item ${item.id}.`)
    }
    const expectedProviders = providersByModule.get(item.moduleId) ?? []
    if (!sameStrings(evidence.providerIds, expectedProviders)) {
      invalid(`Evidence-row providers must match source-manifest providers for ${item.moduleId}.`)
    }
  }

  const { navigation } = workspace
  if (
    navigation.overview.attentionCount !== workspace.attention.length
    || navigation.attention.rowCount !== workspace.attention.length
    || navigation.evidence.rowCount !== workspace.evidenceRows.length
    || navigation.evidence.sourceCount !== workspace.sourceManifest.length
    || navigation.overview.readinessCount !== workspace.readiness.length
    || navigation.overview.limitationCount !== workspace.limitations.length
    || navigation.history.timelineCount !== workspace.timeline.length
  ) {
    invalid('Navigation counts must match the projected Release 0.17 collections.')
  }

  const expectedCounts = stateCounts(workspace.evidenceRows)
  const suppliedCounts = new Map(
    navigation.overview.evidenceStateCounts.map((entry) => [entry.state, entry.count] as const),
  )
  unique(
    navigation.overview.evidenceStateCounts.map((entry) => entry.state),
    'Evidence-state count labels',
  )
  if (
    expectedCounts.size !== suppliedCounts.size
    || [...expectedCounts].some(([state, count]) => suppliedCounts.get(state) !== count)
  ) {
    invalid('Evidence-state navigation counts must match projected evidence rows.')
  }

  const cycle = workspace.decisionCycle
  if (cycle === undefined) {
    if (
      navigation.decisionCycle.supplied
      || navigation.decisionCycle.readiness !== undefined
      || navigation.decisionCycle.recordedMeasurementCount !== 0
      || navigation.decisionCycle.humanOutcomeCount !== 0
    ) {
      invalid('Navigation cannot claim decision-cycle state when no dossier projection is supplied.')
    }
    return
  }

  if (!navigation.decisionCycle.supplied) {
    invalid('Navigation must mark the decision cycle supplied when a dossier projection is present.')
  }
  if (navigation.decisionCycle.readiness !== cycle.readiness.state) {
    invalid('Decision-cycle navigation readiness must match the projected dossier readiness.')
  }
  unique(cycle.decision.selectedAttentionIds, 'Selected Attention IDs')
  const attentionIds = new Set(workspace.attention.map((item) => item.id))
  if (cycle.decision.selectedAttentionIds.some((id) => !attentionIds.has(id))) {
    invalid('Decision-cycle selections must reference projected Attention items.')
  }
}

/**
 * Canonical Workbench boundary decoder. Structural parsing is followed by
 * Release 0.17 cross-field integrity checks so independently valid-looking
 * summaries cannot contradict one another inside the product.
 */
export function decodeWorkbenchProjection(input: unknown): WorkbenchProjection {
  const projection = parseWorkbenchProjection(input)
  validateRelease017Consistency(projection)
  return projection
}
