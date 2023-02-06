import { keyBy } from 'lodash-es'
import { filterPrivateAttributes } from '#controllers/shelves/lib/filter_private_attributes'
import { getShelvesByOwners } from '#controllers/shelves/lib/shelves'
import { filterVisibleDocs } from '#lib/visibility/filter_visible_docs'

const sanitization = {
  owners: {},
  limit: { optional: true },
  offset: { optional: true },
}

const controller = async params => {
  const { reqUserId, owners } = params
  const foundShelves = await getShelvesByOwners(owners)
  let authorizedShelves = await filterVisibleDocs(foundShelves, reqUserId)
  authorizedShelves = authorizedShelves.map(filterPrivateAttributes(reqUserId))
  const shelves = keyBy(authorizedShelves, '_id')
  return { shelves }
}

export default { sanitization, controller }
