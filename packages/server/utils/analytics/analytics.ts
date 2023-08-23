import {PARABOL_AI_USER_ID} from '../../../client/utils/constants'
import {ReasonToDowngradeEnum} from '../../../client/__generated__/DowngradeToStarterMutation.graphql'
import {TeamLimitsEmailType} from '../../billing/helpers/sendTeamsLimitEmail'
import Meeting from '../../database/types/Meeting'
import MeetingMember from '../../database/types/MeetingMember'
import MeetingRetrospective from '../../database/types/MeetingRetrospective'
import MeetingTemplate from '../../database/types/MeetingTemplate'
import {Reactable} from '../../database/types/Reactable'
import {TaskServiceEnum} from '../../database/types/Task'
import {ReactableEnum} from '../../graphql/private/resolverTypes'
import {IntegrationProviderServiceEnumType} from '../../graphql/types/IntegrationProviderServiceEnum'
import {UpgradeCTALocationEnumType} from '../../graphql/types/UpgradeCTALocationEnum'
import {TeamPromptResponse} from '../../postgres/queries/getTeamPromptResponsesByIds'
import {MeetingTypeEnum} from '../../postgres/types/Meeting'
import {MeetingSeries} from '../../postgres/types/MeetingSeries'
import {createMeetingProperties} from './helpers'
import {SegmentAnalytics} from './segment/SegmentAnalytics'
import {AmplitudeAnalytics} from './amplitude/AmplitudeAnalytics'
import {SlackNotificationEventEnum} from '../../database/types/SlackNotification'
import ServerAuthToken from '../../database/types/ServerAuthToken'
import TemplateScale from '../../database/types/TemplateScale'
import getDataLoader from '../../graphql/getDataLoader'

export type MeetingSeriesAnalyticsProperties = Pick<
  MeetingSeries,
  'id' | 'duration' | 'recurrenceRule' | 'meetingType' | 'title'
> & {teamId: string; facilitatorId: string}

export type IdentifyOptions = {
  userId: string
  email: string
  anonymousId?: string
  name?: string
  isActive?: boolean
  featureFlags?: string[]
  highestTier?: string
  isPatient0?: boolean
  createdAt?: Date
}

export type OrgTierChangeEventProperties = {
  orgId: string
  domain?: string
  orgName: string
  oldTier: string
  newTier: string
  reasonsForLeaving?: ReasonToDowngradeEnum[]
  otherTool?: string
  billingLeaderEmail?: string
}

export type TaskProperties = {
  taskId: string
  teamId: string
  meetingId?: string
  meetingType?: MeetingTypeEnum
  inMeeting: boolean
}

export type TaskEstimateProperties = {
  taskId: string
  meetingId: string
  dimensionName: string
  service?: TaskServiceEnum
  success: boolean
  errorMessage?: string
}

export type MeetingSettings = {
  hasIcebreaker?: boolean
  hasTeamHealth?: boolean
  disableAnonymity?: boolean
  videoMeetingURL?: string | null
  recallBotId?: string | null
}

export type WebSocketProperties = {
  socketCount: number
  socketId: string
  tms: string[]
}

export type AnalyticsEvent =
  // meeting
  | 'Meeting Started'
  | 'Meeting Joined'
  | 'Meeting Completed'
  | 'Comment Added'
  | 'Response Added'
  | 'Reactji Interacted'
  | 'Reflection Added'
  | 'Meeting Recurrence Started'
  | 'Meeting Recurrence Stopped'
  | 'Meeting Settings Changed'
  | 'Meeting Timer Started'
  | 'Meeting Timer Stopped'
  | 'Meeting Timer Updated'
  | 'Poker Meeting Team Revoted'
  // meeting templates
  | 'Scale Created'
  | 'Scale Cloned'
  | 'Template Created'
  | 'Template Cloned'
  | 'Template Shared'
  // team
  | 'Team Name Changed'
  | 'Integration Added'
  | 'Integration Removed'
  | 'Invite Email Sent'
  | 'Invite Accepted'
  | 'Sent Invite Accepted'
  | 'Notification Email Sent'
  // org
  | 'Upgrade CTA Clicked'
  | 'Organization Upgraded'
  | 'Downgrade Clicked'
  | 'Downgrade Continue Clicked'
  | 'Organization Downgraded'
  | 'Billing Leader Modified'
  // task
  | 'Task Created'
  | 'Task Published'
  | 'Task Estimate Set'
  // user
  | 'Account Created'
  | 'Account Removed'
  | 'Account Paused'
  | 'Account Unpaused'
  | 'Account Name Changed'
  | 'User Removed From Org'
  | 'Connect WebSocket'
  | 'Disconnect WebSocket'
  | 'Summary Email Setting Changed'
  // snackbar
  | 'Snackbar Clicked'
  | 'Snackbar Viewed'
  // Join request
  | 'Join Request Reviewed'
  // Suggest Groups
  | 'Suggested Groups Generated'
  | 'Suggest Groups Clicked'
  | 'Reset Groups Clicked'
  // Conversion Tracking
  | 'Conversion Modal Pay Later Clicked'
  // Deprecated Events
  // These will be replaced with tracking plan compliant versions by the data team
  | 'Added Agenda Item'
  | 'Archive Organization'
  | 'Archive Team'
  | 'Enterprise Over User Limit'
  | 'Locked user attempted to join a team'
  | 'Mattermost notification sent'
  | 'Mentioned on Task'
  | 'MSTeams notification sent'
  | 'New Org'
  | 'New Team'
  | 'Poll added'
  | 'Slack notification sent'
  | 'Smart group title changed'
  | 'Task due date set'

