'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

/**
 * Splits the given path into an array of hierarchical paths. Appends 'index'
 * to each directory path.
 */
exports.split = split;

/**
 * Resolves a legend relatively to a meta by echoing it zero or more times,
 * according to its echo property.
 */
exports.echoLegend = echoLegend;

/**
 * Resolves the given echos key or array relatively to the given meta.
 */
exports.resolveEchos = resolveEchos;

/**
 * Strips extension from given path, leaving dirname and basename.
 */
exports.stripExt = stripExt;

/*------------------------------- Validators --------------------------------*/

/**
 * Validates a writable object.
 */
exports.validateWritable = validateWritable;

/**
 * Validates a file legend.
 */
exports.validateLegend = validateLegend;

/**
 * Validates a string.
 */
exports.validateString = validateString;

/**
 * Validates a non-empty string.
 */
exports.validateTruthyString = validateTruthyString;
/**
 * Static methods and utilities.
 */

/******************************* Dependencies ********************************/

var _import = require('lodash');

var _import2 = _interopRequireDefault(_import);

var _import3 = require('path');

var pt = _interopRequireWildcard(_import3);

/********************************** Statics **********************************/

/**
 * Pure hash table.
 */

var Hash = function Hash(attrs) {
  _classCallCheck(this, Hash);

  _import2['default'].assign(this, attrs);
};

exports.Hash = Hash;

Hash.prototype = Object.create(null);
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
  compounded = _import2['default'].uniq(compounded);

  return compounded;
}

/**
 * Base transcluder template used as a substitute for a missing 'index' file.
 */
var transclude = _import2['default'].template('<%= $content %>');exports.transclude = transclude;

function echoLegend(meta, legend) {
  // Validate the input.
  validateWritable(meta);
  validateLegend(legend);

  // In absence of an echo property, echo the legend as itself.
  if (!_import2['default'].has(legend, 'echo')) {
    return [legend];
  } // Resolve the echos relatively to the meta.
  var echos = resolveEchos(meta, legend.echo);

  // Make each echoed legend inherit from the original and add its own
  // properties.
  echos = _import2['default'].map(echos, function (echo) {
    var copy = Object.create(legend);
    _import2['default'].assign(copy, echo);
    return copy;
  });

  // Resolve each sublegend and concat the result.
  return _import2['default'].flatten(echos.map(_import2['default'].curry(echoLegend)(meta)));
}

function resolveEchos(meta, echo) {
  var echos = [];
  // If the echo is a string, assume it to be a key for a meta property.
  if (typeof echo === 'string') echos = meta[echo];else echos = echo;
  // Mandate the result to be an array of legends.
  if (!_import2['default'].isArray(echos)) {
    throw new TypeError('expected echos to resolve to an array, got: ' + echos);
  }
  _import2['default'].each(echos, validateLegend);
  return echos;
}

function stripExt(path) {
  validateTruthyString(path);
  return pt.join(pt.dirname(path), pt.parse(path).name);
}

function validateWritable(value) {
  if (!_import2['default'].isObject(value)) {
    throw new TypeError('expected a writable object, got: ' + value);
  }
}

function validateLegend(legend) {
  validateWritable(legend);
  if (typeof legend.name !== 'string' || !legend.name) {
    throw new TypeError('expected a legend to contain a non-empty name, got: ' + legend.name);
  }
}

function validateString(value) {
  if (typeof value !== 'string') {
    throw new TypeError('expected a string, got: ' + value);
  }
}

function validateTruthyString(value) {
  validateString(value);
  if (!value) {
    throw new TypeError('expected a non-empty string, got: ' + value);
  }
}