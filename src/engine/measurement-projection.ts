import type { WorkbenchProjection } from './projection'

export const MEASUREMENT_SCHEMA_VERSION = 'ldw.gas-workbench-measurement.v1' as const
export const MEASUREMENT_SCHEMA_MINOR_VERSION = 0 as const

const CYCLE_READINESS = ['deferred_or_dismissed','recommendation_not_created','recommendation_proposed','recommendation_in_review','recommendation_accepted','recommendation_rejected','recommendation_superseded','measurement_not_planned','measurements_not_recorded','follow_up_not_due','follow_up_not_measured','follow_up_not_comparable','follow_up_not_ready','ready_for_human_assessment','outcome_recorded'] as const
const PLAN_REASONS = ['follow_up_not_due','follow_up_not_measured','target_missing','source_not_final','coverage_incomplete','coverage_anonymized','coverage_truncated','incomparable','invalid_chronology'] as const
const METRICS = ['clicks','impressions','ctr','averagePosition'] as const
const RESULT_STATES = ['not_due','not_measured','measured'] as const
const COMPARABILITY = ['comparable','unknown','discontinuous'] as const
const OBSERVATION_VALUE_STATES = ['observed','unknown','unavailable','not_collected','not_applicable'] as const
const OUTCOME_DIRECTIONS = ['improved','regressed','unchanged','inconclusive','not_due','not_measured'] as const
const ATTRIBUTION_STRENGTHS = ['none','technical_verification','association','controlled_evidence'] as const
const DESIGN_CLASSES = ['annotated_pre_post','normalized_pre_post','group_pre_post','matched_control_test','randomized_or_balanced_split_test','ai_referral_pre_post','ai_prompt_cohort_observation','provider_native_experiment','other_explicit'] as const
const EXPOSURE_STATES = ['not_applicable','unknown','not_yet_exposed','partially_exposed','sufficiently_exposed','exposure_discontinuous'] as const
const INTERPRETATION_READINESS = ['ready','limited','blocked'] as const
const CLAIM_CEILINGS = ['not_interpretable','descriptive_observation_only','temporal_association_only','normalized_association_only','controlled_effect_consistent','bounded_experimental_effect_consistent','ai_referral_change_only','ai_prompt_cohort_change_only'] as const
const ALLOWED_CLAIM_BY_CEILING = {
  not_interpretable: 'no_change_claim_supported',
  descriptive_observation_only: 'exact_observation_description',
  temporal_association_only: 'observed_temporal_change',
  normalized_association_only: 'observed_normalized_association',
  controlled_effect_consistent: 'controlled_effect_consistent_under_supplied_method',
  bounded_experimental_effect_consistent: 'bounded_experimental_effect_consistent_under_supplied_method',
  ai_referral_change_only: 'ai_referral_metric_change',
  ai_prompt_cohort_change_only: 'frozen_ai_prompt_cohort_metric_change',
} as const
const PROHIBITED_OVERCLAIMS = ['causal_attribution','business_or_revenue_causality','universal_visibility','cross_provider_equivalence','automatic_recommendation_or_action'] as const

