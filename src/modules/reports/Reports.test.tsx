import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import humanShellJson from '../../engine/fixtures/human-review.json'
import outcomeShellJson from '../../engine/fixtures/report-outcome.json'
import internalShellJson from '../../engine/fixtures/report-internal.json'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import { decodeReportProjection } from '../../engine/report-projection'
import { reportFixtureData } from '../../engine/reportFixtures'
import type { ReportFixtureId } from '../../engine/reportFixtures'
import { Reports } from './Reports'

const humanShell = decodeWorkbenchProjection(humanShellJson)
const outcomeShell = decodeWorkbenchProjection(outcomeShellJson)
const internalShell = decodeWorkbenchProjection(internalShellJson)
function shellFor(id: ReportFixtureId) {
  if (id === 'decision-outcome') return outcomeShell
  if (id === 'internal-appendix') return internalShell
  return humanShell
}
async function render(id: ReportFixtureId) {
  const projection = await decodeReportProjection(reportFixtureData[id], shellFor(id))
  return renderToStaticMarkup(<Reports projection={projection} fixture={id} chooseFixture={() => undefined} />)
}

describe('Reports', () => {
  it('renders the customer-safe body as the primary report surface', async () => {
    const html = await render('focused-evidence')
    expect(html).toContain('Customer-safe report')
    expect(html).toContain('Primary report focus')
    expect(html).toContain('not an automatic priority or business-impact ranking')
    expect(html).toContain('Download supplied JSON')
    expect(html).toContain('Print customer-safe body / save PDF')
  })

  it('does not manufacture observed-change narrative for the quiet walkthrough', async () => {
    const html = await render('quiet-report')
    expect(html).toContain('No supplied observed-change narrative')
    expect(html).toContain('does not manufacture one from metric deltas')
    expect(html).not.toContain('Internal appendix · not customer narrative')
  })

  it('labels supplied outcomes as human or trusted-caller authored', async () => {
    const html = await render('decision-outcome')
    expect(html).toContain('Human / trusted-caller authored outcomes')
    expect(html).toContain('human authored')
    expect(html).toContain('Attribution: none')
    expect(html).not.toContain('caused revenue')
  })

  it('keeps verifiable internal appendix references outside the customer-safe report paper', async () => {
    const html = await render('internal-appendix')
    const customerStart = html.indexOf('report-paper report-customer-body')
    const internalStart = html.indexOf('report-internal')
    expect(customerStart).toBeGreaterThanOrEqual(0)
    expect(internalStart).toBeGreaterThan(customerStart)
    expect(html).toContain('Internal provenance only')
    expect(html).toContain('attention:page-focus:services')
    expect(html).toContain('service-brief:synthetic-human-review')
    expect(html).not.toContain('decision-cycle:')
  })
})
