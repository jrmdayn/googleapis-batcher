import type { RequestInit, Response } from 'node-fetch'

export type FetchRequest = RequestInit & { url: string }
export type FetchResponse = Response