type Obj = Record<string, unknown>
type Window = Readonly<{ start: string; end: string }>
export interface MeasurementProjection {
  readonly schemaVersion: typeof MEASUREMENT_SCHEMA_VERSION
  readonly schemaMinorVersion: typeof MEASUREMENT_SCHEMA_MINOR_VERSION
  readonly identity: Readonly<{ workspaceId: string; tenantId: string; siteId: string; siteScopeRevisionId: string; trustedTarget: string; generatedAt: string; evaluatedAt: string }>
  readonly decision: Readonly<{ id: string; disposition: 'investigate'|'recommend'|'defer'|'dismiss'; summary: string; recordedAt: string }>
  readonly cycleReadiness: Readonly<{ state: typeof CYCLE_READINESS[number]; reasons: readonly string[] }>
  readonly plan?: Readonly<{ id: string; annotation: Readonly<{ id: string; summary: string }>; target: Readonly<{ rowIdentity: string; query: string; page: string; metric: typeof METRICS[number]; baselineObservationId: string; followUpObservationId?: string }>; baselineMeasurementId: string; followUpMeasurementId: string; readiness: Readonly<{ state: 'ready_for_human_assessment'|'not_ready'; reasons: readonly typeof PLAN_REASONS[number][] }> }>
  readonly measurements: readonly Readonly<{ id: string; relationship: Readonly<{ role: 'baseline'|'follow_up'; baselineMeasurementId?: string }>; dueWindow: Window; result: Readonly<{ state: typeof RESULT_STATES[number]; reason?: string; observedWindow?: Window; observations?: readonly Readonly<{ referenceId: string; value: Readonly<{ state: typeof OBSERVATION_VALUE_STATES[number]; type?: 'number'|'text'|'boolean'; value?: number|string|boolean; reason?: string }> }>[] }>; comparability: Readonly<{ state: typeof COMPARABILITY[number]; reason?: string }>; methodology: Readonly<{ id: string; version: string }>; createdAt: string }>[]
  readonly outcomes: readonly Readonly<{ id: string; direction: typeof OUTCOME_DIRECTIONS[number]; measurementIds: readonly string[]; comparability?: 'comparable'; rationale?: string; reason?: string; attribution: Readonly<{ strength: typeof ATTRIBUTION_STRENGTHS[number]; reason?: string; basis?: string; method?: Readonly<{ id: string; version: string }> }>; createdAt: string }>[]
  readonly interpretation?: Readonly<{ id: string; methodology: Readonly<{ id: 'ldw-measurement-interpretation-claim-ceilings'; version: '1.0.0'; release: '0.22.0' }>; designClass: typeof DESIGN_CLASSES[number]; exposure: Readonly<{ state: typeof EXPOSURE_STATES[number]; methodId?: string; methodVersion?: string; evidenceReference?: string }>; comparability: Readonly<{ state: typeof COMPARABILITY[number]; reasons: readonly string[]; baselineMeasurementId: string; followUpMeasurementId: string }>; readiness: typeof INTERPRETATION_READINESS[number]; claimCeiling: typeof CLAIM_CEILINGS[number]; allowedClaimCodes: readonly string[]; prohibitedOverclaimCodes: readonly string[]; limitations: readonly string[] }>
  readonly authorityNotes: readonly string[]
  readonly limitations: readonly string[]
}

export class MeasurementProjectionError extends Error { override name = 'MeasurementProjectionError' }
function fail(message: string): never { throw new MeasurementProjectionError(message) }
function obj(value: unknown, path: string): Obj { if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be an object.`); return value as Obj }
function exact(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Obj { const x=obj(value,path), allowed=new Set([...required,...optional]); for(const k of required) if(!Object.hasOwn(x,k)) fail(`${path}.${k} is required.`); for(const k of Object.keys(x)) if(!allowed.has(k)) fail(`${path}.${k} is not supported.`); return x }
function str(value: unknown, path: string): string { if(typeof value !== 'string' || !value.trim()) fail(`${path} must be a non-empty string.`); return value }
function arr(value: unknown, path: string): unknown[] { if(!Array.isArray(value)) fail(`${path} must be an array.`); return value }
function strs(value: unknown, path: string): string[] { return arr(value,path).map((v,i)=>str(v,`${path}[${i}]`)) }
function en<const T extends readonly string[]>(value: unknown, values: T, path: string): T[number] { const v=str(value,path); if(!(values as readonly string[]).includes(v)) fail(`${path} has unsupported value ${JSON.stringify(v)}.`); return v as T[number] }
function finite(value: unknown, path: string): number { if(typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be a finite number.`); return value }
function windowValue(value: unknown, path: string): Window { const x=exact(value,path,['start','end']); const start=str(x.start,`${path}.start`), end=str(x.end,`${path}.end`); if(start>end) fail(`${path} start must not be after end.`); return {start,end} }
function opt(x: Obj, key: string, path: string): string|undefined { return x[key]===undefined ? undefined : str(x[key],`${path}.${key}`) }
function unique(values: readonly string[], path: string) { if(new Set(values).size!==values.length) fail(`${path} cannot contain duplicate IDs.`) }

