const CONFIG = require('config')
const __ = CONFIG.universalPath

require('should')
const randomString = __.require('lib', 'utils/random_string')

describe('random string', () => it('should return a string of the requested length', done => {
  randomString(2).length.should.equal(2)
  randomString(32).length.should.equal(32)
  randomString(623).length.should.equal(623)
  done()
}))
