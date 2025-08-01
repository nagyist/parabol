import {Group} from '@mui/icons-material'
import graphql from 'babel-plugin-relay/macro'
import type {TeamRow_team$key} from 'parabol-client/__generated__/TeamRow_team.graphql'
import plural from 'parabol-client/utils/plural'
import {useState} from 'react'

import {useDispatch} from 'react-redux'
import {useFragment} from 'react-relay'
import {useConfig} from '../../hooks/useConfig'
import {useInviteToTeam} from '../../hooks/useInviteToTeam'
import {useUnlinkTeam} from '../../hooks/useUnlinkTeam'
import {openConfigureNotificationsModal} from '../../reducers'
import MoreMenu from '../Menu'

type Props = {
  teamRef: TeamRow_team$key
}
const TeamRow = ({teamRef}: Props) => {
  const team = useFragment(
    graphql`
      fragment TeamRow_team on Team {
        ...useInviteToTeam_team
        id
        name
        teamMembers {
          id
        }
      }
    `,
    teamRef
  )

  const {id, name, teamMembers} = team
  const config = useConfig()
  const {parabolUrl} = config
  const [unlinkTeam] = useUnlinkTeam()
  const [error, setError] = useState<string>()
  const invite = useInviteToTeam(team)
  const dispatch = useDispatch()

  const handleInvite = () => {
    invite?.()
  }

  const handleUnlink = async () => {
    setError(undefined)
    try {
      await unlinkTeam(id)
    } catch {
      setError('Failed to unlink team')
      setTimeout(() => setError(undefined), 5000)
    }
  }

  const handleConfigureNotifications = () => {
    dispatch(openConfigureNotificationsModal(id))
  }

  return (
    <div className='my-4 flex rounded-lg border border-slate-300'>
      <div className='pt-4 pl-2 text-2xl text-slate-400'>
        <Group fontSize='large' />
      </div>
      <div className='flex grow flex-col items-start p-2'>
        <div className='flex w-full flex-col'>
          <a href={`${parabolUrl}/team/${id}`} target='_blank' className='font-bold text-2xl'>
            {name}
          </a>
          <div className='font-semibold text-slate-400'>
            {`${teamMembers.length} ${plural(teamMembers.length, 'member')}`}
          </div>
        </div>
        <div className='flex items-center justify-between py-2'>
          <button className='btn btn-sm btn-primary' onClick={handleInvite}>
            Invite
          </button>
          {error && <div className='error-text flex-grow pl-4'>{error}</div>}
        </div>
      </div>
      <div className='p-2'>
        <MoreMenu
          options={[
            {
              label: 'Unlink',
              onClick: handleUnlink
            },
            {
              label: 'Configure Notifications',
              onClick: handleConfigureNotifications
            }
          ]}
        />
      </div>
    </div>
  )
}

export default TeamRow
