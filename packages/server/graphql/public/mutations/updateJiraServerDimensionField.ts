import {SprintPokerDefaults, SubscriptionChannel} from 'parabol-client/types/constEnums'
import JiraServerRestManager from '../../../integrations/jiraServer/JiraServerRestManager'
import type {IntegrationProviderJiraServer} from '../../../postgres/queries/getIntegrationProvidersByIds'
import upsertJiraServerDimensionFieldMap from '../../../postgres/queries/upsertJiraServerDimensionFieldMap'
import {getUserId, isTeamMember} from '../../../utils/authorization'
import publish from '../../../utils/publish'
import type {MutationResolvers} from '../resolverTypes'

const updateJiraServerDimensionField: MutationResolvers['updateJiraServerDimensionField'] = async (
  _source,
  {dimensionName, issueType, fieldName, projectId, meetingId},
  {authToken, dataLoader, socketId: mutatorId}
) => {
  const operationId = dataLoader.share()
  const viewerId = getUserId(authToken)
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

  // RESOLUTION
  const data = {teamId, meetingId}

  const auth = await dataLoader
    .get('teamMemberIntegrationAuthsByServiceTeamAndUserId')
    .load({service: 'jiraServer', teamId, userId: viewerId})
  if (!auth) {
    return {error: {message: 'Not authenticated with JiraServer'}}
  }

  const existingDimensionField = await dataLoader.get('jiraServerDimensionFieldMap').load({
    providerId: auth.providerId,
    projectId,
    issueType: issueType,
    teamId,
    dimensionName
  })
  if (existingDimensionField?.fieldName === fieldName) return data

  let fieldId: string
  let fieldType: string
  if (
    fieldName === SprintPokerDefaults.SERVICE_FIELD_NULL ||
    fieldName === SprintPokerDefaults.SERVICE_FIELD_COMMENT
  ) {
    fieldId = fieldName
    fieldType = 'string'
  } else {
    const provider = await dataLoader.get('integrationProviders').loadNonNull(auth.providerId)
    const manager = new JiraServerRestManager(auth, provider as IntegrationProviderJiraServer)
    const fieldTypes = await manager.getFieldTypes(projectId, issueType)
    if (fieldTypes instanceof Error) {
      return {error: fieldTypes}
    }
    const jiraFieldType = fieldTypes.find((fieldType) => fieldType.name === fieldName)
    if (!jiraFieldType) {
      return {error: {message: 'Unknown field'}}
    }
    fieldId = jiraFieldType.fieldId
    fieldType = jiraFieldType.schema.type
  }

  const newField = {
    providerId: auth.providerId,
    teamId,
    projectId,
    issueType: issueType,
    dimensionName,
    fieldId,
    fieldName,
    fieldType
  }

  // udpate dataloader object
  if (existingDimensionField) {
    Object.assign(existingDimensionField, newField)
  }
  await upsertJiraServerDimensionFieldMap(newField)

  publish(SubscriptionChannel.TEAM, teamId, 'UpdateDimensionFieldSuccess', data, subOptions)
  return data
}

export default updateJiraServerDimensionField
