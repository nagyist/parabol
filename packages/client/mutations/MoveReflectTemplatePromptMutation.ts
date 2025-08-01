import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {MoveReflectTemplatePromptMutation as TMoveReflectTemplatePromptMutation} from '~/__generated__/MoveReflectTemplatePromptMutation.graphql'
import type {MoveReflectTemplatePromptMutation_team$data} from '../__generated__/MoveReflectTemplatePromptMutation_team.graphql'
import type {SharedUpdater, StandardMutation} from '../types/relayMutations'
import handleMoveTemplatePrompt from './handlers/handleMoveTemplatePrompt'

interface Context {
  templateId: string
}

graphql`
  fragment MoveReflectTemplatePromptMutation_team on MoveReflectTemplatePromptPayload {
    prompt {
      sortOrder
      templateId
    }
  }
`

const mutation = graphql`
  mutation MoveReflectTemplatePromptMutation($promptId: ID!, $sortOrder: String!) {
    moveReflectTemplatePrompt(promptId: $promptId, sortOrder: $sortOrder) {
      error {
        message
      }
      ...MoveReflectTemplatePromptMutation_team @relay(mask: false)
    }
  }
`

export const moveReflectTemplatePromptTeamUpdater: SharedUpdater<
  MoveReflectTemplatePromptMutation_team$data
> = (payload, {store}) => {
  if (!payload) return
  const templateId = payload.getLinkedRecord('prompt').getValue('templateId')
  handleMoveTemplatePrompt(store, templateId)
}

const MoveReflectTemplatePromptMutation: StandardMutation<
  TMoveReflectTemplatePromptMutation,
  Context
> = (atmosphere, variables, context) => {
  return commitMutation<TMoveReflectTemplatePromptMutation>(atmosphere, {
    mutation,
    variables,
    updater: (store) => {
      const payload = store.getRootField('moveReflectTemplatePrompt')
      if (!payload) return
      moveReflectTemplatePromptTeamUpdater(payload, {atmosphere, store})
    },
    optimisticUpdater: (store) => {
      const {sortOrder, promptId} = variables
      const {templateId} = context
      const prompt = store.get(promptId)
      if (!prompt) return
      prompt.setValue(sortOrder, 'sortOrder')
      handleMoveTemplatePrompt(store, templateId)
    }
  })
}

export default MoveReflectTemplatePromptMutation
