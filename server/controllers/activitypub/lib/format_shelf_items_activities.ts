import { compact } from 'lodash-es'
import { getPublicItemsByShelfAndDate } from '#controllers/items/lib/items'
import type { Url } from '#types/common'
import { createItemsNote, findFullRangeFromActivities } from './format_items_activities.js'
import { makeUrl } from './helpers.js'

export default async (activitiesDocs, shelfId, name) => {
  if (activitiesDocs.length === 0) return
  const actor = makeUrl({ params: { action: 'actor', name } }) as Url
  const parentLink = `/shelves/${shelfId}` as Url
  const { since, until } = findFullRangeFromActivities(activitiesDocs)
  const allActivitiesItems = await getPublicItemsByShelfAndDate({
    shelf: shelfId,
    since,
    until,
  })

  const formattedActivities = await Promise.all(activitiesDocs.map(createItemsNote({ allActivitiesItems, name, actor, parentLink })))
  return compact(formattedActivities)
}
