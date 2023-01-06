import http from 'node:http'
import url from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { google } from 'googleapis'
import open from 'open'

import env from './env.js'

const oauth2Client = new google.auth.OAuth2(
  env.VITE_GOOGLEAPIS_CLIENT_ID,
  env.VITE_GOOGLEAPIS_CLIENT_SECRET,
  env.VITE_GOOGLEAPIS_REDIRECT_URL
)

const scopes = ['openid', 'https://www.googleapis.com/auth/calendar']

const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
  include_granted_scopes: true
})

const tokensFilePath = new URL(
  path.join(import.meta.url, '../../../.googleapis-credentials.json')
)

oauth2Client.on('tokens', async (tokens) => {
  await fs.writeFile(tokensFilePath, JSON.stringify(tokens, null, 2))
})

const fileExists = await fs.stat(tokensFilePath).then(
  () => true,
  () => false
)

if (fileExists) {
  const buffer = await fs.readFile(tokensFilePath)
  const tokens = JSON.parse(buffer.toString())
  oauth2Client.setCredentials(tokens)
} else {
  await Promise.all([
    new Promise((resolve) => {
      const server = http
        .createServer(async function (req, res) {
          // Example on redirecting user to Google's OAuth 2.0 server.
          if (req.url == '/') {
            res.writeHead(301, { Location: authorizationUrl })
          }

          // Receive the callback from Google's OAuth 2.0 server.
          if (req.url?.startsWith('/oauth2callback')) {
            // Handle the OAuth 2.0 server response
            const q = url.parse(req.url, true).query

            if (q.error) {
              // An error response e.g. error=access_denied
              console.log('Error:' + q.error)
            } else {
              // Get access and refresh tokens (if access_type is offline)
              const { tokens } = await oauth2Client.getToken(q.code as string)
              oauth2Client.setCredentials(tokens)

              resolve(tokens)
            }
          }
          server.close()
          res.end()
        })
        .listen(80)
    }),
    open('http://localhost')
  ])
}

export default oauth2Client
