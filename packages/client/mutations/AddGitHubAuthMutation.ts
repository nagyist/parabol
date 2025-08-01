import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {AddGitHubAuthMutation as TAddGitHubAuthMutation} from '../__generated__/AddGitHubAuthMutation.graphql'
import type {StandardMutation} from '../types/relayMutations'

graphql`
  fragment AddGitHubAuthMutation_team on AddGitHubAuthPayload {
    teamMember {
      ...ScopePhaseAreaGitHub_teamMember
      integrations {
        github {
          ...useIsIntegratedGitHubIntegration
          ...GitHubProviderRowGitHubIntegration
          ...GitHubScopingSearchBarGitHubIntegration
        }
      }
    }
  }
`

const mutation = graphql`
  mutation AddGitHubAuthMutation($code: ID!, $teamId: ID!) {
    addGitHubAuth(code: $code, teamId: $teamId) {
      error {
        message
      }
      ...AddGitHubAuthMutation_team @relay(mask: false)
    }
  }
`

const AddGitHubAuthMutation: StandardMutation<TAddGitHubAuthMutation> = (
  atmosphere,
  variables,
  {onError, onCompleted}
) => {
  return commitMutation<TAddGitHubAuthMutation>(atmosphere, {
    mutation,
    variables,
    onCompleted,
    onError
  })
}

export default AddGitHubAuthMutation
