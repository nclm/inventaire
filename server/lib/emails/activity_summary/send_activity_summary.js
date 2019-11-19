// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let updateUser
const CONFIG = require('config')
const __ = require('config').universalPath
const _ = __.require('builders', 'utils')
const user_ = __.require('controllers', 'user/lib/user')
const transporter_ = require('../transporter')
const buildEmail = require('./build_email')
const promises_ = __.require('lib', 'promises')
const { disableUserUpdate } = CONFIG.activitySummary

// it can be convenient in development to disable user update
// to keep generate the same email from a given test user
if (disableUserUpdate) {
  updateUser = userId => _.warn(userId, 'disabledUserUpdate')
} else {
  updateUser = user_.justReceivedActivitySummary
}

module.exports = user => {
  if (user == null) return _.info('no user waiting for summary')

  const userId = user._id

  return buildEmail(user)
  .then(transporter_.sendMail)
  // catch skiped updates before updating the user
  // as otherwise the user would still appear as needing an activity summary
  .catch(promises_.catchSkip('activity summary'))
  .then(() => updateUser(userId))
  .catch(_.Error('activity summary'))
}
