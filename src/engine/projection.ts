export const WORKBENCH_PROJECTION_SCHEMA_VERSION = 'ldw.gas-workbench-projection.v1' as const
export const WORKBENCH_PROJECTION_SCHEMA_MINOR_VERSION = 0 as const
export const SUPPORTED_ENGINE_OPERATOR_WORKSPACE_VERSION = '0.17.0' as const

export const WORKBENCH_READINESS_STATES = [
  'not_supplied',
  'ready',
  'limited',
  'not_ready',
  'unavailable',
] as const

export const WORKBENCH_DECISION_READINESS_STATES = [
  'deferred_or_dismissed',
  'recommendation_not_created',
  'recommendation_proposed',
  'recommendation_in_review',
  'recommendation_accepted',
  'recommendation_rejected',
  'recommendation_superseded',
  'measurement_not_planned',
  'measurements_not_recorded',
  'follow_up_not_due',
  'follow_up_not_measured',
  'follow_up_not_comparable',
  'follow_up_not_ready',
  'ready_for_human_assessment',
  'outcome_recorded',
] as const

export type WorkbenchReadinessState = (typeof WORKBENCH_READINESS_STATES)[number]
export type WorkbenchDecisionReadinessState =
  (typeof WORKBENCH_DECISION_READINESS_STATES)[number]

export interface WorkbenchScope {
  readonly tenantId: string
  readonly siteId: string
  readonly siteScopeRevisionId: string
}

export interface WorkbenchReadinessEntry {
  readonly moduleId: string
  readonly state: WorkbenchReadinessState
  readonly reasons: readonly string[]
}

export interface WorkbenchSourceManifestEntry {
  readonly moduleId: string
  readonly release: string
  readonly identity: string
  readonly providerIds: readonly string[]
  readonly sourcePeriods: readonly Readonly<{ start: string; end: string }>[]
  readonly readiness: WorkbenchReadinessState
  readonly reasons: readonly string[]
}

export interface WorkbenchEvidenceRow {
  readonly id: string
  readonly moduleId: string
  readonly kind: string
  readonly state: string
  readonly evidenceIdentity: string
  readonly providerIds: readonly string[]
  readonly url?: string
  readonly query?: string
  readonly promptId?: string
  readonly cohortHash?: string
  readonly readinessContext: readonly string[]
}

export interface WorkbenchAttentionItem {
  readonly id: string
  readonly navigationOrder: number
  readonly moduleId: string
  readonly originalKind: string
  readonly originalState: string
  readonly evidenceIdentity: string
  readonly identity: Readonly<{
    url?: string
    query?: string
    promptId?: string
    cohortHash?: string
  }>
  readonly readinessContext: readonly string[]
}

export interface WorkbenchTimelineEntry {
  readonly kind: 'service_brief' | 'recommendation' | 'measurement' | 'outcome'
  readonly at: string
  readonly label: string
  readonly state: string
  readonly referenceId?: string
}

export interface WorkbenchDecisionCycleProjection {
  readonly readiness: Readonly<{
    state: WorkbenchDecisionReadinessState
    reasons: readonly string[]
  }>
  readonly decision: Readonly<{
    id: string
    disposition: 'investigate' | 'recommend' | 'defer' | 'dismiss'
    summary: string
    recordedAt: string
    selectedAttentionIds: readonly string[]
    references: readonly Readonly<{
      kind: 'url' | 'query' | 'prompt_id' | 'cohort_hash'
      value: string
    }>[]
  }>
  readonly recommendation?: Readonly<{
    id: string
    lifecycle: 'proposed' | 'in_review' | 'accepted' | 'rejected' | 'superseded'
    revision: number
    priority: string
    authorityClass: string
    updatedAt: string
  }>
}

export interface WorkbenchNavigation {
  readonly overview: Readonly<{
    attentionCount: number
    exactUrlCount: number
    readinessCount: number
    limitationCount: number
    evidenceStateCounts: readonly Readonly<{ state: string; count: number }>[]
  }>
  readonly evidence: Readonly<{ rowCount: number; sourceCount: number }>
  readonly attention: Readonly<{
    rowCount: number
    semantics: 'human_review_selection_not_priority'
  }>
  readonly decisionCycle: Readonly<{
    supplied: boolean
    readiness?: string
    recordedMeasurementCount: number
    humanOutcomeCount: number
  }>
  readonly history: Readonly<{ timelineCount: number }>
  readonly reports: Readonly<{ maximumPrimaryItems: 3 }>
}

