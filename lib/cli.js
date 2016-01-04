'use strict'

const pt = require('path')
const fs = require('fs')
const _ = require('lodash')
const glob = require('glob')
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
  .version(() => require('../package').version, 'v').alias('v', 'version')
  .help('help').alias('h', 'help')
  .option('d', {alias: 'dir', demand: true, describe: 'Source directory'})
  .option('o', {alias: 'out', demand: true, describe: 'Destination directory'})
  .option('O', {alias: 'opts', describe: 'Path to a .js or .json options/data file'})
  .option('D', {alias: 'dirs', array: true, describe: 'Directories to include without rendering'})
  .strict()
  .argv

// Process options.

let options = {}
if (args.opts) options = merge(options, require(pt.join(process.cwd(), args.opts)))

// Include optional dirs.

_.each(args.dirs, dirname => {
  options = merge(options, {data: {files: readDir(dirname)}})
})

// Render.

let files = statil.dir(args.dir, options)

// Write to disk.

mkdir(args.out)

for (const path in files) {
  mkdir(pt.dirname(pt.join(args.out, path)))
  fs.writeFileSync(pt.join(args.out, path), files[path], 'utf8')
}

/**
 * Utils
 */

function merge () {
  return _.reduce(arguments, _.merge, {})
}

function readDir (dirname) {
  const paths = _.mapKeys(glob.sync(dirname + '/**/*', {nodir: true}))
  return _.mapValues(paths, path => fs.readFileSync(path, 'utf8'))
}

function mkdir (path) {
  path = path.split('/')
  for (let i = 0; i++ < path.length;) {
    const dir = path.slice(0, i).join('/')
    try {
      fs.accessSync(dir)
    } catch (err) {
      fs.mkdirSync(dir)
    }
  }
}
