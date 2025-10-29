export type AnalyticsPayload = Record<string, unknown>;

export const FITAI_OPEN_FROM_HOME_HEADER_EVENT = "fitai_open_from_home_header";
/** @deprecated legacy event kept for backwards compatibility. */
export const FITAI_OPEN_FROM_TAB_EVENT = "fitai_open_from_tab";

export const trackAnalyticsEvent = (
  eventName: string,
  payload: AnalyticsPayload = {}
) => {
  if (typeof window === "undefined") {
    return;
  }

  const anyWindow = window as typeof window & {
    analytics?: { track?: (event: string, data?: AnalyticsPayload) => void };
    lovable?: { track?: (event: string, data?: AnalyticsPayload) => void };
  };

  try {
    const trackers = [
      anyWindow.analytics?.track,
      anyWindow.lovable?.track,
    ].filter(Boolean) as Array<(event: string, data?: AnalyticsPayload) => void>;

    trackers.forEach((track) => track(eventName, payload));

    if (import.meta.env.DEV) {
      console.info(`[analytics] ${eventName}`, payload);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[analytics:error] ${eventName}`, error);
    }
  }
};