export interface WorkbenchProjection {
  readonly schemaVersion: typeof WORKBENCH_PROJECTION_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof WORKBENCH_PROJECTION_SCHEMA_MINOR_VERSION
  readonly source: Readonly<{
    product: 'gas-engine'
    artifact: 'operator-workspace'
    artifactVersion: typeof SUPPORTED_ENGINE_OPERATOR_WORKSPACE_VERSION
    workspaceId: string
  }>
  readonly workspace: Readonly<{
    scope: WorkbenchScope
    trustedTarget: string
    generatedAt: string
    evaluatedAt: string
    readiness: readonly WorkbenchReadinessEntry[]
    sourceManifest: readonly WorkbenchSourceManifestEntry[]
    evidenceRows: readonly WorkbenchEvidenceRow[]
    attention: readonly WorkbenchAttentionItem[]
    decisionCycle?: WorkbenchDecisionCycleProjection
    timeline: readonly WorkbenchTimelineEntry[]
    navigation: WorkbenchNavigation
    authorityNotes: readonly string[]
    limitations: readonly string[]
  }>
}

export type WorkbenchProjectionErrorCode =
  | 'invalid_projection'
  | 'unsupported_projection_version'
  | 'unsupported_engine_workspace_version'

export class WorkbenchProjectionError extends Error {
  override name = 'WorkbenchProjectionError'

  constructor(
    readonly code: WorkbenchProjectionErrorCode,
    message: string,
  ) {
    super(message)
  }
}

type JsonRecord = Record<string, unknown>

function fail(code: WorkbenchProjectionErrorCode, message: string): never {
  throw new WorkbenchProjectionError(code, message)
}

function asRecord(value: unknown, path: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail('invalid_projection', `${path} must be an object.`)
  }
  return value as JsonRecord
}

function exactObject(
  value: unknown,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): JsonRecord {
  const parsed = asRecord(value, path)
  const allowed = new Set([...required, ...optional])
  for (const key of required) {
    if (!(key in parsed)) fail('invalid_projection', `${path}.${key} is required.`)
  }
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) fail('invalid_projection', `${path}.${key} is not supported.`)
  }
  return parsed
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail('invalid_projection', `${path} must be a non-empty string.`)
  }
  return value
}

function asInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail('invalid_projection', `${path} must be a non-negative integer.`)
  }
  return value
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail('invalid_projection', `${path} must be a boolean.`)
  return value
}

function asLiteral<T extends string | number>(value: unknown, expected: T, path: string): T {
  if (value !== expected) {
    fail('invalid_projection', `${path} must equal ${JSON.stringify(expected)}.`)
  }
  return expected
}

function asEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  const parsed = asString(value, path)
  if (!(allowed as readonly string[]).includes(parsed)) {
    fail('invalid_projection', `${path} has unsupported value ${JSON.stringify(parsed)}.`)
  }
  return parsed as T[number]
}

function asArray<T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
): T[] {
  if (!Array.isArray(value)) fail('invalid_projection', `${path} must be an array.`)
  return value.map((item, index) => parser(item, `${path}[${index}]`))
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path, asString)
}

function optionalString(object: JsonRecord, key: string, path: string): string | undefined {
  return object[key] === undefined ? undefined : asString(object[key], `${path}.${key}`)
}

function parseScope(value: unknown, path: string): WorkbenchScope {
  const parsed = exactObject(value, path, ['tenantId', 'siteId', 'siteScopeRevisionId'])
  return {
    tenantId: asString(parsed.tenantId, `${path}.tenantId`),
    siteId: asString(parsed.siteId, `${path}.siteId`),
    siteScopeRevisionId: asString(parsed.siteScopeRevisionId, `${path}.siteScopeRevisionId`),
  }
}

function parseReadiness(value: unknown, path: string): WorkbenchReadinessEntry {
  const parsed = exactObject(value, path, ['moduleId', 'state', 'reasons'])
  return {
    moduleId: asString(parsed.moduleId, `${path}.moduleId`),
    state: asEnum(parsed.state, WORKBENCH_READINESS_STATES, `${path}.state`),
    reasons: asStringArray(parsed.reasons, `${path}.reasons`),
  }
}

function parseSourceManifest(value: unknown, path: string): WorkbenchSourceManifestEntry {
  const parsed = exactObject(value, path, [
    'moduleId',
    'release',
    'identity',
    'providerIds',
    'sourcePeriods',
    'readiness',
    'reasons',
  ])
  return {
    moduleId: asString(parsed.moduleId, `${path}.moduleId`),
    release: asString(parsed.release, `${path}.release`),
    identity: asString(parsed.identity, `${path}.identity`),
    providerIds: asStringArray(parsed.providerIds, `${path}.providerIds`),
    sourcePeriods: asArray(parsed.sourcePeriods, `${path}.sourcePeriods`, (period, periodPath) => {
      const sourcePeriod = exactObject(period, periodPath, ['start', 'end'])
      return {
        start: asString(sourcePeriod.start, `${periodPath}.start`),
        end: asString(sourcePeriod.end, `${periodPath}.end`),
      }
    }),
    readiness: asEnum(parsed.readiness, WORKBENCH_READINESS_STATES, `${path}.readiness`),
    reasons: asStringArray(parsed.reasons, `${path}.reasons`),
  }
}

