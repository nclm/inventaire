import { isPlainObject } from 'lodash-es'
import { createItems } from '#controllers/items/lib/items'
import { isEntityUri } from '#lib/boolean_validations'
import { error_ } from '#lib/error/error'
import { track } from '#lib/track'
import { forceArray } from '#lib/utils/base'
import { log } from '#lib/utils/logs'
import { addSnapshotToItem } from './lib/snapshot/snapshot.js'

export default async (req, res) => {
  let { body: items, user } = req
  const singleItemMode = isPlainObject(items)

  items = forceArray(items)

  log(items, 'create items')

  for (const item of items) {
    const { entity: entityUri } = item
    if (entityUri == null) throw error_.newMissingBody('entity')

    if (!isEntityUri(entityUri)) {
      throw error_.newInvalid('entity', entityUri)
    }
  }

  const itemsDocs = await createItems(user._id, items)
  const itemsWithSnaphots = await getItemsWithSnapshots(itemsDocs, singleItemMode)
  res.status(201).json(itemsWithSnaphots)
  track(req, [ 'item', 'creation', null, items.length ])
}

const getItemsWithSnapshots = async (itemsDocs, singleItemMode) => {
  // When only one item was sent, without being wrapped in an array
  // return the created item object, instead of an array
  if (singleItemMode) {
    return addSnapshotToItem(itemsDocs[0])
  } else {
    return Promise.all(itemsDocs.map(addSnapshotToItem))
  }
}
