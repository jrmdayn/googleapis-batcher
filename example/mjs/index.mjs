import * as dotenv from 'dotenv'
dotenv.config({ path: '../../.env.local' })

import { google } from 'googleapis'
import { batchFetchImplementation } from '@jrmdayn/googleapis-batcher'
import { envsafe, str, url } from 'envsafe'
import { readFile } from 'node:fs/promises'

const env = envsafe({
  VITE_GOOGLEAPIS_CLIENT_ID: str(),
  VITE_GOOGLEAPIS_CLIENT_SECRET: str(),
  VITE_GOOGLEAPIS_REDIRECT_URL: url()
})

const fetchImpl = batchFetchImplementation()

const GOOGLEAPIS_REFRESH_TOKEN = JSON.parse(
  await readFile('../../.googleapis-credentials.json')
).refresh_token

const oauth2Client = new google.auth.OAuth2(
  env.VITE_GOOGLEAPIS_CLIENT_ID,
  env.VITE_GOOGLEAPIS_CLIENT_SECRET,
  env.VITE_GOOGLEAPIS_REDIRECT_URL
)

oauth2Client.setCredentials({ refresh_token: GOOGLEAPIS_REFRESH_TOKEN })

const calendarClient = google.calendar({
  version: 'v3',
  fetchImplementation: fetchImpl,
  auth: oauth2Client
})

const res = await Promise.all([
  calendarClient.colors.get(),
  calendarClient.settings.list()
])

console.log(res.map(({ statusText }) => statusText))
