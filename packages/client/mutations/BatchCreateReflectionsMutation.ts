import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import {SharedUpdater, StandardMutation} from '../types/relayMutations'
import makeEmptyStr from '../utils/draftjs/makeEmptyStr'
import clientTempId from '../utils/relay/clientTempId'
import {BatchCreateReflectionsMutation as TBatchCreateReflectionsMutation} from '../__generated__/BatchCreateReflectionsMutation.graphql'
import {BatchCreateReflectionsMutation_meeting} from '../__generated__/BatchCreateReflectionsMutation_meeting.graphql'
import handleAddReflectionGroups from './handlers/handleAddReflectionGroups'
import createProxyRecord from '../utils/relay/createProxyRecord'

graphql`
  fragment BatchCreateReflectionsMutation_meeting on BatchCreateReflectionsSuccess {
    reflectionGroups {
      meetingId
      sortOrder
      promptId
      ...ReflectionGroupHeader_reflectionGroup @relay(mask: false)
      ...ReflectionGroupVoting_reflectionGroup @relay(mask: false)
      ...ReflectionGroup_reflectionGroup @relay(mask: false)
      ...ReflectionGroupTitleEditor_reflectionGroup @relay(mask: false)
      ...GroupingKanbanColumn_reflectionGroups @relay(mask: false)
      reflections {
        ...DraggableReflectionCard_reflection @relay(mask: false)
      }
      voteCount
    }
    unlockedStages {
      id
      isNavigableByFacilitator
    }
  }
`

export const batchCreateReflectionsMeetingUpdater: SharedUpdater<BatchCreateReflectionsMutation_meeting> = (
  payload,
  {store}
) => {
  const reflectionGroups = payload.getLinkedRecords('reflectionGroups')
  reflectionGroups.forEach((reflectionGroup) => handleAddReflectionGroups(reflectionGroup, store))
}

const mutation = graphql`
  mutation BatchCreateReflectionsMutation($reflections: [CreateReflectionInput!]!) {
    batchCreateReflections(reflections: $reflections) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...BatchCreateReflectionsMutation_meeting @relay(mask: false)
    }
  }
`

const BatchCreateReflectionsMutation: StandardMutation<TBatchCreateReflectionsMutation> = (
  atmosphere,
  variables,
  {onError, onCompleted}
) => {
  return commitMutation<TBatchCreateReflectionsMutation>(atmosphere, {
    mutation,
    variables,
    updater: (store) => {
      const payload = store.getRootField('batchCreateReflections')
      if (!payload) return
      batchCreateReflectionsMeetingUpdater(payload, {atmosphere, store})
    },
    optimisticUpdater: (store) => {
      const {reflections} = variables
      const {viewerId} = atmosphere
      reflections?.forEach((input) => {
        const {meetingId} = input
        const nowISO = new Date().toJSON()
        const optimisticReflection = {
          id: clientTempId(),
          content: input.content || makeEmptyStr(),
          createdAt: nowISO,
          creatorId: viewerId,
          isActive: true,
          isEditing: true,
          isViewerCreator: true,
          meetingId,
          promptId: input.promptId,
          sortOrder: 0,
          updatedAt: nowISO
        }
        const optimisticGroup = {
          id: clientTempId(),
          createdAt: nowISO,
          isActive: true,
          meetingId,
          promptId: input.promptId,
          sortOrder: input.sortOrder,
          updatedAt: nowISO
        }
        const meeting = store.get(meetingId)!
        const reflectionNode = createProxyRecord(store, 'RetroReflection', optimisticReflection)
        const prompt = store.get(input.promptId!)!
        reflectionNode.setLinkedRecord(meeting, 'meeting')
        reflectionNode.setLinkedRecord(prompt, 'prompt')
        const reflectionGroupNode = createProxyRecord(store, 'RetroReflectionGroup', optimisticGroup)
        reflectionGroupNode.setLinkedRecords([reflectionNode], 'reflections')
        reflectionGroupNode.setLinkedRecord(meeting, 'meeting')
      })
    },
    onCompleted,
    onError
  })
}

export default BatchCreateReflectionsMutation
