export const securityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  },
  session: {
    duration: 3600,
    renewalWindow: 300
  },
  audit: {
    enabled: true,
    retention: 90 // days
  }
}
