import { describe, it, expect } from 'vitest'
import { makeMultipartMixedRequestImpl } from './makeMultipartMixedRequest.js'

describe('makeMultipartMixedRequest', () => {
  it('does not output a body if requests are empty', () => {
    const out = makeMultipartMixedRequestImpl({
      requests: [],
      boundary: 'batch_people',
      batchUrl: '/batch'
    })

    const expected = `
POST /batch HTTP/1.1
Content-Type: multipart/mixed; boundary="batch_people"


`

    expect(out).toBe(expected)
  })

  it('prints all the provided headers', () => {
    const out = makeMultipartMixedRequestImpl({
      requests: [
        {
          path: '/v1/people',
          method: 'GET',
          headers: { Foo: 'Foo', Bar: 'Bar' }
        }
      ],
      boundary: 'batch_people',
      batchUrl: '/batch'
    })

    const expected = `
POST /batch HTTP/1.1
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
    const out = makeMultipartMixedRequestImpl({
      requests: [
        {
          path: '/v1/people:createContact',
          method: 'POST',
          body: {
            names: [{ givenName: 'John', familyName: 'Doe' }]
          }
        },
        {
          path: '/v1/people/c123456789012345?personFields=emailAddresses',
          method: 'GET'
        }
      ],
      boundary: 'batch_people',
      batchUrl: '/batch'
    })

    const expected = `
POST /batch HTTP/1.1
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
