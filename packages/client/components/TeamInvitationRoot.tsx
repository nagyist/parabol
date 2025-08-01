import {Suspense} from 'react'
import type {RouteComponentProps} from 'react-router'
import teamInvitationQuery, {
  type TeamInvitationQuery
} from '~/__generated__/TeamInvitationQuery.graphql'
import useNoIndex from '~/hooks/useNoIndex'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import TeamInvitation from './TeamInvitation'

interface Props extends RouteComponentProps<{token: string}> {}

const TeamInvitationRoot = (props: Props) => {
  useNoIndex()
  const {match} = props
  const {params} = match
  const {token} = params
  const queryRef = useQueryLoaderNow<TeamInvitationQuery>(teamInvitationQuery, {
    token
  })
  return <Suspense fallback={''}>{queryRef && <TeamInvitation queryRef={queryRef} />}</Suspense>
}

export default TeamInvitationRoot
