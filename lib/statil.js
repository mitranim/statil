'use strict'

const _ = require('lodash')
const fs = require('fs')
const glob = require('glob')
const pt = require('path')

const delimiters = {
  interpolate: /{{([^]+?)}}/g,
  escape: /{{-([^]+?)}}/g,
  evaluate: /{%([^]+?)%}/g,
}

exports.renderBatch = renderBatch
function renderBatch (files, options) {
  options = merge(delimiters, options, {imports: {files}})

  const templates = _.mapValues(files, _.partial(template, options))

  return _(templates)
    .omitBy(shift1(pathIgnore(options)))
    .mapValues(renderer(templates, options))
    .mapKeys(shift1(pathRename(options)))
    .value()
}

function template (options, source, path) {
  try {
    return _.template(source, options)
  } catch (err) {
    err.message = `Error when compiling ${path}:\n${err.message}`
    throw err
  }
}

exports.renderDir = renderDir
function renderDir (dirname, options) {
  const paths = _.mapKeys(
    glob.sync(pt.join(dirname, '/**/*'), {nodir: true}),
    path => removeFromStart(path, pt.join(dirname, '/'))
  )
  return renderBatch(_.mapValues(paths, readAsUtf), options)
}

/**
 * Utils
 */

function merge () {
  return _.reduce(arguments, _.merge, {})
}

function removeFromStart (string, prefix) {
  return _.startsWith(string, prefix) ? string.replace(prefix, '') : string
}

function readAsUtf (path) {
  return fs.readFileSync(path, 'utf8')
}

function shift1 (fun) {
  return function shifted1 (__, key) {
    return fun(key)
  }
}

function pathIgnore ({ignorePath}) {
  return (
    !_.isFunction(ignorePath)
    ? False
    : function maybeIgnore (path) {
      return ignorePath(path, pt.parse(path))
    }
  )
}

function False () {return false}

function pathRename ({renamePath}) {
  return (
    !_.isFunction(renamePath)
    ? _.identity
    : function maybeRename (path) {
      return renamePath(path, pt.parse(path))
    }
  )
}

function renderer (templates, options) {
  return function renderer_ (template, path) {
    return renderAtPath(path, templates, merge(options, {locals: {path}}))
  }
}

function renderAtPath (templatePath, templates, options, locals) {
  if (!templates[templatePath]) {
    throw Error(`No template found at path: ${templatePath}`)
  }

  let extend = null

  options = merge(options, {locals: _.defaults(merge(locals), {
    include (path, locals) {
      return renderAtPath(path, templates, options, locals)
    },
    extend (path, locals) {
      extend = {path, locals}
    },
    active (path) {
      return isPathActive(path, options.locals.path) ? 'class="active"' : ''
    },
    act (path) {
      return isPathActive(path, options.locals.path) ? 'active' : ''
    }
  })})

  let content = runTemplate(templates[templatePath], options.locals)

  if (_.isFunction(options.postProcess)) {
    content = options.postProcess.call(null, content, templatePath, pt.parse(templatePath))
  }

  if (extend) {
    content = renderAtPath(
      extend.path,
      templates,
      merge(options, {locals: {content}}),
      extend.locals
    )
  }

  return content
}

function runTemplate (template, locals) {
  try {
    return template(locals)
  } catch (err) {
    if (locals.path) {
      err.message = `Error when rendering ${locals.path}:\n${err.message}`
    }
    throw err
  }
}

function isPathActive (sub, path) {
  return pt.relative(
    sub.replace(pt.extname(sub), ''),
    path.replace(pt.extname(path), '')
  )[0] !== '.'
}