/**
 * Provides a unified interface for sending all the analytics events
 */
class Analytics {
  private amplitudeAnalytics: AmplitudeAnalytics
  private segmentAnalytics: SegmentAnalytics

  constructor() {
    this.amplitudeAnalytics = new AmplitudeAnalytics()
    this.segmentAnalytics = new SegmentAnalytics()
  }

  // meeting
  teamPromptEnd = (
    completedMeeting: Meeting,
    meetingMembers: MeetingMember[],
    responses: TeamPromptResponse[]
  ) => {
    const userIdsResponses: Record<string, string> = responses.reduce(
      (previous, response) => ({...previous, [response.userId]: response.plaintextContent}),
      {}
    )
    meetingMembers.forEach((meetingMember) => {
      const plaintextResponseContent = userIdsResponses[meetingMember.userId]
      this.meetingEnd(meetingMember.userId, completedMeeting, meetingMembers, undefined, {
        responseAdded: !!plaintextResponseContent
      })
    })
  }

  checkInEnd = (completedMeeting: Meeting, meetingMembers: MeetingMember[]) => {
    meetingMembers.forEach((meetingMember) =>
      this.meetingEnd(meetingMember.userId, completedMeeting, meetingMembers)
    )
  }

  retrospectiveEnd = (
    completedMeeting: MeetingRetrospective,
    meetingMembers: MeetingMember[],
    template: MeetingTemplate
  ) => {
    const {disableAnonymity} = completedMeeting
    meetingMembers.forEach((meetingMember) =>
      this.meetingEnd(meetingMember.userId, completedMeeting, meetingMembers, template, {
        disableAnonymity
      })
    )
  }

  sprintPokerEnd = (
    completedMeeting: Meeting,
    meetingMembers: MeetingMember[],
    template: MeetingTemplate
  ) => {
    meetingMembers.forEach((meetingMember) =>
      this.meetingEnd(meetingMember.userId, completedMeeting, meetingMembers, template)
    )
  }

  private meetingEnd = (
    userId: string,
    completedMeeting: Meeting,
    meetingMembers: MeetingMember[],
    template?: MeetingTemplate,
    meetingSpecificProperties?: any
  ) => {
    this.track(userId, 'Meeting Completed', {
      wasFacilitator: completedMeeting.facilitatorUserId === userId,
      ...createMeetingProperties(completedMeeting, meetingMembers, template),
      ...meetingSpecificProperties
    })
  }

  meetingStarted = (userId: string, meeting: Meeting, template?: MeetingTemplate) => {
    this.track(userId, 'Meeting Started', createMeetingProperties(meeting, undefined, template))
  }

  recurrenceStarted = (userId: string, meetingSeries: MeetingSeriesAnalyticsProperties) => {
    this.track(userId, 'Meeting Recurrence Started', meetingSeries)
  }

  recurrenceStopped = (userId: string, meetingSeries: MeetingSeriesAnalyticsProperties) => {
    this.track(userId, 'Meeting Recurrence Stopped', meetingSeries)
  }

  meetingJoined = (userId: string, meeting: Meeting) => {
    this.track(userId, 'Meeting Joined', createMeetingProperties(meeting))
  }

