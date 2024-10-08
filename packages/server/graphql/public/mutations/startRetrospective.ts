import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import getRethink from '../../../database/rethinkDriver'
import RetroMeetingMember from '../../../database/types/RetroMeetingMember'
import getKysely from '../../../postgres/getKysely'
import updateMeetingTemplateLastUsedAt from '../../../postgres/queries/updateMeetingTemplateLastUsedAt'
import updateTeamByTeamId from '../../../postgres/queries/updateTeamByTeamId'
import {MeetingTypeEnum} from '../../../postgres/types/Meeting'
import {analytics} from '../../../utils/analytics/analytics'
import {getUserId, isTeamMember} from '../../../utils/authorization'
import publish from '../../../utils/publish'
import standardError from '../../../utils/standardError'
import createGcalEvent from '../../mutations/helpers/createGcalEvent'
import {createMeetingSeriesTitle} from '../../mutations/helpers/createMeetingSeriesTitle'
import isStartMeetingLocked from '../../mutations/helpers/isStartMeetingLocked'
import {IntegrationNotifier} from '../../mutations/helpers/notifications/IntegrationNotifier'
import safeCreateRetrospective from '../../mutations/helpers/safeCreateRetrospective'
import {MutationResolvers} from '../resolverTypes'
import {startNewMeetingSeries} from './updateRecurrenceSettings'

const startRetrospective: MutationResolvers['startRetrospective'] = async (
  _source,
  {teamId, name, rrule, gcalInput},
  {authToken, socketId: mutatorId, dataLoader}
) => {
  const r = await getRethink()
  const pg = getKysely()
  const operationId = dataLoader.share()
  const subOptions = {mutatorId, operationId}
  // AUTH
  const viewerId = getUserId(authToken)
  if (!isTeamMember(authToken, teamId)) {
    return standardError(new Error('User not on team'), {userId: viewerId})
  }
  const unpaidError = await isStartMeetingLocked(teamId, dataLoader)
  if (unpaidError) return standardError(new Error(unpaidError), {userId: viewerId})

  // RESOLUTION
  const meetingType: MeetingTypeEnum = 'retrospective'
  const [viewer, meetingSettings, meetingCount] = await Promise.all([
    dataLoader.get('users').loadNonNull(viewerId),
    dataLoader.get('meetingSettingsByType').load({teamId, meetingType}),
    dataLoader.get('meetingCount').load({teamId, meetingType})
  ])

  const {
    id: meetingSettingsId,
    totalVotes,
    maxVotesPerGroup,
    disableAnonymity,
    videoMeetingURL
  } = meetingSettings as typeof meetingSettings & {meetingType: 'retrospective'}
  const selectedTemplateId = meetingSettings.selectedTemplateId || 'workingStuckTemplate'
  const meetingName = !name
    ? `Retro #${meetingCount + 1}`
    : rrule
      ? createMeetingSeriesTitle(name, new Date(), 'UTC')
      : name
  const meetingSeriesName = name || meetingName

  const meeting = await safeCreateRetrospective(
    {
      teamId,
      facilitatorUserId: viewerId,
      totalVotes,
      maxVotesPerGroup,
      disableAnonymity,
      templateId: selectedTemplateId,
      videoMeetingURL: videoMeetingURL ?? undefined,
      name: meetingName
    },
    dataLoader
  )
  const meetingId = meeting.id

  const template = await dataLoader.get('meetingTemplates').load(selectedTemplateId)
  const [newMeetingRes] = await Promise.allSettled([
    pg
      .insertInto('NewMeeting')
      .values({...meeting, phases: JSON.stringify(meeting.phases)})
      .execute(),
    updateMeetingTemplateLastUsedAt(selectedTemplateId, teamId)
  ])
  if (newMeetingRes.status === 'rejected') {
    return {error: {message: 'Meeting already started'}}
  }

  const updates = {
    lastMeetingType: meetingType
  }
  const [meetingSeries] = await Promise.all([
    rrule && startNewMeetingSeries(meeting, rrule, meetingSeriesName),
    r
      .table('MeetingMember')
      .insert(
        new RetroMeetingMember({meetingId, userId: viewerId, teamId, votesRemaining: totalVotes})
      )
      .run(),
    updateTeamByTeamId(updates, teamId),
    videoMeetingURL &&
      pg
        .updateTable('MeetingSettings')
        .set({videoMeetingURL: null})
        .where('id', '=', meetingSettingsId)
        .execute()
  ])
  if (meetingSeries) {
    // meeting was modified if a new meeting series was created
    dataLoader.get('newMeetings').clear(meetingId)
    dataLoader.get('activeMeetingsByTeamId').clear(teamId)
    analytics.recurrenceStarted(viewer, meetingSeries)
  }
  IntegrationNotifier.startMeeting(dataLoader, meetingId, teamId)
  analytics.meetingStarted(viewer, meeting, template)
  const {error, gcalSeriesId} = await createGcalEvent({
    name: meetingSeriesName,
    gcalInput,
    meetingId,
    teamId,
    viewerId,
    rrule,
    dataLoader
  })
  if (meetingSeries && gcalSeriesId) {
    await pg
      .updateTable('MeetingSeries')
      .set({gcalSeriesId})
      .where('id', '=', meetingSeries.id)
      .execute()
  }
  const data = {teamId, meetingId, hasGcalError: !!error?.message}
  publish(SubscriptionChannel.TEAM, teamId, 'StartRetrospectiveSuccess', data, subOptions)
  return data
}

export default startRetrospective
