const USER_KEY = 'global-health-dashboard-user'
const LEGACY_SESSION_KEY = 'global-health-dashboard-session'

function getUserId(): string {
  let userId = localStorage.getItem(USER_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(USER_KEY, userId)
  }
  return userId
}

export type AnalyticsEventName =
  | 'country_selected'
  | 'year_range_changed'
  | 'tab_changed'
  | 'country_comparison_toggled'
  | 'metric_trend_mode_changed'
  | 'metric_trend_scale_changed'
  | 'metric_selected'
  | 'filter_changed'
  | 'chart_country_added'
  | 'chart_country_removed'

export async function trackEvent(
  event: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const userId = getUserId()
    const payload = {
      event,
      userId,
      sessionId: userId,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
      metadata,
    }

    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Silently ignore analytics failures so the dashboard stays usable.
  }
}
