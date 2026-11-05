/**
 * Pure presentation-only choice for a focus return after closing a source
 * inspector. A connected row inside a closed <details> is not focusable.
 * Layout rectangles alone are insufficient: Chrome can retain a nonzero rect
 * for content hidden by a closed <details>. Require native visibility too;
 * never return focus to a hidden or detached button. Evidence is unchanged.
 */
export type EvidenceFocusCandidate = Pick<HTMLElement, 'isConnected' | 'getClientRects' | 'checkVisibility' | 'focus'>

export function selectEvidenceReturnFocusTarget(
  selectedRow?: EvidenceFocusCandidate | null,
  searchInput?: EvidenceFocusCandidate | null,
): EvidenceFocusCandidate | undefined {
  for (const candidate of [selectedRow, searchInput]) {
    if (candidate?.isConnected && candidate.getClientRects().length > 0 &&
      candidate.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return candidate
  }
  return undefined
}
