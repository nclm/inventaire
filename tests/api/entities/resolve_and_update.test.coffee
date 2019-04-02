CONFIG = require 'config'
__ = CONFIG.universalPath
_ = __.require 'builders', 'utils'
should = require 'should'
{ Promise } = __.require 'lib', 'promises'
{ authReq, undesiredErr } = require '../utils/utils'
{ getByUris, addClaim } = require '../utils/entities'
{ createWork, createHuman, ensureEditionExists, someOpenLibraryId, randomLabel, generateIsbn13 } = require '../fixtures/entities'
resolve = (entry)->
  authReq 'post', '/api/entities?action=resolve',
    entries: [ entry ]
    update: true

describe 'entities:resolver:update-resolved', ->
  it 'should update works claim values if property does not exist', (done)->
    olId = someOpenLibraryId 'work'
    authorUri = 'wd:Q35802'
    authorUri2 = 'wd:Q184226'
    entry =
      edition: [ { isbn: generateIsbn13() } ]
      works: [
        claims:
          'wdt:P648': [ olId ],
          'wdt:P50': [ authorUri, authorUri2 ]
      ]
    createWork()
    .tap (work)-> addClaim work.uri, 'wdt:P648', olId
    .then (work)->
      resolve(entry)
      .get('results')
      .then (results)->
        entityUri = results[0].works[0].uri
        getByUris(entityUri).get 'entities'
        .then (entities)->
          authorClaimValues = _.values(entities)[0].claims['wdt:P50']
          authorClaimValues.should.containEql authorUri
          authorClaimValues.should.containEql authorUri2
          done()
    .catch done

    return

  it 'should not update works claim values if property exists', (done)->
    olId = someOpenLibraryId 'work'
    authorUri = 'wd:Q35802'
    authorUri2 = 'wd:Q184226'
    entry =
      edition: [ { isbn: generateIsbn13() } ]
      works: [
        claims:
          'wdt:P648': [ olId ],
          'wdt:P50': [ authorUri ]
      ]
    createWork()
    .tap (work)-> addClaim work.uri, 'wdt:P648', olId
    .tap (work)-> addClaim work.uri, 'wdt:P50', authorUri2
    .then (work)->
      resolve(entry).get('results')
      .then (results)->
        entityUri = results[0].works[0].uri
        getByUris(entityUri)
        .get 'entities'
        .then (entities)->
          authorClaimValues = _.values(entities)[0].claims['wdt:P50']
          authorClaimValues.should.not.containEql authorUri
          done()
    .catch done

    return

  it 'should update authors claim values', (done)->
    olId = someOpenLibraryId 'author'
    officialWebsite = 'http://Q35802.org'
    entry =
      edition: [ { isbn: generateIsbn13() } ]
      authors: [
        claims:
          'wdt:P648': [ olId ],
          'wdt:P856': [ officialWebsite ]
      ]
    createHuman()
    .tap (human)-> addClaim human.uri, 'wdt:P648', olId
    .then (work)->
      resolve(entry).get('results')
      .then (results)->
        entityUri = results[0].authors[0].uri
        getByUris(entityUri)
        .get 'entities'
        .then (entities)->
          authorClaimValues = _.values(entities)[0].claims['wdt:P856']
          authorClaimValues.should.containEql officialWebsite
          done()
    .catch done

    return

  it 'should update edition claim values', (done)->
    publisher = 'Raimonde'
    isbn = generateIsbn13()
    editionUri = "isbn:#{isbn}"
    title = randomLabel()

    ensureEditionExists editionUri, null,
      labels: {}
      claims:
        'wdt:P31': [ 'wd:Q3331189' ]
        'wdt:P1476': [ title ]
    .then (edition)->
      entry =
        edition: [
          isbn: isbn
          claims: { 'wdt:P123': publisher }
        ]
      resolve(entry)
      .get('results')
      .delay(10)
      .then (results)->
        getByUris editionUri
        .get 'entities'
        .then (editions)->
          authorClaimValues = _.values(editions)[0].claims['wdt:P123']
          authorClaimValues.should.containEql publisher
          done()
    .catch done

    return
