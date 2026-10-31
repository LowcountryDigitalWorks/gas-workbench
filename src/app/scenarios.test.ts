import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LimitationsPanel } from './App'
import { decodeScenario, workbenchScenarios } from './scenarios'

describe('Workbench shell scenarios', () => {
  it('preserves the accepted quiet projection without inventing Attention state', () => {
    const result = workbenchScenarios.quiet
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return

    const { workspace } = result.scenario.projection
    expect(workspace.navigation.overview.attentionCount).toBe(0)
    expect(workspace.attention).toHaveLength(0)
    expect(workspace.sourceManifest.map((entry) => entry.readiness)).toEqual(['ready', 'ready'])
    expect(workspace.decisionCycle).toBeUndefined()
  })

  it('keeps partial coverage explicit in the limited projection', () => {
    const result = workbenchScenarios.limited
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return

    const searchAnalytics = result.scenario.projection.workspace.readiness.find(
      (entry) => entry.moduleId === 'search_analytics',
    )
    expect(searchAnalytics).toEqual({
      moduleId: 'search_analytics',
      state: 'limited',
      reasons: ['current:coverage_partial'],
    })
  })

  it('preserves exact evidence, Attention, and human-decision references', () => {
    const result = workbenchScenarios['human-review']
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return

    const { workspace } = result.scenario.projection
    expect(workspace.attention).toHaveLength(1)
    expect(workspace.evidenceRows[0]?.id).toBe(workspace.attention[0]?.id)
    expect(workspace.decisionCycle?.decision.selectedAttentionIds).toEqual([
      workspace.attention[0]?.id,
    ])
    expect(workspace.navigation.attention.semantics).toBe('human_review_selection_not_priority')
  })

  it('renders every supplied human-review limitation with native disclosure', () => {
    const result = workbenchScenarios['human-review']
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return

    const { limitations } = result.scenario.projection.workspace
    const markup = renderToStaticMarkup(createElement(LimitationsPanel, { limitations }))

    expect(markup).toContain('<details')
    expect(markup).toContain('<summary>')
    expect(markup.match(/<li/g)).toHaveLength(limitations.length)
    expect(markup).toContain(`Show all ${limitations.length} supplied limitations`)
  })

  it('fails visibly when the projection boundary rejects an unsupported version', () => {
    const result = decodeScenario({
      label: 'Unsupported fixture',
      shortLabel: 'Unsupported',
      description: 'Synthetic negative proof.',
      fixture: {
        schemaVersion: 'ldw.gas-workbench-projection.v2',
        schemaMinorVersion: 0,
        source: {},
        workspace: {},
      },
    })

    expect(result).toMatchObject({
      status: 'error',
      code: 'unsupported_projection_version',
    })
  })
})
