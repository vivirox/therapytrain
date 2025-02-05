import React, { useEffect, useState } from 'react';

interface AnalyticsProps {
  onError?: (error: Error) => void;
}

export const AnalyticsWrapper: React.FC<AnalyticsProps> = ({ onError }) => {
  const [hasAnalytics, setHasAnalytics] = useState(false);
  const [hasSpeedInsights, setHasSpeedInsights] = useState(false);

  useEffect(() => {
    // Try to load analytics
    const loadAnalytics = async () => {
      try {
        const { Analytics } = await import('@vercel/analytics/react');
        const AnalyticsComponent = Analytics;
        if (AnalyticsComponent) {
          setHasAnalytics(true);
        }
      } catch (error) {
        console.debug('Analytics not available:', error);
        onError?.(error as Error);
      }
    };

    // Try to load speed insights
    const loadSpeedInsights = async () => {
      try {
        const { SpeedInsights } = await import('@vercel/speed-insights/react');
        const SpeedInsightsComponent = SpeedInsights;
        if (SpeedInsightsComponent) {
          setHasSpeedInsights(true);
        }
      } catch (error) {
        console.debug('Speed Insights not available:', error);
        onError?.(error as Error);
      }
    };

    // Load both components
    loadAnalytics();
    loadSpeedInsights();
  }, [onError]);

  // Only render if the components are available
  return (
    <>
      {hasAnalytics && (
        <React.Suspense fallback={null}>
          {React.createElement(
            React.lazy(() =>
              import('@vercel/analytics/react').then((mod) => ({
                default: mod.Analytics,
              }))
            ),
            {
              beforeSend: (event: any) => {
                if (event.type === 'pageview' || event.type === 'event') {
                  return event;
                }
                return null;
              },
              debug: false,
            }
          )}
        </React.Suspense>
      )}
      {hasSpeedInsights && (
        <React.Suspense fallback={null}>
          {React.createElement(
            React.lazy(() =>
              import('@vercel/speed-insights/react').then((mod) => ({
                default: mod.SpeedInsights,
              }))
            )
          )}
        </React.Suspense>
      )}
    </>
  );
}; 