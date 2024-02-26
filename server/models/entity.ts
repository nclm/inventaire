// DATA MODEL
// _id: CouchDB uuid
// claims: an object with properties and their associated statements
// labels: an object with labels in different languages

// labels?
// descriptions?
// aliases?
// sitelinks? qid?

// use Wikidata data model as reference:
// https://www.mediawiki.org/wiki/Wikibase/DataModel/JSON

// Used prefixes:
// Entities:
//   PREFIX wd: <http://www.wikidata.org/entity/>
//   PREFIX inv: <https://inventaire.io/entity/>
// Properties:
//   PREFIX wdt: <http://www.wikidata.org/prop/direct/>
//   PREFIX invp: <https://inventaire.io/property/>

// Inventaire properties:
// invp:P2: Image Hash

import { isString, cloneDeep, get, without, omit } from 'lodash-es'
import wikimediaLanguageCodesByWdId from 'wikidata-lang/indexes/by_wm_code.js'
import inferences from '#controllers/entities/lib/inferences'
import { propertiesValuesConstraints as properties } from '#controllers/entities/lib/properties/properties_values_constraints'
import { newError } from '#lib/error/error'
import { assert_ } from '#lib/utils/assert_types'
import { superTrim } from '#lib/utils/base'
import { log, warn } from '#lib/utils/logs'
import validateRequiredPropertiesValues from './validations/validate_required_properties_values.js'

const wikimediaLanguageCodes = new Set(Object.keys(wikimediaLanguageCodesByWdId))

const Entity = {
  create: () => {
    return {
      type: 'entity',
      labels: {},
      claims: {},
      created: Date.now(),
      version: 1,
    }
  },

  setLabel: (doc, lang, value) => {
    assert_.object(doc)
    assert_.string(lang)

    if (!wikimediaLanguageCodes.has(lang)) {
      throw newError('invalid lang', 400, { doc, lang, value })
    }

    Entity.preventRedirectionEdit(doc, 'setLabel')

    if (value === null) {
      deleteLabel(doc, lang)
    } else {
      assert_.string(value)
      value = superTrim(value)

      if (doc.labels[lang] === value) {
        throw newError('already up-to-date', 400, { doc, lang, value })
      }

      doc.labels[lang] = value
    }

    return doc
  },

  setLabels: (doc, labels) => {
    Entity.preventRedirectionEdit(doc, 'setLabels')
    for (const lang in labels) {
      const value = labels[lang]
      doc = Entity.setLabel(doc, lang, value)
    }

    return doc
  },

  addClaims: (doc, claims) => {
    Entity.preventRedirectionEdit(doc, 'addClaims')

    // Pass the list of all edited properties, so that wen trying to infer property
    // values, we know which one should not be infered at the risk of creating
    // a conflict
    doc._allClaimsProps = Object.keys(claims)

    for (const property in claims) {
      const array = claims[property]
      for (const value of array) {
        doc = Entity.createClaim(doc, property, value)
      }
    }

    delete doc._allClaimsProps

    return doc
  },

  createClaim: (doc, property, value) => {
    Entity.preventRedirectionEdit(doc, 'createClaim')
    return Entity.updateClaim(doc, property, null, value)
  },

  updateClaim: (doc, property, oldVal, newVal) => {
    const context = { doc, property, oldVal, newVal }
    Entity.preventRedirectionEdit(doc, 'updateClaim')
    if (oldVal == null && newVal == null) {
      throw newError('missing old or new value', 400, context)
    }

    if (isString(oldVal)) oldVal = superTrim(oldVal)
    if (isString(newVal)) newVal = superTrim(newVal)

    let propArray = get(doc, `claims.${property}`)

    if (propArray && newVal != null && propArray.includes(newVal)) {
      throw newError('claim property new value already exist', 400, [ propArray, newVal ])
    }

    if (oldVal != null) {
      if (propArray != null) {
        propArray = propArray.map(value => isString(value) ? superTrim(value) : value)
      }
      if (propArray == null || !propArray.includes(oldVal)) {
        throw newError('claim property value not found', 400, context)
      }

      if (newVal != null) {
        const oldValIndex = propArray.indexOf(oldVal)
        doc.claims[property][oldValIndex] = newVal
      } else {
        // if the new value is null, it plays the role of a removeClaim
        propArray = without(propArray, oldVal)

        setPossiblyEmptyPropertyArray(doc, property, propArray)
      }
    } else {
      // if the old value is null, it plays the role of a createClaim
      if (!doc.claims[property]) doc.claims[property] = []
      doc.claims[property].push(newVal)
    }

    return updateInferredProperties(doc, property, oldVal, newVal)
  },

  beforeSave: doc => {
    // Do not validate redirections, removed placeholder, etc
    if (doc.claims != null) {
      validateRequiredPropertiesValues(doc.claims)
    }
    doc.updated = Date.now()
    doc.version++
    return doc
  },

  // 'from' and 'to' refer to the redirection process which rely on merging
  // two existing document: redirecting from an entity to another entity,
  // only the 'to' doc will survive
  mergeDocs: (fromEntityDoc, toEntityDoc) => {
    Entity.preventRedirectionEdit(fromEntityDoc, 'mergeDocs (from)')
    Entity.preventRedirectionEdit(toEntityDoc, 'mergeDocs (to)')

    for (const lang in fromEntityDoc.labels) {
      const value = fromEntityDoc.labels[lang]
      if (toEntityDoc.labels[lang] == null) {
        toEntityDoc.labels[lang] = value
      }
    }

    for (const property in fromEntityDoc.claims) {
      const values = fromEntityDoc.claims[property]
      if (toEntityDoc.claims[property] == null) { toEntityDoc.claims[property] = [] }
      for (const value of values) {
        if (!toEntityDoc.claims[property].includes(value)) {
          if (toEntityDoc.claims[property].length > 0) {
            if (properties[property].uniqueValue) {
              warn(value, `${property} can have only one value: ignoring merged entity value`)
            } else if (properties[property].hasPlaceholders) {
              warn(value, `${property} values may be placeholders: ignoring merged entity value`)
            } else {
              toEntityDoc.claims[property].push(value)
            }
          } else {
            toEntityDoc.claims[property].push(value)
          }
        }
      }
    }

    return toEntityDoc
  },

  turnIntoRedirection: (fromEntityDoc, toUri, removedPlaceholdersIds) => {
    const [ prefix, id ] = toUri.split(':')

    if (prefix === 'inv' && id === fromEntityDoc._id) {
      throw newError('circular redirection', 500, { fromEntityDoc, toUri, removedPlaceholdersIds })
    }

    const redirection = cloneDeep(fromEntityDoc)

    redirection.redirect = toUri
    delete redirection.labels
    delete redirection.claims
    // the list of placeholders entities to recover if the merge as to be reverted
    redirection.removedPlaceholdersIds = removedPlaceholdersIds

    return redirection
  },

  removePlaceholder: entityDoc => {
    if (entityDoc.redirect) {
      const message = "can't turn a redirection into a removed placeholder"
      throw newError(message, 400, entityDoc)
    }

    const removedDoc = cloneDeep(entityDoc)
    removedDoc.type = 'removed:placeholder'
    return removedDoc
  },

  recoverPlaceholder: entityDoc => {
    const recoveredDoc = cloneDeep(entityDoc)
    recoveredDoc.type = 'entity'
    return recoveredDoc
  },

  preventRedirectionEdit: (doc, editLabel) => {
    if (doc.redirect == null) return
    throw newError(`${editLabel} failed: the entity is a redirection`, 400, { doc, editLabel })
  },
}