  meetingSettingsChanged = (
    userId: string,
    teamId: string,
    meetingType: MeetingTypeEnum,
    meetingSettings: MeetingSettings
  ) => {
    this.track(userId, 'Meeting Settings Changed', {
      teamId,
      meetingType,
      ...meetingSettings
    })
  }

  commentAdded = (
    userId: string,
    meeting: Meeting,
    isAnonymous: boolean,
    isAsync: boolean,
    isReply: boolean
  ) => {
    this.track(userId, 'Comment Added', {
      meetingId: meeting.id,
      meetingType: meeting.meetingType,
      teamId: meeting.teamId,
      isAnonymous,
      isAsync,
      isReply
    })
  }

  responseAdded = (
    userId: string,
    meetingId: string,
    teamPromptResponseId: string,
    isUpdate: boolean
  ) => {
    this.track(userId, 'Response Added', {
      meetingId,
      teamPromptResponseId,
      isUpdate
    })
  }

  reactjiInteracted = (
    userId: string,
    meetingId: string,
    meetingType: MeetingTypeEnum,
    reactable: Reactable,
    reactableType: ReactableEnum,
    reactji: string,
    isRemove: boolean
  ) => {
    const isAIComment = 'createdBy' in reactable && reactable.createdBy === PARABOL_AI_USER_ID
    const {id: reactableId} = reactable
    this.track(userId, 'Reactji Interacted', {
      meetingId,
      meetingType,
      reactableId,
      reactableType,
      reactji,
      isRemove,
      isAIComment
    })
  }

  reflectionAdded = (userId: string, teamId: string, meetingId: string) => {
    this.track(userId, 'Reflection Added', {teamId, meetingId})
  }

  meetingTimerEvent = (
    userId: string,
    event: 'Meeting Timer Started' | 'Meeting Timer Stopped' | 'Meeting Timer Updated',
    meetingId: string,
    phaseType: string,
    viewCount: number,
    isAsync: boolean | null,
    newScheduledEndTime: Date | null,
    timeRemaining: number | null,
    previousScheduledEndTime?: Date | null,
    stageStartAt?: Date
  ) => {
    this.track(userId, event, {
      isAsync,
      meetingId,
      newScheduledEndTime,
      phaseType,
      previousScheduledEndTime,
      stageStartAt,
      timeRemaining,
      viewCount
    })
  }

  pokerMeetingTeamRevoted = async (meeting: Meeting, meetingMembers: MeetingMember[]) => {
    const {facilitatorUserId, meetingNumber, phases, teamId} = meeting
    const presentMemberUserIds = meetingMembers.map(({userId}) => userId)
    presentMemberUserIds.forEach((userId) => {
      const wasFacilitator = userId === facilitatorUserId
      this.track(userId, 'Poker Meeting Team Revoted', {
        hasIcebreaker: phases[0]?.phaseType === 'checkin',
        wasFacilitator,
        meetingNumber,
        teamMembersCount: meetingMembers.length,
        teamMembersPresentCount: meetingMembers.length,
        teamId
      })
    })
  }

  scaleCreated = (userId: string, scale: TemplateScale) => {
    this.track(userId, 'Scale Created', {
      scaleId: scale.id,
      scaleName: scale.name,
      teamId: scale.teamId
    })
  }

  scaleCloned = (userId: string, scale: TemplateScale) => {
    this.track(userId, 'Scale Cloned', {
      scaleId: scale.id,
      scaleName: scale.name,
      teamId: scale.teamId
    })
  }

  templateCreated = (userId: string, template: MeetingTemplate) => {
    this.track(userId, 'Template Created', {
      meetingTemplateId: template.id,
      meetingTemplateType: template.type,
      meetingTemplateScope: template.scope,
      teamId: template.teamId
    })
  }

  templateCloned = (userId: string, template: MeetingTemplate) => {
    this.track(userId, 'Template Cloned', {
      meetingTemplateId: template.id,
      meetingTemplateType: template.type,
      meetingTemplateScope: template.scope,
      teamId: template.teamId
    })
  }

  templateShared = (userId: string, template: MeetingTemplate) => {
    this.track(userId, 'Template Shared', {
      meetingTemplateId: template.id,
      meetingTemplateType: template.type,
      meetingTemplateScope: template.scope,
      teamId: template.teamId
    })
  }

  // team
  teamNameChanged = (
    userId: string,
    teamId: string,
    oldName: string,
    newName: string,
    isOldNameDefault: boolean
  ) => {
    this.track(userId, 'Team Name Changed', {
      teamId,
      oldName,
      newName,
      isOldNameDefault
    })
  }

