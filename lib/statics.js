/**
 * Static methods and utilities.
 */
/******************************* Dependencies ********************************/
var _ = require('lodash');
var pt = require('path');
/********************************** Statics **********************************/
/**
 * Pure hash table.
 */
var Hash = (function () {
    function Hash(attrs) {
        _.assign(this, attrs);
    }
    return Hash;
})();
exports.Hash = Hash;
Hash.prototype = Object.create(null);
/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 */
function split(path) {
    validateTruthyString(path);
    var parts = path.split(pt.sep);
    var compounded = [];
    // Compound each path.
    parts.forEach(function (part, index) {
        // If this is a directory, disallow the name 'index'.
        if (index !== parts.length - 1 && part === 'index') {
            throw new Error("name 'index' is not allowed for directories");
        }
        // Add the compounded part.
        compounded.push(pt.join.apply(pt, parts.slice(0, index + 1)));
    });
    // Add the 'index' template name to each directory's path.
    compounded.slice(0, compounded.length - 1).forEach(function (p, index) {
        compounded[index] = pt.join(compounded[index], 'index');
    });
    // Add the implicit base 'index' template.
    compounded.unshift('index');
    // Remove the duplicates that occur when the path references an index template.
    compounded = _.uniq(compounded);
    return compounded;
}
exports.split = split;
/**
 * Base transcluder template used as a substitute for a missing 'index' file.
 */
exports.transclude = _.template('<%= $content %>');
/**
 * Resolves a legend relatively to a meta by echoing it zero or more times,
 * according to its echo property.
 */
function echoLegend(meta, legend) {
    // Validate the input.
    validateWritable(meta);
    validateLegend(legend);
    // In absence of an echo property, echo the legend as itself.
    if (!_.has(legend, 'echo'))
        return [legend];
    // Resolve the echos relatively to the meta.
    var echos = resolveEchos(meta, legend, legend.echo);
    // Make each echoed legend inherit from the original and add its own
    // properties.
    echos = _.map(echos, function (echo) {
        var copy = Object.create(legend);
        _.assign(copy, echo);
        return copy;
    });
    // Resolve each sublegend and concat the result.
    return _.flatten(echos.map(_.curry(echoLegend)(meta)));
}
exports.echoLegend = echoLegend;
/**
 * Resolves the given echos key or array relatively to the given meta.
 */
function resolveEchos(meta, legend, echo) {
    var echos = [];
    // If the echo is a string, assume it to be a key for a meta property.
    if (typeof echo === 'string') {
        echos = legend && legend[echo] || meta[echo];
    }
    else {
        echos = echo;
    }
    // Mandate the result to be an array of legends.
    if (!_.isArray(echos)) {
        throw new TypeError("expected echos to resolve to an array, got: " + echos);
    }
    _.each(echos, validateLegend);
    return echos;
}
exports.resolveEchos = resolveEchos;
/**
 * Strips extension from given path, leaving dirname and basename.
 */
function stripExt(path) {
    validateTruthyString(path);
    return pt.join(pt.dirname(path), pt.parse(path).name);
}
exports.stripExt = stripExt;
/*------------------------------- Validators --------------------------------*/
/**
 * Validates a writable object.
 */
function validateWritable(value) {
    if (!_.isObject(value)) {
        throw new TypeError("expected a writable object, got: " + value);
    }
}
exports.validateWritable = validateWritable;
/**
 * Validates a file legend.
 */
function validateLegend(legend) {
    validateWritable(legend);
    if (typeof legend.name !== 'string' || !legend.name) {
        throw new TypeError("expected a legend to contain a non-empty name, got: " + legend.name);
    }
}
exports.validateLegend = validateLegend;
/**
 * Validates a string.
 */
function validateString(value) {
    if (typeof value !== 'string') {
        throw new TypeError("expected a string, got: " + value);
    }
}
exports.validateString = validateString;
/**
 * Validates a non-empty string.
 */
function validateTruthyString(value) {
    validateString(value);
    if (!value) {
        throw new TypeError("expected a non-empty string, got: " + value);
    }
}
exports.validateTruthyString = validateTruthyString;
