import type { WorkbenchProjection } from './projection'

export const MEASUREMENT_SCHEMA_VERSION = 'ldw.gas-workbench-measurement.v1' as const
export const MEASUREMENT_SCHEMA_MINOR_VERSION = 0 as const

const CYCLE_READINESS = [
  'deferred_or_dismissed', 'recommendation_not_created', 'recommendation_proposed',
  'recommendation_in_review', 'recommendation_accepted', 'recommendation_rejected',
  'recommendation_superseded', 'measurement_not_planned', 'measurements_not_recorded',
  'follow_up_not_due', 'follow_up_not_measured', 'follow_up_not_comparable',
  'follow_up_not_ready', 'ready_for_human_assessment', 'outcome_recorded',
] as const
const PLAN_REASONS = ['follow_up_not_due', 'follow_up_not_measured', 'target_missing', 'source_not_final', 'coverage_incomplete', 'coverage_anonymized', 'coverage_truncated', 'incomparable', 'invalid_chronology'] as const
const OUTCOME_DIRECTIONS = ['improved', 'regressed', 'unchanged', 'inconclusive', 'not_due', 'not_measured'] as const
const ATTRIBUTION_STRENGTHS = ['none', 'technical_verification', 'association', 'controlled_evidence'] as const
const DESIGN_CLASSES = ['annotated_pre_post', 'normalized_pre_post', 'group_pre_post', 'matched_control_test', 'randomized_or_balanced_split_test', 'ai_referral_pre_post', 'ai_prompt_cohort_observation', 'provider_native_experiment', 'other_explicit'] as const
const EXPOSURE_STATES = ['not_applicable', 'unknown', 'not_yet_exposed', 'partially_exposed', 'sufficiently_exposed', 'exposure_discontinuous'] as const
const CLAIM_CEILINGS = ['not_interpretable', 'descriptive_observation_only', 'temporal_association_only', 'normalized_association_only', 'controlled_effect_consistent', 'bounded_experimental_effect_consistent', 'ai_referral_change_only', 'ai_prompt_cohort_change_only'] as const
const ALLOWED_CLAIMS = ['no_change_claim_supported', 'exact_observation_description', 'observed_temporal_change', 'observed_normalized_association', 'controlled_effect_consistent_under_supplied_method', 'bounded_experimental_effect_consistent_under_supplied_method', 'ai_referral_metric_change', 'frozen_ai_prompt_cohort_metric_change'] as const
const PROHIBITED_OVERCLAIMS = ['causal_attribution', 'business_or_revenue_causality', 'universal_visibility', 'cross_provider_equivalence', 'automatic_recommendation_or_action'] as const

export type MeasurementCycleReadiness = typeof CYCLE_READINESS[number]
export type MeasurementClaimCeiling = typeof CLAIM_CEILINGS[number]

