/* eslint-env mocha */
const chai = require('chai')
const expect = chai.expect
const supertest = require('supertest')

const app = require('../app')
const setup = require('./helpers/setup')
const factory = require('./helpers/factory')
const request = supertest.agent(app.listen())

describe('Post routes', () => {
  beforeEach(() => {
    return setup.initDB()
      .then(() => factory.create('Post'))
  })
  afterEach(() => setup.destroyDB())

  it('should respond with an array of posts', () => {
    const query = `{
        posts {
          id
          slug
          title
        }
      }`
    return request
      .post('/graphql')
      .send({ operationName: null, query, variables: null })
      .then((res) => {
        expect(res.body.data.posts).to.be.an('array')
        expect(res.status).to.equal(200)
      })
  })

  it('should only return limited fields when not logged in', () => {
    const query = `{
        posts {
          id
          slug
          content
          title
        }
      }`
    return request
      .post('/graphql')
      .send({ operationName: null, query, variables: null })
      .then((res) => {
        expect(res.body.errors[0].message).to.contain('content')
        expect(res.status).to.equal(200)
      })
  })
})