function parseEvidenceRow(value: unknown, path: string): WorkbenchEvidenceRow {
  const parsed = exactObject(
    value,
    path,
    ['id', 'moduleId', 'kind', 'state', 'evidenceIdentity', 'providerIds', 'readinessContext'],
    ['url', 'query', 'promptId', 'cohortHash'],
  )
  const url = optionalString(parsed, 'url', path)
  const query = optionalString(parsed, 'query', path)
  const promptId = optionalString(parsed, 'promptId', path)
  const cohortHash = optionalString(parsed, 'cohortHash', path)
  return {
    id: asString(parsed.id, `${path}.id`),
    moduleId: asString(parsed.moduleId, `${path}.moduleId`),
    kind: asString(parsed.kind, `${path}.kind`),
    state: asString(parsed.state, `${path}.state`),
    evidenceIdentity: asString(parsed.evidenceIdentity, `${path}.evidenceIdentity`),
    providerIds: asStringArray(parsed.providerIds, `${path}.providerIds`),
    ...(url === undefined ? {} : { url }),
    ...(query === undefined ? {} : { query }),
    ...(promptId === undefined ? {} : { promptId }),
    ...(cohortHash === undefined ? {} : { cohortHash }),
    readinessContext: asStringArray(parsed.readinessContext, `${path}.readinessContext`),
  }
}

function parseAttention(value: unknown, path: string): WorkbenchAttentionItem {
  const parsed = exactObject(value, path, [
    'id',
    'navigationOrder',
    'moduleId',
    'originalKind',
    'originalState',
    'evidenceIdentity',
    'identity',
    'readinessContext',
  ])
  const identity = exactObject(parsed.identity, `${path}.identity`, [], [
    'url',
    'query',
    'promptId',
    'cohortHash',
  ])
  const url = optionalString(identity, 'url', `${path}.identity`)
  const query = optionalString(identity, 'query', `${path}.identity`)
  const promptId = optionalString(identity, 'promptId', `${path}.identity`)
  const cohortHash = optionalString(identity, 'cohortHash', `${path}.identity`)
  return {
    id: asString(parsed.id, `${path}.id`),
    navigationOrder: asInteger(parsed.navigationOrder, `${path}.navigationOrder`),
    moduleId: asString(parsed.moduleId, `${path}.moduleId`),
    originalKind: asString(parsed.originalKind, `${path}.originalKind`),
    originalState: asString(parsed.originalState, `${path}.originalState`),
    evidenceIdentity: asString(parsed.evidenceIdentity, `${path}.evidenceIdentity`),
    identity: {
      ...(url === undefined ? {} : { url }),
      ...(query === undefined ? {} : { query }),
      ...(promptId === undefined ? {} : { promptId }),
      ...(cohortHash === undefined ? {} : { cohortHash }),
    },
    readinessContext: asStringArray(parsed.readinessContext, `${path}.readinessContext`),
  }
}

function parseTimeline(value: unknown, path: string): WorkbenchTimelineEntry {
  const parsed = exactObject(value, path, ['kind', 'at', 'label', 'state'], ['referenceId'])
  const referenceId = optionalString(parsed, 'referenceId', path)
  return {
    kind: asEnum(
      parsed.kind,
      ['service_brief', 'recommendation', 'measurement', 'outcome'] as const,
      `${path}.kind`,
    ),
    at: asString(parsed.at, `${path}.at`),
    label: asString(parsed.label, `${path}.label`),
    state: asString(parsed.state, `${path}.state`),
    ...(referenceId === undefined ? {} : { referenceId }),
  }
}