function parseObservationValue(raw: unknown, path: string) {
  const base=obj(raw,path), state=en(base.state,OBSERVATION_VALUE_STATES,`${path}.state`)
  if(state==='observed') {
    const x=exact(raw,path,['state','type','value']), type=en(x.type,['number','text','boolean'] as const,`${path}.type`), supplied=x.value
    if(type==='number') finite(supplied,`${path}.value`)
    else if(type==='text') str(supplied,`${path}.value`)
    else if(typeof supplied!=='boolean') fail(`${path}.value must be a boolean.`)
    return {state,type,value:supplied as number|string|boolean}
  }
  const x=exact(raw,path,['state','reason'])
  return {state,reason:str(x.reason,`${path}.reason`)}
}
function parseMeasurement(raw: unknown, index: number): MeasurementProjection['measurements'][number] {
  const p=`measurement.measurements[${index}]`, x=exact(raw,p,['id','relationship','dueWindow','result','comparability','methodology','createdAt'])
  const relObj=obj(x.relationship,`${p}.relationship`), role=en(relObj.role,['baseline','follow_up'] as const,`${p}.relationship.role`)
  const relationship=role==='baseline'
    ? (()=>{ exact(x.relationship,`${p}.relationship`,['role']); return {role} as const })()
    : (()=>{ const r=exact(x.relationship,`${p}.relationship`,['role','baselineMeasurementId']); return {role,baselineMeasurementId:str(r.baselineMeasurementId,`${p}.relationship.baselineMeasurementId`)} as const })()
  const dueWindow=windowValue(x.dueWindow,`${p}.dueWindow`)
  const resultObj=obj(x.result,`${p}.result`), resultState=en(resultObj.state,RESULT_STATES,`${p}.result.state`)
  let result: MeasurementProjection['measurements'][number]['result']
  if(resultState==='measured') {
    const r=exact(x.result,`${p}.result`,['state','observedWindow','observations']), observedWindow=windowValue(r.observedWindow,`${p}.result.observedWindow`)
    const observations=arr(r.observations,`${p}.result.observations`).map((item,n)=>{ const q=`${p}.result.observations[${n}]`, o=exact(item,q,['referenceId','value']); return {referenceId:str(o.referenceId,`${q}.referenceId`),value:parseObservationValue(o.value,`${q}.value`)} })
    if(observations.length<1 || observations.length>32) fail(`${p}.result.observations must contain 1 through 32 items.`)
    unique(observations.map(o=>o.referenceId),`${p}.result.observations`)
    result={state:resultState,observedWindow,observations}
  } else {
    const r=exact(x.result,`${p}.result`,['state','reason'])
    result={state:resultState,reason:str(r.reason,`${p}.result.reason`)}
  }
  const c=exact(x.comparability,`${p}.comparability`,['state'],['reason']), comparison=en(c.state,COMPARABILITY,`${p}.comparability.state`), reason=opt(c,'reason',`${p}.comparability`)
  if(comparison==='comparable' && reason!==undefined) fail(`${p}.comparability comparable cannot carry a reason.`)
  if(comparison!=='comparable' && reason===undefined) fail(`${p}.comparability ${comparison} requires a reason.`)
  const m=exact(x.methodology,`${p}.methodology`,['id','version'])
  return {id:str(x.id,`${p}.id`),relationship,dueWindow,result,comparability:{state:comparison,...(reason?{reason}:{})},methodology:{id:str(m.id,`${p}.methodology.id`),version:str(m.version,`${p}.methodology.version`)},createdAt:str(x.createdAt,`${p}.createdAt`)}
}
function parsePlan(raw: unknown): NonNullable<MeasurementProjection['plan']> {
  const p='measurement.plan', x=exact(raw,p,['id','annotation','target','baselineMeasurementId','followUpMeasurementId','readiness'])
  const a=exact(x.annotation,`${p}.annotation`,['id','summary']), t=exact(x.target,`${p}.target`,['rowIdentity','query','page','metric','baselineObservationId'],['followUpObservationId']), r=exact(x.readiness,`${p}.readiness`,['state','reasons'])
  const state=en(r.state,['ready_for_human_assessment','not_ready'] as const,`${p}.readiness.state`), reasons=arr(r.reasons,`${p}.readiness.reasons`).map((v,i)=>en(v,PLAN_REASONS,`${p}.readiness.reasons[${i}]`))
  if(state==='ready_for_human_assessment' && reasons.length) fail(`${p}.readiness ready_for_human_assessment cannot carry reasons.`)
  if(state==='not_ready' && !reasons.length) fail(`${p}.readiness not_ready requires reasons.`)
  return {id:str(x.id,`${p}.id`),annotation:{id:str(a.id,`${p}.annotation.id`),summary:str(a.summary,`${p}.annotation.summary`)},target:{rowIdentity:str(t.rowIdentity,`${p}.target.rowIdentity`),query:str(t.query,`${p}.target.query`),page:str(t.page,`${p}.target.page`),metric:en(t.metric,METRICS,`${p}.target.metric`),baselineObservationId:str(t.baselineObservationId,`${p}.target.baselineObservationId`),...(opt(t,'followUpObservationId',`${p}.target`)?{followUpObservationId:t.followUpObservationId as string}:{})},baselineMeasurementId:str(x.baselineMeasurementId,`${p}.baselineMeasurementId`),followUpMeasurementId:str(x.followUpMeasurementId,`${p}.followUpMeasurementId`),readiness:{state,reasons}}
}
function parseOutcome(raw: unknown, index: number): MeasurementProjection['outcomes'][number] {
  const p=`measurement.outcomes[${index}]`, base=obj(raw,p), direction=en(base.direction,OUTCOME_DIRECTIONS,`${p}.direction`)
  let x: Obj, measurementIds: string[]=[], comparability: 'comparable'|undefined, rationale: string|undefined, reason: string|undefined
  if(['improved','regressed','unchanged'].includes(direction)) { x=exact(raw,p,['id','direction','measurementIds','comparability','rationale','attribution','createdAt']); measurementIds=strs(x.measurementIds,`${p}.measurementIds`); if(measurementIds.length<2||measurementIds.length>32) fail(`${p}.measurementIds must contain 2 through 32 IDs.`); comparability=en(x.comparability,['comparable'] as const,`${p}.comparability`); rationale=str(x.rationale,`${p}.rationale`) }
  else if(direction==='inconclusive') { x=exact(raw,p,['id','direction','measurementIds','reason','attribution','createdAt']); measurementIds=strs(x.measurementIds,`${p}.measurementIds`); if(measurementIds.length>32) fail(`${p}.measurementIds exceeds 32 IDs.`); reason=str(x.reason,`${p}.reason`) }
  else { x=exact(raw,p,['id','direction','reason','attribution','createdAt']); reason=str(x.reason,`${p}.reason`) }
  unique(measurementIds,`${p}.measurementIds`)
  const a=obj(x.attribution,`${p}.attribution`), strength=en(a.strength,ATTRIBUTION_STRENGTHS,`${p}.attribution.strength`)
  let attribution: MeasurementProjection['outcomes'][number]['attribution']
  if(strength==='none') { const y=exact(x.attribution,`${p}.attribution`,['strength','reason']); attribution={strength,reason:str(y.reason,`${p}.attribution.reason`)} }
  else if(strength==='technical_verification'||strength==='association') { const y=exact(x.attribution,`${p}.attribution`,['strength','basis']); attribution={strength,basis:str(y.basis,`${p}.attribution.basis`)} }
  else { const y=exact(x.attribution,`${p}.attribution`,['strength','basis','method']), m=exact(y.method,`${p}.attribution.method`,['id','version']); attribution={strength,basis:str(y.basis,`${p}.attribution.basis`),method:{id:str(m.id,`${p}.attribution.method.id`),version:str(m.version,`${p}.attribution.method.version`)}} }
  return {id:str(x.id,`${p}.id`),direction,measurementIds,...(comparability?{comparability}:{}),...(rationale?{rationale}:{}),...(reason?{reason}:{}),attribution,createdAt:str(x.createdAt,`${p}.createdAt`)}
}
function parseInterpretation(raw: unknown): NonNullable<MeasurementProjection['interpretation']> {
  const p='measurement.interpretation', x=exact(raw,p,['id','methodology','designClass','exposure','comparability','readiness','claimCeiling','allowedClaimCodes','prohibitedOverclaimCodes','limitations'])
  const methodology=exact(x.methodology,`${p}.methodology`,['id','version','release'])
  if(methodology.id!=='ldw-measurement-interpretation-claim-ceilings'||methodology.version!=='1.0.0'||methodology.release!=='0.22.0') fail(`${p}.methodology must preserve accepted Release 0.22 identity.`)
  const exposure=exact(x.exposure,`${p}.exposure`,['state'],['methodId','methodVersion','evidenceReference']), comparison=exact(x.comparability,`${p}.comparability`,['state','reasons','baselineMeasurementId','followUpMeasurementId'])
  const comparisonState=en(comparison.state,COMPARABILITY,`${p}.comparability.state`), reasons=strs(comparison.reasons,`${p}.comparability.reasons`)
  if(comparisonState!=='comparable'&&!reasons.length) fail(`${p}.comparability ${comparisonState} requires reasons.`)
  const readiness=en(x.readiness,INTERPRETATION_READINESS,`${p}.readiness`), claimCeiling=en(x.claimCeiling,CLAIM_CEILINGS,`${p}.claimCeiling`), allowed=strs(x.allowedClaimCodes,`${p}.allowedClaimCodes`), prohibited=strs(x.prohibitedOverclaimCodes,`${p}.prohibitedOverclaimCodes`)
  if(allowed.length!==1 || allowed[0]!==ALLOWED_CLAIM_BY_CEILING[claimCeiling]) fail(`${p}.allowedClaimCodes contradict the accepted claim ceiling.`)
  if(prohibited.length!==PROHIBITED_OVERCLAIMS.length || PROHIBITED_OVERCLAIMS.some(code=>!prohibited.includes(code))) fail(`${p}.prohibitedOverclaimCodes must preserve the accepted Release 0.22 set.`)
  if((comparisonState!=='comparable') !== (claimCeiling==='not_interpretable')) fail(`${p} non-comparable interpretation must remain blocked/not_interpretable.`)
  if((claimCeiling==='not_interpretable') !== (readiness==='blocked')) fail(`${p}.readiness and not_interpretable claim ceiling contradict.`)
  if(claimCeiling==='descriptive_observation_only' && readiness!=='limited') fail(`${p}.descriptive_observation_only must remain limited.`)
  if(readiness==='ready' && ['not_interpretable','descriptive_observation_only'].includes(claimCeiling)) fail(`${p}.ready cannot carry a blocked/limited claim ceiling.`)
  return {id:str(x.id,`${p}.id`),methodology:{id:'ldw-measurement-interpretation-claim-ceilings',version:'1.0.0',release:'0.22.0'},designClass:en(x.designClass,DESIGN_CLASSES,`${p}.designClass`),exposure:{state:en(exposure.state,EXPOSURE_STATES,`${p}.exposure.state`),...(opt(exposure,'methodId',`${p}.exposure`)?{methodId:exposure.methodId as string}:{}),...(opt(exposure,'methodVersion',`${p}.exposure`)?{methodVersion:exposure.methodVersion as string}:{}),...(opt(exposure,'evidenceReference',`${p}.exposure`)?{evidenceReference:exposure.evidenceReference as string}:{})},comparability:{state:comparisonState,reasons,baselineMeasurementId:str(comparison.baselineMeasurementId,`${p}.comparability.baselineMeasurementId`),followUpMeasurementId:str(comparison.followUpMeasurementId,`${p}.comparability.followUpMeasurementId`)},readiness,claimCeiling,allowedClaimCodes:allowed,prohibitedOverclaimCodes:prohibited,limitations:strs(x.limitations,`${p}.limitations`)}
}

