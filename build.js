'use strict'

const babel = require('@babel/core')
const fs = require('fs')

const code = fs.readFileSync('src/statil.js', 'utf8')

const {code: mjsCode} = babel.transform(code, {
  presets: [
    ['@babel/preset-env', {
      targets: {browsers: ['> 1%']},
      modules: false,
      loose: true,
    }],
  ],
})

fs.writeFileSync('statil-mjs.js', mjsCode)

const {code: cjsCode} = babel.transform(code, {
  presets: [
    ['@babel/preset-env', {
      targets: {browsers: ['> 1%']},
      modules: false,
      loose: true,
    }],
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', {strict: true}],
  ],
})

fs.writeFileSync('statil-cjs.js', cjsCode)
