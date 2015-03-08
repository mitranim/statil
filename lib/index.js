'use strict'

/******************************* Dependencies ********************************/

var _    = require('lodash')
var fs   = require('fs')
var pt   = require('path')
var glob = require('glob')
var yaml = require('js-yaml')

/******************************** Constructor ********************************/

/**
 * Statil constructor. Takes a hash of options for lodash's template parser,
 * adds some defaults, and assigns them to self. Also creates a few other
 * utility fields.
 * @param Hash
 */
function Statil(options) {
  // Self-correct when called without 'new'.
  if (!(this instanceof Statil)) return new Statil(options)

  // Make sure options is a writable object.
  if (!_.isObject(options)) options = Object.create(null)

  /**
   * Assign default imports to self.
   */
  this.imports = methods.imports.call(this)

  /**
   * Merge provided options into self.
   */
  _.merge(this, options)

  /**
   * Map of parsed template paths to compiled templates.
   * @type Hash{Function}
   */
  this.templates = Object.create(null)

  /**
   * Map of metadata directory paths to parsed metadata objects.
   * @type Hash{Hash}
   */
  this.metas = Object.create(null)
}

/****************************** Public Methods *******************************/

/*-------------------------------- Rendering --------------------------------*/

/**
 * Renders the template at the given path without hierarchical lookup. The
 * path must be a non-empty string. The data argument is optional.
 * @param   String path
 * @param   Hash   data (optional)
 * @returns String
 */
Statil.prototype.renderOne = function(path, data) {
  // Validate the path and resolve it to a template function.
  var template = methods.resolve.call(this, path)

  // Make sure data is a writable object.
  if (!_.isObject(data)) data = Object.create(null)

  // Provide default locals to the data.
  methods.locals.call(this, path, data)

  // Assign the path once. The path should never be reassigned during a
  // recursive render chain.
  if (!data.$path) data.$path = path

  // Render the result.
  return template.call(this, data)
}

/**
 * Renders the template at the given path. If the path is composite, rendering
 * happens hierarchically, depth-first. First, we render the deepest template,
 * and assign the result to the key '$content' in the data hash. Then we look
 * for 'index' in its parent directory and render that, passing the clone of
 * the data hash and assigning the new result as '$content'. When the path is
 * exhausted, the root 'index' is rendered. When an 'index' is missing, we
 * use a substitute that simply transcludes the '$content'. Throws an error if
 * lookup or rendering fails.
 *
 * The path must be a non-empty string. The data argument is optional.
 *
 * @param   String path
 * @param   Hash   data (optional)
 * @returns String
 */
Statil.prototype.render = function(path, data) {
  // Validate the path.
  if (typeof path !== 'string' || !path) {
    throw new TypeError('expected path to be a non-empty string, got: ' + path)
  }

  // Make sure data is a writable object.
  if (!_.isObject(data)) data = Object.create(null)

  // Assign the path once. The path should never be reassigned during a
  // recursive render chain.
  if (!data.$path) data.$path = path

  // Get the paths at which to render.
  var compounded = split(path)

  // Render the result hierarchically.
  _.eachRight(compounded, function(compoundedPath) {
    data.$content = this.renderOne(compoundedPath, data)
  }, this)

  return data.$content
}

/**
 * Renders all templates, passing the given data. Returns them as a map of
 * paths to rendered strings.
 * @param   Hash   data (optional)
 * @returns String
 */
Statil.prototype.renderAll = function(data) {
  var buffer = Object.create(null)

  _.each(this.templates, function(t, path) {
    buffer[path] = this.render(path, clone(data))
  }, this)

  return buffer
}

/*---------------------------------- Setup ----------------------------------*/

/**
 * Registers the given file under the given path, which is assumed to be a
 * file path. If srcDir is passed, this prefix is stripped from the path.
 *
 * If the file has a .yaml or .json extension, it's parsed as a YAML file
 * (superset of JSON) and registered as a meta under its directory's path.
 * Otherwise it's compiled with lodash and registered as a template under its
 * own path without the extension. We pass statil's clone to lodash's template
 * parser as a config hash.
 *
 * @param String source
 * @param String path
 * @param String srcDir (optional)
 */
Statil.prototype.register = function(source, path, srcDir) {
  // Validate the arguments.
  if (typeof source !== 'string') {
    throw new TypeError('source must be a string')
  }
  if (typeof path !== 'string' || !path) {
    throw new TypeError('path must be a non-empty string')
  }
  if (srcDir != null && typeof srcDir !== 'string') {
    throw new TypeError('srcDir must be a string')
  }

  // If srcDir is given, rebase the path.
  if (srcDir) {
    path = pt.relative(srcDir, path)
  }

  /**
   * If this is a yaml or json file, register as a meta.
   */
  if (pt.extname(path) === '.yaml' || pt.extname(path) === '.json') {
    // Strip the file name.
    path = pt.dirname(path)
    // Mandate no more than one meta per path.
    if (this.metas[path]) {
      throw new Error('duplicate meta for path: ' + path)
    }
    // Parse and register the meta.
    this.metas[path] = yaml.safeLoad(source)
  }
  /**
   * Otherwise register as a template.
   */
  else {
    // Strip the file extension.
    path = pt.join(pt.dirname(path), pt.parse(path).name)
    // Compile and register the template.
    this.templates[path] = _.template(source, clone(this))
  }
}

