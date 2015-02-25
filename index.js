'use strict'

/******************************* Dependencies ********************************/

var _    = require('lodash')
var fs   = require('fs')
var pt   = require('path')
var glob = require('glob')

/********************************* Utilities *********************************/

/**
 * Pure utilities that don't reference any state.
 */

/**
 * Clones the given value into a pure hash table.
 * @returns Hash
 */
function clone(hash) {
  var buffer = Object.create(null)

  if (!_.isObject(hash)) return buffer

  for (var key in hash) {
    buffer[key] = hash[key]
  }

  return buffer
}

/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 * @param String path
 * @returns Array[String]
 */
function split(path) {
  if (typeof path !== 'string') throw new Error("can't split a non-string")
  if (!path) throw new Error("can't split an empty path")

  var parts = path.split(pt.sep)
  var compounded = []

  // Compound each path.
  parts.forEach(function(part, index) {
    // If this is a directory, disallow the name 'index'.
    if (index !== parts.length - 1 && part === 'index') {
      throw new Error("name 'index' is not allowed for directories")
    }

    // Add the compounded part.
    compounded.push(pt.join.apply(pt, parts.slice(0, index + 1)))
  })

  // Add the 'index' template name to each directory's path.
  compounded.slice(0, compounded.length - 1).forEach(function(p, index) {
    compounded[index] = pt.join(compounded[index], 'index')
  })

  // Add the implicit base 'index' template.
  compounded.unshift('index')

  // Remove the duplicates that occur when the path references an index template.
  compounded = _.uniq(compounded)

  return compounded

}

/********************************** Statil ***********************************/

/**
 * Statil constructor. Takes a hash of options and generates a vanilla statil.
 * Supported options:
 *
 * @name imports
 * @type Hash
 * @description Hash table of default attributes and methods that will be made
 * available to each template.
 *
 * @name locals
 * @type Hash
 * @description Hash table of default values that will be made available to
 * each template as a part of the locals object (the data hash passed to the
 * template when rendering).
 */
function Statil(options) {
  // Self-correct when called without 'new'.
  if (!(this instanceof Statil)) return new Statil(options)

  // Make sure options is an object.
  if (!_.isObject(options)) options = Object.create(null)

  /**
   * Stored options.
   * @type Hash
   */
  this.options = options

  /**
   * Hash table of parsed template paths to source strings.
   * @type Hash{String}
   */
  this.sources = Object.create(null)

  /**
   * Hash table of parsed template paths to compiled templates.
   * @type Hash{Function}
   */
  this.templates = Object.create(null)

  /**
   * Array of parsed template paths.
   * @type Array
   */
  this.paths = null

  /**
   * Base transcluder template used as a substitute for missing 'index' files.
   * @type Function
   */
  this.transclude = _.template('<%= $content %>')
}

/**
 * Registers the given template under the given path. The path is assumed to
 * be a path to a file, and it's parsed to remove the file extension. If
 * srcDir is passed, the path is rebased relatively to it. This mutates three
 * values in the statil: the .paths array (adds the parsed path), the .sources
 * hash (adds the given source under the parsed path), and the .templates hash
 * (adds the compiled template under the parsed path). All three arguments
 * must be strings; srcDir is optional.
 * @param String source
 * @param String path
 * @param String srcDir (optional)
 */
Statil.prototype.register = function(source, path, srcDir) {
  // Validate the arguments.
  if (typeof source !== 'string') {
    throw new Error("source must be a string")
  }
  if (typeof path !== 'string' || !path) {
    throw new Error("path must be a non-empty string")
  }
  if (srcDir != null && typeof srcDir !== 'string') {
    throw new Error("srcDir must be a string")
  }

  // If srcDir is given, rebase the path.
  if (srcDir) {
    path = pt.relative(srcDir, path)
  }

  // Strip the file extension.
  path = pt.join(pt.parse(path).dir, pt.parse(path).name)

  // Register the parsed path.
  this.paths = _.union(this.paths, [path])

  // Register the source.
  this.sources[path] = source

  // Compile and register the template.
  this.templates[path] = _.template(source, this.templateOptions())
}

/**
 * Scans the directory at the given path, relative to the cwd of the current
 * process, and registers each file's contents as a template under its parsed
 * path.
 */
Statil.prototype.scanDirectory = function(srcDir) {
  if (typeof srcDir !== 'string' || !srcDir) {
    throw new Error("please specify a path to a template directory to scan")
  }

  // Store self for use in lambdas.
  var self = this

  // Read the paths of the templates in the given directory.
  var paths = glob.sync(pt.join(srcDir, '**/*'), {nodir: true, nonull: true})

  // Read and register each file.
  paths.forEach(function(path) {
    self.register(fs.readFileSync(path, 'utf-8'), path, srcDir)
  })
}

/**
 * Generates a hash of default options to pass to lodash's template parser,
 * then merges it with the options that were provided to this statil's
 * constructor.
 * @returns Hash
 */
Statil.prototype.templateOptions = function() {
  /**
   * Hash of options.
   * @type Hash
   */
  var hash = Object.create(null)

  /**
   * Hash of default imports.
   * @type Hash
   */
  hash.imports = this.imports()

  // Merge the options with what was provided to the statil constructor.
  _.merge(hash, this.options)

  return hash
}

