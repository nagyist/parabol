import {Suspense} from 'react'
import type {RouteComponentProps} from 'react-router'
import invitationLinkQuery, {
  type InvitationLinkQuery
} from '~/__generated__/InvitationLinkQuery.graphql'
import useNoIndex from '../hooks/useNoIndex'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import InvitationLink from './InvitationLink'

interface Props extends RouteComponentProps<{token: string}> {}

const InvitationLinkRoot = (props: Props) => {
  useNoIndex()
  const {match} = props
  const {params} = match
  const {token} = params
  const queryRef = useQueryLoaderNow<InvitationLinkQuery>(invitationLinkQuery, {
    token
  })
  return <Suspense fallback={''}>{queryRef && <InvitationLink queryRef={queryRef} />}</Suspense>
}

export default InvitationLinkRoot
