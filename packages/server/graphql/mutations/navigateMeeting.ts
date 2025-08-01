import {GraphQLID, GraphQLNonNull} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import findStageById from 'parabol-client/utils/meetings/findStageById'
import startStage_ from 'parabol-client/utils/startStage_'
import unlockNextStages from 'parabol-client/utils/unlockNextStages'
import getKysely from '../../postgres/getKysely'
import {getUserId} from '../../utils/authorization'
import {Logger} from '../../utils/Logger'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import NavigateMeetingPayload from '../types/NavigateMeetingPayload'
import handleCompletedStage from './helpers/handleCompletedStage'
import removeScheduledJobs from './helpers/removeScheduledJobs'

export default {
  type: new GraphQLNonNull(NavigateMeetingPayload),
  description: 'update a meeting by marking an item complete and setting the facilitator location',
  args: {
    completedStageId: {
      type: GraphQLID,
      description: 'The stage that the facilitator would like to mark as complete'
    },
    facilitatorStageId: {
      type: GraphQLID,
      description: 'The stage where the facilitator is'
    },
    meetingId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The meeting ID'
    }
  },
  async resolve(
    _source: unknown,
    {
      completedStageId,
      facilitatorStageId,
      meetingId
    }: {
      completedStageId: string | null
      facilitatorStageId: string | null
      meetingId: string
    },
    {authToken, socketId: mutatorId, dataLoader}: GQLContext
  ) {
    const now = new Date()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}

    // AUTH
    const viewerId = getUserId(authToken)
    const meeting = await dataLoader.get('newMeetings').load(meetingId)
    if (!meeting)
      return standardError(new Error('Meeting not found'), {
        userId: viewerId
      })
    const {createdBy, endedAt, facilitatorUserId, phases, teamId, meetingType} = meeting
    if (endedAt) {
      return {error: {message: 'Meeting already ended'}}
    }
    if (viewerId !== facilitatorUserId) {
      if (viewerId !== createdBy) {
        return standardError(new Error('Not meeting facilitator'), {
          userId: viewerId
        })
      }
      return standardError(new Error('Not meeting facilitator anymore'), {
        userId: viewerId
      })
    }

    // VALIDATION
    let phaseCompleteData
    let unlockedStageIds
    if (completedStageId) {
      const completedStageRes = findStageById(phases, completedStageId)
      if (!completedStageRes) {
        return standardError(new Error('Meeting stage not found'), {
          userId: viewerId
        })
      }
      const {stage} = completedStageRes
      if (!stage.isNavigableByFacilitator) {
        return standardError(new Error('Stage has not started'), {
          userId: viewerId
        })
      }
      if (!stage.isComplete) {
        // MUTATIVE
        stage.isComplete = true
        stage.endAt = now
        if (meetingType !== 'poker') {
          stage.readyToAdvance = stage.readyToAdvance || []
          if (!stage.readyToAdvance.includes(facilitatorUserId)) {
            stage.readyToAdvance.push(facilitatorUserId)
          }
        }
        // handle any side effects, this could mutate the meeting object!
        phaseCompleteData = await handleCompletedStage(stage, meeting, dataLoader)
        if (stage.scheduledEndTime) {
          // not critical, no await needed
          removeScheduledJobs(stage.scheduledEndTime, {meetingId}).catch(Logger.error)
          stage.scheduledEndTime = null
        }
      }
    }
    if (facilitatorStageId) {
      const facilitatorStageRes = findStageById(phases, facilitatorStageId)
      if (!facilitatorStageRes) {
        return standardError(new Error('Stage not found'), {
          userId: viewerId
        })
      }
      const {stage: facilitatorStage} = facilitatorStageRes
      if (!facilitatorStage.isNavigableByFacilitator) {
        return standardError(new Error('Stage has not started'), {
          userId: viewerId
        })
      }
      if (meeting.facilitatorStageId === facilitatorStageId) {
        return standardError(new Error('Already at this stage'), {
          userId: viewerId
        })
      }
      // mutative
      // NOTE: it is possible to start a stage then move backwards & complete another phase, which would make it seem like this phase took a long time
      // the cleanest way to fix this is to store start/stop on each stage visit, since i could visit B, then visit A, then move B before A, then visit B
      startStage_(facilitatorStage)

      // mutative! sets isNavigable and isNavigableByFacilitator
      unlockedStageIds = unlockNextStages(facilitatorStageId, phases)
    }

    // RESOLUTION
    await getKysely()
      .updateTable('NewMeeting')
      .set({
        facilitatorStageId: facilitatorStageId ?? undefined,
        phases: JSON.stringify(phases)
      })
      .where('id', '=', meetingId)
      .execute()
    dataLoader.clearAll('newMeetings')

    const data = {
      meetingId,
      oldFacilitatorStageId: meeting.facilitatorStageId,
      facilitatorStageId,
      unlockedStageIds,
      ...phaseCompleteData
    }
    publish(SubscriptionChannel.TEAM, teamId, 'NavigateMeetingPayload', data, subOptions)
    return data
  }
}