function observationIds(measurement: MeasurementProjection['measurements'][number]): Set<string> {
  return new Set(measurement.result.state === 'measured' ? measurement.result.observations?.map((item) => item.referenceId) ?? [] : [])
}
function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
function validateSearchChangePlan(
  plan: NonNullable<MeasurementProjection['plan']>,
  baseline: MeasurementProjection['measurements'][number],
  follow: MeasurementProjection['measurements'][number],
): void {
  if (baseline.result.state !== 'measured' || !observationIds(baseline).has(plan.target.baselineObservationId))
    fail('Measurement plan baselineObservationId must resolve to the supplied measured baseline record.')
  for (const record of [baseline, follow]) {
    if (record.methodology.id !== 'ldw-search-change-cohort' || record.methodology.version !== '1.0.0')
      fail('Search Change plan measurements must preserve accepted methodology ldw-search-change-cohort / 1.0.0.')
  }

  const followObservationId = plan.target.followUpObservationId
  if (follow.result.state === 'measured') {
    if (followObservationId === undefined || !observationIds(follow).has(followObservationId))
      fail('Measured Search Change follow-up must supply and resolve followUpObservationId.')
    if (follow.comparability.state !== 'comparable') {
      if (plan.readiness.state !== 'not_ready' || !plan.readiness.reasons.includes('incomparable'))
        fail('Non-comparable measured Search Change follow-up must preserve not_ready / incomparable readiness.')
    }
    if (plan.readiness.state === 'not_ready') {
      const allowedMeasuredReasons = new Set(['source_not_final','coverage_incomplete','coverage_anonymized','coverage_truncated','incomparable'])
      if (plan.readiness.reasons.some((reason) => !allowedMeasuredReasons.has(reason)))
        fail('Measured Search Change follow-up carries a readiness reason impossible for measured producer output.')
    }
    return
  }

  if (followObservationId !== undefined) fail('Unmeasured Search Change follow-up cannot claim followUpObservationId.')
  if (plan.readiness.state !== 'not_ready') fail('Unmeasured Search Change follow-up cannot be ready for human assessment.')
  if (follow.result.state === 'not_due') {
    if (!sameStrings(plan.readiness.reasons, ['follow_up_not_due']))
      fail('Search Change not_due follow-up must preserve the exact follow_up_not_due readiness reason.')
    return
  }
  if (plan.readiness.reasons.length !== 1 || !['follow_up_not_measured','target_missing'].includes(plan.readiness.reasons[0]))
    fail('Search Change not_measured follow-up must preserve follow_up_not_measured or target_missing readiness.')
}
function visiblyBlocksComparableInterpretation(
  baseline: MeasurementProjection['measurements'][number],
  follow: MeasurementProjection['measurements'][number],
): boolean {
  if (baseline.comparability.state !== 'comparable' || follow.comparability.state !== 'comparable') return true
  if (baseline.result.state !== 'measured' || follow.result.state !== 'measured') return true
  if (baseline.result.observations?.some((item) => item.value.state !== 'observed') || follow.result.observations?.some((item) => item.value.state !== 'observed')) return true
  if (baseline.methodology.id !== follow.methodology.id || baseline.methodology.version !== follow.methodology.version) return true
  return (baseline.result.observedWindow?.end ?? '') > (follow.result.observedWindow?.start ?? '')
}
function validateCycleReadiness(
  decision: MeasurementProjection['decision'],
  cycle: MeasurementProjection['cycleReadiness'],
  plan: MeasurementProjection['plan'],
  byId: ReadonlyMap<string, MeasurementProjection['measurements'][number]>,
  outcomeCount: number,
): void {
  if (decision.disposition === 'defer' || decision.disposition === 'dismiss') {
    if (cycle.state !== 'deferred_or_dismissed' || cycle.reasons.length !== 0) fail('Deferred/dismissed decision must preserve deferred_or_dismissed cycle readiness.')
    return
  }
  if (outcomeCount > 0) {
    if (cycle.state !== 'outcome_recorded' || cycle.reasons.length !== 0) fail('Recorded human outcome must preserve outcome_recorded cycle readiness.')
    return
  }
  if (plan === undefined) return
  const follow = byId.get(plan.followUpMeasurementId)
  if (!follow) return
  let state: MeasurementProjection['cycleReadiness']['state']
  let reasons: readonly string[]
  if (follow.result.state === 'not_due') { state='follow_up_not_due'; reasons=['follow_up_not_due'] }
  else if (follow.result.state === 'not_measured') { state='follow_up_not_measured'; reasons=plan.readiness.state === 'not_ready' ? plan.readiness.reasons : [] }
  else if (follow.comparability.state !== 'comparable') { state='follow_up_not_comparable'; reasons=plan.readiness.state === 'not_ready' ? plan.readiness.reasons : ['incomparable'] }
  else if (plan.readiness.state === 'not_ready') { state='follow_up_not_ready'; reasons=plan.readiness.reasons }
  else { state='ready_for_human_assessment'; reasons=[] }
  if (cycle.state !== state || !sameStrings(cycle.reasons, reasons)) fail('Measurement cycle readiness contradicts the supplied Search Change plan and recorded measurements.')
}

