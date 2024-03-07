import { map } from 'lodash-es'
import dbFactory from '#db/couchdb/base'
import { isNonEmptyArray } from '#lib/boolean_validations'
import { newError } from '#lib/error/error'
import { combinations } from '#lib/utils/base'
import { createElementDoc, updateElementDoc } from '#models/element'

const db = await dbFactory('elements')

export const getElementById = db.get

export const getElementsByIds = db.byIds

export async function getElementsByEntities (uris) {
  return db.getDocsByViewKeys('byEntities', uris)
}

export async function getElementsByListingsAndEntity (listingsIds, entitiesUris) {
  const keys = combinations(listingsIds, entitiesUris)
  return db.getDocsByViewKeys('byListAndEntity', keys)
}

export async function getElementsByListings (listingsIds) {
  return db.getDocsByViewKeys('byListings', listingsIds)
}

export const bulkDeleteElements = db.bulkDelete

export async function deleteListingsElements (listings) {
  const listingIds = map(listings, '_id')
  const listingsElements = await getElementsByListings(listingIds)
  if (isNonEmptyArray(listingsElements)) {
    await bulkDeleteElements(listingsElements)
  }
  return listingsElements
}

export async function createListingElements ({ listing, uris, userId }) {
  const listingId = listing._id
  if (listing.creator !== userId) {
    throw newError('wrong user', 403, { userId, listingId })
  }
  const elements = uris.map(uri => createElementDoc({
    list: listingId,
    uri,
  }))
  const res = await db.bulk(elements)
  const elementsIds = map(res, 'id')
  return db.fetch(elementsIds)
}

export async function bulkUpdateElements ({ oldElements, attribute, value }) {
  const elementUpdateData = { [attribute]: value }
  const newElements = oldElements.map(oldElement => updateElementDoc(elementUpdateData, oldElement))
  return elementsBulkUpdate(newElements)
}

const elementsBulkUpdate = db.bulk
