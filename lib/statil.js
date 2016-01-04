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

  const templates = _.mapValues(files, source => _.template(source, options))

  return _.mapValues(
    _.pick(templates, (__, path) => allow(path, options.ignorePaths)),
    (template, path) => render(templates, template, merge(options.data, {path}))
  )
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

function allow (path, predicate) {
  if (predicate instanceof Array) return !~predicate.indexOf(path)
  if (typeof predicate === 'function') return !predicate(path)
  return true
}

function render (templates, template, data, locals) {
  let extend = null

  data = merge(data, _.defaults(merge(locals), {
    include (path, _data) {
      if (!(path in templates)) throw Error(`No template found at path: ${path}`)
      return render(templates, templates[path], data, _data)
    },
    extend (path, data) {
      if (!(path in templates)) throw Error(`No template found at path: ${path}`)
      extend = {path, data}
    },
    active (path) {
      return data.path && isActive(path, data.path) ? 'class="active"' : ''
    },
    act (path) {
      return data.path && isActive(path, data.path) ? 'active' : ''
    }
  }))

  let content = exec(template, data)

  if (extend) {
    content = render(
      templates,
      templates[extend.path],
      merge(data, {content}),
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
      err.message = `Error when rendering file at path ${data.path}:\n${err.message}`
    }
    throw err
  }
}

function isActive (sub, path) {
  sub = sub.replace(pt.extname(sub), '')
  path = path.replace(pt.extname(path), '')
  return pt.relative(sub, path)[0] !== '.'
}
