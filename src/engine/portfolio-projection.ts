export const PORTFOLIO_SCHEMA_VERSION = 'ldw.gas-workbench-portfolio.v1' as const
export const PORTFOLIO_SCHEMA_MINOR_VERSION = 0 as const
export const PORTFOLIO_OPERATIONS_VERSION = '0.19.0' as const

const SOURCE_STATES = ['supplied', 'not_supplied', 'unavailable', 'unsupported'] as const
const FRESHNESS_STATES = ['fresh', 'stale', 'not_evaluable'] as const
const FRESHNESS_REASONS = ['source_state_not_evaluable', 'freshness_policy_not_configured', 'freshness_timestamp_unavailable'] as const
const ANCHOR_KINDS = ['source_window_end', 'collected_at', 'received_at'] as const
const EXCEPTION_KINDS = ['no_current_run', 'source_not_supplied', 'source_unavailable', 'source_unsupported', 'source_freshness_unknown', 'source_stale', 'attention_present', 'report_not_requested'] as const
const MODULE_READINESS = ['not_supplied', 'ready', 'limited', 'not_ready', 'unavailable'] as const
const DECISION_READINESS = [
  'deferred_or_dismissed', 'recommendation_not_created', 'recommendation_proposed',
  'recommendation_in_review', 'recommendation_accepted', 'recommendation_rejected',
  'recommendation_superseded', 'measurement_not_planned', 'measurements_not_recorded',
  'follow_up_not_due', 'follow_up_not_measured', 'follow_up_not_comparable',
  'follow_up_not_ready', 'ready_for_human_assessment', 'outcome_recorded',
] as const

type SourceState = typeof SOURCE_STATES[number]
type FreshnessState = typeof FRESHNESS_STATES[number]
type ExceptionKind = typeof EXCEPTION_KINDS[number]
type ModuleReadiness = typeof MODULE_READINESS[number]
type DecisionReadiness = typeof DECISION_READINESS[number]
type Obj = Record<string, unknown>

type Scope = Readonly<{ tenantId: string; siteId: string; siteScopeRevisionId: string }>
type CountByState<T extends string> = Readonly<{ state: T; count: number }>

export interface PortfolioFeatureProjection {
  readonly schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof PORTFOLIO_SCHEMA_MINOR_VERSION
  readonly portfolio: Readonly<{
    version: typeof PORTFOLIO_OPERATIONS_VERSION
    id: string
    classification: 'ldw_internal'
    evaluatedAt: string
    summary: Readonly<{
      engagementCount: number
      currentRun: Readonly<{ present: number; noCurrentRun: number }>
      attentionPresentEngagements: number
      sourceStates: readonly CountByState<SourceState>[]
      freshnessStates: readonly CountByState<FreshnessState>[]
      moduleReadinessStates: readonly CountByState<ModuleReadiness>[]
      decisionReadinessStates: readonly CountByState<DecisionReadiness>[]
      reportStates: readonly CountByState<'not_requested' | 'present'>[]
      exceptionKinds: readonly CountByState<ExceptionKind>[]
    }>
    engagements: readonly PortfolioEngagement[]
    limitations: readonly string[]
  }>
}

export interface PortfolioEngagement {
  readonly engagementId: string
  readonly label: string
  readonly scope: Scope
  readonly trustedTarget: string
  readonly freshnessPolicy: Readonly<{
    id: string
    version: string
    sources: readonly Readonly<{ sourceFamily: string; maxAgeSeconds: number }>[]
  }>
  readonly currentRunState: 'present' | 'no_current_run'
  readonly currentRunId?: string
  readonly workspaceId?: string
  readonly runPeriod?: Readonly<{ start: string; end: string }>
  readonly runEvaluatedAt?: string
  readonly sources: readonly PortfolioSource[]
  readonly readiness: readonly Readonly<{ moduleId: string; state: ModuleReadiness; reasons: readonly string[] }>[]
  readonly attentionCount: number
  readonly followUp?: Readonly<{ decisionCyclePresent: boolean; readiness?: DecisionReadiness; reasons: readonly string[] }>
  readonly report?: Readonly<{ state: 'not_requested' | 'present'; reportId?: string }>
  readonly exceptions: readonly Readonly<{ kind: ExceptionKind; receiptId?: string; sourceFamily?: string }>[]
  readonly limitations: readonly string[]
}

