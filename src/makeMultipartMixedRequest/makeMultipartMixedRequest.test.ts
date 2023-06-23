import { describe, it, expect } from 'vitest'
import { makeMultipartMixedRequestFullText } from './makeMultipartMixedRequest.js'
import {
  fetchRequestFactory,
  googleApisUrlFactory
} from '../testUtils/factories.js'

describe('makeMultipartMixedRequest', () => {
  it('does not output a body if requests are empty', () => {
    const out = makeMultipartMixedRequestFullText({
      requests: [],
      boundary: 'batch_people'
      // batchUrl: '/batch'
    })

    const expected = `
POST not_a_valid_url HTTP/1.1
Content-Type: multipart/mixed; boundary="batch_people"


`

    expect(out).toBe(expected)
  })

  it('throws if 2 requests have different batch endpoints', () => {
    expect(() =>
      makeMultipartMixedRequestFullText({
        boundary: 'batch_people',
        requests: [
          fetchRequestFactory({
            url: googleApisUrlFactory({ apiName: 'api1' })
          }),
          fetchRequestFactory({
            url: googleApisUrlFactory({ apiName: 'api2' })
          })
        ]
      })
    ).toThrow(
      'Batch requests must be for the same batching endpoint. Found https://api1.googleapis.com/batch and https://api2.googleapis.com/batch'
    )
  })

  it('prints all the provided headers', () => {
    const out = makeMultipartMixedRequestFullText({
      requests: [
        fetchRequestFactory({
          url: googleApisUrlFactory({ apiName: 'people', path: '/v1/people' }),
          method: 'GET',
          headers: { Foo: 'Foo', Bar: 'Bar' }
        })
      ],
      boundary: 'batch_people'
    })

    const expected = `
POST https://people.googleapis.com/batch HTTP/1.1
Content-Type: multipart/mixed; boundary="batch_people"


--batch_people
Content-Type: application/http
Content-ID: 1

GET /v1/people HTTP/1.1
Accept: application/json
Foo: Foo
Bar: Bar


--batch_people--
`

    expect(out).toBe(expected)
  })

  it('constructs a valid multipart/mixed request with multiple parts', () => {
    const out = makeMultipartMixedRequestFullText({
      requests: [
        fetchRequestFactory({
          url: googleApisUrlFactory({
            apiName: 'people',
            path: '/v1/people:createContact'
          }),
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            names: [{ givenName: 'John', familyName: 'Doe' }]
          })
        }),
        fetchRequestFactory({
          url: googleApisUrlFactory({
            apiName: 'people',
            path: '/v1/people/c123456789012345?personFields=emailAddresses'
          }),
          method: 'GET'
        })
      ],
      boundary: 'batch_people'
    })

    const expected = `
POST https://people.googleapis.com/batch HTTP/1.1
Content-Type: multipart/mixed; boundary="batch_people"


--batch_people
Content-Type: application/http
Content-ID: 1

POST /v1/people:createContact HTTP/1.1
Accept: application/json
Content-Type: application/json

{"names":[{"givenName":"John","familyName":"Doe"}]}


--batch_people
Content-Type: application/http
Content-ID: 2

GET /v1/people/c123456789012345?personFields&#x3D;emailAddresses HTTP/1.1
Accept: application/json


--batch_people--
`

    expect(out).toBe(expected)
  })
})
