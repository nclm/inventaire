import CONFIG from 'config'
import { keyBy, map, mapValues, property } from 'lodash-es'

// Using CouchDB database names + environment suffix as indexes names
const indexesData = [
  { indexBaseName: 'wikidata', index: 'wikidata', sync: false },
  // Match CouchDB database names
  { indexBaseName: 'entities', sync: true },
  { indexBaseName: 'items', sync: true },
  { indexBaseName: 'groups', sync: true },
  { indexBaseName: 'users', sync: true },
  { indexBaseName: 'shelves', sync: true },
  { indexBaseName: 'lists', sync: true },
]
.map(data => {
  data.index = data.index || CONFIG.db.name(data.indexBaseName)
  return data
})

export const indexes = keyBy(indexesData, 'indexBaseName')
export const indexesList = map(indexesData, 'index')
export const indexesNamesByBaseNames = mapValues(indexes, 'index')

export const syncIndexesList = indexesData
  .filter(indexData => indexData.sync)
  .map(property('indexBaseName'))

export const indexedEntitiesTypes = [
  // inventaire and wikidata entities
  'works',
  'humans',
  'genres',
  'publishers',
  'series',
  'collections',

  // wikidata entities only
  'genres',
  'movements',
  'languages',
]

export const socialTypes = [
  'users',
  'groups',
  'shelves',
  'lists',
]

export const indexedTypes = indexedEntitiesTypes.concat(socialTypes)