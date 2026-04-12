import { createHmac, timingSafeEqual } from 'crypto'

function getCompletionTokenSecret() {
  return process.env.COMPLETION_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY || 'development-completion-token-secret'
}

export function generateCompletionToken(bookingId: string, clientId: string) {
  return createHmac('sha256', getCompletionTokenSecret())
    .update(`${bookingId}:${clientId}`)
    .digest('hex')
}

export function verifyCompletionToken(bookingId: string, clientId: string, token: string) {
  const expectedToken = generateCompletionToken(bookingId, clientId)

  if (token.length !== expectedToken.length) {
    return false
  }

  return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
}