/**
 * Scans the directory at the given path, relative to the cwd of the current
 * process, and registers each file.
 */
Statil.prototype.scanDirectory = function(srcDir) {
  if (typeof srcDir !== 'string' || !srcDir) {
    throw new TypeError('please specify a path to a template directory to scan')
  }

  // Read the paths of the files in the given directory.
  var paths = glob.sync(pt.join(srcDir, '**/*'), {nodir: true, nonull: true})

  // Read and register each file.
  paths.forEach(function(path) {
    this.register(fs.readFileSync(path, 'utf-8'), path, srcDir)
  }, this)
}

/****************************** Private Methods ******************************/

/**
 * Conditionally exported object used to store private methods, which are
 * accessed on it dynamically. This allows us to intercept and mock them in
 * unit tests.
 * @type Hash
 */
var methods = Object.create(null)
if (process.env.STATIL_ENV === 'testing') Statil.methods = methods

/**
 * Generates a hash of default imports for lodash's template parser.
 * @returns Hash
 */
methods.imports = function() {
  /**
   * Hash of imports for templates.
   * @type Hash
   */
  var imports = Object.create(null)

  /**
   * Self-reference for closuring.
   * @type Statil
   */
  var self = this

  /**
   * Renders the template with the given path and the given data and returns
   * the result. The data is cloned before it's passed to the renderer.
   * @param String path
   * @param Hash   data
   */
  imports.$include = function $include(path, data) {
    // Clone the data object and pass arguments to #renderOne.
    data = clone(data)
    return self.renderOne(path, data)
  }

  /**
   * Prepends or assigns the given string to the page's title stored as
   * 'data.$title'. This mutates the title, prepending new parts, if called
   * several times over the data's lifecycle. A non-string or empty title is
   * ignored.
   * @param String title
   * @param Hash   data
   */
  imports.$entitle = function $entitle(title, data) {
    if (!_.isObject(data)) return
    if (typeof title !== 'string' || !title) return

    if (typeof data.$title !== 'string' || !data.$title) {
      data.$title = title
    } else {
      data.$title = title + ' | ' + data.$title
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
  imports.$active = function $active(path, data) {
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
  imports.$act = function $act(path, data) {
    if (imports.$active(path, data)) return 'class="active"'
    return ''
  }

  return imports
}

/**
 * Takes a path to a template file and a data object. Writes contextual locals
 * into that object.
 * @param String
 * @param Hash
 */
methods.locals = function(path, data) {
  // Validate the input.
  if (typeof path !== 'string') {
    throw new TypeError('path must be a string')
  }
  if (!_.isObject(data)) {
    throw new TypeError('data must be a writable object')
  }

  // Make sure '$content' is always defined and is a string.
  if (typeof data.$content !== 'string') data.$content = ''

  // Make sure '$title' is always defined and is a string.
  if (typeof data.$title !== 'string') data.$title = ''

  // Reference the data itself as '$'.
  data.$ = data

  // Include the metadata about the current directory, if any.
  var dirname = pt.dirname(path)
  data.$meta = this.metas[dirname]

  /**
   * Include the metadata about the current file, if any. Because we reuse the
   * same data object during each Statil#render pass, metadata "bleeds
   * through" to parent templates. This is intentional.
   */
  var basename = pt.parse(pt.basename(path)).name
  if (data.$meta && data.$meta.files && data.$meta.files[basename]) {
    _.assign(data, data.$meta.files[basename])
  }
}

/**
 * Resolves the given compounded path against own template cache. The last
 * name in the path is assumed to be a template name. If it's not 'index',
 * then a template must be found by that name, otherwise an error is thrown.
 * If the last name is 'index', then we're going to be lenient: if a template
 * at this path is not found, we're using a minimal pass-through substitute
 * that simply transcludes the content.
 *
 * Returns the found or substituted template.
 *
 * @param   String
 * @returns Function
 */
methods.resolve = function(path) {
  // Validate the input.
  if (typeof path !== 'string' || !path) {
    throw new TypeError('expected path to a non-empty string, got: ' + path)
  }

  // Get the base name.
  var name = pt.basename(path)

  // If it's not index, mandate some kind of template.
  if (name !== 'index' && !this.templates[path]) {
    throw new Error('template not found at path: ' + path)
  }

  // Otherwise try to return a template or use a substitute.
  return this.templates[path] || transclude
}

/****************************** Private Statics ******************************/

/**
 * Clones the given value into a pure hash table.
 * @returns Hash
 */
function clone(hash) {
  return _.assign(Object.create(null), _.clone(hash))
}

/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 * @param String path
 * @returns Array[String]
 */
function split(path) {
  if (typeof path !== 'string') throw new TypeError("can't split a non-string")
  if (!path) throw new TypeError("can't split an empty path")

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

/**
 * Base transcluder template used as a substitute for a missing 'index' file.
 * @type Function
 */
var transclude = _.template('<%= $content %>')

/********************************** Export ***********************************/

module.exports = Statil
