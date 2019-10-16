/* eslint-env mocha */
const chai = require('chai')

const { expect } = chai

const setup = require('./helpers/setup')
const { decodeJwt } = require('../routes/middleware')

describe('Middleware', () => {
  describe('jwtDecode', () => {
    it('should set a user ID on the context object', async () => {
      const token = setup.jwtToken()
      const ctx = {
        request: { headers: { authorization: `bearer ${token}` } },
      }
      const next = () => Promise.resolve()
      await decodeJwt(ctx, next)
      expect(ctx.userToken.id).to.equal(42)
    })
  })
})
