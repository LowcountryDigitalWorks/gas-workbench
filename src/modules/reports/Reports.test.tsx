import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import shellJson from '../../engine/fixtures/human-review.json'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import { decodeReportProjection } from '../../engine/report-projection'
import { reportFixtureData } from '../../engine/reportFixtures'
import { Reports } from './Reports'

const shell = decodeWorkbenchProjection(shellJson)
function render(id: keyof typeof reportFixtureData) {
  return renderToStaticMarkup(<Reports projection={decodeReportProjection(reportFixtureData[id], shell)} fixture={id} chooseFixture={() => undefined} />)
}

describe('Reports', () => {
  it('renders the customer-safe body as the primary report surface', () => {
    const html = render('focused-evidence')
    expect(html).toContain('Customer-safe report')
    expect(html).toContain('Primary report focus')
    expect(html).toContain('not an automatic priority or business-impact ranking')
    expect(html).toContain('Download supplied JSON')
    expect(html).toContain('Print customer-safe body / save PDF')
  })

  it('does not manufacture observed-change narrative for the quiet walkthrough', () => {
    const html = render('quiet-report')
    expect(html).toContain('No supplied observed-change narrative')
    expect(html).toContain('does not manufacture one from metric deltas')
    expect(html).not.toContain('Internal appendix · not customer narrative')
  })

  it('labels supplied outcomes as human or trusted-caller authored', () => {
    const html = render('decision-outcome')
    expect(html).toContain('Human / trusted-caller authored outcomes')
    expect(html).toContain('human authored')
    expect(html).toContain('Attribution: none')
    expect(html).not.toContain('caused revenue')
  })

  it('keeps internal appendix references outside the customer-safe report paper', () => {
    const html = render('internal-appendix')
    const customerStart = html.indexOf('report-paper report-customer-body')
    const internalStart = html.indexOf('report-internal')
    expect(customerStart).toBeGreaterThanOrEqual(0)
    expect(internalStart).toBeGreaterThan(customerStart)
    expect(html).toContain('Internal provenance only')
    expect(html).toContain('attention:page-focus:services')
  })
})
