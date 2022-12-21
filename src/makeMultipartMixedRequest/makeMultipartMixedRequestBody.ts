import { FetchRequest } from '../types.js'
import { guessGoogleapisBatchUrl } from './guessGoogleapisBatchUrl'
import * as HandlebarsTemplates from './handlebarsTemplates'

interface MinimalFetchRequestInfo {
  path: string
  method: string
  headers?: FetchRequest['headers']
  body?: FetchRequest['body']
}

const toMinimalFetchRequestInfo = (
  req: FetchRequest
): [batchUrl: string, minimalRequestInfo: MinimalFetchRequestInfo] => {
  const url = new URL(req.url)
  const batchUrl = guessGoogleapisBatchUrl(url)
  const path = url.href.substring(url.origin.length)
  const minimalRequestInfo: MinimalFetchRequestInfo = {
    method: req.method ?? 'POST',
    body: req.body,
    headers: req.headers,
    path
  }
  return [batchUrl, minimalRequestInfo]
}

const prepareInput = (
  requests: ReadonlyArray<FetchRequest>
): {
  requests: ReadonlyArray<MinimalFetchRequestInfo>
  batchUrl: string
} => {
  const initBatchUrl = 'not_a_valid_url'
  const res: {
    requests: ReadonlyArray<MinimalFetchRequestInfo>
    batchUrl: string
  } = {
    requests: [],
    batchUrl: initBatchUrl
  }
  for (const req of requests) {
    const [batchUrl, minimalFetchRequest] = toMinimalFetchRequestInfo(req)

    if (res.batchUrl === initBatchUrl) {
      res.batchUrl = batchUrl
    } else if (batchUrl !== res.batchUrl) {
      throw new Error(
        `Batch requests must be for the same batching endpoint. Found ${res.batchUrl} and ${batchUrl}`
      )
    }
    res.requests = res.requests.concat(minimalFetchRequest)
  }
  return res
}

interface MakeMultipartMixedRequestBodyInput {
  requests: ReadonlyArray<FetchRequest>
  boundary: string
}

interface MakeMultipartMixedRequestBodyOutput {
  body: string
  batchUrl: string
}

export const makeMultipartMixedRequestBody = (
  data: MakeMultipartMixedRequestBodyInput
): MakeMultipartMixedRequestBodyOutput => {
  const { batchUrl, requests } = prepareInput(data.requests)
  const body = HandlebarsTemplates.useBodyTemplate({
    requests,
    boundary: data.boundary
  })

  return { body, batchUrl }
}
