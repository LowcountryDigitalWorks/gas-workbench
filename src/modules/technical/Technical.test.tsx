import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadTechnicalFixture } from '../../engine/technicalFixtures'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import shellJson from '../../engine/fixtures/technical-review.json'
import { Technical } from './Technical'

const shell = decodeWorkbenchProjection(shellJson)
const noop = () => {}
describe('Technical operator slice', () => {
  it('shows source identity and supplied WQT values without a universal health score', async () => {
    const html = renderToStaticMarkup(<Technical projection={await loadTechnicalFixture('ready', shell)} shell={shell} fixture="ready" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(html).toContain('SiteOne')
    expect(html).toContain('observation:siteone-title')
    expect(html).toContain('no cross-provider health score')
    expect(html).not.toContain('attention:wqt:collection-siteone-current')
  })
  it('preserves exact changed evidence and explicit coverage unknown wording', async () => {
    const changed = renderToStaticMarkup(<Technical projection={await loadTechnicalFixture('changed', shell)} shell={shell} fixture="changed" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(changed).toContain('Baseline: Harbor')
    expect(changed).toContain('Current: Harbor services')
    expect(changed).toContain('attention:evidence-diff:page-title')
    const changedProjection = await loadTechnicalFixture('changed', shell)
    const explicitNull = renderToStaticMarkup(<Technical projection={{ ...changedProjection, diff: { ...changedProjection.diff!, entries: changedProjection.diff!.entries.map((entry) => ({ ...entry, baselineValue: null })) } }} shell={shell} fixture="changed" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(explicitNull).toContain('Baseline: Explicit null supplied')
    const unknown = renderToStaticMarkup(<Technical projection={await loadTechnicalFixture('coverage-unknown', shell)} shell={shell} fixture="coverage-unknown" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(unknown).toContain('not proven disappearance, regression, failure, or zero')
    expect(unknown).not.toContain('missing from current')
  })
  it('keeps candidate, IndexNow notification, observed zero, and quiet context bounded', async () => {
    const html = renderToStaticMarkup(<Technical projection={await loadTechnicalFixture('discovery-candidate', shell)} shell={shell} fixture="discovery-candidate" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(html).toContain('canonical divergence candidate')
    expect(html).toContain('notification evidence only')
    expect(html).toContain('1 queries, 0 clicks, 5 impressions')
    expect(html).toContain('attention:discovery:services')
    expect(html).toContain('very-long-synthetic-reference-that-wraps')
    const quiet = renderToStaticMarkup(<Technical projection={await loadTechnicalFixture('quiet', shell)} shell={shell} fixture="quiet" chooseFixture={noop} inspect={noop} review={noop}/> )
    expect(quiet).toContain('not a universal healthy-site claim')
  })
})