export interface PortfolioSource {
  readonly receiptId: string
  readonly sourceFamily: string
  readonly sourceState: SourceState
  readonly freshness: Readonly<{
    state: FreshnessState
    reason?: typeof FRESHNESS_REASONS[number]
    anchorKind?: typeof ANCHOR_KINDS[number]
    anchorAt?: string
    ageSeconds?: number
    maxAgeSeconds?: number
  }>
}

export class PortfolioProjectionError extends Error { override name = 'PortfolioProjectionError' }
function fail(message: string): never { throw new PortfolioProjectionError(message) }
function obj(value: unknown, path: string): Obj { if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be an object.`); return value as Obj }
function exact(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Obj { const parsed = obj(value, path), allowed = new Set([...required, ...optional]); for (const key of required) if (!Object.hasOwn(parsed, key)) fail(`${path}.${key} is required.`); for (const key of Object.keys(parsed)) if (!allowed.has(key)) fail(`${path}.${key} is not supported.`); return parsed }
function str(value: unknown, path: string): string { if (typeof value !== 'string' || value.trim() === '') fail(`${path} must be a non-empty string.`); return value }
function arr(value: unknown, path: string): unknown[] { if (!Array.isArray(value)) fail(`${path} must be an array.`); return value }
function strings(value: unknown, path: string): string[] { return arr(value, path).map((item, index) => str(item, `${path}[${index}]`)) }
function bool(value: unknown, path: string): boolean { if (typeof value !== 'boolean') fail(`${path} must be boolean.`); return value }
function integer(value: unknown, path: string): number { if (!Number.isInteger(value) || (value as number) < 0) fail(`${path} must be a non-negative integer.`); return value as number }
function finite(value: unknown, path: string): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${path} must be a non-negative finite number.`); return value }
function en<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] { const parsed = str(value, path); if (!(values as readonly string[]).includes(parsed)) fail(`${path} has unsupported value ${JSON.stringify(parsed)}.`); return parsed as T[number] }
function optionalString(parsed: Obj, key: string, path: string): string | undefined { return parsed[key] === undefined ? undefined : str(parsed[key], `${path}.${key}`) }
function unique(values: readonly string[], path: string): void { if (new Set(values).size !== values.length) fail(`${path} contains duplicate identities.`) }
function scopeKey(scope: Scope): string { return `${scope.tenantId}\u0000${scope.siteId}\u0000${scope.siteScopeRevisionId}` }

