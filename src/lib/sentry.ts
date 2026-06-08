import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

Sentry.init({
  dsn: DSN ?? '',
  enabled: !!DSN && !import.meta.env.DEV,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
})

export { Sentry }
