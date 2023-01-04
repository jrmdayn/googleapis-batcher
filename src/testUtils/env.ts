import { envsafe, str, url } from 'envsafe'

const env = envsafe({
  VITE_GOOGLEAPIS_CLIENT_ID: str(),
  VITE_GOOGLEAPIS_CLIENT_SECRET: str(),
  VITE_GOOGLEAPIS_REDIRECT_URL: url()
})

export default env
