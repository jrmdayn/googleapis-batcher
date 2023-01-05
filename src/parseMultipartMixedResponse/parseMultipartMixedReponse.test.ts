import { describe, expect, it } from 'vitest'
import { fetchResponseFactory } from '../testUtils/factories.js'
import { parseMultipartMixedReponse } from './parseMultipartMixedReponse.js'

describe('parseMultipartMixedReponse', () => {
  it('should fail when no Content-Type header is found', async () => {
    const rsp = fetchResponseFactory({ headers: {} })
    await expect(parseMultipartMixedReponse(rsp)).rejects.toThrow(
      'Unexpected Content-Type header in response'
    )
  })
  it('should fail when Content-Type header is not multipart/mixed', async () => {
    const rsp = fetchResponseFactory({
      headers: { 'Content-Type': 'application/json' }
    })
    await expect(parseMultipartMixedReponse(rsp)).rejects.toThrow(
      'Unexpected Content-Type header in response'
    )
  })
  it('should fail if the body does not start with the right boundary', async () => {
    const rsp = fetchResponseFactory({
      headers: { 'Content-Type': 'multipart/mixed; boundary=batch' }
    })
    await expect(parseMultipartMixedReponse(rsp)).rejects.toThrow(
      'The body of the response does not start with the expected boundary'
    )
  })
  it('should fail if the body does not end with the right boundary', async () => {
    const rsp = fetchResponseFactory({
      body: `--batch`,
      headers: { 'Content-Type': 'multipart/mixed; boundary=batch' }
    })
    await expect(parseMultipartMixedReponse(rsp)).rejects.toThrow(
      'The body of the response does not end with the expected boundary'
    )
  })
  it('should parse the body into multiple responses', async () => {
    const rsp = fetchResponseFactory({
      body: `--batch
HTTP/1.1 200 OK
--batch
HTTP/1.1 302 Redirect
--batch
HTTP/1.1 400 Bad Request
--batch--`,
      headers: { 'Content-Type': 'multipart/mixed; boundary=batch' }
    })

    const actual = await parseMultipartMixedReponse(rsp)

    expect(actual).toHaveLength(3)
    expect(actual[0].status).toBe(200)
    expect(actual[1].status).toBe(302)
    expect(actual[2].status).toBe(400)
  })
})
