import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import type {CreateOAuth1AuthorizeUrlMutation as TCreateOAuth1AuthorizeUrlMutation} from '../__generated__/CreateOAuth1AuthorizeUrlMutation.graphql'
import type Atmosphere from '../Atmosphere'
import type {OptionalHandlers, StandardMutation} from '../types/relayMutations'

const mutation = graphql`
  mutation CreateOAuth1AuthorizeUrlMutation($providerId: ID!, $teamId: ID!) {
    createOAuth1AuthorizeUrl(providerId: $providerId, teamId: $teamId) {
      url
      error {
        title
        message
      }
    }
  }
`

const CreateOAuth1AuthorizeUrlMutation: StandardMutation<
  TCreateOAuth1AuthorizeUrlMutation,
  OptionalHandlers
> = (atmosphere: Atmosphere, variables, {onError, onCompleted}) => {
  return commitMutation<TCreateOAuth1AuthorizeUrlMutation>(atmosphere, {
    mutation,
    variables,
    onError,
    onCompleted
  })
}

export default CreateOAuth1AuthorizeUrlMutation
