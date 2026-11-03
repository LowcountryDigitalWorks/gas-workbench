import { useId } from 'react'
import type { WorkbenchProjection } from '../../engine/projection'
import type { VisibilityFeatureProjection } from '../../engine/visibility-projection'
import { visibilityFixtureIds } from '../../engine/visibilityFixtures'
import type { VisibilityFixtureId } from '../../engine/visibilityFixtures'
import { Badge, Facts, Notice } from '../../design-system/primitives'

const names: Record<VisibilityFixtureId, string> = {
  'comparable-search': 'Comparable organic search',
  'source-discontinuity': 'Source-universe discontinuity',
  'ai-limited': 'Limited AI visibility',
  'mixed-availability': 'Mixed source availability',
}
function value(n: number | undefined, unit: string) {
  if (n === undefined) return 'Not supplied'
  return unit === 'percent' ? `${n}%` : `${n} ${unit}`
}

export function Visibility({
  projection, error, shell, fixture, chooseFixture, inspect, review,
}: {
  projection?: VisibilityFeatureProjection
  error?: string
  shell: WorkbenchProjection
  fixture: VisibilityFixtureId
  chooseFixture: (id: VisibilityFixtureId) => void
  inspect: (moduleId: string) => void
  review: (id: string) => void
}) {
  const selectId = useId()
  return <section className="visibility-view" aria-busy={projection === undefined && error === undefined}>
    <div className="visibility-heading">
      <div><p className="eyebrow">Source-universe first</p><h2>Visibility evidence</h2>
        <p>Organic Search and provider-native AI observations remain separate evidence universes.</p></div>
      <label htmlFor={selectId}>Visibility evidence fixture</label>
      <select id={selectId} value={fixture} onChange={(e) => chooseFixture(e.target.value as VisibilityFixtureId)}>
        {visibilityFixtureIds.map((id) => <option key={id} value={id}>{names[id]}</option>)}
      </select>
    </div>
    {projection ? <>
    <p className="visibility-schema">Checked feature projection <code>{projection.schemaVersion}</code> / minor {projection.schemaMinorVersion}; shell projection remains minor 0.</p>
    {projection.sources.map((source) => {
      const attention = source.attentionId && shell.workspace.attention.find((item) => item.id === source.attentionId)
      return <article className="visibility-source" key={source.id}>
        <header><div><p className="eyebrow">{source.family === 'organic_search' ? 'Organic Search' : 'AI Visibility · provider-specific'}</p><h3>{source.provider}</h3></div><Badge>{source.readiness.replaceAll('_', ' ')}</Badge></header>
        <Facts rows={[
          ['Source identity', <code>{source.identity}</code>], ['Release', source.release],
          ...(source.period ? [['Period', source.period] as const] : []),
          ...(source.freshness ? [['Freshness / finality', source.freshness] as const] : []),
          ...(source.coverage ? [['Coverage', source.coverage] as const] : []),
          ...(source.modality ? [['Web modality', source.modality === 'legacy_subtype_not_established' ? 'Legacy Web — subtype not established' : source.modality] as const] : []),
        ]}/>
        {source.reasons.map((reason) => <Notice key={reason}><strong>Supplied readiness reason</strong><br/><code>{reason}</code></Notice>)}
        {source.comparison === 'incompatible' ? <Notice><strong>Comparison unavailable — source universe changed.</strong><br/>Numeric values below are shown as supplied. No trend or delta is inferred.{source.comparisonReasons.map((reason) => <span className="visibility-reason" key={reason}><code>{reason}</code></span>)}</Notice> : source.comparison === 'comparable' ? <Notice><strong>Engine-supplied comparison: comparable.</strong>{source.descriptiveChange && <p>{source.descriptiveChange}</p>}</Notice> : <Notice>No comparison was supplied. No comparison is inferred.</Notice>}
        {source.metrics.length > 0 && <div className="visibility-metrics"><h4>Provider-native metrics</h4><div className="visibility-metric-grid">{source.metrics.map((metric) => <div className="visibility-metric" key={metric.name}><strong>{metric.name}</strong><span>Baseline: {value(metric.baseline, metric.unit)}</span><span>Current: {value(metric.current, metric.unit)}</span></div>)}</div></div>}
        {source.concentration && <Facts rows={[[`Supplied ${source.provider} concentration`, `${source.concentration.numerator} / ${source.concentration.denominator} · ${source.concentration.share} share`], ['Concentration policy', <code>{source.concentration.policy}</code>]]}/>}
        {source.limitations.map((limitation) => <p className="muted visibility-limitation" key={limitation}>{limitation}</p>)}
        {source.evidenceIdentity && <div className="visibility-reference"><h4>Exact evidence reference</h4><code>{source.evidenceIdentity}</code>{source.attentionId && <p>Attention reference <code>{source.attentionId}</code></p>}<div className="action-row"><button className="secondary" onClick={() => inspect(source.family === 'organic_search' ? 'search_analytics' : 'ai_visibility')}>Open linked Evidence</button>{attention && <button className="primary" onClick={() => review(attention.id)}>Review in Attention</button>}</div></div>}
      </article>
    })}
    {projection.claimCeiling && <Notice><strong>Supplied claim ceiling</strong><br/><code>{projection.claimCeiling}</code></Notice>}
    {projection.claimContext && <div className="visibility-claims"><h3>Supplied interpretation limits</h3><Facts rows={[
      ['Allowed claim codes', projection.claimContext.allowedClaimCodes.length ? projection.claimContext.allowedClaimCodes.map((code) => <code key={code}>{code} </code>) : 'None supplied'],
      ['Prohibited overclaim codes', projection.claimContext.prohibitedOverclaimCodes.length ? projection.claimContext.prohibitedOverclaimCodes.map((code) => <code key={code}>{code} </code>) : 'None supplied'],
    ]}/>{projection.claimContext.limitations.map((item) => <p className="muted" key={item}>{item}</p>)}</div>}
    {projection.limitations.map((item) => <p className="muted" key={item}>{item}</p>)}
    </> : <div className="error-state" role={error ? 'alert' : 'status'}>
      <h3>{error ? 'Visibility unavailable' : 'Checking Visibility projection'}</h3>
      <p>{error ?? 'Validating source and workspace identity…'}</p>
    </div>}
  </section>
}
