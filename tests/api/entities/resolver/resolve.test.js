const CONFIG = require('config')
const __ = CONFIG.universalPath
const _ = __.require('builders', 'utils')
const should = require('should')
const { Wait, tap } = __.require('lib', 'promises')
const { authReq, undesiredRes } = __.require('apiTests', 'utils/utils')
const elasticsearchUpdateDelay = CONFIG.entitiesSearchEngine.elasticsearchUpdateDelay || 1000
const { createWork, createHuman, someGoodReadsId, someLibraryThingsWorkId, someOpenLibraryId, createWorkWithAuthor, generateIsbn13 } = __.require('apiTests', 'fixtures/entities')
const { addClaim, getByUri } = __.require('apiTests', 'utils/entities')
const { createEditionWithIsbn, randomLabel } = __.require('apiTests', 'fixtures/entities')

const resolve = entries => {
  entries = _.forceArray(entries)
  return authReq('post', '/api/entities?action=resolve', { entries })
}

describe('entities:resolve', () => {
  it('should throw when invalid isbn is passed', done => {
    const invalidIsbn = '9780000000000'
    resolve({ edition: { isbn: invalidIsbn } })
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.startWith('invalid isbn')
      done()
    })
    .catch(done)
  })

  it('should resolve an edition entry from an ISBN', async () => {
    const { uri, isbn } = await createEditionWithIsbn()
    const entry = { edition: { isbn } }
    const { entries } = await resolve(entry)
    entries[0].should.be.an.Object()
    entries[0].edition.uri.should.equal(uri)
  })

  it('should resolve an edition from a known edition external id', async () => {
    const openLibraryId = someOpenLibraryId('edition')
    const { invUri, uri } = await createEditionWithIsbn()
    await addClaim(invUri, 'wdt:P648', openLibraryId)
    const editionSeed = { claims: { 'wdt:P648': [ openLibraryId ] } }
    const entry = { edition: editionSeed }
    const { entries } = await resolve(entry)
    entries[0].edition.uri.should.equal(uri)
  })

  it('should resolve an edition entry from an ISBN set in the claims', async () => {
    const { isbn, isbn13h } = await createEditionWithIsbn()
    const editionSeed = { claims: { 'wdt:P212': isbn13h } }
    const entry = { edition: editionSeed }
    const { entries } = await resolve(entry)
    entries[0].should.be.an.Object()
    entries[0].edition.uri.should.equal(`isbn:${isbn}`)
  })

  it('should resolve multiple entries', async () => {
    const [ editionA, editionB ] = await Promise.all([
      createEditionWithIsbn(),
      createEditionWithIsbn()
    ])
    const { isbn: isbnA } = editionA
    const { isbn: isbnB } = editionB
    const entryA = { edition: { isbn: isbnA } }
    const entryB = { edition: { isbn: isbnB } }
    const { entries } = await resolve([ entryA, entryB ])
    entries[0].should.be.an.Object()
    entries[0].edition.uri.should.equal(`isbn:${isbnA}`)
    entries[1].should.be.an.Object()
    entries[1].edition.uri.should.equal(`isbn:${isbnB}`)
  })

  it('should reject if key "edition" is missing', done => {
    resolve({})
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.startWith('missing edition in entry')
      done()
    })
    .catch(done)
  })

  it('should reject when no isbn is found', done => {
    const entry = {
      edition: [ { claims: { 'wdt:P1476': randomLabel() } } ],
      works: [ { labels: { en: randomLabel() } } ]
    }
    resolve(entry)
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.startWith('no isbn or external id claims found')
      done()
    })
    .catch(done)
  })

  it('should reject when label lang is invalid', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      works: [ { labels: { notalang: 'foo' } } ]
    })
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.equal('invalid label lang')
      done()
    })
    .catch(done)
  })

  it('should reject when label value is invalid', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      works: [ { labels: { fr: [ 'foo' ] } } ]
    })
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.equal('invalid label')
      done()
    })
    .catch(done)
  })

  it('should reject when claims key is not an array of objects', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      works: [ { claims: [ 'wdt:P31: wd:Q23' ] } ]
    })
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.startWith('invalid claims')
      done()
    })
    .catch(done)
  })

  it('should reject when claims value is invalid', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      works: [ { claims: { 'wdt:P50': [ 'not a valid entity uri' ] } } ]
    })
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.equal('invalid property value')
      done()
    })
    .catch(done)
  })

  it('should reject when claims key has an unknown property', done => {
    const unknownProp = 'wdt:P6'
    const seed = {
      isbn: generateIsbn13(),
      claims: { [unknownProp]: [ 'wd:Q23' ] }
    }
    resolve({ edition: seed })
    .then(undesiredRes(done))
    .catch(err => {
      err.statusCode.should.equal(400)
      err.body.status_verbose.should.equal("property isn't whitelisted")
      done()
    })
    .catch(done)
  })
})