  integrationAdded = (
    userId: string,
    teamId: string,
    service: IntegrationProviderServiceEnumType | 'slack'
  ) => {
    this.track(userId, 'Integration Added', {
      teamId,
      service
    })
  }

  integrationRemoved = (
    userId: string,
    teamId: string,
    service: IntegrationProviderServiceEnumType | 'slack'
  ) => {
    this.track(userId, 'Integration Removed', {
      teamId,
      service
    })
  }

  inviteEmailSent = (
    userId: string,
    teamId: string,
    inviteeEmail: string,
    isInviteeParabolUser: boolean,
    inviteTo: 'meeting' | 'team',
    success: boolean,
    isInvitedOnCreation: boolean
  ) => {
    this.track(userId, 'Invite Email Sent', {
      teamId,
      inviteeEmail,
      isInviteeParabolUser,
      inviteTo,
      success,
      isInvitedOnCreation
    })
  }

  inviteAccepted = (
    userId: string,
    teamId: string,
    inviterId: string,
    isNewUser: boolean,
    acceptAt: 'meeting' | 'team'
  ) => {
    this.track(userId, 'Invite Accepted', {
      teamId,
      inviterId,
      isNewUser,
      acceptAt
    })

    this.track(inviterId, 'Sent Invite Accepted', {
      teamId,
      inviteeId: userId,
      isNewUser,
      acceptAt
    })
  }

  //org
  clickedUpgradeCTA = (userId: string, upgradeCTALocation: UpgradeCTALocationEnumType) => {
    this.track(userId, 'Upgrade CTA Clicked', {upgradeCTALocation})
  }

  organizationUpgraded = (userId: string, upgradeEventProperties: OrgTierChangeEventProperties) => {
    this.track(userId, 'Organization Upgraded', upgradeEventProperties)
  }

  organizationDowngraded = (
    userId: string,
    downgradeEventProperties: OrgTierChangeEventProperties
  ) => {
    this.track(userId, 'Organization Downgraded', downgradeEventProperties)
  }

  // task
  taskPublished = (
    userId: string,
    taskProperties: TaskProperties,
    service: IntegrationProviderServiceEnumType
  ) => {
    this.track(userId, 'Task Published', {
      ...taskProperties,
      service
    })
  }

  taskCreated = (userId: string, taskProperties: TaskProperties) => {
    this.track(userId, 'Task Created', taskProperties)
  }

  taskEstimateSet = (userId: string, taskEstimateProperties: TaskEstimateProperties) => {
    this.track(userId, 'Task Estimate Set', taskEstimateProperties)
  }

  // user
  accountCreated = (userId: string, isInvited: boolean, isPatient0: boolean) => {
    this.track(userId, 'Account Created', {
      isInvited,
      // properties below needed for Google Analytics goal setting
      category: 'All',
      label: isPatient0 ? 'isPatient0' : 'isNotPatient0'
    })
  }

  accountRemoved = async (userIdToDelete: string, email: string, validReason: string) => {
    const executeGraphQL = require('../../executeGraphQL').default
    const parabolPayload = await executeGraphQL({
      authToken: new ServerAuthToken(), // Need admin access to run the query
      query: `
      query AccountRemoved($userId: ID!) {
        user(userId: $userId) {
          isRemoved
          email
          company {
            userCount
            activeUserCount
          }
        }
      }
    `,
      variables: {userId: userIdToDelete},
      isPrivate: true
    })
    parabolPayload.data.user.email = email
    parabolPayload.data.user.isRemoved = true
    const payload = parabolPayload.data
    this.track(userIdToDelete, 'Account Removed', {validReason, parabolPayload: payload})
  }

  accountPaused = (userId: string) => this.track(userId, 'Account Paused')

  accountUnpaused = (userId: string) => this.track(userId, 'Account Unpaused')

  accountNameChanged = (userId: string, newName: string) =>
    this.track(userId, 'Account Name Changed', {
      newName
    })

  billingLeaderModified = (
    userId: string,
    viewerId: string,
    orgId: string,
    modificationType: 'add' | 'remove'
  ) => {
    this.track(userId, 'Billing Leader Modified', {
      userId,
      viewerId,
      orgId,
      modificationType
    })
  }

  userRemovedFromOrg = (userId: string, orgId: string) =>
    this.track(userId, 'User Removed From Org', {userId, orgId})

