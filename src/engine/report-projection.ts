import type { WorkbenchProjection } from './projection'

export const REPORT_SCHEMA_VERSION = 'ldw.gas-workbench-report.v1' as const
export const REPORT_SCHEMA_MINOR_VERSION = 0 as const
export const CUSTOMER_REPORT_VERSION = '0.17.0' as const

const OUTCOME_DIRECTIONS = ['improved', 'regressed', 'unchanged', 'inconclusive', 'not_due', 'not_measured'] as const
const ATTRIBUTION_STRENGTHS = ['none', 'technical_verification', 'association', 'controlled_evidence'] as const

type Period = Readonly<{ start: string; end: string }>
type Obj = Record<string, unknown>

export interface ReportFeatureProjection {
  readonly schemaVersion: typeof REPORT_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof REPORT_SCHEMA_MINOR_VERSION
  readonly identity: Readonly<{
    workspaceId: string
    tenantId: string
    siteId: string
    siteScopeRevisionId: string
    trustedTarget: string
    generatedAt: string
    evaluatedAt: string
  }>
  readonly report: Readonly<{
    version: typeof CUSTOMER_REPORT_VERSION
    id: string
    title: string
    createdAt: string
    context: Readonly<{ siteId: string; target: string; periods: readonly Period[] }>
    executiveSummary: string
    readiness: readonly Readonly<{ moduleId: string; state: string; reasons: readonly string[] }>[]
    limitations: readonly string[]
    observedChanges: readonly string[]
    focusItems: readonly Readonly<{ moduleId: string; kind: string; state: string; label: string; readinessContext: readonly string[] }>[]
    decision?: Readonly<{
      disposition: string
      summary: string
      readiness: string
      recommendationLifecycle?: string
      recommendationRationale?: string
      measurementPlanned: boolean
      recordedMeasurementCount: number
      humanOutcomes: readonly Readonly<{
        direction: typeof OUTCOME_DIRECTIONS[number]
        rationale: string
        attribution: typeof ATTRIBUTION_STRENGTHS[number]
        createdAt: string
      }>[]
    }>
    nextReview: string
    sourceNotes: readonly Readonly<{
      moduleId: string
      release: string
      providers: readonly string[]
      periods: readonly Period[]
      readiness: string
      reasons: readonly string[]
    }>[]
    internalAppendix?: Readonly<{
      workspaceId: string
      serviceBriefId: string
      decisionCycleDossierId?: string
      selectedAttentionIds: readonly string[]
    }>
  }>
}

