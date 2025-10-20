/**
 * Thin analytics wrapper that no-ops in development.
 * Replace window.analytics with your real provider later (e.g., GA4, PostHog).
 *
 * @param event - The name of the event being tracked (e.g., "join_waitlist")
 * @param props - Optional metadata about the event (e.g., { email_hint: "you@..." })
 */
export function track(event: string, props?: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).analytics?.track?.(event, props);
}