export default Entity

const updateInferredProperties = (doc, property, oldVal, newVal) => {
  const declaredProperties = doc._allClaimsProps || []
  // Use _allClaimsProps to list properties that shouldn't be inferred
  const propInferences = omit(inferences[property], declaredProperties)

  const addingOrUpdatingValue = (newVal != null)

  for (const inferredProperty in propInferences) {
    const convertor = propInferences[inferredProperty]
    let inferredPropertyArray = doc.claims[inferredProperty] || []

    if (addingOrUpdatingValue) {
      const inferredValue = convertor(newVal)
      // Known case of missing infered value:
      // ISBN-13 with a 979 prefix will not have an ISBN-10
      if (inferredValue != null) {
        if (!inferredPropertyArray.includes(inferredValue)) {
          inferredPropertyArray.push(inferredValue)
          log(inferredValue, `added inferred ${inferredProperty} from ${property}`)
        }
      } else {
        warn(newVal, `inferred value not found for ${inferredProperty} from ${property}`)
      }
    } else {
      // The current entity data model doesn't allow to check if the claim was
      // indeed inferred or if it was manually added.
      // This could be made possible by replacing claims direct values by an object:
      // {
      //   id: 'claim uuid prefixed by property uri (following wikidata data model)',
      //   value: "claim value",
      //   inferredFrom: 'claim id'
      // }
      const inferredValue = convertor(oldVal)
      if (inferredPropertyArray.includes(inferredValue)) {
        inferredPropertyArray = without(inferredPropertyArray, inferredValue)
        log(inferredValue, `removed inferred ${inferredProperty} from ${property}`)
      }
    }

    setPossiblyEmptyPropertyArray(doc, inferredProperty, inferredPropertyArray)
  }

  return doc
}

const setPossiblyEmptyPropertyArray = (doc, property, propertyArray) => {
  if (propertyArray.length === 0) {
    // if empty, clean the doc from the property
    doc.claims = omit(doc.claims, property)
  } else {
    doc.claims[property] = propertyArray
  }
}

const deleteLabel = (doc, lang) => {
  if (doc.labels[lang] == null) {
    throw newError('can not delete a non-existant label', 400, { doc, lang })
  }

  if (Object.keys(doc.labels).length === 1) {
    throw newError('can not delete the last label', 400, { doc, lang })
  }

  delete doc.labels[lang]
}
