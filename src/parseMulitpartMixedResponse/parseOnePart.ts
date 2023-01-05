import getNextLineIterator from 'next-line'
import { Headers, Response } from 'node-fetch'
import type { FetchResponse } from '../types.js'

const statusLineRE = /^[A-Z]+\/\d\.\d (\d{3}) (.*)$/
const headerLineRE = /^([a-zA-Z-]+)\s*:\s*(.+)\s*$/

interface StatusLine {
  code: number
  message: string
}

interface MessagePart {
  statusLine: StatusLine
  headers: Headers
  body: string | null
}

export const parseOnePart = (part: string): MessagePart => {
  const getNextLine = getNextLineIterator(part)
  let nextLine: string | null = null
  let statusLine: StatusLine | null = null
  const bodyParts: string[] = []
  const headers = new Headers()

  // find and extract the status line
  do {
    nextLine = getNextLine()
    const match = nextLine?.match(statusLineRE)
    if (match != null) {
      statusLine = { code: Number(match[1]), message: match[2] }
    }
  } while (nextLine !== null && statusLine === null)

  if (statusLine === null) {
    throw new Error('Could not find a status line in this message')
  }

  // find and extract headers
  let matchHeader: RegExpMatchArray | null = null
  do {
    nextLine = getNextLine()
    matchHeader = nextLine?.match(headerLineRE) ?? null
    if (matchHeader !== null) {
      headers.append(matchHeader[1], matchHeader[2])
    }
  } while (nextLine !== null && matchHeader !== null)

  // if there is something left, it must be the body
  while (nextLine !== null) {
    bodyParts.push(nextLine)
    nextLine = getNextLine()
  }
  const body = bodyParts.length > 0 ? bodyParts.join('\n').trim() : null

  return { statusLine, headers, body }
}

export const makeFetchResponse = ({
  body,
  headers,
  statusLine
}: MessagePart): FetchResponse => {
  return new Response(body, {
    headers,
    status: statusLine.code,
    statusText: statusLine.message
  })
}
