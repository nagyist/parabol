import type {UpsertTeamPromptResponseSuccessResolvers} from '../resolverTypes'

export type UpsertTeamPromptResponseSuccessSource = {
  teamPromptResponseId: number
  meetingId: string
}

const UpsertTeamPromptResponseSuccess: UpsertTeamPromptResponseSuccessResolvers = {
  teamPromptResponse: async (source, _args, {dataLoader}) => {
    const {teamPromptResponseId} = source
    return dataLoader.get('teamPromptResponses').loadNonNull(teamPromptResponseId)
  },
  meeting: async (source, _args, {dataLoader}) => {
    const {meetingId} = source
    return dataLoader.get('newMeetings').loadNonNull(meetingId)
  }
}

export default UpsertTeamPromptResponseSuccess
