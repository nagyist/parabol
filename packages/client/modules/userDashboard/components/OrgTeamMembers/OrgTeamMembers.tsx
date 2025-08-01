import {ArrowBack, Delete} from '@mui/icons-material'
import graphql from 'babel-plugin-relay/macro'
import {type PreloadedQuery, usePreloadedQuery} from 'react-relay'
import {Link} from 'react-router-dom'
import type {OrgTeamMembersQuery} from '../../../../__generated__/OrgTeamMembersQuery.graphql'
import DeleteTeamDialog from '../../../../components/DeleteTeamDialog'
import InviteTeamMemberAvatar from '../../../../components/InviteTeamMemberAvatar'
import {Button} from '../../../../ui/Button/Button'
import {useDialogState} from '../../../../ui/Dialog/useDialogState'
import {ORGANIZATIONS} from '../../../../utils/constants'
import plural from '../../../../utils/plural'
import EditableTeamName from '../../../teamDashboard/components/EditTeamName/EditableTeamName'
import {OrgTeamMembersRow} from './OrgTeamMembersRow'

interface Props {
  queryRef: PreloadedQuery<OrgTeamMembersQuery>
}

const query = graphql`
  query OrgTeamMembersQuery($teamId: ID!) {
    viewer {
      team(teamId: $teamId) {
        id
        billingTier
        isOrgAdmin
        isViewerLead
        name
        orgId
        teamMembers(sortBy: "preferredName") {
          id
          isNotRemoved
          ...AddTeamMemberModal_teamMembers
          ...OrgTeamMembersRow_teamMember
          ...InviteTeamMemberAvatar_teamMembers
        }
        tier
        ...EditableTeamName_team
      }
    }
  }
`

export const OrgTeamMembers = (props: Props) => {
  const {queryRef} = props
  const data = usePreloadedQuery<OrgTeamMembersQuery>(query, queryRef)
  const {viewer} = data
  const {team} = viewer

  const {
    open: openDeleteTeamDialog,
    close: closeDeleteTeamDialog,
    isOpen: isDeleteTeamDialogOpened
  } = useDialogState()

  if (!team) return null
  const {name: teamName, isViewerLead, isOrgAdmin: isViewerOrgAdmin, teamMembers} = team
  const canEditTeam = isViewerLead || isViewerOrgAdmin

  return (
    <div className='max-w-4xl pb-4'>
      <div className='flex items-center justify-center py-1'>
        <Button size='md' shape='circle' variant='ghost' asChild>
          <Link to={`/me/${ORGANIZATIONS}/${team.orgId}/teams`}>
            <ArrowBack />
          </Link>
        </Button>
        <div className='font-bold text-gray-700 text-lg hover:text-gray-900'>
          {canEditTeam ? <EditableTeamName team={team} /> : teamName}
        </div>
        <div className='ml-auto flex items-center'>
          <InviteTeamMemberAvatar teamId={team.id} teamMembers={teamMembers} />
          {canEditTeam && (
            <div className='group mx-1.5 cursor-pointer' onClick={openDeleteTeamDialog}>
              <div className='flex h-7 justify-center'>
                <span className='h-6 w-6 self-center text-slate-500 group-hover:text-slate-600'>
                  <Delete />
                </span>
              </div>
              <div className='text-center font-semibold text-slate-700 text-xs leading-4'>
                Delete
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='divide-y divide-slate-300 overflow-hidden rounded-md border border-slate-300 bg-white shadow-xs'>
        <div className='bg-slate-100 px-4 py-2'>
          <div className='flex w-full justify-between'>
            <div className='flex items-center font-bold'>
              {teamMembers.length} {plural(teamMembers.length, 'User')}
            </div>
          </div>
        </div>
        {teamMembers.map((teamMember) => (
          <OrgTeamMembersRow
            isViewerLead={isViewerLead}
            isViewerOrgAdmin={isViewerOrgAdmin}
            teamMemberRef={teamMember}
            key={teamMember.id}
          />
        ))}
      </div>

      {isDeleteTeamDialogOpened ? (
        <DeleteTeamDialog
          isOpen={isDeleteTeamDialogOpened}
          teamId={team.id}
          teamName={team.name}
          teamOrgId={team.orgId}
          onDeleteTeam={closeDeleteTeamDialog}
          onClose={closeDeleteTeamDialog}
        />
      ) : null}
    </div>
  )
}
