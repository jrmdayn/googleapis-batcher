import { Headers } from 'node-fetch'
import { describe, expect, it } from 'vitest'
import { parseOnePart } from './parseOnePart.js'

describe('parseOnePart', () => {
  it('should throw if no status line is found', () => {
    const input = `
Content-Type: application/http
Content-ID: response-1

    `
    expect(() => parseOnePart(input)).toThrow()
  })

  it('should parse status line', () => {
    const input = `
Content-Type: application/http
Content-ID: response-1

HTTP/1.1 400 Bad Request`
    expect(parseOnePart(input)).toEqual({
      body: null,
      headers: new Headers(),
      statusLine: { code: 400, message: 'Bad Request' }
    })
  })

  it('should parse status line and headers', () => {
    const input = `
Content-Type: application/http
Content-ID: response-1

HTTP/1.1 400 Bad Request
Vary: Origin
Vary: X-Origin
Vary: Referer
Content-Type: application/json; charset=UTF-8`
    expect(parseOnePart(input)).toEqual({
      body: null,
      headers: new Headers([
        ['Vary', 'Origin'],
        ['Vary', 'X-Origin'],
        ['Vary', 'Referer'],
        ['Content-Type', 'application/json; charset=UTF-8']
      ]),
      statusLine: { code: 400, message: 'Bad Request' }
    })
  })

  it('should parse status line, headers and body', () => {
    const input = `
Content-Type: application/http
Content-ID: response-1

HTTP/1.1 400 Bad Request
Vary: Origin
Vary: X-Origin
Vary: Referer
Content-Type: application/json; charset=UTF-8
{
  "error": {
    "code": 400,
    "message": "Must be a G Suite domain user.",
    "status": "FAILED_PRECONDITION"
  }
}`

    expect(parseOnePart(input)).toEqual({
      headers: new Headers([
        ['Vary', 'Origin'],
        ['Vary', 'X-Origin'],
        ['Vary', 'Referer'],
        ['Content-Type', 'application/json; charset=UTF-8']
      ]),
      statusLine: { code: 400, message: 'Bad Request' },
      body: `{
  "error": {
    "code": 400,
    "message": "Must be a G Suite domain user.",
    "status": "FAILED_PRECONDITION"
  }
}`
    })
  })
})
