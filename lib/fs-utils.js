'use strict'

const fs = require('fs')
const pt = require('path')
const {promisify} = require('util')
const mkdirp = promisify(require('mkdirp'))
const glob = promisify(require('glob'))
const fsReadFile = promisify(fs.readFile)
const fsWriteFile = promisify(fs.writeFile)

exports.readFiles = readFiles
async function readFiles(dirname) {
  const paths = await globFiles(dirname)
  const out = {}
  // Doesn't seem any slower than a concurrent implementation
  for (const path of paths) {
    out[pt.relative(dirname, path)] = (await fsReadFile(path)).toString()
  }
  return out
}

exports.writeFiles = writeFiles
async function writeFiles(dirname, files) {
  for (const path in files) {
    await writeFile(pt.join(dirname, path), files[path])
  }
}

exports.writeFile = writeFile
async function writeFile(path, content) {
  const {dir} = pt.parse(path)
  await mkdirp(dir)
  return fsWriteFile(path, content)
}

exports.globFiles = globFiles
function globFiles(dirname) {
  return glob(pt.join(dirname, '/**/*'), {nodir: true})
}