describe('entities:resolve:external-id', () => {
  it('should resolve wikidata work from external ids claim', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      works: [ {
        claims: {
          'wdt:P1085': [ '28158' ]
        }
      }
      ]
    })
    .then(({ entries }) => entries)
    .then(entries => {
      entries[0].works.should.be.an.Array()
      entries[0].works[0].should.be.an.Object()
      entries[0].works[0].uri.should.equal('wd:Q151883')
      done()
    })
    .catch(done)
  })

  it('should resolve inventaire work from external ids claim', done => {
    const libraryThingsWorkId = someLibraryThingsWorkId()
    createWork()
    .then(tap(work => addClaim(work.uri, 'wdt:P1085', libraryThingsWorkId)))
    .then(Wait(10))
    .then(work => {
      return resolve({
        edition: { isbn: generateIsbn13() },
        works: [ { claims: { 'wdt:P1085': [ libraryThingsWorkId ] } } ]
      })
      .then(({ entries }) => entries)
      .then(entries => {
        entries[0].works.should.be.an.Array()
        entries[0].works[0].should.be.an.Object()
        entries[0].works[0].uri.should.equal(work.uri)
        done()
      })
    })
    .catch(done)
  })

  it('should resolve wikidata author from external ids claim', done => {
    resolve({
      edition: { isbn: generateIsbn13() },
      authors: [ {
        claims: {
          'wdt:P648': [ 'OL28127A' ]
        }
      }
      ]
    })
    .then(({ entries }) => entries)
    .then(entries => {
      entries[0].authors.should.be.an.Array()
      entries[0].authors[0].should.be.an.Object()
      entries[0].authors[0].uri.should.equal('wd:Q16867')
      done()
    })
    .catch(done)
  })

  it('should resolve inventaire author from external ids claim', done => {
    const goodReadsId = someGoodReadsId()
    createHuman()
    .then(Wait(10))
    .then(tap(author => addClaim(author.uri, 'wdt:P2963', goodReadsId)))
    .then(Wait(10))
    .then(author => {
      return resolve({
        edition: { isbn: generateIsbn13() },
        authors: [ { claims: { 'wdt:P2963': [ goodReadsId ] } } ]
      })
      .then(({ entries }) => entries)
      .then(entries => {
        entries[0].authors.should.be.an.Array()
        entries[0].authors[0].should.be.an.Object()
        entries[0].authors[0].uri.should.equal(author.uri)
        done()
      })
    })
    .catch(done)
  })
})

describe('entities:resolve:in-context', () => {
  it('should resolve work from work label and author with external ids claim', done => {
    const goodReadsId = someGoodReadsId()
    const missingWorkLabel = randomLabel()
    const otherWorkLabel = randomLabel()
    createHuman()
    .then(Wait(10))
    .then(tap(author => addClaim(author.uri, 'wdt:P2963', goodReadsId)))
    .then(Wait(10))
    .then(author => {
      return Promise.all([
        createWorkWithAuthor(author, missingWorkLabel),
        createWorkWithAuthor(author, otherWorkLabel)
      ])
      .then(([ work, otherWork ]) => {
        return resolve({
          edition: { isbn: generateIsbn13() },
          works: [ { labels: { en: missingWorkLabel } } ],
          authors: [ { claims: { 'wdt:P2963': [ goodReadsId ] } } ]
        })
        .then(({ entries }) => entries)
        .then(entries => {
          should(entries[0].works[0].uri).be.ok()
          done()
        })
      })
    })
    .catch(done)
  })

  it('should resolve work from author found in work author claims', done => {
    createWorkWithAuthor()
    .then(work => {
      const { labels, claims } = work
      return resolve({
        edition: { isbn: generateIsbn13() },
        works: [ { labels, claims } ]
      })
      .then(({ entries }) => entries)
      .then(entries => {
        should(entries[0].works[0].uri).be.ok()
        done()
      })
    })
    .catch(done)
  })

  it('should not resolve work from resolved author when author have several works with same labels', done => {
    const goodReadsId = someGoodReadsId()
    const workLabel = randomLabel()
    createHuman()
    .then(Wait(10))
    .then(tap(author => addClaim(author.uri, 'wdt:P2963', goodReadsId)))
    .then(Wait(10))
    .then(author => {
      return Promise.all([
        createWorkWithAuthor(author, workLabel),
        createWorkWithAuthor(author, workLabel)
      ])
      .then(([ work, otherWork ]) => {
        const entry = {
          edition: { isbn: generateIsbn13() },
          works: [ { labels: { en: workLabel } } ],
          authors: [ { claims: { 'wdt:P2963': [ goodReadsId ] } } ]
        }
        return resolve(entry)
        .then(({ entries }) => entries)
        .then(entries => {
          should(entries[0].works[0].uri).not.be.ok()
          done()
        })
      })
    })
    .catch(done)
  })

  it('should resolve author from inv author with same label, and an inv work with external id', done => {
    const libraryThingsWorkId = someLibraryThingsWorkId()
    const workLabel = randomLabel()
    createHuman()
    .then(Wait(10))
    .then(author => {
      return createWorkWithAuthor(author, workLabel)
      .then(tap(work => addClaim(work.uri, 'wdt:P1085', libraryThingsWorkId)))
      .then(work => {
        const entry = {
          edition: { isbn: generateIsbn13() },
          works: [ { claims: { 'wdt:P1085': [ libraryThingsWorkId ] } } ],
          authors: [ { labels: author.labels } ]
        }
        return resolve(entry)
        .then(({ entries }) => entries)
        .then(entries => {
          should(entries[0].works[0].uri).be.ok()
          should(entries[0].authors[0].uri).be.ok()
          done()
        })
      })
    })
    .catch(done)
  })

  it('should resolve work from resolve edition', async () => {
    const { isbn, claims } = await createEditionWithIsbn()
    const { uri: workUri, labels } = await getByUri(claims['wdt:P629'][0])
    const { entries } = await resolve({
      edition: { isbn },
      works: [ { labels } ]
    })
    entries[0].works[0].uri.should.equal(workUri)
  })

  it('should ignore unresolved work from resolve edition', async () => {
    const { isbn } = await createEditionWithIsbn()
    const { entries } = await resolve({
      edition: { isbn },
      works: [ { labels: { en: randomLabel() } } ]
    })
    const entry = entries[0]
    entry.works[0].resolved.should.be.false()
  })
})

