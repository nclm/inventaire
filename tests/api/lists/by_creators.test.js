const should = require('should')
const { shouldNotBeCalled, rethrowShouldNotBeCalledErrors } = require('tests/api/utils/utils')
const { publicReq, authReq, getUserB, getReservedUser } = require('../utils/utils')
const { createList } = require('../fixtures/lists')

const endpoint = '/api/lists?action=by-creators'

describe('lists:by-creators', () => {
  it('should reject without users', async () => {
    try {
      const res = await authReq('get', endpoint)
      shouldNotBeCalled(res)
    } catch (err) {
      rethrowShouldNotBeCalledErrors(err)
      err.body.status_verbose.should.equal('missing parameter in query: users')
      err.statusCode.should.equal(400)
    }
  })

  it('should be empty without lists', async () => {
    const user = await getReservedUser()
    const { _id: userId } = user
    const res = await publicReq('get', `${endpoint}&users=${userId}`)
    res.lists.should.deepEqual({})
  })

  describe('visibility:overview', () => {
  // for detailed visibility validations, see tests lists/by_ids
    it('should get a public list', async () => {
      const { list } = await createList()
      list.visibility.should.deepEqual([ 'public' ])
      const res = await publicReq('get', `${endpoint}&users=${list.creator}`)
      res.lists[list._id].should.be.ok()
    })

    it('should not return private lists', async () => {
      const { list } = await createList(getUserB(), { visibility: [] })
      const user = await getUserB()
      const res = await authReq('get', `${endpoint}&users=${user._id}`)
      should(res.lists[list._id]).not.be.ok()
    })
  })

  describe('pagination', () => {
    it('should take a limit parameter', async () => {
      const { list } = await createList()
      await createList()
      const res = await publicReq('get', `${endpoint}&users=${list.creator}`)
      Object.values(res.lists).length.should.be.aboveOrEqual(2)
      const res2 = await publicReq('get', `${endpoint}&users=${list.creator}&limit=1`)
      Object.values(res2.lists).length.should.equal(1)
    })

    it('should take an offset parameter', async () => {
      const { list } = await createList()
      await createList()
      const offset = 1
      const { lists } = await publicReq('get', `${endpoint}&users=${list.creator}`)
      const { lists: lists2 } = await publicReq('get', `${endpoint}&users=${list.creator}&offset=${offset}`)
      const listsLength = Object.values(lists).length
      const lists2Length = Object.values(lists2).length
      should(listsLength - offset).equal(lists2Length)
    })
  })
})
