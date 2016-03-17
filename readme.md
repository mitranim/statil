[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com)

## Description

`statil` is a lightweight HTML generator for static sites. It's essentially a
tiny wrapper around [lodash's templating](https://lodash.com/docs#template) that
adds the ability to `include` and `extend` templates from other templates.

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

Other static generators are effing bloated and don't integrate well with gulp.

If you're unfamiliar with the idea of a static site, it's a site pre-rendered
from a bunch of templates into a collection of complete html pages. It can be
served as static files by a fast server like nginx or a service like GitHub
Pages. Great for stateless sites like repository documentation or a personal
blog.

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

### `batch(files, options)`

Takes a map of paths to file contents and a map of options (see below). Returns
a map of paths to compiled results.

### `dir(dirname, options)`

Takes a relative directory name, reads all files, and returns a map of paths to
compiled files. Uses `batch` internally. Example:

```javascript
'use strict'

const statil = require('../lib/statil')
const fs = require('fs')
const pt = require('path')

const files = statil.dir('html', {ignorePaths: ['index.html']})

mkdir('dist')

// Write results to disk.
for (const path in files) {
  mkdir(pt.dirname(pt.join('dist', path)))
  fs.writeFileSync(pt.join('dist', path), files[path], 'utf8')
}

function mkdir (path) {
  path = path.split('/')
  for (let i = 0; i++ < path.length;) {
    const dir = path.slice(0, i).join('/')
    try {
      fs.accessSync(dir)
    } catch (err) {
      fs.mkdirSync(dir)
    }
  }
}
```

### Options

```sh
data :: any

  Local data that will be available in templates.

ignorePaths :: [string] | (string -> boolean)

  A list of paths to ignore or a function that filters paths. Example:

    ['partials/index.html']

rename :: string | (string -> string)

  If a string, it's passed as a second argument to `path.replace()` (built-in
  `String.prototype.replace`). Renaming ignores paths included into
  `options.renameExcept`. If a function, it's used to transform each path.

renameExcept :: [string]

  List of paths to ignore in `options.rename`.

pipeline :: [((string, string) -> string)]

  List of functions that get called with `(content, path)` when rendering
  each template, receiving each other's result as first argument. This can be
  used for post-processing like markdown rendering.
```

Other options are passed directly to lodash's `_.template`. Refer to its
<a href="https://lodash.com/docs#template" target="_blank">documentation</a>.

## Templating

By default, statil uses Django-style delimiters. You can customise them by
passing custom regexes (see lodash's template docs).

Statil makes the functions listed below available in templates.

### `extend(path, data)`

Causes the current template to be wrapped by the template at the given path,
passing any additional data. The compiled contents are available in the outer
template as the variable `content`.

```html
<!-- about.html -->

{% extend('index.html', {title: 'about'}) %}

<h1>about us</h1>
```

```html
<!-- index.html -->

{{content}}
```

### `include(path, data)`

Renders the template at the given path, passing any additional data.

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

statil comes with a self-documenting CLI. Example usage:

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
