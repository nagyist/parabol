import MeetingRetrospective from '../../../database/types/MeetingRetrospective'
import Reflection from '../../../database/types/Reflection'
import isValid from '../../isValid'
import {resolveGQLStageFromId, resolveUnlockedStages} from '../../resolvers'
import {BatchCreateReflectionsSuccessResolvers, RetroReflection, RetroReflectionGroup} from '../resolverTypes'

export type BatchCreateReflectionsSuccessSource = {
  meetingId: string
  unlockedStageIds: string[]
  reflectionGroupIds: string[]
  reflectionIds: string[]
}

const BatchCreateReflectionsSuccess: BatchCreateReflectionsSuccessResolvers = {
  meeting: async ({meetingId}, _args, {dataLoader}) => {
    return dataLoader.get('newMeetings').load(meetingId) as Promise<MeetingRetrospective>
  },
  reflectionGroups: async ({reflectionGroupIds}, _args, {dataLoader}) => {
    return dataLoader.get('retroReflectionGroups').loadMany(reflectionGroupIds)
  },
  reflections: async ({reflectionIds}, _args, {dataLoader}) => {
    return dataLoader.get('retroReflections').loadMany(reflectionIds)
  },
  unlockedStages: async ({meetingId, unlockedStageIds}, _args, {dataLoader}) => {
    if (!unlockedStageIds || unlockedStageIds.length === 0 || !meetingId) return undefined
    const meeting = await dataLoader.get('newMeetings').load(meetingId)
    return unlockedStageIds.map((stageId) => resolveGQLStageFromId(stageId, meeting))
  }
}

export default BatchCreateReflectionsSuccess
