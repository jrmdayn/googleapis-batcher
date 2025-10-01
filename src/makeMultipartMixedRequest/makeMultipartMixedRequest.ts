import type { FetchRequest } from '../types.js'
import * as HandlebarsTemplates from './handlebarsTemplates'
import { makeMultipartMixedRequestBody } from './makeMultipartMixedRequestBody'

interface MultipartMixedRequest {
  body: string
  method: string
  batchUrl: string
  headers: Record<string, string>
}

interface MakeMultipartMixedRequestInput {
  requests: ReadonlyArray<FetchRequest>
  boundary: string
}

const extractAuthorizationHeader = (
  headers?: FetchRequest['headers']
): string | undefined => {
  if (!headers) return undefined
  // Headers instance
  const maybeHeaders: unknown = headers
  if (
    typeof maybeHeaders === 'object' &&
    maybeHeaders !== null &&
    typeof (maybeHeaders as { get?: (name: string) => string | null }).get ===
      'function'
  ) {
    const h = maybeHeaders as { get: (name: string) => string | null }
    return h.get('Authorization') ?? h.get('authorization') ?? undefined
  }
  // string[][] form
  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const key = String(entry[0])
        const value = String(entry[1])
        if (key.toLowerCase() === 'authorization') return value
      }
    }
    return undefined
  }
  // Record<string, string> form
  for (const [key, value] of Object.entries(
    headers as Record<string, string>
  )) {
    if (key.toLowerCase() === 'authorization') return value
  }
  return undefined
}

export const makeMultipartMixedRequest = ({
  boundary,
  requests
}: MakeMultipartMixedRequestInput): MultipartMixedRequest => {
  const { body, batchUrl } = makeMultipartMixedRequestBody({
    boundary,
    requests
  })
  const auth = extractAuthorizationHeader(requests[0]?.headers)
  return {
    body,
    method: 'POST',
    batchUrl,
    headers: {
      'Content-Type': `multipart/mixed; boundary="${boundary}"`,
      ...(auth ? { Authorization: auth } : {})
    }
  }
}

export const makeMultipartMixedRequestFullText = (data: {
  requests: ReadonlyArray<FetchRequest>
  boundary: string
}): string => {
  const info = makeMultipartMixedRequest(data)
  return HandlebarsTemplates.useFullTemplate(info)
}
