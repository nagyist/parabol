import getRethink from '../../../database/rethinkDriver'
import {getUserId, isTeamMember} from '../../../utils/authorization'
import standardError from '../../../utils/standardError'
import {SlackNotifier} from '../../mutations/helpers/notifications/SlackNotifier'
import {MutationResolvers} from '../resolverTypes'

const shareTopic: MutationResolvers['shareTopic'] = async (
  _source,
  {reflectionGroupId, userId},
  {authToken, dataLoader, socketId: mutatorId}
) => {
  const r = await getRethink()
  const operationId = dataLoader.share()
  const subOptions = {mutatorId, operationId}
  const viewerId = getUserId(authToken)
  const now = new Date()

  // AUTH
  const reflectionGroup = await dataLoader.get('retroReflectionGroups').load(reflectionGroupId)
  const {meetingId} = reflectionGroup
  const meeting = await dataLoader.get('newMeetings').load(meetingId)
  const {teamId} = meeting
  if (!isTeamMember(authToken, teamId)) {
    return standardError(new Error('Team not found'), {userId: viewerId})
  }

  // VALIDATION

  // RESOLUTION
  const data = {meetingId}

  SlackNotifier.shareTopic(dataLoader, userId, teamId, meetingId, reflectionGroupId)

  return data
}

export default shareTopic