type Scalar = string | number | boolean | null
export interface MeasurementFeatureProjection {
  readonly schemaVersion: typeof MEASUREMENT_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof MEASUREMENT_SCHEMA_MINOR_VERSION
  readonly identity: Readonly<{ workspaceId: string; tenantId: string; siteId: string; siteScopeRevisionId: string; trustedTarget: string; generatedAt: string; evaluatedAt: string }>
  readonly cycle: Readonly<{
    dossierId: string
    sourceServiceBriefId: string
    decision: Readonly<{ id: string; disposition: 'investigate' | 'recommend' | 'defer' | 'dismiss'; summary: string; recordedAt: string }>
    readiness: Readonly<{ state: MeasurementCycleReadiness; reasons: readonly string[] }>
    measurementPlan?: Readonly<{
      id: string
      annotation: Readonly<{ id: string; summary: string; occurredAt: string; recordedAt: string }>
      target: Readonly<{ rowIdentity: string; query: string; page: string; metric: 'clicks' | 'impressions' | 'ctr' | 'averagePosition'; baselineObservationId: string; followUpObservationId?: string }>
      baselineMeasurementId: string
      followUpMeasurementId: string
      readiness: Readonly<{ state: 'ready_for_human_assessment' | 'not_ready'; reasons: readonly typeof PLAN_REASONS[number][] }>
    }>
  }>
  readonly measurements: readonly Readonly<{
    id: string
    relationship: Readonly<{ role: 'baseline' } | { role: 'follow_up'; baselineMeasurementId: string }>
    dueWindow: Readonly<{ start: string; end: string }>
    result: Readonly<{ state: 'not_due' | 'not_measured'; reason: string } | { state: 'measured'; observedWindow: Readonly<{ start: string; end: string }>; observations: readonly Readonly<{ id: string; value?: Scalar }>[] }>
    comparability: Readonly<{ state: 'comparable' } | { state: 'unknown' | 'discontinuous'; reason: string }>
    methodology: Readonly<{ id: string; version: string }>
    createdAt: string
  }>[]
  readonly outcomes: readonly Readonly<{
    id: string
    direction: typeof OUTCOME_DIRECTIONS[number]
    measurementIds: readonly string[]
    comparability?: 'comparable'
    rationale?: string
    reason?: string
    attribution: Readonly<{ strength: typeof ATTRIBUTION_STRENGTHS[number]; reason?: string; basis?: string; method?: Readonly<{ id: string; version: string }> }>
    createdAt: string
  }>[]
  readonly interpretations: readonly Readonly<{
    id: string
    methodology: Readonly<{ id: 'ldw-measurement-interpretation-claim-ceilings'; version: '1.0.0'; release: '0.22.0' }>
    designClass: typeof DESIGN_CLASSES[number]
    exposure: Readonly<{ state: typeof EXPOSURE_STATES[number]; methodId?: string; methodVersion?: string; evidenceReference?: string }>
    comparability: Readonly<{ state: 'comparable' | 'unknown' | 'discontinuous'; reasons: readonly string[]; baselineMeasurementId: string; followUpMeasurementId: string }>
    readiness: 'ready' | 'limited' | 'blocked'
    claimCeiling: MeasurementClaimCeiling
    allowedClaimCodes: readonly typeof ALLOWED_CLAIMS[number][]
    prohibitedOverclaimCodes: readonly typeof PROHIBITED_OVERCLAIMS[number][]
    limitations: readonly string[]
  }>[]
  readonly authorityNotes: readonly string[]
  readonly limitations: readonly string[]
}

type Obj = Record<string, unknown>
export class MeasurementProjectionError extends Error { override name = 'MeasurementProjectionError' }
function fail(message: string): never { throw new MeasurementProjectionError(message) }
function obj(v: unknown, p: string): Obj { if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(`${p} must be an object.`); return v as Obj }
function exact(v: unknown, p: string, req: readonly string[], opt: readonly string[] = []): Obj { const x = obj(v, p), allowed = new Set([...req, ...opt]); for (const k of req) if (!Object.hasOwn(x, k)) fail(`${p}.${k} is required.`); for (const k of Object.keys(x)) if (!allowed.has(k)) fail(`${p}.${k} is not supported.`); return x }
function str(v: unknown, p: string): string { if (typeof v !== 'string' || !v.trim()) fail(`${p} must be a non-empty string.`); return v }
function arr(v: unknown, p: string): unknown[] { if (!Array.isArray(v)) fail(`${p} must be an array.`); return v }
function strings(v: unknown, p: string): string[] { return arr(v, p).map((x, i) => str(x, `${p}[${i}]`)) }
function en<const T extends readonly string[]>(v: unknown, values: T, p: string): T[number] { const x = str(v, p); if (!(values as readonly string[]).includes(x)) fail(`${p} has unsupported value ${JSON.stringify(x)}.`); return x as T[number] }
function scalar(v: unknown, p: string): Scalar { if (v === null || typeof v === 'string' || typeof v === 'boolean') return v; if (typeof v === 'number' && Number.isFinite(v)) return v; fail(`${p} must be a bounded scalar.`) }
function optionalString(x: Obj, k: string, p: string) { return x[k] === undefined ? undefined : str(x[k], `${p}.${k}`) }
function window(v: unknown, p: string) { const x = exact(v, p, ['start', 'end']), start = str(x.start, `${p}.start`), end = str(x.end, `${p}.end`); if (start > end) fail(`${p} is reversed.`); return { start, end } }
function identity(v: unknown): MeasurementFeatureProjection['identity'] { const p = 'measurement.identity', x = exact(v, p, ['workspaceId', 'tenantId', 'siteId', 'siteScopeRevisionId', 'trustedTarget', 'generatedAt', 'evaluatedAt']); return { workspaceId: str(x.workspaceId, `${p}.workspaceId`), tenantId: str(x.tenantId, `${p}.tenantId`), siteId: str(x.siteId, `${p}.siteId`), siteScopeRevisionId: str(x.siteScopeRevisionId, `${p}.siteScopeRevisionId`), trustedTarget: str(x.trustedTarget, `${p}.trustedTarget`), generatedAt: str(x.generatedAt, `${p}.generatedAt`), evaluatedAt: str(x.evaluatedAt, `${p}.evaluatedAt`) } }
function unique(values: readonly string[], p: string) { if (new Set(values).size !== values.length) fail(`${p} contains duplicate IDs.`) }

