__ = require('config').universalPath
_ = __.require 'builders', 'utils'
error_ = __.require 'lib', 'error/error'
items_ = __.require 'controllers', 'items/lib/items'
sanitize = __.require 'lib', 'sanitize/sanitize'
bundleOwnersToItems = require './lib/bundle_owners_to_items'
itemsQueryLimit = 100
maxItemsPerOwner = 3
offset = 0

sanitization =
  'assert-image':
    generic: 'boolean'
    default: false
  lang:
    default: 'en'
  limit:
    default: 15

module.exports = (req, res)->
  reqUserId = req.user?._id
  sanitize req, res, sanitization
  .then (params)->
    { assertImage, lang, limit } = params
    items_.publicByDate itemsQueryLimit, offset, assertImage, reqUserId
    .then selectRecentItems(lang, limit)
  .then bundleOwnersToItems.bind(null, res, reqUserId)
  .catch error_.Handler(req, res)

selectRecentItems = (lang, limit)-> (items)->
  recentItems = []
  discardedItems = []
  itemsCountByOwner = {}

  for item in items
    if recentItems.length is limit then return recentItems
    if item.snapshot['entity:lang'] is lang and itemsCountByOwner[item.owner] < 3
      itemsCountByOwner[item.owner] ?= 0
      itemsCountByOwner[item.owner]++
      recentItems.push item
    else
      discardedItems.push item

  missingItemsCount = limit - recentItems.length
  itemsToFill = discardedItems.slice 0, missingItemsCount
  recentItems.push itemsToFill...
  recentItems

itemsOwnerId = (item)-> item.owner
