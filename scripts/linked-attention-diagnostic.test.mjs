import test from 'node:test'
import assert from 'node:assert/strict'
import { formatLinkedAttentionDiagnostic } from './linked-attention-diagnostic.mjs'

test('captures fixed synthetic state without adding inferred causes', () => {
  const text = formatLinkedAttentionDiagnostic({ view: 'attention', viewport: 375, focusTag: 'BUTTON', focusIsLinkedButton: false, attentionDetailPresent: true, selectedPressedCount: 1, expectedSyntheticAttentionSelected: true })
  const value = JSON.parse(text.slice('BROWSER_QA_DIAGNOSTIC='.length))
  assert.equal(value.status, 'captured')
  assert.equal(value.view, 'attention')
  assert.equal(value.viewport, 375)
  assert.equal(value.selectedPressedCount, 1)
  assert.equal(value.expectedSyntheticAttentionSelected, true)
  assert.equal(value.draftButtonPresent, false)
})

test('unknown fields and secret/DOM/URL strings are never emitted', () => {
  const secret = 'LDW_NOT_A_REAL_SECRET_123456789'
  const text = formatLinkedAttentionDiagnostic({ view: secret, focusTag: secret, viewport: secret, userInput: secret, href: `https://example.com/?token=${secret}`, outerHTML: `<p>${secret}</p>`, activeText: secret })
  assert.doesNotMatch(text, /LDW_NOT_A_REAL_SECRET|outerHTML|userInput|href|activeText/)
  const parsed = JSON.parse(text.split('=')[1])
  assert.equal(parsed.view, 'unknown')
  assert.equal(parsed.focusTag, 'OTHER')
  assert.equal(parsed.viewport, null)
})

test('unavailable diagnostic and malformed types fail into stable sentinel', () => {
  for (const value of [undefined, null, 2, [], false, 'private']) {
    assert.equal(formatLinkedAttentionDiagnostic(value), 'BROWSER_QA_DIAGNOSTIC={"status":"unavailable"}')
  }
})

test('counts and viewport are bounded and never rounded or inferred', () => {
  for (const value of [-1, 1.2, 33, '1', Infinity, NaN]) {
    const diag = JSON.parse(formatLinkedAttentionDiagnostic({ selectedPressedCount: value }).split('=')[1])
    assert.equal(diag.selectedPressedCount, null)
  }
  for (const value of [199, 3841, 375.1, '375']) {
    const diag = JSON.parse(formatLinkedAttentionDiagnostic({ viewport: value }).split('=')[1])
    assert.equal(diag.viewport, null)
  }
})

test('no arbitrary truthy values become true booleans', () => {
  const diag = JSON.parse(formatLinkedAttentionDiagnostic({ linkedButtonPresent: 'true', attentionDetailPresent: 1, focusIsLinkedButton: {} }).split('=')[1])
  assert.equal(diag.linkedButtonPresent, false)
  assert.equal(diag.attentionDetailPresent, false)
  assert.equal(diag.focusIsLinkedButton, false)
})
