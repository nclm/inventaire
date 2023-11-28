import 'should'
import { map, uniq } from 'lodash-es'
import { publicReq } from '#tests/api/utils/utils'
import { createItem, createItemWithEditionAndWork } from '../fixtures/items.js'

describe('items:get-by-entities', () => {
  it('should get an item by its entity uri', async () => {
    const item = await createItem(null, { visibility: [ 'public' ] })
    const res = await publicReq('get', `/api/items?action=by-entities&uris=${item.entity}`)
    res.items[0].entity.should.equal(item.entity)
  })

  it('should get items by entities uris', async () => {
    const items = await Promise.all([
      createItemWithEditionAndWork(),
      createItemWithEditionAndWork(),
    ])
    const uris = uniq(map(items, 'entity'))
    const res = await publicReq('get', `/api/items?action=by-entities&uris=${uris.join('|')}`)
    const resUserIds = uniq(map(res.items, 'entity'))
    resUserIds.should.containDeep(uris)
  })
})
