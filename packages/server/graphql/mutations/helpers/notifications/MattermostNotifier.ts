import formatTime from 'parabol-client/utils/date/formatTime'
import formatWeekday from 'parabol-client/utils/date/formatWeekday'
import makeAppURL from 'parabol-client/utils/makeAppURL'
import findStageById from 'parabol-client/utils/meetings/findStageById'
import {phaseLabelLookup} from 'parabol-client/utils/meetings/lookups'
import appOrigin from '../../../../appOrigin'
import {IntegrationProviderMattermost} from '../../../../postgres/queries/getIntegrationProvidersByIds'
import {SlackNotification, Team, TeamMemberIntegrationAuth} from '../../../../postgres/types'
import IUser from '../../../../postgres/types/IUser'
import {AnyMeeting, MeetingTypeEnum} from '../../../../postgres/types/Meeting'
import MattermostServerManager from '../../../../utils/MattermostServerManager'
import {analytics} from '../../../../utils/analytics/analytics'
import {toEpochSeconds} from '../../../../utils/epochTime'
import sendToSentry from '../../../../utils/sendToSentry'
import {DataLoaderWorker} from '../../../graphql'
import {NotificationIntegrationHelper} from './NotificationIntegrationHelper'
import {createNotifier} from './Notifier'
import getSummaryText from './getSummaryText'
import {
  Field,
  makeFieldsAttachment,
  makeHackedButtonPairFields,
  makeHackedFieldButtonValue
} from './makeMattermostAttachments'

const notifyMattermost = async (
  event: SlackNotification['event'],
  channel: {webhookUrl: string | null; serverBaseUrl: string | null; sharedSecret: string | null},
  user: IUser,
  teamId: string,
  textOrAttachmentsArray: string | unknown[],
  notificationText?: string
) => {
  const {webhookUrl, serverBaseUrl, sharedSecret} = channel
  const notifyUrl = serverBaseUrl
    ? `${serverBaseUrl}/plugins/co.parabol.action/notify/${teamId}`
    : webhookUrl
  if (!notifyUrl) {
    return 'success'
  }
  const manager = new MattermostServerManager(notifyUrl, sharedSecret ?? undefined)
  const result = await manager.postMessage(textOrAttachmentsArray, notificationText)
  if (result instanceof Error) {
    sendToSentry(result, {userId: user.id, tags: {teamId, event, notifyUrl}})
    return {
      error: result
    }
  }
  analytics.mattermostNotificationSent(user, teamId, event)

  return 'success'
}

const makeEndMeetingButtons = (meeting: AnyMeeting) => {
  const {id: meetingId} = meeting
  const searchParams = {
    utm_source: 'mattermost summary',
    utm_medium: 'product',
    utm_campaign: 'after-meeting'
  }
  const options = {searchParams}
  const summaryUrl = makeAppURL(appOrigin, `new-summary/${meetingId}`, options)
  const makeDiscussionButton = (meetingUrl: string) => ({
    label: 'See discussion',
    link: meetingUrl
  })
  const summaryButton = {
    label: 'Review summary',
    link: summaryUrl
  }
  switch (meeting.meetingType) {
    case 'retrospective':
      const retroUrl = makeAppURL(appOrigin, `meet/${meetingId}/discuss/1`)
      return makeHackedButtonPairFields(makeDiscussionButton(retroUrl), summaryButton)
    case 'action':
      const checkInUrl = makeAppURL(appOrigin, `meet/${meetingId}/checkin/1`)
      return makeHackedButtonPairFields(makeDiscussionButton(checkInUrl), summaryButton)
    case 'poker':
      const pokerUrl = makeAppURL(appOrigin, `meet/${meetingId}/estimate/1`)
      const estimateButton = {
        label: 'See estimates',
        link: pokerUrl
      }
      return makeHackedButtonPairFields(estimateButton, summaryButton)
    case 'teamPrompt':
      const teamPromptUrl = makeAppURL(appOrigin, `meet/${meetingId}/responses`)
      const responseButton = {
        label: 'See responses',
        link: teamPromptUrl
      }
      return makeHackedButtonPairFields(responseButton, summaryButton)
    default:
      throw new Error('Invalid meeting type')
  }
}

