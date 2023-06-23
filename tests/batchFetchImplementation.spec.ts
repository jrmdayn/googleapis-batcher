import { calendar_v3, google } from 'googleapis'
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

  it('should insert multiple calendar events and remove them', async () => {
    const calendars = await calendarClient.calendarList.list({
      minAccessRole: 'owner'
    })
    const primaryCalendar = calendars.data.items?.find(
      (c) => c.primary === true
    )

    expect(primaryCalendar?.id).toBeTruthy()

    const calendarId = primaryCalendar?.id ?? 'invalid_calendar_id'

    const eventBody1: calendar_v3.Schema$Event = {
      summary: 'googleapis-batcher test event 1',
      start: { date: '1950-01-01' },
      end: { date: '1950-01-02' }
    }

    const eventBody2: calendar_v3.Schema$Event = {
      summary: 'googleapis-batcher test event 2',
      start: { date: '1950-01-02' },
      end: { date: '1950-01-03' }
    }

    const [res1, res2] = await Promise.all(
      [eventBody1, eventBody2].map((ev) =>
        calendarClient.events.insert({ calendarId, requestBody: ev })
      )
    )

    expect(res1.status).toBe(200)
    expect(res1.data.id).toBeTruthy()
    expect(res2.status).toBe(200)
    expect(res2.data.id).toBeTruthy()

    const [res3, res4] = await Promise.all(
      [res1, res2].map((res) =>
        calendarClient.events.delete({ calendarId, eventId: res.data.id! })
      )
    )

    expect(res3.status).toBe(204)
    expect(res4.status).toBe(204)
  })
})
