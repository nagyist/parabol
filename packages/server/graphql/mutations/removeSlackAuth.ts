import {GraphQLID, GraphQLNonNull} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import {analytics} from '../../utils/analytics/analytics'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import RemoveSlackAuthPayload from '../types/RemoveSlackAuthPayload'
import removeSlackAuths from './helpers/removeSlackAuths'

export default {
  name: 'RemoveSlackAuth',
  type: new GraphQLNonNull(RemoveSlackAuthPayload),
  description: 'Disconnect a team member from Slack',
  args: {
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'the teamId to disconnect from the token'
    }
  },
  resolve: async (
    _source: unknown,
    {teamId}: {teamId: string},
    {authToken, socketId: mutatorId, dataLoader}: GQLContext
  ) => {
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}
    const viewerId = getUserId(authToken)

    // AUTH
    if (!isTeamMember(authToken, teamId)) {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }

    // RESOLUTION
    const [res, viewer] = await Promise.all([
      removeSlackAuths(viewerId, teamId, true),
      dataLoader.get('users').loadNonNull(viewerId)
    ])
    if (!res.authIds) {
      return {error: {message: res.error}}
    }
    const authId = res.authIds[0]

    analytics.integrationRemoved(viewer, teamId, 'slack')
    const data = {authId, teamId, userId: viewerId}
    publish(SubscriptionChannel.TEAM, teamId, 'RemoveSlackAuthPayload', data, subOptions)
    return data
  }
}
