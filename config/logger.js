const { inspect } = require('util')
const { createLogger, transports, format } = require('winston')
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam')
const { Loggly } = require('winston-loggly-bulk')

const { NODE_ENV } = process.env


const consoleFormat = format.printf(info => {
  const {
    [LEVEL]: l, [MESSAGE]: m, [SPLAT]: s,
    level, message, ...stripped
  } = info

  const data = inspect(stripped, { depth: 5, colors: true })
  return `- ${level}: ${message}: ${data}`
})


const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        consoleFormat,
      ),
      silent: NODE_ENV === 'test',
      handleExceptions: true,
    }),
  ],
})


if (process.env.NODE_ENV === 'production' && process.env.LOGGLY_TOKEN) {
  logger.add(new Loggly({
    inputToken: process.env.LOGGLY_TOKEN,
    subdomain: 'chamsocial',
    tags: ['Cham-NodeJS'],
    json: true,
  }))
}


module.exports = logger
