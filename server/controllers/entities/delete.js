import { uniq } from 'lodash-es'
import { getInvEntitiesByIsbns } from '#controllers/entities/lib/entities'
import { isInvEntityUri, isIsbnEntityUri, isWdEntityUri } from '#lib/boolean_validations'
import { error_ } from '#lib/error/error'
import removeEntitiesByInvId from './lib/remove_entities_by_inv_id.js'
import verifyThatEntitiesCanBeRemoved from './lib/verify_that_entities_can_be_removed.js'

const sanitization = {
  uris: {},
}

const controller = async (params, req) => {
  const { user } = req
  let uris = uniq(params.uris)
  validateUris(uris)
  uris = await replaceIsbnUrisByInvUris(uris)
  await verifyThatEntitiesCanBeRemoved(uris)
  await removeEntitiesByInvId(user, uris)
  return { ok: true }
}

const validateUris = uris => {
  for (const uri of uris) {
    // Wikidata entities can't be delete
    if (isWdEntityUri(uri)) throw error_.newInvalid('uri', uri)
  }
}

const replaceIsbnUrisByInvUris = async uris => {
  const invUris = uris.filter(isInvEntityUri)
  const isbnUris = uris.filter(isIsbnEntityUri)
  if (isbnUris.length === 0) return invUris

  const substitutedUris = await getInvUrisFromIsbnUris(isbnUris)
  return invUris.concat(substitutedUris)
}

const getInvUrisFromIsbnUris = async uris => {
  const isbns = uris.map(uri => uri.split(':')[1])
  const entities = await getInvEntitiesByIsbns(isbns)
  return entities.map(entity => `inv:${entity._id}`)
}

export default { sanitization, controller }
