import {getUserId} from '../../../utils/authorization'

import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import publish from '../../../utils/publish'

import {MutationResolvers} from '../resolverTypes'
import standardError from '../../../utils/standardError'
import normalizeRawDraftJS from 'parabol-client/validation/normalizeRawDraftJS'
import extractTextFromDraftString from 'parabol-client/utils/draftjs/extractTextFromDraftString'
import getReflectionEntities from '../../mutations/helpers/getReflectionEntities'
import generateUID from '../../../generateUID'
import Reflection from '../../../database/types/Reflection'
import getGroupSmartTitle from 'parabol-client/utils/smartGroup/getGroupSmartTitle'
import ReflectionGroup from '../../../database/types/ReflectionGroup'
import getRethink from '../../../database/rethinkDriver'
import unlockAllStagesForPhase from 'parabol-client/utils/unlockAllStagesForPhase'

const batchCreateReflections: MutationResolvers['batchCreateReflections'] = async (
  _source,
  {reflections},
  {authToken, dataLoader, socketId: mutatorId}
) => {
  const r = await getRethink()
  const viewerId = getUserId(authToken)
  const now = new Date()
  const operationId = dataLoader.share()
  const subOptions = {mutatorId, operationId}

  // VALIDATION
  const meetingIds = [... new Set(reflections?.map(({meetingId}) => meetingId))]
  if (meetingIds.length != 1) {
    return standardError(new Error('Cannot create reflections in multiple meetings'), {userId: viewerId})
  }
  const meetingId = meetingIds[0]
  const meeting = await r.table('NewMeeting').get(meetingId).default(null).run()
  if (!meeting) return standardError(new Error('Meeting not found'), {userId: viewerId})
  const {endedAt, phases, teamId} = meeting

  const reflectionsAdded = [] as Reflection[]
  const reflectonGroupsAdded = [] as ReflectionGroup[]
  const unresolvedPromises = reflections?.map(async ({content, sortOrder, meetingId, promptId}) => {
    const normalizedContent = normalizeRawDraftJS(content)

    // RESOLUTION
    const plaintextContent = extractTextFromDraftString(normalizedContent)
    const entities = await getReflectionEntities(plaintextContent)
    const reflectionGroupId = generateUID()

    const reflection = new Reflection({
      creatorId: viewerId,
      content: normalizedContent,
      plaintextContent,
      entities,
      meetingId,
      promptId,
      reflectionGroupId,
      updatedAt: now
    })
    reflectionsAdded.push(reflection)

    const smartTitle = getGroupSmartTitle([reflection])
    const reflectionGroup = new ReflectionGroup({
      id: reflectionGroupId,
      smartTitle,
      title: smartTitle,
      meetingId,
      promptId,
      sortOrder
    })
    reflectonGroupsAdded.push(reflectionGroup)
  })
  await Promise.all(unresolvedPromises)

  console.log(`There are ${reflectionsAdded.length} reflectionsAdded`)
  console.log(`There are ${reflectonGroupsAdded.length} reflectonGroupsAdded`)

  await r({
    group: r.table('RetroReflectionGroup').insert(reflectonGroupsAdded),
    reflection: r.table('RetroReflection').insert(reflectionsAdded)
  }).run()

  const groupPhase = phases.find((phase) => phase.phaseType === 'group')!
  const {stages} = groupPhase
  const [groupStage] = stages

  let unlockedStageIds
  if (!groupStage?.isNavigableByFacilitator) {
    unlockedStageIds = unlockAllStagesForPhase(phases, 'group', true)
    await r
      .table('NewMeeting')
      .get(meetingId)
      .update({
        phases
      })
      .run()
  }

  // RESOLUTION
  const data = {
    meetingId,
    unlockedStageIds,
    reflectionGroupIds: reflectonGroupsAdded.map(({id}) => id),
    reflectionIds: reflectionsAdded.map(({id}) => id)
  };
  publish(SubscriptionChannel.MEETING, meetingId, 'BatchCreateReflectionsSuccess', data, subOptions)
  return data
}

export default batchCreateReflections