type MattermostNotificationAuth = {
  userId: string
  teamId: string
  channel: string | null
  webhookUrl: string | null
  serverBaseUrl: string | null
  sharedSecret: string | null
}

const makeTeamPromptStartMeetingNotification = (
  team: Team,
  meeting: AnyMeeting,
  meetingUrl: string
) => {
  return [
    makeFieldsAttachment(
      [
        {
          short: true,
          title: 'Team',
          value: team.name
        },
        {
          short: false,
          value: makeHackedFieldButtonValue({label: 'Submit Response', link: meetingUrl})
        }
      ],
      {
        fallback: `Standup started, submit response: ${meetingUrl}`,
        title: `${meeting.name} is open 💬 `,
        title_link: meetingUrl
      }
    )
  ]
}

const makeGenericStartMeetingNotification = (
  team: Team,
  meeting: AnyMeeting,
  meetingUrl: string
) => {
  return [
    makeFieldsAttachment(
      [
        {
          short: true,
          title: 'Team',
          value: team.name
        },
        {
          short: true,
          title: 'Meeting',
          value: meeting.name
        },
        {
          short: false,
          value: makeHackedFieldButtonValue({label: 'Join meeting', link: meetingUrl})
        }
      ],
      {
        fallback: `Meeting started, join: ${meetingUrl}`,
        title: 'Meeting started 👋',
        title_link: meetingUrl
      }
    )
  ]
}

const makeStartMeetingNotificationLookup: Record<
  MeetingTypeEnum,
  (team: Team, meeting: AnyMeeting, meetingUrl: string) => ReturnType<typeof makeFieldsAttachment>[]
> = {
  teamPrompt: makeTeamPromptStartMeetingNotification,
  action: makeGenericStartMeetingNotification,
  retrospective: makeGenericStartMeetingNotification,
  poker: makeGenericStartMeetingNotification
}

