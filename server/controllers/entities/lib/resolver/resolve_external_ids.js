// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const { Promise } = __.require('lib', 'promises')
const properties = require('../properties/properties_values_constraints')
const { prefixifyWd } = __.require('controllers', 'entities/lib/prefix')
const entities_ = __.require('controllers', 'entities/lib/entities')
const runWdQuery = __.require('data', 'wikidata/run_query')
const getInvEntityCanonicalUri = require('../get_inv_entity_canonical_uri')

module.exports = (claims, resolveOnWikidata = true) => {
  const externalIds = []

  for (const prop in claims) {
    const values = claims[prop]
    if (properties[prop].isExternalId) {
      values.forEach(value => externalIds.push([ prop, value ]))
    }
  }

  if (externalIds.length === 0) return Promise.resolve()

  const requests = [ invQuery(externalIds) ]
  if (resolveOnWikidata) { requests.push(wdQuery(externalIds)) }

  return Promise.all(requests)
  .then(_.flatten)
}

const wdQuery = externalIds => runWdQuery({ query: 'resolve-external-ids', externalIds })
.map(prefixifyWd)

const invQuery = externalIds => Promise.all(externalIds.map(invByClaim))
.then(_.flatten)

const invByClaim = pair => {
  const [ prop, value ] = Array.from(pair)
  return entities_.byClaim(prop, value, true, true)
  .map(getInvEntityCanonicalUri)
}
