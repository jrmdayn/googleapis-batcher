<img src="https://avatars0.githubusercontent.com/u/1342004?v=3&s=96" alt="Google Inc. logo" title="Google" align="right" height="96" width="96"/>

# Batching library for Google APIs Node.js Client

<p align="center">
  <a aria-label="NPM version" href="https://www.npmjs.com/package/@jrmdayn/googleapis-batcher">
    <img alt="" src="https://img.shields.io/npm/v/@jrmdayn/googleapis-batcher">
  </a>
  <a aria-label="NPM size" href="https://www.npmjs.com/package/@jrmdayn/googleapis-batcher">
    <img src="https://img.shields.io/bundlephobia/minzip/@jrmdayn/googleapis-batcher">
  </a>
  <a aria-label="NPM downloads" href="https://www.npmjs.com/package/@jrmdayn/googleapis-batcher">
    <img src="https://img.shields.io/npm/dw/@jrmdayn/googleapis-batcher">
  </a>
  <a aria-label="License" href="https://www.npmjs.com/package/@jrmdayn/googleapis-batcher">
    <img alt="" src="https://img.shields.io/npm/l/@jrmdayn/googleapis-batcher">
  </a>
  <a aria-label="PRs Welcome" href="https://github.com/jrmdayn/googleapis-batcher/compare">
    <img alt="" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
  </a>
  <a aria-label="Snyk" href="https://snyk.io/test/github/jrmdayn/googleapis-batcher">
    <img alt="" src="https://snyk.io/test/github/jrmdayn/googleapis-batcher/badge.svg">
  </a>
</p>


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

## Options

### maxBatchSize
Controls the maximum number of requests to batch together in one HTTP request.

```js
// limit the number of batched requests to 50
const fetchImpl = batchFetchImplementation({ maxBatchSize: 50 })
```

_Note: Google limits the number of batched requests on a per API basis. For example, for the Calendar API it is 50 requests and for the People API it is 1000._

### batchWindowMs
Controls the size of the time window (in milliseconds) that will be used to batch requests together. By default, all requests made in the same tick will be batched together. See Dataloader [documentation](https://github.com/graphql/dataloader/tree/main#batch-scheduling) for more on this.

```js
// batch all requests made in a 30ms window
const fetchImpl = batchFetchImplementation({ batchWindowMs: 30 })
```

### signal
Defines a user controlled signal that is used to manually trigger a batch request.

```js
const signal = makeBatchSchedulerSignal();
const fetchImpl = batchFetchImplementation({ signal })

const client = google.calendar({
  version: 'v3',
  fetchImplementation: fetchImpl,
})

const pList = calendarClient.events.list({ calendarId: 'john@gmail.com' }),
const pGet = calendarClient.events.get({
  calendarId: 'john@gmail.com',
  eventId: 'xyz123'
}),
const pPatch = calendarClient.events.patch({
  calendarId: 'john@gmail.com',
  eventId: 'xyz456',
  requestBody: { colorId: '1' }
})

...

signal.schedule();

```

## Known limitations

The max batch size varies per Google API. For example, it is set to 50 for Calendar API and to 1000 for People API. Read the docs to find out and configure the options accordingly.


Batching is homogeneous, so you cannot batch Calendar API and People API requests together. Instead, you must make 2 seperate batching calls, as there are 2 separate batching endpoints. Concretly what it means is that you should always provide a `fetchImplementation` at the client API level, not at the global Google options level:

```js
const fetchImpl = batchFetchImplementation()

const calendarClient = google.calendar({
  version: 'v3',
  fetchImplementation: fetchImpl,
})

const peopleClient = google.people({
  version: 'v1',
  fetchImplementation: fetchImpl,
})

// This will raise an error
await Promise.all([
    calendarClient.events.list(),
    peopleClient.people.get()
  ])
```

Do this instead:

```js
const fetchImpl1 = batchFetchImplementation()
const fetchImpl2 = batchFetchImplementation()

const calendarClient = google.calendar({
  version: 'v3',
  fetchImplementation: fetchImpl1,
})

const peopleClient = google.people({
  version: 'v1',
  fetchImplementation: fetchImpl2,
})

await Promise.all([
    calendarClient.events.list(),
    peopleClient.people.get()
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