function parseScope(value: unknown, path: string): Scope {
  const parsed = exact(value, path, ['tenantId', 'siteId', 'siteScopeRevisionId'])
  return { tenantId: str(parsed.tenantId, `${path}.tenantId`), siteId: str(parsed.siteId, `${path}.siteId`), siteScopeRevisionId: str(parsed.siteScopeRevisionId, `${path}.siteScopeRevisionId`) }
}
function parsePeriod(value: unknown, path: string) {
  const parsed = exact(value, path, ['start', 'end'])
  const start = str(parsed.start, `${path}.start`), end = str(parsed.end, `${path}.end`)
  if (start > end) fail(`${path} is reversed.`)
  return { start, end }
}
function parseFreshness(value: unknown, path: string, sourceState: SourceState): PortfolioSource['freshness'] {
  const parsed = exact(value, path, ['state'], ['reason', 'anchorKind', 'anchorAt', 'ageSeconds', 'maxAgeSeconds'])
  const state = en(parsed.state, FRESHNESS_STATES, `${path}.state`)
  if (state === 'not_evaluable') {
    const reason = en(parsed.reason, FRESHNESS_REASONS, `${path}.reason`)
    if (parsed.anchorKind !== undefined || parsed.anchorAt !== undefined || parsed.ageSeconds !== undefined || parsed.maxAgeSeconds !== undefined) fail(`${path} not_evaluable cannot carry freshness anchor/age fields.`)
    if (sourceState !== 'supplied' && reason !== 'source_state_not_evaluable') fail(`${path} non-supplied source must use source_state_not_evaluable.`)
    if (sourceState === 'supplied' && reason === 'source_state_not_evaluable') fail(`${path} supplied source cannot use source_state_not_evaluable.`)
    return { state, reason }
  }
  if (sourceState !== 'supplied') fail(`${path} ${state} is valid only for supplied source state.`)
  if (parsed.reason !== undefined) fail(`${path} ${state} cannot carry a not-evaluable reason.`)
  const anchorKind = en(parsed.anchorKind, ANCHOR_KINDS, `${path}.anchorKind`)
  const anchorAt = str(parsed.anchorAt, `${path}.anchorAt`)
  const ageSeconds = finite(parsed.ageSeconds, `${path}.ageSeconds`)
  const maxAgeSeconds = finite(parsed.maxAgeSeconds, `${path}.maxAgeSeconds`)
  if (maxAgeSeconds > 31_622_400) fail(`${path}.maxAgeSeconds exceeds Release 0.19 bound.`)
  if ((state === 'fresh') !== (ageSeconds <= maxAgeSeconds)) fail(`${path} state contradicts supplied age/policy values.`)
  return { state, anchorKind, anchorAt, ageSeconds, maxAgeSeconds }
}
function parseSource(value: unknown, index: number): PortfolioSource {
  const path = `portfolio.engagements[].sources[${index}]`, parsed = exact(value, path, ['receiptId', 'sourceFamily', 'sourceState', 'freshness'])
  const sourceState = en(parsed.sourceState, SOURCE_STATES, `${path}.sourceState`)
  return { receiptId: str(parsed.receiptId, `${path}.receiptId`), sourceFamily: str(parsed.sourceFamily, `${path}.sourceFamily`), sourceState, freshness: parseFreshness(parsed.freshness, `${path}.freshness`, sourceState) }
}
function parsePolicy(value: unknown, path: string): PortfolioEngagement['freshnessPolicy'] {
  const parsed = exact(value, path, ['id', 'version', 'sources'])
  const sources = arr(parsed.sources, `${path}.sources`).map((item, index) => {
    const p = `${path}.sources[${index}]`, rule = exact(item, p, ['sourceFamily', 'maxAgeSeconds'])
    const maxAgeSeconds = finite(rule.maxAgeSeconds, `${p}.maxAgeSeconds`)
    if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds > 31_622_400) fail(`${p}.maxAgeSeconds is outside Release 0.19 bounds.`)
    return { sourceFamily: str(rule.sourceFamily, `${p}.sourceFamily`), maxAgeSeconds }
  })
  if (sources.length > 64) fail(`${path}.sources exceeds Release 0.19 receipt bound.`)
  unique(sources.map((item) => item.sourceFamily), `${path}.sources`)
  return { id: str(parsed.id, `${path}.id`), version: str(parsed.version, `${path}.version`), sources }
}
function parseReadiness(value: unknown, path: string) {
  const rows = arr(value, path).map((item, index) => {
    const p = `${path}[${index}]`, parsed = exact(item, p, ['moduleId', 'state', 'reasons'])
    return { moduleId: str(parsed.moduleId, `${p}.moduleId`), state: en(parsed.state, MODULE_READINESS, `${p}.state`), reasons: strings(parsed.reasons, `${p}.reasons`) }
  })
  unique(rows.map((row) => row.moduleId), path)
  return rows
}
function parseFollowUp(value: unknown, path: string): NonNullable<PortfolioEngagement['followUp']> {
  const parsed = exact(value, path, ['decisionCyclePresent', 'reasons'], ['readiness'])
  const decisionCyclePresent = bool(parsed.decisionCyclePresent, `${path}.decisionCyclePresent`)
  const readiness = parsed.readiness === undefined ? undefined : en(parsed.readiness, DECISION_READINESS, `${path}.readiness`)
  if (decisionCyclePresent !== (readiness !== undefined)) fail(`${path} readiness presence must match decisionCyclePresent.`)
  return { decisionCyclePresent, ...(readiness === undefined ? {} : { readiness }), reasons: strings(parsed.reasons, `${path}.reasons`) }
}
function parseReport(value: unknown, path: string): NonNullable<PortfolioEngagement['report']> {
  const parsed = exact(value, path, ['state'], ['reportId'])
  const state = en(parsed.state, ['not_requested', 'present'] as const, `${path}.state`)
  const reportId = optionalString(parsed, 'reportId', path)
  if (state === 'present' && reportId === undefined) fail(`${path} present requires reportId.`)
  if (state === 'not_requested' && reportId !== undefined) fail(`${path} not_requested cannot carry reportId.`)
  if (reportId !== undefined && !/^customer-report:[0-9a-f]{64}$/.test(reportId)) fail(`${path}.reportId must preserve Release 0.17 identity shape.`)
  return { state, ...(reportId === undefined ? {} : { reportId }) }
}

