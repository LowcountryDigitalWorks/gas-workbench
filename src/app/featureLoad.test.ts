import { describe, expect, it } from 'vitest'
import { currentFeatureLoad, keepsCurrentViewOnFixtureChange, technicalShellAllowsLoad, technicalShellInstruction, type FeatureLoad } from './featureLoad'

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

  it('loads Technical only for the Technical review shell and keeps that view', () => {
    expect(technicalShellAllowsLoad('quiet')).toBe(false)
    expect(technicalShellAllowsLoad('technical-review')).toBe(true)
    expect(technicalShellInstruction).toContain('Choose Technical review')
    expect(technicalShellInstruction).not.toContain('identities do not match')
    expect(keepsCurrentViewOnFixtureChange('technical', 'technical-review')).toBe(true)
    expect(keepsCurrentViewOnFixtureChange('technical', 'quiet')).toBe(false)
    expect(keepsCurrentViewOnFixtureChange('home', 'technical-review')).toBe(false)
    expect(keepsCurrentViewOnFixtureChange('evidence', 'technical-review')).toBe(false)
  })

  it('does not display errors from a previous selection or shell', () => {
    const error: Result = { fixture: 'limited', source: shell, error: 'Old selection invalid' }
    expect(currentFeatureLoad(error, 'ready', shell)).toBeUndefined()
    expect(currentFeatureLoad(error, 'limited', { ...shell })).toBeUndefined()
    expect(currentFeatureLoad(error, 'limited', shell)?.error).toBe('Old selection invalid')
  })
})
