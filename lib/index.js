/******************************* Dependencies ********************************/
// Third party.
var _ = require('lodash');
var pt = require('path');
var yaml = require('js-yaml');
// Local.
var methods_1 = require('./methods');
var statics = require('./statics');
var statics_1 = require('./statics');
/******************************* Public Class ********************************/
var Statil = (function () {
    /**
     * Statil constructor. Takes a hash of options for lodash's template parser,
     * adds some defaults, and assigns them to self. Sets a few other utility
     * fields.
     */
    function Statil(options) {
        // Assign default imports to self.
        this.imports = methods_1.methods.imports.call(this);
        // Merge provided options into self.
        _.merge(this, options);
        this.templates = new statics_1.Hash();
        this.meta = new statics_1.Hash();
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
    Statil.prototype.register = function (source, path) {
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
            if (this.meta[path]) {
                throw new Error("duplicate meta for path: " + path);
            }
            // Parse and register the meta.
            this.meta[path] = yaml.safeLoad(source);
        }
        else {
            // Strip the file extension.
            path = statics.stripExt(path);
            // Compile and register the template. If compilation fails, throw
            // an error with the file path in the description.
            try {
                this.templates[path] = _.template(source, new statics_1.Hash(this));
            }
            catch (err) {
                var message = 'Failed to compile template at path `' + path + '`';
                if (err && err.message) {
                    err.message = message + (". Error: " + err.message);
                    throw err;
                }
                throw new Error(message);
            }
        }
    };
    /**
     * Takes a hash of locals and renders all previously registered templates,
     * passing clones of said locals. Accounts for metadata options: templates
     * whose names match the 'ignore' expression in their meta are ignored, and
     * templates with an 'echo' option in their legend are echoed with the array
     * of legends referenced by it, producing multiple files.
     *
     * Returns a hash of resulting paths and rendered files.
     */
    Statil.prototype.render = function (data) {
        var buffer = new statics_1.Hash();
        for (var path in this.templates) {
            if (methods_1.methods.isIgnored.call(this, path))
                continue;
            _.assign(buffer, methods_1.methods.renderTemplate.call(this, path, data));
        }
        return buffer;
    };
    /*--------------------------------- Pathing ---------------------------------*/
    /**
     * Takes a path to a file and returns the metadata associated with its
     * directory. Also accepts a path to a directory with a trailing slash.
     */
    Statil.prototype.metaAtPath = function (path) {
        // Validate the input.
        statics.validateString(path);
        // Allow to indicate a directory path with a trailing slash, otherwise strip
        // the file name.
        var dirname = path.slice(-1) === '/' ? path.slice(0, -1) : pt.dirname(path);
        return this.meta[dirname];
    };
    /**
     * Takes a path to a file and returns its legend from the metadata associated
     * with its directory, if available. The legend is identified by having the
     * same 'name' property as the file's name.
     */
    Statil.prototype.fileLegend = function (path) {
        // Validate the input.
        statics.validateString(path);
        // Return the legend or undefined.
        var meta = this.metaAtPath(path);
        if (meta)
            return _.find(meta.files, { name: pt.basename(path) });
    };
    return Statil;
})();
exports.Statil = Statil;
