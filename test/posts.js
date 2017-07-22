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
          __typename
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

  it('should throw an error if asking for private fields when not logged in', () => {
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

  it('should succeed when asking for private fields when logged in', () => {
    const token = setup.jwtToken()
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
      .set('Authorization', `bearer ${token}`)
      .then((res) => {
        expect(res.body.data.posts[0]).to.have.include.key('content')
        expect(res.status).to.equal(200)
      })
  })
})
