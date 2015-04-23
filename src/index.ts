/******************************* Dependencies ********************************/

var _    = require('lodash')
var pt   = require('path')
var yaml = require('js-yaml')

/******************************* Public Class ********************************/

class Statil {

  imports: {};
  templates: {};
  metas: {};
  static methods: {}; // for testing only

  /**
   * Statil constructor. Takes a hash of options for lodash's template parser,
   * adds some defaults, and assigns them to self. Sets a few other utility
   * fields.
   */
  constructor(options: {}) {
    // Assign default imports to self.
    this.imports = methods.imports.call(this)

    // Merge provided options into self.
    _.merge(this, options)

    // Map of parsed template paths to compiled templates.
    this.templates = new Hash()

    // Map of metadata directory paths to parsed metadata objects.
    this.metas = new Hash()
  }

  /***************************** Public Methods ******************************/

  /**
   * Registers the given file under the given path, which is assumed to belong
   * to a file. If the path is absolute, we strip the current process's working
   * directory from it.
   *
   * If the file has a .yaml or .json extension, it's parsed as a YAML file
   * (superset of JSON) and registered as a meta under its directory path.
   * Otherwise it's compiled with lodash and registered as a template under its
   * own path, without the file extension.
   */
  register(source: string, path: string): void {
    // Validate the arguments.
    validateString(source)
    validateTruthyString(path)

    // Strip the pwd.
    path = pt.relative(process.cwd(), path)

    /**
     * If this is a yaml or json file, register as a meta.
     */
    var stats = pt.parse(path)
    if (stats.ext === '.yaml' || stats.ext === '.json') {
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
      path = stripExt(path)
      // Compile and register the template. If compilation fails, throw
      // an error with the file path in the description.
      try {
        this.templates[path] = _.template(source, new Hash(this))
      } catch (err) {
        if (err && err.message) {
          err.message = `Failed to compile a template for path: '${path}'. Error: ${err.message}`
          throw err
        }
        throw new Error(`Failed to compile a template for path: ${path}`)
      }
    }
  }

  /**
   * Takes a hash of locals and renders all previously registered templates,
   * passing clones of said locals. Accounts for metadata options: templates
   * whose names match the 'ignore' expression in their meta are ignored, and
   * templates with an 'echo' option in their legend are echoed with the array
   * of legends referenced by it, producing multiple files.
   *
   * Returns a hash of resulting paths and rendered files.
   */
  render(data?: {}): Hash {
    var buffer = new Hash()

    for (var path in this.templates) {
      if (methods.isIgnored.call(this, path)) continue
      _.assign(buffer, methods.renderTemplate.call(this, path, data))
    }

    return buffer
  }

  /*--------------------------------- Pathing ---------------------------------*/

  /**
   * Takes a path to a file and returns the metadata associated with its
   * directory. Also accepts a path to a directory with a trailing slash.
   */
  meta(path: string): any {
    // Validate the input.
    validateString(path)

    var dirname
    // Allow to indicate a directory path with a trailing slash.
    if (path.slice(-1) === '/') dirname = path.slice(0, -1)
    // Otherwise strip the file name.
    else dirname = pt.dirname(path)

    return this.metas[dirname]
  }

  /**
   * Takes a path to a file and returns its legend from the metadata associated
   * with its directory, if available. The legend is identified by having the
   * same 'name' property as the file's name.
   */
  legend(path: string): Legend|void {
    // Validate the input.
    validateString(path)
    // Return the legend or undefined.
    var meta = this.meta(path)
    if (meta) return _.find(meta.files, {name: pt.basename(path)})
  }

}

/****************************** Private Methods ******************************/

/**
 * Private methods are stored on a conditionally exported object and accessed
 * on it dynamically. This allows us to intercept and mock them in unit tests.
 */
var methods: any = new Hash()
if (process.env.STATIL_ENV === 'testing') Statil.methods = methods

/*-------------------------------- Rendering --------------------------------*/

