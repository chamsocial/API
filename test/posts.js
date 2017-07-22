/* eslint-env mocha */
const chai = require('chai')
const expect = chai.expect
const supertest = require('supertest')

const app = require('../app')
const setup = require('./helpers/setup')
const factory = require('./helpers/factory')
const request = supertest.agent(app.listen())

describe('Post routes', () => {
  let post
  beforeEach(() => {
    return setup.initDB()
      .then(() => factory.create('Post'))
      .then(createdPost => (post = createdPost))
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

  it('should return the username when requested', () => {
    const query = `{
        posts {
          id
          slug
          title
          author {
            username
          }
        }
      }`
    return request
      .post('/graphql')
      .send({ operationName: null, query, variables: null })
      .then((res) => {
        expect(res.body.data.posts).to.be.an('array')
        expect(res.body.data.posts[0]).to.have.any.keys('author')
        expect(res.body.data.posts[0].author).to.have.any.keys('username')
        expect(res.status).to.equal(200)
      })
  })

  describe('Single', () => {
    it('should respond with a post', () => {
      const token = setup.jwtToken()
      const query = `query postSingle($slug: String!) {
          post (slug: $slug) {
            id
            slug
            content
            title
          }
        }`
      return request
        .post('/graphql')
        .send({ operationName: null, query, variables: { slug: post.slug } })
        .set('Authorization', `bearer ${token}`)
        .then((res) => {
          expect(res.body.data.post).to.have.all.keys('id', 'slug', 'content', 'title')
          expect(res.body.data.post.title).to.equal(post.title)
          expect(res.body.data.post.slug).to.equal(post.slug)
          expect(res.body.data.post.content).to.equal(post.content)
          expect(res.body.data.post.id).to.equal(post.id)
          expect(res.status).to.equal(200)
        })
    })
  })
})
