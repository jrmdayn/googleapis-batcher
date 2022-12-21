import Dataloader, { Options as DataloaderOptions } from 'dataloader'
import { makeMultipartMixedRequest } from './makeMultipartMixedRequest/index.js'

import type { GaxiosOptions } from 'gaxios'
import type { FetchServiceTag } from './fetchService.js'
import type { RandomStringServiceTag } from './randomStringService.js'
import type { FetchRequest, FetchResponse } from './types.js'
import { parseMultipartMixedReponse } from './parseMulitpartMixedResponse.js'

type FetchImplementation = Required<GaxiosOptions>['fetchImplementation']

interface BatchOptions {
  maxBatchSize?: number
  batchWindowMs?: number
}

interface BatchOptionsTag {
  options?: BatchOptions
}

export const makeBatchFetchImplementation = ({
  fetchService,
  options,
  randomStringService
}: BatchOptionsTag &
  FetchServiceTag &
  RandomStringServiceTag): FetchImplementation => {
  const dataloaderOptions: DataloaderOptions<FetchRequest, FetchResponse> = {}

  if (options?.maxBatchSize !== undefined) {
    // the maximum number of requests per batch is set to 1000 by Google
    // https://developers.google.com/people/v1/batch#overview
    dataloaderOptions.maxBatchSize = Math.min(1000, options.maxBatchSize)
  }

  if (options?.batchWindowMs !== undefined) {
    dataloaderOptions.batchScheduleFn = (cb): void => {
      setTimeout(cb, options.batchWindowMs)
    }
  }

  const dataloader = new Dataloader<FetchRequest, FetchResponse>(
    async (requests) => {
      // We always clear the cache to avoid cache issues
      // See second example of https://github.com/graphql/dataloader#disabling-cache
      dataloader.clearAll()

      if (requests.length === 0) {
        return []
      }
      if (requests.length === 1) {
        return [await fetchService.fetch(requests[0])]
      }
      const boundary = randomStringService.generate()
      const { batchUrl, body, headers, method } = makeMultipartMixedRequest({
        boundary,
        requests
      })
      const rsp = await fetchService.fetchAsText({
        url: batchUrl,
        body,
        headers,
        method
      })

      return parseMultipartMixedReponse(rsp)
    },
    dataloaderOptions
  )
  return (x, y) => dataloader.load(Object.assign({}, x, y))
}
