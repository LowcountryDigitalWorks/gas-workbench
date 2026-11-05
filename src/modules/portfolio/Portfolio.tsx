import { useRef, useState } from 'react'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import { timestamp } from '../../design-system/format'
import type { PortfolioEngagement, PortfolioFeatureProjection } from '../../engine/portfolio-projection'
import { choosePortfolioEngagement } from './selection'
import { changePortfolioFilter, clearPortfolioSelection, filterPortfolioEngagements, PORTFOLIO_FILTERS, resolveVisiblePortfolioEngagement, type PortfolioFilterState } from './filter'

function words(value: string) { return value.replaceAll('_', ' ') }
function countRows(rows: readonly Readonly<{ state: string; count: number }>[]) { return rows.filter((row) => row.count > 0) }

function SourceRow({ source }: { source: PortfolioEngagement['sources'][number] }) {
  return <article className="portfolio-source">
    <div className="portfolio-row-heading">
      <div><strong>{words(source.sourceFamily)}</strong><code>{source.receiptId}</code></div>
      <div className="portfolio-badges"><Badge>{words(source.sourceState)}</Badge><Badge>{words(source.freshness.state)}</Badge></div>
    </div>
    {source.freshness.state === 'not_evaluable'
      ? <p className="muted">Freshness not evaluable · {words(source.freshness.reason ?? 'reason_not_supplied')}</p>
      : <Facts rows={[
        ['Anchor', `${words(source.freshness.anchorKind ?? '')} · ${timestamp(source.freshness.anchorAt ?? '')}`],
        ['Age / policy', `${source.freshness.ageSeconds}s / ${source.freshness.maxAgeSeconds}s`],
      ]}/>} 
  </article>
}

