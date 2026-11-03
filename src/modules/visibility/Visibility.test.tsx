import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import shellJson from '../../engine/fixtures/visibility-review.json'
import comparable from '../../engine/fixtures/visibility/comparable-search.json'
import { parseVisibilityProjection } from '../../engine/visibility-projection'
import { Visibility } from './Visibility'

const shell = decodeWorkbenchProjection(shellJson)
const noop = () => {}

describe('Visibility presentation', () => {
  it('shows source identity, supported comparison and linked unranked handoff', () => {
    const html = renderToStaticMarkup(<Visibility projection={parseVisibilityProjection(comparable)} shell={shell} fixture="comparable-search" chooseFixture={noop} inspect={noop} review={noop} />)
    expect(html).toContain('synthetic:search-performance:text:october')
    expect(html).toContain('Engine-supplied comparison: comparable')
    expect(html).toContain('Review in Attention')
    expect(html).toContain('attention:search-analytics:visibility-services')
  })
  it('preserves unknown and unavailable metrics without converting them to zero', async () => {
    const json = (await import('../../engine/fixtures/visibility/ai-limited.json')).default
    const feature = parseVisibilityProjection(json)
    const html = renderToStaticMarkup(<Visibility projection={feature} shell={shell} fixture="ai-limited" chooseFixture={noop} inspect={noop} review={noop} />)
    expect(html).toContain('Current: Not supplied')
    expect(html).toContain('Observed zero is distinct from unavailable evidence.')
    expect(html).not.toContain('Universal Visibility score')
  })
  it('shows discontinuous numbers without trend language', async () => {
    const json = (await import('../../engine/fixtures/visibility/source-discontinuity.json')).default
    const feature = parseVisibilityProjection(json)
    const html = renderToStaticMarkup(<Visibility projection={feature} shell={shell} fixture="source-discontinuity" chooseFixture={noop} inspect={noop} review={noop} />)
    expect(html).toContain('Comparison unavailable — source universe changed')
    expect(html).toContain('80 clicks')
    expect(html).not.toContain('engine-supplied comparison: comparable')
  })
  it('keeps fixture control focused-in-place while new evidence loads or fails', () => {
    const pending = renderToStaticMarkup(<Visibility shell={shell} fixture="source-discontinuity" chooseFixture={noop} inspect={noop} review={noop} />)
    expect(pending).toContain('aria-busy="true"')
    expect(pending).toContain('Visibility evidence fixture')
    expect(pending).toContain('Checking Visibility projection')
    expect(pending).not.toContain('synthetic:search-performance:text:october')
    const failed = renderToStaticMarkup(<Visibility shell={shell} fixture="source-discontinuity" error="Snapshot mismatch" chooseFixture={noop} inspect={noop} review={noop} />)
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('aria-busy="false"')
    expect(failed).toContain('Snapshot mismatch')
  })
})
