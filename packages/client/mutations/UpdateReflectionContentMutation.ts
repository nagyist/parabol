/**
 * Updates a reflection's content for the retrospective meeting.
 *
 */
import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {UpdateReflectionContentMutation as TUpdateReflectionContentMutation} from '../__generated__/UpdateReflectionContentMutation.graphql'
import type {StandardMutation} from '../types/relayMutations'

graphql`
  fragment UpdateReflectionContentMutation_meeting on UpdateReflectionContentPayload {
    meeting {
      id
    }
    reflection {
      id
      content
      retroReflectionGroup {
        title
      }
    }
  }
`

const mutation = graphql`
  mutation UpdateReflectionContentMutation($content: String!, $reflectionId: ID!) {
    updateReflectionContent(content: $content, reflectionId: $reflectionId) {
      error {
        message
      }
      ...UpdateReflectionContentMutation_meeting @relay(mask: false)
    }
  }
`

const UpdateReflectionContentMutation: StandardMutation<TUpdateReflectionContentMutation> = (
  atmosphere,
  variables,
  {onError, onCompleted}
) => {
  return commitMutation(atmosphere, {
    mutation,
    variables,
    onCompleted,
    onError
  })
}

export default UpdateReflectionContentMutation
