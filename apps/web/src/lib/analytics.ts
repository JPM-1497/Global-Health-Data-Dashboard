const SESSION_KEY = 'global-health-dashboard-session'

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
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
    const payload = {
      event,
      sessionId: getSessionId(),
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
