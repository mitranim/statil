/**
 * Static methods and utilities.
 */

/******************************* Dependencies ********************************/

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.split = split;
exports.echoLegend = echoLegend;
exports.resolveEchos = resolveEchos;
exports.stripExt = stripExt;
exports.validateWritable = validateWritable;
exports.validateLegend = validateLegend;
exports.validateString = validateString;
exports.validateTruthyString = validateTruthyString;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _path = require('path');

var pt = _interopRequireWildcard(_path);

/********************************** Statics **********************************/

/**
 * Pure hash table.
 */

var Hash = function Hash(attrs) {
  _classCallCheck(this, Hash);

  _lodash2['default'].assign(this, attrs);
};

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
      throw new Error('name \'index\' is not allowed for directories');
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
  compounded = _lodash2['default'].uniq(compounded);

  return compounded;
}

/**
 * Base transcluder template used as a substitute for a missing 'index' file.
 */
var transclude = _lodash2['default'].template('<%= $content %>');

exports.transclude = transclude;
/**
 * Resolves a legend relatively to a meta by echoing it zero or more times,
 * according to its echo property.
 */

function echoLegend(meta, legend) {
  // Validate the input.
  validateWritable(meta);
  validateLegend(legend);

  // In absence of an echo property, echo the legend as itself.
  if (!_lodash2['default'].has(legend, 'echo')) return [legend];
  // Resolve the echos relatively to the meta.
  var echos = resolveEchos(meta, legend, legend.echo);

  // Make each echoed legend inherit from the original and add its own
  // properties.
  echos = _lodash2['default'].map(echos, function (echo) {
    var copy = Object.create(legend);
    _lodash2['default'].assign(copy, echo);
    return copy;
  });

  // Resolve each sublegend and concat the result.
  return _lodash2['default'].flatten(echos.map(_lodash2['default'].curry(echoLegend)(meta)));
}

/**
 * Resolves the given echos key or array relatively to the given meta.
 */

function resolveEchos(meta, legend, echo) {
  var echos = [];
  // If the echo is a string, assume it to be a key for a meta property.
  if (typeof echo === 'string') {
    echos = legend && legend[echo] || meta[echo];
  } else {
    echos = echo;
  }
  // Mandate the result to be an array of legends.
  if (!_lodash2['default'].isArray(echos)) {
    throw new TypeError('expected echos to resolve to an array, got: ' + echos);
  }
  _lodash2['default'].each(echos, validateLegend);
  return echos;
}

/**
 * Strips extension from given path, leaving dirname and basename.
 */

function stripExt(path) {
  validateTruthyString(path);
  return pt.join(pt.dirname(path), pt.parse(path).name);
}

/*------------------------------- Validators --------------------------------*/

/**
 * Validates a writable object.
 */

function validateWritable(value) {
  if (!_lodash2['default'].isObject(value)) {
    throw new TypeError('expected a writable object, got: ' + value);
  }
}

/**
 * Validates a file legend.
 */

function validateLegend(legend) {
  validateWritable(legend);
  if (typeof legend.name !== 'string' || !legend.name) {
    throw new TypeError('expected a legend to contain a non-empty name, got: ' + legend.name);
  }
}

/**
 * Validates a string.
 */

function validateString(value) {
  if (typeof value !== 'string') {
    throw new TypeError('expected a string, got: ' + value);
  }
}

/**
 * Validates a non-empty string.
 */

function validateTruthyString(value) {
  validateString(value);
  if (!value) {
    throw new TypeError('expected a non-empty string, got: ' + value);
  }
}