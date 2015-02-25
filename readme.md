## Description

`statil` is the most lightweight static site generator you've ever seen. It's
a wrapper around [lodash's templating](https://lodash.com/docs#template) to
add hierarchical rendering and some useful utilities for use in templates.

It's best used with [`gulp-statil`](https://github.com/Mitranim/gulp-statil) to
rebuild your site on-the-fly as you edit.

## Motivation

Most static site generators are trying to be everything, do everything. They
want to wash your face, walk your dog, and shag your wife (or husband). `statil`
simply takes a directory of templates and spits out a bunch of compiled files.
That's it. It wants to be just a tiny part of your build chain.

Another difference is that statil understands hierarhical templating. It assumes
'index.html' (or whatever your preferred extension) in each directory to be a
layout that encloses descendant templates in subdirectories. When rendering a
descendant, it will be automatically enclosed in each parent 'index'. The inner
content is transcluded with the `<%= $content %>` directive; you choose where to
put it, if at all.

## Installation and Usage

In a shell:

```shell
npm i --save-dev statil
```

In a build script:

```javascript
var Statil = require('statil')

// Create a new statil instance with the given options. The options are enhanced
// with some useful defaults and passed to lodash's _.template function.
var statil = new Statil(<options>)

// Walk the given directory and compile a template from each file.
statil.scanDirectory(<dirname>)

// Renders an individual template at the given path. The locals are enhanced
// with some useful defaults and passed to the template when rendering.
var rendered = statil.render(<path>, <locals>)

// Produces a hash of paths and rendered strings.
var rendered = statil.renderAll(<locals>)
```

See the [`gulp-statil`](https://github.com/Mitranim/gulp-statil) documentation
for an example of integrating this with your build chain.

## ToDo / WIP

Include a full API reference.
Write tests.
