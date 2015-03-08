'use strict'

/******************************* Dependencies ********************************/

var _      = require('lodash')
var glob   = require('glob')
var pt     = require('path')
var Statil = require('../lib/index')
var yaml   = require('js-yaml')

/*********************************** Specs ***********************************/

/**
 * State constructor.
 */
describe('statil constructor', function() {

  beforeEach(function() {
    this.statil = new Statil(flatOptions())
  })

  it('is exported', function() {
    expect(Statil).toEqual(jasmine.any(Function))
  })

  it('self-corrects when called without `new`', function() {
    var statil = Statil()
    expect(statil).toEqual(jasmine.any(Statil))
  })

  it('survives any options argument', function() {
    expect(_.wrap(Statil, callWithDifferentInputs)).not.toThrow()
  })

  it('assigns provided options to self', function() {
    // Expecting primitive imports in flat options to overwrite statil.imports.
    expect(_.pick(this.statil, _.keys(flatOptions()))).toEqual(flatOptions())
  })

  it('creates default imports and merges them with imports from options', function() {
    var statil = new Statil(options())

    var resultingKeys = _.keys(statil.imports)
    var expectedKeys = _.keys(options().imports).concat(_.keys(Statil.methods.imports.call(statil)))

    expect(_.sortBy(expectedKeys)).toEqual(_.sortBy(resultingKeys))
  })

  it('creates mandatory default fields', function() {
    expect(this.statil.templates).toEqual(jasmine.any(Object))
    expect(this.statil.metas).toEqual(jasmine.any(Object))
  })

})

/**
 * Methods that deal with data passed to _.template and locals.
 */
