import { map, uniq } from 'lodash-es'
import { getUsersByIds } from '#controllers/user/lib/user'
import { userShouldBeAnonymized } from '#models/user'

export default async ({ patches, reqUserId }) => {
  const usersIds = uniq(map(patches, 'user'))
  const users = await getUsersByIds(usersIds)
  const deanonymizedUsersIds = getDeanonymizedUsersIds(users)
  patches.forEach(patch => {
    if (patch.user === reqUserId) return
    if (deanonymizedUsersIds.has(patch.user)) return
    anonymizePatch(patch)
  })
}

const getDeanonymizedUsersIds = users => {
  const deanonymizedUsersIds = []
  for (const user of users) {
    if (!userShouldBeAnonymized(user)) deanonymizedUsersIds.push(user._id)
  }
  return new Set(deanonymizedUsersIds)
}

const anonymizePatch = patch => {
  delete patch.user
}
