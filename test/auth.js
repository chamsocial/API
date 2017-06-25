/* eslint-env mocha */
const chai = require('chai')
const expect = chai.expect
const supertest = require('supertest')

const app = require('../app')
const request = supertest.agent(app.listen())
const { User } = require('../models')
const setup = require('./helpers/setup')

const user = {
  username: 'Lorem',
  email: 'lorem@ipsum.dolor',
  password: 'liveuniverse42'
}

describe('Login', () => {
  beforeEach(() => {
    return setup.initDB()
      .then(() => User.create(user))
  })

  it('should respond with an error', () => {
    return request
      .post('/v2/login')
      .send({ username: 'a@b.c', password: 'hehe' })
      .then((res) => {
        expect(res.body.errors[0].title).to.equal('Invalid username or password')
        expect(res.status).to.equal(401)
      })
  })

  it('should fail with invalid password', () => {
    return request
      .post('/v2/login')
      .send({ username: user.email, password: 'hehe' })
      .then((res) => {
        expect(res.body.errors[0].title).to.equal('Invalid username or password')
        expect(res.status).to.equal(401)
      })
  })

  it('should succed with valid credentials', () => {
    return request
      .post('/v2/login')
      .send({ username: user.email, password: user.password })
      .then((res) => {
        expect(res.body.user).to.include.key('username')
        expect(res.status).to.equal(200)
      })
  })
})
