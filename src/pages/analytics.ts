/**
 * Thin analytics wrapper that no-ops in development.
 * Replace window.analytics with your provider (GA4, PostHog, etc.).
 */
export function track(event: string, props?: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).analytics?.track?.(event, props);
}