const MattermostNotificationHelper: NotificationIntegrationHelper<MattermostNotificationAuth> = (
  notificationChannel
) => ({
  async startMeeting(meeting, team, user) {
    const searchParams = {
      utm_source: 'mattermost meeting start',
      utm_medium: 'product',
      utm_campaign: 'invitations'
    }
    const options = {searchParams}
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`, options)
    const notification = makeStartMeetingNotificationLookup[meeting.meetingType]!(
      team,
      meeting,
      meetingUrl
    )

    return notifyMattermost('meetingStart', notificationChannel, user, team.id, notification)
  },

  async endMeeting(meeting, team, user) {
    const {summary} = meeting

    const summaryText = await getSummaryText(meeting)
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)
    const fields: Field[] = [
      {
        short: true,
        title: 'Team',
        value: team.name
      },
      {
        short: true,
        title: 'Meeting',
        value: meeting.name
      },
      {
        short: false,
        title: 'Stats',
        value: summaryText
      }
    ]
    if (summary) {
      fields.push({
        short: false,
        title: 'AI Summary 🤖',
        value: summary
      })
    }
    fields.push(...makeEndMeetingButtons(meeting))
    const attachments = [
      makeFieldsAttachment(fields, {
        fallback: `Meeting completed, join: ${meetingUrl}`,
        title: 'Meeting completed 🎉',
        title_link: meetingUrl
      })
    ]
    return notifyMattermost('meetingEnd', notificationChannel, user, team.id, attachments)
  },

  async startTimeLimit(scheduledEndTime, meeting, team, user) {
    const {name: meetingName, phases, facilitatorStageId} = meeting

    const {name: teamName} = team
    const stageRes = findStageById(phases, facilitatorStageId)
    const {stage} = stageRes!
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)
    const {phaseType} = stage
    const phaseLabel = phaseLabelLookup[phaseType as keyof typeof phaseLabelLookup]

    const fallbackDate = formatWeekday(scheduledEndTime)
    const fallbackTime = formatTime(scheduledEndTime)
    const fallbackZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Eastern Time'
    const fallback = `${fallbackDate} at ${fallbackTime} (${fallbackZone})`
    const constraint = `You have until *<!date^${toEpochSeconds(
      scheduledEndTime
    )}^{date_short_pretty} at {time}|${fallback}>* to complete it.`

    const attachments = [
      makeFieldsAttachment(
        [
          {
            short: true,
            title: 'Team',
            value: teamName
          },
          {
            short: true,
            title: 'Meeting',
            value: meetingName
          },
          {
            short: false,
            value: constraint
          },
          {
            short: false,
            value: makeHackedFieldButtonValue({label: 'Open meeting', link: meetingUrl})
          }
        ],
        {
          fallback: `The ${phaseLabel} Phase has begun, see: ${meetingUrl}`,
          title: `The ${phaseLabel} Phase has begun ⏳`,
          title_link: meetingUrl
        }
      )
    ]

    return notifyMattermost(
      'MEETING_STAGE_TIME_LIMIT_START',
      notificationChannel,
      user,
      team.id,
      attachments
    )
  },
  async endTimeLimit(meeting, team, user) {
    const {name: meetingName} = meeting
    const {name: teamName} = team
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)

    const attachments = [
      makeFieldsAttachment(
        [
          {
            short: true,
            title: 'Team',
            value: teamName
          },
          {
            short: true,
            title: 'Meeting',
            value: meetingName
          },
          {
            short: false,
            value: makeHackedFieldButtonValue({label: 'Open meeting', link: meetingUrl})
          }
        ],
        {
          fallback: `Time’s up! Advance your meeting to the next phase: ${meetingUrl}`,
          title: `Time’s up! Advance your meeting to the next phase ⏰`,
          title_link: meetingUrl
        }
      )
    ]

    return notifyMattermost(
      'MEETING_STAGE_TIME_LIMIT_END',
      notificationChannel,
      user,
      team.id,
      attachments
    )
  },
  async integrationUpdated(user) {
    const message = `Integration webhook configuration updated`
    const {teamId} = notificationChannel

    const attachments = [
      makeFieldsAttachment(
        [
          {
            short: false,
            value: message
          }
        ],
        {
          fallback: message
        }
      )
    ]
    return notifyMattermost('meetingEnd', notificationChannel, user, teamId, attachments)
  },
  async standupResponseSubmitted() {
    // Not implemented
    return 'success'
  }
})

async function getMattermost(dataLoader: DataLoaderWorker, teamId: string, userId: string) {
  if (process.env.MATTERMOST_SECRET && process.env.MATTERMOST_URL) {
    return [
      MattermostNotificationHelper({
        userId,
        teamId,
        serverBaseUrl: process.env.MATTERMOST_URL,
        sharedSecret: process.env.MATTERMOST_SECRET,
        channel: null,
        webhookUrl: null
      })
    ]
  }

  const auths = await dataLoader
    .get('teamMemberIntegrationAuthsByTeamId')
    .load({service: 'mattermost', teamId})

  // filter the auths
  // for webhook, keep only 1 as we don't know the channel
  // if there are sharedSecret integrations, prefer these, but keep channels unique
  const filteredAuths = auths.reduce((acc, auth) => {
    if (auth.channel) {
      if (!acc.some((a) => a.channel === auth.channel)) {
        acc.push(auth)
      }
    }
    return acc
  }, [] as TeamMemberIntegrationAuth[])
  if (filteredAuths.length === 0) {
    const webhookAuth =
      auths.find((auth) => auth.userId === userId) ?? auths.filter((auth) => !auth.channel)[0]
    if (webhookAuth) {
      filteredAuths.push(webhookAuth)
    }
  }

  return Promise.all(
    filteredAuths.map(async (auth) => {
      const provider = (await dataLoader
        .get('integrationProviders')
        .loadNonNull(auth.providerId)) as IntegrationProviderMattermost
      return MattermostNotificationHelper({...provider, teamId, userId, channel: auth.channel})
    })
  )
}

export const MattermostNotifier = createNotifier(getMattermost)
