'use strict'

/**
 * Dependencies
 */

const fs = require('fs')
const pt = require('path')
const glob = require('glob')
const _ = require('lodash')
const batch = require('../lib/statil').batch
const dir = require('../lib/statil').dir

/**
 * Globals
 */

let paths = glob.sync(pt.join(__dirname, 'html') + '/**/*', {nodir: true})

paths = _.mapKeys(paths, path => (
  path.replace(pt.join(__dirname, 'html') + '/', '')
))

const files = _.mapValues(paths, path => fs.readFileSync(path, 'utf8'))

const options = {ignorePaths: ['index.html']}

let result, expected

function RESET () {
  result = expected = undefined
}

function merge () {
  return _.reduce(arguments, _.merge, {})
}

/**
 * batch / locals.extend
 */

RESET()

result = batch(files, options)['extend.html']

expected = `
<!doctype html>
<html>
<head>
  <title>about:us</title>
</head>
<body>

<h1>about</h1>

</body>
</html>`

if (result.trim() !== expected.trim()) throw Error()

/**
 * batch / locals.include
 */

RESET()

result = batch(files, options)['include.html']

expected = `
<!doctype html>
<html>
<head>
  <title>index</title>
</head>
<body>
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>

</body>
</html>`

if (result.trim() !== expected.trim()) throw Error()

/**
 * locals.active / locals.act
 */

RESET()

result = batch(files, options)['partials/nav-active.html']

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include" class="active">include</a>
  <a href="/include" class="active">include</a>
</nav>`

if (result.trim() !== expected.trim()) throw Error()

/**
 * dir
 */

RESET()

result = dir('test/html', options)

if ('index.html' in result) throw Error()

if (!('partials/nav.html' in result)) throw Error()

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>`

if (result['partials/nav.html'].trim() !== expected.trim()) throw Error()

/**
 * options.rename
 */

RESET()

result = batch(files, merge(options, {
  rename: '$&/index.html',
  renameExcept: ['extend.html']
}))

if (!('extend.html' in result)) throw Error()

if (!('partials/nav/index.html' in result)) throw Error()

RESET()

result = batch(files, merge(options, {
  rename: path => path + '/index.html'
}))

if (!('extend.html/index.html' in result)) throw Error()

/**
 * options.pipeline
 */

RESET()

result = batch(files, merge(options, {
  pipeline: [
    (content, path) => {
      if (path === 'partials/nav.html') return `${content}<h1>Epilogue</h1>`
    }
  ]
}))['partials/nav.html']

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>
<h1>Epilogue</h1>`

if (result.trim() !== expected.trim()) throw Error()

/**
 * Done
 */

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)

function pad (val) {
  return _.padLeft(val, 2, '0')
}
