// Explicitly allowlisted synthetic browser-QA state only; no raw DOM, URL, or input data.
const VIEWS = new Set(['home', 'visibility', 'technical', 'evidence', 'attention', 'decisions', 'measurement', 'reports', 'portfolio'])
const TAGS = new Set(['BUTTON', 'A', 'H1', 'H2', 'MAIN', 'BODY', 'INPUT', 'SELECT', 'TEXTAREA'])

export function formatLinkedAttentionDiagnostic(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return 'BROWSER_QA_DIAGNOSTIC=' + JSON.stringify({ status: 'unavailable' })
  }
  const safe = {
    status: 'captured',
    view: VIEWS.has(state.view) ? state.view : 'unknown',
    viewport: Number.isInteger(state.viewport) && state.viewport >= 200 && state.viewport <= 3840 ? state.viewport : null,
    focusTag: TAGS.has(state.focusTag) ? state.focusTag : 'OTHER',
    focusIsLinkedButton: state.focusIsLinkedButton === true,
    focusIsAttentionButton: state.focusIsAttentionButton === true,
    linkedButtonPresent: state.linkedButtonPresent === true,
    sourceInspectorPresent: state.sourceInspectorPresent === true,
    attentionListPresent: state.attentionListPresent === true,
    attentionDetailPresent: state.attentionDetailPresent === true,
    draftButtonPresent: state.draftButtonPresent === true,
    selectedPressedCount: Number.isInteger(state.selectedPressedCount) && state.selectedPressedCount >= 0 && state.selectedPressedCount <= 32 ? state.selectedPressedCount : null,
    expectedSyntheticAttentionSelected: state.expectedSyntheticAttentionSelected === true,
  }
  return 'BROWSER_QA_DIAGNOSTIC=' + JSON.stringify(safe)
}
