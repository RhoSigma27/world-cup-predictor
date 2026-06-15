// lib/predictionsLock.js
// Central source of truth for the predictions lock.
// Global lock applies to everyone, but a league can have
// predictions_override_until set to push its deadline back.

export const GLOBAL_LOCK_DATE = new Date('2026-06-11T19:59:00Z')

export function isPredictionsLocked(league) {
  const now = new Date()
  if (now < GLOBAL_LOCK_DATE) return false
  const override = league?.predictions_override_until
  if (override && now < new Date(override)) return false
  return true
}

export function getOverrideUntil(league) {
  const override = league?.predictions_override_until
  if (!override) return null
  return new Date(override) > new Date() ? new Date(override) : null
}