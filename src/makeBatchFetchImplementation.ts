import Dataloader, { Options as DataloaderOptions } from 'dataloader'
import { EventEmitter } from 'node:stream'
import { makeMultipartMixedRequest } from './makeMultipartMixedRequest/makeMultipartMixedRequest.js'
import { parseMultipartMixedReponse } from './parseMultipartMixedResponse/parseMultipartMixedReponse.js'

import type { GaxiosOptions } from 'gaxios'
import type { FetchServiceTag } from './services/fetchService.js'
import type { RandomStringServiceTag } from './services/randomStringService.js'
import type { FetchRequest, FetchResponse } from './types.js'
import { nodeFetchService } from './services/nodeFetchService.js'
import { nodeRandomStringService } from './services/nodeRandomStringService.js'

export type FetchImplementation = Required<GaxiosOptions>['fetchImplementation']

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

export interface BatchOptions {
  maxBatchSize?: number
  batchWindowMs?: number
  signal?: BatchSchedulerSignal
}

interface BatchOptionsTag {
  options?: BatchOptions
}

export const makeBatchFetchImplementation = ({
  fetchService = nodeFetchService,
  randomStringService = nodeRandomStringService,
  options
}: BatchOptionsTag &
  Partial<FetchServiceTag> &
  Partial<RandomStringServiceTag> = {}): FetchImplementation => {
  const dataloaderOptions: DataloaderOptions<FetchRequest, FetchResponse> = {
    // do not use caching as it could lead to unintended scenarios
    cache: false
  }

  // the maximum number of requests per batch is set to 1000 by Google
  // https://developers.google.com/people/v1/batch#overview
  dataloaderOptions.maxBatchSize = Math.min(1000, options?.maxBatchSize ?? 1000)

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
      const rsp = await fetchService.fetch({
        url: batchUrl,
        body,
        headers,
        method
      })
      return parseMultipartMixedReponse(rsp)
    },
    dataloaderOptions
  )
  return (url, params) => dataloader.load(Object.assign({}, { url }, params))
}
