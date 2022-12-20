import type { FetchRequest } from './types.js'
import handlebars from 'handlebars'

const helpers = {
  inc: (x: number): number => x + 1,
  json: JSON.stringify
}

const useRequestTemplate = handlebars.compile(
  `
{{#if batchUrl }}
POST {{batchUrl}} HTTP/1.1
Content-Type: multipart/mixed; boundary="{{boundary}}"
{{/if}}


{{#each requests}}
--{{../boundary}}
Content-Type: application/http
Content-ID: {{inc @index}}

{{method}} {{path}} HTTP/1.1
Accept: application/json
{{#each headers}}
{{@key}}: {{this}}
{{/each}}
{{#if body}}
Content-Type: application/json
{{{json body}}}
{{/if}}


{{/each}}
{{#if requests}}
--{{boundary}}--
{{/if}}
`
)

interface MinimalFetchRequestInfo {
  path: string
  method: string
  headers?: FetchRequest['headers']
  body?: FetchRequest['body']
}

interface MakeMultipartMixedRequestImplInput {
  requests: ReadonlyArray<MinimalFetchRequestInfo>
  boundary: string
  batchUrl?: string
}

export const makeMultipartMixedRequestImpl = (
  data: MakeMultipartMixedRequestImplInput
): string => useRequestTemplate(data, { helpers })

const fetchRequestToMinimalFetchRequestInfo = (
  req: FetchRequest
): [batchUrl: string, minimalRequestInfo: MinimalFetchRequestInfo] => {
  const url = new URL(req.url)
  const batchUrl = guessBatchUrl(url)
  const path = url.href.substring(url.origin.length)
  const minimalRequestInfo: MinimalFetchRequestInfo = {
    method: req.method ?? 'POST',
    body: req.body,
    headers: req.headers,
    path
  }
  return [batchUrl, minimalRequestInfo]
}

const prepareMakeMultipartMixedRequestImplInput = (
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
    const [batchUrl, minimalFetchRequest] =
      fetchRequestToMinimalFetchRequestInfo(req)

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

const googleapisUrl = 'https://www.googleapis.com'

const guessBatchUrl = (url: URL): string => {
  if (url.origin === googleapisUrl) {
    const tokens = url.pathname.split('/')
    const apiName = tokens[1]
    const apiVersion = tokens[2]
    return `${googleapisUrl}/batch/${apiName}/${apiVersion}`
  } else {
    return `${url.origin}/batch`
  }
}

interface MultipartMixedRequestInfo {
  body: string
  method: string
  batchUrl: string
  headers: Record<string, string>
}

export const makeMultipartMixedRequest = (
  inputs: ReadonlyArray<FetchRequest>,
  boundary: string
): MultipartMixedRequestInfo => {
  const { requests, batchUrl } =
    prepareMakeMultipartMixedRequestImplInput(inputs)
  const body = makeMultipartMixedRequestImpl({ boundary, requests })
  return {
    body,
    method: 'POST',
    batchUrl,
    headers: {
      'Content-Type': `multipart/mixed; boundary="${boundary}"`
    }
  }
}