function parseDecisionCycle(value: unknown, path: string): WorkbenchDecisionCycleProjection {
  const parsed = exactObject(value, path, ['readiness', 'decision'], ['recommendation'])
  const readiness = exactObject(parsed.readiness, `${path}.readiness`, ['state', 'reasons'])
  const decision = exactObject(parsed.decision, `${path}.decision`, [
    'id',
    'disposition',
    'summary',
    'recordedAt',
    'selectedAttentionIds',
    'references',
  ])
  const result: WorkbenchDecisionCycleProjection = {
    readiness: {
      state: asEnum(
        readiness.state,
        WORKBENCH_DECISION_READINESS_STATES,
        `${path}.readiness.state`,
      ),
      reasons: asStringArray(readiness.reasons, `${path}.readiness.reasons`),
    },
    decision: {
      id: asString(decision.id, `${path}.decision.id`),
      disposition: asEnum(
        decision.disposition,
        ['investigate', 'recommend', 'defer', 'dismiss'] as const,
        `${path}.decision.disposition`,
      ),
      summary: asString(decision.summary, `${path}.decision.summary`),
      recordedAt: asString(decision.recordedAt, `${path}.decision.recordedAt`),
      selectedAttentionIds: asStringArray(
        decision.selectedAttentionIds,
        `${path}.decision.selectedAttentionIds`,
      ),
      references: asArray(decision.references, `${path}.decision.references`, (reference, refPath) => {
        const ref = exactObject(reference, refPath, ['kind', 'value'])
        return {
          kind: asEnum(
            ref.kind,
            ['url', 'query', 'prompt_id', 'cohort_hash'] as const,
            `${refPath}.kind`,
          ),
          value: asString(ref.value, `${refPath}.value`),
        }
      }),
    },
  }
  if (parsed.recommendation === undefined) return result

  const recommendation = exactObject(parsed.recommendation, `${path}.recommendation`, [
    'id',
    'lifecycle',
    'revision',
    'priority',
    'authorityClass',
    'updatedAt',
  ])
  return {
    ...result,
    recommendation: {
      id: asString(recommendation.id, `${path}.recommendation.id`),
      lifecycle: asEnum(
        recommendation.lifecycle,
        ['proposed', 'in_review', 'accepted', 'rejected', 'superseded'] as const,
        `${path}.recommendation.lifecycle`,
      ),
      revision: asInteger(recommendation.revision, `${path}.recommendation.revision`),
      priority: asString(recommendation.priority, `${path}.recommendation.priority`),
      authorityClass: asString(
        recommendation.authorityClass,
        `${path}.recommendation.authorityClass`,
      ),
      updatedAt: asString(recommendation.updatedAt, `${path}.recommendation.updatedAt`),
    },
  }
}

function parseNavigation(value: unknown, path: string): WorkbenchNavigation {
  const parsed = exactObject(value, path, [
    'overview',
    'evidence',
    'attention',
    'decisionCycle',
    'history',
    'reports',
  ])
  const overview = exactObject(parsed.overview, `${path}.overview`, [
    'attentionCount',
    'exactUrlCount',
    'readinessCount',
    'limitationCount',
    'evidenceStateCounts',
  ])
  const evidence = exactObject(parsed.evidence, `${path}.evidence`, ['rowCount', 'sourceCount'])
  const attention = exactObject(parsed.attention, `${path}.attention`, ['rowCount', 'semantics'])
  const decision = exactObject(
    parsed.decisionCycle,
    `${path}.decisionCycle`,
    ['supplied', 'recordedMeasurementCount', 'humanOutcomeCount'],
    ['readiness'],
  )
  const history = exactObject(parsed.history, `${path}.history`, ['timelineCount'])
  const reports = exactObject(parsed.reports, `${path}.reports`, ['maximumPrimaryItems'])
  const readiness = optionalString(decision, 'readiness', `${path}.decisionCycle`)

  return {
    overview: {
      attentionCount: asInteger(overview.attentionCount, `${path}.overview.attentionCount`),
      exactUrlCount: asInteger(overview.exactUrlCount, `${path}.overview.exactUrlCount`),
      readinessCount: asInteger(overview.readinessCount, `${path}.overview.readinessCount`),
      limitationCount: asInteger(overview.limitationCount, `${path}.overview.limitationCount`),
      evidenceStateCounts: asArray(
        overview.evidenceStateCounts,
        `${path}.overview.evidenceStateCounts`,
        (item, itemPath) => {
          const count = exactObject(item, itemPath, ['state', 'count'])
          return {
            state: asString(count.state, `${itemPath}.state`),
            count: asInteger(count.count, `${itemPath}.count`),
          }
        },
      ),
    },
    evidence: {
      rowCount: asInteger(evidence.rowCount, `${path}.evidence.rowCount`),
      sourceCount: asInteger(evidence.sourceCount, `${path}.evidence.sourceCount`),
    },
    attention: {
      rowCount: asInteger(attention.rowCount, `${path}.attention.rowCount`),
      semantics: asLiteral(
        attention.semantics,
        'human_review_selection_not_priority',
        `${path}.attention.semantics`,
      ),
    },
    decisionCycle: {
      supplied: asBoolean(decision.supplied, `${path}.decisionCycle.supplied`),
      ...(readiness === undefined ? {} : { readiness }),
      recordedMeasurementCount: asInteger(
        decision.recordedMeasurementCount,
        `${path}.decisionCycle.recordedMeasurementCount`,
      ),
      humanOutcomeCount: asInteger(
        decision.humanOutcomeCount,
        `${path}.decisionCycle.humanOutcomeCount`,
      ),
    },
    history: {
      timelineCount: asInteger(history.timelineCount, `${path}.history.timelineCount`),
    },
    reports: {
      maximumPrimaryItems: asLiteral(
        reports.maximumPrimaryItems,
        3,
        `${path}.reports.maximumPrimaryItems`,
      ),
    },
  }
}

