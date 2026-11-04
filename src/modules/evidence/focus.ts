/**
 * Pure presentation-only choice for a focus return after closing a source
 * inspector. A connected row inside a closed <details> is not focusable.
 * Use layout rects to fail over to the visible source-search input, never a
 * hidden or detached button. This does not inspect or change evidence state.
 */
export type EvidenceFocusCandidate = Pick<HTMLElement, 'isConnected' | 'getClientRects' | 'focus'>

export function selectEvidenceReturnFocusTarget(
  selectedRow?: EvidenceFocusCandidate | null,
  searchInput?: EvidenceFocusCandidate | null,
): EvidenceFocusCandidate | undefined {
  for (const candidate of [selectedRow, searchInput]) {
    if (candidate?.isConnected && candidate.getClientRects().length > 0) return candidate
  }
  return undefined
}
