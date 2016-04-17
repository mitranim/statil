'use strict'

const _ = require('lodash')
const fs = require('fs')
const glob = require('glob')
const pt = require('path')

const delimiters = {
  interpolate: /{{([^]+?)}}/g,
  escape: /{{-([^]+?)}}/g,
  evaluate: /{%([^]+?)%}/g
}

exports.batch = batch
function batch (files, options) {
  options = merge(delimiters, options, {data: {files}})

  const templates = _.mapValues(files, (source, path) => {
    try {
      return _.template(source, options)
    } catch (err) {
      err.message = `Error when compiling ${path}:\n${err.message}`
      throw err
    }
  })

  return _(templates)
    .pickBy(invert(pathFilter(options.ignorePaths)))
    .mapValues(renderer(templates, options))
    .mapKeys(invert(renamer(options)))
    .value()
}

exports.dir = dir
function dir (dirname, options) {
  const paths = _.mapKeys(
    glob.sync(dirname + '/**/*', {nodir: true}),
    path => shorten(path, dirname)
  )

  const files = _.mapValues(paths, path => fs.readFileSync(path, 'utf8'))

  return batch(files, options)
}

/**
 * Utils
 */

function merge () {
  return _.reduce(arguments, _.merge, {})
}

function shorten (string, prefix) {
  prefix += '/'
  return string.indexOf(prefix) === 0 ? string.replace(prefix, '') : string
}

function invert (func) {
  return (__, key) => func(key)
}

function pathFilter (predicate) {
  if (predicate instanceof Array) return path => !~predicate.indexOf(path)
  if (typeof predicate === 'function') return path => !predicate(path)
  return () => true
}

function renderer (templates, options) {
  return (template, path) => render(templates, path, merge(options, {data: {path}}))
}

function renamer (options) {
  if (typeof options.rename === 'function') {
    return path => {
      if (_.includes(options.renameExcept, path)) return path
      return options.rename.call(null, path)
    }
  }
  if (typeof options.rename === 'string') {
    return path => {
      if (_.includes(options.renameExcept, path)) return path
      path = pt.join(pt.parse(path).dir, pt.parse(path).name)
      return path.replace(path, options.rename)
    }
  }
  return _.identity
}

function render (templates, templatePath, options, locals) {
  if (!templates[templatePath]) {
    throw Error(`No template found at path: ${templatePath}`)
  }

  let extend = null

  options = merge(options, {data: _.defaults(merge(locals), {
    include (path, data) {
      return render(templates, path, options, data)
    },
    extend (path, data) {
      extend = {path, data}
    },
    active (path) {
      return isActive(path, options.data.path) ? 'class="active"' : ''
    },
    act (path) {
      return isActive(path, options.data.path) ? 'active' : ''
    }
  })})

  let content = exec(templates[templatePath], options.data)

  content = pipe(content, templatePath, options.pipeline)

  if (extend) {
    content = render(
      templates,
      extend.path,
      merge(options, {data: {content}}),
      extend.data
    )
  }

  return content
}

function exec (template, data) {
  try {
    return template(data)
  } catch (err) {
    if (data.path) {
      err.message = `Error when rendering ${data.path}:\n${err.message}`
    }
    throw err
  }
}

function isActive (sub, path) {
  sub = sub.replace(pt.extname(sub), '')
  path = path.replace(pt.extname(path), '')
  return pt.relative(sub, path)[0] !== '.'
}

function pipe (content, path, pipeline) {
  if (pipeline instanceof Array) {
    content = pipeline.reduce((content, func) => {
      const result = func(content, path)
      return result == null ? content : result
    }, content)
  }
  return content
}
