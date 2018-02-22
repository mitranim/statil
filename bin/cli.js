#! /usr/bin/env node
'use strict'

const args = require('minimist')(process.argv.slice(2))

if (args._.length) {
  console.error(`Unexpected positional arguments:`, args._)
  return
}

if (args.h || args.help) {
  console.log(`
Usage:
  statil [<options>] --src <source dir> --out <output dir>

Options:
  --src, -s      Source directory                                     [required]
  --out, -o      Output directory                                     [required]
  -v, --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]

Example:
  statil --src html --out dist

For more control, write a Node.js script to use Statil's API directly.
`.trim())
  return
}

if (args.v || args.version) {
  console.log(require('../package.json').version)
  return
}

const src = args.s || args.src
if (!src) {
  console.error(`Missing required argument: --src`)
  return
}

const out = args.o || args.out
if (!out) {
  console.error(`Missing required argument: --out`)
  return
}

const {createSettings, renderSettings} = require('../lib/statil')
const {readFiles, writeFiles} = require('../lib/fs-utils')

readFiles(src)
  .then(files => (
    writeFiles(out, renderSettings(createSettings(files)))
  ))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
