// Synthetic-only browser-QA timeout context. Never serialize arbitrary DOM text.
const SELECTED_CASES = new Set([
  'quiet-report', 'focused-evidence', 'decision-outcome', 'internal-appendix',
])
const FOCUS_TAGS = new Set(['SELECT', 'BUTTON', 'H1', 'H2', 'MAIN', 'BODY', 'OTHER'])

export function formatReportWalkthroughDiagnostic(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return 'BROWSER_QA_REPORT_DIAGNOSTIC=' + JSON.stringify({ status: 'unavailable' })
  }
  const safe = {
    status: 'captured',
    selectedReportCase: SELECTED_CASES.has(state.selectedReportCase) ? state.selectedReportCase : 'unknown',
    focusTag: FOCUS_TAGS.has(state.focusTag) ? state.focusTag : 'OTHER',
    focusIsReportSelect: state.focusIsReportSelect === true,
    reportViewPresent: state.reportViewPresent === true,
    reportPaperPresent: state.reportPaperPresent === true,
    reportTitleMatchesExpected: state.reportTitleMatchesExpected === true,
    reportErrorPresent: state.reportErrorPresent === true,
    reportLoadingPresent: state.reportLoadingPresent === true,
    reportOutcomeFixturePressed: state.reportOutcomeFixturePressed === true,
    fixturePressedCount: Number.isInteger(state.fixturePressedCount) && state.fixturePressedCount >= 0 && state.fixturePressedCount <= 7 ? state.fixturePressedCount : null,
    viewport: Number.isInteger(state.viewport) && state.viewport >= 200 && state.viewport <= 3840 ? state.viewport : null,
  }
  return 'BROWSER_QA_REPORT_DIAGNOSTIC=' + JSON.stringify(safe)
}