function parseMeasurement(raw: unknown, i: number): MeasurementFeatureProjection['measurements'][number] {
  const p = `measurement.measurements[${i}]`, x = exact(raw, p, ['id', 'relationship', 'dueWindow', 'result', 'comparability', 'methodology', 'createdAt'])
  const relationshipRaw = obj(x.relationship, `${p}.relationship`), role = en(relationshipRaw.role, ['baseline', 'follow_up'] as const, `${p}.relationship.role`)
  const relationship = role === 'baseline'
    ? (exact(relationshipRaw, `${p}.relationship`, ['role']), { role: 'baseline' as const })
    : (() => { const r = exact(relationshipRaw, `${p}.relationship`, ['role', 'baselineMeasurementId']); return { role: 'follow_up' as const, baselineMeasurementId: str(r.baselineMeasurementId, `${p}.relationship.baselineMeasurementId`) } })()
  const resultRaw = obj(x.result, `${p}.result`), state = en(resultRaw.state, ['not_due', 'not_measured', 'measured'] as const, `${p}.result.state`)
  const result = state === 'measured' ? (() => {
    const r = exact(resultRaw, `${p}.result`, ['state', 'observedWindow', 'observations']), observedWindow = window(r.observedWindow, `${p}.result.observedWindow`)
    const observations = arr(r.observations, `${p}.result.observations`).map((item, n) => { const q = `${p}.result.observations[${n}]`, o = exact(item, q, ['id'], ['value']); return { id: str(o.id, `${q}.id`), ...(o.value === undefined ? {} : { value: scalar(o.value, `${q}.value`) }) } })
    if (observations.length === 0) fail(`${p}.result.observations must not be empty when measured.`)
    unique(observations.map((o) => o.id), `${p}.result.observations`)
    return { state: 'measured' as const, observedWindow, observations }
  })() : (() => { const r = exact(resultRaw, `${p}.result`, ['state', 'reason']); return { state, reason: str(r.reason, `${p}.result.reason`) } })()
  const compRaw = obj(x.comparability, `${p}.comparability`), compState = en(compRaw.state, ['comparable', 'unknown', 'discontinuous'] as const, `${p}.comparability.state`)
  const comparability = compState === 'comparable' ? (exact(compRaw, `${p}.comparability`, ['state']), { state: 'comparable' as const }) : (() => { const c = exact(compRaw, `${p}.comparability`, ['state', 'reason']); return { state: compState, reason: str(c.reason, `${p}.comparability.reason`) } })()
  const method = exact(x.methodology, `${p}.methodology`, ['id', 'version'])
  return { id: str(x.id, `${p}.id`), relationship, dueWindow: window(x.dueWindow, `${p}.dueWindow`), result, comparability, methodology: { id: str(method.id, `${p}.methodology.id`), version: str(method.version, `${p}.methodology.version`) }, createdAt: str(x.createdAt, `${p}.createdAt`) }
}

