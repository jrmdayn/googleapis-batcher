import { google } from 'googleapis'
import { describe, expect, it } from 'vitest'
import { batchFetchImplementation } from './index.js'
import oauth from './testUtils/oauth.js'

describe('batchFetchImplementation', () => {
  const fetchImpl = batchFetchImplementation()

  const calendarClient = google.calendar({
    version: 'v3',
    retry: false,
    fetchImplementation: fetchImpl,
    auth: oauth
  })

  const peopleClient = google.people({
    version: 'v1',
    retry: false,
    fetchImplementation: fetchImpl,
    auth: oauth
  })

  it('should batch 2 requests', async () => {
    const [calendarList, settings] = await Promise.all([
      calendarClient.calendarList.list(),
      calendarClient.settings.list()
    ])

    expect(calendarList.data).toMatchObject({})
    expect(settings.data).toMatchObject({})
  })

  it('should fail when 2 batch endpoints are different', async () => {
    await expect(
      Promise.all([
        calendarClient.calendarList.list(),
        peopleClient.people.listDirectoryPeople()
      ])
    ).rejects.toThrow(
      'Batch requests must be for the same batching endpoint. Found https://www.googleapis.com/batch/calendar/v3 and https://people.googleapis.com/batch'
    )
  })
})
