__ = require('config').universalPath
_ = __.require 'builders', 'utils'
user_ = __.require 'controllers', 'user/lib/user'
promises_ = __.require 'lib', 'promises'
error_ = __.require 'lib', 'error/error'

filters =
  # Prevent showing private items in group context to avoid giving the false
  # impresssion that those are visible by other members of the group
  group: (item)-> item.listing isnt 'private'

validFilters = Object.keys filters

module.exports =
  validFilters: validFilters

  addUsersData: (reqUserId, includeUsers)-> (page)->
    if includeUsers is false then return page

    { items } = page
    if items.length is 0
      page.users = []
      return page

    ownersIds = _.uniq items.map(_.property('owner'))

    user_.getUsersByIds reqUserId, ownersIds
    .then (users)->
      page.users = users
      return page

  ownerIs: (userId)-> (item)-> item.owner is userId

  listingIs: (listing)-> (item)-> item.listing is listing

  Paginate: (page)-> (items)->
    { limit, offset, filter } = page
    items = items.sort byCreationDate
    if filter? then items = items.filter filters[filter]
    total = items.length
    offset ?= 0
    last = offset + limit
    if limit?
      items = items.slice offset, last
      data = { items, total, offset, filter }
      if last < total then data.continue = last
      return data
    else
      return { items, total, offset, filter }

byCreationDate = (a, b)-> b.created - a.created
