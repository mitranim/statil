## Description

Simple templating function, very similar to `lodash/template`.

Lightweight: < 100 lines of code, dependency-free.

Differences from `lodash/template`:

  * doesn't carry the entire Lodash with it
  * always strict mode
  * no `with` or implicit globals
  * better default delimiters: {{ expression }} and << statement >>
  * no escape delimiter, escape manually
  * better option naming
  * slightly more readable compiled code

## Usage

```js
const {compileTemplate} = require('statil')

const templateStr = `Hello {{$.name}}!`

const template = compileTemplate(templateStr)

template({name: 'world'})
// 'Hello world!'
```

## Why

Occasionally you want simple templating and don't want a monstrously large dependency like Lodash.

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
