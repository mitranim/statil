/******************************* Dependencies ********************************/

// Third party.
import _ from 'lodash'
import * as pt from 'path'
import * as yaml from 'js-yaml'

// Local.
import methods from './methods'
import * as statics from './statics'
import {Hash} from './statics'

/******************************* Public Class ********************************/

export default class Statil {

  // Hash of locals (typically static functions) that will be made available to
  // each template.
  imports: {}
  // Map of file paths to compiled templates.
  templates: {}
  // Map of directory paths to metadata objects.
  meta: {}

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

    this.templates = new Hash()
    this.meta = new Hash()
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
    statics.validateString(source)
    statics.validateTruthyString(path)

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
      if (this.meta[path]) {
        throw new Error(`duplicate meta for path: ${path}`)
      }
      // Parse and register the meta.
      this.meta[path] = yaml.safeLoad(source)
    }
    /**
     * Otherwise register as a template.
     */
    else {
      // Strip the file extension.
      path = statics.stripExt(path)
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
  render(data?: Data): Hash {
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
  metaAtPath(path: string): any {
    // Validate the input.
    statics.validateString(path)

    var dirname
    // Allow to indicate a directory path with a trailing slash.
    if (path.slice(-1) === '/') dirname = path.slice(0, -1)
    // Otherwise strip the file name.
    else dirname = pt.dirname(path)

    return this.meta[dirname]
  }

  /**
   * Takes a path to a file and returns its legend from the metadata associated
   * with its directory, if available. The legend is identified by having the
   * same 'name' property as the file's name.
   */
  fileLegend(path: string): Legend|void {
    // Validate the input.
    statics.validateString(path)
    // Return the legend or undefined.
    var meta = this.metaAtPath(path)
    if (meta) return _.find(meta.files, {name: pt.basename(path)})
  }

}
