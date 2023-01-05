import {
  BatchOptions,
  FetchImplementation,
  makeBatchFetchImplementation
} from './makeBatchFetchImplementation.js'

export { makeBatchSchedulerSignal } from './makeBatchFetchImplementation.js'

export function batchFetchImplementation(
  options: BatchOptions = {}
): FetchImplementation {
  return makeBatchFetchImplementation({ options })
}
