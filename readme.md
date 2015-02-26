## Description

`statil` is the most lightweight static site generator you've ever seen. It's
a wrapper around [lodash's templating](https://lodash.com/docs#template) to
add hierarchical rendering and some useful utilities for use in templates.

It's best used with [`gulp-statil`](https://github.com/Mitranim/gulp-statil) to
rebuild your site on-the-fly as you edit.

## Motivation

Most [static site generators](https://www.staticgen.com) are trying to be
everything, do everything. They want to wash your face, walk your dog, and shag
your wife. `statil` takes a directory of templates and spits out a bunch of
compiled files. That's it. It wants to be just a tiny part of your build chain.

Another difference is that statil understands hierarchical templating. It
assumes the `index` file (extensions are ignored) in each directory to be a
layout that encloses its sibling templates and descendant templates in
subdirectories. When rendering a sibling or descendant, it will be automatically
enclosed in each parent layout. Transclusion happens at the `<%= $content %>`
directive.

### What's a Static Site?

If you're unfamiliar with the idea, a static site is a site pre-rendered from a
collection of partial templates into a collection of complete, isolated html
pages. Then it may be served as static files on a service like GitHub Pages.
It's great for stateless sites like repository documentation or a personal blog.

## Installation and Usage

In a shell:

```shell
npm i --save-dev statil
```

In a build script:

```javascript
var Statil = require('statil')

// Creates a new statil instance with the given options. The options will be
// enhanced with some defaults and passed to lodash's _.template function when
// compiling templates (see below).
var statil = new Statil(<options>)

// Walks the given directory and compiles a template from each file.
statil.scanDirectory(<dirname>)

// Renders an individual template at the given path. The locals are enhanced
// with some defaults and passed to the template when rendering.
var rendered = statil.render(<path>, <locals>)

// Produces a hash of paths and rendered strings.
var rendered = statil.renderAll(<locals>)
```

See the [`gulp-statil`](https://github.com/Mitranim/gulp-statil) documentation
for an example of integrating this with your build chain.

To run tests, clone the repo, `cd` to its directory, run `npm i`, and use:

```shell
npm test
```

To watch files and rerun tests when tinkering with the source, use:

```shell
npm run autotest
```

## ToDo / WIP

Include a full API reference. Consider including better example templates with
compiled versions, with an example script to compile them.
