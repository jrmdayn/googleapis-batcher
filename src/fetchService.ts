import type { FetchRequest, FetchResponse } from './types.js'

export interface FetchService {
  fetch: (params: FetchRequest) => Promise<FetchResponse>
}

export interface FetchServiceTag {
  fetchService: FetchService
}
