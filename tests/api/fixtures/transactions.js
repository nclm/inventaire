import 'should'
import { getUser, getUserB, authReq, customAuthReq } from 'tests/api/utils/utils'
import { wait } from 'lib/promises'
import { createItem } from './items'
import { getItem } from '../utils/items'

const createTransaction = async (params = {}) => {
  const userA = await (params.userA || getUser())
  const userB = await (params.userB || getUserB())
  let { item, itemData } = params
  if (!item) {
    itemData = itemData || { visibility: [ 'public' ], transaction: 'giving' }
    item = await createItem(userB, itemData)
  }
  await wait(100)
  const refreshedItem = await getItem(item)
  const res = await customAuthReq(userA, 'post', '/api/transactions?action=request', {
    item: item._id,
    message: 'yo'
  })
  Object.assign(res, { userA, userB, userBItem: refreshedItem })
  return res
}

let someTransactionData
const getSomeTransaction = async () => {
  someTransactionData = someTransactionData || (await createTransaction())
  return someTransactionData
}

export default {
  createTransaction,

  getSomeTransaction,

  addMessage: transaction => {
    return authReq('post', '/api/transactions?action=message', {
      action: 'message',
      transaction: transaction._id,
      message: 'yo'
    })
  }
}
