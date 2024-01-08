import { prefixifyWdProperty } from '#controllers/entities/lib/prefix'

export const nonPrefixedLanguagesCodesProperties = [
  'P218', // ISO 639-1 code
  'P219', // ISO 639-2 code
  'P220', // ISO 639-3 code
  'P221', // ISO 639-6 code
  'P424', // Wikimedia language code
  'P1798', // ISO 639-5 code
  'P9753', // Wikidata language code
]

export const languagesCodesProperties = nonPrefixedLanguagesCodesProperties.map(prefixifyWdProperty)

export const languageCodePattern = /^[\w-_]+$/
