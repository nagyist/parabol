import {GraphQLID, GraphQLNonNull} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import {GROUP} from 'parabol-client/utils/constants'
import isPhaseComplete from 'parabol-client/utils/meetings/isPhaseComplete'
import getKysely from '../../postgres/getKysely'
import {getUserId} from '../../utils/authorization'
import getPhase from '../../utils/getPhase'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import type {GQLContext} from '../graphql'
import SetPhaseFocusPayload from '../types/SetPhaseFocusPayload'

const setPhaseFocus = {
  type: SetPhaseFocusPayload,
  description: 'Focus (or unfocus) a phase item',
  args: {
    meetingId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    focusedPromptId: {
      type: GraphQLID,
      description: 'The currently focused phase item'
    }
  },
  async resolve(
    _source: unknown,
    {meetingId, focusedPromptId}: {meetingId: string; focusedPromptId?: string | null},
    {authToken, dataLoader, socketId: mutatorId}: GQLContext
  ) {
    const operationId = dataLoader.share()
    const subOptions = {operationId, mutatorId}

    // AUTH
    const viewerId = getUserId(authToken)
    const meeting = await dataLoader.get('newMeetings').load(meetingId)
    if (!meeting)
      return standardError(new Error('Meeting not found'), {
        userId: viewerId
      })
    const {endedAt, facilitatorUserId, phases} = meeting
    if (endedAt)
      return standardError(new Error('Meeting already completed'), {
        userId: viewerId
      })
    if (isPhaseComplete(GROUP, phases)) {
      return standardError(new Error('Meeting phase already completed'), {
        userId: viewerId
      })
    }
    if (facilitatorUserId !== viewerId) {
      return standardError(new Error('Not meeting facilitator'), {
        userId: viewerId
      })
    }
    const reflectPhase = getPhase(meeting.phases, 'reflect')
    if (!reflectPhase) {
      return standardError(new Error('Meeting not found'), {
        userId: viewerId
      })
    }

    // RESOLUTION
    // mutative
    reflectPhase.focusedPromptId = focusedPromptId ?? undefined
    await getKysely()
      .updateTable('NewMeeting')
      .set({phases: JSON.stringify(phases)})
      .where('id', '=', meetingId)
      .execute()
    dataLoader.clearAll('newMeetings')
    const data = {meetingId}
    publish(SubscriptionChannel.MEETING, meetingId, 'SetPhaseFocusPayload', data, subOptions)
    return data
  }
}

export default setPhaseFocus
