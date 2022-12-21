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

export const makeMultipartMixedRequest = ({
  boundary,
  requests
}: MakeMultipartMixedRequestInput): MultipartMixedRequest => {
  const { body, batchUrl } = makeMultipartMixedRequestBody({
    boundary,
    requests
  })
  return {
    body,
    method: 'POST',
    batchUrl,
    headers: {
      'Content-Type': `multipart/mixed; boundary="${boundary}"`
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
