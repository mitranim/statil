'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

/******************************* Dependencies ********************************/

// Third party.

var _import = require('lodash');

var _import2 = _interopRequireDefault(_import);

var _import3 = require('path');

var pt = _interopRequireWildcard(_import3);

var _import4 = require('js-yaml');

var yaml = _interopRequireWildcard(_import4);

// Local.

var _methods = require('./methods');

var _methods2 = _interopRequireDefault(_methods);

var _import5 = require('./statics');

var statics = _interopRequireWildcard(_import5);

/******************************* Public Class ********************************/

var Statil = (function () {

  /**
   * Statil constructor. Takes a hash of options for lodash's template parser,
   * adds some defaults, and assigns them to self. Sets a few other utility
   * fields.
   */

  function Statil(options) {
    _classCallCheck(this, Statil);

    // Assign default imports to self.
    this.imports = _methods2['default'].imports.call(this);

    // Merge provided options into self.
    _import2['default'].merge(this, options);

    // Map of parsed template paths to compiled templates.
    this.templates = new _import5.Hash();

    // Map of metadata directory paths to parsed metadata objects.
    this.metas = new _import5.Hash();
  }

  _createClass(Statil, [{
    key: 'register',

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
    value: function register(source, path) {
      // Validate the arguments.
      statics.validateString(source);
      statics.validateTruthyString(path);

      // Strip the pwd.
      path = pt.relative(process.cwd(), path);

      /**
       * If this is a yaml or json file, register as a meta.
       */
      var stats = pt.parse(path);
      if (stats.ext === '.yaml' || stats.ext === '.json') {
        // Strip the file name.
        path = pt.dirname(path);
        // Mandate no more than one meta per path.
        if (this.metas[path]) {
          throw new Error('duplicate meta for path: ' + path);
        }
        // Parse and register the meta.
        this.metas[path] = yaml.safeLoad(source);
      }
      /**
       * Otherwise register as a template.
       */
      else {
        // Strip the file extension.
        path = statics.stripExt(path);
        // Compile and register the template. If compilation fails, throw
        // an error with the file path in the description.
        try {
          this.templates[path] = _import2['default'].template(source, new _import5.Hash(this));
        } catch (err) {
          if (err && err.message) {
            err.message = 'Failed to compile a template for path: \'' + path + '\'. Error: ' + err.message;
            throw err;
          }
          throw new Error('Failed to compile a template for path: ' + path);
        }
      }
    }
  }, {
    key: 'render',

    /**
     * Takes a hash of locals and renders all previously registered templates,
     * passing clones of said locals. Accounts for metadata options: templates
     * whose names match the 'ignore' expression in their meta are ignored, and
     * templates with an 'echo' option in their legend are echoed with the array
     * of legends referenced by it, producing multiple files.
     *
     * Returns a hash of resulting paths and rendered files.
     */
    value: function render(data) {
      var buffer = new _import5.Hash();

      for (var path in this.templates) {
        if (_methods2['default'].isIgnored.call(this, path)) continue;
        _import2['default'].assign(buffer, _methods2['default'].renderTemplate.call(this, path, data));
      }

      return buffer;
    }
  }, {
    key: 'meta',

    /*--------------------------------- Pathing ---------------------------------*/

    /**
     * Takes a path to a file and returns the metadata associated with its
     * directory. Also accepts a path to a directory with a trailing slash.
     */
    value: function meta(path) {
      // Validate the input.
      statics.validateString(path);

      var dirname;
      // Allow to indicate a directory path with a trailing slash.
      if (path.slice(-1) === '/') dirname = path.slice(0, -1)
      // Otherwise strip the file name.
      ;else dirname = pt.dirname(path);

      return this.metas[dirname];
    }
  }, {
    key: 'legend',

    /**
     * Takes a path to a file and returns its legend from the metadata associated
     * with its directory, if available. The legend is identified by having the
     * same 'name' property as the file's name.
     */
    value: function legend(path) {
      // Validate the input.
      statics.validateString(path);
      // Return the legend or undefined.
      var meta = this.meta(path);
      if (meta) {
        return _import2['default'].find(meta.files, { name: pt.basename(path) });
      }
    }
  }]);

  return Statil;
})();

exports['default'] = Statil;
module.exports = exports['default'];
