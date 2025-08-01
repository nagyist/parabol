import {GraphQLID, GraphQLNonNull} from 'graphql'
import getKysely from '../../postgres/getKysely'
import {getUserId} from '../../utils/authorization'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import DismissSuggestedActionPayload from '../types/DismissSuggestedActionPayload'

export default {
  type: new GraphQLNonNull(DismissSuggestedActionPayload),
  description: `Dismiss a suggested action`,
  args: {
    suggestedActionId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The id of the suggested action to dismiss'
    }
  },
  resolve: async (
    _source: unknown,
    {suggestedActionId}: {suggestedActionId: string},
    {authToken, dataLoader}: GQLContext
  ) => {
    const now = new Date()
    const viewerId = getUserId(authToken)

    // AUTH
    const suggestedAction = await dataLoader.get('suggestedActions').load(suggestedActionId)
    if (!suggestedAction) {
      return standardError(new Error('Suggested action not found'), {
        userId: viewerId
      })
    }
    const {userId} = suggestedAction
    if (userId !== viewerId) {
      return standardError(new Error('Not authenticated'), {
        userId: viewerId
      })
    }

    // RESOLUTION
    await getKysely()
      .updateTable('SuggestedAction')
      .set({removedAt: now})
      .where('id', '=', suggestedActionId)
      .execute()

    // no need to publish since that'll only affect their other open tabs
    return {
      userId,
      removedSuggestedActionId: suggestedActionId
    }
  }
}
