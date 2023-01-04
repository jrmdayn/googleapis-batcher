import { makeFetchResponse, parseOnePart } from './parseOnePart.js'
import type { FetchResponse } from '../types.js'

const multipartMixedBoundary = 'multipart/mixed; boundary='

export const parseMultipartMixedReponse = async (
  rsp: FetchResponse
): Promise<ReadonlyArray<FetchResponse>> => {
  const contentType = rsp.headers.get('Content-Type')

  if (
    typeof contentType !== 'string' ||
    !contentType.startsWith(multipartMixedBoundary)
  ) {
    throw new Error(`Unexpected Content-Type header in response`, {
      cause: contentType
    })
  }
  const boundary = contentType.substring(multipartMixedBoundary.length).trim()
  const splitStr = `--${boundary}`
  const endStr = `--${boundary}--`

  const msgBody = (await rsp.text()).trim()

  if (!msgBody.endsWith(endStr)) {
    throw new Error(
      `The body of the response does not end with the expected boundary`,
      { cause: endStr }
    )
  }

  if (!msgBody.startsWith(splitStr)) {
    throw new Error(
      `The body of the response does not start with the expected boundary`,
      { cause: splitStr }
    )
  }

  return (
    msgBody
      // remove the first and last boundary
      .slice(splitStr.length, msgBody.length - endStr.length)
      // split the body into multiple parts
      .split(splitStr)
      // parse the various parts
      .map(parseOnePart)
      // build the fetch response
      .map(makeFetchResponse)
  )
}
