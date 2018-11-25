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
  password: 'liveuniverse42',
  slug: 'lorem',
  activated: 1
}

describe('Login', () => {
  let dbUser = {}
  beforeEach(() => {
    return setup.initDB()
      .then(() => User.create(user))
      .then(savedUser => (dbUser = savedUser))
  })
  afterEach(() => setup.destroyDB())

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

  it('should succeed with valid email & pasword', () => {
    return request
      .post('/v2/login')
      .send({ username: user.email, password: user.password })
      .then((res) => {
        expect(res.body.user).to.include.key('username')
        expect(res.status).to.equal(200)
      })
  })

  it('should also succeed with valid username', () => {
    return request
      .post('/v2/login')
      .send({ username: user.username, password: user.password })
      .then((res) => {
        expect(res.body.user).to.include.key('username')
        expect(res.status).to.equal(200)
      })
  })

  it('should return an error if not activated', async () => {
    const spamUser = {
      username: 'Spammer74',
      email: 'Mohahaha@ipsum.dolor',
      password: 'spamspamspam',
      slug: 'spammer74',
      activated: 0
    }
    await User.create(spamUser)

    return request
      .post('/v2/login')
      .send({ username: spamUser.username, password: spamUser.password })
      .then((res) => {
        expect(res.body.errors[0].title).to.include('activated')
        expect(res.status).to.equal(401)
      })
  })

  it('should return an object containing a accessToken', () => {
    return request
      .post('/v2/login')
      .send({ username: user.username, password: user.password })
      .then((res) => {
        expect(res.body).to.include.key('user')
        expect(res.body.user).to.not.include.key('password')
        expect(res.body).to.include.key('token')
        expect(res.status).to.equal(200)
      })
  })

  it('should return an object containing a accessToken', () => {
    expect(dbUser.last_login).to.be.undefined // eslint-disable-line no-unused-expressions
    return request
      .post('/v2/login')
      .send({ username: user.username, password: user.password })
      .then(async (res) => {
        const loggedInUser = await User.findByPk(dbUser.id)
        expect(loggedInUser.last_login).to.not.be.undefined // eslint-disable-line no-unused-expressions
      })
  })
})