function parseException(value: unknown, path: string): PortfolioEngagement['exceptions'][number] {
  const parsed = exact(value, path, ['kind'], ['receiptId', 'sourceFamily'])
  const kind = en(parsed.kind, EXCEPTION_KINDS, `${path}.kind`)
  const receiptId = optionalString(parsed, 'receiptId', path), sourceFamily = optionalString(parsed, 'sourceFamily', path)
  const sourceScoped = kind === 'source_not_supplied' || kind === 'source_unavailable' || kind === 'source_unsupported' || kind === 'source_freshness_unknown' || kind === 'source_stale'
  if (sourceScoped !== (receiptId !== undefined && sourceFamily !== undefined)) fail(`${path} source-scoped exception fields do not match ${kind}.`)
  return { kind, ...(receiptId === undefined ? {} : { receiptId, sourceFamily: sourceFamily! }) }
}
function exceptionKey(value: PortfolioEngagement['exceptions'][number]): string { return `${value.kind}|${value.sourceFamily ?? ''}|${value.receiptId ?? ''}` }
function expectedExceptionKeys(engagement: Pick<PortfolioEngagement, 'currentRunState' | 'sources' | 'attentionCount' | 'report'>): string[] {
  if (engagement.currentRunState === 'no_current_run') return ['no_current_run||']
  const keys: string[] = []
  for (const source of engagement.sources) {
    if (source.sourceState === 'not_supplied') keys.push(`source_not_supplied|${source.sourceFamily}|${source.receiptId}`)
    if (source.sourceState === 'unavailable') keys.push(`source_unavailable|${source.sourceFamily}|${source.receiptId}`)
    if (source.sourceState === 'unsupported') keys.push(`source_unsupported|${source.sourceFamily}|${source.receiptId}`)
    if (source.sourceState === 'supplied' && source.freshness.state === 'not_evaluable') keys.push(`source_freshness_unknown|${source.sourceFamily}|${source.receiptId}`)
    if (source.freshness.state === 'stale') keys.push(`source_stale|${source.sourceFamily}|${source.receiptId}`)
  }
  if (engagement.attentionCount > 0) keys.push('attention_present||')
  if (engagement.report?.state === 'not_requested') keys.push('report_not_requested||')
  return keys.sort()
}
function parseEngagement(value: unknown, index: number): PortfolioEngagement {
  const path = `portfolio.engagements[${index}]`, parsed = exact(value, path,
    ['engagementId', 'label', 'scope', 'trustedTarget', 'freshnessPolicy', 'currentRunState', 'sources', 'readiness', 'attentionCount', 'exceptions', 'limitations'],
    ['currentRunId', 'workspaceId', 'runPeriod', 'runEvaluatedAt', 'followUp', 'report'])
  const currentRunState = en(parsed.currentRunState, ['present', 'no_current_run'] as const, `${path}.currentRunState`)
  const sources = arr(parsed.sources, `${path}.sources`).map((item, sourceIndex) => parseSource(item, sourceIndex))
  if (sources.length > 64) fail(`${path}.sources exceeds Release 0.18 receipt bound.`)
  unique(sources.map((source) => source.receiptId), `${path}.sources`)
  const readiness = parseReadiness(parsed.readiness, `${path}.readiness`)
  const attentionCount = integer(parsed.attentionCount, `${path}.attentionCount`)
  const followUp = parsed.followUp === undefined ? undefined : parseFollowUp(parsed.followUp, `${path}.followUp`)
  const report = parsed.report === undefined ? undefined : parseReport(parsed.report, `${path}.report`)
  const exceptions = arr(parsed.exceptions, `${path}.exceptions`).map((item, exceptionIndex) => parseException(item, `${path}.exceptions[${exceptionIndex}]`))
  unique(exceptions.map(exceptionKey), `${path}.exceptions`)
  const base = {
    engagementId: str(parsed.engagementId, `${path}.engagementId`),
    label: str(parsed.label, `${path}.label`),
    scope: parseScope(parsed.scope, `${path}.scope`),
    trustedTarget: str(parsed.trustedTarget, `${path}.trustedTarget`),
    freshnessPolicy: parsePolicy(parsed.freshnessPolicy, `${path}.freshnessPolicy`),
    currentRunState, sources, readiness, attentionCount, ...(followUp === undefined ? {} : { followUp }), ...(report === undefined ? {} : { report }), exceptions,
    limitations: strings(parsed.limitations, `${path}.limitations`),
  }
  if (currentRunState === 'no_current_run') {
    if (parsed.currentRunId !== undefined || parsed.workspaceId !== undefined || parsed.runPeriod !== undefined || parsed.runEvaluatedAt !== undefined || followUp !== undefined || report !== undefined) fail(`${path} no_current_run cannot carry run-only fields.`)
    if (sources.length !== 0 || readiness.length !== 0 || attentionCount !== 0) fail(`${path} no_current_run must preserve empty run-derived state.`)
    if (exceptions.length !== 1 || exceptions[0]?.kind !== 'no_current_run') fail(`${path} no_current_run must carry only no_current_run exception.`)
    return base
  }
  const currentRunId = str(parsed.currentRunId, `${path}.currentRunId`), workspaceId = str(parsed.workspaceId, `${path}.workspaceId`)
  if (!/^managed-service-run:[0-9a-f]{64}$/.test(currentRunId)) fail(`${path}.currentRunId has invalid Release 0.18 identity shape.`)
  if (!/^workspace:[0-9a-f]{64}$/.test(workspaceId)) fail(`${path}.workspaceId has invalid Release 0.17 identity shape.`)
  if (parsed.runPeriod === undefined || parsed.runEvaluatedAt === undefined || followUp === undefined || report === undefined) fail(`${path} present requires complete current-run operational fields.`)
  const runPeriod = parsePeriod(parsed.runPeriod, `${path}.runPeriod`), runEvaluatedAt = str(parsed.runEvaluatedAt, `${path}.runEvaluatedAt`)
  const expected = expectedExceptionKeys({ currentRunState, sources, attentionCount, report })
  const actual = exceptions.map(exceptionKey).sort()
  if (expected.length !== actual.length || expected.some((key, i) => key !== actual[i])) fail(`${path}.exceptions contradict accepted Release 0.19 operational facts.`)
  return { ...base, currentRunId, workspaceId, runPeriod, runEvaluatedAt, followUp, report }
}

