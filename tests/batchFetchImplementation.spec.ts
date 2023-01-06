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

    expect(calendarList.status).toBe(200)
    expect(calendarList.statusText).toBe('OK')
    expect(calendarList.data.kind).toBe('calendar#calendarList')
    expect(calendarList.data.items).not.empty

    expect(settings.status).toBe(200)
    expect(settings.statusText).toBe('OK')
    expect(settings.data.kind).toBe('calendar#settings')
    expect(settings.data.items).not.empty
  })
})
