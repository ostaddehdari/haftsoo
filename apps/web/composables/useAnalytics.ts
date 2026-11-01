type AnalyticsEvent = { event: string; [key: string]: string | number | boolean };

declare global {
  interface Window { dataLayer?: AnalyticsEvent[] }
}

export function useAnalytics() {
  const track = (event: string, payload: Omit<AnalyticsEvent, "event"> = {}) => {
    if (!import.meta.client || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  };
  return { track };
}