export class ReportProjectionError extends Error { override name = 'ReportProjectionError' }
function fail(message: string): never { throw new ReportProjectionError(message) }
function obj(value: unknown, path: string): Obj { if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be an object.`); return value as Obj }
function exact(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Obj {
  const parsed = obj(value, path), allowed = new Set([...required, ...optional])
  for (const key of required) if (!Object.hasOwn(parsed, key)) fail(`${path}.${key} is required.`)
  for (const key of Object.keys(parsed)) if (!allowed.has(key)) fail(`${path}.${key} is not supported.`)
  return parsed
}
function str(value: unknown, path: string): string { if (typeof value !== 'string' || value.trim() === '') fail(`${path} must be a non-empty string.`); return value }
function arr(value: unknown, path: string): unknown[] { if (!Array.isArray(value)) fail(`${path} must be an array.`); return value }
function strs(value: unknown, path: string): string[] { return arr(value, path).map((item, i) => str(item, `${path}[${i}]`)) }
function bool(value: unknown, path: string): boolean { if (typeof value !== 'boolean') fail(`${path} must be boolean.`); return value }
function integer(value: unknown, path: string): number { if (!Number.isInteger(value) || (value as number) < 0) fail(`${path} must be a non-negative integer.`); return value as number }
function en<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] { const parsed = str(value, path); if (!(values as readonly string[]).includes(parsed)) fail(`${path} has unsupported value ${JSON.stringify(parsed)}.`); return parsed as T[number] }
function unique(values: readonly string[], path: string): void { if (new Set(values).size !== values.length) fail(`${path} contains duplicate identities.`) }
function period(value: unknown, path: string): Period { const parsed = exact(value, path, ['start', 'end']); const start = str(parsed.start, `${path}.start`), end = str(parsed.end, `${path}.end`); if (start > end) fail(`${path} is reversed.`); return { start, end } }
function sameStrings(left: readonly string[], right: readonly string[]): boolean { return left.length === right.length && left.every((value, index) => value === right[index]) }
function periodKey(value: Period): string { return `${value.start}|${value.end}` }
function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort(), sortedRight = [...right].sort()
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index])
}
function samePeriodSet(left: readonly Period[], right: readonly Period[]): boolean { return sameStringSet(left.map(periodKey), right.map(periodKey)) }

function reportIdentityMaterial(report: ReportFeatureProjection['report']): unknown {
  return {
    version: report.version,
    title: report.title,
    createdAt: report.createdAt,
    context: report.context,
    executiveSummary: report.executiveSummary,
    readiness: report.readiness,
    limitations: report.limitations,
    observedChanges: report.observedChanges,
    focusItems: report.focusItems,
    decision: report.decision ?? null,
    nextReview: report.nextReview,
    sourceNotes: report.sourceNotes,
    internalAppendix: report.internalAppendix ?? null,
  }
}
function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (typeof value !== 'object') fail('Report identity material is not canonical JSON data.')
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
}
async function expectedReportId(report: ReportFeatureProjection['report']): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(reportIdentityMaterial(report)))
  if (bytes.byteLength > 65_536) fail('Release 0.17 report identity material exceeds the accepted canonical JSON bound.')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return `customer-report:${[...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function parseDecision(value: unknown, path: string): NonNullable<ReportFeatureProjection['report']['decision']> {
  const parsed = exact(value, path, ['disposition', 'summary', 'readiness', 'measurementPlanned', 'recordedMeasurementCount', 'humanOutcomes'], ['recommendationLifecycle', 'recommendationRationale'])
  const hasLifecycle = parsed.recommendationLifecycle !== undefined, hasRationale = parsed.recommendationRationale !== undefined
  if (hasLifecycle !== hasRationale) fail(`${path} recommendation lifecycle and rationale must be supplied together.`)
  const humanOutcomes = arr(parsed.humanOutcomes, `${path}.humanOutcomes`).map((item, index) => {
    const p = `${path}.humanOutcomes[${index}]`, outcome = exact(item, p, ['direction', 'rationale', 'attribution', 'createdAt'])
    return {
      direction: en(outcome.direction, OUTCOME_DIRECTIONS, `${p}.direction`),
      rationale: str(outcome.rationale, `${p}.rationale`),
      attribution: en(outcome.attribution, ATTRIBUTION_STRENGTHS, `${p}.attribution`),
      createdAt: str(outcome.createdAt, `${p}.createdAt`),
    }
  })
  return {
    disposition: str(parsed.disposition, `${path}.disposition`),
    summary: str(parsed.summary, `${path}.summary`),
    readiness: str(parsed.readiness, `${path}.readiness`),
    ...(hasLifecycle ? { recommendationLifecycle: str(parsed.recommendationLifecycle, `${path}.recommendationLifecycle`), recommendationRationale: str(parsed.recommendationRationale, `${path}.recommendationRationale`) } : {}),
    measurementPlanned: bool(parsed.measurementPlanned, `${path}.measurementPlanned`),
    recordedMeasurementCount: integer(parsed.recordedMeasurementCount, `${path}.recordedMeasurementCount`),
    humanOutcomes,
  }
}

export function parseReportProjection(input: unknown): ReportFeatureProjection {
  const root = exact(input, 'reportFeature', ['schemaVersion', 'schemaMinorVersion', 'identity', 'report'])
  if (root.schemaVersion !== REPORT_SCHEMA_VERSION || root.schemaMinorVersion !== REPORT_SCHEMA_MINOR_VERSION) fail('Unsupported report feature schema/version.')
  const identity = exact(root.identity, 'reportFeature.identity', ['workspaceId', 'tenantId', 'siteId', 'siteScopeRevisionId', 'trustedTarget', 'generatedAt', 'evaluatedAt'])
  const raw = exact(root.report, 'reportFeature.report', ['version', 'id', 'title', 'createdAt', 'context', 'executiveSummary', 'readiness', 'limitations', 'observedChanges', 'focusItems', 'nextReview', 'sourceNotes'], ['decision', 'internalAppendix'])
  if (raw.version !== CUSTOMER_REPORT_VERSION) fail('Release 0.17 report version must remain 0.17.0.')
  const id = str(raw.id, 'reportFeature.report.id'); if (!/^customer-report:[0-9a-f]{64}$/.test(id)) fail('Report id must preserve customer-report SHA-256 identity shape.')
  const contextRaw = exact(raw.context, 'reportFeature.report.context', ['siteId', 'target', 'periods'])
  const context = { siteId: str(contextRaw.siteId, 'reportFeature.report.context.siteId'), target: str(contextRaw.target, 'reportFeature.report.context.target'), periods: arr(contextRaw.periods, 'reportFeature.report.context.periods').map((item, index) => period(item, `reportFeature.report.context.periods[${index}]`)) }
  const readiness = arr(raw.readiness, 'reportFeature.report.readiness').map((item, index) => { const p = `reportFeature.report.readiness[${index}]`, entry = exact(item, p, ['moduleId', 'state', 'reasons']); return { moduleId: str(entry.moduleId, `${p}.moduleId`), state: str(entry.state, `${p}.state`), reasons: strs(entry.reasons, `${p}.reasons`) } })
  unique(readiness.map((entry) => entry.moduleId), 'reportFeature.report.readiness')
  const observedChanges = strs(raw.observedChanges, 'reportFeature.report.observedChanges'); if (observedChanges.length > 12) fail('Release 0.17 observedChanges exceeds the accepted bound of 12.')
  const focusItems = arr(raw.focusItems, 'reportFeature.report.focusItems').map((item, index) => { const p = `reportFeature.report.focusItems[${index}]`, focus = exact(item, p, ['moduleId', 'kind', 'state', 'label', 'readinessContext']); return { moduleId: str(focus.moduleId, `${p}.moduleId`), kind: str(focus.kind, `${p}.kind`), state: str(focus.state, `${p}.state`), label: str(focus.label, `${p}.label`), readinessContext: strs(focus.readinessContext, `${p}.readinessContext`) } })
  if (focusItems.length < 1 || focusItems.length > 3) fail('Release 0.17 report must preserve 1-3 selected primary focus items.')
  unique(focusItems.map((item) => `${item.moduleId}\u0000${item.kind}\u0000${item.state}\u0000${item.label}\u0000${item.readinessContext.join('\u0001')}`), 'reportFeature.report.focusItems')
  const sourceNotes = arr(raw.sourceNotes, 'reportFeature.report.sourceNotes').map((item, index) => { const p = `reportFeature.report.sourceNotes[${index}]`, note = exact(item, p, ['moduleId', 'release', 'providers', 'periods', 'readiness', 'reasons']); return { moduleId: str(note.moduleId, `${p}.moduleId`), release: str(note.release, `${p}.release`), providers: strs(note.providers, `${p}.providers`), periods: arr(note.periods, `${p}.periods`).map((value, periodIndex) => period(value, `${p}.periods[${periodIndex}]`)), readiness: str(note.readiness, `${p}.readiness`), reasons: strs(note.reasons, `${p}.reasons`) } })
  unique(sourceNotes.map((note) => `${note.moduleId}\u0000${note.release}\u0000${[...note.providers].sort().join(',')}\u0000${note.periods.map(periodKey).sort().join(',')}`), 'reportFeature.report.sourceNotes')
  const decision = raw.decision === undefined ? undefined : parseDecision(raw.decision, 'reportFeature.report.decision')
  let internalAppendix: NonNullable<ReportFeatureProjection['report']['internalAppendix']> | undefined
  if (raw.internalAppendix !== undefined) {
    const appendix = exact(raw.internalAppendix, 'reportFeature.report.internalAppendix', ['workspaceId', 'serviceBriefId', 'selectedAttentionIds'], ['decisionCycleDossierId'])
    const selectedAttentionIds = strs(appendix.selectedAttentionIds, 'reportFeature.report.internalAppendix.selectedAttentionIds')
    unique(selectedAttentionIds, 'reportFeature.report.internalAppendix.selectedAttentionIds')
    if (selectedAttentionIds.length !== focusItems.length || selectedAttentionIds.length > 3) fail('Internal appendix selection must correspond one-for-one with the bounded focus selection.')
    internalAppendix = { workspaceId: str(appendix.workspaceId, 'reportFeature.report.internalAppendix.workspaceId'), serviceBriefId: str(appendix.serviceBriefId, 'reportFeature.report.internalAppendix.serviceBriefId'), ...(appendix.decisionCycleDossierId === undefined ? {} : { decisionCycleDossierId: str(appendix.decisionCycleDossierId, 'reportFeature.report.internalAppendix.decisionCycleDossierId') }), selectedAttentionIds }
  }
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    schemaMinorVersion: REPORT_SCHEMA_MINOR_VERSION,
    identity: {
      workspaceId: str(identity.workspaceId, 'reportFeature.identity.workspaceId'), tenantId: str(identity.tenantId, 'reportFeature.identity.tenantId'), siteId: str(identity.siteId, 'reportFeature.identity.siteId'), siteScopeRevisionId: str(identity.siteScopeRevisionId, 'reportFeature.identity.siteScopeRevisionId'), trustedTarget: str(identity.trustedTarget, 'reportFeature.identity.trustedTarget'), generatedAt: str(identity.generatedAt, 'reportFeature.identity.generatedAt'), evaluatedAt: str(identity.evaluatedAt, 'reportFeature.identity.evaluatedAt'),
    },
    report: {
      version: CUSTOMER_REPORT_VERSION, id, title: str(raw.title, 'reportFeature.report.title'), createdAt: str(raw.createdAt, 'reportFeature.report.createdAt'), context, executiveSummary: str(raw.executiveSummary, 'reportFeature.report.executiveSummary'), readiness, limitations: strs(raw.limitations, 'reportFeature.report.limitations'), observedChanges, focusItems, ...(decision ? { decision } : {}), nextReview: str(raw.nextReview, 'reportFeature.report.nextReview'), sourceNotes, ...(internalAppendix ? { internalAppendix } : {}),
    },
  }
}

function customerLabel(attention: WorkbenchProjection['workspace']['attention'][number]): string {
  if (attention.identity.url !== undefined) return attention.identity.url
  if (attention.identity.query !== undefined) return attention.identity.query
  if (attention.identity.promptId !== undefined) return 'AI visibility prompt evidence'
  if (attention.identity.cohortHash !== undefined) return 'AI visibility cohort evidence'
  return `${attention.moduleId.replaceAll('_', ' ')} evidence`
}
function focusMatchesAttention(focus: ReportFeatureProjection['report']['focusItems'][number], attention: WorkbenchProjection['workspace']['attention'][number]): boolean {
  return focus.moduleId === attention.moduleId
    && focus.kind === attention.originalKind
    && focus.state === attention.originalState
    && focus.label === customerLabel(attention)
    && sameStrings(focus.readinessContext, attention.readinessContext)
}
function validateDecisionBinding(report: ReportFeatureProjection['report'], workspace: WorkbenchProjection['workspace']): void {
  const cycle = workspace.decisionCycle, decision = report.decision, navigation = workspace.navigation.decisionCycle
  if (cycle === undefined) {
    if (decision !== undefined) fail('Report decision is stale because the current Workbench shell has no decision cycle.')
    return
  }
  if (decision === undefined) fail('Report decision is missing for the current Workbench decision cycle.')
  if (decision.disposition !== cycle.decision.disposition || decision.summary !== cycle.decision.summary || decision.readiness !== cycle.readiness.state) {
    fail('Report decision summary contradicts the current Workbench decision cycle.')
  }
  if (decision.recordedMeasurementCount !== navigation.recordedMeasurementCount || decision.humanOutcomes.length !== navigation.humanOutcomeCount) {
    fail('Report decision measurement/outcome counts contradict the current Workbench navigation summary.')
  }
  const recommendation = cycle.recommendation
  if (recommendation === undefined) {
    if (decision.recommendationLifecycle !== undefined || decision.recommendationRationale !== undefined) fail('Report recommendation context is stale for the current Workbench decision cycle.')
  } else if (decision.recommendationLifecycle !== recommendation.lifecycle || decision.recommendationRationale === undefined) {
    fail('Report recommendation lifecycle contradicts the current Workbench decision cycle.')
  }
  if (cycle.readiness.state === 'measurement_not_planned' && decision.measurementPlanned) fail('Report cannot claim a measurement plan when the current cycle says measurement_not_planned.')
  if ((navigation.recordedMeasurementCount > 0 || navigation.humanOutcomeCount > 0) && !decision.measurementPlanned) fail('Report with recorded measurement/outcome state must preserve measurementPlanned=true.')
}

export async function decodeReportProjection(input: unknown, shell: WorkbenchProjection): Promise<ReportFeatureProjection> {
  const feature = parseReportProjection(input), identity = feature.identity, workspace = shell.workspace, scope = workspace.scope, report = feature.report
  if (identity.workspaceId !== shell.source.workspaceId || identity.tenantId !== scope.tenantId || identity.siteId !== scope.siteId || identity.siteScopeRevisionId !== scope.siteScopeRevisionId || identity.trustedTarget !== workspace.trustedTarget || identity.generatedAt !== workspace.generatedAt || identity.evaluatedAt !== workspace.evaluatedAt) fail('Report feature and Workbench shell identities do not match.')
  if (report.context.siteId !== scope.siteId || report.context.target !== workspace.trustedTarget) fail('Report customer context does not match the current Workbench site/target.')
  const shellPeriods = [...new Map(workspace.sourceManifest.flatMap((entry) => entry.sourcePeriods).map((item) => [periodKey(item), item] as const)).values()]
  if (!samePeriodSet(report.context.periods, shellPeriods)) fail('Report context periods do not match the current source manifest.')
  if (report.readiness.length !== workspace.readiness.length) fail('Report readiness does not match the current Workbench readiness set.')
  for (const entry of report.readiness) {
    const shellEntry = workspace.readiness.find((candidate) => candidate.moduleId === entry.moduleId)
    if (!shellEntry || shellEntry.state !== entry.state || !sameStrings(shellEntry.reasons, entry.reasons)) fail(`Report readiness for ${entry.moduleId} is stale or mismatched.`)
  }
  if (report.sourceNotes.length !== workspace.sourceManifest.length) fail('Report source notes do not match the current source manifest.')
  for (const note of report.sourceNotes) {
    const shellEntry = workspace.sourceManifest.find((candidate) => candidate.moduleId === note.moduleId && candidate.release === note.release && sameStringSet(candidate.providerIds, note.providers) && samePeriodSet(candidate.sourcePeriods, note.periods))
    if (!shellEntry || shellEntry.readiness !== note.readiness || !sameStrings(shellEntry.reasons, note.reasons)) fail(`Report source note ${note.moduleId}/${note.release} is stale or mismatched.`)
  }
  const availableAttention = [...workspace.attention]
  for (const focus of report.focusItems) {
    const index = availableAttention.findIndex((attention) => focusMatchesAttention(focus, attention))
    if (index < 0) fail('Report focus item does not resolve to current supplied Attention evidence including its customer-safe label.')
    availableAttention.splice(index, 1)
  }
  validateDecisionBinding(report, workspace)
  if (report.internalAppendix) {
    if (report.internalAppendix.workspaceId !== shell.source.workspaceId) fail('Internal appendix workspace identity is stale.')
    const serviceBriefIds = workspace.timeline.filter((entry) => entry.kind === 'service_brief' && entry.referenceId !== undefined).map((entry) => entry.referenceId!)
    if (!serviceBriefIds.includes(report.internalAppendix.serviceBriefId)) fail('Internal appendix serviceBriefId does not resolve to the current Workbench service-brief timeline.')
    if (report.internalAppendix.decisionCycleDossierId !== undefined) fail('Internal appendix decisionCycleDossierId is not verifiable from Workbench projection minor 0 and is refused by this bounded slice.')
    report.internalAppendix.selectedAttentionIds.forEach((attentionId, index) => {
      const attention = workspace.attention.find((candidate) => candidate.id === attentionId)
      if (!attention) fail(`Internal appendix references absent Attention id ${attentionId}.`)
      if (!focusMatchesAttention(report.focusItems[index], attention)) fail('Internal appendix Attention selection does not correspond to the customer-safe focus order.')
    })
  }
  if (report.id !== await expectedReportId(report)) fail('Report id does not match the Release 0.17 canonical content hash.')
  return feature
}
