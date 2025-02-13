// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever your app is running on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://22e26f79fbf7489e635737d965c5e6d4@o4508306795921408.ingest.us.sentry.io/4508533690335232",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