/**
 * Generates a hash of default imports to pass to lodash's template parser. We
 * define them within a function to better isolate templates from each other.
 * Full isolation is impossible due to how lodash handles template security
 * (exposing the global env, etc).
 * @returns Hash
 */
Statil.prototype.imports = function() {
  /**
   * Hash of imports for templates.
   * @type Hash
   */
  var imports = Object.create(null)

  /**
   * Store self for use in lambdas.
   * @type Statil
   */
  var self = this

  /**
   * Renders the template with the given path and the given data and returns
   * the result.
   * @param String path
   * @param Hash   data
   */
  imports.$include = function(path, data) {
    // Clone the data object and provide the default locals.
    data = clone(data)
    self.locals(data)
    return self.renderOne(path, data)
  }

  /**
   * Prepends or assigns the given string to the page's title. This mutates
   * the title in the data if called several times from one or different
   * templates.
   * @param String title
   * @param Hash   data
   */
  imports.$title = function(title, data) {
    if (!_.isObject(data)) return
    if (typeof title !== 'string') return

    if (typeof data.title !== 'string' || !data.title) {
      data.title = title
    } else {
      data.title += ' | ' + title
    }
  }

  /**
   * Takes a path and a data object; returns 'active' if the path is included
   * into the URL/template path specified in the data (if any), and an empty
   * string otherwise.
   * @param String path
   * @param Hash   data
   * @returns String
   */
  imports.$active = function(path, data) {
    if (!_.isObject(data)) return ''
    if (typeof path !== 'string') return ''
    if (typeof data.$path !== 'string') return ''

    var relative = pt.relative(data.$path, path)
    if (relative === '..' || relative[0] !== '.') return 'active'
    return ''
  }

  /**
   * Version of $active that returns the attribute 'class="active"' if
   * matched.
   * @param String path
   * @param Hash   data
   * @returns String
   */
  imports.$act = function(path, data) {
    if (imports.$active(path, data)) return 'class="active"'
    return ''
  }

  return imports
}

/**
 * Writes default locals into the given object.
 * @param Hash data
 */
Statil.prototype.locals = function(data) {
  if (!_.isObject(data)) throw new Error("data must be an object")

  // Make sure '$content' is always defined and is a string.
  if (typeof data.$content !== 'string') data.$content = ''

  // Make sure 'title' is always defined and is a string.
  if (typeof data.title !== 'string') data.title = ''

  // Reference the data itself as '$'.
  data.$ = data
}

/**
 * Resolves the given compounded path against own template cache. The last name
 * in the path is assumed to be a template name. If it's not 'index', then
 * a template must be found by that name, otherwise an error is thrown. If the
 * last name is 'index', then we're going to be lenient: if a template at this
 * path is not found, we're using a minimal pass-through substitute that simply
 * transcludes the content.
 *
 * Returns the found or substituted template.
 *
 * @returns Function
 */
Statil.prototype.resolve = function(path) {
  // Get the base name.
  var name = pt.basename(path)
  // If it's not index, mandate some kind of template.
  if (name !== 'index' && !this.templates[path]) {
    throw new Error("template not found at path: " + path)
  }
  // Otherwise try to return a template or use a substitute.
  return this.templates[path] || this.transclude
}

/**
 * Renders the template at the given path. If the path is composite, rendering
 * happens hierarchically, depth-first. First, we render the deepest template,
 * and assign the result to the key '$content' in the data hash. Then we look
 * for 'index' in its parent directory and render that, passing the clone of
 * the data hash and assigning the new result as '$content'. When the path is
 * exhausted, the initial 'index' is rendered. When an 'index' is missing, we
 * use a substitute that simply transcludes the '$content'. Throws an error if
 * lookup or rendering fails.
 * @returns String
 */
Statil.prototype.render = function(path, data) {
  /**
   * For use in lambdas.
   * @type Statil
   */
  var self = this

  // Make sure data is an object.
  if (!_.isObject(data)) data = Object.create(null)

  // Provide the default locals to the data.
  this.locals(data)

  // Assign the path once. The path should never be reassigned during a
  // recursive render chain.
  if (!data.$path) data.$path = path

  // Get the paths at which to render.
  var compounded = split(path)

  // Render the result hierarchically.
  _.eachRight(compounded, function(compoundedPath) {
    data.$content = self.renderOne(compoundedPath, data)
  })

  return data.$content
}

/**
 * Renders the template at the given path without hierarchical lookup.
 * @returns String
 */
Statil.prototype.renderOne = function(path, data) {
  var template = this.resolve(path)

  // Make sure data is an object.
  if (!_.isObject(data)) data = Object.create(null)

  // Provide the default locals to the data.
  this.locals(data)

  // Assign the path once. The path should never be reassigned during a
  // recursive render chain.
  if (!data.$path) data.$path = path

  // Render the result.
  return template(data)
}

/**
 * Renders all templates, passing the given data. Returns them as a map of
 * paths to rendered strings.
 * @param Hash data (optional)
 * @returns String
 */
Statil.prototype.renderAll = function(data) {
  var buffer = Object.create(null)
  var self = this

  _.each(self.templates, function(t, path) {
    buffer[path] = self.render(path, clone(data))
  })

  return buffer
}

/********************************** Export ***********************************/

module.exports = Statil
