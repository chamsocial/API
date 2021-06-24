const striptags = require('striptags')


function cleanContent(input) { return striptags(input).trim() }


module.exports = {
  cleanContent,
}
