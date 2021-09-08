const assert_ = require('lib/utils/assert_types')
const validations = require('./validations/activity')
const attributes = require('./attributes/activity')
const error_ = require('lib/error/error')

module.exports = {
  create: activity => {
    assert_.object(activity)
    assert_.string(activity.type)

    activity.externalId = activity.id
    delete activity.id
    delete activity.context
    delete activity['@context']
    const newActivity = {}
    Object.keys(activity).forEach(key => {
      const value = activity[key]
      if (!attributes.includes(key)) {
        throw error_.new(`invalid attribute: ${value}`, 400, { activity })
      }
      validations.pass(key, value)
      newActivity[key] = value
    })

    newActivity.created = Date.now()

    return newActivity
  }
}