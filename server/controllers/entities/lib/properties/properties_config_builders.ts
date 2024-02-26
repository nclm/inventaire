import { newError } from '#lib/error/error'
import { formatIsbn } from '#lib/isbn/isbn'
import { parseIsbn } from '#lib/isbn/parse'
import { assert_ } from '#lib/utils/assert_types'
import { getPluralType } from '#lib/wikidata/aliases'
import allowedValuesPerTypePerProperty from './allowed_values_per_type_per_property.js'
import { concurrentString, concurrentExternalId, uniqueEntity } from './properties_config_bases.js'

export const isbnProperty = num => {
  return Object.assign({}, concurrentString, {
    validate: isbn => {
      if (isbn == null) return false
      const isbnData = parseIsbn(isbn)
      if (isbnData == null) return false
      return isbn === isbnData[`isbn${num}h`]
    },
    uniqueValue: true,
    format: isbn => formatIsbn(isbn, `${num}h`) || isbn,
    adminUpdateOnly: true,
  })
}

// External ids regexs can be found
// on their Wikidata property page P1793 statement
export const externalId = regex => {
  return Object.assign({}, concurrentExternalId, {
    validate: regex.test.bind(regex),
  })
}

export const typedExternalId = regexPerType => {
  return Object.assign({}, concurrentExternalId, {
    typeSpecificValidation: true,
    validate: (value, entityType) => {
      assert_.string(entityType)
      if (regexPerType[entityType] == null) {
        throw newError('unsupported type', 500, { regexPerType, entityType, value })
      }
      return regexPerType[entityType].test(value)
    },
  })
}

export const allowedPropertyValues = property => {
  const allowedValuesPerType = allowedValuesPerTypePerProperty[property]
  return Object.assign({}, uniqueEntity, {
    typeSpecificValidation: true,
    validate: (entityUri, entityType) => {
      const type = getPluralType(entityType)
      return allowedValuesPerType[type].includes(entityUri)
    },
  })
}

export const externalIdWithFormatter = ({ regex, format }) => {
  return Object.assign({}, concurrentExternalId, {
    validate: regex.test.bind(regex),
    format,
  })
}
