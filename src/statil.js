const defaultSettings = {
  reExpression: /{{\s*([\s\S]+?)\s*}}/g,
  reStatement: /<<\s*([\s\S]+?)\s*>>/g,
  contextName: '$',
}

// Used to match unescaped characters in compiled string literals
const reSpecialChars = /['\n\r\u2028\u2029\\]/g

// Used to escape characters for inclusion in compiled string literals
const specialEscapes = {
  '\\': '\\',
  "'": "'",
  '\n': 'n',
  '\r': 'r',
  '\u2028': 'u2028',
  '\u2029': 'u2029',
}

function escapeSpecialChar(char) {
  return specialEscapes[char] ? `\\${specialEscapes[char]}` : char
}

export function compileTemplate(string, settings) {
  if (typeof string !== 'string') {
    throw Error(`Expected a template string, got ${string}`)
  }

  settings = patch(defaultSettings, settings)

  let codeBody = ''

  // Compile the regexp to match each delimiter.
  const reDelimiters = RegExp(`${[
    settings.reExpression.source,
    settings.reStatement.source,
  ].join('|')}|$`, 'g')

  let index = 0

  string.replace(reDelimiters, (
    match,
    expressionValue,
    statementValue,
    offset
  ) => {
    const content = string
      .slice(index, offset)
      // Escape the characters that can't be included in string literals
      .replace(reSpecialChars, escapeSpecialChar)

    if (content) codeBody += `__append('${content}')\n`
    if (statementValue) codeBody += `${statementValue}\n`
    if (expressionValue) codeBody += `__append(${expressionValue})\n`

    index = offset + match.length

    return match
  })

  const {contextName} = settings
  return Function(['locals'], `'use strict'

var ${contextName} = {}
if (locals) for (var key in locals) ${contextName}[key] = locals[key]

var __out = ''
function __append(val) {if (val != null) __out += val}

${codeBody}
return __out`)
}

function patch(left, right) {
  const out = {}
  if (isDict(left)) for (const key in left) out[key] = left[key]
  if (isDict(right)) for (const key in right) out[key] = right[key]
  return out
}

function isDict(value) {
  return isObject(value) && isPlainPrototype(Object.getPrototypeOf(value))
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isPlainPrototype(value) {
  return value === null || value === Object.prototype
}
