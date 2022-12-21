import type { FetchRequest, FetchResponse } from './types.js'

export interface FetchService {
  fetch: (params: FetchRequest) => Promise<FetchResponse>
  fetchAsText: (params: FetchRequest) => Promise<string>
}

export interface FetchServiceTag {
  fetchService: FetchService
}
