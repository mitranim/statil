const defaultSettings = {
  expressionRegexp: /{{\s*([\s\S]+?)\s*}}/g,
  statementRegexp: /<<\s*([\s\S]+?)\s*>>/g,
  contextName: '$',
}

const defaultDelimiterRegexp = makeDelimiterRegexp(defaultSettings)

// Used to match unescaped characters in compiled string literals
const specialCharRegexp = /['\n\r\u2028\u2029\\]/g

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

  settings = settings ? patch(defaultSettings, settings) : defaultSettings

  let codeBody = ''

  const delimiterRegexp = (
      settings.expressionRegexp === defaultSettings.expressionRegexp &&
      settings.statementRegexp === defaultSettings.statementRegexp
    )
    ? defaultDelimiterRegexp
    : makeDelimiterRegexp(settings)

  let index = 0

  string.replace(delimiterRegexp, (
    match,
    expression,
    statement,
    offset
  ) => {
    const content = string
      .slice(index, offset)
      // Escape the characters that can't be included in string literals
      .replace(specialCharRegexp, escapeSpecialChar)

    if (content) codeBody += `__append('${content}')\n`
    if (statement) codeBody += `${statement}\n`
    if (expression) codeBody += `__append(${expression})\n`

    index = offset + match.length

    return match
  })

  const {contextName} = settings
  return Function([contextName], `'use strict'

var __out = ''
function __append(val) {if (val != null) __out += val}

${codeBody}
return __out`)
}

function patch(left, right) {
  const out = {}
  if (left) for (const key in left) out[key] = left[key]
  if (right) for (const key in right) out[key] = right[key]
  return out
}

function makeDelimiterRegexp(settings) {
  return RegExp(`${settings.expressionRegexp.source}|${settings.statementRegexp.source}|$`, 'g')
}
