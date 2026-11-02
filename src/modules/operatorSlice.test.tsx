import { siteName } from '../design-system/format'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadFixture } from '../app/fixtures'
import { Home } from './home/Home'
import { Evidence } from './evidence/Evidence'
import { Attention } from './attention/Attention'
import { DecisionDraft } from './decisions/DecisionDraft'
import { createReviewNote } from './decisions/handoff'
import { filterSources, safeHttpUrl } from './evidence/presentation'
const noop = () => {}

describe('operator slice — supplied meaning and human authority', () => {
  it('explains quiet Attention without inventing a healthy or no-action verdict', async () => {
    const p = await loadFixture('quiet')
    const html = renderToStaticMarkup(
      <Home projection={p} inspect={noop} review={noop} />,
    )
    expect(html).toContain('No Attention items in this snapshot')
    expect(html).toContain('not an all-site health or proven-absence claim')
    expect(html).toContain('Not supplied')
    expect(html).not.toContain('No action needed')
    expect(html).not.toContain('Observed issues: 0')
  })
  it('renders the exact partial-coverage reason and manifest identity', async () => {
    const p = await loadFixture('limited')
    const html = renderToStaticMarkup(
      <Evidence
        projection={p}
        selected="search_analytics"
        select={noop}
        review={noop}
      />,
    )
    expect(html).toContain('current:coverage_partial')
    expect(html).toContain('synthetic:search-window:limited')
    expect(html).toContain('2026-10-01')
    expect(html).toContain('no comparison inferred')
    expect(html).not.toContain('Source periods differ')
  })
  it('renders missing AI evidence as missing rather than an observed zero', async () => {
    const p = await loadFixture('limited')
    const html = renderToStaticMarkup(
      <Evidence
        projection={p}
        selected="ai_visibility"
        select={noop}
        review={noop}
      />,
    )
    expect(html).toContain('This module was not supplied')
    expect(html).not.toContain('Observed issues: 0')
  })
  it('preserves selected Attention, evidence identity, and the supplied validation ceiling', async () => {
    const p = await loadFixture('human-review')
    const html = renderToStaticMarkup(
      <Attention
        items={p.workspace.attention}
        selected={p.workspace.attention[0].id}
        choose={noop}
        inspect={noop}
        draft={noop}
      />,
    )
    expect(html).toContain('attention:page-focus:services')
    expect(html).toContain('synthetic:page-focus:services')
    expect(html).toContain('Separate SERP/result validation is required')
    expect(html).toContain('Prepare decision draft')
  })
  it('separates a local human draft from supplied human decision context', async () => {
    const p = await loadFixture('human-review')
    const html = renderToStaticMarkup(
      <DecisionDraft
        projection={p}
        attentionId={p.workspace.attention[0].id}
        draft={{ rationale: '', disposition: 'Request review' }}
        update={noop}
        back={noop}
      />,
    )
    expect(html).toContain('Decision draft')
    expect(html).toContain('Not recorded')
    expect(html).toContain('Supplied human decision context')
    expect(html).toContain('decision:synthetic-investigate-services')
    expect(html).not.toContain('Decision recorded successfully')
  })
  it('cannot create a draft handoff without a current-snapshot Attention reference', async () => {
    const p = await loadFixture('quiet')
    expect(() =>
      createReviewNote(
        p,
        'attention:page-focus:services',
        'Request review',
        'A rationale',
      ),
    ).toThrow('Select an Attention item')
  })
  it('requires nonblank bounded rationale and a presentation-only disposition', async () => {
    const p = await loadFixture('human-review'),
      id = p.workspace.attention[0].id
    expect(() => createReviewNote(p, id, 'Request review', '   ')).toThrow(
      'human rationale',
    )
    expect(() =>
      createReviewNote(p, id, 'Request review', 'x'.repeat(2001)),
    ).toThrow('human rationale')
    expect(() =>
      createReviewNote(p, id, 'Execute production action', 'A rationale'),
    ).toThrow('presentation disposition')
  })
  it('exports an explicitly non-executable note without mutating supplied state', async () => {
    const p = await loadFixture('human-review'),
      before = JSON.stringify(p)
    const note = createReviewNote(
      p,
      p.workspace.attention[0].id,
      'Request review',
      'Inspect the evidence.',
    )
    expect(note).toContain('NOT AN ENGINE ACTION ARTIFACT OR RECORDED DECISION')
    expect(note).toContain('workspace:synthetic-human-review-001')
    expect(note).toContain('attention:page-focus:services')
    expect(note).toContain('synthetic:page-focus:services')
    expect(note).toContain('Separate SERP/result validation')
    expect(JSON.stringify(p)).toBe(before)
  })
  it('filters by exact source identity and preserves the original snapshot', async () => {
    const p = await loadFixture('limited'),
      before = JSON.stringify(p)
    expect(
      filterSources(
        p.workspace.readiness,
        p.workspace.sourceManifest,
        'synthetic:search-window:limited',
        'all',
      ).map((s) => s.moduleId),
    ).toEqual(['search_analytics'])
    expect(
      filterSources(
        p.workspace.readiness,
        p.workspace.sourceManifest,
        '',
        'not_supplied',
      ),
    ).toHaveLength(6)
    expect(
      filterSources(
        p.workspace.readiness,
        p.workspace.sourceManifest,
        'absent-text',
        'all',
      ),
    ).toHaveLength(0)
    expect(JSON.stringify(p)).toBe(before)
  })
  it('displays a malformed target as escaped text instead of throwing during render', () => {
    expect(siteName('not-a-url')).toBe('not-a-url')
    expect(siteName('https://harbor-demo.example/path')).toBe(
      'harbor-demo.example',
    )
  })

  it('never turns an unsafe or credential-bearing reference into a clickable link', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,anything',
      'https://user:secret@example.test',
      'not a url',
    ])
      expect(safeHttpUrl(url)).toBeUndefined()
    expect(safeHttpUrl('https://harbor-demo.example/services')).toBe(
      'https://harbor-demo.example/services',
    )
  })
  it('escapes long untrusted reference text rather than rendering markup', async () => {
    const p = await loadFixture('human-review')
    const row = {
      ...p.workspace.attention[0],
      evidenceIdentity:
        '<script>alert(1)</script>' + 'long-reference-'.repeat(40),
    }
    const html = renderToStaticMarkup(
      <Attention
        items={[row]}
        selected={row.id}
        choose={noop}
        inspect={noop}
        draft={noop}
      />,
    )
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('long-reference-'.repeat(40))
  })
})
