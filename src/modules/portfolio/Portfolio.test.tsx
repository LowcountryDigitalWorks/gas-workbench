import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { mixedPortfolioFixture } from '../../engine/portfolioFixtures'
import { parsePortfolioProjection } from '../../engine/portfolio-projection'
import { EngagementDetail, Portfolio } from './Portfolio'

const clone = <T,>(value: T): T => structuredClone(value)

type MutableFixture = { portfolio: { engagements: Array<{ label: string }> } }

describe('Portfolio', () => {
  it('renders an explicit LDW-internal operational portfolio without ranking semantics', () => {
    const html = renderToStaticMarkup(<Portfolio projection={parsePortfolioProjection(mixedPortfolioFixture)}/>)
    expect(html).toContain('Sites / Portfolio')
    expect(html).toContain('LDW INTERNAL')
    expect(html).toContain('operational navigation facts only')
    expect(html).toContain('Select an engagement')
    expect(html).not.toContain('best client')
    expect(html).not.toContain('worst client')
    expect(html).not.toContain('performance leaderboard')
  })

  it('shows trusted inventory entries and exact selected engagement context', () => {
    const html = renderToStaticMarkup(<Portfolio projection={parsePortfolioProjection(mixedPortfolioFixture)}/>)
    expect(html).toContain('Synthetic Alpha · current / fresh / report present')
    expect(html).toContain('Synthetic Beta · stale / unavailable / not requested')
    expect(html).toContain('Synthetic Beta · trusted inventory / no current run')
    expect(html).not.toContain('tenant-alpha')
    expect(html).not.toContain('shared-site')
    expect(html).not.toContain('managed-service-run:')
  })

  it('keeps source state and operational freshness visibly separate', () => {
    const html = renderToStaticMarkup(<Portfolio projection={parsePortfolioProjection(mixedPortfolioFixture)}/>)
    expect(html).toContain('Operational roll-ups')
    expect(html).toContain('supplied')
    expect(html).toContain('fresh')
    expect(html).not.toContain('Freshness not evaluable')
    expect(html).toContain('operational metadata only')
  })

  it('renders factual triage controls without selecting or ranking a tenant by default', () => {
    const html = renderToStaticMarkup(<Portfolio projection={parsePortfolioProjection(mixedPortfolioFixture)}/>)
    expect(html).toContain('Filter engagements by accepted facts')
    expect(html).toContain('No current run')
    expect(html).toContain('Attention present')
    expect(html).toContain('Source exceptions')
    expect(html).toContain('Showing 3 of 3 engagements')
    expect(html).toContain('Filters reflect accepted operational facts, not ranking or access authority')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Select an engagement')
    expect(html).not.toContain('tenant-alpha')
  })

  it('escapes inventory labels as text', () => {
    const fixture = clone(mixedPortfolioFixture) as unknown as MutableFixture
    fixture.portfolio.engagements[0].label = '<script>alert(1)</script> Alpha'
    const html = renderToStaticMarkup(<Portfolio projection={parsePortfolioProjection(fixture)}/>)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Alpha')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
  it('offers explicit local dismissal only in selected detail and preserves no-current-run identity', () => {
    const projection = parsePortfolioProjection(mixedPortfolioFixture)
    const alpha = projection.portfolio.engagements.find((row) => row.engagementId === 'engagement-alpha')!
    const noRun = projection.portfolio.engagements.find((row) => row.currentRunState === 'no_current_run')!
    const initial = renderToStaticMarkup(<Portfolio projection={projection}/>)
    expect(initial).not.toContain('Clear selection')
    const selected = renderToStaticMarkup(<EngagementDetail engagement={alpha} onClear={() => {}}/>)
    expect(selected).toContain('type="button"')
    expect(selected).toContain('Clear selection')
    expect(selected).toContain('tenant-alpha')
    expect(selected).not.toContain('tenant-beta')
    const missingRun = renderToStaticMarkup(<EngagementDetail engagement={noRun} onClear={() => {}}/>)
    expect(missingRun).toContain('No accepted current run')
    expect(missingRun).toContain('Clear selection')
    expect(missingRun).not.toContain('managed-service-run:')
  })

})
