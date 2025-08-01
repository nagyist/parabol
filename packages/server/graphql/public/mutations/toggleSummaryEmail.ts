import {getUserById} from '../../../postgres/queries/getUsersByIds'
import updateUser from '../../../postgres/queries/updateUser'
import {analytics} from '../../../utils/analytics/analytics'
import {getUserId} from '../../../utils/authorization'
import standardError from '../../../utils/standardError'
import type {MutationResolvers} from '../resolverTypes'

const toggleSummaryEmail: MutationResolvers['toggleSummaryEmail'] = async (
  _source,
  _args,
  {authToken}
) => {
  const viewerId = getUserId(authToken)
  const viewer = await getUserById(viewerId)
  if (!viewer) return standardError(new Error('User not found'), {userId: viewerId})

  // RESOLUTION
  const {sendSummaryEmail} = viewer
  await updateUser({sendSummaryEmail: !sendSummaryEmail}, viewerId)
  analytics.toggleSubToSummaryEmail(viewer, !sendSummaryEmail)

  return true
}

export default toggleSummaryEmail
