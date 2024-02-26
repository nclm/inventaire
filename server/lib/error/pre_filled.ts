// Pre-formatted error handlers to make error responses consistent
import { pick } from 'lodash-es'
import { newError } from '#lib/error/error'
import { errorHandler } from '#lib/error/error_handler'
import { typeOf } from '../utils/types.js'

// A standardized way to return a 400 missing parameter
// either in the request query or body
export function newMissingError (place: string, parameter: string) {
  // Allow to pass several possible parameters separated by pipes
  // Ex: 'user|username'
  parameter = parameter.split('|').join(' or ')
  const message = `missing parameter in ${place}: ${parameter}`
  const err = newError(message, 400)
  err.attachReqContext = place
  err.error_type = 'missing_parameter'
  err.error_name = `missing_${parameter}`
  return err
}

// A standardized way to return a 400 invalid parameter
export function newInvalidError (parameter: string, value: unknown) {
  const type = typeOf(value)
  const context = { parameter, value, type }
  const valueStr = typeof value === 'object' ? JSON.stringify(value) : value
  const err = newError(`invalid ${parameter}: ${valueStr}`, 400, context)
  err.error_type = 'invalid_parameter'
  err.error_name = `invalid_${parameter}`
  return err
}

export const newMissingQueryError = newMissingError.bind(null, 'query')
export const newMissingBodyError = newMissingError.bind(null, 'body')

const Bundle = newFn => (req, res, ...args) => {
  // First create the new error
  const err = newFn(...args)
  // then make the handler deal with the res object
  return errorHandler(req, res, err)
}

export const bundleError = Bundle(newError)
export const bundleMissingQueryError = Bundle(newMissingQueryError)
export const bundleMissingBodyError = Bundle(newMissingBodyError)
export const bundleInvalidError = Bundle(newInvalidError)

export function bundleUnauthorizedApiAccess (req, res, context) {
  const statusCode = req.user ? 403 : 401
  return bundleError(req, res, 'unauthorized api access', statusCode, context)
}

// A standardized way to return a 400 unknown action
export function bundleUnknownAction (req, res, context?) {
  if (context == null) {
    context = pick(req, [ 'method', 'query', 'body' ])
    context.url = req.originalUrl
  }
  return bundleError(req, res, 'unknown action', 400, context)
}
