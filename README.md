<img src="https://avatars0.githubusercontent.com/u/1342004?v=3&s=96" alt="Google Inc. logo" title="Google" align="right" height="96" width="96"/>

# Batching library for Google APIs Node.js Client

<!-- [![npm version][npmimg]][npm]
[![Downloads][downloadsimg]][downloads]
[![Known Vulnerabilities][snyk-image]][snyk-url] -->

Node.js library for batching multiple requests made with the official [Google APIs Node.js client](https://github.com/googleapis/google-api-nodejs-client)

## Getting started

First, install the library using yarn/npm/pnpm:
```bash
yarn add @jrmdayn/googleapis-batcher
```

Then instantiate and use the `batchFetchImplementation`:

```js
import { google } from 'googleapis'
import { batchFetchImplementation } from '@jrmdayn/googleapis-batcher'

const fetchImpl = batchFetchImplementation()

const client = google.calendar({
  version: 'v3',
  fetchImplementation: fetchImpl,
})

// The 3 requests will be batched together
const [list, get, patch] = await Promise.all([
    calendarClient.events.list({ calendarId: 'john@gmail.com' }),
    calendarClient.events.get({
      calendarId: 'john@gmail.com',
      eventId: 'xyz123'
    }),
    calendarClient.events.patch({
      calendarId: 'john@gmail.com',
      eventId: 'xyz456',
      requestBody: { colorId: '1' }
    })
  ])

```

## Motivation

On August 12, 2020 Google deprecated its global batching endpoints (blog article [here](https://developers.googleblog.com/2018/03/discontinuing-support-for-json-rpc-and.html)). Going forward, it is recommended to use API specific batch endpoints for batching homogeneous requests together. Unfortunately, the official [Google APIs Node.js client](https://github.com/googleapis/google-api-nodejs-client) does not support batching requests together out of the box. The task of composing a batched request and parsing the batch response is left to the developer.

[Here](https://developers.google.com/calendar/api/guides/batch) is a link to the official guide for doing so with the Calendar API. As you can see, the task consists in handcrafting a `multipart/mixed` HTTP request composed of multiple raw HTTP requests (one per request), and then parsing a `multipart/mixed` response body composed of multiple raw HTTP responses (one per response).

At this point, I see at least 2 reasons as to why developers would not batch Google APIs requests:
1. There is no easy way to easily generate the individual raw HTTP requests (url + headers + JSON body) from the official Node.js client. The only solution would be to read the developers doc and craft the request by hand..
1. The task of handcrafting/parsing a `multipart/mixed` HTTP request/response seems daunting and error prone

## Solution

I decided to write this library when I first encountered the need for batching Google APIs requests in Node.js, so that other developers would not have to face the task of writing and parsing `multipart/mixed` HTTP requests. The key of the solution consists of providing your own `fetch` implementation to the API client you are using. Google exposes a `fetchImplementation` parameter in the options (probably for testing purpose) that we can easily override to intercept requests and group them together. For grouping the requests together, we use [Dataloader](https://github.com/graphql/dataloader), which can be configured to batch all requests made in one tick, or in a certain time window, or until an external signal is fired.

From a developer's point of vue, you do not need to worry about handcrafting the individual raw HTTP requests. You simply use the official Google APIs Node.js client as normal, and the fetch implementation will automatically batch the requests for you.