/**
 * Takes a path to a template and an optional hash of locals. Clones the
 * locals and enhances it with the template's legend (if available). If the
 * legend has an 'echo' option, the locals are echoed for each sublegend, each
 * locals clone receiving the sublegend's properties. For each clone, we form
 * a virtual path where the template's name is replaced with the 'name' from
 * the legend (in absence of legend or 'echo', the original path is used).
 * This virtual path is assigned as $path to the locals clone.
 *
 * Then we call Statil#renderThrough with the original template path for each
 * locals clone, mapping the result to the virtual path.
 *
 * The return value is a map of virtual paths to results.
 */
methods.renderTemplate = function(path: string, data?: {name?: string}): Hash {
  var buffer = new Hash()

  // Enhance the locals with the legend.
  var legend = this.legend(path)
  data = _.assign(new Hash(data), legend)

  // Default datas group.
  var datas = [data]
  data.name = pt.basename(path)

  // Echo for each sublegend, if available.
  if (legend && legend.echo) {
    // Multiply and validate the legends.
    var legends = echoLegend(this.meta(path), legend)
    // Map the data.
    datas = legends.map(function(legend) {
      // Convert inherited properties into own properties.
      legend = _.omit(legend)
      return _.assign(new Hash(data), legend)
    })
  }

  // Render the template for each locals clone, assigning the result under the
  // virtual path.
  _.each(datas, function(data) {
    var echoPath = data.$path = pt.join(pt.dirname(path), data.name)
    buffer[echoPath] = methods.renderThrough.call(this, path, data)
  }, this)

  return buffer
}

/**
 * Hierarchically renders all templates from the current path, through its
 * ancestors, up to the root 'index' template. Reuses the same mutable locals
 * object between render passes. The result of each pass is assigned to locals
 * as '$content' for transclusion in the next ancestor template.
 *
 * The path must be a non-empty string. The locals are optional.
 */
methods.renderThrough = function(path: string, data?: {$content?: string}): string {
  // Validate the path.
  validateTruthyString(path)

  // Make sure data is a writable object.
  if (!_.isObject(data)) data = new Hash()

  // Get the paths at which to render.
  var compounded = split(path)

  // Render the result hierarchically.
  _.eachRight(compounded, function(compoundedPath) {
    data.$content = methods.renderOne.call(this, compoundedPath, data)
  }, this)

  return data.$content
}

/**
 * Renders the template at the given path, passing the given locals. The path
 * must be a non-empty string. The locals are optional.
 */
methods.renderOne = function(path: string, data?: {}): string {
  // Validate the path and resolve it to a template function.
  validateTruthyString(path)
  var template = this.templates[stripExt(path)] || transclude

  // Make sure data is a writable object.
  if (!_.isObject(data)) data = new Hash()

  // Provide default locals to the data.
  methods.locals.call(this, path, data)

  // Render the result.
  return template.call(this, data)
}

/*---------------------------------- Setup ----------------------------------*/

/**
 * Generates a hash of default imports for lodash's template parser.
 */
