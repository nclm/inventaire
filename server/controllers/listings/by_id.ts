import { getListingsByIdsWithElements } from '#controllers/listings/lib/listings'
import { notFoundError, unauthorizedError } from '#lib/error/error'
import { filterVisibleDocs } from '#lib/visibility/filter_visible_docs'

const sanitization = {
  id: {},
  // Elements pagination
  limit: { optional: true },
  offset: { optional: true },
}

const controller = async ({ id, limit, offset, reqUserId }, req) => {
  const [ listing ] = await getListingsByIdsWithElements(id, reqUserId)
  if (!listing) throw notFoundError({ id })

  const authorizedListings = await filterVisibleDocs([ listing ], reqUserId)
  if (authorizedListings.length === 0) {
    throw unauthorizedError(req, 'unauthorized list access', { list: id })
  }
  return {
    list: listing,
  }
}

export default { sanitization, controller }
