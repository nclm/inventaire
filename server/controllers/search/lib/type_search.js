const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const requests_ = __.require('lib', 'requests')
const error_ = __.require('lib', 'error/error')
const assert_ = __.require('utils', 'assert_types')
const { host: elasticHost } = CONFIG.elasticsearch
const { getHits, formatError } = __.require('lib', 'elasticsearch')
const { indexes, indexedTypes, indexedEntitiesTypes } = require('./indexes')
const indexedTypesSet = new Set(indexedTypes)
const looseEntitiesQueryBuilder = require('./entities_query_builder')
const strictEntitiesQueryBuilder = require('./strict_entities_query_builder')
const socialQueryBuilder = require('./social_query_builder')

module.exports = async ({ lang, types, search, limit = 20, filter, minScore, strict }) => {
  assert_.array(types)
  for (const type of types) {
    if (!indexedTypesSet.has(type)) throw error_.new('invalid type', 500, { type, types })
  }
  assert_.string(search)

  const hasSocialTypes = types.includes('users') || types.includes('groups')

  validateTypes(types, hasSocialTypes)
  if (strict != null) validateStrictSearch(types)

  let body, queryIndexes
  if (hasSocialTypes) {
    queryIndexes = types.map(type => indexes[type])
    body = socialQueryBuilder({ search, limit, minScore })
  } else {
    queryIndexes = entitiesIndexesPerFilter[filter]
    if (queryIndexes == null) throw error_.new('invalid filter', 500, { filter })
    body = entitiesQueryBuilder({ lang, types, search, limit, minScore, strict })
  }

  const url = `${elasticHost}/${queryIndexes.join(',')}/_search`

  return requests_.post(url, { body })
  .then(getHits)
  .catch(formatError)
}

const entitiesIndexesPerFilter = {
  wd: [ indexes.wikidata ],
  inv: [ indexes.entities ],
  [undefined]: [ indexes.wikidata, indexes.entities ],
}

const entitiesQueryBuilder = ({ lang, types, search, limit, minScore, strict }) => {
  if (strict != null) {
    return strictEntitiesQueryBuilder({ types, search, limit, minScore })
  } else {
    return looseEntitiesQueryBuilder({ lang, types, search, limit, minScore })
  }
}

const validateTypes = (types, hasSocialTypes) => {
  const hasEntityTypes = _.someMatch(types, indexedEntitiesTypes)

  // Query must be either social (user, group) or entities related
  // but cannot be both as results scores are built very differently
  if (hasSocialTypes && hasEntityTypes) {
    throw error_.new('can not have both social and entity types', 400, { types })
  }
}

const validateStrictSearch = types => {
  if (_.without(types, ...indexedEntitiesTypes).length > 0) throw error_.new('strict search are restricted to entities types', 400, { givenTypes: types, validTypes: indexedEntitiesTypes })
}
