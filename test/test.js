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

/**
 * extend
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
 * include
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
 * active / act
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

result = dir('test/html', {ignorePaths: ['index.html']})

if ('index.html' in result) throw Error()

if (!('partials/nav.html' in result)) throw Error()

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>`

if (result['partials/nav.html'].trim() !== expected.trim()) throw Error()

/**
 * Done
 */

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)

function pad (val) {
  return _.padLeft(val, 2, '0')
}
