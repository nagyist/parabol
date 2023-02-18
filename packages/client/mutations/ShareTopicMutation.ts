import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import {StandardMutation} from '../types/relayMutations'
import {ShareTopicMutation as TShareTopicMutation} from '../__generated__/ShareTopicMutation.graphql'

graphql`
  fragment ShareTopicMutation_meeting on ShareTopicSuccess {
    meeting {
      name
    }
  }
`

const mutation = graphql`
  mutation ShareTopicMutation($reflectionGroupId: ID!, $userId: ID!) {
    shareTopic(reflectionGroupId: $reflectionGroupId, userId: $userId) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...ShareTopicMutation_meeting @relay(mask: false)
    }
  }
`

const ShareTopicMutation: StandardMutation<TShareTopicMutation> = (
  atmosphere,
  variables,
  {onError, onCompleted}
) => {
  return commitMutation<TShareTopicMutation>(atmosphere, {
    mutation,
    variables,
    onCompleted,
    onError
  })
}

export default ShareTopicMutation
