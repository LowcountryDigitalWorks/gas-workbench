import type { WorkbenchProjection } from '../../engine/projection'

export function createReviewNote(
  projection: WorkbenchProjection,
  attentionId: string,
  disposition: string,
  rationale: string,
): string {
  const item = projection.workspace.attention.find(
    (row) => row.id === attentionId,
  )
  if (!item)
    throw new Error(
      'Select an Attention item from this snapshot before preparing a draft.',
    )
  const body = rationale.trim()
  if (!body || body.length > 2000)
    throw new Error('Enter a human rationale between 1 and 2,000 characters.')
  if (
    !['Request review', 'Consider deferral', 'Consider dismissal'].includes(
      disposition,
    )
  )
    throw new Error('Choose a supported presentation disposition.')
  return [
    'G.A.S. Workbench — SYNTHETIC HUMAN REVIEW NOTE',
    'DRAFT ONLY — NOT AN ENGINE ACTION ARTIFACT OR RECORDED DECISION',
    'This plain-text note requires a human handoff and trusted-host validation. It cannot be applied by the engine.',
    '',
    `Workspace: ${projection.source.workspaceId}`,
    `Snapshot: ${projection.workspace.generatedAt}`,
    `Evaluated: ${projection.workspace.evaluatedAt}`,
    `Source version: ${projection.source.artifactVersion}`,
    `Scope: ${projection.workspace.scope.siteScopeRevisionId}`,
    `Tenant: ${projection.workspace.scope.tenantId}`,
    `Site: ${projection.workspace.scope.siteId}`,
    `Target: ${projection.workspace.trustedTarget}`,
    `Attention: ${item.id}`,
    `Evidence: ${item.evidenceIdentity}`,
    `Page: ${item.identity.url ?? 'Not supplied'}`,
    ...item.readinessContext.map((reason) => `Limitation: ${reason}`),
    '',
    `Human draft disposition: ${disposition}`,
    `Human rationale: ${body}`,
  ].join('\n')
}
