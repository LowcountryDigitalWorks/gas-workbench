import type { WorkbenchProjection } from './projection'

export const VISIBILITY_SCHEMA_VERSION = 'ldw.gas-workbench-visibility.v1' as const
export const VISIBILITY_SCHEMA_MINOR_VERSION = 0 as const

export type VisibilityAvailability = 'ready' | 'limited' | 'unavailable' | 'not_supplied'
export type VisibilityComparison = 'comparable' | 'incompatible' | 'not_supplied'
export type VisibilityModality = 'legacy_subtype_not_established' | 'text_based' | 'multimodal'
export type VisibilitySourceUniverse = 'legacy_generic_web' | 'search_performance_minor1'

export interface VisibilityMetric {
  readonly name: string
  readonly unit: string
  readonly baseline?: number
  readonly current?: number
}
export interface VisibilityConcentration {
  readonly numerator: number
  readonly denominator: number
  readonly share: number
  readonly policy: string
}

export interface VisibilityFeatureProjection {
  readonly schemaVersion: typeof VISIBILITY_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof VISIBILITY_SCHEMA_MINOR_VERSION
  readonly identity: Readonly<{
    workspaceId: string
    tenantId: string
    siteId: string
    siteScopeRevisionId: string
    trustedTarget: string
    generatedAt: string
    evaluatedAt: string
  }>
  readonly sources: readonly Readonly<{
    id: string
    family: 'organic_search' | 'ai_visibility'
    provider: string
    identity: string
    release: string
    readiness: VisibilityAvailability
    reasons: readonly string[]
    period?: string
    freshness?: string
    coverage?: string
    sourceUniverse?: VisibilitySourceUniverse
    baselineSourceUniverse?: VisibilitySourceUniverse
    modality?: VisibilityModality
    baselineModality?: VisibilityModality
    metrics: readonly VisibilityMetric[]
    comparison: VisibilityComparison
    comparisonReasons: readonly string[]
    descriptiveChange?: string
    concentration?: VisibilityConcentration
    limitations: readonly string[]
    evidenceIdentity?: string
    attentionId?: string
  }>[]
  readonly claimCeiling?: string
  readonly claimContext?: Readonly<{
    allowedClaimCodes: readonly string[]
    prohibitedOverclaimCodes: readonly string[]
    limitations: readonly string[]
  }>
  readonly limitations: readonly string[]
}

