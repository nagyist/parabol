import graphql from 'babel-plugin-relay/macro'
import {useMemo, useRef} from 'react'
import {useFragment} from 'react-relay'
import useAtmosphere from '~/hooks/useAtmosphere'
import useRouter from '~/hooks/useRouter'
import useSearchFilter from '~/hooks/useSearchFilter'
import {FilterLabels} from '~/types/constEnums'
import constructFilterQueryParamURL from '~/utils/constructFilterQueryParamURL'
import {useQueryParameterParser} from '~/utils/useQueryParameterParser'
import type {
  UserDashTeamMemberMenu_viewer$data,
  UserDashTeamMemberMenu_viewer$key
} from '../__generated__/UserDashTeamMemberMenu_viewer.graphql'
import type {MenuProps} from '../hooks/useMenu'
import DropdownMenuLabel from './DropdownMenuLabel'
import {EmptyDropdownMenuItemLabel} from './EmptyDropdownMenuItemLabel'
import Menu from './Menu'
import MenuItem from './MenuItem'
import {SearchMenuItem} from './SearchMenuItem'

interface Props {
  menuProps: MenuProps
  viewer: UserDashTeamMemberMenu_viewer$key | null | undefined
}

const UserDashTeamMemberMenu = (props: Props) => {
  const {history} = useRouter()
  const {menuProps, viewer: viewerRef} = props

  const viewer = useFragment(
    graphql`
      fragment UserDashTeamMemberMenu_viewer on User {
        id
        teams {
          id
          name
          teamMembers(sortBy: "preferredName") {
            user {
              userId: id
              preferredName
            }
          }
        }
      }
    `,
    viewerRef
  )

  const atmosphere = useAtmosphere()
  const {userIds, teamIds, showArchived} = useQueryParameterParser(atmosphere.viewerId)

  const oldTeamsRef = useRef<UserDashTeamMemberMenu_viewer$data['teams']>([])
  const nextTeams = viewer?.teams ?? oldTeamsRef.current
  if (nextTeams) {
    oldTeamsRef.current = nextTeams
  }
  const teams = oldTeamsRef.current

  const showAllTeamMembers = !!teamIds
  const {filteredTeamMembers, defaultActiveIdx} = useMemo(() => {
    const filteredTeams = teamIds ? teams.filter(({id: teamId}) => teamIds.includes(teamId)) : teams
    const keySet = new Set()
    const filteredTeamMembers = [] as {
      userId: string
      preferredName: string
    }[]
    const teamMembers = filteredTeams.flatMap(({teamMembers}) => teamMembers.flat())
    teamMembers.forEach(({user}) => {
      const userKey = user.userId
      if (!keySet.has(userKey)) {
        keySet.add(userKey)
        filteredTeamMembers.push(user)
      }
    })
    filteredTeamMembers.sort((a, b) => (a.preferredName > b.preferredName ? 1 : -1))
    return {
      filteredTeamMembers,
      defaultActiveIdx:
        filteredTeamMembers.findIndex((teamMember) => userIds?.includes(teamMember.userId)) +
        (showAllTeamMembers ? 2 : 1)
    }
  }, [teamIds, userIds])

  const {
    query,
    filteredItems: matchedFilteredTeamMembers,
    onQueryChange
  } = useSearchFilter(filteredTeamMembers, (item) => item.preferredName)

  return (
    <Menu
      keepParentFocus
      ariaLabel={'Select the team member to filter by'}
      {...menuProps}
      defaultActiveIdx={defaultActiveIdx}
    >
      <DropdownMenuLabel>{'Filter by team member:'}</DropdownMenuLabel>
      {filteredTeamMembers.length > 5 && (
        <SearchMenuItem placeholder='Search team members' onChange={onQueryChange} value={query} />
      )}
      {query && matchedFilteredTeamMembers.length === 0 && (
        <EmptyDropdownMenuItemLabel key='no-results'>
          No team members found!
        </EmptyDropdownMenuItemLabel>
      )}
      {query === '' && showAllTeamMembers && (
        <MenuItem
          key={'teamMemberFilterNULL'}
          label={FilterLabels.ALL_TEAM_MEMBERS}
          onClick={() => history.push(constructFilterQueryParamURL(teamIds, null, showArchived))}
        />
      )}
      {matchedFilteredTeamMembers.map((teamMember) => (
        <MenuItem
          key={`teamMemberFilter${teamMember.userId}`}
          dataCy={`team-member-filter-${teamMember.userId}`}
          label={teamMember.preferredName}
          onClick={() =>
            history.push(constructFilterQueryParamURL(teamIds, [teamMember.userId], showArchived))
          }
        />
      ))}
    </Menu>
  )
}

export default UserDashTeamMemberMenu
