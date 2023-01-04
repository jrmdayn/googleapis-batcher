export interface RandomStringService {
  generate: () => string
}

export interface RandomStringServiceTag {
  randomStringService: RandomStringService
}
