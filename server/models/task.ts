import { round } from 'lodash-es'
import { assert_ } from '#lib/utils/assert_types'
import taskValidations from './validations/task.js'

export function createTaskDoc (newTask) {
  assert_.object(newTask)
  const { type, entitiesType, suspectUri, suggestionUri, externalSourcesOccurrences, reporter, clue } = newTask
  let { lexicalScore } = newTask

  taskValidations.pass('type', type)
  taskValidations.pass('suspectUri', suspectUri)

  const task = {
    type,
    suspectUri,
    suggestionUri,
    created: Date.now(),
  }

  if (lexicalScore) lexicalScore = round(lexicalScore, 2)

  validateAndAssign(task, 'entitiesType', entitiesType)
  validateAndAssign(task, 'lexicalScore', lexicalScore)
  validateAndAssign(task, 'externalSourcesOccurrences', externalSourcesOccurrences)
  validateAndAssign(task, 'reporter', reporter)
  validateAndAssign(task, 'clue', clue)
  return task
}

export function updateTaskDoc (task, attribute, value) {
  assert_.object(task)
  assert_.string(attribute)
  // Accept an undefined state value as that's the default state
  if (value || attribute !== 'state') assert_.type('string|number', value)

  taskValidations.pass('attribute', attribute)
  taskValidations.pass(attribute, value)

  const now = Date.now()

  task[attribute] = value
  task.updated = now
  return task
}

function validateAndAssign (task, name, attribute) {
  if (attribute) {
    taskValidations.pass(name, attribute)
    task[name] = attribute
  }
}
