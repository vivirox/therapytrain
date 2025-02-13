import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: "https://dbbfbdb0aead913874b9bcd6a01fe3df@o4508306795921408.ingest.us.sentry.io/4508806356533248",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}); 