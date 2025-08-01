import * as AdaptiveCards from 'adaptivecards'
import makeAppURL from 'parabol-client/utils/makeAppURL'
import findStageById from 'parabol-client/utils/meetings/findStageById'
import {phaseLabelLookup} from 'parabol-client/utils/meetings/lookups'
import appOrigin from '../../../../appOrigin'
import type {IntegrationProviderMSTeams as IIntegrationProviderMSTeams} from '../../../../postgres/queries/getIntegrationProvidersByIds'
import type {SlackNotification, Team} from '../../../../postgres/types'
import type IUser from '../../../../postgres/types/IUser'
import type {AnyMeeting, MeetingTypeEnum} from '../../../../postgres/types/Meeting'
import {analytics} from '../../../../utils/analytics/analytics'
import logError from '../../../../utils/logError'
import MSTeamsServerManager from '../../../../utils/MSTeamsServerManager'
import type {DataLoaderWorker} from '../../../graphql'
import isValid from '../../../isValid'
import type {SlackNotificationEventEnum} from '../../../public/resolverTypes'
import getSummaryText from './getSummaryText'
import type {NotificationIntegrationHelper} from './NotificationIntegrationHelper'
import {createNotifier} from './Notifier'

const notifyMSTeams = async (
  event: SlackNotification['event'],
  webhookUrl: string,
  user: IUser,
  teamId: string,
  textOrAttachmentsArray: string | unknown[]
) => {
  const manager = new MSTeamsServerManager(webhookUrl)
  const result = await manager.post(textOrAttachmentsArray)
  if (result instanceof Error) {
    logError(result, {userId: user.id, tags: {teamId, event, webhookUrl}})
    return {
      error: result
    }
  }
  analytics.teamsNotificationSent(user, teamId, event)

  return 'success'
}

type IntegrationProviderMSTeams = IIntegrationProviderMSTeams & {
  teamId: string
}
export type MSTeamsNotificationAuth = IntegrationProviderMSTeams & {
  userId: string
  email: string
}

const createTeamPromptMeetingTitle = (meetingName: string) => `*${meetingName}* is open 💬`
const createGenericMeetingTitle = () => `Meeting Started 👋`

const meetingTypeTitleLookup: Record<MeetingTypeEnum, (meetingName: string) => string> = {
  action: createGenericMeetingTitle,
  poker: createGenericMeetingTitle,
  retrospective: createGenericMeetingTitle,
  teamPrompt: createTeamPromptMeetingTitle
}

const createGenericMeetingAction = (meetingUrl: string) => {
  const joinMeetingAction = new AdaptiveCards.OpenUrlAction()
  joinMeetingAction.title = 'Join Meeting'
  joinMeetingAction.url = meetingUrl
  joinMeetingAction.id = 'joinMeeting'

  return joinMeetingAction
}

const createTeamPromptMeetingAction = (meetingUrl: string) => {
  const joinMeetingAction = new AdaptiveCards.OpenUrlAction()
  joinMeetingAction.title = 'Submit Response'
  joinMeetingAction.url = meetingUrl
  joinMeetingAction.id = 'submitResponse'

  return joinMeetingAction
}

const MeetingActionLookup: Record<
  MeetingTypeEnum,
  (meetingUrl: string) => AdaptiveCards.OpenUrlAction
> = {
  action: createGenericMeetingAction,
  poker: createGenericMeetingAction,
  retrospective: createGenericMeetingAction,
  teamPrompt: createTeamPromptMeetingAction
}

