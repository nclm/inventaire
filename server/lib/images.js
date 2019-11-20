

const CONFIG = require('config')
const __ = CONFIG.universalPath
const gm = require('gm')
const { Promise } = __.require('lib', 'promises')
const crypto_ = __.require('lib', 'crypto')
const { readFile } = __.require('lib', 'fs')
const { maxSize } = CONFIG.mediaStorage.images

const shrinkAndFormat = (data, width, height) => // gm accepts either a path string or a stream
  gm(data)
.setFormat('jpg')
// only resize if bigger
.resize(width, height, '>')
// removing EXIF data
.noProfile()
// replace the alpha layer by a white background
.flatten()
// converting to progressive jpeg
.interlace('Line')

const removeExif = data => gm(data)
.noProfile()

module.exports = {
  getHashFilename: path => {
    return readFile(path)
    .then(crypto_.sha1)
  },

  shrinkAndFormat: (path, width = maxSize, height = maxSize) => {
    return new Promise((resolve, reject) => shrinkAndFormat(path, width, height)
    .write(path, returnPath(path, resolve, reject)))
  },

  shrinkAndFormatStream: shrinkAndFormat,

  removeExif: path => {
    return new Promise((resolve, reject) => removeExif(path)
    .write(path, returnPath(path, resolve, reject)))
  },

  applyLimits: (width, height) => [ applyLimit(width), applyLimit(height) ],

  getUrlFromImageHash: (container, filename) => {
    if (filename != null) return `/img/${container}/${filename}`
  }
}

const applyLimit = (dimension = maxSize) => {
  dimension = Number(dimension)
  return dimension > maxSize ? maxSize : dimension
}

const returnPath = (newPath, resolve, reject) => err => {
  if (err) reject(err)
  else resolve(newPath)
}
