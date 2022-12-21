import Dataloader, { Options as DataloaderOptions } from 'dataloader'
import { EventEmitter } from 'node:stream'
import { makeMultipartMixedRequest } from './makeMultipartMixedRequest/index.js'
import { parseMultipartMixedReponse } from './parseMulitpartMixedResponse.js'

import type { GaxiosOptions } from 'gaxios'
import type { FetchServiceTag } from './fetchService.js'
import type { RandomStringServiceTag } from './randomStringService.js'
import type { FetchRequest, FetchResponse } from './types.js'

type FetchImplementation = Required<GaxiosOptions>['fetchImplementation']

const signalSymbol = Symbol('BatchSchedulerSignal')

interface BatchSchedulerSignal {
  readonly __tag: typeof signalSymbol
  schedule: () => void
  onSchedule: (cb: () => void) => void
}

export const makeBatchSchedulerSignal = (): BatchSchedulerSignal => {
  const ee = new EventEmitter()
  const signal: BatchSchedulerSignal = {
    __tag: signalSymbol,
    schedule: () => {
      ee.emit('schedule')
    },
    onSchedule: (cb) => {
      ee.addListener('schedule', cb)
    }
  }
  return signal
}

interface BatchOptions {
  maxBatchSize?: number
  batchWindowMs?: number
  signal?: BatchSchedulerSignal
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

  if (options?.signal !== undefined) {
    let callbacks: Array<() => void> = []
    const dispatch = (): void => {
      callbacks.forEach((callback) => callback())
      callbacks = []
    }
    dataloaderOptions.batchScheduleFn = (cb): void => {
      callbacks.push(cb)
    }
    options.signal.onSchedule(dispatch)
  }

  if (options?.batchWindowMs !== undefined) {
    if (dataloaderOptions.batchScheduleFn !== undefined)
      throw new Error(
        'You cannot provide both batchWindowMs and signal options at the same time'
      )

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
