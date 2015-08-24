'use strict'

/******************************* Dependencies ********************************/

var _      = require('lodash')
var pt     = require('path')
var Statil = require('../lib/index').Statil
var yaml   = require('js-yaml')

var methods = require('../lib/methods').methods
var statics = require('../lib/statics')

/*********************************** Specs ***********************************/

/**
 * State constructor.
 */
describe('Statil constructor', function() {

  beforeEach(function() {
    this.statil = new Statil(options())
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  it('is exported', function() {
    expect(Statil).toEqual(jasmine.any(Function))
  })

  it('survives any options argument', function() {
    function caller(input) {new Statil(input)}
    expect(_.wrap(caller, callWithAllInputs)).not.toThrow()
  })

  it('creates default imports and merges them with imports from options', function() {
    var statil = new Statil(options())

    var resultingKeys = _.keys(statil.imports)
    var expectedKeys = _.keys(options().imports).concat(_.keys(methods.imports.call(statil)))

    expect(_.sortBy(expectedKeys)).toEqual(_.sortBy(resultingKeys))
  })

  it('assigns other options to self', function() {
    expect(this.statil.unrelated).toEqual(options().unrelated)
  })

  it('creates mandatory default fields', function() {
    expect(this.statil.templates).toEqual(jasmine.any(Object))
    expect(this.statil.meta).toEqual(jasmine.any(Object))
  })

})

describe('#register', function() {

  beforeEach(function() {
    this.statil = new Statil()
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  it('is only defined to accept two string arguments', function() {
    var statil = new Statil()
    // First argument.
    callWithAllInputs(function(input) {
      if (typeof input === 'string') return
      var error
      try {statil.register(srcFile().body, input)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })
    // Second argument.
    callWithAllInputs(function(input) {
      if (typeof input === 'string') return
      var error
      try {statil.register(input, srcFile().path)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })
  })

  describe('registers meta files', function() {

    it('under relative directory paths', function() {
      var statil = new Statil()
      statil.register(srcMeta().body, srcMeta().path)
      var path = _.first(_.keys(statil.meta))
      expect(path).toBe(pt.relative(process.cwd(), mockMeta().path))
    })

    it('parsing them from YAML into object', function() {
      var statil = new Statil()
      statil.register(srcMeta().body, srcMeta().path)
      var meta = _.first(_.values(statil.meta))
      expect(meta).toEqual(mockMeta())
    })

    it('throwing error on duplicate meta in same directory', function() {
      var statil = new Statil()
      statil.register(srcMeta().body, srcMeta().path)
      var error
      try {statil.register(srcMeta().body, srcMeta().path)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })

  })

  describe('registers template files', function() {

    it('under relative file paths without extension', function() {
      var statil = new Statil()
      statil.register(srcFile().body, srcFile().path)
      var path = _.first(_.keys(statil.templates))
      expect(path).toBe(mockLegend().path)
    })

    it('using _.template, passing source as-is with clone of self as options', function() {
      spyOn(_, 'template').and.callThrough()
      var statil = new Statil()
      statil.register(srcFile().body, srcFile().path)
      expect(_.template.calls.mostRecent().args).toEqual([srcFile().body, _.clone(statil)])
      expect(_.first(_.values(statil.templates))).toEqual(jasmine.any(Function))
    })

  })

})

describe('#render', function() {

  beforeEach(function() {
    this.statil = new Statil()
      // Mock #renderTemplate for this method.
    spyOn(methods, 'renderTemplate').and.callFake(function(path, data) {
      var buffer = {}
      buffer[path] = this.templates[path](_.clone(data))
      return buffer
    })
    this.statil.register(srcFile().body, srcFile().path)
    this.statil.register(srcMeta().body, srcMeta().path)
    this.statil.render(mockLocals())
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  it('survives any argument', function() {
    callWithAllInputs(this.statil.render.bind(this.statil))
  })

  it("ignores templates matching the 'ignore' expression", function() {
    // First pass.
    spyOn(this.statil.templates, mockLegend().path).and.callThrough()
    this.statil.render()
    expect(this.statil.templates[mockLegend().path]).toHaveBeenCalled()
    // Second pass.
    this.statil.templates[mockLegend().path].calls.reset()
    this.statil.meta[mockMeta().path].ignore = pt.basename(mockLegend().name)
    this.statil.render()
    expect(this.statil.templates[mockLegend().path]).not.toHaveBeenCalled()
  })

  it('calls #renderTemplate with each path, passing locals data', function() {
    var spy = methods.renderTemplate
    expect(spy).toHaveBeenCalledWith(mockLegend().path, mockLocals())
  })

  it('returns a hash of paths to results', function() {
    var results = this.statil.render(mockLocals())
    var buffer = {}
    buffer[mockLegend().path] = srcFile().rendered
    expect(results).toEqual(buffer)
  })

})

describe('private rendering methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.register(srcFile().body, srcFile().path)
    this.statil.register(srcMeta().body, srcMeta().path)
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  describe('#renderTemplate', function() {

    beforeEach(function() {
      // Mock #renderThrough for this method.
      spyOn(methods, 'renderThrough').and.callFake(function(path, data) {
        return this.templates[path](_.clone(data))
      })
    })

    it('survives any locals argument', function() {
      callWithAllInputs(function(input) {
        methods.renderTemplate.call(this.statil, mockLegend().path, input)
      }.bind(this))
    })

    it('in absence of echo, returns pair of path-result', function() {
      var result = methods.renderTemplate.call(this.statil, mockLegend().path)
      var buffer = {}
      buffer[mockLegend().path] = srcFile().rendered
      expect(result).toEqual(buffer)
    })

    it('assigns legend to clone of locals, assigns $path, and passes result to renderThrough', function() {
      methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())
      var locals = _.assign(mockLocals(), mockLegend())
      locals.$path = mockLegend().path
      expect(methods.renderThrough).toHaveBeenCalledWith(mockLegend().path, locals)
    })

    it("validates 'echo' to resolve to an array of legends", function() {
      var meta = this.statil.meta[mockMeta().path]
      var legend = _.find(meta.files, {name: mockLegend().name})

      // Should fail because isn't an array.
      legend.echo = {}
      var error
      try {
        methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())
      } catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      // Should fail because doesn't resolve to an array.
      legend.echo = 'random string'
      var error
      try {
        methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())
      } catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      // Should fail because the inlined legends are invalid.
      legend.echo = [{path: 'templates/one'}, {path: 'templates/two'}]
      var error
      try {
        methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())
      } catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      // Should succeed because is an array of legends.
      legend.echo = mockEchoLegends()
      methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())

      // Should succeed because resolves to an array of legends on the current meta.
      meta.echos = mockEchoLegends()
      legend.echo = 'echos'
      methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())
    })

    it('calls #renderThrough for each echoed locals object, assigning result to virtual path', function() {
      var meta = this.statil.meta[mockMeta().path]
      var legend = _.find(meta.files, {name: mockLegend().name})
      legend.echo = mockEchoLegends()
      var result = methods.renderTemplate.call(this.statil, mockLegend().path, mockLocals())

      expect(methods.renderThrough).toHaveBeenCalled()
      var args = methods.renderThrough.calls.allArgs()

      // Make sure it was called with the original path.
      expect(args[0][0]).toBe(mockLegend().path)
      expect(args[1][0]).toBe(mockLegend().path)

      // Make sure different locals were given and $path was included.
      var pathFirst = pt.join(pt.dirname(mockLegend().path), mockEchoLegends()[0].name)
      var pathSecond = pt.join(pt.dirname(mockLegend().path), mockEchoLegends()[1].name)
      expect(args[0][1].$path).toBe(pathFirst)
      expect(args[1][1].$path).toBe(pathSecond)

      // Make sure some results were assigned under the same paths.
      expect(result[pathFirst]).toBeTruthy()
      expect(result[pathSecond]).toBeTruthy()
    })

    it('if a `rename` method is available, uses it to rewrite paths', function() {
      // First pass.
      var firstResult = methods.renderTemplate.call(this.statil, mockLegend().path)
      var firstPaths = _.sortBy(_.keys(firstResult))

      // Add the rename method.
      this.statil.rename = function(path) {
        return path + '/affix'
      }

      // Second pass.
      var secondResult = methods.renderTemplate.call(this.statil, mockLegend().path)
      var secondPaths = _.sortBy(_.keys(secondResult))

      _.each(secondPaths, function(path, index) {
        expect(path).toEqual(firstPaths[index] + '/affix')
      })

      // If void is returned, the path must be unchanged.
      this.statil.rename = _.noop

      // Third pass.
      var thirdResult = methods.renderTemplate.call(this.statil, mockLegend().path)
      expect(thirdResult).toEqual(firstResult)
    })

  })

  describe('#renderThrough', function() {

    beforeEach(function() {
      // Mock #renderOne for this method.
      spyOn(methods, 'renderOne').and.callFake(function(path, data) {
        return srcFile().rendered
      })
    })

    it('accepts a string path and any locals argument', function() {
      var statil = this.statil
      // Should fail.
      callWithAllInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {
          methods.renderThrough.call(statil, input)
        } catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
      // Should succeed.
      callWithAllInputs(function(input) {
        methods.renderThrough.call(statil, mockLegend().path, input)
      })
    })

    it('splits the path, compounds each part, and calls #renderOne for each', function() {
      var path = 'templates/page'

      methods.renderThrough.call(this.statil, 'templates/page')
      expect(methods.renderOne).toHaveBeenCalled()

      // Expected paths for calls to #renderOne, in that exact order.
      var compoundedPaths = [
        'templates/page',
        'templates/index',
        'index'
      ]

      // Find and validate path arguments to #renderOne calls.
      var paths = _.map(methods.renderOne.calls.allArgs(), '0')
      expect(paths).toEqual(compoundedPaths)
    })

    it('supplies the given locals to each template, using the same object reference', function() {
      var data = mockLocals()
      methods.renderThrough.call(this.statil, mockLegend().path, data)

      // Data arguments for calls.
      var dataArgs = _.map(methods.renderOne.calls.allArgs(), '1')
      expect(_.every(dataArgs, function(arg) {return arg === data})).toBe(true)
    })

    it('includes results of #renderOne calls into the data as $content and returns that result', function() {
      var data = mockLocals()
      var result = methods.renderThrough.call(this.statil, mockLegend().path, data)
      expect(data.$content).toBe(result)
      expect(result).toBe(srcFile().rendered)
    })

  })

  describe('#renderOne', function() {

    it('accepts a string path and any locals argument', function() {
      var statil = this.statil
      // Should fail.
      callWithAllInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {
          methods.renderOne.call(statil, input)
        } catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
      // Should succeed.
      callWithAllInputs(function(input) {
        methods.renderOne.call(statil, mockLegend().path, input)
      })
    })

    it("substitutes missing templates with a transluder", function() {
      var data = {$content: srcFile().rendered}
      var result = methods.renderOne.call(this.statil, 'templates/index', data)
      expect(result).toBe(srcFile().rendered)
    })

    it('calls #locals to enhance the locals', function() {
      var data = Object.create(null)
      spyOn(methods, 'locals').and.callThrough()
      methods.renderOne.call(this.statil, mockLegend().path, data)
      expect(methods.locals).toHaveBeenCalledWith(mockLegend().path, data)
    })

    it('passes locals to template', function() {
      var data = mockLocals()
      spyOn(this.statil.templates, mockLegend().path).and.callThrough()
      methods.renderOne.call(this.statil, mockLegend().path, data)
      expect(this.statil.templates[mockLegend().path]).toHaveBeenCalledWith(data)
    })

  })

})

describe('pathing methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.register(srcFile().body, srcFile().path)
    this.statil.register(srcMeta().body, srcMeta().path)
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  describe('#meta', function() {

    it('is only defined to accept a string path', function() {
      var statil = this.statil
      callWithAllInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {statil.metaAtPath(input)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it("returns the metadata value associated with the dirname of the given path", function() {
      this.statil.register('special: fried cricket', 'abstract/meta.yaml')
      this.statil.register('', 'abstract/page.html')
      expect(this.statil.metaAtPath('abstract/page')).toEqual({special: 'fried cricket'})
      expect(this.statil.metaAtPath('nowhere')).toBeUndefined()
    })

    it('allows to indicate a directory path with a trailing slash', function() {
      this.statil.register('special: fried cricket', 'abstract/meta.yaml')
      expect(this.statil.metaAtPath('abstract/')).toEqual({special: 'fried cricket'})
      expect(this.statil.metaAtPath('abstract')).toBeUndefined()
    })

  })

  describe('#legend', function() {

    it('is only defined to accept a string path', function() {
      var statil = this.statil
      callWithAllInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {statil.fileLegend(input)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it('without meta or legend, returns undefined', function() {
      // Pass without meta.
      this.statil.meta = Object.create(null)
      expect(this.statil.fileLegend(mockLegend().path)).toBeUndefined()

      // Pass without legend.
      this.statil.meta[mockLegend().dirname] = {files: []}
      expect(this.statil.fileLegend(mockLegend().path)).toBeUndefined()
    })

    it("finds file legend with matching 'name' in same directory's meta", function() {
      expect(this.statil.fileLegend(mockLegend().path)).toEqual(mockLegend())
    })

  })

})

describe('private utility methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.register(srcFile().body, srcFile().path)
    this.statil.register(srcMeta().body, srcMeta().path)
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  describe('#imports', function() {

    it('creates default imports attributes', function() {
      var imports = methods.imports.call(this.statil)
      expect(imports).toEqual(jasmine.any(Object))
      expect(imports.$include).toEqual(jasmine.any(Function))
      expect(imports.$entitle).toEqual(jasmine.any(Function))
      expect(imports.$active).toEqual(jasmine.any(Function))
      expect(imports.$act).toEqual(jasmine.any(Function))
    })

  })

  describe('#locals', function() {

    beforeEach(function() {
      this.data = Object.create(null)
      methods.locals.call(this.statil, mockLegend().path, this.data)
    })

    it('only accepts a string path and a writable data hash', function() {
      var statil = this.statil
      // First argument.
      callWithAllInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {methods.locals.call(statil, input, {})} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
      // Second argument.
      callWithAllInputs(function(input) {
        if (_.isObject(input)) return
        var error
        try {methods.locals.call(statil, '', input)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it('is only defined to produce side effects with no return value', function() {
      var locals = Object.create(null)
      var output = methods.locals.call(this.statil, mockLegend().path, locals)

      expect(output).toBeUndefined()
      expect(_.keys(locals).length).toBeGreaterThan(0)
    })

    it('defines default fields', function() {
      expect(typeof this.data.$content).toBe('string')
      expect(typeof this.data.$title).toBe('string')
      expect(this.data.$).toBe(this.data)

      // Shouldn't encroach on $path.
      expect(_.has(this.data, '$path')).toBe(false)
    })

    it("calls #meta to find the current directory's metadata and assigns it, if available", function() {
      spyOn(Statil.prototype, 'metaAtPath').and.callThrough()
      methods.locals.call(this.statil, mockLegend().path, this.data)
      expect(this.data.$meta).toEqual(mockMeta())
      expect(Statil.prototype.metaAtPath.calls.mostRecent().args).toEqual([mockLegend().path])
    })

    it("assigns the current file's legend, if available", function() {
      var data = this.data
      expect(_.every(_.keys(mockLegend()), function(key) {
        return _.has(data, key)
      })).toBe(true)
    })

  })

  describe('#isIgnored', function() {

    it('correctly aborts ignored path', function() {
      var statil = new Statil()
      // First pass.
      statil.meta = {'templates': {ignore: null}}
      expect(methods.isIgnored.call(statil, 'templates/page')).toBe(false)
      // Second pass.
      statil.meta = {'templates': {ignore: 'pag.*'}}
      expect(methods.isIgnored.call(statil, 'templates/page')).toBe(true)
    })

  })

})

/**
 * Template methods from #imports.
 */
describe('template methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.register(srcFile().body, srcFile().path)
    this.statil.register(srcMeta().body, srcMeta().path)
    this.imports = methods.imports.call(this.statil)
    // Required for proper matching of hash tables and objects.
    jasmine.addCustomEqualityTester(_.isEqual)
  })

  describe('$include', function() {

    it('is available', function() {
      expect(this.imports.$include).toEqual(jasmine.any(Function))
    })

    it('clones the given data, passes the arguments into #renderOne', function() {
      // Setup.
      spyOn(methods, 'renderOne').and.callThrough()
      var data = mockLocals()

      this.imports.$include(mockLegend().path, data)

      // Both arguments must have been included.
      expect(methods.renderOne).toHaveBeenCalled()
      expect(methods.renderOne.calls.mostRecent().args[0]).toBe(mockLegend().path)
      expect(methods.renderOne.calls.mostRecent().args[1].secret).toBe(data.secret)
      // The data must have been cloned.
      expect(methods.renderOne).not.toHaveBeenCalledWith(data)
    })

    it('returns the result of the #renderOne call', function() {
      spyOn(methods, 'renderOne').and.returnValue(mockLocals().secret)
      expect(this.imports.$include(mockLegend().path)).toBe(mockLocals().secret)
    })

  })

  describe('$entitle', function() {

    it('survives any input', function() {
      // First argument.
      expect(_.wrap(this.imports.$entitle, callWithAllInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$entitle)(null), callWithAllInputs)).not.toThrow()
    })

    it('assigns a new $title to the locals', function() {
      var data = Object.create(null)
      this.imports.$entitle('something', data)
      expect(data.$title).toBe('something')
    })

    it('prepends a title to an existing title', function() {
      var data = {$title: 'else'}
      this.imports.$entitle('something', data)
      expect(data.$title).toBe('something | else')
    })

    it('ignores the call if the supplied title is not a string', function() {
      var data = {$title: 'something'}
      this.imports.$entitle(/reg/, data)
      expect(data.$title).toBe('something')
    })

    it("overwrites an existing $title if it's not a string", function() {
      var data = {$title: /reg/}
      this.imports.$entitle('something', data)
      expect(data.$title).toBe('something')
    })

    it("doesn't return anything", function() {
      var data = Object.create(null)
      expect(this.imports.$entitle('something', data)).toBeUndefined()
    })

  })

  describe('$active', function() {

    it('survives any input', function() {
      // First argument.
      expect(_.wrap(this.imports.$active, callWithAllInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$active)(null), callWithAllInputs)).not.toThrow()
    })

    it('returns an empty string with any invalid input', function() {
      var active = this.imports.$active
      function wrap(arg) {
        if (typeof arg === 'string') return
        expect(active(arg, {})).toBe('')
        expect(active(arg, true)).toBe('')
      }
      callWithAllInputs(wrap)
    })

    it("returns 'active' if the given path is a part of the $path in the locals", function() {
      var active = this.imports.$active

      expect(active('index', {$path: 'index'})).toBe('active')
      expect(active('index', {$path: 'index/nested'})).toBe('active')
      expect(active('inde',  {$path: 'index/nested'})).toBe('')
      expect(active('index', {$path: 'index/nested/elsewhere'})).toBe('active')
      expect(active('index', {$path: 'nested/elsewhere/far-away'})).toBe('')
    })

  })

  describe('$act', function() {

    it('survives any input', function() {
      // First argument.
      expect(_.wrap(this.imports.$act, callWithAllInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$act)(null), callWithAllInputs)).not.toThrow()
    })

    it('calls into $active and wraps the result into an attribute', function() {
      spyOn(methods, '$active').and.callThrough()
      expect(this.imports.$act('index', {})).toBe('')
      expect(this.imports.$act('index', {$path: 'index/stuff'})).toBe('class="active"')
      expect(methods.$active).toHaveBeenCalled()
    })

  })

})

/********************************* Constants *********************************/

function options() {
  return {
    imports: {
      customDefault: function customDefault() {}
    },
    unrelated: {
      customUnrelated: ['value']
    }
  }
}

function srcFile() {
  return {
    path:     pt.join(process.cwd(), 'templates/page.html'),
    body:     '<%= (new Date()).getUTCFullYear() %>',
    rendered: (new Date()).getUTCFullYear().toString()
  }
}

function srcMeta() {
  return {
    path: pt.join(process.cwd(), 'templates/meta.yaml'),
    body: yaml.safeDump(mockMeta())
  }
}

function mockMeta() {
  return {
    path:  'templates',
    files: [mockLegend()]
  }
}

function mockLegend() {
  return {
    name:  'page',
    path:  'templates/page',
    title: 'Over the Hills and Far Away',
    echo:  null
  }
}

// Data to be passed to locals.
function mockLocals() {
  return {
    id: 123,
    title: 'something',
    secret: 'mysteryyy'
  }
}

function mockEchoLegends() {
  return [
    {
      name:  'one',
      title: 'First'
    },
    {
      name:  'two',
      title: 'Second'
    }
  ]
}

/********************************* Utilities *********************************/

/**
 * Calls the given function without arguments and with lots of different
 * arguments.
 * @param Function
 */
function callWithAllInputs(fn) {
  fn()
  fn(undefined)
  fn('')
  fn("what's up honeybunch")
  fn(NaN)
  fn(Infinity)
  fn(123)
  fn(false)
  fn(true)
  fn(null)
  fn(Object.create(null))
  fn({})
  fn([])
  fn(/reg/)
  fn(function() {})
}
