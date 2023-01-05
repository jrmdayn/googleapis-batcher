import { HeadersInit, Response } from 'node-fetch'
import type { FetchRequest, FetchResponse } from '../types.js'

export const fetchRequestFactory = ({
  url = 'https://people.googleapis.com/v1/people',
  method = 'GET',
  headers,
  body
}: Partial<
  Pick<FetchRequest, 'url' | 'method' | 'headers' | 'body'>
> = {}): FetchRequest => ({ url, method, headers, body })

interface GoogleApisUrlFactoryParams {
  apiName: 'www' | string
  path: string
}

export const googleApisUrlFactory = ({
  apiName = 'www',
  path = '/calendar/v3/calendars/john@gmail.com'
}: Partial<GoogleApisUrlFactoryParams> = {}): string =>
  `https://${apiName}.googleapis.com${path}`

export const fetchResponseFactory = ({
  body,
  headers,
  status,
  statusText
}: Partial<{
  body: unknown
  headers: HeadersInit
  status: number
  statusText: string
}> = {}): FetchResponse => new Response(body, { headers, status, statusText })
