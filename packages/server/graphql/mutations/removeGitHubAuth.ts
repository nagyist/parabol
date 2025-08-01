import {GraphQLID, GraphQLNonNull} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import removeGitHubAuthDB from '../../postgres/queries/removeGitHubAuth'
import {analytics} from '../../utils/analytics/analytics'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import updateRepoIntegrationsCacheByPerms from '../queries/helpers/updateRepoIntegrationsCacheByPerms'
import RemoveGitHubAuthPayload from '../types/RemoveGitHubAuthPayload'
export default {
  name: 'RemoveGitHubAuth',
  type: new GraphQLNonNull(RemoveGitHubAuthPayload),
  description: 'Disconnect a team member from GitHub',
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
    const [viewer] = await Promise.all([
      dataLoader.get('users').loadNonNull(viewerId),
      removeGitHubAuthDB(viewerId, teamId)
    ])
    updateRepoIntegrationsCacheByPerms(dataLoader, viewerId, teamId, false)

    analytics.integrationRemoved(viewer, teamId, 'github')
    const data = {teamId, userId: viewerId}
    publish(SubscriptionChannel.TEAM, teamId, 'RemoveGitHubAuthPayload', data, subOptions)
    return data
  }
}
