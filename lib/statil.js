'use strict'

const pt = require('path')
const fm = require('front-matter')
const {compileTemplate} = require('./template')

exports.createSettings = createSettings
function createSettings(templates, options) {
  const entries = mapVals(templates, toEntry)
  const tree = toTree(entries)
  const settings = patch(options, {
    context: patch(Object(options).context, {
      templates,
      entries,
      tree,
      render(entry, locals) {
        return renderEntry(entry, settings, locals)
      },
    }),
  })
  return settings
}

exports.renderSettings = renderSettings
function renderSettings(settings) {
  const {context: {entries}} = settings
  const out = {}
  for (const path in entries) {
    out[path] = renderEntry(entries[path], settings, undefined)
  }
  return out
}

function renderEntry(entry, templateSettings, locals) {
  validate(entry, isEntry)

  if (!entry.compiledTemplate) {
    try {
      entry.compiledTemplate = compileTemplate(entry.body, templateSettings)
    }
    catch (err) {
      throw new DerivedError(`failed to compile entry at path ${entry.path}: ${err.message}`, err)
    }
  }

  try {
    return entry.compiledTemplate(patch(entry, locals))
  }
  catch (err) {
    throw new DerivedError(`failed to render entry at path ${entry.path}: ${err.message}`, err)
  }
}

function toEntry(template, path) {
  const {attributes, body} = fm(template)

  function isCurrent(subpath, opts) {
    return opts && opts.exact ? samePath(subpath, path) : pathStartsWith(subpath, path)
  }

  function current(subpath, opts) {
    return isCurrent(subpath, opts) ? 'aria-current' : ''
  }

  return patch(
    {template, compiledTemplate: undefined, path, body, isCurrent, current},
    attributes
  )
}

function toTree(templates) {
  const out = {}
  for (const path in templates) {
    setIn(out, path.split(pt.sep), templates[path])
  }
  return out
}

function setIn(ref, path, value) {
  const last = path[path.length - 1]
  for (const key of path.slice(0, -1)) {
    if (!isObject(ref[key])) ref[key] = {}
    ref = ref[key]
  }
  ref[last] = value
}

class DerivedError extends Error {
  constructor(message, cause) {
    super(message)
    this.cause = cause
  }
  get name() {return this.constructor.name}
}

function patch(...args) {
  return Object.assign({}, ...args.filter(isDict))
}

function mapVals(value, fun) {
  const out = {}
  for (const key in value) out[key] = fun(value[key], key)
  return out
}

function toSegments(path) {
  return isString(path) ? path.split('/').filter(Boolean) : undefined
}

function samePath(one, other) {
  return listEqual(toSegments(one), toSegments(other))
}

function pathStartsWith(full, start) {
  if (!isString(full) || !isString(start)) return false
  start = toSegments(start)
  return listEqual(start, toSegments(full).slice(0, start.length))
}

function listEqual(one, other) {
  if (!Array.isArray(one) || !Array.isArray(other) || one.length !== other.length) {
    return false
  }
  for (let i = -1; ++i < one.length;) {
    if (!Object.is(one[i], other[i])) return false
  }
  return true
}

function isObject(value) {
  return value != null && typeof value === 'object'
}

function isDict(value) {
  return isObject(value) && isPlainPrototype(Object.getPrototypeOf(value))
}

function isPlainPrototype(value) {
  return value === null || value === Object.prototype
}

function isFunction(value) {
  return typeof value === 'function'
}

function isString(value) {
  return typeof value === 'string'
}

function isEntry(value) {
  return isObject(value) && 'path' in value && 'body' in value
}

function validate(value, test) {
  if (!isFunction(test)) throw Error(`Expected validator function, got ${show(test)}`)
  if (!test(value)) throw Error(`Expected ${show(value)} to satisfy test ${show(test)}`)
}

function show(value) {
  return isFunction(value) ? (value.name || value.toString()) : String(value)
}
