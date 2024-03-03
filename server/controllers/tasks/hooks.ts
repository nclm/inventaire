import { map } from 'lodash-es'
import { bulkDeleteTasks, getTasksBySuggestionUri, getTasksBySuspectUri, getTasksBySuspectUriAndState, updateTask } from '#controllers/tasks/lib/tasks'
import { tap, mappedArrayPromise } from '#lib/promises'
import { radio } from '#lib/radio'
import type { EntityUri } from '#types/entity'
import type { Task } from '#types/task'
import checkEntity from './lib/check_entity.js'

export function initTasksHooks () {
  radio.on('entity:merge', archiveObsoleteEntityUriTasks)
  radio.on('entity:remove', archiveObsoleteEntityUriTasks)
  radio.on('entity:revert:merge', revertArchive)
  radio.on('entity:recover', revertArchive)
  radio.on('wikidata:entity:redirect', deleteBySuggestionUriAndRecheckSuspects)
}

function archiveObsoleteEntityUriTasks (uri: EntityUri) {
  return getTasksBySuspectUri(uri)
  .then(archiveTasks)
}

function deleteBySuggestionUriAndRecheckSuspects (previousSuggestionUri: EntityUri) {
  return getTasksBySuggestionUri(previousSuggestionUri)
  .then(tap(bulkDeleteTasks))
  // Re-check entities after having archived obsolete tasks so that relationScores
  // are updated once every doc is in place.
  // No need to do anything with the newSuggestionUri as checkEntity should find it
  // if it is relevant
  .then(mappedArrayPromise(task => checkEntity(task.suspectUri)))
}

function archiveTasks (tasks: Task[]) {
  if (tasks.length === 0) return
  const ids = map(tasks, '_id')
  return updateTask({ ids, attribute: 'state', newValue: 'merged' })
}

async function revertArchive (uri: EntityUri) {
  const tasks = await getTasksBySuspectUriAndState(uri, 'merged')
  const ids = map(tasks, '_id')
  return updateTask({ ids, attribute: 'state', newValue: undefined })
}
