import { google } from 'googleapis'
import { describe, expect, it } from 'vitest'
import { batchFetchImplementation } from '../src/index.js'
import oauth from './googleOAuth2Client.js'

describe('batchFetchImplementation', () => {
  const fetchImpl = batchFetchImplementation()

  const calendarClient = google.calendar({
    version: 'v3',
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
})
