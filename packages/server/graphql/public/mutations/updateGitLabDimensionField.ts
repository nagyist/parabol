import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import upsertGitLabDimensionFieldMap from '../../../postgres/queries/upsertGitLabDimensionFieldMap'
import {getUserId} from './../../../utils/authorization'
import {isTeamMember} from '../../../utils/authorization'
import {Logger} from '../../../utils/Logger'
import publish from '../../../utils/publish'
import type {MutationResolvers} from '../resolverTypes'

const updateGitLabDimensionField: MutationResolvers['updateGitLabDimensionField'] = async (
  _source,
  {dimensionName, labelTemplate, meetingId, projectId},
  {authToken, dataLoader, socketId: mutatorId}
) => {
  const operationId = dataLoader.share()
  const subOptions = {mutatorId, operationId}

  // VALIDATION
  const meeting = await dataLoader.get('newMeetings').load(meetingId)
  if (!meeting) {
    return {error: {message: 'Invalid meetingId'}}
  }
  if (meeting.meetingType !== 'poker') {
    return {error: {message: 'Not a poker meeting'}}
  }
  const {teamId, templateRefId} = meeting
  if (!isTeamMember(authToken, teamId)) {
    return {error: {message: 'Not on team'}}
  }
  const templateRef = await dataLoader.get('templateRefs').loadNonNull(templateRefId)
  const {dimensions} = templateRef
  const matchingDimension = dimensions.find((dimension) => dimension.name === dimensionName)
  if (!matchingDimension) {
    return {error: {message: 'Invalid dimension name'}}
  }
  const viewerId = getUserId(authToken)
  const gitlabAuth = await dataLoader.get('freshGitlabAuth').load({teamId, userId: viewerId})
  if (!gitlabAuth?.providerId) return {error: {message: 'Invalid dimension name'}}

  // TODO validate labelTemplate

  // RESOLUTION
  try {
    const {providerId} = gitlabAuth
    await upsertGitLabDimensionFieldMap(teamId, dimensionName, projectId, providerId, labelTemplate)
  } catch (e) {
    Logger.log(e)
  }

  const data = {meetingId, teamId}
  publish(SubscriptionChannel.TEAM, teamId, 'UpdateGitLabDimensionFieldSuccess', data, subOptions)
  return data
}

export default updateGitLabDimensionField