type Obj = Record<string, unknown>
export class VisibilityProjectionError extends Error {
  override name = 'VisibilityProjectionError'
}
function fail(message: string): never { throw new VisibilityProjectionError(message) }
function obj(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be an object.`)
  return value as Obj
}
function exact(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Obj {
  const x = obj(value, path), allowed = new Set([...required, ...optional])
  for (const k of required) if (!Object.hasOwn(x, k)) fail(`${path}.${k} is required.`)
  for (const k of Object.keys(x)) if (!allowed.has(k)) fail(`${path}.${k} is not supported.`)
  return x
}
function str(x: unknown, path: string): string {
  if (typeof x !== 'string' || x.length === 0) fail(`${path} must be a non-empty string.`)
  return x
}
function strs(x: unknown, path: string): string[] {
  if (!Array.isArray(x)) fail(`${path} must be an array.`)
  return x.map((v, i) => str(v, `${path}[${i}]`))
}
function oneOf<const T extends readonly string[]>(x: unknown, vals: T, path: string): T[number] {
  const value = str(x, path)
  if (!(vals as readonly string[]).includes(value)) fail(`${path} has unsupported value ${JSON.stringify(value)}.`)
  return value as T[number]
}
function optionalString(x: Obj, key: string, path: string): string | undefined {
  return x[key] === undefined ? undefined : str(x[key], `${path}.${key}`)
}

export function parseVisibilityProjection(input: unknown): VisibilityFeatureProjection {
  const root = exact(input, 'visibility', ['schemaVersion', 'schemaMinorVersion', 'identity', 'sources', 'limitations'], ['claimCeiling', 'claimContext'])
  if (root.schemaVersion !== VISIBILITY_SCHEMA_VERSION || root.schemaMinorVersion !== VISIBILITY_SCHEMA_MINOR_VERSION)
    fail('Unsupported Visibility projection schema/version.')
  const i = exact(root.identity, 'visibility.identity', ['workspaceId', 'tenantId', 'siteId', 'siteScopeRevisionId', 'trustedTarget', 'generatedAt', 'evaluatedAt'])
  if (!Array.isArray(root.sources)) fail('visibility.sources must be an array.')
  const sources = root.sources.map((raw, n) => {
    const p = `visibility.sources[${n}]`
    const x = exact(raw, p, ['id', 'family', 'provider', 'identity', 'release', 'readiness', 'reasons', 'metrics', 'comparison', 'comparisonReasons', 'limitations'], ['period', 'freshness', 'coverage', 'sourceUniverse', 'baselineSourceUniverse', 'modality', 'baselineModality', 'descriptiveChange', 'concentration', 'evidenceIdentity', 'attentionId'])
    if (!Array.isArray(x.metrics)) fail(`${p}.metrics must be an array.`)
    const metrics = x.metrics.map((rawMetric, index) => {
      const q = `${p}.metrics[${index}]`, m = exact(rawMetric, q, ['name', 'unit'], ['baseline', 'current'])
      for (const key of ['baseline', 'current']) if (m[key] !== undefined && (typeof m[key] !== 'number' || !Number.isFinite(m[key]))) fail(`${q}.${key} must be a finite supplied number.`)
      return { name: str(m.name, `${q}.name`), unit: str(m.unit, `${q}.unit`), ...(m.baseline === undefined ? {} : { baseline: m.baseline as number }), ...(m.current === undefined ? {} : { current: m.current as number }) }
    })
    let concentration: VisibilityConcentration | undefined
    if (x.concentration !== undefined) {
      const c = exact(x.concentration, `${p}.concentration`, ['numerator', 'denominator', 'share', 'policy'])
      for (const key of ['numerator', 'denominator', 'share']) if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || (c[key] as number) < 0) fail(`${p}.concentration.${key} must be a non-negative finite number.`)
      concentration = { numerator: c.numerator as number, denominator: c.denominator as number, share: c.share as number, policy: str(c.policy, `${p}.concentration.policy`) }
    }
    return {
      id: str(x.id, `${p}.id`), family: oneOf(x.family, ['organic_search', 'ai_visibility'] as const, `${p}.family`),
      provider: str(x.provider, `${p}.provider`), identity: str(x.identity, `${p}.identity`), release: str(x.release, `${p}.release`),
      readiness: oneOf(x.readiness, ['ready', 'limited', 'unavailable', 'not_supplied'] as const, `${p}.readiness`), reasons: strs(x.reasons, `${p}.reasons`),
      ...(optionalString(x, 'period', p) === undefined ? {} : { period: x.period as string }),
      ...(optionalString(x, 'freshness', p) === undefined ? {} : { freshness: x.freshness as string }),
      ...(optionalString(x, 'coverage', p) === undefined ? {} : { coverage: x.coverage as string }),
      ...(x.sourceUniverse === undefined ? {} : { sourceUniverse: oneOf(x.sourceUniverse, ['legacy_generic_web', 'search_performance_minor1'] as const, `${p}.sourceUniverse`) }),
      ...(x.baselineSourceUniverse === undefined ? {} : { baselineSourceUniverse: oneOf(x.baselineSourceUniverse, ['legacy_generic_web', 'search_performance_minor1'] as const, `${p}.baselineSourceUniverse`) }),
      ...(x.modality === undefined ? {} : { modality: oneOf(x.modality, ['legacy_subtype_not_established', 'text_based', 'multimodal'] as const, `${p}.modality`) }),
      ...(x.baselineModality === undefined ? {} : { baselineModality: oneOf(x.baselineModality, ['legacy_subtype_not_established', 'text_based', 'multimodal'] as const, `${p}.baselineModality`) }),
      metrics, comparison: oneOf(x.comparison, ['comparable', 'incompatible', 'not_supplied'] as const, `${p}.comparison`),
      comparisonReasons: strs(x.comparisonReasons, `${p}.comparisonReasons`),
      ...(optionalString(x, 'descriptiveChange', p) === undefined ? {} : { descriptiveChange: x.descriptiveChange as string }),
      ...(concentration === undefined ? {} : { concentration }),
      limitations: strs(x.limitations, `${p}.limitations`),
      ...(optionalString(x, 'evidenceIdentity', p) === undefined ? {} : { evidenceIdentity: x.evidenceIdentity as string }),
      ...(optionalString(x, 'attentionId', p) === undefined ? {} : { attentionId: x.attentionId as string }),
    }
  })
  const ids = new Set<string>()
  for (const source of sources) {
    if (ids.has(source.id)) fail(`Duplicate Visibility source id ${source.id}.`)
    ids.add(source.id)
    if (source.family === 'organic_search') {
      if (source.sourceUniverse === undefined || source.modality === undefined) fail(`Organic Search source ${source.id} must preserve its source universe and Web modality identity.`)
      if (source.sourceUniverse === 'legacy_generic_web' && source.modality !== 'legacy_subtype_not_established') fail(`Legacy Web source ${source.id} cannot be relabeled with a minor1 modality.`)
      if (source.sourceUniverse === 'search_performance_minor1' && source.modality === 'legacy_subtype_not_established') fail(`Minor1 Search Performance source ${source.id} must preserve its text-based or multimodal identity.`)
      if ((source.baselineSourceUniverse === undefined) !== (source.baselineModality === undefined)) fail(`Baseline source universe and modality for ${source.id} must be supplied together.`)
      if (source.baselineSourceUniverse !== undefined && source.baselineModality !== undefined) {
        if (source.baselineSourceUniverse === 'legacy_generic_web' && source.baselineModality !== 'legacy_subtype_not_established') fail(`Legacy baseline Web source ${source.id} cannot be relabeled with a minor1 modality.`)
        if (source.baselineSourceUniverse === 'search_performance_minor1' && source.baselineModality === 'legacy_subtype_not_established') fail(`Minor1 baseline Search Performance source ${source.id} must preserve its text-based or multimodal identity.`)
      }
      if (source.comparison === 'comparable' && (source.baselineSourceUniverse === undefined || source.baselineModality === undefined)) fail(`Comparable Organic Search source ${source.id} must preserve both baseline and current source universes.`)
    } else if (source.sourceUniverse !== undefined || source.baselineSourceUniverse !== undefined || source.modality !== undefined || source.baselineModality !== undefined) {
      fail(`AI Visibility source ${source.id} cannot carry Search/Web source-universe or modality fields.`)
    }
    if (source.comparison === 'comparable' && source.readiness !== 'ready') fail(`Comparable source ${source.id} must be marked ready by the supplied producer.`)
    if (source.comparison === 'incompatible' && source.comparisonReasons.length === 0) fail(`Incompatible source ${source.id} must preserve a supplied reason.`)
    if (source.comparison === 'comparable' && (source.baselineSourceUniverse !== source.sourceUniverse || source.baselineModality !== source.modality)) fail(`Source-universe or modality discontinuity for ${source.id} cannot be marked comparable.`)
    if (source.comparison !== 'comparable' && source.descriptiveChange !== undefined) fail(`Non-comparable source ${source.id} cannot supply descriptive change.`)
    if (source.attentionId !== undefined && source.evidenceIdentity === undefined) fail(`Attention link ${source.attentionId} requires an exact evidence identity.`)
  }
  let claimContext: VisibilityFeatureProjection['claimContext']
  if (root.claimContext !== undefined) {
    const c = exact(root.claimContext, 'visibility.claimContext', ['allowedClaimCodes', 'prohibitedOverclaimCodes', 'limitations'])
    claimContext = { allowedClaimCodes: strs(c.allowedClaimCodes, 'visibility.claimContext.allowedClaimCodes'), prohibitedOverclaimCodes: strs(c.prohibitedOverclaimCodes, 'visibility.claimContext.prohibitedOverclaimCodes'), limitations: strs(c.limitations, 'visibility.claimContext.limitations') }
  }
  return {
    schemaVersion: VISIBILITY_SCHEMA_VERSION, schemaMinorVersion: VISIBILITY_SCHEMA_MINOR_VERSION,
    identity: {
      workspaceId: str(i.workspaceId, 'visibility.identity.workspaceId'), tenantId: str(i.tenantId, 'visibility.identity.tenantId'),
      siteId: str(i.siteId, 'visibility.identity.siteId'), siteScopeRevisionId: str(i.siteScopeRevisionId, 'visibility.identity.siteScopeRevisionId'),
      trustedTarget: str(i.trustedTarget, 'visibility.identity.trustedTarget'), generatedAt: str(i.generatedAt, 'visibility.identity.generatedAt'), evaluatedAt: str(i.evaluatedAt, 'visibility.identity.evaluatedAt'),
    },
    sources, ...(optionalString(root, 'claimCeiling', 'visibility') === undefined ? {} : { claimCeiling: root.claimCeiling as string }), ...(claimContext === undefined ? {} : { claimContext }),
    limitations: strs(root.limitations, 'visibility.limitations'),
  }
}

export function decodeVisibilityProjection(input: unknown, shell: WorkbenchProjection): VisibilityFeatureProjection {
  const feature = parseVisibilityProjection(input), scope = shell.workspace.scope
  const same = feature.identity.workspaceId === shell.source.workspaceId && feature.identity.tenantId === scope.tenantId && feature.identity.siteId === scope.siteId && feature.identity.siteScopeRevisionId === scope.siteScopeRevisionId && feature.identity.trustedTarget === shell.workspace.trustedTarget && feature.identity.generatedAt === shell.workspace.generatedAt && feature.identity.evaluatedAt === shell.workspace.evaluatedAt
  if (!same) fail('Visibility and Workbench shell identities do not match.')
  for (const source of feature.sources) {
    const evidence = source.evidenceIdentity === undefined ? undefined : shell.workspace.evidenceRows.find((item) => item.evidenceIdentity === source.evidenceIdentity)
    if (source.evidenceIdentity !== undefined && (!evidence || evidence.moduleId !== (source.family === 'organic_search' ? 'search_analytics' : 'ai_visibility')))
      fail(`Visibility source ${source.id} claims an evidence link absent from the matched shell.`)
    if (source.attentionId === undefined) continue
    const attention = shell.workspace.attention.find((item) => item.id === source.attentionId)
    if (!attention || !evidence || attention.evidenceIdentity !== source.evidenceIdentity || evidence.moduleId !== (source.family === 'organic_search' ? 'search_analytics' : 'ai_visibility'))
      fail(`Visibility source ${source.id} claims an Attention/evidence link absent from the matched shell.`)
  }
  return feature
}
