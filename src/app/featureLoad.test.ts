import { describe, expect, it } from 'vitest'
import { currentFeatureLoad, type FeatureLoad } from './featureLoad'

interface FakeShell { readonly workspaceId: string }
type CaseId = 'ready' | 'limited'
type Result = FeatureLoad<{ label: string }, CaseId, FakeShell>

describe('feature loading is scoped to the selected case and decoded shell', () => {
  const shell: FakeShell = { workspaceId: 'synthetic:workspace-one' }
  const result: Result = { fixture: 'ready', source: shell, value: { label: 'ready evidence' } }

  it('returns the checked projection only for the exact same case and shell object', () => {
    expect(currentFeatureLoad(result, 'ready', shell)).toBe(result)
    expect(currentFeatureLoad(result, 'limited', shell)).toBeUndefined()
    expect(currentFeatureLoad(result, 'ready', { ...shell })).toBeUndefined()
    expect(currentFeatureLoad(result, 'ready', undefined)).toBeUndefined()
  })

  it('does not display errors from a previous selection or shell', () => {
    const error: Result = { fixture: 'limited', source: shell, error: 'Old selection invalid' }
    expect(currentFeatureLoad(error, 'ready', shell)).toBeUndefined()
    expect(currentFeatureLoad(error, 'limited', { ...shell })).toBeUndefined()
    expect(currentFeatureLoad(error, 'limited', shell)?.error).toBe('Old selection invalid')
  })
})