export function parseWorkbenchProjection(input: unknown): WorkbenchProjection {
  const root = exactObject(input, 'projection', [
    'schemaVersion',
    'schemaMinorVersion',
    'source',
    'workspace',
  ])
  const schemaVersion = asString(root.schemaVersion, 'projection.schemaVersion')
  if (
    schemaVersion !== WORKBENCH_PROJECTION_SCHEMA_VERSION
    || root.schemaMinorVersion !== WORKBENCH_PROJECTION_SCHEMA_MINOR_VERSION
  ) {
    fail(
      'unsupported_projection_version',
      `Unsupported Workbench projection version ${JSON.stringify(schemaVersion)} minor ${JSON.stringify(root.schemaMinorVersion)}.`,
    )
  }

  const source = exactObject(root.source, 'projection.source', [
    'product',
    'artifact',
    'artifactVersion',
    'workspaceId',
  ])
  const artifactVersion = asString(source.artifactVersion, 'projection.source.artifactVersion')
  if (artifactVersion !== SUPPORTED_ENGINE_OPERATOR_WORKSPACE_VERSION) {
    fail(
      'unsupported_engine_workspace_version',
      `Unsupported gas-engine operator workspace version ${JSON.stringify(artifactVersion)}.`,
    )
  }

  const workspace = exactObject(
    root.workspace,
    'projection.workspace',
    [
      'scope',
      'trustedTarget',
      'generatedAt',
      'evaluatedAt',
      'readiness',
      'sourceManifest',
      'evidenceRows',
      'attention',
      'timeline',
      'navigation',
      'authorityNotes',
      'limitations',
    ],
    ['decisionCycle'],
  )

  const decisionCycle = workspace.decisionCycle === undefined
    ? undefined
    : parseDecisionCycle(workspace.decisionCycle, 'projection.workspace.decisionCycle')

  return {
    schemaVersion: WORKBENCH_PROJECTION_SCHEMA_VERSION,
    schemaMinorVersion: WORKBENCH_PROJECTION_SCHEMA_MINOR_VERSION,
    source: {
      product: asLiteral(source.product, 'gas-engine', 'projection.source.product'),
      artifact: asLiteral(
        source.artifact,
        'operator-workspace',
        'projection.source.artifact',
      ),
      artifactVersion: SUPPORTED_ENGINE_OPERATOR_WORKSPACE_VERSION,
      workspaceId: asString(source.workspaceId, 'projection.source.workspaceId'),
    },
    workspace: {
      scope: parseScope(workspace.scope, 'projection.workspace.scope'),
      trustedTarget: asString(workspace.trustedTarget, 'projection.workspace.trustedTarget'),
      generatedAt: asString(workspace.generatedAt, 'projection.workspace.generatedAt'),
      evaluatedAt: asString(workspace.evaluatedAt, 'projection.workspace.evaluatedAt'),
      readiness: asArray(workspace.readiness, 'projection.workspace.readiness', parseReadiness),
      sourceManifest: asArray(
        workspace.sourceManifest,
        'projection.workspace.sourceManifest',
        parseSourceManifest,
      ),
      evidenceRows: asArray(
        workspace.evidenceRows,
        'projection.workspace.evidenceRows',
        parseEvidenceRow,
      ),
      attention: asArray(workspace.attention, 'projection.workspace.attention', parseAttention),
      ...(decisionCycle === undefined ? {} : { decisionCycle }),
      timeline: asArray(workspace.timeline, 'projection.workspace.timeline', parseTimeline),
      navigation: parseNavigation(workspace.navigation, 'projection.workspace.navigation'),
      authorityNotes: asStringArray(
        workspace.authorityNotes,
        'projection.workspace.authorityNotes',
      ),
      limitations: asStringArray(workspace.limitations, 'projection.workspace.limitations'),
    },
  }
}