describe('template utility methods', function() {

  beforeEach(function() {
    this.statil = new Statil(options())
  })

  describe('#imports', function() {

    it('creates default imports attributes', function() {
      var imports = Statil.methods.imports.call(this.statil)
      expect(imports).toEqual(jasmine.any(Object))
      expect(imports.$include).toEqual(jasmine.any(Function))
      expect(imports.$entitle).toEqual(jasmine.any(Function))
      expect(imports.$active).toEqual(jasmine.any(Function))
      expect(imports.$act).toEqual(jasmine.any(Function))
    })

  })

  describe('#locals', function() {

    beforeEach(function() {
      // Register mock template.
      this.statil.register('wild flower dance with <%= secret %>', 'templates/dance.html')
      // Register mock meta.
      this.meta = {
        abstract: true,
        files: {
          dance: {hash: {one: _.uniqueId(), two: _.uniqueId()}}
        }
      }
      this.statil.register(JSON.stringify(this.meta), 'templates/meta.yaml')
      this.locals = Object.create(null)

      spyOn(Statil.prototype, 'meta').andCallThrough()

      Statil.methods.locals.call(this.statil, 'templates/dance', this.locals)
    })

    it('is only defined to accept a string path and a data hash', function() {
      var self = this
      // First argument.
      callWithDifferentInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {Statil.methods.locals.call(self.statil, input, {})} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
      // Second argument.
      callWithDifferentInputs(function(input) {
        if (_.isObject(input)) return
        var error
        try {Statil.methods.locals.call(self.statil, '', input)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it('is only defined to produce side effects with no return value', function() {
      var locals = Object.create(null)
      var output = Statil.methods.locals.call(this.statil, '', locals)

      expect(output).toBeUndefined()
      expect(_.keys(locals).length).toBeGreaterThan(0)
    })

    it('defines default fields', function() {
      expect(typeof this.locals.$content).toBe('string')
      expect(typeof this.locals.$title).toBe('string')
      expect(this.locals.$).toBe(this.locals)

      // Shouldn't encroach on $path since it's assigned in #renderOne and #render.
      expect(_.has(this.locals, '$path')).toBe(false)
    })

    it("calls #meta to find the current directory's metadata and assigns it, if available", function() {
      expect(this.locals.$meta).toEqual(this.meta)
      expect(Statil.prototype.meta).toHaveBeenCalledWith('templates/dance')
    })

    it("assigns the current file's metadata, if available", function() {
      expect(_.every(this.meta.files.dance, function(value, key) {
        if (_.isEqual(this.locals[key], value)) return true
        return false
      }, this)).toBe(true)
    })

  })

})

/**
 * Methods that deal with template registration, path resolution, and
 * directory scanning.
 */
describe('registration and pathing methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
  })

  describe('#register', function() {

    it('is only defined to accept two or three strings as arguments', function() {
      // Successful call.
      this.statil.register('', 'my-template-path')
      // Another successful call.
      this.statil.register('', 'my-template-path', 'my-relative-dir')
      // Another successful call.
      this.statil.register('template source string', 'my-template-path', 'my-relative-dir')

      // This should fail.
      var error
      try {this.statil.register('', true)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      // This should also fail.
      error = null
      try {this.statil.register('', 'my-template-path', true)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })

    it('strips the file extension and rebases the path', function() {
      this.statil.register('', 'base/my-template.html')
      expect(_.keys(this.statil.templates)).toEqual(['base/my-template'])
      this.statil = new Statil()
      this.statil.register('', 'base/my-template.html', 'base')
      expect(_.keys(this.statil.templates)).toEqual(['my-template'])
    })

    it('registers the path and compiles a template', function() {
      this.statil.register('template source', 'my-template.html')
      // Path.
      expect(_.keys(this.statil.templates)).toEqual(['my-template'])
      // Template.
      expect(this.statil.templates['my-template']).toEqual(jasmine.any(Function))
    })

    it('calls into _.template to compile a template', function() {
      // This spy relies on statil and spec having the same lodash dependency,
      // in other words, on having only one lodash across our package.json.
      spyOn(_, 'template').andCallThrough()

      var stamp = Date.now()
      this.statil.register('secret output: <%= secret %>', 'my-template')

      expect(_.template).toHaveBeenCalled()
      expect(this.statil.templates['my-template']({secret: stamp})).toBe('secret output: ' + stamp)
    })

    it('passes clone of self to _.template', function() {
      spyOn(_, 'template').andCallThrough()
      this.statil.register('secret output: <%= secret %>', 'my-template')
      var config = _.template.mostRecentCall.args[1]
      expect(config).not.toBe(this.statil)
      expect(config).toEqual(_.clone(this.statil))
    })

  })

  describe('#scanDirectory', function() {

    // Setup.
    beforeEach(function() {
      spyOn(this.statil, 'register').andCallThrough()
      this.statil.scanDirectory(templateDir())
    })

    // Cleanup.
    afterEach(function() {
      this.statil.register.reset()
    })

    it('is only defined to accept a string argument', function() {
      var error
      try {this.statil.scanDirectory(123)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })

    it('calls into #register', function() {
      expect(this.statil.register).toHaveBeenCalled()
    })

    it('compiles templates', function() {
      expect(_.keys(this.statil.templates).length).toBeGreaterThan(0)
      var key = _.first(_.keys(this.statil.templates))
      expect(this.statil.templates[key]).toEqual(jasmine.any(Function))
    })

    it('registers metadata files under their directory paths', function() {
      var paths = glob.sync(pt.join('./tests/templates', '**/*.@(yaml|json)'), {nodir: true, nonull: true})
      paths = paths.map(stripFilename)
      expect(_.sortBy(_.keys(this.statil.metas))).toEqual(paths)
    })

    it('registers template files under paths relative to the template directory and without extensions', function() {
      var metaPaths = glob.sync(pt.join('./tests/templates', '**/*.@(yaml|json)'), {nodir: true, nonull: true})
      var paths = glob.sync(pt.join('./tests/templates', '**/*'), {nodir: true, nonull: true})
      paths = _.pull.apply(null, [paths].concat(metaPaths))
      paths = _.sortBy(paths.map(strip))

      expect(_.sortBy(_.keys(this.statil.templates))).toEqual(paths)
    })

  })

  describe('#resolve', function() {

    beforeEach(function() {
      this.statil.scanDirectory(templateDir())
    })

    it('successfully finds an existing template function', function() {
      expect(Statil.methods.resolve.call(this.statil, 'partials/navbar')).toEqual(jasmine.any(Function))
    })

    it('returns a transclude substitute if a non-existent index is requested', function() {
      expect(Statil.methods.resolve.call(this.statil, 'partials/index')).toEqual(jasmine.any(Function))
    })

    it('throws an error if a non-existent non-index is requested', function() {
      var error
      try {Statil.methods.resolve.call(this.statil, 'partials/footer')} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })

    it('is only defined to accept a non-empty string', function() {
      var error
      try {Statil.methods.resolve.call(this.statil, true)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      error = null
      try {Statil.methods.resolve.call(this.statil, '')} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))

      error = null
      try {Statil.methods.resolve.call(this.statil)} catch (err) {error = err}
      expect(error).toEqual(jasmine.any(Error))
    })

  })

  describe('#meta', function() {

    it('is only defined to accept a string path', function() {
      callWithDifferentInputs(function(input) {
        if (typeof input === 'string') return
        var error
        try {this.statil.meta(input)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      }.bind(this))
    })

    it("returns the metadata value associated with the dirname of the given path", function() {
      this.statil.register('special: fried cricket', 'abstract/meta.yaml')
      this.statil.register('', 'abstract/page.html')
      expect(this.statil.meta('abstract/page')).toEqual({special: 'fried cricket'})
      expect(this.statil.meta('nowhere')).toBeUndefined()
    })

    it('allows to indicate a directory path with a trailing slash', function() {
      this.statil.register('special: fried cricket', 'abstract/meta.yaml')
      expect(this.statil.meta('abstract/')).toEqual({special: 'fried cricket'})
      expect(this.statil.meta('abstract')).toBeUndefined()
    })

  })

})

/**
 * Methods that deal with rendering.
 */
describe('rendering', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.scanDirectory(templateDir())
  })

  describe('#renderOne', function() {

    it('is only defined to accept a string path', function() {
      // Successful call.
      this.statil.renderOne('index')
      // Another successful call.
      this.statil.renderOne('partials/navbar')

      // Any other input should fail.
      callWithDifferentInputs(function(arg) {
        if (typeof arg === 'string' && arg) return
        var error
        try {this.statil.renderOne(arg)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it('survives any data argument', function() {
      var render = _.curry(this.statil.renderOne.bind(this.statil))('index')
      expect(_.wrap(render, callWithDifferentInputs)).not.toThrow()
    })

    it("doesn't call any other rendering methods", function() {
      spyOn(this.statil, 'render').andCallThrough()
      spyOn(this.statil, 'renderAll').andCallThrough()

      this.statil.renderOne('partials/navbar')

      expect(this.statil.render).not.toHaveBeenCalled()
      expect(this.statil.renderAll).not.toHaveBeenCalled()
    })

    it('calls #resolve to get a missing index template', function() {
      var statil = new Statil()
      spyOn(Statil.methods, 'resolve').andCallThrough()

      statil.register('page content', 'nested/page')

      expect(statil.renderOne('nested/page')).toBe('page content')
      expect(Statil.methods.resolve).toHaveBeenCalled()
    })

    it('calls #locals to enhance the data', function() {
      spyOn(Statil.methods, 'locals').andCallThrough()
      var data = Object.create(null)
      this.statil.renderOne('partials/navbar', data)
      expect(Statil.methods.locals).toHaveBeenCalledWith('partials/navbar', data)
    })

    it('assigns the given path to the data as $path', function() {
      var data = Object.create(null)
      this.statil.renderOne('partials/navbar', data)
      expect(data.$path).toBe('partials/navbar')
    })

    it('passes the given locals to the template', function() {
      this.statil.register('my <%= secret %>', 'top-secret')
      var data = localData()
      expect(this.statil.renderOne('top-secret', data)).toBe('my ' + localData().secret)
    })

  })

  describe('#render', function() {

    it('is only defined to accept a string path', function() {
      // Successful call.
      this.statil.renderOne('index')
      // Another successful call.
      this.statil.renderOne('partials/navbar')

      // Any other input should fail.
      callWithDifferentInputs(function(arg) {
        if (typeof arg === 'string' && arg) return
        var error
        try {this.statil.renderOne(arg)} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })
    })

    it('survives any data argument', function() {
      var render = _.curry(this.statil.renderOne.bind(this.statil))('index')
      expect(_.wrap(render, callWithDifferentInputs)).not.toThrow()
    })

    it('splits the path, compounds each part, and calls #renderOne for each', function() {
      var path = 'guitar-solo/description'
      spyOn(this.statil, 'renderOne').andCallThrough()

      this.statil.render(path)

      expect(this.statil.renderOne).toHaveBeenCalled()

      // Expected paths that #renderOne should be called with, and in which
      // order.
      var compoundedPaths = [
        // Directly related parts.
        'guitar-solo/description', 'guitar-solo/index', 'index',
        // Partials.
        'partials/navbar'
      ]
      // Find path arguments to #renderOne calls.
      var paths = _.map(this.statil.renderOne.argsForCall, '0')
      expect(paths).toEqual(compoundedPaths)
    })

    it('supplies the given locals to each template, using the same object reference', function() {
      // Set up statil.
      var statil = new Statil()
      statil.register('', 'index')
      statil.register('', 'page')

      // Set up spies and data.
      spyOn(statil.templates, 'index').andCallThrough()
      spyOn(statil.templates, 'page').andCallThrough()
      var data = localData()

      // Run expectations.
      statil.render('page', data)
      expect(statil.templates.index).toHaveBeenCalledWith(data)
      expect(statil.templates.page).toHaveBeenCalledWith(data)
    })

    it('assigns $path to the given data and never changes it', function() {
      var data = Object.create(null)
      this.statil.render('guitar-solo/description', data)
      expect(data.$path).toBe('guitar-solo/description')
    })

    it('includes the result of each previous renderOne call into the data as $content', function() {
      // Setup.
      var statil = new Statil()
      statil.register('outer enclosure plus <%= $content %>', 'index')
      statil.register('inner enclosure plus <%= $content %>', 'nested/index')
      statil.register('inner content', 'nested/page')

      var data = Object.create(null)

      // Expectations.
      var temp2 = statil.templates['nested/page']
      spyOn(statil.templates, 'nested/page').andCallFake(function() {
        expect(data.$content).toBe('')
        return temp2.apply(null, arguments)
      })

      var temp1 = statil.templates['nested/index']
      spyOn(statil.templates, 'nested/index').andCallFake(function() {
        expect(data.$content).toBe('inner content')
        return temp1.apply(null, arguments)
      })

      var temp0 = statil.templates['index']
      spyOn(statil.templates, 'index').andCallFake(function() {
        expect(data.$content).toBe('inner enclosure plus inner content')
        return temp0.apply(null, arguments)
      })

      expect(statil.render('nested/page', data)).toBe('outer enclosure plus inner enclosure plus inner content')
    })

  })

  describe('#renderAll', function() {

    beforeEach(function() {
      this.statil = new Statil()
      // Templates.
      this.statil.register('outer enclosure with a <%= secret %> plus <%= $content %>', 'index')
      this.statil.register('inner content with a <%= secret %>', 'nested/page')
      // Metas.
      this.statil.register('metaSecret: something wild', 'nested/meta.yaml')

      this.data = localData()

      spyOn(this.statil, 'render').andCallThrough()
    })

    it('calls #render once for each registered template, skipping meta files', function() {
      this.statil.renderAll(this.data)
      var paths = _.sortBy(_.map(this.statil.render.argsForCall, '0'))
      expect(paths).toEqual(_.sortBy(['index', 'nested/page']))
    })

    it('passes a clone of locals to each #render call', function() {
      this.statil.renderAll(this.data)

      // The original object reference should never be exposed to #render.
      expect(this.statil.render).not.toHaveBeenCalledWith(this.data)

      // Make sure the data was still made available to each call. Not doing a
      // .toEqual comparison here because data objects are intentionally mutated
      // in render call chains.
      var locals = _.map(this.statil.render.argsForCall, '1')
      var secrets = _.map(locals, 'secret')
      expect(secrets).toEqual(_.times(this.statil.render.callCount, _.constant(localData().secret)))
    })

    it('returns a hash with a rendered result for each template', function() {
      var results = this.statil.renderAll(this.data)

      expect(results).toEqual({
        'index': 'outer enclosure with a ' + localData().secret + ' plus ',
        'nested/page': 'outer enclosure with a ' + localData().secret + ' plus inner content with a ' + localData().secret
      })
    })

    it('survives rendering the test template directory', function() {
      var statil = new Statil()
      statil.scanDirectory(templateDir())
      statil.renderAll()
    })

    describe("uses the 'ignore' option", function() {

      it("ignores files whose names match the 'ignore' expression in their meta directory", function() {
        // First pass.
        var results = this.statil.renderAll(this.data)
        expect(results['nested/page']).toBeTruthy()

        // Second pass.
        this.statil.meta('nested/index').ignore = '.*'
        var results = this.statil.renderAll(this.data)
        expect(results['nested/page']).toBeUndefined()
      })

    })

    describe("uses the 'files[<filename>].repeat' option", function() {

      beforeEach(function() {
        this.statil = new Statil()
        this.statil.scanDirectory(templateDir())
        this.meta = this.statil.meta('repeater/')
      })

      it('requires the repeater key to be a string', function() {
        // Preparation.
        expect(this.meta.files.index).toBeTruthy()
        expect(typeof this.meta.files.index.repeat).toBe('string')
        expect(this.meta.planets).toEqual(jasmine.any(Array))
        // First pass (should succeed).
        this.statil.renderAll()
        // Second pass (should fail).
        this.meta.files.index.repeat = true
        var error
        try {this.statil.renderAll()} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })

      it('requires the repeater key to point to an array', function() {
        this.meta.planets = {name: 'earth'}
        var error
        try {this.statil.renderAll()} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })

      it("requires each repeater element to have a non-empty string under 'name'", function() {
        this.meta.planets = [{title: 'earth'}]
        var error
        try {this.statil.renderAll()} catch (err) {error = err}
        expect(error).toEqual(jasmine.any(Error))
      })

      it('renders the template once for each element, merging the element into locals', function() {
        this.statil.templates = _.pick(this.statil.templates, 'repeater/index')
        this.statil.metas = _.pick(this.statil.metas, 'repeater')
        var result = this.statil.renderAll()
        expect(result).toEqual({
          'repeater/earth': 'Planet name: Earth\nPlanet position: 0',
          'repeater/mars':  'Planet name: Mars\nPlanet position: 0'
        })
      })

    })

  })

})

/**
 * Template methods from #imports.
 */
describe('template methods', function() {

  beforeEach(function() {
    this.statil = new Statil()
    this.statil.scanDirectory(templateDir())
    this.imports = Statil.methods.imports.call(this.statil)
  })

  describe('$include', function() {

    it('is available', function() {
      expect(this.imports.$include).toEqual(jasmine.any(Function))
    })

    it('clones the given data, passes the arguments into #renderOne', function() {
      // Setup.
      spyOn(this.statil, 'renderOne').andCallThrough()
      var data = localData()

      this.imports.$include('partials/navbar', data)

      // Both arguments must have been included.
      expect(this.statil.renderOne.mostRecentCall.args[0]).toBe('partials/navbar')
      expect(this.statil.renderOne.mostRecentCall.args[1].secret).toBe(data.secret)
      // The data must have been cloned.
      expect(this.statil.renderOne).not.toHaveBeenCalledWith(data)
    })

    it('returns the result of the #renderOne call', function() {
      spyOn(this.statil, 'renderOne').andReturn(localData().secret)
      expect(this.imports.$include('partials/navbar')).toBe(localData().secret)
    })

  })

  describe('$entitle', function() {

    it('survives any input', function() {
      // First argument.
      expect(_.wrap(this.imports.$entitle, callWithDifferentInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$entitle)(null), callWithDifferentInputs)).not.toThrow()
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
      expect(_.wrap(this.imports.$active, callWithDifferentInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$active)(null), callWithDifferentInputs)).not.toThrow()
    })

    it('returns an empty string with any invalid input', function() {
      var active = this.imports.$active
      function wrap(arg) {
        if (typeof arg === 'string') return
        expect(active(arg, {})).toBe('')
        expect(active(arg, true)).toBe('')
      }
      callWithDifferentInputs(wrap)
    })

    it("returns 'active' if the given path is a part of the $path in the locals", function() {
      var active = this.imports.$active

      expect(active('index', {$path: 'index'})).toBe('active')
      expect(active('index', {$path: 'index/nested'})).toBe('active')
      expect(active('inde', {$path: 'index/nested'})).toBe('')
    })

  })

  describe('$act', function() {

    it('survives any input', function() {
      // First argument.
      expect(_.wrap(this.imports.$act, callWithDifferentInputs)).not.toThrow()
      // Second argument.
      expect(_.wrap(_.curry(this.imports.$act)(null), callWithDifferentInputs)).not.toThrow()
    })

    it('calls into $active and wraps the result into an attribute', function() {
      spyOn(this.imports, '$active').andCallThrough()
      expect(this.imports.$act('index', {})).toBe('')
      expect(this.imports.$act('index', {$path: 'index/stuff'})).toBe('class="active"')
      expect(this.imports.$active).toHaveBeenCalled()
    })

  })

})

/********************************* Constants *********************************/

// Flat options hash suitable for .isEqual.
function flatOptions() {
  return {
    imports: 123,
    variables: 456
  }
}

// Nested options hash for testing how its individual parts are treated.
function options() {
  return {
    imports: {
      customDefault: function customDefault() {}
    },
    unrelated: {
      customUnrelated: function customUnrelated() {}
    }
  }
}

// Data to be passed to locals.
function localData() {
  return {
    id: 123,
    title: 'something',
    secret: 'mysteryyy'
  }
}

function templateDir() {
  return './tests/templates'
}

/********************************* Utilities *********************************/

/**
 * Calls the given function without arguments and with lots of different
 * arguments.
 * @param Function
 */
function callWithDifferentInputs(fn) {
  fn()
  fn(123)
  fn('')
  fn("what's up honeybunch")
  fn(undefined)
  fn(null)
  fn(NaN)
  fn(true)
  fn(/reg/)
  fn(function() {})
  fn([])
  fn({})
  fn(Object.create(null))
}

/**
 * Strips the template directory and the file extension from the given path.
 * @param   String
 * @returns String
 */
function strip(path) {
  path = pt.relative(templateDir(), path)
  path = pt.join(pt.parse(path).dir, pt.parse(path).name)
  return path
}

/**
 * Strips the template directory and the file name from the given path.
 * @param   String
 * @returns String
 */
function stripFilename(path) {
  return pt.relative(templateDir(), pt.dirname(path))
}
