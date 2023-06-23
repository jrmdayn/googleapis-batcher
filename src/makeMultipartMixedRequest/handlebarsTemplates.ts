import handlebars from 'handlebars'

const helpers = {
  inc: (x: number): number => x + 1,
  json: JSON.stringify
}

export const useBodyTemplate = (context: unknown): string =>
  handlebars.compile(
    `
{{#each requests}}
--{{../boundary}}
Content-Type: application/http
Content-ID: {{inc @index}}

{{method}} {{path}} HTTP/1.1
Accept: application/json
{{#each headers}}
{{@key}}: {{this}}
{{/each}}
{{#if body}}

{{{body}}}
{{/if}}


{{/each}}
{{#if requests}}
--{{boundary}}--
{{/if}}`
  )(context, { helpers })

export const useFullTemplate = handlebars.compile(
  `
{{method}} {{batchUrl}} HTTP/1.1
{{#each headers}}
{{@key}}: {{{this}}}
{{/each}}

{{{body}}}`
)
