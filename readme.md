## Description

Templating utility for static websites, intended for a Node.js script or build system. Simplistic and low-level. Supports YAML [front matter](https://github.com/jxson/front-matter), like Jekyll. Uses JavaScript for template scripting.

If you're unfamiliar with the idea of a static site, it's a site pre-rendered from a bunch of templates into a collection of complete HTML pages. It can be served by a fast static server like nginx or a service like GitHub Pages. Great for stateless sites like repository documentation or a personal blog.

For use with `gulp`, see [`gulp-statil`](https://github.com/Mitranim/gulp-statil).

Statil is intended for templates that embed JS. For the _opposite_, when you want to write templates primarily in JavaScript, using JSX, see the spiritually related library [Papyre](https://github.com/Mitranim/papyre).

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [Usage](#usage)
* [CLI](#cli)

## Why

Static site generators tend to be needlessly complex. I just want something simple and low-level.

## Installation

```sh
npm i statil
```

## Usage

Things to understand: (1) [templates](#templates); (2) [API](#api).

### Templates

Templates are strings with the following structure:

```
---
(optional metadata in YAML format)
---

(body)
```

In [`createSettings`](#createsettingstemplates-options), each template is parsed into an entry with its `path`, the YAML front matter, and the remaining `body`. The body is converted to JS code during rendering.

Template bodies may include arbitrary JS code like so:

```
---
title: Home
---

<!-- expression -->
<span>{{$.title.toLowerCase()}}</span>

<!-- statements -->
<< const {path, title} = $ >>
<< console.log(title) >>

<!-- conditionals just work -->
<< if (true) { >>
  <div>one</div>
<< } else { >>
  <div>other</div>
<< } >>

<!-- loops just work -->
<< for (const i of [10, 20, 30]) { >>
  <span>{{i}}</span>
<< } >>
```

The `<< >>` and `{{ }}` delimiters are configurable.

Templates are executed with one argument, the data context, by default called `$`. It contains the base context from [`createSettings`](#createsettingstemplates-options), the bonus data included by Statil, and the template's local data:

```
<< console.info($) >>
```

To render and include another template, call `$.render`, passing a parsed entry from `$.tree` and a data context:

```
<!-- Partial context -->
{{$.render($.tree.partials['head.html'], {title: 'Home'})}}

<!-- Full context -->
{{$.render($.tree.partials['head.html'], $)}}
```

Statil doesn't support "include me" relations where a template asks to be included into an outer layout. Instead, define head/foot partials and include them on each page like so:

```html
<!-- partials/head.html -->

<!doctype html>
<title>{{$.title || 'Home'}}</title>
<link rel="stylesheet" type="text/css" href="styles/main.css">
```

```html
<!-- partials/foot.html -->

<script src="scripts/main.js"></script>
```

```html
<!-- index.html -->

{{$.render($.tree.partials['head.html'], $)}}

<div>Hello world!</div>

{{$.render($.tree.partials['foot.html'], $)}}
```

### API

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
'use strict'

const {createSettings, renderSettings} = require('statil')
const {readFiles, writeFiles} = require('statil/lib/fs-utils')

void async function main() {
  try {
    const files = await readFiles('./html')
    const settings = createSettings(files, {})
    const output = renderSettings(settings)
    await writeFiles('./dist', output)
  }
  catch (err) {
    console.error(err)
    process.exit(1)
  }
}()
```

### API

#### `createSettings(templates, options)`

Creates an intermediary structure for [`renderSettings`](#rendersettingssettings). The resulting `Settings` contain the original options, as well as the parsed templates with the additional metadata from the [front matter](https://github.com/jxson/front-matter). See the structure below.

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
  template: string
  compiledTemplate: function  // created lazily when rendering
  path: string
  body: string
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
  'index.html': '{{$.render($.tree.partials.message, {msg: "hello"})}}',
  'partials/message': '{{$.msg}}',
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

Stuff in `options.context` becomes available in all templates:

```js
const options = {
  context: {
    md: require('marked'),
  },
}

const templates = {
  'hello.md': '_Hello world!_',
  'index.html': '{{$.md($.render($.tree.partials["hello.md"], $))}}',
}
```

#### `renderSettings(settings)`

Takes settings acquired from [`createSettings`](#createsettingstemplates-options) and renders `settings.context.entries` into static results. The output has the same shape as the templates passed to `createSettings`.

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

To skip templates, modify `settings.context.entries` before calling [`renderSettings`](#rendersettingssettings):

```js
const {context: {entries}} = settings
for (const path in entries) {
  if (/^partial/.test(path)) delete entries[path]
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
statil --src src/html --out dist
```

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
