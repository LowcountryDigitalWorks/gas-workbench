import assert from 'node:assert/strict'
import { test } from 'vitest'
import { formatReportWalkthroughDiagnostic } from './report-walkthrough-diagnostic.mjs'

const parse = (state) => {
  const text = formatReportWalkthroughDiagnostic(state)
  assert.ok(text.startsWith('BROWSER_QA_REPORT_DIAGNOSTIC='))
  return JSON.parse(text.slice('BROWSER_QA_REPORT_DIAGNOSTIC='.length))
}

test('captures only a fixed synthetic report-transition state', () => {
  assert.deepEqual(parse({
    selectedReportCase: 'decision-outcome',
    focusTag: 'SELECT',
    focusIsReportSelect: true,
    reportViewPresent: true,
    reportPaperPresent: false,
    reportTitleMatchesExpected: false,
    reportErrorPresent: true,
    reportLoadingPresent: false,
    reportOutcomeFixturePressed: true,
    fixturePressedCount: 1,
    viewport: 375,
  }), {
    status: 'captured',
    selectedReportCase: 'decision-outcome',
    focusTag: 'SELECT',
    focusIsReportSelect: true,
    reportViewPresent: true,
    reportPaperPresent: false,
    reportTitleMatchesExpected: false,
    reportErrorPresent: true,
    reportLoadingPresent: false,
    reportOutcomeFixturePressed: true,
    fixturePressedCount: 1,
    viewport: 375,
  })
})

test('invalid diagnostic never echoes DOM, URL, credential-like, error or input text', () => {
  const privateText = 'untrusted-private-marker-XYZ987'
  const diagnostic = formatReportWalkthroughDiagnostic({
    selectedReportCase: privateText,
    focusTag: privateText,
    activeText: privateText,
    errorMessage: privateText,
    url: 'https://example.test/?secret=' + privateText,
    innerHTML: privateText,
    inputValue: privateText,
    reportOutcomeFixturePressed: privateText,
  })
  assert.doesNotMatch(diagnostic, /untrusted-private-marker|activeText|errorMessage|innerHTML|inputValue|secret=/)
  const parsed = parse({ selectedReportCase: privateText, focusTag: privateText })
  assert.equal(parsed.selectedReportCase, 'unknown')
  assert.equal(parsed.focusTag, 'OTHER')
})

test('bad or unavailable CDP results retain a fixed unavailable sentinel', () => {
  for (const state of [undefined, null, false, [], 7, 'string']) {
    assert.deepEqual(parse(state), { status: 'unavailable' })
  }
})

test('counts and viewport require bounded exact integers', () => {
  for (const n of [-1, 8, 1.25, '1', NaN, Infinity]) {
    assert.equal(parse({ fixturePressedCount: n }).fixturePressedCount, null)
  }
  for (const n of [199, 3841, 375.1, '375', -0]) {
    if (Object.is(n, -0)) continue
    assert.equal(parse({ viewport: n }).viewport, null)
  }
})

test('truthy strings and objects never become evidence booleans', () => {
  const parsed = parse({ focusIsReportSelect: 'true', reportPaperPresent: 1, reportErrorPresent: {}, reportOutcomeFixturePressed: [] })
  assert.equal(parsed.focusIsReportSelect, false)
  assert.equal(parsed.reportPaperPresent, false)
  assert.equal(parsed.reportErrorPresent, false)
  assert.equal(parsed.reportOutcomeFixturePressed, false)
})

test('all four allowed report case IDs remain distinguishable without copying free-form values', () => {
  for (const id of ['quiet-report', 'focused-evidence', 'decision-outcome', 'internal-appendix']) {
    assert.equal(parse({ selectedReportCase: id }).selectedReportCase, id)
  }
})
