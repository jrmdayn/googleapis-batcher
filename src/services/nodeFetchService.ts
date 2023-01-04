import fetch from 'node-fetch'
import type { FetchService } from './fetchService.js'

export const nodeFetchService: FetchService = {
  fetch: (params) => fetch(params.url, params)
}