function parseOutcome(raw: unknown, i: number): MeasurementFeatureProjection['outcomes'][number] {
  const p = `measurement.outcomes[${i}]`, x = exact(raw, p, ['id', 'direction', 'measurementIds', 'attribution', 'createdAt'], ['comparability', 'rationale', 'reason'])
  const direction = en(x.direction, OUTCOME_DIRECTIONS, `${p}.direction`), measurementIds = strings(x.measurementIds, `${p}.measurementIds`); unique(measurementIds, `${p}.measurementIds`)
  const directional = direction === 'improved' || direction === 'regressed' || direction === 'unchanged'
  if (directional && (measurementIds.length < 2 || x.comparability !== 'comparable' || x.rationale === undefined || x.reason !== undefined)) fail(`${p} directional outcome requires comparable measurements and human rationale.`)
  if ((direction === 'not_due' || direction === 'not_measured') && (measurementIds.length > 0 || x.comparability !== undefined || x.rationale !== undefined || x.reason === undefined)) fail(`${p} ${direction} cannot carry measurement direction evidence.`)
  if (direction === 'inconclusive' && (x.reason === undefined || x.comparability !== undefined || x.rationale !== undefined)) fail(`${p} inconclusive outcome requires reason-only assessment context.`)
  const a = exact(x.attribution, `${p}.attribution`, ['strength'], ['reason', 'basis', 'method']), strength = en(a.strength, ATTRIBUTION_STRENGTHS, `${p}.attribution.strength`)
  if (strength === 'none' && (a.reason === undefined || a.basis !== undefined || a.method !== undefined)) fail(`${p}.attribution none requires reason only.`)
  if (strength !== 'none' && a.basis === undefined) fail(`${p}.attribution ${strength} requires basis.`)
  let method: { id: string; version: string } | undefined
  if (a.method !== undefined) { const m = exact(a.method, `${p}.attribution.method`, ['id', 'version']); method = { id: str(m.id, `${p}.attribution.method.id`), version: str(m.version, `${p}.attribution.method.version`) } }
  if (strength === 'controlled_evidence' && method === undefined) fail(`${p}.attribution controlled_evidence requires method.`)
  if (strength !== 'controlled_evidence' && method !== undefined) fail(`${p}.attribution method is only valid for controlled_evidence.`)
  return { id: str(x.id, `${p}.id`), direction, measurementIds, ...(x.comparability === undefined ? {} : { comparability: en(x.comparability, ['comparable'] as const, `${p}.comparability`) }), ...(x.rationale === undefined ? {} : { rationale: str(x.rationale, `${p}.rationale`) }), ...(x.reason === undefined ? {} : { reason: str(x.reason, `${p}.reason`) }), attribution: { strength, ...(a.reason === undefined ? {} : { reason: str(a.reason, `${p}.attribution.reason`) }), ...(a.basis === undefined ? {} : { basis: str(a.basis, `${p}.attribution.basis`) }), ...(method ? { method } : {}) }, createdAt: str(x.createdAt, `${p}.createdAt`) }
}

function parseInterpretation(raw: unknown, i: number): MeasurementFeatureProjection['interpretations'][number] {
  const p = `measurement.interpretations[${i}]`, x = exact(raw, p, ['id', 'methodology', 'designClass', 'exposure', 'comparability', 'readiness', 'claimCeiling', 'allowedClaimCodes', 'prohibitedOverclaimCodes', 'limitations'])
  const methodology = exact(x.methodology, `${p}.methodology`, ['id', 'version', 'release']); if (methodology.id !== 'ldw-measurement-interpretation-claim-ceilings' || methodology.version !== '1.0.0' || methodology.release !== '0.22.0') fail(`${p}.methodology must preserve accepted Release 0.22 identity.`)
  const exposureRaw = exact(x.exposure, `${p}.exposure`, ['state'], ['methodId', 'methodVersion', 'evidenceReference']), exposure = { state: en(exposureRaw.state, EXPOSURE_STATES, `${p}.exposure.state`), ...(optionalString(exposureRaw, 'methodId', `${p}.exposure`) ? { methodId: exposureRaw.methodId as string } : {}), ...(optionalString(exposureRaw, 'methodVersion', `${p}.exposure`) ? { methodVersion: exposureRaw.methodVersion as string } : {}), ...(optionalString(exposureRaw, 'evidenceReference', `${p}.exposure`) ? { evidenceReference: exposureRaw.evidenceReference as string } : {}) }
  const comp = exact(x.comparability, `${p}.comparability`, ['state', 'reasons', 'baselineMeasurementId', 'followUpMeasurementId']), compState = en(comp.state, ['comparable', 'unknown', 'discontinuous'] as const, `${p}.comparability.state`), reasons = strings(comp.reasons, `${p}.comparability.reasons`)
  const claimCeiling = en(x.claimCeiling, CLAIM_CEILINGS, `${p}.claimCeiling`), readiness = en(x.readiness, ['ready', 'limited', 'blocked'] as const, `${p}.readiness`)
  const allowedClaimCodes = arr(x.allowedClaimCodes, `${p}.allowedClaimCodes`).map((code) => en(code, ALLOWED_CLAIMS, `${p}.allowedClaimCodes[]`))
  const prohibitedOverclaimCodes = arr(x.prohibitedOverclaimCodes, `${p}.prohibitedOverclaimCodes`).map((code) => en(code, PROHIBITED_OVERCLAIMS, `${p}.prohibitedOverclaimCodes[]`))
  unique(allowedClaimCodes, `${p}.allowedClaimCodes`)
  unique(prohibitedOverclaimCodes, `${p}.prohibitedOverclaimCodes`)
  return { id: str(x.id, `${p}.id`), methodology: { id: 'ldw-measurement-interpretation-claim-ceilings', version: '1.0.0', release: '0.22.0' }, designClass: en(x.designClass, DESIGN_CLASSES, `${p}.designClass`), exposure, comparability: { state: compState, reasons, baselineMeasurementId: str(comp.baselineMeasurementId, `${p}.comparability.baselineMeasurementId`), followUpMeasurementId: str(comp.followUpMeasurementId, `${p}.comparability.followUpMeasurementId`) }, readiness, claimCeiling, allowedClaimCodes, prohibitedOverclaimCodes, limitations: strings(x.limitations, `${p}.limitations`) }
}

