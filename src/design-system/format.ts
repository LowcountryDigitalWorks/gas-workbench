export const readable = (value: string) => value.replaceAll('_', ' ')
export const moduleName = (value: string) =>
  ({
    search_analytics: 'Search Analytics',
    ai_visibility: 'AI Visibility',
    page_focus: 'Page Focus',
    evidence_diff: 'Evidence Changes',
    review_history: 'Review History',
    search_change: 'Search Change',
    discovery_diagnostics: 'Discovery Diagnostics',
  })[value] ?? readable(value)
export const providerName = (value: string) =>
  ({
    'google-search-console': 'Google Search Console',
    zerorank: 'ZeroRank',
    'bing-webmaster-ai-performance': 'Bing AI Performance',
  })[value] ?? value
export function timestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

export function siteName(target: string) {
  try {
    return new URL(target).hostname || target
  } catch {
    return target
  }
}
