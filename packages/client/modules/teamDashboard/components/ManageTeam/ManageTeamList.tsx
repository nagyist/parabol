import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import {useFragment} from 'react-relay'
import type {ManageTeamList_team$key} from '../../../../__generated__/ManageTeamList_team.graphql'
import ManageTeamMember from './ManageTeamMember'

const List = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  padding: '0px 0px 8px',
  position: 'relative',
  width: '100%',
  minHeight: 0 // required for FF68
})

interface Props {
  manageTeamMemberId?: string | null
  team: ManageTeamList_team$key
}

const ManageTeamList = (props: Props) => {
  const {manageTeamMemberId} = props
  const team = useFragment(
    graphql`
      fragment ManageTeamList_team on Team {
        isViewerLead
        isOrgAdmin
        teamMembers(sortBy: "preferredName") {
          id
          ...ManageTeamMember_teamMember
        }
      }
    `,
    props.team
  )
  const {isViewerLead, isOrgAdmin: isViewerOrgAdmin, teamMembers} = team
  return (
    <List>
      {teamMembers.map((teamMember) => {
        return (
          <ManageTeamMember
            key={teamMember.id}
            isViewerLead={isViewerLead}
            isViewerOrgAdmin={isViewerOrgAdmin}
            manageTeamMemberId={manageTeamMemberId}
            teamMember={teamMember}
          />
        )
      })}
    </List>
  )
}

export default ManageTeamList
