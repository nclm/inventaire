import { getItemsByIds } from '#controllers/items/lib/items'
import { filterVisibleDocs } from '#lib/visibility/filter_visible_docs'
import { filterPrivateAttributes } from './lib/filter_private_attributes.js'
import { addAssociatedData, paginateItems } from './lib/queries_commons.js'

const sanitization = {
  ids: {},
  limit: { optional: true },
  offset: { optional: true },
  'include-users': {
    generic: 'boolean',
    default: false,
  },
}

const controller = async params => {
  const { ids, reqUserId } = params
  const foundItems = await getItemsByIds(ids)
  const authorizedItems = await filterVisibleDocs(foundItems, reqUserId)
  const page = paginateItems(authorizedItems, params)
  page.items = page.items.map(filterPrivateAttributes(reqUserId))
  return addAssociatedData(page, params)
}

export default { sanitization, controller }
