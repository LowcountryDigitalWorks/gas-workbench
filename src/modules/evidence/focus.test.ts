import { describe, expect, it, vi } from 'vitest'
import { selectEvidenceReturnFocusTarget } from './focus'
import type { EvidenceFocusCandidate } from './focus'

function target(connected: boolean, visible: boolean, actuallyVisible = visible) {
  const focus = vi.fn()
  const candidate = {
    isConnected: connected,
    getClientRects: () => ({ length: visible ? 1 : 0 }) as DOMRectList,
    checkVisibility: vi.fn(() => actuallyVisible),
    focus,
  } satisfies EvidenceFocusCandidate
  return { candidate, focus }
}

describe('Evidence inspector focus return', () => {
  it('returns to the visible selected source row when it remains in the ledger', () => {
    const selected = target(true, true)
    const search = target(true, true)
    const choice = selectEvidenceReturnFocusTarget(selected.candidate, search.candidate)
    expect(choice).toBe(selected.candidate)
    choice?.focus()
    expect(selected.focus).toHaveBeenCalledOnce()
    expect(search.focus).not.toHaveBeenCalled()
  })

  it('skips a selected not-supplied row hidden in closed details and returns to search', () => {
    const hiddenSelected = target(true, false)
    const search = target(true, true)
    const choice = selectEvidenceReturnFocusTarget(hiddenSelected.candidate, search.candidate)
    expect(choice).toBe(search.candidate)
    choice?.focus()
    expect(hiddenSelected.focus).not.toHaveBeenCalled()
    expect(search.focus).toHaveBeenCalledOnce()
  })

  it('rejects a connected selected source with a nonempty Chrome rect but hidden by closed details', () => {
    // Real Chrome 156: closed <details> child reported getClientRects().length=1
    // and checkVisibility({ checkVisibilityCSS:true, checkOpacity:true })=false.
    const closedDisclosureRow = target(true, true, false)
    const search = target(true, true)
    const choice = selectEvidenceReturnFocusTarget(closedDisclosureRow.candidate, search.candidate)
    expect(closedDisclosureRow.candidate.getClientRects().length).toBe(1)
    expect(closedDisclosureRow.candidate.checkVisibility).toHaveBeenCalledTimes(1)
    expect(closedDisclosureRow.candidate.checkVisibility).toHaveBeenCalledWith({
      checkVisibilityCSS: true,
      checkOpacity: true,
    })
    expect(search.candidate.checkVisibility).toHaveBeenCalledWith({
      checkVisibilityCSS: true,
      checkOpacity: true,
    })
    expect(choice).toBe(search.candidate)
    choice?.focus()
    expect(closedDisclosureRow.focus).not.toHaveBeenCalled()
    expect(search.focus).toHaveBeenCalledOnce()
  })

  it('skips a detached row removed by filtering and chooses the visible search input', () => {
    const detached = target(false, true)
    const search = target(true, true)
    expect(selectEvidenceReturnFocusTarget(detached.candidate, search.candidate)).toBe(search.candidate)
  })

  it('does not attempt to focus a hidden, detached, or missing fallback', () => {
    const hidden = target(true, false)
    const detached = target(false, true)
    expect(selectEvidenceReturnFocusTarget(hidden.candidate, detached.candidate)).toBeUndefined()
    expect(selectEvidenceReturnFocusTarget(undefined, undefined)).toBeUndefined()
    expect(hidden.focus).not.toHaveBeenCalled()
    expect(detached.focus).not.toHaveBeenCalled()
  })
})
