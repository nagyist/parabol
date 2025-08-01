import {selectSlackAuths} from '../../../postgres/select'
import SlackServerManager from '../../../utils/SlackServerManager'
import standardError from '../../../utils/standardError'
import type {MutationResolvers} from '../resolverTypes'

interface MessageSlackUserError {
  userId: string
  error: string
}

const messageAllSlackUsers: MutationResolvers['messageAllSlackUsers'] = async (
  _source,
  {message}
) => {
  // RESOLUTION
  const allSlackAuths = await selectSlackAuths().where('isActive', '=', true).execute()
  if (!allSlackAuths.length) {
    return standardError(new Error('No authorised Slack users'))
  }

  const messagedUserIds = new Set<string>()
  const messagedTeamChannelIds = new Set<string>()
  const errors = [] as MessageSlackUserError[]
  for (const slackAuth of allSlackAuths) {
    const {botAccessToken, defaultTeamChannelId, userId} = slackAuth
    if (!botAccessToken) {
      errors.push({
        userId,
        error: 'No bot access token'
      })
      continue
    }
    const manager = new SlackServerManager(botAccessToken)
    if (!messagedTeamChannelIds.has(defaultTeamChannelId)) {
      const postMessageRes = await manager.postMessage(defaultTeamChannelId, message)
      messagedTeamChannelIds.add(defaultTeamChannelId)
      if (!postMessageRes.ok) {
        errors.push({
          userId,
          error: postMessageRes.error
        })
      } else {
        messagedUserIds.add(userId)
      }
    }
  }

  const data = {messagedUserIds: [...messagedUserIds], errors}
  return data
}

export default messageAllSlackUsers
