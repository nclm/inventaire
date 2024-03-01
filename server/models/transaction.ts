import { isString, pick } from 'lodash-es'
import { newError } from '#lib/error/error'
import itemAttributes from './attributes/item.js'
import transactionAttributes from './attributes/transaction.js'
import userAttributes from './attributes/user.js'
import transactionValidations from './validations/transaction.js'

const { states, basicNextActions, nextActionsWithReturn } = transactionAttributes
const { snapshot: snapshotUserAttributes } = userAttributes
const { snapshot: snapshotItemAttributes } = itemAttributes

export function createTransactionDoc (itemDoc, ownerDoc, requesterDoc) {
  const itemId = itemDoc._id
  const ownerId = ownerDoc._id
  const requesterId = requesterDoc._id

  transactionValidations.pass('itemId', itemId)
  transactionValidations.pass('userId', ownerId)
  transactionValidations.pass('userId', requesterId)

  if (!requestable.includes(itemDoc.transaction)) {
    throw newError("this item can't be requested", 400, itemDoc)
  }

  const now = Date.now()

  return {
    item: itemId,
    owner: ownerId,
    requester: requesterId,
    transaction: itemDoc.transaction,
    state: 'requested',
    created: now,
    actions: [ { action: 'requested', timestamp: now } ],
    read: {
      requester: true,
      owner: false,
    },
    // keeping a copy of basic data to provide for when those
    // will not be accessible anymore
    // ex: item visibility change, deleted user, etc.
    snapshot: snapshotData(itemDoc, ownerDoc, requesterDoc),
  }
}

const requestable = [
  'giving',
  'lending',
  'selling',
]

export function validateTransactionPossibleState (transaction, newState) {
  if (!states[transaction.state].next.includes(newState)) {
    throw newError('invalid state update', 400, transaction, newState)
  }

  if ((newState === 'returned') && (transaction.transaction !== 'lending')) {
    throw newError('transaction and state mismatch', 400, transaction, newState)
  }
}

// do the item change of owner or return to its previous owner
export function transactionIsOneWay (transacDoc) {
  if (!isString(transacDoc.transaction)) {
    throw newError('transaction transaction inaccessible', 500, transacDoc)
  }
  return oneWay[transacDoc.transaction]
}

const oneWay = {
  giving: true,
  lending: false,
  selling: true,
}

export function transactionIsActive (transacDoc) {
  const transacData = {
    name: transacDoc.transaction,
    state: transacDoc.state,
    // owner doesnt matter to find if the transaction is active
    // thus we just pass an arbitrary boolean
    mainUserIsOwner: true,
  }
  // if there are next actions, the transaction is active
  return (findNextActions(transacData) != null)
}

const snapshotData = (itemDoc, ownerDoc, requesterDoc) => ({
  item: pick(itemDoc, snapshotItemAttributes),
  entity: getEntitySnapshotFromItemSnapshot(itemDoc.snapshot),
  owner: pick(ownerDoc, snapshotUserAttributes),
  requester: pick(requesterDoc, snapshotUserAttributes),
})

const getEntitySnapshotFromItemSnapshot = itemSnapshot => {
  const entitySnapshot = {}
  if (itemSnapshot['entity:title'] != null) { entitySnapshot.title = itemSnapshot['entity:title'] }
  if (itemSnapshot['entity:image'] != null) { entitySnapshot.image = itemSnapshot['entity:image'] }
  if (itemSnapshot['entity:authors'] != null) { entitySnapshot.authors = itemSnapshot['entity:authors'] }
  return entitySnapshot
}

const getNextActionsList = transactionName => {
  if (transactionName === 'lending') {
    return nextActionsWithReturn
  } else {
    return basicNextActions
  }
}

const findNextActions = transacData => {
  const { name, state, mainUserIsOwner } = transacData
  const nextActions = getNextActionsList(name, state)
  const role = mainUserIsOwner ? 'owner' : 'requester'
  return nextActions[state][role]
}