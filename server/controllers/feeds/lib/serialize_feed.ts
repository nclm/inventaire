import CONFIG from 'config'
import { isArray, keyBy } from 'lodash-es'
import Rss from 'rss'
import { isNonEmptyString } from '#lib/boolean_validations'
import templateHelpers from '#lib/emails/handlebars_helpers'
import getItemDescription from './get_item_description.js'

const root = CONFIG.getPublicOrigin()
const { feed: feedConfig } = CONFIG
const oneDayInMinutes = 24 * 60

export default (feedOptions, users, items, lang) => {
  const { title, description, queryString, pathname } = feedOptions
  let { image } = feedOptions

  if (image) {
    image = templateHelpers.imgSrc(image, 300)
  } else {
    image = feedConfig.image
  }

  const feed = new Rss({
    title,
    // Arbitrary limiting the description to 300 characters as it should stay short
    description: description && description.slice(0, 300),
    feed_url: `${root}/api/feeds?${queryString}`,
    site_url: `${root}/${pathname}`,
    image_url: image,
    // Not always respected, we probably need to cache generated feeds anyway
    // source: http://www.therssweblog.com/?guid=20070529130637
    ttl: oneDayInMinutes,
  })

  const usersIndex = keyBy(users, '_id')

  items.map(serializeItem(usersIndex, lang))
  .forEach(feed.item.bind(feed))

  return feed.xml()
}

const serializeItem = (usersIndex, lang) => item => {
  const { owner } = item
  const user = usersIndex[owner]
  user.href = `${root}/users/${user._id}`
  item.href = `${root}/items/${item._id}`

  const data = {
    title: getItemTitle(item, user, lang),
    description: getItemDescription(item, user, lang),
    author: user.username,
    guid: item._id,
    url: item.href,
    date: item.created,
  }

  if (isArray(user.position)) {
    const [ lat, long ] = user.position
    data.lat = lat
    data.long = long
  }

  return data
}

const getItemTitle = (item, user, lang) => {
  const { transaction, snapshot } = item
  let title = snapshot['entity:title']
  const authors = snapshot['entity:authors']
  if (isNonEmptyString(authors)) { title += ` - ${authors}` }

  const i18nKey = `${transaction}_personalized`
  const transactionLabel = templateHelpers.i18n(lang, i18nKey, user)
  title += ` [${transactionLabel}]`

  return title
}