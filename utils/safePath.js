const path = require('path')

function safePath(baseDir, ...segments) {
  const resolved = path.resolve(baseDir, ...segments)
  const normalizedBase = path.resolve(baseDir) + path.sep
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error(`Path traversal detected: ${segments.join('/')}`)
  }
  return resolved
}

module.exports = safePath
