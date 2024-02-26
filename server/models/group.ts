import { find, map, without } from 'lodash-es'
import { newError } from '#lib/error/error'
import { truncateLatLng } from '#lib/geo'
import { assert_ } from '#lib/utils/assert_types'
import { log } from '#lib/utils/logs'
import * as groupAttributes from './attributes/group.js'
import groupValidations from './validations/group.js'

const Group = {}

export default Group

const validations = Group.validations = groupValidations
const attributes = Group.attributes = groupAttributes
const { groupRoles } = attributes

Group.create = options => {
  log(options, 'group create')
  const { name, description, searchable, position, creatorId, open } = options
  validations.pass('name', name)
  validations.pass('description', description)
  validations.pass('searchable', searchable)
  validations.pass('position', position)
  validations.pass('creatorId', creatorId)
  validations.pass('open', open)

  const creator = createMembership(creatorId, null)

  return {
    // The type attribute is used in some places where group docs might be mixed with user docs
    // such as search results
    type: 'group',
    name,
    description,
    searchable,
    admins: [ creator ],
    members: [],
    invited: [],
    declined: [],
    requested: [],
    position,
    open,
    creator: creatorId,
    // using the same timestamp for clarity
    created: creator.timestamp,
  }
}

Group.findInvitation = (userId, group, wanted) => findMembership(userId, group, 'invited', wanted)

const membershipActions = {
  invite: (invitorId, invitedId, group) => {
    // Using Group.findInvitation as a validator throwing
    // if the document isn't in the desired state
    Group.findInvitation(invitedId, group, false)
    group.invited.push(createMembership(invitedId, invitorId))
    return group
  },

  // there is room for a secondaryUserId but only some actions actually need it:
  // the empty variable is thus passed to 'placeholder'
  accept: (userId, placeholder, group) => {
    return moveMembership(userId, group, 'invited', 'members')
  },
  decline: (userId, placeholder, group) => {
    return moveMembership(userId, group, 'invited', 'declined')
  },
  request: (userId, placeholder, group) => {
    if (group.open) {
      group.members.push(createMembership(userId, null))
    } else {
      group.requested.push(createMembership(userId, null))
    }
    return group
  },
  cancelRequest: (userId, placeholder, group) => {
    return moveMembership(userId, group, 'requested', null)
  },
  acceptRequest: (adminId, requesterId, group) => {
    return moveMembership(requesterId, group, 'requested', 'members')
  },
  refuseRequest: (adminId, requesterId, group) => {
    return moveMembership(requesterId, group, 'requested', null)
  },
  makeAdmin: (adminId, memberId, group) => {
    return moveMembership(memberId, group, 'members', 'admins')
  },
  kick: (adminId, memberId, group) => {
    return moveMembership(memberId, group, 'members', null)
  },
  leave: (userId, placeholder, group) => {
    const role = userIsAdmin(userId, group) ? 'admins' : 'members'
    return moveMembership(userId, group, role, null)
  },
}

Group.deleteUser = (group, userId) => {
  for (const list of groupRoles) {
    group[list] = withoutUser(group[list], userId)
  }

  // If there are no more admins, promote the 3 most senior members
  if (group.admins.length === 0) {
    const membersBySeniority = group.members.sort(byTimestamp)
    group.admins = membersBySeniority.slice(0, 3)
    group.members = membersBySeniority.slice(3)
  }

  return group
}

const byTimestamp = (a, b) => a.timestamp - b.timestamp

const withoutUser = (memberships, userId) => {
  return memberships.filter(memberData => memberData.user !== userId)
}

Group.membershipActionsList = Object.keys(membershipActions)
Object.assign(Group, membershipActions)

// create user's membership object that will be moved between categories
const createMembership = (userId, invitorId) => ({
  user: userId,
  invitor: invitorId,
  timestamp: Date.now(),
})

// moving membership object from previousCategory to newCategory
const moveMembership = (userId, group, previousCategory, newCategory) => {
  const membership = findMembership(userId, group, previousCategory, true)
  group[previousCategory] = without(group[previousCategory], membership)
  // Let the possibility to just destroy the membership
  // by letting newCategory undefined
  if (newCategory != null) group[newCategory].push(membership)
  return group
}

const findMembership = (userId, group, previousCategory, wanted) => {
  const membership = find(group[previousCategory], { user: userId })
  if (wanted) {
    // expect to find a membership
    if (membership != null) {
      return membership
    } else {
      const context = { userId }
      context[previousCategory] = group[previousCategory]
      throw newError('membership not found', 403, context)
    }
  } else {
    // expect to find no existing membership
    if (membership != null) {
      // return a 200 to avoid to show an error on client-side
      // while the membership does exist
      const context = { groupId: group._id, userId }
      throw newError('membership already exist', 200, context)
    }
  }
}

const userIsRole = role => (userId, group) => {
  const ids = map(group[role], 'user')
  return ids.includes(userId)
}

const userIsAdmin = Group.userIsAdmin = userIsRole('admins')
const userIsNonAdminMember = userIsRole('members')

Group.userIsMember = (userId, group) => userIsAdmin(userId, group) || userIsNonAdminMember(userId, group)

Group.categories = {
  members: [ 'admins', 'members' ],
  users: [ 'admins', 'members', 'invited', 'requested' ],
}

Group.getAllMembersIds = group => {
  assert_.object(group)
  const adminsIds = map(group.admins, 'user')
  const membersIds = map(group.members, 'user')
  return adminsIds.concat(membersIds)
}

Group.formatters = {
  position: truncateLatLng,
}