function parseCountRows<const T extends readonly string[]>(value: unknown, path: string, states: T): CountByState<T[number]>[] {
  const rows = arr(value, path)
  if (rows.length !== states.length) fail(`${path} must include every accepted state exactly once.`)
  return rows.map((item, index) => {
    const p = `${path}[${index}]`, parsed = exact(item, p, ['state', 'count'])
    const state = en(parsed.state, states, `${p}.state`)
    if (state !== states[index]) fail(`${path} must preserve accepted deterministic state order.`)
    return { state, count: integer(parsed.count, `${p}.count`) }
  })
}
function count<T extends string>(values: readonly T[], states: readonly T[]): Map<T, number> { const result = new Map<T, number>(states.map((state) => [state, 0])); for (const value of values) result.set(value, (result.get(value) ?? 0) + 1); return result }
function assertCounts<T extends string>(rows: readonly CountByState<T>[], expected: Map<T, number>, path: string): void { for (const row of rows) if (row.count !== (expected.get(row.state) ?? 0)) fail(`${path} count for ${row.state} contradicts engagement state.`) }

export function parsePortfolioProjection(input: unknown): PortfolioFeatureProjection {
  const root = exact(input, 'portfolioFeature', ['schemaVersion', 'schemaMinorVersion', 'portfolio'])
  if (root.schemaVersion !== PORTFOLIO_SCHEMA_VERSION || root.schemaMinorVersion !== PORTFOLIO_SCHEMA_MINOR_VERSION) fail('Unsupported portfolio feature schema/version.')
  const raw = exact(root.portfolio, 'portfolio', ['version', 'id', 'classification', 'evaluatedAt', 'summary', 'engagements', 'limitations'])
  if (raw.version !== PORTFOLIO_OPERATIONS_VERSION) fail('Release 0.19 portfolio version must remain 0.19.0.')
  if (raw.classification !== 'ldw_internal') fail('Portfolio classification must remain ldw_internal.')
  const id = str(raw.id, 'portfolio.id')
  if (!/^portfolio-operations:[0-9a-f]{64}$/.test(id)) fail('Portfolio id must preserve Release 0.19 SHA-256 identity shape.')
  const engagements = arr(raw.engagements, 'portfolio.engagements').map(parseEngagement)
  if (engagements.length < 1 || engagements.length > 64) fail('Portfolio engagements must remain within Release 0.19 bounds.')
  unique(engagements.map((engagement) => engagement.engagementId), 'portfolio.engagements engagement IDs')
  unique(engagements.map((engagement) => scopeKey(engagement.scope)), 'portfolio.engagements trusted scopes')
  const sortedIds = [...engagements.map((engagement) => engagement.engagementId)].sort()
  if (engagements.some((engagement, index) => engagement.engagementId !== sortedIds[index])) fail('Portfolio engagements must preserve Release 0.19 deterministic engagement order.')

  const summaryRaw = exact(raw.summary, 'portfolio.summary', ['engagementCount', 'currentRun', 'attentionPresentEngagements', 'sourceStates', 'freshnessStates', 'moduleReadinessStates', 'decisionReadinessStates', 'reportStates', 'exceptionKinds'])
  const currentRunRaw = exact(summaryRaw.currentRun, 'portfolio.summary.currentRun', ['present', 'noCurrentRun'])
  const summary = {
    engagementCount: integer(summaryRaw.engagementCount, 'portfolio.summary.engagementCount'),
    currentRun: { present: integer(currentRunRaw.present, 'portfolio.summary.currentRun.present'), noCurrentRun: integer(currentRunRaw.noCurrentRun, 'portfolio.summary.currentRun.noCurrentRun') },
    attentionPresentEngagements: integer(summaryRaw.attentionPresentEngagements, 'portfolio.summary.attentionPresentEngagements'),
    sourceStates: parseCountRows(summaryRaw.sourceStates, 'portfolio.summary.sourceStates', SOURCE_STATES),
    freshnessStates: parseCountRows(summaryRaw.freshnessStates, 'portfolio.summary.freshnessStates', FRESHNESS_STATES),
    moduleReadinessStates: parseCountRows(summaryRaw.moduleReadinessStates, 'portfolio.summary.moduleReadinessStates', MODULE_READINESS),
    decisionReadinessStates: parseCountRows(summaryRaw.decisionReadinessStates, 'portfolio.summary.decisionReadinessStates', DECISION_READINESS),
    reportStates: parseCountRows(summaryRaw.reportStates, 'portfolio.summary.reportStates', ['not_requested', 'present'] as const),
    exceptionKinds: parseCountRows(summaryRaw.exceptionKinds, 'portfolio.summary.exceptionKinds', EXCEPTION_KINDS),
  }
  if (summary.engagementCount !== engagements.length) fail('Portfolio engagementCount contradicts engagement projection.')
  const present = engagements.filter((engagement) => engagement.currentRunState === 'present').length
  if (summary.currentRun.present !== present || summary.currentRun.noCurrentRun !== engagements.length - present) fail('Portfolio current-run summary contradicts engagement projection.')
  if (summary.attentionPresentEngagements !== engagements.filter((engagement) => engagement.attentionCount > 0).length) fail('Portfolio Attention summary contradicts engagement projection.')
  assertCounts(summary.sourceStates, count(engagements.flatMap((engagement) => engagement.sources.map((source) => source.sourceState)), SOURCE_STATES), 'portfolio.summary.sourceStates')
  assertCounts(summary.freshnessStates, count(engagements.flatMap((engagement) => engagement.sources.map((source) => source.freshness.state)), FRESHNESS_STATES), 'portfolio.summary.freshnessStates')
  assertCounts(summary.moduleReadinessStates, count(engagements.flatMap((engagement) => engagement.readiness.map((entry) => entry.state)), MODULE_READINESS), 'portfolio.summary.moduleReadinessStates')
  assertCounts(summary.decisionReadinessStates, count(engagements.flatMap((engagement) => engagement.followUp?.readiness === undefined ? [] : [engagement.followUp.readiness]), DECISION_READINESS), 'portfolio.summary.decisionReadinessStates')
  assertCounts(summary.reportStates, count(engagements.flatMap((engagement) => engagement.report === undefined ? [] : [engagement.report.state]), ['not_requested', 'present'] as const), 'portfolio.summary.reportStates')
  assertCounts(summary.exceptionKinds, count(engagements.flatMap((engagement) => engagement.exceptions.map((entry) => entry.kind)), EXCEPTION_KINDS), 'portfolio.summary.exceptionKinds')
  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    schemaMinorVersion: PORTFOLIO_SCHEMA_MINOR_VERSION,
    portfolio: {
      version: PORTFOLIO_OPERATIONS_VERSION,
      id,
      classification: 'ldw_internal',
      evaluatedAt: str(raw.evaluatedAt, 'portfolio.evaluatedAt'),
      summary,
      engagements,
      limitations: strings(raw.limitations, 'portfolio.limitations'),
    },
  }
}
