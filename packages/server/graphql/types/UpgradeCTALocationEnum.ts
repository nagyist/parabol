import {GraphQLEnumType} from 'graphql'

export type UpgradeCTALocationEnumType =
  | 'publicTemplate'
  | 'teamTemplate'
  | 'orgTemplate'
  | 'createNewTemplate'
  | 'createTeam'
  | 'usageStats'
  | 'directMeetingLinkLock'
  | 'timelineHistoryLock'
  | 'teamsLimitReminderSnackbar'
  | 'teamsLimitReminderNotification'
  | 'meetingSidebar'
  | 'unpaidTeamModal'
  | 'organizationLockedModal'
  | 'startNewMeetingOrganizationLockedError'
  | 'createNewTemplateAL'
  | 'cloneTemplateAL'
  | 'meetingSettingsTeamHealth'

const UpgradeCTALocationEnum = new GraphQLEnumType({
  name: 'UpgradeCTALocationEnum',
  description: 'Where the upgrade CTA button was clicked',
  values: {
    publicTemplate: {},
    teamTemplate: {},
    orgTemplate: {},
    createNewTemplate: {},
    createTeam: {},
    usageStats: {},
    directMeetingLinkLock: {},
    timelineHistoryLock: {},
    teamsLimitReminderSnackbar: {},
    teamsLimitReminderNotification: {},
    meetingSidebar: {},
    unpaidTeamModal: {},
    organizationLockedModal: {},
    startNewMeetingOrganizationLockedError: {},
    createNewTemplateAL: {},
    cloneTemplateAL: {},
    meetingSettingsTeamHealth: {}
  }
})

export default UpgradeCTALocationEnum
