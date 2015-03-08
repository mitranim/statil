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
assumes the `index` file (ignoring extensions) in each directory to be a layout
that encloses its sibling templates and descendant templates in subdirectories.
When rendering each file, statil automatically wraps it into its sibling `index`
(if available) and each ancestral `index` (if available). Transclusion is done
at the `<%= $content %>` directive. It's an implicit hierarchy that defines the
route hierarchy of your site. You don't have to explicitly define layouts and
blocks.

### What's a Static Site?

If you're unfamiliar with the idea, a static site is a site pre-rendered from a
collection of partial templates into a collection of complete, isolated html
pages. Then it may be served as static files on a service like GitHub Pages.
It's great for stateless sites like repository documentation or personal pages.

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

## Example

Suppose you have a project structure like this:

```
./ ═╦═ ...
    ╚═ templates ═╦═ index.html
                  ╠═ partials ═╦═ navbar.html
                  ╠═ ...       ╚═ footer.html
                  ╚═ stuff ═╦═ index.html
                            ╠═ one.html
                            ╠═ ...
                            ╚═ ten.html
```

When you scan and render `templates` with statil, it expects:
* `templates/index` to wrap every other template;
* `templates/stuff/index` to wrap `one` and other templates in that directory
  (and to be wrapped by `templates/index`);
* ... ad infinitum.

In other words, when rendering any given template, the intent is to sequentially
wrap it into each `index` file ancestral to it. Each `index` is a layout for its
siblings (files in the same directory) and descendants (files in its sibling
directories).

Your `templates/index` might look like this:

```html
<!DOCTYPE html>
<html>
  <head>
    <title><%= $title || 'my awesome site' %></title>
  </head>
  <body>
    <%= $include('partials/navbar', $) %>
    <%= $content || $include('partials/index', $) %>
    <%= $include('partials/footer', $) %>
  </body>
</html>
```

Where `$include` explicitly chooses a file to import, and `$content` transcludes
the descendant template that is currently being rendered.

Each call to `render` shares one mutable locals object between the templates
that are being rendered. In combination with the depth-first approach, this lets
you propagate meta information upwards to the root template, which is exploited
by the built-in `$entitle` method and the `$title` meta string.

## Metadata

statil supports additional metadata in YAML files (YAML is a superset of JSON,
so this includes JSON). They're identified by extension: `(yaml|json)`.

Meta data is always associated with a directory, and each directory may have
only one meta file.

A metadata file describes the current directory, and its `files:` key describes
files in the directory. Each file's metadata is assigned to the locals object
passed to the template when rendering that file.

## ToDo / WIP

Include a full API reference. Consider including better example templates with
compiled versions, with an example script to compile them.
