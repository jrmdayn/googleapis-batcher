const googleapisUrl = 'https://www.googleapis.com'

export const guessGoogleapisBatchUrl = (url: URL): string => {
  if (url.origin === googleapisUrl) {
    const tokens = url.pathname.split('/')
    const apiName = tokens[1]
    const apiVersion = tokens[2]
    return `${googleapisUrl}/batch/${apiName}/${apiVersion}`
  } else {
    return `${url.origin}/batch`
  }
}
