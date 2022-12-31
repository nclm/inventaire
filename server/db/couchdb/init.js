import CONFIG from 'config'
import _ from 'builders/utils'
import couchInit from 'couch-init2'
import initHardCodedDocuments from './init_hard_coded_documents'
import databases from './databases'
const __ = CONFIG.universalPath
const dbBaseUrl = CONFIG.db.getOrigin()
const formattedList = []

const setJsExtension = filename => `${filename}.js`

// Adapt the list to couch-init2 needs
for (const dbName in databases) {
  const designDocsNames = databases[dbName]
  formattedList.push({
    // Adding a suffix if needed
    name: CONFIG.db.name(dbName),
    designDocs: designDocsNames.map(setJsExtension)
  })
}

const designDocFolder = __.path('db', 'couchdb/design_docs')

const init = async () => {
  try {
    const res = await couchInit(dbBaseUrl, formattedList, designDocFolder)
    if (_.objLength(res.operations) !== 0) _.log(res, 'couch init')
    await initHardCodedDocuments()
  } catch (err) {
    if (err.message !== 'CouchDB name or password is incorrect') throw err

    const context = _.pick(CONFIG.db, 'protocol', 'hostname', 'port', 'username', 'password')
    // Avoid logging the password in plain text
    context.password = _.obfuscate(context.password)
    console.error(err.message, context)
    return process.exit(1)
  }
}

let waitForCouchInit

export default () => {
  // Return the same promises to all consumers
  waitForCouchInit = waitForCouchInit || init()
  return waitForCouchInit
}
