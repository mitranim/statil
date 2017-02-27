'use strict'

/**
 * Dependencies
 */

const _ = require('lodash')
const fs = require('fs')
const glob = require('glob')
const pt = require('path')
const {renderBatch, renderDir} = require('../lib/statil')

/**
 * Globals
 */

const testHtmlDir = pt.join(__dirname, 'html') + '/'

const paths = _.mapKeys(
  glob.sync(pt.join(__dirname, 'html') + '/**/*', {nodir: true}),
  path => path.replace(testHtmlDir, '')
)

const files = _.mapValues(paths, path => fs.readFileSync(path, 'utf8'))

const options = {
  ignorePath: path => path === 'index.html',
}

let result
let expected

function RESET () {
  result = expected = undefined
}

function merge () {
  return _.reduce(arguments, _.merge, {})
}

/**
 * renderBatch / locals.extend
 */

RESET()

result = renderBatch(files, options)

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

if (result['extend.html'].trim() !== expected.trim()) throw Error()

/**
 * renderBatch / locals.include
 */

RESET()

result = renderBatch(files, options)

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

if (result['include.html'].trim() !== expected.trim()) throw Error()

/**
 * locals.active / locals.act
 */

RESET()

result = renderBatch(files, options)

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include" class="active">include</a>
  <a href="/include" class="active">include</a>
</nav>`

if (result['partials/nav-active.html'].trim() !== expected.trim()) throw Error()

/**
 * renderDir / options.ignorePath
 */

RESET()

result = renderDir('test/html', options)

if ('index.html' in result) throw Error()

if (!('partials/nav.html' in result)) throw Error()

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>`

if (result['partials/nav.html'].trim() !== expected.trim()) throw Error()

/**
 * options.renamePath
 */

RESET()

result = renderBatch(files, merge(options, {
  renamePath: path => `${path}/index.html`,
}))

if (!('extend.html/index.html' in result)) throw Error()

RESET()

result = renderBatch(files, merge(options, {
  renamePath: (path, {dir, name}) => (
    path === 'extend.html'
    ? path
    : `${dir}/${name}/index.html`
  ),
}))

if (!('extend.html' in result)) throw Error()

if (!('partials/nav/index.html' in result)) throw Error()

/**
 * options.postProcess
 */

RESET()

result = renderBatch(files, merge(options, {
  postProcess: (content, path, _parsed) => (
    path === 'partials/nav.html'
    ? `${content}<h1>Epilogue</h1>`
    : content
  )
}))

expected = `
<nav>
  <a href="/">index</a>
  <a href="/include">include</a>
</nav>
<h1>Epilogue</h1>`

if (result['partials/nav.html'].trim() !== expected.trim()) throw Error()

/**
 * Done
 */

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)  // eslint-disable-line

function pad (val) {
  return _.padStart(val, 2, '0')
}
