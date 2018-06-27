## Description

Templating function, very similar to `lodash/template`. Embeds JavaScript into templates.

Lightweight: < 100 lines of code, dependency-free.

Differences from `lodash/template`:

  * doesn't carry the entire Lodash with it
  * always strict mode
  * no `with`, no implicit globals, no imports
  * better default delimiters: `{{ expression }}` and `<< statement >>`
  * no special escape delimiter, escape manually
  * better option naming
  * slightly more readable compiled code

Statil is intended for templates that embed JS. For the _opposite_, when you want to write templates primarily in JavaScript, using JSX, see the spiritually related library [Papyre](https://github.com/Mitranim/papyre).

## Why

Simple templating. Extremely flexible. Extremely lightweight.

Alternatives tend to involve monstrously large dependencies like Lodash.

## Usage

Short form:

```js
const {compileTemplate} = require('statil')

compileTemplate(`Hello {{$.name}}!`)({name: 'world'})
// 'Hello world!'
```

Long form:

```js
const {compileTemplate} = require('statil')

const templateStr = `Hello {{$.name}}!`

// Optional settings
const options = void {
  reExpression: /{{\s*([\s\S]+?)\s*}}/g,
  reStatement: /<<\s*([\s\S]+?)\s*>>/g,
  contextName: '$',
}

const template = compileTemplate(templateStr, options)

template({name: 'world'})
// 'Hello world!'
```

For control flow, use `<< statements >>`:

```js
const templateStr = `
<< for (const name of $.names) { >> {{name}} << } >>
`

compileTemplate(templateStr)({names: ['one', 'two', 'three']})
//  one  two  three
```

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