methods.imports = function(): Hash {
  // Hash of imports for templates.
  var imports: any = new Hash()

  /**
   * Renders the template with the given path and the given data and returns
   * the result. The data is cloned before it's passed to the renderer.
   */
  imports.$include = (path: string, data?: {}): string => {
    // Clone the data object and pass arguments to #renderOne.
    data = new Hash(data)
    return methods.renderOne.call(this, path, data)
  }

  /**
   * Prepends or assigns the given string to the page's title stored as
   * 'data.$title'. This mutates the title, prepending new parts, if called
   * several times over the data's lifecycle. A non-string or empty title is
   * ignored.
   */
  imports.$entitle = function $entitle(title: string, data?: {$title?: string}): void {
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
   */
  imports.$active = function $active(path: string, data?: {$path?: string}): string {
    if (!_.isObject(data)) return ''
    if (typeof path !== 'string') return ''
    if (typeof data.$path !== 'string') return ''

    var relative = pt.relative(path, data.$path)
    if (relative[0] !== '.') return 'active'
    return ''
  }

  /**
   * Version of $active that returns the attribute 'class="active"' if
   * matched.
   */
  imports.$act = function $act(path: string, data?: {}): string {
    if (imports.$active(path, data)) return 'class="active"'
    return ''
  }

  return imports
}

/**
 * Takes a path to a template file and a data object. Writes contextual locals
 * into that object.
 */
methods.locals = function(path: string, data: {$content?: string, $title?: string, $meta?: {}, $?: {}}): void {
  // Validate the input.
  validateString(path)
  validateWritable(data)

  // Make sure '$content' is always defined and is a string.
  if (typeof data.$content !== 'string') data.$content = ''

  // Make sure '$title' is always defined and is a string.
  if (typeof data.$title !== 'string') data.$title = ''

  // Reference the data itself as '$'.
  data.$ = data

  // Include the metadata associated with the current directory, if any.
  var meta = this.meta(path)
  if (meta) data.$meta = meta

  /**
   * Include the file's legend from the directory's metadata, if available.
   * Note: these locals are intentionally allowed to "bleed through" to
   * ancestor templates during a Statil#renderThrough pass.
   */
  var legend = this.legend(path)
  if (legend) _.defaults(data, legend)
}

/**
 * Checks if the name of the template at the given path matches the 'ignore'
 * expression in that directory's metadata, if any.
 */
methods.isIgnored = function(path: string): boolean {
  var meta = this.meta(path)
  if (!meta || !meta.ignore) return false
  validateTruthyString(meta.ignore)
  return !!pt.basename(path).match(meta.ignore)
}

/****************************** Private Statics ******************************/

/**
 * Pure hash table.
 */
function Hash(attrs?: any): void {_.assign(this, attrs)}
Hash.prototype = Object.create(null)

/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 */
function split(path: string): string[] {
  validateTruthyString(path)

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
 */
var transclude: Function = _.template('<%= $content %>')

/**
 * Resolves a legend relatively to a meta by echoing it zero or more times,
 * according to its echo property.
 */
function echoLegend(meta: {}, legend: Legend): Legend[] {
  // Validate the input.
  validateWritable(meta)
  validateLegend(legend)

  // In absence of an echo property, echo the legend as itself.
  if (!_.has(legend, 'echo')) return [legend]
  // Resolve the echos relatively to the meta.
  var echos: Legend[] = resolveEchos(meta, legend.echo)

  // Make each echoed legend inherit from the original and add its own
  // properties.
  echos = _.map(echos, function(echo) {
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
function resolveEchos(meta: {}, echo?: string|Legend[]): Legend[] {
  var echos: Legend[] = []
  // If the echo is a string, assume it to be a key for a meta property.
  if (typeof echo === 'string') echos = meta[echo]
  else echos = echo
  // Mandate the result to be an array of legends.
  if (!_.isArray(echos)) {
    throw new TypeError('expected echos to resolve to an array, got: ' + echos)
  }
  _.each(echos, validateLegend)
  return echos
}

/**
 * Strips extension from given path, leaving dirname and basename.
 */
function stripExt(path: string): string {
  validateTruthyString(path)
  return pt.join(pt.dirname(path), pt.parse(path).name)
}

/*------------------------------- Validators --------------------------------*/

/**
 * Validates a writable object.
 */
function validateWritable(value: {}): void {
  if (!_.isObject(value)) {
    throw new TypeError('expected a writable object, got: ' + value)
  }
}

/**
 * Validates a file legend.
 */
function validateLegend(legend?: Legend): void {
  validateWritable(legend)
  if (typeof legend.name !== 'string' || !legend.name) {
    throw new TypeError('expected a legend to contain a non-empty name, got: ' + legend.name)
  }
}

/**
 * Validates a string.
 */
function validateString(value?: string): void {
  if (typeof value !== 'string') {
    throw new TypeError('expected a string, got: ' + value)
  }
}

/**
 * Validates a non-empty string.
 */
function validateTruthyString(value?: string): void {
  validateString(value)
  if (!value) {
    throw new TypeError('expected a non-empty string, got: ' + value)
  }
}

/********************************** Export ***********************************/

module.exports = Statil
