import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {UpsertTeamPromptResponseMutation_meeting$data} from '~/__generated__/UpsertTeamPromptResponseMutation_meeting.graphql'
import clientTempId from '~/utils/relay/clientTempId'
import type {UpsertTeamPromptResponseMutation as TUpsertTeamPromptResponseMutation} from '../__generated__/UpsertTeamPromptResponseMutation.graphql'
import type {LocalHandlers, SharedUpdater, StandardMutation} from '../types/relayMutations'

graphql`
  fragment UpsertTeamPromptResponseMutation_meeting on UpsertTeamPromptResponseSuccess {
    meetingId
    teamPromptResponse {
      ...TeamPromptResponseCard_response @relay(mask: false)
    }
  }
`

const mutation = graphql`
  mutation UpsertTeamPromptResponseMutation(
    $teamPromptResponseId: ID
    $meetingId: ID!
    $content: String!
  ) @raw_response_type {
    upsertTeamPromptResponse(
      teamPromptResponseId: $teamPromptResponseId
      meetingId: $meetingId
      content: $content
    ) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...UpsertTeamPromptResponseMutation_meeting @relay(mask: false)
    }
  }
`

export const upsertTeamPromptResponseUpdater: SharedUpdater<
  UpsertTeamPromptResponseMutation_meeting$data
> = (payload, {store}) => {
  const newResponse = payload.getLinkedRecord('teamPromptResponse')
  const newResponseCreatorId = newResponse.getValue('userId')
  const meetingId = payload.getValue('meetingId')
  const meeting = store.get(meetingId)
  if (!meeting) return
  const phases = meeting.getLinkedRecords('phases')
  if (!phases) return
  const [responsesPhase] = phases
  if (!responsesPhase) return
  const stages = responsesPhase.getLinkedRecords('stages')
  if (!stages) return
  const stageToUpdate = stages.find(
    (stage) => stage.getLinkedRecord('teamMember')?.getValue('userId') === newResponseCreatorId
  )
  if (!stageToUpdate) return
  stageToUpdate.setLinkedRecord(newResponse, 'response')
}

interface Handlers extends LocalHandlers {
  plaintextContent: string
}

const UpsertTeamPromptResponseMutation: StandardMutation<
  TUpsertTeamPromptResponseMutation,
  Handlers
> = (atmosphere, variables, {plaintextContent, onError, onCompleted}) => {
  const {viewerId} = atmosphere
  const {meetingId, teamPromptResponseId, content} = variables
  const now = new Date().toJSON()
  const optimisticResponse = {
    upsertTeamPromptResponse: {
      __typename: 'UpsertTeamPromptResponseSuccess',
      meetingId,
      teamPromptResponse: {
        id: teamPromptResponseId ?? clientTempId(viewerId),
        userId: viewerId,
        content,
        plaintextContent,
        updatedAt: now,
        createdAt: !teamPromptResponseId ? now : undefined,
        reactjis: []
      }
    }
  }

  return commitMutation<TUpsertTeamPromptResponseMutation>(atmosphere, {
    mutation,
    variables,
    optimisticResponse,
    updater: (store) => {
      const payload = store.getRootField('upsertTeamPromptResponse')
      upsertTeamPromptResponseUpdater(payload as any, {atmosphere, store})
    },
    onCompleted,
    onError
  })
}

export default UpsertTeamPromptResponseMutation
