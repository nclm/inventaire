const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const entities_ = require('./entities')
const getEntityType = require('./get_entity_type')
const getInvEntityCanonicalUri = require('./get_inv_entity_canonical_uri')
const formatEntityCommon = require('./format_entity_common')
const addRedirection = require('./add_redirection')
const { prefixifyInv, unprefixify } = __.require('controllers', 'entities/lib/prefix')

// Working around the circular dependency
let getEntityByUri
const lateRequire = () => { getEntityByUri = require('./get_entity_by_uri') }
setTimeout(lateRequire, 0)

// Hypothesis: there is no need to look for Wikidata data here
// as inv entities with an associated Wikidata entity use the Wikidata uri
module.exports = (ids, params) => {
  return entities_.byIds(ids)
  .map(Format(params))
  .then(entities => {
    const found = entities.reduce(aggregateFoundIds, [])
    const notFound = _.difference(ids, found).map(prefixifyInv)
    return { entities, notFound }
  })
}

const Format = params => entity => {
  if (entity.redirect != null) return getRedirectedEntity(entity, params)

  const [ uri, redirects ] = Array.from(getInvEntityCanonicalUri(entity, { includeRedirection: true }))
  entity.uri = uri
  if (redirects != null) { entity.redirects = redirects }

  // Keep track of special types such as removed:placehoder
  // to the let the search engine unindex it
  if (entity.type !== 'entity') { entity._meta_type = entity.type }

  entity.type = getEntityType(entity.claims['wdt:P31'])
  return formatEntityCommon(entity)
}

const getRedirectedEntity = (entity, params) => {
  const { refresh, dry } = params
  // Passing the parameters as the entity data source might be Wikidata
  return getEntityByUri({ uri: entity.redirect, refresh, dry })
  .then(addRedirection.bind(null, prefixifyInv(entity._id)))
}

const aggregateFoundIds = (foundIds, entity) => {
  const { _id, redirects } = entity
  // Won't be true if the entity redirected to a Wikidata entity
  if (_id != null) { foundIds.push(_id) }
  if (redirects != null) { foundIds.push(unprefixify(redirects.from)) }
  return foundIds
}
