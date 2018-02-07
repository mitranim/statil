## Description

Statil is a templating utility for static websites, intended to be used inside a Node.js script or a build system. Simplistic and low-level. Supports YAML [front matter](https://jekyllrb.com/docs/frontmatter/), like Jekyll.

If you're unfamiliar with the idea of a static site, it's a site pre-rendered from a bunch of templates into a collection of complete HTML pages. It can be served by a fast static server like nginx or a service like GitHub Pages. Great for stateless sites like repository documentation or a personal blog.

For use with `gulp`, see [`gulp-statil`](https://github.com/Mitranim/gulp-statil).

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [Usage](#usage)
* [CLI](#cli)

## Why

Static site generators tend to be needlessly complex. I just want something simple and low-level for my build system.

## Installation

```sh
npm i statil
```

## Usage

(For CLI, see [below](#cli).)

The core Statil functions are pure and free from IO.

```js
const {createSettings, renderSettings} = require('statil')

const templates = {
  'index.html': '...',
  'partials/head.html': '...',
}

const settings = createSettings(templates, {})
const output = renderSettings(settings)

// Output has the same structure as input:
const _output = {
  'index.html': '...',
  'partials/head.html': '...',
}
```

Statil also provides IO functions for self-contained build scripts:

```js
const {createSettings, renderSettings} = require('statil')
const {readFiles, writeFiles} = require('statil/lib/fs-utils')

void async function() {
  const files = await readFiles('./html')
  const settings = createSettings(files, {})
  const output = renderSettings(settings)
  await writeFiles('./dist', output)
}().catch(err => console.error(err))
```

## API

### `createSettings(templates, options)`

Creates an intermediary structure for `renderSettings`. The resulting `Settings` contain the original options, as well as the parsed templates with the additional metadata from the [front matter](https://jekyllrb.com/docs/frontmatter/). See the structure below.

The templates must have the following structure:

```js
const templates = {
  '<path>': '<content>',
}

const example = {
  'index.html': '<div>Hello world!</div>'
  'partials/head.html': '<!doctype html><title>{{$.title}}</title>',
}
```

The options may have the following structure; all fields are optional:

```js
interface Options {
  // Determines interpolation delimiters, default {{ }}
  reExpression: RegExp

  // Determines statement delimiters, default << >>
  reStatement: RegExp

  // Determines the name of the context object, default $
  contextName: string

  // Data to be made available in all templates
  context: {[string]: any}
}
```

Settings have the following structure:

```js
interface Settings {
  ...options
  context: {
    ...options.context
    templates: {[string]: string}
    entries: {[string]: Entry}
    tree: EntryTree
    render: function
  }
}

interface Entry {
  path: string
  content: string
  template: function  // created lazily when rendering
  ...
}

interface EntryTree {
  [string]: Entry | EntryTree
}
```

To include templates into each other, use `settings.context.render`:

```js
const templates = {
  main: '{{$.render($.tree.partial, $)}}'
  partial: '...',
}
```

`settings.context.tree` contains parsed entries as a hierarchy that matches the folder structure. It's a convenient way for templates to refer to each other:

```js
const templates = {
  main: '{{$.render($.tree.partial, {msg: "hello"})}}',
  partial: '{{$.msg}}',
}
```

To change the delimiters used for JS evaluation, specify `reExpression` and/or `reStatement`:

```js
const options = {
  reExpression: /{{\s*([\s\S]+?)\s*}}/g,
  reStatement: /<<\s*([\s\S]+?)\s*>>/g,
}
```

By default, the context object in templates is named `$`. To change it, specify `contextName`:

```js
const options = {
  contextName: 'ctx',
}
```

Pass a `context` to make additional data or functions available in all templates:

```js
const options = {
  md: require('marked'),
}

const templates = {
  'hello.md': '_Hello world!_',
  'index.html': '{{$.md($.render($.tree.partials["hello.md"]))}}',
}
```

### `renderSettings(settings)`

Takes settings acquired from `createSettings` and renders `settings.context.entries` into static results. The output has the same shape as the templates passed to `createSettings`.

```js
const templates = {
  main: '{{$.render($.tree.partial, {msg: "hello"})}}',
  partial: '{{$.msg}}',
}

const settings = createSettings(templates)

const {context: {entries}} = settings

for (const path in entries) {
  if (/^partial/.test(path)) delete entries[path]
}

const output = renderSettings(settings)

const _output = {
  main: 'hello',
}
```

To skip templates, modify `settings.context.entries` before calling `renderSettings`:

```js
const {context: {entries}} = settings
for (const path in entries) {
  if (/^partials/.test(path)) delete entries[path]
}
```

To rename files, modify the keys in the output, or rename the paths when passing them to whatever you use for IO.

```js
for (const path in output) {
  if (/\.md$/.test(path)) {
    output[path.replace(/\.md$/, '.html')] = output[path]
    delete output[path]
  }
}
```

## CLI

Statil comes with a barebones CLI. Example usage:

```sh
# local usage
npm i statil
$(npm bin)/statil --help

# global usage
npm i -g statil
statil --help

# compile directory
statil --dir src/html --out dist
```