describe('entities:resolve:on-labels', () => {
  it('should not resolve work pair if no labels match', done => {
    createHuman()
    .then(author => {
      const workLabel = randomLabel()
      const seedLabel = randomLabel()
      const authorLabel = author.labels.en
      return createWorkWithAuthor(author, workLabel)
      .then(Wait(elasticsearchUpdateDelay))
      .then(work => {
        return resolve(basicEntry(seedLabel, authorLabel))
        .then(({ entries }) => entries)
        .then(entries => {
          should(entries[0].works[0].uri).not.be.ok()
          done()
        })
      })
    })
    .catch(done)
  })

  it('should resolve author and work pair by searching for exact labels', done => {
    createHuman()
    .then(author => {
      const workLabel = randomLabel()
      const authorLabel = author.labels.en
      return createWorkWithAuthor(author, workLabel)
      .then(Wait(elasticsearchUpdateDelay))
      .then(work => {
        return resolve(basicEntry(workLabel, authorLabel))
        .then(({ entries }) => entries)
        .then(entries => {
          entries[0].works[0].uri.should.equal(work.uri)
          entries[0].authors[0].uri.should.equal(author.uri)
          done()
        })
      })
    })
    .catch(done)
  })

  it('should resolve work pair with case insentive labels', done => {
    createHuman()
    .then(author => {
      const workLabel = randomLabel()
      const seedLabel = workLabel.toUpperCase()
      const authorLabel = author.labels.en
      return createWorkWithAuthor(author, workLabel)
      .then(Wait(elasticsearchUpdateDelay))
      .then(work => {
        return resolve(basicEntry(seedLabel, authorLabel))
        .then(({ entries }) => entries)
        .then(entries => {
          entries[0].works[0].uri.should.equal(work.uri)
          entries[0].authors[0].uri.should.equal(author.uri)
          done()
        })
      })
    })
    .catch(done)
  })

  it('should not resolve when several works exist', done => {
    createHuman()
    .then(author => {
      return createHuman({ labels: author.labels })
      .then(sameLabelAuthor => {
        const workLabel = randomLabel()
        return Promise.all([
          createWorkWithAuthor(author, workLabel),
          createWorkWithAuthor(sameLabelAuthor, workLabel)
        ])
        .then(Wait(elasticsearchUpdateDelay))
        .then(works => {
          return resolve(basicEntry(workLabel, author.labels.en))
          .then(({ entries }) => entries)
          .then(entries => {
            should(entries[0].works[0].uri).not.be.ok()
            should(entries[0].authors[0].uri).not.be.ok()
            done()
          })
        })
      })
    })
    .catch(done)
  })
})

const basicEntry = (workLabel, authorLabel) => ({
  edition: { isbn: generateIsbn13() },
  works: [ { labels: { en: workLabel } } ],
  authors: [ { labels: { en: authorLabel } } ]
})
