import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version || '1.0.0',
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      return event
    },
  })
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!__DEV__) {
    Sentry.captureException(error, { extra: context })
  } else {
    console.error('Error:', error, context)
  }
}

export function setMonitoringUser(userId: string, username: string) {
  Sentry.setUser({ id: userId, username })
}
