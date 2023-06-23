# Running integration tests locally

In order to run the integration tests locally (*.spec.ts files):
1. copy the file `.googleapis-credentials.template.json` at the root of this project and rename it `.googleapis-credentials.json`
1. go to [Google's OAuth Playground](https://developers.google.com/oauthplayground/)
1. select the required scopes in step 1 (at the moment, https://www.googleapis.com/auth/calendar is sufficient) then hit "Authorize APIs" button
1. in step 2 press "Exchange authorization code for tokens"
1. in the right panel (Request / Response) you should see a JSON at the bottom with the same shape as `.googleapis-credentials.json`: copy paste the content to `.googleapis-credentials.json`

You can now run the integration tests
