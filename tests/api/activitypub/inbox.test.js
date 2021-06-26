require('should')
const { wait } = require('lib/promises')
const { createUser, createUserOnFediverse } = require('../fixtures/users')
const { signedReq } = require('../utils/utils')
const { createReceiver, makeUrl, startServerWithEmitterAndReceiver } = require('../utils/activity_pub')
const { getActivityByExternalId, randomActivityId, randomActivity } = require('../utils/activities')
const { shouldNotBeCalled, rethrowShouldNotBeCalledErrors } = require('../utils/utils')

describe('activitypub:post:inbox', () => {
  it('should reject without activity id', async () => {
    try {
      const { username } = await createReceiver()
      const body = {}
      const { keyUrl, privateKey } = await startServerWithEmitterAndReceiver()
      const receiverInboxUrl = makeUrl({ action: 'inbox', username })
      await signedReq({ keyUrl, url: receiverInboxUrl, privateKey, body })
      .then(shouldNotBeCalled)
    } catch (err) {
      rethrowShouldNotBeCalledErrors(err)
      const parsedBody = JSON.parse(err.body
      )
      parsedBody.status_verbose.should.equal('missing parameter in body: id')
      parsedBody.status.should.equal(400)
    }
  })

  it('should reject without activity type', async () => {
    try {
      const emitterUser = await createUserOnFediverse()
      const { keyUrl, privateKey } = await startServerWithEmitterAndReceiver({ emitterUser })
      const { username } = await createReceiver()
      const receiverActorUrl = makeUrl({ action: 'actor', username })
      const receiverInboxUrl = makeUrl({ action: 'inbox', username })
      const body = randomActivity({
        emitterActorUrl: keyUrl,
        activityObject: receiverActorUrl
      })
      delete body.type
      await signedReq({
        keyUrl,
        url: receiverInboxUrl,
        privateKey,
        body,
      })
      .then(shouldNotBeCalled)
    } catch (err) {
      rethrowShouldNotBeCalledErrors(err)
      const parsedBody = JSON.parse(err.body)
      parsedBody.status_verbose.should.equal('missing parameter in body: type')
      parsedBody.status.should.equal(400)
    }
  })

  it('should reject if object name is not a fediversable user', async () => {
    try {
      const { username: nonFediversableUsername } = await createUser({ fediversable: false })
      const receiverActorUrl = makeUrl({ action: 'actor', username: nonFediversableUsername })
      const receiverInboxUrl = makeUrl({ action: 'inbox', username: nonFediversableUsername })
      const { keyUrl, privateKey } = await startServerWithEmitterAndReceiver()
      const body = randomActivity({
        emitterActorUrl: keyUrl,
        activityObject: receiverActorUrl
      })
      await signedReq({
        keyUrl,
        url: receiverInboxUrl,
        privateKey,
        body
      })
      .then(shouldNotBeCalled)
    } catch (err) {
      rethrowShouldNotBeCalledErrors(err)
      const parsedBody = JSON.parse(err.body)
      parsedBody.status_verbose.should.equal('forbidden user')
      parsedBody.status.should.equal(403)
    }
  })

  it('should create an activity', async () => {
    const { username } = await createReceiver()
    const receiverActorUrl = makeUrl({ action: 'actor', username })
    const receiverInboxUrl = makeUrl({ action: 'inbox', username })
    const { keyUrl, privateKey } = await startServerWithEmitterAndReceiver()
    const externalId = randomActivityId()
    const body = randomActivity({
      externalId,
      emitterActorUrl: keyUrl,
      activityObject: receiverActorUrl
    })
    const res = await signedReq({
      keyUrl,
      url: receiverInboxUrl,
      privateKey,
      body,
    })
    res.statusCode.should.equal(200)
    const parsedBody = JSON.parse(res.body)
    parsedBody.type.should.equal('Accept')
    await wait(50)
    const newActivity = await getActivityByExternalId(externalId)
    newActivity.externalId.should.equal(externalId)
  })
})
