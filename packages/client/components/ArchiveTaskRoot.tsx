import {Suspense} from 'react'
import useDocumentTitle from '~/hooks/useDocumentTitle'
import TeamArchive from '~/modules/teamDashboard/components/TeamArchive/TeamArchive'
import teamArchiveQuery, {type TeamArchiveQuery} from '../__generated__/TeamArchiveQuery.graphql'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'

interface Props {
  teamIds?: string[] | null
  userIds?: string[] | null
  team: any
  returnToTeamId: string
}

const ArchiveTaskRoot = ({teamIds, team, userIds, returnToTeamId}: Props) => {
  useDocumentTitle(`Team Archive | ${team.name}`, 'Archive')

  const queryRef = useQueryLoaderNow<TeamArchiveQuery>(teamArchiveQuery, {
    userIds,
    teamIds,
    first: 40
  })

  return (
    <Suspense fallback={''}>
      {queryRef && (
        <TeamArchive returnToTeamId={returnToTeamId} teamRef={team} queryRef={queryRef} />
      )}
    </Suspense>
  )
}

export default ArchiveTaskRoot
