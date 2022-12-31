import restoreVersion from './lib/restore_version'

const sanitization = {
  patch: {}
}

const controller = async ({ patchId, reqUserId }) => {
  await restoreVersion(patchId, reqUserId)
  return { ok: true }
}

export default { sanitization, controller }
