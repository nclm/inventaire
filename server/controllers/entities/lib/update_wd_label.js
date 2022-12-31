import error_ from 'lib/error/error'
import wdk from 'wikidata-sdk'
import wdEdit from 'lib/wikidata/edit'
import wdOauth from './wikidata_oauth'

export default async (user, id, language, value) => {
  if (!wdk.isItemId(id)) throw error_.newInvalid('id', id)

  wdOauth.validate(user)
  const credentials = wdOauth.getOauthCredentials(user)

  return wdEdit.label.set({ id, language, value }, { credentials })
}
