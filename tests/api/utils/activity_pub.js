const _ = require('builders/utils')
const express = require('express')
const { createUser, createUsername, createUserOnFediverse } = require('../fixtures/users')
const { randomActivity } = require('./activities')
const CONFIG = require('config')
const host = CONFIG.fullPublicHost()

const endpoint = '/api/activitypub'

const createReceiver = async (customData = {}) => {
  const username = createUsername()
  const userAttributes = _.extend({
    username,
    fediversable: true
  }, customData)
  return createUser(userAttributes)
}

const query = ({ action, username }) => `${endpoint}?action=${action}&name=${username}`
const makeUrl = params => `${host}${query(params)}`

const startServerWithEmitterAndReceiver = async (params = {}) => {
  let { emitterUser } = params
  if (!emitterUser) emitterUser = await createUserOnFediverse()
  const { origin, query } = await startServerWithEmitterUser({ emitterUser })
  const keyUrl = origin.concat(query)
  const { username } = await createReceiver()
  const privateKey = emitterUser.privateKey
  const receiverUrl = makeUrl({ action: 'actor', username })
  return { keyUrl, privateKey, receiverUrl, receiverUsername: username }
}

const startServerWithEmitterUser = async ({ emitterUser }) => {
  const { origin } = await startActivityPubServer({ user: emitterUser })
  return {
    origin,
    query: query({ action: 'actor', username: emitterUser.username })
  }
}

const startActivityPubServer = ({ user, endpoints = [] }) => new Promise(resolve => {
  const port = 1024 + Math.trunc(Math.random() * 10000)
  const { publicKey: publicKeyPem, username } = user
  const app = express()
  const host = `localhost:${port}`
  const origin = `http://${host}`
  const webfingerEndpoint = '/.well-known/webfinger?resource='
  const resource = `acct:${username}@${host}`

  for (const endpt of endpoints) {
    app.get('/' + endpt.name, (req, res) => {
      return res.json(endpt.resData)
    })
  }
  app.get(`${webfingerEndpoint}${resource}`, async (req, res) => {
    return res.json(formatWebfinger(origin, endpoint, resource))
  })

  app.get(endpoint, async (req, res) => {
    return res.json({ publicKey: { publicKeyPem } })
  })

  app.listen(port, () => resolve({ port, host, origin }))
})

const formatWebfinger = (origin, resource) => {
  const actorUrl = `${origin}${endpoint}`
  return {
    subject: resource,
    aliases: [ actorUrl ],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: actorUrl
      }
    ]
  }
}

module.exports = { startServerWithEmitterAndReceiver, query, createReceiver, makeUrl, startServerWithEmitterUser, randomActivity }
