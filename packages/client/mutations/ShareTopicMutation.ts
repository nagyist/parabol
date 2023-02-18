import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import {StandardMutation} from '../types/relayMutations'
import {ShareTopicMutation as TShareTopicMutation} from '../__generated__/ShareTopicMutation.graphql'

graphql`
  fragment ShareTopicMutation_meeting on ShareTopicSuccess {
    meeting {
      name
      id
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
    onCompleted: (res, errors) => {
      if (onCompleted) {
        onCompleted(res, errors)
      }
      const {shareTopic} = res
      const {meeting} = shareTopic
      const {id: meetingId} = meeting
      atmosphere.eventEmitter.emit('addSnackbar', {
        key: `topicShared:${meetingId}`,
        autoDismiss: 5,
        message: `Topic is shared to #growth_retreat_temp_hack_crappy_test`,
        action: {
          label: `Check out Slack`,
          callback: () => {
            const url =
              'https://app.slack.com/client/T08FL6336/C04Q273JT6J'
            window.open(url, '_blank', 'noopener')?.focus()
          }
        }
      })
    },
    onError
  })
}

export default ShareTopicMutation
