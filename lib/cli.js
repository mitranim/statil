'use strict'

const _ = require('lodash')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const pt = require('path')
const statil = require('./statil')

/**
 * Main
 */

// Parse CLI args.

const args = require('yargs')
  .demand(0, 0, `This command doesn't accept non-option arguments.`)
  .usage(`Usage:
  statil [<options>] --dir <source dir> --out <destination dir>`)
  .example('statil --dir html --out dist')
  .example('statil -O opts.js -d html -o dist')
  .version(require('../package').version).alias('v', 'version')
  .help('help').alias('h', 'help')
  .option('dir', {alias: 'd', demand: true, describe: 'Source directory'})
  .option('out', {alias: 'o', demand: true, describe: 'Destination directory'})
  .option('opts', {alias: 'O', describe: 'Path to a .js or .json options/data file'})
  .option('dirs', {alias: 'D', array: true, describe: 'Directories to include without rendering'})
  .strict()
  .argv

// Process options

let options = {}
if (args.opts) options = merge(options, require(pt.join(process.cwd(), args.opts)))

// Include optional dirs

_.each(args.dirs, dirname => {
  options = merge(options, {locals: {files: readDir(dirname)}})
})

// Render

const files = statil.renderDir(args.dir, options)

// Write to disk

mkdirp.sync(args.out)

for (const path in files) {
  mkdirp.sync(pt.dirname(pt.join(args.out, path)))
  fs.writeFileSync(pt.join(args.out, path), files[path], 'utf8')
}

/**
 * Utils
 */

function merge () {
  return _.reduce(arguments, _.merge, {})
}

function readDir (dirname) {
  return _.mapValues(
    _.mapKeys(glob.sync(pt.join(dirname, '/**/*'), {nodir: true})),
    readAsUtf
  )
}

function readAsUtf (path) {
  return fs.readFileSync(path, 'utf8')
}
