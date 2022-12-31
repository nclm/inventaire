import _ from 'builders/utils'
import assert_ from 'lib/utils/assert_types'
import Group from 'models/group'

let groups_
const requireCircularDependencies = () => { groups_ = require('./groups') }
setImmediate(requireCircularDependencies)

const lists_ = {
  userInGroup: (userId, groupId) => {
    return groups_.byId(groupId)
    .then(lists_.allGroupMembers)
    .then(userIdInUsers(userId))
  },

  userInGroupOrOut: (userId, groupId) => {
    return groups_.byId(groupId)
    // includes 'invited', 'requested'
    .then(lists_.allGroupUsers)
    .then(userIdInUsers(userId))
  },

  userInRequested: (userId, groupId) => {
    return groups_.byId(groupId)
    .then(lists_.allRequested)
    .then(userIdInUsers(userId))
  },

  userInAdmins: (userId, groupId) => {
    return groups_.byId(groupId)
    .then(lists_.allAdmins)
    .then(userIdInUsers(userId))
  },

  allGroupsMembers: groups => {
    return _(groups)
    .map(lists_.allGroupMembers)
    .flatten()
    .value()
  },

  allAdmins: group => {
    return lists_.usersIdsByAgregatedCategories(group, [ 'admins' ])
  },

  allGroupMembers: group => {
    return lists_.usersIdsByAgregatedCategories(group, Group.categories.members)
  },

  allGroupUsers: group => {
    return lists_.usersIdsByAgregatedCategories(group, Group.categories.users)
  },

  allRequested: group => {
    return lists_.usersIdsByAgregatedCategories(group, [ 'requested' ])
  },

  usersIdsByAgregatedCategories: (group, categories) => {
    assert_.array(categories)
    return _(group)
    .pick(categories)
    .values()
    .flatten()
    .map('user')
    .value()
  }
}

export default lists_

const userIdInUsers = userId => users => users.includes(userId)