  websocketConnected = (userId: string, websocketProperties: WebSocketProperties) => {
    this.track(userId, 'Connect WebSocket', websocketProperties)
  }

  websocketDisconnected = (userId: string, websocketProperties: WebSocketProperties) => {
    this.track(userId, 'Disconnect WebSocket', websocketProperties)
  }

  toggleSubToSummaryEmail = (userId: string, subscribeToSummaryEmail: boolean) => {
    this.track(userId, 'Summary Email Setting Changed', {subscribeToSummaryEmail})
  }

  notificationEmailSent = (userId: string, orgId: string, type: TeamLimitsEmailType) => {
    this.track(userId, 'Notification Email Sent', {type, orgId})
  }

  suggestedGroupsGenerated = (userId: string, meetingId: string, teamId: string) => {
    this.track(userId, 'Suggested Groups Generated', {meetingId, teamId})
  }

  suggestGroupsClicked = (userId: string, meetingId: string, teamId: string) => {
    this.track(userId, 'Suggest Groups Clicked', {meetingId, teamId})
  }

  resetGroupsClicked = (userId: string, meetingId: string, teamId: string) => {
    this.track(userId, 'Reset Groups Clicked', {meetingId, teamId})
  }

  conversionModalPayLaterClicked = (userId: string) => {
    this.track(userId, 'Conversion Modal Pay Later Clicked')
  }

  addedAgendaItem = (userId: string, teamId: string, meetingId?: string) => {
    this.track(userId, 'Added Agenda Item', {teamId, meetingId})
  }

  archiveOrganization = (userId: string, orgId: string) => {
    this.track(userId, 'Archive Organization', {orgId})
  }

  archiveTeam = (userId: string, teamId: string) => {
    this.track(userId, 'Archive Team', {teamId})
  }

  enterpriseOverUserLimit = (userId: string, orgId: string) => {
    this.track(userId, 'Enterprise Over User Limit', {orgId})
  }

  lockedUserAttemptToJoinTeam = (userId: string, invitingOrgId: string) => {
    this.track(userId, 'Locked user attempted to join a team', {invitingOrgId})
  }

  mattermostNotificationSent = (
    userId: string,
    teamId: string,
    notificationEvent: SlackNotificationEventEnum
  ) => {
    this.track(userId, 'Mattermost notification sent', {teamId, notificationEvent})
  }

  mentionedOnTask = (userId: string, mentionedUserId: string, teamId: string) => {
    this.track(userId, 'Mentioned on Task', {mentionedUserId, teamId})
  }

  teamsNotificationSent = (
    userId: string,
    teamId: string,
    notificationEvent: SlackNotificationEventEnum
  ) => {
    this.track(userId, 'MSTeams notification sent', {teamId, notificationEvent})
  }

  newOrg = (userId: string, orgId: string, teamId: string, fromSignup: boolean) => {
    this.track(userId, 'New Org', {orgId, teamId, fromSignup})
  }

  newTeam = (userId: string, orgId: string, teamId: string, teamNumber: number) => {
    this.track(userId, 'New Team', {orgId, teamId, teamNumber})
  }

  pollAdded = (userId: string, teamId: string, meetingId: string) => {
    // 'added' is intentionally lowercase for backwards compatibility
    this.track(userId, 'Poll added', {meetingId, teamId})
  }

  slackNotificationSent = (
    userId: string,
    teamId: string,
    notificationEvent: SlackNotificationEventEnum,
    segmentProperties?: object
  ) => {
    this.track(userId, 'Slack notification sent', {teamId, notificationEvent, ...segmentProperties})
  }

  smartGroupTitleChanged = (
    userId: string,
    similarity: number,
    smartTitle: string,
    normalizedTitle: string
  ) => {
    this.track(userId, 'Smart group title changed', {
      similarity,
      smartTitle,
      title: normalizedTitle
    })
  }

  taskDueDateSet = (userId: string, taskId: string, teamId: string) => {
    this.track(userId, 'Task due date set', {taskId, teamId})
  }

  identify = (options: IdentifyOptions) => {
    this.amplitudeAnalytics.identify(options)
    this.segmentAnalytics.identify(options)
  }

  private track = (userId: string, event: AnalyticsEvent, properties?: Record<string, any>) => {
    const dataloader = getDataLoader()
    this.amplitudeAnalytics.track(userId, event, dataloader, properties)
    this.segmentAnalytics.track(userId, event, dataloader, properties)
  }
}

export const analytics = new Analytics()