export function parseMeasurementProjection(input: unknown): MeasurementFeatureProjection {
  const root = exact(input, 'measurement', ['schemaVersion', 'schemaMinorVersion', 'identity', 'cycle', 'measurements', 'outcomes', 'interpretations', 'authorityNotes', 'limitations'])
  if (root.schemaVersion !== MEASUREMENT_SCHEMA_VERSION || root.schemaMinorVersion !== MEASUREMENT_SCHEMA_MINOR_VERSION) fail('Unsupported Measurement projection schema/version.')
  const cycleRaw = exact(root.cycle, 'measurement.cycle', ['dossierId', 'sourceServiceBriefId', 'decision', 'readiness'], ['measurementPlan'])
  const decisionRaw = exact(cycleRaw.decision, 'measurement.cycle.decision', ['id', 'disposition', 'summary', 'recordedAt'])
  const readinessRaw = exact(cycleRaw.readiness, 'measurement.cycle.readiness', ['state', 'reasons'])
  const readiness = { state: en(readinessRaw.state, CYCLE_READINESS, 'measurement.cycle.readiness.state'), reasons: strings(readinessRaw.reasons, 'measurement.cycle.readiness.reasons') }
  let measurementPlan: MeasurementFeatureProjection['cycle']['measurementPlan']
  if (cycleRaw.measurementPlan !== undefined) {
    const p = exact(cycleRaw.measurementPlan, 'measurement.cycle.measurementPlan', ['id', 'annotation', 'target', 'baselineMeasurementId', 'followUpMeasurementId', 'readiness'])
    const a = exact(p.annotation, 'measurement.cycle.measurementPlan.annotation', ['id', 'summary', 'occurredAt', 'recordedAt']), t = exact(p.target, 'measurement.cycle.measurementPlan.target', ['rowIdentity', 'query', 'page', 'metric', 'baselineObservationId'], ['followUpObservationId']), r = exact(p.readiness, 'measurement.cycle.measurementPlan.readiness', ['state', 'reasons'])
    const state = en(r.state, ['ready_for_human_assessment', 'not_ready'] as const, 'measurement.cycle.measurementPlan.readiness.state'), reasons = arr(r.reasons, 'measurement.cycle.measurementPlan.readiness.reasons').map((reason) => en(reason, PLAN_REASONS, 'measurement.cycle.measurementPlan.readiness.reasons[]'))
    if (state === 'ready_for_human_assessment' && reasons.length > 0) fail('Ready measurement plan cannot carry not-ready reasons.'); if (state === 'not_ready' && reasons.length === 0) fail('Not-ready measurement plan requires reasons.')
    measurementPlan = { id: str(p.id, 'measurement.cycle.measurementPlan.id'), annotation: { id: str(a.id, 'measurement.cycle.measurementPlan.annotation.id'), summary: str(a.summary, 'measurement.cycle.measurementPlan.annotation.summary'), occurredAt: str(a.occurredAt, 'measurement.cycle.measurementPlan.annotation.occurredAt'), recordedAt: str(a.recordedAt, 'measurement.cycle.measurementPlan.annotation.recordedAt') }, target: { rowIdentity: str(t.rowIdentity, 'measurement.cycle.measurementPlan.target.rowIdentity'), query: str(t.query, 'measurement.cycle.measurementPlan.target.query'), page: str(t.page, 'measurement.cycle.measurementPlan.target.page'), metric: en(t.metric, ['clicks', 'impressions', 'ctr', 'averagePosition'] as const, 'measurement.cycle.measurementPlan.target.metric'), baselineObservationId: str(t.baselineObservationId, 'measurement.cycle.measurementPlan.target.baselineObservationId'), ...(t.followUpObservationId === undefined ? {} : { followUpObservationId: str(t.followUpObservationId, 'measurement.cycle.measurementPlan.target.followUpObservationId') }) }, baselineMeasurementId: str(p.baselineMeasurementId, 'measurement.cycle.measurementPlan.baselineMeasurementId'), followUpMeasurementId: str(p.followUpMeasurementId, 'measurement.cycle.measurementPlan.followUpMeasurementId'), readiness: { state, reasons } }
  }
  const measurements = arr(root.measurements, 'measurement.measurements').map(parseMeasurement); unique(measurements.map((m) => m.id), 'measurement.measurements')
  const outcomes = arr(root.outcomes, 'measurement.outcomes').map(parseOutcome); unique(outcomes.map((o) => o.id), 'measurement.outcomes')
  const interpretations = arr(root.interpretations, 'measurement.interpretations').map(parseInterpretation); unique(interpretations.map((p) => p.id), 'measurement.interpretations')
  const measurementsById = new Map(measurements.map((m) => [m.id, m] as const))
  for (const m of measurements) {
    if (m.relationship.role !== 'follow_up') continue
    const baseline = measurementsById.get(m.relationship.baselineMeasurementId)
    if (baseline === undefined) fail(`Follow-up measurement ${m.id} references absent baseline ${m.relationship.baselineMeasurementId}.`)
    if (baseline.relationship.role !== 'baseline') fail(`Follow-up measurement ${m.id} must reference a supplied baseline measurement.`)
  }
  if (measurementPlan) {
    const baseline = measurementsById.get(measurementPlan.baselineMeasurementId)
    const followUp = measurementsById.get(measurementPlan.followUpMeasurementId)
    if (baseline === undefined || followUp === undefined) fail('Measurement plan IDs must resolve to supplied measurement records.')
    if (baseline.relationship.role !== 'baseline' || followUp.relationship.role !== 'follow_up') fail('Measurement plan IDs must resolve to baseline/follow-up records by role.')
  }
  for (const outcome of outcomes) for (const id of outcome.measurementIds) if (!measurementsById.has(id)) fail(`Outcome ${outcome.id} references absent measurement ${id}.`)
  for (const profile of interpretations) if (!measurementsById.has(profile.comparability.baselineMeasurementId) || !measurementsById.has(profile.comparability.followUpMeasurementId)) fail(`Interpretation ${profile.id} references absent measurement records.`)
  return { schemaVersion: MEASUREMENT_SCHEMA_VERSION, schemaMinorVersion: MEASUREMENT_SCHEMA_MINOR_VERSION, identity: identity(root.identity), cycle: { dossierId: str(cycleRaw.dossierId, 'measurement.cycle.dossierId'), sourceServiceBriefId: str(cycleRaw.sourceServiceBriefId, 'measurement.cycle.sourceServiceBriefId'), decision: { id: str(decisionRaw.id, 'measurement.cycle.decision.id'), disposition: en(decisionRaw.disposition, ['investigate', 'recommend', 'defer', 'dismiss'] as const, 'measurement.cycle.decision.disposition'), summary: str(decisionRaw.summary, 'measurement.cycle.decision.summary'), recordedAt: str(decisionRaw.recordedAt, 'measurement.cycle.decision.recordedAt') }, readiness, ...(measurementPlan ? { measurementPlan } : {}) }, measurements, outcomes, interpretations, authorityNotes: strings(root.authorityNotes, 'measurement.authorityNotes'), limitations: strings(root.limitations, 'measurement.limitations') }
}

export function decodeMeasurementProjection(input: unknown, shell: WorkbenchProjection): MeasurementFeatureProjection {
  const feature = parseMeasurementProjection(input), w = shell.workspace, scope = w.scope, i = feature.identity
  if (i.workspaceId !== shell.source.workspaceId || i.tenantId !== scope.tenantId || i.siteId !== scope.siteId || i.siteScopeRevisionId !== scope.siteScopeRevisionId || i.trustedTarget !== w.trustedTarget || i.generatedAt !== w.generatedAt || i.evaluatedAt !== w.evaluatedAt) fail('Measurement and Workbench shell identities do not match.')
  return feature
}
