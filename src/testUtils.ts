import { FetchRequest } from './types.js'

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
