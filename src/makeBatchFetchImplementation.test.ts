import { FetchRequestInit } from 'gaxios/build/src/common.js'
import { describe, expect, it, vi } from 'vitest'
import {
  BatchOptions,
  makeBatchFetchImplementation,
  makeBatchSchedulerSignal
} from './makeBatchFetchImplementation.js'
import type { FetchService } from './services/fetchService.js'
import type { RandomStringService } from './services/randomStringService.js'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const setupTest = (options: BatchOptions = {}) => {
  const mockedFetchService: FetchService = {
    fetch: vi.fn().mockRejectedValue(new Error('Not implemented'))
  }
  const dummyRandomStringService: RandomStringService = {
    generate: vi.fn().mockReturnValue('batch')
  }
  const fetchImpl = makeBatchFetchImplementation({
    fetchService: mockedFetchService,
    randomStringService: dummyRandomStringService,
    options
  })
  return { mockedFetchService, dummyRandomStringService, fetchImpl }
}

describe('makeBatchFetchImplementation', () => {
  it('should fail if batchWindowMs and signal are provided at the same time', async () => {
    expect(() =>
      makeBatchFetchImplementation({
        options: { batchWindowMs: 50, signal: makeBatchSchedulerSignal() }
      })
    ).toThrow(
      'You cannot provide both batchWindowMs and signal options at the same time'
    )
  })

  it('should call fetch service directly with 1 request', async () => {
    const { fetchImpl, dummyRandomStringService, mockedFetchService } =
      setupTest()
    await expect(fetchImpl('some url')).rejects.toThrow('Not implemented')
    expect(dummyRandomStringService.generate).not.toHaveBeenCalled()
    expect(mockedFetchService.fetch).toHaveBeenCalledOnce()
    expect(mockedFetchService.fetch).toHaveBeenCalledWith({ url: 'some url' })
  })

  it('should generate a multipart mixed request and call fetch service', async () => {
    const { fetchImpl, dummyRandomStringService, mockedFetchService } =
      setupTest()
    const p1 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    const p2 = fetchImpl('https://www.googleapis.com/calendar/v3/get')
    const p3 = fetchImpl('https://www.googleapis.com/calendar/v3/update', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ foo: 'bar' })
    } as FetchRequestInit)
    await expect(Promise.all([p1, p2, p3])).rejects.toThrow('Not implemented')
    expect(dummyRandomStringService.generate).toHaveBeenCalledOnce()

    expect(mockedFetchService.fetch).toHaveBeenCalledOnce()
    expect(mockedFetchService.fetch).toHaveBeenCalledWith({
      url: 'https://www.googleapis.com/batch/calendar/v3',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/mixed; boundary="batch"'
      },
      body: `
--batch
Content-Type: application/http
Content-ID: 1

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 2

GET /calendar/v3/get HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 3

PATCH /calendar/v3/update HTTP/1.1
Accept: application/json
Authorization: Bearer token
Content-Type: application/json

{"foo":"bar"}


--batch--
`
    })
  })

  it('should not deduplicate identical requests', async () => {
    const { fetchImpl, dummyRandomStringService, mockedFetchService } =
      setupTest()
    const p1 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    const p2 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    await expect(Promise.all([p1, p2])).rejects.toThrow('Not implemented')
    expect(dummyRandomStringService.generate).toHaveBeenCalledOnce()
    expect(mockedFetchService.fetch).toHaveBeenCalledOnce()
    expect(mockedFetchService.fetch).toHaveBeenCalledWith({
      url: 'https://www.googleapis.com/batch/calendar/v3',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/mixed; boundary="batch"'
      },
      body: `
--batch
Content-Type: application/http
Content-ID: 1

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 2

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch--
`
    })
  })

  it('should respect the batch size specified in options', async () => {
    const { fetchImpl, dummyRandomStringService, mockedFetchService } =
      setupTest({ maxBatchSize: 2 })

    const p1 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    const p2 = fetchImpl('https://www.googleapis.com/calendar/v3/get')
    const p3 = fetchImpl('https://www.googleapis.com/calendar/v3/scan')
    const p4 = fetchImpl('https://www.googleapis.com/calendar/v3/search')
    await expect(Promise.all([p1, p2, p3, p4])).rejects.toThrow(
      'Not implemented'
    )
    expect(dummyRandomStringService.generate).toHaveBeenCalledTimes(2)
    expect(mockedFetchService.fetch).toHaveBeenCalledTimes(2)

    expect(mockedFetchService.fetch).toHaveBeenNthCalledWith(1, {
      url: 'https://www.googleapis.com/batch/calendar/v3',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/mixed; boundary="batch"'
      },
      body: `
--batch
Content-Type: application/http
Content-ID: 1

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 2

GET /calendar/v3/get HTTP/1.1
Accept: application/json


--batch--
`
    })

    expect(mockedFetchService.fetch).toHaveBeenNthCalledWith(2, {
      url: 'https://www.googleapis.com/batch/calendar/v3',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/mixed; boundary="batch"'
      },
      body: `
--batch
Content-Type: application/http
Content-ID: 1

GET /calendar/v3/scan HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 2

GET /calendar/v3/search HTTP/1.1
Accept: application/json


--batch--
`
    })
  })

  it('should not batch more than 1000 requests', async () => {
    const { fetchImpl, mockedFetchService } = setupTest({ maxBatchSize: 2000 })
    const promises = Array.from(Array(1002).keys()).map(() =>
      fetchImpl('https://www.googleapis.com/calendar/v3/list')
    )
    await expect(Promise.all(promises)).rejects.toThrow('Not implemented')
    expect(mockedFetchService.fetch).toHaveBeenCalledTimes(2)
    expect(mockedFetchService.fetch).toHaveBeenNthCalledWith(2, {
      url: 'https://www.googleapis.com/batch/calendar/v3',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/mixed; boundary="batch"'
      },
      body: `
--batch
Content-Type: application/http
Content-ID: 1

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch
Content-Type: application/http
Content-ID: 2

GET /calendar/v3/list HTTP/1.1
Accept: application/json


--batch--
`
    })
  })

  it('should fire a batch according to the scheduler signal', async () => {
    const signal = makeBatchSchedulerSignal()
    const { fetchImpl, mockedFetchService } = setupTest({
      signal
    })

    const p1 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    const p2 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    expect(mockedFetchService.fetch).not.toHaveBeenCalled()
    signal.schedule()
    expect(mockedFetchService.fetch).toHaveBeenCalledOnce()
    await expect(Promise.all([p1, p2])).rejects.toThrow('Not implemented')
  })

  it('should fire a batch after a certain window of time has elapsed', async () => {
    vi.useFakeTimers()

    const { fetchImpl, mockedFetchService } = setupTest({
      batchWindowMs: 500
    })
    const p1 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    let p2: unknown
    setTimeout(() => {
      p2 = fetchImpl('https://www.googleapis.com/calendar/v3/list')
    }, 400)
    vi.advanceTimersByTime(490)
    expect(mockedFetchService.fetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(11)
    expect(mockedFetchService.fetch).toHaveBeenCalledOnce()
    await expect(Promise.all([p1, p2])).rejects.toThrow('Not implemented')
  })
})
