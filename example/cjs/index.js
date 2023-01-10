require('dotenv').config({ path: '../../.env.local' })

const { google } = require('googleapis')
const { batchFetchImplementation } = require('@jrmdayn/googleapis-batcher')
const { envsafe, str, url } = require('envsafe')
const { readFileSync } = require('node:fs')

const env = envsafe({
  VITE_GOOGLEAPIS_CLIENT_ID: str(),
  VITE_GOOGLEAPIS_CLIENT_SECRET: str(),
  VITE_GOOGLEAPIS_REDIRECT_URL: url()
})

const fetchImpl = batchFetchImplementation()

const GOOGLEAPIS_REFRESH_TOKEN = JSON.parse(
  readFileSync('../../.googleapis-credentials.json')
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

const main = async () => {
  const res = await Promise.all([
    calendarClient.colors.get(),
    calendarClient.settings.list()
  ])

  console.log(res.map(({ statusText }) => statusText))
}

main()