export function parseMeasurementProjection(input: unknown): MeasurementProjection {
  const root=exact(input,'measurement',['schemaVersion','schemaMinorVersion','identity','decision','cycleReadiness','measurements','outcomes','authorityNotes','limitations'],['plan','interpretation'])
  if(root.schemaVersion!==MEASUREMENT_SCHEMA_VERSION||root.schemaMinorVersion!==MEASUREMENT_SCHEMA_MINOR_VERSION) fail('Unsupported Measurement projection schema/version.')
  const i=exact(root.identity,'measurement.identity',['workspaceId','tenantId','siteId','siteScopeRevisionId','trustedTarget','generatedAt','evaluatedAt']), d=exact(root.decision,'measurement.decision',['id','disposition','summary','recordedAt']), c=exact(root.cycleReadiness,'measurement.cycleReadiness',['state','reasons'])
  const decision: MeasurementProjection['decision']={id:str(d.id,'measurement.decision.id'),disposition:en(d.disposition,['investigate','recommend','defer','dismiss'] as const,'measurement.decision.disposition'),summary:str(d.summary,'measurement.decision.summary'),recordedAt:str(d.recordedAt,'measurement.decision.recordedAt')}
  const cycleReadiness: MeasurementProjection['cycleReadiness']={state:en(c.state,CYCLE_READINESS,'measurement.cycleReadiness.state'),reasons:strs(c.reasons,'measurement.cycleReadiness.reasons')}
  const measurements=arr(root.measurements,'measurement.measurements').map(parseMeasurement), outcomes=arr(root.outcomes,'measurement.outcomes').map(parseOutcome)
  unique(measurements.map(m=>m.id),'measurement.measurements'); unique(outcomes.map(o=>o.id),'measurement.outcomes')
  const byId=new Map(measurements.map(m=>[m.id,m]))
  for(const measurement of measurements) if(measurement.relationship.role==='follow_up') { const baseline=byId.get(measurement.relationship.baselineMeasurementId!); if(!baseline||baseline.relationship.role!=='baseline') fail(`Follow-up measurement ${measurement.id} must reference a supplied baseline measurement.`) }
  const plan=root.plan===undefined?undefined:parsePlan(root.plan)
  if(plan) {
    const baseline=byId.get(plan.baselineMeasurementId), follow=byId.get(plan.followUpMeasurementId)
    if(!baseline||baseline.relationship.role!=='baseline') fail('Measurement plan baselineMeasurementId must resolve to a supplied baseline.')
    if(!follow||follow.relationship.role!=='follow_up'||follow.relationship.baselineMeasurementId!==baseline.id) fail('Measurement plan followUpMeasurementId must resolve to its supplied follow-up pair.')
    validateSearchChangePlan(plan,baseline,follow)
  }
  for(const outcome of outcomes) for(const id of outcome.measurementIds) if(!byId.has(id)) fail(`Outcome ${outcome.id} references absent measurement ${id}.`)
  const interpretation=root.interpretation===undefined?undefined:parseInterpretation(root.interpretation)
  if(interpretation) {
    const baseline=byId.get(interpretation.comparability.baselineMeasurementId), follow=byId.get(interpretation.comparability.followUpMeasurementId)
    if(!baseline||baseline.relationship.role!=='baseline') fail('Interpretation baselineMeasurementId must resolve to a supplied baseline.')
    if(!follow||follow.relationship.role!=='follow_up'||follow.relationship.baselineMeasurementId!==baseline.id) fail('Interpretation followUpMeasurementId must resolve to the supplied baseline/follow-up pair.')
    if(interpretation.comparability.state==='comparable' && visiblyBlocksComparableInterpretation(baseline,follow)) fail('Interpretation cannot claim comparable when projected canonical measurement records visibly block comparability.')
  }
  validateCycleReadiness(decision,cycleReadiness,plan,byId,outcomes.length)
  return {schemaVersion:MEASUREMENT_SCHEMA_VERSION,schemaMinorVersion:MEASUREMENT_SCHEMA_MINOR_VERSION,identity:{workspaceId:str(i.workspaceId,'measurement.identity.workspaceId'),tenantId:str(i.tenantId,'measurement.identity.tenantId'),siteId:str(i.siteId,'measurement.identity.siteId'),siteScopeRevisionId:str(i.siteScopeRevisionId,'measurement.identity.siteScopeRevisionId'),trustedTarget:str(i.trustedTarget,'measurement.identity.trustedTarget'),generatedAt:str(i.generatedAt,'measurement.identity.generatedAt'),evaluatedAt:str(i.evaluatedAt,'measurement.identity.evaluatedAt')},decision,cycleReadiness,...(plan?{plan}:{}),measurements,outcomes,...(interpretation?{interpretation}:{}),authorityNotes:strs(root.authorityNotes,'measurement.authorityNotes'),limitations:strs(root.limitations,'measurement.limitations')}
}
export function decodeMeasurementProjection(input: unknown, shell: WorkbenchProjection): MeasurementProjection {
  const feature=parseMeasurementProjection(input), scope=shell.workspace.scope, cycle=shell.workspace.decisionCycle
  const same=feature.identity.workspaceId===shell.source.workspaceId&&feature.identity.tenantId===scope.tenantId&&feature.identity.siteId===scope.siteId&&feature.identity.siteScopeRevisionId===scope.siteScopeRevisionId&&feature.identity.trustedTarget===shell.workspace.trustedTarget&&feature.identity.generatedAt===shell.workspace.generatedAt&&feature.identity.evaluatedAt===shell.workspace.evaluatedAt
  if(!same) fail('Measurement and Workbench shell identities do not match.')
  if(!cycle) fail('Measurement projection requires a supplied Workbench decision cycle.')
  if(feature.decision.id!==cycle.decision.id||feature.decision.disposition!==cycle.decision.disposition||feature.decision.summary!==cycle.decision.summary||feature.decision.recordedAt!==cycle.decision.recordedAt) fail('Measurement decision does not match the supplied Workbench decision cycle.')
  if(feature.cycleReadiness.state!==cycle.readiness.state || feature.cycleReadiness.reasons.length!==cycle.readiness.reasons.length || feature.cycleReadiness.reasons.some((reason,index)=>reason!==cycle.readiness.reasons[index])) fail('Measurement readiness does not match the supplied Workbench decision cycle.')
  if(feature.measurements.length!==shell.workspace.navigation.decisionCycle.recordedMeasurementCount||feature.outcomes.length!==shell.workspace.navigation.decisionCycle.humanOutcomeCount) fail('Measurement record counts do not match the supplied Workbench navigation projection.')
  return feature
}
