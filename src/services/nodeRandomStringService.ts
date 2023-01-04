import type { RandomStringService } from './randomStringService.js'

export const nodeRandomStringService: RandomStringService = {
  generate: () => (Math.random() + 1).toString(36).substring(2)
}
