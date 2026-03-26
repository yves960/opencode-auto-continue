/**
 * OpenCode Auto-Continue Plugin
 *
 * Automatically sends "继续" when the model encounters errors (429, rate limits, etc.)
 * This keeps the conversation going without manual intervention.
 */

import type { Plugin } from '@opencode-ai/plugin'

// Error patterns that should trigger auto-continue
const RETRYABLE_ERRORS = [
  /429/,
  /rate limit/i,
  /too many requests/i,
  /overloaded/i,
  /temporarily unavailable/i,
  /service unavailable/i,
  /timeout/i,
  /timed out/i,
  /connection.*reset/i,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /ENOTFOUND/,
  /network/i,
  /retry/i,
  // Model response validation errors
  /TypeValidation/i,
  /Type validation failed/i,
  /validation error/i,
  /invalid response/i,
  /parse error/i,
  /JSON/i,
  /unexpected token/i,
  /failed to parse/i,
]

// Cooldown to prevent spam (in milliseconds)
const COOLDOWN_MS = 3000
let lastAutoContinue = 0

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false

  const errorStr = String(error)

  for (const pattern of RETRYABLE_ERRORS) {
    if (pattern.test(errorStr)) {
      return true
    }
  }

  return false
}

/**
 * Check if we're in cooldown period
 */
function isInCooldown(): boolean {
  const now = Date.now()
  if (now - lastAutoContinue < COOLDOWN_MS) {
    return true
  }
  lastAutoContinue = now
  return false
}

export const AutoContinuePlugin: Plugin = async ({ client }) => {
  await client.app.log({
    body: {
      service: 'auto-continue',
      level: 'info',
      message: 'Auto-continue plugin initialized',
    },
  })

  return {
    // Listen for session errors
    event: async ({ event }) => {
      // Only handle session.error events
      if (event.type !== 'session.error') return

      await client.app.log({
        body: {
          service: 'auto-continue',
          level: 'debug',
          message: 'Session error detected',
          extra: { event },
        },
      })

      // Check if this is a retryable error
      const error = (event as any).error || (event as any).properties?.error
      if (!isRetryableError(error)) {
        await client.app.log({
          body: {
            service: 'auto-continue',
            level: 'debug',
            message: 'Error is not retryable, skipping',
            extra: { error: String(error) },
          },
        })
        return
      }

      // Check cooldown
      if (isInCooldown()) {
        await client.app.log({
          body: {
            service: 'auto-continue',
            level: 'debug',
            message: 'In cooldown period, skipping',
          },
        })
        return
      }

      // Get session ID from event
      const sessionId = (event as any).sessionId || (event as any).properties?.sessionId
      if (!sessionId) {
        await client.app.log({
          body: {
            service: 'auto-continue',
            level: 'warn',
            message: 'No session ID in error event',
          },
        })
        return
      }

      await client.app.log({
        body: {
          service: 'auto-continue',
          level: 'info',
          message: 'Auto-sending continue message',
          extra: { sessionId },
        },
      })

      try {
        // Send "继续" to continue the conversation
        await client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: 'text', text: '继续' }],
          },
        })

        // Show a toast to inform the user
        await client.tui.showToast({
          body: {
            message: 'Auto-continue: 检测到错误，已自动发送"继续"',
            variant: 'info',
          },
        })
      } catch (e) {
        await client.app.log({
          body: {
            service: 'auto-continue',
            level: 'error',
            message: 'Failed to send auto-continue',
            extra: { error: String(e) },
          },
        })
      }
    },
  }
}