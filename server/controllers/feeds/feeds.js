import error_ from 'lib/error/error'
import headers_ from 'lib/headers'
import getAuthentifiedUser from './lib/get_authentified_user'
import userFeedData from './lib/user_feed_data'
import groupFeedData from './lib/group_feed_data'
import shelfFeedData from './lib/shelf_feed_data'
import generateFeedFromFeedData from './lib/generate_feed_from_feed_data'
import { ControllerWrapper } from 'lib/controller_wrapper'

const sanitization = {
  user: {
    optional: true
  },
  group: {
    optional: true
  },
  shelf: {
    optional: true
  },
  requester: {
    optional: true
  },
  token: {
    optional: true
  },
  lang: {
    optional: true,
    // Set the defaults manually after having checked req.headers
    default: null
  }
}

const controller = async (params, req, res) => {
  const headersLang = headers_.getLang(req.headers)
  const xml = await getFeed(headersLang, params)
  res.header('content-type', 'application/rss+xml')
  res.send(xml)
}

const getFeed = async (headersLang, params) => {
  const { userId, groupId, shelfId, requesterId, token } = params
  // Guess the lang from the query string or from the request headers
  // that might be passed by the feeds aggregator
  const lang = params.lang || headersLang || 'en'

  if (requesterId) {
    if (token == null) throw error_.newMissingQuery('token')
  } else {
    if (token != null) throw error_.newMissingQuery('requester')
  }

  // The reason to have this authentifying token system on a public endpoint
  // is that relying on the general 'restrictApiAccess' middleware
  // would have implyied creating a general token authentification strategy,
  // but with a lower authorization level (only read operations), and for
  // a limitied amount of allowlisted routes.
  // It is way easier to simply have this ad-hoc token authentification strategy
  // that we know opens only the limited rights we wish it to open.
  const authentifiedUser = await getAuthentifiedUser(requesterId, token)
  const reqUserId = authentifiedUser ? authentifiedUser._id : null

  return getFeedData({ userId, groupId, shelfId, reqUserId })
  .then(generateFeedFromFeedData(lang))
}

const getFeedData = ({ userId, groupId, shelfId, reqUserId }) => {
  if (userId) return userFeedData(userId, reqUserId)
  else if (groupId) return groupFeedData(groupId, reqUserId)
  else if (shelfId) return shelfFeedData(shelfId, reqUserId)
  else throw error_.newMissingQuery('user|group|shelf', 400)
}

export default {
  get: ControllerWrapper({
    access: 'public',
    sanitization,
    controller,
  })
}