export function EngagementDetail({ engagement, onClear }: { engagement: PortfolioEngagement; onClear: () => void }) {
  return <section className="portfolio-detail" aria-label={`Engagement context for ${engagement.label}`}>
    <div className="portfolio-detail-heading">
      <div><p className="eyebrow">Trusted engagement context</p><h3>{engagement.label}</h3><p className="muted">Selection is navigation only. It is not a portfolio rank, score, or priority.</p></div>
      <div className="portfolio-detail-actions"><Badge>{words(engagement.currentRunState)}</Badge><button type="button" className="portfolio-filter" onClick={onClear}>Clear selection</button></div>
    </div>
    <Facts rows={[
      ['Target', <code>{engagement.trustedTarget}</code>],
      ['Tenant', <code>{engagement.scope.tenantId}</code>],
      ['Site', <code>{engagement.scope.siteId}</code>],
      ['Scope revision', <code>{engagement.scope.siteScopeRevisionId}</code>],
      ['Engagement ID', <code>{engagement.engagementId}</code>],
    ]}/>

    {engagement.currentRunState === 'no_current_run' ? <Notice><strong>No accepted current run.</strong><br/>This is trusted inventory state, not healthy, successful, empty, or zero evidence.</Notice> : <>
      <section className="portfolio-subsection"><h4>Current run</h4><Facts rows={[
        ['Run', <code>{engagement.currentRunId}</code>],
        ['Workspace', <code>{engagement.workspaceId}</code>],
        ['Run period', `${timestamp(engagement.runPeriod?.start ?? '')} → ${timestamp(engagement.runPeriod?.end ?? '')}`],
        ['Evaluated', timestamp(engagement.runEvaluatedAt ?? '')],
        ['Attention', `${engagement.attentionCount} unranked item${engagement.attentionCount === 1 ? '' : 's'}`],
        ['Decision / follow-up', engagement.followUp?.readiness ? words(engagement.followUp.readiness) : 'No decision cycle supplied'],
        ['Report', engagement.report?.state === 'present' ? `present · ${engagement.report.reportId}` : 'not requested'],
      ]}/></section>

      <section className="portfolio-subsection"><div className="portfolio-section-heading"><div><p className="eyebrow">State ≠ freshness</p><h4>Source receipts</h4></div><Badge>{engagement.sources.length} sources</Badge></div>
        <div className="portfolio-source-list">{engagement.sources.map((source) => <SourceRow key={source.receiptId} source={source}/>)}</div>
      </section>

      <section className="portfolio-subsection"><h4>Accepted module readiness</h4>
        <div className="portfolio-readiness">{engagement.readiness.map((entry) => <div key={entry.moduleId}><span>{words(entry.moduleId)}</span><Badge>{words(entry.state)}</Badge>{entry.reasons.map((reason) => <code key={reason}>{reason}</code>)}</div>)}</div>
      </section>
    </>}

    <section className="portfolio-subsection"><div className="portfolio-section-heading"><div><p className="eyebrow">Factual navigation only</p><h4>Operational exceptions</h4></div><Badge>{engagement.exceptions.length}</Badge></div>
      {engagement.exceptions.length === 0 ? <Notice>No factual operational exceptions are supplied for this engagement. This is not a health score.</Notice> : <ul className="portfolio-exceptions">{engagement.exceptions.map((entry) => <li key={`${entry.kind}:${entry.receiptId ?? ''}`}><strong>{words(entry.kind)}</strong>{entry.sourceFamily ? <span>{words(entry.sourceFamily)} · <code>{entry.receiptId}</code></span> : null}</li>)}</ul>}
    </section>

    <details className="portfolio-policy"><summary>Freshness policy · operational metadata only</summary><p><code>{engagement.freshnessPolicy.id}</code> · version {engagement.freshnessPolicy.version}</p><ul>{engagement.freshnessPolicy.sources.map((rule) => <li key={rule.sourceFamily}>{words(rule.sourceFamily)} · max age {rule.maxAgeSeconds}s</li>)}</ul></details>
    <ul className="portfolio-limitations">{engagement.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
  </section>
}

export function Portfolio({ projection }: { projection: PortfolioFeatureProjection }) {
  return <PortfolioSnapshot key={projection.portfolio.id} projection={projection}/>
}

function PortfolioSnapshot({ projection }: { projection: PortfolioFeatureProjection }) {
  const portfolio = projection.portfolio
  const [filterState, setFilterState] = useState<PortfolioFilterState>({ filter: 'all' })
  const selectedEngagementButton = useRef<HTMLButtonElement | null>(null)
  const { selection, filter } = filterState
  const visibleEngagements = filterPortfolioEngagements(portfolio.engagements, filter)
  const selected = resolveVisiblePortfolioEngagement(projection, selection, filter)
  const summary = portfolio.summary
  function clearSelection() {
    const returnTarget = selectedEngagementButton.current
    setFilterState(clearPortfolioSelection)
    requestAnimationFrame(() => {
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
    })
  }
  return <section className="portfolio-view">
    <header className="portfolio-heading">
      <div><p className="eyebrow">Trusted inventory → accepted run state → operational navigation</p><h2>Sites / Portfolio</h2><p>Internal multi-engagement operations without cross-customer performance scoring.</p></div>
      <div className="portfolio-classification"><Badge>LDW INTERNAL</Badge><small>Release {portfolio.version} · evaluated {timestamp(portfolio.evaluatedAt)}</small></div>
    </header>

    <section className="portfolio-summary" aria-label="Operational portfolio summary">
      <div><strong>{summary.engagementCount}</strong><span>engagements</span></div>
      <div><strong>{summary.currentRun.present}</strong><span>current runs</span></div>
      <div><strong>{summary.currentRun.noCurrentRun}</strong><span>no current run</span></div>
      <div><strong>{summary.attentionPresentEngagements}</strong><span>with Attention</span></div>
    </section>
    <p className="portfolio-summary-note">Counts are operational navigation facts only. They are not customer performance, health, severity, or priority.</p>

    <div className="portfolio-layout">
      <section className="portfolio-list" aria-label="Trusted engagements">
        <div className="portfolio-section-heading"><div><p className="eyebrow">Trusted inventory</p><h3>Engagements</h3></div><Badge>{portfolio.engagements.length}</Badge></div>
        <div className="portfolio-filters" role="group" aria-label="Filter engagements by accepted facts">
          {PORTFOLIO_FILTERS.map((option) => <button key={option.id} type="button" className="portfolio-filter" aria-pressed={filter === option.id} onClick={() => setFilterState((current) => changePortfolioFilter(current, option.id))}>
            {option.label}<span aria-hidden="true">{filterPortfolioEngagements(portfolio.engagements, option.id).length}</span>
          </button>)}
        </div>
        <p className="portfolio-filter-note" role="status">Showing {visibleEngagements.length} of {portfolio.engagements.length} engagements. Filters reflect accepted operational facts, not ranking or access authority.</p>
        {visibleEngagements.length === 0 ? <Notice>No engagements match this factual filter. Choose another filter; no tenant is selected automatically.</Notice> : null}
        {visibleEngagements.map((engagement) => <button type="button" ref={engagement.engagementId === selected?.engagementId ? selectedEngagementButton : undefined} className="portfolio-engagement" aria-pressed={engagement.engagementId === selected?.engagementId} key={engagement.engagementId} onClick={() => setFilterState((current) => ({ ...current, selection: choosePortfolioEngagement(projection, engagement.engagementId) }))}>
          <span><strong>{engagement.label}</strong><small>{engagement.trustedTarget}</small></span>
          <span className="portfolio-engagement-meta"><Badge>{words(engagement.currentRunState)}</Badge><small>{engagement.exceptions.length} factual exception{engagement.exceptions.length === 1 ? '' : 's'}</small></span>
        </button>)}
      </section>
      {selected ? <EngagementDetail engagement={selected} onClear={clearSelection}/> : (
        <section className="portfolio-detail" aria-label="Engagement selection">
          <div className="portfolio-detail-heading">
            <div><p className="eyebrow">Explicit operator selection</p><h3>{selection ? 'Engagement selection expired' : 'Select an engagement'}</h3></div>
          </div>
          <Notice>{selection
            ? 'The portfolio or trusted engagement identity changed. Choose an engagement again to inspect current details. No other tenant is selected automatically.'
            : 'Choose a trusted engagement to inspect its exact tenant, scope, run, and source state. No customer is selected automatically.'}</Notice>
        </section>
      )}
    </div>

    <section className="portfolio-rollups"><h3>Operational roll-ups</h3><p className="muted">Only non-zero accepted state counts are shown.</p><div className="portfolio-rollup-grid">
      <div><h4>Source state</h4>{countRows(summary.sourceStates).map((row) => <p key={row.state}><span>{words(row.state)}</span><strong>{row.count}</strong></p>)}</div>
      <div><h4>Freshness</h4>{countRows(summary.freshnessStates).map((row) => <p key={row.state}><span>{words(row.state)}</span><strong>{row.count}</strong></p>)}</div>
      <div><h4>Decision readiness</h4>{countRows(summary.decisionReadinessStates).map((row) => <p key={row.state}><span>{words(row.state)}</span><strong>{row.count}</strong></p>)}</div>
      <div><h4>Report state</h4>{countRows(summary.reportStates).map((row) => <p key={row.state}><span>{words(row.state)}</span><strong>{row.count}</strong></p>)}</div>
    </div></section>

    <details className="portfolio-identity"><summary>Exact internal portfolio identity and limitations</summary><code>{portfolio.id}</code><ul>{portfolio.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
  </section>
}
