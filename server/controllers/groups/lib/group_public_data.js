import error_ from 'lib/error/error'
import assert_ from 'lib/utils/assert_types'
import lists_ from './users_lists'
import groups_ from './groups'
import user_ from 'controllers/user/lib/user'

// fnName: byId or bySlug
// fnArgs: [ id ] or [ slug ]
export default (fnName, fnArgs, reqUserId) => {
  assert_.array(fnArgs)
  return groups_[fnName].apply(null, fnArgs)
  .then(group => {
    if (group == null) throw error_.notFound(fnArgs[0])

    const usersIds = lists_.allGroupMembers(group)

    return user_.getUsersByIds(usersIds, reqUserId)
    .then(users => ({ group, users }))
  })
}
