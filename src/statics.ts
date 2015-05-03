/**
 * Static methods and utilities.
 */

/******************************* Dependencies ********************************/

import _ from 'lodash'
import * as pt from 'path'

/********************************** Statics **********************************/

/**
 * Pure hash table.
 */
export class Hash {
  constructor(attrs?: any) {_.assign(this, attrs)}
}
Hash.prototype = Object.create(null)

/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 */
export function split(path: string): string[] {
  validateTruthyString(path)

  var parts = path.split(pt.sep)
  var compounded = []

  // Compound each path.
  parts.forEach((part, index) => {
    // If this is a directory, disallow the name 'index'.
    if (index !== parts.length - 1 && part === 'index') {
      throw new Error("name 'index' is not allowed for directories")
    }

    // Add the compounded part.
    compounded.push(pt.join.apply(pt, parts.slice(0, index + 1)))
  })

  // Add the 'index' template name to each directory's path.
  compounded.slice(0, compounded.length - 1).forEach((p, index) => {
    compounded[index] = pt.join(compounded[index], 'index')
  })

  // Add the implicit base 'index' template.
  compounded.unshift('index')

  // Remove the duplicates that occur when the path references an index template.
  compounded = _.uniq(compounded)

  return compounded
}

/**
 * Base transcluder template used as a substitute for a missing 'index' file.
 */
export var transclude: Function = _.template('<%= $content %>')

/**
 * Resolves a legend relatively to a meta by echoing it zero or more times,
 * according to its echo property.
 */
export function echoLegend(meta: {}, legend: Legend): Legend[] {
  // Validate the input.
  validateWritable(meta)
  validateLegend(legend)

  // In absence of an echo property, echo the legend as itself.
  if (!_.has(legend, 'echo')) return [legend]
  // Resolve the echos relatively to the meta.
  var echos: Legend[] = resolveEchos(meta, legend.echo)

  // Make each echoed legend inherit from the original and add its own
  // properties.
  echos = _.map(echos, echo => {
    var copy = Object.create(legend)
    _.assign(copy, echo)
    return copy
  })

  // Resolve each sublegend and concat the result.
  return _.flatten(echos.map(_.curry(echoLegend)(meta)))
}

/**
 * Resolves the given echos key or array relatively to the given meta.
 */
export function resolveEchos(meta: {}, echo?: string|Legend[]): Legend[] {
  var echos: Legend[] = []
  // If the echo is a string, assume it to be a key for a meta property.
  if (typeof echo === 'string') echos = meta[echo]
  else echos = echo
  // Mandate the result to be an array of legends.
  if (!_.isArray(echos)) {
    throw new TypeError(`expected echos to resolve to an array, got: ${echos}`)
  }
  _.each(echos, validateLegend)
  return echos
}

/**
 * Strips extension from given path, leaving dirname and basename.
 */
export function stripExt(path: string): string {
  validateTruthyString(path)
  return pt.join(pt.dirname(path), pt.parse(path).name)
}

/*------------------------------- Validators --------------------------------*/

/**
 * Validates a writable object.
 */
export function validateWritable(value: {}): void {
  if (!_.isObject(value)) {
    throw new TypeError(`expected a writable object, got: ${value}`)
  }
}

/**
 * Validates a file legend.
 */
export function validateLegend(legend?: Legend): void {
  validateWritable(legend)
  if (typeof legend.name !== 'string' || !legend.name) {
    throw new TypeError(`expected a legend to contain a non-empty name, got: ${legend.name}`)
  }
}

/**
 * Validates a string.
 */
export function validateString(value?: string): void {
  if (typeof value !== 'string') {
    throw new TypeError(`expected a string, got: ${value}`)
  }
}

/**
 * Validates a non-empty string.
 */
export function validateTruthyString(value?: string): void {
  validateString(value)
  if (!value) {
    throw new TypeError(`expected a non-empty string, got: ${value}`)
  }
}
