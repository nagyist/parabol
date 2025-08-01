import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {DowngradeToStarterMutation as TDowngradeToStarterMutation} from '../__generated__/DowngradeToStarterMutation.graphql'
import type {StandardMutation} from '../types/relayMutations'

graphql`
  fragment DowngradeToStarterMutation_organization on DowngradeToStarterPayload {
    organization {
      tier
      billingTier
      isPaid
      teams {
        tier
      }
    }
  }
`

const mutation = graphql`
  mutation DowngradeToStarterMutation(
    $orgId: ID!
    $reasonsForLeaving: [ReasonToDowngradeEnum!]
    $otherTool: String
  ) {
    downgradeToStarter(
      orgId: $orgId
      reasonsForLeaving: $reasonsForLeaving
      otherTool: $otherTool
    ) {
      error {
        message
      }
      ...DowngradeToStarterMutation_organization @relay(mask: false)
    }
  }
`

const DowngradeToStarterMutation: StandardMutation<TDowngradeToStarterMutation> = (
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

export default DowngradeToStarterMutation
