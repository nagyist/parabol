import Meeting from '../../../../database/types/Meeting'
import ReflectionGroup from '../../../../database/types/ReflectionGroup'
import Reflection from '../../../../database/types/Reflection'
import {Team} from '../../../../postgres/queries/getTeamsByIds'
import IUser from '../../../../postgres/types/IUser'

export type NotifyResponse =
  | 'success'
  | {
      error: Error
      // true if the error is transient
      retry?: boolean
    }

export type NotificationIntegration = {
  startMeeting(meeting: Meeting, team: Team): Promise<NotifyResponse>
  endMeeting(meeting: Meeting, team: Team): Promise<NotifyResponse>
  startTimeLimit(scheduledEndTime: Date, meeting: Meeting, team: Team): Promise<NotifyResponse>
  endTimeLimit(meeting: Meeting, team: Team): Promise<NotifyResponse>
  shareTopic(user: IUser, meeting: Meeting, team: Team, reflectionGroup: ReflectionGroup, reflections: Reflection[]): Promise<NotifyResponse>
  integrationUpdated(): Promise<NotifyResponse>
}

export type NotificationIntegrationHelper<NotificationChannel> = (
  notification: NotificationChannel
) => NotificationIntegration
