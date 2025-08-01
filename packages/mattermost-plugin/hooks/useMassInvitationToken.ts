import graphql from 'babel-plugin-relay/macro'
import type {useMassInvitationTokenQuery} from 'parabol-client/__generated__/useMassInvitationTokenQuery.graphql'
import {useCallback} from 'react'
import {useLazyLoadQuery} from 'react-relay'

const useMassInvitationToken = ({teamId, meetingId}: {teamId?: string; meetingId?: string}) => {
  const data = useLazyLoadQuery<useMassInvitationTokenQuery>(
    graphql`
      query useMassInvitationTokenQuery($noData: Boolean!, $teamId: ID!, $meetingId: ID) {
        viewer @skip(if: $noData) {
          team(teamId: $teamId) {
            id
            massInvitation(meetingId: $meetingId) {
              id
              expiration
              meetingId
            }
          }
        }
      }
    `,
    {
      noData: !teamId,
      teamId: teamId ?? '',
      meetingId
    }
  )

  const team = data.viewer?.team

  const getToken = useCallback(async () => {
    if (!team || !teamId) {
      return
    }
    const {massInvitation} = team
    const {id: token} = massInvitation!
    return token
  }, [team, meetingId])

  return getToken
}

export default useMassInvitationToken
