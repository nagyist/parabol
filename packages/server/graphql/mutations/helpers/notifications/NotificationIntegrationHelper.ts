import Meeting from '../../../../database/types/Meeting'
import {TeamPromptResponse} from '../../../../postgres/queries/getTeamPromptResponsesByIds'
import {Team} from '../../../../postgres/queries/getTeamsByIds'
import User from '../../../../postgres/types/IUser'

export type NotifyResponse =
  | 'success'
  | {
      error: Error
      // true if the error is transient
      retry?: boolean
    }

export type NotificationIntegration = {
  startMeeting(meeting: Meeting, team: Team): Promise<NotifyResponse>
  updateMeeting?(meeting: Meeting, team: Team): Promise<NotifyResponse>
  endMeeting(
    meeting: Meeting,
    team: Team,
    standupResponses: {user: User; response: TeamPromptResponse}[] | null
  ): Promise<NotifyResponse>
  startTimeLimit(scheduledEndTime: Date, meeting: Meeting, team: Team): Promise<NotifyResponse>
  endTimeLimit(meeting: Meeting, team: Team): Promise<NotifyResponse>
  integrationUpdated(): Promise<NotifyResponse>
  standupResponseSubmitted(
    meeting: Meeting,
    team: Team,
    user: User,
    response: TeamPromptResponse
  ): Promise<NotifyResponse>
}

export type NotificationIntegrationHelper<NotificationChannel> = (
  notification: NotificationChannel
) => NotificationIntegration
