[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com)

## Description

Statil is a lightweight HTML generator for static sites. It's essentially a
tiny wrapper around [lodash's templating](https://lodash.com/docs#template) that
processes templates as a group where they can include and extend each other.

Best used with [`gulp-statil`](https://github.com/Mitranim/gulp-statil) to
rebuild your site on-the-fly as you edit.

## TOC

* [Description](#description)
* [Motivation](#motivation)
* [Installation](#installation)
* [API](#api)
* [Templating](#templating)
* [CLI](#cli)

## Motivation

Most static generators are bloated frameworks that run as their own process and
don't integrate with anything else. I want a generator that is also a JS
_library_ that can be integrated into a Gulp build.

If you're unfamiliar with the idea of a static site, it's a site pre-rendered
from a bunch of templates into a collection of complete HTML pages. It can be
served by a fast static server like nginx or a service like GitHub Pages. Great
for stateless sites like repository documentation or a personal blog.

## Installation

In a shell:

```sh
npm i --save-dev statil
```

In a script:

```javascript
const statil = require('statil')
```

## API

### `renderBatch(files, options)`

Takes a dict where keys are paths and values are template strings. In addition,
accepts options (see below). Returns a dict where paths are mapped to rendered
results.

```js
'use strict'

const {renderBatch} = require('statil')

const input = {
  'index.html': `{{include('partials/header.html')}}<div>{{title}}</div>`,
  'about.html': `{{extend('index.html', {title: 'About'})}}`,
  'partials/header.html': `<div>Mock</div>`,
}

const options = {
  ignorePath: path => path === 'index.html' || /^partials/.test(path),
}

renderBatch(input, options)
// {'about.html': '<div>Mock</div><div>About</div>'}
```

### `renderDir(dirname, options)`

Takes a directory name (relative to `process.cwd()`), reads all files from it,
and returns a dict of file paths mapped to rendered results. Uses `renderBatch`
internally. It reads files _synchronously_, blocking the entire Node VM, so this
should only be used for simple and dirty build scripts.

Example:

```javascript
'use strict'

const statil = require('../lib/statil')
const fs = require('fs')
const pt = require('path')
const mkdirp = require('mkdirp')

// This is where rendering happens
const files = statil.renderDir('html', {ignorePath: path => path === 'index.html'})

// This is where we write results to disk
mkdirp.sync('dist')
for (const path in files) {
  mkdirp.sync(pt.dirname(pt.join('dist', path)))
  fs.writeFileSync(pt.join('dist', path), files[path], 'utf8')
}
```

### Options

```sh
ignorePath :: ƒ(path :: string, parsed :: dict) -> boolean

  (Optional)

  Called for each file. May exclude the file from rendering by returning `true`.
  The file will still be available for `include` and `extend` in other templates.
  The second argument is provided via `require('path').parse(path)`.

  Example:

    const options = {ignorePath: path => /^partials/.test(path)}

renamePath :: ƒ(path :: string, parsed :: dict) -> string

  (Optional)

  Called for each file after rendering to modify its path. Convenient when you
  want to convert individual HTML templates to "folders" by appending 'index.html'.
  The second argument is provided via `require('path').parse(path)`.

  Example:

    const pt = require('path')

    const options = {
      renamePath: (path, {dir, base, name}) => (
        base === 'index.html'
        ? path
        : pt.join(dir, name, 'index.html')
      )
    }

postProcess :: ƒ(content :: string, path :: string, parsed :: dict) -> string

  (Optional)

  Called for each file after rendering. Gets a chance to modify the result.
  Receives the rendered content, the raw template path, and its parsed version
  via `require('path).parse(path)`. Returns the new content.

  Example of using `postProcess` for markdown:

    const options = {
      postProcess: (content, path, {ext}) => (
        ext === '.md'
        ? marked(content)
        : content
      )
    }
```

Other options are passed directly to lodash's `_.template`. Refer to its
<a href="https://lodash.com/docs#template" target="_blank">documentation</a>.

## Templating

By default, Statil uses Django-style delimiters. You can customise them by
passing custom regexes (see lodash's template docs).

Statil makes the functions listed below available in templates.

### `extend(path, locals)`

Causes the current template to be wrapped by the template at the given path,
making `locals` available in that template's scope. The compiled contents are
available in the outer template as the variable `content`.

```html
<!-- about.html -->

{% extend('index.html', {title: 'about'}) %}

<h1>about us</h1>
```

```html
<!-- index.html -->

{{content}}
```

### `include(path, locals)`

Renders the template at the given path, making `locals` available in that
template's scope.

```html
<article>
  {{include('partials/header.html', {title: 'kitty pics'})}}
</article>
```

### `active(path)`

Returns `class="active"` if the given path is within the path of the current
template. Useful for active route indicators on anchors.

The current path is available in templates as the variable `path`. Calls to
`extend` and `include` don't affect it; a partial or outer template will be
rendered several times with a different `path`.

```html
<a href="/about" {{active('about')}}>about us</a>
```

### `act(path)`

Same as `active` but simply returns the string `'active'` or `''`.

```html
<a href="/about" class="nav {{act('about')}}">about us</a>
```

## CLI

Statil comes with a self-documenting CLI. Example usage:

```sh
# local usage
npm i statil
$(npm bin)/statil -h

# global usage
npm i -g statil
statil -h

# compile directory
statil --dir src/html --out dist
```