export const MSTeamsNotificationHelper: NotificationIntegrationHelper<MSTeamsNotificationAuth> = (
  notificationChannel
) => ({
  async startMeeting(meeting, team, user) {
    const {webhookUrl} = notificationChannel

    const searchParams = {
      utm_source: 'MS Teams meeting start',
      utm_medium: 'product',
      utm_campaign: 'invitations'
    }
    const options = {searchParams}
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`, options)
    const card = new AdaptiveCards.AdaptiveCard()
    card.version = new AdaptiveCards.Version(1.2, 0)

    const meetingTitle = meetingTypeTitleLookup[meeting.meetingType]!(meeting.name)
    const titleTextBlock = GenerateACMeetingTitle(meetingTitle)
    card.addItem(titleTextBlock)

    const meetingDetailColumnSet = GenerateACMeetingAndTeamsDetails(team, meeting)
    card.addItem(meetingDetailColumnSet)

    const meetingLinkColumnSet = new AdaptiveCards.ColumnSet()
    meetingLinkColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const meetingLinkColumn = new AdaptiveCards.Column()
    meetingLinkColumn.width = 'stretch'
    const joinMeetingActionSet = new AdaptiveCards.ActionSet()
    const joinMeetingAction = MeetingActionLookup[meeting.meetingType]!(meetingUrl)
    joinMeetingActionSet.addAction(joinMeetingAction)
    meetingLinkColumn.addItem(joinMeetingActionSet)
    meetingLinkColumnSet.addColumn(meetingLinkColumn)
    card.addItem(meetingLinkColumnSet)

    const adaptiveCard = JSON.stringify(card.toJSON())

    const attachments = MakeACAttachment(adaptiveCard)

    return notifyMSTeams('meetingStart', webhookUrl, user, team.id, attachments)
  },

  async endMeeting(meeting, team, user) {
    const {summary} = meeting
    const {webhookUrl} = notificationChannel
    const searchParams = {
      utm_source: 'MS Teams meeting start',
      utm_medium: 'product',
      utm_campaign: 'invitations'
    }
    const options = {searchParams}
    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)
    const summaryUrl = makeAppURL(appOrigin, `new-summary/${meeting.id}`, options)
    const card = new AdaptiveCards.AdaptiveCard()
    card.version = new AdaptiveCards.Version(1.2, 0)

    const meetingTitle = 'Meeting Ended 🎉'
    const titleTextBlock = GenerateACMeetingTitle(meetingTitle)
    card.addItem(titleTextBlock)

    const meetingDetailColumnSet = GenerateACMeetingAndTeamsDetails(team, meeting)
    card.addItem(meetingDetailColumnSet)

    const summaryColumnSet = new AdaptiveCards.ColumnSet()
    summaryColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const summaryColumn = new AdaptiveCards.Column()
    summaryColumn.width = 'stretch'
    const summaryTextBlock = new AdaptiveCards.TextBlock(await getSummaryText(meeting))
    summaryTextBlock.wrap = true
    summaryColumn.addItem(summaryTextBlock)
    summaryColumnSet.addColumn(summaryColumn)
    card.addItem(summaryColumnSet)

    const meetingEndedActionsColumnSet = new AdaptiveCards.ColumnSet()
    meetingEndedActionsColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const meetingEndedDiscussionColumn = new AdaptiveCards.Column()
    meetingEndedDiscussionColumn.width = 'auto'
    const meetingEndedReviewColumn = new AdaptiveCards.Column()
    meetingEndedReviewColumn.width = 'auto'

    if (summary) {
      const aiSummaryColumnSet = new AdaptiveCards.ColumnSet()
      const aiSummaryColumn = new AdaptiveCards.Column()
      aiSummaryColumn.width = 'stretch'
      const aiSummaryTitle = new AdaptiveCards.TextBlock('AI Summary 🤖')
      aiSummaryTitle.weight = AdaptiveCards.TextWeight.Bolder
      const aiSummaryTextBlock = new AdaptiveCards.TextBlock(summary)
      aiSummaryTextBlock.wrap = true
      aiSummaryColumn.addItem(aiSummaryTitle)
      aiSummaryColumn.addItem(aiSummaryTextBlock)
      aiSummaryColumnSet.addColumn(aiSummaryColumn)
      card.addItem(aiSummaryColumnSet)
    }

    const meetingEndedDiscussionActionSet = new AdaptiveCards.ActionSet()
    const meetingEndedDiscussionAction = new AdaptiveCards.OpenUrlAction()
    meetingEndedDiscussionAction.title = 'See discussion'
    meetingEndedDiscussionAction.url = meetingUrl
    meetingEndedDiscussionAction.id = 'joinMeeting'

    meetingEndedDiscussionActionSet.addAction(meetingEndedDiscussionAction)
    meetingEndedDiscussionColumn.addItem(meetingEndedDiscussionActionSet)

    const meetingEndedReviewActionSet = new AdaptiveCards.ActionSet()
    const meetingEndedReviewAction = new AdaptiveCards.OpenUrlAction()
    meetingEndedReviewAction.title = 'Review summary'
    meetingEndedReviewAction.url = summaryUrl
    meetingEndedReviewAction.id = 'joinMeeting'

    meetingEndedDiscussionActionSet.addAction(meetingEndedReviewAction)
    meetingEndedDiscussionColumn.addItem(meetingEndedReviewActionSet)

    meetingEndedActionsColumnSet.addColumn(meetingEndedDiscussionColumn)
    meetingEndedActionsColumnSet.addColumn(meetingEndedReviewColumn)

    card.addItem(meetingEndedActionsColumnSet)

    const adaptiveCard = JSON.stringify(card.toJSON())
    const attachments = MakeACAttachment(adaptiveCard)
    return notifyMSTeams('meetingEnd', webhookUrl, user, team.id, attachments)
  },

  async startTimeLimit(scheduledEndTime, meeting, team, user) {
    const {webhookUrl} = notificationChannel

    const {phases, facilitatorStageId} = meeting

    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)

    const stageRes = findStageById(phases, facilitatorStageId)
    const {stage} = stageRes!
    const {phaseType} = stage
    const phaseLabel = phaseLabelLookup[phaseType as keyof typeof phaseLabelLookup]

    const meetingTitle = `The **${phaseLabel} Phase** has begun ⌛`

    const card = new AdaptiveCards.AdaptiveCard()
    card.version = new AdaptiveCards.Version(1.2, 0)

    const titleTextBlock = GenerateACMeetingTitle(meetingTitle)
    card.addItem(titleTextBlock)

    const meetingDetailColumnSet = GenerateACMeetingAndTeamsDetails(team, meeting)
    card.addItem(meetingDetailColumnSet)

    const teamFixedTime = scheduledEndTime.toISOString().replace(/.\d+Z$/g, 'Z')
    const timeLimitText = `You have until {{DATE(${teamFixedTime},SHORT)}} at {{TIME(${teamFixedTime})}} to complete it.`

    const timeLimitColumnSet = new AdaptiveCards.ColumnSet()
    timeLimitColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const timeLimitColumn = new AdaptiveCards.Column()
    timeLimitColumn.width = 'stretch'
    const timeLimitTextBlock = new AdaptiveCards.TextBlock(timeLimitText)
    timeLimitTextBlock.wrap = true

    timeLimitColumn.addItem(timeLimitTextBlock)
    timeLimitColumnSet.addColumn(timeLimitColumn)

    card.addItem(timeLimitColumnSet)

    const meetingLinkColumnSet = new AdaptiveCards.ColumnSet()
    meetingLinkColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const meetingLinkColumn = new AdaptiveCards.Column()
    meetingLinkColumn.width = 'stretch'
    const joinMeetingActionSet = new AdaptiveCards.ActionSet()
    const joinMeetingAction = new AdaptiveCards.OpenUrlAction()
    joinMeetingAction.title = 'Open Meeting'
    joinMeetingAction.url = meetingUrl
    joinMeetingAction.id = 'openMeeting'

    joinMeetingActionSet.addAction(joinMeetingAction)

    meetingLinkColumn.addItem(joinMeetingActionSet)

    meetingLinkColumnSet.addColumn(meetingLinkColumn)

    card.addItem(meetingLinkColumnSet)

    const adaptiveCard = JSON.stringify(card.toJSON())
    const attachments = MakeACAttachment(adaptiveCard)

    return notifyMSTeams('MEETING_STAGE_TIME_LIMIT_START', webhookUrl, user, team.id, attachments)
  },

  async endTimeLimit(meeting, team, user) {
    const {webhookUrl} = notificationChannel

    const card = new AdaptiveCards.AdaptiveCard()
    card.version = new AdaptiveCards.Version(1.2, 0)

    const meetingUrl = makeAppURL(appOrigin, `meet/${meeting.id}`)

    const meetingLinkColumnSet = new AdaptiveCards.ColumnSet()
    meetingLinkColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const meetingLinkColumn = new AdaptiveCards.Column()
    meetingLinkColumn.width = 'stretch'

    const meetingLinkHeaderTextBlock = new AdaptiveCards.TextBlock(
      'Time’s up! Advance your meeting to the next phase'
    )
    meetingLinkHeaderTextBlock.wrap = true
    meetingLinkHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
    const meetingLinkTextBlock = new AdaptiveCards.TextBlock(meetingUrl)
    meetingLinkTextBlock.color = AdaptiveCards.TextColor.Accent
    meetingLinkTextBlock.size = AdaptiveCards.TextSize.Small
    meetingLinkTextBlock.wrap = true
    const joinMeetingActionSet = new AdaptiveCards.ActionSet()
    const joinMeetingAction = new AdaptiveCards.OpenUrlAction()
    joinMeetingAction.title = 'Advance Meeting'
    joinMeetingAction.url = meetingUrl
    joinMeetingAction.id = 'advanceMeeting'

    joinMeetingActionSet.addAction(joinMeetingAction)

    meetingLinkColumn.addItem(meetingLinkHeaderTextBlock)
    meetingLinkColumn.addItem(meetingLinkTextBlock)
    meetingLinkColumn.addItem(joinMeetingActionSet)

    meetingLinkColumnSet.addColumn(meetingLinkColumn)

    card.addItem(meetingLinkColumnSet)

    const adaptiveCard = JSON.stringify(card.toJSON())
    const attachments = MakeACAttachment(adaptiveCard)

    return notifyMSTeams('MEETING_STAGE_TIME_LIMIT_END', webhookUrl, user, team.id, attachments)
  },
  async integrationUpdated(user) {
    const {webhookUrl, teamId} = notificationChannel

    const card = new AdaptiveCards.AdaptiveCard()
    card.version = new AdaptiveCards.Version(1.2, 0)

    const messageColumnSet = new AdaptiveCards.ColumnSet()
    messageColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
    const messageColumn = new AdaptiveCards.Column()
    messageColumn.width = 'stretch'

    const messageTextBlock = new AdaptiveCards.TextBlock(
      'Integration webhook configuration updated'
    )
    messageTextBlock.wrap = true
    messageTextBlock.weight = AdaptiveCards.TextWeight.Bolder
    messageColumn.addItem(messageTextBlock)
    messageColumnSet.addColumn(messageColumn)
    card.addItem(messageColumnSet)

    const adaptiveCard = JSON.stringify(card.toJSON())
    const attachments = MakeACAttachment(adaptiveCard)
    return notifyMSTeams('meetingEnd', webhookUrl, user, teamId, attachments)
  },

  async standupResponseSubmitted() {
    // Not implemented
    return 'success'
  }
})

async function getMSTeams(
  dataLoader: DataLoaderWorker,
  teamId: string,
  userId: string,
  event: SlackNotificationEventEnum
) {
  const [auths, user] = await Promise.all([
    dataLoader
      .get('teamMemberIntegrationAuthsByTeamIdAndService')
      .load({service: 'msTeams', teamId}),
    dataLoader.get('users').loadNonNull(userId)
  ])

  const providers = (
    await Promise.all(
      auths.map(async (auth) => {
        const {providerId} = auth
        const [provider, settings] = await Promise.all([
          dataLoader
            .get('integrationProviders')
            .loadNonNull(providerId) as Promise<IntegrationProviderMSTeams>,
          dataLoader.get('teamNotificationSettingsByProviderIdAndTeamId').load({providerId, teamId})
        ])
        const activeSettings = settings.find(({channelId}) => channelId === null)
        if (activeSettings?.events.includes(event)) {
          return provider
        }
        return null
      })
    )
  ).filter(isValid)

  return providers.map((provider) =>
    MSTeamsNotificationHelper({
      ...(provider as IntegrationProviderMSTeams),
      userId,
      email: user.email
    })
  )
}

export const MSTeamsNotifier = createNotifier(getMSTeams)

function GenerateACMeetingTitle(meetingTitle: string) {
  const titleTextBlock = new AdaptiveCards.TextBlock(meetingTitle)
  titleTextBlock.wrap = true
  titleTextBlock.size = AdaptiveCards.TextSize.Large
  titleTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  return titleTextBlock
}

function GenerateACMeetingAndTeamsDetails(team: Team, meeting: AnyMeeting) {
  const meetingDetailColumnSet = new AdaptiveCards.ColumnSet()
  const teamDetailColumn = new AdaptiveCards.Column()
  teamDetailColumn.width = 'stretch'
  const teamHeaderTextBlock = new AdaptiveCards.TextBlock('Team: ')
  teamHeaderTextBlock.wrap = true
  teamHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  const teamValueTextBlock = new AdaptiveCards.TextBlock(team.name)
  teamValueTextBlock.wrap = true

  teamDetailColumn.addItem(teamHeaderTextBlock)
  teamDetailColumn.addItem(teamValueTextBlock)

  const meetingDetailColumn = new AdaptiveCards.Column()
  meetingDetailColumn.width = 'stretch'
  const meetingHeaderTextBlock = new AdaptiveCards.TextBlock('Meeting: ')
  meetingHeaderTextBlock.wrap = true
  meetingHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  const meetingValueTextBlock = new AdaptiveCards.TextBlock(meeting.name)
  meetingValueTextBlock.wrap = true

  meetingDetailColumn.addItem(meetingHeaderTextBlock)
  meetingDetailColumn.addItem(meetingValueTextBlock)

  meetingDetailColumnSet.addColumn(teamDetailColumn)
  meetingDetailColumnSet.addColumn(meetingDetailColumn)
  return meetingDetailColumnSet
}

function MakeACAttachment(card: string) {
  return `{"type":"message", "attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","contentUrl":null, "content": ${card}}]}`
}
